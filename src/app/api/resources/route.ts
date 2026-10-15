import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { createResourceSchema } from '@/lib/validation/schemas';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const labId = searchParams.get('labId');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (labId) where.labId = parseInt(labId, 10);
    if (categoryId) where.categoryId = parseInt(categoryId, 10);
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        lab: { select: { id: true, name: true, building: true } },
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    // Compute real-time booked quantity for each resource
    const enriched = await Promise.all(
      resources.map(async (res) => {
        const booked = await prisma.bookingItem.aggregate({
          _sum: { quantityRequested: true },
          where: {
            resourceId: res.id,
            booking: {
              status: { in: ['APPROVED', 'PENDING'] },
              startTime: { lte: now },
              endTime: { gte: now },
            },
          },
        });

        const activeMaintenance = await prisma.maintenance.findFirst({
          where: {
            resourceId: res.id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            startTime: { lte: now },
            endTime: { gte: now },
          },
        });

        const currentlyBooked = booked._sum.quantityRequested || 0;
        const inMaintenance = activeMaintenance ? res.totalQuantity : 0;
        const availableNow = Math.max(0, res.totalQuantity - currentlyBooked - inMaintenance);

        return {
          ...res,
          currentlyBooked,
          inMaintenance: Boolean(activeMaintenance),
          availableNow,
        };
      })
    );

    const categories = await prisma.resourceCategory.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ resources: enriched, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const validated = createResourceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: validated.data,
      include: { lab: true, category: true },
    });

    recordAuditEvent({
      event_type: 'RESOURCE_CREATED',
      actor_user_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'RESOURCE',
      entity_id: resource.id,
      timestamp: new Date(),
      metadata: { name: resource.name, totalQuantity: resource.totalQuantity, labId: resource.labId },
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
