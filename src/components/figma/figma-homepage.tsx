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
  Layers,
  Code,
  Presentation,
  Paintbrush,
  Globe,
  Zap,
  Bot,
  Sparkles,
  Play,
  ExternalLink,
  Send,
  X,
  User,
} from "lucide-react";
import { usePortalConfig } from "@/portal/config";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { useDevRevAPI } from "@/devrev-sdk/hooks/use-devrev";
import { useAIContext } from "@/devrev-sdk/ai/use-ai-context";
import { assembleBlocks, type PersonalizedPage } from "@/devrev-sdk/personalization/engine";
import { useDirectories } from "@/devrev-sdk/data/use-directories";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import { useConversations } from "@/devrev-sdk/data/use-conversations";
import type { DirectoryNode, Conversation, Article } from "@/devrev-sdk/client";
import { formatRelativeTime } from "@/devrev-sdk/utils/format-date";

// ── Icon + color pools for category cards ────────────────────

const ICON_POOL = [
  <Layers key="l" className="h-5 w-5" />,
  <Code key="c" className="h-5 w-5" />,
  <Presentation key="p" className="h-5 w-5" />,
  <Paintbrush key="pa" className="h-5 w-5" />,
  <Globe key="g" className="h-5 w-5" />,
  <Zap key="z" className="h-5 w-5" />,
  <Bot key="b" className="h-5 w-5" />,
  <Sparkles key="s" className="h-5 w-5" />,
  <MessageSquare key="m" className="h-5 w-5" />,
];

const CARD_COLORS = [
  { bg: "bg-[#F24E1E]/10", text: "text-[#F24E1E]", border: "group-hover:border-[#F24E1E]/30" },
  { bg: "bg-[#1ABCFE]/10", text: "text-[#1ABCFE]", border: "group-hover:border-[#1ABCFE]/30" },
  { bg: "bg-[#0ACF83]/10", text: "text-[#0ACF83]", border: "group-hover:border-[#0ACF83]/30" },
  { bg: "bg-[#A259FF]/10", text: "text-[#A259FF]", border: "group-hover:border-[#A259FF]/30" },
  { bg: "bg-[#FF7262]/10", text: "text-[#FF7262]", border: "group-hover:border-[#FF7262]/30" },
  { bg: "bg-[#5551FF]/10", text: "text-[#5551FF]", border: "group-hover:border-[#5551FF]/30" },
  { bg: "bg-[#FFCD29]/15", text: "text-[#C09B00]", border: "group-hover:border-[#FFCD29]/40" },
  { bg: "bg-[#F24E1E]/10", text: "text-[#F24E1E]", border: "group-hover:border-[#F24E1E]/30" },
  { bg: "bg-[#1ABCFE]/10", text: "text-[#1ABCFE]", border: "group-hover:border-[#1ABCFE]/30" },
];

// ── Main Component ───────────────────────────────────────────

export function FigmaHomepage() {
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

  // ─── AI Personalization (SDK: assembleBlocks) ────────────
  const [personalization, setPersonalization] = useState<PersonalizedPage | null>(null);
  const dataReady = !dirLoading && !ticketsLoading;
  useEffect(() => {
    if (!dataReady || !token || personalizationAttempted.current) return;
    personalizationAttempted.current = true;
    assembleBlocks(
      { user, tickets, conversations, directories },
      apiCall,
      {
        systemPrompt: `You are Figma's help center AI. Given the user's context, personalize their homepage with relevant action cards and greeting. Return JSON.`,
        contextSignals: ["user_identity", "tickets", "conversations", "kb_directories"],
        temperature: 0.3,
        maxTokens: 600,
        actionCardCount: 4,
        suggestionCount: 3,
      }
    ).then(setPersonalization).catch(() => {
      personalizationAttempted.current = false;
    });
  }, [dataReady, token, user, tickets, conversations, directories, apiCall]);

  // ─── Search state (SDK: searchCore) ──────────────────────
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim() || !token) return;
    setSearchActive(true);
    setSearchLoading(true);
    try {
      const res = await apiCall<{ results: Array<{ article?: Article }> }>(
        "POST", "internal/search.core",
        { query: q, namespaces: ["article"], limit: 6 }
      );
      setSearchResults(
        (res.results || []).filter((r) => r.article).map((r) => r.article as Article)
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [apiCall, token]);

  // ─── Conversation state ──────────────────────────────────
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

  // ─── Chat logic (uses SDK hooks) ─────────────────────────
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)]">
      {/* ═══════════════════════════════════════════════════════
          HERO + CONVERSATIONAL BAR
          ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-white overflow-hidden">
        {/* Decorative elements */}
        {!conversationActive && (
          <>
            <div className="absolute top-6 right-[12%] hidden lg:block" aria-hidden="true">
              <div className="w-14 h-14 rotate-45 bg-[#FFCD29] rounded-[4px] opacity-70" />
            </div>
            <div className="absolute top-20 right-[8%] hidden lg:block" aria-hidden="true">
              <div className="w-6 h-6 rotate-45 bg-[#A259FF] rounded-[2px] opacity-30" />
            </div>
            <div className="absolute bottom-8 left-[8%] hidden lg:block" aria-hidden="true">
              <div className="w-8 h-8 rotate-45 bg-[#1ABCFE] rounded-[3px] opacity-25" />
            </div>
            <div className="absolute bottom-16 left-[15%] hidden lg:block" aria-hidden="true">
              <div className="w-4 h-4 rotate-45 bg-[#0ACF83] rounded-[2px] opacity-40" />
            </div>
          </>
        )}

        <div className="mx-auto max-w-[700px] px-6 relative">
          {/* Hero heading — personalized via assembleBlocks SDK */}
          {!conversationActive && !searchActive && (
            <div className="pt-20 pb-6 text-center">
              <h1 className="text-[44px] font-bold text-black leading-[1.1] tracking-tight mb-4">
                {personalization?.greeting.headline || config.content.welcomeHeadline}
              </h1>
              <p className="text-[18px] text-[#545454] leading-relaxed">
                {personalization?.greeting.subtext || config.content.welcomeSubtext}
              </p>
            </div>
          )}

          {/* Search results (SDK: searchCore) */}
          {searchActive && !conversationActive && (
            <div className="pt-8 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-black">
                  {searchLoading ? "Searching..." : `${searchResults.length} results`}
                </h2>
                <button
                  onClick={() => { setSearchActive(false); setSearchResults([]); setQuery(""); }}
                  className="text-[13px] text-[#5551FF] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
              {searchLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#999] mx-auto" />
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((article) => (
                    <Link
                      key={article.id}
                      href={`${basePath}/articles/${article.display_id}`}
                      className="group flex items-start gap-3 rounded-lg border border-[#e5e5e5] p-4 hover:border-[#5551FF]/30 transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-[#999] mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-[14px] font-medium text-black group-hover:text-[#5551FF] transition-colors">
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className="text-[13px] text-[#545454] line-clamp-2 mt-0.5">
                            {article.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-[#999] text-center py-8">
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
                  <Sparkles className="h-4 w-4 text-[#5551FF]" />
                  <span className="text-[13px] font-semibold text-black">
                    {config.content.assistantName}
                  </span>
                </div>
                <button
                  onClick={() => { setConversationActive(false); setMessages([]); }}
                  className="flex items-center gap-1.5 text-[12px] text-[#999] hover:text-black transition-colors cursor-pointer"
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
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5551FF] text-white shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#5551FF] text-white"
                          : msg.role === "system"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-[#f5f5f5] text-black"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                ))}

                {aiTyping && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5551FF] text-white shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="bg-[#f5f5f5] rounded-xl px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversational input bar — always visible */}
          <div className={`${conversationActive ? "pb-6" : "pb-8"} relative max-w-[540px] mx-auto`}>
            <div className="relative">
              {conversationActive ? (
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#5551FF]" />
              ) : (
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5551FF]" />
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={conversationActive ? "Follow up..." : `Ask ${config.content.assistantName} anything...`}
                className="w-full h-[52px] pl-12 pr-24 rounded-xl border border-[#e5e5e5] bg-white text-[15px] text-black placeholder:text-[#999] focus:outline-none focus:border-[#5551FF] focus:ring-2 focus:ring-[#5551FF]/15 transition-all shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* Search button — searches KB articles */}
                {!conversationActive && (
                  <button
                    onClick={() => handleSearch(query)}
                    disabled={!query.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#999] hover:text-[#5551FF] hover:bg-[#5551FF]/5 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default"
                    aria-label="Search articles"
                    title="Search articles"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
                {/* Send button — starts AI conversation */}
                <button
                  onClick={handleSend}
                  disabled={!query.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5551FF] text-white disabled:opacity-30 hover:bg-[#4440E6] transition-colors cursor-pointer disabled:cursor-default"
                  aria-label="Ask AI"
                  title="Ask AI"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!conversationActive && !searchActive && (
              <p className="text-center text-[12px] text-[#999] mt-3">
                <Search className="inline h-3 w-3 mr-1" />Search articles or <Sparkles className="inline h-3 w-3 mx-0.5" />ask AI
              </p>
            )}
          </div>

          {/* Personalized action cards (SDK: assembleBlocks) */}
          {!conversationActive && !searchActive && personalization && personalization.actionCards.length > 0 && (
            <div className="max-w-[540px] mx-auto pb-12">
              <div className="grid grid-cols-2 gap-2">
                {personalization.actionCards.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => startConversation(`${card.title}: ${card.subtitle}`)}
                    className="group flex items-start gap-3 rounded-lg border border-[#e5e5e5] p-3 hover:border-[#5551FF]/30 hover:shadow-sm transition-all text-left cursor-pointer"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${CARD_COLORS[i % CARD_COLORS.length].bg} ${CARD_COLORS[i % CARD_COLORS.length].text}`}>
                      {ICON_POOL[i % ICON_POOL.length]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-semibold text-black group-hover:text-[#5551FF] transition-colors line-clamp-1">
                        {card.title}
                      </h4>
                      <p className="text-[12px] text-[#999] line-clamp-1">{card.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRODUCT CATEGORIES GRID
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#fafafa] border-t border-[#f0f0f0] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#999] mb-8">
            Browse by product
          </h2>

          {dirLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
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
            <p className="text-[14px] text-[#999] text-center py-12">
              No categories available yet.
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SPOTLIGHT CARD (Figma Make style)
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1e1e] to-[#2c2c2c] p-10 sm:p-14 text-white">
            {/* Decorative gradient orb */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#5551FF] rounded-full opacity-20 blur-[80px]" aria-hidden="true" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#A259FF] rounded-full opacity-15 blur-[60px]" aria-hidden="true" />

            <div className="relative max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-[#FFCD29]" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#FFCD29]">
                  AI-Powered
                </span>
              </div>
              <h2 className="text-[28px] sm:text-[32px] font-bold leading-tight mb-3">
                Ask our AI assistant anything
              </h2>
              <p className="text-[16px] text-white/70 mb-8 leading-relaxed">
                Get instant answers about your account, troubleshoot issues, or learn about features — powered by your knowledge base.
              </p>
              <Link
                href={basePath || "/"}
                className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-[14px] font-semibold hover:bg-white/90 transition-colors"
              >
                Try it now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          WHAT'S NEW
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#fafafa] border-t border-[#f0f0f0] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[20px] font-semibold text-black">What&apos;s new</h2>
            <Link
              href={`${basePath}/directories`}
              className="text-[13px] font-medium text-[#5551FF] hover:underline flex items-center gap-1"
            >
              View all updates <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <WhatsNewCard
              date="Apr 2026"
              title="AI-powered search is here"
              description="Find answers faster with our new AI search that understands natural language."
              tag="Feature"
              tagColor="bg-[#5551FF]/10 text-[#5551FF]"
              href={basePath || "/"}
            />
            <WhatsNewCard
              date="Mar 2026"
              title="Redesigned help center"
              description="A fresh look with better navigation, personalized content, and faster answers."
              tag="Update"
              tagColor="bg-[#0ACF83]/10 text-[#0ACF83]"
              href={basePath || "/"}
            />
            <WhatsNewCard
              date="Mar 2026"
              title="Ticket tracking improvements"
              description="See real-time status updates and get notified when your ticket needs attention."
              tag="Improvement"
              tagColor="bg-[#FFCD29]/15 text-[#C09B00]"
              href={basePath || "/"}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          POPULAR TOPICS (from KB directories)
          ═══════════════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="bg-white border-t border-[#f0f0f0] py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <h2 className="text-[20px] font-semibold text-black mb-8">Popular topics</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.slice(0, 8).map((dir, i) => (
                <Link
                  key={dir.directory.id}
                  href={`${basePath}/directories/${dir.directory.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-[#e5e5e5] bg-white px-4 py-3.5 hover:border-[#5551FF]/30 hover:shadow-sm transition-all"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${CARD_COLORS[i % CARD_COLORS.length].bg} ${CARD_COLORS[i % CARD_COLORS.length].text} shrink-0`}>
                    {ICON_POOL[i % ICON_POOL.length]}
                  </div>
                  <span className="text-[14px] font-medium text-black group-hover:text-[#5551FF] transition-colors truncate">
                    {dir.directory.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          FEATURED VIDEOS
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#fafafa] border-t border-[#f0f0f0] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[20px] font-semibold text-black">Level up with a video course</h2>
            <a
              href="https://youtube.com/figma"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-[#5551FF] hover:underline flex items-center gap-1"
            >
              Subscribe on YouTube <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <VideoCard
              title="Getting started with the basics"
              duration="12 min"
              thumbnail="#F24E1E"
            />
            <VideoCard
              title="Advanced prototyping techniques"
              duration="18 min"
              thumbnail="#5551FF"
            />
            <VideoCard
              title="Design systems at scale"
              duration="24 min"
              thumbnail="#0ACF83"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          YOUR REQUESTS (if has tickets)
          ═══════════════════════════════════════════════════════ */}
      {!ticketsLoading && tickets.length > 0 && (
        <section className="bg-[#fafafa] border-t border-[#f0f0f0] py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-black">Your recent requests</h2>
              <Link
                href={`${basePath}/tickets`}
                className="text-[13px] font-medium text-[#5551FF] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e5e5] divide-y divide-[#f0f0f0] overflow-hidden">
              {tickets.slice(0, 4).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`${basePath}/tickets/${ticket.display_id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafafa] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[12px] font-mono text-[#999]">{ticket.display_id}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        ticket.needs_response
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-gray-100 text-[#545454]"
                      }`}>
                        {ticket.needs_response ? "Needs response" : ticket.state_display_name || ticket.stage?.name || "Open"}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-medium text-black group-hover:text-[#5551FF] transition-colors truncate">
                      {ticket.title}
                    </h3>
                    {ticket.modified_date && (
                      <p className="text-[12px] text-[#999] mt-1">
                        Updated {formatRelativeTime(ticket.modified_date)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#ddd] group-hover:text-[#5551FF] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          GETTING STARTED
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 border-t border-[#f0f0f0]">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rotate-45 bg-[#FFCD29] rounded-[3px]" aria-hidden="true" />
            <h2 className="text-[20px] font-semibold text-black">Getting started</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <GettingStartedCard
              step="01"
              title="Explore the knowledge base"
              description="Browse articles organized by product and topic."
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
              description="Get instant, contextual answers to your questions."
              href={basePath || "/"}
            />
            <GettingStartedCard
              step="04"
              title="Contact support"
              description="Create a ticket if you need hands-on help."
              href={`${basePath}/tickets/create`}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CAN'T FIND WHAT YOU NEED? (CTA Grid)
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#fafafa] border-t border-[#f0f0f0] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="text-[20px] font-semibold text-black mb-2">
            Can&apos;t find what you need?
          </h2>
          <p className="text-[15px] text-[#545454] mb-8">
            We&apos;re here to help. Choose the best option for you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CTACard
              icon={<BookOpen className="h-6 w-6" />}
              title="Browse knowledge base"
              description="Find detailed guides, tutorials, and documentation."
              href={`${basePath}/directories`}
              color="#0ACF83"
            />
            <CTACard
              icon={<Ticket className="h-6 w-6" />}
              title="Contact support"
              description="Create a ticket and our team will get back to you."
              href={`${basePath}/tickets/create`}
              color="#F24E1E"
            />
            <CTACard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Community forum"
              description="Ask questions and learn from other users."
              href="https://forum.figma.com"
              color="#5551FF"
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
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color.bg} ${color.text} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-black group-hover:text-[#5551FF] transition-colors mb-1">
          {directory.directory.title}
        </h3>
        <p className="text-[13px] text-[#545454] line-clamp-2 leading-relaxed">
          {directory.directory.description || `Browse articles in ${directory.directory.title}`}
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
      className="group flex flex-col rounded-xl bg-[#fafafa] border border-[#e5e5e5] p-5 hover:border-[#5551FF]/30 hover:shadow-sm transition-all"
    >
      <span className="text-[11px] font-bold text-[#5551FF] mb-3">STEP {step}</span>
      <h3 className="text-[14px] font-semibold text-black group-hover:text-[#5551FF] transition-colors mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-[#545454] leading-relaxed flex-1">
        {description}
      </p>
      <span className="text-[12px] font-medium text-[#5551FF] mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  external,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
  external?: boolean;
}) {
  const inner = (
    <div className="group flex flex-col items-start gap-4 rounded-xl bg-white border border-[#e5e5e5] p-6 hover:border-[#5551FF]/30 hover:shadow-sm transition-all h-full">
      <div style={{ color }}>{icon}</div>
      <div className="flex-1">
        <h3 className="text-[15px] font-semibold text-black group-hover:text-[#5551FF] transition-colors mb-1.5">
          {title}
        </h3>
        <p className="text-[13px] text-[#545454] leading-relaxed">
          {description}
        </p>
      </div>
      <span className="text-[13px] font-medium text-[#5551FF] flex items-center gap-1.5 mt-auto">
        {external ? (
          <>Visit <ExternalLink className="h-3.5 w-3.5" /></>
        ) : (
          <>Get started <ArrowRight className="h-3.5 w-3.5" /></>
        )}
      </span>
    </div>
  );

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return <Link href={href}>{inner}</Link>;
}

function WhatsNewCard({
  date,
  title,
  description,
  tag,
  tagColor,
  href,
}: {
  date: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl bg-white border border-[#e5e5e5] p-6 hover:border-[#5551FF]/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[12px] text-[#999]">{date}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tagColor}`}>
          {tag}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold text-black group-hover:text-[#5551FF] transition-colors mb-2">
        {title}
      </h3>
      <p className="text-[13px] text-[#545454] leading-relaxed flex-1">
        {description}
      </p>
      <span className="text-[12px] font-medium text-[#5551FF] mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Read more <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function VideoCard({
  title,
  duration,
  thumbnail,
}: {
  title: string;
  duration: string;
  thumbnail: string;
}) {
  return (
    <div className="group cursor-pointer">
      {/* Video thumbnail placeholder */}
      <div
        className="relative aspect-video rounded-xl mb-3 overflow-hidden"
        style={{ backgroundColor: thumbnail }}
      >
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 group-hover:bg-white shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-5 w-5 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded">
          {duration}
        </div>
      </div>
      <h3 className="text-[14px] font-semibold text-black group-hover:text-[#5551FF] transition-colors">
        {title}
      </h3>
    </div>
  );
}
