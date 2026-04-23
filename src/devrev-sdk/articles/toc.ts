// Table of contents extraction — adapted from devrev-web TOC utilities

export interface TOCItem {
  level: number;
  label: string;
  href?: string;
  normalizedLevel?: number;
}

export interface TOCItemGroup extends TOCItem {
  children: TOCItem[];
}

export function getUniqueKey(item: TOCItem): string {
  return `${item.level}-${item.label}-${item.href}`;
}

/**
 * Groups TOC items into a parent/children hierarchy based on heading level.
 * Level 1 items become parents; deeper items become children of the preceding parent.
 */
export function getTocItemGroups(tocItems: TOCItem[]): TOCItemGroup[] {
  const lowestLevel = tocItems.reduce(
    (acc, item) => Math.min(acc, item.level),
    6
  );
  const normalized = tocItems.map((item) => ({
    ...item,
    normalizedLevel: item.level - lowestLevel + 1,
  }));

  const result: TOCItemGroup[] = [];
  let currentParent: TOCItemGroup | null = null;

  for (const item of normalized) {
    if (!currentParent || item.normalizedLevel === 1) {
      const group: TOCItemGroup = { ...item, children: [] };
      result.push(group);
      currentParent = item.normalizedLevel === 1 ? group : null;
      continue;
    }
    result.at(-1)?.children.push(item);
  }

  return result;
}

/** Extract TOC items from Tiptap JSON doc content */
export function extractTocFromTiptap(
  doc: { type: string; content?: Array<Record<string, unknown>> } | null
): TOCItem[] {
  if (!doc?.content) return [];

  const headings: TOCItem[] = [];
  for (const node of doc.content) {
    if (node.type === "heading") {
      const attrs = node.attrs as { level?: number; id?: string } | undefined;
      const level = attrs?.level ?? 1;
      if (level > 3) continue;

      const textContent = extractTextFromNode(node);
      if (!textContent.trim()) continue;

      headings.push({
        label: textContent.trim(),
        level,
        ...(attrs?.id && { href: `#${attrs.id}` }),
      });
    }
  }
  return headings;
}

/** Extract TOC items from Paligo HTML TOC objects */
export interface PaligoTocObject {
  label: string;
  href: string;
  children: PaligoTocObject[];
}

export function extractTocFromPaligo(
  toc: PaligoTocObject[],
  level = 1
): TOCItem[] {
  const items: TOCItem[] = [];
  for (const entry of toc) {
    items.push({ label: entry.label, href: entry.href, level });
    if (entry.children?.length) {
      items.push(...extractTocFromPaligo(entry.children, level + 1));
    }
  }
  return items;
}

/** Extract TOC items from rendered HTML by scanning heading elements */
export function extractTocFromHtml(html: string): TOCItem[] {
  if (typeof window === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings: TOCItem[] = [];

  doc.querySelectorAll("h1, h2, h3").forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    const level = parseInt(el.tagName[1], 10);
    const id = el.getAttribute("id");
    headings.push({ label: text, level, ...(id && { href: `#${id}` }) });
  });

  return headings;
}

function extractTextFromNode(node: Record<string, unknown>): string {
  if (node.type === "text") return (node.text as string) || "";
  const content = node.content as Array<Record<string, unknown>> | undefined;
  if (!content) return "";
  return content.map(extractTextFromNode).join("");
}
