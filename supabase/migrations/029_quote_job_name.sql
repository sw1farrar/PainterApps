-- Job name (estimate label) and simple-quote editor prerequisites.
-- Safe to run on databases that already applied migrations 011, 022–028.
-- The app stores the job name in quotes.name (nullable text).

-- ---------------------------------------------------------------------------
-- Enums (no-op if already created in 022)
-- ---------------------------------------------------------------------------

do $$ begin
  create type quote_job_type as enum ('interior', 'exterior', 'both', 'specialty');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type quote_estimation_mode as enum ('hybrid', 'room', 'surface', 'manual');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type quote_surface_kind as enum (
    'wall', 'ceiling', 'trim', 'window', 'door', 'custom'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type quote_rate_type as enum ('sqft', 'linear', 'each');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type quote_line_item_source as enum ('room', 'surface', 'manual');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Quote header fields used by the simple quote editor
-- ---------------------------------------------------------------------------

alter table public.quotes
  add column if not exists name text,
  add column if not exists job_type quote_job_type default 'interior',
  add column if not exists estimation_mode quote_estimation_mode default 'hybrid',
  add column if not exists custom_message text,
  add column if not exists job_address_line2 text,
  add column if not exists job_city text,
  add column if not exists job_state text,
  add column if not exists job_zip text,
  add column if not exists accepted_optional_line_item_ids uuid[] default '{}';

comment on column public.quotes.name is
  'User-facing job/estimate name (e.g. Kitchen repaint) to distinguish repeat customers.';

-- ---------------------------------------------------------------------------
-- Quote rooms / line items extensions for area-based estimates
-- ---------------------------------------------------------------------------

alter table public.quote_rooms
  add column if not exists sort_order integer default 0,
  add column if not exists photo_url text,
  add column if not exists is_optional boolean default false,
  add column if not exists length_ft numeric,
  add column if not exists width_ft numeric,
  add column if not exists height_ft numeric;

alter table public.quote_line_items
  add column if not exists source quote_line_item_source default 'manual',
  add column if not exists room_id uuid references public.quote_rooms(id) on delete set null,
  add column if not exists is_optional boolean default false,
  add column if not exists sort_order integer default 0;

create index if not exists quote_line_items_room_id_idx
  on public.quote_line_items(room_id);

-- ---------------------------------------------------------------------------
-- Quote surfaces (per-area scope)
-- ---------------------------------------------------------------------------

create table if not exists public.quote_surfaces (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  room_id uuid not null references public.quote_rooms(id) on delete cascade,
  surface_type quote_surface_kind not null default 'wall',
  sq_ft numeric default 0,
  coats integer default 2,
  unit_rate numeric default 0,
  rate_type quote_rate_type default 'sqft',
  notes text,
  is_optional boolean default false,
  sort_order integer default 0
);

alter table public.quote_surfaces enable row level security;

do $$ begin
  create policy quote_surfaces_all on public.quote_surfaces
    for all
    using (
      quote_id in (
        select id from public.quotes where company_id = public.current_company_id()
      )
    )
    with check (
      quote_id in (
        select id from public.quotes where company_id = public.current_company_id()
      )
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists quote_surfaces_quote_id_idx on public.quote_surfaces(quote_id);
create index if not exists quote_surfaces_room_id_idx on public.quote_surfaces(room_id);