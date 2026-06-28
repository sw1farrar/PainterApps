import { ProductCatalogClient } from "@/components/admin/ProductCatalogClient";
import { listProductCatalog } from "@/app/app/admin/product-catalog/actions";

export const maxDuration = 300;

export default async function AdminProductCatalogPage() {
  const { manufacturers, products } = await listProductCatalog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white">Product Catalog</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Browse and manage the paint product library used across sell sheets and
          company catalogs.
        </p>
      </div>

      <ProductCatalogClient
        manufacturers={manufacturers}
        products={products}
      />
    </div>
  );
}