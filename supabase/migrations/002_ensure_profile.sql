-- Ensure every auth user has a profile row (fixes signups before trigger existed)

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  user_id uuid := auth.uid();
  user_name text;
begin
  if user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into result from public.profiles where id = user_id;
  if found then
    return result;
  end if;

  select raw_user_meta_data->>'full_name'
  into user_name
  from auth.users
  where id = user_id;

  insert into public.profiles (id, full_name, role)
  values (user_id, user_name, 'admin')
  returning * into result;

  return result;
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- Backfill any existing users missing profiles
insert into public.profiles (id, full_name, role)
select
  u.id,
  u.raw_user_meta_data->>'full_name',
  'admin'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;