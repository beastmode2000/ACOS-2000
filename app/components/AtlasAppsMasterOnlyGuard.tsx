"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function isAppsControl(element: HTMLElement) {
  const text = normalized(element.textContent);
  return text === "apps" || text === "edit apps" || text === "+ add app";
}

function hideAppsControls() {
  const controls = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role='button']"),
  );

  controls.forEach((element) => {
    if (!isAppsControl(element)) return;
    element.style.setProperty("display", "none", "important");
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("tabindex", "-1");
  });
}

function moveAwayFromAppsScreen() {
  const appDetail = Array.from(
    document.querySelectorAll<HTMLElement>("p, div, span"),
  ).find((element) =>
    normalized(element.textContent).includes(
      "open estate systems, portals, and tools from one organized launcher",
    ),
  );

  if (!appDetail) return;

  const appsSection = appDetail.closest<HTMLElement>("section");
  if (appsSection) {
    appsSection.style.setProperty("display", "none", "important");
  }

  const dashboardButton = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  ).find(
    (button) => normalized(button.textContent) === "dashboard" && isVisible(button),
  );

  dashboardButton?.click();
}

export default function AtlasAppsMasterOnlyGuard() {
  useEffect(() => {
    let disposed = false;
    let allowApps: boolean | null = null;
    let frame = 0;

    const apply = () => {
      frame = 0;
      if (allowApps !== false) return;
      hideAppsControls();
      moveAwayFromAppsScreen();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const blockAppsClick = (event: Event) => {
      if (allowApps !== false) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>("button, a, [role='button']");
      if (!control || !isAppsControl(control)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      moveAwayFromAppsScreen();
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });

    document.addEventListener("click", blockAppsClick, true);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    fetch("/api/atlas-session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to read Atlas session");
        return response.json();
      })
      .then((payload) => {
        if (disposed) return;
        allowApps = payload?.isMaster === true;
        document.documentElement.dataset.atlasAppsAccess = allowApps
          ? "master"
          : "restricted";
        schedule();
      })
      .catch(() => {
        if (disposed) return;
        // Fail closed. If Atlas cannot verify Master access, Apps stays hidden.
        allowApps = false;
        document.documentElement.dataset.atlasAppsAccess = "restricted";
        schedule();
      });

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("click", blockAppsClick, true);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
      delete document.documentElement.dataset.atlasAppsAccess;
    };
  }, []);

  return null;
}
