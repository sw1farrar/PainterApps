-- Quote baseline paint systems (interior/exterior × surface category)
-- Customer-facing tier display names on quote_tiers

-- ---------------------------------------------------------------------------
-- Baseline paint systems per quote
-- ---------------------------------------------------------------------------

create table if not exists public.quote_baseline_paint_systems (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  application_scope text not null,
  surface_category text not null,
  primer_product_id uuid references public.company_paint_products(id) on delete set null,
  topcoat_product_id uuid references public.company_paint_products(id) on delete set null,
  primer_coats integer not null default 1,
  topcoat_coats integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_baseline_paint_systems_scope_check
    check (application_scope in ('interior', 'exterior')),
  constraint quote_baseline_paint_systems_category_check
    check (surface_category in ('wall', 'trim', 'door', 'ceiling')),
  constraint quote_baseline_paint_systems_unique
    unique (quote_id, application_scope, surface_category)
);

create index if not exists quote_baseline_paint_systems_quote_id_idx
  on public.quote_baseline_paint_systems (quote_id);

alter table public.quote_baseline_paint_systems enable row level security;

drop policy if exists quote_baseline_paint_systems_all on public.quote_baseline_paint_systems;
create policy quote_baseline_paint_systems_all on public.quote_baseline_paint_systems
  for all to authenticated
  using (
    quote_id in (
      select id from public.quotes
      where company_id = public.current_company_id()
    )
  )
  with check (
    quote_id in (
      select id from public.quotes
      where company_id = public.current_company_id()
    )
  );

grant select, insert, update, delete
  on table public.quote_baseline_paint_systems
  to authenticated;

grant all on table public.quote_baseline_paint_systems to service_role;

-- ---------------------------------------------------------------------------
-- Custom tier display names (Good / Better / Best labels on customer quote)
-- ---------------------------------------------------------------------------

alter table public.quote_tiers
  add column if not exists display_name text;

comment on column public.quote_tiers.display_name is
  'Customer-facing label for this tier; defaults to Good/Better/Best when null.';