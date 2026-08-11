import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { couponAdminClient } from '@/lib/coupons';
import { errorMessage } from '@/lib/errors';
import { getClientIp, writeLimiter, publicLimiter } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/supabase/admin';

const PLAN_OPTIONS = ['monthly', 'yearly', 'lifetime'] as const;
export type CouponPlan = (typeof PLAN_OPTIONS)[number];

const createCouponSchema = z.object({
  code: z.string().min(1).max(40),
  discountPercent: z.number().int().min(1).max(100),
  maxUses: z.number().int().min(1),
  expiresAt: z.string().nullable().optional().default(null),
  applicablePlans: z.array(z.enum(PLAN_OPTIONS)).min(1),
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const { data, error } = await couponAdminClient()
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Coupons GET error:', error.message);
      return NextResponse.json({ error: `Failed to load coupons: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ coupons: data ?? [] });
  } catch (err) {
    console.error('Coupons GET error:', err);
    return NextResponse.json({ error: `Failed to load coupons: ${errorMessage(err)}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  try {
    const code = parsed.data.code.trim().toUpperCase();
    const { error: dupError } = await couponAdminClient()
      .from('coupons')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (dupError) throw dupError;

    const { data, error } = await couponAdminClient()
      .from('coupons')
      .insert({
        code,
        discount_percent: parsed.data.discountPercent,
        max_uses: parsed.data.maxUses,
        expires_at: parsed.data.expiresAt,
        applicable_plans: parsed.data.applicablePlans,
      })
      .select('*');

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Coupon ${code} already exists` }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ coupons: data });
  } catch (err) {
    console.error('Coupons POST error:', err);
    return NextResponse.json({ error: `Failed to create coupon: ${errorMessage(err)}` }, { status: 500 });
  }
}
