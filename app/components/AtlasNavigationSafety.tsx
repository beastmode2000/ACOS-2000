"use client";

import { useEffect } from "react";

const DEPARTMENT_LABELS = [
  "house & maintenance",
  "house and maintenance",
  "garage",
  "garage / vehicles",
  "vehicles",
  "dock & marine",
  "dock and marine",
  "dock & waterfront",
  "pool & spa",
  "landscape",
  "landscaping",
  "landscaping & irrigation",
  "landscaping and irrigation",
];

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9&/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDepartmentNavigationTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const control = target.closest<HTMLElement>("button, a, [role='button']");
  if (!control) return false;
  const text = normalized(control.textContent);
  if (!text) return false;
  return DEPARTMENT_LABELS.some((label) => text === label || text.startsWith(`${label} `));
}

function clearLegacyDepartmentTakeover() {
  for (const main of Array.from(document.querySelectorAll<HTMLElement>("main"))) {
    main.classList.remove("atlas-house-maintenance-active");

    for (const child of Array.from(main.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.dataset.atlasHouseMaintenanceHost === "true") {
        child.remove();
        continue;
      }

      if (child.style.display === "none" && child.classList.contains("atlas-vendor-force-hidden")) {
        continue;
      }
    }
  }

  document
    .querySelectorAll<HTMLElement>("[data-atlas-house-maintenance-host]")
    .forEach((node) => node.remove());
}

function ensureVisibleAtlasMain() {
  clearLegacyDepartmentTakeover();

  const mains = Array.from(document.querySelectorAll<HTMLElement>("main"));
  for (const main of mains) {
    const rect = main.getBoundingClientRect();
    if (rect.width <= 0) continue;

    const children = Array.from(main.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const visibleChild = children.some((child) => {
      if (child.dataset.atlasHouseMaintenanceHost === "true") return false;
      const style = window.getComputedStyle(child);
      return style.display !== "none" && style.visibility !== "hidden";
    });

    if (!visibleChild && children.length) {
      main.classList.remove("atlas-house-maintenance-active");
    }
  }
}

export default function AtlasNavigationSafety() {
  useEffect(() => {
    let frame = 0;

    const repair = () => {
      frame = 0;
      ensureVisibleAtlasMain();
    };

    const scheduleRepair = () => {
      if (!frame) frame = window.requestAnimationFrame(repair);
    };

    const repairSequence = () => {
      clearLegacyDepartmentTakeover();
      scheduleRepair();
      window.setTimeout(scheduleRepair, 0);
      window.setTimeout(scheduleRepair, 50);
      window.setTimeout(scheduleRepair, 150);
      window.setTimeout(scheduleRepair, 350);
    };

    const onClick = (event: MouseEvent) => {
      if (isDepartmentNavigationTarget(event.target)) {
        repairSequence();
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("aside, nav")) repairSequence();
    };

    repairSequence();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", repairSequence);

    const observer = new MutationObserver(() => {
      if (document.querySelector("main.atlas-house-maintenance-active")) {
        repairSequence();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", repairSequence);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
