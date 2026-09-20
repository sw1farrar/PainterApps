alter table public.tds_documents
  add column if not exists kind text not null default 'pds',
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists byte_size integer,
  add column if not exists storage_path text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tds_documents
  drop constraint if exists tds_documents_kind_check;
alter table public.tds_documents
  add constraint tds_documents_kind_check
  check (kind in ('pds', 'sds', 'eds', 'other'));

create index if not exists tds_documents_product_idx on public.tds_documents (product_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tds-pdfs',
  'tds-pdfs',
  true,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tds pdfs public read" on storage.objects;
create policy "tds pdfs public read"
  on storage.objects for select
  using (bucket_id = 'tds-pdfs');

drop policy if exists "tds pdfs service write" on storage.objects;
create policy "tds pdfs service write"
  on storage.objects for all
  to service_role
  using (bucket_id = 'tds-pdfs')
  with check (bucket_id = 'tds-pdfs');
