// Server-side portal config resolution.
//
// Used by the [portalSlug] layout (Server Component) to fetch and merge
// config BEFORE rendering. This means:
// 1. CSS variables are injected server-side (no FOUC)
// 2. Config is passed to children as props (not context)
// 3. Results are cached in Node.js memory (5min TTL)

import type { PortalConfig, ColorTokens } from "./types";
import { DEFAULT_CONFIG } from "./defaults";

const API_BASE = process.env.DEVREV_API_BASE || "https://api.devrev.ai";

// ─── In-Memory Cache ───────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const configCache = new Map<string, CacheEntry<PortalConfig>>();
const CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Main: fetch and resolve config for a portal slug ──────────

export async function getPortalConfig(
  slug: string,
  presetOverrides?: Partial<PortalConfig>
): Promise<PortalConfig> {
  const cacheKey = slug;
  const cached = configCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    // Apply preset on top of cached API config
    return presetOverrides
      ? (deepMerge(cached.data, presetOverrides) as PortalConfig)
      : cached.data;
  }

  const pat = process.env.DEVREV_PAT;
  if (!pat) {
    return presetOverrides
      ? (deepMerge(DEFAULT_CONFIG, presetOverrides) as PortalConfig)
      : DEFAULT_CONFIG;
  }

  try {
    // Fetch portal preferences and extended config in parallel
    const [portalPrefs, extendedConfig] = await Promise.all([
      fetchPortalPreferences(pat, slug),
      fetchExtendedConfig(pat),
    ]);

    // Merge: defaults ← API preferences ← extended config
    let config = mergeApiResponse(DEFAULT_CONFIG, portalPrefs);
    if (extendedConfig) {
      config = deepMerge(config, extendedConfig) as PortalConfig;
    }

    // Cache the API-merged result (before preset, so preset changes don't need cache bust)
    configCache.set(cacheKey, {
      data: config,
      expiresAt: Date.now() + CONFIG_TTL,
    });

    // Apply preset overrides on top
    if (presetOverrides) {
      config = deepMerge(config, presetOverrides) as PortalConfig;
    }

    return config;
  } catch {
    return presetOverrides
      ? (deepMerge(DEFAULT_CONFIG, presetOverrides) as PortalConfig)
      : DEFAULT_CONFIG;
  }
}

// ─── Generate CSS variables string from config ─────────────────

export function generateThemeCss(config: PortalConfig): string {
  const { branding, styles } = config;
  const vars: string[] = [];

  if (branding.accentColor) {
    vars.push(`--primary: ${branding.accentColor}`);
    vars.push(`--ring: ${branding.accentColor}`);
  }

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
    if (value) vars.push(`${cssVar}: ${value}`);
  }

  const radiusMap = { sm: "0.25rem", md: "0.5rem", lg: "0.875rem", xl: "1.25rem" };
  vars.push(`--radius: ${radiusMap[branding.borderRadius] || radiusMap.lg}`);

  if (branding.fontFamily) {
    vars.push(`--font-sans: ${branding.fontFamily}`);
  }

  return `:root { ${vars.join("; ")} }`;
}

// ─── Cache management ──────────────────────────────────────────

export function invalidateConfigCache(slug?: string) {
  if (slug) {
    configCache.delete(slug);
  } else {
    configCache.clear();
  }
}

// ─── Private helpers ───────────────────────────────────────────

async function fetchPortalPreferences(
  pat: string,
  slug: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(
      `${API_BASE}/internal/dev-orgs.portal-preferences.get?slug=${encodeURIComponent(slug)}`,
      {
        headers: { Authorization: `Bearer ${pat}` },
        next: { revalidate: 300 }, // 5min ISR cache at fetch level
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchExtendedConfig(
  pat: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any> | null> {
  const artifactId = process.env.PORTAL_CONFIG_ARTIFACT_ID;
  if (!artifactId) return null;

  try {
    const locateRes = await fetch(
      `${API_BASE}/internal/artifacts.locate?id=${encodeURIComponent(artifactId)}&preview=true`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );
    if (!locateRes.ok) return null;

    const { url } = await locateRes.json();
    if (!url) return null;

    const configRes = await fetch(url);
    if (!configRes.ok) return null;

    return configRes.json();
  } catch {
    return null;
  }
}

function mergeApiResponse(
  defaults: PortalConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiResponse: any
): PortalConfig {
  if (!apiResponse) return defaults;

  const fromApi: Partial<PortalConfig> = {};
  const conf = apiResponse.configuration || apiResponse;
  const styling = apiResponse.styling || {};

  if (conf || styling) {
    fromApi.branding = {
      ...defaults.branding,
      ...(conf.orgName && { orgName: conf.orgName }),
      ...(styling.accentColor && { accentColor: parseAccentColor(styling.accentColor) }),
      ...(styling.theme && { theme: styling.theme }),
    };

    fromApi.content = {
      ...defaults.content,
      ...(conf.greetingText && { welcomeHeadline: conf.greetingText }),
      ...(conf.searchPlaceholder && { searchPlaceholder: conf.searchPlaceholder }),
    };

    fromApi.features = {
      ...defaults.features,
      ...(conf.ticketCreationEnabled !== undefined && {
        ticketCreation: conf.ticketCreationEnabled,
      }),
      ...(conf.publicPortalEnabled !== undefined && {
        publicPortal: conf.publicPortalEnabled,
      }),
    };
  }

  return deepMerge(defaults, fromApi) as PortalConfig;
}

function parseAccentColor(color: unknown): string {
  if (typeof color === "string") {
    if (color.match(/^\d+\s+\d+%\s+\d+%$/)) return color;
    if (color.startsWith("#")) return hexToHsl(color);
    return color;
  }
  if (typeof color === "object" && color !== null) {
    const c = color as { h?: number; s?: number; l?: number };
    if (c.h !== undefined && c.s !== undefined && c.l !== undefined) {
      return `${c.h} ${c.s}% ${c.l}%`;
    }
  }
  return "18 100% 52%";
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
