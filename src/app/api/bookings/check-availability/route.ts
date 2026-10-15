import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/allocation/engine';
import { checkAvailabilitySchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = checkAvailabilitySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { isAvailable: false, conflictReason: 'Invalid parameters: ' + JSON.stringify(validated.error.flatten().fieldErrors) },
        { status: 400 }
      );
    }

    const { labId, startTime, endTime, items } = validated.data;
    const result = await checkAvailability(labId, startTime, endTime, items);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { isAvailable: false, conflictReason: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
