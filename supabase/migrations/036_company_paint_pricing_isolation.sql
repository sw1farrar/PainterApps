-- Company paint pricing is private per tenant.
-- Platform catalog (paint_products) holds shared product metadata only — never unit costs.

comment on table public.company_paint_products is
  'Per-company paint SKUs and private pricing. unit_cost and unit_price are visible only to the owning company.';

comment on column public.company_paint_products.unit_cost is
  'What the company pays per gallon. Stored only on this row; never written to shared paint_products.';

comment on column public.company_paint_products.unit_price is
  'What the company charges per gallon. Private to this company.';

alter table public.company_paint_products force row level security;