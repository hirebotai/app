import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CouponRow {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used: number;
  active: boolean;
  expires_at: string | null;
  applicable_plans: string[];
  created_at: string;
}

export function couponAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder_key'
  );
}

export function discountedAmount(basePaise: number, discountPercent: number): number {
  return Math.round((basePaise * (100 - discountPercent)) / 100);
}

export async function validateCoupon(
  client: SupabaseClient,
  rawCode: string
): Promise<{ valid: boolean; coupon?: CouponRow; message?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, message: 'Please enter a coupon code.' };
  }

  const { data, error } = await client
    .from('coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('Coupon lookup error:', error.message);
    return { valid: false, message: 'Could not check coupon. Please try again.' };
  }
  if (!data) {
    return { valid: false, message: 'Coupon not found.' };
  }
  if (!data.active) {
    return { valid: false, message: 'This coupon has been deactivated.' };
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false, message: 'This coupon has expired.' };
  }
  if (data.used >= data.max_uses) {
    return { valid: false, message: 'This coupon has reached its usage limit.' };
  }
  return { valid: true, coupon: data };
}

export async function incrementCouponUsage(
  client: SupabaseClient,
  rawCode: string
): Promise<boolean> {
  const { error } = await client.rpc('increment_coupon_usage', {
    p_code: rawCode.trim().toUpperCase(),
  });
  if (error) {
    console.error('Coupon increment error:', error.message);
    return false;
  }
  return true;
}
