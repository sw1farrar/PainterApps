-- Architectural / specialty application (parking decks, roofs, pools, walls, …).
-- Filter lives on systems. Empty array means untagged.

alter table public.tds_systems
  add column if not exists application_types text[] not null default '{}'::text[];

-- Tag existing systems from name/substrates only. Do not invent specialty SKUs.

update public.tds_systems
set application_types = application_types || '{floors}'
where 'concrete-floor' = any(substrates)
  and not ('floors' = any(application_types));

update public.tds_systems
set application_types = application_types || '{metal}'
where 'metal' = any(substrates)
  and not ('metal' = any(application_types));

update public.tds_systems
set application_types = application_types || '{trim}'
where name ilike '%trim%'
  and not ('trim' = any(application_types));

update public.tds_systems
set application_types = application_types || '{ceilings}'
where 'drywall' = any(substrates)
  and interior = true
  and not ('ceilings' = any(application_types));

update public.tds_systems
set application_types = application_types || '{siding}'
where exterior = true
  and 'wood' = any(substrates)
  and not ('siding' = any(application_types));

update public.tds_systems
set application_types = application_types || '{walls}'
where (
    'drywall' = any(substrates)
    or 'stucco' = any(substrates)
    or 'masonry' = any(substrates)
    or (exterior = true and 'wood' = any(substrates))
    or (exterior = true and 'previously-painted' = any(substrates))
  )
  and not ('walls' = any(application_types))
  and not ('floors' = any(application_types))
  and not ('metal' = any(application_types))
  and not ('trim' = any(application_types));

notify pgrst, 'reload schema';
