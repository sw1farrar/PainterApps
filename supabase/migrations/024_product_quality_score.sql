-- Researched quality rank. The app displays this score; it does not calculate one.

alter table public.tds_products
  add column if not exists quality_score numeric,
  add column if not exists quality_summary text;

alter table public.tds_products
  drop constraint if exists tds_products_quality_score_range;

alter table public.tds_products
  add constraint tds_products_quality_score_range
  check (quality_score is null or (quality_score >= 0 and quality_score <= 10));
