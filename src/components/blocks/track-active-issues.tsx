"use client";

import Link from "next/link";
import { Clock, ChevronRight, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Block } from "@/devrev-sdk/personalization/engine";
import type { Ticket as TicketType } from "@/devrev-sdk/client";

interface Props {
  block: Block;
  basePath: string;
}

export function TrackActiveIssues({ block, basePath }: Props) {
  const { tickets } = block.data as { tickets: TicketType[] };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Ticket className="h-4 w-4 text-muted-foreground" />
          Active issues
        </h2>
        <Link
          href={`${basePath}/tickets`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="rounded-xl border border-border divide-y divide-border">
        {tickets.slice(0, 5).map((ticket) => (
          <Link
            key={ticket.id}
            href={`${basePath}/tickets/${ticket.display_id}`}
            className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-muted-foreground">{ticket.display_id}</span>
                <Badge variant="in_progress">
                  {ticket.state_display_name || "In progress"}
                </Badge>
              </div>
              <h3 className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {ticket.title}
              </h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
