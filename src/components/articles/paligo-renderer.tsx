"use client";

import { useState, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";
import { processPaligoArticleHtml } from "@/devrev-sdk/articles/process-paligo-html";

interface PaligoRendererProps {
  html: string;
  locateArtifact: (id: string) => Promise<{ url: string } | null>;
  articleLinkResolver?: (articleId: string, href?: string | null) => string;
  className?: string;
}

export function PaligoRenderer({
  html,
  locateArtifact,
  articleLinkResolver,
  className,
}: PaligoRendererProps) {
  const [processedHtml, setProcessedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    processPaligoArticleHtml({
      locateArtifact,
      articleHtml: html,
      articleLinkResolver,
    }).then((result) => {
      if (!cancelled && result) {
        const sanitized = DOMPurify.sanitize(result, {
          WHOLE_DOCUMENT: false,
          ADD_TAGS: ["iframe"],
          ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
        });
        setProcessedHtml(sanitized);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [html, locateArtifact, articleLinkResolver]);

  if (!processedHtml) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
