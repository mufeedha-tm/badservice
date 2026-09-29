import { Router } from 'express';
import { postCompanyRequest } from '../controllers/companyRequestController.js';
import { requireAuth } from '../middleware/auth.js';

const companyRequestRouter = Router();

companyRequestRouter.post('/company-requests', requireAuth, postCompanyRequest);

export default companyRequestRouter;
