"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function locationsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "locations",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function markLocationsViewport() {
  const root = locationsMain();
  if (!root) return;

  root.classList.add("atlas-locations-viewport-root");

  const listPanel = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!listPanel || !detailPanel) return;

  const grid = listPanel.parentElement as HTMLElement | null;
  const shell = grid?.parentElement as HTMLElement | null;
  if (!grid || !shell) return;

  shell.classList.add("atlas-locations-assets-shell");
  grid.classList.add("atlas-locations-assets-grid");
  listPanel.classList.add("atlas-locations-assets-list");
  detailPanel.classList.add("atlas-locations-assets-detail");

  const header = grid.previousElementSibling as HTMLElement | null;
  if (header && header.parentElement === shell) {
    header.classList.add("atlas-locations-assets-header");
  }

  const addLocation = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add location",
  );
  const editLocation = Array.from(detailPanel.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "edit",
  );

  if (addLocation && editLocation?.parentElement) {
    const actionRow = editLocation.parentElement;
    actionRow.classList.add("atlas-locations-assets-actions");
    addLocation.classList.add("atlas-locations-assets-add");
    if (addLocation.parentElement !== actionRow) {
      actionRow.insertBefore(addLocation, editLocation);
    }
  }

  const search = root.querySelector<HTMLInputElement>(
    'input[placeholder*="Search locations" i]',
  );
  search?.classList.add("atlas-locations-assets-search");

  for (const card of Array.from(
    listPanel.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"),
  )) {
    card.classList.add("atlas-locations-assets-row");

    const mainButton = Array.from(card.children).find(
      (child) => child instanceof HTMLButtonElement,
    ) as HTMLButtonElement | undefined;
    mainButton?.classList.add("atlas-locations-assets-row-main");
  }
}

export default function AtlasLocationsViewportPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      markLocationsViewport();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 901px) {
        .atlas-locations-viewport-root .atlas-locations-assets-shell {
          height: calc(100dvh - 96px) !important;
          min-height: calc(100dvh - 96px) !important;
          max-height: calc(100dvh - 96px) !important;
          display: grid !important;
          grid-template-rows: minmax(0, 1fr) !important;
          align-content: stretch !important;
          padding: 4px 16px 6px !important;
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-header {
          display: none !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-grid {
          grid-template-columns: minmax(270px, 34%) minmax(0, 66%) !important;
          gap: 12px !important;
          align-items: stretch !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-list,
        .atlas-locations-viewport-root .atlas-locations-assets-detail {
          min-width: 0 !important;
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          align-self: stretch !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-list {
          padding-right: 6px !important;
        }

        .atlas-locations-viewport-root .atlas-location-drawer-polish {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          scrollbar-gutter: auto !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-search {
          min-height: 32px !important;
          height: 32px !important;
          padding: 5px 9px !important;
          font-size: 12px !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-row {
          min-height: 58px !important;
          height: 58px !important;
          max-height: 58px !important;
          overflow: hidden !important;
          border-radius: 12px !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-row-main {
          min-height: 58px !important;
          height: 58px !important;
          max-height: 58px !important;
          padding-top: 5px !important;
          padding-bottom: 5px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root
          .atlas-locations-assets-row-main
          > span:last-child
          > small.atlas-location-list-card-meta-hidden {
          display: block !important;
        }

        .atlas-locations-viewport-root
          .atlas-locations-assets-row-main
          > span:last-child
          > span.atlas-location-list-card-meta-hidden {
          display: none !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-row-main strong,
        .atlas-locations-viewport-root .atlas-locations-assets-row-main small {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 7px !important;
          flex-wrap: wrap !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-add {
          min-height: 34px !important;
          height: 34px !important;
          padding: 6px 12px !important;
          margin: 0 !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-locations-viewport-root .atlas-locations-assets-shell,
        .atlas-locations-viewport-root .atlas-locations-assets-grid,
        .atlas-locations-viewport-root .atlas-locations-assets-list,
        .atlas-locations-viewport-root .atlas-locations-assets-detail {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
      }
    `}</style>
  );
}
