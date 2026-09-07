"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function locationsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "locations",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function markLocationsViewport() {
  const root = locationsMain();
  if (!root) return;

  root.classList.add("atlas-locations-viewport-root");

  const search = root.querySelector<HTMLInputElement>(
    'input[placeholder*="Search locations" i]',
  );
  if (search) search.classList.add("atlas-locations-compact-search");

  const cards = Array.from(
    root.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"),
  );

  for (const card of cards) {
    card.classList.add("atlas-location-compact-row");
    const button = card.querySelector<HTMLButtonElement>("button");
    button?.classList.add("atlas-location-compact-main");
  }
}

export default function AtlasLocationsViewportPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        markLocationsViewport();
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
        .atlas-locations-viewport-root .atlas-locations-compact-search {
          min-height: 34px !important;
          height: 34px !important;
        }

        .atlas-locations-viewport-root .atlas-location-compact-row {
          min-height: 0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
        }

        .atlas-locations-viewport-root .atlas-location-compact-main {
          min-height: 58px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
      }
    `}</style>
  );
}
