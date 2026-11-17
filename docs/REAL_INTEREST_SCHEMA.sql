-- Real availability interest from the demo. Not a booking.
-- Run once in the Supabase SQL Editor. Safe to run again.
-- Only service_role can read or write. Visitors never touch this table.

create table if not exists public.real_interest_requests (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.waitlist_signups (id) on delete cascade,
  location_id text,
  location_name text not null,
  party_date date not null,
  guest_count integer not null check (guest_count > 0 and guest_count < 10000),
  channel text not null check (channel in ('whatsapp', 'email')),
  contact_value text not null,
  consent_at timestamptz not null,
  consent_text_version text not null,
  status text not null default 'nuova' check (status in ('nuova', 'contattato', 'chiusa')),
  created_at timestamptz not null default now()
);

create unique index if not exists real_interest_requests_once_idx
  on public.real_interest_requests (
    signup_id,
    (coalesce(nullif(location_id, ''), lower(location_name))),
    party_date
  );

create index if not exists real_interest_requests_status_idx
  on public.real_interest_requests (status, created_at desc);

create index if not exists real_interest_requests_signup_idx
  on public.real_interest_requests (signup_id, created_at desc);

alter table public.real_interest_requests enable row level security;

revoke all on table public.real_interest_requests from anon, authenticated;
grant select, insert, update, delete on table public.real_interest_requests to service_role;

-- consent_log stays append-only. A new kind records this contact consent.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'consent_log'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.consent_log drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.consent_log
  add constraint consent_log_kind_check
  check (kind in ('privacy', 'rules', 'marketing', 'real_interest'));
