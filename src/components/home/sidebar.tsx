import { useState, useId, type ReactNode } from "react";
import { MessageSquare, BookOpen } from "lucide-react";
import { cn } from "@/portal/utils/utils";

interface SidebarProps {
  defaultTab: "feed" | "knowledge";
  feedContent: ReactNode;
  knowledgeContent: ReactNode;
}

export function Sidebar({ defaultTab, feedContent, knowledgeContent }: SidebarProps) {
  const [tab, setTab] = useState<"feed" | "knowledge">(defaultTab);
  const feedPanelId = useId();
  const knowledgePanelId = useId();
  const feedTabId = useId();
  const knowledgeTabId = useId();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setTab((prev) => (prev === "feed" ? "knowledge" : "feed"));
    }
  };

  return (
    <div className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-1 px-4 pt-4 pb-2"
        role="tablist"
        aria-label="Sidebar navigation"
        onKeyDown={handleKeyDown}
      >
        <button
          id={feedTabId}
          role="tab"
          aria-selected={tab === "feed"}
          aria-controls={feedPanelId}
          tabIndex={tab === "feed" ? 0 : -1}
          onClick={() => setTab("feed")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer",
            tab === "feed"
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          Feed
        </button>
        <button
          id={knowledgeTabId}
          role="tab"
          aria-selected={tab === "knowledge"}
          aria-controls={knowledgePanelId}
          tabIndex={tab === "knowledge" ? 0 : -1}
          onClick={() => setTab("knowledge")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer",
            tab === "knowledge"
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          Knowledge
        </button>
      </div>
      <div
        id={tab === "feed" ? feedPanelId : knowledgePanelId}
        role="tabpanel"
        aria-labelledby={tab === "feed" ? feedTabId : knowledgeTabId}
        className="px-4 pb-4"
      >
        {tab === "feed" ? feedContent : knowledgeContent}
      </div>
    </div>
  );
}
