import { NextResponse } from "next/server";

const API_BASE = process.env.DEVREV_API_BASE || "";

// GET /api/portal-config — fetch portal preferences (branding, features)
export async function GET() {
  const pat = process.env.DEVREV_PAT;
  if (!pat) {
    return NextResponse.json({ error: "PAT not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${API_BASE}/internal/portals.list`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) throw new Error(`Portal fetch failed: ${res.status}`);
    const data = await res.json();
    const portal = data.portals?.[0];
    if (!portal) throw new Error("No portal found");

    return NextResponse.json({
      orgName: portal.configuration?.org_name || "Help Center",
      accentColor: portal.styling?.accent_color || "#FF5A0A",
      theme: portal.styling?.theme || "light",
      headerImageEnabled: portal.styling?.header_image_enabled || false,
      logoArtifactId: portal.configuration?.org_logo?.id,
      helpCenterEnabled: portal.help_center?.enabled ?? true,
      ticketCreationEnabled: portal.tabs?.ticket_creation_enabled ?? true,
      turingEnabled: portal.configuration?.turing_response_enabled ?? true,
      poweredByDevRev: portal.configuration?.powered_by_devrev ?? true,
      publicPortalEnabled: portal.configuration?.public_portal_enabled ?? false,
      footerLinks: portal.configuration?.footer_group?.text_links?.filter((l: { enabled: boolean }) => l.enabled) || [],
      supportedLanguages: portal.supported_languages || [],
      preferredLocale: portal.preferred_locale || "en-US",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Config fetch failed" },
      { status: 500 }
    );
  }
}
