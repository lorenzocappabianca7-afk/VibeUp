-- Bookings V6 — SIAE document add-on (after deposit is paid)
-- Run once in Supabase SQL Editor after V5.
--
-- Optional Vercel env (defaults in src/lib/siae.ts, official SIAE birthday + DJ):
--   NEXT_PUBLIC_SIAE_PERMIT_EUR=147.99
--   NEXT_PUBLIC_SIAE_PERMIT_LIVE_EUR=112.48
--   NEXT_PUBLIC_SIAE_VIBEUP_FEE_EUR=20
--   NEXT_PUBLIC_SIAE_DEADLINE_DAYS_BEFORE=15
--   NEXT_PUBLIC_SIAE_REMINDER_DAYS=10
--   VIBEUP_OPS_EMAIL=info@vibeupevents.com

alter table public.bookings
  add column if not exists siae_choice text,
  add column if not exists siae_status text,
  add column if not exists siae_stripe_checkout_session_id text,
  add column if not exists siae_stripe_payment_intent_id text,
  add column if not exists siae_paid_at timestamptz,
  add column if not exists siae_notified_at timestamptz,
  add column if not exists siae_venue_fee numeric(12, 2);

alter table public.bookings
  drop constraint if exists bookings_siae_choice_check;

alter table public.bookings
  add constraint bookings_siae_choice_check
  check (
    siae_choice is null
    or siae_choice in ('diy', 'venue', 'vibeup')
  );

alter table public.bookings
  drop constraint if exists bookings_siae_status_check;

alter table public.bookings
  add constraint bookings_siae_status_check
  check (
    siae_status is null
    or siae_status in (
      'unselected',
      'diy',
      'venue',
      'pending_payment',
      'managed'
    )
  );

create unique index if not exists bookings_siae_stripe_session_uidx
  on public.bookings (siae_stripe_checkout_session_id)
  where siae_stripe_checkout_session_id is not null;
