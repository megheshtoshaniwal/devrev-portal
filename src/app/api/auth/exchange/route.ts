import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.DEVREV_API_BASE || "https://api.dev.devrev-eng.ai";

// POST /api/auth/exchange — exchange Auth0 token for DevRev rev token
export async function POST(req: NextRequest) {
  const { auth0_token } = await req.json();
  if (!auth0_token) {
    return NextResponse.json({ error: "Missing auth0_token" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/internal/auth-tokens.create`, {
      method: "POST",
      headers: {
        Authorization: auth0_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        requested_token_type: "urn:devrev:params:oauth:token-type:session",
        subject_token: auth0_token,
        subject_token_type: "urn:devrev:params:oauth:token-type:jwt-auth0",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Token exchange failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Exchange failed" },
      { status: 500 }
    );
  }
}
