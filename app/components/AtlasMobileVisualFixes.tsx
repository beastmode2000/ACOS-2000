"use client";

export default function AtlasMobileVisualFixes() {
  return (
    <style jsx global>{`
      /* Asset list rows stay visually neutral. Atlas may keep a current/detail
         record internally, but that state should not turn list cards blue. */
      .atlas-assets-viewport-root .atlas-asset-list-card-polished,
      .atlas-assets-viewport-root .atlas-asset-list-card-current,
      .atlas-assets-viewport-root .atlas-asset-list-card-bulk-selected,
      .atlas-assets-viewport-root .atlas-gold-hover-card.atlas-asset-list-card-polished {
        border-color: #d8e1eb !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      /* Dashboard upcoming rows are informational list rows, not selected-state cards. */
      .atlas-secondary-custom-row,
      .atlas-secondary-custom-row:hover,
      .atlas-secondary-custom-row:focus,
      .atlas-secondary-custom-row:focus-visible,
      .atlas-secondary-custom-row:active {
        border-color: #d8e0e8 !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      @media (max-width: 900px) {
        html,
        body {
          overflow-x: hidden !important;
        }

        .atlas-mobile-field-main,
        .atlas-mobile-dashboard-polish-root,
        .atlas-command-dashboard,
        .atlas-mobile-dashboard-command {
          width: 100vw !important;
          max-width: 100vw !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-field-main > div,
        .atlas-mobile-field-main .atlas-page,
        .atlas-mobile-dashboard-polish-root > div,
        .atlas-command-dashboard,
        .atlas-mobile-dashboard-command,
        .atlas-command-dashboard .atlas-dashboard-layout-grid,
        .atlas-mobile-dashboard-command .atlas-dashboard-layout-grid {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-field-main .atlas-page {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .atlas-mobile-field-main section,
        .atlas-mobile-field-main article,
        .atlas-mobile-field-main details,
        .atlas-command-dashboard > section,
        .atlas-command-dashboard > details,
        .atlas-mobile-dashboard-command > section,
        .atlas-mobile-dashboard-command > details {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-dashboard-fab {
          position: fixed !important;
          left: auto !important;
          right: 14px !important;
          bottom: calc(86px + env(safe-area-inset-bottom)) !important;
          width: 52px !important;
          max-width: 52px !important;
          min-width: 52px !important;
          height: 52px !important;
          max-height: 52px !important;
          min-height: 52px !important;
          padding: 0 !important;
          border-radius: 999px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 22px !important;
          line-height: 1 !important;
        }

        .atlas-mobile-field-main button,
        .atlas-mobile-field-main [role="button"],
        .atlas-mobile-dashboard-command button,
        .atlas-mobile-dashboard-command [role="button"] {
          -webkit-tap-highlight-color: transparent !important;
        }

        .atlas-mobile-field-main button:focus:not(:focus-visible),
        .atlas-mobile-field-main [role="button"]:focus:not(:focus-visible),
        .atlas-mobile-dashboard-command button:focus:not(:focus-visible),
        .atlas-mobile-dashboard-command [role="button"]:focus:not(:focus-visible) {
          outline: none !important;
          box-shadow: none !important;
        }

        @media (hover: none), (pointer: coarse) {
          .atlas-gold-hover-card:hover {
            background: #ffffff !important;
          }
        }
      }
    `}</style>
  );
}