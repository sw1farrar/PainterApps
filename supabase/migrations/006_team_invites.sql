-- Team invites and admin profile management

create table team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  role user_role not null default 'painter',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

create index team_invites_company_id_idx on team_invites (company_id);
create index team_invites_token_idx on team_invites (token);

alter table team_invites enable row level security;

create policy team_invites_admin_all on team_invites
  for all
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update roles for teammates in the same company
drop policy if exists profiles_admin_update on profiles;

create policy profiles_admin_update on profiles
  for update
  using (
    company_id = public.current_company_id()
    and company_id is not null
    and exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
        and admin_profile.company_id = profiles.company_id
    )
  );

grant all on table public.team_invites to authenticated;
grant all on table public.team_invites to service_role;