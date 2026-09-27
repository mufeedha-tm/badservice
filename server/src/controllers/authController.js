import {
  endSession,
  getAccountForSession,
  getSessionDurationSeconds,
  loginAccount,
  registerAccount,
} from '../services/authService.js';
import { env } from '../config/env.js';

const sessionCookieName = 'badservice_session';

export async function postRegister(request, response) {
  const session = await registerAccount(request.body);
  response.setHeader('Set-Cookie', createSessionCookie(session.token));
  response.status(201).json({ success: true, data: session.account });
}

export async function postLogin(request, response) {
  const session = await loginAccount(request.body);
  response.setHeader('Set-Cookie', createSessionCookie(session.token));
  response.json({ success: true, data: session.account });
}

export async function getCurrentAccount(request, response) {
  const account = await getAccountForSession(readSessionCookie(request));
  response.json({ success: true, data: account });
}

export async function postLogout(request, response) {
  await endSession(readSessionCookie(request));
  response.setHeader('Set-Cookie', clearSessionCookie());
  response.json({ success: true, data: null });
}

function readSessionCookie(request) {
  const cookieHeader = request.headers.cookie || '';
  const prefix = `${sessionCookieName}=`;
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));

  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return null;
  }
}

function createSessionCookie(token) {
  const sameSite = env.production ? 'None' : 'Lax';
  return `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${getSessionDurationSeconds()}${env.production ? '; Secure' : ''}`;
}

function clearSessionCookie() {
  const sameSite = env.production ? 'None' : 'Lax';
  return `${sessionCookieName}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${env.production ? '; Secure' : ''}`;
}