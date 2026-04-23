import type { ReactNode } from "react";

interface HeroProps {
  assistantIcon: ReactNode;
  headline: string;
  subtext: string;
  gradFrom: string;
  gradVia: string;
  gradTo: string;
}

export function Hero({ assistantIcon, headline, subtext, gradFrom, gradVia, gradTo }: HeroProps) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden mb-5 animate-slide-up"
      style={{ animationDelay: "0ms" }}
    >
      {/* Inline style: Tailwind can't interpolate dynamic class names like from-${var} */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom right, var(--tw-gradient-from, oklch(0.96 0.02 90)), var(--tw-gradient-via, oklch(0.96 0.03 50)), var(--tw-gradient-to, oklch(0.96 0.02 10)))`,
          ["--tw-gradient-from" as string]: `var(--color-${gradFrom}, oklch(0.96 0.02 90))`,
          ["--tw-gradient-via" as string]: `var(--color-${gradVia}, oklch(0.96 0.03 50))`,
          ["--tw-gradient-to" as string]: `var(--color-${gradTo}, oklch(0.96 0.02 10))`,
        }}
      />
      <div className="absolute top-4 right-8 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute bottom-0 left-12 w-32 h-32 rounded-full bg-accent/20 blur-2xl" />
      <div className="absolute top-6 right-12 w-12 h-12 rounded-xl bg-accent/30 rotate-12" />
      <div className="absolute top-16 right-28 w-6 h-6 rounded-full bg-primary/20" />

      <div className="relative flex flex-col items-center text-center py-10 px-6">
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-xl animate-float">
            {assistantIcon}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {headline}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
          {subtext}
        </p>
      </div>
    </div>
  );
}
