import { Router } from 'express';
import { getSearchedComplaints } from '../controllers/complaintController.js';

const complaintSearchRouter = Router();

complaintSearchRouter.get('/complaints/search', getSearchedComplaints);

export default complaintSearchRouter;