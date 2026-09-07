"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function vendorMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "vendors",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function isScrollable(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 4;
}

function clearVendorScrollbarMarks() {
  for (const element of Array.from(
    document.querySelectorAll<HTMLElement>(".atlas-vendor-outer-scroll-suppressed"),
  )) {
    element.classList.remove("atlas-vendor-outer-scroll-suppressed");
  }
}

function fixVendorScrollbars() {
  clearVendorScrollbarMarks();

  if (window.innerWidth <= 900) return;
  const root = vendorMain();
  if (!root) return;

  const rootRect = root.getBoundingClientRect();
  const midpoint = rootRect.left + rootRect.width * 0.45;

  const rightScrollers = Array.from(
    root.querySelectorAll<HTMLElement>("div, section, article"),
  ).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 240 && rect.left >= midpoint && isScrollable(element);
  });

  if (rightScrollers.length < 2) return;

  const nestedPairs = rightScrollers.flatMap((outer) =>
    rightScrollers
      .filter((inner) => inner !== outer && outer.contains(inner))
      .map((inner) => ({ outer, inner })),
  );

  if (!nestedPairs.length) return;

  // Keep the innermost detail pane as the one intentional scrollbar.
  // Suppress only scrollable ancestors that wrap that pane.
  const innermost = rightScrollers.find(
    (candidate) =>
      !rightScrollers.some(
        (other) => other !== candidate && candidate.contains(other),
      ),
  );

  if (!innermost) return;

  for (const ancestor of rightScrollers) {
    if (ancestor !== innermost && ancestor.contains(innermost)) {
      ancestor.classList.add("atlas-vendor-outer-scroll-suppressed");
    }
  }
}

export default function AtlasVendorScrollbarPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        fixVendorScrollbars();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      clearVendorScrollbarMarks();
    };
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 901px) {
        .atlas-vendor-outer-scroll-suppressed {
          overflow-y: hidden !important;
          overscroll-behavior-y: none !important;
          scrollbar-gutter: auto !important;
        }
      }
    `}</style>
  );
}
