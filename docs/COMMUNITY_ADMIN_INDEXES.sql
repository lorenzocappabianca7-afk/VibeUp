-- Speeds the community admin reads. Safe to run more than once.

create index if not exists demo_submissions_signup_id_idx
  on public.demo_submissions ((payload ->> 'signup_id'));

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);
