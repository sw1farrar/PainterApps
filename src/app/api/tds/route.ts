import { loadCatalog } from "@/lib/systems/catalog";

export async function GET() {
  const catalog = await loadCatalog();
  return Response.json(catalog);
}
