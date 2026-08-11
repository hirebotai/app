-- SQL Schema Migration for Hirebotai Database (Supabase / PostgreSQL)

-- 1. Licenses Table (Device-Bound 1 PC License Engine)
create table if not exists public.licenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  license_key text unique not null,
  plan_type text not null check (plan_type in ('monthly', 'yearly', 'lifetime')),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  hwid text default null, -- Windows System CSPRODUCT UUID (Bound on first activation)
  activated_at timestamp with time zone default null,
  expires_at timestamp with time zone default null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for instant key & HWID lookups
create index if not exists idx_licenses_key on public.licenses(license_key);
create index if not exists idx_licenses_user_id on public.licenses(user_id);
create index if not exists idx_licenses_hwid on public.licenses(hwid);

-- Enable Row Level Security (RLS)
alter table public.licenses enable row level security;

-- Policy: Users can view their own purchased licenses
create policy "Users can view own licenses" 
  on public.licenses for select 
  using (auth.uid() = user_id);

-- 2. Helper function to generate unique SA-XXXX-XXXX license keys
create or replace function public.generate_license_key()
returns text as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := 'SA-';
  i integer;
begin
  for i in 1..16 loop
    if i = 5 or i = 9 or i = 13 then
      result := result || '-';
    end if;
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;
