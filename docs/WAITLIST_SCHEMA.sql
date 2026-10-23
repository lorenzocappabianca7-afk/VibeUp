-- Pre-launch waitlist. Does not create Supabase Auth users.
-- Run once in the Supabase SQL Editor, after CATALOG_SCHEMA.sql
-- (reuses public.set_updated_at). Safe to run again.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  username text not null,
  email text not null,
  phone text,
  birth_year integer,
  high_school text,
  dream_venue text,
  vibeup_code text,
  referred_by_code text,
  email_confirmed_at timestamptz,
  email_verified_at timestamptz,
  consent_privacy_at timestamptz,
  consent_rules_at timestamptz,
  consent_marketing boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_username_lower_idx
  on public.waitlist_signups (lower(username));

create unique index if not exists waitlist_signups_email_lower_idx
  on public.waitlist_signups (lower(email));

create unique index if not exists waitlist_signups_phone_idx
  on public.waitlist_signups (phone);

create unique index if not exists waitlist_signups_vibeup_code_idx
  on public.waitlist_signups (vibeup_code)
  where vibeup_code is not null;

create index if not exists waitlist_signups_high_school_idx
  on public.waitlist_signups (high_school);

create table if not exists public.waitlist_email_codes (
  signup_id uuid primary key references public.waitlist_signups (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists waitlist_signups_set_updated_at on public.waitlist_signups;
create trigger waitlist_signups_set_updated_at
  before update on public.waitlist_signups
  for each row execute function public.set_updated_at();

drop trigger if exists waitlist_email_codes_set_updated_at on public.waitlist_email_codes;
create trigger waitlist_email_codes_set_updated_at
  before update on public.waitlist_email_codes
  for each row execute function public.set_updated_at();

alter table public.waitlist_signups enable row level security;
alter table public.waitlist_email_codes enable row level security;

-- No anon/authenticated policies: only service_role (bypasses RLS) can access.
revoke all on table public.waitlist_signups from anon, authenticated;
revoke all on table public.waitlist_email_codes from anon, authenticated;
grant select, insert, update, delete on table public.waitlist_signups to service_role;
grant select, insert, update, delete on table public.waitlist_email_codes to service_role;
