-- Contest exclusion and indexes for invite counts.
-- Run once in the Supabase SQL Editor, after WAITLIST_SCHEMA.sql.
-- Safe to run again.

alter table public.waitlist_signups
  add column if not exists contest_excluded boolean not null default false;

create table if not exists public.waitlist_contest_exclusions (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.waitlist_signups (id) on delete cascade,
  excluded boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_contest_exclusions_signup_idx
  on public.waitlist_contest_exclusions (signup_id, created_at desc);

create index if not exists waitlist_signups_referral_verified_idx
  on public.waitlist_signups (referred_by_code, email_verified_at)
  where referred_by_code is not null and email_verified_at is not null;

create index if not exists waitlist_signups_ip_created_idx
  on public.waitlist_signups (ip_hash, created_at);

create index if not exists waitlist_signups_referral_created_idx
  on public.waitlist_signups (referred_by_code, created_at)
  where referred_by_code is not null;

create index if not exists waitlist_signups_created_idx
  on public.waitlist_signups (created_at);

create index if not exists waitlist_signups_dream_venue_idx
  on public.waitlist_signups (dream_venue);

alter table public.waitlist_contest_exclusions enable row level security;

revoke all on table public.waitlist_contest_exclusions from anon, authenticated;
grant select, insert on table public.waitlist_contest_exclusions to service_role;
