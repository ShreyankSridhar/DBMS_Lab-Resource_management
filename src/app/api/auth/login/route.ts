import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/passwords';
import { setSessionCookie } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validation/schemas';
import { recordAuditEvent } from '@/lib/mongodb/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Record failed attempt in audit
      recordAuditEvent({
        event_type: 'SECURITY_ALERT',
        actor_user_id: null,
        actor_email: email,
        entity_type: 'AUTH',
        entity_id: email,
        timestamp: new Date(),
        metadata: { reason: 'User not found' },
        outcome: 'FAILURE',
      }).catch((e) => console.error(e));

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      recordAuditEvent({
        event_type: 'SECURITY_ALERT',
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        entity_type: 'AUTH',
        entity_id: user.id,
        timestamp: new Date(),
        metadata: { reason: 'Incorrect password' },
        outcome: 'FAILURE',
      }).catch((e) => console.error(e));

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      department: user.department,
    });

    // Record successful login in MongoDB audit
    recordAuditEvent({
      event_type: 'USER_LOGIN',
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      entity_type: 'AUTH',
      entity_id: user.id,
      timestamp: new Date(),
      metadata: { department: user.department },
      outcome: 'SUCCESS',
    }).catch((e) => console.error(e));

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error: any) {
    console.error('[API /api/auth/login] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
