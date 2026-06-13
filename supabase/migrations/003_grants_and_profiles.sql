-- Supabase API roles need explicit grants (initial migration omitted these)

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
grant all on sequences to anon, authenticated, service_role;

alter default privileges in schema public
grant all on routines to anon, authenticated, service_role;

-- Backfill profiles for users created before the signup trigger ran
insert into public.profiles (id, full_name, role)
select
  u.id,
  u.raw_user_meta_data->>'full_name',
  'admin'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;