export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-bg-hover" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 rounded bg-bg-hover" />
          <div className="h-3 w-24 rounded bg-bg-hover" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-2">
            <div className="h-3 w-20 rounded bg-bg-hover" />
            <div className="h-7 w-10 rounded bg-bg-hover" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-xl border border-border bg-bg-card p-8 h-40" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-bg-card p-4 h-16" />
        <div className="rounded-xl border border-border bg-bg-card p-4 h-16" />
      </div>
    </div>
  )
}
