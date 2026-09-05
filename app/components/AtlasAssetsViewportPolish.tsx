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

function markAssetsViewport() {
  const root = assetsMain();
  if (!root) return;

  root.classList.add("atlas-assets-viewport-root");

  const drawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
  if (!drawer) return;

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

  if (search) {
    let listPanel: HTMLElement | null = search.parentElement;
    while (listPanel && listPanel.parentElement !== grid) {
      listPanel = listPanel.parentElement;
    }
    listPanel?.classList.add("atlas-assets-viewport-list");
  }

  let detailPanel: HTMLElement | null = drawer;
  while (detailPanel.parentElement && detailPanel.parentElement !== grid) {
    detailPanel = detailPanel.parentElement;
  }
  detailPanel.classList.add("atlas-assets-viewport-detail");

  const addAsset = Array.from(
    root.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => normalized(button.textContent) === "add asset");

  if (addAsset) {
    addAsset.parentElement?.classList.add("atlas-assets-viewport-toolbar");
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
      .atlas-assets-viewport-root .atlas-assets-viewport-shell {
        min-height: 0 !important;
        padding-top: 8px !important;
        padding-bottom: 10px !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-header {
        min-height: 0 !important;
        height: auto !important;
        gap: 0 !important;
        margin: 0 0 6px !important;
        padding: 0 0 6px !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-header > div:first-child {
        min-height: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        align-items: center !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-header > div:first-child > div:first-child:empty {
        display: none !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-header > div:first-child > div:last-child {
        min-height: 0 !important;
        height: auto !important;
        margin: 0 0 0 auto !important;
        padding: 0 !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-toolbar {
        min-height: 0 !important;
        height: auto !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-grid {
        margin-top: 0 !important;
        padding-top: 0 !important;
        align-items: stretch !important;
        min-height: calc(100dvh - 116px) !important;
        height: calc(100dvh - 116px) !important;
        max-height: calc(100dvh - 116px) !important;
        overflow: hidden !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-list,
      .atlas-assets-viewport-root .atlas-assets-viewport-detail {
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        align-self: stretch !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        scrollbar-gutter: stable !important;
        overscroll-behavior: contain !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-detail.atlas-asset-reference-drawer,
      .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-reference-drawer {
        min-height: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        scrollbar-gutter: stable !important;
      }

      .atlas-assets-viewport-root .atlas-polish-assets-list-pane,
      .atlas-assets-viewport-root .atlas-polish-assets-detail-pane {
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
      }

      @media (max-width: 900px) {
        .atlas-assets-viewport-root .atlas-assets-viewport-shell {
          padding-top: 6px !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-header {
          margin-bottom: 6px !important;
          padding-bottom: 6px !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-grid {
          min-height: auto !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-list,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail.atlas-asset-reference-drawer,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-reference-drawer {
          height: auto !important;
          max-height: none !important;
          overflow-y: visible !important;
          scrollbar-gutter: auto !important;
        }
      }
    `}</style>
  );
}
