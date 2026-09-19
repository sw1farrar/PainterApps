alter table public.jobs
  add column if not exists coverage_snapshot jsonb;
