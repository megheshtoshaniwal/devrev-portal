/**
 * Minimal brand context for AI/LLM calls.
 * Avoids coupling the SDK to the full PortalConfig type.
 */
export interface BrandContext {
  orgName?: string;
  assistantName?: string;
}
