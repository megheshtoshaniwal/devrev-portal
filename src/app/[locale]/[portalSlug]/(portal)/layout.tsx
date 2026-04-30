"use client";

import { usePortalConfig } from "@/portal/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FigmaHeader } from "@/components/figma/figma-header";
import { FigmaFooter } from "@/components/figma/figma-footer";
import { AxiHeader } from "@/components/axi/axi-header";
import { AxiFooter } from "@/components/axi/axi-footer";
import { MapleHeader } from "@/components/maple/maple-header";
import { MapleFooter } from "@/components/maple/maple-footer";

const CUSTOM_LAYOUTS: Record<string, { header: React.ComponentType; footer: React.ComponentType }> = {
  "Figma": { header: FigmaHeader, footer: FigmaFooter },
  "Axi": { header: AxiHeader, footer: AxiFooter },
  "Maple Software": { header: MapleHeader, footer: MapleFooter },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config } = usePortalConfig();
  const orgName = config.branding.orgName;
  const custom = CUSTOM_LAYOUTS[orgName];

  const HeaderComponent = custom?.header || Header;
  const FooterComponent = custom?.footer || Footer;

  return (
    <div className="flex flex-col flex-1">
      <HeaderComponent />
      <main id="main-content" className="flex-1">{children}</main>
      <FooterComponent />
    </div>
  );
}
