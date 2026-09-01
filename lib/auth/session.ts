import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { AuthUser } from './types';
import { getUserById } from './store';

export const SESSION_COOKIE = 'echosphere_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sessionSecret(): string {
  return (
    process.env.NEXT_SESSION_SECRET ||
    process.env.NEXT_AGORA_APP_CERTIFICATE ||
    'echosphere-dev-session'
  );
}

function sign(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('hex');
}

export function encodeSession(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      userId?: string;
      exp?: number;
    };
    if (!data.userId || typeof data.exp !== 'number' || data.exp < Date.now()) {
      return null;
    }
    return data.userId;
  } catch {
    return null;
  }
}

export async function readSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const userId = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return getUserById(userId);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireSessionUser(): Promise<AuthUser> {
  const user = await readSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
