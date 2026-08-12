-- Bookings V3 — confirmation deadline (3 days after manager accept)
-- Run once in Supabase SQL Editor AFTER relying on the new app code.
--
-- IMPORTANT (Postgres): new enum values cannot be USED in the same transaction
-- that adds them. Run section 1 alone first if needed, then sections 2–4.

-- ---------------------------------------------------------------------------
-- 1) Extend status enum
-- ---------------------------------------------------------------------------
alter type public.availability_request_status
  add value if not exists 'expired';

-- ---------------------------------------------------------------------------
-- 2) Deadline + reminder columns
-- ---------------------------------------------------------------------------
alter table public.availability_requests
  add column if not exists confirmation_deadline timestamptz,
  add column if not exists confirmation_reminder_sent_at timestamptz;

create index if not exists availability_requests_confirmation_deadline_idx
  on public.availability_requests (confirmation_deadline)
  where confirmation_deadline is not null
    and status in ('pending_user_confirm', 'pending_user_review_proposal');

-- ---------------------------------------------------------------------------
-- 3) Status transition guard — include expired (+ keep cancelled)
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
      'confirmed', 'declined', 'cancelled', 'expired'
    ))
    or (old.status = 'pending_user_confirm' and new.status in (
      'confirmed', 'cancelled', 'expired'
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

-- ---------------------------------------------------------------------------
-- 4) Grants (service_role for cron/API; authenticated SELECT only)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.availability_requests to service_role;
revoke insert, update, delete on public.availability_requests from authenticated;
grant select on public.availability_requests to authenticated;
