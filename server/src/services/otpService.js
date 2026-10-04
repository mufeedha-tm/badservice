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
import { sendMsg91Otp } from './msg91Service.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function sendOtp(input) {
  const phone = normalizePhone(input?.phone);
  const email = normalizeEmail(input?.email);

  const latest = await otpRepository.findLatestByPhone(phone);

  if (latest?.createdAt) {
    const ageMs =
      Date.now() - new Date(latest.createdAt).getTime();

    if (
      ageMs < RESEND_COOLDOWN_MS &&
      !latest.verifiedAt
    ) {
      const waitSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - ageMs) / 1000
      );

      throw new ApiError(
        429,
        `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        'OTP_RATE_LIMITED'
      );
    }
  }

  const code = String(randomInt(100000, 1000000));

  const expiresAt = new Date(
    Date.now() + OTP_TTL_MS
  );

  await otpRepository.insertChallenge({
    id: randomUUID(),
    phone,
    email,
    codeHash: hashValue(`${phone}:${code}`),
    expiresAt: expiresAt
      .toISOString()
      .slice(0, 19)
      .replace('T', ' '),
  });

  try {
    if (env.otpMethod === 'msg91') {
      await sendMsg91Otp(phone, code);
    } else {
      throw new Error(
        'Unsupported OTP_METHOD. Use OTP_METHOD=msg91.'
      );
    }
  } catch (error) {
    console.error('MSG91 OTP delivery failed:', error);

    throw new ApiError(
      502,
      'We could not send the verification SMS. Please try again.',
      'OTP_DELIVERY_FAILED'
    );
  }

  return {
    phone,
    email,
    expiresIn: OTP_TTL_MS / 1000,
    delivery: 'sms',
    message: `A 6-digit verification code was sent to ${maskPhone(phone)}.`,
  };
}

export async function verifyOtp(input) {
  const phone = normalizePhone(input?.phone);

  const code =
    typeof input?.otp === 'string'
      ? input.otp.trim()
      : '';

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(
      400,
      'Enter the 6-digit OTP sent to your phone.',
      'INVALID_OTP'
    );
  }

  const challenge =
    await otpRepository.findLatestByPhone(phone);

  if (!challenge) {
    throw new ApiError(
      400,
      'Request a new OTP before verifying.',
      'OTP_NOT_FOUND'
    );
  }

  if (challenge.consumedAt) {
    throw new ApiError(
      400,
      'This OTP has already been used. Request a new one.',
      'OTP_CONSUMED'
    );
  }

  if (
    new Date(challenge.expiresAt).getTime() <
    Date.now()
  ) {
    throw new ApiError(
      400,
      'Verification code expired. Please request a new code.',
      'OTP_EXPIRED'
    );
  }

  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      'Too many incorrect attempts. Request a new code.',
      'OTP_LOCKED'
    );
  }

  const expected = Buffer.from(
    challenge.codeHash,
    'hex'
  );

  const actual = Buffer.from(
    hashValue(`${phone}:${code}`),
    'hex'
  );

  const matches =
    expected.length === actual.length &&
    timingSafeEqual(expected, actual);

  if (!matches) {
    await otpRepository.incrementAttempts(
      challenge.id
    );

    throw new ApiError(
      400,
      'Incorrect verification code. Please check your phone and try again.',
      'OTP_MISMATCH'
    );
  }

  const verificationToken =
    randomBytes(32).toString('base64url');

  const tokenExpiresAt = new Date(
    Date.now() + TOKEN_TTL_MS
  )
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
    email: challenge.email || null,
    verified: true,
    verificationToken,
    expiresIn: TOKEN_TTL_MS / 1000,
  };
}

export async function assertVerificationToken(
  phone,
  verificationToken
) {
  const normalizedPhone = normalizePhone(phone);

  if (
    !verificationToken ||
    typeof verificationToken !== 'string'
  ) {
    throw new ApiError(
      401,
      'Phone verification is required before submitting a complaint.',
      'OTP_REQUIRED'
    );
  }

  const challenge =
    await otpRepository.findByVerificationTokenHash(
      hashValue(verificationToken.trim())
    );

  if (
    !challenge ||
    challenge.phone !== normalizedPhone
  ) {
    throw new ApiError(
      401,
      'Phone verification is invalid or expired. Verify the code again.',
      'OTP_INVALID'
    );
  }

  if (!challenge.verifiedAt) {
    throw new ApiError(
      401,
      'Phone number has not been verified.',
      'OTP_NOT_VERIFIED'
    );
  }

  if (challenge.consumedAt) {
    throw new ApiError(
      401,
      'This verification has already been used. Verify the code again.',
      'OTP_CONSUMED'
    );
  }

  if (
    !challenge.tokenExpiresAt ||
    new Date(challenge.tokenExpiresAt).getTime() <
      Date.now()
  ) {
    throw new ApiError(
      401,
      'Phone verification expired. Verify the code again.',
      'OTP_EXPIRED'
    );
  }

  return {
    phone: normalizedPhone,
    challengeId: challenge.id,
    email: challenge.email || null,
  };
}

export async function consumeVerificationToken(
  phone,
  verificationToken
) {
  const verified = await assertVerificationToken(
    phone,
    verificationToken
  );

  await otpRepository.markConsumed(
    verified.challengeId
  );

  return verified.phone;
}

export async function consumeChallenge(challengeId) {
  if (challengeId) {
    await otpRepository.markConsumed(challengeId);
  }
}

function normalizePhone(value) {
  if (!value || typeof value !== 'string') {
    throw new ApiError(
      400,
      'Phone number is required.',
      'INVALID_PHONE'
    );
  }

  const cleaned = value
    .trim()
    .replace(/[\s\-()]/g, '');

  if (
    !/^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned)
  ) {
    throw new ApiError(
      400,
      'Please enter a valid 10-digit Indian phone number.',
      'INVALID_PHONE'
    );
  }

  return cleaned.slice(-10);
}

function normalizeEmail(value) {
  const email =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : '';

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  ) {
    throw new ApiError(
      400,
      'Please enter a valid email address.',
      'INVALID_EMAIL'
    );
  }

  return email;
}

function hashValue(value) {
  const secret =
    env.otpSecret || 'badservice-dev-otp';

  return createHash('sha256')
    .update(`${secret}:${value}`)
    .digest('hex');
}

function maskPhone(phone) {
  return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
}