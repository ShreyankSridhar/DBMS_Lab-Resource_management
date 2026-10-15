import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { updateResourceSchema } from '@/lib/validation/schemas';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resourceId = parseInt(id, 10);

    if (isNaN(resourceId)) {
      return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        lab: true,
        category: true,
        maintenances: {
          orderBy: { startTime: 'desc' },
          take: 5,
        },
      },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource });
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
    const resourceId = parseInt(id, 10);

    if (isNaN(resourceId)) {
      return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateResourceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: validated.data,
      include: { lab: true, category: true },
    });

    recordAuditEvent({
      event_type: 'RESOURCE_UPDATED',
      actor_user_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'RESOURCE',
      entity_id: resourceId,
      timestamp: new Date(),
      metadata: validated.data,
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({ resource: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
