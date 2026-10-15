import { prisma } from '../db/prisma';
import { recordAuditEvent } from '../mongodb/audit';
import { processOutboxQueue } from '../mongodb/outbox-worker';

export interface BookingRequestInput {
  userId: number;
  labId: number;
  purpose: string;
  startTime: Date | string;
  endTime: Date | string;
  items?: Array<{
    resourceId: number;
    quantityRequested: number;
  }>;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  conflictType?: 'INVALID_INTERVAL' | 'LAB_STATUS' | 'LAB_MAINTENANCE' | 'LAB_OVERLAP' | 'INSUFFICIENT_EQUIPMENT';
  conflictReason?: string;
  details?: Record<string, unknown>;
}

/**
 * Checks laboratory and equipment availability across an interval [startTime, endTime].
 * Strictly enforces overlap logic: existing_start < requested_end AND existing_end > requested_start.
 */
export async function checkAvailability(
  labId: number,
  startTimeInput: Date | string,
  endTimeInput: Date | string,
  items: Array<{ resourceId: number; quantityRequested: number }> = [],
  excludeBookingId?: number
): Promise<AvailabilityResult> {
  const start = new Date(startTimeInput);
  const end = new Date(endTimeInput);

  // 1. Validate interval
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return {
      isAvailable: false,
      conflictType: 'INVALID_INTERVAL',
      conflictReason: 'The requested end time must be strictly after the start time.',
    };
  }

  // 2. Validate lab existence and general status
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
  });

  if (!lab) {
    return {
      isAvailable: false,
      conflictType: 'LAB_STATUS',
      conflictReason: `Lab ID ${labId} does not exist.`,
    };
  }

  if (lab.status === 'INACTIVE') {
    return {
      isAvailable: false,
      conflictType: 'LAB_STATUS',
      conflictReason: `${lab.name} is currently marked as INACTIVE.`,
    };
  }

  if (lab.status === 'MAINTENANCE') {
    return {
      isAvailable: false,
      conflictType: 'LAB_STATUS',
      conflictReason: `${lab.name} is currently under facility-wide maintenance.`,
    };
  }

  // 3. Check for overlapping lab maintenance windows
  const overlappingLabMaintenance = await prisma.maintenance.findFirst({
    where: {
      labId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (overlappingLabMaintenance) {
    return {
      isAvailable: false,
      conflictType: 'LAB_MAINTENANCE',
      conflictReason: `Lab is unavailable due to maintenance #${overlappingLabMaintenance.id}: "${overlappingLabMaintenance.description}".`,
      details: { maintenance: overlappingLabMaintenance },
    };
  }

  // 4. Check for overlapping blocking bookings (APPROVED or PENDING)
  const overlappingBooking = await prisma.booking.findFirst({
    where: {
      labId,
      status: { in: ['APPROVED', 'PENDING'] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  if (overlappingBooking) {
    return {
      isAvailable: false,
      conflictType: 'LAB_OVERLAP',
      conflictReason: `Lab has a conflicting booking #${overlappingBooking.id} (${overlappingBooking.status}) from ${overlappingBooking.startTime.toISOString()} to ${overlappingBooking.endTime.toISOString()}.`,
      details: { booking: overlappingBooking },
    };
  }

  // 5. Check equipment quantities against active reservations and equipment maintenance
  for (const item of items) {
    if (item.quantityRequested <= 0) continue;

    const resource = await prisma.resource.findUnique({
      where: { id: item.resourceId },
    });

    if (!resource) {
      return {
        isAvailable: false,
        conflictType: 'INSUFFICIENT_EQUIPMENT',
        conflictReason: `Resource #${item.resourceId} does not exist.`,
      };
    }

    if (resource.status !== 'AVAILABLE') {
      return {
        isAvailable: false,
        conflictType: 'INSUFFICIENT_EQUIPMENT',
        conflictReason: `Resource "${resource.name}" is marked as ${resource.status}.`,
      };
    }

    // Check if resource is under active maintenance during this interval
    const resourceUnderMaintenance = await prisma.maintenance.findFirst({
      where: {
        resourceId: item.resourceId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (resourceUnderMaintenance) {
      return {
        isAvailable: false,
        conflictType: 'INSUFFICIENT_EQUIPMENT',
        conflictReason: `Resource "${resource.name}" is undergoing maintenance during this window.`,
      };
    }

    // Sum quantities reserved in overlapping APPROVED or PENDING bookings
    const overlappingItems = await prisma.bookingItem.findMany({
      where: {
        resourceId: item.resourceId,
        booking: {
          status: { in: ['APPROVED', 'PENDING'] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
      select: {
        quantityRequested: true,
      },
    });

    const alreadyReserved = overlappingItems.reduce((acc, curr) => acc + curr.quantityRequested, 0);
    const availableQty = Math.max(0, resource.totalQuantity - alreadyReserved);

    if (item.quantityRequested > availableQty) {
      return {
        isAvailable: false,
        conflictType: 'INSUFFICIENT_EQUIPMENT',
        conflictReason: `Insufficient inventory for "${resource.name}". Requested: ${item.quantityRequested}, Available in window: ${availableQty} (Total: ${resource.totalQuantity}, Reserved: ${alreadyReserved}).`,
        details: {
          resourceId: item.resourceId,
          resourceName: resource.name,
          requested: item.quantityRequested,
          available: availableQty,
          total: resource.totalQuantity,
        },
      };
    }
  }

  return { isAvailable: true };
}

/**
 * Concurrency-Safe Transactional Booking Creator:
 * Runs inside a Prisma interactive transaction.
 * Sorts resource requests by resourceId ASC to prevent database deadlocks.
 * Rolls back atomically if any conflict or inventory shortage occurs.
 */
export async function createBookingWithAllocation(input: BookingRequestInput) {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (end <= start) {
    throw new Error('Booking end time must be later than start time.');
  }

  const items = input.items || [];
  // Sort items deterministically by resourceId to prevent deadlocks under concurrency
  const sortedItems = [...items].sort((a, b) => a.resourceId - b.resourceId);

  return await prisma.$transaction(async (tx) => {
    // 1. Check lab availability within transaction
    const overlappingLabBooking = await tx.booking.findFirst({
      where: {
        labId: input.labId,
        status: { in: ['APPROVED', 'PENDING'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (overlappingLabBooking) {
      throw new Error(`Lab is already booked during this time interval (Booking #${overlappingLabBooking.id}).`);
    }

    const labMaintenance = await tx.maintenance.findFirst({
      where: {
        labId: input.labId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (labMaintenance) {
      throw new Error(`Lab is scheduled for maintenance during this time: "${labMaintenance.description}".`);
    }

    // 2. Verify and allocate each requested resource in locked order
    for (const item of sortedItems) {
      if (item.quantityRequested <= 0) continue;

      const resource = await tx.resource.findUnique({
        where: { id: item.resourceId },
      });

      if (!resource) {
        throw new Error(`Resource ID ${item.resourceId} does not exist.`);
      }

      if (resource.status !== 'AVAILABLE') {
        throw new Error(`Resource "${resource.name}" is currently ${resource.status}.`);
      }

      // Check equipment maintenance
      const maintenanceConflict = await tx.maintenance.findFirst({
        where: {
          resourceId: item.resourceId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

      if (maintenanceConflict) {
        throw new Error(`Resource "${resource.name}" has scheduled maintenance during this time.`);
      }

      // Calculate reserved quantity in overlapping active bookings
      const bookedUnits = await tx.bookingItem.aggregate({
        _sum: { quantityRequested: true },
        where: {
          resourceId: item.resourceId,
          booking: {
            status: { in: ['APPROVED', 'PENDING'] },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        },
      });

      const reservedTotal = bookedUnits._sum.quantityRequested || 0;
      const remainingQty = resource.totalQuantity - reservedTotal;

      if (item.quantityRequested > remainingQty) {
        throw new Error(
          `Insufficient inventory for "${resource.name}". Requested: ${item.quantityRequested}, Available: ${remainingQty} of ${resource.totalQuantity}.`
        );
      }
    }

    // 3. Create booking header
    const booking = await tx.booking.create({
      data: {
        userId: input.userId,
        labId: input.labId,
        purpose: input.purpose,
        startTime: start,
        endTime: end,
        status: 'PENDING',
        bookingItems: {
          create: sortedItems.map((item) => ({
            resourceId: item.resourceId,
            quantityRequested: item.quantityRequested,
          })),
        },
      },
      include: {
        bookingItems: { include: { resource: true } },
        lab: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 4. Create in-app notification
    await tx.notification.create({
      data: {
        userId: input.userId,
        message: `Your reservation request #${booking.id} for "${booking.lab.name}" has been submitted for review.`,
        type: 'BOOKING_REQUEST',
      },
    });

    // 5. Append outbox event atomically for MongoDB audit sync
    await tx.outboxEvent.create({
      data: {
        eventType: 'BOOKING_REQUESTED',
        payload: JSON.stringify({
          booking_id: booking.id,
          user_id: input.userId,
          user_email: booking.user.email,
          role: booking.user.role,
          lab_id: booking.labId,
          lab_name: booking.lab.name,
          purpose: booking.purpose,
          start_time: booking.startTime.toISOString(),
          end_time: booking.endTime.toISOString(),
          items: sortedItems,
          timestamp: new Date().toISOString(),
        }),
        status: 'PENDING',
      },
    });

    return booking;
  }).then(async (booking) => {
    // Asynchronously dispatch outbox event to MongoDB
    processOutboxQueue().catch((err) => console.error('[OutboxDispatch] Async error:', err));
    return booking;
  });
}

/**
 * Concurrency-Safe Transactional Booking Approval/Rejection:
 */
export async function resolveBooking(
  bookingId: number,
  adminId: number,
  decision: 'APPROVED' | 'REJECTED',
  comments?: string
) {
  const resolved = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        lab: true,
        user: true,
        bookingItems: { include: { resource: true } },
      },
    });

    if (!booking) {
      throw new Error(`Booking #${bookingId} not found.`);
    }

    if (booking.status !== 'PENDING') {
      throw new Error(`Booking #${bookingId} is already ${booking.status}.`);
    }

    if (decision === 'APPROVED') {
      // Re-verify no other approved booking grabbed the slot in the meantime
      const conflict = await tx.booking.findFirst({
        where: {
          labId: booking.labId,
          id: { not: bookingId },
          status: 'APPROVED',
          startTime: { lt: booking.endTime },
          endTime: { gt: booking.startTime },
        },
      });

      if (conflict) {
        throw new Error(`Cannot approve: Conflicting booking #${conflict.id} is already APPROVED for this slot.`);
      }
    }

    // Update booking status
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: decision,
        approval: {
          create: {
            adminId,
            decision,
            comments: comments || null,
          },
        },
      },
      include: {
        approval: true,
        lab: true,
        user: true,
      },
    });

    // Notify user
    await tx.notification.create({
      data: {
        userId: booking.userId,
        message: `Your booking #${booking.id} for "${booking.lab.name}" was ${decision}. ${comments ? `Notes: ${comments}` : ''}`,
        type: decision === 'APPROVED' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
      },
    });

    // Outbox record for MongoDB audit
    await tx.outboxEvent.create({
      data: {
        eventType: decision === 'APPROVED' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
        payload: JSON.stringify({
          booking_id: bookingId,
          admin_id: adminId,
          decision,
          comments,
          lab_id: booking.labId,
          user_id: booking.userId,
          timestamp: new Date().toISOString(),
        }),
        status: 'PENDING',
      },
    });

    return updated;
  });

  // Trigger outbox queue processing
  processOutboxQueue().catch((err) => console.error('[OutboxDispatch] Async error:', err));
  return resolved;
}

/**
 * Concurrency-Safe Booking Cancellation:
 */
export async function cancelBooking(bookingId: number, userId: number, isAdmin: boolean = false) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { lab: true },
    });

    if (!booking) {
      throw new Error(`Booking #${bookingId} not found.`);
    }

    if (!isAdmin && booking.userId !== userId) {
      throw new Error('Unauthorized: You can only cancel your own bookings.');
    }

    if (booking.status === 'CANCELLED') {
      throw new Error(`Booking #${bookingId} is already cancelled.`);
    }

    const cancelled = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    await tx.notification.create({
      data: {
        userId: booking.userId,
        message: `Booking #${booking.id} for "${booking.lab.name}" has been cancelled.`,
        type: 'BOOKING_CANCELLED',
      },
    });

    await tx.outboxEvent.create({
      data: {
        eventType: 'BOOKING_CANCELLED',
        payload: JSON.stringify({
          booking_id: bookingId,
          user_id: userId,
          lab_id: booking.labId,
          timestamp: new Date().toISOString(),
        }),
        status: 'PENDING',
      },
    });

    return cancelled;
  });

  processOutboxQueue().catch((err) => console.error('[OutboxDispatch] Async error:', err));
  return result;
}
