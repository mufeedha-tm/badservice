import {
  createComplaint as submitComplaint,
  getComplaint,
  getUserComplaints,
  listComplaints,
  listRankings,
  requestComplaintDeletion,
  searchComplaints as searchComplaintList,
} from '../services/complaintService.js';
import { ApiError } from '../utils/ApiError.js';

export async function getComplaints(_request, response) {
  const complaints = await listComplaints();
  response.json({ success: true, data: complaints });
}

export async function getComplaintById(request, response) {
  const complaint = await getComplaint(request.params.id, request.user || null);
  response.json({ success: true, data: complaint });
}

export async function getMyComplaints(request, response) {
  const complaints = await getUserComplaints(request.user.id);
  response.json({ success: true, data: complaints });
}

export async function postRequestDeleteComplaint(request, response) {
  const { reason } = request.body || {};
  const result = await requestComplaintDeletion(request.params.id, request.user, reason);
  response.json({ success: true, data: result });
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