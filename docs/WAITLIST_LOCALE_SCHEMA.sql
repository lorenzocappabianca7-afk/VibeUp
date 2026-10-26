-- Language of the signup, used for emails and the demo link.
-- Safe to run again.

alter table public.waitlist_signups
  add column if not exists locale text not null default 'it';

update public.waitlist_signups
  set locale = 'it'
  where locale is null or locale not in ('it', 'en');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_signups_locale_check'
      and conrelid = 'public.waitlist_signups'::regclass
  ) then
    alter table public.waitlist_signups
      add constraint waitlist_signups_locale_check check (locale in ('it', 'en'));
  end if;
end $$;
