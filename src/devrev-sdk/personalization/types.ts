/**
 * Personalization config types — owned by the SDK.
 * Portal-layer PortalConfig.personalization references these types.
 */

export type ContextSignal =
  | "user_identity"
  | "tickets"
  | "conversations"
  | "kb_directories"
  | "articles_viewed"
  | "search_history"
  | "customer_group"
  | "custom_fields";

export interface PersonalizationConfig {
  /** Full system prompt sent to the LLM for homepage personalization */
  systemPrompt: string;
  /** Which user context signals to include in the LLM call */
  contextSignals: ContextSignal[];
  /** LLM temperature (0 = deterministic, 1 = creative) */
  temperature: number;
  /** Max tokens for LLM response */
  maxTokens: number;
  /** Number of action cards to generate */
  actionCardCount: number;
  /** Number of quick-action suggestions to generate */
  suggestionCount: number;
}
