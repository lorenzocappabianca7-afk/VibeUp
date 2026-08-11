-- VibeUp catalog schema (Sprint 1 — users + listings + media metadata)
-- Run in Supabase SQL Editor if not already applied.

create type public.app_role as enum ('guest', 'consumer', 'business', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role public.app_role not null default 'consumer',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type public.listing_kind as enum ('location', 'service');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'pending_review', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.explore_category as enum (
    'locali', 'dj', 'fotografo', 'decorazioni', 'altri'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  kind public.listing_kind not null,
  category public.explore_category not null,
  status public.listing_status not null default 'draft',
  name text not null,
  description text not null default '',
  city text,
  address text,
  provider_zone text,
  data jsonb not null default '{}'::jsonb,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_category_idx
  on public.listings (status, category);

create index if not exists listings_owner_idx
  on public.listings (owner_id);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists listing_media_listing_idx
  on public.listing_media (listing_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- Table privileges for API roles (run FIX_TABLE_GRANTS.sql if these were skipped earlier)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.profiles to service_role;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.listings to service_role;
grant select on table public.listings to anon, authenticated;
grant insert, update on table public.listings to authenticated;
grant select, insert, update, delete on table public.listing_media to service_role;
grant select on table public.listing_media to anon, authenticated;
grant insert, update, delete on table public.listing_media to authenticated;
