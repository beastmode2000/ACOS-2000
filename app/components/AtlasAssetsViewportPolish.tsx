"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function assetsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "assets",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function assetsListScrollContainer(
  listPanel: HTMLElement,
  searchRow: HTMLElement | null,
) {
  const candidates = Array.from(
    listPanel.querySelectorAll<HTMLElement>("div, section"),
  ).filter((element) => {
    if (element === searchRow) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      /auto|scroll/.test(style.overflowY) &&
      rect.width > 180 &&
      element.querySelector("button")
    );
  });

  candidates.sort((a, b) => {
    const buttonDifference =
      b.querySelectorAll("button").length - a.querySelectorAll("button").length;
    if (buttonDifference) return buttonDifference;
    return b.getBoundingClientRect().height - a.getBoundingClientRect().height;
  });

  return candidates[0] || null;
}

function clearMeasuredHeight(element: HTMLElement | null) {
  if (!element) return;
  element.style.removeProperty("height");
  element.style.removeProperty("max-height");
  element.style.removeProperty("min-height");
}

function syncListHeightToDetail(
  listPanel: HTMLElement | null,
  listScroll: HTMLElement | null,
  detailPanel: HTMLElement,
) {
  if (!listPanel) return;

  if (window.innerWidth <= 900) {
    clearMeasuredHeight(listPanel);
    clearMeasuredHeight(listScroll);
    for (const element of Array.from(
      listPanel.querySelectorAll<HTMLElement>(
        ".atlas-assets-list-direct-fill, .atlas-assets-list-fill-chain",
      ),
    )) {
      clearMeasuredHeight(element);
    }
    return;
  }

  const detailBottom = detailPanel.getBoundingClientRect().bottom;
  const listTop = listPanel.getBoundingClientRect().top;
  const listHeight = Math.max(240, Math.floor(detailBottom - listTop));

  listPanel.style.setProperty("height", `${listHeight}px`, "important");
  listPanel.style.setProperty("max-height", `${listHeight}px`, "important");
  listPanel.style.setProperty("min-height", "0", "important");

  if (!listScroll) return;

  const scrollTop = listScroll.getBoundingClientRect().top;
  const scrollHeight = Math.max(160, Math.floor(detailBottom - scrollTop));

  for (const element of Array.from(
    listPanel.querySelectorAll<HTMLElement>(
      ".atlas-assets-list-direct-fill, .atlas-assets-list-fill-chain",
    ),
  )) {
    element.style.setProperty("min-height", "0", "important");
    element.style.setProperty("height", "100%", "important");
    element.style.setProperty("max-height", "none", "important");
  }

  listScroll.style.setProperty("height", `${scrollHeight}px`, "important");
  listScroll.style.setProperty("max-height", `${scrollHeight}px`, "important");
  listScroll.style.setProperty("min-height", "0", "important");
}

function markAssetsViewport() {
  const root = assetsMain();
  if (!root) return;

  root.classList.add("atlas-assets-viewport-root");

  const drawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
  if (!drawer) return;

  const editing = Array.from(drawer.querySelectorAll<HTMLButtonElement>("button")).some(
    (button) => normalized(button.textContent) === "save changes",
  );
  const notesSection = Array.from(drawer.querySelectorAll<HTMLElement>("section")).find(
    (section) =>
      normalized(section.querySelector<HTMLElement>("strong")?.textContent) === "notes",
  );
  notesSection?.classList.toggle("atlas-assets-notes-hidden", !editing);

  const grid = drawer.parentElement;
  if (!grid) return;
  grid.classList.add("atlas-assets-viewport-grid");

  const header = grid.previousElementSibling as HTMLElement | null;
  if (header && header.parentElement === grid.parentElement) {
    header.classList.add("atlas-assets-viewport-header");
  }

  const outer = grid.parentElement as HTMLElement | null;
  outer?.classList.add("atlas-assets-viewport-shell");

  const search = root.querySelector<HTMLInputElement>(
    'input[placeholder*="Search assets" i]',
  );

  let listPanel: HTMLElement | null = null;
  let listScroll: HTMLElement | null = null;

  if (search) {
    listPanel = search.parentElement;
    while (listPanel && listPanel.parentElement !== grid) {
      listPanel = listPanel.parentElement;
    }
    listPanel?.classList.add("atlas-assets-viewport-list");

    let searchRow = search.parentElement as HTMLElement | null;
    while (
      searchRow &&
      searchRow.parentElement &&
      searchRow.parentElement !== listPanel &&
      searchRow.parentElement !== grid
    ) {
      searchRow = searchRow.parentElement;
    }
    searchRow?.classList.add("atlas-assets-search-row");

    if (listPanel) {
      for (const child of Array.from(listPanel.children)) {
        if (child instanceof HTMLElement && child !== searchRow) {
          child.classList.add("atlas-assets-list-direct-fill");
        }
      }

      listScroll = assetsListScrollContainer(listPanel, searchRow);
      if (listScroll) {
        listScroll.classList.add("atlas-assets-list-scroll");

        let node: HTMLElement | null = listScroll.parentElement;
        while (node && node !== listPanel) {
          node.classList.add("atlas-assets-list-fill-chain");
          node = node.parentElement;
        }
      }
    }
  }

  let detailPanel: HTMLElement | null = drawer;
  while (detailPanel.parentElement && detailPanel.parentElement !== grid) {
    detailPanel = detailPanel.parentElement;
  }
  detailPanel.classList.add("atlas-assets-viewport-detail");

  syncListHeightToDetail(listPanel, listScroll, detailPanel);

  const sortSelect = root.querySelector<HTMLSelectElement>(
    'select[aria-label="Sort assets alphabetically"]',
  );
  sortSelect?.classList.add("atlas-assets-sort-hidden");

  const addAsset = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add asset",
  );

  if (addAsset) {
    addAsset.classList.add("atlas-assets-add-button");

    const deleteAsset = Array.from(
      drawer.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => normalized(button.textContent) === "delete asset");

    const actionRow = deleteAsset?.parentElement || null;
    if (actionRow) {
      actionRow.classList.add("atlas-assets-detail-actions");
      if (addAsset.parentElement !== actionRow) {
        actionRow.insertBefore(addAsset, actionRow.firstChild);
      }
    }
  }
}

export default function AtlasAssetsViewportPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      markAssetsViewport();
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
      .atlas-assets-viewport-root .atlas-assets-sort-hidden {
        display: none !important;
      }

      .atlas-assets-viewport-root .atlas-assets-notes-hidden {
        display: none !important;
      }

      .atlas-assets-viewport-root
        .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        > *:not(.atlas-asset-reference-native-title-row):not([data-atlas-asset-reference-host]):not(:has(.atlas-native-manual-visible)) {
        display: none !important;
      }

      .atlas-assets-viewport-root
        .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        > *:has(.atlas-native-manual-visible) {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      @media (min-width: 901px) {
        .atlas-assets-viewport-root .atlas-assets-viewport-shell {
          height: calc(100dvh - 96px) !important;
          min-height: calc(100dvh - 96px) !important;
          max-height: calc(100dvh - 96px) !important;
          display: grid !important;
          grid-template-rows: minmax(0, 1fr) !important;
          align-content: stretch !important;
          padding: 4px 16px 6px !important;
          overflow: hidden !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-header {
          display: none !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-grid {
          min-height: 0 !important;
          height: calc(100% + 92px) !important;
          max-height: calc(100% + 92px) !important;
          margin: -60px 0 0 !important;
          padding: 0 !important;
          align-items: stretch !important;
          overflow: hidden !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-list,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          min-height: 0 !important;
          align-self: stretch !important;
          overflow: hidden !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          height: 100% !important;
          max-height: 100% !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          padding-bottom: 0 !important;
        }

        .atlas-assets-viewport-root .atlas-assets-search-row {
          flex: 0 0 auto !important;
          min-height: 0 !important;
          height: auto !important;
          max-height: 52px !important;
          margin: 0 0 6px !important;
          padding: 0 !important;
        }

        .atlas-assets-viewport-root .atlas-assets-list-direct-fill,
        .atlas-assets-viewport-root .atlas-assets-list-fill-chain {
          flex: 1 1 0 !important;
          min-height: 0 !important;
          max-height: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .atlas-assets-viewport-root .atlas-assets-list-scroll,
        .atlas-assets-viewport-root .atlas-polish-assets-list-pane {
          min-height: 0 !important;
          margin: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          overflow-x: hidden !important;
          overflow-y: auto !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-reference-drawer,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-record-detail-content,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-polish-assets-detail-pane {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          scrollbar-gutter: auto !important;
          overscroll-behavior: auto !important;
        }

        .atlas-assets-viewport-root .atlas-assets-detail-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 8px !important;
          flex-wrap: wrap !important;
        }

        .atlas-assets-viewport-root .atlas-assets-add-button {
          min-height: 34px !important;
          height: 34px !important;
          padding: 6px 12px !important;
          margin: 0 !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-assets-viewport-root .atlas-assets-viewport-shell {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          padding-top: 4px !important;
          overflow: visible !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-header {
          display: none !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-grid,
        .atlas-assets-viewport-root .atlas-assets-viewport-list,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-reference-drawer,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-record-detail-content,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-polish-assets-detail-pane,
        .atlas-assets-viewport-root .atlas-assets-list-direct-fill,
        .atlas-assets-viewport-root .atlas-assets-list-fill-chain {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          scrollbar-gutter: auto !important;
        }

        .atlas-assets-viewport-root .atlas-assets-detail-actions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 6px !important;
          flex-wrap: wrap !important;
        }
      }
    `}</style>
  );
}
