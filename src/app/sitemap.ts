import type { MetadataRoute } from "next";
import { getDirectoryTree, listArticles } from "@/devrev-sdk/data/server-fetchers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://help.example.com";
const LOCALE = "en-US";
const SLUG = process.env.DEVREV_PORTAL_SLUG || "my-portal";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pat = process.env.DEVREV_PAT;
  if (!pat) return [];

  const token = `Bearer ${pat}`;
  const basePath = `${SITE_URL}/${LOCALE}/${SLUG}`;
  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: basePath,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  });

  // Knowledge base root
  entries.push({
    url: `${basePath}/directories`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  });

  // Tickets page
  entries.push({
    url: `${basePath}/tickets`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  });

  // Directory pages
  try {
    const tree = await getDirectoryTree(token);
    if (tree) {
      for (const node of tree) {
        entries.push({
          url: `${basePath}/directories/${node.directory.id}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Directories unavailable
  }

  // Article pages
  try {
    const result = await listArticles(token, { limit: 100 });
    if (result?.articles) {
      for (const article of result.articles) {
        const slug = article.display_id || article.id;
        entries.push({
          url: `${basePath}/articles/${slug}`,
          lastModified: article.modified_date ? new Date(article.modified_date) : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Articles unavailable
  }

  return entries;
}
