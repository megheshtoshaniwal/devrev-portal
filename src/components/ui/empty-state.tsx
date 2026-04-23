import type { ReactNode } from "react";
import { cn } from "@/portal/utils/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Empty state placeholder for lists and pages with no data */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
