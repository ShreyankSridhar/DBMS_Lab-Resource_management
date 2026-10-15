import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { createMaintenanceSchema } from '@/lib/validation/schemas';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const labId = searchParams.get('labId');
    const resourceId = searchParams.get('resourceId');
    const status = searchParams.get('status');

    const where: any = {};
    if (labId) where.labId = parseInt(labId, 10);
    if (resourceId) where.resourceId = parseInt(resourceId, 10);
    if (status && status !== 'ALL') where.status = status;

    const maintenanceList = await prisma.maintenance.findMany({
      where,
      include: {
        lab: true,
        resource: true,
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json({ maintenanceList });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const validated = createMaintenanceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { labId, resourceId, startTime, endTime, description, status } = validated.data;

    const maintenance = await prisma.maintenance.create({
      data: {
        labId: labId || null,
        resourceId: resourceId || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        description,
        status: status as any,
        createdBy: session.userId,
      },
      include: { lab: true, resource: true },
    });

    recordAuditEvent({
      event_type: 'MAINTENANCE_SCHEDULED',
      actor_user_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'MAINTENANCE',
      entity_id: maintenance.id,
      timestamp: new Date(),
      metadata: { labId, resourceId, description, startTime, endTime },
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({ maintenance }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
