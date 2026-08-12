-- Bookings V4 — temporary slot holds (location + date)
-- Run once in Supabase SQL Editor after BOOKINGS_SCHEMA_V3_CONFIRMATION_DEADLINE.sql
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) slot_holds
-- ---------------------------------------------------------------------------
create table if not exists public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  location_id text not null,
  listing_id uuid references public.listings (id) on delete set null,
  event_date text not null,
  request_id uuid not null references public.availability_requests (id) on delete cascade,
  held_until timestamptz not null,
  created_at timestamptz not null default now(),
  constraint slot_holds_event_date_nonempty check (char_length(trim(event_date)) > 0)
);

-- One active hold per location + date (second insert fails → backend rejects)
create unique index if not exists slot_holds_location_date_uidx
  on public.slot_holds (location_id, event_date);

create index if not exists slot_holds_request_idx
  on public.slot_holds (request_id);

create index if not exists slot_holds_held_until_idx
  on public.slot_holds (held_until);

-- ---------------------------------------------------------------------------
-- 2) RLS + grants (mutations only via service_role / Next API)
-- ---------------------------------------------------------------------------
alter table public.slot_holds enable row level security;

drop policy if exists "slot_holds_select_authenticated" on public.slot_holds;
create policy "slot_holds_select_authenticated"
  on public.slot_holds
  for select
  to authenticated
  using (true);

grant select, insert, update, delete on table public.slot_holds to service_role;
grant select on table public.slot_holds to authenticated;
revoke insert, update, delete on table public.slot_holds from authenticated;
revoke all on table public.slot_holds from anon;
