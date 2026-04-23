import type { PortalConfig } from "../types";

/**
 * Bill.com Help Center preset configuration.
 *
 * Brand reference: https://help.bill.com/direct/s/
 * Colors extracted from Bill.com CSS variables + main site.
 * Layout modeled after their Salesforce Experience Cloud help center.
 */
export const BILL_CONFIG: Partial<PortalConfig> = {
  branding: {
    orgName: "BILL",
    logoUrl: null, // Will show "BILL" text badge
    faviconUrl: null,
    headerImageUrl: null,
    // Bill.com primary blue from CSS: rgb(1, 118, 211) → HSL
    accentColor: "210 99% 42%",
    theme: "light",
    customStylesheetUrl: null,
    borderRadius: "lg",
    fontFamily: null,
  },

  content: {
    welcomeHeadline: null, // Let AI personalize
    welcomeSubtext: null,
    searchPlaceholder: "Search for help articles, FAQs, and more...",
    assistantName: "BILL Assistant",
    assistantIcon: "zap",
    portalTitle: "Help Center",
    newTicketLabel: "Submit a Request",
  },

  personalization: {
    systemPrompt: `You are the BILL Help Center personalization engine. BILL is an AI-powered financial operations platform used by millions of businesses for accounts payable (AP), accounts receivable (AR), spend management, and expense tracking.

Given a user's context, decide what they should see on their help center homepage.

Return a JSON object with these four fields:

1. "greeting" — {"headline": string, "subtext": string}. Personalize based on their situation. Reference specific BILL products if relevant (Payables, Receivables, Spend & Expense, Cards). Keep the headline under 12 words.

2. "action_cards" — array of exactly 4 cards. Each card is:
   {"title": string, "subtitle": string, "icon": string, "color": string, "badge"?: {"text": string, "variant": "warning"|"success"|"info"}}

   Cards should be specific to THIS user. Examples:
   - User with payment issues → "Troubleshoot Payments — Fix failed ACH or wire transfers"
   - User with sync errors → "Fix Sync Issues — Resolve QuickBooks or NetSuite sync problems"
   - New user → "Get Started with BILL — Set up your account in minutes"
   - User with pending approvals → "Pending Approvals — Review and approve 3 pending bills"

   icon must be one of: "settings", "shield", "plus", "newspaper", "zap", "book", "alert", "star", "search", "users"
   color must be one of: "violet", "rose", "orange", "sky", "emerald", "amber", "slate"

3. "suggestions" — array of 3 questions specific to their context about BILL products.

4. "blocks" — ordered array of sidebar block types. Only include blocks with data. Max 4.

Respond with ONLY valid JSON.`,
    contextSignals: [
      "user_identity",
      "tickets",
      "conversations",
      "kb_directories",
      "articles_viewed",
    ],
    temperature: 0.3,
    maxTokens: 600,
    actionCardCount: 4,
    suggestionCount: 3,
  },

  ticketCreation: {
    aiAssist: true,
    aiAssistPrompt: `You are a BILL Help Center ticket assistant. BILL is a financial operations platform (AP, AR, Spend & Expense). The user is describing a problem.

You will receive the user's description AND a list of available form fields. Extract values for every field you can infer.

Return a JSON object:
{
  "suggested_title": "concise title referencing the specific BILL feature (under 80 chars)",
  "suggested_subtype": null,
  "suggested_fields": {"field_name": "value", ...},
  "missing_info": ["only ask for CRITICAL missing info — max 2"],
  "cleaned_description": "structured: Problem statement, Impact, Steps to reproduce (if applicable)"
}

Rules for suggested_fields:
- payment_method: use exact value from allowed list (ach, wire, check, credit_card, virtual_card)
- product_area: use exact value (payables, receivables, spend_and_expense, cards, integrations, account_settings)
- priority_level: infer from urgency language (low, medium, high, critical). "URGENT"/"blocking"/"outage" = critical. "minor"/"cosmetic" = low.
- error_code: extract exact error code mentioned (e.g., "PMT-4022")
- amount_affected: extract dollar amounts as numbers (12500 not "$12,500")
- date_of_occurrence: convert relative dates to ISO (yesterday = today minus 1 day)
- is_recurring_issue: true if user says "again", "third time", "keeps happening"
- affected_users_count: extract number of affected people

Only include fields you can confidently infer. Don't guess.
Respond with ONLY valid JSON.`,
    deflection: true,
    deflectionPrompt: `You are a BILL Help Center assistant. Before creating a ticket, check if knowledge base articles can resolve the issue.

Given the user's problem and available articles, return JSON:
{
  "relevant_articles": [{"title": "...", "id": "...", "reason": "why this helps with their specific issue"}],
  "can_resolve": true/false,
  "message": "helpful message — if articles help, explain how. If not, acknowledge their issue and say you'll help create a ticket."
}

Max 3 articles. Only include genuinely relevant ones.
Respond with ONLY valid JSON.`,
    statusPageCheck: true,
    statusPageUrl: "https://status.bill.com",
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
    seo: true,
    orgDashboard: false,
    poweredByDevrev: true,
  },

  styles: {
    colors: {
      // Bill.com navy as text/foreground
      primary: "210 99% 42%",         // #0176D3 — Bill blue
      primaryForeground: "0 0% 100%",
      background: "210 17% 97%",      // Light blue-gray
      foreground: "213 90% 19%",      // #032D60 — Bill navy
      muted: "210 14% 93%",
      mutedForeground: "213 20% 45%",
      border: "210 14% 88%",
      card: "0 0% 100%",
      cardForeground: "213 90% 19%",
      accent: "30 100% 61%",          // Bill orange accent
      accentForeground: "213 90% 19%",
      ring: "210 99% 42%",
      success: "145 50% 35%",
      warning: "30 98% 61%",
    },
    cardStyle: "flat",
    buttonStyle: "rounded",
    // Blue gradient instead of orange
    heroGradient: ["blue-50", "indigo-50", "sky-50"],
  },

  footer: {
    links: [
      { label: "Investor Relations", url: "https://investor.bill.com" },
      { label: "Press", url: "https://www.bill.com/press-release" },
      { label: "Newsroom", url: "https://www.bill.com/about-us/newsroom" },
      { label: "Security", url: "https://www.bill.com/security" },
      { label: "Status", url: "https://status.bill.com" },
    ],
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/billcom" },
      { platform: "linkedin", url: "https://www.linkedin.com/company/bill" },
    ],
  },

  navigation: {
    items: [
      { label: "Home", href: "", icon: "home" },
      { label: "My Requests", href: "/tickets", icon: "ticket" },
      { label: "Knowledge Base", href: "/directories", icon: "book" },
    ],
  },
};
