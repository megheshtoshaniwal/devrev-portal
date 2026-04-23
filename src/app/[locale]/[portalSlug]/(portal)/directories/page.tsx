// Server Component directory listing — ISR-enabled, SEO-friendly.
//
// Replaces the client-only version. Directory tree is fetched server-side
// and cached for 5 minutes via ISR.

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getDirectoryTree } from "@/devrev-sdk/data/server-fetchers";
import { getSessionToken } from "@/devrev-sdk/auth/session";

export const revalidate = 300; // 5min ISR

interface PageProps {
  params: Promise<{ locale: string; portalSlug: string }>;
}

export default async function DirectoriesPage({ params }: PageProps) {
  const { locale, portalSlug } = await params;
  const basePath = `/${locale}/${portalSlug}`;

  const token = await getSessionToken();
  const pat = process.env.DEVREV_PAT;
  const fetchToken = token || (pat ? `Bearer ${pat}` : "");

  const directories = fetchToken ? await getDirectoryTree(fetchToken) : [];
  const withArticles = directories.filter((d) => d.has_descendant_articles);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Knowledge Base</span>
      </nav>

      <h1 className="text-xl font-semibold text-foreground mb-1">Knowledge Base</h1>
      <p className="text-sm text-muted-foreground mb-6">Browse documentation by topic</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {withArticles.map((node) => (
          <Link
            key={node.directory.id}
            href={`${basePath}/directories/${node.directory.display_id}`}
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors">
              {node.directory.title}
            </h3>
            {node.directory.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {node.directory.description}
              </p>
            )}
          </Link>
        ))}
      </div>

      {withArticles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No knowledge base categories found.
        </p>
      )}
    </div>
  );
}
