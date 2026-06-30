import { CatalogPageSkeleton } from "@/components/products/CatalogPageSkeleton";
import { QuotesListSkeleton } from "@/components/portal/skeletons/QuotesListSkeleton";

function GenericPageSkeleton() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="skeleton-shimmer h-3 w-20 rounded-md" />
        <div className="skeleton-shimmer h-8 w-48 rounded-md" />
        <div className="skeleton-shimmer h-4 w-72 max-w-full rounded-md" />
      </div>
      <div className="skeleton-shimmer h-40 w-full rounded-lg" />
      <div className="skeleton-shimmer h-56 w-full rounded-lg" />
    </div>
  );
}

export function NavigationRouteSkeleton({ href }: { href: string | null }) {
  if (!href) return <GenericPageSkeleton />;

  if (href === "/app/quotes" || href.startsWith("/app/quotes/")) {
    return <QuotesListSkeleton />;
  }

  if (href.startsWith("/app/products")) {
    return <CatalogPageSkeleton />;
  }

  if (href === "/app/dashboard" || href.startsWith("/app/dashboard/")) {
    return <GenericPageSkeleton />;
  }

  return <GenericPageSkeleton />;
}