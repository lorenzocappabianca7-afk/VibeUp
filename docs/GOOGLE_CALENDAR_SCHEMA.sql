-- Sincronizzazione calendari fornitori: Supabase/Postgres schema.
-- Supporta Google Calendar e Apple Calendar/iCloud CalDAV.
-- Richiede pgcrypto per cifrare refresh token e app-specific password.

create extension if not exists pgcrypto;

create type calendar_provider_role as enum (
  'venue_manager',
  'dj',
  'photographer',
  'decorator',
  'catering',
  'security',
  'other_provider'
);

create type provider_calendar_type as enum (
  'google',
  'apple'
);

create table provider_calendars (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  provider_role calendar_provider_role not null,
  provider_name text not null,
  calendar_type provider_calendar_type not null,
  account_email text,
  calendar_id text not null default 'primary',
  access_token_encrypted bytea,
  refresh_token_encrypted bytea,
  apple_app_password_encrypted bytea,
  scope text not null,
  token_type text not null default 'Bearer',
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint provider_calendars_provider_unique unique (provider_id),
  constraint provider_calendars_google_credentials check (
    calendar_type <> 'google' or refresh_token_encrypted is not null
  ),
  constraint provider_calendars_apple_credentials check (
    calendar_type <> 'apple' or (
      account_email is not null and apple_app_password_encrypted is not null
    )
  )
);

create index provider_calendars_provider_idx
  on provider_calendars (provider_id)
  where revoked_at is null;

create or replace function upsert_provider_calendar(
  p_provider_id text,
  p_provider_role calendar_provider_role,
  p_provider_name text,
  p_calendar_type provider_calendar_type,
  p_account_email text,
  p_calendar_id text,
  p_access_token text,
  p_refresh_token text,
  p_apple_app_password text,
  p_scope text,
  p_token_type text,
  p_expires_at timestamptz,
  p_encryption_key text
) returns provider_calendars
language plpgsql
security definer
as $$
declare
  saved provider_calendars;
begin
  insert into provider_calendars (
    provider_id,
    provider_role,
    provider_name,
    calendar_type,
    account_email,
    calendar_id,
    access_token_encrypted,
    refresh_token_encrypted,
    apple_app_password_encrypted,
    scope,
    token_type,
    expires_at,
    revoked_at,
    updated_at
  )
  values (
    p_provider_id,
    p_provider_role,
    p_provider_name,
    p_calendar_type,
    p_account_email,
    coalesce(nullif(p_calendar_id, ''), 'primary'),
    case
      when p_access_token is null then null
      else pgp_sym_encrypt(p_access_token, p_encryption_key)
    end,
    case
      when p_refresh_token is null then null
      else pgp_sym_encrypt(p_refresh_token, p_encryption_key)
    end,
    case
      when p_apple_app_password is null then null
      else pgp_sym_encrypt(p_apple_app_password, p_encryption_key)
    end,
    p_scope,
    coalesce(nullif(p_token_type, ''), 'Bearer'),
    p_expires_at,
    null,
    now()
  )
  on conflict (provider_id) do update set
    provider_role = excluded.provider_role,
    provider_name = excluded.provider_name,
    calendar_type = excluded.calendar_type,
    account_email = excluded.account_email,
    calendar_id = excluded.calendar_id,
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    apple_app_password_encrypted = excluded.apple_app_password_encrypted,
    scope = excluded.scope,
    token_type = excluded.token_type,
    expires_at = excluded.expires_at,
    revoked_at = null,
    updated_at = now()
  returning * into saved;

  return saved;
end;
$$;

create or replace function get_provider_calendar(
  p_provider_id text,
  p_encryption_key text
) returns table (
  id uuid,
  provider_id text,
  provider_role calendar_provider_role,
  provider_name text,
  calendar_type provider_calendar_type,
  account_email text,
  calendar_id text,
  access_token text,
  refresh_token text,
  apple_app_password text,
  scope text,
  token_type text,
  expires_at timestamptz,
  connected_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
as $$
  select
    c.id,
    c.provider_id,
    c.provider_role,
    c.provider_name,
    c.calendar_type,
    c.account_email,
    c.calendar_id,
    case
      when c.access_token_encrypted is null then null
      else pgp_sym_decrypt(c.access_token_encrypted, p_encryption_key)
    end as access_token,
    case
      when c.refresh_token_encrypted is null then null
      else pgp_sym_decrypt(c.refresh_token_encrypted, p_encryption_key)
    end as refresh_token,
    case
      when c.apple_app_password_encrypted is null then null
      else pgp_sym_decrypt(c.apple_app_password_encrypted, p_encryption_key)
    end as apple_app_password,
    c.scope,
    c.token_type,
    c.expires_at,
    c.connected_at,
    c.updated_at
  from provider_calendars c
  where c.provider_id = p_provider_id
    and c.revoked_at is null
  limit 1;
$$;

create table provider_calendar_reservations (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  calendar_type provider_calendar_type not null,
  event_id text,
  service_id text,
  external_event_id text,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
