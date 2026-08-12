-- Bookings V5 — Stripe deposit checkout (caparra online)
-- Run once in Supabase SQL Editor after V3/V4.
-- IMPORTANT: add enum value in its own run if Postgres complains about same-tx use.

-- ---------------------------------------------------------------------------
-- 1) Status: awaiting Stripe payment
-- ---------------------------------------------------------------------------
alter type public.availability_request_status
  add value if not exists 'pending_deposit_payment';

-- ---------------------------------------------------------------------------
-- 2) Stripe fields on availability_requests
-- ---------------------------------------------------------------------------
alter table public.availability_requests
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists deposit_payment_status text,
  add column if not exists status_before_payment text;

alter table public.availability_requests
  drop constraint if exists availability_requests_deposit_payment_status_check;

alter table public.availability_requests
  add constraint availability_requests_deposit_payment_status_check
  check (
    deposit_payment_status is null
    or deposit_payment_status in ('pending', 'paid', 'failed', 'abandoned')
  );

create unique index if not exists availability_requests_stripe_session_uidx
  on public.availability_requests (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ---------------------------------------------------------------------------
-- 3) Status transition guard — include pending_deposit_payment
-- ---------------------------------------------------------------------------
create or replace function public.enforce_availability_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending_manager' and new.status in (
      'pending_user_confirm', 'pending_admin_review', 'declined', 'cancelled'
    ))
    or (old.status = 'pending_admin_review' and new.status in (
      'pending_user_review_proposal', 'declined', 'cancelled'
    ))
    or (old.status = 'pending_user_review_proposal' and new.status in (
      'confirmed', 'declined', 'cancelled', 'expired', 'pending_deposit_payment'
    ))
    or (old.status = 'pending_user_confirm' and new.status in (
      'confirmed', 'cancelled', 'expired', 'pending_deposit_payment'
    ))
    or (old.status = 'pending_deposit_payment' and new.status in (
      'confirmed', 'pending_user_confirm', 'pending_user_review_proposal',
      'cancelled', 'expired'
    ))
  ) then
    raise exception 'Transizione di stato non consentita: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists availability_requests_status_guard on public.availability_requests;
create trigger availability_requests_status_guard
  before update on public.availability_requests
  for each row
  execute function public.enforce_availability_status_transition();
