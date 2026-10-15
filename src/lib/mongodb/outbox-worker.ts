import { prisma } from '../db/prisma';
import { recordAuditEvent, AuditEvent } from './audit';

/**
 * Transactional Outbox Processor:
 * Ensures atomicity between MySQL transactional writes and MongoDB audit records.
 * Polls or processes pending outbox_events rows from MySQL and pushes them into MongoDB.
 */
export async function processOutboxQueue(batchSize: number = 20): Promise<{
  processedCount: number;
  failedCount: number;
}> {
  let processedCount = 0;
  let failedCount = 0;

  try {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        retryCount: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    for (const event of pendingEvents) {
      try {
        const payload = JSON.parse(event.payload);

        const auditEvent: AuditEvent = {
          event_type: event.eventType as any,
          actor_user_id: payload.user_id || payload.admin_id || null,
          actor_email: payload.user_email || payload.actor_email || null,
          actor_role: payload.role || (payload.admin_id ? 'ADMIN' : 'STUDENT'),
          entity_type: payload.entity_type || (event.eventType.startsWith('BOOKING') ? 'BOOKING' : 'RESOURCE'),
          entity_id: payload.booking_id || payload.resource_id || payload.lab_id || event.id,
          timestamp: payload.timestamp ? new Date(payload.timestamp) : event.createdAt,
          metadata: payload,
          outcome: 'SUCCESS',
        };

        // Write to MongoDB
        await recordAuditEvent(auditEvent);

        // Mark as PROCESSED in MySQL
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
            errorMessage: null,
          },
        });

        processedCount++;
      } catch (err: any) {
        failedCount++;
        console.error(`[OutboxWorker] Failed to process event #${event.id}:`, err);

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
            errorMessage: err?.message || 'Unknown processing error',
          },
        });
      }
    }
  } catch (err) {
    console.error('[OutboxWorker] Error during outbox batch processing:', err);
  }

  return { processedCount, failedCount };
}
