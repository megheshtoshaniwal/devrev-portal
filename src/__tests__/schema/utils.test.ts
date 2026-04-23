import { describe, it, expect } from "vitest";
import {
  shouldBeVisibleInCreate,
  shouldBeVisibleInEdit,
  hasCreatePrivilege,
  getItemsWithCreatePrivilege,
  isFieldEmpty,
  hasDefaultValue,
  getEmptyRequiredFields,
  evaluateExpression,
  getCreateFormFields,
  applyDefaults,
} from "@/devrev-sdk/schema/utils";
import { FieldType, OperationType } from "@/devrev-sdk/schema/types";
import type { FieldDescriptor, TextField, BoolField, EnumField } from "@/devrev-sdk/schema/types";

// ─── Test helpers ──────────────────────────────────────────────

function makeTextField(overrides: Partial<TextField> = {}): TextField {
  return {
    name: "test_field",
    fieldType: FieldType.TEXT,
    ...overrides,
  };
}

function makeBoolField(overrides: Partial<BoolField> = {}): BoolField {
  return {
    name: "test_bool",
    fieldType: FieldType.BOOL,
    ...overrides,
  };
}

function makeEnumField(overrides: Partial<EnumField> = {}): EnumField {
  return {
    name: "test_enum",
    fieldType: FieldType.ENUM,
    allowedValues: ["a", "b", "c"],
    options: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
      { label: "C", value: "c" },
    ],
    ...overrides,
  };
}

// ─── shouldBeVisibleInCreate ───────────────────────────────────

describe("shouldBeVisibleInCreate", () => {
  it("shows regular field", () => {
    expect(shouldBeVisibleInCreate(makeTextField())).toBe(true);
  });

  it("hides base fields (title, description)", () => {
    expect(shouldBeVisibleInCreate(makeTextField({ ui: { isBaseField: true } }))).toBe(false);
  });

  it("hides system fields", () => {
    expect(shouldBeVisibleInCreate(makeTextField({ isSystem: true }))).toBe(false);
  });

  it("hides readonly fields", () => {
    expect(shouldBeVisibleInCreate(makeTextField({ ui: { isReadOnly: true } }))).toBe(false);
  });

  it("hides ACL-hidden fields", () => {
    expect(shouldBeVisibleInCreate(makeTextField({ fieldAcl: { isHidden: true } }))).toBe(false);
  });

  it("hides condition-hidden fields", () => {
    expect(shouldBeVisibleInCreate(makeTextField({ conditionOverrides: { isHidden: true } }))).toBe(false);
  });

  it("hides fields hidden during create", () => {
    expect(shouldBeVisibleInCreate(makeTextField({ ui: { isHiddenDuringCreate: true } }))).toBe(false);
  });
});

// ─── shouldBeVisibleInEdit ─────────────────────────────────────

describe("shouldBeVisibleInEdit", () => {
  it("shows regular field", () => {
    expect(shouldBeVisibleInEdit(makeTextField())).toBe(true);
  });

  it("hides base fields", () => {
    expect(shouldBeVisibleInEdit(makeTextField({ ui: { isBaseField: true } }))).toBe(false);
  });

  it("does NOT hide isHiddenDuringCreate in edit mode", () => {
    expect(shouldBeVisibleInEdit(makeTextField({ ui: { isHiddenDuringCreate: true } }))).toBe(true);
  });
});

// ─── Privilege checks ──────────────────────────────────────────

describe("hasCreatePrivilege", () => {
  it("returns true when create is in privileges", () => {
    expect(hasCreatePrivilege([OperationType.Create, OperationType.Read])).toBe(true);
  });

  it("returns false when create is missing", () => {
    expect(hasCreatePrivilege([OperationType.Read])).toBe(false);
  });
});

describe("getItemsWithCreatePrivilege", () => {
  it("filters items with create privilege", () => {
    const items = [
      { name: "a", privilege: [OperationType.Create] },
      { name: "b", privilege: [OperationType.Read] },
      { name: "c" }, // no privilege field = show
    ];
    const result = getItemsWithCreatePrivilege(items);
    expect(result.map((i) => i.name)).toEqual(["a", "c"]);
  });
});

// ─── Validation helpers ────────────────────────────────────────

describe("isFieldEmpty", () => {
  it("null/undefined are empty", () => {
    expect(isFieldEmpty(null)).toBe(true);
    expect(isFieldEmpty(undefined)).toBe(true);
  });

  it("empty string is empty", () => {
    expect(isFieldEmpty("")).toBe(true);
    expect(isFieldEmpty("  ")).toBe(true);
  });

  it("empty array is empty", () => {
    expect(isFieldEmpty([])).toBe(true);
  });

  it("non-empty values are not empty", () => {
    expect(isFieldEmpty("hello")).toBe(false);
    expect(isFieldEmpty(0)).toBe(false);
    expect(isFieldEmpty(false)).toBe(false);
    expect(isFieldEmpty([1])).toBe(false);
  });
});

describe("hasDefaultValue", () => {
  it("detects default value", () => {
    expect(hasDefaultValue(makeTextField({ defaultValue: "foo" }))).toBe(true);
  });

  it("returns false for no default", () => {
    expect(hasDefaultValue(makeTextField())).toBe(false);
  });

  it("returns false for null default", () => {
    expect(hasDefaultValue(makeTextField({ defaultValue: null as unknown as string }))).toBe(false);
  });
});

describe("getEmptyRequiredFields", () => {
  it("returns required fields that are empty", () => {
    const fields = [
      makeTextField({ name: "f1", isRequired: true }),
      makeTextField({ name: "f2", isRequired: true }),
      makeTextField({ name: "f3", isRequired: false }),
    ];
    const entity = { f1: "filled", f2: "" };
    const result = getEmptyRequiredFields(fields, entity);
    expect(result).toEqual(["f2"]);
  });

  it("skips required fields with defaults", () => {
    const fields = [
      makeTextField({ name: "f1", isRequired: true, defaultValue: "default" }),
    ];
    const result = getEmptyRequiredFields(fields, {});
    expect(result).toEqual([]);
  });

  it("skips hidden/readonly fields", () => {
    const fields = [
      makeTextField({ name: "f1", isRequired: true, fieldAcl: { isHidden: true } }),
      makeTextField({ name: "f2", isRequired: true, fieldAcl: { isReadOnly: true } }),
    ];
    const result = getEmptyRequiredFields(fields, {});
    expect(result).toEqual([]);
  });

  it("respects condition overrides for required", () => {
    const fields = [
      makeTextField({ name: "f1", isRequired: false, conditionOverrides: { isRequired: true } }),
    ];
    const result = getEmptyRequiredFields(fields, {});
    expect(result).toEqual(["f1"]);
  });
});

// ─── Expression evaluation ─────────────────────────────────────

describe("evaluateExpression", () => {
  it("returns valid for undefined expression", () => {
    const result = evaluateExpression(undefined, {});
    expect(result.isValid).toBe(true);
  });

  it("evaluates string array (field existence check)", () => {
    const result = evaluateExpression(["field_a", "field_b"], { field_a: "yes", field_b: "" });
    expect(result.isValid).toBe(false); // field_b is empty
  });

  it("evaluates EQUALS comparison", () => {
    const result = evaluateExpression(
      { type: "COMPARISON", field: "status", operator: "EQUALS", value: "active" },
      { status: "active" }
    );
    expect(result.isValid).toBe(true);
    expect(result.fieldsInvolved).toContain("status");
  });

  it("evaluates NOT_EQUALS comparison", () => {
    const result = evaluateExpression(
      { type: "COMPARISON", field: "status", operator: "NOT_EQUALS", value: "closed" },
      { status: "active" }
    );
    expect(result.isValid).toBe(true);
  });

  it("evaluates AND expression", () => {
    const result = evaluateExpression(
      {
        type: "AND",
        children: [
          { type: "COMPARISON", field: "a", operator: "EQUALS", value: "1" },
          { type: "COMPARISON", field: "b", operator: "EQUALS", value: "2" },
        ],
      },
      { a: "1", b: "2" }
    );
    expect(result.isValid).toBe(true);
  });

  it("evaluates OR expression", () => {
    const result = evaluateExpression(
      {
        type: "OR",
        children: [
          { type: "COMPARISON", field: "a", operator: "EQUALS", value: "1" },
          { type: "COMPARISON", field: "b", operator: "EQUALS", value: "2" },
        ],
      },
      { a: "wrong", b: "2" }
    );
    expect(result.isValid).toBe(true);
  });

  it("AND fails if any child fails", () => {
    const result = evaluateExpression(
      {
        type: "AND",
        children: [
          { type: "COMPARISON", field: "a", operator: "EQUALS", value: "1" },
          { type: "COMPARISON", field: "b", operator: "EQUALS", value: "2" },
        ],
      },
      { a: "1", b: "wrong" }
    );
    expect(result.isValid).toBe(false);
  });
});

// ─── getCreateFormFields ───────────────────────────────────────

describe("getCreateFormFields", () => {
  it("filters and sorts fields", () => {
    const schema = {
      stockFields: [
        makeTextField({ name: "title", ui: { isBaseField: true } }),
        makeTextField({ name: "visible_stock", ui: { order: 2 } }),
      ],
      customFields: [
        makeTextField({ name: "custom_1", ui: { order: 1 } }),
        makeTextField({ name: "hidden_custom", ui: { isHidden: true } }),
      ],
    };
    const result = getCreateFormFields(schema, {});
    expect(result.map((f) => f.name)).toEqual(["custom_1", "visible_stock"]);
  });
});

// ─── applyDefaults ─────────────────────────────────────────────

describe("applyDefaults", () => {
  it("applies default values to empty fields", () => {
    const fields = [
      makeTextField({ name: "f1", defaultValue: "default_val" }),
      makeBoolField({ name: "f2", defaultValue: true }),
    ];
    const entity = {};
    const result = applyDefaults(fields, entity);
    expect(result.f1).toBe("default_val");
    expect(result.f2).toBe(true);
  });

  it("does not override existing values", () => {
    const fields = [makeTextField({ name: "f1", defaultValue: "default" })];
    const entity = { f1: "user_value" };
    const result = applyDefaults(fields, entity);
    expect(result.f1).toBe("user_value");
  });

  it("skips hidden fields", () => {
    const fields = [
      makeTextField({ name: "f1", defaultValue: "default", fieldAcl: { isHidden: true } }),
    ];
    const result = applyDefaults(fields, {});
    expect(result.f1).toBeUndefined();
  });
});
