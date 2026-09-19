revoke update on table public.profiles from authenticated;
grant update (locale, units) on table public.profiles to authenticated;

drop policy if exists "profiles self" on public.profiles;

create policy "profiles select own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles insert own"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id and is_editor = false);

create policy "profiles update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "profiles delete own"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.protect_is_editor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_editor := false;
  elsif tg_op = 'UPDATE' then
    new.is_editor := old.is_editor;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_editor on public.profiles;
create trigger protect_is_editor
  before insert or update on public.profiles
  for each row execute function public.protect_is_editor();
