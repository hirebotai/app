import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getClientIp, writeLimiter } from '@/lib/rateLimit';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(4000),
  category: z.enum(['bug', 'feature', 'question', 'other']).optional().default('question'),
  app_version: z.string().max(20).optional().default(''),
});

// Best-effort: persist feedback into Supabase so admins can triage it.
async function persistFeedback(record: {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  app_version: string;
}) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
    );
    const { error } = await supabaseAdmin
      .from('feedback')
      .insert({ ...record, status: 'new' });
    if (error) console.error('Feedback persist error:', error.message);
  } catch (err) {
    console.error('Feedback persist error:', err);
  }
}

export async function POST(request: NextRequest) {
  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json(
      { error: 'Too many messages sent. Please wait a minute and try again.' },
      { status: 429 }
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const { name, email, subject, message } = parsed.data;

  // Always save to the admin feedback inbox (best-effort, never blocks the email).
  await persistFeedback({
    name,
    email,
    subject,
    message,
    category: parsed.data.category,
    app_version: parsed.data.app_version ?? '',
  });

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email service is not configured. Please contact hello@hirebotai.in directly.' },
      { status: 501 }
    );
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'Hirebotai Support <support@hirebotai.in>',
        to: [process.env.RESEND_TO_EMAIL ?? 'hello@hirebotai.in'],
        reply_to: email,
        subject: `[Support] ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend API error:', res.status, detail);
      return NextResponse.json({ error: 'Failed to send message. Please email us directly.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Failed to send message. Please email us directly.' }, { status: 500 });
  }
}
