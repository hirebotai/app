alter table public.licenses add column if not exists email text;

create index if not exists idx_licenses_email on public.licenses(email);
