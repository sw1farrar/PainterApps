function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export default function QuoteEditorLoading() {
  return (
    <div
      className="mx-auto min-w-0 max-w-5xl space-y-6"
      aria-busy="true"
      aria-label="Loading estimate"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-8 w-56" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-24 rounded-md" />
          <SkeletonBlock className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <SkeletonBlock className="h-10 w-full max-w-xl rounded-lg" />

      <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-6">
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock key={index} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}