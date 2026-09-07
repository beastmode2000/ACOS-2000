"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function looksLikeSidebar(element: HTMLElement) {
  const text = normalized(element.textContent);
  if (!text.includes("knowledge") || !text.includes("more tools")) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 180 || rect.width > 420 || rect.height < 260) return false;

  return true;
}

function markSidebarScroller() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("aside, nav, div"),
  ).filter((element) => {
    if (!looksLikeSidebar(element)) return false;

    const style = window.getComputedStyle(element);
    const scrollable = /auto|scroll/.test(style.overflowY) || element.scrollHeight > element.clientHeight + 8;

    return scrollable;
  });

  if (!candidates.length) return;

  candidates.sort((a, b) => {
    const aArea = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
    const bArea = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
    return aArea - bArea;
  });

  candidates[0]?.classList.add("atlas-sidebar-scrollbar-hidden");
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
      attributes: true,
    });

    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-sidebar-scrollbar-hidden {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      .atlas-sidebar-scrollbar-hidden::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
      }
    `}</style>
  );
}
