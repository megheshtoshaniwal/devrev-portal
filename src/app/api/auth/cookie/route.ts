import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies, clearSessionCookies } from "@/devrev-sdk/auth/session";

// POST /api/auth/cookie — set session token as httpOnly cookie
// Called after login or anonymous session creation
export async function POST(req: NextRequest) {
  const { token, authenticated } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  return setSessionCookies(response, token, authenticated ?? false);
}

// DELETE /api/auth/cookie — clear session cookies (logout)
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearSessionCookies(response);
}
