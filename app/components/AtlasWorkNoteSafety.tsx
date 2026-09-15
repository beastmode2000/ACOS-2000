"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findNativeWorkNoteInput(panel: HTMLElement) {
  const direct = Array.from(panel.querySelectorAll<HTMLInputElement>("input")).find((input) =>
    normalized(input.placeholder).includes("work note"),
  );
  if (direct) return direct;

  const notesHeading = Array.from(panel.querySelectorAll<HTMLElement>("strong, h2, h3, h4")).find((heading) => {
    const value = normalized(heading.textContent);
    return value === "notes" || value === "work notes";
  });
  const notesSection = notesHeading?.closest<HTMLElement>("section");
  if (!notesSection) return null;

  return (
    Array.from(notesSection.querySelectorAll<HTMLInputElement>("input")).find((input) =>
      /note/i.test(input.placeholder || ""),
    ) || null
  );
}

function repairAddNoteShortcut() {
  const panel = document.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;

  const current = panel.querySelector<HTMLButtonElement>(".atlas-work-mx-note-action");
  if (!current || current.dataset.atlasWorkNoteSafe === "true") return;

  // Clone the MaintainX shortcut so its old click listener is removed, then
  // bind it only to Atlas's native Work-note input. It must never focus a
  // completion/description textarea as a fallback.
  const safeButton = current.cloneNode(true) as HTMLButtonElement;
  safeButton.dataset.atlasWorkNoteSafe = "true";
  safeButton.type = "button";
  safeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const input = findNativeWorkNoteInput(panel);
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input.focus(), 120);
  });

  current.replaceWith(safeButton);
}

export default function AtlasWorkNoteSafety() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        repairAddNoteShortcut();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
