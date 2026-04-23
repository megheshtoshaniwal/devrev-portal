import { Auth0Client } from "@auth0/auth0-spa-js";

let auth0Client: Auth0Client | null = null;

export function getAuth0Config() {
  return {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "rev.auth.dev.devrev-eng.ai",
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "3ZLDI8T7hTKQBXpUpeQbhpet4oehkXVQ",
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "janus",
    revAuth0OrgId: process.env.NEXT_PUBLIC_REV_AUTH0_ORG_ID || "org_5l4dhTw5HZo9tqAv",
  };
}

export async function getAuth0Client(): Promise<Auth0Client> {
  if (auth0Client) return auth0Client;

  const config = getAuth0Config();
  // Derive callback URL from current path: /[locale]/[portalSlug]/callback
  const parts = window.location.pathname.split("/").filter(Boolean);
  const locale = parts[0] || "en-US";
  const slug = parts[1] || "bill-portal-demo";
  const redirectUri = `${window.location.origin}/${locale}/${slug}/callback`;

  auth0Client = new Auth0Client({
    domain: config.domain,
    clientId: config.clientId,
    authorizationParams: {
      redirect_uri: redirectUri,
      audience: config.audience,
      organization: config.revAuth0OrgId,
      scope: "openid profile email",
    },
    cacheLocation: "localstorage",
  });

  return auth0Client;
}
