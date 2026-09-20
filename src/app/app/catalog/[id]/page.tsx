import { notFound, redirect } from "next/navigation";
import { ProductEditor } from "@/components/catalog/ProductEditor";
import { requireCatalogEditor } from "@/lib/systems/catalog-access";
import { supabaseAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Product" };

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireCatalogEditor();
  if (!access) redirect("/app");
  const { id } = await params;
  const db = supabaseAdmin();
  if (!db) redirect("/app");
  const { data: product } = await db
    .from("tds_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();
  const { data: mfrs } = await db
    .from("tds_manufacturers")
    .select("id, name")
    .order("name");

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Product
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {product.name}
      </h1>
      <div className="mt-8">
        <ProductEditor
          product={product as Record<string, unknown>}
          manufacturers={mfrs ?? []}
        />
      </div>
    </div>
  );
}
