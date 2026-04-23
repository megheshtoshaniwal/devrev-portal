// ─── Portal Configuration Types ─────────────────────────────────
// One config object drives the entire portal.
// Three resolution layers: defaults → API preferences → local overrides.

import type { PersonalizationConfig } from "@/devrev-sdk/personalization/types";

export interface PortalConfig {
  branding: BrandingConfig;
  content: ContentConfig;
  personalization: PersonalizationConfig;
  ticketCreation: TicketCreationConfig;
  layout: LayoutConfig;
  features: FeatureFlags;
  styles: StyleOverrides;
  footer: FooterConfig;
  navigation: NavigationConfig;
}

// ─── Branding ───────────────────────────────────────────────────

export interface BrandingConfig {
  /** Organization display name */
  orgName: string;
  /** Logo URL (header + footer) */
  logoUrl: string | null;
  /** Favicon URL */
  faviconUrl: string | null;
  /** Header background image URL */
  headerImageUrl: string | null;
  /** Primary accent color in HSL: "18 100% 52%" */
  accentColor: string;
  /** Color theme */
  theme: "light" | "dark";
  /** Optional custom CSS stylesheet URL */
  customStylesheetUrl: string | null;
  /** Border radius scale: "sm" (4px), "md" (8px), "lg" (14px), "xl" (20px) */
  borderRadius: "sm" | "md" | "lg" | "xl";
  /** Font family override */
  fontFamily: string | null;
}

// ─── Content ────────────────────────────────────────────────────

export interface ContentConfig {
  /** Homepage headline (above Flash agent) */
  welcomeHeadline: string | null;
  /** Homepage subtext */
  welcomeSubtext: string | null;
  /** Search bar placeholder */
  searchPlaceholder: string;
  /** AI assistant name */
  assistantName: string;
  /** AI assistant icon variant */
  assistantIcon: "zap" | "sparkles" | "bot" | "brain" | "star";
  /** Help center title (in header) */
  portalTitle: string;
  /** Ticket creation button label */
  newTicketLabel: string;
}

// ─── Personalization Engine ─────────────────────────────────────
// Types owned by the SDK — re-exported here for convenience.

export type { PersonalizationConfig, ContextSignal } from "@/devrev-sdk/personalization/types";

// ─── Ticket Creation ────────────────────────────────────────────

export interface TicketCreationConfig {
  /** AI-assisted form filling — infer subtype, suggest title, prompt for missing fields */
  aiAssist: boolean;
  /** AI prompt for form assistance — instructs the LLM how to help with ticket creation */
  aiAssistPrompt: string;
  /** Deflection — search KB articles before ticket creation, suggest relevant content */
  deflection: boolean;
  /** Deflection prompt — instructs the LLM how to find and present relevant articles */
  deflectionPrompt: string;
  /** Status page integration — check for active incidents before ticket creation */
  statusPageCheck: boolean;
  /** Status page URL — org's public status page to check for outages */
  statusPageUrl: string | null;
  /** Journey context — attach which articles the user viewed before creating the ticket */
  journeyContext: boolean;
  /** Show direct form — allow users to skip AI and fill the form manually */
  directFormFallback: boolean;
  /** Max deflection results to show */
  deflectionMaxResults: number;
}

// ─── Layout ─────────────────────────────────────────────────────

export interface LayoutConfig {
  /** Homepage layout */
  homepage: HomepageLayout;
  /** Article page layout */
  article: ArticleLayout;
  /** Max content width: "3xl" | "5xl" | "6xl" | "7xl" | "full" */
  maxWidth: string;
}

export interface HomepageLayout {
  /** Block order on the main column */
  mainBlocks: HomepageBlock[];
  /** Sidebar position */
  sidebarPosition: "right" | "left" | "none";
  /** Sidebar default tab */
  sidebarDefaultTab: "feed" | "knowledge";
  /** Action card grid columns */
  actionCardColumns: 2 | 3 | 4;
  /** Show hero section with Flash */
  showHero: boolean;
}

export type HomepageBlock =
  | "hero"
  | "action_cards"
  | "chat_input"
  | "conversation_thread";

export interface ArticleLayout {
  /** Show TOC sidebar */
  showToc: boolean;
  /** TOC position */
  tocPosition: "right" | "left";
  /** Minimum headings required to show TOC */
  tocMinHeadings: number;
}

// ─── Feature Flags ──────────────────────────────────────────────

export interface FeatureFlags {
  /** Enable ticket creation */
  ticketCreation: boolean;
  /** Enable search */
  search: boolean;
  /** Enable AI summary on articles */
  aiSummary: boolean;
  /** Enable Ask Flash on articles */
  askFlash: boolean;
  /** Enable article voting (helpful/not helpful) */
  articleVoting: boolean;
  /** Enable article subscription */
  articleSubscribe: boolean;
  /** Enable "related to your issue" ticket matching */
  ticketMatching: boolean;
  /** Enable public portal (unauthenticated access) */
  publicPortal: boolean;
  /** Enable SEO */
  seo: boolean;
  /** Enable org admin dashboard */
  orgDashboard: boolean;
  /** Show powered by DevRev */
  poweredByDevrev: boolean;
}

// ─── Style Overrides ────────────────────────────────────────────

export interface StyleOverrides {
  /** Override color tokens (HSL values without hsl() wrapper) */
  colors: Partial<ColorTokens>;
  /** Card style */
  cardStyle: "flat" | "elevated" | "outlined";
  /** Button style */
  buttonStyle: "rounded" | "pill" | "square";
  /** Hero gradient colors (from, via, to) — Tailwind color classes */
  heroGradient: [string, string, string];
}

export interface ColorTokens {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  card: string;
  cardForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  ring: string;
  success: string;
  warning: string;
}

// ─── Footer ─────────────────────────────────────────────────────

export interface FooterConfig {
  /** Text links in the footer */
  links: Array<{ label: string; url: string }>;
  /** Social media links */
  socialLinks: Array<{
    platform: "twitter" | "linkedin" | "github" | "facebook" | "youtube" | "instagram";
    url: string;
  }>;
}

// ─── Navigation ─────────────────────────────────────────────────

export interface NavigationConfig {
  /** Nav items displayed in the header */
  items: Array<{
    label: string;
    href: string;
    icon?: "home" | "ticket" | "book" | "search" | "chart" | "message";
  }>;
}
