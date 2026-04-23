import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateThemeCss } from "@/portal/config/server";
import { DEFAULT_CONFIG } from "@/portal/config/defaults";
import type { PortalConfig } from "@/portal/config/types";

describe("generateThemeCss", () => {
  it("generates CSS with default config", () => {
    const css = generateThemeCss(DEFAULT_CONFIG);
    expect(css).toContain(":root");
    expect(css).toContain("--primary:");
    expect(css).toContain("--radius:");
  });

  it("includes accent color override", () => {
    const config: PortalConfig = {
      ...DEFAULT_CONFIG,
      branding: { ...DEFAULT_CONFIG.branding, accentColor: "210 99% 42%" },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--primary: 210 99% 42%");
  });

  it("includes style color overrides", () => {
    const config: PortalConfig = {
      ...DEFAULT_CONFIG,
      styles: {
        ...DEFAULT_CONFIG.styles,
        colors: {
          background: "0 0% 10%",
          foreground: "0 0% 90%",
        },
      },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--background: 0 0% 10%");
    expect(css).toContain("--foreground: 0 0% 90%");
  });

  it("maps border radius values", () => {
    const config: PortalConfig = {
      ...DEFAULT_CONFIG,
      branding: { ...DEFAULT_CONFIG.branding, borderRadius: "sm" },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--radius: 0.25rem");
  });

  it("includes font family when set", () => {
    const config: PortalConfig = {
      ...DEFAULT_CONFIG,
      branding: { ...DEFAULT_CONFIG.branding, fontFamily: "Georgia, serif" },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--font-sans: Georgia, serif");
  });
});
