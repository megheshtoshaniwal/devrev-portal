import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/portal/utils/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error state — shows red border and sets aria-invalid */
  error?: boolean;
  /** Helper text shown below the input */
  helperText?: string;
  /** Icon shown before the input */
  prefixIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, prefixIcon, id, ...props }, ref) => {
    const helperId = helperText ? `${id || "input"}-helper` : undefined;

    return (
      <div className="w-full">
        <div className="relative">
          {prefixIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true">
              {prefixIcon}
            </div>
          )}
          <input
            type={type}
            id={id}
            className={cn(
              "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-destructive focus-visible:ring-destructive"
                : "border-input",
              prefixIcon && "pl-9",
              className
            )}
            ref={ref}
            aria-invalid={error || undefined}
            aria-describedby={helperId}
            {...props}
          />
        </div>
        {helperText && (
          <p
            id={helperId}
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
