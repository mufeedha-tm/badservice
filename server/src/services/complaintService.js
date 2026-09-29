import { randomUUID } from 'node:crypto';
import * as complaintRepository from '../repositories/mysqlComplaintRepository.js';
import * as companyRepository from '../repositories/mysqlCompanyRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidCategory } from './categoryService.js';
import { isValidCompany } from './companyService.js';
import { saveProof } from './storageService.js';

export function listComplaints() {
  return complaintRepository.findAll();
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

export async function createComplaint(input, user = null, file = null) {
  if (!user || !user.id) {
    throw new ApiError(401, 'You must be signed in to file a complaint.', 'AUTH_REQUIRED');
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'A complaint object is required.', 'INVALID_COMPLAINT');
  }

  const title = readRequiredText(input.title, 'title', 160);
  const company = readRequiredText(input.company, 'company', 120);
  const category = readRequiredText(input.category, 'category', 100);
  const description = readRequiredText(input.description, 'description', 5000);
  const location = readOptionalText(input.location, 'location', 120);
  const subcategory = readOptionalText(input.subcategory, 'subcategory', 100);

  // Validate company existence and approval
  const companyRecord = await companyRepository.findByName(company);
  if (!companyRecord || companyRecord.status !== 'ACTIVE') {
    throw new ApiError(400, `Company '${company}' is not registered. Please select an existing company or submit a company request.`, 'INVALID_COMPANY');
  }

  // Validate category existence
  if (!(await isValidCategory(category))) {
    throw new ApiError(400, 'Select a valid complaint category.', 'INVALID_CATEGORY');
  }

  let proofUrl = null;
  let proofName = null;

  if (file) {
    const saved = await saveProof(file);
    if (saved) {
      proofUrl = saved.url;
      proofName = saved.name;
    }
  } else if (input.proofUrl && typeof input.proofUrl === 'string') {
    proofUrl = input.proofUrl.trim();
    proofName = typeof input.proofName === 'string' ? input.proofName.trim() : null;
  }

  const createdAtLabel = 'Just now';

  return complaintRepository.create({
    id: randomUUID(),
    title,
    description,
    company: companyRecord.name,
    category,
    subcategory: subcategory || null,
    ...(location && { location }),
    proofUrl,
    proofName,
    userId: user.id,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    createdAtLabel,
    metadata: [companyRecord.name, category, location, createdAtLabel].filter(Boolean),
    actionLabel: 'View Details',
  });
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