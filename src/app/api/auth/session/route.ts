import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/devrev-sdk/client";

// POST /api/auth/session — create a rev user session token
// For dev: uses AAT to create anonymous rev user sessions
export async function POST(req: NextRequest) {
  const aat = process.env.DEVREV_AAT;
  if (!aat) {
    return NextResponse.json({ error: "AAT not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const userRef = body.user_ref || `anon-${Date.now()}`;
  const userTraits = body.user_traits;

  try {
    const result = await createSessionToken(aat, userRef, userTraits);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
