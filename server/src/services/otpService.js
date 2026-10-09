import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { env } from '../config/env.js';
import * as otpRepository from '../repositories/mysqlOtpRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { sendOtpEmail } from './gmailService.js';

const OTP_TTL_MS = (env.otpTtlSeconds || 600) * 1000;
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 365 days permanent verification
const OTP_COOLDOWN_MS = (env.otpCooldownSeconds || 60) * 1000;
const MAX_ATTEMPTS = env.otpMaxAttempts || 5;

export async function sendOtp(input) {
  if (!input?.email) {
    return sendPhoneOtp(input?.phone);
  }

  const email = normalizeEmail(input?.email);
  const phone = input?.phone ? normalizePhoneOptional(input.phone) : null;

  const latest = await otpRepository.findLatestByEmail(email);

  if (latest?.createdAt) {
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();

    if (ageMs < OTP_COOLDOWN_MS && !latest.verifiedAt && !latest.consumedAt) {
      const waitSeconds = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - ageMs) / 1000));
      throw new ApiError(
        429,
        `Please wait ${waitSeconds} seconds before requesting another code.`,
        'OTP_RATE_LIMITED'
      );
    }
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const challengeId = randomUUID();
  const codeHash = hashValue(`${email}:${code}`);

  await otpRepository.insertChallenge({
    id: challengeId,
    email,
    phone,
    codeHash,
    expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
  });

  try {
    await sendOtpEmail({ to: email, otp: code });
  } catch (error) {
    // If sending fails, consume/invalidate challenge so user can retry cleanly without getting stuck
    await otpRepository.markConsumed(challengeId).catch(() => {});

    console.error('Email OTP delivery failed via Gmail API.');
    throw new ApiError(
      502,
      'We could not send the verification email. Please try again.',
      'OTP_DELIVERY_FAILED'
    );
  }

  return {
    email,
    expiresIn: OTP_TTL_MS / 1000,
    cooldownSeconds: OTP_COOLDOWN_MS / 1000,
    delivery: 'email',
    message: `Verification code sent to ${email}.`,
  };
}


export async function verifyOtp(input) {
  if (!input?.email) {
    return verifyPhoneOtp(input?.phone, input?.otp);
  }

  const email = normalizeEmail(input?.email);
  const code = typeof input?.otp === 'string' ? input.otp.trim() : '';

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(
      400,
      'Enter the 6-digit verification code sent to your email.',
      'INVALID_OTP'
    );
  }

  const challenge = await otpRepository.findLatestByEmail(email);

  if (!challenge) {
    throw new ApiError(
      400,
      'Request a new verification code before verifying.',
      'OTP_NOT_FOUND'
    );
  }

  if (challenge.consumedAt || challenge.verifiedAt) {
    throw new ApiError(
      400,
      'This verification code has already been used. Please request a new code.',
      'OTP_CONSUMED'
    );
  }


  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new ApiError(
      400,
      'This verification code has expired. Please request a new code.',
      'OTP_EXPIRED'
    );
  }

  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      'Too many incorrect attempts. Please request a new code.',
      'OTP_LOCKED'
    );
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const actual = Buffer.from(hashValue(`${email}:${code}`), 'hex');

  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await otpRepository.incrementAttempts(challenge.id);
    throw new ApiError(
      400,
      'Incorrect verification code. Please check the code and try again.',
      'OTP_MISMATCH'
    );
  }

  const verificationToken = randomBytes(32).toString('base64url');
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  await otpRepository.markVerified(
    challenge.id,
    hashValue(verificationToken),
    tokenExpiresAt
  );

  return {
    email,
    verified: true,
    verificationToken,
    expiresIn: TOKEN_TTL_MS / 1000,
  };
}

async function sendPhoneOtp(value) {
  const phone = normalizePhoneRequired(value);

  const latest = await otpRepository.findLatestByPhone(phone);
  if (latest?.createdAt) {
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();

    if (ageMs < OTP_COOLDOWN_MS && !latest.verifiedAt && !latest.consumedAt) {
      const waitSeconds = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - ageMs) / 1000));
      throw new ApiError(
        429,
        `Please wait ${waitSeconds} seconds before requesting another code.`,
        'OTP_RATE_LIMITED'
      );
    }
  }

  const code = String(randomInt(100000, 1000000));
  const challengeId = randomUUID();

  await otpRepository.insertChallenge({
    id: challengeId,
    email: null,
    phone,
    codeHash: hashValue(`${phone}:${code}`),
    expiresAt: new Date(Date.now() + OTP_TTL_MS)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' '),
  });

  return {
    phone,
    expiresIn: OTP_TTL_MS / 1000,
    cooldownSeconds: OTP_COOLDOWN_MS / 1000,
    delivery: 'test',
    testCode: code,
    message: `Test verification code generated for ${phone}.`,
  };
}

async function verifyPhoneOtp(value, otp) {
  const phone = normalizePhoneRequired(value);
  const code = typeof otp === 'string' ? otp.trim() : '';

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(
      400,
      'Enter the 6-digit verification code for your phone number.',
      'INVALID_OTP'
    );
  }

  const challenge = await otpRepository.findLatestByPhone(phone);

  if (!challenge) {
    throw new ApiError(
      400,
      'Request a new verification code before verifying.',
      'OTP_NOT_FOUND'
    );
  }

  if (challenge.consumedAt || challenge.verifiedAt) {
    throw new ApiError(
      400,
      'This verification code has already been used. Please request a new code.',
      'OTP_CONSUMED'
    );
  }

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new ApiError(
      400,
      'This verification code has expired. Please request a new code.',
      'OTP_EXPIRED'
    );
  }

  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      'Too many incorrect attempts. Please request a new code.',
      'OTP_LOCKED'
    );
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const actual = Buffer.from(hashValue(`${phone}:${code}`), 'hex');

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await otpRepository.incrementAttempts(challenge.id);
    throw new ApiError(
      400,
      'Incorrect verification code. Please check the code and try again.',
      'OTP_MISMATCH'
    );
  }

  const verificationToken = randomBytes(32).toString('base64url');
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  await otpRepository.markVerified(
    challenge.id,
    hashValue(verificationToken),
    tokenExpiresAt
  );

  return {
    phone,
    verified: true,
    verificationToken,
    expiresIn: TOKEN_TTL_MS / 1000,
  };
}

export async function assertVerificationToken(email, verificationToken) {
  const normalizedEmail = normalizeEmail(email);

  return assertChallengeToken(
    normalizedEmail,
    verificationToken,
    'email',
    'Email verification is required before submitting a complaint.',
    'Email verification is invalid or expired. Please verify your email again.',
    'Email address has not been verified.'
  );
}

export async function assertPhoneVerificationToken(phone, verificationToken) {
  const normalizedPhone = normalizePhoneRequired(phone);

  return assertChallengeToken(
    normalizedPhone,
    verificationToken,
    'phone',
    'Phone verification is required before submitting a complaint.',
    'Phone verification is invalid or expired. Please verify your phone number again.',
    'Phone number has not been verified.'
  );
}

async function assertChallengeToken(
  identifier,
  verificationToken,
  field,
  requiredMessage,
  invalidMessage,
  unverifiedMessage
) {
  if (!verificationToken || typeof verificationToken !== 'string') {
    throw new ApiError(
      401,
      requiredMessage,
      'OTP_REQUIRED'
    );
  }

  const challenge = await otpRepository.findByVerificationTokenHash(
    hashValue(verificationToken.trim())
  );

  if (challenge?.[field]?.toLowerCase() !== identifier) {
    throw new ApiError(
      401,
      invalidMessage,
      'OTP_INVALID'
    );
  }

  if (!challenge.verifiedAt) {
    throw new ApiError(
      401,
      unverifiedMessage,
      'OTP_NOT_VERIFIED'
    );
  }

  if (challenge.consumedAt && field !== 'phone') {
    throw new ApiError(
      401,
      'This verification has already been used. Please verify again.',
      'OTP_CONSUMED'
    );
  }

  if (
    !challenge.tokenExpiresAt ||
    new Date(challenge.tokenExpiresAt).getTime() < Date.now()
  ) {
    throw new ApiError(
      401,
      'Verification expired. Please request a new code.',
      'OTP_EXPIRED'
    );
  }

  return {
    email: challenge.email || null,
    challengeId: challenge.id,
    phone: challenge.phone || null,
  };
}

export async function consumeChallenge(challengeId) {
  if (challengeId) {
    await otpRepository.markConsumed(challengeId);
  }
}

function normalizeEmail(value) {
  if (!value || typeof value !== 'string') {
    throw new ApiError(400, 'Email address is required.', 'INVALID_EMAIL');
  }

  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address.', 'INVALID_EMAIL');
  }

  return email;
}

function normalizePhoneOptional(value) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/[\s\-()]/g, '');
  if (/^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned)) {
    return cleaned.slice(-10);
  }
  return cleaned;
}

function normalizePhoneRequired(value) {
  const phone = normalizePhoneOptional(value);
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Please enter a valid 10-digit mobile number.', 'INVALID_PHONE');
  }
  return phone;
}

function hashValue(value) {
  const secret = env.otpSecret || 'badservice-dev-otp-secret';
  return createHash('sha256')
    .update(`${secret}:${value}`)
    .digest('hex');
}