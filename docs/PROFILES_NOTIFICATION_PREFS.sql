-- Manager notification preferences on profiles
-- Run in Supabase SQL Editor after CATALOG_SCHEMA + AUTH_RLS.

alter table public.profiles
  add column if not exists notification_channel text not null default 'email',
  add column if not exists notification_whatsapp_number text,
  add column if not exists notification_email text;

alter table public.profiles
  drop constraint if exists profiles_notification_channel_check;

alter table public.profiles
  add constraint profiles_notification_channel_check
  check (notification_channel in ('whatsapp', 'email'));

-- Existing update policy already covers these columns (profiles_update_own).
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;
