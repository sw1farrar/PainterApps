-- Site-wide configuration (singleton row)

create type public.xai_model_tier as enum ('premium', 'economy');

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  xai_model_tier public.xai_model_tier not null default 'premium',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "site_settings_select_site_admin"
  on public.site_settings
  for select
  to authenticated
  using (public.is_site_admin());

create policy "site_settings_update_site_admin"
  on public.site_settings
  for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;