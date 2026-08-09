-- Sprint 1 / point 3 — Supabase Storage for listing photos
-- Run in SQL Editor after catalog tables exist.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media',
  'listing-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read (Explore needs to show images)
drop policy if exists "listing_media_public_read" on storage.objects;
create policy "listing_media_public_read"
  on storage.objects
  for select
  using (bucket_id = 'listing-media');

-- Authenticated users can upload (admin API also uses service role, which bypasses RLS)
drop policy if exists "listing_media_auth_insert" on storage.objects;
create policy "listing_media_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'listing-media');

drop policy if exists "listing_media_auth_update" on storage.objects;
create policy "listing_media_auth_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'listing-media')
  with check (bucket_id = 'listing-media');

drop policy if exists "listing_media_auth_delete" on storage.objects;
create policy "listing_media_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'listing-media');
