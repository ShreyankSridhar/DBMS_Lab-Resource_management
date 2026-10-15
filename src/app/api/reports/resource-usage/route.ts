import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireAdmin();

    const categories = await prisma.resourceCategory.findMany({
      include: {
        resources: {
          include: {
            bookingItems: {
              where: {
                booking: { status: { in: ['APPROVED', 'PENDING'] } },
              },
              select: { quantityRequested: true },
            },
          },
        },
      },
    });

    const categoryBreakdown = categories.map((cat) => {
      const totalUnits = cat.resources.reduce((acc, r) => acc + r.totalQuantity, 0);
      const demandedUnits = cat.resources.reduce((acc, r) => {
        return acc + r.bookingItems.reduce((biAcc, bi) => biAcc + bi.quantityRequested, 0);
      }, 0);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        equipmentTypesCount: cat.resources.length,
        totalInventoryUnits: totalUnits,
        totalDemandedUnits: demandedUnits,
        demandRatio: totalUnits > 0 ? Math.round((demandedUnits / totalUnits) * 100) : 0,
      };
    });

    // Peak booking hours distribution (extract hour from start_time)
    const allBookings = await prisma.booking.findMany({
      select: { startTime: true },
    });

    const hourDistribution: Record<number, number> = {};
    for (let h = 8; h <= 20; h++) hourDistribution[h] = 0;

    allBookings.forEach((b) => {
      const hour = new Date(b.startTime).getHours();
      if (hourDistribution[hour] !== undefined) {
        hourDistribution[hour]++;
      }
    });

    return NextResponse.json({
      categoryBreakdown,
      peakHours: Object.entries(hourDistribution).map(([hour, count]) => ({
        hour: `${hour}:00`,
        count,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
