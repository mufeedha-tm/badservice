import { randomUUID } from 'node:crypto';
import * as complaintRepository from '../repositories/mysqlComplaintRepository.js';
import * as companyRepository from '../repositories/mysqlCompanyRepository.js';
import * as categoryRepository from '../repositories/mysqlCategoryRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidCategory } from './categoryService.js';
import { assertPhoneVerificationToken, consumeChallenge } from './otpService.js';
import { saveComplaintMedia } from './storageService.js';
import { assertRealMediaFile } from '../middleware/upload.js';
import { readVideoDurationSeconds, VideoMetadataError } from '../utils/videoDuration.js';
import {
  compressVideoForLimit,
  MAX_ORIGINAL_VIDEO_BYTES,
  MAX_VIDEO_BYTES,
} from './videoCompressionService.js';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_DURATION_SECONDS = 30;

export function listComplaints({ limit } = {}) {
  return complaintRepository.findPublicAll({ limit }).then((complaints) => complaints.map(toPublicComplaint));
}

export async function listRankings() {
  const rankings = await complaintRepository.findRankings();
  return {
    ...rankings,
    products: rankings.products.map((product) => ({
      ...product,
      latestComplaint: toPublicComplaint(product.latestComplaint),
    })),
  };
}

export async function getComplaint(id, user = null) {
  const complaint = await complaintRepository.findById(id);
  if (!complaint) throw new ApiError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');

  const isPubliclyVisible = ['APPROVED', 'UNDER_REVIEW', 'COMPANY_RESPONDED', 'RESOLVED'].includes(complaint.status);
  const isOwner = user && complaint.userId === user.id;
  const isAdmin = user && user.role === 'ADMIN';

  if (!isPubliclyVisible && !isOwner && !isAdmin) {
    throw new ApiError(404, 'Complaint not found', 'COMPLAINT_NOT_FOUND');
  }

  return toPublicComplaint(complaint);
}

export function searchComplaints(filters) {
  return complaintRepository.search({ ...filters, publishedOnly: true })
    .then((complaints) => complaints.map(toPublicComplaint));
}

export async function getUserComplaints(userId) {
  if (!userId) {
    throw new ApiError(401, 'Authentication required to view your complaints.', 'AUTH_REQUIRED');
  }
  const complaints = await complaintRepository.findByUserId(userId);
  return complaints.map(toPublicComplaint);
}

export function toPublicComplaint(complaint) {
  if (!complaint) return complaint;
  const {
    billImageUrl: _billImageUrl,
    billImageName: _billImageName,
    billImagePublicId: _billImagePublicId,
    billImageVersion: _billImageVersion,
    proofUrl: _proofUrl,
    proofName: _proofName,
    complainantPhone: _complainantPhone,
    complainantEmail: _complainantEmail,
    complainantAddress: _complainantAddress,
    phoneVerified: _phoneVerified,
    emailVerified: _emailVerified,
    otpVerifiedAt: _otpVerifiedAt,
    userId: _userId,
    statusHistory: _statusHistory,
    statusChangedAt: _statusChangedAt,
    ...publicComplaint
  } = complaint;
  return publicComplaint;
}

export async function createComplaint(input, user = null, file = null, files = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'A complaint object is required.', 'INVALID_COMPLAINT');
  }

  // 1. Phone verification is used for public complaint submission.
  // Email OTP/Gmail delivery is intentionally not part of this workflow.
  const verificationToken = input.verificationToken;
  if (!verificationToken || typeof verificationToken !== 'string') {
    throw new ApiError(
      401,
      'Phone verification is required before submitting a complaint.',
      'OTP_REQUIRED'
    );
  }

  const complainantEmail = normalizeOptionalEmail(input.email);
  const complainantPhone = readRequiredPhone(input.phone);
  const verified = await assertPhoneVerificationToken(complainantPhone, verificationToken);

  // 2. Personal & Contact Details Validation
  const complainantName = readRequiredText(input.fullName || input.name, 'full name', 80);
  const complainantCity = readRequiredText(input.city, 'city', 120);
  const complainantAddress = readRequiredText(input.address, 'full address', 500);
  const complainantPincode = readRequiredPincode(input.pincode || input.pinCode);

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
    complaintType === 'Service' ? 'service details' : 'product / model',
    150
  );
  const seller = readRequiredText(
    input.seller || input.serviceProvider,
    complaintType === 'Service' ? 'service provider' : 'seller / shop',
    150
  );
  const serviceType = complaintType === 'Service'
    ? readOptionalText(input.serviceType, 'service type', 100)
    : null;

  const categoryRecord = await categoryRepository.findByName(category);
  if (!categoryRecord) {
    throw new ApiError(400, 'Select a valid complaint category.', 'INVALID_CATEGORY');
  }
  const resolvedCategory = categoryRecord.name;
  const companyRecord = await resolveCompany(companyName, categoryRecord?.id);

  // 4. Evidence Media Validation (1 to 3 product photos required, 1 bill proof, 1 video)
  const productImage = pickUploadedFile(files, 'productImage') || file || null;
  const productImage2 = pickUploadedFile(files, 'productImage2') || null;
  const productImage3 = pickUploadedFile(files, 'productImage3') || null;
  const billImage = pickUploadedFile(files, 'billImage') || null;
  let productVideo = pickUploadedFile(files, 'productVideo') || null;

  const hasProductImage = Boolean(productImage || input.productImageUrl);
  const hasBillImage = Boolean(billImage || input.billImageUrl);
  const hasProductVideo = Boolean(productVideo || input.productVideoUrl);

  if (!hasProductImage) {
    throw new ApiError(400, `A ${complaintType === 'Service' ? 'service photo' : 'product photo'} upload is required.`, 'MISSING_PRODUCT_IMAGE');
  }
  if (!hasBillImage) {
    throw new ApiError(400, `A ${complaintType === 'Service' ? 'bill / receipt' : 'bill / purchase proof'} upload is required.`, 'MISSING_BILL_IMAGE');
  }
  if (!hasProductVideo) {
    throw new ApiError(400, `A ${complaintType === 'Service' ? 'service evidence video' : 'product video'} upload is required.`, 'MISSING_PRODUCT_VIDEO');
  }

  let productImageInfo = null;
  if (input.productImageUrl) {
    productImageInfo = {
      url: input.productImageUrl,
      name: input.productImageName || 'product-photo',
      publicId: input.productImagePublicId || null,
      version: input.productImageVersion || null,
    };
  } else if (productImage) {
    if (productImage.size > IMAGE_MAX_BYTES) throw new ApiError(400, 'Image exceeds 10 MB.', 'FILE_TOO_LARGE');
    await assertRealMediaFile(productImage, 'image');
    productImageInfo = await saveComplaintMedia(productImage, 'productImage');
  }

  const allProductImages = [];
  if (productImageInfo) {
    allProductImages.push({ url: productImageInfo.url, name: productImageInfo.name });
  }

  if (productImage2) {
    if (productImage2.size <= IMAGE_MAX_BYTES) {
      await assertRealMediaFile(productImage2, 'image');
      const img2 = await saveComplaintMedia(productImage2, 'productImage');
      if (img2?.url) allProductImages.push({ url: img2.url, name: img2.name || 'product-photo-2' });
    }
  } else if (input.productImage2Url) {
    allProductImages.push({ url: input.productImage2Url, name: input.productImage2Name || 'product-photo-2' });
  }

  if (productImage3) {
    if (productImage3.size <= IMAGE_MAX_BYTES) {
      await assertRealMediaFile(productImage3, 'image');
      const img3 = await saveComplaintMedia(productImage3, 'productImage');
      if (img3?.url) allProductImages.push({ url: img3.url, name: img3.name || 'product-photo-3' });
    }
  } else if (input.productImage3Url) {
    allProductImages.push({ url: input.productImage3Url, name: input.productImage3Name || 'product-photo-3' });
  }

  let parsedInputImages = null;
  if (typeof input.productImages === 'string') {
    try {
      parsedInputImages = JSON.parse(input.productImages);
    } catch {}
  } else if (Array.isArray(input.productImages)) {
    parsedInputImages = input.productImages;
  }

  const combinedImages = [];
  if (Array.isArray(parsedInputImages) && parsedInputImages.length > 0) {
    for (const img of parsedInputImages) {
      if (img && typeof img === 'object' && img.url) {
        if (!combinedImages.some((x) => x.url === img.url)) combinedImages.push(img);
      }
    }
  }
  for (const img of allProductImages) {
    if (img && img.url && !combinedImages.some((x) => x.url === img.url)) {
      combinedImages.push(img);
    }
  }

  let billImageInfo = null;
  if (input.billImageUrl) {
    billImageInfo = {
      url: input.billImageUrl,
      name: input.billImageName || 'purchase-proof',
      publicId: input.billImagePublicId || null,
      version: input.billImageVersion || null,
    };
  } else if (billImage) {
    if (billImage.size > IMAGE_MAX_BYTES) throw new ApiError(400, 'Bill exceeds 10 MB.', 'FILE_TOO_LARGE');
    await assertRealMediaFile(billImage, 'image');
    billImageInfo = await saveComplaintMedia(billImage, 'billImage');
  }

  let productVideoInfo = null;
  if (input.productVideoUrl) {
    productVideoInfo = {
      url: input.productVideoUrl,
      name: input.productVideoName || 'product-video',
      publicId: input.productVideoPublicId || null,
      version: input.productVideoVersion || null,
    };
  } else if (productVideo) {
    if (productVideo.size > MAX_ORIGINAL_VIDEO_BYTES) throw new ApiError(400, 'Video exceeds 1 GB.', 'FILE_TOO_LARGE');
    await assertRealMediaFile(productVideo, 'video');
    let videoDuration = 30;
    try {
      videoDuration = await readVideoDurationSeconds(productVideo.path);
    } catch (error) {
      if (!(error instanceof VideoMetadataError)) throw error;
      videoDuration = 30;
    }
    productVideo = await compressVideoForLimit(productVideo, videoDuration);
    if (productVideo.size > MAX_VIDEO_BYTES) {
      throw new ApiError(422, 'Video could not be reduced to 15 MB or smaller.', 'VIDEO_COMPRESSION_LIMIT');
    }
    productVideoInfo = await saveComplaintMedia(productVideo, 'productVideo');
  }

  const createdAtLabel = 'Just now';

  const created = await complaintRepository.create({
    id: randomUUID(),
    title,
    description,
    company: companyRecord.name,
    category: resolvedCategory,
    subcategory: subcategory || null,
    model: model || null,
    seller: seller || null,
    location: location || null,
    type: complaintType,
    serviceType: serviceType || null,
    productImageUrl: productImageInfo?.url || combinedImages[0]?.url || null,
    productImageName: productImageInfo?.name || combinedImages[0]?.name || null,
    billImageUrl: billImageInfo?.url || null,
    billImageName: billImageInfo?.name || null,
    billImagePublicId: billImageInfo?.publicId || null,
    billImageVersion: billImageInfo?.version || null,
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
    complainantPincode,
    productImages: combinedImages.length > 0 ? combinedImages : null,
    emailVerified: false,
    phoneVerified: true,
    otpVerifiedAt: new Date().toISOString(),

    status: 'PENDING',
    createdAt: new Date().toISOString(),
    createdAtLabel,
    metadata: [companyRecord.name, category, location, createdAtLabel].filter(Boolean),
    actionLabel: 'View Details',
  });

  // Consume verification challenge (single-use)
  await consumeChallenge(verified.challengeId);
  return toPublicComplaint(created);
}

// This path is intentionally separate from createComplaint. Public submissions
// continue to require OTP verification and evidence; an authenticated
// administrator may record a complaint received through another channel.
export async function createAdminComplaint(input = {}, files = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'A complaint object is required.', 'INVALID_COMPLAINT');
  }

  const productImage = pickUploadedFile(files, 'productImage');
  const productImage2 = pickUploadedFile(files, 'productImage2');
  const productImage3 = pickUploadedFile(files, 'productImage3');
  const billImage = pickUploadedFile(files, 'billImage');
  const productVideo = pickUploadedFile(files, 'productVideo');
  const savedProductImage = readDraftMedia(input, 'productImage', 'product-photo');
  const savedProductImage2 = readDraftMedia(input, 'productImage2', 'product-photo-2');
  const savedProductImage3 = readDraftMedia(input, 'productImage3', 'product-photo-3');
  const savedBillImage = readDraftMedia(input, 'billImage', 'purchase-proof');
  const savedProductVideo = readDraftMedia(input, 'productVideo', 'evidence-video');

  if (!productImage && !savedProductImage) {
    throw new ApiError(400, 'A product or service photo is required for an admin complaint.', 'MISSING_PRODUCT_IMAGE');
  }
  if (!billImage && !savedBillImage) {
    throw new ApiError(400, 'A bill or receipt image is required for an admin complaint.', 'MISSING_BILL_IMAGE');
  }
  if (!productVideo && !savedProductVideo) {
    throw new ApiError(400, 'An evidence video is required for an admin complaint.', 'MISSING_PRODUCT_VIDEO');
  }

  const categoryName = readRequiredText(input.category, 'category', 100);
  const categoryRecord = await categoryRepository.findByName(categoryName);

  if (!categoryRecord) {
    throw new ApiError(400, 'Select a valid complaint category.', 'INVALID_CATEGORY');
  }

  const complaintType = readAdminComplaintType(input.type);
  const companyName = readRequiredText(input.company, complaintType === 'Service' ? 'service provider' : 'company / brand', 120);
  const companyRecord = await resolveCompany(companyName, categoryRecord.id);
  const complainantName = readRequiredText(input.complainantName, 'complainant name', 80);
  const complainantPhone = readRequiredPhone(input.complainantPhone);
  const complainantCity = readRequiredText(input.complainantCity, 'complainant city', 120);
  const complainantAddress = readOptionalText(input.complainantAddress, 'complainant address', 500) || null;
  const complainantPincode = readOptionalPincode(input.complainantPincode);
  const now = new Date().toISOString();
  const [productImageInfo, billImageInfo, productVideoInfo, productImage2Info, productImage3Info] = await Promise.all([
    productImage ? processDraftMediaUpload(productImage, 'productImage') : savedProductImage,
    billImage ? processDraftMediaUpload(billImage, 'billImage') : savedBillImage,
    productVideo ? processDraftMediaUpload(productVideo, 'productVideo') : savedProductVideo,
    productImage2 ? processDraftMediaUpload(productImage2, 'productImage2') : savedProductImage2,
    productImage3 ? processDraftMediaUpload(productImage3, 'productImage3') : savedProductImage3,
  ]);

  const created = await complaintRepository.create({
    id: randomUUID(),
    title: readRequiredText(input.title, 'complaint title', 160),
    description: readRequiredText(input.description, 'complaint details', 5000),
    company: companyRecord.name,
    category: categoryRecord.name,
    subcategory: readOptionalText(input.subcategory, 'subcategory', 100) || null,
    model: readRequiredText(input.model, complaintType === 'Service' ? 'service details' : 'product / model', 150),
    seller: readRequiredText(input.seller, complaintType === 'Service' ? 'service provider' : 'seller / shop', 150),
    location: readRequiredText(input.location, 'location', 120),
    type: complaintType,
    serviceType: complaintType === 'Service'
      ? readRequiredText(input.serviceType, 'service type', 100)
      : null,
    productImageUrl: productImageInfo.url,
    productImageName: productImageInfo.name,
    billImageUrl: billImageInfo.url,
    billImageName: billImageInfo.name,
    billImagePublicId: billImageInfo.publicId || null,
    billImageVersion: billImageInfo.version || null,
    productVideoUrl: productVideoInfo.url,
    productVideoName: productVideoInfo.name,
    productImages: [productImageInfo, productImage2Info, productImage3Info]
      .filter(Boolean)
      .map((image) => ({ url: image.url, name: image.name })),
    userId: null,
    complainantName,
    complainantPhone,
    complainantEmail: normalizeOptionalEmail(input.complainantEmail),
    complainantCity,
    complainantAddress,
    complainantPincode,
    phoneVerified: false,
    emailVerified: false,
    otpVerifiedAt: null,
    status: 'PENDING',
    createdAt: now,
    metadata: [companyRecord.name, categoryRecord.name].filter(Boolean),
    actionLabel: 'View Details',
  });

  return toPublicComplaint(created);
}

export async function processDraftMediaUpload(file, mediaType) {
  if (!file) throw new ApiError(400, 'No file was uploaded.', 'MISSING_FILE');
  const validTypes = ['productImage', 'productImage2', 'productImage3', 'billImage', 'productVideo'];
  if (!validTypes.includes(mediaType)) {
    throw new ApiError(400, 'Invalid media type.', 'INVALID_MEDIA_TYPE');
  }

  if (['productImage', 'productImage2', 'productImage3', 'billImage'].includes(mediaType)) {
    if (file.size > IMAGE_MAX_BYTES) {
      throw new ApiError(400, 'Image file exceeds maximum 10 MB limit.', 'FILE_TOO_LARGE');
    }
    await assertRealMediaFile(file, 'image');
    const saved = await saveComplaintMedia(file, mediaType.startsWith('productImage') ? 'productImage' : mediaType);
    return {
      url: saved.url,
      name: saved.name,
      mediaType,
      publicId: saved.publicId || null,
      version: saved.version || null,
      size: file.size,
    };
  }

  if (mediaType === 'productVideo') {
    if (file.size > MAX_ORIGINAL_VIDEO_BYTES) {
      throw new ApiError(400, 'Video file exceeds maximum 1 GB limit.', 'FILE_TOO_LARGE');
    }
    await assertRealMediaFile(file, 'video');
    let videoDuration = 30;
    try {
      videoDuration = await readVideoDurationSeconds(file.path);
    } catch (error) {
      if (!(error instanceof VideoMetadataError)) throw error;
      videoDuration = 30;
    }
    if (videoDuration > VIDEO_MAX_DURATION_SECONDS) {
      throw new ApiError(400, `Video must be ${VIDEO_MAX_DURATION_SECONDS} seconds or less. Recorded duration: ${Math.round(videoDuration)}s.`, 'VIDEO_DURATION_EXCEEDED');
    }
    const compressed = await compressVideoForLimit(file, videoDuration);
    if (compressed.size > MAX_VIDEO_BYTES) {
      throw new ApiError(422, 'Video could not be reduced to 15 MB or smaller.', 'VIDEO_COMPRESSION_LIMIT');
    }
    const saved = await saveComplaintMedia(compressed, 'productVideo');
    return {
      url: saved.url,
      name: saved.name,
      mediaType,
      publicId: saved.publicId || null,
      version: saved.version || null,
      size: compressed.size,
    };
  }
}

export async function requestComplaintDeletion(id, user = null, reason = '', contactInfo = '') {
  const complaint = await complaintRepository.findById(id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found.', 'COMPLAINT_NOT_FOUND');
  }
  if (user && user.role !== 'ADMIN' && complaint.userId && complaint.userId !== user.id) {
    throw new ApiError(403, 'You can only request deletion for complaints you submitted.', 'FORBIDDEN');
  }
  const fullReason = [reason, contactInfo ? `(Contact: ${contactInfo})` : ''].filter(Boolean).join(' ');
  return complaintRepository.requestDeletion(id, fullReason || 'User requested deletion from website');
}

export async function cancelComplaintDeletion(id, user = null) {
  const complaint = await complaintRepository.findById(id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found.', 'COMPLAINT_NOT_FOUND');
  }
  if (user && user.role !== 'ADMIN' && complaint.userId && complaint.userId !== user.id) {
    throw new ApiError(403, 'You can only cancel deletion for complaints you submitted.', 'FORBIDDEN');
  }
  return complaintRepository.cancelDeleteRequest(id);
}

async function resolveCompany(companyName, categoryId) {
  const existing = await companyRepository.findByName(companyName);
  if (existing) {
    if (existing.status === 'DISABLED') {
      throw new ApiError(400, `Company '${companyName}' is not available.`, 'INVALID_COMPANY');
    }
    return existing;
  }

  // Automatically create company or service provider if not registered
  return await companyRepository.createCompany({
    name: companyName,
    categoryId: categoryId || null,
    status: 'ACTIVE',
  });
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
  if (productVideo?.size > MAX_ORIGINAL_VIDEO_BYTES) {
    throw new ApiError(400, 'Original video files must be 1GB or smaller.', 'FILE_TOO_LARGE');
  }
  if (productVideo && !['video/mp4', 'video/webm', 'video/quicktime'].includes(productVideo.mimetype)) {
    throw new ApiError(400, 'Video must be MP4, MOV, or WEBM.', 'INVALID_FILE_TYPE');
  }
}

function normalizeComplaintType(value) {
  const type = typeof value === 'string' ? value.trim() : 'Product';
  return type === 'Service' ? 'Service' : 'Product';
}

function readAdminComplaintType(value) {
  if (value === 'Product' || value === 'Service') return value;
  throw new ApiError(400, 'Select a complaint type.', 'INVALID_COMPLAINT_TYPE');
}

function pickUploadedFile(files, key) {
  if (!files || typeof files !== 'object') return null;
  const fileList = files[key];
  if (!fileList || fileList.length === 0) return null;
  return fileList[0];
}

function readDraftMedia(input, mediaType, fallbackName) {
  const value = input?.[`${mediaType}Url`];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `Invalid saved ${mediaType} upload.`, 'INVALID_MEDIA');
  }

  const name = readOptionalText(input?.[`${mediaType}Name`], `${mediaType} name`, 255) || fallbackName;
  return { url: value.trim(), name, mediaType };
}

function normalizeEmail(value) {
  const email = readRequiredText(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ApiError(400, 'Enter a valid email address.', 'INVALID_EMAIL');
  }
  return email;
}

function normalizeOptionalEmail(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  return normalizeEmail(value);
}

function readRequiredPincode(value) {
  if (!value || typeof value !== 'string') {
    throw new ApiError(400, 'PIN code is mandatory.', 'INVALID_PINCODE');
  }
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) {
    throw new ApiError(400, 'Please enter a valid 6-digit PIN code.', 'INVALID_PINCODE');
  }
  return cleaned;
}

function readOptionalPincode(value) {
  if (value === undefined || value === null || !String(value).trim()) return null;
  return readRequiredPincode(value);
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
