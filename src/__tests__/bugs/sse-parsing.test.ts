/**
 * Regression test: SSE response parsing
 *
 * Bug: The API proxy only parsed the last `data:` line from SSE responses.
 * If the LLM streamed multiple chunks, earlier chunks were silently discarded.
 * The fallback also concatenated raw JSON objects without delimiters.
 *
 * Fix: Try last line first, then concatenated, then raw text fallback.
 * Also filter out [DONE] sentinel and trim whitespace.
 */

import { describe, it, expect } from "vitest";

// Extract the SSE parsing logic into a testable function
// (mirrors the logic in src/app/api/devrev/[...endpoint]/route.ts)
function parseSSEResponse(text: string): { parsed: unknown } | { text_response: string } | null {
  const dataLines = text
    .split("\n")
    .filter((line: string) => line.startsWith("data: "))
    .map((line: string) => line.slice(6).trim())
    .filter((line: string) => line && line !== "[DONE]");

  if (dataLines.length === 0) return null;

  // Try last line first (most common: single complete JSON response)
  try {
    const parsed = JSON.parse(dataLines[dataLines.length - 1]);
    return { parsed };
  } catch {
    // If last line fails, try concatenating all lines (chunked response)
    try {
      const combined = dataLines.join("");
      const parsed = JSON.parse(combined);
      return { parsed };
    } catch {
      // Raw text fallback
      return { text_response: dataLines.join("\n") };
    }
  }
}

describe("SSE response parsing", () => {
  it("parses a single data line", () => {
    const text = 'data: {"text_response":"hello"}\n';
    const result = parseSSEResponse(text);
    expect(result).toEqual({ parsed: { text_response: "hello" } });
  });

  it("parses the last line when multiple complete JSON objects exist", () => {
    const text = [
      'data: {"partial":true}',
      'data: {"text_response":"final answer"}',
      "",
    ].join("\n");
    const result = parseSSEResponse(text);
    expect(result).toEqual({ parsed: { text_response: "final answer" } });
  });

  it("filters out [DONE] sentinel", () => {
    const text = [
      'data: {"text_response":"answer"}',
      "data: [DONE]",
      "",
    ].join("\n");
    const result = parseSSEResponse(text);
    expect(result).toEqual({ parsed: { text_response: "answer" } });
  });

  it("handles chunked JSON across multiple data lines", () => {
    const text = [
      'data: {"text_re',
      'data: sponse":"chunked"}',
      "",
    ].join("\n");
    const result = parseSSEResponse(text);
    // Last line alone is invalid JSON, but concatenated works
    expect(result).toEqual({ parsed: { text_response: "chunked" } });
  });

  it("falls back to text when JSON is invalid", () => {
    const text = [
      "data: not json at all",
      "data: still not json",
      "",
    ].join("\n");
    const result = parseSSEResponse(text);
    expect(result).toEqual({ text_response: "not json at all\nstill not json" });
  });

  it("returns null for empty SSE", () => {
    const result = parseSSEResponse("");
    expect(result).toBeNull();
  });

  it("returns null for SSE with only [DONE]", () => {
    const result = parseSSEResponse("data: [DONE]\n");
    expect(result).toBeNull();
  });

  it("trims whitespace from data lines", () => {
    const text = 'data:   {"text_response":"trimmed"}   \n';
    const result = parseSSEResponse(text);
    expect(result).toEqual({ parsed: { text_response: "trimmed" } });
  });
});
