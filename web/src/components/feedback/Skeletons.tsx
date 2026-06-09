export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-card border border-[var(--border)] bg-white p-6">
      <div className="mb-4 h-6 w-1/3 rounded bg-slate-200" />
      <div className="mb-2 h-3 w-full rounded bg-slate-100" />
      <div className="mb-2 h-3 w-5/6 rounded bg-slate-100" />
      <div className="mt-6 flex items-center justify-between">
        <div className="h-4 w-16 rounded bg-slate-100" />
        <div className="h-9 w-24 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div data-testid="loading-skeleton" className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-card bg-slate-200" />
      ))}
    </div>
  );
}
