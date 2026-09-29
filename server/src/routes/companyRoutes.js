import { Router } from 'express';
import { getCompanies, getCompanyById } from '../controllers/companyController.js';

const companyRouter = Router();

companyRouter.get('/companies', getCompanies);
companyRouter.get('/companies/:id', getCompanyById);

export default companyRouter;