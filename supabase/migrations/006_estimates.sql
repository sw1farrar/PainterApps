create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  zip text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists customers_user_idx on public.customers (user_id);

create table if not exists public.company_settings (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  company_name text not null default '',
  phone text not null default '',
  hourly_rate numeric not null default 65,
  show_hours_on_proposal boolean not null default false,
  default_waste_pct numeric not null default 10
);

create table if not exists public.production_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  category text not null,
  name text not null,
  unit text not null check (unit in ('sqft_per_hr', 'lnft_per_hr', 'hr_per_item')),
  coats jsonb not null default '{"1":100,"2":85,"3":70}',
  material_spread_sqft_gal numeric,
  material_cost_per_gal numeric,
  sort int not null default 0
);
create index if not exists production_rates_user_idx on public.production_rates (user_id);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  number int not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  zip text not null default '',
  hourly_rate_snapshot numeric not null,
  totals jsonb not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists estimates_user_idx on public.estimates (user_id);

create table if not exists public.estimate_areas (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('room', 'surface')),
  length numeric not null default 0,
  width numeric not null default 0,
  height numeric not null default 0,
  opening_sqft numeric not null default 0,
  sort int not null default 0
);

create table if not exists public.estimate_surfaces (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.estimate_areas(id) on delete cascade,
  rate_id uuid references public.production_rates(id) on delete set null,
  label text not null,
  unit text not null check (unit in ('sqft_per_hr', 'lnft_per_hr', 'hr_per_item')),
  qty numeric not null default 0,
  coats int not null default 2,
  rate numeric not null default 0,
  hours_paint numeric not null default 0,
  hours_prep numeric not null default 0,
  gallons numeric not null default 0,
  amount numeric not null default 0
);

alter table public.customers enable row level security;
alter table public.company_settings enable row level security;
alter table public.production_rates enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_areas enable row level security;
alter table public.estimate_surfaces enable row level security;

grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.company_settings to authenticated;
grant select, insert, update, delete on table public.production_rates to authenticated;
grant select, insert, update, delete on table public.estimates to authenticated;
grant select, insert, update, delete on table public.estimate_areas to authenticated;
grant select, insert, update, delete on table public.estimate_surfaces to authenticated;

create policy "customers own" on public.customers for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "company settings own" on public.company_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "production rates own" on public.production_rates for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "estimates own" on public.estimates for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "estimate areas own" on public.estimate_areas for all to authenticated
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id and e.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id and e.user_id = (select auth.uid())
    )
  );

create policy "estimate surfaces own" on public.estimate_surfaces for all to authenticated
  using (
    exists (
      select 1 from public.estimate_areas a
      join public.estimates e on e.id = a.estimate_id
      where a.id = area_id and e.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.estimate_areas a
      join public.estimates e on e.id = a.estimate_id
      where a.id = area_id and e.user_id = (select auth.uid())
    )
  );
