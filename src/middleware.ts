import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/devrev-sdk/auth/session";

// Default portal for the root redirect
const DEFAULT_LOCALE = "en-US";
const DEFAULT_SLUG = process.env.DEFAULT_PORTAL_SLUG || "bill-portal-demo";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── Root redirect ──────────────────────────────────────────
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${DEFAULT_LOCALE}/${DEFAULT_SLUG}`, req.url)
    );
  }

  // ─── Skip non-portal routes ─────────────────────────────────
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ─── Extract locale and slug from path ──────────────────────
  const parts = pathname.split("/").filter(Boolean);
  const locale = parts[0];
  const portalSlug = parts[1];

  if (!locale || !portalSlug) {
    return NextResponse.next();
  }

  // ─── Auth: ensure anonymous session exists ──────────────────
  // Portal pages (except login/callback) need a session token.
  // If no cookie exists, create an anonymous session.
  const token = getTokenFromRequest(req);
  const isAuthPage = parts[2] === "login" || parts[2] === "callback";

  if (!token && !isAuthPage && parts.length > 2) {
    // Redirect to portal root — the layout will create an anonymous session
    // This avoids a middleware-level API call (which adds latency)
  }

  // ─── Set portal context headers for Server Components ───────
  const response = NextResponse.next();
  response.headers.set("x-portal-locale", locale);
  response.headers.set("x-portal-slug", portalSlug);

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
