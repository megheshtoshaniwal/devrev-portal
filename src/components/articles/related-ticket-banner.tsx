"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket, ArrowRight, Sparkles } from "lucide-react";
import type { Ticket as TicketType } from "@/devrev-sdk/client";
import { buildJsonSchema } from "@/devrev-sdk/client/api-client";

interface RelatedTicketBannerProps {
  articleTitle: string;
  articleText: string;
  tickets: TicketType[];
  basePath: string;
  ambientContext?: string;
  apiCall: <T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ) => Promise<T>;
}

interface TicketMatch {
  ticketId: string;
  ticketTitle: string;
  reason: string;
}

const MATCH_PROMPT = `You match support articles to a user's open tickets. Given an article and a list of open tickets, identify if any ticket is directly relevant to this article's topic.

Rules:
- Only match if the article clearly helps with the ticket's problem
- Return at most 1 match (the strongest one)
- If no ticket is relevant, set match fields to empty strings`;

const MATCH_RESPONSE_FORMAT = buildJsonSchema("ticket_match", {
  type: "object",
  properties: {
    ticket_id: {
      type: "string",
      description: "The display_id of the matched ticket, or empty string if no match",
    },
    reason: {
      type: "string",
      description: "One sentence why this article helps, or empty string if no match",
    },
  },
  required: ["ticket_id", "reason"],
  additionalProperties: false,
});

export function RelatedTicketBanner({
  articleTitle,
  articleText,
  tickets,
  basePath,
  ambientContext,
  apiCall,
}: RelatedTicketBannerProps) {
  const [match, setMatch] = useState<TicketMatch | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only try matching if user has open tickets
    const openTickets = tickets.filter(
      (t) =>
        t.stage?.state?.name === "open" ||
        t.stage?.state?.name === "in_progress" ||
        t.needs_response
    );
    if (openTickets.length === 0 || !articleText || articleText.length < 50) return;

    let cancelled = false;

    const ticketSummaries = openTickets
      .slice(0, 10)
      .map(
        (t) =>
          `${t.display_id}: "${t.title}" [${t.needs_response ? "WAITING ON USER" : t.state_display_name || "Open"}]${t.severity ? ` severity:${t.severity}` : ""}`
      )
      .join("\n");

    apiCall<{
      choices?: Array<{ message?: { content: string } }>;
      text_response?: string;
      completion?: string;
    }>(
      "POST",
      "internal/recommendations.chat.completions",
      {
        messages: [
          { role: "system", content: MATCH_PROMPT },
          {
            role: "user",
            content: `${ambientContext ? ambientContext + "\n\n" : ""}Article: "${articleTitle}"\nSummary: ${articleText.slice(0, 1000)}\n\nOpen tickets:\n${ticketSummaries}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.1,
        stream: false,
        response_format: MATCH_RESPONSE_FORMAT,
      }
    )
      .then((res) => {
        if (cancelled) return;
        const jsonStr =
          res.choices?.[0]?.message?.content ||
          res.text_response ||
          res.completion;
        if (!jsonStr) return;

        const parsed = JSON.parse(jsonStr);
        if (parsed.ticket_id) {
          const matchedTicket = openTickets.find(
            (t) => t.display_id === parsed.ticket_id
          );
          if (matchedTicket) {
            setMatch({
              ticketId: matchedTicket.display_id,
              ticketTitle: matchedTicket.title,
              reason: parsed.reason,
            });
          }
        }
      })
      .catch(() => {
        // Silently fail — this is a nice-to-have
      });

    return () => {
      cancelled = true;
    };
  }, [articleTitle, articleText, tickets, apiCall]);

  if (!match || dismissed) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 mb-6 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              This may help with your open ticket
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {match.reason}
            </p>
            <Link
              href={`${basePath}/tickets/${match.ticketId}`}
              className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
            >
              <Ticket className="h-3.5 w-3.5" />
              {match.ticketId}: {match.ticketTitle}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
