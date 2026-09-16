"use client";

export default function AtlasScrollSafety() {
  return (
    <style jsx global>{`
      .atlas-record-detail-content,
      [data-atlas-detail-panel],
      [data-atlas-work-detail-panel] {
        min-height: 0 !important;
      }

      /* Assets: one right-side scroll container and one consistent info-card layout. */
      .atlas-assets-viewport-root .atlas-assets-viewport-detail {
        min-height: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;
        scrollbar-gutter: stable !important;
        box-sizing: border-box !important;
        scroll-padding-top: 12px !important;
        scroll-padding-bottom: 110px !important;
        padding-bottom: 88px !important;
      }

      .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-reference-drawer,
      .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-asset-drawer,
      .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-record-detail-content,
      .atlas-assets-viewport-root .atlas-assets-viewport-detail .atlas-polish-assets-detail-pane {
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        overscroll-behavior: auto !important;
        scrollbar-gutter: auto !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-card {
        width: 100% !important;
        min-width: 0 !important;
        align-content: start !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-hero {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 168px !important;
        gap: 14px !important;
        align-items: center !important;
        min-height: 144px !important;
        padding: 13px !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-heading,
      .atlas-assets-viewport-root .atlas-asset-reference-title-line,
      .atlas-assets-viewport-root .atlas-asset-reference-title-line h2,
      .atlas-assets-viewport-root .atlas-asset-reference-subtitle {
        visibility: visible !important;
        opacity: 1 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-heading {
        display: block !important;
        min-width: 0 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-title-line {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        min-height: 28px !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-title-line h2 {
        display: block !important;
        margin: 0 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-photo {
        display: block !important;
        width: 168px !important;
        height: 118px !important;
        min-width: 168px !important;
        max-width: 168px !important;
        min-height: 118px !important;
        max-height: 118px !important;
        aspect-ratio: auto !important;
        object-fit: contain !important;
        object-position: center !important;
        justify-self: end !important;
        align-self: center !important;
        background: #ffffff !important;
        border: 1px solid #dce5ed !important;
        border-radius: 10px !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-specs,
      .atlas-assets-viewport-root .atlas-asset-reference-tabs,
      .atlas-assets-viewport-root .atlas-asset-reference-content-panel {
        width: 100% !important;
        min-width: 0 !important;
      }

      .atlas-assets-viewport-root .atlas-asset-reference-editing {
        padding-bottom: 110px !important;
      }

      @media (min-width: 901px) {
        /* One scroll owner per visible pane. In split/three-pane workspaces each
           pane must be able to travel from its own top to its own bottom without
           changing the scroll position of its neighbor. */
        .atlas-work-polish-root .atlas-work-split-grid,
        .atlas-assets-viewport-root .atlas-assets-viewport-grid {
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .atlas-work-polish-root .atlas-work-split-grid > *,
        .atlas-assets-viewport-root .atlas-assets-viewport-grid > * {
          min-height: 0 !important;
        }

        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          height: 100% !important;
          max-height: 100% !important;
        }

        .atlas-work-polish-root .atlas-work-list-pane,
        .atlas-work-polish-root .atlas-work-detail-pane,
        .atlas-locations-viewport-root .atlas-locations-assets-list,
        .atlas-locations-viewport-root .atlas-locations-assets-detail {
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: contain !important;
          scrollbar-gutter: stable !important;
          scroll-padding-top: 10px !important;
          scroll-padding-bottom: 96px !important;
          padding-bottom: 72px !important;
          box-sizing: border-box !important;
        }

        .atlas-locations-viewport-root .atlas-location-drawer-polish,
        .atlas-work-polish-root [data-atlas-work-detail-panel] {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-assets-viewport-root .atlas-assets-viewport-detail {
          height: auto !important;
          max-height: calc(100dvh - 64px) !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scroll-padding-bottom: 130px !important;
          padding-bottom: max(104px, env(safe-area-inset-bottom)) !important;
        }

        .atlas-assets-viewport-root .atlas-asset-reference-hero {
          grid-template-columns: minmax(0, 1fr) 104px !important;
          gap: 10px !important;
          min-height: 108px !important;
          padding: 11px !important;
        }

        .atlas-assets-viewport-root .atlas-asset-reference-photo {
          width: 104px !important;
          height: 82px !important;
          min-width: 104px !important;
          max-width: 104px !important;
          min-height: 82px !important;
          max-height: 82px !important;
        }

        .atlas-record-detail-content {
          min-height: 0 !important;
          max-height: calc(100dvh - 64px) !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: contain !important;
          -webkit-overflow-scrolling: touch !important;
          scroll-padding-bottom: 120px !important;
          padding-bottom: max(96px, env(safe-area-inset-bottom)) !important;
          box-sizing: border-box !important;
        }

        .atlas-record-detail-content > * {
          min-height: 0 !important;
        }

        .atlas-location-drawer-polish,
        [data-atlas-work-detail-panel] {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
        }
      }
    `}</style>
  );
}
