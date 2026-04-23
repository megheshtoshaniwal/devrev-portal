"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  MessageSquare,
  Ticket,
  Clock,
  Download,
  Filter,
  Loader2,
  Bot,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePortalConfig } from "@/portal/config";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import { useConversations } from "@/devrev-sdk/data/use-conversations";
import type { Ticket as TicketType, Conversation } from "@/devrev-sdk/client";
import { cn } from "@/portal/utils/utils";

interface UnifiedItem {
  id: string;
  type: "ticket" | "conversation";
  title: string;
  displayId: string;
  status: string;
  date: string;
  source: TicketType | Conversation;
}

export default function HistoryPage() {
  const { basePath } = usePortalConfig();
  const { tickets: rawTickets, loading: ticketsLoading } = useTickets({ limit: 50 });
  const { conversations: rawConversations, loading: convsLoading } = useConversations({ limit: 50 });
  const [filter, setFilter] = useState<"all" | "tickets" | "conversations">("all");

  const loading = ticketsLoading || convsLoading;

  // Build unified items from cached data
  const items = useMemo(() => {
    const ticketItems: UnifiedItem[] = rawTickets.map((tk) => ({
      id: tk.id,
      type: "ticket" as const,
      title: tk.title,
      displayId: tk.display_id,
      status: tk.state_display_name || tk.stage?.name || "Open",
      date: tk.modified_date || tk.created_date || "",
      source: tk,
    }));

    const convItems: UnifiedItem[] = rawConversations.map((cv) => ({
      id: cv.id,
      type: "conversation" as const,
      title: cv.title || cv.display_id,
      displayId: cv.display_id,
      status: cv.stage?.name || "Active",
      date: cv.modified_date || cv.created_date || "",
      source: cv,
    }));

    return [...ticketItems, ...convItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawTickets, rawConversations]);

  const filtered =
    filter === "all"
      ? items
      : items.filter((i) =>
          filter === "tickets" ? i.type === "ticket" : i.type === "conversation"
        );

  const ticketCount = items.filter((i) => i.type === "ticket").length;
  const convCount = items.filter((i) => i.type === "conversation").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">My History</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">My History</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} interactions — {ticketCount} tickets, {convCount} conversations
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        {(["all", "tickets", "conversations"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer capitalize",
              filter === f
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f === "all" ? `All (${items.length})` : f === "tickets" ? `Tickets (${ticketCount})` : `Conversations (${convCount})`}
          </button>
        ))}
      </div>

      {/* Unified Timeline */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No interactions found.
          </p>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.id}
              href={
                item.type === "ticket"
                  ? `${basePath}/tickets/${item.displayId}`
                  : `${basePath}/history`
              }
              className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  item.type === "ticket"
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-100 text-amber-600"
                )}
              >
                {item.type === "ticket" ? (
                  <Ticket className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {item.displayId}
                  </span>
                  <Badge
                    variant={
                      item.status.toLowerCase().includes("closed") ||
                      item.status.toLowerCase().includes("resolved")
                        ? "resolved"
                        : "in_progress"
                    }
                  >
                    {item.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.date ? formatRelative(item.date) : ""}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {item.title}
                </h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// formatRelativeTime imported from shared utils (was formatRelative)
import { formatRelativeTime as formatRelative } from "@/devrev-sdk/utils/format-date";
