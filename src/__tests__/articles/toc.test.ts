import { describe, it, expect } from "vitest";
import {
  extractTocFromTiptap,
  extractTocFromPaligo,
  getTocItemGroups,
  getUniqueKey,
  type PaligoTocObject,
} from "@/devrev-sdk/articles/toc";

describe("extractTocFromTiptap", () => {
  it("extracts headings from tiptap doc", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Introduction" }] },
        { type: "paragraph", content: [{ type: "text", text: "Some text" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Setup" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Configuration" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Advanced" }] },
      ],
    };

    const items = extractTocFromTiptap(doc);
    expect(items).toHaveLength(4);
    expect(items[0]).toEqual({ label: "Introduction", level: 1 });
    expect(items[1]).toEqual({ label: "Setup", level: 2 });
    expect(items[2]).toEqual({ label: "Configuration", level: 2 });
    expect(items[3]).toEqual({ label: "Advanced", level: 3 });
  });

  it("skips headings deeper than level 3", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "H1" }] },
        { type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "H4 — skip" }] },
      ],
    };
    const items = extractTocFromTiptap(doc);
    expect(items).toHaveLength(1);
  });

  it("skips headings with empty text", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Real" }] },
      ],
    };
    const items = extractTocFromTiptap(doc);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Real");
  });

  it("returns empty for null doc", () => {
    expect(extractTocFromTiptap(null)).toEqual([]);
  });

  it("includes id as href when present", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1, id: "intro" }, content: [{ type: "text", text: "Intro" }] },
      ],
    };
    const items = extractTocFromTiptap(doc);
    expect(items[0].href).toBe("#intro");
  });
});

describe("extractTocFromPaligo", () => {
  it("extracts flat list", () => {
    const toc: PaligoTocObject[] = [
      { label: "A", href: "#a", children: [] },
      { label: "B", href: "#b", children: [] },
    ];
    const items = extractTocFromPaligo(toc);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ label: "A", href: "#a", level: 1 });
  });

  it("extracts nested list", () => {
    const toc: PaligoTocObject[] = [
      {
        label: "Parent",
        href: "#parent",
        children: [
          { label: "Child", href: "#child", children: [] },
        ],
      },
    ];
    const items = extractTocFromPaligo(toc);
    expect(items).toHaveLength(2);
    expect(items[0].level).toBe(1);
    expect(items[1].level).toBe(2);
  });
});

describe("getTocItemGroups", () => {
  it("groups items by parent/child hierarchy", () => {
    const items = [
      { label: "H1", level: 1 },
      { label: "H2a", level: 2 },
      { label: "H2b", level: 2 },
      { label: "H1b", level: 1 },
      { label: "H2c", level: 2 },
    ];
    const groups = getTocItemGroups(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("H1");
    expect(groups[0].children).toHaveLength(2);
    expect(groups[1].label).toBe("H1b");
    expect(groups[1].children).toHaveLength(1);
  });
});

describe("getUniqueKey", () => {
  it("generates stable key from item", () => {
    const key = getUniqueKey({ label: "Test", level: 2, href: "#test" });
    expect(key).toBe("2-Test-#test");
  });
});
