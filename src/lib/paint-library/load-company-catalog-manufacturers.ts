import { createClient } from "@/lib/supabase/server";

function readManufacturerName(row: Record<string, unknown>): string | null {
  const linked = row.paint_products;
  const linkedProduct = Array.isArray(linked)
    ? (linked[0] as Record<string, unknown> | undefined)
    : (linked as Record<string, unknown> | undefined);
  const manufacturers = linkedProduct?.paint_manufacturers;
  const manufacturerRow = Array.isArray(manufacturers)
    ? (manufacturers[0] as Record<string, unknown> | undefined)
    : (manufacturers as Record<string, unknown> | undefined);
  const joinedName =
    typeof manufacturerRow?.name === "string"
      ? manufacturerRow.name.trim()
      : "";
  if (joinedName) return joinedName;

  const snapshot =
    typeof row.manufacturer_name === "string"
      ? row.manufacturer_name.trim()
      : "";
  return snapshot || null;
}

export async function loadCompanyCatalogManufacturers(
  companyId: string,
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_paint_products")
    .select(
      `
      manufacturer_name,
      paint_products (
        paint_manufacturers (
          name
        )
      )
    `,
    )
    .eq("company_id", companyId);

  if (error) throw new Error(error.message);

  const names = new Set<string>();
  for (const row of data ?? []) {
    const name = readManufacturerName(row as Record<string, unknown>);
    if (name) names.add(name);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}