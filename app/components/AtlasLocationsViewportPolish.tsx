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

function clearLegacyViewportClasses(root: HTMLElement) {
  const legacyClasses = [
    "atlas-locations-viewport-grid",
    "atlas-locations-viewport-list",
    "atlas-locations-viewport-detail",
    "atlas-locations-viewport-header",
    "atlas-locations-viewport-shell",
  ];

  for (const className of legacyClasses) {
    for (const element of Array.from(
      root.querySelectorAll<HTMLElement>(`.${className}`),
    )) {
      element.classList.remove(className);
    }
  }
}

function markLocationsViewport() {
  const root = locationsMain();
  if (!root) return;

  root.classList.add("atlas-locations-viewport-root");
  clearLegacyViewportClasses(root);

  const shell = root.querySelector<HTMLElement>(".atlas-location-workspace-shell");
  const columns = root.querySelector<HTMLElement>(".atlas-location-workspace-columns");
  const listPanel = root.querySelector<HTMLElement>(".atlas-location-list-panel");
  const drawerPanel = root.querySelector<HTMLElement>(".atlas-location-drawer-panel");
  const drawer = root.querySelector<HTMLElement>(".atlas-location-drawer-polish");

  if (!shell || !columns || !listPanel || !drawerPanel || !drawer) return;

  shell.classList.add("atlas-locations-assets-shell");
  columns.classList.add("atlas-locations-assets-columns");
  listPanel.classList.add("atlas-locations-assets-list");
  drawerPanel.classList.add("atlas-locations-assets-detail");
  drawer.classList.add("atlas-locations-assets-drawer");

  const header = columns.previousElementSibling as HTMLElement | null;
  if (header && header.parentElement === columns.parentElement) {
    header.classList.add("atlas-locations-assets-header");
  }

  const search = root.querySelector<HTMLInputElement>(
    'input[placeholder*="Search locations" i]',
  );
  search?.classList.add("atlas-locations-assets-search");

  const addLocation = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add location",
  );
  const editLocation = Array.from(drawer.querySelectorAll<HTMLButtonElement>("button")).find(
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
          margin-top: 0 !important;
          padding: 4px 16px 6px !important;
          height: calc(100dvh - 96px) !important;
          min-height: calc(100dvh - 96px) !important;
          max-height: calc(100dvh - 96px) !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-header {
          display: none !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-columns {
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
        }

        .atlas-locations-viewport-root .atlas-locations-assets-list {
          overflow-y: auto !important;
          padding-right: 6px !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-detail {
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-drawer {
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-search {
          height: 32px !important;
          min-height: 32px !important;
          padding: 5px 9px !important;
          font-size: 12px !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-row {
          min-height: 0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
          overflow: hidden !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-row-main {
          display: grid !important;
          grid-template-columns: 32px minmax(0, 1fr) !important;
          align-items: center !important;
          min-height: 58px !important;
          height: 58px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }

        .atlas-locations-viewport-root .atlas-location-list-card-meta-hidden {
          display: initial !important;
        }

        .atlas-locations-viewport-root .atlas-locations-assets-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 8px !important;
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
        .atlas-locations-viewport-root .atlas-locations-assets-columns,
        .atlas-locations-viewport-root .atlas-locations-assets-list,
        .atlas-locations-viewport-root .atlas-locations-assets-detail,
        .atlas-locations-viewport-root .atlas-locations-assets-drawer {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
        }
      }
    `}</style>
  );
}
