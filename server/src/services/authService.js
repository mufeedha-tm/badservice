import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as authRepository from '../repositories/mysqlAuthRepository.js';
import { ApiError } from '../utils/ApiError.js';

const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const dummySalt = randomBytes(16).toString('hex');

export async function registerAccount(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'An account object is required.', 'INVALID_ACCOUNT');
  }

  const name = readText(input.name, 'Name', 80);
  const email = normalizeEmail(input.email);
  const password = readPassword(input.password);
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(password, passwordSalt);
  const user = {
    id: randomUUID(),
    name,
    email,
    passwordSalt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  const insertedUser = await authRepository.insertUser(user);

  if (!insertedUser) throw new ApiError(409, 'An account with this email already exists.', 'ACCOUNT_EXISTS');

  return createSession(insertedUser);
}

export async function loginAccount(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Login details are required.', 'INVALID_CREDENTIALS');
  }

  const email = normalizeEmail(input.email);
  const password = readPassword(input.password);
  const user = await authRepository.findUserByEmail(email);
  const salt = user?.passwordSalt || dummySalt;
  const candidateHash = await hashPassword(password, salt);

  if (!user || !safeHashMatches(candidateHash, user.passwordHash)) {
    throw new ApiError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  return createSession(user);
}

export async function getAccountForSession(sessionToken) {
  if (!sessionToken) return null;

  const tokenHash = hashSessionToken(sessionToken);
  const session = await authRepository.findSessionByTokenHash(tokenHash);
  if (!session) return null;

  const user = await authRepository.findUserById(session.userId);
  return user ? publicAccount(user) : null;
}

export async function endSession(sessionToken) {
  if (sessionToken) await authRepository.removeSession(hashSessionToken(sessionToken));
}

export function getSessionDurationSeconds() {
  return sessionDurationMs / 1000;
}

async function createSession(user) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();

  await authRepository.insertSession({
    tokenHash: hashSessionToken(token),
    userId: user.id,
    expiresAt,
  });

  return { account: publicAccount(user), token, expiresAt };
}

async function hashPassword(password, salt) {
  const result = await scrypt(password, salt, passwordKeyLength);
  return result.toString('hex');
}

function safeHashMatches(candidateHex, storedHex) {
  if (typeof storedHex !== 'string' || !/^[a-f0-9]+$/i.test(storedHex) || storedHex.length % 2 !== 0) {
    return false;
  }

  const candidate = Buffer.from(candidateHex, 'hex');
  const stored = Buffer.from(storedHex, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(value) {
  const email = readText(value, 'Email', 254).toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Enter a valid email address.', 'INVALID_EMAIL');
  }

  return email;
}

function readPassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new ApiError(400, 'Password must be between 8 and 128 characters.', 'INVALID_PASSWORD');
  }

  return value;
}

function readText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new ApiError(400, `${label} is required and must be ${maxLength} characters or fewer.`, 'INVALID_ACCOUNT_FIELD');
  }

  return value.trim();
}

function publicAccount(user) {
  return { id: user.id, name: user.name, email: user.email };
}