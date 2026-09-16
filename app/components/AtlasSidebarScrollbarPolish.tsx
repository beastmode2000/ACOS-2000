"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function isLeftSidebarArea(element: HTMLElement) {
  if (!isVisible(element)) return false;

  const rect = element.getBoundingClientRect();
  if (rect.left > 40) return false;
  if (rect.width < 180 || rect.width > 440) return false;
  if (rect.height < 240) return false;

  const text = normalized(element.textContent);
  const hasAtlasNavigationText = [
    "dashboard",
    "work",
    "calendar",
    "assets",
    "locations",
    "knowledge",
    "manuals",
    "more tools",
    "garage",
    "pool & spa",
    "dock & waterfront",
  ].some((label) => text.includes(label));

  if (hasAtlasNavigationText) return true;

  const style = window.getComputedStyle(element);
  const background = style.backgroundColor.replace(/\s+/g, "");

  return (
    background === "rgb(8,28,51)" ||
    background === "rgb(9,31,53)" ||
    background === "rgb(11,30,51)" ||
    background === "rgb(11,44,67)"
  );
}

function markSidebarScroller() {
  for (const element of Array.from(
    document.querySelectorAll<HTMLElement>(".atlas-sidebar-shell"),
  )) {
    element.classList.remove("atlas-sidebar-shell");
  }

  if (window.innerWidth < 900) return;

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("aside, nav, div, section"),
  ).filter(isLeftSidebarArea);

  if (!candidates.length) return;

  const outermost = candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) => other !== candidate && other.contains(candidate),
      ),
  );

  const pool = outermost.length ? outermost : candidates;
  pool.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return bRect.width * bRect.height - aRect.width * aRect.height;
  });

  pool[0]?.classList.add("atlas-sidebar-shell");
}

export default function AtlasSidebarScrollbarPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      markSidebarScroller();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 900px) {
        .atlas-sidebar-shell {
          height: 100dvh !important;
          min-height: 0 !important;
          max-height: 100dvh !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: contain !important;
          scrollbar-gutter: stable !important;
          box-sizing: border-box !important;
          padding-bottom: 28px !important;
        }

        .atlas-sidebar-shell > *,
        .atlas-sidebar-shell nav,
        .atlas-sidebar-shell section,
        .atlas-sidebar-shell div {
          max-height: none !important;
        }

        .atlas-sidebar-shell nav,
        .atlas-sidebar-shell section {
          overflow-y: visible !important;
        }
      }
    `}</style>
  );
}
