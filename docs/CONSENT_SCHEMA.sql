-- Consent proof and privacy-request codes for the waitlist.
-- Run once in the Supabase SQL Editor, after WAITLIST_SCHEMA.sql.
-- Safe to run again. consent_log is append-only: no UPDATE grant.

create table if not exists public.consent_log (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.waitlist_signups (id) on delete cascade,
  kind text not null check (kind in ('privacy', 'rules', 'marketing')),
  granted boolean not null,
  text_version text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists consent_log_signup_id_idx
  on public.consent_log (signup_id, created_at);

create table if not exists public.waitlist_privacy_codes (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Counts of invites left behind when someone deletes their account.
-- No name, email, code, or signup id.
create table if not exists public.waitlist_anonymous_referrals (
  id uuid primary key default gen_random_uuid(),
  invite_count integer not null check (invite_count > 0),
  created_at timestamptz not null default now()
);

create index if not exists waitlist_signups_unverified_created_idx
  on public.waitlist_signups (created_at)
  where email_verified_at is null;

alter table public.consent_log enable row level security;
alter table public.waitlist_privacy_codes enable row level security;
alter table public.waitlist_anonymous_referrals enable row level security;

revoke all on table public.consent_log from anon, authenticated;
revoke all on table public.waitlist_privacy_codes from anon, authenticated;
revoke all on table public.waitlist_anonymous_referrals from anon, authenticated;

grant select, insert, delete on table public.consent_log to service_role;
grant select, insert, update, delete on table public.waitlist_privacy_codes to service_role;
grant select, insert on table public.waitlist_anonymous_referrals to service_role;
