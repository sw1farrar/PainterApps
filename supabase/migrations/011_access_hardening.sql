-- Harden profile privilege columns, member write rules, and estimate child RLS.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_platform_admin := false;
    new.is_editor := coalesce(new.is_editor, false);
    if new.account_role = 'platform_admin' then
      new.account_role := 'owner';
    end if;
  elsif tg_op = 'UPDATE' then
    new.is_platform_admin := old.is_platform_admin;
    new.access_enabled := old.access_enabled;
    new.account_role := old.account_role;
    new.company_id := old.company_id;
    new.is_editor := old.is_editor;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();

drop policy if exists "profiles delete own" on public.profiles;

drop policy if exists "members of company" on public.company_members;
drop policy if exists "members select" on public.company_members;
drop policy if exists "members write owners" on public.company_members;
drop policy if exists "members update owners" on public.company_members;
drop policy if exists "members delete owners" on public.company_members;

create policy "members select" on public.company_members
  for select to authenticated
  using (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

create policy "members write owners" on public.company_members
  for insert to authenticated
  with check (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

create policy "members update owners" on public.company_members
  for update to authenticated
  using (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  )
  with check (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

create policy "members delete owners" on public.company_members
  for delete to authenticated
  using (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

drop policy if exists "estimate areas own" on public.estimate_areas;
create policy "estimate areas company" on public.estimate_areas
  for all to authenticated
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and (
          e.user_id = (select auth.uid())
          or e.company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
          or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
        )
    )
  )
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and (
          e.user_id = (select auth.uid())
          or e.company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
          or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
        )
    )
  );

drop policy if exists "estimate surfaces own" on public.estimate_surfaces;
create policy "estimate surfaces company" on public.estimate_surfaces
  for all to authenticated
  using (
    exists (
      select 1 from public.estimate_areas a
      join public.estimates e on e.id = a.estimate_id
      where a.id = area_id
        and (
          e.user_id = (select auth.uid())
          or e.company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
          or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
        )
    )
  )
  with check (
    exists (
      select 1 from public.estimate_areas a
      join public.estimates e on e.id = a.estimate_id
      where a.id = area_id
        and (
          e.user_id = (select auth.uid())
          or e.company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
          or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
        )
    )
  );
