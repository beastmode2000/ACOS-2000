"use client";

import { useEffect } from "react";

export default function AtlasMobileVisualFixes() {
  useEffect(() => {
    let frame = 0;

    const neutralize = () => {
      frame = 0;

      // Assets can carry selected/current state in several layers. Keep the
      // actual list-card surface neutral regardless of that internal state.
      document
        .querySelectorAll<HTMLElement>(".atlas-assets-viewport-root .atlas-gold-hover-card")
        .forEach((card) => {
          card.style.setProperty("background", "#ffffff", "important");
          card.style.setProperty("background-color", "#ffffff", "important");
          card.style.setProperty("box-shadow", "none", "important");

          // Older list markup can put the blue selected fill on an inner wrapper
          // rather than the outer card. Only neutralize the known selected fill.
          card.querySelectorAll<HTMLElement>("div, button").forEach((node) => {
            const background = window.getComputedStyle(node).backgroundColor;
            if (background === "rgb(244, 248, 253)") {
              node.style.setProperty("background", "#ffffff", "important");
              node.style.setProperty("background-color", "#ffffff", "important");
              node.style.setProperty("box-shadow", "none", "important");
            }
          });
        });

      // Dashboard work rows are rendered inside the person-lane scroll area.
      // Neutralize only the known stray selected fill, leaving status/action
      // colors (gold buttons, red warnings, green completion, etc.) untouched.
      document
        .querySelectorAll<HTMLElement>(".atlas-dashboard-polish-person-lane")
        .forEach((lane) => {
          lane.querySelectorAll<HTMLElement>("div, button").forEach((node) => {
            const background = window.getComputedStyle(node).backgroundColor;
            if (background === "rgb(244, 248, 253)") {
              node.style.setProperty("background", "#ffffff", "important");
              node.style.setProperty("background-color", "#ffffff", "important");
              node.style.setProperty("box-shadow", "none", "important");
            }
          });
        });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(neutralize);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      /* Asset list rows stay visually neutral even when Atlas keeps internal
         current/detail or bulk-selection state. */
      .atlas-assets-viewport-root .atlas-asset-list-card-polished,
      .atlas-assets-viewport-root .atlas-asset-list-card-polished.atlas-asset-list-card-current,
      .atlas-assets-viewport-root .atlas-asset-list-card-polished.atlas-asset-list-card-bulk-selected,
      .atlas-assets-viewport-root .atlas-gold-hover-card.atlas-asset-list-card-polished,
      .atlas-assets-viewport-root .atlas-gold-hover-card.atlas-asset-list-card-polished.atlas-asset-list-card-current,
      .atlas-assets-viewport-root .atlas-gold-hover-card.atlas-asset-list-card-polished.atlas-asset-list-card-bulk-selected {
        border-color: #d8e1eb !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      /* Native Dashboard work rows and the custom Upcoming rows are not
         selected-state cards. Keep them white in every passive interaction state. */
      .atlas-dashboard-polish-person-lane div[style*="overflow-y: auto"] > div,
      .atlas-dashboard-polish-person-lane div[style*="overflow-y:auto"] > div,
      .atlas-secondary-custom-row,
      .atlas-secondary-custom-row:hover,
      .atlas-secondary-custom-row:focus,
      .atlas-secondary-custom-row:focus-visible,
      .atlas-secondary-custom-row:active {
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-secondary-custom-row,
      .atlas-secondary-custom-row:hover,
      .atlas-secondary-custom-row:focus,
      .atlas-secondary-custom-row:focus-visible,
      .atlas-secondary-custom-row:active {
        border-color: #d8e0e8 !important;
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
