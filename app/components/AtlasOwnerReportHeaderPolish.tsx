"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function ownerReportMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === "owner report",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

export default function AtlasOwnerReportHeaderPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const root = ownerReportMain();
      if (!root) return;

      root.classList.add("atlas-owner-report-compact-root");

      const heading = Array.from(root.querySelectorAll<HTMLElement>("h1, h2")).find(
        (node) => normalized(node.textContent) === "owner report",
      );
      if (!heading) return;

      heading.classList.add("atlas-owner-report-compact-title");

      const header = (heading.closest("header") as HTMLElement | null) || heading.parentElement;
      if (header) {
        header.classList.add("atlas-owner-report-compact-header");
        const next = header.nextElementSibling as HTMLElement | null;
        next?.classList.add("atlas-owner-report-compact-first-content");
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-owner-report-compact-root {
        padding-top: 0 !important;
      }

      .atlas-owner-report-compact-header {
        min-height: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        border-bottom-width: 1px !important;
      }

      .atlas-owner-report-compact-title {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        line-height: 1.15 !important;
      }

      .atlas-owner-report-compact-first-content {
        margin-top: 0 !important;
        padding-top: 8px !important;
      }

      @media (max-width: 900px) {
        .atlas-owner-report-compact-header {
          padding-top: 4px !important;
          padding-bottom: 5px !important;
        }

        .atlas-owner-report-compact-first-content {
          padding-top: 6px !important;
        }
      }
    `}</style>
  );
}
