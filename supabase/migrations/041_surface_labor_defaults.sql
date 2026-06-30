-- Per-surface labor/production defaults and cabinet pricing for estimate defaults.

alter table public.companies
  add column if not exists surface_labor_defaults jsonb not null default '{}'::jsonb;

comment on column public.companies.surface_labor_defaults is
  'Company overrides for surface productivity (walls, ceilings, trim, doors, windows) and cabinet unit rates.';