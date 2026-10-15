import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid university email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export const bookingItemSchema = z.object({
  resourceId: z.number().int().positive('Resource ID must be a positive integer.'),
  quantityRequested: z.number().int().min(1, 'Quantity must be at least 1 unit.'),
});

export const createBookingSchema = z
  .object({
    labId: z.number().int().positive('Lab ID must be a positive integer.'),
    purpose: z.string().min(5, 'Purpose must be at least 5 characters.'),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start time format.'),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end time format.'),
    items: z.array(bookingItemSchema).optional().default([]),
  })
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'End time must be strictly after start time.',
      path: ['endTime'],
    }
  );

export const checkAvailabilitySchema = z
  .object({
    labId: z.coerce.number().int().positive(),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val))),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val))),
    items: z
      .array(
        z.object({
          resourceId: z.coerce.number().int().positive(),
          quantityRequested: z.coerce.number().int().min(1),
        })
      )
      .optional()
      .default([]),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be strictly after start time.',
    path: ['endTime'],
  });

export const createLabSchema = z.object({
  name: z.string().min(3, 'Lab name must be at least 3 characters.'),
  building: z.string().min(2, 'Building is required.'),
  location: z.string().min(2, 'Location is required.'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1.'),
  description: z.string().optional(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'RESERVED', 'INACTIVE']).default('AVAILABLE'),
});

export const updateLabSchema = createLabSchema.partial();

export const createResourceSchema = z.object({
  labId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  name: z.string().min(3, 'Resource name must be at least 3 characters.'),
  description: z.string().optional(),
  totalQuantity: z.number().int().min(1, 'Total quantity must be at least 1.'),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'DECOMMISSIONED']).default('AVAILABLE'),
});

export const updateResourceSchema = createResourceSchema.partial();

export const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional(),
});

export const createMaintenanceSchema = z
  .object({
    labId: z.number().int().positive().nullable().optional(),
    resourceId: z.number().int().positive().nullable().optional(),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val))),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val))),
    description: z.string().min(5, 'Description must be at least 5 characters.'),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  })
  .refine(
    (data) => Boolean(data.labId || data.resourceId),
    {
      message: 'Either a labId or a resourceId must be specified.',
      path: ['labId'],
    }
  )
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'End time must be after start time.',
      path: ['endTime'],
    }
  );
