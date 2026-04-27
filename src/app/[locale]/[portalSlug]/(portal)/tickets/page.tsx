"use client";

import { useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  Loader2,
  Filter,
  X,
  Columns3,
  RotateCcw,
  Check,
} from "lucide-react";
import { usePortalConfig } from "@/portal/config";
import { useTickets } from "@/devrev-sdk/data/use-tickets";
import { useFilters } from "@/devrev-sdk/data/use-filters";
import { useFilterOptions } from "@/devrev-sdk/data/use-filter-options";
import { useAclFilteredDefinitions } from "@/devrev-sdk/data/use-field-acl-filter";
import { useColumns } from "@/devrev-sdk/data/use-columns";
import { usePreferences } from "@/devrev-sdk/data/use-preferences";
import { useExport } from "@/devrev-sdk/data/use-export";
import { useFieldAcl } from "@/devrev-sdk/schema";
import { useAvailableFields } from "@/devrev-sdk/data/use-available-fields";
import type { Ticket } from "@/devrev-sdk/client";
import type { FilterDefinition, ColumnDefinition, ColumnState, SortState } from "@/devrev-sdk/data/types";
import { getNestedValue } from "@/devrev-sdk/data/types";
import { cn } from "@/portal/utils/utils";
import {
  TICKET_FILTERS,
  TICKET_COLUMNS,
  TICKET_DEFAULT_SORT,
} from "@/portal/config/ticket-list-config";

import { useState, useRef } from "react";

export default function TicketsPage() {
  const { basePath } = usePortalConfig();

  // 1. Preferences — restores saved state
  const { preferences, loaded, set: savePref } = usePreferences({
    namespace: "tickets",
    defaults: { sort: TICKET_DEFAULT_SORT },
  });

  // 2. Field ACL — determine which fields the user can read
  const { fieldPrivileges } = useFieldAcl();

  // Dev tool: log all available fields to console so config authors know what's available
  const { fields: availableFields, loading: fieldsLoading, logFields } = useAvailableFields();
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !fieldsLoading && availableFields.length > 0) {
      logFields();
    }
  }, [fieldsLoading, availableFields.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. ACL-filtered definitions — remove fields the user can't read
  const aclFilters = useAclFilteredDefinitions(TICKET_FILTERS, fieldPrivileges);
  const aclColumns = useAclFilteredDefinitions(TICKET_COLUMNS, fieldPrivileges);

  // 4. Resolve filter options from schema (only for filterable fields)
  const { resolvedDefinitions } = useFilterOptions(aclFilters);

  // 5. Filters — uses schema-resolved, ACL-filtered definitions
  const {
    filters,
    definitions: filterDefs,
    setFilter,
    removeFilter,
    clearFilters,
    activeCount,
    serverFilters,
    clientFilterFn,
  } = useFilters({
    definitions: resolvedDefinitions,
    initialFilters: loaded ? preferences.filters : undefined,
  });

  // 6. Fetch tickets with server-side filters
  const { tickets, loading, refetch } = useTickets({
    limit: 50,
    apiFilters: Object.keys(serverFilters).length > 0 ? serverFilters : undefined,
  });

  // 4. Client-side filtering + text search
  const [search, setSearch] = useState("");
  const filteredTickets = useMemo(() => {
    let result = tickets.filter(clientFilterFn);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.display_id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, clientFilterFn, search]);

  // 5. Columns + sort
  const {
    columns,
    visibleColumns,
    sort,
    toggleColumn,
    setSort,
    resetColumns,
    getState,
    sortFn,
  } = useColumns<Ticket>({
    definitions: aclColumns,
    initialState: loaded ? (preferences.columns as ColumnState[] | undefined) : undefined,
    initialSort: loaded ? (preferences.sort as SortState | undefined) ?? TICKET_DEFAULT_SORT : TICKET_DEFAULT_SORT,
  });

  // 6. Sorted data
  const sortedTickets = useMemo(
    () => (sortFn ? [...filteredTickets].sort(sortFn) : filteredTickets),
    [filteredTickets, sortFn]
  );

  // 7. Export
  const { exportCSV, exporting } = useExport<Ticket>({ filename: "tickets" });

  // 8. Persist on change
  useEffect(() => {
    if (!loaded) return;
    savePref("filters", filters);
    const state = getState();
    savePref("columns", state.columns);
    savePref("sort", state.sort);
  }, [filters, sort, columns, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // UI state
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  if (!loaded || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Tickets</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {sortedTickets.length} ticket{sortedTickets.length !== 1 ? "s" : ""}
            {activeCount > 0 && ` (${activeCount} filter${activeCount !== 1 ? "s" : ""} active)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportCSV(sortedTickets, visibleColumns)}
            loading={exporting}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Link href={`${basePath}/tickets/create`}>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Toolbar: search + filter + columns */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold">
              {activeCount}
            </span>
          )}
        </Button>

        {/* Column config toggle */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setColumnsOpen(!columnsOpen)}
          >
            <Columns3 className="h-3.5 w-3.5" /> Columns
          </Button>
          {columnsOpen && (
            <ColumnPicker
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onClose={() => setColumnsOpen(false)}
            />
          )}
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Filter bar */}
      {filterOpen && (
        <FilterBar
          definitions={filterDefs}
          filters={filters}
          onSet={setFilter}
          onRemove={removeFilter}
        />
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap",
                      col.sortable && "cursor-pointer hover:text-foreground select-none"
                    )}
                    style={col.width ? { width: col.width, minWidth: col.minWidth } : { minWidth: col.minWidth }}
                    onClick={col.sortable ? () => setSort(col.key) : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sort?.key === col.key && (
                        sort.direction === "asc"
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-muted/20 transition-colors group"
                >
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      <CellRenderer
                        column={col}
                        ticket={ticket}
                        basePath={basePath}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {sortedTickets.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-muted-foreground">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cell Renderer ─────────────────────────────────────────────

function CellRenderer({
  column,
  ticket,
  basePath,
}: {
  column: ColumnDefinition<Ticket> & { visible: boolean };
  ticket: Ticket;
  basePath: string;
}) {
  const raw = getNestedValue(ticket, column.fieldPath);
  const formatted = column.format ? column.format(raw, ticket) : String(raw ?? "");

  // Special rendering for known column types
  switch (column.key) {
    case "display_id":
      return (
        <Link
          href={`${basePath}/tickets/${ticket.display_id}`}
          className="text-xs font-mono text-muted-foreground hover:text-primary"
        >
          {formatted}
        </Link>
      );

    case "title":
      return (
        <Link
          href={`${basePath}/tickets/${ticket.display_id}`}
          className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 max-w-xs block"
        >
          {ticket.title}
        </Link>
      );

    case "status":
      return (
        <Badge variant={mapStatusVariant(ticket.stage?.state?.name)}>
          {formatted}
        </Badge>
      );

    case "severity":
      if (!formatted) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant={formatted.toLowerCase() as "low"}>
          {formatted}
        </Badge>
      );

    case "needs_response":
      return ticket.needs_response ? (
        <Badge variant="waiting_on_customer">Yes</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">No</span>
      );

    default:
      return (
        <span className="text-foreground text-sm truncate max-w-[200px] block">
          {formatted || <span className="text-muted-foreground">—</span>}
        </span>
      );
  }
}

function mapStatusVariant(state?: string) {
  switch (state) {
    case "open": return "in_progress" as const;
    case "in_progress": return "in_progress" as const;
    case "resolved": return "resolved" as const;
    case "closed": return "closed" as const;
    default: return "queued" as const;
  }
}

// ─── Filter Bar ────────────────────────────────────────────────

function FilterBar({
  definitions,
  filters,
  onSet,
  onRemove,
}: {
  definitions: FilterDefinition[];
  filters: Record<string, { operator: string; value: unknown }>;
  onSet: (key: string, operator: "eq" | "in" | "contains" | "exists" | "between", value: unknown) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-border bg-muted/20">
      {definitions.map((def) => (
        <FilterControl
          key={def.key}
          definition={def}
          active={filters[def.key]}
          onSet={(op, val) => onSet(def.key, op, val)}
          onRemove={() => onRemove(def.key)}
        />
      ))}
    </div>
  );
}

function FilterControl({
  definition,
  active,
  onSet,
  onRemove,
}: {
  definition: FilterDefinition;
  active?: { operator: string; value: unknown };
  onSet: (operator: "eq" | "in" | "contains" | "exists" | "between", value: unknown) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isActive = !!active;
  const activeValues = active?.value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
          isActive
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        {definition.label}
        {isActive && (
          <span
            className="ml-0.5 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && definition.type === "boolean" && (
        <div className="absolute top-full left-0 mt-1 z-20 w-36 rounded-lg border border-border bg-card shadow-lg p-1.5">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted",
                activeValues === opt.value && "text-primary font-medium"
              )}
              onClick={() => { onSet("eq", opt.value); setOpen(false); }}
            >
              {activeValues === opt.value && <Check className="h-3 w-3" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {open && (definition.type === "select" || definition.type === "multi-select") && definition.options && (
        <div className="absolute top-full left-0 mt-1 z-20 w-48 rounded-lg border border-border bg-card shadow-lg p-1.5 max-h-60 overflow-y-auto">
          {definition.options.map((opt) => {
            const selected =
              definition.type === "multi-select"
                ? Array.isArray(activeValues) && activeValues.includes(opt.value)
                : activeValues === opt.value;

            return (
              <button
                key={opt.value}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted",
                  selected && "text-primary font-medium"
                )}
                onClick={() => {
                  if (definition.type === "multi-select") {
                    const current = Array.isArray(activeValues) ? activeValues : [];
                    const next = selected
                      ? current.filter((v: unknown) => v !== opt.value)
                      : [...current, opt.value];
                    if (next.length === 0) onRemove();
                    else onSet("in", next);
                  } else {
                    onSet("eq", opt.value);
                    setOpen(false);
                  }
                }}
              >
                {selected && <Check className="h-3 w-3" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {open && definition.type === "date-range" && (
        <div className="absolute top-full left-0 mt-1 z-20 w-56 rounded-lg border border-border bg-card shadow-lg p-3">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              className="w-full rounded-md border border-border px-2.5 py-1.5 text-xs bg-background"
              value={Array.isArray(activeValues) ? String(activeValues[0] || "") : ""}
              onChange={(e) => {
                const from = e.target.value;
                const to = Array.isArray(activeValues) ? String(activeValues[1] || "") : "";
                if (from) onSet("between", [from, to || "2099-12-31"]);
                else onRemove();
              }}
            />
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              className="w-full rounded-md border border-border px-2.5 py-1.5 text-xs bg-background"
              value={Array.isArray(activeValues) ? String(activeValues[1] || "") : ""}
              onChange={(e) => {
                const to = e.target.value;
                const from = Array.isArray(activeValues) ? String(activeValues[0] || "") : "";
                if (from || to) onSet("between", [from || "2000-01-01", to || "2099-12-31"]);
                else onRemove();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column Picker ─────────────────────────────────────────────

function ColumnPicker({
  columns,
  onToggle,
  onReset,
  onClose,
}: {
  columns: Array<ColumnDefinition<Ticket> & { visible: boolean; order: number }>;
  onToggle: (key: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border border-border bg-card shadow-lg p-1.5"
    >
      <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
        <span className="text-xs font-medium text-foreground">Columns</span>
        <button
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>
      {[...columns].sort((a, b) => a.order - b.order).map((col) => (
        <button
          key={col.key}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted"
          onClick={() => onToggle(col.key)}
        >
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border",
              col.visible
                ? "border-primary bg-primary text-white"
                : "border-border"
            )}
          >
            {col.visible && <Check className="h-3 w-3" />}
          </div>
          {col.label}
        </button>
      ))}
    </div>
  );
}
