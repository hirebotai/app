-- Trial state, bound to the device HWID so reinstalling the app or wiping
-- local data cannot reset the free trial.
create table if not exists public.trials (
  hwid text primary key,
  trial_start bigint not null, -- ms epoch when this device's trial began
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_trials_trial_start on public.trials(trial_start);

-- Service-role (server) access only; no anon policies, so the public cannot
-- read or overwrite trial records.
alter table public.trials enable row level security;
