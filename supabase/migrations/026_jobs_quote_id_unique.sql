-- One job per accepted quote (prevents double-accept race)

delete from public.jobs j
using public.jobs j2
where j.quote_id = j2.quote_id
  and j.created_at < j2.created_at;

create unique index if not exists jobs_quote_id_unique on public.jobs (quote_id);