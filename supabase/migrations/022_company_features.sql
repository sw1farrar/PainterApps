-- Company feature flags (Estimate Pro first). Subscriptions can reuse this jsonb later.
-- Existing shops keep Estimate Pro; new companies default off.

alter table public.companies
  add column if not exists features jsonb not null default '{"estimate_pro": false}'::jsonb;

update public.companies
set features = jsonb_set(coalesce(features, '{}'::jsonb), '{estimate_pro}', 'true'::jsonb);

create or replace function public.protect_company_features()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.features := old.features;
  elsif tg_op = 'INSERT' then
    new.features := coalesce(new.features, '{"estimate_pro": false}'::jsonb);
    new.features := jsonb_set(new.features, '{estimate_pro}', 'false'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists protect_company_features on public.companies;
create trigger protect_company_features
  before insert or update on public.companies
  for each row execute function public.protect_company_features();

notify pgrst, 'reload schema';
