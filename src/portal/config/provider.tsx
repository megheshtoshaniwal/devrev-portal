"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { PortalConfig, ColorTokens } from "./types";
import { DEFAULT_CONFIG } from "./defaults";

// ─── Context ────────────────────────────────────────────────────

interface PortalConfigContextValue {
  config: PortalConfig;
  loading: boolean;
  basePath: string;
}

export const PortalConfigContext = createContext<PortalConfigContextValue>({
  config: DEFAULT_CONFIG,
  loading: true,
  basePath: "",
});

export function usePortalConfig() {
  return useContext(PortalConfigContext);
}

// ─── Provider ───────────────────────────────────────────────────

interface PortalConfigProviderProps {
  children: ReactNode;
  /** Override config for development/testing */
  overrides?: Partial<PortalConfig>;
}

export function PortalConfigProvider({
  children,
  overrides,
}: PortalConfigProviderProps) {
  const [config, setConfig] = useState<PortalConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  // Derive basePath from URL
  const [basePath, setBasePath] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/");
      // Expected: /[locale]/[portalSlug]/...
      if (parts.length >= 3) {
        setBasePath(`/${parts[1]}/${parts[2]}`);
      }
    }
  }, []);

  // Fetch config from both standard portal preferences + extended config artifact
  useEffect(() => {
    async function loadConfig() {
      try {
        // Fetch both config sources in parallel
        const token = typeof window !== "undefined"
          ? (localStorage.getItem("devrev_session_token") ||
             sessionStorage.getItem("devrev_session_token"))
          : null;

        const headers: Record<string, string> = {};
        if (token) headers.Authorization = token;

        const [portalRes, extendedRes] = await Promise.all([
          fetch("/api/portal-config").catch(() => null),
          fetch("/api/portal-extended-config", { headers }).catch(() => null),
        ]);

        const portalPrefs = portalRes?.ok ? await portalRes.json() : null;
        const extendedData = extendedRes?.ok ? await extendedRes.json() : null;

        // Extended config endpoint returns { portal_preferences, extended_config }
        const apiPrefs = extendedData?.portal_preferences || portalPrefs;
        const extendedConfig = extendedData?.extended_config;

        // Merge: defaults ← portal preferences ← extended config ← local overrides
        let merged = mergeConfig(DEFAULT_CONFIG, apiPrefs || {}, undefined);
        if (extendedConfig) {
          merged = deepMerge(merged, extendedConfig) as PortalConfig;
        }
        if (overrides) {
          merged = deepMerge(merged, overrides) as PortalConfig;
        }
        setConfig(merged);
      } catch {
        setConfig(overrides ? mergeConfig(DEFAULT_CONFIG, {}, overrides) : DEFAULT_CONFIG);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [overrides]);

  // Inject CSS variables from config
  useEffect(() => {
    if (loading) return;
    applyTheme(config);
  }, [config, loading]);

  return (
    <PortalConfigContext.Provider value={{ config, loading, basePath }}>
      {children}
    </PortalConfigContext.Provider>
  );
}

// ─── Theme Injection ────────────────────────────────────────────

function applyTheme(config: PortalConfig) {
  const root = document.documentElement;
  const { branding, styles } = config;

  // Accent color → primary
  if (branding.accentColor) {
    root.style.setProperty("--primary", branding.accentColor);
    root.style.setProperty("--ring", branding.accentColor);
  }

  // Color token overrides
  const colorMap: Record<keyof ColorTokens, string> = {
    primary: "--primary",
    primaryForeground: "--primary-foreground",
    background: "--background",
    foreground: "--foreground",
    muted: "--muted",
    mutedForeground: "--muted-foreground",
    border: "--border",
    card: "--card",
    cardForeground: "--card-foreground",
    accent: "--accent",
    accentForeground: "--accent-foreground",
    destructive: "--destructive",
    ring: "--ring",
    success: "--success",
    warning: "--warning",
  };

  for (const [key, cssVar] of Object.entries(colorMap)) {
    const value = styles.colors[key as keyof ColorTokens];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  // Border radius
  const radiusMap = { sm: "0.25rem", md: "0.5rem", lg: "0.875rem", xl: "1.25rem" };
  root.style.setProperty("--radius", radiusMap[branding.borderRadius] || radiusMap.lg);

  // Font family
  if (branding.fontFamily) {
    root.style.setProperty("--font-sans", branding.fontFamily);
  }

  // Dark theme
  if (branding.theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Custom stylesheet
  if (branding.customStylesheetUrl) {
    let link = document.getElementById("portal-custom-css") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "portal-custom-css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = branding.customStylesheetUrl;
  }
}

// ─── Config Merging ─────────────────────────────────────────────

/**
 * Merge portal API response with defaults and local overrides.
 * API config maps from the portal preferences API format to our config format.
 */
function mergeConfig(
  defaults: PortalConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiResponse: any,
  overrides?: Partial<PortalConfig>
): PortalConfig {
  // Map API response fields to our config structure
  const fromApi: Partial<PortalConfig> = {};

  if (apiResponse) {
    // Branding from API
    if (apiResponse.configuration || apiResponse.styling) {
      const conf = apiResponse.configuration || {};
      const styling = apiResponse.styling || {};

      fromApi.branding = {
        ...defaults.branding,
        ...(conf.orgName && { orgName: conf.orgName }),
        ...(conf.orgLogo?.url && { logoUrl: conf.orgLogo.url }),
        ...(conf.orgFavicon?.url && { faviconUrl: conf.orgFavicon.url }),
        ...(styling.headerImage?.url && { headerImageUrl: styling.headerImage.url }),
        ...(styling.accentColor && { accentColor: parseAccentColor(styling.accentColor) }),
        ...(styling.theme && { theme: styling.theme }),
        ...(styling.customizationConfiguration?.stylesheet?.previewUrl && {
          customStylesheetUrl: styling.customizationConfiguration.stylesheet.previewUrl,
        }),
      };

      // Content from API
      fromApi.content = {
        ...defaults.content,
        ...(conf.greetingText && { welcomeHeadline: conf.greetingText }),
        ...(conf.searchPlaceholder && { searchPlaceholder: conf.searchPlaceholder }),
        ...(conf.helpCenter && { portalTitle: conf.helpCenter }),
      };

      // Features from API
      fromApi.features = {
        ...defaults.features,
        ...(conf.ticketCreationEnabled !== undefined && { ticketCreation: conf.ticketCreationEnabled }),
        ...(conf.publicPortalEnabled !== undefined && { publicPortal: conf.publicPortalEnabled }),
        ...(conf.seoEnabled !== undefined && { seo: conf.seoEnabled }),
      };

      // Footer from API
      if (conf.footerGroup) {
        const textLinks = (conf.footerGroup.textLinks || []).map(
          (l: { label: string; url: string }) => ({ label: l.label, url: l.url })
        );
        const socialLinks = (conf.footerGroup.socialMediaLinks || [])
          .filter((l: { enabled: boolean }) => l.enabled)
          .map((l: { platform: string; url: string }) => ({
            platform: l.platform,
            url: l.url,
          }));

        fromApi.footer = { links: textLinks, socialLinks };
      }
    }
  }

  // Deep merge: defaults ← API ← overrides
  return deepMerge(deepMerge(defaults, fromApi), overrides || {}) as PortalConfig;
}

/**
 * Parse accent color from various formats to HSL string.
 * Input could be: "#FF6B35", "rgb(255,107,53)", "18 100% 52%", or HSL object.
 */
function parseAccentColor(color: unknown): string {
  if (typeof color === "string") {
    // Already HSL format
    if (color.match(/^\d+\s+\d+%\s+\d+%$/)) return color;

    // Hex color → HSL
    if (color.startsWith("#")) {
      return hexToHsl(color);
    }

    return color;
  }

  // HSL object from API: { h: number, s: number, l: number }
  if (typeof color === "object" && color !== null) {
    const c = color as { h?: number; s?: number; l?: number };
    if (c.h !== undefined && c.s !== undefined && c.l !== undefined) {
      return `${c.h} ${c.s}% ${c.l}%`;
    }
  }

  return "18 100% 52%"; // default
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
