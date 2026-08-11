import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOtpToken, generateOtp } from '@/lib/otp';
import { emailExists } from '@/lib/supabase/admin';
import { getClientIp, loginLimiter } from '@/lib/rateLimit';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const key = `reset:${ip}:${email}`;
  if (!loginLimiter.check(key)) {
    return NextResponse.json(
      { error: 'Too many reset requests. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  try {
    if (!(await emailExists(email))) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }
  } catch (err) {
    console.error('forgot-password email check failed:', err);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email service is not configured yet. Please try again later.' },
      { status: 503 }
    );
  }

  const code = generateOtp();
  const { token, expiresAt } = createOtpToken(email, code);

  const from =
    process.env.RESEND_FROM_EMAIL ?? 'Hirebotai <no-reply@hirebotai.in>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Hirebotai password reset code',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0b12;color:#e5e5ec;padding:32px;text-align:center;">
          <div style="max-width:440px;margin:0 auto;background:#14141f;border:1px solid #262635;border-radius:16px;padding:32px;">
            <p style="font-size:14px;color:#a1a1b5;margin:0 0 16px;">Your Hirebotai password reset code</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#a78bfa;padding:16px 0;border-top:1px solid #262635;border-bottom:1px solid #262635;">${code}</div>
            <p style="font-size:13px;color:#a1a1b5;margin:20px 0 0;">Enter this code on the Hirebotai website to set a new password. It expires in 10 minutes.</p>
            <p style="font-size:12px;color:#6b6b80;margin:24px 0 0;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend send reset failed:', text);
    return NextResponse.json(
      { error: 'Failed to send the reset email. Please try again later.' },
      { status: 502 }
    );
  }

  const response = NextResponse.json({ ok: true, expiresAt });
  response.cookies.set('hb_reset', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return response;
}
