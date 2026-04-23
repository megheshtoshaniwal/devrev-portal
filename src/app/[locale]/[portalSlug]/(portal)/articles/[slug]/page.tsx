// Server Component article page — ISR-enabled, SEO-friendly.
//
// This is the architectural blueprint for the SSR article page.
// KEY CHANGES FROM CURRENT:
// 1. Article + content fetched server-side (not client useEffect)
// 2. ISR: revalidates every hour (not fetched on every visit)
// 3. SEO: full HTML in initial response (not client-rendered)
// 4. AI features (summary, Ask Flash) are Client Component islands
// 5. Uses params prop instead of window.location.pathname.split()

import Link from "next/link";
import { ChevronRight, Home, Clock } from "lucide-react";
import { getArticle, listArticles, getArticleContent } from "@/devrev-sdk/data/server-fetchers";
import { getSessionToken } from "@/devrev-sdk/auth/session";
import { getPortalConfig } from "@/portal/config/server";
import { BILL_CONFIG } from "@/portal/config/presets/bill";
import {
  fetchArticleContent,
  getPlainText,
  type ArticleContent,
} from "@/devrev-sdk/articles/fetch-content";
import {
  extractTocFromTiptap,
  extractTocFromPaligo,
  type PaligoTocObject,
  type TOCItem,
} from "@/devrev-sdk/articles/toc";
import { TableOfContents } from "@/components/articles/table-of-contents";
import { ArticleClientFeatures } from "./client";
import { cn } from "@/portal/utils/utils";

// ISR: revalidate every hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ locale: string; portalSlug: string; slug: string }>;
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, portalSlug, slug } = await params;
  const basePath = `/${locale}/${portalSlug}`;

  // Server-side data fetching (cached via ISR)
  const token = await getSessionToken();
  const pat = process.env.DEVREV_PAT;
  const fetchToken = token || (pat ? `Bearer ${pat}` : "");

  if (!fetchToken) {
    return <ArticleNotFound basePath={basePath} />;
  }

  // Fetch article metadata
  const article = await getArticle(fetchToken, slug);
  if (!article) {
    return <ArticleNotFound basePath={basePath} />;
  }

  // Fetch config for feature flags
  const config = await getPortalConfig(portalSlug, BILL_CONFIG);
  const { features, layout } = config;

  // Fetch article content from artifact
  const resource = article.resource as Record<string, unknown> | undefined;
  const contentArtifact =
    (resource?.contentArtifact as { id: string })?.id ||
    (resource?.content_artifact as { id: string })?.id ||
    (resource?.artifacts as Array<{ id: string }>)?.[0]?.id ||
    article.extracted_content?.[0]?.id;

  let rawContent: string | null = null;
  if (contentArtifact) {
    rawContent = await getArticleContent(fetchToken, contentArtifact);
  }

  // Parse content type
  let contentHtml = "";
  let contentType: "tiptap" | "paligo" | "fallback" = "fallback";
  let tiptapDoc: Record<string, unknown> | null = null;
  let tocItems: TOCItem[] = [];

  if (rawContent) {
    try {
      const parsed = JSON.parse(rawContent);
      const articleData = parsed?.article ?? parsed?.data?.article;

      if (articleData && typeof articleData === "object" && (articleData.type === "doc" || articleData.content)) {
        contentType = "tiptap";
        tiptapDoc = articleData;
        tocItems = extractTocFromTiptap(articleData);
      } else if (articleData && typeof articleData === "string") {
        contentType = "paligo";
        contentHtml = articleData;
        const toc = parsed.data?.toc ?? parsed.toc;
        if (toc?.length) {
          tocItems = extractTocFromPaligo(toc as PaligoTocObject[]);
        }
      } else if (parsed.type === "doc" && parsed.content) {
        contentType = "tiptap";
        tiptapDoc = parsed;
        tocItems = extractTocFromTiptap(parsed);
      }
    } catch {
      contentHtml = rawContent;
    }
  }

  if (!contentHtml && !tiptapDoc) {
    contentHtml = article.body || article.description || "";
    contentType = "fallback";
  }

  // Fetch sibling articles for "related" section
  const siblings = article.parent
    ? (await listArticles(fetchToken, { parent: article.parent.id, limit: 6 }))
        .articles.filter((a) => a.id !== article.id)
        .slice(0, 5)
    : [];

  // Extract plain text for AI features (client-side)
  const plainText = rawContent
    ? contentType === "tiptap" && tiptapDoc
      ? extractTextFromDoc(tiptapDoc)
      : stripHtmlBasic(contentHtml)
    : "";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      {/* Breadcrumb — server-rendered */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`${basePath}/directories`} className="hover:text-foreground">
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
        {/* Main content — server-rendered */}
        <article className="flex-1 min-w-0 max-w-3xl">
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
                  {new Date(article.published_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {article.authored_by?.[0] && (
                <span>By {article.authored_by[0].display_name}</span>
              )}
            </div>
          </header>

          {/* AI features — Client Component island */}
          <ArticleClientFeatures
            articleTitle={article.title}
            articleText={plainText}
            features={features}
            basePath={basePath}
            contentType={contentType}
            contentHtml={contentHtml}
            tiptapDoc={tiptapDoc}
          />

          {/* Related articles — server-rendered */}
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

        {/* TOC sidebar — server-rendered */}
        {layout.article.showToc &&
          tocItems.length >= layout.article.tocMinHeadings && (
          <aside
            className={cn(
              "hidden lg:block w-56 shrink-0",
              layout.article.tocPosition === "left" && "order-first"
            )}
          >
            <div className="sticky top-24">
              <TableOfContents items={tocItems} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ArticleNotFound({ basePath }: { basePath: string }) {
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

// Basic server-side text extraction (no DOM needed)
function extractTextFromDoc(doc: Record<string, unknown>): string {
  if (doc.type === "text") return (doc.text as string) || "";
  const content = doc.content as Array<Record<string, unknown>> | undefined;
  if (!content) return "";
  return content.map((node) => extractTextFromDoc(node)).join(" ");
}

function stripHtmlBasic(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
