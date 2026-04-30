import type { PortalConfig } from "../types";

/**
 * Maple Software Help Center preset
 * Design reference: stripe.com (clean, professional, indigo accent)
 * Brand: maplesoftware.net
 */
export const MAPLE_CONFIG: Partial<PortalConfig> = {
  branding: {
    orgName: "Maple Software",
    logoUrl: null,
    faviconUrl: null,
    headerImageUrl: null,
    accentColor: "249 53% 61%", // #635bff Stripe indigo in HSL
    theme: "light",
    customStylesheetUrl: null,
    borderRadius: "md",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  content: {
    welcomeHeadline: "How can we help?",
    welcomeSubtext:
      "Search our knowledge base, get AI-powered answers, or reach out to our support team.",
    searchPlaceholder: "Search for help articles...",
    assistantName: "Maple AI",
    assistantIcon: "sparkles",
    portalTitle: "Help Center",
    newTicketLabel: "Contact support",
  },

  personalization: {
    systemPrompt: `You are Maple Software's help center personalization engine. Maple Software is a business services platform.

Given a user's context, decide what they should see on their homepage.

Return a JSON object with these four fields:

1. "greeting" — {"headline": string, "subtext": string}. Professional, helpful. Mention their specific situation.

2. "action_cards" — array of exactly 4 cards. Each card:
   {"title": string, "subtitle": string, "icon": string, "color": string, "badge"?: {"text": string, "variant": "warning"|"success"|"info"}}
   icon: "settings", "shield", "plus", "newspaper", "zap", "book", "alert", "star", "search", "users"
   color: "violet", "rose", "orange", "sky", "emerald", "amber", "slate"

3. "suggestions" — array of 3 questions specific to this user's context.

4. "blocks" — ordered array of sidebar block types. Only include blocks with data. Max 4.

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
    aiAssistPrompt: `You are Maple Software's support assistant. Help users create well-structured support tickets about their business services, account management, billing, integrations, or technical issues. Extract as much detail as possible.

Return a JSON object:
{
  "suggested_title": "concise ticket title",
  "cleaned_description": "well-structured description",
  "suggested_subtype": "best matching subtype or null",
  "suggested_fields": { "field_name": "extracted_value", ... },
  "missing_info": ["question 1", "question 2"]
}

For numeric fields, extract just the number. For enum fields, pick the closest allowed value.`,
    deflection: true,
    deflectionPrompt: `You are Maple Software's help center search assistant. Given a user's problem description, find the most relevant help articles. Focus on practical solutions.

Return a JSON object:
{
  "relevant_articles": [{"title": "...", "id": "...", "reason": "..."}],
  "can_resolve": true/false,
  "message": "brief assessment"
}`,
    statusPageCheck: false,
    statusPageUrl: null,
    journeyContext: true,
    directFormFallback: true,
    deflectionMaxResults: 3,
  },

  layout: {
    homepage: {
      mainBlocks: ["hero", "action_cards", "chat_input", "conversation_thread"],
      sidebarPosition: "none",
      actionCardColumns: 3,
      showHero: true,
      sidebarDefaultTab: "knowledge",
    },
    article: {
      showToc: true,
      tocPosition: "right",
      tocMinHeadings: 3,
    },
    maxWidth: "6xl",
  },

  features: {
    ticketCreation: true,
    search: true,
    aiSummary: true,
    askFlash: true,
    articleVoting: true,
    articleSubscribe: false,
    ticketMatching: true,
    publicPortal: true,
    seo: true,
    orgDashboard: false,
    poweredByDevrev: false,
  },

  styles: {
    colors: {
      primary: "249 53% 61%", // #635bff Stripe indigo
      background: "0 0% 100%",
      foreground: "210 40% 15%", // #0a2540 Stripe navy
      muted: "210 25% 97%", // #f6f9fc Stripe light blue
      border: "210 20% 90%", // #e7ecf1
      card: "0 0% 100%",
      accent: "171 100% 41%", // #00d4aa Stripe green/teal
      destructive: "0 84% 60%",
      success: "152 60% 42%",
      warning: "38 100% 55%",
    },
    cardStyle: "elevated",
    buttonStyle: "pill",
    heroGradient: ["249 53% 61%", "210 40% 15%", "171 100% 41%"],
  },

  footer: {
    links: [
      { label: "Help Center", url: "/directories" },
      {
        label: "Website",
        url: "https://www.maplesoftware.net",
      },
    ],
    socialLinks: [],
  },

  navigation: {
    items: [
      { label: "Home", href: "", icon: "home" },
      { label: "Knowledge Base", href: "/directories", icon: "book" },
      { label: "My Requests", href: "/tickets", icon: "ticket" },
    ],
  },
};
