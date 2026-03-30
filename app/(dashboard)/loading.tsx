export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-surface-muted" />
      <div className="h-4 w-32 rounded bg-surface-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-muted" />
    </div>
  );
}
