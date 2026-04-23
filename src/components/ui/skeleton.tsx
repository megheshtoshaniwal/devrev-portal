import { cn } from "@/portal/utils/utils";

interface SkeletonProps {
  className?: string;
  /** Number of skeleton lines to render */
  lines?: number;
  /** Accessible label for screen readers */
  label?: string;
}

/** Animated placeholder shown while content is loading */
export function Skeleton({ className, lines, label = "Loading content" }: SkeletonProps) {
  if (lines) {
    return (
      <div role="status" aria-label={label} className="animate-pulse space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-muted rounded",
              i === 0 && "w-3/4",
              i === 1 && "w-full",
              i === 2 && "w-5/6",
              i >= 3 && "w-2/3"
            )}
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("animate-pulse rounded bg-muted", className)}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Card-shaped skeleton for list items */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("animate-pulse rounded-xl border border-border p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-4/5" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
