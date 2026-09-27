import { Router } from 'express';
import { getComplaintById, getComplaints, postComplaint } from '../controllers/complaintController.js';

const complaintRouter = Router();

complaintRouter.get('/complaints', getComplaints);
complaintRouter.post('/complaints', postComplaint);
complaintRouter.get('/complaints/:id', getComplaintById);

export default complaintRouter;