-- Profiles auto-provision + admin mailbox.
-- Run in Supabase SQL Editor (no passwords in this file).

-- 1) Create public.profiles row whenever a user is created in Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  resolved_role public.app_role;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'consumer');
  resolved_role := case
    when meta_role = 'business' then 'business'::public.app_role
    else 'consumer'::public.app_role
  end;

  insert into public.profiles (id, email, display_name, role, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(coalesce(new.email, 'utente'), '@', 1)
    ),
    resolved_role,
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        phone = coalesce(excluded.phone, public.profiles.phone);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Keep profiles.email in sync after email change confirmation.
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
      set email = coalesce(new.email, public.profiles.email)
      where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- 3) Official admin: info@vibeupevents.com (user must already exist in Auth).
insert into public.profiles (id, email, display_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'display_name', 'VibeUp Admin'),
  'admin'::public.app_role
from auth.users
where lower(email) = 'info@vibeupevents.com'
on conflict (id) do update
  set role = 'admin',
      email = excluded.email;
