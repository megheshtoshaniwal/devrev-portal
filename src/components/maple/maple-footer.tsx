"use client";

import Link from "next/link";
import { usePortalConfig } from "@/portal/config";

const FOOTER_COLUMNS = [
  {
    title: "Support",
    links: [
      { label: "Knowledge Base", href: "/directories", external: false },
      { label: "My Requests", href: "/tickets", external: false },
      { label: "Contact Support", href: "/tickets/create", external: false },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Maple Software", href: "https://www.maplesoftware.net", external: true },
    ],
  },
];

export function MapleFooter() {
  const { basePath } = usePortalConfig();

  return (
    <footer className="bg-[#0a2540] text-white mt-auto">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635bff]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L9.5 8.5L3 9.5L7.5 14L6.5 21L12 17.5L17.5 21L16.5 14L21 9.5L14.5 8.5L12 2Z" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-[16px]">Maple Software</span>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-16">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] text-white/60 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        href={`${basePath}${link.href}`}
                        className="text-[14px] text-white/60 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-8 border-t border-white/10">
          <p className="text-[12px] text-white/30">
            &copy; {new Date().getFullYear()} Maple Software. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
