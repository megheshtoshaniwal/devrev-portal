/**
 * Regression test: Message deduplication in chat
 *
 * Bug: Stale closure in Ask Flash polling caused duplicate AI messages
 * when `messages` was captured from the outer scope. If polling found
 * the same reply twice (before the state updated), it would add duplicates.
 *
 * Fix: Use functional state update with dedup check inside setMessages.
 */

import { describe, it, expect } from "vitest";

interface Message {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
}

// Mirrors the fixed setMessages logic
function addMessageWithDedup(prev: Message[], newMsg: Message): Message[] {
  if (prev.some((m) => m.id === newMsg.id)) return prev;
  return [...prev, newMsg];
}

describe("message dedup", () => {
  it("adds a new message", () => {
    const prev: Message[] = [
      { id: "u-1", role: "user", content: "hello" },
    ];
    const result = addMessageWithDedup(prev, {
      id: "ai-1",
      role: "ai",
      content: "hi there",
    });
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe("ai-1");
  });

  it("rejects duplicate message (same id)", () => {
    const prev: Message[] = [
      { id: "u-1", role: "user", content: "hello" },
      { id: "ai-1", role: "ai", content: "hi there" },
    ];
    // Same poll fires twice, trying to add the same AI reply
    const result = addMessageWithDedup(prev, {
      id: "ai-1",
      role: "ai",
      content: "hi there",
    });
    expect(result).toHaveLength(2); // No duplicate added
    expect(result).toBe(prev); // Same reference (no mutation)
  });

  it("allows different messages with different ids", () => {
    const prev: Message[] = [
      { id: "u-1", role: "user", content: "hello" },
      { id: "ai-1", role: "ai", content: "hi there" },
    ];
    const result = addMessageWithDedup(prev, {
      id: "ai-2",
      role: "ai",
      content: "follow up",
    });
    expect(result).toHaveLength(3);
  });

  it("handles empty message list", () => {
    const result = addMessageWithDedup([], {
      id: "ai-1",
      role: "ai",
      content: "first message",
    });
    expect(result).toHaveLength(1);
  });

  it("simulates rapid polling dedup scenario", () => {
    let state: Message[] = [{ id: "u-1", role: "user", content: "help" }];

    const aiReply: Message = { id: "ai-1", role: "ai", content: "sure" };

    // Poll 1 fires
    state = addMessageWithDedup(state, aiReply);
    expect(state).toHaveLength(2);

    // Poll 2 fires before state update propagates (stale closure scenario)
    state = addMessageWithDedup(state, aiReply);
    expect(state).toHaveLength(2); // Still 2, not 3
  });
});
