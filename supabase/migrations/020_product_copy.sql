-- Product story copy for the Systems envelope. Do not invent values.

alter table public.tds_products
  add column if not exists description text,
  add column if not exists features text[] not null default '{}'::text[],
  add column if not exists benefits text[] not null default '{}'::text[];

-- Carry existing notes into description only when description is empty.
update public.tds_products
set description = notes
where coalesce(description, '') = ''
  and coalesce(notes, '') <> '';

notify pgrst, 'reload schema';
