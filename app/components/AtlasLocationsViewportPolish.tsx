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

  const search = root.querySelector<HTMLInputElement>(
    'input[placeholder*="Search locations" i]',
  );
  if (!search) return;

  search.classList.add("atlas-locations-compact-search");

  let grid: HTMLElement | null = search.parentElement;
  while (grid && grid !== root) {
    const style = window.getComputedStyle(grid);
    if (style.display === "grid" && grid.children.length >= 2) break;
    grid = grid.parentElement;
  }
  if (!grid || grid === root) return;

  grid.classList.add("atlas-locations-viewport-grid");

  let listPanel: HTMLElement | null = search.parentElement;
  while (listPanel && listPanel.parentElement !== grid) {
    listPanel = listPanel.parentElement;
  }
  if (!listPanel) return;
  listPanel.classList.add("atlas-locations-viewport-list");

  const detailPanel = Array.from(grid.children).find(
    (child) => child instanceof HTMLElement && child !== listPanel,
  ) as HTMLElement | undefined;
  detailPanel?.classList.add("atlas-locations-viewport-detail");

  const header = grid.previousElementSibling as HTMLElement | null;
  if (header && header.parentElement === grid.parentElement) {
    header.classList.add("atlas-locations-viewport-header");
  }

  const shell = grid.parentElement as HTMLElement | null;
  shell?.classList.add("atlas-locations-viewport-shell");

  const addLocation = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add location",
  );
  const editLocation = detailPanel
    ? Array.from(detailPanel.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => normalized(button.textContent) === "edit",
      )
    : undefined;

  if (addLocation && editLocation?.parentElement) {
    addLocation.classList.add("atlas-locations-add-button");
    const actionRow = editLocation.parentElement;
    actionRow.classList.add("atlas-locations-detail-actions");
    if (addLocation.parentElement !== actionRow) {
      actionRow.insertBefore(addLocation, editLocation);
    }
  }

  for (const card of Array.from(
    listPanel.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"),
  )) {
    card.classList.add("atlas-location-compact-row");
    const button = card.querySelector<HTMLButtonElement>("button");
    button?.classList.add("atlas-location-compact-main");
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
        .atlas-locations-viewport-root .atlas-locations-viewport-shell {
          height: calc(100dvh - 96px) !important;
          min-height: calc(100dvh - 96px) !important;
          max-height: calc(100dvh - 96px) !important;
          display: grid !important;
          grid-template-rows: minmax(0, 1fr) !important;
          align-content: stretch !important;
          padding: 4px 16px 6px !important;
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root .atlas-locations-viewport-header {
          display: none !important;
        }

        .atlas-locations-viewport-root .atlas-locations-viewport-grid {
          min-height: 0 !important;
          height: calc(100% + 92px) !important;
          max-height: calc(100% + 92px) !important;
          margin: -60px 0 0 !important;
          padding: 0 !important;
          align-items: stretch !important;
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root .atlas-locations-viewport-list,
        .atlas-locations-viewport-root .atlas-locations-viewport-detail {
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          align-self: stretch !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable !important;
        }

        .atlas-locations-viewport-root .atlas-locations-compact-search {
          min-height: 32px !important;
          height: 32px !important;
          padding: 5px 9px !important;
          font-size: 12px !important;
        }

        .atlas-locations-viewport-root .atlas-location-compact-row {
          min-height: 0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
        }

        .atlas-locations-viewport-root .atlas-location-compact-main {
          min-height: 58px !important;
          height: 58px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }

        .atlas-locations-viewport-root
          .atlas-location-compact-main
          > span:last-child
          > span:last-child {
          display: none !important;
        }

        .atlas-locations-viewport-root .atlas-locations-detail-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 8px !important;
          flex-wrap: wrap !important;
        }

        .atlas-locations-viewport-root .atlas-locations-add-button {
          min-height: 34px !important;
          height: 34px !important;
          padding: 6px 12px !important;
          margin: 0 !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-locations-viewport-root .atlas-locations-viewport-shell,
        .atlas-locations-viewport-root .atlas-locations-viewport-grid,
        .atlas-locations-viewport-root .atlas-locations-viewport-list,
        .atlas-locations-viewport-root .atlas-locations-viewport-detail {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
      }
    `}</style>
  );
}
