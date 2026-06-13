function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export default function PortalLoading() {
  return (
    <div
      className="min-w-0 space-y-8"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-28 rounded-md" />
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card/80 p-5 backdrop-blur-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-4 rounded-sm" />
            </div>
            <SkeletonBlock className="mb-2 h-7 w-20" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card/80 backdrop-blur-sm"
          >
            <div className="border-b border-border px-5 py-4">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="mt-2 h-3 w-44" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-3 w-24" />
                  </div>
                  <SkeletonBlock className="h-5 w-14 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm">
        <div className="hidden border-b border-border px-5 py-3 sm:grid sm:grid-cols-[1.5fr_1fr_0.75fr_0.5fr] sm:gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-3 w-20" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[1.5fr_1fr_0.75fr_0.5fr] sm:items-center sm:gap-4"
            >
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-3 w-28 sm:hidden" />
              </div>
              <SkeletonBlock className="hidden h-4 w-28 sm:block" />
              <SkeletonBlock className="hidden h-6 w-16 rounded-full sm:block" />
              <SkeletonBlock className="hidden h-4 w-14 sm:ml-auto sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}