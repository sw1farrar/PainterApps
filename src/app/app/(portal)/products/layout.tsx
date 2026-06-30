import { ProductsWorkspaceNav } from "@/components/products/ProductsWorkspaceNav";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <ProductsWorkspaceNav />
      {children}
    </div>
  );
}