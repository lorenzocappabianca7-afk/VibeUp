-- Welcome email status for verified waitlist signups.
-- Run after WAITLIST_SCHEMA.sql. Safe to run again.
-- Non-null VibeUpcodes stay unique. Unverified rows keep a null code.

create unique index if not exists waitlist_signups_vibeup_code_idx
  on public.waitlist_signups (vibeup_code)
  where vibeup_code is not null;

alter table public.waitlist_signups
  add column if not exists welcome_email_sent_at timestamptz;
