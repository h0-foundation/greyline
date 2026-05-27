import { Skeleton } from "@/components/ui/skeleton";

// Shown while a force-dynamic page reads local SQLite. Generic header + grid shape
// that reads sensibly across every route. animate-pulse is auto-disabled under
// prefers-reduced-motion by the global CSS guard.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
