-- Company-owned can images uploaded to product-catalog-assets.
alter table public.company_paint_products
  add column if not exists can_image_storage_path text;

comment on column public.company_paint_products.can_image_storage_path is
  'Supabase storage path in product-catalog-assets when the company uploaded a can image.';