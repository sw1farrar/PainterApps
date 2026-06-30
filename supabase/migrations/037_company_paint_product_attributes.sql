-- Custom company products can store the same attribute surface as platform catalog rows.

alter table public.company_paint_products
  add column if not exists product_description text,
  add column if not exists resin_type text,
  add column if not exists resin_system public.paint_resin_system not null default 'unknown',
  add column if not exists base_type public.paint_product_base not null default 'unknown',
  add column if not exists sheen_options jsonb not null default '[]'::jsonb,
  add column if not exists paint_system_feature_options jsonb not null default '[]'::jsonb,
  add column if not exists product_uses public.paint_product_use[] not null default '{}',
  add column if not exists substrates public.paint_substrate[] not null default '{}',
  add column if not exists recommended_uses jsonb not null default '[]'::jsonb,
  add column if not exists voc_level public.paint_voc_level not null default 'unknown',
  add column if not exists is_stain_blocking boolean not null default false,
  add column if not exists is_mold_mildew_resistant boolean not null default false,
  add column if not exists is_scrubbable boolean not null default false,
  add column if not exists is_one_coat boolean not null default false,
  add column if not exists volume_solids_pct numeric,
  add column if not exists volume_solids_label text,
  add column if not exists can_image_url text,
  add column if not exists source_url text;

comment on column public.company_paint_products.product_description is
  'Manufacturer product description for custom SKUs.';

comment on column public.company_paint_products.sheen_options is
  'Manufacturer sheen labels available for this custom product.';

comment on column public.company_paint_products.paint_system_feature_options is
  'Coating specifications and feature bullets for custom products.';