"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  ChevronDown,
  LogIn,
  LogOut,
  Ticket,
  BookOpen,
  BarChart3,
  Home,
  Search,
  MessageSquare,
} from "lucide-react";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { usePortalConfig } from "@/portal/config";

const iconMap: Record<string, React.ReactNode> = {
  home: <Home className="h-3.5 w-3.5" aria-hidden="true" />,
  ticket: <Ticket className="h-3.5 w-3.5" aria-hidden="true" />,
  book: <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />,
  search: <Search className="h-3.5 w-3.5" aria-hidden="true" />,
  chart: <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />,
  message: <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />,
};

export function Header() {
  const { user, isAuthenticated, login, logout } = useSession();
  const { config, basePath } = usePortalConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { branding, content, navigation, features } = config;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-1/2 focus:-translate-x-1/2 focus:top-0 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-semibold focus:rounded-b-lg"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo + title */}
        <Link href={basePath || "/"} className="flex items-center gap-2.5" aria-label={`${branding.orgName} ${content.portalTitle} — Home`}>
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-[10px] font-bold" aria-hidden="true">
              {branding.orgName.slice(0, 4).toUpperCase()}
            </div>
          )}
          <span className="hidden sm:block font-semibold text-foreground text-sm">
            {content.portalTitle}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navigation.items.map((item) => (
            <Link
              key={item.label}
              href={`${basePath}${item.href}` || basePath || "/"}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.icon && iconMap[item.icon]}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User / auth */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={`Account menu for ${user?.display_name || "user"}`}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-accent transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium" aria-hidden="true">
                  {(user?.display_name || "?").charAt(0)}
                </div>
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {user?.display_name || "Loading..."}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                  <div
                    className="absolute right-0 top-full mt-1 z-50 w-60 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
                    role="menu"
                    aria-label="Account actions"
                  >
                    <div className="px-3 py-2.5 border-b border-border mb-1">
                      <p className="text-sm font-medium">{user?.display_name}</p>
                      {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{user?.display_id}</p>
                    </div>
                    <Link
                      href={`${basePath}/history`}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> My History
                    </Link>
                    {features.orgDashboard && (
                      <button role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Org Dashboard
                      </button>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={login} className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" /> Sign in
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="flex flex-col p-3 gap-0.5" aria-label="Mobile navigation">
            {navigation.items.map((item) => (
              <Link
                key={item.label}
                href={`${basePath}${item.href}` || basePath || "/"}
                className="px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon && iconMap[item.icon]}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
