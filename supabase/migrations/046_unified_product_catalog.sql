-- Unified product catalog: paint_products is the single source of truth.
-- company_paint_products becomes a per-company bookmark with private pricing only.

-- ---------------------------------------------------------------------------
-- Platform catalog provenance + admin review
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.paint_catalog_origin as enum ('admin', 'subscriber');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.paint_catalog_review_status as enum (
    'approved',
    'pending_review',
    'rejected'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.paint_products
  add column if not exists catalog_origin public.paint_catalog_origin not null default 'admin',
  add column if not exists catalog_review_status public.paint_catalog_review_status not null default 'approved',
  add column if not exists submitted_by_company_id uuid references public.companies(id) on delete set null,
  add column if not exists submitted_at timestamptz;

comment on column public.paint_products.catalog_origin is
  'admin = seeded or created by site admin; subscriber = added when a company could not find a match.';

comment on column public.paint_products.catalog_review_status is
  'Subscriber submissions start as pending_review until a site admin approves or edits the row.';

comment on column public.paint_products.submitted_by_company_id is
  'Company that first submitted this product to the shared catalog.';

create index if not exists paint_products_pending_review_idx
  on public.paint_products (catalog_review_status, submitted_at desc)
  where catalog_review_status = 'pending_review';

-- ---------------------------------------------------------------------------
-- Promote legacy custom company SKUs into paint_products and link bookmarks
-- ---------------------------------------------------------------------------

create or replace function public.slugify_manufacturer_name(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.company_role_to_paint_category(
  role public.company_paint_product_role
)
returns public.paint_product_category
language sql
immutable
as $$
  select case
    when role = 'primer' then 'primer'::public.paint_product_category
    when role = 'undercoater' then 'undercoater'::public.paint_product_category
    when role = 'sealer' then 'sealer'::public.paint_product_category
    else 'paint'::public.paint_product_category
  end;
$$;

do $$
declare
  rec record;
  v_manufacturer_id uuid;
  v_manufacturer_slug text;
  v_platform_category public.paint_product_category;
  v_platform_application public.paint_product_application;
  v_existing_product_id uuid;
  v_new_product_id uuid;
  v_existing_bookmark_id uuid;
begin
  for rec in
    select *
    from public.company_paint_products
    where paint_product_id is null
       or source = 'custom'
    order by created_at
  loop
    v_manufacturer_id := null;

    if coalesce(trim(rec.manufacturer_name), '') <> '' then
      select pm.id
      into v_manufacturer_id
      from public.paint_manufacturers pm
      where lower(pm.name) = lower(trim(rec.manufacturer_name))
         or lower(trim(rec.manufacturer_name)) = any (
           select lower(alias)
           from unnest(pm.aliases) as alias
         )
      order by pm.created_at
      limit 1;
    end if;

    if v_manufacturer_id is null then
      v_manufacturer_slug := trim(
        both '-'
        from regexp_replace(
          lower(
            trim(
              coalesce(nullif(trim(rec.manufacturer_name), ''), 'unknown-manufacturer')
            )
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      );

      if v_manufacturer_slug = '' then
        v_manufacturer_slug := 'unknown-manufacturer';
      end if;

      if exists (
        select 1
        from public.paint_manufacturers pm
        where pm.slug = v_manufacturer_slug
      ) then
        v_manufacturer_slug := v_manufacturer_slug || '-' || left(rec.id::text, 8);
      end if;

      insert into public.paint_manufacturers (name, slug)
      values (
        coalesce(nullif(trim(rec.manufacturer_name), ''), 'Unknown manufacturer'),
        v_manufacturer_slug
      )
      returning id into v_manufacturer_id;
    end if;

    v_platform_category := case rec.role::text
      when 'primer' then 'primer'::public.paint_product_category
      when 'undercoater' then 'undercoater'::public.paint_product_category
      when 'sealer' then 'sealer'::public.paint_product_category
      else 'paint'::public.paint_product_category
    end;

    v_platform_application := case
      when rec.application_type = 'exterior' then 'exterior'::public.paint_product_application
      when rec.application_type = 'both' then 'both'::public.paint_product_application
      else 'interior'::public.paint_product_application
    end;

    select pp.id
    into v_existing_product_id
    from public.paint_products pp
    where pp.manufacturer_id = v_manufacturer_id
      and lower(regexp_replace(trim(pp.name), '\.+$', '')) =
          lower(regexp_replace(trim(rec.name), '\.+$', ''))
      and pp.application_type = v_platform_application
      and pp.category = v_platform_category
    order by
      case when pp.catalog_review_status = 'pending_review' then 0 else 1 end,
      case when pp.catalog_origin = 'subscriber' then 0 else 1 end,
      pp.created_at
    limit 1;

    if v_existing_product_id is not null then
      v_new_product_id := v_existing_product_id;
    else
      insert into public.paint_products (
        manufacturer_id,
        name,
        application_type,
        category,
        resin_type,
        resin_system,
        base_type,
        product_description,
        source_url,
        can_image_url,
        can_image_storage_path,
        sheen_options,
        paint_system_features,
        paint_system_feature_options,
        product_uses,
        substrates,
        recommended_uses,
        voc_level,
        is_self_priming,
        is_stain_blocking,
        is_mold_mildew_resistant,
        is_scrubbable,
        is_one_coat,
        volume_solids_pct,
        volume_solids_label,
        coverage_sqft_per_gallon,
        catalog_origin,
        catalog_review_status,
        submitted_by_company_id,
        submitted_at,
        enrichment_status
      )
      values (
        v_manufacturer_id,
        regexp_replace(trim(rec.name), '\.+$', ''),
        v_platform_application,
        v_platform_category,
        rec.resin_type,
        coalesce(rec.resin_system, 'unknown'::public.paint_resin_system),
        coalesce(rec.base_type, 'unknown'::public.paint_product_base),
        rec.product_description,
        rec.source_url,
        rec.can_image_url,
        rec.can_image_storage_path,
        coalesce(rec.sheen_options, '[]'::jsonb),
        coalesce(rec.paint_system_features, '[]'::jsonb),
        coalesce(rec.paint_system_feature_options, '[]'::jsonb),
        coalesce(rec.product_uses, '{}'::public.paint_product_use[]),
        coalesce(rec.substrates, '{}'::public.paint_substrate[]),
        array(
          select jsonb_array_elements_text(coalesce(rec.recommended_uses, '[]'::jsonb))
        ),
        coalesce(rec.voc_level, 'unknown'::public.paint_voc_level),
        coalesce(rec.is_self_priming, false),
        coalesce(rec.is_stain_blocking, false),
        coalesce(rec.is_mold_mildew_resistant, false),
        coalesce(rec.is_scrubbable, false),
        coalesce(rec.is_one_coat, false),
        rec.volume_solids_pct,
        rec.volume_solids_label,
        coalesce(rec.coverage_sqft_per_gallon, 350),
        'subscriber',
        'pending_review',
        rec.company_id,
        coalesce(rec.created_at, now()),
        'pending'
      )
      returning id into v_new_product_id;
    end if;

    select cp.id
    into v_existing_bookmark_id
    from public.company_paint_products cp
    where cp.company_id = rec.company_id
      and cp.paint_product_id = v_new_product_id
      and cp.id <> rec.id
    limit 1;

    if v_existing_bookmark_id is not null then
      -- Company already bookmarked this platform product (e.g. catalog import + custom SKU).
      update public.company_paint_products
      set
        unit_cost = case
          when rec.unit_cost > 0 and unit_cost = 0 then rec.unit_cost
          else unit_cost
        end,
        unit_price = case
          when coalesce(rec.unit_price, rec.unit_cost) > 0 and unit_price = 0
            then coalesce(rec.unit_price, rec.unit_cost)
          else unit_price
        end,
        coverage_sqft_per_gallon = coalesce(
          rec.coverage_sqft_per_gallon,
          coverage_sqft_per_gallon
        ),
        gallons_per_labor_hour = coalesce(
          rec.gallons_per_labor_hour,
          gallons_per_labor_hour
        ),
        sheen = coalesce(nullif(trim(rec.sheen), ''), sheen),
        source = 'catalog',
        updated_at = now()
      where id = v_existing_bookmark_id;

      update public.quote_line_items
      set company_paint_product_id = v_existing_bookmark_id
      where company_paint_product_id = rec.id;

      update public.company_paint_presets
      set primer_product_id = v_existing_bookmark_id
      where primer_product_id = rec.id;

      update public.company_paint_presets
      set topcoat_product_id = v_existing_bookmark_id
      where topcoat_product_id = rec.id;

      update public.company_tier_defaults
      set primer_product_id = v_existing_bookmark_id
      where primer_product_id = rec.id;

      update public.company_tier_defaults
      set topcoat_product_id = v_existing_bookmark_id
      where topcoat_product_id = rec.id;

      update public.quote_tier_paint_config
      set primer_product_id = v_existing_bookmark_id
      where primer_product_id = rec.id;

      update public.quote_tier_paint_config
      set topcoat_product_id = v_existing_bookmark_id
      where topcoat_product_id = rec.id;

      update public.quote_paint_defaults
      set company_paint_product_id = v_existing_bookmark_id
      where company_paint_product_id = rec.id;

      update public.quote_surfaces
      set company_paint_product_id = v_existing_bookmark_id
      where company_paint_product_id = rec.id;

      update public.company_baseline_paint_systems
      set primer_product_id = v_existing_bookmark_id
      where primer_product_id = rec.id;

      update public.company_baseline_paint_systems
      set topcoat_product_id = v_existing_bookmark_id
      where topcoat_product_id = rec.id;

      delete from public.company_paint_products
      where id = rec.id;
    else
      update public.company_paint_products
      set
        source = 'catalog',
        paint_product_id = v_new_product_id,
        updated_at = now()
      where id = rec.id;
    end if;
  end loop;
end $$;

-- Bookmark rows no longer require denormalized identity columns.
alter table public.company_paint_products
  alter column name drop not null;

-- ---------------------------------------------------------------------------
-- Bookmark semantics: denormalized product columns are deprecated (not dropped)
-- ---------------------------------------------------------------------------

comment on table public.company_paint_products is
  'Per-company bookmark to paint_products with private pricing and library preferences. Product metadata lives on paint_products.';

comment on column public.company_paint_products.unit_cost is
  'Private company cost — never shared with other subscribers.';

comment on column public.company_paint_products.unit_price is
  'Private company sell price — never shared with other subscribers.';

comment on column public.company_paint_products.coverage_sqft_per_gallon is
  'Company-specific coverage override for estimating.';

comment on column public.company_paint_products.gallons_per_labor_hour is
  'Company-specific productivity override for labor estimating.';

comment on column public.company_paint_products.role is
  'How this company classifies the product in their library (primer/topcoat/etc).';

comment on column public.company_paint_products.sheen is
  'Sheen this company selected from the platform product options.';

comment on column public.company_paint_products.name is
  'Deprecated snapshot — display name is resolved from paint_products.';

comment on column public.company_paint_products.manufacturer_name is
  'Deprecated snapshot — manufacturer is resolved from paint_products.';