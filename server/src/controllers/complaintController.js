import {
  createComplaint as submitComplaint,
  getComplaint,
  listComplaints,
  searchComplaints as searchComplaintList,
} from '../services/complaintService.js';
import { ApiError } from '../utils/ApiError.js';

export async function getComplaints(_request, response) {
  const complaints = await listComplaints();
  response.json({ success: true, data: complaints });
}

export async function getComplaintById(request, response) {
  const complaint = await getComplaint(request.params.id);
  response.json({ success: true, data: complaint });
}

export async function postComplaint(request, response) {
  const complaint = await submitComplaint(request.body);
  response.status(201).json({ success: true, data: complaint });
}

export async function getSearchedComplaints(request, response) {
  const q = readQueryParameter(request.query.q, 'q');
  const category = readQueryParameter(request.query.category, 'category');
  const company = readQueryParameter(request.query.company, 'company');
  const period = readQueryParameter(request.query.period, 'period');
  const sort = readQueryParameter(request.query.sort, 'sort');

  if (period && period !== 'today') {
    throw new ApiError(400, 'Period must be "today" when provided.', 'INVALID_PERIOD');
  }
  if (sort && !['latest', 'most-complained'].includes(sort)) {
    throw new ApiError(400, 'Sort must be "latest" or "most-complained".', 'INVALID_SORT');
  }

  const complaints = await searchComplaintList({ q, category, company, period, sort });

  response.json({ success: true, data: complaints });
}

function readQueryParameter(value, name) {
  if (value === undefined) return '';
  if (typeof value !== 'string') {
    throw new ApiError(400, `Query parameter "${name}" must be a string.`, 'INVALID_QUERY_PARAMETER');
  }

  return value;
}