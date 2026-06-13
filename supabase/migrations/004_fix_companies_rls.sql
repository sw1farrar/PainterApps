drop policy if exists companies_select on public.companies;
drop policy if exists companies_insert on public.companies;
drop policy if exists companies_update on public.companies;

create policy companies_insert on public.companies
  for insert
  to authenticated
  with check (true);

create policy companies_select on public.companies
  for select
  to authenticated
  using (
    id = (select company_id from public.profiles where id = auth.uid())
  );

create policy companies_update on public.companies
  for update
  to authenticated
  using (
    id = (select company_id from public.profiles where id = auth.uid())
  );