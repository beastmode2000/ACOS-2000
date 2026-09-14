"use client";

import { useEffect } from "react";

export default function AtlasDashboardWorkNoteEnterFix() {
  useEffect(() => {
    const preventDashboardWorkNoteSubmit = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      const isDashboardWorkNote =
        target.placeholder === "Add work note" ||
        /^Note for /i.test(String(target.getAttribute("aria-label") || ""));

      if (!isDashboardWorkNote) return;

      // The dashboard's React handler still receives Enter and saves the note.
      // Prevent only the browser/form default that can navigate to a 404.
      event.preventDefault();
    };

    document.addEventListener("keydown", preventDashboardWorkNoteSubmit, true);
    return () => document.removeEventListener("keydown", preventDashboardWorkNoteSubmit, true);
  }, []);

  return null;
}
