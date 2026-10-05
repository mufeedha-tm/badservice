import { Router } from 'express';
import {
  getCurrentAccount,
  postAdminLogin,
  postLogin,
  postLogout,
  postRegister,
} from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/auth/register', postRegister);
authRouter.post('/auth/login', postLogin);
authRouter.post('/auth/admin/login', postAdminLogin);
authRouter.get('/auth/me', getCurrentAccount);
authRouter.post('/auth/logout', postLogout);

export default authRouter;