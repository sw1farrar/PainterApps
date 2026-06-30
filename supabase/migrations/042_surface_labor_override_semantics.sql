-- Surface labor system defaults live in application code (surface-labor-system-defaults.ts).
-- companies.surface_labor_defaults stores ONLY per-category overrides; empty/missing keys
-- mean "use system default" until the company saves a custom value or resets a category.

comment on column public.companies.surface_labor_defaults is
  'Per-surface labor/production overrides (interior/exterior walls, ceilings, trim, doors, windows, cabinets). Omit a category or reset it to use system-wide defaults; overrides persist until explicitly reset.';