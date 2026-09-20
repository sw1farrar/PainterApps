-- Exterior wood / acrylic systems also cover trim and doors.
-- Porch-and-patio systems cover wood decks. No invented specialty SKUs.

update public.tds_systems
set application_types = application_types || '{trim}'
where exterior = true
  and (
    'wood' = any(substrates)
    or name ilike '%chalk%'
  )
  and not ('trim' = any(application_types));

update public.tds_systems
set application_types = application_types || '{wood-deck}'
where (name ilike '%porch%' or name ilike '%patio%' or name ilike '%deck%')
  and not ('wood-deck' = any(application_types));
