-- Progress photos attached to active jobs

alter table jobs
  add column if not exists job_photos text[] default '{}';