-- Company paint product library, presets, tier defaults, and quote tier paint config

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.paint_product_source as enum ('catalog', 'custom');

create type public.company_paint_product_role as enum (
  'primer',
  'topcoat',
  'sealer',
  'undercoater'
);

-- ---------------------------------------------------------------------------
-- Company productivity
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists gallons_per_labor_hour numeric not null default 4;

comment on column public.companies.gallons_per_labor_hour is
  'Crew gallons applied per hour; converts estimated gallons to painting labor hours.';

alter table public.companies
  add column if not exists material_waste_pct numeric not null default 10;

comment on column public.companies.material_waste_pct is
  'Waste factor applied to gallon estimates (percent).';

-- ---------------------------------------------------------------------------
-- Company paint products (individual SKUs)
-- ---------------------------------------------------------------------------

create table public.company_paint_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source public.paint_product_source not null default 'custom',
  paint_product_id uuid references public.paint_products(id) on delete set null,
  name text not null,
  manufacturer_name text,
  role public.company_paint_product_role not null default 'topcoat',
  unit_cost numeric not null default 0,
  coverage_sqft_per_gallon numeric,
  application_type text not null default 'interior',
  sheen text,
  is_self_priming boolean not null default false,
  paint_system_features jsonb not null default '[]'::jsonb,
  gallons_per_labor_hour numeric,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_paint_products_catalog_requires_product
    check (source != 'catalog' or paint_product_id is not null),
  constraint company_paint_products_unique_catalog
    unique (company_id, paint_product_id)
);

create index company_paint_products_company_id_idx
  on public.company_paint_products (company_id);

create index company_paint_products_role_idx
  on public.company_paint_products (company_id, role)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- Paint presets (optional primer + topcoat shortcuts)
-- ---------------------------------------------------------------------------

create table public.company_paint_presets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  application_type text not null default 'interior',
  description text,
  primer_product_id uuid references public.company_paint_products(id) on delete set null,
  topcoat_product_id uuid references public.company_paint_products(id) on delete set null,
  primer_coats integer not null default 1,
  topcoat_coats integer not null default 2,
  labor_hours_delta_pct numeric not null default 0,
  labor_hours_delta_hours numeric not null default 0,
  prep_hours_delta numeric not null default 0,
  value_add_features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index company_paint_presets_company_id_idx
  on public.company_paint_presets (company_id);

-- ---------------------------------------------------------------------------
-- Company tier defaults (Good / Better / Best starting products)
-- ---------------------------------------------------------------------------

create table public.company_tier_defaults (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tier public.quote_tier_name not null,
  primer_product_id uuid references public.company_paint_products(id) on delete set null,
  topcoat_product_id uuid references public.company_paint_products(id) on delete set null,
  primer_coats integer not null default 1,
  topcoat_coats integer not null default 2,
  preset_id uuid references public.company_paint_presets(id) on delete set null,
  labor_hours_delta_pct numeric not null default 0,
  labor_hours_delta_hours numeric not null default 0,
  prep_hours_delta numeric not null default 0,
  value_add_features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_tier_defaults_unique_tier
    unique (company_id, tier),
  constraint company_tier_defaults_quote_tiers_only
    check (tier in ('good', 'better', 'best'))
);

create index company_tier_defaults_company_id_idx
  on public.company_tier_defaults (company_id);

-- ---------------------------------------------------------------------------
-- Quote tier paint config (per-quote selections)
-- ---------------------------------------------------------------------------

create table public.quote_tier_paint_config (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  tier public.quote_tier_name not null,
  primer_product_id uuid references public.company_paint_products(id) on delete set null,
  topcoat_product_id uuid references public.company_paint_products(id) on delete set null,
  primer_coats integer not null default 1,
  topcoat_coats integer not null default 2,
  labor_hours_delta_pct numeric not null default 0,
  labor_hours_delta_hours numeric not null default 0,
  prep_hours_delta numeric not null default 0,
  value_add_features jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_tier_paint_config_unique_tier
    unique (quote_id, tier),
  constraint quote_tier_paint_config_quote_tiers_only
    check (tier in ('good', 'better', 'best'))
);

create index quote_tier_paint_config_quote_id_idx
  on public.quote_tier_paint_config (quote_id);

-- ---------------------------------------------------------------------------
-- Extend quote line items
-- ---------------------------------------------------------------------------

alter table public.quote_line_items
  add column if not exists company_paint_product_id uuid
    references public.company_paint_products(id) on delete set null;

alter table public.quote_line_items
  add column if not exists paint_role public.company_paint_product_role;

-- ---------------------------------------------------------------------------
-- RLS: company-scoped tables
-- ---------------------------------------------------------------------------

alter table public.company_paint_products enable row level security;
alter table public.company_paint_presets enable row level security;
alter table public.company_tier_defaults enable row level security;
alter table public.quote_tier_paint_config enable row level security;

create policy company_paint_products_all on public.company_paint_products
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy company_paint_presets_all on public.company_paint_presets
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy company_tier_defaults_all on public.company_tier_defaults
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy quote_tier_paint_config_all on public.quote_tier_paint_config
  for all to authenticated
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_tier_paint_config.quote_id
        and q.company_id = public.current_company_id()
    )
  )
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_tier_paint_config.quote_id
        and q.company_id = public.current_company_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Global catalog read access for company users (browse when building library)
-- ---------------------------------------------------------------------------

drop policy if exists paint_products_company_read on public.paint_products;
create policy paint_products_company_read on public.paint_products
  for select to authenticated
  using (true);

drop policy if exists paint_manufacturers_company_read on public.paint_manufacturers;
create policy paint_manufacturers_company_read on public.paint_manufacturers
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete
  on table public.company_paint_products,
  public.company_paint_presets,
  public.company_tier_defaults,
  public.quote_tier_paint_config
  to authenticated;

grant all
  on table public.company_paint_products,
  public.company_paint_presets,
  public.company_tier_defaults,
  public.quote_tier_paint_config
  to service_role;