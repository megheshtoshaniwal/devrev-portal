import type { PortalConfig } from "./types";

/**
 * Default portal configuration.
 * Every value here is a sensible fallback that works out of the box.
 * Org-specific config from the portal preferences API overrides these.
 */
export const DEFAULT_CONFIG: PortalConfig = {
  branding: {
    orgName: "Help Center",
    logoUrl: null,
    faviconUrl: null,
    headerImageUrl: null,
    accentColor: "18 100% 52%",
    theme: "light",
    customStylesheetUrl: null,
    borderRadius: "lg",
    fontFamily: null,
  },

  content: {
    welcomeHeadline: null, // null = LLM-generated
    welcomeSubtext: null,  // null = LLM-generated
    searchPlaceholder: "Ask anything...",
    assistantName: "Flash",
    assistantIcon: "zap",
    portalTitle: "Help Center",
    newTicketLabel: "New Ticket",
  },

  personalization: {
    systemPrompt: `You are the portal personalization engine for a customer support portal. Given a user's context, decide exactly what they should see on their homepage.

Return a JSON object with these four fields:

1. "greeting" — {"headline": string, "subtext": string}. The headline is personal, concise (under 12 words), reflects their situation. The subtext is one guiding sentence. Never be generic.

2. "action_cards" — array of exactly 4 cards. Each card is:
   {"title": string, "subtitle": string, "icon": string, "color": string, "badge"?: {"text": string, "variant": "warning"|"success"|"info"}}

   These are the SMART RECOMMENDATIONS — the most important thing on the page. Each card must be specific to THIS user based on their tickets, conversations, and context.

   icon must be one of: "settings", "shield", "plus", "newspaper", "zap", "book", "alert", "star", "search", "users"
   color must be one of: "violet", "rose", "orange", "sky", "emerald", "amber", "slate"

3. "suggestions" — array of 3 questions the user might want to ask the AI assistant RIGHT NOW, specific to their context.

4. "blocks" — ordered array of sidebar block types: "track_needs_response", "track_active_issues", "track_recent_convos", "track_summary", "learn_onboarding", "learn_explore". Only include blocks that have data. Max 4.

IMPORTANT: The action_cards are your main output. They must feel like a smart assistant who KNOWS this user picked exactly the 4 most relevant things for them right now. Never show generic cards.

Respond with ONLY valid JSON.`,
    contextSignals: [
      "user_identity",
      "tickets",
      "conversations",
      "kb_directories",
    ],
    temperature: 0.3,
    maxTokens: 600,
    actionCardCount: 4,
    suggestionCount: 3,
  },

  ticketCreation: {
    aiAssist: true,
    aiAssistPrompt: `You are a support ticket assistant. The user is describing a problem. Your job is to help them create a well-structured ticket by extracting as much information as possible from their description.

You will receive the user's description AND a list of available form fields (with their types and allowed values). Extract values for every field you can infer from the description.

Return a JSON object:
{
  "suggested_title": "concise title (under 80 chars)",
  "suggested_subtype": "best matching subtype name from the available subtypes, or null",
  "suggested_fields": {"field_name": "value", ...},
  "missing_info": ["only ask for CRITICAL info that cannot be inferred — max 2 questions"],
  "cleaned_description": "the user's description, cleaned up and structured"
}

Rules for suggested_fields:
- For enum fields: use the exact allowed_value string (e.g., "ach" not "ACH")
- For bool fields: use true or false
- For int/double fields: use numbers (e.g., 12500 not "$12,500")
- For date fields: use ISO format "YYYY-MM-DD" (infer from relative dates like "yesterday")
- For text fields: extract the exact value mentioned (e.g., error codes)
- Only include fields you can confidently infer. Don't guess.

For missing_info: only ask if the information is truly critical AND cannot be inferred. If the user's description is rich enough, return empty array.

Respond with ONLY valid JSON.`,
    deflection: true,
    deflectionPrompt: `You are a support assistant. The user is about to create a ticket. Before they do, check if any of these knowledge base articles can resolve their issue.

Given the user's problem description and a list of article titles/summaries, return a JSON object:
{
  "relevant_articles": [{"title": "...", "id": "...", "reason": "one sentence why this helps"}],
  "can_resolve": true/false,
  "message": "a helpful message to the user — if articles can help, explain how. If not, say you'll help them create a ticket."
}

Max 3 relevant articles. Only include articles that ACTUALLY help with this specific problem.
Respond with ONLY valid JSON.`,
    statusPageCheck: false,
    statusPageUrl: null,
    journeyContext: true,
    directFormFallback: true,
    deflectionMaxResults: 3,
  },

  layout: {
    homepage: {
      mainBlocks: ["hero", "action_cards", "chat_input"],
      sidebarPosition: "right",
      sidebarDefaultTab: "feed",
      actionCardColumns: 4,
      showHero: true,
    },
    article: {
      showToc: true,
      tocPosition: "right",
      tocMinHeadings: 3,
    },
    maxWidth: "7xl",
  },

  features: {
    ticketCreation: true,
    search: true,
    aiSummary: true,
    askFlash: true,
    articleVoting: true,
    articleSubscribe: true,
    ticketMatching: true,
    publicPortal: false,
    seo: false,
    orgDashboard: false,
    poweredByDevrev: true,
  },

  styles: {
    colors: {},
    cardStyle: "flat",
    buttonStyle: "rounded",
    heroGradient: ["amber-50", "orange-50", "rose-50"],
  },

  footer: {
    links: [],
    socialLinks: [],
  },

  navigation: {
    items: [
      { label: "Home", href: "", icon: "home" },
      { label: "Tickets", href: "/tickets", icon: "ticket" },
      { label: "Knowledge", href: "/directories", icon: "book" },
    ],
  },
};
