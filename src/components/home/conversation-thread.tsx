import { useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/portal/utils/utils";

interface Message {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
}

interface ConversationThreadProps {
  messages: Message[];
  aiTyping: boolean;
  assistantName: string;
  assistantIconSmall: ReactNode;
  gradFrom: string;
  gradVia: string;
  onNewConversation: () => void;
}

export function ConversationThread({
  messages,
  aiTyping,
  assistantName,
  assistantIconSmall,
  onNewConversation,
}: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  return (
    <div className="rounded-3xl bg-card border border-border overflow-hidden mb-5 animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/50">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0" aria-hidden="true">
          {assistantIconSmall}
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">{assistantName}</span>
          <span className="text-xs text-muted-foreground ml-2">AI Assistant</span>
        </div>
        <button
          onClick={onNewConversation}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
          aria-label="Start a new conversation"
        >
          New conversation
        </button>
      </div>

      <div
        className="px-5 py-4 space-y-4 max-h-[50vh] overflow-y-auto"
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role !== "user" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                {assistantIconSmall}
              </div>
            )}
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : msg.role === "system"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-foreground"
              )}
              role={msg.role === "system" ? "alert" : undefined}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {aiTyping && (
          <div className="flex gap-3" aria-label={`${assistantName} is typing`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0" aria-hidden="true">
              {assistantIconSmall}
            </div>
            <div className="rounded-2xl bg-muted px-4 py-3" role="status">
              <div className="flex gap-1" aria-label="Typing">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="sr-only">{assistantName} is typing a response</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
