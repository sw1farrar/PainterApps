-- Persist customer-selected optional add-ons when accepting a quote

alter table public.quotes
  add column if not exists accepted_optional_line_item_ids uuid[] default '{}';