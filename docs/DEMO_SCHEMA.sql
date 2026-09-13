-- Isolated demo-mode storage. Does not touch profiles, bookings, or listings.
-- Run in Supabase SQL Editor. Safe to leave in place after launch: the app
-- never writes here unless NEXT_PUBLIC_DEMO_MODE is on.

create table if not exists public.demo_submissions (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_submissions_created_at_idx
  on public.demo_submissions (created_at desc);

-- Reuses public.set_updated_at() from CATALOG_SCHEMA.sql
drop trigger if exists demo_submissions_set_updated_at on public.demo_submissions;
create trigger demo_submissions_set_updated_at
  before update on public.demo_submissions
  for each row execute function public.set_updated_at();

alter table public.demo_submissions enable row level security;

-- No anon/authenticated policies: only service_role (bypasses RLS) can access.
revoke all on table public.demo_submissions from anon, authenticated;
grant select, insert, update, delete on table public.demo_submissions to service_role;
