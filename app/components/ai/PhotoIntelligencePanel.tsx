"use client";

import { useMemo, useState } from "react";
import type { AssetRecord, PhotoRecord } from "../../lib/atlas-types";

type Analysis = {
  summary?: string;
  rawText?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  assetName?: string;
  locationName?: string;
  confidence?: string;
  warnings?: string[];
  readings?: { psi?: string; temperature?: string; ph?: string; hours?: string };
};

type Props = {
  asset: AssetRecord;
  photos: PhotoRecord[];
  photoSource: (photo?: PhotoRecord) => string;
  onSaveAsset: (patch: Partial<AssetRecord>, summary: string) => Promise<void> | void;
  onDraftWorkOrder: (draft: { title: string; notes: string; priority: "Low" | "Medium" | "High" }) => void;
  colors: any;
};

function usefulPatch(asset: AssetRecord, analysis: Analysis) {
  const patch: Partial<AssetRecord> = {};
  if (analysis.manufacturer && analysis.manufacturer !== asset.manufacturer) patch.manufacturer = analysis.manufacturer;
  if (analysis.model && analysis.model !== asset.model) patch.model = analysis.model;
  if (analysis.serial && analysis.serial !== asset.serial) patch.serial = analysis.serial;
  return patch;
}

export default function PhotoIntelligencePanel({ asset, photos, photoSource, onSaveAsset, onDraftWorkOrder, colors }: Props) {
  const usablePhotos = useMemo(() => photos.filter((photo) => Boolean(photoSource(photo))), [photos, photoSource]);
  const [photoId, setPhotoId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Choose an asset photo for Atlas to inspect.");
  const selectedPhoto = usablePhotos.find((photo) => photo.id === photoId) || usablePhotos[0];
  const patch = analysis ? usefulPatch(asset, analysis) : {};
  const patchEntries = Object.entries(patch).filter(([, value]) => Boolean(value));
  const concernText = [analysis?.summary, ...(analysis?.warnings || [])].filter(Boolean).join(" ");
  const needsWork = /damage|leak|crack|corrosion|rust|broken|fault|repair|replace|unsafe|wear|service|maintenance|warning/i.test(concernText);

  async function analyze() {
    if (!selectedPhoto || loading) return;
    setLoading(true);
    setAnalysis(null);
    setMessage("Atlas is inspecting the photo. Nothing will change automatically...");
    try {
      const source = photoSource(selectedPhoto);
      const response = await fetch("/api/atlas-inbox-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: {
          id: selectedPhoto.id,
          title: `${asset.name} - ${selectedPhoto.name || "asset photo"}`,
          intakeType: "Asset Photo",
          notes: `Inspect this photo of ${asset.name}. Read visible labels, model and serial numbers, meters, condition, damage, and maintenance concerns.`,
          files: [{ name: selectedPhoto.name || "asset-photo.jpg", type: "image/jpeg", dataUrl: source, url: "" }],
        } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Photo analysis failed.");
      setAnalysis((payload.analysis || {}) as Analysis);
      setMessage("Analysis complete. Review the findings before approving anything.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAssetDetails() {
    if (!analysis || saving || !patchEntries.length) return;
    setSaving(true);
    try {
      await onSaveAsset(patch, analysis.summary || "Photo analyzed by Atlas.");
      setMessage("Asset details approved and saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Asset details could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!usablePhotos.length) return null;

  return (
    <section style={{ border: `1px solid ${colors.line}`, borderRadius: 10, background: colors.panel, padding: 10, display: "grid", gap: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div><div style={{ color: colors.gold, fontSize: 10, fontWeight: 950, letterSpacing: "0.1em", textTransform: "uppercase" }}>Photo Intelligence</div><strong style={{ color: colors.navy, fontSize: 12 }}>Read labels, condition, and maintenance concerns</strong></div>
        <button type="button" disabled={loading} onClick={() => void analyze()} style={{ border: 0, borderRadius: 8, background: colors.gold, color: colors.navy, padding: "8px 10px", fontWeight: 900, cursor: loading ? "wait" : "pointer" }}>{loading ? "Analyzing..." : analysis ? "Analyze Again" : "Analyze Photo"}</button>
      </div>
      {usablePhotos.length > 1 ? <select value={selectedPhoto?.id || ""} onChange={(event) => { setPhotoId(event.currentTarget.value); setAnalysis(null); setMessage("Photo selected. Click Analyze Photo when ready."); }} style={{ width: "100%", border: `1px solid ${colors.line}`, borderRadius: 8, background: colors.card, padding: 8, color: colors.navy }}>{usablePhotos.map((photo) => <option key={photo.id} value={photo.id}>{photo.name || "Asset photo"}</option>)}</select> : null}
      <div role="status" style={{ color: message.includes("saved") ? "#176B33" : colors.muted, fontSize: 11, fontWeight: message.includes("saved") ? 900 : 500 }}>{message}</div>
      {analysis?.summary ? <div style={{ color: colors.navy, fontSize: 12, lineHeight: 1.5 }}><strong>Finding:</strong> {analysis.summary}</div> : null}
      {analysis ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[["Manufacturer", analysis.manufacturer], ["Model", analysis.model], ["Serial", analysis.serial], ["Confidence", analysis.confidence]].filter((entry) => entry[1]).map(([label, value]) => <span key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 7, background: colors.card, padding: "6px 8px", color: colors.navy, fontSize: 10 }}><strong>{label}:</strong> {value}</span>)}</div> : null}
      {analysis?.warnings?.length ? <div style={{ border: "1px solid #E6B8AD", borderRadius: 8, background: "#FFF6F3", padding: 8, color: "#8C2F1B", fontSize: 11 }}><strong>Review:</strong> {analysis.warnings.join(" ")}</div> : null}
      {analysis ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {patchEntries.length ? <button type="button" disabled={saving} onClick={() => void saveAssetDetails()} style={{ border: `1px solid ${colors.line}`, borderRadius: 8, background: colors.card, color: colors.navy, padding: "7px 9px", fontWeight: 900, cursor: saving ? "wait" : "pointer" }}>{saving ? "Saving..." : "Approve Asset Details"}</button> : null}
        {needsWork ? <button type="button" onClick={() => onDraftWorkOrder({ title: `Inspect ${asset.name}`, notes: `Photo Intelligence review:\n${analysis.summary || "Review the analyzed asset photo."}${analysis.warnings?.length ? `\nWarnings: ${analysis.warnings.join(" ")}` : ""}`, priority: /unsafe|leak|broken|fault/i.test(concernText) ? "High" : "Medium" })} style={{ border: `1px solid ${colors.line}`, borderRadius: 8, background: colors.card, color: colors.navy, padding: "7px 9px", fontWeight: 900, cursor: "pointer" }}>Review Draft Work Order</button> : null}
      </div> : null}
    </section>
  );
}

