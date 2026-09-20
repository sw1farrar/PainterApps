alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false,
  add column if not exists access_enabled boolean not null default true,
  add column if not exists account_role text not null default 'owner'
    check (account_role in ('platform_admin', 'owner', 'member')),
  add column if not exists company_id uuid;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  hourly_rate numeric not null default 65,
  show_hours_on_proposal boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists company_invites_open_email
  on public.company_invites (company_id, lower(email))
  where accepted_at is null;

alter table public.jobs add column if not exists company_id uuid;
alter table public.customers add column if not exists company_id uuid;
alter table public.locations add column if not exists company_id uuid;
alter table public.estimates add column if not exists company_id uuid;

insert into public.companies (id, name, phone, hourly_rate, show_hours_on_proposal, created_by)
select gen_random_uuid(), coalesce(nullif(cs.company_name, ''), ''), coalesce(cs.phone, ''), coalesce(cs.hourly_rate, 65), coalesce(cs.show_hours_on_proposal, false), p.user_id
from public.profiles p
left join public.company_settings cs on cs.user_id = p.user_id
where p.company_id is null;

-- attach each profile to the company created_by them if still null
update public.profiles p
set company_id = c.id
from public.companies c
where c.created_by = p.user_id and p.company_id is null;

insert into public.company_members (company_id, user_id, role)
select p.company_id, p.user_id, 'owner'
from public.profiles p
where p.company_id is not null
on conflict do nothing;

update public.jobs j set company_id = p.company_id
from public.profiles p where p.user_id = j.user_id and j.company_id is null;
update public.customers x set company_id = p.company_id
from public.profiles p where p.user_id = x.user_id and x.company_id is null;
update public.locations x set company_id = p.company_id
from public.profiles p where p.user_id = x.user_id and x.company_id is null;
update public.estimates x set company_id = p.company_id
from public.profiles p where p.user_id = x.user_id and x.company_id is null;

update public.profiles
set is_platform_admin = true, account_role = 'platform_admin', access_enabled = true
where user_id = '68827488-2960-42cc-9f03-bf7d6708b858';

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;

grant select, insert, update, delete on table public.companies to authenticated, service_role;
grant select, insert, update, delete on table public.company_members to authenticated, service_role;
grant select, insert, update, delete on table public.company_invites to authenticated, service_role;

create policy "companies members read" on public.companies for select to authenticated
  using (
    id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );
create policy "companies members update" on public.companies for update to authenticated
  using (
    id in (select cm.company_id from public.company_members cm where cm.user_id = (select auth.uid()) and cm.role = 'owner')
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

create policy "members of company" on public.company_members for all to authenticated
  using (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  )
  with check (
    company_id in (
      select cm.company_id from public.company_members cm
      where cm.user_id = (select auth.uid()) and cm.role = 'owner'
    )
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

create policy "invites of company" on public.company_invites for all to authenticated
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

-- company-scoped data: members share rows
drop policy if exists "jobs self" on public.jobs;
create policy "jobs company" on public.jobs for all to authenticated
  using (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  )
  with check (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

drop policy if exists "customers own" on public.customers;
create policy "customers company" on public.customers for all to authenticated
  using (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  )
  with check (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

drop policy if exists "locations self" on public.locations;
create policy "locations company" on public.locations for all to authenticated
  using (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  )
  with check (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

drop policy if exists "estimates own" on public.estimates;
create policy "estimates company" on public.estimates for all to authenticated
  using (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  )
  with check (
    company_id in (select company_id from public.profiles where user_id = (select auth.uid()))
    or user_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and is_platform_admin)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  inv public.company_invites%rowtype;
begin
  insert into public.profiles (user_id, is_platform_admin, account_role, access_enabled)
  values (
    new.id,
    lower(coalesce(new.email, '')) = 'sw1farrar@gmail.com',
    case when lower(coalesce(new.email, '')) = 'sw1farrar@gmail.com' then 'platform_admin' else 'owner' end,
    true
  )
  on conflict (user_id) do nothing;

  select * into inv
  from public.company_invites
  where lower(email) = lower(new.email) and accepted_at is null
  order by created_at desc
  limit 1;

  if found then
    update public.profiles
      set company_id = inv.company_id, account_role = 'member'
      where user_id = new.id;
    insert into public.company_members (company_id, user_id, role)
      values (inv.company_id, new.id, 'member')
      on conflict do nothing;
    update public.company_invites set accepted_at = now() where id = inv.id;
  else
    insert into public.companies (name, created_by) values ('', new.id) returning id into cid;
    update public.profiles set company_id = cid where user_id = new.id;
    insert into public.company_members (company_id, user_id, role)
      values (cid, new.id, 'owner')
      on conflict do nothing;
    insert into public.company_settings (user_id) values (new.id)
      on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
