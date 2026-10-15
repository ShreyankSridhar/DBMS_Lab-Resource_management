import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '../db/prisma';

export interface UserSessionPayload {
  userId: number;
  email: string;
  name: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN' | 'LAB_MANAGER';
  department: string;
}

const COOKIE_NAME = 'lab_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-jwt-token-key-university-lab-resource-allocation-2026-min-32-chars'
);

export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: UserSessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<UserSessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error('Unauthorized: Authentication required.');
  }
  return session;
}

export async function requireAdmin(): Promise<UserSessionPayload> {
  const session = await requireAuth();
  if (session.role !== 'ADMIN' && session.role !== 'LAB_MANAGER') {
    throw new Error('Forbidden: Administrative privileges required.');
  }
  return session;
}
