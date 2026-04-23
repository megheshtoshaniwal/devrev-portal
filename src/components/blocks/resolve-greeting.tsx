"use client";

import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block } from "@/devrev-sdk/personalization/engine";

interface Props {
  block: Block;
  query: string;
  onQueryChange: (q: string) => void;
  onSend: () => void;
  isTyping: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ResolveGreeting({
  block,
  query,
  onQueryChange,
  onSend,
  isTyping,
  inputRef,
}: Props) {
  const { headline, subtext } = block.data as {
    headline: string;
    subtext: string;
  };

  return (
    <section className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--primary)/0.05)] via-background to-background" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1.5">
            {headline}
          </h1>
          <p className="text-sm text-muted-foreground">{subtext}</p>
        </div>

        <div className="relative rounded-2xl border bg-card shadow-lg border-border focus-within:border-primary/40 focus-within:shadow-xl focus-within:shadow-primary/5 transition-all">
          <div className="flex items-center gap-3 px-4 py-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a question, describe a problem..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Button
              size="sm"
              onClick={onSend}
              disabled={!query.trim() || isTyping}
              className="rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
