import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
