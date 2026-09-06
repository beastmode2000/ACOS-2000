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
      rect.height > 180 &&
      rect.width > 180
    );
  });

  candidates.sort(
    (a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height,
  );

  return candidates[0] || null;
}

function suppressInactiveAssetBranches(drawer: HTMLElement) {
  const activeSection = drawer.querySelector<HTMLElement>(
    ".atlas-native-asset-section.atlas-native-section-open",
  );
  if (!activeSection) return;

  let node: HTMLElement = activeSection;
  while (node.parentElement && node.parentElement !== drawer) {
    const parent = node.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && sibling instanceof HTMLElement) {
        sibling.classList.add("atlas-native-section-suppressed");
      }
    }
    node = parent;
  }
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
    (section) => normalized(section.querySelector<HTMLElement>("strong")?.textContent) === "notes",
  );
  notesSection?.classList.toggle("atlas-assets-notes-hidden", !editing);

  if (!editing) suppressInactiveAssetBranches(drawer);

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
      const listScroll = assetsListScrollContainer(listPanel, searchRow);
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

  const sortSelect = root.querySelector<HTMLSelectElement>(
    'select[aria-label="Sort assets alphabetically"]',
  );
  sortSelect?.classList.add("atlas-assets-sort-hidden");

  const addAsset = Array.from(
    root.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => normalized(button.textContent) === "add asset");

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

      .atlas-assets-viewport-root .atlas-native-section-suppressed {
        display: none !important;
      }

      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open {
        position: static !important;
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        margin: 8px 0 10px !important;
        padding: 12px !important;
        border: 1px solid #dce5ed !important;
        border-radius: 10px !important;
        background: #ffffff !important;
        overflow: visible !important;
        box-shadow: none !important;
      }

      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open > div,
      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open > section {
        position: static !important;
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        overflow: visible !important;
        transform: none !important;
      }

      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open > div + div,
      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open > section + section {
        margin-top: 8px !important;
      }

      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open button,
      .atlas-assets-viewport-root .atlas-native-asset-section.atlas-native-section-open a {
        position: static !important;
        max-width: 100% !important;
        white-space: normal !important;
        transform: none !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"],
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open {
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div {
        min-width: 0 !important;
        max-width: 100% !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div:last-of-type > div,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div:last-of-type > div {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        align-items: stretch !important;
        gap: 8px !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        padding: 10px !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div:last-of-type > div > div:first-child,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div:last-of-type > div > div:first-child {
        min-width: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div:last-of-type > div > div:first-child strong,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div:last-of-type > div > div:first-child strong {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div:last-of-type > div > div:first-child span,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div:last-of-type > div > div:first-child span {
        display: block !important;
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div:last-of-type > div > div:last-child,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div:last-of-type > div > div:last-child {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
      }

      .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] button,
      .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open button {
        flex: 0 0 auto !important;
        white-space: nowrap !important;
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
          height: 100% !important;
          max-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          align-items: stretch !important;
          overflow: hidden !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-list,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          align-self: stretch !important;
          overflow: hidden !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
        }

        .atlas-assets-viewport-root .atlas-assets-search-row {
          flex: 0 0 auto !important;
          min-height: 0 !important;
          height: auto !important;
          max-height: 48px !important;
          margin: 0 0 6px !important;
          padding: 0 !important;
        }

        .atlas-assets-viewport-root .atlas-assets-list-fill-chain {
          flex: 1 1 0 !important;
          min-height: 0 !important;
          height: 100% !important;
          max-height: none !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .atlas-assets-viewport-root .atlas-assets-list-scroll,
        .atlas-assets-viewport-root .atlas-polish-assets-list-pane {
          flex: 1 1 0 !important;
          min-height: 0 !important;
          height: 100% !important;
          max-height: none !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
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

        .atlas-assets-viewport-root .atlas-native-photos-manual-open > section[aria-label="Asset manuals"] > div:last-of-type > div > div:last-child,
        .atlas-assets-viewport-root section[aria-label="Asset manuals"].atlas-native-section-open > div:last-of-type > div > div:last-child {
          justify-content: flex-start !important;
        }
      }
    `}</style>
  );
}
