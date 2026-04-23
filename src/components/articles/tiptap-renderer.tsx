"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState, useCallback } from "react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Node, mergeAttributes } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";

// ─── Custom Extensions ──────────────────────────────────────────

// Callout block — renders DevRev's calloutBlockNode with appropriate styling
const CalloutBlock = Node.create({
  name: "calloutBlockNode",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      backgroundColor: { default: "background_neutral" },
      textColor: { default: "text_neutral" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const bgMap: Record<string, string> = {
      background_neutral: "#f5f5f5",
      background_info: "#eff6ff",
      background_warning: "#fffbeb",
      background_error: "#fef2f2",
      background_success: "#f0fdf4",
    };
    const borderMap: Record<string, string> = {
      background_neutral: "#e5e5e5",
      background_info: "#bfdbfe",
      background_warning: "#fde68a",
      background_error: "#fecaca",
      background_success: "#bbf7d0",
    };
    const bg = bgMap[HTMLAttributes.backgroundColor] || bgMap.background_neutral;
    const border = borderMap[HTMLAttributes.backgroundColor] || borderMap.background_neutral;

    return [
      "div",
      mergeAttributes(
        {},
        {
          "data-callout": "",
          style: `background-color: ${bg}; border: 1px solid ${border}; border-radius: 12px; padding: 16px; margin: 16px 0;`,
        }
      ),
      0,
    ];
  },
});

// Content block — handles DevRev's reusable content block nodes
const ContentBlock = Node.create({
  name: "contentBlockNode",
  group: "block",
  content: "block+",

  parseHTML() {
    return [{ tag: "div[data-content-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-content-block": "" }),
      0,
    ];
  },
});

// ─── Image Resolution ───────────────────────────────────────────

/**
 * Resolve inline image artifact IDs to displayable URLs.
 * Images in DevRev articles store artifact IDs — we need to get
 * fresh pre-signed URLs via artifacts.locate (through our proxy).
 */
async function resolveImageArtifacts(
  doc: JSONContent,
  token: string
): Promise<JSONContent> {
  const resolved = structuredClone(doc);
  const imageNodes: Array<{ attrs: Record<string, unknown> }> = [];

  // Collect all image nodes
  function walk(node: JSONContent) {
    if (node.type === "image" && node.attrs?.id) {
      imageNodes.push(node as { attrs: Record<string, unknown> });
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }
  walk(resolved);

  if (imageNodes.length === 0) return resolved;

  // Resolve all image artifacts in parallel
  await Promise.all(
    imageNodes.map(async (node) => {
      const artifactId = node.attrs.id as string;
      try {
        const res = await fetch(
          `/api/artifact-content?id=${encodeURIComponent(artifactId)}&locate_only=true`,
          { headers: { Authorization: token } }
        );
        // If locate_only isn't supported, fall through to the download URL
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            node.attrs.src = data.url;
            return;
          }
        }
      } catch {
        // Fall through
      }

      // Fallback: proxy the image through our API
      // The src in content is like: https://api.dev.devrev-eng.com/internal/artifacts.download?id=...&key=...
      // That should work as-is if the key is still valid
      const existingSrc = node.attrs.src as string;
      if (existingSrc && existingSrc.includes("artifacts.download")) {
        // Use existing download URL — it has the key baked in
        return;
      }

      // Last resort: use our proxy to locate and redirect
      node.attrs.src = `/api/devrev/internal/artifacts.locate?id=${encodeURIComponent(artifactId)}&preview=true`;
    })
  );

  return resolved;
}

// ─── Extensions Config ──────────────────────────────────────────

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
  Highlight.configure({ multicolor: true }),
  Underline,
  TextStyle,
  Image.configure({
    inline: true,
    allowBase64: true,
    HTMLAttributes: {
      style: "max-width: 100%; height: auto; border-radius: 8px;",
    },
  }),
  Link.configure({
    openOnClick: true,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
  }),
  CalloutBlock,
  ContentBlock,
];

// ─── Component ──────────────────────────────────────────────────

interface TiptapRendererProps {
  content: JSONContent;
  token?: string;
  className?: string;
}

export function TiptapRenderer({
  content,
  token,
  className,
}: TiptapRendererProps) {
  const [resolvedContent, setResolvedContent] = useState<JSONContent | null>(
    null
  );

  // Resolve image artifacts before rendering
  useEffect(() => {
    if (!content) return;

    if (token) {
      resolveImageArtifacts(content, token).then(setResolvedContent);
    } else {
      setResolvedContent(content);
    }
  }, [content, token]);

  const editor = useEditor({
    extensions,
    content: resolvedContent || undefined,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  // Update editor when resolved content arrives
  useEffect(() => {
    if (editor && resolvedContent) {
      editor.commands.setContent(resolvedContent);
    }
  }, [editor, resolvedContent]);

  if (!editor || !resolvedContent) return null;

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
