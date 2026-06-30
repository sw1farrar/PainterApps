-- Individual surface lines (wall-1..4, floor, closet) via surface_key + enum values

do $$ begin
  alter type public.quote_surface_kind add value 'floor';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.quote_surface_kind add value 'closet';
exception when duplicate_object then null;
end $$;

alter table public.quote_surfaces
  add column if not exists surface_key text;

comment on column public.quote_surfaces.surface_key is
  'Stable line id: wall-1, wall-2, ceiling, floor, door, closet, etc.';

create index if not exists quote_surfaces_surface_key_idx
  on public.quote_surfaces (room_id, surface_key)
  where surface_key is not null;

-- Extend save_quote_draft_children to persist surface_key
drop function if exists public.save_quote_draft_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

create or replace function public.save_quote_draft_children(
  p_quote_id uuid,
  p_rooms jsonb default '[]',
  p_surfaces jsonb default '[]',
  p_line_items jsonb default '[]',
  p_tiers jsonb default '[]',
  p_tier_paint_config jsonb default '[]',
  p_paint_defaults jsonb default '[]'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  room_ids uuid[] := array[]::uuid[];
  r jsonb;
  s jsonb;
  li jsonb;
  t jsonb;
  pc jsonb;
  pd jsonb;
  idx int;
  new_room_id uuid;
begin
  select company_id into v_company_id from public.quotes where id = p_quote_id;

  if v_company_id is null or v_company_id != public.current_company_id() then
    raise exception 'Quote not found';
  end if;

  delete from public.quote_paint_defaults where quote_id = p_quote_id;
  delete from public.quote_tier_paint_config where quote_id = p_quote_id;
  delete from public.quote_line_items where quote_id = p_quote_id;
  delete from public.quote_surfaces where quote_id = p_quote_id;
  delete from public.quote_tiers where quote_id = p_quote_id;
  delete from public.quote_rooms where quote_id = p_quote_id;

  for r in select value from jsonb_array_elements(coalesce(p_rooms, '[]'::jsonb))
  loop
    insert into public.quote_rooms (
      quote_id, name, surface_type, condition, sq_ft, color_codes, coats,
      prep_work, sort_order, photo_url, is_optional, length_ft, width_ft, height_ft
    ) values (
      p_quote_id,
      coalesce(r->>'name', ''),
      coalesce(r->>'surface_type', 'drywall'),
      coalesce(r->>'condition', 'good'),
      coalesce((r->>'sq_ft')::numeric, 0),
      coalesce(r->>'color_codes', ''),
      coalesce((r->>'coats')::int, 2),
      coalesce(r->>'prep_work', ''),
      coalesce((r->>'sort_order')::int, 0),
      nullif(r->>'photo_url', ''),
      coalesce((r->>'is_optional')::boolean, false),
      nullif(r->>'length_ft', '')::numeric,
      nullif(r->>'width_ft', '')::numeric,
      nullif(r->>'height_ft', '')::numeric
    )
    returning id into new_room_id;
    room_ids := array_append(room_ids, new_room_id);
  end loop;

  for s in select value from jsonb_array_elements(coalesce(p_surfaces, '[]'::jsonb))
  loop
    idx := (s->>'room_index')::int;
    if idx is not null and idx >= 0 and idx < coalesce(array_length(room_ids, 1), 0) then
      insert into public.quote_surfaces (
        quote_id, room_id, surface_type, surface_key, sq_ft, coats, unit_rate,
        rate_type, notes, is_optional, sort_order,
        company_paint_product_id, product_override, gallons_estimated
      ) values (
        p_quote_id,
        room_ids[idx + 1],
        coalesce(s->>'surface_type', 'wall')::quote_surface_kind,
        nullif(s->>'surface_key', ''),
        coalesce((s->>'sq_ft')::numeric, 0),
        coalesce((s->>'coats')::int, 2),
        coalesce((s->>'unit_rate')::numeric, 0),
        coalesce(s->>'rate_type', 'sqft')::quote_rate_type,
        nullif(s->>'notes', ''),
        coalesce((s->>'is_optional')::boolean, false),
        coalesce((s->>'sort_order')::int, 0),
        nullif(s->>'company_paint_product_id', '')::uuid,
        coalesce((s->>'product_override')::boolean, false),
        nullif(s->>'gallons_estimated', '')::numeric
      );
    end if;
  end loop;

  for li in select value from jsonb_array_elements(coalesce(p_line_items, '[]'::jsonb))
  loop
    idx := (li->>'room_index')::int;
    new_room_id := null;
    if idx is not null and idx >= 0 and idx < coalesce(array_length(room_ids, 1), 0) then
      new_room_id := room_ids[idx + 1];
    end if;
    insert into public.quote_line_items (
      quote_id, type, description, qty, unit_cost, markup, source, room_id,
      is_optional, sort_order, company_paint_product_id, paint_role
    ) values (
      p_quote_id,
      coalesce(li->>'type', 'labor')::line_item_type,
      coalesce(li->>'description', ''),
      coalesce((li->>'qty')::numeric, 1),
      coalesce((li->>'unit_cost')::numeric, 0),
      coalesce((li->>'markup')::numeric, 0),
      coalesce(li->>'source', 'manual')::quote_line_item_source,
      new_room_id,
      coalesce((li->>'is_optional')::boolean, false),
      coalesce((li->>'sort_order')::int, 0),
      nullif(li->>'company_paint_product_id', '')::uuid,
      nullif(li->>'paint_role', '')::company_paint_product_role
    );
  end loop;

  for t in select value from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb))
  loop
    insert into public.quote_tiers (
      quote_id, tier, price, margin, features, benefits
    ) values (
      p_quote_id,
      coalesce(t->>'tier', 'good')::quote_tier_name,
      coalesce((t->>'price')::numeric, 0),
      coalesce((t->>'margin')::numeric, 0),
      coalesce(t->'features', '[]'::jsonb),
      coalesce(t->'benefits', '[]'::jsonb)
    );
  end loop;

  for pc in select value from jsonb_array_elements(coalesce(p_tier_paint_config, '[]'::jsonb))
  loop
    insert into public.quote_tier_paint_config (
      quote_id, tier, primer_product_id, topcoat_product_id,
      primer_coats, topcoat_coats, labor_hours_delta_pct,
      labor_hours_delta_hours, prep_hours_delta, value_add_features, snapshot
    ) values (
      p_quote_id,
      coalesce(pc->>'tier', 'good')::quote_tier_name,
      nullif(pc->>'primer_product_id', '')::uuid,
      nullif(pc->>'topcoat_product_id', '')::uuid,
      coalesce((pc->>'primer_coats')::int, 1),
      coalesce((pc->>'topcoat_coats')::int, 2),
      coalesce((pc->>'labor_hours_delta_pct')::numeric, 0),
      coalesce((pc->>'labor_hours_delta_hours')::numeric, 0),
      coalesce((pc->>'prep_hours_delta')::numeric, 0),
      coalesce(pc->'value_add_features', '[]'::jsonb),
      coalesce(pc->'snapshot', '{}'::jsonb)
    );
  end loop;

  for pd in select value from jsonb_array_elements(coalesce(p_paint_defaults, '[]'::jsonb))
  loop
    insert into public.quote_paint_defaults (
      quote_id, surface_type, company_paint_product_id, coats
    ) values (
      p_quote_id,
      coalesce(pd->>'surface_type', 'wall')::quote_surface_kind,
      nullif(pd->>'company_paint_product_id', '')::uuid,
      coalesce((pd->>'coats')::int, 2)
    );
  end loop;
end;
$$;

grant execute on function public.save_quote_draft_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;