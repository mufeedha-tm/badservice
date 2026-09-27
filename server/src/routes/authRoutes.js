import { Router } from 'express';
import {
  getCurrentAccount,
  postLogin,
  postLogout,
  postRegister,
} from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/auth/register', postRegister);
authRouter.post('/auth/login', postLogin);
authRouter.get('/auth/me', getCurrentAccount);
authRouter.post('/auth/logout', postLogout);

export default authRouter;