// DevRev Portal SDK — Main barrel export
//
// NOTE: Server-only modules are NOT re-exported here to avoid
// pulling next/headers into client bundles. Import them directly:
//   - @/devrev-sdk/auth/session (server cookie management)
//   - @/devrev-sdk/data/server-fetchers (ISR data fetching)

export * from "./client";
export * from "./auth/auth-adapter";
export { createAuth0Adapter } from "./auth/auth0-adapter";
export * from "./hooks";
export * from "./data";
export * from "./ai";
export * from "./personalization";
export * from "./schema";
export * from "./articles";
export * from "./utils";
