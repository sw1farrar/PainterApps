alter table public.tds_products
  add column if not exists can_image_url text,
  add column if not exists can_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tds-cans',
  'tds-cans',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tds cans public read" on storage.objects;
create policy "tds cans public read"
  on storage.objects for select
  using (bucket_id = 'tds-cans');

drop policy if exists "tds cans service write" on storage.objects;
create policy "tds cans service write"
  on storage.objects for all
  to service_role
  using (bucket_id = 'tds-cans')
  with check (bucket_id = 'tds-cans');

notify pgrst, 'reload schema';
