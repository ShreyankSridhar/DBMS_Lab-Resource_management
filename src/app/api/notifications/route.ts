import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await requireAuth();

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, readAt: null },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const { notificationId } = body;

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: session.userId },
        data: { readAt: new Date() },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: session.userId, readAt: null },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
