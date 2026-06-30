function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export function CatalogPageSkeleton() {
  return (
    <div
      className="min-w-0 space-y-4"
      aria-busy="true"
      aria-label="Loading products"
    >
      <div className="flex justify-end gap-2">
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-8 w-28" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border/80 bg-navy-900/40 px-3 py-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <SkeletonBlock className="h-8 flex-1" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-28" />
              <SkeletonBlock className="h-8 w-20" />
            </div>
          </div>
        </div>

        <div className="divide-y divide-border bg-card/20">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3">
              <SkeletonBlock className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-48" />
                <SkeletonBlock className="h-3 w-32" />
              </div>
              <SkeletonBlock className="hidden h-4 w-20 sm:block" />
              <SkeletonBlock className="hidden h-4 w-16 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}