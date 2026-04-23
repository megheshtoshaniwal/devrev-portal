"use client";

import Link from "next/link";
import { usePortalConfig } from "@/portal/config";

const FOOTER_COLUMNS = [
  {
    title: "Use cases",
    links: [
      { label: "UI design", href: "#" },
      { label: "UX design", href: "#" },
      { label: "Prototyping", href: "#" },
      { label: "Graphic design", href: "#" },
      { label: "Wireframing", href: "#" },
      { label: "Brainstorming", href: "#" },
      { label: "Templates", href: "#" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Design features", href: "#" },
      { label: "Prototyping features", href: "#" },
      { label: "Design systems", href: "#" },
      { label: "Collaboration", href: "#" },
      { label: "FigJam", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Enterprise", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Best practices", href: "#" },
      { label: "Support", href: "#" },
      { label: "Developers", href: "#" },
      { label: "Learn design", href: "#" },
      { label: "What's new", href: "#" },
      { label: "Releases", href: "#" },
    ],
  },
];

export function FigmaFooter() {
  const { basePath } = usePortalConfig();

  return (
    <footer className="bg-black text-white mt-auto">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        {/* Logo row */}
        <div className="flex items-center gap-2 mb-12">
          <svg width="20" height="20" viewBox="0 0 38 57" fill="none" aria-hidden="true">
            <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
            <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
            <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
            <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
            <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
          </svg>
          <span className="font-semibold text-[15px]">Figma</span>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-16">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-white/50 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-white/10">
          <div className="flex items-center gap-6">
            <a href="https://twitter.com/figma" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors" aria-label="X (Twitter)">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://youtube.com/figma" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors" aria-label="YouTube">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="https://instagram.com/figma" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors" aria-label="Instagram">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
          </div>
          <p className="text-[12px] text-white/30">
            Powered by DevRev
          </p>
        </div>
      </div>
    </footer>
  );
}
