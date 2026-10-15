import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { updateLabSchema } from '@/lib/validation/schemas';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const labId = parseInt(id, 10);

    if (isNaN(labId)) {
      return NextResponse.json({ error: 'Invalid lab ID' }, { status: 400 });
    }

    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        resources: {
          include: { category: true },
        },
        bookings: {
          where: {
            status: { in: ['APPROVED', 'PENDING'] },
            endTime: { gte: new Date() },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        maintenances: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            endTime: { gte: new Date() },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    return NextResponse.json({ lab });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const labId = parseInt(id, 10);

    if (isNaN(labId)) {
      return NextResponse.json({ error: 'Invalid lab ID' }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateLabSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.lab.update({
      where: { id: labId },
      data: validated.data,
    });

    recordAuditEvent({
      event_type: 'LAB_UPDATED',
      actor_user_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'LAB',
      entity_id: labId,
      timestamp: new Date(),
      metadata: validated.data,
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({ lab: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
