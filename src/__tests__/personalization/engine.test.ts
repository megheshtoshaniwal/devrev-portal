import { describe, it, expect } from "vitest";
import { assembleBlocks, type UserSignals } from "@/devrev-sdk/personalization/engine";

// Test the fallback (rules-based) personalization — no LLM needed

describe("assembleBlocks (fallback)", () => {
  const baseSignals: UserSignals = {
    user: null,
    tickets: [],
    conversations: [],
    directories: [],
  };

  it("returns greeting, action cards, and sidebar blocks for new user", async () => {
    const result = await assembleBlocks(baseSignals);
    expect(result.greeting).toBeDefined();
    expect(result.greeting.headline).toBeTruthy();
    expect(result.greeting.subtext).toBeTruthy();
    expect(result.actionCards.length).toBeGreaterThan(0);
  });

  it("generates personalized greeting for user with needs_response tickets", async () => {
    const signals: UserSignals = {
      user: { id: "u1", display_id: "USR-1", display_name: "Jane Doe", state: "active" },
      tickets: [
        {
          id: "t1",
          display_id: "TKT-100",
          type: "ticket",
          title: "Payment failed",
          needs_response: true,
          stage: { name: "awaiting_customer_response", state: { name: "open" } },
        } as UserSignals["tickets"][0],
      ],
      conversations: [],
      directories: [],
    };

    const result = await assembleBlocks(signals);
    // Should reference the user's name or the ticket needing response
    expect(
      result.greeting.headline.includes("Jane") ||
      result.greeting.headline.includes("ticket") ||
      result.greeting.headline.includes("response")
    ).toBe(true);
  });

  it("includes onboarding block for empty users", async () => {
    const result = await assembleBlocks(baseSignals);
    const blockTypes = result.sidebarBlocks.map((b) => b.type);
    expect(blockTypes).toContain("learn_onboarding");
  });

  it("includes track_needs_response when tickets need response", async () => {
    const signals: UserSignals = {
      user: null,
      tickets: [
        {
          id: "t1",
          display_id: "TKT-1",
          type: "ticket",
          title: "Issue",
          needs_response: true,
          stage: { name: "open", state: { name: "open" } },
        } as UserSignals["tickets"][0],
      ],
      conversations: [],
      directories: [],
    };

    const result = await assembleBlocks(signals);
    const blockTypes = result.sidebarBlocks.map((b) => b.type);
    expect(blockTypes).toContain("track_needs_response");
  });

  it("action cards always include create a ticket", async () => {
    const result = await assembleBlocks(baseSignals);
    const titles = result.actionCards.map((c) => c.title.toLowerCase());
    expect(titles.some((t) => t.includes("ticket") || t.includes("create"))).toBe(true);
  });
});
