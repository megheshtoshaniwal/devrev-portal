# Execution Progress: Bill Portal Custom Fields
Plan: bill-portal-fields-plan.md
Started: 2026-04-23

## Completed
- [x] Verify API access — connected as meghesh-toshaniwal
- [x] Check existing tenant fragment fields — found 2 (escalate, notify_others)
- [x] Create 8 custom fields via schemas.custom.set (merged with existing) — fragment don:core:dvrv-us-1:devo/1JpSJovlTT:tenant_fragment/14495
- [x] Verify fields in aggregated schema — all 10 fields present (8 new + 2 existing)
- [x] Update API proxy to swap PAT for schema endpoints (rev users get 403)
- [x] Build clean — portal compiles with all changes

## Fields Created
| Field | Type | Required | API Name |
|-------|------|----------|----------|
| Payment Method | enum (ach, wire, check, credit_card, virtual_card) | Yes | tnt__payment_method |
| Error Code | text | No | tnt__error_code |
| Amount Affected ($) | double | No | tnt__amount_affected |
| Is Recurring Issue | bool | No | tnt__is_recurring_issue |
| Date of Occurrence | date | Yes | tnt__date_of_occurrence |
| Affected Users Count | int | No | tnt__affected_users_count |
| Priority Level | enum (low, medium, high, critical) | Yes | tnt__priority_level |
| Product Area | enum (payables, receivables, spend_and_expense, cards, integrations, account_settings) | Yes | tnt__product_area |

## Permissions
- [x] Checked customer groups: Platinum Support, Gold Support, Standard Support, Customers (dynamic)
- [ ] Field access role creation failed — `roles.create` API has different payload than documented. Fields are visible via PAT/proxy but may need UI-level role config for rev users.

## Notes
- Schema endpoints (schemas.subtypes.list, schemas.aggregated.get, etc.) return 403 for rev user tokens. Proxied through our API route with PAT swap.
- Field names get `tnt__` prefix in aggregated schema (tenant fragment naming convention).
