import { Router } from 'express';
import { getNavigationData } from '../controllers/navigationController.js';

const navigationRouter = Router();

navigationRouter.get('/navigation', getNavigationData);

export default navigationRouter;