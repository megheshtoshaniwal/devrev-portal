// Server Component directory detail — ISR-enabled, SEO-friendly.

import Link from "next/link";
import { FileText, ChevronRight, Home } from "lucide-react";
import { listArticles } from "@/devrev-sdk/data/server-fetchers";
import { getSessionToken } from "@/devrev-sdk/auth/session";

export const revalidate = 300; // 5min ISR

interface PageProps {
  params: Promise<{ locale: string; portalSlug: string; id: string }>;
}

export default async function DirectoryDetailPage({ params }: PageProps) {
  const { locale, portalSlug, id: dirId } = await params;
  const basePath = `/${locale}/${portalSlug}`;

  const token = await getSessionToken();
  const pat = process.env.DEVREV_PAT;
  const fetchToken = token || (pat ? `Bearer ${pat}` : "");

  const { articles } = fetchToken
    ? await listArticles(fetchToken, { parent: dirId, limit: 50 })
    : { articles: [] };

  const directoryTitle = articles[0]?.parent?.title || dirId;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`${basePath}/directories`} className="hover:text-foreground">
          Knowledge Base
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{directoryTitle}</span>
      </nav>

      <h1 className="text-xl font-semibold text-foreground mb-6">
        {directoryTitle}
      </h1>

      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No articles found in this directory.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`${basePath}/articles/${article.display_id}`}
              className="group flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {article.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
