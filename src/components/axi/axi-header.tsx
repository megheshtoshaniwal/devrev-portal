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
  TrendingUp,
  BarChart3,
  Wallet,
  BookOpen,
  HelpCircle,
  Zap,
  GraduationCap,
  Shield,
  Globe,
  Users,
} from "lucide-react";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { usePortalConfig } from "@/portal/config";

// ── Mega-menu definitions ─────────────────────────────────────

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
      label: "Markets",
      sections: [
        {
          items: [
            {
              label: "Forex",
              href: "https://www.axi.com/int/trade/cfds/forex",
              icon: <TrendingUp className="h-4 w-4" />,
              description: "Trade currency pairs",
              external: true,
            },
            {
              label: "Shares",
              href: "https://www.axi.com/int/trade/cfds/stocks",
              icon: <BarChart3 className="h-4 w-4" />,
              description: "Trade global shares",
              external: true,
            },
            {
              label: "Indices",
              href: "https://www.axi.com/int/trade/cfds/indices",
              icon: <Globe className="h-4 w-4" />,
              description: "Major global indices",
              external: true,
            },
            {
              label: "Crypto CFDs",
              href: "https://www.axi.com/int/trade/cfds/cryptocurrencies",
              icon: <Zap className="h-4 w-4" />,
              description: "Cryptocurrency trading",
              external: true,
            },
            {
              label: "Commodities",
              href: "https://www.axi.com/int/trade/cfds/commodities",
              icon: <Wallet className="h-4 w-4" />,
              description: "Gold, oil, and more",
              external: true,
            },
          ],
        },
      ],
    },
    {
      label: "Learn",
      sections: [
        {
          items: [
            {
              label: "Axi Academy",
              href: "https://academy.axi.com/",
              icon: <GraduationCap className="h-4 w-4" />,
              description: "Trading courses",
              external: true,
            },
            {
              label: "Free eBooks",
              href: "https://www.axi.com/int/learn-to-trade/ebooks",
              icon: <BookOpen className="h-4 w-4" />,
              description: "Educational resources",
              external: true,
            },
            {
              label: "Axi Blog",
              href: "https://www.axi.com/int/blog",
              icon: <Globe className="h-4 w-4" />,
              description: "Market insights & news",
              external: true,
            },
          ],
        },
      ],
    },
    {
      label: "Help",
      sections: [
        {
          items: [
            {
              label: "Knowledge Base",
              href: `${basePath}/directories`,
              icon: <BookOpen className="h-4 w-4" />,
              description: "Browse help articles",
            },
            {
              label: "My Requests",
              href: `${basePath}/tickets`,
              icon: <HelpCircle className="h-4 w-4" />,
              description: "View your support tickets",
            },
            {
              label: "Request a Callback",
              href: `${basePath}/tickets/create`,
              icon: <Zap className="h-4 w-4" />,
              description: "Get help from our team",
            },
          ],
        },
        {
          title: "External",
          items: [
            {
              label: "Contact Us",
              href: "https://www.axi.com/int/contact-us",
              icon: <Users className="h-4 w-4" />,
              description: "Phone, email, WhatsApp",
              external: true,
            },
            {
              label: "Trade With Trust",
              href: "https://www.axi.com/int/our-edge/trade-with-trust",
              icon: <Shield className="h-4 w-4" />,
              description: "Security & regulation",
              external: true,
            },
          ],
        },
      ],
    },
  ];
}

// ── Header Component ──────────────────────────────────────────

export function AxiHeader() {
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
      className="sticky top-0 z-50 w-full bg-[#282424] border-b border-[#3a3636]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-1/2 focus:-translate-x-1/2 focus:top-0 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#E0FF38] focus:text-[#282424] focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link
          href={basePath || "/"}
          className="flex items-center gap-2.5 shrink-0"
        >
          <span className="font-bold text-[#E0FF38] text-[20px] tracking-tight">
            axi
          </span>
          <span className="text-[#787571] text-[13px] font-medium hidden sm:block">
            | {content.portalTitle}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden lg:flex items-center gap-0.5 ml-8"
          aria-label="Main navigation"
        >
          <Link
            href={basePath || "/"}
            className="px-3 py-1.5 text-[13px] font-medium text-[#a09c98] hover:text-white rounded-md hover:bg-[#3a3636] transition-colors"
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
                    ? "text-white bg-[#3a3636]"
                    : "text-[#a09c98] hover:text-white hover:bg-[#3a3636]"
                }`}
                aria-expanded={activeDropdown === i}
                aria-haspopup="true"
              >
                {dropdown.label}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${activeDropdown === i ? "rotate-180" : ""}`}
                />
              </button>

              {activeDropdown === i && (
                <div
                  className="absolute left-0 top-full pt-1 z-50"
                  onMouseEnter={() => handleDropdownEnter(i)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="w-[340px] rounded-xl border border-[#3a3636] bg-[#282424] shadow-lg p-2">
                    {dropdown.sections.map((section, si) => (
                      <div key={si}>
                        {section.title && (
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#787571]">
                              {section.title}
                            </span>
                          </div>
                        )}
                        {si > 0 && (
                          <div className="border-t border-[#3a3636] my-1" />
                        )}
                        {section.items.map((item) => {
                          const Comp = item.external ? "a" : Link;
                          const extraProps = item.external
                            ? {
                                target: "_blank" as const,
                                rel: "noopener noreferrer",
                              }
                            : {};
                          return (
                            <Comp
                              key={item.label}
                              href={item.href}
                              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[#3a3636] transition-colors group"
                              onClick={() => setActiveDropdown(null)}
                              {...extraProps}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3a3636] text-[#a09c98] group-hover:bg-[#E0FF38]/15 group-hover:text-[#E0FF38] transition-colors shrink-0 mt-0.5">
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[13px] font-medium text-white group-hover:text-[#E0FF38] transition-colors">
                                  {item.label}
                                </span>
                                {item.description && (
                                  <p className="text-[12px] text-[#787571] mt-0.5">
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
            <form
              onSubmit={handleSearch}
              className="hidden sm:flex items-center"
            >
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-48 h-8 px-3 rounded-md border border-[#3a3636] bg-[#3a3636] text-[13px] text-white placeholder:text-[#787571] focus:outline-none focus:border-[#E0FF38] focus:ring-1 focus:ring-[#E0FF38]/20"
                onBlur={() => {
                  if (!searchQuery) setSearchOpen(false);
                }}
              />
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#3a3636] text-[#a09c98] hover:text-white transition-colors cursor-pointer"
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
                className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-[#3a3636] transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E0FF38] text-[#282424] text-[11px] font-bold">
                  {(user?.display_name || "?").charAt(0)}
                </div>
                <span className="hidden sm:block text-[13px] font-medium text-white max-w-[100px] truncate">
                  {user?.display_name}
                </span>
                <ChevronDown className="h-3 w-3 text-[#787571] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-50 w-60 rounded-xl border border-[#3a3636] bg-[#282424] p-1.5 shadow-lg"
                    role="menu"
                  >
                    <div className="px-3 py-2.5 border-b border-[#3a3636] mb-1">
                      <p className="text-[13px] font-medium text-white">
                        {user?.display_name}
                      </p>
                      {user?.email && (
                        <p className="text-[12px] text-[#787571]">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`${basePath}/tickets`}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#a09c98] hover:bg-[#3a3636] hover:text-white"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Requests
                    </Link>
                    <div className="border-t border-[#3a3636] mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-400 hover:bg-[#3a3636] cursor-pointer"
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
              className="flex items-center gap-1.5 rounded-md bg-[#E0FF38] text-[#282424] px-3.5 py-1.5 text-[13px] font-bold hover:bg-[#d4f030] transition-colors cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </button>
          )}

          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-[#3a3636] text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#3a3636] lg:hidden max-h-[70vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            <Link
              href={basePath || "/"}
              className="block px-3 py-2 text-[14px] font-medium text-white rounded-lg hover:bg-[#3a3636]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            {dropdowns.map((dropdown) => (
              <div key={dropdown.label}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#787571] mb-2">
                  {dropdown.label}
                </p>
                {dropdown.sections.map((section, si) => (
                  <div key={si} className="space-y-0.5">
                    {section.items.map((item) => {
                      const Comp = item.external ? "a" : Link;
                      const extraProps = item.external
                        ? {
                            target: "_blank" as const,
                            rel: "noopener noreferrer",
                          }
                        : {};
                      return (
                        <Comp
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2.5 text-[14px] text-[#a09c98] rounded-lg hover:bg-[#3a3636]"
                          onClick={() => setMobileMenuOpen(false)}
                          {...extraProps}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3a3636] text-[#a09c98] shrink-0">
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

            <form
              onSubmit={handleSearch}
              className="pt-2 border-t border-[#3a3636]"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#787571]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#3a3636] bg-[#3a3636] text-[14px] text-white placeholder:text-[#787571] focus:outline-none focus:border-[#E0FF38]"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
