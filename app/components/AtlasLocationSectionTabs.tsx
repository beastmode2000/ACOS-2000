"use client";

import { useEffect } from "react";

type SectionKey = "assets" | "photos" | "documents" | "history";

const LABELS: Record<SectionKey, string> = {
  assets: "Assets",
  photos: "Photos",
  documents: "Documents",
  history: "Work & History",
};

function sectionKey(section: HTMLElement): SectionKey | "" {
  const value = String(section.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("assets assigned here") || value.includes("appliances & equipment")) return "assets";
  if (value.includes("location history") || value.includes("property history")) return "history";
  if (value.includes("documents") && (value.includes("attached") || value.includes("open"))) return "documents";
  if (value.includes("photos") && value.includes("attached")) return "photos";
  return "";
}

function cleanSpecAttachments(drawer: HTMLElement) {
  for (const host of Array.from(drawer.querySelectorAll<HTMLElement>(".atlas-spec-attachments"))) {
    if (host.dataset.locationCompactFiles === "true") continue;
    host.dataset.locationCompactFiles = "true";

    const controls = host.querySelector<HTMLElement>(".atlas-spec-controls");
    const files = host.querySelector<HTMLElement>(".atlas-spec-files");
    if (!controls || !files) continue;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "atlas-location-spec-files-toggle";
    toggle.textContent = "Reference files";
    toggle.setAttribute("aria-expanded", "false");

    const setOpen = (open: boolean) => {
      host.classList.toggle("atlas-location-spec-files-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Hide reference files" : "Reference files";
    };

    toggle.addEventListener("click", () => {
      setOpen(!host.classList.contains("atlas-location-spec-files-open"));
    });

    host.insertBefore(toggle, controls);
    setOpen(false);
  }
}

function applyDrawer(drawer: HTMLElement) {
  const heading = drawer.querySelector("h3");
  if (!heading) return;

  drawer.classList.add("atlas-location-tabbed-detail");
  cleanSpecAttachments(drawer);

  const sections = Array.from(drawer.querySelectorAll<HTMLElement>("section"));
  const grouped = new Map<SectionKey, HTMLElement[]>();

  for (const section of sections) {
    const key = sectionKey(section);
    if (!key) continue;
    const current = grouped.get(key) || [];
    current.push(section);
    grouped.set(key, current);
    section.dataset.atlasLocationSection = key;
  }

  if (grouped.size < 2) return;

  let tabs = drawer.querySelector<HTMLElement>(":scope > .atlas-location-section-tabs");
  if (!tabs) {
    tabs = document.createElement("div");
    tabs.className = "atlas-location-section-tabs";
    tabs.setAttribute("role", "tablist");

    const firstSecondary = sections.find((section) => Boolean(section.dataset.atlasLocationSection));
    if (firstSecondary) drawer.insertBefore(tabs, firstSecondary);
    else drawer.appendChild(tabs);
  }

  const existingKeys = new Set(
    Array.from(tabs.querySelectorAll<HTMLButtonElement>("button[data-location-tab]"))
      .map((button) => button.dataset.locationTab as SectionKey),
  );

  const orderedKeys: SectionKey[] = ["assets", "photos", "documents", "history"];
  const availableKeys = orderedKeys.filter((key) => grouped.has(key));

  for (const key of availableKeys) {
    if (existingKeys.has(key)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.locationTab = key;
    button.textContent = LABELS[key];
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => {
      drawer.dataset.locationActiveSection = key;
      updateVisibility(drawer, grouped, key);
    });
    tabs.appendChild(button);
  }

  for (const button of Array.from(tabs.querySelectorAll<HTMLButtonElement>("button[data-location-tab]"))) {
    const key = button.dataset.locationTab as SectionKey;
    if (!grouped.has(key)) button.remove();
  }

  const saved = drawer.dataset.locationActiveSection as SectionKey | undefined;
  const active = saved && grouped.has(saved) ? saved : availableKeys[0];
  if (active) {
    drawer.dataset.locationActiveSection = active;
    updateVisibility(drawer, grouped, active);
  }
}

function updateVisibility(
  drawer: HTMLElement,
  grouped: Map<SectionKey, HTMLElement[]>,
  active: SectionKey,
) {
  for (const [key, sections] of grouped.entries()) {
    for (const section of sections) {
      section.hidden = key !== active;
      section.classList.toggle("atlas-location-section-active", key === active);
    }
  }

  const tabs = drawer.querySelector<HTMLElement>(":scope > .atlas-location-section-tabs");
  for (const button of Array.from(tabs?.querySelectorAll<HTMLButtonElement>("button[data-location-tab]") || [])) {
    const selected = button.dataset.locationTab === active;
    button.classList.toggle("atlas-location-tab-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  }
}

export default function AtlasLocationSectionTabs() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      for (const drawer of Array.from(document.querySelectorAll<HTMLElement>('div[tabindex="0"]'))) {
        if (!drawer.querySelector("h3")) continue;
        applyDrawer(drawer);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !(mutation.target as HTMLElement).closest?.(".atlas-location-section-tabs"))) {
        schedule();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style>{`
      .atlas-location-tabbed-detail {
        gap: 8px !important;
      }

      .atlas-location-section-tabs {
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
        min-width: 0 !important;
        padding: 5px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 10px !important;
        background: #f6f8fb !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
      }

      .atlas-location-section-tabs::-webkit-scrollbar {
        display: none !important;
      }

      .atlas-location-section-tabs button {
        flex: 0 0 auto !important;
        min-height: 30px !important;
        padding: 5px 9px !important;
        border: 1px solid transparent !important;
        border-radius: 7px !important;
        background: transparent !important;
        color: #607086 !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
      }

      .atlas-location-section-tabs button:hover {
        color: #0b1e33 !important;
        background: #ffffff !important;
      }

      .atlas-location-section-tabs button.atlas-location-tab-active {
        border-color: #d9e2eb !important;
        background: #ffffff !important;
        color: #0b1e33 !important;
        box-shadow: 0 1px 3px rgba(15,42,67,.06) !important;
      }

      .atlas-location-tabbed-detail section[data-atlas-location-section] {
        margin-top: 0 !important;
      }

      .atlas-location-tabbed-detail section[data-atlas-location-section][hidden] {
        display: none !important;
      }

      .atlas-location-tabbed-detail section[data-atlas-location-section] {
        border: 1px solid #d9e2eb !important;
        border-radius: 10px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        padding: 11px !important;
      }

      .atlas-location-tabbed-detail .atlas-location-spec-card {
        grid-template-columns: minmax(125px,.24fr) minmax(0,1fr) !important;
        gap: 9px !important;
        padding: 8px 9px !important;
        border-radius: 8px !important;
        background: #ffffff !important;
      }

      .atlas-location-tabbed-detail .atlas-spec-attachments {
        padding-top: 5px !important;
        gap: 5px !important;
      }

      .atlas-location-spec-files-toggle {
        justify-self: start !important;
        min-height: 26px !important;
        padding: 4px 7px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 7px !important;
        background: #ffffff !important;
        color: #42566d !important;
        font: inherit !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .atlas-spec-attachments:not(.atlas-location-spec-files-open) > .atlas-spec-controls,
      .atlas-spec-attachments:not(.atlas-location-spec-files-open) > .atlas-spec-files {
        display: none !important;
      }

      .atlas-location-tabbed-detail .atlas-spec-files {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
      }

      @media (max-width: 900px) {
        .atlas-location-section-tabs {
          padding: 4px !important;
        }
        .atlas-location-section-tabs button {
          min-height: 32px !important;
          padding: 6px 8px !important;
        }
        .atlas-location-tabbed-detail .atlas-location-spec-card {
          grid-template-columns: minmax(0,1fr) !important;
        }
      }
    `}</style>
  );
}
