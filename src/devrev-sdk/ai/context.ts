// Ambient context for all LLM calls.
// Things that any reasonable assistant would know — injected automatically,
// no configuration needed.

import type { RevUser } from "../client/types";
import type { BrandContext } from "./types";

/**
 * Build a system context string that gets prepended to every LLM user message.
 * Contains ambient facts the LLM needs to give accurate, grounded responses.
 */
export function buildAmbientContext(opts: {
  user?: RevUser | null;
  brandContext?: BrandContext;
  locale?: string;
}): string {
  const { user, brandContext, locale } = opts;
  const parts: string[] = [];

  // 1. Current date and time — for resolving relative dates
  const now = new Date();
  const isoDate = now.toISOString().split("T")[0];
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
  parts.push(`Current date: ${isoDate} (${dayOfWeek})`);

  // 2. User's timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = now.getTimezoneOffset();
    const offsetHrs = Math.abs(Math.floor(offset / 60));
    const offsetMin = Math.abs(offset % 60);
    const sign = offset <= 0 ? "+" : "-";
    parts.push(`Timezone: ${tz} (UTC${sign}${offsetHrs}${offsetMin > 0 ? `:${offsetMin}` : ""})`);
  } catch {
    // Ignore if timezone detection fails
  }

  // 3. User identity — so the LLM doesn't ask who they are
  if (user) {
    const nameParts: string[] = [];
    if (user.display_name) nameParts.push(user.display_name);
    if (user.email) nameParts.push(`(${user.email})`);
    if (nameParts.length > 0) {
      parts.push(`User: ${nameParts.join(" ")}`);
    }
    if (user.rev_org?.display_name) {
      parts.push(`Organization: ${user.rev_org.display_name}`);
    }
  }

  // 4. Brand/product context
  if (brandContext) {
    const orgName = brandContext.orgName;
    if (orgName && orgName !== "Help Center") {
      parts.push(`Product/Brand: ${orgName}`);
    }
    const assistantName = brandContext.assistantName;
    if (assistantName) {
      parts.push(`You are: ${assistantName} (the AI assistant for this portal)`);
    }
  }

  // 5. Locale
  if (locale) {
    parts.push(`Locale: ${locale}`);
  }

  return parts.join("\n");
}

/**
 * Wrap a user message with ambient context.
 * Use this for all LLM calls to ensure the model has basic facts.
 */
export function withAmbientContext(
  message: string,
  opts: {
    user?: RevUser | null;
    brandContext?: BrandContext;
    locale?: string;
  }
): string {
  const context = buildAmbientContext(opts);
  return `${context}\n\n---\n\n${message}`;
}
