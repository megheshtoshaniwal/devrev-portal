"use client";

import { usePortalConfig } from "@/portal/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FigmaHeader } from "@/components/figma/figma-header";
import { FigmaFooter } from "@/components/figma/figma-footer";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config } = usePortalConfig();
  const isFigma = config.branding.orgName === "Figma";

  return (
    <div className="flex flex-col flex-1">
      {isFigma ? <FigmaHeader /> : <Header />}
      <main id="main-content" className="flex-1">{children}</main>
      {isFigma ? <FigmaFooter /> : <Footer />}
    </div>
  );
}
