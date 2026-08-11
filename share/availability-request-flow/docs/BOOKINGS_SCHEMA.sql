-- Sprint 2 — Availability requests + bookings (durable multi-device)
-- Run in Supabase SQL Editor after CATALOG_SCHEMA + AUTH_RLS.

do $$ begin
  create type public.availability_request_status as enum (
    'pending_manager',
    'declined',
    'pending_user_confirm',
    'confirmed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum (
    'draft',
    'organizing',
    'confirmed',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_payment_kind as enum ('deposit', 'service');
exception when duplicate_object then null;
end $$;

create table if not exists public.availability_requests (
  id uuid primary key default gen_random_uuid(),
  status public.availability_request_status not null default 'pending_manager',
  requester_id uuid not null references public.profiles (id) on delete cascade,
  requester_name text not null,
  requester_email text,
  -- App location id (catalog uuid or legacy mock id)
  location_id text not null,
  listing_id uuid references public.listings (id) on delete set null,
  location_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists availability_requests_requester_idx
  on public.availability_requests (requester_id, status);

create index if not exists availability_requests_location_idx
  on public.availability_requests (location_id, status);

create index if not exists availability_requests_listing_idx
  on public.availability_requests (listing_id, status);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  availability_request_id uuid references public.availability_requests (id) on delete set null,
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  status public.booking_status not null default 'organizing',
  location_id text,
  listing_id uuid references public.listings (id) on delete set null,
  location_name text not null,
  title text not null,
  description text not null default '',
  event_date text not null,
  start_time text not null default '',
  end_time text not null default '',
  city text not null default '',
  guest_count int not null default 0,
  total_cost numeric(12, 2) not null default 0,
  deposit_amount numeric(12, 2) not null default 0,
  services jsonb not null default '[]'::jsonb,
  deposit_due_at timestamptz not null default (now() + interval '36 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_organizer_idx
  on public.bookings (organizer_id, status);

create index if not exists bookings_listing_idx
  on public.bookings (listing_id, status);

create index if not exists bookings_deposit_due_idx
  on public.bookings (deposit_due_at)
  where status = 'organizing';

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.booking_payment_kind not null,
  service_id text not null default '',
  amount numeric(12, 2) not null default 0,
  fee_amount numeric(12, 2) not null default 0,
  paid boolean not null default false,
  method text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, kind, service_id)
);

create index if not exists booking_payments_booking_idx
  on public.booking_payments (booking_id);

drop trigger if exists availability_requests_set_updated_at on public.availability_requests;
create trigger availability_requests_set_updated_at
  before update on public.availability_requests
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists booking_payments_set_updated_at on public.booking_payments;
create trigger booking_payments_set_updated_at
  before update on public.booking_payments
  for each row execute function public.set_updated_at();

alter table public.availability_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_payments enable row level security;

-- Requester can see own requests
drop policy if exists "availability_requests_select_own" on public.availability_requests;
create policy "availability_requests_select_own"
  on public.availability_requests
  for select
  using (auth.uid() = requester_id);

-- Listing owner can see requests for their listings
drop policy if exists "availability_requests_select_owner" on public.availability_requests;
create policy "availability_requests_select_owner"
  on public.availability_requests
  for select
  using (
    listing_id is not null
    and exists (
      select 1 from public.listings l
      where l.id = availability_requests.listing_id
        and l.owner_id = auth.uid()
    )
  );

-- Admins see all
drop policy if exists "availability_requests_select_admin" on public.availability_requests;
create policy "availability_requests_select_admin"
  on public.availability_requests
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "availability_requests_insert_own" on public.availability_requests;
create policy "availability_requests_insert_own"
  on public.availability_requests
  for insert
  with check (auth.uid() = requester_id);

drop policy if exists "availability_requests_update_own" on public.availability_requests;
create policy "availability_requests_update_own"
  on public.availability_requests
  for update
  using (
    auth.uid() = requester_id
    or exists (
      select 1 from public.listings l
      where l.id = availability_requests.listing_id
        and l.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own"
  on public.bookings
  for select
  using (
    auth.uid() = organizer_id
    or exists (
      select 1 from public.listings l
      where l.id = bookings.listing_id
        and l.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own"
  on public.bookings
  for insert
  with check (auth.uid() = organizer_id);

drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own"
  on public.bookings
  for update
  using (
    auth.uid() = organizer_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "booking_payments_select_own" on public.booking_payments;
create policy "booking_payments_select_own"
  on public.booking_payments
  for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_payments.booking_id
        and (
          b.organizer_id = auth.uid()
          or exists (
            select 1 from public.listings l
            where l.id = b.listing_id and l.owner_id = auth.uid()
          )
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
          )
        )
    )
  );

-- Table privileges (RLS still applies to anon/authenticated; service_role bypasses RLS)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.availability_requests to service_role;
grant select, insert, update on table public.availability_requests to authenticated;
grant select, insert, update, delete on table public.bookings to service_role;
grant select, insert, update on table public.bookings to authenticated;
grant select, insert, update, delete on table public.booking_payments to service_role;
grant select, insert, update on table public.booking_payments to authenticated;
