"use client";

import { useEffect } from "react";

type ReactBackedElement = HTMLElement & Record<string, unknown>;

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dashboardWorkSectionFor(control: Element) {
  const polished = control.closest<HTMLElement>(".atlas-dashboard-polish-work");
  if (polished) return polished;

  let section = control.closest<HTMLElement>("section");
  while (section) {
    const heading = Array.from(section.querySelectorAll<HTMLElement>("h1,h2,h3,strong")).find(
      (node) => normalized(node.textContent) === "work lists",
    );
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
  return dashboardWorkSectionFor(button) ? button : null;
}

function dashboardWorkNoteInput(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement)) return null;
  const isNote =
    target.placeholder === "Add work note" ||
    /^Note for /i.test(String(target.getAttribute("aria-label") || ""));
  if (!isNote) return null;
  return dashboardWorkSectionFor(target) ? target : null;
}

function reactHandler(element: ReactBackedElement, name: "onClick" | "onKeyDown") {
  const propsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
  if (!propsKey) return null;
  const props = element[propsKey] as Record<string, unknown> | undefined;
  const handler = props?.[name];
  return typeof handler === "function" ? (handler as (event: unknown) => unknown) : null;
}

export default function AtlasDashboardWorkNoteEnterFix() {
  useEffect(() => {
    // Run at window capture, before document-level Atlas polish/navigation
    // listeners. Dashboard work-note controls are local actions and must never
    // be interpreted as navigation.
    const isolateDashboardWorkNoteClick = (event: MouseEvent) => {
      const button = dashboardWorkNoteButton(event.target);
      if (!button) return;

      const handler = reactHandler(button as ReactBackedElement, "onClick");
      if (!handler) {
        // If React internals ever change, still stop the bad navigation rather
        // than sending the user to a 404.
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();

      handler({
        currentTarget: button,
        target: button,
        nativeEvent: event,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
      });
    };

    const preventDashboardWorkNoteEnterNavigation = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (!dashboardWorkNoteInput(event.target)) return;

      // The input's React onKeyDown still performs the save. Cancel only the
      // browser/form default so Enter cannot navigate away.
      event.preventDefault();
    };

    window.addEventListener("click", isolateDashboardWorkNoteClick, true);
    window.addEventListener("keydown", preventDashboardWorkNoteEnterNavigation, true);

    return () => {
      window.removeEventListener("click", isolateDashboardWorkNoteClick, true);
      window.removeEventListener("keydown", preventDashboardWorkNoteEnterNavigation, true);
    };
  }, []);

  return null;
}
