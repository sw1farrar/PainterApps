-- Structured addresses for customers, companies, and quote job sites

alter table public.customers
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text,
  add column if not exists notes text;

alter table public.companies
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text;

alter table public.quotes
  add column if not exists job_address_line2 text,
  add column if not exists job_city text,
  add column if not exists job_state text,
  add column if not exists job_zip text;