-- Sheet-level interior/exterior designation (applies to all tiers on the sell sheet)

alter table public.sell_sheets
  add column if not exists application_type text;

alter table public.sell_sheets
  drop constraint if exists sell_sheets_application_type_check;

alter table public.sell_sheets
  add constraint sell_sheets_application_type_check
  check (
    application_type is null
    or application_type in ('interior', 'exterior')
  );

comment on column public.sell_sheets.application_type is
  'Interior or exterior — applies to every package tier on this sell sheet.';

-- Backfill from legacy tier JSON (applicationType stored on first tier)
update public.sell_sheets
set application_type = (tiers->0->>'applicationType')
where application_type is null
  and tiers is not null
  and jsonb_array_length(tiers) > 0
  and (tiers->0->>'applicationType') in ('interior', 'exterior');

-- Remove legacy per-tier applicationType from JSONB payloads
update public.sell_sheets
set tiers = (
  select coalesce(
    jsonb_agg(elem - 'applicationType'),
    '[]'::jsonb
  )
  from jsonb_array_elements(tiers) as elem
)
where exists (
  select 1
  from jsonb_array_elements(tiers) as elem
  where elem ? 'applicationType'
);