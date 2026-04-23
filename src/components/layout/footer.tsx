"use client";

import Link from "next/link";
import Image from "next/image";
import { usePortalConfig } from "@/portal/config";

const socialLabels: Record<string, string> = {
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  github: "GitHub",
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
};

const socialIcons: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  github: "GH",
  facebook: "f",
  youtube: "▶",
  instagram: "📷",
};

export function Footer() {
  const { config } = usePortalConfig();
  const { branding, content, footer, features } = config;

  return (
    <footer className="mt-auto border-t border-border bg-muted/30" role="contentinfo">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo + org name */}
          <div className="flex items-center gap-2.5">
            {branding.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-[8px] font-bold" aria-hidden="true">
                {branding.orgName.slice(0, 4).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {content.portalTitle}
            </span>
          </div>

          {/* Links + social + powered by */}
          <nav className="flex items-center gap-4 flex-wrap justify-center" aria-label="Footer links">
            {footer.links.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {link.label}
                <span className="sr-only"> (opens in new tab)</span>
              </Link>
            ))}

            {footer.socialLinks.map((social) => (
              <Link
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label={`${socialLabels[social.platform] || social.platform} (opens in new tab)`}
              >
                {socialIcons[social.platform] || social.platform}
              </Link>
            ))}

            {features.poweredByDevrev && (
              <span className="text-xs text-muted-foreground">
                Powered by{" "}
                <Link
                  href="https://devrev.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  DevRev
                </Link>
              </span>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
