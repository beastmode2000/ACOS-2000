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

export default function AtlasAssetAdditionalInfo() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [propertyId, setPropertyId] = useState("2000");
  const [payload, setPayload] = useState<AtlasPayload | null>(null);
  const [licensePlate, setLicensePlate] = useState("");
  const [customDetails, setCustomDetails] = useState<CustomDetail[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const lastDrawerTitle = useRef("");

  useEffect(() => {
    let cancelled = false;
    const loadAssets = async () => {
      try {
        const response = await fetch(
          `/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        );
        const data = (await response.json().catch(() => ({}))) as AtlasPayload;
        if (!cancelled && response.ok && data?.ok !== false) setPayload(data);
      } catch {
        if (!cancelled) setPayload(null);
      }
    };
    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      frame = 0;
      const root = assetsMain();
      const drawer = root?.querySelector<HTMLElement>(".atlas-asset-drawer") || null;
      if (!drawer) {
        setPortalTarget(null);
        return;
      }

      const title = drawer.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
      if (title && title !== lastDrawerTitle.current) {
        lastDrawerTitle.current = title;
        setSelectedName(title);
        setEditing(false);
        setStatus("");
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
        setLicensePlate(String(data.details?.licensePlate || ""));
        setCustomDetails(Array.isArray(data.details?.customDetails) ? data.details.customDetails : []);
        setLoadedKey(key);
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Asset details could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, selectedAsset?.id, loadedKey]);

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

  async function save() {
    if (!selectedAsset?.id || saving) return;
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/atlas-asset-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          assetId: selectedAsset.id,
          licensePlate,
          customDetails,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Asset details could not save.");
      setLicensePlate(String(data.details?.licensePlate || ""));
      setCustomDetails(Array.isArray(data.details?.customDetails) ? data.details.customDetails : []);
      setEditing(false);
      setStatus("Saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Asset details could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!portalTarget || !selectedAsset) return null;

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

  return createPortal(
    <section
      style={{
        margin: "10px 0",
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
          padding: "10px 12px",
          background: "#F7F9FB",
          borderBottom: "1px solid #D9E2EA",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#0A2841" }}>Additional Asset Information</div>
          <div style={{ fontSize: 10, color: "#6B7C8C", marginTop: 2 }}>License plate plus any extra fields this asset needs.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={buttonStyle} onClick={addField}>Add Field</button>
          <button type="button" style={buttonStyle} onClick={() => setEditing((value) => !value)}>{editing ? "Done" : "Edit"}</button>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 9 }}>
        <div style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <strong style={{ fontSize: 11, color: "#6B7C8C" }}>License Plate</strong>
          {editing ? (
            <input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="Enter plate" style={inputStyle} />
          ) : (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A36" }}>{licensePlate || "—"}</div>
          )}
        </div>

        {customDetails.map((detail) => (
          <div key={detail.id} style={{ display: "grid", gridTemplateColumns: editing ? "130px minmax(0,1fr) auto" : "130px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
            {editing ? (
              <input value={detail.label} onChange={(e) => updateField(detail.id, { label: e.target.value })} placeholder="Field name" style={inputStyle} />
            ) : (
              <strong style={{ fontSize: 11, color: "#6B7C8C" }}>{detail.label || "Additional Info"}</strong>
            )}
            {editing ? (
              <input value={detail.value} onChange={(e) => updateField(detail.id, { value: e.target.value })} placeholder="Value" style={inputStyle} />
            ) : (
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2A36" }}>{detail.value || "—"}</div>
            )}
            {editing ? <button type="button" onClick={() => removeField(detail.id)} style={{ ...buttonStyle, color: "#B42318" }}>Remove</button> : null}
          </div>
        ))}

        {editing ? (
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
              {saving ? "Saving…" : "Save Asset Info"}
            </button>
            {status ? <span style={{ fontSize: 10, color: status === "Saved." ? "#087443" : "#B42318" }}>{status}</span> : null}
          </div>
        ) : status ? (
          <div style={{ fontSize: 10, color: status === "Saved." ? "#087443" : "#B42318" }}>{status}</div>
        ) : null}
      </div>
    </section>,
    portalTarget,
  );
}
