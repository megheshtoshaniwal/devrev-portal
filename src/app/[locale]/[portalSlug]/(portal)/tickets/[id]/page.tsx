"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  Send,
  Paperclip,
  Zap,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import { usePortalConfig } from "@/portal/config";
import { useTicket } from "@/devrev-sdk/data/use-tickets";
import { useFieldAcl } from "@/devrev-sdk/schema";
import { useAclFilteredDefinitions } from "@/devrev-sdk/data/use-field-acl-filter";
import { getNestedValue } from "@/devrev-sdk/data/types";
import type { Ticket, TimelineEntry } from "@/devrev-sdk/client";
import type { ColumnDefinition } from "@/devrev-sdk/data/types";
import { TICKET_COLUMNS } from "@/portal/config/ticket-list-config";
import { cn } from "@/portal/utils/utils";

// Fields shown in the header (not in sidebar)
const HEADER_FIELDS = new Set(["display_id", "title", "status"]);

export default function TicketDetailPage() {
  const { basePath } = usePortalConfig();
  const params = useParams();
  const ticketDisplayId = params.id as string;

  // Use cached data hook
  const { ticket, timeline, loading, reply: sendReply, setTimeline } = useTicket(ticketDisplayId);

  // ACL-filtered columns — sidebar shows all non-header fields the user can read
  const { fieldPrivileges } = useFieldAcl();
  const aclColumns = useAclFilteredDefinitions(TICKET_COLUMNS, fieldPrivileges);
  const sidebarFields = aclColumns.filter((col) => !HEADER_FIELDS.has(col.key));
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Send reply via the hook
  const handleReply = useCallback(async () => {
    if (!replyText.trim() || !ticket) return;
    setSending(true);
    try {
      await sendReply(replyText);
      setReplyText("");
    } catch {
      /* noop */
    } finally {
      setSending(false);
    }
  }, [replyText, ticket, sendReply]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 text-center">
        <p className="text-muted-foreground">Ticket not found.</p>
        <Link href={`${basePath}/tickets`} className="text-primary text-sm hover:underline mt-2 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }

  const comments = timeline.filter(
    (e) => e.type === "timeline_comment" && e.body
  );
  const events = timeline.filter((e) => e.type !== "timeline_comment");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`${basePath}/tickets`} className="hover:text-foreground">Tickets</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{ticket.display_id}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main: Conversation Thread */}
        <div className="flex-1 min-w-0">
          {/* Ticket header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                {ticket.display_id}
                <button className="hover:text-foreground cursor-pointer">
                  <Copy className="h-3 w-3" />
                </button>
              </span>
              <Badge variant={ticket.stage?.state?.name === "open" ? "in_progress" : "closed"}>
                {ticket.state_display_name || "Open"}
              </Badge>
              {ticket.severity && (
                <Badge variant={ticket.severity as "low"}>{ticket.severity}</Badge>
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground">{ticket.title}</h1>
          </div>

          {/* Thread */}
          <div className="space-y-3 mb-5">
            {/* Original ticket body as first message */}
            {ticket.body && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl bg-card border border-border px-4 py-3 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {ticket.created_by?.display_name || "Reporter"}
                    </span>
                    {ticket.created_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(ticket.created_date)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {ticket.body}
                  </p>
                </div>
              </div>
            )}

            {/* Timeline entries */}
            {comments.map((entry) => {
              const isAgent =
                entry.created_by?.type === "dev_user" ||
                entry.created_by?.type === "sys_user";
              return (
                <div
                  key={entry.id}
                  className={cn("flex gap-3", !isAgent && "justify-end")}
                >
                  {isAgent && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed",
                      isAgent
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-medium", isAgent ? "text-foreground" : "text-primary-foreground/80")}>
                        {entry.created_by?.display_name || "Agent"}
                      </span>
                      {entry.created_date && (
                        <span className={cn("text-[10px]", isAgent ? "text-muted-foreground" : "text-primary-foreground/60")}>
                          {formatDate(entry.created_date)}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{entry.body}</p>
                  </div>
                  {!isAgent && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* System events */}
            {events.slice(0, 3).map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 px-4 py-1.5">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {ev.event?.type || "Event"} · {ev.created_date ? formatDate(ev.created_date) : ""}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <textarea
              placeholder="Write a reply…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-h-[80px]"
            />
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> Attach
              </Button>
              <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || sending} className="gap-1.5 rounded-xl">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar: Ticket Metadata — derived from TICKET_COLUMNS config + ACL */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="rounded-2xl bg-card border border-border p-5 space-y-4 sticky top-20">
            {sidebarFields.map((col) => {
              const raw = getNestedValue(ticket, col.fieldPath);
              if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) return null;
              const formatted = col.format ? col.format(raw, ticket) : null;

              return (
                <DetailField key={col.key} label={col.label} fieldKey={col.key} raw={raw} formatted={formatted} ticket={ticket} />
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Detail sidebar field renderer ─────────────────────────────

function DetailField({
  label,
  fieldKey,
  raw,
  formatted,
  ticket,
}: {
  label: string;
  fieldKey: string;
  raw: unknown;
  formatted: string | null;
  ticket: Ticket;
}) {
  // Special rendering for known field types
  const content = (() => {
    switch (fieldKey) {
      case "severity":
        return (
          <Badge variant={(raw as string) as "low"} className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {formatted || String(raw)}
          </Badge>
        );

      case "needs_response":
        return raw ? (
          <Badge variant="waiting_on_customer" className="text-xs">Yes</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">No</span>
        );

      case "escalate":
      case "is_recurring_issue":
        return raw === true ? (
          <Badge variant="default" className="text-xs">Yes</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">No</span>
        );

      default:
        // Use formatted value if available, otherwise stringify
        return (
          <span className="text-sm text-foreground">
            {formatted || String(raw)}
          </span>
        );
    }
  })();

  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      {content}
    </div>
  );
}

import { formatDate } from "@/devrev-sdk/utils/format-date";
