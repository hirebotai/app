import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOtpToken } from '@/lib/otp';

const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  code: z.string().min(6, 'Please enter the 6-digit code').max(6, 'Please enter the 6-digit code'),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const token = request.cookies.get('hb_otp')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'No verification code was issued. Please request a new one.' },
      { status: 400 }
    );
  }

  if (!verifyOtpToken(token, parsed.data.email, parsed.data.code)) {
    return NextResponse.json(
      { error: 'Invalid or expired verification code. Please request a new one.' },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('hb_otp', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
