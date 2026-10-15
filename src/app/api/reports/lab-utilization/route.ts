import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireAdmin();

    // Query relational view directly or calculate via Prisma
    let viewData: any[] = [];
    try {
      viewData = await prisma.$queryRaw`SELECT * FROM view_lab_utilization ORDER BY total_hours_booked DESC`;
    } catch {
      // Fallback in case view is not yet created in the current DB instance
      const labs = await prisma.lab.findMany({
        include: {
          bookings: {
            where: { status: 'APPROVED' },
          },
          maintenances: {
            where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
          },
        },
      });

      viewData = labs.map((l) => {
        const totalMinutes = l.bookings.reduce((acc, b) => {
          return acc + (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60);
        }, 0);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        return {
          lab_id: l.id,
          lab_name: l.name,
          building: l.building,
          location: l.location,
          capacity: l.capacity,
          lab_status: l.status,
          total_approved_bookings: l.bookings.length,
          total_hours_booked: totalHours,
          active_maintenance_count: l.maintenances.length,
          estimated_monthly_utilization_pct: Math.round((totalHours / 360) * 10000) / 100,
        };
      });
    }

    // Overall booking statuses count
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const totalLabs = await prisma.lab.count();
    const totalResources = await prisma.resource.count();
    const totalBookings = await prisma.booking.count();

    return NextResponse.json({
      summary: {
        totalLabs,
        totalResources,
        totalBookings,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      labUtilization: viewData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
