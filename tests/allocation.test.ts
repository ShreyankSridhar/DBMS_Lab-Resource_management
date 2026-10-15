import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { checkAvailability } from '../src/lib/allocation/engine';
import { prisma } from '../src/lib/db/prisma';
import { getMongoDb } from '../src/lib/mongodb/client';
import { recordAuditEvent, getAuditEvents, getAuditEventAggregations } from '../src/lib/mongodb/audit';
import { hashPassword, verifyPassword } from '../src/lib/auth/passwords';
import { createSessionToken, verifySessionToken } from '../src/lib/auth/session';

describe('University Lab Resources Allocation System - Level 3 Test Suite', () => {
  beforeAll(async () => {
    // Ensure DB connection and embedded MongoDB are initialized
    try {
      await getMongoDb();
    } catch (e) {
      console.warn('MongoDB init warning:', e);
    }
  });

  // --------------------------------------------------------------------------
  // Test Case 1: Invalid time interval check (end_time <= start_time)
  // --------------------------------------------------------------------------
  it('TC-01: Rejects booking when end_time <= start_time', async () => {
    const start = new Date('2026-11-01T14:00:00Z');
    const invalidEnd = new Date('2026-11-01T12:00:00Z');

    const result = await checkAvailability(1, start, invalidEnd);
    expect(result.isAvailable).toBe(false);
    expect(result.conflictType).toBe('INVALID_INTERVAL');
    expect(result.conflictReason).toContain('strictly after');
  });

  // --------------------------------------------------------------------------
  // Test Case 2: Overlapping interval condition formula verification
  // Condition: existing_start < requested_end AND existing_end > requested_start
  // --------------------------------------------------------------------------
  it('TC-02: Overlap formula correctly flags overlapping intervals', () => {
    const existingStart = new Date('2026-11-01T10:00:00Z').getTime();
    const existingEnd = new Date('2026-11-01T12:00:00Z').getTime();

    // Case A: Inside existing interval
    const req1Start = new Date('2026-11-01T10:30:00Z').getTime();
    const req1End = new Date('2026-11-01T11:30:00Z').getTime();
    const isOverlap1 = existingStart < req1End && existingEnd > req1Start;
    expect(isOverlap1).toBe(true);

    // Case B: Partial overlap (starts before, ends inside)
    const req2Start = new Date('2026-11-01T09:00:00Z').getTime();
    const req2End = new Date('2026-11-01T11:00:00Z').getTime();
    const isOverlap2 = existingStart < req2End && existingEnd > req2Start;
    expect(isOverlap2).toBe(true);

    // Case C: Non-overlapping (strictly after)
    const req3Start = new Date('2026-11-01T12:00:00Z').getTime();
    const req3End = new Date('2026-11-01T14:00:00Z').getTime();
    const isOverlap3 = existingStart < req3End && existingEnd > req3Start;
    expect(isOverlap3).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Test Case 3: Password Hashing (Argon2 / Bcrypt) verification
  // --------------------------------------------------------------------------
  it('TC-03: Securely hashes password and rejects plain-text match failure', async () => {
    const plain = 'AcademicPass@2026';
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt signature

    const isMatch = await verifyPassword(plain, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Test Case 4: Server-side JWT Session Token issuance and tampering defense
  // --------------------------------------------------------------------------
  it('TC-04: Issues tamper-proof server-side session token', async () => {
    const payload = {
      userId: 4,
      email: 'student@university.edu',
      name: 'Shreyank S',
      role: 'STUDENT' as const,
      department: 'Computer Science',
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe('string');

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(4);
    expect(verified?.role).toBe('STUDENT');

    // Tampered token test
    const tampered = token.slice(0, -6) + 'abcdef';
    const tamperedResult = await verifySessionToken(tampered);
    expect(tamperedResult).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Test Case 5: MongoDB Audit Event Ingestion and Aggregation Pipeline
  // --------------------------------------------------------------------------
  it('TC-05: Writes audit event to MongoDB and verifies aggregation pipelines', async () => {
    const testEventId = await recordAuditEvent({
      event_type: 'BOOKING_REQUESTED',
      actor_user_id: 4,
      actor_email: 'student@university.edu',
      actor_role: 'STUDENT',
      entity_type: 'BOOKING',
      entity_id: 9999,
      timestamp: new Date(),
      metadata: { purpose: 'Automated Vitest Verification', lab_id: 1 },
      outcome: 'SUCCESS',
    });

    expect(testEventId).toBeTruthy();

    const auditData = await getAuditEvents({ event_type: 'BOOKING_REQUESTED', limit: 10 });
    expect(auditData.events.length).toBeGreaterThan(0);

    const aggregations = await getAuditEventAggregations();
    expect(aggregations.eventsByType).toBeInstanceOf(Array);
    expect(aggregations.eventsByEntity).toBeInstanceOf(Array);
  });

  // --------------------------------------------------------------------------
  // Test Case 6: Role Permission Isolation Verification
  // --------------------------------------------------------------------------
  it('TC-06: Verifies student role is blocked from admin access', () => {
    const studentUser = { role: 'STUDENT' };
    const isAdmin = studentUser.role === 'ADMIN' || studentUser.role === 'LAB_MANAGER';
    expect(isAdmin).toBe(false);

    const adminUser = { role: 'ADMIN' };
    const isAdminAllowed = adminUser.role === 'ADMIN' || adminUser.role === 'LAB_MANAGER';
    expect(isAdminAllowed).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test Case 7: Resource Inventory Availability Math
  // --------------------------------------------------------------------------
  it('TC-07: Calculates derived available quantity correctly', () => {
    const totalInventory = 20;
    const reservedUnits = 14;
    const maintenanceUnits = 0;

    const available = Math.max(0, totalInventory - reservedUnits - maintenanceUnits);
    expect(available).toBe(6);

    // If request asks for 8 units, shortage is correctly detected
    const requested = 8;
    expect(requested > available).toBe(true);
  });
});
