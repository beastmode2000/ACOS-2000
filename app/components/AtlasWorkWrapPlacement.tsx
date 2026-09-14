"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function visibleWorkHeading() {
  return Array.from(document.querySelectorAll<HTMLElement>("h1")).find((heading) => {
    if (normalized(heading.textContent) !== "work") return false;
    const style = window.getComputedStyle(heading);
    const rect = heading.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0 &&
      heading.getClientRects().length > 0
    );
  }) || null;
}

export default function AtlasWorkWrapPlacement() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const original = document.querySelector<HTMLButtonElement>(".atlas-week-wrap-launch");
      const heading = visibleWorkHeading();

      for (const stale of Array.from(document.querySelectorAll<HTMLElement>(".atlas-week-wrap-inline-launch"))) {
        if (!heading || !heading.parentElement?.contains(stale)) stale.remove();
      }

      if (!original || !heading?.parentElement) return;

      const header = heading.parentElement;
      let inline = header.querySelector<HTMLButtonElement>(":scope > .atlas-week-wrap-inline-launch");
      if (!inline) {
        inline = document.createElement("button");
        inline.type = "button";
        inline.className = "atlas-week-wrap-inline-launch";
        inline.addEventListener("click", () => {
          const liveOriginal = document.querySelector<HTMLButtonElement>(".atlas-week-wrap-launch");
          liveOriginal?.click();
        });
        header.appendChild(inline);
      }
      inline.textContent = original.textContent || "Week Wrap-Up";
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      for (const node of Array.from(document.querySelectorAll(".atlas-week-wrap-inline-launch"))) {
        node.remove();
      }
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-week-wrap-launch {
        display: none !important;
      }

      .atlas-week-wrap-inline-launch {
        min-height: 34px !important;
        margin-left: auto !important;
        padding: 6px 11px !important;
        border: 1px solid #0b2c43 !important;
        border-radius: 8px !important;
        background: #0b2c43 !important;
        color: #ffffff !important;
        font: inherit !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        box-shadow: none !important;
      }

      @media (max-width: 900px) {
        .atlas-week-wrap-inline-launch {
          min-height: 32px !important;
          padding: 5px 9px !important;
          font-size: 11px !important;
        }
      }
    `}</style>
  );
}
