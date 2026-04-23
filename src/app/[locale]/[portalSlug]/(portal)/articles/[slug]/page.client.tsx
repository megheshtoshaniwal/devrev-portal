"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  ThumbsUp,
  ThumbsDown,
  Bell,
  Clock,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { useDevRevAPI } from "@/devrev-sdk/hooks/use-devrev";
import type { Article, Ticket as TicketType } from "@/devrev-sdk/client";
import { cn } from "@/portal/utils/utils";
import {
  fetchArticleContent,
  getPlainText,
  type ArticleContent,
} from "@/devrev-sdk/articles/fetch-content";
import {
  extractTocFromTiptap,
  extractTocFromHtml,
  extractTocFromPaligo,
  type TOCItem,
  type PaligoTocObject,
} from "@/devrev-sdk/articles/toc";
import { TiptapRenderer } from "@/components/articles/tiptap-renderer";
import { PaligoRenderer } from "@/components/articles/paligo-renderer";
import { TableOfContents } from "@/components/articles/table-of-contents";
import { AISummaryBar } from "@/components/articles/ai-summary";
import { AskFlash } from "@/components/articles/ask-flash";
import { RelatedTicketBanner } from "@/components/articles/related-ticket-banner";
import { usePortalConfig } from "@/portal/config";
import { useJourney } from "@/portal/hooks/use-journey";
import { useAIContext } from "@/devrev-sdk/ai/use-ai-context";

export default function ArticlePage() {
  const { token } = useSession();
  const { apiCall } = useDevRevAPI();
  const { config, basePath } = usePortalConfig();
  const { features, layout, content: contentConfig } = config;
  const journey = useJourney();
  const { contextPrefix: ambientContext } = useAIContext();
  const [article, setArticle] = useState<Article | null>(null);
  const [siblings, setSiblings] = useState<Article[]>([]);
  const [content, setContent] = useState<ArticleContent | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const routeParams = useParams();
  const articleId = routeParams.slug as string;

  // Fetch article by ID + tickets in parallel
  useEffect(() => {
    if (!token || !articleId) return;
    setLoading(true);

    const fetchArticle = async (): Promise<Article | null> => {
      try {
        const data = await apiCall<{ article: Article }>(
          "GET",
          "internal/articles.get",
          { id: articleId }
        );
        return data.article ?? null;
      } catch {
        // display_id may not work with .get — fall back to list
        const list = await apiCall<{ articles: Article[] }>(
          "POST",
          "internal/articles.list",
          { limit: 50 }
        );
        return (list.articles || []).find((a) => a.display_id === articleId) ?? null;
      }
    };

    Promise.all([
      fetchArticle(),
      // Only fetch tickets if ticket matching is enabled
      features.ticketMatching
        ? apiCall<{ works: TicketType[] }>("POST", "internal/works.list", {
            type: ["ticket"],
            limit: 25,
          }).catch(() => ({ works: [] as TicketType[] }))
        : Promise.resolve({ works: [] as TicketType[] }),
    ]).then(async ([found, ticketsRes]) => {
      setArticle(found);
      setTickets(ticketsRes.works || []);

      // Fetch siblings if article has a parent
      if (found?.parent) {
        apiCall<{ articles: Article[] }>("POST", "internal/articles.list", {
          parent: [found.parent.id],
          limit: 6,
        })
          .then((res) => {
            setSiblings(
              (res.articles || []).filter((a) => a.id !== found.id).slice(0, 5)
            );
          })
          .catch(() => {});
      }
      setLoading(false);

      // Track article view for journey context
      if (found) {
        journey.trackArticleView(found.display_id, found.title);
      }

      // Fetch real content from artifact
      if (found) {
        setContentLoading(true);
        fetchArticleContent(found, apiCall, token)
          .then(setContent)
          .finally(() => setContentLoading(false));
      }
    });
  }, [token, articleId, apiCall]);

  // Memoize plain text for AI features
  const plainText = useMemo(
    () => (content ? getPlainText(content) : ""),
    [content]
  );

  // TOC items extracted from content
  const tocItems = useMemo((): TOCItem[] => {
    if (!content) return [];
    switch (content.type) {
      case "devrev/rt":
        return extractTocFromTiptap(content.doc);
      case "paligo/html":
        if (content.toc?.length) {
          return extractTocFromPaligo(content.toc as PaligoTocObject[]);
        }
        return extractTocFromHtml(content.html);
      case "fallback":
        return extractTocFromHtml(content.html);
    }
  }, [content]);

  // Artifact locator for Paligo image resolution
  const locateArtifact = useCallback(
    async (id: string) => {
      try {
        const res = await apiCall<{ artifact_url?: string; url?: string }>(
          "GET",
          "internal/artifacts.locate",
          { id, preview: "true" }
        );
        const artifactUrl = res.artifact_url || res.url;
        return artifactUrl ? { url: artifactUrl } : null;
      } catch {
        return null;
      }
    },
    [apiCall]
  );

  // Article link resolver for Paligo cross-references
  const articleLinkResolver = useCallback(
    (articleRefId: string) => `${basePath}/articles/${articleRefId}`,
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 text-center">
        <p className="text-muted-foreground">Article not found.</p>
        <Link
          href={`${basePath}/directories`}
          className="text-primary text-sm hover:underline mt-2 inline-block"
        >
          Browse knowledge base
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
        <Link
          href={basePath}
          className="hover:text-foreground flex items-center gap-1"
        >
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`${basePath}/directories`}
          className="hover:text-foreground"
        >
          Knowledge Base
        </Link>
        {article.parent && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`${basePath}/directories/${article.parent.display_id}`}
              className="hover:text-foreground"
            >
              {article.parent.title || article.parent.display_id}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {article.title}
        </span>
      </nav>

      <div className="flex gap-8">
        {/* Main content */}
        <article className="flex-1 min-w-0 max-w-3xl">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {article.title}
            </h1>
            {article.description && (
              <p className="text-muted-foreground text-sm mb-3">
                {article.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              {article.published_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(article.published_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </span>
              )}
              {article.authored_by?.[0] && (
                <span>By {article.authored_by[0].display_name}</span>
              )}
              {article.tags && article.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.tag.id}
                      className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs"
                    >
                      {tag.tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {features.articleSubscribe && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  onClick={() => setSubscribed(!subscribed)}
                >
                  <Bell
                    className={cn(
                      "h-3.5 w-3.5",
                      subscribed && "fill-primary text-primary"
                    )}
                  />
                  {subscribed ? "Subscribed" : "Subscribe"}
                </Button>
              </div>
            )}
          </header>

          {/* Related ticket banner — config-driven */}
          {features.ticketMatching && tickets.length > 0 && plainText && (
            <RelatedTicketBanner
              articleTitle={article.title}
              articleText={plainText}
              tickets={tickets}
              basePath={basePath}
              ambientContext={ambientContext}
              apiCall={apiCall}
            />
          )}

          {/* AI Summary — config-driven */}
          {features.aiSummary && plainText && (
            <AISummaryBar
              articleTitle={article.title}
              articleText={plainText}
              ambientContext={ambientContext}
              apiCall={apiCall}
            />
          )}

          {/* Article body */}
          {contentLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-32 bg-muted rounded w-full mt-4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-4/5" />
            </div>
          ) : content ? (
            <ArticleBody
              content={content}
              locateArtifact={locateArtifact}
              articleLinkResolver={articleLinkResolver}
              token={token ?? undefined}
            />
          ) : (
            <p className="text-muted-foreground">
              Article content is loading from the knowledge base...
            </p>
          )}

          {/* Voting — config-driven */}
          {features.articleVoting && (
            <div className="mt-8 pt-5 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Was this article helpful?
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant={vote === "up" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVote(vote === "up" ? null : "up")}
                  className="gap-1.5 rounded-xl"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Yes{vote === "up" && " — Thanks!"}
                </Button>
                <Button
                  variant={vote === "down" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVote(vote === "down" ? null : "down")}
                  className="gap-1.5 rounded-xl"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  No
                </Button>
              </div>
            </div>
          )}

          {/* Ask Flash — scoped to this article, config-driven */}
          {features.askFlash && plainText && (
            <AskFlash
              articleTitle={article.title}
              articleText={plainText}
              ambientContext={ambientContext}
              apiCall={apiCall}
            />
          )}

          {/* Sibling articles */}
          {siblings.length > 0 && (
            <div className="mt-8 pt-5 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Related articles
              </h3>
              <div className="space-y-2">
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    href={`${basePath}/articles/${s.display_id}`}
                    className="flex items-center gap-2 rounded-xl p-2.5 hover:bg-muted/60 transition-colors group"
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {s.title}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Sticky TOC sidebar — config-driven */}
        {layout.article.showToc &&
          tocItems.length >= layout.article.tocMinHeadings && (
          <aside className={cn(
            "hidden lg:block w-56 shrink-0",
            layout.article.tocPosition === "left" && "order-first"
          )}>
            <div className="sticky top-24">
              <TableOfContents items={tocItems} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** Renders the right component based on content type */
function ArticleBody({
  content,
  locateArtifact,
  articleLinkResolver,
  token,
}: {
  content: ArticleContent;
  locateArtifact: (id: string) => Promise<{ url: string } | null>;
  articleLinkResolver: (articleId: string, href?: string | null) => string;
  token?: string;
}) {
  const proseClasses =
    "prose prose-sm max-w-none text-foreground leading-relaxed prose-headings:scroll-mt-24 prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-img:rounded-xl prose-table:text-sm";

  switch (content.type) {
    case "devrev/rt":
      return (
        <div className={proseClasses}>
          <TiptapRenderer content={content.doc} token={token} />
        </div>
      );

    case "paligo/html":
      return (
        <PaligoRenderer
          html={content.html}
          locateArtifact={locateArtifact}
          articleLinkResolver={articleLinkResolver}
          className={proseClasses}
        />
      );

    case "fallback":
      return (
        <FallbackRenderer html={content.html} className={proseClasses} />
      );
  }
}

/** Sanitize fallback HTML to prevent XSS from article.body */
function FallbackRenderer({ html, className }: { html: string; className: string }) {
  const [sanitized, setSanitized] = useState("");

  useEffect(() => {
    import("isomorphic-dompurify").then((mod) => {
      setSanitized(mod.default.sanitize(html));
    });
  }, [html]);

  if (!sanitized) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
