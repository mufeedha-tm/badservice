import { randomUUID } from 'node:crypto';
import * as complaintRepository from '../repositories/mysqlComplaintRepository.js';
import * as companyRepository from '../repositories/mysqlCompanyRepository.js';
import * as categoryRepository from '../repositories/mysqlCategoryRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidCategory } from './categoryService.js';
import { assertVerificationToken, consumeChallenge } from './otpService.js';
import { saveComplaintMedia } from './storageService.js';
import { assertRealMediaFile } from '../middleware/upload.js';
import { readVideoDurationSeconds, VideoMetadataError } from '../utils/videoDuration.js';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
const VIDEO_MAX_DURATION_SECONDS = 15;

export function listComplaints() {
  return complaintRepository.findAll();
}

export function listRankings() {
  return complaintRepository.findRankings();
}

export async function getComplaint(id) {
  const complaint = await complaintRepository.findById(id);
  if (!complaint) throw new ApiError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');

  return complaint;
}

export function searchComplaints(filters) {
  return complaintRepository.search(filters);
}

export function getUserComplaints(userId) {
  if (!userId) {
    throw new ApiError(401, 'Authentication required to view your complaints.', 'AUTH_REQUIRED');
  }
  return complaintRepository.findByUserId(userId);
}

export async function createComplaint(input, user = null, file = null, files = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'A complaint object is required.', 'INVALID_COMPLAINT');
  }

  // 1. Verification Token Check (Priority check for security)
  const verificationToken = input.verificationToken;
  if (!verificationToken || typeof verificationToken !== 'string') {
    throw new ApiError(401, 'Email verification is required before submitting a complaint.', 'OTP_REQUIRED');
  }

  const complainantEmail = normalizeEmail(input.email);
  const verified = await assertVerificationToken(complainantEmail, verificationToken);

  // 2. Personal & Contact Details Validation
  const complainantName = readRequiredText(input.fullName || input.name, 'full name', 80);
  const complainantPhone = readRequiredPhone(input.phone);
  const complainantCity = readRequiredText(input.city, 'city', 120);
  const complainantAddress = readRequiredText(input.address, 'full address', 500);

  // 3. Complaint Details Validation
  const complaintType = normalizeComplaintType(input.type);
  const companyName = readRequiredText(input.company, complaintType === 'Service' ? 'service provider' : 'company / brand', 120);
  const category = readRequiredText(input.category, 'category', 100);
  const title = readRequiredText(input.title, 'complaint title', 160);
  const description = readRequiredText(input.description, 'full complaint details', 5000);
  const location = readRequiredText(input.location, 'shop / service location', 120);
  const subcategory = readOptionalText(input.subcategory, 'subcategory', 100);
  const model = readRequiredText(
    input.model || input.serviceDetails,
    complaintType === 'Service' ? 'service details / purpose' : 'product / model',
    150
  );
  const seller = readRequiredText(
    input.seller || input.serviceProvider,
    complaintType === 'Service' ? 'service provider' : 'seller / shop',
    150
  );

  if (!(await isValidCategory(category))) {
    throw new ApiError(400, 'Select a valid complaint category.', 'INVALID_CATEGORY');
  }

  const categoryRecord = await categoryRepository.findByName(category);
  const companyRecord = await resolveCompany(companyName, categoryRecord?.id);

  // 4. Evidence Media Validation (All 3 mandatory)
  const productImage = pickUploadedFile(files, 'productImage') || file || null;
  const billImage = pickUploadedFile(files, 'billImage') || null;
  const productVideo = pickUploadedFile(files, 'productVideo') || null;

  assertRequiredMedia(productImage, billImage, productVideo, complaintType);
  assertMediaLimits(productImage, billImage, productVideo);
  await assertRealMediaFile(productImage, 'image');
  await assertRealMediaFile(billImage, 'image');
  await assertRealMediaFile(productVideo, 'video');
  let videoDuration;
  try {
    videoDuration = await readVideoDurationSeconds(productVideo.path);
  } catch (error) {
    if (!(error instanceof VideoMetadataError)) throw error;
    throw new ApiError(400, 'Video duration could not be verified. Please upload a playable video.', 'INVALID_VIDEO_DURATION');
  }
  if (videoDuration > VIDEO_MAX_DURATION_SECONDS) {
    throw new ApiError(
      400,
      `Video must be ${VIDEO_MAX_DURATION_SECONDS} seconds or shorter.`,
      'VIDEO_TOO_LONG'
    );
  }

  // 5. Store Media via Storage Abstraction
  const productImageInfo = await saveComplaintMedia(productImage, 'productImage');
  const billImageInfo = await saveComplaintMedia(billImage, 'billImage');
  const productVideoInfo = await saveComplaintMedia(productVideo, 'productVideo');

  const createdAtLabel = 'Just now';

  const created = await complaintRepository.create({
    id: randomUUID(),
    title,
    description,
    company: companyRecord.name,
    category,
    subcategory: subcategory || null,
    model: model || null,
    seller: seller || null,
    location: location || null,
    type: complaintType,
    productImageUrl: productImageInfo?.url || null,
    productImageName: productImageInfo?.name || null,
    billImageUrl: billImageInfo?.url || null,
    billImageName: billImageInfo?.name || null,
    productVideoUrl: productVideoInfo?.url || null,
    productVideoName: productVideoInfo?.name || null,
    proofUrl: null,
    proofName: null,
    userId: user?.id || null,
    complainantName,
    complainantPhone,
    complainantEmail,
    complainantCity,
    complainantAddress,
    emailVerified: true,
    phoneVerified: false,
    otpVerifiedAt: new Date().toISOString(),

    status: 'PENDING',
    createdAt: new Date().toISOString(),
    createdAtLabel,
    metadata: [companyRecord.name, category, location, createdAtLabel].filter(Boolean),
    actionLabel: 'View Details',
  });

  // Consume verification challenge (single-use)
  await consumeChallenge(verified.challengeId);
  return created;
}

async function resolveCompany(companyName, categoryId) {
  const existing = await companyRepository.findByName(companyName);
  if (existing) {
    if (existing.status === 'DISABLED') {
      throw new ApiError(400, `Company '${companyName}' is not available.`, 'INVALID_COMPANY');
    }
    return existing;
  }

  // Company must be registered or approved
  throw new ApiError(
    400,
    `Company '${companyName}' is not registered. Please use 'Request to Add a New Company' first.`,
    'COMPANY_NOT_FOUND'
  );
}

function assertRequiredMedia(productImage, billImage, productVideo, complaintType) {
  const isService = complaintType === 'Service';
  const photoLabel = isService ? 'service photo' : 'product photo';
  const billLabel = isService ? 'bill / receipt' : 'bill / purchase proof';
  const videoLabel = isService ? 'service evidence video' : 'product video';

  if (!productImage) {
    throw new ApiError(400, `A ${photoLabel} upload is required.`, 'MISSING_PRODUCT_IMAGE');
  }
  if (!billImage) {
    throw new ApiError(400, `A ${billLabel} upload is required.`, 'MISSING_BILL_IMAGE');
  }
  if (!productVideo) {
    throw new ApiError(400, `A ${videoLabel} upload is required.`, 'MISSING_PRODUCT_VIDEO');
  }
}

function assertMediaLimits(productImage, billImage, productVideo) {
  for (const file of [productImage, billImage]) {
    if (file?.size > IMAGE_MAX_BYTES) {
      throw new ApiError(400, 'Image files must be 10MB or smaller.', 'FILE_TOO_LARGE');
    }
    const imageType = file?.mimetype || '';
    if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(imageType)) {
      throw new ApiError(400, 'Photos must be JPG, JPEG, PNG, or WEBP.', 'INVALID_FILE_TYPE');
    }
  }
  if (productVideo?.size > VIDEO_MAX_BYTES) {
    throw new ApiError(400, 'Video files must be 15MB or smaller.', 'FILE_TOO_LARGE');
  }
  if (productVideo && !['video/mp4', 'video/webm', 'video/quicktime'].includes(productVideo.mimetype)) {
    throw new ApiError(400, 'Video must be MP4, MOV, or WEBM.', 'INVALID_FILE_TYPE');
  }
}

function normalizeComplaintType(value) {
  const type = typeof value === 'string' ? value.trim() : 'Product';
  return type === 'Service' ? 'Service' : 'Product';
}

function pickUploadedFile(files, key) {
  if (!files || typeof files !== 'object') return null;
  const fileList = files[key];
  if (!fileList || fileList.length === 0) return null;
  return fileList[0];
}

function normalizeEmail(value) {
  const email = readRequiredText(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ApiError(400, 'Enter a valid email address.', 'INVALID_EMAIL');
  }
  return email;
}

function readRequiredPhone(value) {
  if (!value || typeof value !== 'string') {
    throw new ApiError(400, 'Mobile number is required.', 'INVALID_PHONE');
  }
  const cleaned = value.trim().replace(/[\s\-()]/g, '');
  if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned)) {
    throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number.', 'INVALID_PHONE');
  }
  return cleaned.slice(-10);
}

function readRequiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${field} is required.`, 'INVALID_COMPLAINT_FIELD');
  }

  const text = value.trim();
  if (text.length > maxLength) {
    throw new ApiError(400, `${field} must be ${maxLength} characters or fewer.`, 'INVALID_COMPLAINT_FIELD');
  }

  return text;
}

function readOptionalText(value, field, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} must be text.`, 'INVALID_COMPLAINT_FIELD');
  }
  if (!value.trim()) return '';
  return readRequiredText(value, field, maxLength);
}
