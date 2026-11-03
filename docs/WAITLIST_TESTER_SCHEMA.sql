-- Marks waitlist rows that belong to tester mailboxes.
-- Run once in the Supabase SQL editor, after WAITLIST_SCHEMA.sql.
-- Safe to run again.

alter table public.waitlist_signups
  add column if not exists is_tester boolean not null default false;

create index if not exists waitlist_signups_is_tester_idx
  on public.waitlist_signups (is_tester)
  where is_tester;
