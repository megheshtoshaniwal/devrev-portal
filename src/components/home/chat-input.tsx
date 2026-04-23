import { useRef, type ReactNode } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  query: string;
  setQuery: (q: string) => void;
  onSend: () => void;
  placeholder: string;
  assistantIconSmall: ReactNode;
}

export function ChatInput({ query, setQuery, onSend, placeholder, assistantIconSmall }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="animate-slide-up" style={{ animationDelay: "160ms" }}>
      <div className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
        <div className="w-8 h-8 rounded-full bg-accent/80 flex items-center justify-center shrink-0" aria-hidden="true">
          {assistantIconSmall}
        </div>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Ask a question or describe your issue"
          aria-expanded={false}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <button
          onClick={onSend}
          disabled={!query.trim()}
          aria-label="Send message"
          className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 hover:bg-foreground/80 disabled:opacity-30 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
