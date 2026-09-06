"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  [key: string]: unknown;
};

type ServiceHistoryEntry = {
  id?: string;
  completedAt?: string;
  notes?: string;
};

type WorkRecord = {
  id: string;
  assetId?: string;
  title?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  date?: string;
  lastCompletedDate?: string;
  notes?: string;
  serviceHistory?: ServiceHistoryEntry[];
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
  photos?: PhotoRecord[];
  locations?: LocationRecord[];
};

type DetailSection = "work" | "manuals" | "notes" | "history";

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

  const candidate = Array.from(
    document.querySelectorAll<HTMLSelectElement>("select"),
  ).find((select) =>
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

function nativeManualSection(drawer: HTMLElement) {
  return drawer.querySelector<HTMLElement>('section[aria-label="Asset manuals"]');
}

function setNativeTab(drawer: HTMLElement, tab: "overview" | "work") {
  const desktopButton = Array.from(
    drawer.querySelectorAll<HTMLButtonElement>('button[role="tab"]'),
  ).find((button) => {
    const text = normalized(button.textContent);
    return tab === "overview"
      ? text.startsWith("asset information")
      : text.startsWith("work / history");
  });

  if (desktopButton && desktopButton.getAttribute("aria-selected") !== "true") {
    desktopButton.click();
    return true;
  }

  const select = drawer.querySelector<HTMLSelectElement>(
    'select[aria-label="Asset information section"]',
  );
  if (select && select.value !== tab) {
    select.value = tab;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  return false;
}

function clearNativeLayoutClasses(drawer: HTMLElement) {
  for (const element of Array.from(
    drawer.querySelectorAll<HTMLElement>(
      ".atlas-native-hidden, .atlas-native-manual-shell, .atlas-native-manual-visible, .atlas-native-manual-sibling-hidden, .atlas-native-tabs-hidden",
    ),
  )) {
    element.classList.remove(
      "atlas-native-hidden",
      "atlas-native-manual-shell",
      "atlas-native-manual-visible",
      "atlas-native-manual-sibling-hidden",
      "atlas-native-tabs-hidden",
    );
  }
}

function hideNativeDetailContent(drawer: HTMLElement) {
  clearNativeLayoutClasses(drawer);

  drawer
    .querySelector<HTMLElement>('[role="tablist"]')
    ?.classList.add("atlas-native-tabs-hidden");
  drawer
    .querySelector<HTMLElement>('select[aria-label="Asset information section"]')
    ?.classList.add("atlas-native-tabs-hidden");

  const info = findSection(drawer, "Asset Information");
  if (info?.parentElement) info.parentElement.classList.add("atlas-native-hidden");

  for (const title of [
    "Photos",
    "Documents",
    "Notes",
    "Open Work Orders",
    "History",
    "Procedures",
  ]) {
    findSection(drawer, title)?.classList.add("atlas-native-hidden");
  }
}

function showManualsOnly(drawer: HTMLElement, attempt = 0) {
  setNativeTab(drawer, "overview");

  window.requestAnimationFrame(() => {
    const manual = nativeManualSection(drawer);
    const photoShell = findSection(drawer, "Photos");

    if (!manual || !photoShell) {
      if (attempt < 8) showManualsOnly(drawer, attempt + 1);
      return;
    }

    hideNativeDetailContent(drawer);
    photoShell.classList.remove("atlas-native-hidden");
    photoShell.classList.add("atlas-native-manual-shell");
    manual.classList.add("atlas-native-manual-visible");

    for (const child of Array.from(photoShell.children)) {
      if (child !== manual && child instanceof HTMLElement) {
        child.classList.add("atlas-native-manual-sibling-hidden");
      }
    }
  });
}

function nativeManualCount(drawer: HTMLElement | null) {
  if (!drawer) return 0;
  const section = nativeManualSection(drawer);
  if (!section) return 0;

  const explicitCount = Array.from(
    section.querySelectorAll<HTMLElement>("span"),
  ).find((span) => /^\d+$/.test(String(span.textContent || "").trim()));
  if (explicitCount) return Number(explicitCount.textContent || 0) || 0;

  return Array.from(section.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => normalized(button.textContent) === "open pdf",
  ).length;
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

function displayDate(value: string | undefined) {
  if (!value) return "No date";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AtlasAssetReferencePolish() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [propertyId, setPropertyId] = useState("2000");
  const [payload, setPayload] = useState<AtlasPayload | null>(null);
  const [openSection, setOpenSection] = useState<DetailSection>("work");
  const [manualCount, setManualCount] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const lastTitleRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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

    void load();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    let frame = 0;

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

      const editing = Array.from(
        drawer.querySelectorAll<HTMLButtonElement>("button"),
      ).some((button) => normalized(button.textContent) === "save changes");
      drawer.classList.toggle("atlas-asset-reference-editing", editing);

      const title = drawerTitle(drawer);
      if (title && title !== lastTitleRef.current) {
        lastTitleRef.current = title;
        setSelectedName(title);
        setOpenSection("work");
        setNoteStatus("");
      }

      const nextPropertyId = currentPropertyId();
      setPropertyId((current) =>
        current === nextPropertyId ? current : nextPropertyId,
      );

      let host = drawer.querySelector<HTMLElement>(
        "[data-atlas-asset-reference-host]",
      );
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
        for (const button of Array.from(
          titleRow.querySelectorAll<HTMLButtonElement>("button"),
        )) {
          const text = normalized(button.textContent);
          if (!["edit asset", "save changes", "cancel", "delete asset"].includes(text)) {
            button.classList.add("atlas-asset-reference-native-action-hidden");
          }
        }
      }

      const addAsset = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => normalized(button.textContent) === "add asset",
      );
      addAsset?.parentElement?.classList.add("atlas-asset-reference-toolbar");
      addAsset?.parentElement?.parentElement?.classList.add(
        "atlas-asset-reference-toolbar-shell",
      );

      const comfort = Array.from(
        root.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) => normalized(button.textContent) === "comfortable");
      comfort?.parentElement?.classList.add("atlas-asset-reference-density-hidden");

      Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => normalized(button.textContent) === "select")
        ?.classList.add("atlas-asset-reference-density-hidden");

      const midpoint =
        root.getBoundingClientRect().left + root.getBoundingClientRect().width * 0.45;
      for (const button of Array.from(
        root.querySelectorAll<HTMLButtonElement>("button"),
      )) {
        const rect = button.getBoundingClientRect();
        if (rect.left >= midpoint) continue;
        const text = normalized(button.textContent);
        if (["edit", "work order", "☆", "★"].includes(text)) {
          button.classList.add("atlas-asset-reference-list-action-hidden");
          continue;
        }
        if (button.querySelector("strong") && button.querySelector("img")) {
          button.classList.add("atlas-asset-reference-list-row");
        }
      }

      setManualCount((current) => {
        const next = nativeManualCount(drawer);
        return next === current ? current : next;
      });

      if (editing) {
        clearNativeLayoutClasses(drawer);
        return;
      }

      if (openSection === "manuals") showManualsOnly(drawer);
      else hideNativeDetailContent(drawer);
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

  const selectedAsset = useMemo(() => {
    const wanted = normalized(selectedName);
    return (
      (payload?.assetRecords || []).find(
        (asset) => normalized(asset.name) === wanted,
      ) || null
    );
  }, [payload, selectedName]);

  useEffect(() => {
    setNoteText(String(selectedAsset?.notes || ""));
    setNoteStatus("");
  }, [selectedAsset?.id, selectedAsset?.notes]);

  const location = useMemo(() => {
    if (!selectedAsset?.locationId) return "";
    return (
      (payload?.locations || []).find(
        (item) => item.id === selectedAsset.locationId,
      )?.name || ""
    );
  }, [payload, selectedAsset]);

  const linkedWork = useMemo(() => {
    if (!selectedAsset) return [];
    return (payload?.serviceRecords || [])
      .filter((work) => work.assetId === selectedAsset.id)
      .sort((a, b) =>
        String(b.lastCompletedDate || b.date || "").localeCompare(
          String(a.lastCompletedDate || a.date || ""),
        ),
      );
  }, [payload, selectedAsset]);

  const openWork = useMemo(
    () =>
      linkedWork.filter(
        (work) =>
          !["completed", "closed", "cancelled"].includes(normalized(work.status)),
      ),
    [linkedWork],
  );

  const historyRows = useMemo(
    () =>
      linkedWork
        .flatMap((work) => {
          const completed = (work.serviceHistory || []).map((entry, index) => ({
            id: `${work.id}-${entry.id || index}`,
            title: work.title || "Work order",
            status: "Completed",
            date: entry.completedAt?.slice(0, 10) || work.lastCompletedDate || work.date,
            notes: entry.notes || work.notes || "",
          }));
          if (completed.length) return completed;
          return [
            {
              id: work.id,
              title: work.title || "Work order",
              status: work.status || "Open",
              date: work.lastCompletedDate || work.date,
              notes: work.notes || "",
            },
          ];
        })
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [linkedWork],
  );

  const photoSource = useMemo(() => {
    if (!selectedAsset) return "";
    const assetPhotos = (payload?.photos || [])
      .filter((photo) => photo.assetId === selectedAsset.id)
      .sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
      );
    const cover =
      assetPhotos.find((photo) => /cover|main|primary|hero/i.test(photo.name || "")) ||
      assetPhotos[0];
    return cover?.dataUrl || cover?.url || "";
  }, [payload, selectedAsset]);

  const saveNotes = async () => {
    if (!selectedAsset || savingNote) return;
    setSavingNote(true);
    setNoteStatus("Saving...");
    try {
      const nextRecord = { ...selectedAsset, notes: noteText, propertyId };
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          table: "assets",
          propertyId,
          record: nextRecord,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Could not save notes.");
      }

      setPayload((current) =>
        current
          ? {
              ...current,
              assetRecords: (current.assetRecords || []).map((asset) =>
                asset.id === selectedAsset.id ? { ...asset, notes: noteText } : asset,
              ),
            }
          : current,
      );
      setNoteStatus("Saved");
      window.dispatchEvent(
        new CustomEvent("atlas:data-changed", {
          detail: { table: "assets", id: selectedAsset.id },
        }),
      );
    } catch (error) {
      setNoteStatus(error instanceof Error ? error.message : "Could not save notes.");
    } finally {
      setSavingNote(false);
    }
  };

  const createWorkOrder = () => {
    const drawer = assetsMain()?.querySelector<HTMLElement>(".atlas-asset-drawer");
    if (!drawer) return;
    const button = Array.from(drawer.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => normalized(candidate.textContent) === "create work order",
    );
    button?.click();
  };

  if (!portalTarget || !selectedAsset) return <AssetReferenceStyles />;

  const specs = [
    ["Make", selectedAsset.make],
    ["Model", selectedAsset.model],
    ["Year", selectedAsset.year],
    [
      /hot water storage|vitocell/i.test(selectedAsset.name)
        ? "Serial Number 1"
        : "Serial / VIN / HIN",
      selectedAsset.serial,
    ],
    ...(selectedAsset.serial2 ? [["Serial Number 2", selectedAsset.serial2]] : []),
    ["Manufacturer", selectedAsset.manufacturer],
    ["Category", selectedAsset.category],
    ["Location", location],
  ].filter(([, value]) => String(value || "").trim());

  const controls: Array<{
    key: DetailSection;
    label: string;
    count: number;
    icon: string;
  }> = [
    { key: "work", label: "Open Work Orders", count: openWork.length, icon: "▣" },
    { key: "manuals", label: "Manuals", count: manualCount, icon: "▤" },
    { key: "notes", label: "Notes", count: noteText.trim() ? 1 : 0, icon: "▧" },
    { key: "history", label: "History", count: historyRows.length, icon: "◷" },
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
                <span
                  className={`atlas-asset-reference-status ${statusClass(
                    selectedAsset.status,
                  )}`}
                >
                  {operationalLabel(selectedAsset.status)}
                </span>
              </div>
              <div className="atlas-asset-reference-subtitle">
                {[selectedAsset.category, location].filter(Boolean).join(" · ")}
              </div>
            </div>
            {photoSource ? (
              <img
                className="atlas-asset-reference-photo"
                src={photoSource}
                alt={selectedAsset.name}
              />
            ) : null}
          </div>

          <section
            className="atlas-asset-reference-specs"
            aria-label="Asset information"
          >
            <div className="atlas-asset-reference-section-title">Asset Information</div>
            <div className="atlas-asset-reference-spec-grid">
              {specs.map(([label, value]) => (
                <div className="atlas-asset-reference-spec" key={String(label)}>
                  <span>{label}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="atlas-asset-reference-tabs" aria-label="Asset related records">
            {controls.map((control) => (
              <button
                key={control.key}
                type="button"
                className={`atlas-asset-reference-tab${
                  openSection === control.key ? " is-active" : ""
                }`}
                aria-pressed={openSection === control.key}
                onClick={() => setOpenSection(control.key)}
              >
                <span className="atlas-asset-reference-tab-icon" aria-hidden="true">
                  {control.icon}
                </span>
                <span>{control.label}</span>
                <small>{control.count}</small>
              </button>
            ))}
          </div>

          {openSection === "work" ? (
            <section className="atlas-asset-reference-content-panel">
              <div className="atlas-asset-reference-content-header">
                <div>
                  <h3>Open Work Orders</h3>
                  <p>Open work linked to this asset.</p>
                </div>
                <button
                  type="button"
                  className="atlas-asset-reference-primary-button"
                  onClick={createWorkOrder}
                >
                  + Add Work Order
                </button>
              </div>
              {openWork.length ? (
                <div className="atlas-asset-reference-list">
                  {openWork.map((work) => (
                    <div className="atlas-asset-reference-row" key={work.id}>
                      <div className="atlas-asset-reference-row-main">
                        <strong>{work.title || "Untitled work order"}</strong>
                        <span>
                          {[work.assignedTo, work.priority].filter(Boolean).join(" · ") ||
                            "Linked work order"}
                        </span>
                      </div>
                      <span className="atlas-asset-reference-row-status">
                        {work.status || "Open"}
                      </span>
                      <span className="atlas-asset-reference-row-date">
                        {displayDate(work.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="atlas-asset-reference-empty">No open work orders.</div>
              )}
            </section>
          ) : null}

          {openSection === "notes" ? (
            <section className="atlas-asset-reference-content-panel">
              <div className="atlas-asset-reference-content-header">
                <div>
                  <h3>Notes</h3>
                  <p>Reference notes for this asset.</p>
                </div>
              </div>
              <textarea
                className="atlas-asset-reference-notes"
                value={noteText}
                onChange={(event) => {
                  setNoteText(event.target.value);
                  setNoteStatus("");
                }}
                placeholder="Add notes for this asset..."
                rows={6}
              />
              <div className="atlas-asset-reference-note-actions">
                <span>{noteStatus}</span>
                <button
                  type="button"
                  className="atlas-asset-reference-primary-button"
                  disabled={savingNote}
                  onClick={() => void saveNotes()}
                >
                  {savingNote ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </section>
          ) : null}

          {openSection === "history" ? (
            <section className="atlas-asset-reference-content-panel">
              <div className="atlas-asset-reference-content-header">
                <div>
                  <h3>History</h3>
                  <p>Work and service history for this asset.</p>
                </div>
              </div>
              {historyRows.length ? (
                <div className="atlas-asset-reference-list">
                  {historyRows.map((row) => (
                    <div className="atlas-asset-reference-row" key={row.id}>
                      <div className="atlas-asset-reference-row-main">
                        <strong>{row.title}</strong>
                        {row.notes ? <span>{row.notes}</span> : null}
                      </div>
                      <span className="atlas-asset-reference-row-status">
                        {row.status}
                      </span>
                      <span className="atlas-asset-reference-row-date">
                        {displayDate(row.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="atlas-asset-reference-empty">No history yet.</div>
              )}
            </section>
          ) : null}
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
        --atlas-asset-blue: #1f6fd1;
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
      .atlas-native-tabs-hidden,
      .atlas-native-hidden,
      .atlas-native-manual-sibling-hidden {
        display: none !important;
      }

      .atlas-asset-reference-list-row {
        padding-right: 12px !important;
      }

      .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing) {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        box-sizing: border-box !important;
        scrollbar-gutter: auto !important;
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

      .atlas-asset-reference-tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      .atlas-asset-reference-tab {
        min-width: 0;
        min-height: 72px !important;
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        align-items: center;
        column-gap: 8px;
        row-gap: 2px;
        padding: 10px 12px !important;
        border: 1px solid var(--atlas-asset-border) !important;
        border-radius: 10px !important;
        background: #fff !important;
        color: #172331 !important;
        box-shadow: none !important;
        cursor: pointer;
        text-align: left;
      }

      .atlas-asset-reference-tab.is-active {
        border-color: #9ec6f8 !important;
        background: #edf6ff !important;
        color: #0b5db7 !important;
      }

      .atlas-asset-reference-tab-icon {
        grid-column: 1 / -1;
        font-size: 20px;
        line-height: 1;
      }

      .atlas-asset-reference-tab > span:not(.atlas-asset-reference-tab-icon) {
        font-size: 12.5px;
        font-weight: 700;
        line-height: 1.2;
      }

      .atlas-asset-reference-tab small {
        font-size: 11px;
        font-weight: 700;
        color: #738197;
      }

      .atlas-asset-reference-content-panel,
      .atlas-native-manual-visible {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 16px !important;
        border: 1px solid var(--atlas-asset-border) !important;
        border-radius: 12px !important;
        background: #fff !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      .atlas-asset-reference-content-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .atlas-asset-reference-content-header h3 {
        margin: 0 !important;
        color: #071b2f;
        font-size: 17px !important;
        line-height: 1.25 !important;
      }

      .atlas-asset-reference-content-header p {
        margin: 3px 0 0 !important;
        color: #6a7789;
        font-size: 11.5px;
      }

      .atlas-asset-reference-primary-button {
        min-height: 34px !important;
        padding: 7px 11px !important;
        border: 1px solid #1f6fd1 !important;
        border-radius: 8px !important;
        background: #1f6fd1 !important;
        color: #fff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
        cursor: pointer;
      }

      .atlas-asset-reference-primary-button:disabled {
        opacity: 0.55;
        cursor: default;
      }

      .atlas-asset-reference-list {
        display: grid;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }

      .atlas-asset-reference-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(92px, auto);
        gap: 14px;
        align-items: center;
        min-width: 0;
        padding: 11px 12px;
        border-top: 1px solid #edf1f5;
      }

      .atlas-asset-reference-row:first-child {
        border-top: 0;
      }

      .atlas-asset-reference-row-main {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .atlas-asset-reference-row-main strong {
        color: #162438;
        font-size: 12.5px !important;
        line-height: 1.3 !important;
      }

      .atlas-asset-reference-row-main span,
      .atlas-asset-reference-row-date {
        color: #65748a;
        font-size: 11px;
        line-height: 1.3;
      }

      .atlas-asset-reference-row-status {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 4px 8px;
        border-radius: 999px;
        background: #f2f6fb;
        color: #31465f;
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;
      }

      .atlas-asset-reference-empty {
        padding: 16px;
        border: 1px dashed #d8e0e8;
        border-radius: 9px;
        color: #6b7788;
        font-size: 12px;
      }

      .atlas-asset-reference-notes {
        display: block;
        width: 100%;
        min-height: 130px;
        resize: vertical;
        padding: 11px 12px;
        border: 1px solid #d8e0e8;
        border-radius: 9px;
        background: #fff;
        color: #172331;
        font: inherit;
        font-size: 12.5px;
        line-height: 1.5;
        outline: none;
      }

      .atlas-asset-reference-notes:focus {
        border-color: #9ec6f8;
        box-shadow: 0 0 0 3px rgba(31, 111, 209, 0.08);
      }

      .atlas-asset-reference-note-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 10px;
        color: #65748a;
        font-size: 11px;
      }

      .atlas-native-manual-shell {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 0 10px !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      .atlas-native-manual-visible {
        display: block !important;
      }

      .atlas-native-manual-visible > div {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      .atlas-native-manual-visible strong {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
      }

      .atlas-native-manual-visible button,
      .atlas-native-manual-visible a {
        white-space: nowrap !important;
        position: static !important;
        transform: none !important;
      }

      .atlas-asset-reference-editing [data-atlas-asset-reference-host] {
        display: none !important;
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

        .atlas-asset-reference-tabs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .atlas-asset-reference-content-header {
          align-items: stretch;
          flex-direction: column;
        }

        .atlas-asset-reference-primary-button {
          align-self: flex-start;
        }

        .atlas-asset-reference-row {
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
        }

        .atlas-asset-reference-row-date {
          grid-column: 1 / -1;
        }
      }
    `}</style>
  );
}
