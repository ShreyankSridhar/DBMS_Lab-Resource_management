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
    const comments = body?.comments || 'Approved by administrator';

    const result = await resolveBooking(bookingId, session.userId, 'APPROVED', comments);

    return NextResponse.json({
      message: `Booking #${bookingId} has been successfully APPROVED.`,
      booking: result,
    });
  } catch (error: any) {
    const isConflict = error?.message?.includes('Conflicting booking') || error?.message?.includes('already');
    return NextResponse.json(
      { error: error?.message || 'Approval failed' },
      { status: isConflict ? 409 : error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
