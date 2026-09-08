"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buttonLabels(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
    .map((button) => normalized(button.textContent))
    .filter(Boolean);
}

function findDashboardWorkCard(button: HTMLButtonElement) {
  let current: HTMLElement | null = button.parentElement;

  while (current && current !== document.body) {
    const labels = buttonLabels(current);
    const isDailyWorkCard =
      labels.includes("done") &&
      labels.includes("didn’t get to it") &&
      labels.includes("reschedule");
    const isOperationsWorkCard =
      labels.includes("complete") &&
      labels.includes("move +1d");

    if (isDailyWorkCard || isOperationsWorkCard) return current;
    current = current.parentElement;
  }

  return null;
}

export default function AtlasWorkCompletionSpeed() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;

      const label = normalized(button.textContent);
      if (label !== "done" && label !== "complete") return;

      const card = findDashboardWorkCard(button);
      if (!card || card.dataset.atlasOptimisticCompleting === "true") return;

      card.dataset.atlasOptimisticCompleting = "true";
      card.classList.add("atlas-work-completing-now");

      window.setTimeout(() => {
        if (!card.isConnected) return;
        card.classList.remove("atlas-work-completing-now");
        delete card.dataset.atlasOptimisticCompleting;
      }, 8000);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <style jsx global>{`
      .atlas-work-completing-now {
        opacity: 0 !important;
        max-height: 0 !important;
        min-height: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        border-width: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
        transition:
          opacity 90ms ease,
          max-height 120ms ease,
          margin 120ms ease,
          padding 120ms ease !important;
      }
    `}</style>
  );
}
