"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight, Home, Loader2, Clock } from "lucide-react";
import { useParams } from "next/navigation";
import { usePortalConfig } from "@/portal/config";
import { useDirectoryArticles } from "@/devrev-sdk/data/use-directories";
import type { Article } from "@/devrev-sdk/client";

export default function DirectoryDetailPage() {
  const { basePath } = usePortalConfig();
  const params = useParams();

  // Get directory ID from route params
  const dirId = params.id as string;
  const { articles, loading } = useDirectoryArticles(dirId);

  // Derive directory title from first article's parent
  const directoryTitle = articles[0]?.parent?.title || "";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`${basePath}/directories`} className="hover:text-foreground">Knowledge Base</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{directoryTitle || dirId}</span>
      </nav>

      <h1 className="text-xl font-semibold text-foreground mb-6">
        {directoryTitle || "Articles"}
      </h1>

      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No articles found in this directory.</p>
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
