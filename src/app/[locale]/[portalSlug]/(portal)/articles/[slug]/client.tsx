"use client";

// Client Component island for article AI features.
//
// This is mounted inside the Server Component article page.
// It handles: content rendering (Tiptap/Paligo need browser APIs),
// AI summary, Ask Flash, related ticket matching, voting.

import { useState, useCallback, useMemo } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapRenderer } from "@/components/articles/tiptap-renderer";
import { PaligoRenderer } from "@/components/articles/paligo-renderer";
import { AISummaryBar } from "@/components/articles/ai-summary";
import { AskFlash } from "@/components/articles/ask-flash";
import { RelatedTicketBanner } from "@/components/articles/related-ticket-banner";
import { useDevRevAPI } from "@/devrev-sdk/hooks/use-devrev";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { useAIContext } from "@/devrev-sdk/ai/use-ai-context";
import { useJourney } from "@/portal/hooks/use-journey";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import type { FeatureFlags } from "@/portal/config/types";
import DOMPurify from "isomorphic-dompurify";
import { useEffect } from "react";

interface ArticleClientFeaturesProps {
  articleTitle: string;
  articleText: string; // Plain text for AI
  features: FeatureFlags;
  basePath: string;
  contentType: "tiptap" | "paligo" | "fallback";
  contentHtml: string;
  tiptapDoc: Record<string, unknown> | null;
}

export function ArticleClientFeatures({
  articleTitle,
  articleText,
  features,
  basePath,
  contentType,
  contentHtml,
  tiptapDoc,
}: ArticleClientFeaturesProps) {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const { contextPrefix } = useAIContext();
  const journey = useJourney();
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  // Track article view
  useEffect(() => {
    journey.trackArticleView(articleTitle, articleTitle);
  }, [articleTitle, journey]);

  // Tickets for related-ticket matching
  const { tickets } = useTickets({ limit: 25 });

  // Artifact locator for Paligo images
  const locateArtifact = useCallback(
    async (id: string) => {
      try {
        const res = await apiCall<{ artifact_url?: string; url?: string }>(
          "GET",
          "internal/artifacts.locate",
          { id, preview: "true" }
        );
        const url = res.artifact_url || res.url;
        return url ? { url } : null;
      } catch {
        return null;
      }
    },
    [apiCall]
  );

  const articleLinkResolver = useCallback(
    (articleRefId: string) => `${basePath}/articles/${articleRefId}`,
    [basePath]
  );

  const proseClasses =
    "prose prose-sm max-w-none text-foreground leading-relaxed prose-headings:scroll-mt-24 prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-img:rounded-xl prose-table:text-sm";

  return (
    <>
      {/* Related ticket banner */}
      {features.ticketMatching && tickets.length > 0 && articleText && (
        <RelatedTicketBanner
          articleTitle={articleTitle}
          articleText={articleText}
          tickets={tickets}
          basePath={basePath}
          ambientContext={contextPrefix}
          apiCall={apiCall}
        />
      )}

      {/* AI Summary */}
      {features.aiSummary && articleText && (
        <AISummaryBar
          articleTitle={articleTitle}
          articleText={articleText}
          ambientContext={contextPrefix}
          apiCall={apiCall}
        />
      )}

      {/* Article content — needs browser APIs for Tiptap/Paligo */}
      {contentType === "tiptap" && tiptapDoc ? (
        <div className={proseClasses}>
          <TiptapRenderer content={tiptapDoc} token={token ?? undefined} />
        </div>
      ) : contentType === "paligo" ? (
        <PaligoRenderer
          html={contentHtml}
          locateArtifact={locateArtifact}
          articleLinkResolver={articleLinkResolver}
          className={proseClasses}
        />
      ) : (
        <div
          className={proseClasses}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(contentHtml),
          }}
        />
      )}

      {/* Voting */}
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

      {/* Ask Flash */}
      {features.askFlash && articleText && (
        <AskFlash
          articleTitle={articleTitle}
          articleText={articleText}
          ambientContext={contextPrefix}
          apiCall={apiCall}
        />
      )}
    </>
  );
}
