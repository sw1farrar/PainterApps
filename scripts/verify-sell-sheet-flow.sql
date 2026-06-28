-- PainterApps: verify DB is ready for public sell-sheet + signup flow
-- Run in Supabase SQL Editor (read-only — safe to run anytime)
-- Every row should show status = 'PASS'. Any 'FAIL' needs attention.

-- ---------------------------------------------------------------------------
-- 1) Required tables
-- ---------------------------------------------------------------------------
with required_tables as (
  select unnest(array[
    'public.companies',
    'public.profiles',
    'public.sell_sheets',
    'public.quote_upgrade_rules'
  ]) as object_name
)
select
  'table_exists' as check_group,
  rt.object_name as object_name,
  case when to_regclass(rt.object_name) is not null then 'PASS' else 'FAIL' end as status,
  case
    when to_regclass(rt.object_name) is not null then 'Table present'
    else 'Missing table — run migrations 001, 012, 014, 015'
  end as detail
from required_tables rt

union all

-- ---------------------------------------------------------------------------
-- 2) Required columns (sell sheets + signup provisioning)
-- ---------------------------------------------------------------------------
select
  'column_exists' as check_group,
  'public.companies.' || c.column_name as object_name,
  case when c.column_name is not null then 'PASS' else 'FAIL' end as status,
  case
    when c.column_name is not null then 'Column present'
    else 'Missing column on companies'
  end as detail
from (
  select unnest(array[
    'name', 'slug', 'email', 'phone', 'logo_url', 'onboarding_complete',
    'sell_sheet_benefit_library', 'sell_sheet_paint_system_library', 'enabled_features'
  ]) as column_name
) expected
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'companies'
 and c.column_name = expected.column_name

union all

select
  'column_exists',
  'public.profiles.' || c.column_name,
  case when c.column_name is not null then 'PASS' else 'FAIL' end,
  case when c.column_name is not null then 'Column present' else 'Missing column on profiles' end
from (
  select unnest(array['company_id', 'full_name', 'role', 'is_site_admin']) as column_name
) expected
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'profiles'
 and c.column_name = expected.column_name

union all

select
  'column_exists',
  'public.sell_sheets.' || c.column_name,
  case when c.column_name is not null then 'PASS' else 'FAIL' end,
  case when c.column_name is not null then 'Column present' else 'Missing column on sell_sheets' end
from (
  select unnest(array[
    'id', 'company_id', 'created_by', 'project_name', 'logo_url',
    'tiers', 'application_type', 'created_at', 'updated_at'
  ]) as column_name
) expected
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'sell_sheets'
 and c.column_name = expected.column_name

union all

-- ---------------------------------------------------------------------------
-- 3) Enum for company features (migration 015)
-- ---------------------------------------------------------------------------
select
  'enum_exists',
  'public.company_feature',
  case when exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'company_feature'
  ) then 'PASS' else 'FAIL' end,
  'Enum used for enabled_features on companies'

union all

select
  'enum_value',
  'company_feature.free_tools_sell_sheets',
  case when exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'company_feature'
      and e.enumlabel = 'free_tools_sell_sheets'
  ) then 'PASS' else 'FAIL' end,
  'Sell sheets feature must be in enum for new signups'

union all

-- ---------------------------------------------------------------------------
-- 4) Helper functions
-- ---------------------------------------------------------------------------
select
  'function_exists',
  'public.' || f.proname,
  'PASS',
  'Function present'
from pg_proc f
join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public'
  and f.proname in ('current_company_id', 'is_site_admin', 'handle_new_user', 'ensure_profile')

union all

select
  'function_exists',
  expected.fn,
  'FAIL',
  'Missing function — check migrations'
from (
  select unnest(array[
    'public.current_company_id',
    'public.is_site_admin',
    'public.handle_new_user',
    'public.ensure_profile'
  ]) as fn
) expected
where not exists (
  select 1
  from pg_proc f
  join pg_namespace n on n.oid = f.pronamespace
  where n.nspname = 'public'
    and ('public.' || f.proname) = expected.fn
)

union all

-- ---------------------------------------------------------------------------
-- 5) Signup trigger (auto-create profile)
-- ---------------------------------------------------------------------------
select
  'trigger_exists',
  'auth.users.on_auth_user_created',
  case when exists (
    select 1
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and tg.tgname = 'on_auth_user_created'
      and not tg.tgisinternal
  ) then 'PASS' else 'FAIL' end,
  'Creates profiles row when auth.users row is inserted'

union all

-- ---------------------------------------------------------------------------
-- 6) RLS enabled
-- ---------------------------------------------------------------------------
select
  'rls_enabled',
  'public.' || c.relname,
  case when c.relrowsecurity then 'PASS' else 'FAIL' end,
  case when c.relrowsecurity then 'RLS on' else 'RLS missing — security risk' end
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('companies', 'profiles', 'sell_sheets')

union all

-- ---------------------------------------------------------------------------
-- 7) Required RLS policies
-- ---------------------------------------------------------------------------
select
  'policy_exists',
  'public.sell_sheets.' || expected.policy_name,
  case when p.policyname is not null then 'PASS' else 'FAIL' end,
  case when p.policyname is not null then 'Policy present' else 'Missing sell_sheets policy' end
from (
  select unnest(array[
    'sell_sheets_company_select',
    'sell_sheets_company_insert',
    'sell_sheets_company_update',
    'sell_sheets_company_delete'
  ]) as policy_name
) expected
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = 'sell_sheets'
 and p.policyname = expected.policy_name

union all

select
  'policy_exists',
  'public.companies.' || expected.policy_name,
  case when p.policyname is not null then 'PASS' else 'FAIL' end,
  case when p.policyname is not null then 'Policy present' else 'Missing companies policy' end
from (
  select unnest(array['companies_insert', 'companies_select', 'companies_update']) as policy_name
) expected
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = 'companies'
 and p.policyname = expected.policy_name

union all

-- ---------------------------------------------------------------------------
-- 8) Storage bucket for sell-sheet images
-- ---------------------------------------------------------------------------
select
  'storage_bucket',
  'sell-sheet-assets',
  case when exists (
    select 1 from storage.buckets where id = 'sell-sheet-assets'
  ) then 'PASS' else 'FAIL' end,
  'Public bucket for logo/paint-can uploads (migration 012)'

union all

select
  'storage_bucket_public',
  'sell-sheet-assets.public',
  case when coalesce((
    select public from storage.buckets where id = 'sell-sheet-assets'
  ), false) then 'PASS' else 'FAIL' end,
  'Bucket must be public for preview/PDF image URLs'

union all

-- ---------------------------------------------------------------------------
-- 9) Grants (authenticated needs sell_sheets access)
-- ---------------------------------------------------------------------------
select
  'table_grant',
  'authenticated -> sell_sheets',
  case when has_table_privilege('authenticated', 'public.sell_sheets', 'SELECT')
        and has_table_privilege('authenticated', 'public.sell_sheets', 'INSERT')
        and has_table_privilege('authenticated', 'public.sell_sheets', 'UPDATE')
        and has_table_privilege('authenticated', 'public.sell_sheets', 'DELETE')
      then 'PASS' else 'FAIL' end,
  'Logged-in users must read/write their company sell sheets'

union all

-- ---------------------------------------------------------------------------
-- 10) Data integrity — signup + sell sheet flow
-- ---------------------------------------------------------------------------
select
  'data_integrity',
  'auth_users_missing_profile',
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  count(*)::text || ' auth user(s) have no profiles row — run migration 003 backfill'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null

union all

select
  'data_integrity',
  'profiles_missing_company_after_signup',
  case when count(*) = 0 then 'PASS' else 'WARN' end,
  count(*)::text || ' confirmed user(s) have company_name metadata but no company_id (provision may not have run)'
from auth.users u
join public.profiles p on p.id = u.id
where u.email_confirmed_at is not null
  and coalesce(u.raw_user_meta_data->>'company_name', '') <> ''
  and p.company_id is null

union all

select
  'data_integrity',
  'companies_missing_sell_sheet_feature',
  case when count(*) = 0 then 'PASS' else 'WARN' end,
  count(*)::text || ' company/companies lack free_tools_sell_sheets in enabled_features'
from public.companies c
where not ('free_tools_sell_sheets'::public.company_feature = any (c.enabled_features))

union all

select
  'data_integrity',
  'sell_sheets_orphan_company',
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  count(*)::text || ' sell sheet(s) reference missing company'
from public.sell_sheets s
left join public.companies c on c.id = s.company_id
where c.id is null

union all

select
  'data_integrity',
  'companies_missing_quote_upgrade_rules',
  case when count(*) = 0 then 'PASS' else 'WARN' end,
  count(*)::text || ' company/companies missing quote_upgrade_rules row'
from public.companies c
left join public.quote_upgrade_rules r on r.company_id = c.id
where r.id is null

union all

-- ---------------------------------------------------------------------------
-- 11) sell_sheet_benefit_library shape (v1 JSON or legacy string[])
-- ---------------------------------------------------------------------------
select
  'data_shape',
  'sell_sheet_benefit_library_invalid_json',
  case when count(*) = 0 then 'PASS' else 'WARN' end,
  count(*)::text || ' company/companies have non-array benefit library (expected [] or structured v1)'
from public.companies c
where jsonb_typeof(c.sell_sheet_benefit_library) not in ('array', 'object')

union all

-- ---------------------------------------------------------------------------
-- 12) Optional: recent signups snapshot (informational — always PASS)
-- ---------------------------------------------------------------------------
select
  'info',
  'recent_signups_last_7_days',
  'PASS',
  coalesce((
    select string_agg(
      u.email || ' | confirmed=' || (u.email_confirmed_at is not null)::text
        || ' | company_id=' || coalesce(p.company_id::text, 'null')
        || ' | meta_company=' || coalesce(u.raw_user_meta_data->>'company_name', '(none)'),
      E'\n'
      order by u.created_at desc
    )
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.created_at > now() - interval '7 days'
    limit 10
  ), '(no signups in last 7 days)')

order by check_group, object_name;