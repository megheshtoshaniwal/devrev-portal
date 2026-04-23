// Server-side session management — cookie-based for SSR compatibility.
//
// The session token is stored in an httpOnly cookie so that:
// 1. Middleware can read it for auth gating
// 2. Server Components can read it for data fetching
// 3. Client Components get it via the API proxy (cookie forwarded automatically)
// 4. XSS can't steal the token (httpOnly)

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "devrev_session";
const AUTH_FLAG_COOKIE = "devrev_auth"; // non-httpOnly flag for client JS
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ─── Server-side: read session from cookie ─────────────────────

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getIsAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_FLAG_COOKIE)?.value === "1";
}

// ─── API Route helpers: set/clear session cookie ───────────────

export function setSessionCookies(
  response: NextResponse,
  token: string,
  authenticated: boolean
): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  // Non-httpOnly flag so client JS can check auth state without reading the token
  response.cookies.set(AUTH_FLAG_COOKIE, authenticated ? "1" : "0", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}

export function clearSessionCookies(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(AUTH_FLAG_COOKIE);
  return response;
}

// ─── Middleware helper: read token from request ────────────────

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export function getAuthFlagFromRequest(req: NextRequest): boolean {
  return req.cookies.get(AUTH_FLAG_COOKIE)?.value === "1";
}
