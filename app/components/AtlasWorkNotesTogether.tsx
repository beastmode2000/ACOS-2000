"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function applyNotesLayout() {
  const panel = document.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;

  const descriptionLabel = Array.from(panel.querySelectorAll<HTMLElement>("span")).find(
    (element) => normalized(element.textContent) === "description / what to do",
  );
  const descriptionCard = descriptionLabel?.parentElement as HTMLElement | null;

  // Edit mode owns a real textarea and should remain untouched.
  if (!descriptionCard || descriptionCard.querySelector("textarea, input, select")) return;

  const descriptionValue = Array.from(descriptionCard.children).find(
    (child) => child !== descriptionLabel && child instanceof HTMLElement,
  ) as HTMLElement | undefined;
  const descriptionText = String(descriptionValue?.textContent || "").trim();
  const hasMainNote = Boolean(descriptionText && descriptionText !== "No description added.");

  const notesHeading = Array.from(panel.querySelectorAll<HTMLElement>("strong")).find((element) => {
    const value = normalized(element.textContent);
    return value === "work notes" || value === "notes";
  });
  const notesSection = notesHeading?.closest<HTMLElement>("section") || null;
  if (!notesSection) return;

  descriptionCard.style.display = "none";

  let mainNote = notesSection.querySelector<HTMLElement>("[data-atlas-main-work-note]");
  if (!hasMainNote) {
    mainNote?.remove();
    return;
  }

  if (!mainNote) {
    mainNote = document.createElement("div");
    mainNote.setAttribute("data-atlas-main-work-note", "true");
    Object.assign(mainNote.style, {
      borderTop: "1px solid #D8E0E8",
      paddingTop: "7px",
      marginTop: "9px",
      display: "grid",
      gap: "3px",
    });

    const label = document.createElement("div");
    label.textContent = "Main note";
    Object.assign(label.style, {
      fontSize: "10.5px",
      fontWeight: "800",
      letterSpacing: ".03em",
      textTransform: "uppercase",
      color: "#667085",
    });

    const body = document.createElement("div");
    body.setAttribute("data-atlas-main-work-note-text", "true");
    Object.assign(body.style, {
      fontSize: "12.5px",
      lineHeight: "1.45",
      whiteSpace: "pre-wrap",
      color: "#1D2939",
    });

    mainNote.append(label, body);

    const noteInput = Array.from(notesSection.querySelectorAll<HTMLInputElement>("input")).find(
      (input) => normalized(input.placeholder).startsWith("add a work note"),
    );
    const addRow = noteInput?.parentElement as HTMLElement | null;
    if (addRow) addRow.insertAdjacentElement("afterend", mainNote);
    else notesSection.appendChild(mainNote);
  }

  const mainNoteText = mainNote.querySelector<HTMLElement>("[data-atlas-main-work-note-text]");
  if (mainNoteText && mainNoteText.textContent !== descriptionText) {
    mainNoteText.textContent = descriptionText;
  }

  const count = notesHeading?.parentElement?.querySelector<HTMLElement>("span");
  if (count && /\bsaved\b/i.test(String(count.textContent || ""))) {
    const saved = Number(String(count.textContent || "").match(/\d+/)?.[0] || 0);
    count.textContent = `${saved + 1} note${saved + 1 === 1 ? "" : "s"}`;
  }
}

export default function AtlasWorkNotesTogether() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyNotesLayout);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener("atlas:data-changed", schedule as EventListener);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
    };
  }, []);

  return null;
}
