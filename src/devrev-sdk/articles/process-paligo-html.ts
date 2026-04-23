// Adapted from devrev-web/libs/articles/shared/paligo-article/src/process-paligo-article-html.ts
// Resolves image artifact IDs to signed URLs and rewrites article links.

export const DATA_DR_ARTIFACT_ID = "data-dr-artifactId";

interface ProcessPaligoArticleHtmlProps {
  locateArtifact: (id: string) => Promise<{ url: string } | null>;
  articleHtml: string;
  articleLinkResolver?: (articleId: string, href?: string | null) => string;
}

export async function processPaligoArticleHtml({
  locateArtifact,
  articleHtml,
  articleLinkResolver,
}: ProcessPaligoArticleHtmlProps): Promise<string | null> {
  const domParser = new DOMParser();
  const dom = domParser.parseFromString(articleHtml, "text/html");
  const images = dom.querySelectorAll("img");

  // Resolve image artifact IDs to CDN URLs
  const imagePromises = Array.from(images).map(async (img) => {
    const src = img.getAttribute("src");
    if (src) {
      const artifact = await locateArtifact(src);
      if (artifact?.url) {
        img.setAttribute("src", artifact.url);
        img.setAttribute(DATA_DR_ARTIFACT_ID, src);
      }
    }
  });

  await Promise.all(imagePromises);

  // Resolve article cross-links
  if (articleLinkResolver) {
    const links = dom.querySelectorAll("a[data-article-id]");
    Array.from(links).forEach((link) => {
      const articleId = link.getAttribute("data-article-id");
      const currentHref = link.getAttribute("href");
      if (articleId) {
        link.setAttribute("href", articleLinkResolver(articleId, currentHref));
      }
    });
  }

  return dom.querySelector("article")?.outerHTML ?? dom.body.innerHTML ?? null;
}
