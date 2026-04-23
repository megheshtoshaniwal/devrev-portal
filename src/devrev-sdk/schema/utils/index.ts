// Schema utilities — field visibility, privilege checks, validation, condition evaluation.
// Adapted from devrev-web: field-visibility-rules.ts, check-privilege.ts, expression-evaluator.ts

import type {
  FieldDescriptor,
  OperationType,
  Subtype,
  FieldConditionOverrides,
  FragmentCondition,
  ParsedExpression,
  ConditionEffect,
} from "../types";

// ─── Field Visibility ───────────────────────────────────────────

/** Should this field be visible during ticket creation? */
export function shouldBeVisibleInCreate(field: FieldDescriptor): boolean {
  if (!field) return false;

  // Base fields (title, description) are rendered separately, not as dynamic fields
  if (field.ui?.isBaseField) return false;

  // System or read-only fields are not editable during creation
  if (field.isSystem || field.ui?.isReadOnly || field.fieldAcl?.isReadOnly) return false;

  // Hidden fields
  if (
    (field.fieldAcl?.isHidden || field.conditionOverrides?.isHidden) ??
    (field.ui?.parsedIsHidden || field.ui?.isHidden || field.ui?.isHiddenDuringCreate)
  ) {
    return false;
  }

  return true;
}

/** Should this field be visible in ticket detail (edit view)? */
export function shouldBeVisibleInEdit(field: FieldDescriptor): boolean {
  if (!field) return false;
  if (field.ui?.isBaseField) return false;
  if (
    (field.fieldAcl?.isHidden || field.conditionOverrides?.isHidden) ??
    (field.ui?.parsedIsHidden || field.ui?.isHidden)
  ) {
    return false;
  }
  return true;
}

// ─── Privilege Checks ───────────────────────────────────────────

export function hasCreatePrivilege(privileges: OperationType[]): boolean {
  return privileges.includes("create" as OperationType);
}

export function getItemsWithCreatePrivilege<T extends { privilege?: OperationType[] }>(
  items: T[]
): T[] {
  return items.filter((item) =>
    item.privilege ? hasCreatePrivilege(item.privilege) : true
  );
}

// ─── Validation ─────────────────────────────────────────────────

/** Check if a field value is empty */
export function isFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/** Check if a field descriptor has a default value */
export function hasDefaultValue(field: FieldDescriptor): boolean {
  return "defaultValue" in field && field.defaultValue !== undefined && field.defaultValue !== null;
}

/** Get required fields that are empty and have no default value */
export function getEmptyRequiredFields(
  fields: FieldDescriptor[],
  entity: Record<string, unknown>,
  isCreate = true
): string[] {
  const flatEntity = { ...(entity?.custom_fields as Record<string, unknown> || {}), ...entity };
  const emptyRequired: string[] = [];

  for (const field of fields) {
    // Skip hidden/readonly fields
    if (field.fieldAcl?.isHidden || field.fieldAcl?.isReadOnly) continue;

    // Determine if field is required
    const isRequired = field.conditionOverrides?.isRequired ?? field.isRequired;
    if (!isRequired) continue;

    // Skip system fields in create mode
    if (isCreate && field.isSystem) continue;
    if (isCreate && (field.ui?.isHidden || field.ui?.isReadOnly)) continue;

    // Check if value is empty
    const value = flatEntity[field.name];
    if (isFieldEmpty(value)) {
      // If field has a default value, it's okay
      if (hasDefaultValue(field)) continue;
      emptyRequired.push(field.name);
    }
  }

  return emptyRequired;
}

// ─── Condition Evaluation ───────────────────────────────────────

/**
 * Evaluate an expression against an entity's field values.
 * Returns whether the expression is satisfied and which fields were involved.
 */
export function evaluateExpression(
  expression: ParsedExpression | string[] | undefined,
  entity: Record<string, unknown>
): { isValid: boolean; fieldsInvolved: string[] } {
  if (!expression) return { isValid: true, fieldsInvolved: [] };

  // String array format: simple field existence check
  if (Array.isArray(expression)) {
    const fieldsInvolved = expression as string[];
    const isValid = fieldsInvolved.every((f) => !isFieldEmpty(entity[f]));
    return { isValid, fieldsInvolved };
  }

  return evaluateParsedExpression(expression, entity);
}

function evaluateParsedExpression(
  expr: ParsedExpression,
  entity: Record<string, unknown>
): { isValid: boolean; fieldsInvolved: string[] } {
  const fieldsInvolved: string[] = [];

  if (expr.type === "COMPARISON" && expr.field && expr.operator) {
    fieldsInvolved.push(expr.field);
    const fieldValue = entity[expr.field];
    const compareValue = expr.value;

    const fieldStr = String(fieldValue ?? "");
    const compareStr = String(compareValue ?? "");

    let isValid = false;
    switch (expr.operator) {
      case "EQUALS":
        isValid = fieldStr === compareStr;
        break;
      case "NOT_EQUALS":
        isValid = fieldStr !== compareStr;
        break;
      case "GREATER_THAN":
        isValid = Number(fieldValue) > Number(compareValue);
        break;
      case "LESS_THAN":
        isValid = Number(fieldValue) < Number(compareValue);
        break;
      case "GREATER_THAN_OR_EQUAL":
        isValid = Number(fieldValue) >= Number(compareValue);
        break;
      case "LESS_THAN_OR_EQUAL":
        isValid = Number(fieldValue) <= Number(compareValue);
        break;
    }

    return { isValid, fieldsInvolved };
  }

  if ((expr.type === "AND" || expr.type === "OR") && expr.children) {
    const results = expr.children.map((child) =>
      evaluateParsedExpression(child, entity)
    );

    for (const r of results) {
      for (const f of r.fieldsInvolved) {
        if (!fieldsInvolved.includes(f)) fieldsInvolved.push(f);
      }
    }

    const isValid =
      expr.type === "AND"
        ? results.every((r) => r.isValid)
        : results.some((r) => r.isValid);

    return { isValid, fieldsInvolved };
  }

  return { isValid: true, fieldsInvolved };
}

/**
 * Evaluate all conditions on a set of fields given the current entity state.
 * Returns a map of field name → condition overrides.
 */
export function evaluateConditions(
  fields: FieldDescriptor[],
  entity: Record<string, unknown>
): Record<string, FieldConditionOverrides> {
  const overrides: Record<string, FieldConditionOverrides> = {};

  // Collect all conditions from all fields
  const allConditions: FragmentCondition[] = [];
  for (const field of fields) {
    if (field.conditions) {
      allConditions.push(...field.conditions);
    }
    // Also check conditionsHierarchy
    if (field.conditionsHierarchy) {
      if (Array.isArray(field.conditionsHierarchy)) {
        allConditions.push(...field.conditionsHierarchy);
      } else {
        for (const conditions of Object.values(field.conditionsHierarchy)) {
          allConditions.push(...conditions);
        }
      }
    }
  }

  // Evaluate each condition
  for (const condition of allConditions) {
    if (!condition.effects || !condition.expression) continue;

    const { isValid } = evaluateExpression(condition.expression, entity);

    for (const effect of condition.effects) {
      for (const fieldName of effect.fields) {
        if (!overrides[fieldName]) {
          overrides[fieldName] = {};
        }

        if (isValid) {
          // Condition is true — apply the effect
          if (effect.show !== undefined) {
            overrides[fieldName].isHidden = !effect.show;
          }
          if (effect.require !== undefined) {
            overrides[fieldName].isRequired = effect.require;
          }
          if (effect.immutable !== undefined) {
            overrides[fieldName].isImmutable = effect.immutable;
          }
          if (effect.allowedValues) {
            overrides[fieldName].allowedValues = effect.allowedValues;
          }
          if (effect.uenumValues) {
            overrides[fieldName].uenumValues = effect.uenumValues;
          }
        } else {
          // Condition is false — apply inverse for show/require
          if (effect.show !== undefined) {
            overrides[fieldName].isHidden = effect.show; // Inverted: if show=true when true, hidden when false
          }
          if (effect.require !== undefined) {
            overrides[fieldName].isRequired = !effect.require;
          }
        }
      }
    }
  }

  return overrides;
}

/**
 * Apply condition overrides to field descriptors.
 * Mutates the fields' conditionOverrides in place.
 */
export function applyConditionOverrides(
  fields: FieldDescriptor[],
  entity: Record<string, unknown>
): FieldDescriptor[] {
  const overrides = evaluateConditions(fields, entity);

  return fields.map((field) => {
    const override = overrides[field.name];
    if (override) {
      return {
        ...field,
        conditionOverrides: {
          ...field.conditionOverrides,
          ...override,
        },
      };
    }
    return field;
  });
}

// ─── Schema Helpers ─────────────────────────────────────────────

/** Get ordered fields for a create form, applying visibility rules and sorting by ui.order */
export function getCreateFormFields(
  schema: { stockFields: FieldDescriptor[]; customFields: FieldDescriptor[] },
  entity: Record<string, unknown>
): FieldDescriptor[] {
  const allFields = [...schema.stockFields, ...schema.customFields];

  // Apply condition overrides
  const withConditions = applyConditionOverrides(allFields, entity);

  // Filter to visible fields
  const visible = withConditions.filter(shouldBeVisibleInCreate);

  // Sort by ui.order (fields without order go to end)
  return visible.sort((a, b) => {
    const orderA = a.ui?.order ?? 9999;
    const orderB = b.ui?.order ?? 9999;
    return orderA - orderB;
  });
}

/** Apply default values from field descriptors to an entity */
export function applyDefaults(
  fields: FieldDescriptor[],
  entity: Record<string, unknown>
): Record<string, unknown> {
  const updated = { ...entity };

  for (const field of fields) {
    if (hasDefaultValue(field) && isFieldEmpty(updated[field.name])) {
      // Skip hidden/readonly fields
      if (field.fieldAcl?.isHidden || field.fieldAcl?.isReadOnly) continue;
      updated[field.name] = (field as { defaultValue: unknown }).defaultValue;
    }
  }

  return updated;
}
