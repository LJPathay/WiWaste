/**
 * Skeleton shown while a lazily-loaded dashboard chunk is still downloading.
 *
 * It mirrors the real dashboard's structure (title band → KPI row → two chart
 * panels) and every block carries a `min-height`, so the loaded page drops into
 * the same boxes and the layout does not shift.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <div className="h-8 w-56 rounded-md bg-muted" style={{ minHeight: '32px' }} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
            style={{ minHeight: '112px' }}
          >
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-3 h-7 w-24 rounded bg-muted" />
            <div className="mt-2 h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4" style={{ minHeight: '280px' }}>
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="mt-4 h-52 w-full rounded-lg bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4" style={{ minHeight: '280px' }}>
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="mt-4 h-52 w-full rounded-lg bg-muted" />
        </div>
      </div>

      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
