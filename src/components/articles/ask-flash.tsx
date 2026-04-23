"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Zap, Send, Loader2, X } from "lucide-react";
import { cn } from "@/portal/utils/utils";

interface Message {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
}

interface AskFlashProps {
  articleTitle: string;
  articleText: string;
  ambientContext?: string;
  apiCall: <T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ) => Promise<T>;
}

export function AskFlash({ articleTitle, articleText, ambientContext, apiCall }: AskFlashProps) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    const msg = query.trim();
    if (!msg || aiTyping) return;

    setQuery("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: msg },
    ]);
    setAiTyping(true);

    try {
      let convId = conversationId;

      if (!convId) {
        // Create a new conversation
        const res = await apiCall<{
          conversation: { id: string };
        }>("POST", "internal/conversations.create", {
          type: "support",
          title: `Question about: ${articleTitle}`.slice(0, 100),
          description: msg,
        });

        convId = res.conversation?.id;
        if (!convId) throw new Error("No conversation created");
        setConversationId(convId);

        // First message: article context — so the agent knows what we're asking about.
        // This is the key difference from homepage Flash.
        const articleContext = [
          `I'm reading the article: "${articleTitle}"`,
          ``,
          `Article content:`,
          articleText.slice(0, 3000),
          ``,
          `My question: ${msg}`,
        ].join("\n");

        await apiCall("POST", "internal/timeline-entries.create", {
          type: "timeline_comment",
          object: convId,
          body: articleContext,
          visibility: "external",
        });
      } else {
        // Existing conversation — just post the message
        await apiCall("POST", "internal/timeline-entries.create", {
          type: "timeline_comment",
          object: convId,
          body: msg,
          visibility: "external",
        });
      }

      // Poll for AI reply
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const timeline = await apiCall<{
            timeline_entries: Array<{
              id: string;
              type: string;
              body?: string;
              created_by?: { type: string; display_name?: string };
              created_date?: string;
            }>;
          }>("POST", "internal/timeline-entries.list", {
            object: convId,
            limit: 20,
          });

          // Find agent replies (check against latest state via functional update)
          const agentReply = (timeline.timeline_entries || []).find(
            (e) =>
              e.type === "timeline_comment" &&
              e.created_by?.type !== "rev_user" &&
              e.body
          );

          if (agentReply) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setMessages((prev) => {
              // Dedup: skip if we already have this message
              if (prev.some((m) => m.id === agentReply.id)) return prev;
              return [
                ...prev,
                { id: agentReply.id, role: "ai", content: agentReply.body || "" },
              ];
            });
            setAiTyping(false);
          }
        } catch {
          // Polling error — keep trying
        }

        if (attempts > 30) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setMessages((prev) => [
            ...prev,
            {
              id: `timeout-${Date.now()}`,
              role: "system",
              content: "Flash is taking longer than expected. Please try again.",
            },
          ]);
          setAiTyping(false);
        }
      }, 2000);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "system",
          content: "Something went wrong. Please try again.",
        },
      ]);
      setAiTyping(false);
    }
  }, [query, aiTyping, conversationId, articleTitle, articleText, apiCall, messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="mt-6 rounded-2xl bg-muted/50 border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          {hasMessages ? "Flash" : "Still have questions about this topic?"}
        </p>
        {hasMessages && (
          <button
            onClick={() => {
              setMessages([]);
              setConversationId(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
          >
            <X className="h-3 w-3" /> New question
          </button>
        )}
      </div>

      {/* Messages */}
      {hasMessages && (
        <div className="px-4 pb-2 space-y-3 max-h-[40vh] overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2.5",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role !== "user" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-accent fill-accent" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 max-w-[80%] text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.role === "system"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-card text-foreground border border-border"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {aiTyping && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-accent fill-accent" />
              </div>
              <div className="rounded-2xl bg-card border border-border px-3.5 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask Flash about this article..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            onClick={handleSend}
            disabled={!query.trim() || aiTyping}
            className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-30 cursor-pointer"
          >
            {aiTyping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
