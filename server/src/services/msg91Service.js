import { env } from '../config/env.js';

export async function sendMsg91Otp(phone, otp) {
  if (!env.msg91AuthKey) {
    throw new Error('MSG91_AUTH_KEY is not configured.');
  }

  if (!env.msg91TemplateId) {
    throw new Error('MSG91_TEMPLATE_ID is not configured.');
  }

  const mobile = `91${phone}`;

  const response = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: {
      authkey: env.msg91AuthKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: env.msg91TemplateId,
      mobile,
      otp,
    }),
  });

  const responseText = await response.text();

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    console.error('MSG91 API error:', {
      status: response.status,
      data,
    });

    throw new Error(
      `MSG91 returned HTTP ${response.status}.`
    );
  }

  console.log('MSG91 OTP response:', data);

  return data;
}