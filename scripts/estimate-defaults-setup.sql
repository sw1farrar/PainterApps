-- Estimate defaults: run this once (Supabase SQL editor or apply-estimate-defaults-setup.mjs)
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed.

-- ---------------------------------------------------------------------------
-- 035: Average labor cost
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists avg_labor_cost_per_hour numeric;

comment on column public.companies.avg_labor_cost_per_hour is
  'Blended crew cost per hour used for painting labor line items.';

alter table public.companies
  alter column coverage_sqft_per_gallon set default 400;

-- ---------------------------------------------------------------------------
-- 038: Company baseline paint systems + scoped tier defaults
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

alter table public.company_tier_defaults
  add column if not exists application_scope text not null default 'interior';

alter table public.company_tier_defaults
  drop constraint if exists company_tier_defaults_unique_tier;

alter table public.company_tier_defaults
  drop constraint if exists company_tier_defaults_unique_tier_scope;

alter table public.company_tier_defaults
  drop constraint if exists company_tier_defaults_scope_check;

alter table public.company_tier_defaults
  add constraint company_tier_defaults_scope_check
    check (application_scope in ('interior', 'exterior'));

alter table public.company_tier_defaults
  add constraint company_tier_defaults_unique_tier_scope
    unique (company_id, tier, application_scope);

comment on column public.company_tier_defaults.application_scope is
  'Interior or exterior Good/Better/Best default paint systems for new quotes.';

-- ---------------------------------------------------------------------------
-- 039: Spot prime on baseline / tier paint config
-- ---------------------------------------------------------------------------

alter table public.quote_baseline_paint_systems
  add column if not exists primer_spot_prime boolean not null default false;

alter table public.company_baseline_paint_systems
  add column if not exists primer_spot_prime boolean not null default false;

alter table public.quote_tier_paint_config
  add column if not exists primer_spot_prime boolean not null default false;

comment on column public.quote_baseline_paint_systems.primer_spot_prime is
  'When true, primer gallons use 10% of a full coat instead of primer_coats.';

drop function if exists public.save_quote_draft_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

create or replace function public.save_quote_draft_children(
  p_quote_id uuid,
  p_rooms jsonb default '[]',
  p_surfaces jsonb default '[]',
  p_line_items jsonb default '[]',
  p_tiers jsonb default '[]',
  p_tier_paint_config jsonb default '[]',
  p_paint_defaults jsonb default '[]'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  room_ids uuid[] := array[]::uuid[];
  r jsonb;
  s jsonb;
  li jsonb;
  t jsonb;
  pc jsonb;
  pd jsonb;
  idx int;
  new_room_id uuid;
begin
  select company_id into v_company_id from public.quotes where id = p_quote_id;

  if v_company_id is null or v_company_id != public.current_company_id() then
    raise exception 'Quote not found';
  end if;

  delete from public.quote_line_items where quote_id = p_quote_id;
  delete from public.quote_surfaces where quote_id = p_quote_id;
  delete from public.quote_tiers where quote_id = p_quote_id;
  delete from public.quote_tier_paint_config where quote_id = p_quote_id;
  delete from public.quote_paint_defaults where quote_id = p_quote_id;
  delete from public.quote_rooms where quote_id = p_quote_id;

  for r in select value from jsonb_array_elements(coalesce(p_rooms, '[]'::jsonb))
  loop
    insert into public.quote_rooms (
      quote_id,
      name,
      surface_type,
      condition,
      sq_ft,
      color_codes,
      coats,
      prep_work,
      sort_order,
      photo_url,
      is_optional,
      length_ft,
      width_ft,
      height_ft
    ) values (
      p_quote_id,
      coalesce(r->>'name', ''),
      coalesce(r->>'surface_type', 'drywall'),
      coalesce(r->>'condition', 'good'),
      coalesce((r->>'sq_ft')::numeric, 0),
      coalesce(r->>'color_codes', ''),
      coalesce((r->>'coats')::int, 2),
      coalesce(r->>'prep_work', ''),
      coalesce((r->>'sort_order')::int, 0),
      nullif(r->>'photo_url', ''),
      coalesce((r->>'is_optional')::boolean, false),
      nullif(r->>'length_ft', '')::numeric,
      nullif(r->>'width_ft', '')::numeric,
      nullif(r->>'height_ft', '')::numeric
    )
    returning id into new_room_id;

    room_ids := array_append(room_ids, new_room_id);
  end loop;

  for s in select value from jsonb_array_elements(coalesce(p_surfaces, '[]'::jsonb))
  loop
    idx := (s->>'room_index')::int;
    if idx is not null and idx >= 0 and idx < coalesce(array_length(room_ids, 1), 0) then
      insert into public.quote_surfaces (
        quote_id,
        room_id,
        surface_type,
        sq_ft,
        coats,
        unit_rate,
        rate_type,
        notes,
        is_optional,
        sort_order,
        company_paint_product_id,
        product_override,
        gallons_estimated,
        surface_key
      ) values (
        p_quote_id,
        room_ids[idx + 1],
        coalesce(s->>'surface_type', 'wall')::quote_surface_kind,
        coalesce((s->>'sq_ft')::numeric, 0),
        coalesce((s->>'coats')::int, 2),
        coalesce((s->>'unit_rate')::numeric, 0),
        coalesce(s->>'rate_type', 'sqft')::quote_rate_type,
        nullif(s->>'notes', ''),
        coalesce((s->>'is_optional')::boolean, false),
        coalesce((s->>'sort_order')::int, 0),
        nullif(s->>'company_paint_product_id', '')::uuid,
        coalesce((s->>'product_override')::boolean, false),
        nullif(s->>'gallons_estimated', '')::numeric,
        nullif(s->>'surface_key', '')
      );
    end if;
  end loop;

  for li in select value from jsonb_array_elements(coalesce(p_line_items, '[]'::jsonb))
  loop
    idx := (li->>'room_index')::int;
    new_room_id := null;
    if idx is not null and idx >= 0 and idx < coalesce(array_length(room_ids, 1), 0) then
      new_room_id := room_ids[idx + 1];
    end if;

    insert into public.quote_line_items (
      quote_id,
      type,
      description,
      qty,
      unit_cost,
      markup,
      source,
      room_id,
      is_optional,
      sort_order,
      company_paint_product_id,
      paint_role
    ) values (
      p_quote_id,
      coalesce(li->>'type', 'labor')::quote_line_item_type,
      coalesce(li->>'description', ''),
      coalesce((li->>'qty')::numeric, 1),
      coalesce((li->>'unit_cost')::numeric, 0),
      coalesce((li->>'markup')::numeric, 0),
      coalesce(li->>'source', 'manual')::quote_line_item_source,
      new_room_id,
      coalesce((li->>'is_optional')::boolean, false),
      coalesce((li->>'sort_order')::int, 0),
      nullif(li->>'company_paint_product_id', '')::uuid,
      nullif(li->>'paint_role', '')::company_paint_product_role
    );
  end loop;

  for t in select value from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb))
  loop
    insert into public.quote_tiers (
      quote_id, tier, price, margin, features, benefits, display_name
    ) values (
      p_quote_id,
      coalesce(t->>'tier', 'good')::quote_tier_name,
      coalesce((t->>'price')::numeric, 0),
      coalesce((t->>'margin')::numeric, 0),
      coalesce(t->'features', '[]'::jsonb),
      coalesce(t->'benefits', '[]'::jsonb),
      nullif(t->>'display_name', '')
    );
  end loop;

  for pc in select value from jsonb_array_elements(coalesce(p_tier_paint_config, '[]'::jsonb))
  loop
    insert into public.quote_tier_paint_config (
      quote_id, tier, primer_product_id, topcoat_product_id,
      primer_coats, topcoat_coats, primer_spot_prime,
      labor_hours_delta_pct, labor_hours_delta_hours, prep_hours_delta,
      value_add_features, snapshot
    ) values (
      p_quote_id,
      coalesce(pc->>'tier', 'good')::quote_tier_name,
      nullif(pc->>'primer_product_id', '')::uuid,
      nullif(pc->>'topcoat_product_id', '')::uuid,
      coalesce((pc->>'primer_coats')::int, 1),
      coalesce((pc->>'topcoat_coats')::int, 2),
      coalesce((pc->>'primer_spot_prime')::boolean, false),
      coalesce((pc->>'labor_hours_delta_pct')::numeric, 0),
      coalesce((pc->>'labor_hours_delta_hours')::numeric, 0),
      coalesce((pc->>'prep_hours_delta')::numeric, 0),
      coalesce(pc->'value_add_features', '[]'::jsonb),
      coalesce(pc->'snapshot', '{}'::jsonb)
    );
  end loop;

  for pd in select value from jsonb_array_elements(coalesce(p_paint_defaults, '[]'::jsonb))
  loop
    insert into public.quote_paint_defaults (
      quote_id, surface_type, company_paint_product_id, coats
    ) values (
      p_quote_id,
      coalesce(pd->>'surface_type', 'wall')::quote_surface_kind,
      nullif(pd->>'company_paint_product_id', '')::uuid,
      coalesce((pd->>'coats')::int, 2)
    );
  end loop;
end;
$$;

grant execute on function public.save_quote_draft_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 040: Labor markup + sundries columns
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists labor_markup_pct numeric not null default 25;

alter table public.companies
  add column if not exists sundries_pct numeric not null default 20;

comment on column public.companies.labor_markup_pct is
  'Reference labor margin % on company settings (estimate defaults modal).';

comment on column public.companies.sundries_pct is
  'Legacy sundries %; estimates use overhead + gross margin instead.';

-- ---------------------------------------------------------------------------
-- 041 + 042: Surface labor overrides (system defaults live in app code)
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists surface_labor_defaults jsonb not null default '{}'::jsonb;

comment on column public.companies.surface_labor_defaults is
  'Per-surface labor/production overrides (interior/exterior walls, ceilings, trim, doors, windows, cabinets). Omit a category or reset it to use system-wide defaults; overrides persist until explicitly reset.';