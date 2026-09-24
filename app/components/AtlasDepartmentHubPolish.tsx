"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type RecordRow = Record<string, any>;

type DepartmentConfig = {
  label: string;
  aliases: string[];
  terms: RegExp;
  workFilterTerms: string[];
};

const DEPARTMENTS: DepartmentConfig[] = [
  {
    label: "Pool & Spa",
    aliases: ["pool spa", "pool & spa", "pool and spa"],
    terms: /\b(pool|spa|hot tub|sundance|desert aire|pool room|pool pump|pool filter|oxysheen|pool juice)\b/i,
    workFilterTerms: ["Pool & Spa", "Pool", "Spa"],
  },
  {
    label: "Garage",
    aliases: ["garage", "garage vehicles", "garage / vehicles", "vehicles"],
    terms: /\b(garage|vehicle|car|truck|raptor|ford|mercedes|porsche|rivian|lucid|kia|charger)\b/i,
    workFilterTerms: ["Garage", "Vehicles"],
  },
  {
    label: "Dock & Marine",
    aliases: ["dock marine", "dock & marine", "dock and marine", "dock waterfront", "dock & waterfront"],
    terms: /\b(dock|marine|boat|cobalt|sea doo|seadoo|watercraft|pwc|boat lift|dock lift|sunstream|trampoline)\b/i,
    workFilterTerms: ["Dock & Marine", "Marine", "Dock"],
  },
  {
    label: "Landscaping",
    aliases: ["landscape", "landscaping", "landscaping irrigation", "landscaping & irrigation", "landscaping and irrigation"],
    terms: /\b(landscap|irrigat|grounds|lawn|garden|weeding|hydrawise|hunter|fertiliz|plant|tree|shrub)\b/i,
    workFilterTerms: ["Landscaping", "Irrigation"],
  },
];

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9&/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function currentPropertyId() {
  return document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]')?.value || "2000";
}

function visibleDepartmentPage() {
  for (const heading of Array.from(document.querySelectorAll<HTMLElement>("main h1"))) {
    if (heading.closest("[data-atlas-department-hub-host]")) continue;
    // The hub hides the original main children after mounting. Keep recognizing
    // its heading while that main is active, or the observer will repeatedly
    // remove and recreate the hub on every frame.
    if (heading.offsetParent === null && !heading.closest("main.atlas-department-hub-active")) continue;
    const text = normalized(heading.textContent);
    const config = DEPARTMENTS.find((item) => item.aliases.includes(text));
    if (config) return { main: heading.closest("main") as HTMLElement, config };
  }
  return null;
}

function textOf(record: RecordRow) {
  return [
    record.department,
    record.category,
    record.workCategory,
    record.work_category,
    record.responsibilityArea,
    record.responsibility_area,
    record.subcategory,
    record.name,
    record.title,
    record.notes,
    record.type,
  ].filter(Boolean).join(" ");
}

function belongs(record: RecordRow, config: DepartmentConfig) {
  const explicit = normalized(record.department);
  if (explicit) {
    if (config.label === "Garage" && /garage|vehicle/.test(explicit)) return true;
    if (config.label === "Pool & Spa" && /pool|spa/.test(explicit)) return true;
    if (config.label === "Dock & Marine" && /dock|marine/.test(explicit)) return true;
    if (config.label === "Landscaping" && /landscap|irrigat/.test(explicit)) return true;
  }
  return config.terms.test(textOf(record));
}

function closed(record: RecordRow) {
  return ["completed", "closed", "cancelled", "canceled", "not needed", "skipped"].includes(normalized(record.status));
}

function displayDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const date = new Date(text.length <= 10 ? `${text}T12:00:00` : text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function clickNav(label: string) {
  const wanted = normalized(label);
  const button = Array.from(document.querySelectorAll<HTMLElement>("aside button, aside a, nav button, nav a, button, a")).find(
    (node) => node.offsetParent !== null && normalized(node.textContent) === wanted,
  );
  button?.click();
}

function applyWorkDepartmentFilter(config: DepartmentConfig) {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("main select"));
  for (const select of selects) {
    const option = Array.from(select.options).find((item) =>
      config.workFilterTerms.some((term) => normalized(item.textContent).includes(normalized(term))),
    );
    if (!option) continue;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
}

function openWork(config: DepartmentConfig, workTitle = "") {
  try { sessionStorage.setItem("atlas:work-department-filter", config.label); } catch {}
  clickNav("Work");
  window.setTimeout(() => {
    applyWorkDepartmentFilter(config);
    if (!workTitle) return;
    const wanted = normalized(workTitle);
    const row = Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).find((button) =>
      normalized(button.textContent).includes(wanted),
    );
    row?.click();
    window.setTimeout(() => {
      const edit = Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).find((button) => {
        const text = normalized(button.textContent);
        return text === "edit work order" || text === "edit work";
      });
      edit?.click();
    }, 160);
  }, 220);
}

function openNamed(section: "Assets" | "Vendors", name: string) {
  clickNav(section);
  window.setTimeout(() => {
    const wanted = normalized(name);
    const row = Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).find((button) =>
      normalized(button.textContent).includes(wanted),
    );
    row?.click();
  }, 180);
}

export default function AtlasDepartmentHubPolish() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [config, setConfig] = useState<DepartmentConfig | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [assets, setAssets] = useState<RecordRow[]>([]);
  const [vendors, setVendors] = useState<RecordRow[]>([]);
  const [work, setWork] = useState<RecordRow[]>([]);

  useEffect(() => {
    let frame = 0;
    let activeMain: HTMLElement | null = null;
    const apply = () => {
      frame = 0;
      const found = visibleDepartmentPage();
      if (!found) {
        if (activeMain) activeMain.classList.remove("atlas-department-hub-active");
        activeMain?.querySelector<HTMLElement>("[data-atlas-department-hub-host]")?.remove();
        activeMain = null;
        setHost(null);
        setConfig(null);
        return;
      }
      if (activeMain && activeMain !== found.main) {
        activeMain.classList.remove("atlas-department-hub-active");
        activeMain.querySelector<HTMLElement>("[data-atlas-department-hub-host]")?.remove();
      }
      activeMain = found.main;
      activeMain.classList.add("atlas-department-hub-active");
      let nextHost = activeMain.querySelector<HTMLElement>("[data-atlas-department-hub-host]");
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasDepartmentHubHost = "true";
        activeMain.appendChild(nextHost);
      }
      setHost((current) => current === nextHost ? current : nextHost);
      setConfig(found.config);
      setPropertyId(currentPropertyId());
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
      if (activeMain) activeMain.classList.remove("atlas-department-hub-active");
      activeMain?.querySelector<HTMLElement>("[data-atlas-department-hub-host]")?.remove();
    };
  }, []);

  useEffect(() => {
    if (!host || !config) return;
    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (cancelled) return;
      setAssets(Array.isArray(payload?.assetRecords) ? payload.assetRecords : Array.isArray(payload?.assets) ? payload.assets : []);
      setVendors(Array.isArray(payload?.vendorRecords) ? payload.vendorRecords : Array.isArray(payload?.vendors) ? payload.vendors : []);
      setWork(Array.isArray(payload?.serviceRecords) ? payload.serviceRecords : Array.isArray(payload?.workOrders) ? payload.workOrders : []);
    };
    void load().catch(() => undefined);
    const refresh = () => void load().catch(() => undefined);
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [host, config, propertyId]);

  const departmentAssets = useMemo(() => config ? assets.filter((record) => belongs(record, config)) : [], [assets, config]);
  const assetIds = useMemo(() => new Set(departmentAssets.map((record) => String(record.id || "")).filter(Boolean)), [departmentAssets]);
  const departmentWork = useMemo(() => config ? work.filter((record) => belongs(record, config) || (record.assetId && assetIds.has(String(record.assetId)))) : [], [work, config, assetIds]);
  const openWorkRows = useMemo(() => departmentWork.filter((record) => !closed(record)), [departmentWork]);
  const historyRows = useMemo(() => departmentWork.filter(closed).sort((a, b) => String(b.lastCompletedDate || b.date || "").localeCompare(String(a.lastCompletedDate || a.date || ""))).slice(0, 25), [departmentWork]);
  const vendorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const asset of departmentAssets) for (const id of Array.isArray(asset.vendorIds) ? asset.vendorIds : []) ids.add(String(id));
    for (const item of departmentWork) if (item.vendorId) ids.add(String(item.vendorId));
    return ids;
  }, [departmentAssets, departmentWork]);
  const departmentVendors = useMemo(() => config ? vendors.filter((record) => vendorIds.has(String(record.id || "")) || belongs(record, config)) : [], [vendors, vendorIds, config]);

  if (!host || !config) return <DepartmentStyles />;

  const list = (rows: RecordRow[], kind: "work" | "asset" | "vendor" | "history") => rows.length ? (
    <div className="atlas-dept-list">
      {rows.map((row) => {
        const primary = String(row.title || row.name || "Untitled");
        const secondary = kind === "work" || kind === "history"
          ? [row.status, displayDate(row.lastCompletedDate || row.date)].filter(Boolean).join(" · ")
          : [row.category, row.make, row.model, row.phone].filter(Boolean).join(" · ");
        return (
          <button
            type="button"
            key={`${kind}-${String(row.id || primary)}`}
            onClick={() => {
              if (kind === "work" || kind === "history") openWork(config, primary);
              else if (kind === "asset") openNamed("Assets", primary);
              else openNamed("Vendors", primary);
            }}
          >
            <strong>{primary}</strong>
            <span>{secondary || (kind === "history" ? "Completed" : "")}</span>
          </button>
        );
      })}
    </div>
  ) : <div className="atlas-dept-empty">None in this department.</div>;

  return (
    <>
      <DepartmentStyles />
      {createPortal(
        <div className="atlas-dept-shell">
          <div className="atlas-dept-head">
            <div>
              <h1>{config.label}</h1>
              <p>Work orders, history, assets and vendors for this department.</p>
            </div>
            <button type="button" onClick={() => openWork(config)}>Open Filtered Work</button>
          </div>
          <div className="atlas-dept-grid">
            <section><h2>Open Work Orders <span>{openWorkRows.length}</span></h2>{list(openWorkRows, "work")}</section>
            <section><h2>History <span>{historyRows.length}</span></h2>{list(historyRows, "history")}</section>
            <section><h2>Assets <span>{departmentAssets.length}</span></h2>{list(departmentAssets, "asset")}</section>
            <section><h2>Vendors <span>{departmentVendors.length}</span></h2>{list(departmentVendors, "vendor")}</section>
          </div>
        </div>,
        host,
      )}
    </>
  );
}

function DepartmentStyles() {
  return <style jsx global>{`
    main.atlas-department-hub-active > *:not([data-atlas-department-hub-host]) { display: none !important; }
    [data-atlas-department-hub-host] { display: block !important; width: 100% !important; min-width: 0 !important; padding: 0 2px 20px !important; }
    .atlas-dept-shell { display: grid; gap: 13px; }
    .atlas-dept-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 2px 2px 10px; border-bottom: 1px solid #dfe6ed; }
    .atlas-dept-head h1 { margin: 0 !important; color: #0b2c43 !important; font-size: 22px !important; }
    .atlas-dept-head p { margin: 3px 0 0 !important; color: #6a7a8b !important; font-size: 11px !important; }
    .atlas-dept-head > button { min-height: 34px; border: 1px solid #0b2c43; border-radius: 8px; background: #0b2c43; color: #fff; padding: 6px 11px; font: inherit; font-size: 11px; font-weight: 850; cursor: pointer; }
    .atlas-dept-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .atlas-dept-grid section { min-width: 0; border: 1px solid #dfe6ed; border-radius: 12px; background: #fff; overflow: hidden; }
    .atlas-dept-grid h2 { margin: 0 !important; padding: 10px 12px; border-bottom: 1px solid #e9eef2; background: #f8fafc; color: #0b2c43 !important; font-size: 12px !important; font-weight: 900 !important; display: flex; justify-content: space-between; }
    .atlas-dept-grid h2 span { color: #6a7a8b; }
    .atlas-dept-list { display: grid; max-height: 360px; overflow-y: auto; }
    .atlas-dept-list button { display: grid; gap: 2px; width: 100%; padding: 9px 11px !important; border: 0 !important; border-bottom: 1px solid #edf1f4 !important; border-radius: 0 !important; background: #fff !important; color: #0b2c43 !important; text-align: left; cursor: pointer; }
    .atlas-dept-list button:last-child { border-bottom: 0 !important; }
    .atlas-dept-list strong { font-size: 12px !important; }
    .atlas-dept-list span { color: #6a7a8b; font-size: 10.5px !important; }
    .atlas-dept-empty { padding: 12px; color: #6a7a8b; font-size: 11px; }
    @media (max-width: 820px) { .atlas-dept-head { align-items: flex-start; flex-direction: column; } .atlas-dept-grid { grid-template-columns: 1fr; } }
  `}</style>;
}
