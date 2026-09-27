import { Router } from 'express';
import { getCompanies } from '../controllers/companyController.js';

const companyRouter = Router();

companyRouter.get('/companies', getCompanies);

export default companyRouter;