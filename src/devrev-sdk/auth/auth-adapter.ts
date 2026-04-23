/**
 * Auth adapter interface for plugging in any identity provider.
 *
 * DevRev's session system needs an identity token from *some* provider
 * (Auth0, Clerk, Okta, custom SAML, etc.). Implement this interface
 * to bridge your provider into the DevRev session flow.
 *
 * The SDK ships with a built-in Auth0 adapter — see auth0-adapter.ts.
 */
export interface AuthAdapter {
  /** Human-readable name, e.g. "Auth0", "Clerk", "Okta" */
  readonly name: string;

  /** Trigger the login flow (redirect, popup, etc.) */
  login(): Promise<void>;

  /** Trigger the logout flow */
  logout(): Promise<void>;

  /**
   * Return the current identity token from your provider,
   * or null if the user is not authenticated.
   */
  getIdentityToken(): Promise<string | null>;

  /**
   * Subscribe to token changes. Return an unsubscribe function.
   * Called when the provider refreshes or invalidates the token.
   */
  onTokenChange(cb: (token: string | null) => void): () => void;
}
