"use client";

import { useState, useEffect, useMemo } from "react";
import { useDevRevAPI } from "../hooks/use-devrev";
import { useSession } from "../hooks/use-session";
import { cachedFetch } from "./cache";
import type { FilterDefinition } from "./types";

interface FilterOption {
  label: string;
  value: string;
}

export type FilterOptionsMap = Record<string, FilterOption[]>;

interface UseFilterOptionsReturn {
  /** Map of filter key → resolved options */
  options: FilterOptionsMap;
  /** Loading state */
  loading: boolean;
  /** Merge resolved options into filter definitions (replaces empty options) */
  resolvedDefinitions: FilterDefinition[];
}

// Map of known stock field names to their filter definition keys.
// The schema uses internal names; our filters use friendly keys.
const STOCK_FIELD_MAP: Record<string, string> = {
  severity: "severity",
  priority: "priority",
  source_channel: "source_channel",
  stage: "status",
};

/**
 * Fetches the ticket schema and resolves filter options from allowed_values.
 * Only processes fields that appear in the provided filter definitions.
 */
export function useFilterOptions(
  definitions: FilterDefinition[]
): UseFilterOptionsReturn {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [options, setOptions] = useState<FilterOptionsMap>({});
  const [loading, setLoading] = useState(true);

  // Which filter keys need dynamic options (select/multi-select without preset options)
  const dynamicKeys = useMemo(
    () =>
      new Set(
        definitions
          .filter(
            (d) =>
              (d.type === "select" || d.type === "multi-select") &&
              (!d.options || d.options.length === 0)
          )
          .map((d) => d.key)
      ),
    [definitions]
  );

  useEffect(() => {
    if (!token) return;

    // Even if all definitions have hardcoded options, try to fetch schema
    // to get the real values. This ensures options match the org's config.
    const filterKeys = new Set(
      definitions
        .filter((d) => d.type === "select" || d.type === "multi-select")
        .map((d) => d.key)
    );

    if (filterKeys.size === 0) {
      setLoading(false);
      return;
    }

    cachedFetch(
      "filter-options:ticket-schema",
      () =>
        apiCall<{
          schema?: {
            stock_fields?: Array<Record<string, unknown>>;
            stock_field_descriptors?: Array<Record<string, unknown>>;
            custom_fields?: Array<Record<string, unknown>>;
            custom_field_descriptors?: Array<Record<string, unknown>>;
          };
        }>("POST", "internal/schemas.aggregated.get", {
          leaf_type: "ticket",
          custom_schema_spec: {},
        }),
      { staleMs: 300_000, expireMs: 600_000 } // 5min stale, 10min expire (schema is stable)
    )
      .then((res) => {
        const schema = res.schema || res;
        const sd = schema as Record<string, unknown>;
        const stockFields = (
          sd.stock_fields ||
          sd.stock_field_descriptors ||
          []
        ) as Array<Record<string, unknown>>;

        const customFields = (
          sd.custom_fields ||
          sd.custom_field_descriptors ||
          []
        ) as Array<Record<string, unknown>>;

        const allFields = [...stockFields, ...customFields];
        const resolved: FilterOptionsMap = {};

        for (const field of allFields) {
          const fieldName = String(field.name || "");
          const fieldType = String(
            field.fieldType || field.field_type || ""
          );

          // Find which filter key this schema field maps to
          let filterKey: string | undefined;

          // Check stock field mapping
          if (STOCK_FIELD_MAP[fieldName]) {
            filterKey = STOCK_FIELD_MAP[fieldName];
          }

          // Check if any definition's fieldPath ends with this field name
          if (!filterKey) {
            const def = definitions.find(
              (d) =>
                d.fieldPath === fieldName ||
                d.fieldPath.endsWith(`.${fieldName}`) ||
                d.key === fieldName ||
                d.key === fieldName.replace("tnt__", "")
            );
            if (def) filterKey = def.key;
          }

          if (!filterKey || !filterKeys.has(filterKey)) continue;

          // Extract options based on field type
          if (
            fieldType === "enum" ||
            fieldType === "uenum" ||
            (fieldType === "array" &&
              (field.base_type === "enum" || field.baseType === "enum"))
          ) {
            const allowedValues =
              (field.allowed_values as unknown[]) ||
              (field.allowedValues as unknown[]) ||
              [];

            if (allowedValues.length > 0) {
              resolved[filterKey] = allowedValues.map((v) => {
                if (typeof v === "string") {
                  return {
                    label: formatLabel(v),
                    value: v,
                  };
                }
                if (typeof v === "object" && v !== null) {
                  const obj = v as Record<string, unknown>;
                  return {
                    label: String(
                      obj.label || obj.display_name || obj.name || obj.id || ""
                    ),
                    value: String(obj.value || obj.id || obj.ordinal || ""),
                  };
                }
                return { label: String(v), value: String(v) };
              });
            }
          }

          // For stage/status, check if the field has a composite structure
          if (fieldName === "stage" && !resolved[filterKey]) {
            // Stage options often come from subtypes, not the field itself.
            // We'll leave this for the hardcoded fallback.
          }
        }

        setOptions(resolved);
      })
      .catch(() => {
        // Schema fetch failed — filter options stay empty (hardcoded fallback applies)
      })
      .finally(() => setLoading(false));
  }, [token, apiCall, definitions, dynamicKeys]);

  // Merge resolved options into definitions — schema values take precedence
  const resolvedDefinitions = useMemo(
    () =>
      definitions.map((def) => {
        const resolved = options[def.key];
        if (resolved && resolved.length > 0) {
          return { ...def, options: resolved };
        }
        return def;
      }),
    [definitions, options]
  );

  return { options, loading, resolvedDefinitions };
}

/** Convert snake_case to Title Case: "in_progress" → "In Progress" */
function formatLabel(value: string): string {
  return value
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
