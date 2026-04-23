// Article content fetching pipeline
// Articles store their actual content in artifacts, not in article.body.
// Pipeline: article.resource.contentArtifact.id → artifacts.locate → fetch preview URL

import type { Article } from "../client";

export type ArticleResourceType =
  | "devrev/rt"     // Tiptap JSON (rich text)
  | "paligo/html"   // HTML from Paligo
  | "link"          // External link
  | "attachment"    // File attachment
  | "devrev/drdfv2" // DRDF v2
  | "unknown";

export interface TiptapContent {
  type: "devrev/rt";
  doc: { type: string; content: Array<Record<string, unknown>> };
  artifactIds?: string[];
}

export interface PaligoContent {
  type: "paligo/html";
  html: string;
  toc?: Array<{ label: string; href: string; children: Array<{ label: string; href: string; children: unknown[] }> }>;
}

export interface FallbackContent {
  type: "fallback";
  html: string;
}

export type ArticleContent = TiptapContent | PaligoContent | FallbackContent;

/**
 * Detect article resource type from the article object.
 * The resource type is typically in article.resource or inferred from content.
 */
function detectResourceType(article: Article): ArticleResourceType {
  // Check resource field for type hints
  const resource = article.resource as Record<string, unknown> | undefined;
  if (resource?.type) {
    const t = String(resource.type);
    if (t.includes("devrev/rt") || t.includes("rt")) return "devrev/rt";
    if (t.includes("paligo")) return "paligo/html";
    if (t.includes("link")) return "link";
    if (t.includes("attachment")) return "attachment";
    if (t.includes("drdf")) return "devrev/drdfv2";
  }
  return "unknown";
}

/**
 * Fetch the actual article content from its artifact.
 *
 * @param article - The article object from the API
 * @param apiCall - Function to make DevRev API calls (through our proxy)
 */
export async function fetchArticleContent(
  article: Article,
  apiCall: <T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ) => Promise<T>,
  token?: string
): Promise<ArticleContent> {
  // Step 1: Find the content artifact ID
  const resource = article.resource as Record<string, unknown> | undefined;
  const contentArtifact = resource?.contentArtifact as { id: string } | undefined;
  // Also check snake_case variant (API may use either)
  const contentArtifactSnake = resource?.content_artifact as { id: string } | undefined;
  const artifacts = resource?.artifacts as Array<{ id: string }> | undefined;

  // Also check extracted_content
  const extractedContent = article.extracted_content;

  const artifactId =
    contentArtifact?.id ||
    contentArtifactSnake?.id ||
    artifacts?.[0]?.id ||
    extractedContent?.[0]?.id;

  if (!artifactId) {
    // No artifact — fall back to article.body
    if (article.body) {
      return { type: "fallback", html: article.body };
    }
    return { type: "fallback", html: article.description || "" };
  }

  try {
    // Step 2+3: Fetch artifact content via our server proxy
    // (S3 artifact URLs don't have CORS headers, so we proxy through our API)
    const contentRes = await fetch(
      `/api/artifact-content?id=${encodeURIComponent(artifactId)}`,
      {
        headers: token ? { Authorization: token } : {},
      }
    );
    if (!contentRes.ok) {
      return { type: "fallback", html: article.body || article.description || "" };
    }

    const contentType = contentRes.headers.get("content-type") || "";
    const rawText = await contentRes.text();

    // Step 4: Parse based on content type or resource type
    const resourceType = detectResourceType(article);

    // Try parsing as JSON first (Tiptap / structured content)
    try {
      const parsed = JSON.parse(rawText);

      // Format 1: { article: JSONContent } — direct from S3 artifact
      // Format 2: { data: { article: JSONContent, artifactIds?: string[] } } — via portal API
      const articleData =
        parsed?.article ??
        parsed?.data?.article;

      if (articleData && typeof articleData === "object") {
        // Tiptap doc structure
        if (articleData.type === "doc" || articleData.content) {
          return {
            type: "devrev/rt",
            doc: articleData,
            artifactIds: parsed.data?.artifactIds ?? parsed.artifactIds,
          };
        }
      }

      // Paligo format: article field is an HTML string
      if (articleData && typeof articleData === "string") {
        const toc = parsed.data?.toc ?? parsed.toc;
        return {
          type: "paligo/html",
          html: articleData,
          toc,
        };
      }

      // Direct Tiptap doc at root
      if (parsed.type === "doc" && parsed.content) {
        return { type: "devrev/rt", doc: parsed };
      }
    } catch {
      // Not JSON — treat as HTML
    }

    // If we know it's Paligo or it's HTML content
    if (
      resourceType === "paligo/html" ||
      contentType.includes("text/html") ||
      rawText.trim().startsWith("<")
    ) {
      return { type: "paligo/html", html: rawText };
    }

    // Plain text or unknown — wrap in paragraph
    return { type: "fallback", html: `<p>${rawText}</p>` };
  } catch {
    // Network error — fall back to article.body
    return { type: "fallback", html: article.body || article.description || "" };
  }
}

/**
 * Extract plain text from article content for AI processing.
 */
export function getPlainText(content: ArticleContent): string {
  switch (content.type) {
    case "devrev/rt":
      return extractTextFromTiptap(content.doc);
    case "paligo/html":
    case "fallback":
      return stripHtml(content.type === "paligo/html" ? content.html : content.html);
  }
}

function extractTextFromTiptap(doc: Record<string, unknown>): string {
  if (doc.type === "text") return (doc.text as string) || "";
  const content = doc.content as Array<Record<string, unknown>> | undefined;
  if (!content) return "";

  return content
    .map((node) => {
      if (node.type === "text") return (node.text as string) || "";
      const text = extractTextFromTiptap(node);
      // Add newlines after block-level nodes
      const blockTypes = ["heading", "paragraph", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "table"];
      if (blockTypes.includes(node.type as string)) return text + "\n";
      return text;
    })
    .join("");
}

function stripHtml(html: string): string {
  if (typeof window !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }
  // SSR fallback — basic tag stripping
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
