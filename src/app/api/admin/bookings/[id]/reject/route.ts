import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { resolveBooking } from '@/lib/allocation/engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const comments = body?.comments || 'Rejected by administrator';

    const result = await resolveBooking(bookingId, session.userId, 'REJECTED', comments);

    return NextResponse.json({
      message: `Booking #${bookingId} has been REJECTED.`,
      booking: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Rejection failed' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
