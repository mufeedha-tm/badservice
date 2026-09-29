import { Router } from 'express';
import {
  deleteComplaint,
  getAdminCategories,
  getAdminCompanies,
  getAdminComplaints,
  getAdminCompanyRequests,
  getAdminStats,
  getAdminUsers,
  patchAdminCompanyStatus,
  patchAdminUserRole,
  patchAdminUserStatus,
  patchComplaintStatus,
  postAdminCompany,
  postApproveCompanyRequest,
  postRejectCompanyRequest,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const adminRouter = Router();

// Protect ALL admin routes with requireAuth and requireRole('ADMIN')
adminRouter.use('/admin', requireAuth, requireRole('ADMIN'));

adminRouter.get('/admin/stats', getAdminStats);

// Company requests
adminRouter.get('/admin/company-requests', getAdminCompanyRequests);
adminRouter.post('/admin/company-requests/:id/approve', postApproveCompanyRequest);
adminRouter.post('/admin/company-requests/:id/reject', postRejectCompanyRequest);

// Complaints
adminRouter.get('/admin/complaints', getAdminComplaints);
adminRouter.patch('/admin/complaints/:id/status', patchComplaintStatus);
adminRouter.delete('/admin/complaints/:id', deleteComplaint);

// Companies
adminRouter.get('/admin/companies', getAdminCompanies);
adminRouter.post('/admin/companies', postAdminCompany);
adminRouter.patch('/admin/companies/:id/status', patchAdminCompanyStatus);

// Users
adminRouter.get('/admin/users', getAdminUsers);
adminRouter.patch('/admin/users/:id/status', patchAdminUserStatus);
adminRouter.patch('/admin/users/:id/role', patchAdminUserRole);

// Categories
adminRouter.get('/admin/categories', getAdminCategories);

export default adminRouter;
