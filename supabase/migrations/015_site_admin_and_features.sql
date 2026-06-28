-- Site admin flag + per-company feature entitlements

create type public.company_feature as enum (
  'free_tools_sell_sheets',
  'quotes',
  'customers',
  'jobs',
  'team',
  'reports',
  'billing'
);

alter table public.profiles
  add column if not exists is_site_admin boolean not null default false;

alter table public.companies
  add column if not exists enabled_features public.company_feature[]
  not null default array['free_tools_sell_sheets']::public.company_feature[];

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_site_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Bootstrap site admin when auth user exists
update public.profiles p
set is_site_admin = true
from auth.users u
where p.id = u.id
  and lower(u.email) = 'steve@painterapps.com';

grant execute on function public.is_site_admin() to authenticated, service_role;