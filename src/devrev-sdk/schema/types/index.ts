// Schema types — adapted from devrev-web customization-engine data models.
// Covers field descriptors, subtypes, conditions, and permissions.

// ─── Field Types ────────────────────────────────────────────────

export enum FieldType {
  BOOL = "bool",
  COMPOSITE = "composite",
  DATE = "date",
  DOUBLE = "double",
  ENUM = "enum",
  ID = "id",
  INT = "int",
  JSON_VALUE = "json_value",
  LIST = "array",
  RICH_TEXT = "rich_text",
  STRUCT = "struct",
  TEXT = "text",
  TIMESTAMP = "timestamp",
  TOKENS = "tokens",
  UENUM = "uenum",
}

// ─── Operation Types ────────────────────────────────────────────

export enum OperationType {
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
}

// ─── Field Condition Overrides ──────────────────────────────────

export interface FieldConditionOverrides {
  isHidden?: boolean;
  isImmutable?: boolean;
  isRequired?: boolean;
  allowedValues?: string[];
  uenumValues?: number[];
}

// ─── Condition Effect ───────────────────────────────────────────

export interface ConditionEffect {
  fields: string[];
  allowedValues?: string[];
  defaultValues?: (string | undefined)[];
  require?: boolean;
  show?: boolean;
  immutable?: boolean;
  uenumValues?: number[];
}

// ─── Condition ──────────────────────────────────────────────────

export interface FragmentCondition {
  effects?: ConditionEffect[];
  expression?: ParsedExpression | string[] | undefined;
  originalExpression?: string;
}

// ─── Parsed Expression (simplified from devrev-web expression parser) ───

export interface ParsedExpression {
  type: "AND" | "OR" | "COMPARISON";
  children?: ParsedExpression[];
  // For COMPARISON type:
  field?: string;
  operator?: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL";
  value?: unknown;
}

// ─── Field UI Metadata ──────────────────────────────────────────

export interface FieldUiMetadata {
  displayName?: string;
  placeholder?: string;
  tooltip?: string;
  order?: number;
  isHidden?: boolean;
  isReadOnly?: boolean;
  isBaseField?: boolean;
  isDeprecated?: boolean;
  isHiddenDuringCreate?: boolean;
  isMultiSelect?: boolean;
  parsedIsHidden?: boolean;
  dependentFields?: string[];
  groupName?: string;
  rendererHint?: string;
}

// ─── Field ACL ──────────────────────────────────────────────────

export interface FieldAcl {
  isReadOnly?: boolean;
  isHidden?: boolean;
}

// ─── Uenum Value ────────────────────────────────────────────────

export interface UenumValue {
  id: number | string;
  label: string;
  ordinal: number;
  isDeprecated?: boolean;
  tooltip?: string;
  color?: string;
}

// ─── Enum Option ────────────────────────────────────────────────

export interface EnumOption {
  label: string;
  value: string;
}

// ─── Field Descriptor Base ──────────────────────────────────────

export interface FieldDescriptorBase {
  name: string;
  displayName?: string;
  description?: string;
  isRequired?: boolean;
  isImmutable?: boolean;
  isSystem?: boolean;
  active?: boolean;
  ui?: FieldUiMetadata;
  fieldAcl?: FieldAcl;
  conditionOverrides?: FieldConditionOverrides;
  conditions?: FragmentCondition[];
  conditionsHierarchy?: Record<string, FragmentCondition[]> | FragmentCondition[];
  options?: unknown[];
}

// ─── Typed Field Descriptors ────────────────────────────────────

export interface BoolField extends FieldDescriptorBase {
  fieldType: FieldType.BOOL;
  defaultValue?: boolean;
}

export interface TextField extends FieldDescriptorBase {
  fieldType: FieldType.TEXT;
  defaultValue?: string;
  maxLen?: number;
  minLen?: number;
  pattern?: string;
  placeholder?: string;
}

export interface RichTextField extends FieldDescriptorBase {
  fieldType: FieldType.RICH_TEXT;
  defaultValue?: string;
  maxLen?: number;
  minLen?: number;
}

export interface IntField extends FieldDescriptorBase {
  fieldType: FieldType.INT;
  defaultValue?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface DoubleField extends FieldDescriptorBase {
  fieldType: FieldType.DOUBLE;
  defaultValue?: number;
}

export interface EnumField extends FieldDescriptorBase {
  fieldType: FieldType.ENUM;
  allowedValues: string[];
  options: EnumOption[];
  defaultValue?: string;
  maxSelected?: number;
  minSelected?: number;
}

export interface UenumField extends FieldDescriptorBase {
  fieldType: FieldType.UENUM;
  allowedValues: UenumValue[];
  defaultValue?: number;
}

export interface IdField extends FieldDescriptorBase {
  fieldType: FieldType.ID;
  idTypes?: string[];
  defaultValue?: string;
  maxSelected?: number;
  minSelected?: number;
}

export interface DateField extends FieldDescriptorBase {
  fieldType: FieldType.DATE;
  defaultValue?: string;
  minDate?: string;
  maxDate?: string;
}

export interface TimestampField extends FieldDescriptorBase {
  fieldType: FieldType.TIMESTAMP;
  defaultValue?: string;
}

export interface TokensField extends FieldDescriptorBase {
  fieldType: FieldType.TOKENS;
  defaultValue?: string;
  maxLen?: number;
  minLen?: number;
}

export interface CompositeField extends FieldDescriptorBase {
  fieldType: FieldType.COMPOSITE;
  compositeType?: string;
  compositeSchema?: { fields: FieldDescriptor[] };
}

export interface ListField extends FieldDescriptorBase {
  fieldType: FieldType.LIST;
  baseType: FieldType;
  maxItems?: number;
  minItems?: number;
  defaultValue?: unknown[];
  // Carries the same props as the base type
  allowedValues?: string[] | UenumValue[];
  options?: EnumOption[];
  idTypes?: string[];
}

export interface JsonValueField extends FieldDescriptorBase {
  fieldType: FieldType.JSON_VALUE;
  defaultValue?: unknown;
}

export interface StructField extends FieldDescriptorBase {
  fieldType: FieldType.STRUCT;
  defaultValue?: Record<string, unknown>;
}

// ─── Union Type ─────────────────────────────────────────────────

export type FieldDescriptor =
  | BoolField
  | TextField
  | RichTextField
  | IntField
  | DoubleField
  | EnumField
  | UenumField
  | IdField
  | DateField
  | TimestampField
  | TokensField
  | CompositeField
  | ListField
  | JsonValueField
  | StructField;

// ─── Aggregated Schema ──────────────────────────────────────────

export interface AggregatedSchema {
  stockFields: FieldDescriptor[];
  customFields: FieldDescriptor[];
  conditions?: FragmentCondition[];
  subtype?: string;
  leafType?: string;
}

// ─── Subtype ────────────────────────────────────────────────────

export interface Subtype {
  name: string;
  label: string;
  value: string;
  leafType: string;
  privilege?: OperationType[];
  deprecated?: boolean;
}

export interface SubtypesListResponse {
  subtypes: Subtype[];
}
