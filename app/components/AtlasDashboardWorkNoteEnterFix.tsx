"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dashboardWorkSection(control: Element) {
  let section = control.closest<HTMLElement>("section");
  while (section) {
    const heading = Array.from(
      section.querySelectorAll<HTMLElement>("h1,h2,h3,strong"),
    ).find((node) => normalized(node.textContent) === "work lists");
    if (heading) return section;
    section = section.parentElement?.closest<HTMLElement>("section") || null;
  }
  return null;
}

function removeDashboardWorkNoteControls() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

  for (const button of buttons) {
    if (!dashboardWorkSection(button)) continue;
    const label = String(button.textContent || "").trim();
    if (label === "Add Note" || label === "Save Note") {
      button.style.display = "none";
    }
  }

  const noteInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[placeholder="Add work note"]'),
  );

  for (const input of noteInputs) {
    if (!dashboardWorkSection(input)) continue;
    const wrapper = input.parentElement as HTMLElement | null;
    if (wrapper) wrapper.style.display = "none";
  }
}

export default function AtlasDashboardWorkNoteEnterFix() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        removeDashboardWorkNoteControls();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
