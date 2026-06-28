-- Saved good-better-best sell sheets (free tool → account)

create table public.sell_sheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  project_name text,
  logo_url text,
  tiers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sell_sheets_company_id_idx on public.sell_sheets (company_id);
create index sell_sheets_created_by_idx on public.sell_sheets (created_by);

alter table public.sell_sheets enable row level security;

create policy sell_sheets_company_select on public.sell_sheets
  for select
  to authenticated
  using (company_id = public.current_company_id());

create policy sell_sheets_company_insert on public.sell_sheets
  for insert
  to authenticated
  with check (company_id = public.current_company_id());

create policy sell_sheets_company_update on public.sell_sheets
  for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy sell_sheets_company_delete on public.sell_sheets
  for delete
  to authenticated
  using (company_id = public.current_company_id());

grant select, insert, update, delete on table public.sell_sheets to authenticated;
grant all on table public.sell_sheets to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sell-sheet-assets',
  'sell-sheet-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists sell_sheet_assets_read on storage.objects;
drop policy if exists sell_sheet_assets_insert on storage.objects;
drop policy if exists sell_sheet_assets_delete on storage.objects;

create policy sell_sheet_assets_read on storage.objects
  for select
  using (bucket_id = 'sell-sheet-assets');

create policy sell_sheet_assets_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'sell-sheet-assets'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );

create policy sell_sheet_assets_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'sell-sheet-assets'
    and (storage.foldername(name))[1] = (
      select company_id::text
      from public.profiles
      where id = auth.uid()
    )
  );