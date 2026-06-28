-- Site-admin product catalog: paint manufacturers and products

create type public.paint_product_application as enum ('interior', 'exterior');
create type public.paint_product_category as enum ('paint', 'primer');
create type public.paint_product_base as enum ('water', 'oil', 'unknown');

create table public.paint_manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  official_domains text[] not null default '{}',
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.paint_products (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.paint_manufacturers(id) on delete cascade,
  name text not null,
  application_type public.paint_product_application not null,
  category public.paint_product_category not null,
  resin_type text,
  base_type public.paint_product_base not null default 'unknown',
  source_url text,
  can_image_url text,
  can_image_storage_path text,
  discovered_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paint_products_unique_name
    unique (manufacturer_id, name, application_type, category)
);

create index paint_products_manufacturer_id_idx
  on public.paint_products (manufacturer_id);

create index paint_products_application_type_idx
  on public.paint_products (application_type);

alter table public.paint_manufacturers enable row level security;
alter table public.paint_products enable row level security;

create policy paint_manufacturers_site_admin_all on public.paint_manufacturers
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

create policy paint_products_site_admin_all on public.paint_products
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select, insert, update, delete
  on table public.paint_manufacturers, public.paint_products
  to authenticated;

grant all
  on table public.paint_manufacturers, public.paint_products
  to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-catalog-assets',
  'product-catalog-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_catalog_assets_read on storage.objects;
drop policy if exists product_catalog_assets_insert on storage.objects;
drop policy if exists product_catalog_assets_update on storage.objects;
drop policy if exists product_catalog_assets_delete on storage.objects;

create policy product_catalog_assets_read on storage.objects
  for select
  using (bucket_id = 'product-catalog-assets');

create policy product_catalog_assets_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-catalog-assets'
    and public.is_site_admin()
  );

create policy product_catalog_assets_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-catalog-assets'
    and public.is_site_admin()
  );

create policy product_catalog_assets_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-catalog-assets'
    and public.is_site_admin()
  );

-- Seed canonical manufacturers (aliases used for AI matching)
insert into public.paint_manufacturers (name, slug, website_url, official_domains, aliases)
values
  (
    'Sherwin-Williams',
    'sherwin-williams',
    'https://www.sherwin-williams.com',
    array['sherwin-williams.com'],
    array['sherwin williams', 'sherwin', 'sherwin-williams']
  ),
  (
    'Benjamin Moore',
    'benjamin-moore',
    'https://www.benjaminmoore.com',
    array['benjaminmoore.com'],
    array['benjamin moore', 'benjamin']
  ),
  (
    'Behr',
    'behr',
    'https://www.behr.com',
    array['behr.com'],
    array['behr paint', 'behr paints']
  ),
  (
    'PPG Paints',
    'ppg-paints',
    'https://www.ppgpaints.com',
    array['ppgpaints.com', 'ppg.com'],
    array['ppg', 'ppg paints']
  ),
  (
    'Valspar',
    'valspar',
    'https://www.valspar.com',
    array['valspar.com'],
    array['valspar paint', 'valspar paints']
  ),
  (
    'Dunn-Edwards',
    'dunn-edwards',
    'https://www.dunnedwards.com',
    array['dunnedwards.com'],
    array['dunn edwards', 'dunn-edwards']
  ),
  (
    'Farrow & Ball',
    'farrow-ball',
    'https://www.farrow-ball.com',
    array['farrow-ball.com'],
    array['farrow and ball', 'farrow & ball']
  ),
  (
    'Coronado Paint',
    'coronado-paint',
    'https://www.coronadopaint.com',
    array['coronadopaint.com'],
    array['coronado', 'coronado paint']
  ),
  (
    'Kelly-Moore',
    'kelly-moore',
    'https://www.kellymoore.com',
    array['kellymoore.com'],
    array['kelly moore', 'kelly-moore']
  ),
  (
    'Glidden',
    'glidden',
    'https://www.glidden.com',
    array['glidden.com'],
    array['glidden paint', 'glidden paints']
  ),
  (
    'Minwax',
    'minwax',
    'https://www.minwax.com',
    array['minwax.com'],
    array['minwax']
  ),
  (
    'Rust-Oleum',
    'rust-oleum',
    'https://www.rustoleum.com',
    array['rustoleum.com'],
    array['rust oleum', 'rust-oleum']
  )
on conflict (slug) do nothing;