"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Block } from "@/devrev-sdk/personalization/engine";
import type { Ticket } from "@/devrev-sdk/client";

interface Props {
  block: Block;
  basePath: string;
}

export function TrackNeedsResponse({ block, basePath }: Props) {
  const { tickets } = block.data as { tickets: Ticket[] };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 mb-8">
      <h2 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        Waiting on you
        <span className="text-xs text-muted-foreground font-normal">
          — respond to keep things moving
        </span>
      </h2>
      <div className="space-y-2">
        {tickets.slice(0, 4).map((ticket) => (
          <Link
            key={ticket.id}
            href={`${basePath}/tickets/${ticket.display_id}`}
            className="group flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 hover:shadow-sm transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-amber-700">{ticket.display_id}</span>
                {ticket.severity && (
                  <Badge variant={ticket.severity as "low"}>{ticket.severity}</Badge>
                )}
              </div>
              <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {ticket.title}
              </h3>
              {ticket.body && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.body}</p>
              )}
            </div>
            <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              Reply <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
