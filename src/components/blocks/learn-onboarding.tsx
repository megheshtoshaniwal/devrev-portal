"use client";

import Link from "next/link";
import { Rocket, ChevronRight } from "lucide-react";
import type { Block } from "@/devrev-sdk/personalization/engine";
import type { DirectoryNode } from "@/devrev-sdk/client";

interface Props {
  block: Block;
  basePath: string;
}

export function LearnOnboarding({ block, basePath }: Props) {
  const { directories } = block.data as { directories: DirectoryNode[] };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 mb-8">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
          <Rocket className="h-4 w-4 text-primary" />
          Get started
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          New here? These topics will help you get up and running.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {directories.map((node) => (
            <Link
              key={node.directory.id}
              href={`${basePath}/directories/${node.directory.display_id}`}
              className="group flex items-center justify-between rounded-lg border border-border bg-background p-3 hover:border-primary/30 transition-all"
            >
              <div>
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {node.directory.title}
                </h3>
                {node.directory.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {node.directory.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
