"use client";

import { useMemo } from "react";
import type { FilterDefinition, ColumnDefinition } from "./types";

/**
 * Readable field set from useFieldAcl(). Null means ACL is not enabled (show all).
 */
interface FieldPrivileges {
  read: { stockFields: string[]; tenantFields: string[]; subtypeFields: string[] };
  write: { stockFields: string[]; tenantFields: string[]; subtypeFields: string[] };
}

/**
 * Extract ACL-matchable field names from a fieldPath.
 *
 * Examples:
 *   "severity"                         → ["severity"]
 *   "stage.state.name"                 → ["stage"]
 *   "custom_fields.tnt__payment_method"→ ["tnt__payment_method", "payment_method"]
 *   "owned_by"                         → ["owned_by"]
 *   "rev_org.display_name"             → ["rev_org"]
 *   "applies_to_part.name"             → ["applies_to_part"]
 */
function extractFieldNames(fieldPath: string): string[] {
  const parts = fieldPath.split(".");

  // custom_fields.tnt__xxx → match on the tnt__ name
  if (parts[0] === "custom_fields" && parts.length >= 2) {
    const customName = parts[1];
    return [customName, customName.replace("tnt__", "")];
  }

  // Stock fields: take root segment
  return [parts[0]];
}

/**
 * Check if a field is readable given the user's privileges.
 * Returns true if:
 * - ACL is not enabled (privileges is null → show everything)
 * - Any extracted field name appears in the read lists (stock, tenant, subtype)
 */
function isFieldReadable(
  fieldPath: string,
  privileges: FieldPrivileges | null
): boolean {
  if (!privileges) return true; // ACL not enabled — all fields visible

  const names = extractFieldNames(fieldPath);
  const allReadable = new Set([
    ...privileges.read.stockFields,
    ...privileges.read.tenantFields,
    ...privileges.read.subtypeFields,
  ]);

  return names.some(
    (name) =>
      allReadable.has(name) ||
      allReadable.has(`tnt__${name}`) ||
      allReadable.has(name.replace("tnt__", ""))
  );
}

/**
 * Filter definitions to only those the user has read access to.
 * Generic — works for both FilterDefinition and ColumnDefinition.
 */
export function useAclFilteredDefinitions<T extends { fieldPath: string }>(
  definitions: T[],
  privileges: FieldPrivileges | null
): T[] {
  return useMemo(() => {
    if (!privileges) return definitions; // ACL not enabled — return all
    return definitions.filter((def) => isFieldReadable(def.fieldPath, privileges));
  }, [definitions, privileges]);
}
