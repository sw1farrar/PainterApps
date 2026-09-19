-- PainterApps schema
-- Apply in the Supabase SQL editor or via supabase db push.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'es')),
  units text not null default 'imperial' check (units in ('imperial', 'metric')),
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  label text not null,
  zip text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists locations_user_idx on public.locations (user_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  location_id uuid references public.locations(id) on delete set null,
  zip text,
  notes text,
  weather_snapshot jsonb,
  system_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jobs_user_idx on public.jobs (user_id);

create table if not exists public.weather_cache (
  zip text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists public.tds_manufacturers (
  id text primary key,
  slug text unique not null,
  name text not null,
  website text
);

create table if not exists public.tds_products (
  id text primary key,
  manufacturer_id text not null references public.tds_manufacturers(id) on delete cascade,
  name text not null,
  sku text,
  kind text not null check (kind in ('prep', 'primer', 'topcoat', 'other')),
  substrates text[] not null default '{}',
  interior boolean not null default false,
  exterior boolean not null default false,
  voc_g_l integer,
  sheens text[] not null default '{}',
  min_temp_f integer,
  max_temp_f integer,
  max_humidity_pct integer,
  tds_url text,
  tds_revision text,
  tds_date date,
  notes text
);

create table if not exists public.tds_systems (
  id text primary key,
  manufacturer_id text not null references public.tds_manufacturers(id) on delete cascade,
  name text not null,
  interior boolean not null default false,
  exterior boolean not null default false,
  substrates text[] not null default '{}',
  failure_modes text[] not null default '{}',
  prep_notes text,
  primer_product_id text references public.tds_products(id),
  topcoat_product_id text references public.tds_products(id),
  midcoat_product_id text references public.tds_products(id),
  why text,
  rank_hint integer not null default 0
);

create table if not exists public.tds_documents (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.tds_products(id) on delete cascade,
  title text,
  url text,
  revision text,
  published_at date,
  raw_text text
);

create table if not exists public.tds_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.tds_documents(id) on delete cascade,
  content text not null,
  metadata jsonb not null default '{}'
);

-- Future RAG: enable the vector extension in the Supabase dashboard, then:
-- create extension if not exists vector;
-- create table public.tds_embeddings (
--   id uuid primary key default gen_random_uuid(),
--   chunk_id uuid not null references public.tds_chunks(id) on delete cascade,
--   embedding vector(1536),
--   model text
-- );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

-- Phase 2 estimating (not implemented in MVP):
-- create table public.estimates (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references public.profiles(user_id) on delete cascade,
--   job_id uuid references public.jobs(id) on delete set null,
--   status text not null default 'draft',
--   totals jsonb,
--   created_at timestamptz not null default now()
-- );
-- create table public.estimate_line_items (
--   id uuid primary key default gen_random_uuid(),
--   estimate_id uuid not null references public.estimates(id) on delete cascade,
--   kind text,
--   description text,
--   quantity numeric,
--   unit text,
--   unit_cost numeric
-- );
