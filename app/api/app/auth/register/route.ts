import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { verifyOtpToken } from '@/lib/otp';
import { getClientIp, loginLimiter } from '@/lib/rateLimit';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(80, 'Name is too long'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().min(6, 'Please enter the 6-digit code').max(6, 'Please enter the 6-digit code'),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Authentication is not configured yet. Please try again later.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const { name, password, code } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const key = `app:register:${getClientIp(request)}:${email}`;
  if (!loginLimiter.check(key)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  const token = request.cookies.get('hb_otp')?.value;
  if (!token || !verifyOtpToken(token, email, code)) {
    return NextResponse.json(
      { error: 'Invalid or expired verification code. Please request a new one.' },
      { status: 400 }
    );
  }

  try {
    const { data: created, error: createError } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      if (createError.message?.toLowerCase().includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in instead.' },
          { status: 409 }
        );
      }
      throw createError;
    }

    const { data: sessionData, error: signInError } = await supabaseAdmin().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !sessionData.session) throw signInError ?? new Error('Sign-in failed');

    const user = created.user;
    const response = NextResponse.json({
      success: true,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: (user.user_metadata as { name?: string } | null)?.name ?? '',
      },
    });

    response.cookies.set('hb_otp', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('App register error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
