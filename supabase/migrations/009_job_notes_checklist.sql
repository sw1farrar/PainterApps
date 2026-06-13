-- Job notes and on-site checklist

alter table jobs
  add column if not exists notes text,
  add column if not exists checklist jsonb default '[]'::jsonb;