"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Loader2 } from "lucide-react";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { useDevRevAPI } from "@/devrev-sdk/hooks/use-devrev";
import { usePortalConfig } from "@/portal/config";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import { useConversations } from "@/devrev-sdk/data/use-conversations";
import { useDirectories } from "@/devrev-sdk/data/use-directories";
import {
  assembleBlocks,
  type PersonalizedPage,
} from "@/devrev-sdk/personalization/engine";
import type { Conversation } from "@/devrev-sdk/client";
import { cn } from "@/portal/utils/utils";
import { getIcon, actionCardColors } from "@/portal/utils/icons";

// Extracted components
import { assistantIconMap, assistantIconSmallMap } from "@/components/home/assistant-icons";
import { Hero } from "@/components/home/hero";
import { ActionCard } from "@/components/home/action-card";
import { ConversationThread } from "@/components/home/conversation-thread";
import { ChatInput } from "@/components/home/chat-input";
import { Sidebar } from "@/components/home/sidebar";
import { FeedTab } from "@/components/home/feed-tab";
import { KnowledgeTab } from "@/components/home/knowledge-tab";

// Figma preset
import { FigmaHomepage } from "@/components/figma/figma-homepage";

export default function PortalHome() {
  const { config: preCheckConfig } = usePortalConfig();
  if (preCheckConfig.branding.orgName === "Figma") {
    return <FigmaHomepage />;
  }
  return <DefaultPortalHome />;
}

function DefaultPortalHome() {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user, loading: sessionLoading, token } = useSession();
  const { apiCall } = useDevRevAPI();
  const { config, basePath } = usePortalConfig();

  // Cached data hooks
  const { tickets, loading: ticketsLoading } = useTickets({ limit: 25 });
  const { conversations, loading: convsLoading } = useConversations({ limit: 10 });
  const { directories, loading: dirsLoading } = useDirectories();

  // Personalization state
  const [page, setPage] = useState<PersonalizedPage | null>(null);
  const [personalizationDone, setPersonalizationDone] = useState(false);

  // Chat state
  const [query, setQuery] = useState("");
  const [conversationActive, setConversationActive] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "ai" | "system"; content: string }[]
  >([]);
  const [aiTyping, setAiTyping] = useState(false);

  const { content, layout, features, styles } = config;
  const assistantIcon = assistantIconMap[content.assistantIcon] || assistantIconMap.zap;
  const assistantIconSmall = assistantIconSmallMap[content.assistantIcon] || assistantIconSmallMap.zap;

  // Run personalization once data is ready — ref guards against duplicate LLM calls
  const personalizationAttempted = useRef(false);
  const dataReady = !ticketsLoading && !convsLoading && !dirsLoading;
  useEffect(() => {
    if (!dataReady || !token || personalizationAttempted.current) return;

    personalizationAttempted.current = true;
    assembleBlocks(
      { user, tickets, conversations, directories },
      apiCall,
      config.personalization
    ).then((result) => {
      setPage(result);
      setPersonalizationDone(true);
    }).catch(() => {
      personalizationAttempted.current = false; // Allow retry on failure
    });
  }, [dataReady, token, user, tickets, conversations, directories, apiCall, config.personalization]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // ─── Chat logic ──────────────────────────────────────────────

  const startConversation = useCallback(
    async (message: string) => {
      if (!message.trim() || !token) return;
      setConversationActive(true);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: message },
      ]);
      setAiTyping(true);

      try {
        const res = await apiCall<{ conversation: Conversation }>(
          "POST",
          "internal/conversations.create",
          { type: "support", title: message.slice(0, 100), description: message }
        );
        const convId = res.conversation?.id;
        if (!convId) throw new Error("No conversation created");

        await apiCall("POST", "internal/timeline-entries.create", {
          type: "timeline_comment",
          object: convId,
          body: message,
          visibility: "external",
        }).catch(() => {});

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
              }>;
            }>("POST", "internal/timeline-entries.list", {
              object: convId,
              limit: 10,
            });

            const agentReply = (timeline.timeline_entries || []).find(
              (e) =>
                e.type === "timeline_comment" &&
                e.created_by?.type !== "rev_user" &&
                e.body
            );

            if (agentReply) {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              setMessages((prev) => [
                ...prev,
                { id: agentReply.id, role: "ai", content: agentReply.body || "" },
              ]);
              setAiTyping(false);
            }
          } catch {
            /* polling error */
          }

          if (attempts > 30) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setAiTyping(false);
          }
        }, 2000);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "system", content: "Something went wrong. Please try again." },
        ]);
        setAiTyping(false);
      }
    },
    [token, apiCall]
  );

  const handleSend = useCallback(() => {
    if (!query.trim()) return;
    const msg = query;
    setQuery("");
    startConversation(msg);
  }, [query, startConversation]);

  // ─── Loading state ───────────────────────────────────────────

  if (sessionLoading || !dataReady || !personalizationDone) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading your portal...</span>
      </div>
    );
  }

  // ─── Derived state ───────────────────────────────────────────

  const kbDirs = directories.filter((d) => d.has_descendant_articles);
  const greeting = page?.greeting;
  const actionCards = page?.actionCards || [];
  const homepageLayout = layout.homepage;
  const [gradFrom, gradVia, gradTo] = styles.heroGradient;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className={`mx-auto max-w-${layout.maxWidth} px-4 sm:px-6 lg:px-8 py-6 lg:py-8`}>
      <div className={cn(
        "flex flex-col lg:flex-row gap-6 lg:gap-6 items-start",
        homepageLayout.sidebarPosition === "left" && "lg:flex-row-reverse"
      )}>
        {/* ═══════ MAIN COLUMN ═══════ */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-8rem)]">
          {/* Conversation Thread */}
          {conversationActive && (
            <ConversationThread
              messages={messages}
              aiTyping={aiTyping}
              assistantName={content.assistantName}
              assistantIconSmall={assistantIconSmall}
              gradFrom={gradFrom}
              gradVia={gradVia}
              onNewConversation={() => { setConversationActive(false); setMessages([]); }}
            />
          )}

          {/* Hero */}
          {!conversationActive && homepageLayout.showHero && (
            <Hero
              assistantIcon={assistantIcon}
              headline={content.welcomeHeadline || greeting?.headline || content.assistantName}
              subtext={content.welcomeSubtext || greeting?.subtext || "Your AI assistant. Ask anything or browse the help center."}
              gradFrom={gradFrom}
              gradVia={gradVia}
              gradTo={gradTo}
            />
          )}

          {/* Action Cards */}
          {!conversationActive && (
            <div
              className={cn(
                "mt-auto grid gap-3 mb-3 animate-slide-up",
                homepageLayout.actionCardColumns === 2 && "grid-cols-2",
                homepageLayout.actionCardColumns === 3 && "grid-cols-2 sm:grid-cols-3",
                homepageLayout.actionCardColumns === 4 && "grid-cols-2 sm:grid-cols-4"
              )}
              style={{ animationDelay: "80ms" }}
            >
              {actionCards.map((card, i) => (
                <ActionCard
                  key={i}
                  icon={getIcon(card.icon, "w-4.5 h-4.5") || <Zap className="w-4 h-4" />}
                  iconBg={actionCardColors[card.color] || "bg-primary"}
                  title={card.title}
                  subtitle={card.subtitle}
                  badge={card.badge}
                  cardStyle={styles.cardStyle}
                  onClick={() => startConversation(`${card.title}: ${card.subtitle}`)}
                />
              ))}
            </div>
          )}

          {/* Chat Input */}
          <ChatInput
            query={query}
            setQuery={setQuery}
            onSend={handleSend}
            placeholder={content.searchPlaceholder}
            assistantIconSmall={assistantIconSmall}
          />
        </div>

        {/* ═══════ SIDEBAR ═══════ */}
        {homepageLayout.sidebarPosition !== "none" && (
          <aside className="w-full lg:w-[380px] shrink-0 animate-slide-up" style={{ animationDelay: "120ms" }}>
            <Sidebar
              defaultTab={homepageLayout.sidebarDefaultTab}
              feedContent={
                <FeedTab
                  tickets={tickets}
                  needsResponse={tickets.filter((t) => t.needs_response)}
                  conversations={conversations}
                  basePath={basePath}
                  newTicketLabel={content.newTicketLabel}
                  ticketCreation={features.ticketCreation}
                />
              }
              knowledgeContent={
                <KnowledgeTab directories={kbDirs} basePath={basePath} />
              }
            />
          </aside>
        )}
      </div>
    </div>
  );
}
