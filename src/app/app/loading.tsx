function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export default function AppLoading() {
  return (
    <div
      className="portal-shell flex min-h-[100dvh]"
      aria-busy="true"
      aria-label="Loading application"
    >
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-navy-900/50 md:flex">
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="h-10 w-full rounded-lg" />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-navy-950/80 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md sm:px-4 md:px-6">
          <SkeletonBlock className="h-8 w-8 rounded-md md:hidden" />
          <SkeletonBlock className="h-4 w-32 md:hidden" />
          <SkeletonBlock className="ml-auto h-9 w-9 rounded-full" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-8 w-52" />
                <SkeletonBlock className="h-4 w-72 max-w-full" />
              </div>
              <SkeletonBlock className="h-10 w-32 rounded-md" />
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

            <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm">
              <div className="border-b border-border px-5 py-4">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="mt-2 h-3 w-48" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex items-center gap-4 px-5 py-4">
                    <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-4 w-40" />
                      <SkeletonBlock className="h-3 w-56 max-w-full" />
                    </div>
                    <SkeletonBlock className="hidden h-6 w-16 rounded-full sm:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}