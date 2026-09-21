-- Quote style, Estimate Pro RLS, membership-only tenant tables.
-- Steve FarrarApps shop is weather-only (non-subscribed).

alter table public.companies
  add column if not exists quote_style text not null default 'time_based'
  check (quote_style in ('simple', 'time_based'));

alter table public.companies disable trigger protect_company_features;
update public.companies
set features = jsonb_set(coalesce(features, '{}'::jsonb), '{estimate_pro}', 'false'::jsonb)
where id = '0e7085c6-8629-46c3-8a02-03786078e1cc';
alter table public.companies enable trigger protect_company_features;

create or replace function public.company_has_estimate_pro(cid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select (features->>'estimate_pro') = 'true' from public.companies where id = cid),
    false
  );
$$;

create or replace function public.is_company_member(cid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = cid and user_id = (select auth.uid())
  );
$$;

-- Jobs / customers / estimates: membership + Estimate Pro. No platform-admin bypass.
drop policy if exists "jobs company" on public.jobs;
create policy "jobs company" on public.jobs for all to authenticated
  using (
    public.is_company_member(company_id)
    and public.company_has_estimate_pro(company_id)
  )
  with check (
    public.is_company_member(company_id)
    and public.company_has_estimate_pro(company_id)
  );

drop policy if exists "customers company" on public.customers;
create policy "customers company" on public.customers for all to authenticated
  using (
    public.is_company_member(company_id)
    and public.company_has_estimate_pro(company_id)
  )
  with check (
    public.is_company_member(company_id)
    and public.company_has_estimate_pro(company_id)
  );

drop policy if exists "estimates company" on public.estimates;
create policy "estimates company" on public.estimates for all to authenticated
  using (
    public.is_company_member(company_id)
    and public.company_has_estimate_pro(company_id)
  )
  with check (
    public.is_company_member(company_id)
    and public.company_has_estimate_pro(company_id)
  );

drop policy if exists "production_rates company" on public.production_rates;
create policy "production_rates company" on public.production_rates for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

notify pgrst, 'reload schema';
