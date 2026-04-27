// Ticket list configuration — the customer-editable surface.
// Defines which fields are filterable, what columns appear, and default sort.
// Modify this file to customize the ticket list for your organization.
//
// To discover available fields for your org/user, check the browser console
// in dev mode — useAvailableFields logs all schema fields with ACL status.

import type { FilterDefinition, ColumnDefinition, SortState } from "@/devrev-sdk/data/types";
import type { Ticket } from "@/devrev-sdk/client/types";
import { formatRelativeTime, formatDate, formatDateTime } from "@/devrev-sdk/utils/format-date";

// ─── Filterable Fields ─────────────────────────────────────────
// Options are fallbacks — the SDK resolves real values from the schema API.

export const TICKET_FILTERS: FilterDefinition[] = [
  // ── Stock fields ──
  {
    key: "status",
    fieldPath: "stage.state.name",
    label: "Status",
    type: "multi-select",
    options: [
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Resolved", value: "resolved" },
      { label: "Closed", value: "closed" },
    ],
  },
  {
    key: "severity",
    fieldPath: "severity",
    label: "Severity",
    type: "multi-select",
    options: [
      { label: "Blocker", value: "blocker" },
      { label: "High", value: "high" },
      { label: "Medium", value: "medium" },
      { label: "Low", value: "low" },
    ],
  },
  {
    key: "needs_response",
    fieldPath: "needs_response",
    label: "Needs Response",
    type: "boolean",
  },
  {
    key: "source_channel",
    fieldPath: "source_channel",
    label: "Channel",
    type: "multi-select",
    options: [
      { label: "Email", value: "email" },
      { label: "Plug", value: "plug" },
      { label: "Slack", value: "slack" },
      { label: "Twilio", value: "twilio" },
      { label: "Twilio SMS", value: "twilio_sms" },
    ],
  },
  {
    key: "sentiment",
    fieldPath: "sentiment",
    label: "Sentiment",
    type: "multi-select",
    options: [
      { label: "Delighted", value: "Delighted" },
      { label: "Happy", value: "Happy" },
      { label: "Neutral", value: "Neutral" },
      { label: "Unhappy", value: "Unhappy" },
      { label: "Frustrated", value: "Frustrated" },
    ],
  },
  {
    key: "is_spam",
    fieldPath: "is_spam",
    label: "Spam",
    type: "boolean",
  },
  {
    key: "created_date",
    fieldPath: "created_date",
    label: "Created",
    type: "date-range",
  },
  {
    key: "modified_date",
    fieldPath: "modified_date",
    label: "Updated",
    type: "date-range",
  },
  {
    key: "target_close_date",
    fieldPath: "target_close_date",
    label: "Target Close",
    type: "date-range",
  },

  // ── Custom fields (Bill.com org: DEV-1JpSJovlTT) ──
  {
    key: "payment_method",
    fieldPath: "custom_fields.tnt__payment_method",
    label: "Payment Method",
    type: "multi-select",
    options: [
      { label: "ACH", value: "ach" },
      { label: "Check", value: "check" },
      { label: "Credit Card", value: "credit_card" },
      { label: "Virtual Card", value: "virtual_card" },
      { label: "Wire", value: "wire" },
    ],
  },
  {
    key: "priority_level",
    fieldPath: "custom_fields.tnt__priority_level",
    label: "Priority Level",
    type: "multi-select",
    options: [
      { label: "Critical", value: "critical" },
      { label: "High", value: "high" },
      { label: "Medium", value: "medium" },
      { label: "Low", value: "low" },
    ],
  },
  {
    key: "product_area",
    fieldPath: "custom_fields.tnt__product_area",
    label: "Product Area",
    type: "multi-select",
    options: [
      { label: "Account Settings", value: "account_settings" },
      { label: "Cards", value: "cards" },
      { label: "Integrations", value: "integrations" },
      { label: "Payables", value: "payables" },
      { label: "Receivables", value: "receivables" },
    ],
  },
  {
    key: "escalate",
    fieldPath: "custom_fields.tnt__escalate",
    label: "Escalated",
    type: "boolean",
  },
  {
    key: "is_recurring_issue",
    fieldPath: "custom_fields.tnt__is_recurring_issue",
    label: "Recurring Issue",
    type: "boolean",
  },
  {
    key: "date_of_occurrence",
    fieldPath: "custom_fields.tnt__date_of_occurrence",
    label: "Date of Occurrence",
    type: "date-range",
  },
];

// ─── Column Definitions ────────────────────────────────────────

export const TICKET_COLUMNS: ColumnDefinition<Ticket>[] = [
  // ── Core stock columns ──
  {
    key: "display_id",
    label: "ID",
    fieldPath: "display_id",
    defaultVisible: true,
    defaultWidth: 110,
    minWidth: 80,
    sortable: true,
  },
  {
    key: "title",
    label: "Title",
    fieldPath: "title",
    defaultVisible: true,
    minWidth: 200,
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    fieldPath: "state_display_name",
    defaultVisible: true,
    defaultWidth: 120,
    sortable: true,
    format: (val, row) =>
      (typeof val === "string" && val) ||
      row.stage?.name ||
      "Unknown",
  },
  {
    key: "severity",
    label: "Severity",
    fieldPath: "severity",
    defaultVisible: true,
    defaultWidth: 100,
    sortable: true,
    format: (val) =>
      typeof val === "string"
        ? val.charAt(0).toUpperCase() + val.slice(1)
        : "",
  },
  {
    key: "needs_response",
    label: "Needs Response",
    fieldPath: "needs_response",
    defaultVisible: true,
    defaultWidth: 130,
    format: (val) => (val ? "Yes" : "No"),
  },
  {
    key: "source_channel",
    label: "Channel",
    fieldPath: "source_channel",
    defaultVisible: true,
    defaultWidth: 110,
  },
  {
    key: "sentiment",
    label: "Sentiment",
    fieldPath: "sentiment",
    defaultVisible: true,
    defaultWidth: 110,
    format: (val) => (typeof val === "string" ? val : ""),
  },
  {
    key: "created_date",
    label: "Created",
    fieldPath: "created_date",
    defaultVisible: true,
    defaultWidth: 140,
    sortable: true,
    format: (val) => (typeof val === "string" ? formatDate(val) : ""),
  },
  {
    key: "modified_date",
    label: "Updated",
    fieldPath: "modified_date",
    defaultVisible: true,
    defaultWidth: 120,
    sortable: true,
    format: (val) => (typeof val === "string" ? formatRelativeTime(val) : ""),
  },
  {
    key: "target_close_date",
    label: "Target Close",
    fieldPath: "target_close_date",
    defaultVisible: true,
    defaultWidth: 140,
    sortable: true,
    format: (val) => (typeof val === "string" ? formatDate(val) : ""),
  },
  {
    key: "actual_close_date",
    label: "Close Date",
    fieldPath: "actual_close_date",
    defaultVisible: true,
    defaultWidth: 140,
    sortable: true,
    format: (val) => (typeof val === "string" ? formatDate(val) : ""),
  },
  {
    key: "owned_by",
    label: "Owner",
    fieldPath: "owned_by",
    defaultVisible: true,
    defaultWidth: 150,
    format: (val) => {
      if (Array.isArray(val))
        return val
          .map((u: { display_name?: string }) => u.display_name || "")
          .filter(Boolean)
          .join(", ");
      return "";
    },
  },
  {
    key: "reported_by",
    label: "Reported By",
    fieldPath: "reported_by",
    defaultVisible: true,
    defaultWidth: 150,
    format: (val) => {
      if (Array.isArray(val))
        return val
          .map((u: { display_name?: string }) => u.display_name || "")
          .filter(Boolean)
          .join(", ");
      return "";
    },
  },
  {
    key: "part",
    label: "Part",
    fieldPath: "applies_to_part.name",
    defaultVisible: true,
    defaultWidth: 140,
    format: (val) => (typeof val === "string" ? val : ""),
  },
  {
    key: "rev_org",
    label: "Workspace",
    fieldPath: "rev_org.display_name",
    defaultVisible: true,
    defaultWidth: 140,
    format: (val) => (typeof val === "string" ? val : ""),
  },
  {
    key: "tags",
    label: "Tags",
    fieldPath: "tags",
    defaultVisible: true,
    defaultWidth: 160,
    format: (val) => {
      if (Array.isArray(val))
        return val
          .map((t: { tag?: { name?: string } }) => t.tag?.name || "")
          .filter(Boolean)
          .join(", ");
      return "";
    },
  },

  // ── Custom fields (Bill.com org) ──
  {
    key: "payment_method",
    label: "Payment Method",
    fieldPath: "custom_fields.tnt__payment_method",
    defaultVisible: true,
    defaultWidth: 130,
    format: (val) =>
      typeof val === "string"
        ? val.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : "",
  },
  {
    key: "priority_level",
    label: "Priority Level",
    fieldPath: "custom_fields.tnt__priority_level",
    defaultVisible: true,
    defaultWidth: 120,
    sortable: true,
    format: (val) =>
      typeof val === "string"
        ? val.charAt(0).toUpperCase() + val.slice(1)
        : "",
  },
  {
    key: "product_area",
    label: "Product Area",
    fieldPath: "custom_fields.tnt__product_area",
    defaultVisible: true,
    defaultWidth: 130,
    format: (val) =>
      typeof val === "string"
        ? val.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : "",
  },
  {
    key: "error_code",
    label: "Error Code",
    fieldPath: "custom_fields.tnt__error_code",
    defaultVisible: true,
    defaultWidth: 120,
  },
  {
    key: "amount_affected",
    label: "Amount ($)",
    fieldPath: "custom_fields.tnt__amount_affected",
    defaultVisible: true,
    defaultWidth: 110,
    sortable: true,
    format: (val) =>
      typeof val === "number" ? `$${val.toLocaleString()}` : "",
  },
  {
    key: "affected_users_count",
    label: "Affected Users",
    fieldPath: "custom_fields.tnt__affected_users_count",
    defaultVisible: true,
    defaultWidth: 120,
    sortable: true,
    format: (val) =>
      typeof val === "number" ? val.toLocaleString() : "",
  },
  {
    key: "date_of_occurrence",
    label: "Date of Occurrence",
    fieldPath: "custom_fields.tnt__date_of_occurrence",
    defaultVisible: true,
    defaultWidth: 140,
    sortable: true,
    format: (val) => (typeof val === "string" ? formatDate(val) : ""),
  },
  {
    key: "escalate",
    label: "Escalated",
    fieldPath: "custom_fields.tnt__escalate",
    defaultVisible: true,
    defaultWidth: 100,
    format: (val) => (val === true ? "Yes" : val === false ? "No" : ""),
  },
  {
    key: "is_recurring_issue",
    label: "Recurring",
    fieldPath: "custom_fields.tnt__is_recurring_issue",
    defaultVisible: true,
    defaultWidth: 100,
    format: (val) => (val === true ? "Yes" : val === false ? "No" : ""),
  },
];

// ─── Default Sort ──────────────────────────────────────────────

export const TICKET_DEFAULT_SORT: SortState = {
  key: "modified_date",
  direction: "desc",
};
