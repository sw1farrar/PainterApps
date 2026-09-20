alter table public.production_rates
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

update public.production_rates r
  set company_id = p.company_id
  from public.profiles p
  where p.user_id = r.user_id and r.company_id is null;

create index if not exists production_rates_company_idx on public.production_rates (company_id);

drop policy if exists "production rates own" on public.production_rates;
create policy "production rates company" on public.production_rates
  for all to authenticated
  using (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid())
    )
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_platform_admin
    )
  )
  with check (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid())
    )
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.is_platform_admin
    )
  );
