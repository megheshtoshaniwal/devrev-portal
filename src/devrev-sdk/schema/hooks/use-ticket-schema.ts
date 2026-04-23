"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDevRevAPI } from "../../hooks/use-devrev";
import type {
  Subtype,
  SubtypesListResponse,
  AggregatedSchema,
  FieldDescriptor,
  OperationType,
} from "../types";
import {
  getItemsWithCreatePrivilege,
  getCreateFormFields,
  applyDefaults,
  getEmptyRequiredFields,
  applyConditionOverrides,
} from "../utils";

// ─── API Endpoints ──────────────────────────────────────────────

const ENDPOINTS = {
  SUBTYPES_LIST: "internal/schemas.subtypes.list",
  AGGREGATED_SCHEMA: "internal/schemas.aggregated.get",
  STOCK_SCHEMA: "internal/schemas.stock.get",
  CUSTOM_SCHEMA: "internal/schemas.custom.get",
} as const;

// ─── Hook: Fetch subtypes with privilege filtering ──────────────

export function useTicketSubtypes() {
  const { apiCall } = useDevRevAPI();
  const [subtypes, setSubtypes] = useState<Subtype[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<SubtypesListResponse>("POST", ENDPOINTS.SUBTYPES_LIST, {
      leaf_types: ["ticket"],
    })
      .then((res) => {
        const all = res.subtypes || [];
        // Filter to subtypes the user can create
        const creatable = getItemsWithCreatePrivilege(all);
        // Exclude deprecated
        setSubtypes(creatable.filter((s) => !s.deprecated));
      })
      .catch(() => setSubtypes([]))
      .finally(() => setLoading(false));
  }, [apiCall]);

  return { subtypes, loading };
}

// ─── Hook: Fetch schema for a selected subtype ──────────────────

export function useTicketSchema(subtypeName: string | null) {
  const { apiCall } = useDevRevAPI();
  const [schema, setSchema] = useState<AggregatedSchema | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Fetch aggregated schema — always fetch tenant fields, add subtype if selected
    const spec: Record<string, unknown> = {};
    if (subtypeName) {
      spec.subtype = subtypeName;
    }

    apiCall<{
      schema?: {
        field_descriptors?: unknown[];
        stock_field_descriptors?: unknown[];
        custom_field_descriptors?: unknown[];
        stock_fields?: unknown[];
        custom_fields?: unknown[];
        conditions?: unknown[];
      };
      stock_fields?: unknown[];
      custom_fields?: unknown[];
    }>("POST", ENDPOINTS.AGGREGATED_SCHEMA, {
      leaf_type: "ticket",
      custom_schema_spec: spec,
    })
      .then((res) => {
        // Parse the response — actual shape is { schema: { stock_fields: [...], custom_fields: [...] } }
        const schemaData = res.schema || res;
        const sd = schemaData as Record<string, unknown>;
        const stockFields = (
          sd.stock_fields ||
          sd.stock_field_descriptors ||
          sd.field_descriptors ||
          []
        ) as FieldDescriptor[];

        const customFields = (
          sd.custom_fields ||
          sd.custom_field_descriptors ||
          []
        ) as FieldDescriptor[];

        setSchema({
          stockFields: normalizeFields(stockFields),
          customFields: normalizeFields(customFields),
          conditions: ((schemaData as Record<string, unknown>).conditions || []) as AggregatedSchema["conditions"],
          subtype: subtypeName ?? undefined,
          leafType: "ticket",
        });
      })
      .catch(() => {
        // If aggregated schema fails, try fetching stock + custom separately
        Promise.all([
          apiCall<{ field_descriptors?: unknown[] }>("POST", ENDPOINTS.STOCK_SCHEMA, {
            leaf_type: "ticket",
          }).catch(() => ({ field_descriptors: [] })),
          apiCall<{ field_descriptors?: unknown[] }>("POST", ENDPOINTS.CUSTOM_SCHEMA, {
            leaf_type: "ticket",
            name: subtypeName,
          }).catch(() => ({ field_descriptors: [] })),
        ]).then(([stock, custom]) => {
          setSchema({
            stockFields: normalizeFields((stock.field_descriptors || []) as FieldDescriptor[]),
            customFields: normalizeFields((custom.field_descriptors || []) as FieldDescriptor[]),
            subtype: subtypeName ?? undefined,
            leafType: "ticket",
          });
        });
      })
      .finally(() => setLoading(false));
  }, [subtypeName, apiCall]);

  return { schema, loading };
}

// ─── Hook: Fetch field ACL for the current user ─────────────────

interface FieldPrivileges {
  read: { stockFields: string[]; tenantFields: string[]; subtypeFields: string[] };
  write: { stockFields: string[]; tenantFields: string[]; subtypeFields: string[] };
}

export function useFieldAcl() {
  const { apiCall } = useDevRevAPI();
  const [fieldPrivileges, setFieldPrivileges] = useState<FieldPrivileges | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Call batch.apply to get field-level permissions for the current user
    // Note: target without "type" field — the dev env panics on target_info type
    apiCall<{
      items: Array<{
        batch_type: string;
        is_field_acl_enabled?: boolean;
        field_privileges?: {
          read?: { stock_fields?: string[]; tenant_fields?: string[]; subtype_fields?: string[] };
          write?: { stock_fields?: string[]; tenant_fields?: string[]; subtype_fields?: string[] };
        };
      }>;
    }>("POST", "internal/batch.apply", {
      items: [{
        batch_type: "user_privileges",
        target: { object_type: "ticket" },
      }],
    })
      .then((res) => {
        const item = res.items?.[0];
        if (item?.is_field_acl_enabled && item.field_privileges) {
          const fp = item.field_privileges;
          setFieldPrivileges({
            read: {
              stockFields: fp.read?.stock_fields || [],
              tenantFields: fp.read?.tenant_fields || [],
              subtypeFields: fp.read?.subtype_fields || [],
            },
            write: {
              stockFields: fp.write?.stock_fields || [],
              tenantFields: fp.write?.tenant_fields || [],
              subtypeFields: fp.write?.subtype_fields || [],
            },
          });
        }
        // If field ACL is not enabled, fieldPrivileges stays null → no filtering
      })
      .catch(() => {
        // ACL fetch failed — don't filter (show all)
      })
      .finally(() => setLoading(false));
  }, [apiCall]);

  return { fieldPrivileges, loading };
}

/**
 * Apply field ACL to a schema — sets fieldAcl.isHidden and fieldAcl.isReadOnly
 * based on the user's read/write permissions.
 */
function applyFieldAcl(
  schema: AggregatedSchema,
  acl: FieldPrivileges
): AggregatedSchema {
  const readableFields = new Set([
    ...acl.read.stockFields,
    ...acl.read.tenantFields,
    ...acl.read.subtypeFields,
  ]);
  const writableFields = new Set([
    ...acl.write.stockFields,
    ...acl.write.tenantFields,
    ...acl.write.subtypeFields,
  ]);

  function applyToField(field: FieldDescriptor): FieldDescriptor {
    // Field names in schema may have tnt__ prefix (data_name) or not (name)
    const fieldName = field.name;
    const dataName = (field as unknown as Record<string, unknown>).data_name as string | undefined;

    // Check both name and data_name against ACL lists
    const canRead = readableFields.has(fieldName) ||
      (dataName ? readableFields.has(dataName) : false) ||
      readableFields.has(fieldName.replace("tnt__", ""));
    const canWrite = writableFields.has(fieldName) ||
      (dataName ? writableFields.has(dataName) : false) ||
      writableFields.has(fieldName.replace("tnt__", ""));

    return {
      ...field,
      fieldAcl: {
        isHidden: !canRead,
        isReadOnly: !canWrite,
      },
    };
  }

  return {
    ...schema,
    stockFields: schema.stockFields.map(applyToField),
    customFields: schema.customFields.map(applyToField),
  };
}

// ─── Hook: Full ticket form state management ────────────────────

export function useTicketForm(schema: AggregatedSchema | null, fieldPrivileges: FieldPrivileges | null) {
  const [entity, setEntity] = useState<Record<string, unknown>>({});

  // Apply field ACL, then get visible, ordered fields for the create form
  const aclSchema = useMemo(() => {
    if (!schema) return null;
    if (!fieldPrivileges) return schema; // No ACL data → show all
    return applyFieldAcl(schema, fieldPrivileges);
  }, [schema, fieldPrivileges]);

  const formFields = useMemo(() => {
    if (!aclSchema) return [];
    return getCreateFormFields(aclSchema, entity);
  }, [aclSchema, entity]);

  // Update a field value and re-evaluate conditions
  const updateField = useCallback(
    (fieldName: string, value: unknown) => {
      setEntity((prev) => {
        const next = { ...prev, [fieldName]: value };
        return next;
      });
    },
    []
  );

  // Apply defaults when schema loads
  useEffect(() => {
    if (!aclSchema) return;
    const allFields = [...aclSchema.stockFields, ...aclSchema.customFields];
    setEntity((prev) => applyDefaults(allFields, prev));
  }, [aclSchema]);

  // Validation
  const emptyRequiredFields = useMemo(() => {
    if (!formFields.length) return [];
    return getEmptyRequiredFields(formFields, entity, true);
  }, [formFields, entity]);

  const isValid = emptyRequiredFields.length === 0;

  return {
    entity,
    setEntity,
    formFields,
    updateField,
    isValid,
    emptyRequiredFields,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

/** Normalize field descriptors from API response (handle different response shapes) */
function normalizeFields(fields: unknown[]): FieldDescriptor[] {
  return (fields || []).map((f) => {
    const field = f as Record<string, unknown>;

    // Ensure fieldType is set
    if (!field.fieldType && field.field_type) {
      field.fieldType = field.field_type;
    }

    // Normalize snake_case to camelCase for key properties
    if (field.display_name && !field.displayName) {
      field.displayName = field.display_name;
    }
    if (field.is_required !== undefined && field.isRequired === undefined) {
      field.isRequired = field.is_required;
    }
    if (field.is_system !== undefined && field.isSystem === undefined) {
      field.isSystem = field.is_system;
    }
    if (field.is_immutable !== undefined && field.isImmutable === undefined) {
      field.isImmutable = field.is_immutable;
    }
    if (field.default_value !== undefined && field.defaultValue === undefined) {
      field.defaultValue = field.default_value;
    }
    if (field.allowed_values && !field.allowedValues) {
      field.allowedValues = field.allowed_values;
    }
    if (field.id_types && !field.idTypes) {
      field.idTypes = field.id_types;
    }
    if (field.base_type && !field.baseType) {
      field.baseType = field.base_type;
    }
    if (field.field_acl && !field.fieldAcl) {
      field.fieldAcl = field.field_acl;
    }
    if (field.max_len && !field.maxLen) {
      field.maxLen = field.max_len;
    }
    if (field.min_len && !field.minLen) {
      field.minLen = field.min_len;
    }

    // Normalize nested ui metadata
    if (field.ui && typeof field.ui === "object") {
      const ui = field.ui as Record<string, unknown>;
      if (ui.is_hidden !== undefined) ui.isHidden = ui.is_hidden;
      if (ui.is_read_only !== undefined) ui.isReadOnly = ui.is_read_only;
      if (ui.is_base_field !== undefined) ui.isBaseField = ui.is_base_field;
      if (ui.is_hidden_during_create !== undefined) ui.isHiddenDuringCreate = ui.is_hidden_during_create;
      if (ui.display_name !== undefined) ui.displayName = ui.display_name;
      if (ui.dependent_fields !== undefined) ui.dependentFields = ui.dependent_fields;
    }

    return field as unknown as FieldDescriptor;
  });
}
