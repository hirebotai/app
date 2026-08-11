import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorMessage } from '@/lib/errors';
import { getClientIp, writeLimiter } from '@/lib/rateLimit';
import { supabaseAdmin, requireAdmin } from '@/lib/supabase/admin';

const patchSchema = z.object({
  banned: z.boolean(),
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

  try {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(params.id, {
      ban_duration: parsed.data.banned ? '8760h' : 'none',
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Users PATCH error:', err);
    return NextResponse.json({ error: `Failed to update user: ${errorMessage(err)}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const { error } = await supabaseAdmin().auth.admin.deleteUser(params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Users DELETE error:', err);
    return NextResponse.json({ error: `Failed to delete user: ${errorMessage(err)}` }, { status: 500 });
  }
}
