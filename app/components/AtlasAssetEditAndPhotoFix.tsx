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

function resetDetailToTop() {
  const detail = assetsMain()?.querySelector<HTMLElement>(".atlas-assets-viewport-detail") || null;
  if (!detail) return;
  detail.scrollTop = 0;
  detail.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function syncNativeAssetActions() {
  const drawer = assetsMain()?.querySelector<HTMLElement>(".atlas-asset-drawer") || null;
  if (!drawer) return;

  const nativeRow = drawer.querySelector<HTMLElement>(".atlas-asset-reference-native-title-row");
  if (!nativeRow) return;

  const texts = Array.from(nativeRow.querySelectorAll<HTMLButtonElement>("button")).map(
    (button) => normalized(button.textContent),
  );
  const editing = texts.includes("save changes") && texts.includes("cancel");
  drawer.classList.toggle("atlas-asset-reference-editing", editing);
  nativeRow.classList.toggle("atlas-asset-native-actions-live", !editing);
}

export default function AtlasAssetEditAndPhotoFix() {
  useEffect(() => {
    let lastAssetTitle = "";
    let frame = 0;

    const sync = () => {
      frame = 0;
      syncNativeAssetActions();
      const drawer = assetsMain()?.querySelector<HTMLElement>(".atlas-asset-drawer") || null;
      const title = drawer?.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
      if (title && title !== lastAssetTitle) {
        lastAssetTitle = title;
        resetDetailToTop();
        window.requestAnimationFrame(resetDetailToTop);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "aria-label"],
    });
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      /* Never show the DOM-created proxy Edit/Delete controls. */
      .atlas-assets-viewport-root .atlas-asset-inline-actions {
        display: none !important;
      }

      /* Read-only asset view uses the native React action row directly. */
      .atlas-assets-viewport-root
        .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        .atlas-asset-reference-native-title-row.atlas-asset-native-actions-live {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 7px !important;
        margin: 0 0 8px !important;
        min-height: 34px !important;
      }

      .atlas-assets-viewport-root
        .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        .atlas-asset-reference-native-title-row.atlas-asset-native-actions-live
        > div:first-child {
        display: none !important;
      }

      .atlas-assets-viewport-root
        .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        .atlas-asset-reference-native-title-row.atlas-asset-native-actions-live
        button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 32px !important;
        border-radius: 8px !important;
        padding: 5px 11px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
      }

      @media (min-width: 901px) {
        .atlas-assets-viewport-root .atlas-assets-viewport-grid {
          height: 100% !important;
          max-height: 100% !important;
          margin: 0 !important;
          transform: none !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable !important;
          scroll-padding-bottom: 96px !important;
          box-sizing: border-box !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-reference-drawer,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-record-detail-content,
        .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-polish-assets-detail-pane {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
      }

      .atlas-assets-viewport-root
        .atlas-asset-reference-drawer:not(.atlas-asset-reference-editing)
        > [data-atlas-asset-additional-info-host] {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-hero {
        grid-template-columns: minmax(0, 1fr) 168px !important;
        align-items: start !important;
        min-height: 144px !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-title-line h2 {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        margin: 0 !important;
        color: #071b2f !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-photo {
        display: block !important;
        width: 168px !important;
        height: 118px !important;
        max-width: 168px !important;
        max-height: 118px !important;
        min-width: 168px !important;
        min-height: 118px !important;
        aspect-ratio: auto !important;
        object-fit: contain !important;
        object-position: center !important;
        background: #ffffff !important;
        border: 1px solid #dce5ed !important;
        border-radius: 10px !important;
      }

      @media (max-width: 900px) {
        .atlas-asset-reference-root .atlas-asset-reference-hero {
          grid-template-columns: minmax(0, 1fr) 104px !important;
          min-height: 108px !important;
        }

        .atlas-asset-reference-root .atlas-asset-reference-photo {
          width: 104px !important;
          height: 82px !important;
          max-width: 104px !important;
          max-height: 82px !important;
          min-width: 104px !important;
          min-height: 82px !important;
        }
      }
    `}</style>
  );
}
