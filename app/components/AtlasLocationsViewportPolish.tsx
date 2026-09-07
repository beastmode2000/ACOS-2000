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

  let grid: HTMLElement | null = search.parentElement;
  while (grid && grid !== root) {
    const style = window.getComputedStyle(grid);
    if (style.display === "grid" && grid.children.length >= 2) break;
    grid = grid.parentElement;
  }
  if (!grid || grid === root) return;
  grid.classList.add("atlas-locations-viewport-grid");

  const header = grid.previousElementSibling as HTMLElement | null;
  if (header && header.parentElement === grid.parentElement) {
    header.classList.add("atlas-locations-viewport-header");
  }

  const shell = grid.parentElement as HTMLElement | null;
  shell?.classList.add("atlas-locations-viewport-shell");

  let listPanel: HTMLElement | null = search.parentElement;
  while (listPanel && listPanel.parentElement !== grid) {
    listPanel = listPanel.parentElement;
  }
  listPanel?.classList.add("atlas-locations-viewport-list");

  let searchBlock: HTMLElement | null = search.parentElement;
  while (
    searchBlock &&
    searchBlock.parentElement &&
    searchBlock.parentElement !== listPanel &&
    searchBlock.parentElement !== grid
  ) {
    searchBlock = searchBlock.parentElement;
  }
  searchBlock?.classList.add("atlas-locations-search-block");

  const detailPanel = Array.from(grid.children).find(
    (child) => child instanceof HTMLElement && child !== listPanel,
  ) as HTMLElement | undefined;
  detailPanel?.classList.add("atlas-locations-viewport-detail");

  if (listPanel) {
    const cards = Array.from(
      listPanel.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"),
    );
    for (const card of cards) {
      card.classList.add("atlas-location-compact-row");
      const mainButton = Array.from(card.children).find(
        (child) => child instanceof HTMLButtonElement,
      ) as HTMLButtonElement | undefined;
      mainButton?.classList.add("atlas-location-compact-main");
    }
  }
}

export default function AtlasLocationsViewportPolish() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        markLocationsViewport();
      });
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
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-locations-viewport-root .atlas-locations-search-block {
          position: sticky !important;
          top: 0 !important;
          z-index: 12 !important;
          margin: 0 0 6px !important;
          padding: 0 0 6px !important;
          background: #f4f7fa !important;
        }

        .atlas-locations-viewport-root .atlas-locations-search-block input[type="search"] {
          height: 32px !important;
          min-height: 32px !important;
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
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }

        .atlas-locations-viewport-root .atlas-location-compact-main > span:last-child > span:last-child {
          margin-top: 2px !important;
          gap: 4px !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-locations-viewport-root .atlas-locations-viewport-header {
          display: none !important;
        }

        .atlas-locations-viewport-root .atlas-locations-viewport-shell,
        .atlas-locations-viewport-root .atlas-locations-viewport-grid,
        .atlas-locations-viewport-root .atlas-locations-viewport-list,
        .atlas-locations-viewport-root .atlas-locations-viewport-detail {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
        }
      }
    `}</style>
  );
}
