import { Router } from 'express';
import authRouter from './authRoutes.js';
import categoryRouter from './categoryRoutes.js';
import complaintRouter from './complaintRoutes.js';
import complaintSearchRouter from './complaintSearchRoutes.js';
import companyRouter from './companyRoutes.js';
import companyRequestRouter from './companyRequestRoutes.js';
import adminRouter from './adminRoutes.js';
import healthRouter from './healthRoutes.js';
import navigationRouter from './navigationRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(navigationRouter);
apiRouter.use(authRouter);
apiRouter.use(complaintSearchRouter);
apiRouter.use(complaintRouter);
apiRouter.use(categoryRouter);
apiRouter.use(companyRouter);
apiRouter.use(companyRequestRouter);
apiRouter.use(adminRouter);

export default apiRouter;