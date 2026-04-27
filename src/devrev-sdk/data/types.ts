// Generic types for list views: filtering, columns, sorting, preferences.
// These are SDK primitives — no ticket-specific field names here.
// The portal layer binds specific fields via config objects.

// ─── Filter Types ──────────────────────────────────────────────

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "in"
  | "nin"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "exists"
  | "between";

export interface FilterValue {
  operator: FilterOperator;
  value: unknown;
}

export interface FilterDefinition {
  /** Unique key for this filter (e.g., "status", "severity") */
  key: string;
  /** Dot-path to the field on the data object (e.g., "stage.state.name") */
  fieldPath: string;
  /** Human label */
  label: string;
  /** Filter input type — drives UI rendering in portal layer */
  type: "select" | "multi-select" | "text" | "date-range" | "boolean";
  /** Allowed values for select/multi-select filters */
  options?: Array<{ label: string; value: string }>;
  /** Whether this filter can be pushed to the API (server-side) */
  serverSide?: boolean;
  /** The API parameter name if server-side (e.g., "owned_by") */
  apiParam?: string;
}

export type ActiveFilters = Record<string, FilterValue>;

// ─── Column Types ──────────────────────────────────────────────

export interface ColumnDefinition<T = unknown> {
  /** Unique key */
  key: string;
  /** Header label */
  label: string;
  /** Dot-path to the value on the data object */
  fieldPath: string;
  /** Whether this column is visible by default */
  defaultVisible?: boolean;
  /** Default width in pixels (undefined = auto/flex) */
  defaultWidth?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Whether the column can be sorted */
  sortable?: boolean;
  /** Value formatter for display and export. Receives resolved value + full row. */
  format?: (value: unknown, row: T) => string;
}

export interface ColumnState {
  key: string;
  visible: boolean;
  width?: number;
  order: number;
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

// ─── Preferences Types ─────────────────────────────────────────

export interface PreferencesSchema {
  filters?: ActiveFilters;
  columns?: ColumnState[];
  sort?: SortState | null;
  /** Extensible — pages can store additional preferences */
  [key: string]: unknown;
}

// ─── Utilities ─────────────────────────────────────────────────

/** Resolve a dot-path on an object: getNestedValue(obj, "stage.state.name") */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((curr, key) => {
    if (curr == null || typeof curr !== "object") return undefined;
    return (curr as Record<string, unknown>)[key];
  }, obj);
}
