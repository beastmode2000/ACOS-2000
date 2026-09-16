"use client";

import { useEffect } from "react";

export default function AtlasDashboardWorkNoteEnterFix() {
  useEffect(() => {
    const isDashboardWorkNoteInput = (target: EventTarget | null) => {
      if (!(target instanceof HTMLInputElement)) return false;
      return (
        target.placeholder === "Add work note" ||
        /^Note for /i.test(String(target.getAttribute("aria-label") || ""))
      );
    };

    const isDashboardWorkNoteControl = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      if (isDashboardWorkNoteInput(target)) return true;
      const button = target.closest("button");
      const label = String(button?.textContent || "").trim();
      return label === "Add Note" || label === "Save Note";
    };

    const preventDashboardWorkNoteSubmit = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (!isDashboardWorkNoteInput(event.target)) return;

      // Let the dashboard React handler save the note, but block any inherited
      // form/link default that can navigate away to a 404.
      event.preventDefault();
    };

    const preventDashboardWorkNoteNavigation = (event: MouseEvent) => {
      if (!isDashboardWorkNoteControl(event.target)) return;

      // Add Note / Save Note live inside a clickable work row. Keep the control's
      // own React handler, but cancel any browser default inherited from a parent
      // link/form so the dashboard stays in place instead of navigating to 404.
      event.preventDefault();
    };

    document.addEventListener("keydown", preventDashboardWorkNoteSubmit, true);
    document.addEventListener("click", preventDashboardWorkNoteNavigation, true);

    return () => {
      document.removeEventListener("keydown", preventDashboardWorkNoteSubmit, true);
      document.removeEventListener("click", preventDashboardWorkNoteNavigation, true);
    };
  }, []);

  return null;
}
