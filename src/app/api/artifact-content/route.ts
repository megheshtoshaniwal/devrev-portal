import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.DEVREV_API_BASE || "";

/**
 * Server-side proxy for fetching artifact content.
 * S3 artifact URLs don't have CORS headers, so we can't fetch them from the browser.
 * This endpoint: locates the artifact → fetches content from S3 → returns it.
 */
export async function GET(req: NextRequest) {
  const artifactId = req.nextUrl.searchParams.get("id");
  const token = req.headers.get("authorization");

  if (!artifactId || !token) {
    return NextResponse.json(
      { error: "Missing id or authorization" },
      { status: 400 }
    );
  }

  const locateOnly = req.nextUrl.searchParams.get("locate_only") === "true";

  try {
    // Step 1: Locate the artifact
    const locateUrl = `${API_BASE}/internal/artifacts.locate?id=${encodeURIComponent(artifactId)}&preview=true`;
    const locateRes = await fetch(locateUrl, {
      headers: { Authorization: token },
    });

    if (!locateRes.ok) {
      return NextResponse.json(
        { error: `Locate failed: ${locateRes.status}` },
        { status: locateRes.status }
      );
    }

    const locateData = await locateRes.json();
    const artifactUrl = locateData.url || locateData.artifact_url;

    if (!artifactUrl) {
      return NextResponse.json({ error: "No artifact URL" }, { status: 404 });
    }

    // If locate_only, return the URL for the client to use directly (e.g. for <img src>)
    if (locateOnly) {
      return NextResponse.json({ url: artifactUrl });
    }

    // Step 2: Fetch the actual content from S3
    const contentRes = await fetch(artifactUrl);
    if (!contentRes.ok) {
      return NextResponse.json(
        { error: `Content fetch failed: ${contentRes.status}` },
        { status: contentRes.status }
      );
    }

    const text = await contentRes.text();
    const contentType = contentRes.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": contentType.includes("devrev") ? "application/json" : contentType,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch artifact content" },
      { status: 500 }
    );
  }
}
