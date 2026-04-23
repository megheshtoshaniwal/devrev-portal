"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import type { Block } from "@/devrev-sdk/personalization/engine";
import type { DirectoryNode } from "@/devrev-sdk/client";

interface Props {
  block: Block;
  basePath: string;
}

export function LearnExplore({ block, basePath }: Props) {
  const { directories } = block.data as { directories: DirectoryNode[] };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Explore knowledge base
        </h2>
        <Link
          href={`${basePath}/directories`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Browse all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {directories.slice(0, 8).map((node) => (
          <Link
            key={node.directory.id}
            href={`${basePath}/directories/${node.directory.display_id}`}
            className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="text-sm font-medium text-card-foreground group-hover:text-primary transition-colors leading-tight">
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
    </section>
  );
}
