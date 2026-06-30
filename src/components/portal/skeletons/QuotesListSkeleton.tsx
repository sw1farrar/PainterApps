function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export function QuotesListSkeleton() {
  return (
    <div
      className="mx-auto min-w-0 max-w-5xl space-y-8"
      aria-busy="true"
      aria-label="Loading estimates"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-36 rounded-md" />
          <SkeletonBlock className="h-10 w-32 rounded-md" />
        </div>
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card/80 p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-4 w-56 max-w-full" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
              <SkeletonBlock className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}