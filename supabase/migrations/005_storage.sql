-- Storage buckets for logos and job/quote photos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'company-logos',
    'company-logos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'quote-photos',
    'quote-photos',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'job-photos',
    'job-photos',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists company_logos_read on storage.objects;
drop policy if exists company_logos_insert on storage.objects;
drop policy if exists company_logos_update on storage.objects;
drop policy if exists company_logos_delete on storage.objects;
drop policy if exists quote_photos_read on storage.objects;
drop policy if exists quote_photos_insert on storage.objects;
drop policy if exists quote_photos_delete on storage.objects;
drop policy if exists job_photos_read on storage.objects;
drop policy if exists job_photos_insert on storage.objects;
drop policy if exists job_photos_delete on storage.objects;

create policy company_logos_read on storage.objects
  for select
  using (bucket_id = 'company-logos');

create policy company_logos_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy company_logos_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy company_logos_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy quote_photos_read on storage.objects
  for select
  using (bucket_id = 'quote-photos');

create policy quote_photos_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy quote_photos_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'quote-photos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy job_photos_read on storage.objects
  for select
  using (bucket_id = 'job-photos');

create policy job_photos_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy job_photos_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );