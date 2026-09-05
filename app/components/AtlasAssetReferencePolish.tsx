"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type AssetRecord = {
  id: string;
  name: string;
  locationId?: string;
  locationIds?: string[];
  category?: string;
  status?: string;
  make?: string;
  model?: string;
  year?: string;
  manufacturer?: string;
  serial?: string;
  serial2?: string;
  notes?: string;
};

type WorkRecord = {
  id: string;
  assetId?: string;
  title?: string;
  status?: string;
  date?: string;
  lastCompletedDate?: string;
  serviceHistory?: Array<{ id?: string; completedAt?: string }>;
};

type DocumentRecord = {
  id: string;
  title?: string;
  type?: string;
  linkedAssetId?: string;
  targetId?: string;
};

type PhotoRecord = {
  id: string;
  assetId?: string;
  name?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

type LocationRecord = { id: string; name: string };

type AtlasPayload = {
  ok?: boolean;
  assetRecords?: AssetRecord[];
  serviceRecords?: WorkRecord[];
  documents?: DocumentRecord[];
  photos?: PhotoRecord[];
  locations?: LocationRecord[];
};

type SecondarySection = "work" | "manuals" | "documents" | "notes" | "history" | null;

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
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function drawerTitle(drawer: HTMLElement | null) {
  if (!drawer) return "";
  return drawer.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
}

function firstStrongText(section: HTMLElement) {
  return normalized(section.querySelector<HTMLElement>("strong")?.textContent);
}

function findSection(drawer: HTMLElement, title: string) {
  const wanted = normalized(title);
  return (
    Array.from(drawer.querySelectorAll<HTMLElement>("section")).find(
      (section) => firstStrongText(section) === wanted,
    ) || null
  );
}

function setNativeTab(drawer: HTMLElement, tab: "overview" | "work") {
  const desktopButton = Array.from(drawer.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find((button) => {
    const text = normalized(button.textContent);
    return tab === "overview" ? text.startsWith("asset information") : text.startsWith("work / history");
  });
  if (desktopButton && desktopButton.getAttribute("aria-selected") !== "true") {
    desktopButton.click();
    return;
  }

  const select = drawer.querySelector<HTMLSelectElement>('select[aria-label="Asset information section"]');
  if (select && select.value !== tab) {
    select.value = tab;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function clearNativeClasses(drawer: HTMLElement) {
  for (const element of Array.from(
    drawer.querySelectorAll<HTMLElement>(
      ".atlas-native-asset-top, .atlas-native-asset-section, .atlas-native-photos-shell, .atlas-native-photo-child, .atlas-native-section-inner-title, .atlas-native-procedures",
    ),
  )) {
    element.classList.remove(
      "atlas-native-asset-top",
      "atlas-native-asset-section",
      "atlas-native-section-open",
      "atlas-native-photos-shell",
      "atlas-native-photos-manual-open",
      "atlas-native-photo-child",
      "atlas-native-section-inner-title",
      "atlas-native-procedures",
    );
  }
}

function markNativeAssetLayout(drawer: HTMLElement, openSection: SecondarySection) {
  clearNativeClasses(drawer);

  const infoSection = findSection(drawer, "Asset Information");
  if (infoSection?.parentElement) infoSection.parentElement.classList.add("atlas-native-asset-top");

  const tabList = drawer.querySelector<HTMLElement>('[role="tablist"]');
  tabList?.classList.add("atlas-native-asset-tabs-hidden");
  drawer
    .querySelector<HTMLElement>('select[aria-label="Asset information section"]')
    ?.classList.add("atlas-native-asset-tabs-hidden");

  const procedures = findSection(drawer, "Procedures");
  procedures?.classList.add("atlas-native-procedures");

  const photoShell = findSection(drawer, "Photos");
  const manuals = drawer.querySelector<HTMLElement>('section[aria-label="Asset manuals"]');
  const documents = drawer.querySelector<HTMLElement>('section[aria-label="Asset documents"]');
  const notes = findSection(drawer, "Notes");
  const work = findSection(drawer, "Open Work Orders");
  const history = findSection(drawer, "History");

  if (photoShell) {
    photoShell.classList.add("atlas-native-photos-shell");
    if (manuals && photoShell.contains(manuals)) {
      for (const child of Array.from(photoShell.children)) {
        if (child !== manuals) (child as HTMLElement).classList.add("atlas-native-photo-child");
      }
    }
  }

  const sections: Array<[SecondarySection, HTMLElement | null]> = [
    ["manuals", manuals],
    ["documents", documents],
    ["notes", notes],
    ["work", work],
    ["history", history],
  ];

  for (const [key, section] of sections) {
    if (!section) continue;
    section.classList.add("atlas-native-asset-section");
    if (key === openSection) section.classList.add("atlas-native-section-open");
    const title = section.querySelector<HTMLElement>("strong");
    title?.classList.add("atlas-native-section-inner-title");
  }

  if (openSection === "manuals" && photoShell) {
    photoShell.classList.add("atlas-native-photos-manual-open");
  }
}

function activateSection(drawer: HTMLElement, section: SecondarySection) {
  if (section === "work" || section === "history") {
    if (!findSection(drawer, section === "work" ? "Open Work Orders" : "History")) {
      setNativeTab(drawer, "work");
      return;
    }
  } else if (section === "manuals" || section === "documents" || section === "notes") {
    const exists =
      section === "manuals"
        ? drawer.querySelector('section[aria-label="Asset manuals"]')
        : section === "documents"
          ? drawer.querySelector('section[aria-label="Asset documents"]')
          : findSection(drawer, "Notes");
    if (!exists) {
      setNativeTab(drawer, "overview");
      return;
    }
  }
  markNativeAssetLayout(drawer, section);
}

function operationalLabel(status: string | undefined) {
  if (status === "Online") return "Operational";
  if (status === "Offline") return "Out of Service";
  if (status === "Seasonal") return "Seasonal";
  return status || "Not Assessed";
}

function statusClass(status: string | undefined) {
  if (status === "Online") return "is-good";
  if (status === "Offline") return "is-bad";
  return "is-neutral";
}

export default function AtlasAssetReferencePolish() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [propertyId, setPropertyId] = useState("2000");
  const [payload, setPayload] = useState<AtlasPayload | null>(null);
  const [openSection, setOpenSection] = useState<SecondarySection>("work");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await response.json().catch(() => ({}))) as AtlasPayload;
        if (!cancelled && response.ok && data?.ok !== false) setPayload(data);
      } catch {
        if (!cancelled) setPayload(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    let frame = 0;
    let lastTitle = "";

    const scan = () => {
      frame = 0;
      const root = assetsMain();
      if (!root) {
        setPortalTarget(null);
        return;
      }
      root.classList.add("atlas-asset-reference-root");

      const drawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
      if (!drawer) {
        setPortalTarget(null);
        return;
      }
      drawer.classList.add("atlas-asset-reference-drawer");

      const editing = Array.from(drawer.querySelectorAll<HTMLButtonElement>("button")).some(
        (button) => normalized(button.textContent) === "save changes",
      );
      drawer.classList.toggle("atlas-asset-reference-editing", editing);

      const title = drawerTitle(drawer);
      if (title && title !== lastTitle) {
        lastTitle = title;
        setSelectedName(title);
        setOpenSection("work");
      }

      const nextPropertyId = currentPropertyId();
      setPropertyId((current) => (current === nextPropertyId ? current : nextPropertyId));

      let host = drawer.querySelector<HTMLElement>("[data-atlas-asset-reference-host]");
      if (!host) {
        host = document.createElement("div");
        host.dataset.atlasAssetReferenceHost = "true";
        const first = drawer.firstElementChild;
        if (first?.nextSibling) drawer.insertBefore(host, first.nextSibling);
        else drawer.appendChild(host);
      }
      setPortalTarget((current) => (current === host ? current : host));

      const titleRow = drawer.firstElementChild as HTMLElement | null;
      if (titleRow) {
        titleRow.classList.add("atlas-asset-reference-native-title-row");
        const buttons = Array.from(titleRow.querySelectorAll<HTMLButtonElement>("button"));
        for (const button of buttons) {
          const text = normalized(button.textContent);
          if (!["edit asset", "save changes", "cancel", "delete asset"].includes(text)) {
            button.classList.add("atlas-asset-reference-native-action-hidden");
          }
        }
      }

      const addAsset = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => normalized(button.textContent) === "add asset",
      );
      const toolbar = addAsset?.parentElement;
      toolbar?.classList.add("atlas-asset-reference-toolbar");
      toolbar?.parentElement?.classList.add("atlas-asset-reference-toolbar-shell");

      const comfort = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => normalized(button.textContent) === "comfortable",
      );
      comfort?.parentElement?.classList.add("atlas-asset-reference-density-hidden");
      const selectButton = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => normalized(button.textContent) === "select",
      );
      selectButton?.classList.add("atlas-asset-reference-density-hidden");

      const midpoint = root.getBoundingClientRect().left + root.getBoundingClientRect().width * 0.45;
      for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
        const rect = button.getBoundingClientRect();
        if (rect.left >= midpoint) continue;
        const text = normalized(button.textContent);
        if (text === "edit" || text === "work order" || text === "☆" || text === "★") {
          button.classList.add("atlas-asset-reference-list-action-hidden");
          continue;
        }
        if (button.querySelector("strong") && button.querySelector("img")) {
          button.classList.add("atlas-asset-reference-list-row");
        }
      }

      if (!editing) activateSection(drawer, openSection);
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
  }, [openSection]);

  useEffect(() => {
    const root = assetsMain();
    const drawer = root?.querySelector<HTMLElement>(".atlas-asset-drawer");
    if (!drawer || drawer.classList.contains("atlas-asset-reference-editing")) return;
    activateSection(drawer, openSection);
  }, [openSection, selectedName]);

  const selectedAsset = useMemo(() => {
    const wanted = normalized(selectedName);
    return (payload?.assetRecords || []).find((asset) => normalized(asset.name) === wanted) || null;
  }, [payload, selectedName]);

  const location = useMemo(() => {
    if (!selectedAsset?.locationId) return "";
    return (payload?.locations || []).find((item) => item.id === selectedAsset.locationId)?.name || "";
  }, [payload, selectedAsset]);

  const linkedWork = useMemo(() => {
    if (!selectedAsset) return [];
    return (payload?.serviceRecords || []).filter((work) => work.assetId === selectedAsset.id);
  }, [payload, selectedAsset]);

  const openWork = useMemo(
    () => linkedWork.filter((work) => !["completed", "closed", "cancelled"].includes(normalized(work.status))),
    [linkedWork],
  );

  const historyCount = useMemo(
    () => linkedWork.reduce((count, work) => count + Math.max(1, work.serviceHistory?.length || 0), 0),
    [linkedWork],
  );

  const linkedDocuments = useMemo(() => {
    if (!selectedAsset) return [];
    return (payload?.documents || []).filter(
      (document) => document.linkedAssetId === selectedAsset.id || document.targetId === selectedAsset.id,
    );
  }, [payload, selectedAsset]);

  const manualCount = linkedDocuments.filter((document) =>
    /manual|service|installation|owner/i.test(`${document.type || ""} ${document.title || ""}`),
  ).length;

  const photoSource = useMemo(() => {
    if (!selectedAsset) return "";
    const photos = (payload?.photos || [])
      .filter((photo) => photo.assetId === selectedAsset.id)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    const cover = photos.find((photo) => /cover|main|primary|hero/i.test(photo.name || "")) || photos[0];
    return cover?.dataUrl || cover?.url || "";
  }, [payload, selectedAsset]);

  if (!portalTarget || !selectedAsset) {
    return <AssetReferenceStyles />;
  }

  const specs = [
    ["Make", selectedAsset.make],
    ["Model", selectedAsset.model],
    ["Year", selectedAsset.year],
    [/hot water storage|vitocell/i.test(selectedAsset.name) ? "Serial Number 1" : "Serial / VIN / HIN", selectedAsset.serial],
    ...(selectedAsset.serial2 ? [["Serial Number 2", selectedAsset.serial2]] : []),
    ["Manufacturer", selectedAsset.manufacturer],
    ["Category", selectedAsset.category],
    ["Location", location],
  ].filter(([, value]) => String(value || "").trim());

  const controls: Array<{ key: Exclude<SecondarySection, null>; label: string; count?: number }> = [
    { key: "work", label: "Open Work Orders", count: openWork.length },
    { key: "manuals", label: "Manuals", count: manualCount || undefined },
    { key: "documents", label: "Documents", count: linkedDocuments.length },
    { key: "notes", label: "Notes", count: selectedAsset.notes?.trim() ? 1 : 0 },
    { key: "history", label: "History", count: historyCount },
  ];

  return (
    <>
      <AssetReferenceStyles />
      {createPortal(
        <div className="atlas-asset-reference-card">
          <div className="atlas-asset-reference-hero">
            <div className="atlas-asset-reference-heading">
              <div className="atlas-asset-reference-title-line">
                <h2>{selectedAsset.name}</h2>
                <span className={`atlas-asset-reference-status ${statusClass(selectedAsset.status)}`}>
                  {operationalLabel(selectedAsset.status)}
                </span>
              </div>
              <div className="atlas-asset-reference-subtitle">
                {[selectedAsset.category, location].filter(Boolean).join(" · ")}
              </div>
            </div>
            {photoSource ? (
              <img className="atlas-asset-reference-photo" src={photoSource} alt={selectedAsset.name} />
            ) : null}
          </div>

          <section className="atlas-asset-reference-specs" aria-label="Asset information">
            <div className="atlas-asset-reference-section-title">Asset Information</div>
            <div className="atlas-asset-reference-spec-grid">
              {specs.map(([label, value]) => (
                <div className="atlas-asset-reference-spec" key={String(label)}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="atlas-asset-reference-accordions" aria-label="Asset related records">
            {controls.map((control) => {
              const expanded = openSection === control.key;
              return (
                <button
                  key={control.key}
                  type="button"
                  className={`atlas-asset-reference-accordion${expanded ? " is-open" : ""}`}
                  aria-expanded={expanded}
                  onClick={() => setOpenSection(expanded ? null : control.key)}
                >
                  <span>{control.label}{typeof control.count === "number" ? ` (${control.count})` : ""}</span>
                  <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                </button>
              );
            })}
          </div>
        </div>,
        portalTarget,
      )}
    </>
  );
}

function AssetReferenceStyles() {
  return (
    <style jsx global>{`
      .atlas-asset-reference-root {
        --atlas-asset-border: #dce5ed;
        --atlas-asset-soft: #f7f9fc;
      }

      .atlas-asset-reference-toolbar-shell {
        min-height: 0 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }

      .atlas-asset-reference-toolbar {
        min-height: 0 !important;
        gap: 8px !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .atlas-asset-reference-density-hidden,
      .atlas-asset-reference-list-action-hidden,
      .atlas-asset-reference-native-action-hidden,
      .atlas-native-asset-tabs-hidden,
      .atlas-native-asset-top,
      .atlas-native-procedures {
        display: none !important;
      }

      .atlas-asset-reference-list-row {
        padding-right: 12px !important;
      }

      .atlas-asset-reference-drawer {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
      }

      .atlas-asset-reference-drawer * {
        box-sizing: border-box;
      }

      .atlas-asset-reference-native-title-row > div:first-child {
        display: none !important;
      }

      .atlas-asset-reference-native-title-row {
        justify-content: flex-end !important;
        margin-bottom: 4px !important;
        min-height: 34px !important;
      }

      [data-atlas-asset-reference-host] {
        display: block;
        width: 100%;
        min-width: 0;
        margin: 0 0 10px;
      }

      .atlas-asset-reference-card {
        width: 100%;
        min-width: 0;
        display: grid;
        gap: 10px;
      }

      .atlas-asset-reference-hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(120px, 168px);
        gap: 14px;
        align-items: start;
        border: 1px solid var(--atlas-asset-border);
        border-radius: 12px;
        background: #fff;
        padding: 13px;
      }

      .atlas-asset-reference-heading {
        min-width: 0;
      }

      .atlas-asset-reference-title-line {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .atlas-asset-reference-title-line h2 {
        margin: 0 !important;
        color: #071b2f;
        font-size: 21px !important;
        line-height: 1.16 !important;
        letter-spacing: -0.02em !important;
      }

      .atlas-asset-reference-subtitle {
        margin-top: 5px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.35;
      }

      .atlas-asset-reference-status {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 650;
        white-space: nowrap;
      }

      .atlas-asset-reference-status.is-good {
        color: #087443;
        background: #eaf8ef;
        border: 1px solid #c4ead2;
      }

      .atlas-asset-reference-status.is-bad {
        color: #b42318;
        background: #feeeee;
        border: 1px solid #f6ceca;
      }

      .atlas-asset-reference-status.is-neutral {
        color: #5b6674;
        background: #f2f5f8;
        border: 1px solid #dce5ed;
      }

      .atlas-asset-reference-photo {
        display: block;
        width: 100%;
        max-height: 118px;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border-radius: 9px;
        border: 1px solid var(--atlas-asset-border);
        background: var(--atlas-asset-soft);
      }

      .atlas-asset-reference-specs {
        border: 1px solid var(--atlas-asset-border);
        border-radius: 12px;
        background: #fff;
        padding: 12px 13px;
        margin: 0 !important;
        box-shadow: none !important;
      }

      .atlas-asset-reference-section-title {
        color: #071b2f;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .atlas-asset-reference-spec-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: 22px;
        row-gap: 0;
      }

      .atlas-asset-reference-spec {
        display: grid;
        grid-template-columns: minmax(88px, 0.8fr) minmax(0, 1.4fr);
        gap: 10px;
        align-items: center;
        min-width: 0;
        min-height: 34px;
        border-top: 1px solid #edf1f5;
      }

      .atlas-asset-reference-spec:nth-child(-n + 2) {
        border-top: 0;
      }

      .atlas-asset-reference-spec span {
        color: #667386;
        font-size: 11px;
        font-weight: 600;
      }

      .atlas-asset-reference-spec strong {
        min-width: 0;
        color: #172331;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        line-height: 1.35 !important;
        overflow-wrap: anywhere;
      }

      .atlas-asset-reference-accordions {
        display: grid;
        gap: 6px;
      }

      .atlas-asset-reference-accordion {
        width: 100%;
        min-height: 38px !important;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 11px !important;
        border: 1px solid var(--atlas-asset-border) !important;
        border-radius: 9px !important;
        background: #fff !important;
        color: #172331 !important;
        box-shadow: none !important;
        font-size: 12.5px !important;
        font-weight: 650 !important;
        text-align: left;
        cursor: pointer;
      }

      .atlas-asset-reference-accordion.is-open {
        border-color: #d2ad57 !important;
        background: #fffaf0 !important;
      }

      .atlas-native-asset-section {
        display: none !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        margin: 6px 0 10px !important;
        border-radius: 10px !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      .atlas-native-asset-section.atlas-native-section-open {
        display: block !important;
      }

      .atlas-native-photos-shell {
        display: none !important;
        width: 100% !important;
        min-width: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      .atlas-native-photos-shell.atlas-native-photos-manual-open {
        display: block !important;
      }

      .atlas-native-photos-manual-open > .atlas-native-photo-child {
        display: none !important;
      }

      .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] {
        display: block !important;
        margin: 6px 0 10px !important;
      }

      .atlas-native-section-inner-title {
        display: none !important;
      }

      .atlas-native-section-open,
      .atlas-native-section-open * {
        min-width: 0 !important;
        max-width: 100%;
      }

      .atlas-native-section-open button,
      .atlas-native-section-open a {
        white-space: normal !important;
      }

      .atlas-native-section-open > div,
      .atlas-native-section-open > section {
        overflow-x: hidden !important;
      }

      .atlas-asset-reference-editing [data-atlas-asset-reference-host],
      .atlas-asset-reference-editing .atlas-native-asset-section,
      .atlas-asset-reference-editing .atlas-native-photos-shell {
        display: none !important;
      }

      .atlas-asset-reference-editing .atlas-native-asset-top,
      .atlas-asset-reference-editing .atlas-native-asset-tabs-hidden {
        display: grid !important;
      }

      .atlas-asset-reference-editing .atlas-asset-reference-native-title-row > div:first-child {
        display: block !important;
      }

      @media (max-width: 900px) {
        .atlas-asset-reference-hero {
          grid-template-columns: minmax(0, 1fr) 104px;
          gap: 10px;
          padding: 11px;
        }

        .atlas-asset-reference-photo {
          max-height: 86px;
        }

        .atlas-asset-reference-title-line h2 {
          font-size: 18px !important;
        }

        .atlas-asset-reference-spec-grid {
          grid-template-columns: 1fr;
        }

        .atlas-asset-reference-spec:nth-child(2) {
          border-top: 1px solid #edf1f5;
        }
      }
    `}</style>
  );
}
