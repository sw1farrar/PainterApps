-- In-app notifications for quote and job events

create table notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index notifications_company_id_idx on notifications (company_id);
create index notifications_unread_idx on notifications (company_id, read_at);

alter table notifications enable row level security;

create policy notifications_select on notifications
  for select
  using (company_id = public.current_company_id());

create policy notifications_update on notifications
  for update
  using (company_id = public.current_company_id());

grant all on table public.notifications to authenticated;
grant all on table public.notifications to service_role;