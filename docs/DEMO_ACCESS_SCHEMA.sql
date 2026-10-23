-- Opaque demo-entry token for a verified waitlist signup.
-- Run after WAITLIST_SCHEMA.sql. Safe to run again.
-- The token is not the signup id. Deleting the signup revokes it.

alter table public.waitlist_signups
  add column if not exists demo_access_token text;

create unique index if not exists waitlist_signups_demo_access_token_idx
  on public.waitlist_signups (demo_access_token)
  where demo_access_token is not null;
