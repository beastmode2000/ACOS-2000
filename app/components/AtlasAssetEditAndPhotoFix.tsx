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

function assetDetailPanel() {
  return assetsMain()?.querySelector<HTMLElement>(".atlas-assets-viewport-detail") || null;
}

function resetDetailToTop() {
  const detail = assetDetailPanel();
  if (!detail) return;
  detail.scrollTop = 0;
  detail.scrollTo({ top: 0, left: 0, behavior: "auto" });
  for (const child of Array.from(
    detail.querySelectorAll<HTMLElement>(
      ".atlas-record-detail-content, .atlas-asset-reference-drawer, .atlas-polish-assets-detail-pane",
    ),
  )) {
    child.scrollTop = 0;
  }
}

function clickLiveNativeAssetEdit(proxy: HTMLButtonElement) {
  const drawer = proxy.closest<HTMLElement>(".atlas-asset-drawer");
  if (!drawer) return false;

  const nativeEdit = Array.from(drawer.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => {
      if (button === proxy || button.classList.contains("atlas-asset-inline-action")) return false;
      const aria = normalized(button.getAttribute("aria-label"));
      const title = normalized(button.getAttribute("title"));
      const text = normalized(button.textContent);
      return aria === "edit asset" || title === "edit asset" || text === "edit asset";
    },
  );

  if (!nativeEdit) return false;
  nativeEdit.click();
  return true;
}

export default function AtlasAssetEditAndPhotoFix() {
  useEffect(() => {
    let lastAssetTitle = "";
    let frame = 0;

    const syncSelectedAsset = () => {
      frame = 0;
      const root = assetsMain();
      const drawer = root?.querySelector<HTMLElement>(".atlas-asset-drawer") || null;
      const title = drawer?.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
      if (title && title !== lastAssetTitle) {
        lastAssetTitle = title;
        resetDetailToTop();
        window.requestAnimationFrame(resetDetailToTop);
      }
    };

    const scheduleSync = () => {
      if (!frame) frame = window.requestAnimationFrame(syncSelectedAsset);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const headerEdit = target.closest<HTMLButtonElement>(".atlas-asset-inline-edit");
      if (headerEdit) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        clickLiveNativeAssetEdit(headerEdit);
        window.requestAnimationFrame(() => {
          resetDetailToTop();
          window.requestAnimationFrame(resetDetailToTop);
        });
        return;
      }

      const assetRow = target.closest<HTMLElement>(
        ".atlas-asset-list-card-polished, .atlas-gold-hover-card",
      );
      if (!assetRow) return;

      window.requestAnimationFrame(() => {
        resetDetailToTop();
        window.requestAnimationFrame(resetDetailToTop);
      });
    };

    document.addEventListener("click", handleClick, true);
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleSync();

    return () => {
      document.removeEventListener("click", handleClick, true);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 901px) {
        /* The old viewport polish moved the entire assets grid upward by 60px,
           which clipped the asset name and top of the photo. Keep the grid
           inside the visible shell instead. */
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
          scroll-padding-top: 0 !important;
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

      .atlas-asset-reference-root .atlas-asset-reference-hero {
        grid-template-columns: minmax(0, 1fr) 168px !important;
        align-items: start !important;
        min-height: 144px !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-heading {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        min-width: 0 !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-title-line {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-title-line h2 {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        margin: 0 !important;
        color: #071b2f !important;
        font-size: 21px !important;
        line-height: 1.16 !important;
        font-weight: 700 !important;
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
