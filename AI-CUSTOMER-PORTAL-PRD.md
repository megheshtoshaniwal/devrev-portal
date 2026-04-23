# AI Customer Portal — Product Overview

## What Is It?

The AI Customer Portal is a **fully customizable, AI-native help center** that DevRev customers deploy for their end users. It replaces static knowledge bases and clunky ticket forms with an intelligent, conversational support experience.

Think of it as: **Zendesk Help Center meets ChatGPT, built on DevRev's data layer.**

Every portal comes with DevRev's AI baked in — personalized homepages, conversational search, smart ticket creation with deflection — but the entire look and feel is owned by the customer.

---

## Who Uses It?

### End Users (the customer's customers)
- Visit the portal to find answers, browse articles, create tickets, and chat with AI
- See a personalized homepage based on their tickets, conversations, and history
- Get instant AI answers without waiting for a support agent

### DevRev Admins (the customer's support team)
- Configure the portal from Settings > Plug & Portal > AI Customer Portal
- Control branding, AI behavior, feature toggles, and appearance — no code needed
- Write custom AI prompts that understand their product domain

### Developers (advanced customization)
- Fork the portal codebase and build any UI they want
- Keep DevRev's SDK (data, auth, AI) untouched — only replace the visual layer
- Deploy anywhere (Vercel, AWS, self-hosted)

---

## What Does It Do?

### 1. AI-Powered Conversational Home

The homepage isn't static. It's **personalized per user** by an LLM that sees:
- Their open tickets and which ones need a response
- Their recent conversations
- What knowledge base articles exist
- Their browsing history in the current session

The AI generates:
- A **personalized greeting** ("Hey Sarah, 2 tickets need your response")
- **Smart action cards** — the 4 most relevant things for this user right now
- **Suggested questions** — what they're likely to ask based on context

The user can type anything into the conversational bar. The AI creates a conversation, responds in real-time, and can escalate to a human agent seamlessly.

### 2. Knowledge Base

- Articles organized by directories/categories
- Full-text search powered by DevRev's search API
- **AI article summaries** — TL;DR, key steps, audience, read time (generated on demand)
- **Ask Flash on articles** — a contextual AI chat scoped to the current article ("How does this apply to my account?")
- Table of contents, article voting, breadcrumb navigation
- Supports Tiptap JSON and Paligo HTML content formats

### 3. Smart Ticket Creation

The ticket creation flow is a **3-step AI-assisted process**:

**Step 1: Describe** — User writes their problem in plain language.

**Step 2: Deflect** — AI searches the knowledge base for relevant articles. If a match is found, it shows them before creating a ticket ("Did this article answer your question?"). This reduces ticket volume.

**Step 3: Form** — AI auto-fills the ticket form:
- Suggests a title from the description
- Detects the right subtype (billing, technical, feature request, etc.)
- Fills custom fields (payment method, error code, amount, date, etc.)
- Identifies what info is missing and asks follow-up questions

The admin configures:
- The AI assist prompt (domain-specific instructions)
- The deflection prompt (how to match articles)
- Max deflection results
- Status page URL (check for known outages before creating a ticket)
- Whether to show a "Skip to form" button

### 4. Ticket Tracking

- Users see all their tickets with status badges
- "Needs your response" tickets highlighted at the top
- Full conversation timeline on each ticket
- Real-time updates

### 5. Authentication

- **Anonymous access** — public portals work without login (configurable)
- **Pluggable SSO** — AuthAdapter interface supports any identity provider:
  - Auth0 (ships built-in)
  - Clerk, Okta, custom SAML — implement 4 methods, done
- **Session management** — httpOnly cookies for SSR, localStorage fallback for client
- **Token exchange** — any identity provider token → DevRev session token

---

## How Do Customers Set It Up?

### Path 1: No-Code (Admin Settings)

1. Go to **Settings > Plug & Portal > AI Customer Portal** in the DevRev app
2. Configure 3 tabs:

**General Tab:**
| Setting | What it does |
|---------|-------------|
| Organization name | Shows in header and footer |
| Accent color | Primary brand color (HSL) |
| Dark/light theme | Overall color scheme |
| Portal title | Header text (e.g., "Acme Help Center") |
| Welcome headline | Hero section text |
| Search placeholder | Conversational input placeholder |
| Feature toggles | Turn on/off: tickets, search, AI summary, Ask Flash, article voting, public access, SEO, "Powered by DevRev" |

**AI & Personalization Tab:**
| Setting | What it does |
|---------|-------------|
| Assistant name | AI identity (e.g., "Flash", "Aria", "Support Bot") |
| Assistant icon | Visual icon (Zap, Sparkles, Bot, Brain, Star) |
| Personalization prompt | System prompt that tells the AI about your product, users, and what to recommend |
| Context signals | What data the AI sees: user identity, tickets, conversations, KB, search history, customer group |
| Temperature | How creative the AI is (0 = precise, 1 = creative) |
| Action card count | How many smart recommendation cards to show |
| Ticket AI assist | Enable/disable, custom prompt for form-filling |
| Ticket deflection | Enable/disable, custom prompt for article matching, max results |
| Status page URL | Check for outages before ticket creation |

**Appearance Tab:**
| Setting | What it does |
|---------|-------------|
| Color tokens | 8 customizable colors: primary, background, foreground, muted, border, card, accent, destructive |
| Sidebar position | Left, right, or none |
| Action card columns | 2, 3, or 4 |
| Show hero | Toggle the hero section |
| Table of contents | Toggle + position (left/right) on articles |
| Card style | Flat, elevated, or outlined |
| Button style | Rounded, pill, or square |
| Hero gradient | 3-stop gradient for the hero background |

### Path 2: Full Code Customization

For customers who want a completely custom help center (like Figma's):

1. Clone the portal repository
2. Set 4 environment variables:
   ```
   DEVREV_API_BASE=https://api.devrev.ai
   DEVREV_AAT=<application-access-token>
   DEVREV_PAT=<personal-access-token>
   DEVREV_DEV_ORG_ID=<org-id>
   ```
3. Keep `src/devrev-sdk/` untouched — this is the data/auth/AI layer
4. Replace everything in `src/portal/`, `src/components/`, `src/app/` with their own UI
5. Use SDK hooks to pull data:
   ```tsx
   import { useDirectories } from '@/devrev-sdk/data/use-directories'
   import { useTickets } from '@/devrev-sdk/data/use-tickets'
   import { useSession } from '@/devrev-sdk/hooks/use-session'

   function MyHelpCenter() {
     const { directories } = useDirectories()
     const { tickets } = useTickets({ limit: 10 })
     const { user, login } = useSession()
     // Build whatever UI you want
   }
   ```
6. Deploy as a standard Next.js app (Vercel, AWS, etc.)

---

## SDK Reference

### Data Hooks
| Hook | Returns |
|------|---------|
| `useTickets({ limit })` | `{ tickets, loading }` — user's support tickets |
| `useTicket(id)` | `{ ticket, timeline, loading }` — single ticket with conversation |
| `useConversations({ limit })` | `{ conversations, loading }` — user's conversations |
| `useDirectories()` | `{ directories, loading }` — KB category tree |
| `useDirectoryArticles(id)` | `{ articles, loading }` — articles in a directory |

### Auth
| API | What it does |
|-----|-------------|
| `useSession()` | `{ user, token, isAuthenticated, login, logout, loading }` |
| `DevRevProvider` | Wraps app with session + brand context |
| `AuthAdapter` interface | Plug in any SSO provider |
| `createAuth0Adapter()` | Built-in Auth0 implementation |

### AI
| API | What it does |
|-----|-------------|
| `useAIContext()` | `{ contextPrefix }` — ambient context for LLM calls |
| `assembleBlocks(signals, apiCall, config)` | Personalized homepage layout from LLM |
| `buildAmbientContext({ user, brandContext, locale })` | System context string for any LLM call |

### Schema & Forms
| API | What it does |
|-----|-------------|
| `useTicketSubtypes()` | Available ticket subtypes with permissions |
| `useTicketSchema(subtype)` | Form fields for a subtype (stock + custom) |
| `useTicketForm(schema, acl)` | Form state management, validation, field visibility |

### Articles
| API | What it does |
|-----|-------------|
| `fetchArticleContent(article)` | Fetches Tiptap/Paligo/plain text content |
| `extractTocFromTiptap(doc)` | Table of contents from article content |

### Server-Side (for SSR/ISR)
| API | What it does |
|-----|-------------|
| `getArticle(id, token)` | Fetch article server-side |
| `getDirectoryTree(token)` | Fetch KB tree server-side |
| `getSessionToken()` | Read session from httpOnly cookie |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  CUSTOMER'S UI (Portal Layer)                        │
│  Components, pages, styles — fully replaceable       │
│  Default reference implementation included           │
│  Figma-style demo included as example                │
└────────────────────┬─────────────────────────────────┘
                     │ imports hooks
┌────────────────────▼─────────────────────────────────┐
│  DEVREV SDK                                          │
│  Data hooks, auth, AI, schema, articles              │
│  Pure logic — no UI opinions                         │
└────────────────────┬─────────────────────────────────┘
                     │ API calls via proxy
┌────────────────────▼─────────────────────────────────┐
│  DEVREV PLATFORM                                     │
│  Tickets, conversations, KB, search, LLM, auth       │
│  All via /api/devrev/* proxy (CORS-free)             │
└──────────────────────────────────────────────────────┘
```

### Config Resolution (3 layers)
```
DEFAULT_CONFIG  ←  Portal Preferences API  ←  Extended Config Artifact
  (ships with       (admin UI writes         (AI prompts, layout,
   the code)          here via                 styles — JSON stored
                      portals.update)          as DevRev artifact)
```

---

## What Makes This Different?

### vs. Zendesk Help Center
- **AI-native** — not bolted on. Personalization, deflection, and form-filling are core, not add-ons
- **Conversation-first** — the homepage IS a chat interface, not a search box leading to articles
- **Fully customizable code** — not just themes and CSS. Fork the entire UI layer

### vs. Intercom Help Center
- **SDK architecture** — developers can build any UI, not locked into Intercom's widget
- **Schema-aware AI** — ticket form fields are auto-filled from natural language, not just title + description
- **SSR support** — server-side rendering for SEO, not just a client-side widget

### vs. Building From Scratch
- **10 minutes to launch** — set 4 env vars, deploy, done
- **AI included** — personalization engine, deflection, form-assist all built-in
- **Auth handled** — anonymous sessions, SSO, token management all solved
- **Data layer solved** — tickets, articles, conversations, search all through typed hooks

---

## Demo URLs

- **Default portal:** `/en-US/bill-portal-demo` (Bill.com themed)
- **Figma portal:** `/en-US/figma-help-center` (Figma themed, built with same SDK)
- **Admin settings:** DevRev app > Settings > Plug & Portal > AI Customer Portal

---

## What's Needed for Production

1. Create `ui_ai_customer_portal_enabled` feature flag in LaunchDarkly
2. Add i18n translation keys for admin settings labels
3. Wire extended config artifact write in the Save flow (AI prompts, layout, styles)
4. Reduce portal config cache TTL or add webhook for instant config updates
5. Add admin settings unit tests (Jest)
6. Documentation: SDK hook reference, customization guide, deployment guide
