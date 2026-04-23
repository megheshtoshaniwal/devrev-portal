"use client";

import type { AuthAdapter } from "./auth-adapter";
import { getAuth0Client } from "./auth0-client";

/**
 * Auth0 adapter — the default auth provider for DevRev portals.
 *
 * Uses the Auth0 SPA SDK to handle login/logout and token management.
 * If you use a different identity provider (Clerk, Okta, custom SAML),
 * implement AuthAdapter directly instead of using this.
 */
export function createAuth0Adapter(): AuthAdapter {
  return {
    name: "Auth0",

    async login() {
      const client = await getAuth0Client();
      await client.loginWithRedirect();
    },

    async logout() {
      const client = await getAuth0Client();
      await client.logout({
        logoutParams: { returnTo: window.location.origin },
      });
    },

    async getIdentityToken() {
      try {
        const client = await getAuth0Client();
        return await client.getTokenSilently();
      } catch {
        return null;
      }
    },

    onTokenChange(_cb) {
      // Auth0 SPA SDK doesn't have a native token change event.
      // Tokens are refreshed silently via getTokenSilently().
      return () => {};
    },
  };
}
