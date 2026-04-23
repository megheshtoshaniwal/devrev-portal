import { cn } from "@/portal/utils/utils";

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: { text: string; variant: "warning" | "success" | "info" };
  cardStyle: "flat" | "elevated" | "outlined";
  onClick?: () => void;
}

export function ActionCard({ icon, iconBg, title, subtitle, badge, cardStyle, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`${title}: ${subtitle}`}
      className={cn(
        "group flex flex-col items-start rounded-2xl bg-card border p-3.5 text-left transition-all cursor-pointer h-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        cardStyle === "flat" && "border-border hover:shadow-md hover:border-primary/20",
        cardStyle === "elevated" && "border-transparent shadow-md hover:shadow-lg",
        cardStyle === "outlined" && "border-border hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-2 mb-1.5 w-full">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0", iconBg)}>
          {icon}
        </div>
        {badge && (
          <span
            className={cn(
              "ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap",
              badge.variant === "warning"
                ? "bg-amber-100 text-amber-700"
                : badge.variant === "info"
                ? "bg-sky-100 text-sky-700"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            {badge.text}
          </span>
        )}
      </div>
      <h3 className="text-[12px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
        {title}
      </h3>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
        {subtitle}
      </p>
    </button>
  );
}
