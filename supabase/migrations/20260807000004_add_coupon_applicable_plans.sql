-- Restricts which plans a coupon can be redeemed on.
-- Applicable plans: 'monthly' | 'yearly' | 'lifetime' (multi-select).
-- Existing coupons default to all three plans.

alter table public.coupons
  add column if not exists applicable_plans text[]
    not null default array['monthly', 'yearly', 'lifetime']::text[];
