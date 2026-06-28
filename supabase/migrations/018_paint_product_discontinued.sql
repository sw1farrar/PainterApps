-- Product catalog: manual edits + discontinued flag

alter table public.paint_products
  add column if not exists is_discontinued boolean not null default false;

comment on column public.paint_products.is_discontinued is
  'When true, the product is no longer sold but remains in the catalog for reference.';

create index if not exists paint_products_is_discontinued_idx
  on public.paint_products (is_discontinued)
  where is_discontinued = true;