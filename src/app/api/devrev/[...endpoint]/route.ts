import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.DEVREV_API_BASE || "https://api.devrev.ai";

// For LLM calls, the API returns SSE format even with stream:false.
// We need to use the PAT for LLM endpoints since rev user tokens may not have access.
const LLM_ENDPOINTS = ["internal/recommendations.chat.completions", "internal/recommendations.chat.complete"];

// Schema endpoints need PAT — rev user tokens get 403.
const PAT_REQUIRED_ENDPOINTS = [
  ...LLM_ENDPOINTS,
  "internal/schemas.subtypes.list",
  "internal/schemas.aggregated.get",
  "internal/schemas.stock.get",
  "internal/schemas.custom.get",
  "internal/schemas.custom.list",
];

function isLLMEndpoint(path: string): boolean {
  return LLM_ENDPOINTS.some((e) => path === e);
}

function needsPAT(path: string): boolean {
  return PAT_REQUIRED_ENDPOINTS.some((e) => path === e);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const { endpoint } = await params;
  const path = endpoint.join("/");
  // Read token from header first, then fall back to cookie (SSR support)
  let token = req.headers.get("authorization") || req.cookies.get("devrev_session")?.value || null;
  if (!token) {
    return NextResponse.json({ error: "No authorization token" }, { status: 401 });
  }

  // LLM and schema endpoints need the PAT (dev user token), not the rev user token
  if (needsPAT(path) && process.env.DEVREV_PAT) {
    token = `Bearer ${process.env.DEVREV_PAT}`;
  }

  const body = await req.json().catch(() => ({}));

const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Language": req.headers.get("accept-language") || "en-US",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    return NextResponse.json(
      { error: "Token expired", code: "TOKEN_EXPIRED" },
      { status: 401 }
    );
  }

  // Determine if the upstream responded with SSE
  const contentType = res.headers.get("content-type") || "";
  const isSSE = contentType.includes("text/event-stream");

  // For LLM endpoints: if the caller sent stream:false AND the upstream
  // returned regular JSON (not SSE), pass it through directly.
  if (isLLMEndpoint(path) && !isSSE) {
    const data = await res.json().catch(() => ({ error: "Invalid JSON response" }));
    return NextResponse.json(data, { status: res.status });
  }

  // Handle SSE responses (LLM endpoints may still return SSE with stream:true
  // or when the upstream ignores the stream flag)
  if (isSSE || isLLMEndpoint(path)) {
    const text = await res.text();
    // Parse SSE: extract all "data: " lines and combine
    const dataLines = text
      .split("\n")
      .filter((line: string) => line.startsWith("data: "))
      .map((line: string) => line.slice(6).trim())
      .filter((line: string) => line && line !== "[DONE]");

    if (dataLines.length > 0) {
      // Try last line first (most common: single complete JSON response)
      try {
        const parsed = JSON.parse(dataLines[dataLines.length - 1]);
        return NextResponse.json(parsed, { status: res.status });
      } catch {
        // If last line fails, try concatenating all lines (chunked response)
        try {
          const combined = dataLines.join("");
          const parsed = JSON.parse(combined);
          return NextResponse.json(parsed, { status: res.status });
        } catch {
          // Raw text fallback
          return NextResponse.json(
            { text_response: dataLines.join("\n") },
            { status: res.status }
          );
        }
      }
    }
    return NextResponse.json({ error: "Empty SSE response" }, { status: 500 });
  }

  const data = await res.json().catch(() => ({ error: "Invalid JSON response" }));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const { endpoint } = await params;
  const path = endpoint.join("/");
  // Read token from header first, then fall back to cookie (SSR support)
  const token = req.headers.get("authorization") || req.cookies.get("devrev_session")?.value || null;
  if (!token) {
    return NextResponse.json({ error: "No authorization token" }, { status: 401 });
  }

  const url = new URL(req.url);
  const targetUrl = `${API_BASE}/${path}${url.search}`;

  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Authorization: token,
      "Accept-Language": req.headers.get("accept-language") || "en-US",
    },
  });

  const data = await res.json().catch(() => ({ error: "Invalid JSON response" }));
  return NextResponse.json(data, { status: res.status });
}
