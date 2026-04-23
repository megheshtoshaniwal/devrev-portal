"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  Plus,
  ChevronRight,
  MessageSquare,
  Clock,
  Home,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { usePortalConfig } from "@/portal/config";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import type { Ticket } from "@/devrev-sdk/client";
import { cn } from "@/portal/utils/utils";

export default function TicketsPage() {
  const { basePath } = usePortalConfig();
  const { tickets, loading } = useTickets({ limit: 50 });
  const [search, setSearch] = useState("");

  const filtered = tickets.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const needsAttention = filtered.filter((t) => t.needs_response);
  const rest = filtered.filter((t) => !t.needs_response);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Tickets</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tickets</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Link href={`${basePath}/tickets/create`}>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Ticket
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {needsAttention.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Needs your response</h2>
          <div className="space-y-2">
            {needsAttention.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} basePath={basePath} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">All tickets</h2>
        <div className="space-y-2">
          {rest.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} basePath={basePath} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tickets found.</p>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket, basePath }: { ticket: Ticket; basePath: string }) {
  return (
    <Link
      href={`${basePath}/tickets/${ticket.display_id}`}
      className="group flex items-start gap-4 rounded-xl border border-border p-4 hover:border-primary/20 hover:shadow-sm transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">{ticket.display_id}</span>
          <Badge variant={ticket.stage?.state?.name === "open" ? "in_progress" : "closed"}>
            {ticket.state_display_name || ticket.stage?.name || "Unknown"}
          </Badge>
          {ticket.severity && <Badge variant={ticket.severity as "low"}>{ticket.severity}</Badge>}
        </div>
        <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {ticket.title}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {ticket.source_channel && <span>{ticket.source_channel}</span>}
          {ticket.modified_date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(ticket.modified_date)}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-3 shrink-0" />
    </Link>
  );
}

// formatRelativeTime imported from shared utils
import { formatRelativeTime } from "@/devrev-sdk/utils/format-date";
