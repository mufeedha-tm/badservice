import { Router } from 'express';
import { postCompanyRequest } from '../controllers/companyRequestController.js';

const companyRequestRouter = Router();

companyRequestRouter.post('/company-requests', postCompanyRequest);

export default companyRequestRouter;
