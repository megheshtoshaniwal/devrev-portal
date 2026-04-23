// Server Component layout for [locale]/[portalSlug].
//
// This is the architectural blueprint for the SSR-enabled portal layout.
// It replaces the current client-side-only PortalConfigProvider with a
// server-side config fetch + CSS variable injection.
//
// KEY CHANGES FROM CURRENT:
// 1. Config fetched server-side (no client waterfall)
// 2. CSS variables injected in <head> (no FOUC)
// 3. Session read from cookie (not localStorage)
// 4. Config passed as props to client providers (not re-fetched)

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getPortalConfig, generateThemeCss } from "@/portal/config/server";
import { getSessionToken, getIsAuthenticated } from "@/devrev-sdk/auth/session";
import { getRevUserSelf, type RevUser } from "@/devrev-sdk/client";
import { ClientProviders } from "./client-providers";

// Preset map — in production, this would be a dynamic import based on slug
import { BILL_CONFIG } from "@/portal/config/presets/bill";
import { FIGMA_CONFIG } from "@/portal/config/presets/figma";
const PRESET_MAP: Record<string, typeof BILL_CONFIG> = {
  "bill-portal-demo": BILL_CONFIG,
  "figma-help-center": FIGMA_CONFIG,
};

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string; portalSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; portalSlug: string }>;
}): Promise<Metadata> {
  const { portalSlug } = await params;
  const preset = PRESET_MAP[portalSlug];
  const config = await getPortalConfig(portalSlug, preset);

  return {
    title: `${config.branding.orgName} ${config.content.portalTitle}`,
    description: `Get help with ${config.branding.orgName}`,
  };
}

export default async function PortalSlugLayout({
  children,
  params,
}: LayoutProps) {
  const { locale, portalSlug } = await params;
  const basePath = `/${locale}/${portalSlug}`;

  // 1. Resolve config server-side (cached in Node.js memory)
  const preset = PRESET_MAP[portalSlug];
  const config = await getPortalConfig(portalSlug, preset);

  // 2. Read session from cookie
  const token = await getSessionToken();
  const isAuthenticated = await getIsAuthenticated();

  // 3. Fetch user if authenticated
  let user: RevUser | null = null;
  if (token) {
    try {
      const res = await getRevUserSelf({ token });
      user = res.rev_user;
    } catch {
      // Token might be expired — client will handle refresh
    }
  }

  // 4. Generate theme CSS from config
  const themeCss = generateThemeCss(config);
  const isDark = config.branding.theme === "dark";

  return (
    <div className={isDark ? "dark" : ""}>
      {/* Inject theme CSS variables server-side — no FOUC */}
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />

      {/* Custom stylesheet from config */}
      {config.branding.customStylesheetUrl && (
        <link rel="stylesheet" href={config.branding.customStylesheetUrl} />
      )}

      {/* Client providers receive pre-fetched config (no re-fetch) */}
      <ClientProviders
        config={config}
        basePath={basePath}
        initialToken={token}
        initialUser={user}
        isAuthenticated={isAuthenticated}
        locale={locale}
        portalSlug={portalSlug}
      >
        {children}
      </ClientProviders>
    </div>
  );
}
