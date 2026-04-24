// Personalization Engine — LLM-powered, config-driven.
//
// Sends user signals to DevRev's LLM endpoint and gets back
// a personalized homepage layout: greeting, suggestions, block order.
//
// The system prompt, which context signals to include, and LLM parameters
// are all driven by PortalConfig.personalization — customizable per org.

import type { Ticket, Conversation, DirectoryNode, RevUser } from "../client/types";
import type { PersonalizationConfig, ContextSignal } from "./types";
import { buildJsonSchema } from "../client/api-client";

// SDK-level defaults — matches the portal DEFAULT_CONFIG.personalization values.
// The portal can override these by passing its own config to assembleBlocks().
const DEFAULT_PERSONALIZATION: PersonalizationConfig = {
  systemPrompt: "",
  contextSignals: ["user_identity", "tickets", "conversations", "kb_directories"],
  temperature: 0.3,
  maxTokens: 600,
  actionCardCount: 4,
  suggestionCount: 3,
};

// ─── Block Types ────────────────────────────────────────────────

export type BlockType =
  | "resolve_greeting"
  | "resolve_suggestions"
  | "track_needs_response"
  | "track_active_issues"
  | "track_recent_convos"
  | "track_summary"
  | "learn_recommended"
  | "learn_explore"
  | "learn_onboarding"
  | "org_dashboard";

export interface Block {
  type: BlockType;
  layer: "resolve" | "track" | "learn";
  priority: number;
  data: Record<string, unknown>;
}

export interface UserSignals {
  user: RevUser | null;
  tickets: Ticket[];
  conversations: Conversation[];
  directories: DirectoryNode[];
  articlesViewed?: string[];
  searchHistory?: string[];
  lastVisit?: Date;
  customerGroup?: string;
  customFields?: Record<string, unknown>;
}

// ─── LLM Response Shape ─────────────────────────────────────────

export interface ActionCard {
  title: string;
  subtitle: string;
  icon: "settings" | "shield" | "plus" | "newspaper" | "zap" | "book" | "alert" | "star" | "search" | "users";
  color: "violet" | "rose" | "orange" | "sky" | "emerald" | "amber" | "slate";
  badge?: { text: string; variant: "warning" | "success" | "info" };
  action?: string;
}

interface LLMPersonalization {
  greeting: { headline: string; subtext: string };
  suggestions: string[];
  action_cards: ActionCard[];
  blocks: string[];
}

// ─── Build context string for the LLM ───────────────────────────

function buildUserContext(
  signals: UserSignals,
  enabledSignals: ContextSignal[]
): string {
  const parts: string[] = [];

  // User identity
  if (enabledSignals.includes("user_identity")) {
    const name = signals.user?.display_name || "Anonymous user";
    const email = signals.user?.email || "no email";
    const isVerified = signals.user?.is_verified ? "verified" : "unverified";
    parts.push(`User: ${name} (${email}, ${isVerified})`);
  }

  // Tickets
  if (enabledSignals.includes("tickets")) {
    const { tickets } = signals;
    const openTickets = tickets.filter(
      (t) => t.stage?.state?.name === "open" || t.stage?.state?.name === "in_progress"
    );
    const needsResponse = tickets.filter((t) => t.needs_response);
    const resolvedTickets = tickets.filter(
      (t) => t.stage?.state?.name === "closed" || t.stage?.state?.name === "resolved"
    );

    parts.push(
      `Tickets: ${tickets.length} total, ${openTickets.length} open, ${needsResponse.length} needing response, ${resolvedTickets.length} resolved`
    );

    if (tickets.length > 0) {
      const ticketDetails = tickets.slice(0, 5).map((t) => {
        const status = t.needs_response
          ? "WAITING ON USER"
          : t.state_display_name || t.stage?.name || "unknown";
        return `  - ${t.display_id}: "${t.title}" [${status}] severity:${t.severity || "none"}`;
      });
      parts.push("Recent tickets:\n" + ticketDetails.join("\n"));
    }
  }

  // Conversations
  if (enabledSignals.includes("conversations")) {
    const { conversations } = signals;
    parts.push(`Conversations: ${conversations.length} total`);
    if (conversations.length > 0) {
      const convDetails = conversations.slice(0, 3).map(
        (c) => `  - ${c.display_id}: "${c.title || "Untitled"}" [${c.stage?.name || "active"}]`
      );
      parts.push("Recent conversations:\n" + convDetails.join("\n"));
    }
  }

  // KB directories
  if (enabledSignals.includes("kb_directories")) {
    const kbCategories = signals.directories
      .filter((d) => d.has_descendant_articles)
      .map((d) => d.directory.title);
    if (kbCategories.length > 0) {
      parts.push(`Knowledge base categories: ${kbCategories.join(", ")}`);
    }
  }

  // Articles viewed
  if (enabledSignals.includes("articles_viewed") && signals.articlesViewed?.length) {
    parts.push(`Articles recently viewed: ${signals.articlesViewed.length}`);
  }

  // Search history
  if (enabledSignals.includes("search_history") && signals.searchHistory?.length) {
    parts.push(`Recent searches: ${signals.searchHistory.join(", ")}`);
  }

  // Customer group
  if (enabledSignals.includes("customer_group") && signals.customerGroup) {
    parts.push(`Customer group: ${signals.customerGroup}`);
  }

  // Custom fields
  if (enabledSignals.includes("custom_fields") && signals.customFields) {
    const fields = Object.entries(signals.customFields)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    parts.push(`Custom fields: ${fields}`);
  }

  // Empty state
  if (
    (!signals.tickets || signals.tickets.length === 0) &&
    (!signals.conversations || signals.conversations.length === 0)
  ) {
    parts.push("This appears to be a new user with no prior interactions.");
  }

  return parts.join("\n");
}

// ─── LLM Response Schema ───────────────────────────────────────

const PERSONALIZATION_RESPONSE_FORMAT = buildJsonSchema("homepage_personalization", {
  type: "object",
  properties: {
    greeting: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subtext: { type: "string" },
      },
      required: ["headline", "subtext"],
      additionalProperties: false,
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
    },
    action_cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          icon: {
            type: "string",
            enum: ["settings", "shield", "plus", "newspaper", "zap", "book", "alert", "star", "search", "users"],
          },
          color: {
            type: "string",
            enum: ["violet", "rose", "orange", "sky", "emerald", "amber", "slate"],
          },
          badge_text: { type: "string" },
          badge_variant: { type: "string", enum: ["warning", "success", "info"] },
          action: { type: "string" },
        },
        required: ["title", "subtitle", "icon", "color"],
        additionalProperties: false,
      },
    },
    blocks: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["greeting", "suggestions", "action_cards", "blocks"],
  additionalProperties: false,
});

// ─── LLM Call ───────────────────────────────────────────────────

async function callLLM(
  userContext: string,
  personalizationConfig: PersonalizationConfig,
  apiCall: (
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ) => Promise<unknown>
): Promise<LLMPersonalization | null> {
  try {
    const response = (await apiCall(
      "POST",
      "internal/recommendations.chat.completions",
      {
        messages: [
          { role: "system", content: personalizationConfig.systemPrompt },
          { role: "user", content: userContext },
        ],
        max_tokens: personalizationConfig.maxTokens,
        temperature: personalizationConfig.temperature,
        stream: false,
        response_format: PERSONALIZATION_RESPONSE_FORMAT,
      }
    )) as {
      choices?: Array<{ message?: { content: string } }>;
      text_response?: string;
      completion?: string;
    };

    const jsonStr =
      response.choices?.[0]?.message?.content ||
      response.text_response ||
      response.completion;
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    // Normalize badge into { text, variant } — the LLM may return:
    //   badge: "some text"          (string)
    //   badge: { text, variant }    (correct shape)
    //   badge_text + badge_variant  (flat fields from strict schema)
    if (parsed.action_cards) {
      parsed.action_cards = parsed.action_cards.map(
        (card: Record<string, unknown>) => {
          let badge: { text: string; variant: string } | undefined;
          if (typeof card.badge === "string" && card.badge) {
            badge = { text: card.badge, variant: "info" };
          } else if (card.badge && typeof card.badge === "object") {
            badge = card.badge as { text: string; variant: string };
          } else if (card.badge_text) {
            badge = { text: card.badge_text as string, variant: (card.badge_variant as string) || "info" };
          }
          return { ...card, badge };
        }
      );
    }
    return parsed as LLMPersonalization;
  } catch (err) {
    console.error("LLM personalization failed:", err);
    return null;
  }
}

// ─── Fallback (rules-based) ─────────────────────────────────────

function fallbackAssemble(
  signals: UserSignals,
  cardCount: number,
  suggestionCount: number
): LLMPersonalization {
  const { user, tickets, conversations, directories } = signals;
  const firstName = user?.display_name?.split(" ")[0] || "";
  const needsResponse = tickets.filter((t) => t.needs_response);
  const kbCategories = directories.filter((d) => d.has_descendant_articles).map((d) => d.directory.title);

  let headline: string;
  let subtext: string;

  if (needsResponse.length > 0) {
    headline = `${firstName || "You"}, ${needsResponse.length} ${needsResponse.length === 1 ? "ticket needs" : "tickets need"} your response`;
    subtext = "Respond below, or ask me anything.";
  } else if (tickets.length === 0 && conversations.length === 0) {
    headline = `Welcome${firstName ? `, ${firstName}` : ""} to the Help Center`;
    subtext = "Ask me anything — I can find answers or connect you with our team.";
  } else {
    headline = `${firstName ? `Hey ${firstName}` : "Hi"}! How can I help?`;
    subtext = "Ask a question or check on your open issues.";
  }

  const action_cards: ActionCard[] = [];

  if (needsResponse.length > 0) {
    action_cards.push({
      title: `Respond to ${needsResponse[0].display_id}`,
      subtitle: needsResponse[0].title.slice(0, 60),
      icon: "alert",
      color: "amber",
      badge: { text: "Action needed", variant: "warning" },
    });
  }

  if (tickets.length === 0) {
    action_cards.push({
      title: "Get Started",
      subtitle: "Set up your account and explore features",
      icon: "zap",
      color: "emerald",
      badge: { text: "New", variant: "info" },
    });
  }

  if (kbCategories.length > 0) {
    action_cards.push({
      title: kbCategories[0] || "Browse Knowledge",
      subtitle: `Explore articles about ${kbCategories[0]?.toLowerCase() || "common topics"}`,
      icon: "book",
      color: "sky",
      badge: { text: "Recommended", variant: "success" },
    });
  }

  action_cards.push({
    title: "Create a ticket",
    subtitle: "Report a problem or request help from our team",
    icon: "plus",
    color: "orange",
  });

  action_cards.push({
    title: "What's new?",
    subtitle: "Latest updates and announcements",
    icon: "newspaper",
    color: "violet",
  });

  const blocks: string[] = [];
  if (needsResponse.length > 0) blocks.push("track_needs_response");
  if (tickets.some((t) => t.stage?.state?.name === "open" && !t.needs_response))
    blocks.push("track_active_issues");
  if (conversations.length > 0) blocks.push("track_recent_convos");
  if (tickets.length > 0) blocks.push("track_summary");
  if (tickets.length === 0 && conversations.length === 0) blocks.push("learn_onboarding");
  blocks.push("learn_explore");

  const suggestions: string[] = [];
  if (needsResponse.length > 0 && needsResponse[0]) {
    suggestions.push(`What's happening with ${needsResponse[0].display_id}?`);
  }
  if (tickets.length === 0) {
    suggestions.push("How do I get started?");
  }
  suggestions.push("I need help with something");

  return {
    greeting: { headline, subtext },
    suggestions: suggestions.slice(0, suggestionCount),
    action_cards: action_cards.slice(0, cardCount),
    blocks: blocks.slice(0, 4),
  };
}

// ─── Main Assembly Function ─────────────────────────────────────

export interface PersonalizedPage {
  greeting: { headline: string; subtext: string };
  actionCards: ActionCard[];
  sidebarBlocks: Block[];
}

export async function assembleBlocks(
  signals: UserSignals,
  apiCall?: (
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ) => Promise<unknown>,
  personalizationConfig?: PersonalizationConfig
): Promise<PersonalizedPage> {
  const config = personalizationConfig || DEFAULT_PERSONALIZATION;
  const userContext = buildUserContext(signals, config.contextSignals);

  // Try LLM first, fall back to rules
  let personalization: LLMPersonalization;
  if (apiCall) {
    const llmResult = await callLLM(userContext, config, apiCall);
    personalization = llmResult || fallbackAssemble(
      signals,
      config.actionCardCount,
      config.suggestionCount
    );
  } else {
    personalization = fallbackAssemble(
      signals,
      config.actionCardCount,
      config.suggestionCount
    );
  }

  const { tickets, conversations, directories } = signals;
  const sidebarBlocks: Block[] = [];

  const needsResponse = tickets.filter((t) => t.needs_response);
  const activeTickets = tickets.filter(
    (t) =>
      !t.needs_response &&
      (t.stage?.state?.name === "open" || t.stage?.state?.name === "in_progress")
  );

  const blockDataMap: Record<string, Block | null> = {
    track_needs_response: needsResponse.length > 0
      ? { type: "track_needs_response", layer: "track", priority: 0, data: { tickets: needsResponse } }
      : null,
    track_active_issues: activeTickets.length > 0
      ? { type: "track_active_issues", layer: "track", priority: 0, data: { tickets: activeTickets } }
      : null,
    track_recent_convos: conversations.length > 0
      ? { type: "track_recent_convos", layer: "track", priority: 0, data: { conversations } }
      : null,
    track_summary: tickets.length > 0
      ? { type: "track_summary", layer: "track", priority: 0, data: {
          open: tickets.filter((t) => t.stage?.state?.name === "open").length,
          inProgress: tickets.filter((t) => t.stage?.state?.name === "in_progress").length,
          needsResponse: needsResponse.length,
          resolved: tickets.filter((t) => t.stage?.state?.name === "closed" || t.stage?.state?.name === "resolved").length,
          total: tickets.length,
        }}
      : null,
    learn_onboarding: { type: "learn_onboarding", layer: "learn", priority: 0, data: { directories: directories.filter((d) => d.has_descendant_articles).slice(0, 3) } },
    learn_explore: directories.length > 0
      ? { type: "learn_explore", layer: "learn", priority: 0, data: { directories: directories.filter((d) => d.has_descendant_articles) } }
      : null,
  };

  let priority = 90;
  for (const blockType of personalization.blocks) {
    const block = blockDataMap[blockType];
    if (block) {
      block.priority = priority;
      sidebarBlocks.push(block);
      priority -= 10;
    }
  }

  return {
    greeting: personalization.greeting,
    actionCards: personalization.action_cards || [],
    sidebarBlocks,
  };
}
