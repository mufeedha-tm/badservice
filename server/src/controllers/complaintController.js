import {
  createComplaint as submitComplaint,
  getComplaint,
  getUserComplaints,
  listComplaints,
  listRankings,
  requestComplaintDeletion,
  cancelComplaintDeletion,
  processDraftMediaUpload,
  searchComplaints as searchComplaintList,
} from '../services/complaintService.js';
import * as complaintRepository from '../repositories/mysqlComplaintRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function getComplaints(_request, response) {
  const complaints = await listComplaints();
  response.json({ success: true, data: complaints });
}

export async function getMyComplaints(request, response) {
  if (!request.user?.id) {
    throw new ApiError(401, 'Please sign in to view your complaints.', 'AUTH_REQUIRED');
  }
  const complaints = await getUserComplaints(request.user.id);
  response.json({ success: true, data: complaints });
}

export async function getComplaintById(request, response) {
  const complaint = await getComplaint(request.params.id, request.user || null);
  response.json({ success: true, data: complaint });
}

export async function postDraftMediaUpload(request, response) {
  const file = request.file;
  const mediaType = request.body?.mediaType || request.query?.mediaType;
  const result = await processDraftMediaUpload(file, mediaType);
  response.json({ success: true, data: result });
}

export async function postRequestDeleteComplaint(request, response) {
  const { reason, contactInfo } = request.body || {};
  const result = await requestComplaintDeletion(request.params.id, request.user || null, reason, contactInfo);
  response.json({ success: true, data: result });
}

export async function postCancelDeleteRequest(request, response) {
  const result = await cancelComplaintDeletion(request.params.id, request.user || null);
  response.json({ success: true, data: result });
}

export async function trackComplaintStatus(request, response) {
  const query = (request.params.query || '').trim();
  if (!query) throw new ApiError(400, 'Complaint reference ID or phone number is required.', 'MISSING_QUERY');

  // Search by exact ID first
  let results = [];
  const complaint = await complaintRepository.findById(query);
  if (complaint) {
    results = [complaint];
  } else {
    // If not found by ID, search by phone number
    const phoneDigits = query.replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      results = await complaintRepository.findByPhone(phoneDigits);
    }
  }

  // If still not found and query is non-empty, try search
  if (results.length === 0) {
    results = await complaintRepository.search({ q: query, includeDeleted: true });
  }

  if (results.length === 0) {
    throw new ApiError(404, 'No complaint found matching this Reference ID or phone number.', 'NOT_FOUND');
  }

  response.json({
    success: true,
    data: results.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      company: c.company,
      productName: c.productModel || c.company,
      serviceType: c.serviceType || '',
      category: c.category,
      status: c.status,
      statusNote: c.statusNote || null,
      deleteRequested: c.deleteRequested,
      deleteReason: c.deleteReason,
      isDeleted: c.isDeleted,
      deleteAdminNote: c.deleteAdminNote || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      productImageUrl: c.productImageUrl,
    })),
  });
}

export async function getComplaintRankings(_request, response) {
  const rankings = await listRankings();
  response.json({ success: true, data: rankings });
}

export async function postComplaint(request, response) {
  const complaint = await submitComplaint(request.body, request.user || null, request.file, request.files || {});
  response.status(201).json({ success: true, data: complaint });
}

export async function getSearchedComplaints(request, response) {
  const q = readQueryParameter(request.query.q, 'q');
  const category = readQueryParameter(request.query.category, 'category');
  const subcategory = readQueryParameter(request.query.subcategory, 'subcategory');
  const company = readQueryParameter(request.query.company, 'company');
  const period = readQueryParameter(request.query.period, 'period');
  const date = readQueryParameter(request.query.date, 'date');
  const status = readQueryParameter(request.query.status, 'status');
  const sort = readQueryParameter(request.query.sort, 'sort');

  if (period && period !== 'today') {
    throw new ApiError(400, 'Period must be "today" when provided.', 'INVALID_PERIOD');
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, 'Date must be formatted as YYYY-MM-DD.', 'INVALID_DATE');
  }
  if (sort && !['latest', 'most-complained'].includes(sort)) {
    throw new ApiError(400, 'Sort must be "latest" or "most-complained".', 'INVALID_SORT');
  }

  const complaints = await searchComplaintList({ q, category, subcategory, company, period, date, status, sort });

  response.json({ success: true, data: complaints });
}

function readQueryParameter(value, name) {
  if (value === undefined) return '';
  if (typeof value !== 'string') {
    throw new ApiError(400, `Query parameter "${name}" must be a string.`, 'INVALID_QUERY_PARAMETER');
  }

  return value;
}