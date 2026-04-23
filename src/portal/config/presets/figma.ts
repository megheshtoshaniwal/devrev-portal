import type { PortalConfig } from "../types";

/**
 * Figma Help Center preset — demonstrates building a completely custom
 * help center UI using the DevRev SDK.
 *
 * Design reference: https://help.figma.com/hc/en-us
 */
export const FIGMA_CONFIG: Partial<PortalConfig> = {
  branding: {
    orgName: "Figma",
    logoUrl: null,
    faviconUrl: null,
    headerImageUrl: null,
    accentColor: "249 72% 58%", // #5551FF in HSL
    theme: "light",
    customStylesheetUrl: null,
    borderRadius: "sm",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  content: {
    welcomeHeadline: "Hello, how can we help?",
    welcomeSubtext: "Find answers and inspiration on all things Figma.",
    searchPlaceholder: "Search for help articles...",
    assistantName: "Figma AI",
    assistantIcon: "sparkles",
    portalTitle: "Figma Learn",
    newTicketLabel: "Contact support",
  },

  personalization: {
    systemPrompt: `You are Figma's help center personalization engine. Given a user's context, decide what they should see on their homepage.

Return a JSON object with these four fields:

1. "greeting" — {"headline": string, "subtext": string}. Personal, warm, design-focused. Mention their specific situation.

2. "action_cards" — array of exactly 4 cards. Each card:
   {"title": string, "subtitle": string, "icon": string, "color": string, "badge"?: {"text": string, "variant": "warning"|"success"|"info"}}
   icon: "settings", "shield", "plus", "newspaper", "zap", "book", "alert", "star", "search", "users"
   color: "violet", "rose", "orange", "sky", "emerald", "amber", "slate"

3. "suggestions" — array of 3 questions specific to this user's Figma usage.

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
    aiAssistPrompt: `You are Figma's support assistant. Help users create well-structured tickets about Figma Design, FigJam, Dev Mode, Figma Slides, or account/billing issues. Extract as much detail as possible from their description.`,
    deflection: true,
    deflectionPrompt: `You are Figma's help center search assistant. Given a user's problem description, find the most relevant Figma help articles. Focus on practical solutions.`,
    statusPageCheck: true,
    statusPageUrl: "https://status.figma.com",
    journeyContext: true,
    directFormFallback: true,
    deflectionMaxResults: 3,
  },

  layout: {
    homepage: {
      mainBlocks: ["hero", "action_cards", "chat_input", "conversation_thread"],
      sidebarPosition: "none",
      sidebarDefaultTab: "knowledge",
      actionCardColumns: 3,
      showHero: true,
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
      primary: "249 72% 58%",       // Figma purple #5551FF
      background: "0 0% 100%",       // Pure white
      foreground: "0 0% 0%",         // Pure black
      muted: "0 0% 96%",             // Light gray
      border: "0 0% 90%",            // #E5E5E5
      card: "0 0% 100%",             // White
      accent: "45 100% 58%",         // Figma yellow #FFCD29
      destructive: "0 84% 60%",
      success: "152 60% 42%",
      warning: "38 100% 55%",
    },
    cardStyle: "flat",
    buttonStyle: "rounded",
    heroGradient: ["249 72% 58%", "249 72% 58%", "45 100% 58%"],
  },

  footer: {
    links: [
      { label: "Community forum", url: "https://forum.figma.com" },
      { label: "Blog", url: "https://www.figma.com/blog" },
      { label: "Best practices", url: "/directories" },
      { label: "Status", url: "https://status.figma.com" },
    ],
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/figma" },
      { platform: "youtube", url: "https://youtube.com/figma" },
      { platform: "instagram", url: "https://instagram.com/figma" },
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
