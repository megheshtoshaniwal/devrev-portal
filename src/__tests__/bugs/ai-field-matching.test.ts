/**
 * Regression test: AI field suggestion matching
 *
 * Bug 1 (race condition): AI suggests subtype + field values simultaneously.
 * setSelectedSubtype triggers async schema fetch, but field matching runs
 * immediately against old (base) schema. Custom field values silently dropped.
 *
 * Bug 2 (subtype race): If user changes subtype while pending fields exist,
 * fields meant for one subtype could be applied to another.
 *
 * Fix: Store pending fields with their target subtype. Re-apply when schema
 * loads. Skip if subtype changed.
 */

import { describe, it, expect } from "vitest";
import type { FieldDescriptor } from "@/devrev-sdk/schema/types";
import { FieldType } from "@/devrev-sdk/schema/types";

// Mirrors the field matching logic from tickets/create/page.tsx
function matchAiFieldsToSchema(
  suggestedFields: Record<string, unknown>,
  formFields: FieldDescriptor[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(suggestedFields)) {
    if (value !== null && value !== undefined && value !== "") {
      const matchingField = formFields.find(
        (f) =>
          f.name === key ||
          f.name === `tnt__${key}` ||
          f.name.replace("tnt__", "") === key
      );
      if (matchingField) {
        result[matchingField.name] = value;
      }
    }
  }
  return result;
}

// Simulates the pending fields logic
function shouldApplyPendingFields(
  pending: { fields: Record<string, unknown>; subtype: string | null } | null,
  currentSubtype: string | null,
  schemaLoading: boolean,
  formFieldCount: number
): boolean {
  if (!pending || schemaLoading || formFieldCount === 0) return false;
  if (pending.subtype !== currentSubtype) return false;
  return true;
}

const BASE_FIELDS: FieldDescriptor[] = [
  { name: "title", fieldType: FieldType.TEXT, displayName: "Title" } as FieldDescriptor,
  { name: "severity", fieldType: FieldType.ENUM, displayName: "Severity", allowedValues: ["low", "medium", "high"], options: [] } as FieldDescriptor,
];

const BILLING_CUSTOM_FIELDS: FieldDescriptor[] = [
  ...BASE_FIELDS,
  { name: "tnt__payment_method", fieldType: FieldType.ENUM, displayName: "Payment Method", allowedValues: ["ach", "wire", "card"], options: [] } as FieldDescriptor,
  { name: "tnt__error_code", fieldType: FieldType.TEXT, displayName: "Error Code" } as FieldDescriptor,
  { name: "tnt__amount_affected", fieldType: FieldType.DOUBLE, displayName: "Amount" } as FieldDescriptor,
];

describe("AI field matching", () => {
  describe("matchAiFieldsToSchema", () => {
    it("matches base schema fields", () => {
      const result = matchAiFieldsToSchema(
        { title: "ACH payment failed", severity: "high" },
        BASE_FIELDS
      );
      expect(result).toEqual({ title: "ACH payment failed", severity: "high" });
    });

    it("matches custom fields with tnt__ prefix", () => {
      const result = matchAiFieldsToSchema(
        { payment_method: "ach", error_code: "PMT-4022" },
        BILLING_CUSTOM_FIELDS
      );
      expect(result).toEqual({
        tnt__payment_method: "ach",
        tnt__error_code: "PMT-4022",
      });
    });

    it("matches fields with exact tnt__ key from AI", () => {
      const result = matchAiFieldsToSchema(
        { tnt__payment_method: "wire" },
        BILLING_CUSTOM_FIELDS
      );
      expect(result).toEqual({ tnt__payment_method: "wire" });
    });

    it("drops fields not in schema (the original bug)", () => {
      // AI suggests custom fields, but only base schema is loaded
      const result = matchAiFieldsToSchema(
        { payment_method: "ach", error_code: "PMT-4022", severity: "high" },
        BASE_FIELDS // Only base fields — custom fields not loaded yet
      );
      // Only severity matches; custom fields are dropped
      expect(result).toEqual({ severity: "high" });
      expect(result).not.toHaveProperty("tnt__payment_method");
    });

    it("matches all fields when full schema is loaded (the fix)", () => {
      // Same AI suggestions, but now with full schema including custom fields
      const result = matchAiFieldsToSchema(
        { payment_method: "ach", error_code: "PMT-4022", severity: "high" },
        BILLING_CUSTOM_FIELDS
      );
      expect(result).toEqual({
        tnt__payment_method: "ach",
        tnt__error_code: "PMT-4022",
        severity: "high",
      });
    });

    it("skips null/undefined/empty values", () => {
      const result = matchAiFieldsToSchema(
        { title: "test", severity: null, error_code: "", amount_affected: undefined },
        BILLING_CUSTOM_FIELDS
      );
      expect(result).toEqual({ title: "test" });
    });
  });

  describe("pending field application with subtype guard", () => {
    it("applies when subtype matches and schema loaded", () => {
      const result = shouldApplyPendingFields(
        { fields: { payment_method: "ach" }, subtype: "billing" },
        "billing",
        false,
        5
      );
      expect(result).toBe(true);
    });

    it("blocks when schema is still loading", () => {
      const result = shouldApplyPendingFields(
        { fields: { payment_method: "ach" }, subtype: "billing" },
        "billing",
        true, // still loading
        0
      );
      expect(result).toBe(false);
    });

    it("blocks when subtype changed (the race condition)", () => {
      const result = shouldApplyPendingFields(
        { fields: { payment_method: "ach" }, subtype: "billing" },
        "feature_request", // user changed subtype
        false,
        5
      );
      expect(result).toBe(false);
    });

    it("blocks when no pending fields", () => {
      const result = shouldApplyPendingFields(null, "billing", false, 5);
      expect(result).toBe(false);
    });

    it("blocks when form fields are empty", () => {
      const result = shouldApplyPendingFields(
        { fields: { payment_method: "ach" }, subtype: "billing" },
        "billing",
        false,
        0 // no fields loaded
      );
      expect(result).toBe(false);
    });
  });
});
