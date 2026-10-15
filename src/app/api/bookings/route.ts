import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';
import { createBookingSchema } from '@/lib/validation/schemas';
import { createBookingWithAllocation } from '@/lib/allocation/engine';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const labId = searchParams.get('labId');
    const userIdParam = searchParams.get('userId');

    const where: any = {};

    // Role-based visibility isolation:
    // Students and faculty can only see their own bookings unless administrative role
    if (session.role === 'STUDENT' || session.role === 'FACULTY') {
      where.userId = session.userId;
    } else if (userIdParam) {
      where.userId = parseInt(userIdParam, 10);
    }

    if (status && status !== 'ALL') where.status = status;
    if (labId) where.labId = parseInt(labId, 10);

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        lab: { select: { id: true, name: true, building: true, location: true } },
        user: { select: { id: true, name: true, email: true, department: true, role: true } },
        bookingItems: {
          include: {
            resource: { select: { id: true, name: true, totalQuantity: true } },
          },
        },
        approval: {
          include: {
            admin: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const validated = createBookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { labId, purpose, startTime, endTime, items } = validated.data;

    const booking = await createBookingWithAllocation({
      userId: session.userId,
      labId,
      purpose,
      startTime,
      endTime,
      items,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    const message = error?.message || 'Failed to submit booking';
    const isConflict =
      message.includes('already booked') ||
      message.includes('Insufficient inventory') ||
      message.includes('maintenance') ||
      message.includes('strictly after');

    return NextResponse.json(
      { error: message },
      { status: isConflict ? 409 : 500 }
    );
  }
}
