import { redirect } from "next/navigation";
import { CatalogBoard } from "@/components/catalog/CatalogBoard";
import { requireCatalogEditor } from "@/lib/systems/catalog-access";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Catalog" };

export default async function CatalogPage() {
  const access = await requireCatalogEditor();
  if (!access) redirect("/app");
  const db = supabaseAdmin();
  const { data: products } = db
    ? await db.from("tds_products").select("*").order("name")
    : { data: [] };
  const { data: mfrs } = db
    ? await db.from("tds_manufacturers").select("id, name").order("name")
    : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Same catalog Grok edits over MCP. Click a row to open the editor.
      </p>
      <div className="mt-6">
        <CatalogBoard
          products={(products ?? []) as Record<string, unknown>[]}
          manufacturers={mfrs ?? []}
        />
      </div>
    </div>
  );
}
