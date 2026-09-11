"use client";

export default function AtlasScrollSafety() {
  return (
    <style jsx global>{`
      /* Shared detail panes must always remain vertically reachable. */
      .atlas-record-detail-content,
      [data-atlas-detail-panel],
      [data-atlas-work-detail-panel] {
        min-height: 0 !important;
      }

      @media (min-width: 901px) {
        .atlas-assets-viewport-root .atlas-assets-viewport-detail,
        .atlas-locations-viewport-root .atlas-locations-assets-detail,
        .atlas-work-polish-root .atlas-work-detail-pane {
          min-height: 0 !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable !important;
          scroll-padding-bottom: 96px !important;
          padding-bottom: 72px !important;
          box-sizing: border-box !important;
        }

        .atlas-assets-viewport-root .atlas-asset-reference-drawer,
        .atlas-locations-viewport-root .atlas-location-drawer-polish,
        .atlas-work-polish-root [data-atlas-work-detail-panel] {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        .atlas-assets-viewport-root .atlas-asset-reference-editing {
          padding-bottom: 96px !important;
        }
      }

      @media (max-width: 900px) {
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

        .atlas-asset-reference-drawer,
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
