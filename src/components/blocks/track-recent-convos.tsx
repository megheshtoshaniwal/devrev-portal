"use client";

import { Bot, ChevronRight, MessageSquare } from "lucide-react";
import type { Block } from "@/devrev-sdk/personalization/engine";
import type { Conversation } from "@/devrev-sdk/client";
import { formatRelativeTime } from "@/devrev-sdk/utils/format-date";

interface Props {
  block: Block;
}

export function TrackRecentConvos({ block }: Props) {
  const { conversations } = block.data as { conversations: Conversation[] };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 mb-8">
      <h2 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Recent conversations
      </h2>
      <div className="rounded-xl border border-border divide-y divide-border">
        {conversations.slice(0, 4).map((conv) => (
          <div
            key={conv.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <Bot className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {conv.title || conv.display_id}
              </p>
              <p className="text-xs text-muted-foreground">
                {conv.created_date && formatRelativeTime(conv.created_date)}
                {conv.stage?.name === "resolved" && " · Resolved"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}
