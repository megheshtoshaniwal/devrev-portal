# DevRev AI Customer Portal

Build a fully customizable, AI-native help center powered by DevRev.

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/megheshtoshaniwal/devrev-portal.git
cd devrev-portal
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your DevRev credentials:

```
DEVREV_API_BASE=https://api.devrev.ai
DEVREV_AAT=<your-application-access-token>
DEVREV_PAT=<your-personal-access-token>
DEVREV_DEV_ORG_ID=<your-org-id>
DEVREV_PORTAL_SLUG=my-portal
```

**Where to get these:**
- **AAT** — DevRev Settings > Tokens > Application Access Token
- **PAT** — DevRev Settings > Tokens > Personal Access Token
- **Org ID** — Without the `DEV-` prefix (e.g., `1JpSJovlTT`)

For Auth0 SSO (optional):
```
NEXT_PUBLIC_AUTH0_DOMAIN=<your-auth0-domain>
NEXT_PUBLIC_AUTH0_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_REV_AUTH0_ORG_ID=<your-org-id>
```

### 3. Run

```bash
npm run dev
```

Open `http://localhost:3000/en-US/my-portal`

---

## Architecture

```
src/
  devrev-sdk/     ← DevRev's SDK. Data, auth, AI. Don't modify.
  portal/         ← Config layer. Presets, theming, defaults.
  components/     ← UI components. Replace with your own.
  app/            ← Pages and routing. Build any layout.
```

**The rule:** `devrev-sdk/` is a black box. Everything else is yours.

---

## Build Your Own Portal

### Option A: Customize the reference portal

Edit the config preset to match your brand:

```typescript
// src/portal/config/presets/my-company.ts
import type { PortalConfig } from "../types";

export const MY_CONFIG: Partial<PortalConfig> = {
  branding: {
    orgName: "Acme Corp",
    accentColor: "220 90% 56%",  // HSL
    theme: "light",
  },
  content: {
    welcomeHeadline: "How can we help?",
    assistantName: "Aria",
    portalTitle: "Acme Support",
  },
  features: {
    ticketCreation: true,
    search: true,
    aiSummary: true,
  },
};
```

Register it in `src/app/[locale]/[portalSlug]/layout.tsx`:

```typescript
import { MY_CONFIG } from "@/portal/config/presets/my-company";

const PRESET_MAP = {
  "my-portal": MY_CONFIG,
};
```

### Option B: Build a completely custom UI

Keep the SDK, replace everything else. Use hooks to pull data:

```tsx
import { useSession } from '@/devrev-sdk/hooks/use-session'
import { useTickets } from '@/devrev-sdk/data/use-tickets'
import { useDirectories } from '@/devrev-sdk/data/use-directories'
import { useConversations } from '@/devrev-sdk/data/use-conversations'
import { useDevRevAPI } from '@/devrev-sdk/hooks/use-devrev'

function MyHelpCenter() {
  const { user, isAuthenticated, login, logout } = useSession()
  const { tickets } = useTickets({ limit: 10 })
  const { directories } = useDirectories()
  const { conversations } = useConversations({ limit: 5 })
  const { apiCall } = useDevRevAPI()

  // Build whatever UI you want
}
```

See `src/components/figma/` for a complete example — a Figma-style help center built entirely with SDK hooks.

---

## SDK Reference

### Data Hooks

```typescript
useTickets({ limit })        → { tickets: Ticket[], loading }
useTicket(displayId)         → { ticket, timeline, loading }
useConversations({ limit })  → { conversations: Conversation[], loading }
useDirectories()             → { directories: DirectoryNode[], loading }
useDirectoryArticles(id)     → { articles: Article[], loading }
```

### Auth

```typescript
useSession()  → { user, token, isAuthenticated, login, logout, loading }

// Wrap your app with DevRevProvider
<DevRevProvider
  initialToken={token}
  initialUser={user}
  brandContext={{ orgName: "Acme", assistantName: "Aria" }}
  authAdapter={createAuth0Adapter()}  // or your own AuthAdapter
>
  {children}
</DevRevProvider>
```

### Custom SSO

Implement the `AuthAdapter` interface to use any identity provider:

```typescript
import type { AuthAdapter } from '@/devrev-sdk/auth/auth-adapter'

const myAdapter: AuthAdapter = {
  name: "MySSO",
  async login() { /* redirect to your SSO */ },
  async logout() { /* clear session */ },
  async getIdentityToken() { /* return JWT */ },
  onTokenChange(cb) { /* subscribe to token changes */ return () => {} },
}
```

### AI

```typescript
useAIContext()  → { contextPrefix }  // Ambient context for LLM calls

// Personalization engine
assembleBlocks(
  { user, tickets, conversations, directories },
  apiCall,
  personalizationConfig
) → { greeting, actionCards, sidebarBlocks }
```

### Schema & Forms

```typescript
useTicketSubtypes()         → { subtypes: Subtype[], loading }
useTicketSchema(subtype)    → { schema: AggregatedSchema, loading }
useTicketForm(schema, acl)  → { entity, formFields, updateField, isValid }
```

### Articles

```typescript
fetchArticleContent(article)   → ArticleContent (Tiptap JSON / Paligo HTML / plain text)
extractTocFromTiptap(doc)      → TOCItem[]
```

---

## Portal Config

All configuration is driven by `PortalConfig`. Three resolution layers:

```
Defaults  ←  Portal Preferences API  ←  Extended Config Artifact
```

### Configurable areas

| Area | What you control |
|------|-----------------|
| **Branding** | Org name, logo, accent color, theme, border radius, font |
| **Content** | Headlines, search placeholder, assistant name/icon, labels |
| **AI** | Personalization prompt, context signals, temperature, deflection |
| **Ticket Creation** | AI assist, deflection, status page, journey context |
| **Features** | Toggle: tickets, search, AI summary, voting, public access, SEO |
| **Layout** | Sidebar position, columns, hero, TOC, max width |
| **Styles** | Card style, button style, hero gradient, 8 color tokens |
| **Navigation** | Header nav items, footer links, social links |

---

## Deployment

Standard Next.js deployment. Works with:

- **Vercel** — `vercel deploy`
- **AWS** — via Docker or serverless
- **Self-hosted** — `npm run build && npm start`

---

## Examples

- **Default portal** — `src/portal/config/presets/bill.ts` (Bill.com themed)
- **Figma portal** — `src/components/figma/` (complete Figma-style help center)
- **Product overview** — `AI-CUSTOMER-PORTAL-PRD.md`

---

## Testing

```bash
npm test          # Run all 105 tests
npm run test:watch  # Watch mode
```
