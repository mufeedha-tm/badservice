import { Router } from 'express';
import {
  getComplaintById,
  getComplaints,
  getComplaintRankings,
  getMyComplaints,
  postComplaint,
  postRequestDeleteComplaint,
} from '../controllers/complaintController.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { uploadComplaintMedia } from '../middleware/upload.js';

const complaintRouter = Router();

complaintRouter.get('/complaints', getComplaints);
complaintRouter.get('/complaints/rankings', getComplaintRankings);
complaintRouter.get('/complaints/my', requireAuth, getMyComplaints);
complaintRouter.post('/complaints/:id/request-delete', requireAuth, postRequestDeleteComplaint);
complaintRouter.post(
  '/complaints',
  attachUser,
  uploadComplaintMedia.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'billImage', maxCount: 1 },
    { name: 'productVideo', maxCount: 1 },
    { name: 'proof', maxCount: 1 },
  ]),
  postComplaint
);
complaintRouter.get('/complaints/:id', attachUser, getComplaintById);

export default complaintRouter;
