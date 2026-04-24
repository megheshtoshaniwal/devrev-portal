---
customer: Bill Portal Demo
org: DEV-1JpSJovlTT
api_base: https://api.dev.devrev-eng.ai
---

# Bill Portal — Custom Fields Plan

## Custom Fields on Ticket (tenant_fragment)

| # | Field Name | Type | Required | Values | Description |
|---|---|---|---|---|---|
| 1 | payment_method | enum | Yes | ACH, Wire, Check, Credit Card, Virtual Card | Payment method used |
| 2 | error_code | text | No | — | Error code from the system |
| 3 | amount_affected | double | No | — | Dollar amount impacted |
| 4 | is_recurring_issue | bool | No | — | Whether this has happened before |
| 5 | date_of_occurrence | date | Yes | — | When the issue happened |
| 6 | affected_users_count | int | No | — | Number of users impacted |
| 7 | priority_level | enum | Yes | Low, Medium, High, Critical | Urgency level |
| 8 | product_area | enum | Yes | Payables, Receivables, Spend & Expense, Cards, Integrations, Account Settings | Which product area |

## Permissions
- All fields visible and editable by rev users (customers) during ticket creation
- Check for existing customer groups and assign field access roles
