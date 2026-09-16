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

function dashboardWorkNoteButton(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return null;
  const label = String(button.textContent || "").trim();
  if (label !== "Add Note" && label !== "Save Note") return null;
  return dashboardWorkSection(button) ? button : null;
}

function getReactClickHandler(button: HTMLButtonElement) {
  const anyButton = button as any;
  const propsKey = Object.keys(anyButton).find((key) => key.startsWith("__reactProps$"));
  const handler = propsKey ? anyButton[propsKey]?.onClick : null;
  return typeof handler === "function" ? handler : null;
}

export default function AtlasDashboardWorkNoteEnterFix() {
  useEffect(() => {
    const protectDashboardWorkNote = (event: MouseEvent) => {
      const button = dashboardWorkNoteButton(event.target);
      if (!button) return;

      const handler = getReactClickHandler(button);

      // This is the Dashboard > Work Lists Add Note / Save Note control only.
      // It is a local UI action and must never be allowed to bubble into Atlas
      // navigation or other document-level click handlers.
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();

      if (!handler) return;

      handler({
        currentTarget: button,
        target: button,
        nativeEvent: event,
        preventDefault() {},
        stopPropagation() {},
      });
    };

    window.addEventListener("click", protectDashboardWorkNote, true);
    return () => window.removeEventListener("click", protectDashboardWorkNote, true);
  }, []);

  return null;
}
