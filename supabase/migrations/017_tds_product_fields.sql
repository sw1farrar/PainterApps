-- Typed TDS columns for research bots. Existing columns and rows stay.
-- attrs remains overflow for odd keys.

alter table public.tds_products
  add column if not exists volume_solids_pct numeric,
  add column if not exists weight_solids_pct numeric,
  add column if not exists coverage_sqft_gal_min integer,
  add column if not exists coverage_sqft_gal_max integer,
  add column if not exists wet_film_mils_min numeric,
  add column if not exists wet_film_mils_max numeric,
  add column if not exists dry_film_mils_min numeric,
  add column if not exists dry_film_mils_max numeric,
  add column if not exists dry_to_touch_hours numeric,
  add column if not exists full_cure_days numeric,
  add column if not exists washable_after_days integer,
  add column if not exists vehicle_type text,
  add column if not exists resin_type text,
  add column if not exists weight_per_gallon_lbs numeric,
  add column if not exists viscosity text,
  add column if not exists flash_point text,
  add column if not exists ph_max_substrate numeric,
  add column if not exists clean_up text,
  add column if not exists thinner text,
  add column if not exists tint_system text,
  add column if not exists gloss_60_deg_min numeric,
  add column if not exists gloss_60_deg_max numeric,
  add column if not exists application_rh_max integer,
  add column if not exists rain_ready_conditions text,
  add column if not exists storage_temp_f_min integer,
  add column if not exists storage_temp_f_max integer,
  add column if not exists spray_airless_psi_min integer,
  add column if not exists spray_airless_psi_max integer,
  add column if not exists spray_tip_min text,
  add column if not exists spray_tip_max text,
  add column if not exists pot_life_hours numeric,
  add column if not exists mix_ratio text,
  add column if not exists shelf_life_months integer,
  add column if not exists official_tds_pdf_url text,
  add column if not exists certifications text[] not null default '{}'::text[],
  add column if not exists astm_refs text[] not null default '{}'::text[];

-- Backfill only from attrs keys that already exist. No invented numbers.

update public.tds_products
set volume_solids_pct = (attrs->>'volume_solids_pct')::numeric
where volume_solids_pct is null
  and attrs->>'volume_solids_pct' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set weight_solids_pct = (attrs->>'weight_solids_pct')::numeric
where weight_solids_pct is null
  and attrs->>'weight_solids_pct' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set coverage_sqft_gal_min = (attrs->>'coverage_sqft_gal_min')::integer
where coverage_sqft_gal_min is null
  and attrs->>'coverage_sqft_gal_min' ~ '^[0-9]+$';

update public.tds_products
set coverage_sqft_gal_max = (attrs->>'coverage_sqft_gal_max')::integer
where coverage_sqft_gal_max is null
  and attrs->>'coverage_sqft_gal_max' ~ '^[0-9]+$';

update public.tds_products
set wet_film_mils_min = (attrs->>'wet_film_mils_min')::numeric
where wet_film_mils_min is null
  and attrs->>'wet_film_mils_min' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set wet_film_mils_max = (attrs->>'wet_film_mils_max')::numeric
where wet_film_mils_max is null
  and attrs->>'wet_film_mils_max' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set dry_film_mils_min = (attrs->>'dry_film_mils_min')::numeric
where dry_film_mils_min is null
  and attrs->>'dry_film_mils_min' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set dry_film_mils_max = (attrs->>'dry_film_mils_max')::numeric
where dry_film_mils_max is null
  and attrs->>'dry_film_mils_max' ~ '^[0-9]+(\.[0-9]+)?$';

-- Coverage-rate film keys (Behr Dynasty) → min/max only when typed columns are empty.
update public.tds_products
set
  wet_film_mils_min = least(
    nullif(attrs->>'wet_film_mils_at_400','')::numeric,
    nullif(attrs->>'wet_film_mils_at_250','')::numeric
  ),
  wet_film_mils_max = greatest(
    nullif(attrs->>'wet_film_mils_at_400','')::numeric,
    nullif(attrs->>'wet_film_mils_at_250','')::numeric
  )
where wet_film_mils_min is null
  and wet_film_mils_max is null
  and attrs->>'wet_film_mils_at_250' ~ '^[0-9]+(\.[0-9]+)?$'
  and attrs->>'wet_film_mils_at_400' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set
  dry_film_mils_min = least(
    nullif(attrs->>'dry_film_mils_at_400','')::numeric,
    nullif(attrs->>'dry_film_mils_at_250','')::numeric
  ),
  dry_film_mils_max = greatest(
    nullif(attrs->>'dry_film_mils_at_400','')::numeric,
    nullif(attrs->>'dry_film_mils_at_250','')::numeric
  )
where dry_film_mils_min is null
  and dry_film_mils_max is null
  and attrs->>'dry_film_mils_at_250' ~ '^[0-9]+(\.[0-9]+)?$'
  and attrs->>'dry_film_mils_at_400' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set dry_to_touch_hours = (attrs->>'dry_to_touch_hours')::numeric
where dry_to_touch_hours is null
  and attrs->>'dry_to_touch_hours' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set full_cure_days = (attrs->>'full_cure_days')::numeric
where full_cure_days is null
  and attrs->>'full_cure_days' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set full_cure_days = (attrs->>'full_cure_weeks')::numeric * 7
where full_cure_days is null
  and attrs->>'full_cure_weeks' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set washable_after_days = (attrs->>'washable_after_days')::integer
where washable_after_days is null
  and attrs->>'washable_after_days' ~ '^[0-9]+$';

update public.tds_products
set washable_after_days = (attrs->>'washable_after_weeks')::integer * 7
where washable_after_days is null
  and attrs->>'washable_after_weeks' ~ '^[0-9]+$';

update public.tds_products
set vehicle_type = nullif(attrs->>'vehicle_type','')
where coalesce(vehicle_type, '') = ''
  and coalesce(attrs->>'vehicle_type','') <> '';

update public.tds_products
set resin_type = nullif(attrs->>'resin_type','')
where coalesce(resin_type, '') = ''
  and coalesce(attrs->>'resin_type','') <> '';

update public.tds_products
set weight_per_gallon_lbs = (attrs->>'weight_per_gallon_lbs')::numeric
where weight_per_gallon_lbs is null
  and attrs->>'weight_per_gallon_lbs' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set viscosity = coalesce(nullif(attrs->>'viscosity',''), nullif(attrs->>'viscosity_ku',''))
where coalesce(viscosity, '') = ''
  and coalesce(attrs->>'viscosity', attrs->>'viscosity_ku', '') <> '';

update public.tds_products
set flash_point = nullif(attrs->>'flash_point','')
where coalesce(flash_point, '') = ''
  and coalesce(attrs->>'flash_point','') <> '';

update public.tds_products
set clean_up = coalesce(nullif(attrs->>'clean_up',''), nullif(attrs->>'cleanup',''))
where coalesce(clean_up, '') = ''
  and coalesce(attrs->>'clean_up', attrs->>'cleanup', '') <> '';

update public.tds_products
set thinner = nullif(attrs->>'thinner','')
where coalesce(thinner, '') = ''
  and coalesce(attrs->>'thinner','') <> '';

update public.tds_products
set tint_system = nullif(attrs->>'tint_system','')
where coalesce(tint_system, '') = ''
  and coalesce(attrs->>'tint_system','') <> '';

update public.tds_products
set rain_ready_conditions = nullif(attrs->>'rain_ready_conditions','')
where coalesce(rain_ready_conditions, '') = ''
  and coalesce(attrs->>'rain_ready_conditions','') <> '';

update public.tds_products
set official_tds_pdf_url = coalesce(
  nullif(attrs->>'official_tds_pdf_url',''),
  nullif(attrs->>'source_tds_pdf','')
)
where coalesce(official_tds_pdf_url, '') = ''
  and coalesce(attrs->>'official_tds_pdf_url', attrs->>'source_tds_pdf', '') <> '';

update public.tds_products
set storage_temp_f_min = (attrs->>'storage_temp_f_min')::integer
where storage_temp_f_min is null
  and attrs->>'storage_temp_f_min' ~ '^-?[0-9]+$';

update public.tds_products
set storage_temp_f_max = (attrs->>'storage_temp_f_max')::integer
where storage_temp_f_max is null
  and attrs->>'storage_temp_f_max' ~ '^-?[0-9]+$';

update public.tds_products
set application_rh_max = (attrs->>'application_rh_max')::integer
where application_rh_max is null
  and attrs->>'application_rh_max' ~ '^[0-9]+$';

update public.tds_products
set pot_life_hours = (attrs->>'pot_life_hours')::numeric
where pot_life_hours is null
  and attrs->>'pot_life_hours' ~ '^[0-9]+(\.[0-9]+)?$';

update public.tds_products
set mix_ratio = nullif(attrs->>'mix_ratio','')
where coalesce(mix_ratio, '') = ''
  and coalesce(attrs->>'mix_ratio','') <> '';

update public.tds_products
set shelf_life_months = (attrs->>'shelf_life_months')::integer
where shelf_life_months is null
  and attrs->>'shelf_life_months' ~ '^[0-9]+$';

update public.tds_products
set
  spray_airless_psi_min = split_part(regexp_replace(attrs->>'spray_airless_psi', '\s', '', 'g'), '-', 1)::integer,
  spray_airless_psi_max = split_part(regexp_replace(attrs->>'spray_airless_psi', '\s', '', 'g'), '-', 2)::integer
where spray_airless_psi_min is null
  and attrs->>'spray_airless_psi' ~ '^[0-9]+\s*-\s*[0-9]+$';

update public.tds_products
set
  spray_tip_min = split_part(regexp_replace(attrs->>'spray_tip', '\s', '', 'g'), '-', 1),
  spray_tip_max = split_part(regexp_replace(attrs->>'spray_tip', '\s', '', 'g'), '-', 2)
where spray_tip_min is null
  and attrs->>'spray_tip' ~ '^[0-9.]+\s*-\s*[0-9.]+$';

update public.tds_products
set
  gloss_60_deg_min = (regexp_match(attrs->>'gloss_60_deg', '([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
  gloss_60_deg_max = (regexp_match(attrs->>'gloss_60_deg', '([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)'))[2]::numeric
where gloss_60_deg_min is null
  and attrs->>'gloss_60_deg' ~ '[0-9]+\s*-\s*[0-9]+';

notify pgrst, 'reload schema';
