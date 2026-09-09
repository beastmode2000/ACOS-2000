"use client";

import { useEffect } from "react";

function text(node: Element | null) {
  return String(node?.textContent || "").trim();
}

function hasRealPhoto(node: HTMLElement | null) {
  if (!node) return false;
  const inline = node.style.backgroundImage;
  const computed = window.getComputedStyle(node).backgroundImage;
  return Boolean(
    (inline && inline !== "none") ||
      (computed && computed !== "none" && computed !== "initial"),
  );
}

function markLocationDrawer(drawer: HTMLElement) {
  const heading = drawer.querySelector<HTMLElement>("h3");
  if (!heading) return;

  drawer.classList.add("atlas-location-asset-language");

  const infoBlock = drawer.firstElementChild as HTMLElement | null;
  if (!infoBlock) return;
  infoBlock.classList.add("atlas-location-primary-information");

  const detailThumb = infoBlock.querySelector<HTMLElement>(".atlas-location-detail-thumb");
  if (detailThumb && !hasRealPhoto(detailThumb)) {
    detailThumb.classList.add("atlas-location-no-photo");
  } else {
    detailThumb?.classList.remove("atlas-location-no-photo");
  }

  let typeCard: HTMLElement | null = null;
  let parentCard: HTMLElement | null = null;
  let hierarchyCard: HTMLElement | null = null;

  for (const label of Array.from(infoBlock.querySelectorAll<HTMLElement>("span"))) {
    const value = text(label);
    const card = label.parentElement as HTMLElement | null;
    if (!card) continue;
    if (value === "Type") typeCard = card;
    if (value === "Parent") parentCard = card;
    if (value === "Hierarchy Path") hierarchyCard = card;
  }

  for (const card of [typeCard, parentCard]) {
    if (!card) continue;
    card.classList.remove("atlas-location-hidden-hierarchy-card");
    card.classList.add("atlas-location-core-info-field");
    card.parentElement?.classList.add("atlas-location-core-info-grid");
  }
  hierarchyCard?.classList.add("atlas-location-hierarchy-path-quiet");

  const coreGrid = typeCard?.parentElement || parentCard?.parentElement;
  if (coreGrid) {
    let label = infoBlock.querySelector<HTMLElement>(".atlas-location-information-label");
    if (!label) {
      label = document.createElement("div");
      label.className = "atlas-location-information-label";
      label.textContent = "Location Information";
      infoBlock.insertBefore(label, coreGrid);
    } else if (label.nextElementSibling !== coreGrid) {
      infoBlock.insertBefore(label, coreGrid);
    }
  }

  const summary = infoBlock.querySelector<HTMLElement>(".atlas-location-summary-clean");
  if (summary) summary.classList.add("atlas-location-summary-secondary");

  for (const section of Array.from(drawer.querySelectorAll<HTMLElement>("section"))) {
    const value = text(section);
    if (value.includes("Appliances & Equipment") || value.includes("Assets Assigned Here")) {
      section.classList.add("atlas-location-assets-standard-section");
    }
    if (value.includes("Photos") && value.includes("attached")) {
      section.classList.add("atlas-location-photos-optional-section");
    }
    if (value.includes("Location History") || value.includes("Property History")) {
      section.classList.add("atlas-location-history-standard-section");
    }
  }
}

function markLocationList(listPanel: HTMLElement) {
  listPanel.classList.add("atlas-location-list-asset-language");

  for (const card of Array.from(listPanel.querySelectorAll<HTMLElement>(".atlas-location-list-card-clean"))) {
    const main = card.querySelector<HTMLElement>(".atlas-location-list-card-main");
    const thumb = main?.querySelector<HTMLElement>(".atlas-location-list-thumb") || null;
    if (thumb && !hasRealPhoto(thumb)) {
      thumb.classList.add("atlas-location-no-photo");
      main?.classList.add("atlas-location-list-no-photo");
    } else {
      thumb?.classList.remove("atlas-location-no-photo");
      main?.classList.remove("atlas-location-list-no-photo");
    }

    for (const node of Array.from(card.querySelectorAll<HTMLElement>("small, span"))) {
      const value = text(node).toLowerCase();
      if (/^\d+\s+(asset|assets|work)$/.test(value)) {
        node.classList.add("atlas-location-list-counts-hidden");
      }
    }
  }
}

export default function AtlasLocationsAssetStyle() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const drawers = Array.from(document.querySelectorAll<HTMLElement>('div[tabindex="0"]'));
      for (const drawer of drawers) {
        const heading = drawer.querySelector("h3");
        if (!heading) continue;
        markLocationDrawer(drawer);
        const drawerPanel = drawer.parentElement as HTMLElement | null;
        const listPanel = drawerPanel?.previousElementSibling as HTMLElement | null;
        if (listPanel) markLocationList(listPanel);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style>{`
      .atlas-location-asset-language {
        gap: 10px !important;
      }

      .atlas-location-primary-information {
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        padding: 14px !important;
        box-shadow: none !important;
      }

      .atlas-location-primary-information > :first-child {
        margin-bottom: 10px !important;
      }

      .atlas-location-information-label {
        margin: 12px 0 7px !important;
        color: #607086 !important;
        font-size: 10px !important;
        font-weight: 850 !important;
        letter-spacing: .055em !important;
        text-transform: uppercase !important;
      }

      .atlas-location-core-info-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
        margin: 0 !important;
      }

      .atlas-location-core-info-field {
        display: grid !important;
        gap: 3px !important;
        min-width: 0 !important;
        padding: 9px 10px !important;
        border: 1px solid #e0e6ed !important;
        border-radius: 9px !important;
        background: #fbfcfd !important;
        box-shadow: none !important;
      }

      .atlas-location-core-info-field > span {
        color: #607086 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
      }

      .atlas-location-core-info-field > strong {
        color: #0b1e33 !important;
        font-size: 12px !important;
        line-height: 1.35 !important;
        font-weight: 800 !important;
        overflow-wrap: anywhere !important;
      }

      .atlas-location-hierarchy-path-quiet {
        display: none !important;
      }

      .atlas-location-summary-secondary {
        display: none !important;
      }

      .atlas-location-detail-thumb.atlas-location-no-photo {
        display: none !important;
      }

      .atlas-location-assets-standard-section,
      .atlas-location-photos-optional-section,
      .atlas-location-history-standard-section {
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        padding: 12px !important;
        margin-top: 0 !important;
      }

      .atlas-location-photos-optional-section:not(:has(img)) {
        background: #ffffff !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-card-clean {
        border-radius: 9px !important;
        border-color: #d9e2eb !important;
        box-shadow: none !important;
        background: #ffffff !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-card-clean:hover,
      .atlas-location-list-asset-language .atlas-location-list-card-clean:focus-within {
        border-color: #c99a3d !important;
        box-shadow: 0 3px 10px rgba(15,42,67,.07) !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-card-main {
        min-height: 50px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        grid-template-columns: 34px minmax(0, 1fr) !important;
        gap: 8px !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-card-main.atlas-location-list-no-photo {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-thumb.atlas-location-no-photo {
        display: none !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-card-main strong {
        font-size: 12.5px !important;
        line-height: 1.2 !important;
      }

      .atlas-location-list-asset-language .atlas-location-list-card-main small {
        margin-top: 2px !important;
        font-size: 10.5px !important;
      }

      .atlas-location-list-counts-hidden {
        display: none !important;
      }

      .atlas-location-asset-language [style*="recordInfoGridStyle"] {
        box-shadow: none !important;
      }

      @media (max-width: 900px) {
        .atlas-location-primary-information {
          padding: 11px !important;
        }
        .atlas-location-core-info-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        .atlas-location-list-asset-language .atlas-location-list-card-main {
          min-height: 48px !important;
        }
      }
    `}</style>
  );
}
