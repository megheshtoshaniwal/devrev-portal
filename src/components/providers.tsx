"use client";

import { SessionContext, useSessionProvider } from "@/devrev-sdk/hooks/use-session";
import { JourneyContext, useJourneyProvider } from "@/portal/hooks/use-journey";
import { PortalConfigProvider } from "@/portal/config";
import { BILL_CONFIG } from "@/portal/config/presets/bill";

export function Providers({ children }: { children: React.ReactNode }) {
  const session = useSessionProvider();
  const journey = useJourneyProvider();

  return (
    <SessionContext.Provider value={session}>
      <JourneyContext.Provider value={journey}>
        <PortalConfigProvider overrides={BILL_CONFIG}>
          {children}
        </PortalConfigProvider>
      </JourneyContext.Provider>
    </SessionContext.Provider>
  );
}
