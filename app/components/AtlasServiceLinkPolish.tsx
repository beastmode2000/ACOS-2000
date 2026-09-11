"use client";

import { useEffect } from "react";

type AssetRecord = {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  locationId?: string;
  make?: string;
  model?: string;
};

type WorkOrderRecord = {
  id?: string;
  title?: string;
  assetId?: string;
  status?: string;
  date?: string;
  recurring?: boolean;
  recurrenceUnit?: string;
};

type AtlasPayload = {
  ok?: boolean;
  assetRecords?: AssetRecord[];
  serviceRecords?: WorkOrderRecord[];
};

type PropertyUiData = {
  assets: AssetRecord[];
  workOrders: WorkOrderRecord[];
};

const KNOWN_PROPERTIES = new Set(["2000", "6855", "3661", "hangar"]);
const propertyCache = new Map<string, PropertyUiData>();
const propertyLoads = new Map<string, Promise<PropertyUiData | null>>();

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === normalized(title),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function currentPageTitle() {
  return normalized(
    Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(
      (node) => Boolean(normalized(node.textContent)),
    )?.textContent,
  );
}

function polishSidebar() {
  const pageTitle = currentPageTitle();
  const scopes = Array.from(document.querySelectorAll<HTMLElement>("aside, nav")).filter(
    (scope) => {
      const text = normalized(scope.textContent);
      return (
        text.includes("house maintenance") &&
        text.includes("garage") &&
        text.includes("pool spa") &&
        text.includes("landscaping irrigation")
      );
    },
  );

  for (const scope of scopes) {
    scope.classList.add("atlas-sidebar-polished");
    for (const item of Array.from(scope.querySelectorAll<HTMLElement>("button, a"))) {
      const label = normalized(item.textContent);
      if (!label) continue;
      item.classList.add("atlas-sidebar-item-polished");
      item.classList.toggle(
        "atlas-sidebar-item-current",
        Boolean(pageTitle && (label === pageTitle || label.startsWith(`${pageTitle} `))),
      );
    }
  }
}

function currentPropertyId() {
  const fromQuery = new URLSearchParams(window.location.search).get("propertyId");
  if (fromQuery && KNOWN_PROPERTIES.has(fromQuery.toLowerCase())) {
    return fromQuery.toLowerCase();
  }

  for (const select of Array.from(document.querySelectorAll<HTMLSelectElement>("select"))) {
    const value = String(select.value || "").trim().toLowerCase();
    if (!KNOWN_PROPERTIES.has(value)) continue;
    const options = Array.from(select.options).map((option) =>
      String(option.value || option.textContent || "").trim().toLowerCase(),
    );
    if (options.filter((item) => KNOWN_PROPERTIES.has(item)).length >= 2) {
      return value;
    }
  }

  return "";
}

async function loadPropertyData(propertyId: string) {
  if (!propertyId) return null;
  const cached = propertyCache.get(propertyId);
  if (cached) return cached;
  const existing = propertyLoads.get(propertyId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(
        `/api/atlas?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) return null;
      const payload = (await response.json().catch(() => ({}))) as AtlasPayload;
      if (!payload?.ok) return null;
      const data = {
        assets: Array.isArray(payload.assetRecords) ? payload.assetRecords : [],
        workOrders: Array.isArray(payload.serviceRecords) ? payload.serviceRecords : [],
      };
      propertyCache.set(propertyId, data);
      return data;
    } catch {
      return null;
    } finally {
      propertyLoads.delete(propertyId);
    }
  })();

  propertyLoads.set(propertyId, promise);
  return promise;
}

function statusLabel(value: unknown) {
  const status = normalized(value);
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  if (status === "seasonal") return "Seasonal";
  return "Monitor";
}

function statusClass(value: unknown) {
  return `atlas-asset-status-${normalized(statusLabel(value)) || "monitor"}`;
}

function isClosedWork(workOrder: WorkOrderRecord) {
  return ["completed", "closed", "cancelled", "canceled"].includes(
    normalized(workOrder.status),
  );
}

function isAnnualWork(workOrder: WorkOrderRecord) {
  const title = normalized(workOrder.title);
  const unit = normalized(workOrder.recurrenceUnit);
  return (
    title.includes("annual") ||
    title.includes("yearly") ||
    ["year", "years", "annual", "annually", "yearly"].includes(unit)
  );
}

function formatCompactDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function uniqueAssetByName(data: PropertyUiData | null, name: string) {
  if (!data) return null;
  const target = normalized(name);
  const matches = data.assets.filter((asset) => normalized(asset.name) === target);
  return matches.length === 1 ? matches[0] : null;
}

function selectedAssetFromDrawer(root: HTMLElement, data: PropertyUiData | null) {
  if (!data) return null;
  const drawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
  if (!drawer) return null;
  const headings = Array.from(drawer.querySelectorAll<HTMLElement>("h1, h2, h3, h4"));
  for (const heading of headings) {
    const asset = uniqueAssetByName(data, heading.textContent || "");
    if (asset) return asset;
  }
  return null;
}

function originalAssetStatus(card: HTMLElement) {
  const texts = Array.from(card.querySelectorAll<HTMLElement>("span"))
    .map((node) => normalized(node.textContent))
    .filter(Boolean);
  if (texts.includes("operational") || texts.includes("online")) return "Online";
  if (texts.includes("out of service") || texts.includes("offline")) return "Offline";
  if (texts.includes("seasonal")) return "Seasonal";
  return "Monitor";
}

function ensureAssetCardIndicators(card: HTMLElement, asset: AssetRecord | null, openCount: number) {
  let indicators = card.querySelector<HTMLElement>(".atlas-asset-card-indicators");
  if (!indicators) {
    indicators = document.createElement("div");
    indicators.className = "atlas-asset-card-indicators";
    card.appendChild(indicators);
  }
  const resolvedStatus = statusLabel(asset?.status || originalAssetStatus(card));
  let status = indicators.querySelector<HTMLElement>(".atlas-asset-card-status");
  if (!status) {
    status = document.createElement("span");
    indicators.appendChild(status);
  }
  status.className = `atlas-asset-card-status ${statusClass(resolvedStatus)}`;
  status.textContent = resolvedStatus;

  let open = indicators.querySelector<HTMLElement>(".atlas-asset-card-open-work");
  if (openCount > 0) {
    if (!open) {
      open = document.createElement("span");
      open.className = "atlas-asset-card-open-work";
      indicators.appendChild(open);
    }
    open.textContent = `${openCount} Open`;
  } else {
    open?.remove();
  }
}

function markAssetListSelection(data: PropertyUiData | null) {
  const root = pageMain("Assets");
  if (!root) return;
  const selectedAsset = selectedAssetFromDrawer(root, data);

  for (const card of Array.from(root.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"))) {
    const nameNode = card.querySelector<HTMLElement>("button strong");
    const asset = uniqueAssetByName(data, nameNode?.textContent || "");
    if (!nameNode || !asset?.id) continue;

    const current = Boolean(selectedAsset?.id && selectedAsset.id === asset.id);
    const checked = Boolean(card.querySelector<HTMLInputElement>('input[type="checkbox"]:checked'));
    const openCount = data?.workOrders.filter(
      (workOrder) => workOrder.assetId === asset.id && !isClosedWork(workOrder),
    ).length || 0;

    card.classList.add("atlas-asset-list-card-polished");
    card.classList.toggle("atlas-asset-list-card-current", current);
    card.classList.toggle("atlas-asset-list-card-bulk-selected", checked && !current);
    nameNode.classList.add("atlas-asset-list-name-polished");

    const identity = nameNode.parentElement;
    const meta = identity
      ? (Array.from(identity.children).find(
          (child) => child instanceof HTMLElement && child.tagName === "SPAN",
        ) as HTMLElement | undefined)
      : undefined;
    meta?.classList.add("atlas-asset-list-meta-polished");

    const badgeRow = identity
      ? (Array.from(identity.children).find(
          (child) => child instanceof HTMLElement && child.tagName === "DIV",
        ) as HTMLElement | undefined)
      : undefined;
    badgeRow?.classList.add("atlas-asset-list-native-badges");
    ensureAssetCardIndicators(card, asset, openCount);
  }
}

function markAssetDetailActions() {
  const root = pageMain("Assets");
  if (!root) return;
  const drawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
  if (!drawer) return;

  const editing = drawer.classList.contains("atlas-asset-reference-editing");
  const hero = drawer.querySelector<HTMLElement>(".atlas-asset-reference-hero");
  const heading = hero?.querySelector<HTMLElement>(".atlas-asset-reference-heading");
  if (!heading) return;

  const nativeButtons = Array.from(drawer.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => !button.classList.contains("atlas-asset-inline-action"),
  );
  const editButton = nativeButtons.find((button) => normalized(button.textContent) === "edit asset");
  const deleteButton = nativeButtons.find((button) => normalized(button.textContent) === "delete asset");

  let host = heading.querySelector<HTMLElement>(":scope > .atlas-asset-inline-actions");
  if (editing || (!editButton && !deleteButton)) {
    host?.remove();
    return;
  }

  if (!host) {
    host = document.createElement("div");
    host.className = "atlas-asset-inline-actions";
    heading.appendChild(host);
  }

  host.innerHTML = "";

  if (editButton) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "atlas-asset-inline-action atlas-asset-inline-edit";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editButton.click());
    host.appendChild(edit);
  }

  if (deleteButton) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "atlas-asset-inline-action atlas-asset-inline-delete";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteButton.click());
    host.appendChild(remove);
  }
}

function clickMatchingWorkOrder(root: HTMLElement, workOrder: WorkOrderRecord) {
  const target = normalized(workOrder.title);
  if (!target) return;
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => normalized(candidate.textContent).includes(target),
  )?.click();
}

function markAssetAnnualService(data: PropertyUiData | null) {
  const root = pageMain("Assets");
  if (!root || !data) return;
  const drawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
  if (!drawer) return;
  const selectedAsset = selectedAssetFromDrawer(root, data);
  if (!selectedAsset?.id) return;

  const annual = data.workOrders
    .filter(
      (workOrder) =>
        workOrder.assetId === selectedAsset.id &&
        !isClosedWork(workOrder) &&
        isAnnualWork(workOrder),
    )
    .sort((a, b) => String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31")))[0];

  const existing = drawer.querySelector<HTMLElement>(".atlas-asset-next-service-strip");
  if (!annual) {
    existing?.remove();
    return;
  }

  const host = drawer.querySelector<HTMLElement>("[data-atlas-asset-reference-host]") || drawer;
  let strip = existing;
  if (!strip) {
    strip = document.createElement("button");
    strip.className = "atlas-asset-next-service-strip";
    if (host === drawer) drawer.insertBefore(strip, drawer.children[1] || null);
    else host.insertBefore(strip, host.firstChild);
  }
  const due = formatCompactDate(annual.date);
  strip.textContent = due ? `${annual.title || "Annual Service"} · ${due}` : annual.title || "Annual Service";
  strip.onclick = () => clickMatchingWorkOrder(drawer, annual);
}

function findAssetSelect(panel: HTMLElement) {
  const selects = Array.from(panel.querySelectorAll<HTMLSelectElement>("select"));
  const byOption = selects.find((select) =>
    Array.from(select.options)
      .map((option) => normalized(option.textContent))
      .some((value) => ["no asset", "select asset", "choose asset", "asset"].includes(value)),
  );
  if (byOption) return byOption;
  for (const select of selects) {
    let node: HTMLElement | null = select.parentElement;
    for (let depth = 0; node && depth < 4; depth += 1) {
      if (
        Array.from(node.querySelectorAll<HTMLElement>("label, span, strong")).some(
          (label) => normalized(label.textContent) === "asset",
        )
      ) return select;
      node = node.parentElement;
    }
  }
  return null;
}

function annualSubject(title: string) {
  return normalized(title)
    .replace(/\bannual\b/g, " ")
    .replace(/\byearly\b/g, " ")
    .replace(/\bservice\b/g, " ")
    .replace(/\bmaintenance\b/g, " ")
    .replace(/\bpreventive\b/g, " ")
    .replace(/\bpreventative\b/g, " ")
    .replace(/\binspection\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function suggestedAssetOption(select: HTMLSelectElement, title: string) {
  if (select.value) return null;
  const titleText = normalized(title);
  if (!titleText.includes("annual") && !titleText.includes("yearly")) return null;
  const subject = annualSubject(title);
  if (!subject) return null;
  const matches = Array.from(select.options).filter((option) => {
    if (!option.value) return false;
    const label = normalized(option.textContent);
    return label === subject || label.startsWith(`${subject} `) || subject.startsWith(`${label} `);
  });
  return matches.length === 1 ? matches[0] : null;
}

function syncSelectValue(nativeSelect: HTMLSelectElement, value: string) {
  nativeSelect.value = value;
  nativeSelect.dispatchEvent(new Event("input", { bubbles: true }));
  nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
}

function markWorkAssetLink() {
  const root = pageMain("Work");
  if (!root) return;
  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  const nativeSelect = findAssetSelect(panel);
  if (!nativeSelect) return;

  const title = panel.querySelector<HTMLElement>("h2")?.textContent?.trim() || "Work Order";
  const summaryCard =
    panel.querySelector<HTMLElement>(".atlas-work-summary-card") ||
    panel.querySelector<HTMLElement>(".atlas-work-summary-header")?.parentElement ||
    panel;

  let host = summaryCard.querySelector<HTMLElement>(":scope > .atlas-work-asset-quick-link");
  if (!host) {
    host = document.createElement("div");
    host.className = "atlas-work-asset-quick-link";
    const label = document.createElement("span");
    label.className = "atlas-work-asset-quick-label";
    label.textContent = "Asset";
    const mirror = document.createElement("select");
    mirror.className = "atlas-work-asset-quick-select";
    mirror.setAttribute("aria-label", "Linked asset");
    mirror.addEventListener("change", () => syncSelectValue(nativeSelect, mirror.value));
    host.append(label, mirror);
    summaryCard.appendChild(host);
  }

  const mirror = host.querySelector<HTMLSelectElement>(".atlas-work-asset-quick-select");
  if (!mirror) return;
  const signature = Array.from(nativeSelect.options)
    .map((option) => `${option.value}:${option.textContent || ""}`)
    .join("|");
  if (mirror.dataset.optionsSignature !== signature) {
    mirror.innerHTML = "";
    for (const option of Array.from(nativeSelect.options)) {
      mirror.appendChild(option.cloneNode(true));
    }
    mirror.dataset.optionsSignature = signature;
  }
  mirror.value = nativeSelect.value;

  host.querySelector(".atlas-work-asset-suggestion")?.remove();
  const suggestion = suggestedAssetOption(nativeSelect, title);
  if (suggestion) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "atlas-work-asset-suggestion";
    button.textContent = `Suggested: ${suggestion.textContent || "asset"}`;
    button.addEventListener("click", () => {
      mirror.value = suggestion.value;
      syncSelectValue(nativeSelect, suggestion.value);
    });
    host.appendChild(button);
  }
}

function applyPolish(data: PropertyUiData | null) {
  polishSidebar();
  markAssetListSelection(data);
  markAssetDetailActions();
  markAssetAnnualService(data);
  markWorkAssetLink();
}

export default function AtlasServiceLinkPolish() {
  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    let activeProperty = "";
    let activeData: PropertyUiData | null = null;

    const refreshData = async () => {
      const propertyId = currentPropertyId();
      if (!propertyId || propertyId === activeProperty) return;
      activeProperty = propertyId;
      activeData = null;
      const data = await loadPropertyData(propertyId);
      if (cancelled || activeProperty !== propertyId) return;
      activeData = data;
      schedule();
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyPolish(activeData);
        void refreshData();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    const handleDataChanged = () => {
      if (activeProperty) propertyCache.delete(activeProperty);
      activeProperty = "";
      activeData = null;
      schedule();
    };

    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("atlas:data-changed", handleDataChanged as EventListener);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("atlas:data-changed", handleDataChanged as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 901px) {
        .atlas-sidebar-polished {
          position: sticky !important;
          top: 0 !important;
          align-self: start !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain !important;
          box-sizing: border-box !important;
          scrollbar-gutter: stable !important;
        }
      }

      .atlas-sidebar-polished .atlas-sidebar-item-polished {
        background: transparent !important;
        border-color: transparent !important;
        box-shadow: none !important;
        color: #f4f7fb !important;
      }

      .atlas-sidebar-polished .atlas-sidebar-item-polished:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
      }

      .atlas-sidebar-polished .atlas-sidebar-item-current {
        background: #edf5ff !important;
        border-color: #c8ddf3 !important;
        color: #123d63 !important;
        box-shadow: none !important;
      }

      .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        .atlas-asset-reference-native-title-row {
        display: none !important;
      }

      .atlas-asset-inline-actions {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        margin-top: 8px !important;
        flex-wrap: wrap !important;
      }

      .atlas-asset-inline-action {
        min-height: 32px !important;
        border-radius: 8px !important;
        padding: 5px 11px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        background: #ffffff !important;
      }

      .atlas-asset-inline-edit {
        border: 1px solid #b9c9d9 !important;
        color: #17334f !important;
      }

      .atlas-asset-inline-delete {
        border: 1px solid #edc6c6 !important;
        color: #a13b3b !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-card-polished {
        border: 1px solid #d8e1eb !important;
        background: #ffffff !important;
        box-shadow: none !important;
        transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease !important;
      }

      .atlas-assets-viewport-root
        .atlas-asset-list-card-polished
        > .atlas-gold-hover-card-accent {
        display: none !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-card-current {
        border-color: #175cd3 !important;
        background: #f4f8fd !important;
        box-shadow: inset 3px 0 0 #175cd3 !important;
      }

      .atlas-assets-viewport-root
        .atlas-asset-list-card-bulk-selected:not(.atlas-asset-list-card-current) {
        border-color: #d8e1eb !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-name-polished {
        color: #13283d !important;
        font-size: 13.5px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-meta-polished {
        color: #6b7d90 !important;
        font-size: 11.5px !important;
        line-height: 1.3 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-native-badges {
        display: none !important;
      }

      .atlas-assets-viewport-root .atlas-asset-card-indicators {
        position: absolute !important;
        right: 8px !important;
        bottom: 8px !important;
        z-index: 4 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 5px !important;
        pointer-events: none !important;
      }

      .atlas-assets-viewport-root .atlas-asset-card-status,
      .atlas-assets-viewport-root .atlas-asset-card-open-work {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 20px !important;
        border-radius: 999px !important;
        padding: 2px 7px !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      .atlas-assets-viewport-root .atlas-asset-card-status {
        border: 1px solid #d7e0e8 !important;
        background: #f7f9fb !important;
        color: #536779 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-status-online {
        border-color: #cae8d8 !important;
        background: #f2faf6 !important;
        color: #246b49 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-status-offline {
        border-color: #efcece !important;
        background: #fff5f5 !important;
        color: #a23838 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-status-seasonal {
        border-color: #e4dcc6 !important;
        background: #fbf8ef !important;
        color: #78622d !important;
      }

      .atlas-assets-viewport-root .atlas-asset-card-open-work {
        border: 1px solid #cfd9e4 !important;
        background: #ffffff !important;
        color: #175cd3 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-next-service-strip {
        width: 100% !important;
        min-height: 36px !important;
        margin: 0 0 8px !important;
        border: 1px solid #d8e1eb !important;
        border-radius: 9px !important;
        background: #f8fafc !important;
        color: #21384f !important;
        padding: 7px 10px !important;
        text-align: left !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
      }

      .atlas-assets-viewport-root [data-atlas-asset-reference-host],
      .atlas-assets-viewport-root .atlas-asset-reference-content {
        gap: 8px !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-card,
      .atlas-assets-viewport-root .atlas-asset-reference-content-panel {
        margin-top: 0 !important;
        margin-bottom: 8px !important;
      }

      .atlas-work-asset-quick-link {
        margin-top: 8px !important;
        padding: 8px 10px !important;
        border: 1px solid #d8e1eb !important;
        border-radius: 9px !important;
        background: #f8fafc !important;
        display: grid !important;
        grid-template-columns: auto minmax(180px, 1fr) auto !important;
        gap: 7px !important;
        align-items: center !important;
      }

      .atlas-work-asset-quick-label {
        color: #52677e !important;
        font-size: 12px !important;
        font-weight: 700 !important;
      }

      .atlas-work-asset-quick-select {
        width: 100% !important;
        min-width: 0 !important;
        height: 34px !important;
        border: 1px solid #cfd9e4 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        padding: 5px 8px !important;
        font-size: 13px !important;
        color: #17212b !important;
      }

      .atlas-work-asset-suggestion {
        min-height: 32px !important;
        border: 1px solid #175cd3 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        color: #175cd3 !important;
        padding: 5px 9px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
      }

      @media (max-width: 900px) {
        .atlas-asset-inline-actions {
          margin-top: 7px !important;
        }

        .atlas-asset-inline-action {
          min-height: 36px !important;
          padding: 6px 12px !important;
        }

        .atlas-assets-viewport-root .atlas-asset-card-indicators {
          right: 7px !important;
          bottom: 7px !important;
          gap: 4px !important;
        }

        .atlas-assets-viewport-root .atlas-asset-card-status,
        .atlas-assets-viewport-root .atlas-asset-card-open-work {
          font-size: 10px !important;
          padding: 2px 6px !important;
        }

        .atlas-work-asset-quick-link {
          grid-template-columns: 1fr !important;
          gap: 6px !important;
        }

        .atlas-work-asset-quick-select {
          min-height: 40px !important;
          height: 40px !important;
          font-size: 16px !important;
        }

        .atlas-work-asset-suggestion {
          width: 100% !important;
          min-height: 40px !important;
          white-space: normal !important;
        }
      }
    `}</style>
  );
}
