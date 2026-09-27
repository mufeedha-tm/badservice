import { randomUUID } from 'node:crypto';
import * as complaintRepository from '../repositories/inMemoryComplaintRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { listCategories } from './categoryService.js';

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

export async function createComplaint(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'A complaint object is required.', 'INVALID_COMPLAINT');
  }

  const title = readRequiredText(input.title, 'title', 160);
  const company = readRequiredText(input.company, 'company', 120);
  const category = readRequiredText(input.category, 'category', 100);
  const description = readRequiredText(input.description, 'description', 5000);
  const location = readOptionalText(input.location, 'location', 120);
  const categories = await listCategories();

  if (!categories.includes(category)) {
    throw new ApiError(400, 'Select a valid complaint category.', 'INVALID_CATEGORY');
  }

  const createdAtLabel = 'Just now';

  return complaintRepository.create({
    id: randomUUID(),
    title,
    description,
    company,
    category,
    ...(location && { location }),
    createdAt: new Date().toISOString(),
    createdAtLabel,
    metadata: [company, category, location, createdAtLabel].filter(Boolean),
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