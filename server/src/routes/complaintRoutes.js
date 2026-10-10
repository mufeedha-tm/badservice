import { Router } from 'express';
import {
  getComplaintById,
  getComplaints,
  getMyComplaints,
  getComplaintRankings,
  postComplaint,
  postRequestDeleteComplaint,
  postCancelDeleteRequest,
  postDraftMediaUpload,
  trackComplaintStatus,
} from '../controllers/complaintController.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { uploadComplaintMedia } from '../middleware/upload.js';

const complaintRouter = Router();

complaintRouter.get('/complaints', getComplaints);
complaintRouter.get('/complaints/my', requireAuth, getMyComplaints);
complaintRouter.get('/complaints/rankings', getComplaintRankings);
complaintRouter.get('/complaints/track/:query', trackComplaintStatus);
complaintRouter.post(
  '/complaints/upload-media',
  uploadComplaintMedia.single('media'),
  postDraftMediaUpload
);
complaintRouter.post('/complaints/:id/request-delete', attachUser, postRequestDeleteComplaint);
complaintRouter.post('/complaints/:id/cancel-delete', attachUser, postCancelDeleteRequest);
complaintRouter.post(
  '/complaints',
  attachUser,
  uploadComplaintMedia.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
    { name: 'billImage', maxCount: 1 },
    { name: 'productVideo', maxCount: 1 },
    { name: 'proof', maxCount: 1 },
  ]),
  postComplaint
);
complaintRouter.get('/complaints/:id', attachUser, getComplaintById);

export default complaintRouter;
