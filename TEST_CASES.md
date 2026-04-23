# Customer Portal — Test Cases

Complete test plan for the DevRev customer portal. Covers every feature built.
Updated: 2026-04-23

---

## 1. Authentication

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Anonymous session | Open portal without logging in | Portal loads, anonymous session created, "Sign in" button visible |
| 1.2 | Login redirect | Click "Sign in" | Redirects to login page |
| 1.3 | Session persistence | Log in, close tab, reopen | Session restored from localStorage |
| 1.4 | Logout | Click user avatar → Sign out | Session cleared, redirected to home |
| 1.5 | User info display | Log in | Avatar initial, name, email shown in header dropdown |

---

## 2. Homepage

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Page loads | Navigate to home | Hero section, action cards, chat input, sidebar all render |
| 2.2 | LLM personalization | Log in as user with tickets | Greeting is personalized (not generic), action cards reference user's tickets |
| 2.3 | Fallback personalization | If LLM endpoint is down | Rules-based greeting and cards appear (not blank) |
| 2.4 | Action card click | Click any action card | Conversation starts with card's title + subtitle as message |
| 2.5 | Flash conversation | Type a question, press Enter | Message appears, typing indicator shows, agent reply eventually appears |
| 2.6 | Sidebar — Feed tab | Click Feed tab | Shows recent conversations + ticket list |
| 2.7 | Sidebar — Knowledge tab | Click Knowledge tab | Shows KB directory categories |
| 2.8 | Ticket links | Click a ticket in sidebar | Navigates to ticket detail page |
| 2.9 | New conversation button | Start a conversation, click "New conversation" | Thread clears, hero reappears |
| 2.10 | Config: sidebar position | Change `layout.homepage.sidebarPosition` to "left" | Sidebar moves to left |
| 2.11 | Config: hide hero | Set `layout.homepage.showHero` to false | Hero section hidden, only cards + input |
| 2.12 | Config: card columns | Change `actionCardColumns` to 2 or 3 | Grid columns change |
| 2.13 | Config: assistant name | Change `content.assistantName` to "Aria" | All Flash references become "Aria" |

---

## 3. Article Rendering

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Tiptap article loads | Open article with Tiptap content (e.g., ART-271) | Article body renders with headings, paragraphs, formatted text |
| 3.2 | Callout blocks | Open article with calloutBlockNode | Callout renders with colored background (info=blue, warning=amber, etc.) |
| 3.3 | Inline images | Open article with image nodes | Images render, loaded from artifact URLs |
| 3.4 | Tables | Open article with table content | Table renders with headers and cells |
| 3.5 | Code blocks | Open article with codeBlock | Code renders in monospace with background |
| 3.6 | Blockquotes | Open article with blockquote | Styled with left border, italic |
| 3.7 | Lists | Open article with bullet/ordered lists | Lists render with proper markers |
| 3.8 | Links | Open article with links | Links are clickable, open in new tab |
| 3.9 | Fallback content | Open article without resource artifacts (e.g., ART-269) | Falls back to extracted_content or description |
| 3.10 | Breadcrumbs | Open any article | Breadcrumb shows: Home > Knowledge Base > Directory > Article |
| 3.11 | Metadata | Open article | Published date and author shown |
| 3.12 | Tags | Open article with tags | Tag badges displayed |
| 3.13 | Related articles | Open article in a directory with siblings | "Related articles" section shows sibling articles |

---

## 4. Article AI Features

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | AI Summary loads | Open any article with substantial content | "AI Summary" bar appears with TL;DR, read time, audience |
| 4.2 | Key steps | Open a how-to article | Summary includes numbered key steps checklist |
| 4.3 | Summary collapse | Click the summary bar header | Summary collapses, metadata pills (read time, audience) stay visible |
| 4.4 | Ask Flash — send question | Type a question in "Ask Flash" input, press Enter | Message sent, typing indicator, AI response grounded in article |
| 4.5 | Ask Flash — context | Ask "does this apply to enterprise?" | Response references the article content, not generic |
| 4.6 | Ask Flash — follow-up | Send a second message | Conversation continues in same thread |
| 4.7 | Ask Flash — new question | Click "New question" | Thread clears |
| 4.8 | Related ticket banner | Log in with user who has open tickets matching article topic | "This may help with TKT-xxx" banner appears |
| 4.9 | Related ticket — dismiss | Click "Dismiss" on the banner | Banner disappears |
| 4.10 | Config: disable AI summary | Set `features.aiSummary` to false | No summary bar on articles |
| 4.11 | Config: disable Ask Flash | Set `features.askFlash` to false | No Ask Flash input on articles |
| 4.12 | Config: disable ticket matching | Set `features.ticketMatching` to false | No related ticket banner |

---

## 5. Table of Contents

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | TOC appears | Open article with 3+ headings | Sticky TOC sidebar on the right |
| 5.2 | TOC hidden | Open article with <3 headings | No TOC sidebar |
| 5.3 | TOC scroll tracking | Scroll through article | Active heading highlighted in TOC, auto-expands groups |
| 5.4 | TOC click | Click a heading in TOC | Smooth scrolls to that heading |
| 5.5 | Config: TOC position | Set `layout.article.tocPosition` to "left" | TOC moves to left side |
| 5.6 | Config: TOC min headings | Set `tocMinHeadings` to 5 | TOC only shows on articles with 5+ headings |
| 5.7 | Config: disable TOC | Set `layout.article.showToc` to false | No TOC on any article |

---

## 6. Article Interactions

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | Vote up | Click "Yes" on helpful | Button highlights, shows "Yes — Thanks!" |
| 6.2 | Vote down | Click "No" | Button highlights |
| 6.3 | Vote toggle | Click vote again | Vote removed |
| 6.4 | Subscribe | Click "Subscribe" | Button changes to "Subscribed" with filled icon |
| 6.5 | Config: disable voting | Set `features.articleVoting` to false | Voting buttons hidden |
| 6.6 | Config: disable subscribe | Set `features.articleSubscribe` to false | Subscribe button hidden |

---

## 7. Knowledge Base

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Directories list | Navigate to /directories | All top-level KB directories shown |
| 7.2 | Directory detail | Click a directory | Shows articles in that directory |
| 7.3 | Article click | Click an article from directory | Opens article page |
| 7.4 | Breadcrumb nav | Click breadcrumb links | Navigates to correct parent |

---

## 8. Ticket Creation — Full Flow

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | Page loads | Navigate to /tickets/create | "How can we help?" with description textarea |
| 8.2 | Deflection | Type "How do I edit wire settings" → Continue | Shows relevant KB articles before form |
| 8.3 | Deflection bypass | Click "I still need to create a ticket" | Form appears |
| 8.4 | Skip to form | Click "Skip to form" link | Goes directly to form, no deflection |
| 8.5 | AI form assist — title | Type "My ACH payment failed with error PMT-4022" → Continue | Title pre-filled with clean summary |
| 8.6 | AI form assist — description | Same as above | Description structured (problem, steps, expected behavior) |
| 8.7 | AI form assist — subtype | Type problem matching a subtype | Subtype auto-selected in dropdown |
| 8.8 | AI missing info | Type vague description "something is broken" | Amber banner shows AI suggestions for what to add |
| 8.9 | Journey context | Read an article first, then navigate to create ticket | "You recently read: [article]" banner shown |
| 8.10 | Journey context attached | Submit ticket after reading articles | Ticket body includes "Articles reviewed before creating this ticket" |
| 8.11 | Submit success | Fill title + submit | Success screen with ticket ID and "View Ticket" link |
| 8.12 | Config: disable AI assist | Set `ticketCreation.aiAssist` to false | No AI pre-fill, goes straight to blank form |
| 8.13 | Config: disable deflection | Set `ticketCreation.deflection` to false | No article suggestions, goes to form after describe |
| 8.14 | Config: disable both | Set both to false | Goes directly to form (no describe step) |
| 8.15 | Config: custom AI prompt | Change `aiAssistPrompt` | AI generates different suggestions based on new prompt |
| 8.16 | Config: custom deflection prompt | Change `deflectionPrompt` | Deflection responses match new prompt style |

---

## 9. Ticket Creation — Schema-Driven Fields

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1 | Custom fields render | Open create form | Shows dynamic fields below title/description: Payment Method, Error Code, etc. |
| 9.2 | Enum dropdown | Click Payment Method dropdown | Shows: ACH, Wire, Check, Credit Card, Virtual Card |
| 9.3 | Required validation | Try to submit without filling required fields | Submit button works but required fields should be marked |
| 9.4 | Bool toggle | Toggle "Is Recurring Issue" | Switches on/off |
| 9.5 | Date picker | Click Date of Occurrence | Date input works |
| 9.6 | Number input | Enter value in Affected Users Count | Accepts integers only |
| 9.7 | Double input | Enter value in Amount Affected | Accepts decimals |
| 9.8 | Text input | Enter text in Error Code | Free text works |
| 9.9 | Field ACL — hidden fields | Log in as rev user | Should NOT see agent-only fields (owned_by, severity, needs_response, stage) |
| 9.10 | Field ACL — only permitted fields | Log in as rev user | Should only see fields from Customers role: title, body, type, artifacts + 10 tenant fields |
| 9.11 | Subtype selector | If org has multiple subtypes | Dropdown shows only subtypes user has Create privilege for |
| 9.12 | Auto-select single subtype | If only 1 subtype available | Auto-selected, no dropdown shown |
| 9.13 | Custom fields in payload | Submit ticket with custom field values | Ticket created with `custom_fields` containing the values |

---

## 10. Ticket List & Detail

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Ticket list | Navigate to /tickets | Shows user's tickets grouped by status |
| 10.2 | Ticket detail | Click a ticket | Shows conversation thread, metadata, reply input |
| 10.3 | Reply to ticket | Type a reply and send | Message appears in thread, agent eventually replies |
| 10.4 | Ticket metadata | View ticket detail | Shows status, severity, created date, display_id |

---

## 11. Unified History

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.1 | History page | Navigate to /history | Merged list of tickets + conversations, sorted by date |

---

## 12. Branding & Theming

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 12.1 | Accent color | Check portal | Primary buttons, links, accents match Bill.com blue (#0176D3) |
| 12.2 | Logo in header | Check header | Shows "BILL" text badge (or logo image if URL configured) |
| 12.3 | Logo in footer | Check footer | Smaller version of header logo |
| 12.4 | Portal title | Check header | Shows "Help Center" next to logo |
| 12.5 | Dark mode | Set `branding.theme` to "dark" | All colors invert to dark scheme |
| 12.6 | Custom accent | Change `branding.accentColor` to "150 80% 40%" (green) | All primary colors change to green |
| 12.7 | Border radius | Change `branding.borderRadius` to "sm" vs "xl" | Cards and inputs become sharper or rounder |
| 12.8 | Custom font | Set `branding.fontFamily` to "Georgia, serif" | Font changes throughout |
| 12.9 | Custom stylesheet | Set `branding.customStylesheetUrl` | External CSS injected |
| 12.10 | Hero gradient | Change `styles.heroGradient` colors | Hero background gradient changes |

---

## 13. Navigation & Footer

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13.1 | Header nav items | Check header | Shows Home, My Requests, Knowledge Base with icons |
| 13.2 | Nav links work | Click each nav item | Navigates to correct page |
| 13.3 | Mobile menu | Resize to mobile width | Hamburger menu appears, nav items in dropdown |
| 13.4 | Footer links | Check footer | Shows configured links (Investor Relations, Press, etc.) |
| 13.5 | Powered by DevRev | Check footer | "Powered by DevRev" link visible |
| 13.6 | Config: hide powered by | Set `features.poweredByDevrev` to false | DevRev attribution hidden |
| 13.7 | Config: custom nav | Add/remove items in `navigation.items` | Header nav updates |
| 13.8 | Config: custom footer links | Change `footer.links` | Footer links update |

---

## 14. Config System

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 14.1 | Defaults work | Remove all overrides from providers.tsx | Portal loads with default config (orange accent, "Flash" assistant) |
| 14.2 | Bill preset | Apply BILL_CONFIG overrides | Blue accent, "BILL Assistant", Bill-specific prompts |
| 14.3 | Config merge | Override only `branding.accentColor` | Only color changes, everything else stays at defaults |
| 14.4 | Feature toggles | Disable all AI features | No AI summary, no Ask Flash, no ticket matching, no AI form assist |
| 14.5 | Custom prompt | Change `personalization.systemPrompt` | Homepage cards reflect new prompt |
| 14.6 | Context signals | Remove "tickets" from `contextSignals` | LLM doesn't reference user's tickets in greeting |

---

## 15. Edge Cases & Error Handling

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 15.1 | Article not found | Navigate to /articles/NONEXISTENT | "Article not found" with link to KB |
| 15.2 | Empty KB | Org with no articles | Directories page shows empty state |
| 15.3 | No tickets | User with no tickets | Homepage sidebar shows "No tickets yet" |
| 15.4 | LLM timeout | If LLM endpoint is slow/down | AI features fail gracefully — summary doesn't appear, form assist falls back to raw description |
| 15.5 | API error on ticket create | Token expired during form fill | Error state (not crash) |
| 15.6 | Long article | Article with 50+ paragraphs | Renders without performance issues, TOC works |
| 15.7 | Empty description submit | Try submitting ticket with empty title | Submit button disabled or validation prevents it |

---

## 16. Test Ticket Descriptions

Copy-paste these into the "How can we help?" box to test different scenarios.

### Deflection tests (should suggest KB articles)

| # | Input | Tests |
|---|-------|-------|
| D1 | `How do I edit wire and ACH settings?` | Should match ART-271, deflection shows article |
| D2 | `What are the user roles and permissions in BILL?` | Should match ART-269 or similar |
| D3 | `How to reset MFA for a user` | Should match MFA-related article |

### AI form assist — field extraction

| # | Input | Expected fields |
|---|-------|-----------------|
| F1 | `My ACH payment to vendor ABC Corp failed with error PMT-4022 yesterday. The amount was $12,500 and this is the third time it happened.` | Title: ~"ACH payment failed — error PMT-4022", Payment Method: ACH, Error Code: PMT-4022, Amount: 12500, Date: yesterday, Recurring: yes, Product Area: Payables |
| F2 | `Wire transfer of $85,000 stuck in processing for 3 days, started on April 20. Affects our whole finance team of 8 people.` | Payment Method: Wire, Amount: 85000, Date: April 20, Affected Users: 8, Product Area: Payables |
| F3 | `Can't sync our QuickBooks data. Getting timeout errors every time we try. Started Monday.` | Product Area: Integrations, Date: Monday, Recurring: probably yes |
| F4 | `Need to set up virtual cards for our team of 15 people for the new expense policy` | Product Area: Cards, Affected Users: 15 |
| F5 | `Our customers aren't receiving the invoices we sent last week through BILL Receivables` | Product Area: Receivables, Date: last week |
| F6 | `URGENT: All credit card payments are failing across our entire org. 50+ users affected since 8am today. Error code CC-9001.` | Priority: Critical, Payment Method: Credit Card, Error Code: CC-9001, Affected Users: 50+, Recurring: no (since today), Product Area: Cards or Payables |

### Priority inference

| # | Input | Expected priority |
|---|-------|-------------------|
| P1 | `Minor cosmetic issue — the date format on expense reports looks wrong` | Low |
| P2 | `Approval workflow is slow, takes 30 seconds to load` | Medium |
| P3 | `Cannot process payroll payments. Deadline is tomorrow.` | High |
| P4 | `URGENT: Complete payment system outage. No one in the company can send or receive payments.` | Critical |

### Vague inputs (should trigger missing info suggestions)

| # | Input | Expected AI response |
|---|-------|---------------------|
| V1 | `Something is broken` | Should ask: What product area? What were you doing? When did it start? |
| V2 | `Payment failed` | Should ask: Which payment method? Error code? Amount? |
| V3 | `Help` | Should ask: What do you need help with? |
| V4 | `I have a question about my account settings` | Should infer Product Area: Account Settings, ask what specifically |

### Multi-field extraction

| # | Input | Validates |
|---|-------|-----------|
| M1 | `Check payment #4521 for $3,200 to Smith & Co bounced on April 15. Error NSF-001. This happened last month too with the same vendor. We need this fixed ASAP — it's blocking 3 people in accounting.` | Payment Method: Check, Amount: 3200, Date: April 15, Error Code: NSF-001, Recurring: yes, Priority: High, Affected Users: 3, Product Area: Payables |
| M2 | `We switched to virtual cards last week but none of them are working for our 12 team members. Error VC-ACTIVATION-FAILED shows on every card since April 18.` | Payment Method: Virtual Card, Affected Users: 12, Error Code: VC-ACTIVATION-FAILED, Date: April 18, Product Area: Cards, Recurring: yes |

---

## Quick Smoke Test (5 minutes)

Run these 10 tests for a fast sanity check:

1. Open portal → homepage loads with personalization
2. Click an article → content renders with headings/formatting
3. AI Summary bar appears on the article
4. Ask Flash a question about the article → get contextual response
5. Navigate to /tickets/create → describe step loads
6. Type "payment failed" → deflection shows articles
7. Click "I still need to create a ticket" → form with custom fields
8. Only customer-permitted fields visible (no owned_by, severity, etc.)
9. Fill required fields → submit → success screen
10. Check header shows Bill.com branding (blue, "BILL", "Help Center")
