import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getClientIp, publicLimiter, writeLimiter } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/supabase/admin';

// Initialize Supabase admin client using service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

const FEEDBACK_STATUSES = ['new', 'in-progress', 'resolved', 'closed'] as const;
const FEEDBACK_CATEGORIES = ['bug', 'feature', 'question', 'other'] as const;

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Invalid email'),
  subject: z.string().min(1, 'Subject is required').max(120),
  message: z.string().min(1, 'Message is required').max(4000),
  category: z.enum(FEEDBACK_CATEGORIES).optional().default('question'),
  app_version: z.string().max(20).optional().default(''),
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Feedback GET error:', error.message);
      return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
    }
    return NextResponse.json({ feedback: data ?? [] });
  } catch (err) {
    console.error('Feedback GET error:', err);
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
  }
}

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

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({ ...parsed.data, status: 'new' })
      .select('id')
      .single();

    if (error) {
      console.error('Feedback INSERT error:', error.message);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Feedback INSERT error:', err);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const patchSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(FEEDBACK_STATUSES),
  });
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid id or status' }, { status: 422 });
  }

  const { error } = await supabaseAdmin
    .from('feedback')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);

  if (error) {
    console.error('Feedback PATCH error:', error.message);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id } = body as { id?: string };
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('feedback').delete().eq('id', id);
  if (error) {
    console.error('Feedback DELETE error:', error.message);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
