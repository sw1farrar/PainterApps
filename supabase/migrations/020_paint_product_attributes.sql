-- Filterable paint product attributes for catalog discovery, enrichment, and customer search.
-- Run in Supabase SQL editor or: npm run db:migrate:020

-- ---------------------------------------------------------------------------
-- Extend existing enums
-- ---------------------------------------------------------------------------

alter type public.paint_product_application add value if not exists 'both';

alter type public.paint_product_base add value if not exists 'solvent';

alter type public.paint_product_category add value if not exists 'sealer';
alter type public.paint_product_category add value if not exists 'undercoater';

-- ---------------------------------------------------------------------------
-- New filter enums
-- ---------------------------------------------------------------------------

create type public.paint_resin_system as enum (
  'acrylic',
  '100_percent_acrylic',
  'vinyl_acrylic',
  'alkyd',
  'alkyd_modified',
  'urethane_modified_acrylic',
  'urethane_alkyd',
  'polyurethane',
  'epoxy',
  'silicone',
  'latex',
  'oil',
  'unknown'
);

create type public.paint_sheen as enum (
  'ultra_flat',
  'flat',
  'matte',
  'eggshell',
  'satin',
  'pearl',
  'semi_gloss',
  'gloss',
  'high_gloss',
  'soft_gloss',
  'low_sheen'
);

create type public.paint_product_use as enum (
  'walls',
  'ceilings',
  'trim',
  'doors',
  'cabinets',
  'furniture',
  'masonry',
  'stucco',
  'siding',
  'decks',
  'floors',
  'metal',
  'concrete',
  'multi_surface'
);

create type public.paint_substrate as enum (
  'drywall',
  'plaster',
  'wood',
  'hardboard',
  'mdf',
  'metal',
  'galvanized_metal',
  'masonry',
  'brick',
  'concrete',
  'stucco',
  'previously_painted',
  'vinyl_siding',
  'fiber_cement',
  'cabinets'
);

create type public.paint_voc_level as enum (
  'zero',
  'low',
  'standard',
  'unknown'
);

-- ---------------------------------------------------------------------------
-- Product columns
-- ---------------------------------------------------------------------------

alter table public.paint_products
  add column if not exists resin_system public.paint_resin_system not null default 'unknown',
  add column if not exists sheens public.paint_sheen[] not null default '{}',
  add column if not exists product_uses public.paint_product_use[] not null default '{}',
  add column if not exists substrates public.paint_substrate[] not null default '{}',
  add column if not exists voc_level public.paint_voc_level not null default 'unknown',
  add column if not exists is_self_priming boolean not null default false,
  add column if not exists is_stain_blocking boolean not null default false,
  add column if not exists is_mold_mildew_resistant boolean not null default false,
  add column if not exists is_scrubbable boolean not null default false,
  add column if not exists is_one_coat boolean not null default false,
  add column if not exists recommended_uses text[] not null default '{}',
  add column if not exists volume_solids_pct numeric(5,2),
  add column if not exists volume_solids_label text,
  add column if not exists attribute_source_url text;

alter table public.paint_products
  drop constraint if exists paint_products_volume_solids_pct_check;

alter table public.paint_products
  add constraint paint_products_volume_solids_pct_check
  check (
    volume_solids_pct is null
    or (volume_solids_pct >= 0 and volume_solids_pct <= 100)
  );

comment on column public.paint_products.application_type is
  'Primary use scope: interior, exterior, or both.';

comment on column public.paint_products.resin_system is
  'Normalized resin/chemistry family for filtering (acrylic, alkyd modified, urethane-modified acrylic, etc.).';

comment on column public.paint_products.resin_type is
  'Manufacturer wording for resin/chemistry (display + enrichment).';

comment on column public.paint_products.sheens is
  'Normalized sheen levels available for this product line (filterable).';

comment on column public.paint_products.sheen_options is
  'Manufacturer sheen labels as listed on the product page (display).';

comment on column public.paint_products.product_uses is
  'Intended applications: walls, trim, cabinets, masonry, etc.';

comment on column public.paint_products.substrates is
  'Approved or recommended surfaces/substrates.';

comment on column public.paint_products.voc_level is
  'VOC classification when documented by the manufacturer.';

comment on column public.paint_products.recommended_uses is
  'Additional manufacturer use phrases not covered by product_uses enum.';

comment on column public.paint_products.volume_solids_pct is
  'Volume solids percentage (0–100) for coverage/build and filter comparisons.';

comment on column public.paint_products.volume_solids_label is
  'Manufacturer wording for volume solids when listed as a range or tolerance (e.g. 40 ± 2).';

comment on column public.paint_products.attribute_source_url is
  'Official URL used to verify structured attributes.';

-- ---------------------------------------------------------------------------
-- Indexes for future filter UI
-- ---------------------------------------------------------------------------

create index if not exists paint_products_resin_system_idx
  on public.paint_products (resin_system);

create index if not exists paint_products_base_type_idx
  on public.paint_products (base_type);

create index if not exists paint_products_voc_level_idx
  on public.paint_products (voc_level);

create index if not exists paint_products_sheens_gin_idx
  on public.paint_products using gin (sheens);

create index if not exists paint_products_product_uses_gin_idx
  on public.paint_products using gin (product_uses);

create index if not exists paint_products_substrates_gin_idx
  on public.paint_products using gin (substrates);

create index if not exists paint_products_is_self_priming_idx
  on public.paint_products (is_self_priming)
  where is_self_priming = true;

create index if not exists paint_products_is_stain_blocking_idx
  on public.paint_products (is_stain_blocking)
  where is_stain_blocking = true;

create index if not exists paint_products_volume_solids_pct_idx
  on public.paint_products (volume_solids_pct)
  where volume_solids_pct is not null;

-- ---------------------------------------------------------------------------
-- Best-effort backfill sheens from legacy sheen_options jsonb labels
-- ---------------------------------------------------------------------------

update public.paint_products
set sheens = (
  select coalesce(array_agg(distinct mapped.sheen), '{}'::public.paint_sheen[])
  from (
    select case
      when lower(label) like '%ultra%flat%' then 'ultra_flat'::public.paint_sheen
      when lower(label) like '%flat%' then 'flat'::public.paint_sheen
      when lower(label) like '%matte%' then 'matte'::public.paint_sheen
      when lower(label) like '%eggshell%' then 'eggshell'::public.paint_sheen
      when lower(label) like '%pearl%' then 'pearl'::public.paint_sheen
      when lower(label) like '%semi%gloss%' or lower(label) like '%semi-gloss%' then 'semi_gloss'::public.paint_sheen
      when lower(label) like '%high%gloss%' or lower(label) like '%hi-gloss%' then 'high_gloss'::public.paint_sheen
      when lower(label) like '%gloss%' then 'gloss'::public.paint_sheen
      when lower(label) like '%satin%' then 'satin'::public.paint_sheen
      when lower(label) like '%soft%gloss%' then 'soft_gloss'::public.paint_sheen
      when lower(label) like '%low%sheen%' then 'low_sheen'::public.paint_sheen
      else null
    end as sheen
    from jsonb_array_elements_text(paint_products.sheen_options) as label
  ) mapped
  where mapped.sheen is not null
)
where sheens = '{}'
  and jsonb_array_length(sheen_options) > 0;