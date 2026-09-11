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

function isScrollable(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return (
    /auto|scroll/.test(style.overflowY) ||
    element.scrollHeight > element.clientHeight + 4
  );
}

function sizeDesktopSidebar(root: HTMLElement) {
  if (window.innerWidth < 900) {
    root.style.removeProperty("min-height");
    root.style.removeProperty("height");
    root.style.removeProperty("max-height");
    return;
  }

  const rect = root.getBoundingClientRect();
  const visibleHeight = Math.max(320, Math.round(window.innerHeight - Math.max(0, rect.top)));
  const height = `${visibleHeight}px`;

  root.style.setProperty("min-height", height, "important");
  root.style.setProperty("height", height, "important");
  root.style.setProperty("max-height", height, "important");
}

function markSidebarScrollers() {
  const previouslyMarked = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".atlas-sidebar-shell, .atlas-sidebar-scrollbar-hidden",
    ),
  );

  for (const element of previouslyMarked) {
    element.classList.remove(
      "atlas-sidebar-shell",
      "atlas-sidebar-scrollbar-hidden",
    );
    element.style.removeProperty("min-height");
    element.style.removeProperty("height");
    element.style.removeProperty("max-height");
  }

  // The mobile shell has its own navigation and scrolling behavior. Never
  // classify or resize mobile containers as the desktop sidebar.
  if (window.innerWidth < 900) return;

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("aside, nav, div, section"),
  );

  const candidates = elements.filter(isLeftSidebarArea);
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

  const root = pool[0];
  if (!root) return;

  root.classList.add("atlas-sidebar-shell");
  sizeDesktopSidebar(root);

  if (isScrollable(root)) {
    root.classList.add("atlas-sidebar-scrollbar-hidden");
  }
}

export default function AtlasSidebarScrollbarPolish() {
  useEffect(() => {
    let frame = 0;
    let interval = 0;

    const apply = () => {
      frame = 0;
      markSidebarScrollers();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });

    const onNavigation = () => {
      schedule();
      window.setTimeout(schedule, 0);
      window.setTimeout(schedule, 80);
      window.setTimeout(schedule, 250);
    };

    document.addEventListener("click", onNavigation, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", onNavigation);
    window.addEventListener("atlas:data-changed", onNavigation as EventListener);

    interval = window.setInterval(schedule, 1000);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onNavigation, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", onNavigation);
      window.removeEventListener("atlas:data-changed", onNavigation as EventListener);
      window.clearInterval(interval);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 900px) {
        .atlas-sidebar-shell,
        .atlas-sidebar-shell *,
        .atlas-sidebar-scrollbar-hidden {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

      .atlas-sidebar-shell {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        overscroll-behavior: contain;
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

        .atlas-sidebar-shell::-webkit-scrollbar,
        .atlas-sidebar-shell *::-webkit-scrollbar,
        .atlas-sidebar-scrollbar-hidden::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
      }
    `}</style>
  );
}
