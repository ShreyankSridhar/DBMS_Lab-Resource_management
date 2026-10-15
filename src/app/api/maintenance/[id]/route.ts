import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const maintenanceId = parseInt(id, 10);

    if (isNaN(maintenanceId)) {
      return NextResponse.json({ error: 'Invalid maintenance ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status, description } = body;

    const updated = await prisma.maintenance.update({
      where: { id: maintenanceId },
      data: {
        ...(status ? { status } : {}),
        ...(description ? { description } : {}),
      },
      include: { lab: true, resource: true },
    });

    recordAuditEvent({
      event_type: status === 'COMPLETED' ? 'MAINTENANCE_COMPLETED' : 'MAINTENANCE_SCHEDULED',
      actor_user_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'MAINTENANCE',
      entity_id: maintenanceId,
      timestamp: new Date(),
      metadata: { newStatus: status, description },
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({ maintenance: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
