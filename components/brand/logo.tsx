import { cn } from "@/lib/utils";

/**
 * Lauburu — the Basque four-headed cross. Each head is two tangent semicircles
 * (radius 18 + 9), rotated 90° four times around the center, so the mark spins.
 * Fills currentColor; size via className.
 */
export function Lauburu({ className }: { className?: string }) {
  const head = "M50 50 A18 18 0 0 1 50 14 A9 9 0 0 0 50 32 A9 9 0 0 1 50 50 Z";
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      {[0, 90, 180, 270].map((deg) => (
        <path key={deg} d={head} transform={`rotate(${deg} 50 50)`} />
      ))}
    </svg>
  );
}

/** Lauburu mark + wordmark lockup used in the sidebar / top bar. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Lauburu className="size-6 text-primary" />
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Greyline
      </span>
    </span>
  );
}
