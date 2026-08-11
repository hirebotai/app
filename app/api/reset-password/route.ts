import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyResetToken } from '@/lib/otp';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorMessage } from '@/lib/errors';
import { getClientIp, writeLimiter } from '@/lib/rateLimit';

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const token = request.cookies.get('hb_reset_ok')?.value;
  if (!token || !verifyResetToken(token, email)) {
    return NextResponse.json(
      { error: 'This reset session has expired. Please request a new reset code.' },
      { status: 400 }
    );
  }

  try {
    const { data: users } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
    const user = users?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin().auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
    });
    if (error) throw error;

    const response = NextResponse.json({ ok: true });
    response.cookies.set('hb_reset_ok', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: `Failed to reset password: ${errorMessage(err)}` },
      { status: 500 }
    );
  }
}
