"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type AssetRecord = {
  id: string;
  name: string;
  category?: string;
  status?: string;
  vendorIds?: string[];
  make?: string;
  model?: string;
  serial?: string;
};

type VendorRecord = {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  email?: string;
};

type WorkRecord = {
  id: string;
  title?: string;
  assetId?: string;
  vendorId?: string;
  status?: string;
  date?: string;
  lastCompletedDate?: string;
};

type PartRecord = {
  id: string;
  name: string;
  assetId?: string;
  vendorId?: string;
  category?: string;
  quantity?: number;
  status?: string;
};

type AtlasPayload = {
  ok?: boolean;
  assetRecords?: AssetRecord[];
  assets?: AssetRecord[];
  vendorRecords?: VendorRecord[];
  vendors?: VendorRecord[];
  serviceRecords?: WorkRecord[];
  workOrders?: WorkRecord[];
  partRecords?: PartRecord[];
  parts?: PartRecord[];
};

const SYSTEMS = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Appliances",
  "Lighting",
  "Doors & Hardware",
  "Water Systems",
  "Security / Low Voltage",
  "Mechanical",
  "Interior / House",
  "General Maintenance",
] as const;

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const select = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((candidate) =>
    Array.from(candidate.options).some((option) => option.value === "2000"),
  );
  return String(select?.value || "2000");
}

function isHousePage() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find((node) => {
    const text = normalized(node.textContent);
    return text === "house maintenance" || text === "house and maintenance";
  });
  return heading?.closest("main") as HTMLElement | null;
}

function canonicalSystem(asset: AssetRecord) {
  const text = normalized(`${asset.category || ""} ${asset.name || ""}`);
  if (/hvac|boiler|furnace|air handler|heat pump|thermostat|dehumid|air condition|radiant|hydronic/.test(text)) return "HVAC";
  if (/plumb|toilet|faucet|sink|drain|sewer|water heater|recirc|domestic hot water/.test(text)) return "Plumbing";
  if (/electric|panel|breaker|generator|transfer switch|lighting control/.test(text)) return "Electrical";
  if (/appliance|refrigerator|freezer|dishwasher|range|oven|washer|dryer|microwave/.test(text)) return "Appliances";
  if (/light|fixture|bulb|lamp/.test(text)) return "Lighting";
  if (/door|lock|hinge|hardware|gate|garage door/.test(text)) return "Doors & Hardware";
  if (/water system|filter|softener|flo logic|flologic|leak detection|well|pump/.test(text)) return "Water Systems";
  if (/security|camera|ring|alarm|low voltage|network|wifi|audio|av |access control/.test(text)) return "Security / Low Voltage";
  if (/mechanical|pump|motor|control|valve/.test(text)) return "Mechanical";
  if (/house|interior|finish|cabinet|floor|paint|window/.test(text)) return "Interior / House";
  return "General Maintenance";
}

function isClearlyOtherDepartment(asset: AssetRecord) {
  const text = normalized(`${asset.category || ""} ${asset.name || ""}`);
  return /pool|spa|hot tub|landscap|irrigation|dock|marine|boat|seadoo|sea doo|vehicle|car|truck|garage vehicle/.test(text);
}

function closed(status: unknown) {
  return ["completed", "closed", "cancelled", "canceled"].includes(normalized(status));
}

function displayDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const date = new Date(text.length <= 10 ? `${text}T12:00:00` : text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function clickNavigation(label: string, targetText?: string) {
  const target = normalized(label);
  const navButton = Array.from(document.querySelectorAll<HTMLElement>("button, a")).find((node) => {
    if (node.closest("[data-atlas-house-maintenance-host]")) return false;
    return normalized(node.textContent) === target;
  });
  navButton?.click();

  if (!targetText) return;
  window.setTimeout(() => {
    const wanted = normalized(targetText);
    const candidate = Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).find((button) =>
      normalized(button.textContent).includes(wanted),
    );
    candidate?.click();
  }, 180);
}

export default function AtlasHouseMaintenancePolish() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [work, setWork] = useState<WorkRecord[]>([]);
  const [parts, setParts] = useState<PartRecord[]>([]);
  const [selectedSystem, setSelectedSystem] = useState("HVAC");
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  const load = async (nextPropertyId: string) => {
    const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(nextPropertyId)}&t=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
    });
    const payload = (await response.json().catch(() => ({}))) as AtlasPayload;
    if (!response.ok || payload?.ok === false) throw new Error("Atlas could not load House & Maintenance.");
    setAssets(Array.isArray(payload.assetRecords) ? payload.assetRecords : Array.isArray(payload.assets) ? payload.assets : []);
    setVendors(Array.isArray(payload.vendorRecords) ? payload.vendorRecords : Array.isArray(payload.vendors) ? payload.vendors : []);
    setWork(Array.isArray(payload.serviceRecords) ? payload.serviceRecords : Array.isArray(payload.workOrders) ? payload.workOrders : []);
    setParts(Array.isArray(payload.partRecords) ? payload.partRecords : Array.isArray(payload.parts) ? payload.parts : []);
  };

  useEffect(() => {
    let frame = 0;
    let activeMain: HTMLElement | null = null;

    const apply = () => {
      frame = 0;
      const main = isHousePage();
      if (!main) {
        if (activeMain) activeMain.classList.remove("atlas-house-maintenance-active");
        activeMain?.querySelector<HTMLElement>("[data-atlas-house-maintenance-host]")?.remove();
        activeMain = null;
        setHost(null);
        return;
      }

      if (activeMain && activeMain !== main) {
        activeMain.classList.remove("atlas-house-maintenance-active");
        activeMain.querySelector<HTMLElement>("[data-atlas-house-maintenance-host]")?.remove();
      }
      activeMain = main;
      main.classList.add("atlas-house-maintenance-active");

      let nextHost = main.querySelector<HTMLElement>("[data-atlas-house-maintenance-host]");
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasHouseMaintenanceHost = "true";
        main.appendChild(nextHost);
      }
      setHost((current) => (current === nextHost ? current : nextHost));

      const nextProperty = currentPropertyId();
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("change", schedule, true);
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", schedule, true);
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
      if (activeMain) activeMain.classList.remove("atlas-house-maintenance-active");
      activeMain?.querySelector<HTMLElement>("[data-atlas-house-maintenance-host]")?.remove();
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    setMessage("");
    setAssets([]);
    setVendors([]);
    setWork([]);
    setParts([]);
    void load(propertyId).catch((error) => setMessage(error instanceof Error ? error.message : "Atlas could not load House & Maintenance."));
  }, [host, propertyId]);

  useEffect(() => {
    const refresh = () => {
      if (host) void load(propertyId).catch(() => undefined);
    };
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => window.removeEventListener("atlas:data-changed", refresh as EventListener);
  }, [host, propertyId]);

  const houseAssets = useMemo(() => assets.filter((asset) => !isClearlyOtherDepartment(asset)), [assets]);
  const systemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const system of SYSTEMS) counts.set(system, 0);
    for (const asset of houseAssets) {
      const key = canonicalSystem(asset);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [houseAssets]);

  const visibleAssets = useMemo(
    () => (showAllAssets ? assets : houseAssets.filter((asset) => canonicalSystem(asset) === selectedSystem)),
    [assets, houseAssets, selectedSystem, showAllAssets],
  );

  const selectedAssetIds = useMemo(() => new Set(visibleAssets.map((asset) => asset.id)), [visibleAssets]);
  const relatedOpenWork = useMemo(
    () => work.filter((item) => item.assetId && selectedAssetIds.has(item.assetId) && !closed(item.status)),
    [work, selectedAssetIds],
  );
  const relatedHistory = useMemo(
    () => work.filter((item) => item.assetId && selectedAssetIds.has(item.assetId) && closed(item.status)),
    [work, selectedAssetIds],
  );
  const relatedParts = useMemo(
    () => parts.filter((part) => part.assetId && selectedAssetIds.has(part.assetId)),
    [parts, selectedAssetIds],
  );
  const relatedVendorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const asset of visibleAssets) for (const id of asset.vendorIds || []) if (id) ids.add(id);
    for (const item of [...relatedOpenWork, ...relatedHistory]) if (item.vendorId) ids.add(item.vendorId);
    for (const part of relatedParts) if (part.vendorId) ids.add(part.vendorId);
    return ids;
  }, [visibleAssets, relatedOpenWork, relatedHistory, relatedParts]);
  const relatedVendors = useMemo(() => vendors.filter((vendor) => relatedVendorIds.has(vendor.id)), [vendors, relatedVendorIds]);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...SYSTEMS, ...assets.map((asset) => String(asset.category || "").trim()).filter(Boolean)])).sort(),
    [assets],
  );

  const saveCategory = async (asset: AssetRecord) => {
    const category = String(categoryDrafts[asset.id] ?? asset.category ?? "").trim();
    if (!category || savingId) return;
    setSavingId(asset.id);
    setMessage("");
    try {
      const response = await fetch("/api/atlas-asset-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId, assetId: asset.id, category }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Atlas could not update that category.");
      setAssets((current) => current.map((item) => (item.id === asset.id ? { ...item, category } : item)));
      setCategoryDrafts((current) => {
        const next = { ...current };
        delete next[asset.id];
        return next;
      });
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
      setMessage(`${asset.name} moved to ${category}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update that category.");
    } finally {
      setSavingId("");
    }
  };

  const copyHandoff = async () => {
    const title = showAllAssets ? "House & Maintenance" : selectedSystem;
    const lines = [
      `${title} — Atlas`,
      "",
      "Equipment:",
      ...visibleAssets.map((asset) => `• ${asset.name}${asset.make || asset.model ? ` — ${[asset.make, asset.model].filter(Boolean).join(" ")}` : ""}${asset.serial ? ` — S/N ${asset.serial}` : ""}`),
      "",
      "Open work:",
      ...(relatedOpenWork.length ? relatedOpenWork.map((item) => `• ${item.title || "Work item"}${item.date ? ` — ${displayDate(item.date)}` : ""}`) : ["• None"]),
      "",
      "Vendors:",
      ...(relatedVendors.length ? relatedVendors.map((vendor) => `• ${vendor.name}${vendor.phone ? ` — ${vendor.phone}` : ""}${vendor.email ? ` — ${vendor.email}` : ""}`) : ["• Not assigned"]),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setMessage("System handoff copied. You can paste it into a text or email.");
    } catch {
      setMessage("Atlas could not copy the handoff on this device.");
    }
  };

  if (!host) return <HouseMaintenanceStyles />;

  return (
    <>
      <HouseMaintenanceStyles />
      {createPortal(
        <div className="atlas-house-shell">
          <div className="atlas-house-header">
            <div>
              <h1>House &amp; Maintenance</h1>
              <p>One view of equipment, work, vendors, parts and history.</p>
            </div>
            <div className="atlas-house-header-actions">
              <button type="button" onClick={() => setShowAllAssets((current) => !current)}>
                {showAllAssets ? "System View" : "Manage Categories"}
              </button>
              <button type="button" className="is-primary" onClick={() => void copyHandoff()}>
                Copy Handoff
              </button>
            </div>
          </div>

          <div className="atlas-house-layout">
            <aside className="atlas-house-system-list">
              <div className="atlas-house-system-title">Systems</div>
              {SYSTEMS.map((system) => (
                <button
                  key={system}
                  type="button"
                  className={!showAllAssets && selectedSystem === system ? "is-selected" : ""}
                  onClick={() => {
                    setShowAllAssets(false);
                    setSelectedSystem(system);
                  }}
                >
                  <span>{system}</span>
                  <strong>{systemCounts.get(system) || 0}</strong>
                </button>
              ))}
              <button type="button" className={showAllAssets ? "is-selected" : ""} onClick={() => setShowAllAssets(true)}>
                <span>All Property Assets</span>
                <strong>{assets.length}</strong>
              </button>
            </aside>

            <div className="atlas-house-detail">
              <div className="atlas-house-detail-head">
                <div>
                  <h2>{showAllAssets ? "Manage Categories" : selectedSystem}</h2>
                  <span>
                    {visibleAssets.length} equipment · {relatedOpenWork.length} open work · {relatedVendors.length} vendors
                  </span>
                </div>
              </div>

              <section className="atlas-house-section">
                <div className="atlas-house-section-title">Equipment</div>
                {visibleAssets.length ? (
                  <div className="atlas-house-equipment-list">
                    {visibleAssets.map((asset) => {
                      const draft = categoryDrafts[asset.id] ?? asset.category ?? "";
                      const changed = draft.trim() !== String(asset.category || "").trim();
                      return (
                        <div key={asset.id} className="atlas-house-equipment-row">
                          <button type="button" className="atlas-house-equipment-main" onClick={() => clickNavigation("Assets", asset.name)}>
                            <strong>{asset.name}</strong>
                            <span>{[asset.category, asset.make, asset.model].filter(Boolean).join(" · ") || "Asset"}</span>
                          </button>
                          <div className="atlas-house-category-edit">
                            <input
                              list="atlas-house-category-options"
                              value={draft}
                              onChange={(event) => setCategoryDrafts((current) => ({ ...current, [asset.id]: event.target.value }))}
                              aria-label={`Category for ${asset.name}`}
                            />
                            <button type="button" disabled={!changed || savingId === asset.id} onClick={() => void saveCategory(asset)}>
                              {savingId === asset.id ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <datalist id="atlas-house-category-options">
                      {categoryOptions.map((category) => <option key={category} value={category} />)}
                    </datalist>
                  </div>
                ) : (
                  <div className="atlas-house-empty">No equipment in this system yet.</div>
                )}
              </section>

              {!showAllAssets ? (
                <>
                  {relatedOpenWork.length ? (
                    <section className="atlas-house-section">
                      <div className="atlas-house-section-title">Open Work</div>
                      <div className="atlas-house-simple-list">
                        {relatedOpenWork.map((item) => (
                          <button key={item.id} type="button" onClick={() => clickNavigation("Work", item.title || "")}> 
                            <strong>{item.title || "Work item"}</strong>
                            <span>{[item.status, displayDate(item.date)].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {relatedVendors.length ? (
                    <section className="atlas-house-section">
                      <div className="atlas-house-section-title">Vendors</div>
                      <div className="atlas-house-simple-list">
                        {relatedVendors.map((vendor) => (
                          <button key={vendor.id} type="button" onClick={() => clickNavigation("Vendors", vendor.name)}>
                            <strong>{vendor.name}</strong>
                            <span>{[vendor.category, vendor.phone, vendor.email].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {relatedParts.length ? (
                    <section className="atlas-house-section">
                      <div className="atlas-house-section-title">Parts</div>
                      <div className="atlas-house-simple-list">
                        {relatedParts.map((part) => (
                          <button key={part.id} type="button" onClick={() => clickNavigation("Parts", part.name)}>
                            <strong>{part.name}</strong>
                            <span>{[part.category, part.status, typeof part.quantity === "number" ? `Qty ${part.quantity}` : ""].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {relatedHistory.length ? (
                    <section className="atlas-house-section">
                      <div className="atlas-house-section-title">History</div>
                      <div className="atlas-house-simple-list">
                        {relatedHistory.slice(0, 15).map((item) => (
                          <button key={item.id} type="button" onClick={() => clickNavigation("Work", item.title || "")}> 
                            <strong>{item.title || "Completed work"}</strong>
                            <span>{displayDate(item.lastCompletedDate || item.date) || item.status || "Completed"}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}

              {message ? <div className="atlas-house-message">{message}</div> : null}
            </div>
          </div>
        </div>,
        host,
      )}
    </>
  );
}

function HouseMaintenanceStyles() {
  return (
    <style jsx global>{`
      main.atlas-house-maintenance-active > *:not([data-atlas-house-maintenance-host]) {
        display: none !important;
      }

      [data-atlas-house-maintenance-host] {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        padding: 0 2px 20px !important;
      }

      .atlas-house-shell {
        display: grid;
        gap: 13px;
        min-width: 0;
      }

      .atlas-house-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 2px 2px 10px;
        border-bottom: 1px solid #dfe6ed;
      }

      .atlas-house-header h1,
      .atlas-house-detail-head h2 {
        margin: 0 !important;
        color: #0b2c43 !important;
      }

      .atlas-house-header h1 { font-size: 22px !important; }
      .atlas-house-detail-head h2 { font-size: 18px !important; }

      .atlas-house-header p,
      .atlas-house-detail-head span {
        margin: 3px 0 0 !important;
        color: #6a7a8b !important;
        font-size: 11px !important;
      }

      .atlas-house-header-actions {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
      }

      .atlas-house-header-actions button,
      .atlas-house-category-edit button {
        min-height: 34px !important;
        padding: 6px 10px !important;
        border: 1px solid #d4dee7 !important;
        border-radius: 8px !important;
        background: #fff !important;
        color: #0b2c43 !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .atlas-house-header-actions button.is-primary {
        background: #0b2c43 !important;
        border-color: #0b2c43 !important;
        color: #fff !important;
      }

      .atlas-house-layout {
        display: grid;
        grid-template-columns: minmax(220px, 290px) minmax(0, 1fr);
        gap: 13px;
        min-width: 0;
      }

      .atlas-house-system-list,
      .atlas-house-detail {
        min-width: 0;
        border: 1px solid #dfe6ed;
        border-radius: 13px;
        background: #fff;
        box-shadow: 0 7px 20px rgba(11, 44, 67, 0.05);
      }

      .atlas-house-system-list {
        overflow: hidden;
        align-self: start;
      }

      .atlas-house-system-title {
        padding: 11px 13px;
        color: #6a7a8b;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .atlas-house-system-list button {
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        padding: 11px 13px !important;
        border: 0 !important;
        border-top: 1px solid #edf1f4 !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #17384e !important;
        text-align: left;
        font: inherit !important;
        font-size: 12px !important;
        cursor: pointer;
      }

      .atlas-house-system-list button.is-selected {
        background: #eef6ff !important;
        box-shadow: inset 3px 0 0 #1f6fd1 !important;
        font-weight: 800 !important;
      }

      .atlas-house-system-list button strong {
        min-width: 26px;
        text-align: center;
        color: #66788a;
        font-size: 11px !important;
      }

      .atlas-house-detail {
        display: grid;
        gap: 10px;
        padding: 14px;
      }

      .atlas-house-detail-head {
        padding: 1px 1px 4px;
      }

      .atlas-house-section {
        border: 1px solid #e0e7ed;
        border-radius: 10px;
        overflow: hidden;
        background: #fff;
      }

      .atlas-house-section-title {
        padding: 9px 11px;
        border-bottom: 1px solid #e9eef2;
        color: #0b2c43;
        font-size: 12px;
        font-weight: 850;
        background: #f8fafc;
      }

      .atlas-house-equipment-list,
      .atlas-house-simple-list {
        display: grid;
      }

      .atlas-house-equipment-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(240px, 330px);
        gap: 10px;
        align-items: center;
        padding: 9px 10px;
        border-bottom: 1px solid #edf1f4;
      }

      .atlas-house-equipment-row:last-child,
      .atlas-house-simple-list > button:last-child {
        border-bottom: 0;
      }

      .atlas-house-equipment-main,
      .atlas-house-simple-list > button {
        min-width: 0;
        display: grid;
        gap: 2px;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        color: #0b2c43 !important;
        text-align: left;
        cursor: pointer;
      }

      .atlas-house-simple-list > button {
        padding: 9px 11px !important;
        border-bottom: 1px solid #edf1f4 !important;
      }

      .atlas-house-equipment-main strong,
      .atlas-house-simple-list strong {
        font-size: 12px !important;
      }

      .atlas-house-equipment-main span,
      .atlas-house-simple-list span {
        color: #6a7a8b;
        font-size: 10.5px !important;
        overflow-wrap: anywhere;
      }

      .atlas-house-category-edit {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 6px;
      }

      .atlas-house-category-edit input {
        width: 100%;
        min-width: 0;
        min-height: 34px;
        padding: 6px 8px;
        border: 1px solid #d8e1e9;
        border-radius: 8px;
        color: #17384e;
        font: inherit;
        font-size: 11px;
        box-sizing: border-box;
      }

      .atlas-house-category-edit button:disabled {
        opacity: .45;
        cursor: default !important;
      }

      .atlas-house-empty,
      .atlas-house-message {
        padding: 11px;
        color: #6a7a8b;
        font-size: 11px;
      }

      .atlas-house-message {
        border-radius: 8px;
        background: #f4f8fb;
      }

      @media (max-width: 900px) {
        .atlas-house-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .atlas-house-layout {
          grid-template-columns: 1fr;
        }

        .atlas-house-system-list {
          max-height: 270px;
          overflow-y: auto;
        }

        .atlas-house-equipment-row {
          grid-template-columns: 1fr;
        }

        .atlas-house-category-edit {
          grid-template-columns: minmax(0, 1fr) auto;
        }
      }
    `}</style>
  );
}
