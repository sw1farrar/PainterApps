-- Membership is the source of truth. Look up users by email. No user_id bypass.

create or replace function public.user_id_for_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke all on function public.user_id_for_email(text) from public, anon, authenticated;
grant execute on function public.user_id_for_email(text) to service_role;

drop policy if exists "companies members read" on public.companies;
create policy "companies members read" on public.companies for select to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "companies members update" on public.companies;
create policy "companies members update" on public.companies for update to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = id and cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "jobs company" on public.jobs;
create policy "jobs company" on public.jobs for all to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  )
  with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "customers company" on public.customers;
create policy "customers company" on public.customers for all to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = customers.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  )
  with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = customers.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "locations company" on public.locations;
create policy "locations company" on public.locations for all to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = locations.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  )
  with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = locations.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "estimates company" on public.estimates;
create policy "estimates company" on public.estimates for all to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = estimates.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  )
  with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = estimates.company_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "estimate areas company" on public.estimate_areas;
drop policy if exists "estimate areas own" on public.estimate_areas;
create policy "estimate areas company" on public.estimate_areas
  for all to authenticated
  using (
    exists (
      select 1 from public.estimates e
      join public.company_members cm on cm.company_id = e.company_id
      where e.id = estimate_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  )
  with check (
    exists (
      select 1 from public.estimates e
      join public.company_members cm on cm.company_id = e.company_id
      where e.id = estimate_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );

drop policy if exists "estimate surfaces company" on public.estimate_surfaces;
drop policy if exists "estimate surfaces own" on public.estimate_surfaces;
create policy "estimate surfaces company" on public.estimate_surfaces
  for all to authenticated
  using (
    exists (
      select 1 from public.estimate_areas a
      join public.estimates e on e.id = a.estimate_id
      join public.company_members cm on cm.company_id = e.company_id
      where a.id = area_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  )
  with check (
    exists (
      select 1 from public.estimate_areas a
      join public.estimates e on e.id = a.estimate_id
      join public.company_members cm on cm.company_id = e.company_id
      where a.id = area_id and cm.user_id = (select auth.uid())
    )
    or exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_platform_admin)
  );
