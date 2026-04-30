"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  BookOpen,
  MessageSquare,
  Ticket,
  ArrowRight,
  ChevronRight,
  Loader2,
  TrendingUp,
  BarChart3,
  Wallet,
  Globe,
  Zap,
  Shield,
  Sparkles,
  ExternalLink,
  Send,
  X,
  User,
  GraduationCap,
  Phone,
} from "lucide-react";
import { usePortalConfig } from "@/portal/config";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { useDevRevAPI } from "@/devrev-sdk/hooks/use-devrev";
import { useAIContext } from "@/devrev-sdk/ai/use-ai-context";
import {
  assembleBlocks,
  type PersonalizedPage,
} from "@/devrev-sdk/personalization/engine";
import { useDirectories } from "@/devrev-sdk/data/use-directories";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import { useConversations } from "@/devrev-sdk/data/use-conversations";
import type { DirectoryNode, Conversation, Article } from "@/devrev-sdk/client";
import { formatRelativeTime } from "@/devrev-sdk/utils/format-date";

// ── Icon + color pools ──────────────────────────────────────

const ICON_POOL = [
  <TrendingUp key="t" className="h-5 w-5" />,
  <BarChart3 key="b" className="h-5 w-5" />,
  <Wallet key="w" className="h-5 w-5" />,
  <Globe key="g" className="h-5 w-5" />,
  <Zap key="z" className="h-5 w-5" />,
  <Shield key="s" className="h-5 w-5" />,
  <GraduationCap key="gr" className="h-5 w-5" />,
  <Sparkles key="sp" className="h-5 w-5" />,
  <MessageSquare key="m" className="h-5 w-5" />,
];

const CARD_COLORS = [
  { bg: "bg-[#E0FF38]/15", text: "text-[#8B9900]", border: "group-hover:border-[#E0FF38]/40" },
  { bg: "bg-[#45C2C7]/10", text: "text-[#45C2C7]", border: "group-hover:border-[#45C2C7]/30" },
  { bg: "bg-[#D11C36]/10", text: "text-[#D11C36]", border: "group-hover:border-[#D11C36]/30" },
  { bg: "bg-[#282424]/10", text: "text-[#282424]", border: "group-hover:border-[#282424]/30" },
  { bg: "bg-[#E0FF38]/15", text: "text-[#8B9900]", border: "group-hover:border-[#E0FF38]/40" },
  { bg: "bg-[#45C2C7]/10", text: "text-[#45C2C7]", border: "group-hover:border-[#45C2C7]/30" },
  { bg: "bg-[#D11C36]/10", text: "text-[#D11C36]", border: "group-hover:border-[#D11C36]/30" },
  { bg: "bg-[#282424]/10", text: "text-[#282424]", border: "group-hover:border-[#282424]/30" },
  { bg: "bg-[#E0FF38]/15", text: "text-[#8B9900]", border: "group-hover:border-[#E0FF38]/40" },
];

// ── Main Component ───────────────────────────────────────────

export function AxiHomepage() {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const personalizationAttempted = useRef(false);
  const { config, basePath } = usePortalConfig();
  const { user, token, isAuthenticated, login } = useSession();
  const { apiCall } = useDevRevAPI();
  const { contextPrefix } = useAIContext();
  const { directories, loading: dirLoading } = useDirectories();
  const { tickets, loading: ticketsLoading } = useTickets({ limit: 5 });
  const { conversations } = useConversations({ limit: 3 });
  const [query, setQuery] = useState("");

  // ─── AI Personalization ──────────────────────────────────
  const [personalization, setPersonalization] =
    useState<PersonalizedPage | null>(null);
  const dataReady = !dirLoading && !ticketsLoading;
  useEffect(() => {
    if (!dataReady || !token || personalizationAttempted.current) return;
    personalizationAttempted.current = true;
    assembleBlocks(
      { user, tickets, conversations, directories },
      apiCall,
      {
        systemPrompt: `You are Axi's help centre AI. Axi is an online trading broker for forex, shares, indices, commodities, and crypto. Given the user's context, personalize their homepage with relevant action cards and greeting. Return JSON.`,
        contextSignals: [
          "user_identity",
          "tickets",
          "conversations",
          "kb_directories",
        ],
        temperature: 0.3,
        maxTokens: 600,
        actionCardCount: 4,
        suggestionCount: 3,
      }
    )
      .then(setPersonalization)
      .catch(() => {
        personalizationAttempted.current = false;
      });
  }, [dataReady, token, user, tickets, conversations, directories, apiCall]);

  // ─── Search ──────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !token) return;
      setSearchActive(true);
      setSearchLoading(true);
      try {
        const res = await apiCall<{
          results: Array<{ article?: Article }>;
        }>("POST", "internal/search.core", {
          query: q,
          namespaces: ["article"],
          limit: 6,
        });
        setSearchResults(
          (res.results || [])
            .filter((r) => r.article)
            .map((r) => r.article as Article)
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [apiCall, token]
  );

  // ─── Conversation ────────────────────────────────────────
  const [conversationActive, setConversationActive] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "ai" | "system"; content: string }[]
  >([]);
  const [aiTyping, setAiTyping] = useState(false);

  const categories = directories.filter((d) => d.has_descendant_articles);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

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
          {
            type: "support",
            title: message.slice(0, 100),
            description: message,
          }
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
                created_by?: { type: string };
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
                {
                  id: agentReply.id,
                  role: "ai",
                  content: agentReply.body || "",
                },
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
          {
            id: `err-${Date.now()}`,
            role: "system",
            content: "Something went wrong. Please try again.",
          },
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)]">
      {/* ═══ HERO + CONVERSATIONAL BAR ═══ */}
      <section className="relative bg-[#282424] overflow-hidden">
        {/* Decorative neon elements */}
        {!conversationActive && (
          <>
            <div
              className="absolute top-8 right-[10%] hidden lg:block"
              aria-hidden="true"
            >
              <div className="w-12 h-12 rotate-45 bg-[#E0FF38] rounded-[4px] opacity-20 blur-sm" />
            </div>
            <div
              className="absolute top-24 right-[6%] hidden lg:block"
              aria-hidden="true"
            >
              <div className="w-5 h-5 rotate-45 bg-[#45C2C7] rounded-[2px] opacity-30" />
            </div>
            <div
              className="absolute bottom-12 left-[6%] hidden lg:block"
              aria-hidden="true"
            >
              <div className="w-8 h-8 rotate-45 bg-[#E0FF38] rounded-[3px] opacity-15" />
            </div>
          </>
        )}

        <div className="mx-auto max-w-[700px] px-6 relative">
          {/* Hero */}
          {!conversationActive && !searchActive && (
            <div className="pt-20 pb-6 text-center">
              <h1 className="text-[44px] font-bold text-white leading-[1.1] tracking-tight mb-4">
                {personalization?.greeting.headline ||
                  config.content.welcomeHeadline}
              </h1>
              <p className="text-[18px] text-[#a09c98] leading-relaxed">
                {personalization?.greeting.subtext ||
                  config.content.welcomeSubtext}
              </p>
            </div>
          )}

          {/* Search results */}
          {searchActive && !conversationActive && (
            <div className="pt-8 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-white">
                  {searchLoading
                    ? "Searching..."
                    : `${searchResults.length} results`}
                </h2>
                <button
                  onClick={() => {
                    setSearchActive(false);
                    setSearchResults([]);
                    setQuery("");
                  }}
                  className="text-[13px] text-[#E0FF38] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
              {searchLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#787571] mx-auto" />
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((article) => (
                    <Link
                      key={article.id}
                      href={`${basePath}/articles/${article.display_id}`}
                      className="group flex items-start gap-3 rounded-lg border border-[#3a3636] p-4 hover:border-[#E0FF38]/30 transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-[#787571] mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-[14px] font-medium text-white group-hover:text-[#E0FF38] transition-colors">
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className="text-[13px] text-[#787571] line-clamp-2 mt-0.5">
                            {article.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-[#787571] text-center py-8">
                  No articles found. Try asking the AI assistant instead.
                </p>
              )}
            </div>
          )}

          {/* Conversation thread */}
          {conversationActive && (
            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#E0FF38]" />
                  <span className="text-[13px] font-semibold text-white">
                    {config.content.assistantName}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setConversationActive(false);
                    setMessages([]);
                  }}
                  className="flex items-center gap-1.5 text-[12px] text-[#787571] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> New conversation
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role !== "user" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E0FF38] text-[#282424] shrink-0 mt-0.5">
                        <Zap className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#E0FF38] text-[#282424]"
                          : msg.role === "system"
                            ? "bg-red-900/30 text-red-300 border border-red-800"
                            : "bg-[#3a3636] text-white"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#45C2C7] text-white shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                ))}

                {aiTyping && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E0FF38] text-[#282424] shrink-0">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div className="bg-[#3a3636] rounded-xl px-4 py-3">
                      <div className="flex gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full bg-[#787571] animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-[#787571] animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-[#787571] animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div
            className={`${conversationActive ? "pb-6" : "pb-8"} relative max-w-[540px] mx-auto`}
          >
            <div className="relative">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E0FF38]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  conversationActive
                    ? "Follow up..."
                    : `Ask ${config.content.assistantName} anything...`
                }
                className="w-full h-[52px] pl-12 pr-24 rounded-xl border border-[#3a3636] bg-[#3a3636] text-[15px] text-white placeholder:text-[#787571] focus:outline-none focus:border-[#E0FF38] focus:ring-2 focus:ring-[#E0FF38]/15 transition-all shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {!conversationActive && (
                  <button
                    onClick={() => handleSearch(query)}
                    disabled={!query.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#787571] hover:text-[#E0FF38] hover:bg-[#E0FF38]/5 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default"
                    aria-label="Search articles"
                    title="Search articles"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!query.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E0FF38] text-[#282424] disabled:opacity-30 hover:bg-[#d4f030] transition-colors cursor-pointer disabled:cursor-default"
                  aria-label="Ask AI"
                  title="Ask AI"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!conversationActive && !searchActive && (
              <p className="text-center text-[12px] text-[#787571] mt-3">
                <Search className="inline h-3 w-3 mr-1" />
                Search articles or{" "}
                <Zap className="inline h-3 w-3 mx-0.5" />
                ask AI
              </p>
            )}
          </div>

          {/* Personalized action cards */}
          {!conversationActive &&
            !searchActive &&
            personalization &&
            personalization.actionCards.length > 0 && (
              <div className="max-w-[540px] mx-auto pb-12">
                <div className="grid grid-cols-2 gap-2">
                  {personalization.actionCards.map((card, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        startConversation(`${card.title}: ${card.subtitle}`)
                      }
                      className="group flex items-start gap-3 rounded-lg border border-[#3a3636] p-3 hover:border-[#E0FF38]/30 hover:shadow-sm transition-all text-left cursor-pointer"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${CARD_COLORS[i % CARD_COLORS.length].bg} ${CARD_COLORS[i % CARD_COLORS.length].text}`}
                      >
                        {ICON_POOL[i % ICON_POOL.length]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-semibold text-white group-hover:text-[#E0FF38] transition-colors line-clamp-1">
                          {card.title}
                        </h4>
                        <p className="text-[12px] text-[#787571] line-clamp-1">
                          {card.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </section>

      {/* ═══ BROWSE BY CATEGORY ═══ */}
      <section className="bg-[#F5F5F5] border-t border-[#e5e5e5] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#787571] mb-8">
            Browse by topic
          </h2>

          {dirLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#787571]" />
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((dir, i) => (
                <CategoryCard
                  key={dir.directory.id}
                  directory={dir}
                  basePath={basePath}
                  icon={ICON_POOL[i % ICON_POOL.length]}
                  color={CARD_COLORS[i % CARD_COLORS.length]}
                />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#787571] text-center py-12">
              No categories available yet.
            </p>
          )}
        </div>
      </section>

      {/* ═══ SPOTLIGHT — YOUR EDGE ═══ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="relative overflow-hidden rounded-2xl bg-[#282424] p-10 sm:p-14 text-white">
            <div
              className="absolute -top-20 -right-20 w-64 h-64 bg-[#E0FF38] rounded-full opacity-10 blur-[80px]"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#45C2C7] rounded-full opacity-10 blur-[60px]"
              aria-hidden="true"
            />

            <div className="relative max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-[#E0FF38]" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#E0FF38]">
                  AI-Powered Support
                </span>
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold leading-tight mb-3">
                Get instant answers about your account
              </h2>
              <p className="text-[16px] text-white/70 mb-8 leading-relaxed">
                Ask about deposits, withdrawals, platform setup, trading tools,
                or account verification — powered by our knowledge base.
              </p>
              <Link
                href={basePath || "/"}
                className="inline-flex items-center gap-2 bg-[#E0FF38] text-[#282424] px-5 py-2.5 rounded-lg text-[14px] font-bold hover:bg-[#d4f030] transition-colors"
              >
                Try it now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ POPULAR TOPICS ═══ */}
      {categories.length > 0 && (
        <section className="bg-[#F5F5F5] border-t border-[#e5e5e5] py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <h2 className="text-[20px] font-semibold text-[#282424] mb-8">
              Popular topics
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.slice(0, 8).map((dir, i) => (
                <Link
                  key={dir.directory.id}
                  href={`${basePath}/directories/${dir.directory.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-[#e5e5e5] bg-white px-4 py-3.5 hover:border-[#E0FF38]/40 hover:shadow-sm transition-all"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${CARD_COLORS[i % CARD_COLORS.length].bg} ${CARD_COLORS[i % CARD_COLORS.length].text} shrink-0`}
                  >
                    {ICON_POOL[i % ICON_POOL.length]}
                  </div>
                  <span className="text-[14px] font-medium text-[#282424] group-hover:text-[#8B9900] transition-colors truncate">
                    {dir.directory.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ YOUR REQUESTS ═══ */}
      {!ticketsLoading && tickets.length > 0 && (
        <section className="bg-white border-t border-[#e5e5e5] py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-[#282424]">
                Your recent requests
              </h2>
              <Link
                href={`${basePath}/tickets`}
                className="text-[13px] font-medium text-[#8B9900] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e5e5] divide-y divide-[#f0f0f0] overflow-hidden">
              {tickets.slice(0, 4).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`${basePath}/tickets/${ticket.display_id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[12px] font-mono text-[#787571]">
                        {ticket.display_id}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          ticket.needs_response
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-[#787571]"
                        }`}
                      >
                        {ticket.needs_response
                          ? "Needs response"
                          : ticket.state_display_name ||
                            ticket.stage?.name ||
                            "Open"}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-medium text-[#282424] group-hover:text-[#8B9900] transition-colors truncate">
                      {ticket.title}
                    </h3>
                    {ticket.modified_date && (
                      <p className="text-[12px] text-[#787571] mt-1">
                        Updated {formatRelativeTime(ticket.modified_date)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#ddd] group-hover:text-[#8B9900] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ GETTING STARTED ═══ */}
      <section className="bg-white py-16 border-t border-[#e5e5e5]">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-8 h-8 rotate-45 bg-[#E0FF38] rounded-[3px]"
              aria-hidden="true"
            />
            <h2 className="text-[20px] font-semibold text-[#282424]">
              Getting started
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <GettingStartedCard
              step="01"
              title="Browse the help centre"
              description="Find articles about trading, account management, and platforms."
              href={`${basePath}/directories`}
            />
            <GettingStartedCard
              step="02"
              title="Search for answers"
              description="Use the search bar to find specific solutions."
              href={basePath || "/"}
            />
            <GettingStartedCard
              step="03"
              title="Ask the AI assistant"
              description="Get instant answers about your account or trading."
              href={basePath || "/"}
            />
            <GettingStartedCard
              step="04"
              title="Request a callback"
              description="Create a ticket and our team will reach out."
              href={`${basePath}/tickets/create`}
            />
          </div>
        </div>
      </section>

      {/* ═══ CAN'T FIND WHAT YOU NEED? ═══ */}
      <section className="bg-[#F5F5F5] border-t border-[#e5e5e5] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="text-[20px] font-semibold text-[#282424] mb-2">
            Can&apos;t find what you need?
          </h2>
          <p className="text-[15px] text-[#787571] mb-8">
            We&apos;re here to help. Choose the best option for you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CTACard
              icon={<BookOpen className="h-6 w-6" />}
              title="Browse help centre"
              description="Find guides, tutorials, and documentation."
              href={`${basePath}/directories`}
              color="#45C2C7"
            />
            <CTACard
              icon={<Phone className="h-6 w-6" />}
              title="Request a callback"
              description="Submit a request and our team will contact you."
              href={`${basePath}/tickets/create`}
              color="#E0FF38"
              textColor="#8B9900"
            />
            <CTACard
              icon={<MessageSquare className="h-6 w-6" />}
              title="WhatsApp support"
              description="Chat with us on WhatsApp for quick help."
              href="https://wa.me/61299655836"
              color="#25D366"
              external
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function CategoryCard({
  directory,
  basePath,
  icon,
  color,
}: {
  directory: DirectoryNode;
  basePath: string;
  icon: React.ReactNode;
  color: { bg: string; text: string; border: string };
}) {
  return (
    <Link
      href={`${basePath}/directories/${directory.directory.id}`}
      className={`group flex items-start gap-4 rounded-xl bg-white border border-[#e5e5e5] p-5 hover:shadow-sm transition-all ${color.border}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${color.bg} ${color.text} shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-[#282424] group-hover:text-[#8B9900] transition-colors mb-1">
          {directory.directory.title}
        </h3>
        <p className="text-[13px] text-[#787571] line-clamp-2 leading-relaxed">
          {directory.directory.description ||
            `Browse articles in ${directory.directory.title}`}
        </p>
      </div>
    </Link>
  );
}

function GettingStartedCard({
  step,
  title,
  description,
  href,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl bg-[#F5F5F5] border border-[#e5e5e5] p-5 hover:border-[#E0FF38]/40 hover:shadow-sm transition-all"
    >
      <span className="text-[11px] font-bold text-[#8B9900] mb-3">
        STEP {step}
      </span>
      <h3 className="text-[14px] font-semibold text-[#282424] group-hover:text-[#8B9900] transition-colors mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-[#787571] leading-relaxed flex-1">
        {description}
      </p>
      <span className="text-[12px] font-medium text-[#8B9900] mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Learn more <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function CTACard({
  icon,
  title,
  description,
  href,
  color,
  textColor,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
  textColor?: string;
  external?: boolean;
}) {
  const inner = (
    <div className="group flex flex-col items-start gap-4 rounded-xl bg-white border border-[#e5e5e5] p-6 hover:border-[#E0FF38]/40 hover:shadow-sm transition-all h-full">
      <div style={{ color: textColor || color }}>{icon}</div>
      <div className="flex-1">
        <h3 className="text-[15px] font-semibold text-[#282424] group-hover:text-[#8B9900] transition-colors mb-1.5">
          {title}
        </h3>
        <p className="text-[13px] text-[#787571] leading-relaxed">
          {description}
        </p>
      </div>
      <span className="text-[13px] font-medium text-[#8B9900] flex items-center gap-1.5 mt-auto">
        {external ? (
          <>
            Open <ExternalLink className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </span>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}
