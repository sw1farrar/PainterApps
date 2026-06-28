-- Manufacturer brand logos for product marketing sheets

alter table public.paint_manufacturers
  add column if not exists logo_url text,
  add column if not exists logo_storage_path text;

comment on column public.paint_manufacturers.logo_url is
  'Public URL for the manufacturer brand logo used on product marketing sheets.';

comment on column public.paint_manufacturers.logo_storage_path is
  'Supabase storage path in product-catalog-assets for the manufacturer logo.';