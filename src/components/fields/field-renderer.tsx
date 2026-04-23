"use client";

import { useState } from "react";
import { cn } from "@/portal/utils/utils";
import { FieldType } from "@/devrev-sdk/schema/types";
import type {
  FieldDescriptor,
  EnumField,
  UenumField,
  TextField,
  RichTextField,
  IntField,
  DoubleField,
  BoolField,
  DateField,
  TimestampField,
  TokensField,
  IdField,
  ListField,
} from "@/devrev-sdk/schema/types";

// ─── Main Field Renderer ────────────────────────────────────────

interface FieldRendererProps {
  field: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: boolean;
}

export function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const isRequired = field.conditionOverrides?.isRequired ?? field.isRequired;
  const isReadOnly = field.fieldAcl?.isReadOnly || field.conditionOverrides?.isImmutable;
  const label = field.ui?.displayName || field.displayName || field.name;
  const fieldId = `field-${field.name}`;
  const descriptionId = field.description ? `${fieldId}-desc` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {isRequired && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
        {isRequired && <span className="sr-only"> (required)</span>}
      </label>
      {field.description && (
        <p id={descriptionId} className="text-xs text-muted-foreground mb-1.5">{field.description}</p>
      )}
      <div className={cn(error && "ring-2 ring-destructive/20 rounded-xl")}>
        <FieldInput
          field={field}
          value={value}
          onChange={onChange}
          disabled={!!isReadOnly}
          fieldId={fieldId}
          aria-required={isRequired || undefined}
          aria-invalid={error || undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive mt-1" role="alert">
          This field is required
        </p>
      )}
    </div>
  );
}

// ─── Field Input (type-specific) ────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  fieldId,
  ...ariaProps
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
  fieldId?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const fieldType = field.fieldType;

  // Handle LIST fields by delegating to the base type
  if (fieldType === FieldType.LIST) {
    return <ListInput field={field as ListField} value={value as unknown[]} onChange={onChange} disabled={disabled} />;
  }

  switch (fieldType) {
    case FieldType.TEXT:
      return <TextInput field={field as TextField} value={value as string} onChange={onChange} disabled={disabled} />;

    case FieldType.RICH_TEXT:
      return <RichTextInput field={field as RichTextField} value={value as string} onChange={onChange} disabled={disabled} />;

    case FieldType.ENUM:
      return <EnumInput field={field as EnumField} value={value as string} onChange={onChange} disabled={disabled} />;

    case FieldType.UENUM:
      return <UenumInput field={field as UenumField} value={value as number} onChange={onChange} disabled={disabled} />;

    case FieldType.BOOL:
      return <BoolInput field={field as BoolField} value={value as boolean} onChange={onChange} disabled={disabled} />;

    case FieldType.INT:
      return <IntInput field={field as IntField} value={value as number} onChange={onChange} disabled={disabled} />;

    case FieldType.DOUBLE:
      return <DoubleInput field={field as DoubleField} value={value as number} onChange={onChange} disabled={disabled} />;

    case FieldType.DATE:
      return <DateInput field={field as DateField} value={value as string} onChange={onChange} disabled={disabled} />;

    case FieldType.TIMESTAMP:
      return <TimestampInput field={field as TimestampField} value={value as string} onChange={onChange} disabled={disabled} />;

    case FieldType.TOKENS:
      return <TokensInput field={field as TokensField} value={value as string} onChange={onChange} disabled={disabled} />;

    case FieldType.ID:
      return <IdInput field={field as IdField} value={value as string} onChange={onChange} disabled={disabled} />;

    default:
      // Fallback for unknown field types (composite, struct, json, etc.)
      return <TextInput field={field as unknown as TextField} value={String(value || "")} onChange={onChange} disabled={disabled} />;
  }
}

// ─── Input CSS ──────────────────────────────────────────────────

const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed";
const selectClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50";

// ─── Text ───────────────────────────────────────────────────────

function TextInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: TextField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={field.ui?.placeholder || ""}
      maxLength={field.maxLen}
      className={inputClass}
    />
  );
}

// ─── Rich Text (simplified as textarea) ─────────────────────────

function RichTextInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: RichTextField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={field.ui?.placeholder || ""}
      rows={4}
      maxLength={field.maxLen}
      className={cn(inputClass, "resize-none")}
    />
  );
}

// ─── Enum (dropdown) ────────────────────────────────────────────

function EnumInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: EnumField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  // Condition overrides may restrict allowed values
  const allowedValues = field.conditionOverrides?.allowedValues || field.allowedValues || [];

  // Build options: use field.options if available, otherwise generate from allowedValues
  const options = (field.options && field.options.length > 0)
    ? field.options.filter((o) => allowedValues.includes(o.value))
    : allowedValues.map((v) => ({
        value: v,
        label: v
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),  // "credit_card" → "Credit Card"
      }));

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={selectClass}
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Uenum (dropdown with ordinal values) ───────────────────────

function UenumInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: UenumField;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  // Condition overrides may restrict uenum values
  const allowedIds = field.conditionOverrides?.uenumValues;
  const options = allowedIds
    ? field.allowedValues.filter((v) => allowedIds.includes(Number(v.id)))
    : field.allowedValues;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={selectClass}
    >
      <option value="">Select...</option>
      {options
        .filter((v) => !v.isDeprecated)
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
    </select>
  );
}

// ─── Bool (toggle) ──────────────────────────────────────────────

function BoolInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: BoolField;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        "relative w-10 h-5.5 rounded-full transition-colors cursor-pointer",
        value ? "bg-primary" : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform",
          value ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ─── Int ────────────────────────────────────────────────────────

function IntInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: IntField;
  value: number;
  onChange: (v: number | undefined) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
      disabled={disabled}
      min={field.gte ?? field.gt}
      max={field.lte ?? field.lt}
      step={1}
      className={inputClass}
    />
  );
}

// ─── Double ─────────────────────────────────────────────────────

function DoubleInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: DoubleField;
  value: number;
  onChange: (v: number | undefined) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
      disabled={disabled}
      step="any"
      className={inputClass}
    />
  );
}

// ─── Date ───────────────────────────────────────────────────────

function DateInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: DateField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={field.minDate}
      max={field.maxDate}
      className={inputClass}
    />
  );
}

// ─── Timestamp ──────────────────────────────────────────────────

function TimestampInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: TimestampField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  // Convert ISO string to datetime-local format for input
  const localValue = value ? value.slice(0, 16) : "";

  return (
    <input
      type="datetime-local"
      value={localValue}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
      disabled={disabled}
      className={inputClass}
    />
  );
}

// ─── Tokens (tag-style input) ───────────────────────────────────

function TokensInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: TokensField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={field.ui?.placeholder || "Enter values separated by commas"}
      className={inputClass}
    />
  );
}

// ─── ID / Lookup (simplified as text input with ID) ─────────────

function IdInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: IdField;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const types = field.idTypes?.join(", ") || "object";

  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={`Search for ${types}...`}
      className={inputClass}
    />
  );
}

// ─── List (multi-value) ─────────────────────────────────────────

function ListInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ListField;
  value: unknown[];
  onChange: (v: unknown[]) => void;
  disabled: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const items = value || [];

  // For enum lists, render as multi-select checkboxes
  if (field.baseType === FieldType.ENUM && field.options) {
    const selectedValues = new Set(items as string[]);
    return (
      <div className="space-y-1.5">
        {(field.options as Array<{ label: string; value: string }>).map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedValues.has(opt.value)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...items, opt.value]);
                } else {
                  onChange((items as string[]).filter((v) => v !== opt.value));
                }
              }}
              disabled={disabled}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  // For other list types, render as a tag input
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-xs bg-muted text-foreground rounded-full px-2.5 py-1"
          >
            {String(item)}
            {!disabled && (
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                e.preventDefault();
                onChange([...items, inputValue.trim()]);
                setInputValue("");
              }
            }}
            placeholder="Type and press Enter"
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
