alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.jobs enable row level security;
alter table public.weather_cache enable row level security;
alter table public.tds_manufacturers enable row level security;
alter table public.tds_products enable row level security;
alter table public.tds_systems enable row level security;
alter table public.tds_documents enable row level security;
alter table public.tds_chunks enable row level security;

-- Data API: new tables are not auto-exposed. Grant only what the app needs.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.locations to authenticated;
grant select, insert, update, delete on table public.jobs to authenticated;

grant select on table public.weather_cache to anon, authenticated;
grant select on table public.tds_manufacturers to anon, authenticated;
grant select on table public.tds_products to anon, authenticated;
grant select on table public.tds_systems to anon, authenticated;
grant select on table public.tds_documents to anon, authenticated;
grant select on table public.tds_chunks to anon, authenticated;

drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "locations self" on public.locations;
create policy "locations self" on public.locations
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "jobs self" on public.jobs;
create policy "jobs self" on public.jobs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "weather cache read" on public.weather_cache;
create policy "weather cache read" on public.weather_cache
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tds manufacturers read" on public.tds_manufacturers;
create policy "tds manufacturers read" on public.tds_manufacturers
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tds products read" on public.tds_products;
create policy "tds products read" on public.tds_products
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tds systems read" on public.tds_systems;
create policy "tds systems read" on public.tds_systems
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tds documents read" on public.tds_documents;
create policy "tds documents read" on public.tds_documents
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tds chunks read" on public.tds_chunks;
create policy "tds chunks read" on public.tds_chunks
  for select
  to anon, authenticated
  using (true);
