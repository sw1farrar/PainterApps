import { Suspense } from "react";

import CatalogContent from "@/app/app/(portal)/products/catalog/CatalogContent";
import { CatalogPageSkeleton } from "@/components/products/CatalogPageSkeleton";

export const dynamic = "force-dynamic";

export default function ProductCatalogPage() {
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <CatalogContent />
    </Suspense>
  );
}