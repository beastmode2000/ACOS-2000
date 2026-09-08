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

function dashboardNavigationTarget() {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("button, a, [role='button']")).find(
      (node) =>
        !node.closest("[data-atlas-house-maintenance-host]") &&
        normalized(node.textContent) === "dashboard" &&
        node.offsetParent !== null,
    ) || null
  );
}

function exitHouseMaintenance() {
  clearLegacyDepartmentTakeover();
  const dashboard = dashboardNavigationTarget();
  if (dashboard) {
    dashboard.click();
    return;
  }
  window.location.assign("/?section=dashboard");
}

function ensureHouseEscapeControl() {
  document
    .querySelectorAll<HTMLElement>("[data-atlas-house-maintenance-host]")
    .forEach((host) => {
      if (host.querySelector(":scope > [data-atlas-house-exit-control]")) return;

      const wrapper = document.createElement("div");
      wrapper.dataset.atlasHouseExitControl = "true";
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "flex-end";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "8px";
      wrapper.style.marginBottom = "8px";

      const back = document.createElement("button");
      back.type = "button";
      back.textContent = "Back to Dashboard";
      back.setAttribute("aria-label", "Exit House and Maintenance and return to Dashboard");
      back.style.minHeight = "32px";
      back.style.padding = "5px 10px";
      back.style.borderRadius = "9px";
      back.style.border = "1px solid #D8E0E8";
      back.style.background = "#FFFFFF";
      back.style.color = "#17324D";
      back.style.fontWeight = "800";
      back.style.cursor = "pointer";
      back.addEventListener("click", exitHouseMaintenance);

      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", "Close House and Maintenance");
      close.style.width = "32px";
      close.style.height = "32px";
      close.style.borderRadius = "9px";
      close.style.border = "1px solid #D8E0E8";
      close.style.background = "#FFFFFF";
      close.style.color = "#17324D";
      close.style.fontSize = "20px";
      close.style.lineHeight = "1";
      close.style.fontWeight = "700";
      close.style.cursor = "pointer";
      close.addEventListener("click", exitHouseMaintenance);

      wrapper.append(back, close);
      host.prepend(wrapper);
    });
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
      ensureHouseEscapeControl();
    };

    const scheduleRepair = () => {
      if (!frame) frame = window.requestAnimationFrame(repair);
    };

    const repairSequence = () => {
      scheduleRepair();
      window.setTimeout(scheduleRepair, 0);
      window.setTimeout(scheduleRepair, 50);
      window.setTimeout(scheduleRepair, 150);
      window.setTimeout(scheduleRepair, 350);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-atlas-house-exit-control]")) return;

      if (isDepartmentNavigationTarget(target)) {
        repairSequence();
        return;
      }

      if (target.closest("aside, nav")) {
        clearLegacyDepartmentTakeover();
        repairSequence();
      }
    };

    repairSequence();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", repairSequence);

    const observer = new MutationObserver(() => {
      if (
        document.querySelector("main.atlas-house-maintenance-active") ||
        document.querySelector("[data-atlas-house-maintenance-host]")
      ) {
        scheduleRepair();
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
