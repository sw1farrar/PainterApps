-- Company average labor cost for estimates; align default wall coverage with industry norms.

alter table public.companies
  add column if not exists avg_labor_cost_per_hour numeric;

comment on column public.companies.avg_labor_cost_per_hour is
  'Blended crew cost per hour used for painting labor line items. Falls back to painter rate when unset.';

alter table public.companies
  alter column coverage_sqft_per_gallon set default 400;