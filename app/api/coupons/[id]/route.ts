import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { couponAdminClient } from '@/lib/coupons';
import { errorMessage } from '@/lib/errors';
import { getClientIp, writeLimiter } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/supabase/admin';

const patchSchema = z.object({
  active: z.boolean().optional(),
  applicablePlans: z.array(z.enum(['monthly', 'yearly', 'lifetime'])).min(1).optional(),
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
    const client = couponAdminClient();
    const updates: Record<string, unknown> = {};
    if (typeof parsed.data.active === 'boolean') updates.active = parsed.data.active;
    if (parsed.data.applicablePlans) updates.applicable_plans = parsed.data.applicablePlans;

    const { error: updateError } = await client.from('coupons').update(updates).eq('id', params.id);
    if (updateError) throw updateError;

    const { data, error } = await client
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ coupons: data });
  } catch (err) {
    console.error('Coupons PATCH error:', err);
    return NextResponse.json({ error: `Failed to update coupon: ${errorMessage(err)}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const client = couponAdminClient();
    const { error: deleteError } = await client.from('coupons').delete().eq('id', params.id);
    if (deleteError) throw deleteError;

    const { data, error } = await client
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ coupons: data });
  } catch (err) {
    console.error('Coupons DELETE error:', err);
    return NextResponse.json({ error: `Failed to delete coupon: ${errorMessage(err)}` }, { status: 500 });
  }
}
