"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function workMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "work",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function cleanInjectedAssetControl(root: HTMLElement) {
  for (const host of Array.from(root.querySelectorAll<HTMLElement>(".atlas-work-asset-quick-link"))) {
    host.remove();
  }
}

function cleanEditHeader(root: HTMLElement) {
  const editHeading = Array.from(root.querySelectorAll<HTMLElement>("h2,h3,h4,strong,div")).find(
    (node) => normalized(node.textContent) === "edit work",
  );
  if (!editHeading) return;

  const headingRect = editHeading.getBoundingClientRect();
  const panel = editHeading.closest<HTMLElement>("section,article,[data-atlas-work-detail-panel]") || root;

  for (const element of Array.from(panel.querySelectorAll<HTMLElement>("button,span,div"))) {
    if (element === editHeading || element.contains(editHeading)) continue;
    if (element.querySelector("input,select,textarea")) continue;
    if (normalized(element.textContent) !== "scan") continue;

    const rect = element.getBoundingClientRect();
    if (Math.abs(rect.top - headingRect.top) <= 90) {
      element.remove();
    }
  }
}

function applyCleanup() {
  const root = workMain();
  if (!root) return;
  cleanInjectedAssetControl(root);
  cleanEditHeader(root);
}

export default function AtlasWorkEditCleanup() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyCleanup();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-work-polish-root .atlas-work-asset-quick-link {
        display: none !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] {
        min-width: 0 !important;
        overflow-x: hidden !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] > * {
        max-width: 100% !important;
        min-width: 0 !important;
      }
    `}</style>
  );
}
