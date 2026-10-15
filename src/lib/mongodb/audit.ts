import { getMongoDb, ensureMongoIndexes } from './client';

export type AuditEventType =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'RESOURCE_CREATED'
  | 'RESOURCE_UPDATED'
  | 'LAB_CREATED'
  | 'LAB_UPDATED'
  | 'MAINTENANCE_SCHEDULED'
  | 'MAINTENANCE_COMPLETED'
  | 'USER_LOGIN'
  | 'SECURITY_ALERT';

export type EntityType = 'BOOKING' | 'LAB' | 'RESOURCE' | 'MAINTENANCE' | 'USER' | 'AUTH';

export interface AuditEvent {
  event_type: AuditEventType;
  actor_user_id: number | null;
  actor_email?: string | null;
  actor_role?: string;
  entity_type: EntityType;
  entity_id: number | string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  outcome: 'SUCCESS' | 'FAILURE';
}

let indexesInitialized = false;

export async function recordAuditEvent(event: AuditEvent): Promise<string> {
  const db = await getMongoDb();
  if (!indexesInitialized) {
    await ensureMongoIndexes();
    indexesInitialized = true;
  }

  const collection = db.collection('audit_events');
  const result = await collection.insertOne({
    ...event,
    timestamp: event.timestamp || new Date(),
  });

  return result.insertedId.toString();
}

export interface AuditQueryFilter {
  event_type?: string;
  entity_type?: string;
  entity_id?: number | string;
  actor_user_id?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}

export async function getAuditEvents(filter: AuditQueryFilter = {}) {
  const db = await getMongoDb();
  const collection = db.collection('audit_events');

  const query: Record<string, unknown> = {};

  if (filter.event_type && filter.event_type !== 'ALL') {
    query.event_type = filter.event_type;
  }
  if (filter.entity_type && filter.entity_type !== 'ALL') {
    query.entity_type = filter.entity_type;
  }
  if (filter.entity_id !== undefined && filter.entity_id !== '') {
    query.entity_id = Number(filter.entity_id) || filter.entity_id;
  }
  if (filter.actor_user_id) {
    query.actor_user_id = Number(filter.actor_user_id);
  }
  if (filter.startDate || filter.endDate) {
    query.timestamp = {};
    if (filter.startDate) (query.timestamp as Record<string, unknown>)['$gte'] = new Date(filter.startDate);
    if (filter.endDate) (query.timestamp as Record<string, unknown>)['$lte'] = new Date(filter.endDate);
  }

  const limit = Math.min(filter.limit || 50, 200);
  const skip = filter.skip || 0;

  const total = await collection.countDocuments(query);
  const events = await collection
    .find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return { events, total, limit, skip };
}

/**
 * MongoDB Aggregation Pipeline:
 * Produces aggregated analytics on event frequency, breakdowns by lab/entity, and daily activity.
 */
export async function getAuditEventAggregations() {
  const db = await getMongoDb();
  const collection = db.collection('audit_events');

  // Aggregation 1: Events grouped by event_type
  const eventsByType = await collection
    .aggregate([
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$outcome', 'SUCCESS'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$outcome', 'FAILURE'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  // Aggregation 2: Events grouped by entity_type
  const eventsByEntity = await collection
    .aggregate([
      {
        $group: {
          _id: '$entity_type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  // Aggregation 3: Activity trend by Date (YYYY-MM-DD)
  const activityTimeline = await collection
    .aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ])
    .toArray();

  // Aggregation 4: Most active users
  const topActors = await collection
    .aggregate([
      { $match: { actor_user_id: { $ne: null } } },
      {
        $group: {
          _id: {
            user_id: '$actor_user_id',
            email: '$actor_email',
            role: '$actor_role',
          },
          actions_count: { $sum: 1 },
        },
      },
      { $sort: { actions_count: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  return {
    eventsByType,
    eventsByEntity,
    activityTimeline,
    topActors,
  };
}
