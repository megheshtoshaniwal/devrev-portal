"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  FilterDefinition,
  ActiveFilters,
  FilterValue,
  FilterOperator,
} from "./types";
import { getNestedValue } from "./types";

interface UseFiltersOptions {
  definitions: FilterDefinition[];
  initialFilters?: ActiveFilters;
}

interface UseFiltersReturn {
  /** Currently active filters */
  filters: ActiveFilters;
  /** Filter definitions (passed through for UI rendering) */
  definitions: FilterDefinition[];
  /** Set a single filter */
  setFilter: (key: string, operator: FilterOperator, value: unknown) => void;
  /** Remove a single filter */
  removeFilter: (key: string) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Replace all filters at once (e.g., from restored preferences) */
  setAllFilters: (filters: ActiveFilters) => void;
  /** Count of active filters */
  activeCount: number;
  /** Filters that should be sent to the API (built from serverSide definitions) */
  serverFilters: Record<string, unknown>;
  /** Predicate function that applies client-side filters to a single row */
  clientFilterFn: (item: unknown) => boolean;
}

export function useFilters({
  definitions,
  initialFilters = {},
}: UseFiltersOptions): UseFiltersReturn {
  const [filters, setFilters] = useState<ActiveFilters>(initialFilters);

  const setFilter = useCallback(
    (key: string, operator: FilterOperator, value: unknown) => {
      setFilters((prev) => ({ ...prev, [key]: { operator, value } }));
    },
    []
  );

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilters({}), []);

  const setAllFilters = useCallback(
    (f: ActiveFilters) => setFilters(f),
    []
  );

  const activeCount = Object.keys(filters).length;

  // Build API-ready params from server-side filter definitions
  const serverFilters = useMemo(() => {
    const params: Record<string, unknown> = {};
    for (const def of definitions) {
      if (!def.serverSide || !def.apiParam) continue;
      const active = filters[def.key];
      if (!active) continue;

      const { operator, value } = active;
      if (operator === "in" || operator === "eq") {
        params[def.apiParam] = Array.isArray(value) ? value : [value];
      } else {
        params[def.apiParam] = value;
      }
    }
    return params;
  }, [filters, definitions]);

  // Build a predicate for client-side filtering
  const clientFilterFn = useMemo(() => {
    // Collect only client-side active filters
    const clientDefs = definitions.filter(
      (d) => !d.serverSide && filters[d.key]
    );

    return (item: unknown): boolean => {
      for (const def of clientDefs) {
        const active = filters[def.key];
        if (!active) continue;

        const fieldValue = getNestedValue(item, def.fieldPath);
        if (!matchFilter(fieldValue, active)) return false;
      }
      return true;
    };
  }, [filters, definitions]);

  return {
    filters,
    definitions,
    setFilter,
    removeFilter,
    clearFilters,
    setAllFilters,
    activeCount,
    serverFilters,
    clientFilterFn,
  };
}

// ─── Filter matching logic ─────────────────────────────────────

function matchFilter(fieldValue: unknown, filter: FilterValue): boolean {
  const { operator, value } = filter;

  switch (operator) {
    case "eq":
      return fieldValue === value;

    case "neq":
      return fieldValue !== value;

    case "contains":
      if (typeof fieldValue === "string" && typeof value === "string") {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      return false;

    case "in":
      if (Array.isArray(value)) {
        if (Array.isArray(fieldValue)) {
          return fieldValue.some((v) => value.includes(v));
        }
        return value.includes(fieldValue);
      }
      return false;

    case "nin":
      if (Array.isArray(value)) {
        if (Array.isArray(fieldValue)) {
          return !fieldValue.some((v) => value.includes(v));
        }
        return !value.includes(fieldValue);
      }
      return true;

    case "gt":
      return compareValues(fieldValue, value) > 0;

    case "lt":
      return compareValues(fieldValue, value) < 0;

    case "gte":
      return compareValues(fieldValue, value) >= 0;

    case "lte":
      return compareValues(fieldValue, value) <= 0;

    case "exists":
      return value ? fieldValue != null : fieldValue == null;

    case "between": {
      if (!Array.isArray(value) || value.length !== 2) return true;
      const cmp = compareValues(fieldValue, value[0]);
      const cmp2 = compareValues(fieldValue, value[1]);
      return cmp >= 0 && cmp2 <= 0;
    }

    default:
      return true;
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Date strings
  if (typeof a === "string" && typeof b === "string") {
    const da = Date.parse(a);
    const db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return a.localeCompare(b);
  }

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  return String(a).localeCompare(String(b));
}
