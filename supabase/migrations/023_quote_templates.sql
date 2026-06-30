-- Saved quote templates (company-scoped reusable estimate structures)

create table public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  job_type quote_job_type not null default 'interior',
  source_quote_id uuid references public.quotes(id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_templates enable row level security;

create policy quote_templates_all on public.quote_templates
  for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create index quote_templates_company_id_idx on public.quote_templates(company_id);
create index quote_templates_updated_at_idx on public.quote_templates(updated_at desc);