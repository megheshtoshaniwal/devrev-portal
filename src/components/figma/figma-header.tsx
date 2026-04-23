"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  ChevronDown,
  Search,
  BookOpen,
  Layers,
  Code,
  Presentation,
  Paintbrush,
  Zap,
  Globe,
  Users,
  Settings,
  CreditCard,
  Building2,
  Shield,
  HelpCircle,
} from "lucide-react";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { usePortalConfig } from "@/portal/config";

// ── Mega-menu definitions ─────────────────────────────────────

interface NavDropdown {
  label: string;
  badge?: string;
  sections: {
    title?: string;
    items: { label: string; href: string; icon: React.ReactNode; description?: string; badge?: string }[];
  }[];
}

function useNavDropdowns(basePath: string): NavDropdown[] {
  return [
    {
      label: "Products",
      sections: [
        {
          items: [
            { label: "Figma Design", href: `${basePath}/directories`, icon: <Layers className="h-4 w-4" />, description: "Design and prototype" },
            { label: "Dev Mode", href: `${basePath}/directories`, icon: <Code className="h-4 w-4" />, description: "Inspect and export code" },
            { label: "FigJam", href: `${basePath}/directories`, icon: <Paintbrush className="h-4 w-4" />, description: "Online whiteboard" },
            { label: "Figma Slides", href: `${basePath}/directories`, icon: <Presentation className="h-4 w-4" />, description: "Build presentations" },
            { label: "Figma Sites", href: `${basePath}/directories`, icon: <Globe className="h-4 w-4" />, description: "Publish websites", badge: "Beta" },
            { label: "AI", href: `${basePath}/directories`, icon: <Zap className="h-4 w-4" />, description: "AI-powered features" },
          ],
        },
      ],
    },
    {
      label: "Administration",
      sections: [
        {
          title: "Manage",
          items: [
            { label: "Billing", href: `${basePath}/directories`, icon: <CreditCard className="h-4 w-4" /> },
            { label: "Teams", href: `${basePath}/directories`, icon: <Users className="h-4 w-4" /> },
            { label: "Organizations", href: `${basePath}/directories`, icon: <Building2 className="h-4 w-4" /> },
            { label: "Enterprise", href: `${basePath}/directories`, icon: <Shield className="h-4 w-4" /> },
          ],
        },
        {
          title: "Settings",
          items: [
            { label: "Preferences", href: `${basePath}/directories`, icon: <Settings className="h-4 w-4" /> },
          ],
        },
      ],
    },
    {
      label: "Help",
      sections: [
        {
          items: [
            { label: "Knowledge Base", href: `${basePath}/directories`, icon: <BookOpen className="h-4 w-4" />, description: "Browse articles and guides" },
            { label: "My Requests", href: `${basePath}/tickets`, icon: <HelpCircle className="h-4 w-4" />, description: "View your support tickets" },
            { label: "Contact Support", href: `${basePath}/tickets/create`, icon: <Zap className="h-4 w-4" />, description: "Get help from our team" },
          ],
        },
      ],
    },
  ];
}

// ── Header Component ──────────────────────────────────────────

export function FigmaHeader() {
  const { user, isAuthenticated, login, logout } = useSession();
  const { config, basePath } = usePortalConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { content } = config;
  const dropdowns = useNavDropdowns(basePath);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleDropdownEnter = (index: number) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(index);
  };

  const handleDropdownLeave = () => {
    dropdownTimerRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `${basePath}/directories?q=${encodeURIComponent(searchQuery)}`;
      setSearchOpen(false);
    }
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full bg-white border-b border-[#e5e5e5]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-1/2 focus:-translate-x-1/2 focus:top-0 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#5551FF] focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link href={basePath || "/"} className="flex items-center gap-2.5 shrink-0">
          <svg width="24" height="24" viewBox="0 0 38 57" fill="none" aria-hidden="true">
            <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
            <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
            <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
            <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
            <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
          </svg>
          <span className="font-semibold text-black text-[15px]">{content.portalTitle}</span>
        </Link>

        {/* Desktop nav with mega-menus */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-8" aria-label="Main navigation">
          <Link
            href={basePath || "/"}
            className="px-3 py-1.5 text-[13px] font-medium text-[#545454] hover:text-black rounded-md hover:bg-gray-50 transition-colors"
          >
            Home
          </Link>

          {dropdowns.map((dropdown, i) => (
            <div
              key={dropdown.label}
              className="relative"
              onMouseEnter={() => handleDropdownEnter(i)}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className={`flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors cursor-pointer ${
                  activeDropdown === i
                    ? "text-black bg-gray-50"
                    : "text-[#545454] hover:text-black hover:bg-gray-50"
                }`}
                aria-expanded={activeDropdown === i}
                aria-haspopup="true"
              >
                {dropdown.label}
                {dropdown.badge && (
                  <span className="text-[10px] font-semibold bg-[#0ACF83]/10 text-[#0ACF83] px-1.5 py-0.5 rounded-full">
                    {dropdown.badge}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${activeDropdown === i ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown panel */}
              {activeDropdown === i && (
                <div
                  className="absolute left-0 top-full pt-1 z-50"
                  onMouseEnter={() => handleDropdownEnter(i)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="w-[340px] rounded-xl border border-[#e5e5e5] bg-white shadow-lg p-2">
                    {dropdown.sections.map((section, si) => (
                      <div key={si}>
                        {section.title && (
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">
                              {section.title}
                            </span>
                          </div>
                        )}
                        {si > 0 && <div className="border-t border-[#f0f0f0] my-1" />}
                        {section.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[#fafafa] transition-colors group"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#545454] group-hover:bg-[#5551FF]/10 group-hover:text-[#5551FF] transition-colors shrink-0 mt-0.5">
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-black group-hover:text-[#5551FF] transition-colors">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className="text-[10px] font-semibold bg-[#5551FF]/10 text-[#5551FF] px-1.5 py-0.5 rounded-full">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[12px] text-[#999] mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right side: search + auth */}
        <div className="flex items-center gap-2">
          {/* Search toggle */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-48 h-8 px-3 rounded-md border border-[#e5e5e5] text-[13px] focus:outline-none focus:border-[#5551FF] focus:ring-1 focus:ring-[#5551FF]/20"
                onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
              />
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-50 text-[#545454] hover:text-black transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5551FF] text-white text-[11px] font-semibold">
                  {(user?.display_name || "?").charAt(0)}
                </div>
                <span className="hidden sm:block text-[13px] font-medium text-black max-w-[100px] truncate">
                  {user?.display_name}
                </span>
                <ChevronDown className="h-3 w-3 text-[#545454] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-60 rounded-xl border border-[#e5e5e5] bg-white p-1.5 shadow-lg" role="menu">
                    <div className="px-3 py-2.5 border-b border-[#f0f0f0] mb-1">
                      <p className="text-[13px] font-medium text-black">{user?.display_name}</p>
                      {user?.email && <p className="text-[12px] text-[#999]">{user.email}</p>}
                      <p className="text-[11px] text-[#ccc] mt-0.5">{user?.display_id}</p>
                    </div>
                    <Link
                      href={`${basePath}/history`}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#545454] hover:bg-[#fafafa] hover:text-black"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My History
                    </Link>
                    <Link
                      href={`${basePath}/tickets`}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#545454] hover:bg-[#fafafa] hover:text-black"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Requests
                    </Link>
                    <div className="border-t border-[#f0f0f0] mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-600 hover:bg-[#fafafa] cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1.5 rounded-md bg-black text-white px-3.5 py-1.5 text-[13px] font-medium hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile mega-menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#e5e5e5] lg:hidden max-h-[70vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            <Link
              href={basePath || "/"}
              className="block px-3 py-2 text-[14px] font-medium text-black rounded-lg hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            {dropdowns.map((dropdown) => (
              <div key={dropdown.label}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#999] mb-2">
                  {dropdown.label}
                </p>
                {dropdown.sections.map((section, si) => (
                  <div key={si} className="space-y-0.5">
                    {section.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 text-[14px] text-[#545454] rounded-lg hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f5f5f5] text-[#545454] shrink-0">
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold bg-[#5551FF]/10 text-[#5551FF] px-1.5 py-0.5 rounded-full ml-auto">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* Mobile search */}
            <form onSubmit={handleSearch} className="pt-2 border-t border-[#f0f0f0]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#e5e5e5] text-[14px] focus:outline-none focus:border-[#5551FF]"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
