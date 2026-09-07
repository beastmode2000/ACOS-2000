"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function markRows(section: HTMLElement, className: string, visibleCount: number) {
  const rows = Array.from(
    section.querySelectorAll<HTMLElement>("button.atlas-gold-hover-card"),
  );

  rows.forEach((row, index) => {
    row.classList.add(className);
    if (index >= visibleCount) row.classList.add("atlas-location-detail-extra-row");
    else row.classList.remove("atlas-location-detail-extra-row");
  });
}

function cleanLocationDetail() {
  if (window.innerWidth <= 900) return;

  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "locations",
  );
  const root = (heading?.closest("main") as HTMLElement | null) || null;
  if (!root) return;

  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;

  detailPanel.classList.add("atlas-location-detail-clean-panel");

  const drawer = detailPanel.querySelector<HTMLElement>('div[tabindex="0"]');
  if (!drawer) return;
  drawer.classList.add("atlas-location-detail-clean-drawer");

  for (const section of Array.from(drawer.querySelectorAll<HTMLElement>("section"))) {
    const text = normalized(section.textContent);

    if (text.includes("tasks at this location")) {
      section.classList.add("atlas-location-detail-section", "atlas-location-detail-tasks");
      markRows(section, "atlas-location-task-row", 3);
    }

    if (text.includes("assets assigned here") || text.includes("appliances & equipment")) {
      section.classList.add("atlas-location-detail-section", "atlas-location-detail-assets");

      for (const button of Array.from(section.querySelectorAll<HTMLButtonElement>("button"))) {
        if (normalized(button.textContent) === "reassign") {
          button.classList.add("atlas-location-detail-reassign-hidden");
        }
      }
    }

    if (text.includes("location history") || text.includes("property history")) {
      section.classList.add("atlas-location-detail-section", "atlas-location-detail-history");
      markRows(section, "atlas-location-history-row", 3);
    }

    if (text.includes("photos") && text.includes("attached")) {
      section.classList.add("atlas-location-detail-section", "atlas-location-detail-photos");
    }
  }

  for (const element of Array.from(drawer.querySelectorAll<HTMLElement>("div"))) {
    const style = window.getComputedStyle(element);
    if (
      element !== drawer &&
      /auto|scroll/.test(style.overflowY) &&
      element.scrollHeight > element.clientHeight + 4
    ) {
      element.classList.add("atlas-location-detail-nested-scroll");
    }
  }
}

export default function AtlasLocationDetailPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        cleanLocationDetail();
      });
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
        .atlas-location-detail-clean-panel {
          overflow: hidden !important;
        }

        .atlas-location-detail-clean-drawer {
          display: grid !important;
          gap: 10px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-gutter: stable !important;
          padding-right: 4px !important;
        }

        .atlas-location-detail-clean-drawer > div:first-child {
          margin-bottom: 0 !important;
        }

        .atlas-location-detail-section {
          margin: 0 !important;
          padding: 11px !important;
          border: 1px solid #d9e2eb !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          box-shadow: none !important;
          overflow: visible !important;
        }

        .atlas-location-detail-section > div:first-child {
          margin-bottom: 8px !important;
        }

        .atlas-location-detail-section [style*="overflow-y"],
        .atlas-location-detail-nested-scroll {
          height: auto !important;
          max-height: none !important;
          min-height: 0 !important;
          overflow-y: visible !important;
          overflow-x: hidden !important;
          scrollbar-gutter: auto !important;
        }

        .atlas-location-detail-extra-row {
          display: none !important;
        }

        .atlas-location-task-row,
        .atlas-location-history-row {
          min-height: 40px !important;
          padding: 7px 9px !important;
          border-radius: 9px !important;
          box-shadow: none !important;
        }

        .atlas-location-detail-assets [style*="grid-template-columns"] {
          gap: 6px !important;
        }

        .atlas-location-detail-assets button.atlas-gold-hover-card {
          min-height: 42px !important;
          padding: 7px 9px !important;
          border-radius: 9px !important;
          box-shadow: none !important;
        }

        .atlas-location-detail-reassign-hidden {
          display: none !important;
        }

        .atlas-location-detail-assets [style*="display: flex"]:has(.atlas-location-detail-reassign-hidden) {
          display: none !important;
        }

        .atlas-location-detail-photos img {
          border-radius: 8px !important;
        }

        .atlas-location-detail-history {
          opacity: 1 !important;
        }

        .atlas-location-detail-history > div:first-child,
        .atlas-location-detail-tasks > div:first-child,
        .atlas-location-detail-assets > div:first-child,
        .atlas-location-detail-photos > div:first-child {
          align-items: center !important;
          gap: 8px !important;
        }
      }
    `}</style>
  );
}
