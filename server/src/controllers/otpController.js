import { sendOtp, verifyOtp } from '../services/otpService.js';

export async function postSendOtp(request, response) {
  const result = await sendOtp(request.body);
  response.json({ success: true, data: result });
}

export async function postVerifyOtp(request, response) {
  const result = await verifyOtp(request.body);
  response.json({ success: true, data: result });
}
