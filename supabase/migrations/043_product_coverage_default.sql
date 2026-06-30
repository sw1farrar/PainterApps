-- Product-level coverage defaults (350 sq ft/gal). Company/surface coverage is deprecated.

alter table public.companies
  alter column coverage_sqft_per_gallon set default 350;

update public.companies
set coverage_sqft_per_gallon = 350
where coverage_sqft_per_gallon is null;

alter table public.company_paint_products
  alter column coverage_sqft_per_gallon set default 350;

update public.company_paint_products
set coverage_sqft_per_gallon = 350
where coverage_sqft_per_gallon is null;

alter table public.paint_products
  add column if not exists coverage_sqft_per_gallon numeric not null default 350;

update public.paint_products
set coverage_sqft_per_gallon = 350
where coverage_sqft_per_gallon is null;