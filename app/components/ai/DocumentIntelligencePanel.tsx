"use client";

import { useMemo, useState } from "react";
import type { DocumentRecord, IntakeTargetKind } from "../../lib/atlas-types";

type Props = {
  document: DocumentRecord;
  assets: any[];
  vendors: any[];
  locations: any[];
  workOrders: any[];
  onApply: (patch: Partial<DocumentRecord>) => Promise<void> | void;
  colors: any;
};

type Analysis = {
  documentType?: string;
  summary?: string;
  rawText?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  assetName?: string;
  vendorName?: string;
  invoiceNumber?: string;
  amount?: string;
  date?: string;
  locationName?: string;
  confidence?: string;
  warnings?: string[];
};

type Suggestion = {
  kind: IntakeTargetKind;
  id: string;
  name: string;
  score: number;
  reason: string;
};

function tokens(value: unknown) {
  return Array.from(
    new Set(
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3),
    ),
  );
}

function matchScore(candidate: string, evidence: string) {
  const candidateTokens = tokens(candidate);
  const lowerEvidence = evidence.toLowerCase();
  let score = 0;
  candidateTokens.forEach((token) => {
    if (lowerEvidence.includes(token)) score += token.length >= 6 ? 3 : 2;
  });
  if (candidate.trim().length >= 4 && lowerEvidence.includes(candidate.toLowerCase())) {
    score += 10;
  }
  return score;
}

export default function DocumentIntelligencePanel({
  document,
  assets,
  vendors,
  locations,
  workOrders,
  onApply,
  colors,
}: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [message, setMessage] = useState(
    "Analyze this document to extract equipment, vendor, date, and maintenance information.",
  );

  const evidence = useMemo(
    () =>
      [
        document.title,
        document.notes,
        document.pastedText,
        ...(document.files || []).map((file) => file.name),
        analysis?.summary,
        analysis?.rawText,
        analysis?.manufacturer,
        analysis?.model,
        analysis?.serial,
        analysis?.assetName,
        analysis?.vendorName,
        analysis?.locationName,
      ]
        .filter(Boolean)
        .join(" "),
    [document, analysis],
  );

  const suggestions = useMemo(() => {
    if (!analysis) return [] as Suggestion[];
    const next: Suggestion[] = [];
    assets.forEach((asset) => {
      const score = matchScore(
        [asset.name, asset.make, asset.manufacturer, asset.model, asset.serial].join(" "),
        evidence,
      );
      if (score >= 4)
        next.push({ kind: "Asset", id: asset.id, name: asset.name, score, reason: "Equipment name, manufacturer, model, or serial match" });
    });
    vendors.forEach((vendor) => {
      const score = matchScore([vendor.name, vendor.category].join(" "), evidence);
      if (score >= 4)
        next.push({ kind: "Vendor", id: vendor.id, name: vendor.name, score, reason: "Vendor name or category match" });
    });
    locations.forEach((location) => {
      const score = matchScore([location.name, location.type, location.zone].join(" "), evidence);
      if (score >= 4)
        next.push({ kind: "Location", id: location.id, name: location.name, score, reason: "Location name or property-area match" });
    });
    workOrders.forEach((record) => {
      const score = matchScore([record.title, record.notes].join(" "), evidence);
      if (score >= 6)
        next.push({ kind: "Work Order", id: record.id, name: record.title, score, reason: "Work title or maintenance-note match" });
    });
    return next.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 6);
  }, [analysis, assets, vendors, locations, workOrders, evidence]);

  async function analyze() {
    if (loading) return;
    setLoading(true);
    setMessage("Atlas is reading the document. Nothing will be changed automatically...");
    try {
      const response = await fetch("/api/atlas-inbox-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: {
            id: document.id,
            title: document.title,
            intakeType: document.type,
            notes: document.notes,
            pastedText: document.pastedText || "",
            files: (document.files || []).slice(0, 3).map((file) => ({
              name: file.name,
              type: file.type || "application/octet-stream",
              dataUrl: file.dataUrl || "",
              url: file.url || "",
            })),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Document analysis failed.");
      }
      setAnalysis((payload.analysis || {}) as Analysis);
      setMessage("Analysis complete. Review every extracted value and suggested link before applying it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Document analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function applySuggestion(suggestion: Suggestion) {
    if (saving) return;
    setSaving(true);
    setSavedMessage("");
    const notes = [
      document.notes,
      analysis?.summary ? `AI review summary: ${analysis.summary}` : "",
      analysis?.manufacturer ? `Manufacturer: ${analysis.manufacturer}` : "",
      analysis?.model ? `Model: ${analysis.model}` : "",
      analysis?.serial ? `Serial: ${analysis.serial}` : "",
      analysis?.date ? `Document date: ${analysis.date}` : "",
    ].filter(Boolean).join("\n");
    try {
      await onApply({
        targetType: suggestion.kind,
        targetId: suggestion.id,
        targetName: suggestion.name,
        area: suggestion.name,
        linkedAssetId: suggestion.kind === "Asset" ? suggestion.id : undefined,
        linkedVendorId: suggestion.kind === "Vendor" ? suggestion.id : undefined,
        notes,
      });
      setMessage(`Linked to ${suggestion.name}.`);
      setSavedMessage(`Link approved and document saved to ${suggestion.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The link could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const fields = analysis
    ? [
        ["Type", analysis.documentType],
        ["Manufacturer", analysis.manufacturer],
        ["Model", analysis.model],
        ["Serial", analysis.serial],
        ["Vendor", analysis.vendorName],
        ["Date", analysis.date],
        ["Invoice", analysis.invoiceNumber],
        ["Amount", analysis.amount],
        ["Confidence", analysis.confidence],
      ].filter((entry) => entry[1])
    : [];

  return (
    <section style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 14, background: colors.panel, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: colors.gold, fontSize: 11, fontWeight: 950, letterSpacing: "0.1em", textTransform: "uppercase" }}>Document Intelligence</div>
          <strong style={{ color: colors.navy }}>Review extracted information and suggested links</strong>
        </div>
        <button type="button" onClick={() => void analyze()} disabled={loading} style={{ border: 0, borderRadius: 9, background: colors.gold, color: colors.navy, padding: "9px 12px", fontWeight: 950, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Analyzing..." : analysis ? "Analyze Again" : "Analyze Document"}
        </button>
      </div>
      <div style={{ color: colors.muted, fontSize: 12, lineHeight: 1.5 }}>{message}</div>
      {savedMessage ? <div role="status" style={{ border: "1px solid #86C89A", borderRadius: 9, background: "#EFFAF2", color: "#176B33", padding: "9px 11px", fontSize: 12, fontWeight: 900 }}>{savedMessage}</div> : null}

      {analysis?.summary ? <div style={{ color: colors.navy, lineHeight: 1.55 }}><strong>Summary:</strong> {analysis.summary}</div> : null}
      {fields.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          {fields.map(([label, value]) => <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, background: colors.card, padding: 9 }}><span style={{ display: "block", color: colors.muted, fontSize: 10, fontWeight: 850 }}>{label}</span><strong style={{ color: colors.navy, fontSize: 12 }}>{value}</strong></div>)}
        </div>
      ) : null}

      {suggestions.length ? (
        <div style={{ display: "grid", gap: 7 }}>
          <strong style={{ color: colors.navy }}>Suggested record links</strong>
          {suggestions.map((suggestion) => (
            <div key={`${suggestion.kind}-${suggestion.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 9, background: colors.card, padding: 9 }}>
              <span style={{ minWidth: 0 }}><strong style={{ display: "block", color: colors.navy }}>{suggestion.name}</strong><small style={{ color: colors.muted }}>{suggestion.kind} Â· {suggestion.reason}</small></span>
              <button type="button" disabled={saving} onClick={() => void applySuggestion(suggestion)} style={{ border: `1px solid ${colors.line}`, borderRadius: 8, background: colors.panel, color: colors.navy, padding: "7px 9px", fontWeight: 850, cursor: saving ? "wait" : "pointer", whiteSpace: "nowrap" }}>{saving ? "Saving..." : "Approve Link"}</button>
            </div>
          ))}
        </div>
      ) : analysis ? <div style={{ color: colors.muted, fontSize: 12 }}>No reliable existing-record link was found. Atlas will not invent one.</div> : null}
    </section>
  );
}
