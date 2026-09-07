"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function applyLocationRowSizing() {
  if (window.innerWidth <= 900) return;

  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "locations",
  );
  const root = (heading?.closest("main") as HTMLElement | null) || null;
  if (!root) return;

  for (const card of Array.from(
    root.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"),
  )) {
    card.style.setProperty("min-height", "58px", "important");
    card.style.setProperty("height", "58px", "important");
    card.style.setProperty("max-height", "58px", "important");
    card.style.setProperty("overflow", "hidden", "important");

    const mainButton = Array.from(card.children).find(
      (child) => child instanceof HTMLButtonElement,
    ) as HTMLButtonElement | undefined;

    if (!mainButton) continue;

    mainButton.style.setProperty("min-height", "58px", "important");
    mainButton.style.setProperty("height", "58px", "important");
    mainButton.style.setProperty("max-height", "58px", "important");
    mainButton.style.setProperty("padding-top", "6px", "important");
    mainButton.style.setProperty("padding-bottom", "6px", "important");
    mainButton.style.setProperty("box-sizing", "border-box", "important");
    mainButton.style.setProperty("overflow", "hidden", "important");
  }
}

export default function AtlasLocationsViewportPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyLocationRowSizing();
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

  return null;
}
