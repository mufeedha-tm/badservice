import { Router } from 'express';
import {
  getComplaintById,
  getComplaints,
  getMyComplaints,
  postComplaint,
} from '../controllers/complaintController.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { uploadProof } from '../middleware/upload.js';

const complaintRouter = Router();

complaintRouter.get('/complaints', getComplaints);
complaintRouter.get('/complaints/my', requireAuth, getMyComplaints);
complaintRouter.post(
  '/complaints',
  requireAuth,
  uploadProof.single('proof'),
  postComplaint
);
complaintRouter.get('/complaints/:id', getComplaintById);

export default complaintRouter;