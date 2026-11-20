-- Delivery state for the signup verification email, plus the previous code
-- and the one-time confirm link. Safe to run again.

alter table public.waitlist_signups
  add column if not exists verify_mail_status text,
  add column if not exists verify_mail_id text,
  add column if not exists verify_mail_at timestamptz;

alter table public.waitlist_signups
  drop constraint if exists waitlist_signups_verify_mail_status_check;

alter table public.waitlist_signups
  add constraint waitlist_signups_verify_mail_status_check
  check (
    verify_mail_status is null
    or verify_mail_status in ('sent', 'delivered', 'bounced', 'complained', 'delayed', 'error')
  );

create index if not exists waitlist_signups_verify_mail_id_idx
  on public.waitlist_signups (verify_mail_id)
  where verify_mail_id is not null;

alter table public.waitlist_email_codes
  add column if not exists previous_code_hash text,
  add column if not exists confirm_token_hash text;
