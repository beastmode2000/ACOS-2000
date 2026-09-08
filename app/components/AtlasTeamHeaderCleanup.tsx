"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function cleanupDuplicateTeamHeader() {
  const main = Array.from(document.querySelectorAll<HTMLElement>("main")).find((candidate) => {
    const headings = Array.from(candidate.querySelectorAll<HTMLElement>("h1"));
    return headings.some((heading) => normalized(heading.textContent) === "team");
  });

  if (!main) return;

  const teamHeadings = Array.from(main.querySelectorAll<HTMLElement>("h1")).filter(
    (heading) => normalized(heading.textContent) === "team",
  );

  if (teamHeadings.length < 2) return;

  for (const heading of teamHeadings.slice(1)) {
    let container = heading.parentElement as HTMLElement | null;
    if (!container) continue;

    const text = normalized(container.textContent);
    const hasInteractiveContent = Boolean(container.querySelector("button, input, select, textarea, a"));

    if (
      !hasInteractiveContent &&
      (text === "team" || text.startsWith("teammanage people"))
    ) {
      container.style.setProperty("display", "none", "important");
      container.setAttribute("aria-hidden", "true");
      continue;
    }

    heading.style.setProperty("display", "none", "important");
    heading.setAttribute("aria-hidden", "true");

    const next = heading.nextElementSibling;
    if (
      next instanceof HTMLElement &&
      next.tagName.toLowerCase() === "p" &&
      normalized(next.textContent).startsWith("manage people")
    ) {
      next.style.setProperty("display", "none", "important");
      next.setAttribute("aria-hidden", "true");
    }
  }
}

export default function AtlasTeamHeaderCleanup() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        cleanupDuplicateTeamHeader();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
