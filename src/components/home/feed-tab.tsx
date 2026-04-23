import Link from "next/link";
import {
  PlusCircle,
  Settings,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Ticket,
} from "lucide-react";
import type { Ticket as TicketType, Conversation } from "@/devrev-sdk/client";
import { formatDate } from "@/devrev-sdk/utils/format-date";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/portal/utils/utils";

interface FeedTabProps {
  tickets: TicketType[];
  needsResponse: TicketType[];
  conversations: Conversation[];
  basePath: string;
  newTicketLabel: string;
  ticketCreation: boolean;
  loading?: boolean;
}

export function FeedTab({
  tickets,
  needsResponse,
  conversations,
  basePath,
  newTicketLabel,
  ticketCreation,
  loading,
}: FeedTabProps) {
  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (tickets.length === 0 && conversations.length === 0) {
    return (
      <EmptyState
        icon={<Ticket className="h-5 w-5" />}
        title="No activity yet"
        description="Start a conversation or create a ticket to get help."
      />
    );
  }

  return (
    <div className="space-y-5">
      {conversations.length > 0 && (
        <section aria-label="Recent conversations">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            Need help with recent activities?
          </h3>
          <div className="space-y-3">
            {conversations.slice(0, 3).map((conv, i) => (
              <div
                key={conv.id}
                className="flex items-start gap-3 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    i === 0
                      ? "bg-primary/10 text-primary"
                      : i === 1
                      ? "bg-amber-100 text-amber-600"
                      : "bg-rose-100 text-rose-500"
                  )}
                  aria-hidden="true"
                >
                  {i === 0 ? (
                    <PlusCircle className="w-4 h-4" />
                  ) : i === 1 ? (
                    <Settings className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-tight truncate">
                    {conv.title || conv.display_id}
                  </p>
                  <div className="flex flex-col gap-0.5 mt-1.5">
                    <StatusLine status="done" label="Conversation started" />
                    <StatusLine
                      status={conv.stage?.name === "resolved" ? "done" : "pending"}
                      label={conv.stage?.name === "resolved" ? "Resolved" : "Awaiting response"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Your tickets">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-foreground">Your Requests</h3>
          {ticketCreation && (
            <Link
              href={`${basePath}/tickets`}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 hover:bg-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlusCircle className="w-3 h-3" aria-hidden="true" />
              {newTicketLabel}
            </Link>
          )}
        </div>

        {tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No tickets yet. Start a conversation!
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.slice(0, 4).map((ticket, i) => (
              <Link
                key={ticket.id}
                href={`${basePath}/tickets/${ticket.display_id}`}
                className="block group animate-slide-up focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                style={{ animationDelay: `${i * 50}ms` }}
                aria-label={`Ticket ${ticket.display_id}: ${ticket.title}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-primary">
                        {ticket.display_id}
                      </span>
                      <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {ticket.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-[10px] font-semibold flex items-center gap-1",
                          ticket.stage?.state?.name === "closed"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        )}
                      >
                        {ticket.stage?.state?.name === "closed" ? (
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Clock className="w-3 h-3" aria-hidden="true" />
                        )}
                        {ticket.state_display_name || "Open"}
                      </span>
                      {ticket.modified_date && (
                        <time className="text-[10px] text-muted-foreground" dateTime={ticket.modified_date}>
                          {formatDate(ticket.modified_date)}
                        </time>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusLine({ status, label }: { status: "done" | "warning" | "error" | "pending"; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {status === "done" ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
      ) : status === "warning" ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
      ) : status === "error" ? (
        <XCircle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      <span
        className={cn(
          "text-[11px]",
          status === "done" ? "text-emerald-600" : status === "warning" ? "text-amber-600" : status === "error" ? "text-rose-500" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
