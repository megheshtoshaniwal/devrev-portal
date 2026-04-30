import type { PortalConfig } from "../types";

/**
 * Axi Help Centre preset — custom help center for Axi (online trading broker).
 *
 * Design reference: https://www.axi.com
 * Colors: Neon green #E0FF38 accent, dark #282424, light #F5F5F5
 */
export const AXI_CONFIG: Partial<PortalConfig> = {
  branding: {
    orgName: "Axi",
    logoUrl: null,
    faviconUrl: null,
    headerImageUrl: null,
    accentColor: "68 100% 61%", // #E0FF38 neon green in HSL
    theme: "light",
    customStylesheetUrl: null,
    borderRadius: "md",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  content: {
    welcomeHeadline: "How can we help you today?",
    welcomeSubtext:
      "Find answers about your trading account, deposits, withdrawals, platforms, and more.",
    searchPlaceholder: "Search for help articles...",
    assistantName: "Axi AI",
    assistantIcon: "zap",
    portalTitle: "Axi Help Centre",
    newTicketLabel: "Request a callback",
  },

  personalization: {
    systemPrompt: `You are Axi's help centre personalization engine. Axi is an online trading broker offering forex, shares, indices, commodities, and crypto CFDs.

Given a user's context, decide what they should see on their homepage.

Return a JSON object with these four fields:

1. "greeting" — {"headline": string, "subtext": string}. Personal, helpful, trading-focused. Mention their specific situation.

2. "action_cards" — array of exactly 4 cards. Each card:
   {"title": string, "subtitle": string, "icon": string, "color": string, "badge"?: {"text": string, "variant": "warning"|"success"|"info"}}
   icon: "settings", "shield", "plus", "newspaper", "zap", "book", "alert", "star", "search", "users"
   color: "violet", "rose", "orange", "sky", "emerald", "amber", "slate"

3. "suggestions" — array of 3 questions specific to this user's trading account.

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
    aiAssistPrompt: `You are Axi's support assistant. Help users create well-structured support tickets about trading accounts, deposits & withdrawals, MT4/MT5 platforms, trading tools, account verification, or general inquiries. Extract as much detail as possible from their description including account numbers, amounts, dates, and platform details.

Return a JSON object:
{
  "suggested_title": "concise ticket title",
  "cleaned_description": "well-structured description",
  "suggested_subtype": "best matching subtype or null",
  "suggested_fields": { "field_name": "extracted_value", ... },
  "missing_info": ["question 1", "question 2"]
}

For numeric fields like amounts, extract just the number. For enum fields, pick the closest allowed value from the list provided.`,
    deflection: true,
    deflectionPrompt: `You are Axi's help centre search assistant. Given a user's problem description about trading (forex, CFDs, crypto, account management, deposits, withdrawals, platform issues), find the most relevant help articles. Focus on practical solutions.

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
      primary: "68 100% 35%", // Darkened neon green for better contrast
      background: "0 0% 100%",
      foreground: "0 4% 15%", // #282424
      muted: "0 0% 96%", // #F5F5F5
      border: "0 0% 88%",
      card: "0 0% 100%",
      accent: "183 51% 53%", // #45C2C7 teal
      destructive: "354 80% 47%", // #D11C36
      success: "152 60% 42%",
      warning: "38 100% 55%",
    },
    cardStyle: "outlined",
    buttonStyle: "rounded",
    heroGradient: ["68 100% 61%", "183 51% 53%", "0 4% 15%"],
  },

  footer: {
    links: [
      { label: "Help Centre", url: "/directories" },
      { label: "Contact Us", url: "https://www.axi.com/int/contact-us" },
      {
        label: "Legal Documentation",
        url: "https://www.axi.com/int/legal-documentation",
      },
      { label: "Axi Blog", url: "https://www.axi.com/int/blog" },
    ],
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/axi_official" },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/axicorp/",
      },
      {
        platform: "facebook",
        url: "https://www.facebook.com/official.axi",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/axi_official/",
      },
      { platform: "youtube", url: "https://www.tiktok.com/@axi_global" },
    ],
  },

  navigation: {
    items: [
      { label: "Home", href: "", icon: "home" },
      { label: "Knowledge Base", href: "/directories", icon: "book" },
      { label: "My Requests", href: "/tickets", icon: "ticket" },
    ],
  },
};
