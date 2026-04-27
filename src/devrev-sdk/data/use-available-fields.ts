"use client";

import { useState, useEffect } from "react";
import { useDevRevAPI } from "../hooks/use-devrev";
import { useSession } from "../hooks/use-session";
import { cachedFetch } from "./cache";

export interface AvailableField {
  /** Field name as it appears in the API (e.g., "severity", "tnt__payment_method") */
  name: string;
  /** Human-readable label */
  label: string;
  /** Field type (enum, text, bool, date, int, double, etc.) */
  fieldType: string;
  /** For enum/uenum fields, the allowed values */
  allowedValues?: string[];
  /** Whether it's a stock or custom (tenant) field */
  source: "stock" | "custom";
  /** Suggested fieldPath for ColumnDefinition/FilterDefinition */
  fieldPath: string;
  /** Whether the current user can read this field */
  canRead: boolean;
  /** Whether the current user can write this field */
  canWrite: boolean;
  /** Suggested filter type based on fieldType */
  suggestedFilterType: "select" | "multi-select" | "text" | "date-range" | "boolean" | null;
}

interface UseAvailableFieldsReturn {
  fields: AvailableField[];
  loading: boolean;
  /** Log all available fields to console in a readable table */
  logFields: () => void;
}

export function useAvailableFields(): UseAvailableFieldsReturn {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [fields, setFields] = useState<AvailableField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      // Fetch schema
      cachedFetch(
        "available-fields:schema",
        () =>
          apiCall<{
            schema?: Record<string, unknown>;
          }>("POST", "internal/schemas.aggregated.get", {
            leaf_type: "ticket",
            custom_schema_spec: {},
          }),
        { staleMs: 300_000, expireMs: 600_000 }
      ),
      // Fetch ACL
      apiCall<{
        items: Array<{
          is_field_acl_enabled?: boolean;
          field_privileges?: {
            read?: { stock_fields?: string[]; tenant_fields?: string[]; subtype_fields?: string[] };
            write?: { stock_fields?: string[]; tenant_fields?: string[]; subtype_fields?: string[] };
          };
        }>;
      }>("POST", "internal/batch.apply", {
        items: [{ batch_type: "user_privileges", target: { object_type: "ticket" } }],
      }).catch(() => ({ items: [] })),
    ])
      .then(([schemaRes, aclRes]) => {
        const schema = schemaRes.schema || schemaRes;
        const sd = schema as Record<string, unknown>;

        const stockFields = (
          sd.stock_fields || sd.stock_field_descriptors || []
        ) as Array<Record<string, unknown>>;

        const customFields = (
          sd.custom_fields || sd.custom_field_descriptors || []
        ) as Array<Record<string, unknown>>;

        // Build ACL sets
        const aclItem = aclRes.items?.[0];
        const aclEnabled = aclItem?.is_field_acl_enabled ?? false;
        const fp = aclItem?.field_privileges;

        const readableSet = aclEnabled && fp
          ? new Set([
              ...(fp.read?.stock_fields || []),
              ...(fp.read?.tenant_fields || []),
              ...(fp.read?.subtype_fields || []),
            ])
          : null; // null = ACL not enabled, all readable

        const writableSet = aclEnabled && fp
          ? new Set([
              ...(fp.write?.stock_fields || []),
              ...(fp.write?.tenant_fields || []),
              ...(fp.write?.subtype_fields || []),
            ])
          : null;

        const result: AvailableField[] = [];

        for (const field of stockFields) {
          result.push(parseField(field, "stock", readableSet, writableSet));
        }
        for (const field of customFields) {
          result.push(parseField(field, "custom", readableSet, writableSet));
        }

        // Sort: readable first, then by source, then alphabetical
        result.sort((a, b) => {
          if (a.canRead !== b.canRead) return a.canRead ? -1 : 1;
          if (a.source !== b.source) return a.source === "stock" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        setFields(result);
      })
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [token, apiCall]);

  const logFields = () => {
    if (fields.length === 0) {
      console.log("[DevRev SDK] No fields loaded yet. Wait for loading to complete.");
      return;
    }

    console.log("\n[DevRev SDK] Available ticket fields for your user:\n");

    const readable = fields.filter((f) => f.canRead);
    const hidden = fields.filter((f) => !f.canRead);

    console.table(
      readable.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.fieldType,
        source: f.source,
        fieldPath: f.fieldPath,
        filterType: f.suggestedFilterType || "—",
        values: f.allowedValues?.join(", ") || "—",
      }))
    );

    if (hidden.length > 0) {
      console.log(`\n[DevRev SDK] ${hidden.length} fields hidden by ACL:`, hidden.map((f) => f.name).join(", "));
    }

    console.log(
      "\n[DevRev SDK] To add a field as a column, add to TICKET_COLUMNS in portal/config/ticket-list-config.ts:" +
      "\n  { key: \"<name>\", label: \"<label>\", fieldPath: \"<fieldPath>\", defaultVisible: true }" +
      "\n\nTo add as a filter:" +
      "\n  { key: \"<name>\", fieldPath: \"<fieldPath>\", label: \"<label>\", type: \"<filterType>\" }\n"
    );
  };

  return { fields, loading, logFields };
}

// ─── Helpers ───────────────────────────────────────────────────

function parseField(
  field: Record<string, unknown>,
  source: "stock" | "custom",
  readableSet: Set<string> | null,
  writableSet: Set<string> | null
): AvailableField {
  const name = String(field.name || "");
  const fieldType = String(field.fieldType || field.field_type || "text");
  const displayName = String(
    field.displayName || field.display_name || ""
  );
  const ui = field.ui as Record<string, unknown> | undefined;
  const uiDisplayName = ui
    ? String(ui.displayName || ui.display_name || "")
    : "";

  const label = uiDisplayName || displayName || formatLabel(name);

  // Resolve allowed values
  let allowedValues: string[] | undefined;
  const raw = (field.allowed_values || field.allowedValues) as unknown[] | undefined;
  if (raw && raw.length > 0) {
    allowedValues = raw.map((v) => {
      if (typeof v === "string") return v;
      if (typeof v === "object" && v !== null) {
        const obj = v as Record<string, unknown>;
        return String(obj.value || obj.label || obj.id || obj.ordinal || "");
      }
      return String(v);
    });
  }

  // Field path: custom fields with tnt__ prefix use that directly
  // Stock fields that are nested (like stage) need the dot path
  let fieldPath = name;
  if (name === "stage") fieldPath = "stage.state.name";

  // ACL check
  const canRead = readableSet
    ? readableSet.has(name) || readableSet.has(name.replace("tnt__", "")) || readableSet.has(`tnt__${name}`)
    : true;
  const canWrite = writableSet
    ? writableSet.has(name) || writableSet.has(name.replace("tnt__", "")) || writableSet.has(`tnt__${name}`)
    : true;

  // Suggest filter type
  let suggestedFilterType: AvailableField["suggestedFilterType"] = null;
  switch (fieldType) {
    case "enum":
    case "uenum":
      suggestedFilterType = "multi-select";
      break;
    case "bool":
      suggestedFilterType = "boolean";
      break;
    case "text":
    case "rich_text":
    case "tokens":
      suggestedFilterType = "text";
      break;
    case "date":
    case "timestamp":
      suggestedFilterType = "date-range";
      break;
    case "array":
      // Check base type
      if (field.base_type === "enum" || field.baseType === "enum") {
        suggestedFilterType = "multi-select";
      }
      break;
  }

  return {
    name,
    label,
    fieldType,
    allowedValues,
    source,
    fieldPath,
    canRead,
    canWrite,
    suggestedFilterType,
  };
}

function formatLabel(name: string): string {
  return name
    .replace(/^tnt__/, "")
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
