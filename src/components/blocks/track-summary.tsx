"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import type { Block } from "@/devrev-sdk/personalization/engine";

interface Props {
  block: Block;
  basePath: string;
}

export function TrackSummary({ block, basePath }: Props) {
  const { open, inProgress, needsResponse, resolved, total } = block.data as {
    open: number;
    inProgress: number;
    needsResponse: number;
    resolved: number;
    total: number;
  };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 mb-8">
      <Link
        href={`${basePath}/tickets`}
        className="block rounded-xl border border-border bg-muted/30 p-5 hover:border-primary/20 transition-all"
      >
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Your tickets
        </h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{open + inProgress}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{needsResponse}</p>
            <p className="text-xs text-muted-foreground">Need response</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-muted-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </Link>
    </section>
  );
}
