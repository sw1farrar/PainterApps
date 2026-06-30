-- Company-level estimate defaults: baseline paint systems and scoped tier defaults.

-- ---------------------------------------------------------------------------
-- Baseline paint systems per company (seeds new quotes)
-- ---------------------------------------------------------------------------

create table if not exists public.company_baseline_paint_systems (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_scope text not null,
  surface_category text not null,
  primer_product_id uuid references public.company_paint_products(id) on delete set null,
  topcoat_product_id uuid references public.company_paint_products(id) on delete set null,
  primer_coats integer not null default 1,
  topcoat_coats integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_baseline_paint_systems_scope_check
    check (application_scope in ('interior', 'exterior')),
  constraint company_baseline_paint_systems_category_check
    check (surface_category in ('wall', 'trim', 'door', 'ceiling')),
  constraint company_baseline_paint_systems_unique
    unique (company_id, application_scope, surface_category)
);

create index if not exists company_baseline_paint_systems_company_id_idx
  on public.company_baseline_paint_systems (company_id);

alter table public.company_baseline_paint_systems enable row level security;

drop policy if exists company_baseline_paint_systems_all on public.company_baseline_paint_systems;
create policy company_baseline_paint_systems_all on public.company_baseline_paint_systems
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

grant select, insert, update, delete
  on table public.company_baseline_paint_systems
  to authenticated;

grant all on table public.company_baseline_paint_systems to service_role;

-- ---------------------------------------------------------------------------
-- Tier defaults scoped by interior / exterior
-- ---------------------------------------------------------------------------

alter table public.company_tier_defaults
  add column if not exists application_scope text not null default 'interior';

alter table public.company_tier_defaults
  drop constraint if exists company_tier_defaults_unique_tier;

alter table public.company_tier_defaults
  drop constraint if exists company_tier_defaults_unique_tier_scope;

alter table public.company_tier_defaults
  add constraint company_tier_defaults_scope_check
    check (application_scope in ('interior', 'exterior'));

alter table public.company_tier_defaults
  add constraint company_tier_defaults_unique_tier_scope
    unique (company_id, tier, application_scope);

comment on column public.company_tier_defaults.application_scope is
  'Interior or exterior Good/Better/Best default paint systems for new quotes.';