import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { cancelBooking } from '@/lib/allocation/engine';

export async function POST(
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

    const isAdmin = session.role === 'ADMIN' || session.role === 'LAB_MANAGER';
    const cancelled = await cancelBooking(bookingId, session.userId, isAdmin);

    return NextResponse.json({
      message: `Booking #${bookingId} successfully cancelled.`,
      booking: cancelled,
    });
  } catch (error: any) {
    const status = error?.message?.includes('Unauthorized')
      ? 403
      : error?.message?.includes('not found')
      ? 404
      : 500;
    return NextResponse.json({ error: error?.message || 'Cancellation failed' }, { status });
  }
}
