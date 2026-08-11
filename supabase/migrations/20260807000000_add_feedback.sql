-- SQL Schema Migration for Hirebotai Database (Supabase / PostgreSQL)
-- Feedback / Bug Reports submitted via the website support & contact forms.

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  category text not null default 'question' check (category in ('bug', 'feature', 'question', 'other')),
  app_version text not null default '',
  status text not null default 'new' check (status in ('new', 'in-progress', 'resolved', 'closed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for fast triage by recency and status
create index if not exists idx_feedback_created on public.feedback(created_at desc);
create index if not exists idx_feedback_status on public.feedback(status);
create index if not exists idx_feedback_category on public.feedback(category);

-- Enable Row Level Security
alter table public.feedback enable row level security;

-- NOTE: No RLS policies are granted to anon/authenticated roles.
-- All reads/writes go through the server-side API (/api/feedback, /api/contact)
-- using the service role key, which bypasses RLS.
