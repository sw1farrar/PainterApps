-- Extra TDS fields Grok can keep current, plus free-form attrs.

alter table public.tds_products
  add column if not exists min_dew_spread_f integer,
  add column if not exists rain_ready_minutes integer,
  add column if not exists recoat_hours numeric,
  add column if not exists attrs jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tds_manufacturers
  add column if not exists attrs jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tds_systems
  add column if not exists attrs jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

grant select, insert, update, delete on table public.tds_manufacturers to service_role;
grant select, insert, update, delete on table public.tds_products to service_role;
grant select, insert, update, delete on table public.tds_systems to service_role;
grant select, insert, update, delete on table public.tds_documents to service_role;
grant select, insert, update, delete on table public.tds_chunks to service_role;
