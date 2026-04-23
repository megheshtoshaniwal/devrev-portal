"use client";

// Client-side providers that receive server-fetched config and session.
// DevRevProvider (SDK) handles session + brand context.
// Portal-layer providers handle config + journey tracking.

import { type ReactNode, useMemo } from "react";
import type { PortalConfig } from "@/portal/config/types";
import type { RevUser } from "@/devrev-sdk/client";
import { DevRevProvider } from "@/devrev-sdk/hooks/devrev-provider";
import { PortalConfigContext } from "@/portal/config/provider";
import { JourneyContext, useJourneyProvider } from "@/portal/hooks/use-journey";

interface ClientProvidersProps {
  children: ReactNode;
  config: PortalConfig;
  basePath: string;
  initialToken: string | null;
  initialUser: RevUser | null;
  isAuthenticated: boolean;
  locale: string;
  portalSlug: string;
}

export function ClientProviders({
  children,
  config,
  basePath,
  initialToken,
  initialUser,
  isAuthenticated,
  locale,
  portalSlug,
}: ClientProvidersProps) {
  const journey = useJourneyProvider();

  const configValue = useMemo(
    () => ({ config, loading: false, basePath }),
    [config, basePath]
  );

  return (
    <DevRevProvider
      initialToken={initialToken}
      initialUser={initialUser}
      initialAuthenticated={isAuthenticated}
      basePath={basePath}
      brandContext={{
        orgName: config.branding.orgName,
        assistantName: config.content.assistantName,
      }}
    >
      <PortalConfigContext.Provider value={configValue}>
        <JourneyContext.Provider value={journey}>
          {children}
        </JourneyContext.Provider>
      </PortalConfigContext.Provider>
    </DevRevProvider>
  );
}
