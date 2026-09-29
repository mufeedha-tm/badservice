import * as companyRepository from '../repositories/mysqlCompanyRepository.js';
import * as companyRequestRepository from '../repositories/mysqlCompanyRequestRepository.js';
import * as categoryRepository from '../repositories/mysqlCategoryRepository.js';
import * as complaintRepository from '../repositories/mysqlComplaintRepository.js';
import { ApiError } from '../utils/ApiError.js';

export function listCompanies() {
  return companyRepository.findAll();
}

export function listAllCompaniesAdmin() {
  return companyRepository.findAllAdmin();
}

export async function getCompany(id) {
  const company = await companyRepository.findById(id);
  if (!company) {
    throw new ApiError(404, 'Company not found.', 'COMPANY_NOT_FOUND');
  }

  // Fetch complaints for this company
  const complaints = await complaintRepository.search({ company: company.name });

  return {
    ...company,
    complaintCount: complaints.length,
    recentComplaints: complaints.slice(0, 10),
  };
}

export async function submitCompanyRequest({ requestedByUserId, companyName, categoryId, description }) {
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    throw new ApiError(400, 'Company name is required.', 'INVALID_COMPANY_NAME');
  }

  const trimmedName = companyName.trim();
  if (trimmedName.length > 120) {
    throw new ApiError(400, 'Company name must be 120 characters or fewer.', 'INVALID_COMPANY_NAME');
  }

  if (!categoryId) {
    throw new ApiError(400, 'Category is required for company request.', 'INVALID_CATEGORY');
  }

  const category = await categoryRepository.findById(categoryId) || await categoryRepository.findByName(categoryId);
  if (!category) {
    throw new ApiError(400, 'Invalid category selected.', 'INVALID_CATEGORY');
  }

  // Check if company already exists
  const existingCompany = await companyRepository.findByName(trimmedName);
  if (existingCompany && existingCompany.status === 'ACTIVE') {
    throw new ApiError(409, `Company '${trimmedName}' is already active and available.`, 'COMPANY_ALREADY_EXISTS');
  }

  // Check if pending request exists
  const pending = await companyRequestRepository.findPendingByName(trimmedName);
  if (pending) {
    throw new ApiError(409, `A request for '${trimmedName}' is already pending review.`, 'REQUEST_ALREADY_PENDING');
  }

  return companyRequestRepository.createRequest({
    requestedByUserId,
    companyName: trimmedName,
    categoryId: category.id,
    description,
  });
}

export async function listCompanyRequests(status) {
  return companyRequestRepository.findAll({ status });
}

export async function approveCompanyRequest(requestId, reviewerUserId) {
  const request = await companyRequestRepository.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Company request not found.', 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, `This request has already been ${request.status.toLowerCase()}.`, 'REQUEST_NOT_PENDING');
  }

  // Create or activate the company
  let company = await companyRepository.findByName(request.companyName);
  if (!company) {
    company = await companyRepository.createCompany({
      name: request.companyName,
      categoryId: request.categoryId,
      status: 'ACTIVE',
    });
  } else if (company.status !== 'ACTIVE') {
    company = await companyRepository.updateStatus(company.id, 'ACTIVE');
  }

  const updatedRequest = await companyRequestRepository.updateRequestStatus(requestId, 'APPROVED', reviewerUserId);

  return { company, request: updatedRequest };
}

export async function rejectCompanyRequest(requestId, reviewerUserId) {
  const request = await companyRequestRepository.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Company request not found.', 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, `This request has already been ${request.status.toLowerCase()}.`, 'REQUEST_NOT_PENDING');
  }

  return companyRequestRepository.updateRequestStatus(requestId, 'REJECTED', reviewerUserId);
}

export async function adminCreateCompany({ name, categoryId, status = 'ACTIVE' }) {
  if (!name || !name.trim()) {
    throw new ApiError(400, 'Company name is required.', 'INVALID_COMPANY_NAME');
  }

  const existing = await companyRepository.findByName(name.trim());
  if (existing) {
    throw new ApiError(409, `Company '${name.trim()}' already exists.`, 'COMPANY_EXISTS');
  }

  return companyRepository.createCompany({ name: name.trim(), categoryId, status });
}

export async function adminUpdateCompanyStatus(id, status) {
  if (!['ACTIVE', 'DISABLED'].includes(status)) {
    throw new ApiError(400, 'Status must be ACTIVE or DISABLED.', 'INVALID_STATUS');
  }

  const company = await companyRepository.findById(id);
  if (!company) {
    throw new ApiError(404, 'Company not found.', 'COMPANY_NOT_FOUND');
  }

  return companyRepository.updateStatus(id, status);
}

export async function isValidCompany(company) {
  if (!company || typeof company !== 'string') return false;
  return Boolean(await companyRepository.findByName(company));
}