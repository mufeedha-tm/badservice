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
import { getAdminBillImageSource } from '../services/storageService.js';
import { ApiError } from '../utils/ApiError.js';

const BILL_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

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
  const { q, category, subcategory, company, status, sort, deleteRequested, onlyDeleted, includeDeleted } = request.query;
  const complaints = await complaintRepository.search({
    q: q || '',
    category: category || '',
    subcategory: subcategory || '',
    company: company || '',
    status: status || '',
    sort: sort || '',
    deleteRequested: deleteRequested === 'true' || deleteRequested === '1',
    onlyDeleted: onlyDeleted === 'true' || onlyDeleted === '1',
    includeDeleted: includeDeleted === 'true' || includeDeleted === '1',
  });
  response.json({ success: true, data: complaints.map(toAdminComplaint) });
}

export async function patchComplaintStatus(request, response) {
  const { status, reason } = request.body || {};
  if (status === 'REJECTED' && (!reason || !reason.trim())) {
    throw new ApiError(400, 'A reason is mandatory when rejecting a complaint.', 'REASON_REQUIRED');
  }
  const updated = await complaintRepository.updateStatus(request.params.id, status, reason ? reason.trim() : '');
  response.json({ success: true, data: toAdminComplaint(updated) });
}

export async function postRejectDeleteRequest(request, response) {
  const { reason } = request.body || {};
  if (!reason || !reason.trim()) {
    throw new ApiError(400, 'A reason is mandatory when rejecting a deletion request.', 'REASON_REQUIRED');
  }
  const updated = await complaintRepository.cancelDeleteRequest(request.params.id, reason.trim());
  response.json({ success: true, data: toAdminComplaint(updated) });
}

export async function getAdminComplaintBill(request, response, next) {
  const complaint = await complaintRepository.findById(request.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.', 'COMPLAINT_NOT_FOUND');
  const source = getAdminBillImageSource(complaint);
  if (!source) throw new ApiError(404, 'Bill image not found.', 'BILL_IMAGE_NOT_FOUND');

  response.set({
    'Cache-Control': 'private, max-age=86400, stale-while-revalidate=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `inline; filename="bill-image.${getBillExtension(complaint.billImageName)}"`,
    'Content-Type': getBillContentType(complaint.billImageName),
  });

  if (source.type === 'local') {
    const fs = await import('node:fs');
    if (!fs.existsSync(source.path)) {
      throw new ApiError(404, 'Bill image file not found on server.', 'BILL_FILE_NOT_FOUND');
    }
    return response.sendFile(source.path, (error) => {
      if (error && !response.headersSent) next(error);
    });
  }

  try {
    let imageResponse = await fetch(source.url);
    if (!imageResponse.ok && complaint.billImageUrl && complaint.billImageUrl !== source.url) {
      imageResponse = await fetch(complaint.billImageUrl);
    }
    if (!imageResponse.ok || !imageResponse.body) {
      throw new ApiError(502, 'The bill image could not be retrieved from storage.', 'BILL_IMAGE_STORAGE_ERROR');
    }

    const contentType = imageResponse.headers.get('content-type') || getBillContentType(complaint.billImageName);
    response.set('Content-Type', contentType);

    const { Readable } = await import('node:stream');
    return Readable.fromWeb(imageResponse.body).pipe(response);
  } catch (fetchErr) {
    if (fetchErr instanceof ApiError) throw fetchErr;
    throw new ApiError(502, `Failed to load bill image: ${fetchErr.message}`, 'BILL_IMAGE_FETCH_ERROR');
  }
}

export async function deleteComplaint(request, response) {
  const { reason } = request.body || {};
  if (!reason || !reason.trim()) {
    throw new ApiError(400, 'A reason is mandatory when deleting a complaint.', 'REASON_REQUIRED');
  }
  await complaintRepository.remove(request.params.id, request.user?.id || null, reason.trim());
  response.json({ success: true, message: 'Complaint removed and safely preserved in database.' });
}

export async function postRestoreComplaint(request, response) {
  await complaintRepository.restore(request.params.id);
  response.json({ success: true, message: 'Complaint restored to active status.' });
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

function toAdminComplaint(complaint) {
  const {
    billImagePublicId: _billImagePublicId,
    billImageVersion: _billImageVersion,
    ...adminComplaint
  } = complaint;
  return {
    ...adminComplaint,
    billImageUrl: adminComplaint.billImageUrl
      ? `/api/admin/complaints/${encodeURIComponent(adminComplaint.id)}/bill`
      : null,
  };
}

function getBillExtension(filename = '') {
  const extension = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
}

function getBillContentType(filename = '') {
  const extension = getBillExtension(filename);
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}
