-- Labor margin and sundries defaults (replaces overhead in estimate pricing).

alter table public.companies
  add column if not exists labor_markup_pct numeric not null default 25;

alter table public.companies
  add column if not exists sundries_pct numeric not null default 20;

comment on column public.companies.labor_markup_pct is
  'Default margin (%) applied to average hourly labor cost on auto-generated quote estimates.';

comment on column public.companies.sundries_pct is
  'Default sundries & supplies cost as a percentage of paint material cost at cost on estimates.';