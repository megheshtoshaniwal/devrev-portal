import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.DEVREV_API_BASE || "https://api.dev.devrev-eng.ai";
const CONFIG_ARTIFACT_NAME = "portal-extended-config.json";

/**
 * Extended portal configuration — stored as a JSON artifact in DevRev.
 *
 * This supplements the standard portal preferences API with fields it doesn't
 * support: personalization prompts, context signals, layout config, AI feature
 * flags, style overrides, etc.
 *
 * Storage: JSON artifact with a known filename. We search by name to find it,
 * and create/update as needed.
 *
 * GET  — returns the merged config (standard preferences + extended config)
 * POST — saves the extended config (requires PAT / dev user token)
 */

// ─── GET: Read config ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization");
  if (!token) {
    return NextResponse.json({ error: "No authorization" }, { status: 401 });
  }

  try {
    // Fetch both in parallel: standard portal preferences + our extended config
    const [portalPrefs, extendedConfig] = await Promise.all([
      fetchPortalPreferences(token),
      fetchExtendedConfig(),
    ]);

    return NextResponse.json({
      portal_preferences: portalPrefs,
      extended_config: extendedConfig,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load config", portal_preferences: null, extended_config: null },
      { status: 200 } // Return 200 with nulls so the portal still loads with defaults
    );
  }
}

// ─── POST: Save extended config ─────────────────────────────────

export async function POST(req: NextRequest) {
  // Only PAT (dev user) can save config — this is the admin operation
  const pat = process.env.DEVREV_PAT;
  if (!pat) {
    return NextResponse.json(
      { error: "Server not configured for config writes (no PAT)" },
      { status: 500 }
    );
  }

  // Verify the request comes from an authenticated user
  const token = req.headers.get("authorization");
  if (!token) {
    return NextResponse.json({ error: "No authorization" }, { status: 401 });
  }

  try {
    const configData = await req.json();

    // Step 1: Prepare a new artifact
    const prepareRes = await fetch(`${API_BASE}/internal/artifacts.prepare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_name: CONFIG_ARTIFACT_NAME,
        file_type: "application/json",
      }),
    });

    if (!prepareRes.ok) {
      throw new Error(`Prepare failed: ${prepareRes.status}`);
    }

    const prepareData = await prepareRes.json();
    const artifactId = prepareData.id;
    const uploadUrl = prepareData.url;
    const formFields = prepareData.form_data as Array<{ key: string; value: string }>;

    // Step 2: Upload the config JSON to S3
    const formData = new FormData();
    for (const field of formFields) {
      formData.append(field.key, field.value);
    }

    // Add timestamp metadata
    const configWithMeta = {
      ...configData,
      _meta: {
        updated_at: new Date().toISOString(),
        artifact_id: artifactId,
      },
    };

    const blob = new Blob([JSON.stringify(configWithMeta, null, 2)], {
      type: "application/json",
    });
    formData.append("file", blob, CONFIG_ARTIFACT_NAME);

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok && uploadRes.status !== 204) {
      throw new Error(`Upload failed: ${uploadRes.status}`);
    }

    // Step 3: Store the artifact ID so we can find it later
    // We store it in an env-accessible way. In production this would be
    // stored as part of the portal's configuration in DevRev.
    // For now we use a process-level cache.
    setConfigArtifactId(artifactId);

    return NextResponse.json({
      success: true,
      artifact_id: artifactId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save config: ${message}` },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────

// In-process cache for the config artifact ID.
// In production, this would be stored in the portal preferences or a DB.
let cachedConfigArtifactId: string | null = process.env.PORTAL_CONFIG_ARTIFACT_ID || null;

function setConfigArtifactId(id: string) {
  cachedConfigArtifactId = id;
}

async function fetchPortalPreferences(token: string) {
  try {
    const slug = process.env.DEVREV_PORTAL_SLUG || "bill-portal-demo";
    const res = await fetch(`${API_BASE}/internal/dev-orgs.portal-preferences.get?slug=${slug}`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchExtendedConfig() {
  if (!cachedConfigArtifactId) return null;

  const pat = process.env.DEVREV_PAT;
  if (!pat) return null;

  try {
    // Locate the artifact
    const locateRes = await fetch(
      `${API_BASE}/internal/artifacts.locate?id=${encodeURIComponent(cachedConfigArtifactId)}&preview=true`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );
    if (!locateRes.ok) return null;

    const locateData = await locateRes.json();
    const url = locateData.url;
    if (!url) return null;

    // Fetch the config JSON
    const configRes = await fetch(url);
    if (!configRes.ok) return null;

    return configRes.json();
  } catch {
    return null;
  }
}
