alter table public.companies
  add column if not exists sell_sheet_benefit_library jsonb not null default '[]'::jsonb,
  add column if not exists sell_sheet_paint_system_library jsonb not null default '[]'::jsonb;