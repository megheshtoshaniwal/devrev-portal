"use client";

import { MessageSquare } from "lucide-react";
import type { Block } from "@/devrev-sdk/personalization/engine";

interface Props {
  block: Block;
  onSelect: (suggestion: string) => void;
}

export function ResolveSuggestions({ block, onSelect }: Props) {
  const { suggestions } = block.data as { suggestions: string[] };

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 -mt-2 mb-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground hover:bg-accent hover:border-primary/30 transition-all cursor-pointer shadow-sm"
          >
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
