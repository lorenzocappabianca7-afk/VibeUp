-- Bookings / availability V2 — manager propose + admin review + public response token
-- Run once in Supabase SQL Editor (after BOOKINGS_SCHEMA.sql).
-- Idempotent: safe to re-run if a previous attempt failed.

-- IMPORTANT (Postgres): new enum values cannot be USED in the same transaction
-- that adds them. This script therefore only ADDS the enum labels and columns;
-- it does NOT filter/index/check on the new status labels.

-- ---------------------------------------------------------------------------
-- 1) Extend status enum
-- ---------------------------------------------------------------------------
alter type public.availability_request_status
  add value if not exists 'pending_admin_review';

alter type public.availability_request_status
  add value if not exists 'pending_user_review_proposal';

-- ---------------------------------------------------------------------------
-- 2) New columns on availability_requests
-- ---------------------------------------------------------------------------
alter table public.availability_requests
  add column if not exists manager_decision text,
  add column if not exists manager_note text,
  add column if not exists manager_proposed_dates jsonb,
  add column if not exists manager_proposed_price numeric(12, 2),
  add column if not exists manager_responded_at timestamptz,
  add column if not exists response_token text,
  add column if not exists response_token_expires_at timestamptz,
  add column if not exists response_token_used_at timestamptz,
  add column if not exists admin_reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists user_selected_date text,
  add column if not exists user_selected_price numeric(12, 2);

-- Backfill tokens for existing rows (idempotent)
update public.availability_requests
set
  response_token = coalesce(
    response_token,
    encode(gen_random_bytes(24), 'hex')
  ),
  response_token_expires_at = coalesce(
    response_token_expires_at,
    created_at + interval '7 days'
  )
where response_token is null
   or response_token_expires_at is null;

-- Enforce NOT NULL + defaults for new inserts
alter table public.availability_requests
  alter column response_token set default encode(gen_random_bytes(24), 'hex'),
  alter column response_token_expires_at set default (now() + interval '7 days');

alter table public.availability_requests
  alter column response_token set not null,
  alter column response_token_expires_at set not null;

-- manager_decision check (null = not yet responded)
alter table public.availability_requests
  drop constraint if exists availability_requests_manager_decision_check;

alter table public.availability_requests
  add constraint availability_requests_manager_decision_check
  check (
    manager_decision is null
    or manager_decision in ('accept', 'decline', 'propose')
  );

-- Unique public response token
create unique index if not exists availability_requests_response_token_uidx
  on public.availability_requests (response_token);

-- Generic status index (no filter on new enum values — safer in one script)
create index if not exists availability_requests_status_idx
  on public.availability_requests (status);

-- ---------------------------------------------------------------------------
-- 3) RLS note
-- ---------------------------------------------------------------------------
-- Authenticated policies stay as in BOOKINGS_SCHEMA.sql.
-- Public manager-response pages MUST NOT query PostgREST with the anon key.
-- Always resolve `response_token` on the server with the service-role client
-- (bypasses RLS). No anon "by token" policy is added on purpose.

-- ---------------------------------------------------------------------------
-- 4) Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.availability_requests to service_role;
grant select, insert, update on table public.availability_requests to authenticated;
