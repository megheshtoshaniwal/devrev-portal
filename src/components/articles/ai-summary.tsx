"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  ListChecks,
  Loader2,
} from "lucide-react";
import { cn } from "@/portal/utils/utils";

interface AISummary {
  tldr: string;
  keySteps: string[] | null;
  audience: string;
  readTimeMinutes: number;
}

interface AISummaryBarProps {
  articleTitle: string;
  articleText: string;
  ambientContext?: string;
  apiCall: <T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ) => Promise<T>;
}

const SUMMARY_PROMPT = `You are a knowledge base assistant. Given an article, produce a JSON object with these fields:

1. "tldr" — 2-3 sentence summary of what this article covers and when you'd need it. Be specific, not generic.
2. "key_steps" — If the article is a how-to or guide, extract the main steps as a string array (max 6 steps). If it's not a how-to, set to null.
3. "audience" — Who this article is for in 2-4 words (e.g., "Account Admins", "All users", "Developers", "Billing managers").
4. "read_time_minutes" — Estimated read time based on content length and complexity.

Respond with ONLY valid JSON. No markdown, no explanation.`;

export function AISummaryBar({
  articleTitle,
  articleText,
  ambientContext,
  apiCall,
}: AISummaryBarProps) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!articleText || articleText.length < 100) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    // Truncate to first ~3000 chars to keep token usage reasonable
    const truncated = articleText.slice(0, 3000);

    apiCall<{ text_response?: string; completion?: string }>(
      "POST",
      "internal/recommendations.chat.completions",
      {
        messages: [
          { role: "system", content: SUMMARY_PROMPT },
          {
            role: "user",
            content: `${ambientContext ? ambientContext + "\n\n" : ""}Article: "${articleTitle}"\n\nContent:\n${truncated}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }
    )
      .then((res) => {
        if (cancelled) return;
        const jsonStr = res.text_response || res.completion;
        if (!jsonStr) throw new Error("Empty response");

        const parsed = JSON.parse(jsonStr);
        setSummary({
          tldr: parsed.tldr,
          keySteps: parsed.key_steps,
          audience: parsed.audience,
          readTimeMinutes: parsed.read_time_minutes || Math.ceil(articleText.split(/\s+/).length / 200),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          // Fallback: at least show read time
          setSummary({
            tldr: "",
            keySteps: null,
            audience: "",
            readTimeMinutes: Math.ceil(articleText.split(/\s+/).length / 200),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleTitle, articleText, apiCall]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-violet-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-medium">Generating AI summary...</span>
        </div>
      </div>
    );
  }

  if (!summary || (error && !summary.tldr)) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 mb-6 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-violet-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-700">
            AI Summary
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Metadata pills — always show */}
          <div className="flex items-center gap-2">
            {summary.readTimeMinutes > 0 && (
              <span className="flex items-center gap-1 text-xs text-violet-600 bg-violet-100 rounded-full px-2 py-0.5">
                <Clock className="h-3 w-3" />
                {summary.readTimeMinutes} min read
              </span>
            )}
            {summary.audience && (
              <span className="flex items-center gap-1 text-xs text-violet-600 bg-violet-100 rounded-full px-2 py-0.5">
                <Users className="h-3 w-3" />
                {summary.audience}
              </span>
            )}
          </div>
          {summary.tldr && (
            expanded ? (
              <ChevronUp className="h-4 w-4 text-violet-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-violet-400" />
            )
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && summary.tldr && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {summary.tldr}
          </p>

          {summary.keySteps && summary.keySteps.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 mb-2">
                <ListChecks className="h-3.5 w-3.5" />
                Key steps
              </p>
              <ol className="space-y-1.5">
                {summary.keySteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
