"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  Sparkles,
  Send,
  Loader2,
  FileText,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  PenLine,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/devrev-sdk/hooks/use-session";
import { useDevRevAPI } from "@/devrev-sdk/hooks/use-devrev";
import { usePortalConfig } from "@/portal/config";
import { useJourney } from "@/portal/hooks/use-journey";
import { useTicketSubtypes, useTicketSchema, useTicketForm, useFieldAcl } from "@/devrev-sdk/schema/hooks/use-ticket-schema";
import { FieldRenderer } from "@/components/fields/field-renderer";
import { useAIContext } from "@/devrev-sdk/ai/use-ai-context";
import type { Article, Ticket } from "@/devrev-sdk/client";
import type { Subtype } from "@/devrev-sdk/schema/types";
import { cn } from "@/portal/utils/utils";

// ─── Types ──────────────────────────────────────────────────────

type Step = "describe" | "deflection" | "form" | "submitted";

interface DeflectionResult {
  relevant_articles: Array<{ title: string; id: string; reason: string }>;
  can_resolve: boolean;
  message: string;
}

// ─── Main Page ──────────────────────────────────────────────────

export default function CreateTicketPage() {
  const { token } = useSession();
  const { apiCall } = useDevRevAPI();
  const { config, basePath } = usePortalConfig();
  const journey = useJourney();

  const { ticketCreation: tcConfig, features, content: contentConfig } = config;
  const { contextPrefix } = useAIContext();

  // Schema state
  const { subtypes, loading: subtypesLoading } = useTicketSubtypes();
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const { schema, loading: schemaLoading } = useTicketSchema(selectedSubtype);
  const { fieldPrivileges } = useFieldAcl();
  const { entity, formFields, updateField, isValid, emptyRequiredFields, setEntity } = useTicketForm(schema, fieldPrivileges);

  // Flow state
  const [step, setStep] = useState<Step>(
    tcConfig.deflection || tcConfig.aiAssist ? "describe" : "form"
  );
  const [description, setDescription] = useState("");
  const [deflectionResult, setDeflectionResult] = useState<DeflectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Form base fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  // AI suggestions
  const [aiMissingInfo, setAiMissingInfo] = useState<string[]>([]);
  // Pending AI field suggestions — held until schema loads with correct subtype
  const pendingAiFieldsRef = useRef<{ fields: Record<string, unknown>; subtype: string | null } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const articlesViewed = journey.getArticlesViewed();
  const journeySummary = journey.getSummary();

  // Auto-select subtype if only one available
  useEffect(() => {
    if (subtypes.length === 1 && !selectedSubtype) {
      setSelectedSubtype(subtypes[0].name);
    }
  }, [subtypes, selectedSubtype]);

  // Re-apply pending AI field suggestions when schema finishes loading
  useEffect(() => {
    const pending = pendingAiFieldsRef.current;
    if (!pending || schemaLoading || formFields.length === 0) return;

    // Only apply if the subtype hasn't changed since AI suggested these fields
    if (pending.subtype !== selectedSubtype) {
      pendingAiFieldsRef.current = null;
      return;
    }

    setEntity((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(pending.fields)) {
        if (value !== null && value !== undefined && value !== "") {
          const matchingField = formFields.find(
            (f) => f.name === key || f.name === `tnt__${key}` || f.name.replace("tnt__", "") === key
          );
          if (matchingField) {
            next[matchingField.name] = value;
          }
        }
      }
      return next;
    });
    pendingAiFieldsRef.current = null;
  }, [formFields, schemaLoading, selectedSubtype, setEntity]);

  // ─── Step 1: Describe problem ─────────────────────────────────

  const handleDescribe = useCallback(async () => {
    if (!description.trim() || !token) return;
    setLoading(true);

    const promises: Promise<void>[] = [];

    // Deflection
    if (tcConfig.deflection) {
      promises.push(
        (async () => {
          try {
            const searchRes = await apiCall<{
              results: Array<{ type: string; article?: Article }>;
            }>("POST", "internal/search.core", {
              query: description,
              namespaces: ["article"],
              limit: tcConfig.deflectionMaxResults + 2,
            });

            const articleResults = (searchRes.results || [])
              .filter((r) => r.article || r.type === "article")
              .slice(0, tcConfig.deflectionMaxResults + 2);

            if (articleResults.length > 0) {
              const articleSummaries = articleResults
                .map((r) => {
                  const a = (r.article || r) as { display_id?: string; title?: string; description?: string };
                  return `${a.display_id}: "${a.title}" — ${(a.description || "").slice(0, 100)}`;
                })
                .join("\n");

              const journeyCtx = tcConfig.journeyContext ? `\n\nUser's session activity:\n${journeySummary}` : "";

              const res = await apiCall<{ text_response?: string; completion?: string }>(
                "POST",
                "internal/recommendations.chat.completions",
                {
                  messages: [
                    { role: "system", content: tcConfig.deflectionPrompt },
                    {
                      role: "user",
                      content: `${contextPrefix}\n\nUser's problem: ${description}${journeyCtx}\n\nAvailable articles:\n${articleSummaries}`,
                    },
                  ],
                  max_tokens: 400,
                  temperature: 0.2,
                }
              );

              const jsonStr = res.text_response || res.completion;
              if (jsonStr) {
                const parsed = JSON.parse(jsonStr);
                if (parsed.relevant_articles?.length > 0) {
                  setDeflectionResult(parsed);
                }
              }
            }
          } catch { /* silent */ }
        })()
      );
    }

    // AI form assist
    if (tcConfig.aiAssist) {
      promises.push(
        (async () => {
          try {
            const subtypeCtx = subtypes.length > 0
              ? `\nAvailable subtypes: ${subtypes.map((s) => s.label).join(", ")}`
              : "";
            const journeyCtx = tcConfig.journeyContext && articlesViewed.length > 0
              ? `\nUser already read: ${articlesViewed.map((a) => a.title).join(", ")}`
              : "";

            // Build field context so the LLM knows what fields are available
            const fieldCtx = formFields.length > 0
              ? `\n\nAvailable form fields:\n${formFields.map((f) => {
                  const display = f.ui?.displayName || f.displayName || f.name;
                  const type = f.fieldType;
                  const req = (f.conditionOverrides?.isRequired ?? f.isRequired) ? " (REQUIRED)" : "";
                  let vals = "";
                  if ("allowedValues" in f && Array.isArray(f.allowedValues)) {
                    const av = f.allowedValues as (string | { label: string; id: number | string })[];
                    vals = ` allowed_values=[${av.map((v) => typeof v === "string" ? v : v.label).join(", ")}]`;
                  }
                  return `- ${f.name}: ${type}${req} — "${display}"${vals}`;
                }).join("\n")}`
              : "";

            const res = await apiCall<{ text_response?: string; completion?: string }>(
              "POST",
              "internal/recommendations.chat.completions",
              {
                messages: [
                  { role: "system", content: tcConfig.aiAssistPrompt },
                  {
                    role: "user",
                    content: `${contextPrefix}\n\nProblem description: ${description}${subtypeCtx}${journeyCtx}${fieldCtx}`,
                  },
                ],
                max_tokens: 600,
                temperature: 0.2,
              }
            );

            const jsonStr = res.text_response || res.completion;
            if (jsonStr) {
              const assist = JSON.parse(jsonStr);
              setTitle(assist.suggested_title || description.slice(0, 80));
              setBody(assist.cleaned_description || description);
              setAiMissingInfo(assist.missing_info || []);

              // Auto-select subtype if AI suggests one
              if (assist.suggested_subtype) {
                const match = subtypes.find(
                  (s) => s.label.toLowerCase() === assist.suggested_subtype.toLowerCase() ||
                         s.name.toLowerCase() === assist.suggested_subtype.toLowerCase()
                );
                if (match) setSelectedSubtype(match.name);
              }

              // Store AI field suggestions — applied now for fields that match,
              // and deferred via pendingAiFieldsRef for fields that appear
              // after the subtype-specific schema loads.
              if (assist.suggested_fields && typeof assist.suggested_fields === "object") {
                pendingAiFieldsRef.current = {
                  fields: assist.suggested_fields as Record<string, unknown>,
                  subtype: selectedSubtype,
                };

                // Apply what we can match right now (base schema fields)
                setEntity((prev) => {
                  const next = { ...prev };
                  for (const [key, value] of Object.entries(assist.suggested_fields)) {
                    if (value !== null && value !== undefined && value !== "") {
                      const matchingField = formFields.find(
                        (f) => f.name === key || f.name === `tnt__${key}` || f.name.replace("tnt__", "") === key
                      );
                      if (matchingField) {
                        next[matchingField.name] = value;
                      }
                    }
                  }
                  return next;
                });
              }
            }
          } catch {
            setTitle(description.slice(0, 80));
            setBody(description);
          }
        })()
      );
    } else {
      setTitle(description.slice(0, 80));
      setBody(description);
    }

    await Promise.all(promises);
    setLoading(false);

    // Go to deflection if we have results, otherwise straight to form
    // (deflectionResult is set async, check after promises resolve)
  }, [description, token, apiCall, tcConfig, journeySummary, articlesViewed, subtypes]);

  // Watch for deflection results to decide next step
  useEffect(() => {
    if (!loading && step === "describe" && description.trim()) {
      // Only transition after loading completes
    }
  }, [loading, step, description]);

  // After handleDescribe completes, transition
  useEffect(() => {
    if (!loading && step === "describe" && (title || body)) {
      if (deflectionResult?.relevant_articles?.length) {
        setStep("deflection");
      } else if (title || body) {
        setStep("form");
      }
    }
  }, [loading, deflectionResult, title, body, step]);

  // ─── Submit ticket ────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !token) return;
    setSubmitting(true);

    try {
      let fullBody = body;
      if (tcConfig.journeyContext && articlesViewed.length > 0) {
        fullBody += `\n\n---\nArticles reviewed before creating this ticket:\n${articlesViewed.map((a) => `- ${a.title} (${a.id})`).join("\n")}`;
      }

      // Build custom fields from entity — only include fields the user can write
      // formFields is already filtered by ACL (visibility + write permission)
      const writableFieldNames = new Set(formFields.map((f) => f.name));

      const customFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(entity)) {
        if (key !== "title" && key !== "body" && value !== undefined && value !== null && value !== "" && writableFieldNames.has(key)) {
          customFields[key] = value;
        }
      }

      const payload: Record<string, unknown> = {
        type: "ticket",
        title,
        body: fullBody,
      };

      // Add schema spec — always include tenant_fragment for custom fields,
      // plus subtype if one is selected
      if (selectedSubtype || Object.keys(customFields).length > 0) {
        payload.custom_schema_spec = {
          ...(selectedSubtype ? { subtype: selectedSubtype } : {}),
          tenant_fragment: true,
          validate_required_fields: true,
        };
      }

      // Only add custom fields that passed the filter
      if (Object.keys(customFields).length > 0) {
        payload.custom_fields = customFields;
      }

      const res = await apiCall<{ work: { display_id: string } }>(
        "POST",
        "internal/works.create",
        payload
      );

      setCreatedTicketId(res.work?.display_id || null);
      setStep("submitted");
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  }, [title, body, token, apiCall, tcConfig, articlesViewed, entity, selectedSubtype, formFields, schema, subtypes]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href={basePath} className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`${basePath}/tickets`} className="hover:text-foreground">
          Tickets
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">New Request</span>
      </nav>

      {/* ── Step: Describe ──────────────────────────────────────── */}
      {step === "describe" && (
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-2">How can we help?</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Describe your issue and {contentConfig.assistantName} will find relevant help or create a ticket for you.
          </p>

          {tcConfig.journeyContext && articlesViewed.length > 0 && (
            <div className="rounded-xl bg-muted/50 border border-border p-3 mb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                You recently read: {articlesViewed.slice(-3).map((a) => `"${a.title}"`).join(", ")}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your problem in a few sentences..."
              rows={5}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              {tcConfig.directFormFallback && (
                <button
                  onClick={() => setStep("form")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  <PenLine className="h-3 w-3" /> Skip to form
                </button>
              )}
              <Button
                onClick={handleDescribe}
                disabled={!description.trim() || loading}
                className="gap-2 ml-auto"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Searching for help..." : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step: Deflection ────────────────────────────────────── */}
      {step === "deflection" && deflectionResult && (
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            We found some articles that might help
          </h1>
          <p className="text-sm text-muted-foreground mb-6">{deflectionResult.message}</p>

          <div className="space-y-3 mb-6">
            {deflectionResult.relevant_articles.map((article) => (
              <Link
                key={article.id}
                href={`${basePath}/articles/${article.id}`}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{article.reason}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => { setStep("describe"); setDeflectionResult(null); }}>
              Back
            </Button>
            <Button onClick={() => setStep("form")} className="gap-1.5">
              <FileText className="h-4 w-4" /> I still need to create a ticket
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Form ──────────────────────────────────────────── */}
      {step === "form" && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create a request</h1>
              {tcConfig.aiAssist && (title || body) && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {contentConfig.assistantName} pre-filled this based on your description
                </p>
              )}
            </div>
          </div>

          {/* AI missing info suggestions */}
          {tcConfig.aiAssist && aiMissingInfo.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4" />
                {contentConfig.assistantName} suggests adding:
              </p>
              <ul className="space-y-1">
                {aiMissingInfo.map((q, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-400 mt-1">-</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {/* Subtype selector — only if multiple subtypes available */}
            {subtypes.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Request Type
                </label>
                <div className="relative">
                  <select
                    value={selectedSubtype || ""}
                    onChange={(e) => {
                      setSelectedSubtype(e.target.value || null);
                      // Clear custom fields when subtype changes
                      setEntity({});
                    }}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 appearance-none cursor-pointer"
                  >
                    <option value="">Select a type...</option>
                    {subtypes.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={6}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none leading-relaxed"
              />
            </div>

            {/* Dynamic fields from schema */}
            {schemaLoading && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading fields...
              </div>
            )}
            {formFields.length > 0 && (
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Additional Information
                </p>
                {formFields.map((field) => (
                  <FieldRenderer
                    key={field.name}
                    field={field}
                    value={entity[field.name]}
                    onChange={(v) => updateField(field.name, v)}
                    error={emptyRequiredFields.includes(field.name)}
                  />
                ))}
              </div>
            )}

            {/* Journey context */}
            {tcConfig.journeyContext && articlesViewed.length > 0 && (
              <div className="rounded-xl bg-muted/50 border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Articles you reviewed (attached automatically)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {articlesViewed.map((a) => (
                    <span key={a.id} className="text-xs bg-card border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                      {a.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  if (tcConfig.deflection && deflectionResult) {
                    setStep("deflection");
                  } else if (tcConfig.deflection || tcConfig.aiAssist) {
                    setStep("describe");
                    setDeflectionResult(null);
                  }
                }}
                className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || submitting}
                className="gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step: Submitted ─────────────────────────────────────── */}
      {step === "submitted" && (
        <div className="animate-slide-up text-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Request submitted</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {createdTicketId
              ? `Your ticket ${createdTicketId} has been created. Our team will review it shortly.`
              : "Your ticket has been created. Our team will review it shortly."}
          </p>
          <div className="flex items-center justify-center gap-3">
            {createdTicketId && (
              <Link href={`${basePath}/tickets/${createdTicketId}`}>
                <Button className="gap-1.5">
                  <FileText className="h-4 w-4" /> View Ticket
                </Button>
              </Link>
            )}
            <Link href={basePath}>
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
