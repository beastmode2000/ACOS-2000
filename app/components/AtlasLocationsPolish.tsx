"use client";

import { useEffect } from "react";

const SPEC_VALUE_MARKERS = ["Spec Code:", "Status: Specified", "Source: Susan Merinello"];

function looksLikeSpecification(value: string) {
  return SPEC_VALUE_MARKERS.some((marker) => value.includes(marker));
}

export default function AtlasLocationsPolish() {
  useEffect(() => {
    let frame = 0;

    const applyPolish = () => {
      frame = 0;

      const drawers = Array.from(document.querySelectorAll<HTMLElement>('div[tabindex="0"]'));
      for (const drawer of drawers) {
        const title = drawer.querySelector("h3")?.textContent?.trim();
        if (!title) continue;

        const specCards: HTMLElement[] = [];
        const strongValues = Array.from(drawer.querySelectorAll<HTMLElement>("strong"));

        for (const valueNode of strongValues) {
          const text = valueNode.textContent || "";
          if (!looksLikeSpecification(text)) continue;

          const card = valueNode.parentElement as HTMLElement | null;
          if (!card) continue;

          card.classList.add("atlas-location-spec-card");
          valueNode.classList.add("atlas-location-spec-value");

          const label = card.querySelector<HTMLElement>(":scope > span");
          label?.classList.add("atlas-location-spec-label");

          specCards.push(card);
        }

        const grids = new Set<HTMLElement>();
        for (const card of specCards) {
          if (card.parentElement) grids.add(card.parentElement as HTMLElement);
        }

        for (const grid of grids) {
          grid.classList.add("atlas-location-spec-grid");
        }

        const textareas = Array.from(drawer.querySelectorAll<HTMLTextAreaElement>("textarea"));
        for (const textarea of textareas) {
          if (!looksLikeSpecification(textarea.value || "")) continue;
          const row = textarea.parentElement as HTMLElement | null;
          if (!row) continue;
          row.classList.add("atlas-location-spec-edit-row");
          row.parentElement?.classList.add("atlas-location-spec-edit-list");
        }

        if (specCards.length || textareas.some((textarea) => looksLikeSpecification(textarea.value || ""))) {
          drawer.classList.add("atlas-location-drawer-polish");
        }
      }
    };

    const schedulePolish = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(applyPolish);
    };

    schedulePolish();

    const observer = new MutationObserver(schedulePolish);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    document.addEventListener("input", schedulePolish, true);
    document.addEventListener("change", schedulePolish, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", schedulePolish, true);
      document.removeEventListener("change", schedulePolish, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-location-drawer-polish {
        overflow-x: hidden !important;
        overscroll-behavior: contain;
      }

      .atlas-location-spec-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 12px !important;
        margin-top: 16px !important;
        padding-top: 38px !important;
        position: relative !important;
      }

      .atlas-location-spec-grid::before {
        content: "Specifications";
        position: absolute;
        top: 0;
        left: 0;
        font-size: 16px;
        line-height: 1.2;
        font-weight: 900;
        color: #0b1e33;
        letter-spacing: -0.01em;
      }

      .atlas-location-spec-card {
        display: grid !important;
        grid-template-columns: minmax(180px, 0.34fr) minmax(0, 1fr) !important;
        gap: 18px !important;
        align-items: start !important;
        min-width: 0 !important;
        padding: 14px 16px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        box-shadow: 0 2px 7px rgba(15, 42, 67, 0.04) !important;
      }

      .atlas-location-spec-label {
        display: block !important;
        margin: 0 !important;
        color: #0b1e33 !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
        font-weight: 900 !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
        overflow-wrap: anywhere !important;
      }

      .atlas-location-spec-value {
        display: block !important;
        min-width: 0 !important;
        margin: 0 !important;
        color: #33465b !important;
        font-size: 13px !important;
        line-height: 1.58 !important;
        font-weight: 650 !important;
        white-space: pre-wrap !important;
        overflow-wrap: anywhere !important;
      }

      .atlas-location-spec-edit-list {
        display: grid !important;
        gap: 12px !important;
      }

      .atlas-location-spec-edit-row {
        display: grid !important;
        grid-template-columns: minmax(190px, 0.42fr) minmax(320px, 1fr) auto !important;
        gap: 10px !important;
        align-items: start !important;
        padding: 12px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #fbfcfd !important;
      }

      .atlas-location-spec-edit-row textarea {
        min-height: 132px !important;
        line-height: 1.5 !important;
      }

      @media (max-width: 900px) {
        .atlas-location-spec-grid {
          gap: 10px !important;
        }

        .atlas-location-spec-card {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 8px !important;
          padding: 12px !important;
        }

        .atlas-location-spec-value {
          font-size: 12.5px !important;
          line-height: 1.55 !important;
        }

        .atlas-location-spec-edit-row {
          grid-template-columns: minmax(0, 1fr) !important;
        }
      }
    `}</style>
  );
}
