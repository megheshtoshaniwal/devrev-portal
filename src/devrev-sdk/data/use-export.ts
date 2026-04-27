"use client";

import { useState, useCallback } from "react";
import type { ColumnDefinition } from "./types";
import { getNestedValue } from "./types";

interface UseExportOptions {
  /** Filename without extension */
  filename?: string;
}

interface UseExportReturn<T> {
  /** Trigger CSV download */
  exportCSV: (
    data: T[],
    columns: Array<ColumnDefinition<T> & { visible: boolean }>
  ) => void;
  /** Whether export is in progress */
  exporting: boolean;
  /** Error if export failed */
  error: string | null;
}

export function useExport<T = unknown>(
  opts?: UseExportOptions
): UseExportReturn<T> {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCSV = useCallback(
    (
      data: T[],
      columns: Array<ColumnDefinition<T> & { visible: boolean }>
    ) => {
      setExporting(true);
      setError(null);

      try {
        const visibleCols = columns.filter((c) => c.visible);
        if (visibleCols.length === 0) {
          throw new Error("No visible columns to export");
        }

        // Header row
        const header = visibleCols.map((c) => escapeCSV(c.label));

        // Data rows
        const rows = data.map((row) =>
          visibleCols.map((col) => {
            const raw = getNestedValue(row, col.fieldPath);
            const formatted = col.format
              ? col.format(raw, row)
              : formatValue(raw);
            return escapeCSV(formatted);
          })
        );

        // Build CSV with BOM for Excel UTF-8 compatibility
        const csv =
          "\uFEFF" +
          [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

        // Trigger download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${opts?.filename || "export"}-${formatDateForFilename()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      } finally {
        setExporting(false);
      }
    },
    [opts?.filename]
  );

  return { exportCSV, exporting, error };
}

// ─── Helpers ───────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          return (
            (v as Record<string, unknown>).display_name ||
            (v as Record<string, unknown>).name ||
            JSON.stringify(v)
          );
        }
        return String(v);
      })
      .join("; ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.display_name || obj.name || JSON.stringify(value));
  }
  return String(value);
}

function formatDateForFilename(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
