alter table public.companies
  add column if not exists logo_url text not null default '',
  add column if not exists email text not null default '',
  add column if not exists website text not null default '',
  add column if not exists address text not null default '',
  add column if not exists license_number text not null default '',
  add column if not exists insurance_line text not null default '',
  add column if not exists accent_color text not null default '#0f766e',
  add column if not exists legal_name text not null default '',
  add column if not exists proposal_valid_days int not null default 30,
  add column if not exists payment_terms text not null default '50% to schedule, balance due on completion.',
  add column if not exists exclusions text not null default 'Price assumes surfaces are sound and ready for paint. Does not include repairs, drywall, carpentry, mold/mildew remediation, or lead/asbestos work unless written above. Colors and sheen per owner approval. Weather and access may change schedule. Change orders billed separately.';

alter table public.estimates
  add column if not exists view_token uuid not null default gen_random_uuid();

create unique index if not exists estimates_view_token_idx
  on public.estimates (view_token);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company logos public read" on storage.objects;
create policy "company logos public read"
  on storage.objects for select
  using (bucket_id = 'company-logos');

drop policy if exists "company logos members insert" on storage.objects;
create policy "company logos members insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] in (
      select cm.company_id::text from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
  );

drop policy if exists "company logos members update" on storage.objects;
create policy "company logos members update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] in (
      select cm.company_id::text from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
  );

drop policy if exists "company logos members delete" on storage.objects;
create policy "company logos members delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] in (
      select cm.company_id::text from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
  );
