"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ColumnDefinition,
  ColumnState,
  SortState,
  SortDirection,
} from "./types";
import { getNestedValue } from "./types";

interface UseColumnsOptions<T = unknown> {
  definitions: ColumnDefinition<T>[];
  initialState?: ColumnState[];
  initialSort?: SortState | null;
}

interface UseColumnsReturn<T = unknown> {
  /** All columns with current state merged */
  columns: Array<ColumnDefinition<T> & ColumnState>;
  /** Only visible columns, ordered */
  visibleColumns: Array<ColumnDefinition<T> & ColumnState>;
  /** Current sort */
  sort: SortState | null;
  /** Toggle column visibility */
  toggleColumn: (key: string) => void;
  /** Set column order (pass full key array in desired order) */
  reorderColumns: (orderedKeys: string[]) => void;
  /** Resize a column */
  resizeColumn: (key: string, width: number) => void;
  /** Set sort (toggles direction if same key) */
  setSort: (key: string, direction?: SortDirection) => void;
  /** Clear sort */
  clearSort: () => void;
  /** Reset to default configuration */
  resetColumns: () => void;
  /** Get serializable state for persistence */
  getState: () => { columns: ColumnState[]; sort: SortState | null };
  /** Restore state from persistence */
  restoreState: (state: {
    columns?: ColumnState[];
    sort?: SortState | null;
  }) => void;
  /** Sort comparator for Array.sort() — null if no sort active */
  sortFn: ((a: T, b: T) => number) | null;
}

function buildDefaultState<T>(
  definitions: ColumnDefinition<T>[]
): ColumnState[] {
  return definitions.map((def, i) => ({
    key: def.key,
    visible: def.defaultVisible ?? true,
    width: def.defaultWidth,
    order: i,
  }));
}

function mergeState<T>(
  definitions: ColumnDefinition<T>[],
  saved: ColumnState[]
): ColumnState[] {
  const savedMap = new Map(saved.map((s) => [s.key, s]));
  // Start with saved columns in their saved order, then append any new definitions
  const result: ColumnState[] = [];
  const seen = new Set<string>();

  // Saved columns first (preserves user's order)
  for (const s of saved) {
    if (definitions.some((d) => d.key === s.key)) {
      result.push({ ...s, order: result.length });
      seen.add(s.key);
    }
  }

  // New columns not in saved state
  for (const def of definitions) {
    if (!seen.has(def.key)) {
      result.push({
        key: def.key,
        visible: def.defaultVisible ?? true,
        width: def.defaultWidth,
        order: result.length,
      });
    }
  }

  return result;
}

export function useColumns<T = unknown>({
  definitions,
  initialState,
  initialSort,
}: UseColumnsOptions<T>): UseColumnsReturn<T> {
  const defaultState = useMemo(
    () => buildDefaultState(definitions),
    [definitions]
  );

  const [colState, setColState] = useState<ColumnState[]>(() =>
    initialState ? mergeState(definitions, initialState) : defaultState
  );

  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);

  // Merged columns: definition + state
  const columns = useMemo(() => {
    const stateMap = new Map(colState.map((s) => [s.key, s]));
    return definitions
      .map((def) => {
        const state = stateMap.get(def.key) || {
          key: def.key,
          visible: def.defaultVisible ?? true,
          width: def.defaultWidth,
          order: 999,
        };
        return { ...def, ...state };
      })
      .sort((a, b) => a.order - b.order);
  }, [definitions, colState]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );

  const toggleColumn = useCallback((key: string) => {
    setColState((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  }, []);

  const reorderColumns = useCallback((orderedKeys: string[]) => {
    setColState((prev) => {
      const map = new Map(prev.map((c) => [c.key, c]));
      return orderedKeys
        .map((key, i) => {
          const existing = map.get(key);
          return existing ? { ...existing, order: i } : null;
        })
        .filter(Boolean) as ColumnState[];
    });
  }, []);

  const resizeColumn = useCallback((key: string, width: number) => {
    setColState((prev) =>
      prev.map((c) => (c.key === key ? { ...c, width } : c))
    );
  }, []);

  const handleSetSort = useCallback(
    (key: string, direction?: SortDirection) => {
      setSort((prev) => {
        if (direction) return { key, direction };
        // Toggle: if same key, flip direction; otherwise default desc
        if (prev?.key === key) {
          return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        return { key, direction: "desc" };
      });
    },
    []
  );

  const clearSort = useCallback(() => setSort(null), []);

  const resetColumns = useCallback(() => {
    setColState(defaultState);
    setSort(initialSort ?? null);
  }, [defaultState, initialSort]);

  const getState = useCallback(
    () => ({ columns: colState, sort }),
    [colState, sort]
  );

  const restoreState = useCallback(
    (state: { columns?: ColumnState[]; sort?: SortState | null }) => {
      if (state.columns) {
        setColState(mergeState(definitions, state.columns));
      }
      if (state.sort !== undefined) {
        setSort(state.sort);
      }
    },
    [definitions]
  );

  // Sort comparator
  const sortFn = useMemo(() => {
    if (!sort) return null;
    const def = definitions.find((d) => d.key === sort.key);
    if (!def) return null;

    const { fieldPath } = def;
    const dir = sort.direction === "asc" ? 1 : -1;

    return (a: T, b: T): number => {
      const va = getNestedValue(a, fieldPath);
      const vb = getNestedValue(b, fieldPath);
      return dir * compareForSort(va, vb);
    };
  }, [sort, definitions]);

  return {
    columns,
    visibleColumns,
    sort,
    toggleColumn,
    reorderColumns,
    resizeColumn,
    setSort: handleSetSort,
    clearSort,
    resetColumns,
    getState,
    restoreState,
    sortFn,
  };
}

function compareForSort(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === "string" && typeof b === "string") {
    const da = Date.parse(a);
    const db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return a.localeCompare(b);
  }

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean")
    return Number(a) - Number(b);

  return String(a).localeCompare(String(b));
}
