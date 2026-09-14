"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AssetRecord = {
  id: string;
  name: string;
  category?: string;
};

type AtlasPayload = {
  ok?: boolean;
  assetRecords?: AssetRecord[];
};

type CustomDetail = {
  id: string;
  label: string;
  value: string;
};

type InfoField = {
  key: string;
  label: string;
  visible: boolean;
};

const DEFAULT_INFO_FIELDS: InfoField[] = [
  { key: "make", label: "Make", visible: true },
  { key: "model", label: "Model", visible: true },
  { key: "year", label: "Year", visible: true },
  { key: "serial", label: "Serial / VIN / HIN", visible: true },
  { key: "serial2", label: "Serial Number 2", visible: true },
  { key: "manufacturer", label: "Manufacturer", visible: true },
  { key: "category", label: "Category", visible: true },
  { key: "location", label: "Location", visible: true },
];

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function assetsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "assets",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>(
    'select[aria-label="Active property"]',
  );
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find(
    (select) => Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function uid() {
  return `asset-detail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function infoKeyFromLabel(label: string) {
  const value = normalized(label);
  if (value === "make") return "make";
  if (value === "model") return "model";
  if (value === "year") return "year";
  if (value === "manufacturer") return "manufacturer";
  if (value === "category") return "category";
  if (value === "location") return "location";
  if (value.includes("serial number 2") || value.includes("second serial")) return "serial2";
  if (value.includes("serial") || value.includes("vin") || value.includes("hin")) return "serial";
  return "";
}

function mergedInfoFields(saved: InfoField[]) {
  const byKey = new Map(saved.map((field) => [field.key, field]));
  return DEFAULT_INFO_FIELDS.map((field) => ({ ...field, ...(byKey.get(field.key) || {}) }));
}

export default function AtlasAssetAdditionalInfo() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [specTarget, setSpecTarget] = useState<HTMLElement | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [propertyId, setPropertyId] = useState("2000");
  const [payload, setPayload] = useState<AtlasPayload | null>(null);
  const [customDetails, setCustomDetails] = useState<CustomDetail[]>([]);
  const [infoFields, setInfoFields] = useState<InfoField[]>(DEFAULT_INFO_FIELDS);
  const [loadedKey, setLoadedKey] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const lastDrawerTitle = useRef("");

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;

    const loadAssets = async (attempt = 0) => {
      try {
        const response = await fetch(
          `/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        );
        const data = (await response.json().catch(() => ({}))) as AtlasPayload;
        if (cancelled) return;
        if (response.ok && data?.ok !== false) {
          setPayload(data);
          const wanted = normalized(selectedName);
          const missingSelectedAsset = Boolean(
            wanted && !(data.assetRecords || []).some((asset) => normalized(asset.name) === wanted),
          );
          if (missingSelectedAsset && attempt < 8) {
            retryTimer = window.setTimeout(() => void loadAssets(attempt + 1), 180);
          }
        }
      } catch {
        if (!cancelled) setPayload(null);
      }
    };

    const refresh = () => void loadAssets();
    void loadAssets();
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [propertyId, selectedName]);

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      frame = 0;
      const root = assetsMain();
      const drawer = root?.querySelector<HTMLElement>(".atlas-asset-drawer") || null;
      if (!drawer) {
        setPortalTarget(null);
        setSpecTarget(null);
        return;
      }

      const title = drawer.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
      if (title && title !== lastDrawerTitle.current) {
        lastDrawerTitle.current = title;
        setSelectedName(title);
        setEditing(false);
        setStatus("");
        setLoadedKey("");
      }

      const nextPropertyId = currentPropertyId();
      setPropertyId((current) => (current === nextPropertyId ? current : nextPropertyId));

      let host = drawer.querySelector<HTMLElement>("[data-atlas-asset-additional-info-host]");
      if (!host) {
        host = document.createElement("div");
        host.dataset.atlasAssetAdditionalInfoHost = "true";
        const referenceHost = drawer.querySelector<HTMLElement>("[data-atlas-asset-reference-host]");
        if (referenceHost?.nextSibling) drawer.insertBefore(host, referenceHost.nextSibling);
        else if (referenceHost) referenceHost.after(host);
        else drawer.appendChild(host);
      }
      setPortalTarget((current) => (current === host ? current : host));

      const specs = drawer.querySelector<HTMLElement>(".atlas-asset-reference-specs");
      if (!specs) {
        setSpecTarget(null);
        return;
      }
      let summaryHost = specs.querySelector<HTMLElement>("[data-atlas-asset-additional-summary]");
      if (!summaryHost) {
        summaryHost = document.createElement("div");
        summaryHost.dataset.atlasAssetAdditionalSummary = "true";
        specs.appendChild(summaryHost);
      }
      setSpecTarget((current) => (current === summaryHost ? current : summaryHost));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(scan);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const selectedAsset = useMemo(() => {
    const wanted = normalized(selectedName);
    return (payload?.assetRecords || []).find((asset) => normalized(asset.name) === wanted) || null;
  }, [payload, selectedName]);

  useEffect(() => {
    if (!selectedAsset?.id) return;
    const key = `${propertyId}:${selectedAsset.id}`;
    if (loadedKey === key) return;
    let cancelled = false;
    void fetch(
      `/api/atlas-asset-details?propertyId=${encodeURIComponent(propertyId)}&assetId=${encodeURIComponent(selectedAsset.id)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) throw new Error(data?.error || "Asset details could not load.");
        if (cancelled) return;
        const details = Array.isArray(data.details?.customDetails) ? data.details.customDetails : [];
        const legacyPlate = String(data.details?.licensePlate || "").trim();
        const hasPlateField = details.some((detail: CustomDetail) => normalized(detail.label) === "license plate");
        setCustomDetails(
          legacyPlate && !hasPlateField
            ? [{ id: "legacy-license-plate", label: "License Plate", value: legacyPlate }, ...details]
            : details,
        );
        setInfoFields(mergedInfoFields(Array.isArray(data.details?.infoFields) ? data.details.infoFields : []));
        setLoadedKey(key);
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Asset details could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, selectedAsset?.id, loadedKey]);

  useEffect(() => {
    const specs = specTarget?.closest(".atlas-asset-reference-specs");
    if (!specs) return;
    const config = new Map(infoFields.map((field) => [field.key, field]));
    for (const item of Array.from(specs.querySelectorAll<HTMLElement>(".atlas-asset-reference-spec"))) {
      const labelNode = item.querySelector<HTMLElement>("span");
      if (!labelNode) continue;
      let key = item.dataset.atlasInfoFieldKey || "";
      if (!key) {
        key = infoKeyFromLabel(labelNode.textContent || "");
        if (key) item.dataset.atlasInfoFieldKey = key;
      }
      if (!key) continue;
      const field = config.get(key);
      item.style.display = field?.visible === false ? "none" : "";
      if (field?.label) labelNode.textContent = field.label;
    }
  }, [specTarget, infoFields, selectedAsset?.id]);

  function addField() {
    setCustomDetails((current) => [...current, { id: uid(), label: "", value: "" }]);
    setEditing(true);
  }

  function updateField(id: string, patch: Partial<CustomDetail>) {
    setCustomDetails((current) =>
      current.map((detail) => (detail.id === id ? { ...detail, ...patch } : detail)),
    );
  }

  function removeField(id: string) {
    setCustomDetails((current) => current.filter((detail) => detail.id !== id));
    setEditing(true);
  }

  function updateInfoField(key: string, patch: Partial<InfoField>) {
    setInfoFields((current) =>
      current.map((field) => (field.key === key ? { ...field, ...patch } : field)),
    );
    setEditing(true);
  }

  async function save() {
    if (!selectedAsset?.id || saving) return;
    setSaving(true);
    setStatus("");
    try {
      const cleanedDetails = customDetails.filter((detail) => detail.label.trim() || detail.value.trim());
      const response = await fetch("/api/atlas-asset-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          assetId: selectedAsset.id,
          licensePlate: "",
          customDetails: cleanedDetails,
          infoFields,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Asset details could not save.");
      setCustomDetails(Array.isArray(data.details?.customDetails) ? data.details.customDetails : []);
      setInfoFields(mergedInfoFields(Array.isArray(data.details?.infoFields) ? data.details.infoFields : []));
      setEditing(false);
      setStatus("Saved.");
      window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { table: "asset-details", id: selectedAsset.id } }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Asset details could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedAsset) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #D9E2EA",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#1B2A36",
    padding: "8px 9px",
    fontSize: 12,
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #D9E2EA",
    background: "#FFFFFF",
    color: "#0A2841",
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  };

  const visibleDetails = customDetails.filter((detail) => detail.label.trim() || detail.value.trim());

  const summary = specTarget && visibleDetails.length
    ? createPortal(
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 8,
            padding: "0 12px 12px",
          }}
        >
          {visibleDetails.map((detail) => (
            <div key={`summary-${detail.id}`} style={{ border: "1px solid #E0E7EE", borderRadius: 8, padding: "8px 9px", background: "#FFFFFF" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7C8C", textTransform: "uppercase", letterSpacing: ".04em" }}>{detail.label || "Additional Info"}</div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: "#1B2A36" }}>{detail.value || "—"}</div>
            </div>
          ))}
        </div>,
        specTarget,
      )
    : null;

  const editor = portalTarget
    ? createPortal(
        <section
          style={{
            margin: "8px 0 10px",
            border: "1px solid #D9E2EA",
            borderRadius: 11,
            background: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              padding: "9px 12px",
              background: "#F7F9FB",
              borderBottom: editing ? "1px solid #D9E2EA" : 0,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#0A2841" }}>Info Card Fields</div>
              <div style={{ fontSize: 10, color: "#6B7C8C", marginTop: 2 }}>Choose what this asset shows. Add, rename, hide, or remove fields yourself.</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={buttonStyle} onClick={addField}>Add Field</button>
              <button type="button" style={buttonStyle} onClick={() => setEditing((value) => !value)}>{editing ? "Done" : "Customize"}</button>
            </div>
          </div>

          {editing ? (
            <div style={{ padding: 12, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 7 }}>
                <strong style={{ fontSize: 11, color: "#0A2841" }}>Standard fields</strong>
                {infoFields.map((field) => (
                  <div key={field.key} style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#526574" }}>
                      <input type="checkbox" checked={field.visible} onChange={(e) => updateInfoField(field.key, { visible: e.target.checked })} /> Show
                    </label>
                    <input value={field.label} onChange={(e) => updateInfoField(field.key, { label: e.target.value })} style={inputStyle} aria-label={`Label for ${field.key}`} />
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #E6ECF1", paddingTop: 10, display: "grid", gap: 8 }}>
                <strong style={{ fontSize: 11, color: "#0A2841" }}>Custom fields</strong>
                {customDetails.length === 0 ? <div style={{ fontSize: 10, color: "#6B7C8C" }}>No custom fields on this asset.</div> : null}
                {customDetails.map((detail) => (
                  <div key={detail.id} style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                    <input value={detail.label} onChange={(e) => updateField(detail.id, { label: e.target.value })} placeholder="Field name" style={inputStyle} />
                    <input value={detail.value} onChange={(e) => updateField(detail.id, { value: e.target.value })} placeholder="Value" style={inputStyle} />
                    <button type="button" onClick={() => removeField(detail.id)} style={{ ...buttonStyle, color: "#B42318" }}>Remove</button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  style={{
                    border: 0,
                    background: "#C99A3D",
                    color: "#0A2841",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save Info Card"}
                </button>
                {status ? <span style={{ fontSize: 10, color: status === "Saved." ? "#087443" : "#B42318" }}>{status}</span> : null}
              </div>
            </div>
          ) : status ? (
            <div style={{ padding: "0 12px 9px", fontSize: 10, color: status === "Saved." ? "#087443" : "#B42318" }}>{status}</div>
          ) : null}
        </section>,
        portalTarget,
      )
    : null;

  return <>{summary}{editor}</>;
}
