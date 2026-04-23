import { cn } from "@/portal/utils/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-border",
        queued: "border-transparent bg-gray-100 text-gray-600",
        in_progress: "border-transparent bg-blue-50 text-blue-700",
        waiting_on_customer: "border-transparent bg-amber-50 text-amber-700",
        resolved: "border-transparent bg-emerald-50 text-emerald-700",
        closed: "border-transparent bg-gray-100 text-gray-500",
        low: "border-transparent bg-gray-100 text-gray-600",
        medium: "border-transparent bg-amber-50 text-amber-700",
        high: "border-transparent bg-orange-50 text-orange-700",
        urgent: "border-transparent bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Semantic status badge — renders as <span> with role="status" */
function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span
      role="status"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
