"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight, Home, Loader2 } from "lucide-react";
import { usePortalConfig } from "@/portal/config";
import { useDirectories } from "@/devrev-sdk/data/use-directories";
import type { DirectoryNode } from "@/devrev-sdk/client";

export default function DirectoriesPage() {
  const { basePath } = usePortalConfig();
  const { directories, loading } = useDirectories();

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
        <span className="text-foreground font-medium">Knowledge Base</span>
      </nav>

      <h1 className="text-xl font-semibold text-foreground mb-1">Knowledge Base</h1>
      <p className="text-sm text-muted-foreground mb-6">Browse documentation by topic</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {directories
          .filter((d) => d.has_descendant_articles)
          .map((node) => (
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
    </div>
  );
}
