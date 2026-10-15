import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
