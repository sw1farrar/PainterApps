-- Sell-sheet-aligned paint product attributes + AI enrichment proposals

create type public.paint_product_enrichment_status as enum (
  'pending',
  'partial',
  'complete'
);

create type public.paint_enrichment_proposal_status as enum (
  'pending',
  'accepted',
  'declined'
);

alter table public.paint_products
  add column if not exists product_description text,
  add column if not exists sheen_options jsonb not null default '[]'::jsonb,
  add column if not exists paint_system_features jsonb not null default '[]'::jsonb,
  add column if not exists paint_system_feature_options jsonb not null default '[]'::jsonb,
  add column if not exists enrichment_status public.paint_product_enrichment_status
    not null default 'pending',
  add column if not exists enriched_at timestamptz,
  add column if not exists enrichment_source_url text;

comment on column public.paint_products.paint_system_features is
  'Selected coating specs for sell sheets (up to 2 displayed per tier).';

comment on column public.paint_products.paint_system_feature_options is
  'All discovered coating specs from manufacturer / AI for this product line.';

create table public.paint_product_enrichment_proposals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.paint_products(id) on delete cascade,
  status public.paint_enrichment_proposal_status not null default 'pending',
  proposed jsonb not null default '{}'::jsonb,
  previous_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index paint_product_enrichment_proposals_product_id_idx
  on public.paint_product_enrichment_proposals (product_id);

create index paint_product_enrichment_proposals_status_idx
  on public.paint_product_enrichment_proposals (status);

create index paint_products_enrichment_status_idx
  on public.paint_products (enrichment_status);

alter table public.paint_product_enrichment_proposals enable row level security;

create policy paint_product_enrichment_proposals_site_admin_all
  on public.paint_product_enrichment_proposals
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select, insert, update, delete
  on table public.paint_product_enrichment_proposals
  to authenticated;

grant all
  on table public.paint_product_enrichment_proposals
  to service_role;