import { Router } from 'express';
import { postSendOtp, postVerifyOtp } from '../controllers/otpController.js';

const otpRouter = Router();

otpRouter.post('/otp/send', postSendOtp);
otpRouter.post('/otp/request', postSendOtp);
otpRouter.post('/otp/verify', postVerifyOtp);

export default otpRouter;

