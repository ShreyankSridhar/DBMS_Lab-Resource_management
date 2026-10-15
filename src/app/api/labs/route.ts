import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin, getCurrentSession } from '@/lib/auth/session';
import { createLabSchema } from '@/lib/validation/schemas';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const building = searchParams.get('building');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (building) where.building = building;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { building: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const labs = await prisma.lab.findMany({
      where,
      include: {
        _count: {
          select: {
            resources: true,
            bookings: true,
            maintenances: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ labs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const validated = createLabSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const lab = await prisma.lab.create({
      data: validated.data,
    });

    // Record audit event
    recordAuditEvent({
      event_type: 'LAB_CREATED',
      actor_user_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'LAB',
      entity_id: lab.id,
      timestamp: new Date(),
      metadata: { lab_name: lab.name, capacity: lab.capacity, building: lab.building },
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({ lab }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: error?.message?.includes('Forbidden') ? 403 : 500 });
  }
}
