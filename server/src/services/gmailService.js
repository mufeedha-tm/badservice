import { google } from 'googleapis';
import { env } from '../config/env.js';

/**
 * Send transactional verification OTP emails via official Google Gmail API.
 */
export async function sendOtpEmail({ to, otp }) {
  const hasCredentials = Boolean(
    env.gmailClientId &&
    env.gmailClientSecret &&
    env.gmailRedirectUri &&
    env.gmailRefreshToken &&
    env.gmailSenderEmail
  );

  if (!hasCredentials) {
    throw new Error(
      'Gmail API is not configured. Set all required GMAIL_* environment variables.'
    );
  }

  const oAuth2Client = new google.auth.OAuth2(
    env.gmailClientId,
    env.gmailClientSecret,
    env.gmailRedirectUri
  );

  oAuth2Client.setCredentials({
    refresh_token: env.gmailRefreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const senderEmail = env.gmailSenderEmail;
  const subject = 'Your BadService.in verification code';
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const emailBody = [
    'BadService.in',
    '',
    'Your verification code is:',
    '',
    otp,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not request this code, you can ignore this email.',
  ].join('\r\n');

  const emailLines = [
    `From: BadService.in <${senderEmail}>`,
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    emailBody,
  ];

  const rawMessage = Buffer.from(emailLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
    },
  });
}
