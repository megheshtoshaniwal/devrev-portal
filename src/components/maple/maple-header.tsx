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
  HelpCircle,
  Zap,
  FileText,
  Settings,
} from "lucide-react";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { usePortalConfig } from "@/portal/config";

interface NavDropdown {
  label: string;
  sections: {
    title?: string;
    items: {
      label: string;
      href: string;
      icon: React.ReactNode;
      description?: string;
      external?: boolean;
    }[];
  }[];
}

function useNavDropdowns(basePath: string): NavDropdown[] {
  return [
    {
      label: "Support",
      sections: [
        {
          items: [
            {
              label: "Knowledge Base",
              href: `${basePath}/directories`,
              icon: <BookOpen className="h-4 w-4" />,
              description: "Browse help articles and guides",
            },
            {
              label: "My Requests",
              href: `${basePath}/tickets`,
              icon: <FileText className="h-4 w-4" />,
              description: "View and track your tickets",
            },
            {
              label: "Contact Support",
              href: `${basePath}/tickets/create`,
              icon: <HelpCircle className="h-4 w-4" />,
              description: "Create a new support request",
            },
          ],
        },
      ],
    },
    {
      label: "Resources",
      sections: [
        {
          items: [
            {
              label: "Maple Software",
              href: "https://www.maplesoftware.net",
              icon: <Zap className="h-4 w-4" />,
              description: "Visit our main website",
              external: true,
            },
            {
              label: "Account Settings",
              href: `${basePath}/tickets`,
              icon: <Settings className="h-4 w-4" />,
              description: "Manage your account",
            },
          ],
        },
      ],
    },
  ];
}

export function MapleHeader() {
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
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-[#e7ecf1]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-1/2 focus:-translate-x-1/2 focus:top-0 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#635bff] focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link href={basePath || "/"} className="flex items-center gap-2.5 shrink-0">
          {/* Maple leaf icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635bff]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L9.5 8.5L3 9.5L7.5 14L6.5 21L12 17.5L17.5 21L16.5 14L21 9.5L14.5 8.5L12 2Z" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#0a2540] text-[15px] leading-tight">
              {config.branding.orgName}
            </span>
            <span className="text-[11px] text-[#425466] leading-tight">
              {content.portalTitle}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-8" aria-label="Main navigation">
          <Link
            href={basePath || "/"}
            className="px-3 py-1.5 text-[14px] font-medium text-[#425466] hover:text-[#0a2540] rounded-full hover:bg-[#f6f9fc] transition-colors"
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
                className={`flex items-center gap-1 px-3 py-1.5 text-[14px] font-medium rounded-full transition-colors cursor-pointer ${
                  activeDropdown === i
                    ? "text-[#0a2540] bg-[#f6f9fc]"
                    : "text-[#425466] hover:text-[#0a2540] hover:bg-[#f6f9fc]"
                }`}
                aria-expanded={activeDropdown === i}
                aria-haspopup="true"
              >
                {dropdown.label}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${activeDropdown === i ? "rotate-180" : ""}`}
                />
              </button>

              {activeDropdown === i && (
                <div
                  className="absolute left-0 top-full pt-2 z-50"
                  onMouseEnter={() => handleDropdownEnter(i)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="w-[320px] rounded-xl border border-[#e7ecf1] bg-white shadow-[0_13px_27px_-5px_rgba(50,50,93,0.12),0_8px_16px_-8px_rgba(0,0,0,0.08)] p-2">
                    {dropdown.sections.map((section, si) => (
                      <div key={si}>
                        {section.title && (
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8898aa]">
                              {section.title}
                            </span>
                          </div>
                        )}
                        {si > 0 && <div className="border-t border-[#e7ecf1] my-1" />}
                        {section.items.map((item) => {
                          const Comp = item.external ? "a" : Link;
                          const extraProps = item.external
                            ? { target: "_blank" as const, rel: "noopener noreferrer" }
                            : {};
                          return (
                            <Comp
                              key={item.label}
                              href={item.href}
                              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[#f6f9fc] transition-colors group"
                              onClick={() => setActiveDropdown(null)}
                              {...extraProps}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6f9fc] text-[#425466] group-hover:bg-[#635bff]/10 group-hover:text-[#635bff] transition-colors shrink-0 mt-0.5">
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[14px] font-medium text-[#0a2540] group-hover:text-[#635bff] transition-colors">
                                  {item.label}
                                </span>
                                {item.description && (
                                  <p className="text-[12px] text-[#8898aa] mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </Comp>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-52 h-9 px-3 rounded-full border border-[#e7ecf1] bg-[#f6f9fc] text-[14px] text-[#0a2540] placeholder:text-[#8898aa] focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/15"
                onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
              />
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f6f9fc] text-[#425466] hover:text-[#0a2540] transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full px-2.5 py-1.5 hover:bg-[#f6f9fc] transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#635bff] to-[#7a73ff] text-white text-[11px] font-semibold">
                  {(user?.display_name || "?").charAt(0)}
                </div>
                <span className="hidden sm:block text-[14px] font-medium text-[#0a2540] max-w-[100px] truncate">
                  {user?.display_name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#425466] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 z-50 w-60 rounded-xl border border-[#e7ecf1] bg-white p-1.5 shadow-[0_13px_27px_-5px_rgba(50,50,93,0.12),0_8px_16px_-8px_rgba(0,0,0,0.08)]"
                    role="menu"
                  >
                    <div className="px-3 py-2.5 border-b border-[#e7ecf1] mb-1">
                      <p className="text-[14px] font-medium text-[#0a2540]">{user?.display_name}</p>
                      {user?.email && <p className="text-[12px] text-[#8898aa]">{user.email}</p>}
                    </div>
                    <Link
                      href={`${basePath}/tickets`}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-[#425466] hover:bg-[#f6f9fc] hover:text-[#0a2540]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Requests
                    </Link>
                    <div className="border-t border-[#e7ecf1] mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-red-500 hover:bg-[#f6f9fc] cursor-pointer"
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
              className="flex items-center gap-1.5 rounded-full bg-[#635bff] text-white px-4 py-2 text-[14px] font-medium hover:bg-[#5851ea] transition-colors cursor-pointer shadow-[0_2px_5px_0_rgba(50,50,93,0.1),0_1px_1.5px_0_rgba(0,0,0,0.07)]"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </button>
          )}

          <button
            className="lg:hidden p-1.5 rounded-full hover:bg-[#f6f9fc] text-[#425466]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#e7ecf1] lg:hidden max-h-[70vh] overflow-y-auto bg-white">
          <div className="p-4 space-y-4">
            <Link
              href={basePath || "/"}
              className="block px-3 py-2.5 text-[15px] font-medium text-[#0a2540] rounded-lg hover:bg-[#f6f9fc]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            {dropdowns.map((dropdown) => (
              <div key={dropdown.label}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#8898aa] mb-2">
                  {dropdown.label}
                </p>
                {dropdown.sections.map((section, si) => (
                  <div key={si} className="space-y-0.5">
                    {section.items.map((item) => {
                      const Comp = item.external ? "a" : Link;
                      const extraProps = item.external
                        ? { target: "_blank" as const, rel: "noopener noreferrer" }
                        : {};
                      return (
                        <Comp
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2.5 text-[15px] text-[#425466] rounded-lg hover:bg-[#f6f9fc]"
                          onClick={() => setMobileMenuOpen(false)}
                          {...extraProps}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f6f9fc] text-[#425466] shrink-0">
                            {item.icon}
                          </div>
                          <span>{item.label}</span>
                        </Comp>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}

            <form onSubmit={handleSearch} className="pt-2 border-t border-[#e7ecf1]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8898aa]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help..."
                  className="w-full h-10 pl-10 pr-4 rounded-full border border-[#e7ecf1] bg-[#f6f9fc] text-[15px] text-[#0a2540] placeholder:text-[#8898aa] focus:outline-none focus:border-[#635bff]"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
