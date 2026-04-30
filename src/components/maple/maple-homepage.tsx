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
  Settings,
  Shield,
  Zap,
  FileText,
  Sparkles,
  ExternalLink,
  Send,
  X,
  User,
  HelpCircle,
  CreditCard,
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

// ── Icon + color pools (Stripe-style gradient tints) ────────

const ICON_POOL = [
  <FileText key="f" className="h-5 w-5" />,
  <Settings key="s" className="h-5 w-5" />,
  <Shield key="sh" className="h-5 w-5" />,
  <CreditCard key="c" className="h-5 w-5" />,
  <Zap key="z" className="h-5 w-5" />,
  <BookOpen key="b" className="h-5 w-5" />,
  <HelpCircle key="h" className="h-5 w-5" />,
  <Sparkles key="sp" className="h-5 w-5" />,
  <MessageSquare key="m" className="h-5 w-5" />,
];

const CARD_COLORS = [
  { bg: "bg-[#635bff]/10", text: "text-[#635bff]", border: "group-hover:border-[#635bff]/20" },
  { bg: "bg-[#00d4aa]/10", text: "text-[#0d9488]", border: "group-hover:border-[#00d4aa]/20" },
  { bg: "bg-[#ff7a59]/10", text: "text-[#ff7a59]", border: "group-hover:border-[#ff7a59]/20" },
  { bg: "bg-[#0a2540]/8", text: "text-[#0a2540]", border: "group-hover:border-[#0a2540]/15" },
  { bg: "bg-[#635bff]/10", text: "text-[#635bff]", border: "group-hover:border-[#635bff]/20" },
  { bg: "bg-[#00d4aa]/10", text: "text-[#0d9488]", border: "group-hover:border-[#00d4aa]/20" },
  { bg: "bg-[#ff7a59]/10", text: "text-[#ff7a59]", border: "group-hover:border-[#ff7a59]/20" },
  { bg: "bg-[#0a2540]/8", text: "text-[#0a2540]", border: "group-hover:border-[#0a2540]/15" },
  { bg: "bg-[#635bff]/10", text: "text-[#635bff]", border: "group-hover:border-[#635bff]/20" },
];

// Stripe-style gradient backgrounds for feature cards
const GRADIENT_CARDS = [
  "bg-gradient-to-br from-[#ffecd2] via-[#fcb69f]/30 to-[#c9b8ff]/60",
  "bg-gradient-to-br from-[#e0c3fc] via-[#c9b8ff]/40 to-[#ffecd2]/50",
  "bg-gradient-to-br from-[#d4fc79]/30 via-[#96e6a1]/20 to-[#c9b8ff]/40",
];

// ── Main Component ───────────────────────────────────────────

export function MapleHomepage() {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const personalizationAttempted = useRef(false);
  const { config, basePath } = usePortalConfig();
  const { user, token } = useSession();
  const { apiCall } = useDevRevAPI();
  const { contextPrefix } = useAIContext();
  const { directories, loading: dirLoading } = useDirectories();
  const { tickets, loading: ticketsLoading } = useTickets({ limit: 5 });
  const { conversations } = useConversations({ limit: 3 });
  const [query, setQuery] = useState("");

  // ─── AI Personalization ──────────────────────────────────
  const [personalization, setPersonalization] = useState<PersonalizedPage | null>(null);
  const dataReady = !dirLoading && !ticketsLoading;
  useEffect(() => {
    if (!dataReady || !token || personalizationAttempted.current) return;
    personalizationAttempted.current = true;
    assembleBlocks(
      { user, tickets, conversations, directories },
      apiCall,
      {
        systemPrompt: `You are Maple Software's help center AI. Given the user's context, personalize their homepage with relevant action cards and greeting. Return JSON.`,
        contextSignals: ["user_identity", "tickets", "conversations", "kb_directories"],
        temperature: 0.3,
        maxTokens: 600,
        actionCardCount: 4,
        suggestionCount: 3,
      }
    )
      .then(setPersonalization)
      .catch(() => { personalizationAttempted.current = false; });
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
        const res = await apiCall<{ results: Array<{ article?: Article }> }>(
          "POST", "internal/search.core",
          { query: q, namespaces: ["article"], limit: 6 }
        );
        setSearchResults(
          (res.results || []).filter((r) => r.article).map((r) => r.article as Article)
        );
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
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
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, []);

  const startConversation = useCallback(
    async (message: string) => {
      if (!message.trim() || !token) return;
      setConversationActive(true);
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: message }]);
      setAiTyping(true);
      try {
        const res = await apiCall<{ conversation: Conversation }>(
          "POST", "internal/conversations.create",
          { type: "support", title: message.slice(0, 100), description: message }
        );
        const convId = res.conversation?.id;
        if (!convId) throw new Error("No conversation created");
        await apiCall("POST", "internal/timeline-entries.create", {
          type: "timeline_comment", object: convId, body: message, visibility: "external",
        }).catch(() => {});
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const timeline = await apiCall<{
              timeline_entries: Array<{ id: string; type: string; body?: string; created_by?: { type: string } }>;
            }>("POST", "internal/timeline-entries.list", { object: convId, limit: 10 });
            const agentReply = (timeline.timeline_entries || []).find(
              (e) => e.type === "timeline_comment" && e.created_by?.type !== "rev_user" && e.body
            );
            if (agentReply) {
              clearInterval(pollRef.current!); pollRef.current = null;
              setMessages((prev) => [...prev, { id: agentReply.id, role: "ai", content: agentReply.body || "" }]);
              setAiTyping(false);
            }
          } catch { /* polling */ }
          if (attempts > 30) { clearInterval(pollRef.current!); pollRef.current = null; setAiTyping(false); }
        }, 2000);
      } catch {
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "system", content: "Something went wrong. Please try again." }]);
        setAiTyping(false);
      }
    },
    [token, apiCall]
  );

  const handleSend = useCallback(() => {
    if (!query.trim()) return;
    const msg = query; setQuery(""); startConversation(msg);
  }, [query, startConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="min-h-[calc(100vh-61px)] bg-white">
      {/* ═══ HERO + CONVERSATIONAL BAR ═══ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient wash — Stripe-style */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f6f9fc] to-white pointer-events-none" />

        <div className="mx-auto max-w-[700px] px-6 relative">
          {/* Hero */}
          {!conversationActive && !searchActive && (
            <div className="pt-24 pb-8 text-center">
              <h1 className="text-[48px] font-bold text-[#0a2540] leading-[1.1] tracking-[-0.02em] mb-5">
                {personalization?.greeting.headline || config.content.welcomeHeadline}
              </h1>
              <p className="text-[18px] text-[#425466] leading-relaxed max-w-lg mx-auto">
                {personalization?.greeting.subtext || config.content.welcomeSubtext}
              </p>
            </div>
          )}

          {/* Search results */}
          {searchActive && !conversationActive && (
            <div className="pt-12 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-[#0a2540]">
                  {searchLoading ? "Searching..." : `${searchResults.length} results`}
                </h2>
                <button
                  onClick={() => { setSearchActive(false); setSearchResults([]); setQuery(""); }}
                  className="text-[13px] text-[#635bff] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
              {searchLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#8898aa] mx-auto" />
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((article) => (
                    <Link
                      key={article.id}
                      href={`${basePath}/articles/${article.display_id}`}
                      className="group flex items-start gap-3 rounded-xl border border-[#e7ecf1] bg-white p-4 hover:shadow-[0_2px_5px_0_rgba(50,50,93,0.08),0_1px_1.5px_0_rgba(0,0,0,0.05)] transition-all"
                    >
                      <BookOpen className="h-4 w-4 text-[#8898aa] mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-[14px] font-medium text-[#0a2540] group-hover:text-[#635bff] transition-colors">
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className="text-[13px] text-[#8898aa] line-clamp-2 mt-0.5">{article.description}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-[#8898aa] text-center py-8">No articles found. Try asking the AI assistant.</p>
              )}
            </div>
          )}

          {/* Conversation thread */}
          {conversationActive && (
            <div className="pt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#635bff]" />
                  <span className="text-[14px] font-semibold text-[#0a2540]">{config.content.assistantName}</span>
                </div>
                <button
                  onClick={() => { setConversationActive(false); setMessages([]); }}
                  className="flex items-center gap-1.5 text-[12px] text-[#8898aa] hover:text-[#0a2540] transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> New conversation
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role !== "user" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#635bff] to-[#7a73ff] text-white shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#635bff] text-white"
                        : msg.role === "system"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-[#f6f9fc] text-[#0a2540] border border-[#e7ecf1]"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a2540] text-white shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#635bff] to-[#7a73ff] text-white shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="bg-[#f6f9fc] border border-[#e7ecf1] rounded-2xl px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#8898aa] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#8898aa] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#8898aa] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input bar — Stripe pill style */}
          <div className={`${conversationActive ? "pb-8" : "pb-10"} relative max-w-[560px] mx-auto`}>
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#635bff]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={conversationActive ? "Follow up..." : `Ask ${config.content.assistantName} anything...`}
                className="w-full h-[52px] pl-12 pr-28 rounded-full border border-[#e7ecf1] bg-white text-[15px] text-[#0a2540] placeholder:text-[#8898aa] focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/10 transition-all shadow-[0_2px_5px_0_rgba(50,50,93,0.08),0_1px_1.5px_0_rgba(0,0,0,0.04)]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {!conversationActive && (
                  <button
                    onClick={() => handleSearch(query)}
                    disabled={!query.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#8898aa] hover:text-[#635bff] hover:bg-[#635bff]/5 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default"
                    aria-label="Search articles"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!query.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#635bff] text-white disabled:opacity-30 hover:bg-[#5851ea] transition-colors cursor-pointer disabled:cursor-default shadow-[0_2px_5px_0_rgba(50,50,93,0.1)]"
                  aria-label="Ask AI"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!conversationActive && !searchActive && (
              <p className="text-center text-[12px] text-[#8898aa] mt-3">
                <Search className="inline h-3 w-3 mr-1" />Search articles or <Sparkles className="inline h-3 w-3 mx-0.5" />ask AI
              </p>
            )}
          </div>

          {/* Personalized action cards */}
          {!conversationActive && !searchActive && personalization && personalization.actionCards.length > 0 && (
            <div className="max-w-[560px] mx-auto pb-14">
              <div className="grid grid-cols-2 gap-3">
                {personalization.actionCards.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => startConversation(`${card.title}: ${card.subtitle}`)}
                    className="group flex items-start gap-3 rounded-xl border border-[#e7ecf1] bg-white p-3.5 hover:shadow-[0_2px_5px_0_rgba(50,50,93,0.08),0_1px_1.5px_0_rgba(0,0,0,0.05)] transition-all text-left cursor-pointer"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${CARD_COLORS[i % CARD_COLORS.length].bg} ${CARD_COLORS[i % CARD_COLORS.length].text}`}>
                      {ICON_POOL[i % ICON_POOL.length]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-semibold text-[#0a2540] group-hover:text-[#635bff] transition-colors line-clamp-1">
                        {card.title}
                      </h4>
                      <p className="text-[12px] text-[#8898aa] line-clamp-1">{card.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ STRIPE-STYLE GRADIENT FEATURE CARDS ═══ */}
      <section className="py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="text-[15px] font-semibold text-[#635bff] mb-3">Everything you need</p>
          <h2 className="text-[34px] font-bold text-[#0a2540] leading-tight tracking-[-0.01em] mb-2 max-w-2xl">
            Browse our help center.{" "}
            <span className="text-[#425466]">Find guides, tutorials, and answers to get the most out of Maple Software.</span>
          </h2>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 mt-12">
          {dirLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#8898aa]" />
            </div>
          ) : categories.length > 0 ? (
            <>
              {/* Top row — large gradient cards (Stripe style) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {categories.slice(0, 3).map((dir, i) => (
                  <Link
                    key={dir.directory.id}
                    href={`${basePath}/directories/${dir.directory.id}`}
                    className={`group relative rounded-2xl p-6 pb-8 ${GRADIENT_CARDS[i % GRADIENT_CARDS.length]} overflow-hidden transition-all hover:shadow-[0_13px_27px_-5px_rgba(50,50,93,0.12),0_8px_16px_-8px_rgba(0,0,0,0.08)]`}
                  >
                    <div className="flex items-center justify-between mb-16">
                      <h3 className="text-[20px] font-semibold text-[#0a2540] leading-snug max-w-[200px]">
                        {dir.directory.title}
                      </h3>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 text-[#0a2540] group-hover:bg-white transition-colors shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-[14px] text-[#425466] leading-relaxed">
                      {dir.directory.description || `Browse articles in ${dir.directory.title}`}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Remaining categories — clean card grid */}
              {categories.length > 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.slice(3).map((dir, i) => (
                    <CategoryCard
                      key={dir.directory.id}
                      directory={dir}
                      basePath={basePath}
                      icon={ICON_POOL[(i + 3) % ICON_POOL.length]}
                      color={CARD_COLORS[(i + 3) % CARD_COLORS.length]}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[14px] text-[#8898aa] text-center py-12">No categories available yet.</p>
          )}
        </div>
      </section>

      {/* ═══ AI SPOTLIGHT — gradient card ═══ */}
      <section className="py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a2540] to-[#1a3a5c] p-10 sm:p-14 text-white">
            {/* Gradient orbs */}
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#635bff] rounded-full opacity-15 blur-[100px]" aria-hidden="true" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-[#00d4aa] rounded-full opacity-10 blur-[80px]" aria-hidden="true" />

            <div className="relative max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-[#00d4aa]" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#00d4aa]">
                  AI-Powered
                </span>
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-bold leading-tight tracking-[-0.01em] mb-3">
                Get instant, intelligent answers
              </h2>
              <p className="text-[16px] text-white/65 mb-8 leading-relaxed">
                Our AI assistant searches the entire knowledge base to give you precise answers — no browsing required.
              </p>
              <Link
                href={basePath || "/"}
                className="inline-flex items-center gap-2 bg-white text-[#0a2540] px-5 py-2.5 rounded-full text-[14px] font-semibold hover:bg-white/90 transition-colors shadow-[0_2px_5px_0_rgba(0,0,0,0.1)]"
              >
                Try it now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ YOUR REQUESTS ═══ */}
      {!ticketsLoading && tickets.length > 0 && (
        <section className="py-16 bg-[#f6f9fc]">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-bold text-[#0a2540]">Your recent requests</h2>
              <Link
                href={`${basePath}/tickets`}
                className="text-[14px] font-medium text-[#635bff] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-[#e7ecf1] divide-y divide-[#e7ecf1] overflow-hidden shadow-[0_2px_5px_0_rgba(50,50,93,0.06)]">
              {tickets.slice(0, 4).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`${basePath}/tickets/${ticket.display_id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#f6f9fc] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[12px] font-mono text-[#8898aa]">{ticket.display_id}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        ticket.needs_response
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-[#f6f9fc] text-[#425466] border border-[#e7ecf1]"
                      }`}>
                        {ticket.needs_response ? "Needs response" : ticket.state_display_name || ticket.stage?.name || "Open"}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-medium text-[#0a2540] group-hover:text-[#635bff] transition-colors truncate">
                      {ticket.title}
                    </h3>
                    {ticket.modified_date && (
                      <p className="text-[12px] text-[#8898aa] mt-1">Updated {formatRelativeTime(ticket.modified_date)}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#cbd6e0] group-hover:text-[#635bff] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ GETTING STARTED ═══ */}
      <section className="py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="text-[22px] font-bold text-[#0a2540] mb-8">Getting started</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StepCard step="01" title="Browse the knowledge base" description="Find articles organized by topic." href={`${basePath}/directories`} />
            <StepCard step="02" title="Search for answers" description="Use the search bar to find specific solutions." href={basePath || "/"} />
            <StepCard step="03" title="Ask the AI assistant" description="Get instant, contextual answers." href={basePath || "/"} />
            <StepCard step="04" title="Contact support" description="Create a ticket for hands-on help." href={`${basePath}/tickets/create`} />
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-16 bg-[#f6f9fc]">
        <div className="mx-auto max-w-[1200px] px-6">
          <h2 className="text-[22px] font-bold text-[#0a2540] mb-2">Can&apos;t find what you need?</h2>
          <p className="text-[15px] text-[#425466] mb-8">We&apos;re here to help. Choose the best option.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CTACard icon={<BookOpen className="h-6 w-6" />} title="Browse knowledge base" description="Guides, tutorials, and documentation." href={`${basePath}/directories`} color="#635bff" />
            <CTACard icon={<Ticket className="h-6 w-6" />} title="Contact support" description="Create a ticket and we'll get back to you." href={`${basePath}/tickets/create`} color="#00d4aa" />
            <CTACard icon={<MessageSquare className="h-6 w-6" />} title="Visit our website" description="Learn more about Maple Software." href="https://www.maplesoftware.net" color="#ff7a59" external />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function CategoryCard({
  directory, basePath, icon, color,
}: {
  directory: DirectoryNode; basePath: string; icon: React.ReactNode;
  color: { bg: string; text: string; border: string };
}) {
  return (
    <Link
      href={`${basePath}/directories/${directory.directory.id}`}
      className={`group flex items-start gap-4 rounded-xl bg-white border border-[#e7ecf1] p-5 hover:shadow-[0_2px_5px_0_rgba(50,50,93,0.08),0_1px_1.5px_0_rgba(0,0,0,0.05)] transition-all ${color.border}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color.bg} ${color.text} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-[#0a2540] group-hover:text-[#635bff] transition-colors mb-1">
          {directory.directory.title}
        </h3>
        <p className="text-[13px] text-[#425466] line-clamp-2 leading-relaxed">
          {directory.directory.description || `Browse articles in ${directory.directory.title}`}
        </p>
      </div>
    </Link>
  );
}

function StepCard({ step, title, description, href }: { step: string; title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl bg-white border border-[#e7ecf1] p-5 hover:shadow-[0_2px_5px_0_rgba(50,50,93,0.08),0_1px_1.5px_0_rgba(0,0,0,0.05)] transition-all"
    >
      <span className="text-[11px] font-bold text-[#635bff] mb-3">STEP {step}</span>
      <h3 className="text-[14px] font-semibold text-[#0a2540] group-hover:text-[#635bff] transition-colors mb-1.5">{title}</h3>
      <p className="text-[13px] text-[#425466] leading-relaxed flex-1">{description}</p>
      <span className="text-[12px] font-medium text-[#635bff] mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Learn more <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function CTACard({
  icon, title, description, href, color, external,
}: {
  icon: React.ReactNode; title: string; description: string; href: string; color: string; external?: boolean;
}) {
  const inner = (
    <div className="group flex flex-col items-start gap-4 rounded-xl bg-white border border-[#e7ecf1] p-6 hover:shadow-[0_2px_5px_0_rgba(50,50,93,0.08),0_1px_1.5px_0_rgba(0,0,0,0.05)] transition-all h-full">
      <div style={{ color }}>{icon}</div>
      <div className="flex-1">
        <h3 className="text-[15px] font-semibold text-[#0a2540] group-hover:text-[#635bff] transition-colors mb-1.5">{title}</h3>
        <p className="text-[13px] text-[#425466] leading-relaxed">{description}</p>
      </div>
      <span className="text-[13px] font-medium text-[#635bff] flex items-center gap-1.5 mt-auto">
        {external ? (<>Visit <ExternalLink className="h-3.5 w-3.5" /></>) : (<>Get started <ArrowRight className="h-3.5 w-3.5" /></>)}
      </span>
    </div>
  );
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link href={href}>{inner}</Link>;
}
