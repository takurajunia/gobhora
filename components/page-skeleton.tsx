export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading">
      <div className="h-10 w-48 rounded-2xl bg-white" />
      <div className="h-96 rounded-2xl bg-white" />
    </div>
  );
}
