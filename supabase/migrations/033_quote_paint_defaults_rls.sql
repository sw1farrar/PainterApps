-- Align quote_paint_defaults RLS with quote_surfaces (authenticated direct access)

drop policy if exists quote_paint_defaults_all on public.quote_paint_defaults;

create policy quote_paint_defaults_all on public.quote_paint_defaults
  for all to authenticated
  using (
    quote_id in (
      select id from public.quotes
      where company_id = public.current_company_id()
    )
  )
  with check (
    quote_id in (
      select id from public.quotes
      where company_id = public.current_company_id()
    )
  );