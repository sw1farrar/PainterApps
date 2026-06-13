-- PainterApps initial schema

create type user_role as enum (
  'admin', 'project_manager', 'job_superintendent', 'painter', 'finance'
);

create type quote_status as enum ('draft', 'sent', 'accepted', 'declined');
create type quote_tier_name as enum ('good', 'better', 'best', 'beautiful');
create type line_item_type as enum ('labor', 'material', 'extra');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  address text,
  phone text,
  email text,
  tax_rate numeric default 0,
  labor_rates jsonb default '{}',
  material_markup numeric default 20,
  overhead_pct numeric default 15,
  default_margins jsonb default '{}',
  coverage_sqft_per_gallon numeric default 350,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id),
  role user_role default 'admin',
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  portal_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now()
);

create table quote_upgrade_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies(id) on delete cascade,
  per_gallon_premium numeric default 25,
  premium_service_fee numeric default 150,
  tier_multipliers jsonb default '{"good":1,"better":1.15,"best":1.3,"beautiful":1.5}'
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id),
  job_address text not null,
  status quote_status default 'draft',
  before_photos text[] default '{}',
  accepted_tier quote_tier_name,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table quote_rooms (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  name text not null,
  surface_type text default 'drywall',
  condition text default 'good',
  sq_ft numeric default 0,
  color_codes text,
  coats integer default 2,
  prep_work text
);

create table quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  type line_item_type not null,
  description text not null,
  qty numeric default 1,
  unit_cost numeric default 0,
  markup numeric default 0
);

create table quote_tiers (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  tier quote_tier_name not null,
  price numeric default 0,
  margin numeric default 0,
  features jsonb default '[]',
  benefits jsonb default '[]',
  unique (quote_id, tier)
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid not null references quotes(id),
  customer_id uuid not null references customers(id),
  tier quote_tier_name not null,
  status text default 'active',
  selling_price numeric default 0,
  created_at timestamptz default now()
);

-- RLS helper
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table quotes enable row level security;
alter table quote_rooms enable row level security;
alter table quote_line_items enable row level security;
alter table quote_tiers enable row level security;
alter table quote_upgrade_rules enable row level security;
alter table jobs enable row level security;

create policy companies_select on companies for select using (id = public.current_company_id());
create policy companies_update on companies for update using (id = public.current_company_id());
create policy companies_insert on companies for insert with check (true);

create policy profiles_select on profiles for select using (id = auth.uid() or company_id = public.current_company_id());
create policy profiles_update on profiles for update using (id = auth.uid());
create policy profiles_insert on profiles for insert with check (id = auth.uid());

create policy customers_all on customers for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy quotes_all on quotes for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy quote_rooms_all on quote_rooms for all using (quote_id in (select id from quotes where company_id = public.current_company_id()));
create policy quote_line_items_all on quote_line_items for all using (quote_id in (select id from quotes where company_id = public.current_company_id()));
create policy quote_tiers_all on quote_tiers for all using (quote_id in (select id from quotes where company_id = public.current_company_id()));
create policy quote_upgrade_rules_all on quote_upgrade_rules for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy jobs_all on jobs for all using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage buckets (run in Supabase dashboard if migration fails)
-- company-logos, quote-photos, job-photos