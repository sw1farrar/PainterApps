import { requireOnboarded } from "@/lib/auth/session";
import {
  ensureCompanyPaintProductSchema,
  ensurePaintProductSchema,
} from "@/lib/product-catalog/ensure-schema";
import { loadCompanyCatalogManufacturers } from "@/lib/paint-library/load-company-catalog-manufacturers";
import { loadCompanyPaintProducts } from "@/lib/paint-library/load-company-paint-products";
import { CompanyProductCatalog } from "@/components/products/CompanyProductCatalog";

export default async function CatalogContent() {
  await Promise.all([
    ensurePaintProductSchema(),
    ensureCompanyPaintProductSchema(),
  ]);

  const { company } = await requireOnboarded();

  if (!company) {
    return (
      <p className="text-sm text-muted-foreground">
        Company not found. Complete onboarding to manage your product catalog.
      </p>
    );
  }

  const [initialProducts, initialManufacturers] = await Promise.all([
    loadCompanyPaintProducts({
      companyId: company.id,
      activeOnly: false,
      variant: "catalog",
    }),
    loadCompanyCatalogManufacturers(company.id),
  ]);

  return (
    <CompanyProductCatalog
      companyCoverage={company.coverage_sqft_per_gallon}
      initialProducts={initialProducts ?? []}
      initialManufacturers={initialManufacturers ?? []}
    />
  );
}