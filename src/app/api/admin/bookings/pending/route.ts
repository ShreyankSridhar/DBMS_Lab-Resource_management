import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireAdmin();

    const pendingBookings = await prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: {
        lab: true,
        user: { select: { id: true, name: true, email: true, department: true, role: true } },
        bookingItems: {
          include: {
            resource: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ pendingBookings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
