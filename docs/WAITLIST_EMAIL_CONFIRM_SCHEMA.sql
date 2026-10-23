-- Confirm the email before the rest of the profile.
-- phone, birth year and high school stay empty until that profile is saved.
-- email_verified_at is still set only when the signup is complete.
-- Safe to run again.

alter table public.waitlist_signups alter column phone drop not null;
alter table public.waitlist_signups alter column birth_year drop not null;
alter table public.waitlist_signups alter column high_school drop not null;

alter table public.waitlist_signups
  add column if not exists email_confirmed_at timestamptz;
