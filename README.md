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

Edit `.env.local` — only 4 variables required:

```
DEVREV_API_BASE=https://api.devrev.ai
DEVREV_AAT=<your-application-access-token>
DEVREV_PAT=<your-personal-access-token>
DEVREV_DEV_ORG_ID=<your-org-id>
```

| Variable | What it does | Where to find it |
|----------|-------------|-----------------|
| `DEVREV_API_BASE` | API gateway URL | `https://api.devrev.ai` for production |
| `DEVREV_AAT` | Creates anonymous user sessions | DevRev Settings > Tokens > Application Access Token |
| `DEVREV_PAT` | Powers AI features, schema access, admin operations | DevRev Settings > Tokens > Personal Access Token |
| `DEVREV_DEV_ORG_ID` | Your org identifier | Without the `DEV-` prefix (e.g., `1JpSJovlTT`) |

That's it. These 4 variables power **everything** — data fetching, auth, AI personalization, ticket creation, search. No other config is needed to get started.

For Auth0 SSO (optional — only if you need authenticated login):
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

Keep the SDK, build your own UI. Use hooks to pull data:

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

All AI is powered by your `DEVREV_PAT` — no extra config, no artifacts, no setup. Just call the hooks:

```typescript
// Conversational AI — ask anything
const { apiCall } = useDevRevAPI()
const response = await apiCall("POST", "internal/recommendations.chat.completions", {
  messages: [
    { role: "system", content: "You are Acme's support assistant..." },
    { role: "user", content: "How do I reset my password?" },
  ],
  temperature: 0.3,
})
// response.text_response → AI answer

// Personalization — AI-generated homepage
assembleBlocks(
  { user, tickets, conversations, directories },
  apiCall,
  {
    systemPrompt: "Your product-specific instructions...",
    contextSignals: ["user_identity", "tickets", "conversations", "kb_directories"],
    temperature: 0.3,
    maxTokens: 600,
    actionCardCount: 4,
    suggestionCount: 3,
  }
) → { greeting, actionCards, sidebarBlocks }

// Ambient context — auto-injected into LLM calls
useAIContext() → { contextPrefix }
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
