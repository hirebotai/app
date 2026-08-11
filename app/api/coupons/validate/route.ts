import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { couponAdminClient, validateCoupon } from '@/lib/coupons';
import { getClientIp, loginLimiter } from '@/lib/rateLimit';

const validateSchema = z.object({
  code: z.string().min(1).max(40),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const code = parsed.data.code.trim().toUpperCase();
  if (!loginLimiter.check(`coupon:${ip}:${code}`)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  const result = await validateCoupon(couponAdminClient(), code);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.message }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    code: result.coupon!.code,
    discountPercent: result.coupon!.discount_percent,
    applicablePlans: result.coupon!.applicable_plans ?? ['monthly', 'yearly', 'lifetime'],
  });
}
