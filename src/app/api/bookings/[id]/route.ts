import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lab: true,
        user: { select: { id: true, name: true, email: true, department: true, role: true } },
        bookingItems: {
          include: { resource: true },
        },
        approval: {
          include: { admin: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Role check: non-admin can only view their own booking
    if (
      session.role !== 'ADMIN' &&
      session.role !== 'LAB_MANAGER' &&
      booking.userId !== session.userId
    ) {
      return NextResponse.json({ error: 'Forbidden: Access denied to other users bookings' }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
