-- Dream venue can be "no idea yet". Safe to run again.
alter table public.waitlist_signups
  add column if not exists dream_venue_undecided boolean not null default false;

notify pgrst, 'reload schema';
