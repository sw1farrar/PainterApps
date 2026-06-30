-- Default spot-prime primer material as a % of a full coat (area-level choice uses this rate).
alter table public.companies
  add column if not exists spot_prime_material_pct numeric(5, 2) not null default 10;

comment on column public.companies.spot_prime_material_pct is
  'When an area uses spot prime, primer gallons are estimated at this percent of a full coat (default 10).';