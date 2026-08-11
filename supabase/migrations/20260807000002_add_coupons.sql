-- SQL Schema Migration for Hirebotai Database (Supabase / PostgreSQL)
-- Promo coupons created in the admin panel and redeemed at checkout.

create table if not exists public.coupons (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  discount_percent integer not null check (discount_percent between 1 and 100),
  max_uses integer not null default 100 check (max_uses > 0),
  used integer not null default 0,
  active boolean not null default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_active on public.coupons(active);

alter table public.coupons enable row level security;

create policy "coupons_select" on public.coupons
  for select using (true);

-- Atomically increments the usage counter only while the coupon is still
-- redeemable (active, not expired, below max uses). Returns true on success.
create or replace function public.increment_coupon_usage(p_code text)
returns boolean
language sql
security definer
as $$
  update public.coupons
     set used = used + 1
   where code = p_code
     and active = true
     and (expires_at is null or expires_at > now())
     and used < max_uses
  returning true
$$;

revoke all on function public.increment_coupon_usage(text) from public;
grant execute on function public.increment_coupon_usage(text) to service_role;
