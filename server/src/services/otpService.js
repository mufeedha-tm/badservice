import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { connect } from 'node:tls';
import { env } from '../config/env.js';
import * as otpRepository from '../repositories/mysqlOtpRepository.js';
import { ApiError } from '../utils/ApiError.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function sendOtp(input) {
  const phone = normalizePhone(input?.phone);
  const email = normalizeEmail(input?.email);
  const latest = await otpRepository.findLatestByPhone(phone);

  if (latest?.createdAt) {
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();
    if (ageMs < RESEND_COOLDOWN_MS && !latest.verifiedAt) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - ageMs) / 1000);
      throw new ApiError(429, `Please wait ${waitSeconds} seconds before requesting another OTP.`, 'OTP_RATE_LIMITED');
    }
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await otpRepository.insertChallenge({
    id: randomUUID(),
    phone,
    email,
    codeHash: hashValue(`${phone}:${code}`),
    expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
  });

  try {
    await deliverEmailOtp(email, code);
  } catch (error) {
    console.error('Gmail OTP delivery failed:', error);
    throw new ApiError(502, 'We could not send the verification email. Please check the email address and try again.', 'OTP_DELIVERY_FAILED');
  }

  return {
    phone,
    email,
    expiresIn: OTP_TTL_MS / 1000,
    delivery: 'email',
    message: `A 6-digit verification code was sent to ${maskEmail(email)}.`,
  };
}

export async function verifyOtp(input) {
  const phone = normalizePhone(input?.phone);
  const code = typeof input?.otp === 'string' ? input.otp.trim() : '';

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(400, 'Enter the 6-digit OTP sent to your email.', 'INVALID_OTP');
  }

  const challenge = await otpRepository.findLatestByPhone(phone);
  if (!challenge) {
    throw new ApiError(400, 'Request a new OTP before verifying.', 'OTP_NOT_FOUND');
  }
  if (challenge.consumedAt) {
    throw new ApiError(400, 'This OTP has already been used. Request a new one.', 'OTP_CONSUMED');
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new ApiError(400, 'Verification code expired. Please request a new code.', 'OTP_EXPIRED');
  }
  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts. Request a new code.', 'OTP_LOCKED');
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const actual = Buffer.from(hashValue(`${phone}:${code}`), 'hex');
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!matches) {
    await otpRepository.incrementAttempts(challenge.id);
    throw new ApiError(400, 'Incorrect verification code. Please check your email and try again.', 'OTP_MISMATCH');
  }

  const verificationToken = randomBytes(32).toString('base64url');
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString().slice(0, 19).replace('T', ' ');
  await otpRepository.markVerified(challenge.id, hashValue(verificationToken), tokenExpiresAt);

  return {
    phone,
    email: challenge.email || null,
    verified: true,
    verificationToken,
    expiresIn: TOKEN_TTL_MS / 1000,
  };
}

export async function assertVerificationToken(phone, verificationToken) {
  const normalizedPhone = normalizePhone(phone);
  if (!verificationToken || typeof verificationToken !== 'string') {
    throw new ApiError(401, 'Email verification is required before submitting a complaint.', 'OTP_REQUIRED');
  }
  const challenge = await otpRepository.findByVerificationTokenHash(hashValue(verificationToken.trim()));
  if (!challenge || challenge.phone !== normalizedPhone) {
    throw new ApiError(401, 'Email verification is invalid or expired. Verify the code again.', 'OTP_INVALID');
  }
  if (!challenge.verifiedAt) {
    throw new ApiError(401, 'Email address has not been verified.', 'OTP_NOT_VERIFIED');
  }
  if (challenge.consumedAt) {
    throw new ApiError(401, 'This verification has already been used. Verify the code again.', 'OTP_CONSUMED');
  }
  if (!challenge.tokenExpiresAt || new Date(challenge.tokenExpiresAt).getTime() < Date.now()) {
    throw new ApiError(401, 'Email verification expired. Verify the code again.', 'OTP_EXPIRED');
  }
  return { phone: normalizedPhone, challengeId: challenge.id, email: challenge.email || null };
}

export async function consumeVerificationToken(phone, verificationToken) {
  const verified = await assertVerificationToken(phone, verificationToken);
  await otpRepository.markConsumed(verified.challengeId);
  return verified.phone;
}

export async function consumeChallenge(challengeId) {
  if (challengeId) await otpRepository.markConsumed(challengeId);
}

function normalizePhone(value) {
  if (!value || typeof value !== 'string') throw new ApiError(400, 'Phone number is required.', 'INVALID_PHONE');
  const cleaned = value.trim().replace(/[\s\-()]/g, '');
  if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned)) throw new ApiError(400, 'Please enter a valid 10-digit Indian phone number.', 'INVALID_PHONE');
  return cleaned.slice(-10);
}

function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ApiError(400, 'Please enter a valid email address.', 'INVALID_EMAIL');
  return email;
}

function hashValue(value) {
  const secret = env.otpSecret || 'badservice-dev-otp';
  return createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  const visible = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

function deliverEmailOtp(to, code) {
  if (!env.smtpUser || !env.smtpPass) {
    throw new Error('SMTP_USER and SMTP_PASS are required for Gmail OTP delivery.');
  }
  return smtpSend({
    host: env.smtpHost,
    port: env.smtpPort,
    user: env.smtpUser,
    pass: env.smtpPass,
    to,
    from: env.smtpUser,
    subject: 'BadService.in — Email Verification Code',
    text: `Your BadService.in verification code is ${code}.\n\nThis code is valid for 10 minutes. Do not share it with anyone.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033"><h2 style="margin:0 0 16px">BadService.in</h2><p>Use the verification code below to continue filing your complaint:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 20px;background:#f4f7fb;border-radius:12px;text-align:center">${code}</div><p style="margin-top:18px">This code is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.</p><p style="color:#64748b;font-size:13px">Please do not share your verification code with anyone.</p></div>`,
  });
}

function smtpSend({ host, port, user, pass, to, from, subject, text, html }) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, servername: host, rejectUnauthorized: true });
    let buffer = '';
    let step = 0;
    let closed = false;
    const finish = (err) => { if (closed) return; closed = true; socket.end(); err ? reject(err) : resolve(); };
    const command = (value) => socket.write(`${value}\r\n`);
    const fail = (message) => finish(new Error(message));
    const expect = (code, next) => {
      const match = buffer.match(new RegExp(`(?:^|\\r\\n)${code}(?:[ -])[^\\r\\n]*(?:\\r\\n|$)`));
      if (!match) return false;
      buffer = buffer.slice(buffer.indexOf(match[0]) + match[0].length);
      next();
      return true;
    };

    socket.setTimeout(20000, () => fail('SMTP connection timed out.'));
    socket.on('error', (error) => finish(error));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      while (!closed) {
        if (step === 0 && expect('220', () => { command(`EHLO badservice.in`); step = 1; })) continue;
        if (step === 1 && expect('250', () => { command('AUTH LOGIN'); step = 2; })) continue;
        if (step === 2 && expect('334', () => { command(Buffer.from(user).toString('base64')); step = 3; })) continue;
        if (step === 3 && expect('334', () => { command(Buffer.from(pass).toString('base64')); step = 4; })) continue;
        if (step === 4 && expect('235', () => { command(`MAIL FROM:<${from}>`); step = 5; })) continue;
        if (step === 5 && expect('250', () => { command(`RCPT TO:<${to}>`); step = 6; })) continue;
        if (step === 6 && expect('250', () => { command('DATA'); step = 7; })) continue;
        if (step === 7 && expect('354', () => { command(buildMessage({ to, from, subject, text, html })); command('.'); step = 8; })) continue;
        if (step === 8 && expect('250', () => { command('QUIT'); finish(); })) continue;
        if (/^(?:4|5)\d\d/.test(buffer.trimStart())) fail(`SMTP server rejected the request: ${buffer.trim()}`);
        break;
      }
    });
  });
}

function buildMessage({ to, from, subject, text, html }) {
  const boundary = `=_BadService_${randomUUID()}`;
  return [
    `From: BadService.in <${from}>`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', text, '', `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', html, '', `--${boundary}--`, '',
  ].join('\r\n');
}
