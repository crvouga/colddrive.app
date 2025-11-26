import { SignJWT, jwtVerify } from 'jose';
import { serialize, parse } from 'cookie';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Get session secret at request time (not module load time)
 * This ensures .env files are properly loaded before reading values
 */
function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'dev-secret-change-in-production';
}

// Get secret key for JWT
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret());
}

export interface SessionPayload {
  userId: string;
  sessionId: string;
  expiresAt: number;
}

/**
 * Create a session token JWT
 */
export async function createSessionToken(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  
  const jwt = await new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(expiresAt))
    .sign(getSecretKey());

  return jwt;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    
    if (!payload.userId || !payload.sessionId || !payload.exp) {
      return null;
    }

    return {
      userId: String(payload.userId),
      sessionId: String(payload.sessionId),
      expiresAt: payload.exp * 1000,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create a session cookie string
 */
export function createSessionCookie(token: string): string {
  return serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Create a cookie to delete the session
 */
export function createSessionDeleteCookie(): string {
  return serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Extract session token from cookie header
 */
export function getSessionTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = parse(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

