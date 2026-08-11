-- Bind trials to a logged-in account so the same user+device resolves to the
-- same trial across reinstalls, and so the admin panel can see who trialed.
-- user_id is nullable: legacy records created by older builds are HWID-only.
alter table public.trials add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.trials add column if not exists email text;

create index if not exists idx_trials_user_id on public.trials(user_id);
