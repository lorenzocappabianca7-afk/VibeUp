-- Run after Auth + profiles trigger are set up.
-- Lets each user read/update their own profile row.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Promote the official admin mailbox (run once after that user has signed up):
-- update public.profiles
-- set role = 'admin'
-- where lower(email) = 'info@vibeupevents.com';
