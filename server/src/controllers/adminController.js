import {
  adminCreateCompany,
  adminUpdateCompanyStatus,
  approveCompanyRequest,
  listAllCompaniesAdmin,
  listCompanyRequests,
  rejectCompanyRequest,
} from '../services/companyService.js';
import {
  getAllUsers,
  setUserRole,
  setUserStatus,
} from '../services/authService.js';
import * as complaintRepository from '../repositories/mysqlComplaintRepository.js';
import * as categoryRepository from '../repositories/mysqlCategoryRepository.js';

export async function getAdminStats(_request, response) {
  const stats = await complaintRepository.getStats();
  response.json({ success: true, data: stats });
}

export async function getAdminCompanyRequests(request, response) {
  const status = request.query.status || '';
  const requests = await listCompanyRequests(status);
  response.json({ success: true, data: requests });
}

export async function postApproveCompanyRequest(request, response) {
  const result = await approveCompanyRequest(request.params.id, request.user.id);
  response.json({ success: true, data: result });
}

export async function postRejectCompanyRequest(request, response) {
  const result = await rejectCompanyRequest(request.params.id, request.user.id);
  response.json({ success: true, data: result });
}

export async function getAdminComplaints(request, response) {
  const { q, category, subcategory, company, status, sort } = request.query;
  const complaints = await complaintRepository.search({
    q: q || '',
    category: category || '',
    subcategory: subcategory || '',
    company: company || '',
    status: status || '',
    sort: sort || '',
  });
  response.json({ success: true, data: complaints });
}

export async function patchComplaintStatus(request, response) {
  const { status } = request.body || {};
  const updated = await complaintRepository.updateStatus(request.params.id, status);
  response.json({ success: true, data: updated });
}

export async function deleteComplaint(request, response) {
  await complaintRepository.remove(request.params.id);
  response.json({ success: true, message: 'Complaint deleted.' });
}

export async function getAdminCompanies(_request, response) {
  const companies = await listAllCompaniesAdmin();
  response.json({ success: true, data: companies });
}

export async function postAdminCompany(request, response) {
  const { name, categoryId, status } = request.body || {};
  const company = await adminCreateCompany({ name, categoryId, status });
  response.status(201).json({ success: true, data: company });
}

export async function patchAdminCompanyStatus(request, response) {
  const { status } = request.body || {};
  const updated = await adminUpdateCompanyStatus(request.params.id, status);
  response.json({ success: true, data: updated });
}

export async function getAdminUsers(_request, response) {
  const users = await getAllUsers();
  response.json({ success: true, data: users });
}

export async function patchAdminUserStatus(request, response) {
  const { status } = request.body || {};
  const updated = await setUserStatus(request.params.id, status);
  response.json({ success: true, data: updated });
}

export async function patchAdminUserRole(request, response) {

  const { role } = request.body || {};

  const updated = await setUserRole(
    request.params.id,
    role,
    request.user.id
  );

  response.json({ success: true, data: updated });

}

export async function getAdminCategories(_request, response) {
  const categories = await categoryRepository.findAll();
  response.json({ success: true, data: categories });
}
