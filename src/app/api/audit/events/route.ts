import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { getAuditEvents, getAuditEventAggregations } from '@/lib/mongodb/audit';
import { processOutboxQueue } from '@/lib/mongodb/outbox-worker';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Trigger sync from MySQL outbox to MongoDB to guarantee up-to-the-millisecond audit consistency
    await processOutboxQueue().catch((e) => console.error('[AuditEndpoint] Outbox sync error:', e));

    const { searchParams } = new URL(req.url);
    const event_type = searchParams.get('event_type') || undefined;
    const entity_type = searchParams.get('entity_type') || undefined;
    const entity_id = searchParams.get('entity_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const [eventsData, aggregations] = await Promise.all([
      getAuditEvents({
        event_type,
        entity_type,
        entity_id,
        limit,
        skip,
      }),
      getAuditEventAggregations(),
    ]);

    return NextResponse.json({
      ...eventsData,
      aggregations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: error?.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
