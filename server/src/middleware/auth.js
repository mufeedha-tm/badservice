import { getAccountForSession } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

export const sessionCookieName = 'badservice_session';

export function readSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';
  const prefix = `${sessionCookieName}=`;
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (cookie) {
    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch {
      // ignore
    }
  }

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

export async function attachUser(request, _response, next) {
  try {
    const token = readSessionToken(request);
    if (token) {
      const user = await getAccountForSession(token);
      if (user) {
        request.user = user;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(request, _response, next) {
  try {
    const token = readSessionToken(request);
    if (!token) {
      throw new ApiError(401, 'Authentication required. Please sign in.', 'AUTH_REQUIRED');
    }

    const user = await getAccountForSession(token);
    if (!user) {
      throw new ApiError(401, 'Session expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    if (user.status === 'DISABLED') {
      throw new ApiError(403, 'Your account has been disabled. Please contact support.', 'ACCOUNT_DISABLED');
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(requiredRole) {
  return (request, _response, next) => {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication required.', 'AUTH_REQUIRED'));
    }

    if (request.user.role !== requiredRole) {
      return next(new ApiError(403, 'Forbidden: Admin access required.', 'FORBIDDEN'));
    }

    next();
  };
}
