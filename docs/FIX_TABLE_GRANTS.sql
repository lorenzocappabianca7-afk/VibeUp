-- Fix: PostgREST/service_role cannot read/write catalog + bookings tables.
-- Symptom in app: request fails (often "permission denied" or "Invalid API key"
-- depending on which key/role hits the API).
-- Run once in Supabase → SQL Editor.

-- Catalog
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, update on table public.profiles to authenticated;

grant select, insert, update, delete on table public.listings to service_role;
grant select on table public.listings to anon, authenticated;
grant insert, update on table public.listings to authenticated;

grant select, insert, update, delete on table public.listing_media to service_role;
grant select on table public.listing_media to anon, authenticated;
grant insert, update, delete on table public.listing_media to authenticated;

-- Bookings / availability
grant select, insert, update, delete on table public.availability_requests to service_role;
grant select, insert, update on table public.availability_requests to authenticated;

grant select, insert, update, delete on table public.bookings to service_role;
grant select, insert, update on table public.bookings to authenticated;

grant select, insert, update, delete on table public.booking_payments to service_role;
grant select, insert, update on table public.booking_payments to authenticated;

-- Sequences (if any future serials); safe no-op when none exist
do $$ begin
  execute 'grant usage, select on all sequences in schema public to service_role';
  execute 'grant usage, select on all sequences in schema public to authenticated';
exception when others then null;
end $$;
