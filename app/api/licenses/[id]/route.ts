import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorMessage } from '@/lib/errors';
import { getClientIp, writeLimiter } from '@/lib/rateLimit';
import { supabaseAdmin, requireAdmin } from '@/lib/supabase/admin';

const patchSchema = z.object({
  status: z.enum(['active', 'expired', 'revoked']).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
  }

  const patch: { status?: string; expires_at?: string | null } = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.expiresAt !== undefined) patch.expires_at = parsed.data.expiresAt;

  try {
    const { data, error } = await supabaseAdmin()
      .from('licenses')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ license: data });
  } catch (err) {
    console.error('Licenses PATCH error:', err);
    return NextResponse.json({ error: `Failed to update license: ${errorMessage(err)}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const { error } = await supabaseAdmin().from('licenses').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Licenses DELETE error:', err);
    return NextResponse.json({ error: `Failed to delete license: ${errorMessage(err)}` }, { status: 500 });
  }
}
