"use client";

import { useEffect } from "react";

function clean(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalized(value: unknown) {
  return clean(value).toLowerCase();
}

function visible(element: HTMLElement | null) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function visibleScreenTitle() {
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("main h1, main h2"),
  ).find(visible);
  return normalized(heading?.textContent);
}

function mobileBottomNav() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("nav"))
    .filter(visible)
    .map((nav) => {
      const labels = Array.from(nav.querySelectorAll<HTMLElement>("button, a"))
        .map((control) => normalized(control.textContent))
        .filter(Boolean);
      const score =
        (labels.includes("dashboard") || labels.includes("today") ? 100 : 0) +
        ["work", "assets", "calendar"].filter((label) => labels.includes(label)).length * 100 +
        (labels.includes("more") || labels.includes("locations") ? 100 : 0);
      return { nav, score };
    })
    .filter((candidate) => candidate.score >= 500)
    .sort((left, right) => {
      const leftFixed = window.getComputedStyle(left.nav).position === "fixed" ? 1 : 0;
      const rightFixed = window.getComputedStyle(right.nav).position === "fixed" ? 1 : 0;
      return rightFixed - leftFixed;
    });

  return candidates[0]?.nav || null;
}

function nativeNavigationTarget(label: string) {
  const wanted = normalized(label);
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "aside button, aside a, nav button, nav a, [role='navigation'] button, [role='navigation'] a",
      ),
    ).find((control) => {
      if (control.closest(".atlas-mobile-unified-nav")) return false;
      return normalized(control.textContent) === wanted;
    }) || null
  );
}

function markBottomNavigation() {
  const nav = mobileBottomNav();
  if (!nav) return;
  nav.classList.add("atlas-mobile-unified-nav");

  const navClasses = [
    "atlas-mobile-nav-dashboard",
    "atlas-mobile-nav-work",
    "atlas-mobile-nav-assets",
    "atlas-mobile-nav-locations",
    "atlas-mobile-nav-calendar",
  ];
  const aliases: Record<string, string> = {
    today: "dashboard",
    dashboard: "dashboard",
    work: "work",
    assets: "assets",
    locations: "locations",
    calendar: "calendar",
    more: "locations",
  };

  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("button"));
  for (const button of buttons) {
    const original = normalized(
      button.dataset.atlasMobileOriginalLabel || button.textContent,
    );
    if (!button.dataset.atlasMobileOriginalLabel) {
      button.dataset.atlasMobileOriginalLabel = original;
    }

    const key = aliases[original];
    if (!key) continue;
    const expectedClass = `atlas-mobile-nav-${key}`;

    for (const className of navClasses) {
      if (className !== expectedClass && button.classList.contains(className)) {
        button.classList.remove(className);
      }
    }
    if (!button.classList.contains(expectedClass)) {
      button.classList.add(expectedClass);
    }

    if (original === "more") {
      if (clean(button.textContent) !== "Locations") {
        button.textContent = "Locations";
      }
      if (button.dataset.atlasMobileLocationBound !== "true") {
        button.dataset.atlasMobileLocationBound = "true";
        button.addEventListener(
          "click",
          (event) => {
            if (window.innerWidth > 900) return;
            const target = nativeNavigationTarget("Locations");
            if (!target) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            target.click();
          },
          true,
        );
      }
    }
  }

  const screen = visibleScreenTitle();
  const activeKey =
    screen === "dashboard" || screen === "today"
      ? "dashboard"
      : screen === "work"
        ? "work"
        : screen === "assets"
          ? "assets"
          : screen === "locations"
            ? "locations"
            : screen === "calendar"
              ? "calendar"
              : "";

  for (const key of ["dashboard", "work", "assets", "locations", "calendar"]) {
    const button = nav.querySelector<HTMLButtonElement>(`.atlas-mobile-nav-${key}`);
    if (!button) continue;
    const nextActive = activeKey === key ? "true" : "false";
    if (button.dataset.active !== nextActive) button.dataset.active = nextActive;
  }
}

function commonParent(elements: HTMLElement[], stop: HTMLElement) {
  if (!elements.length) return null;
  let node: HTMLElement | null = elements[0].parentElement;
  while (node && node !== stop) {
    if (elements.every((element) => node?.contains(element))) return node;
    node = node.parentElement;
  }
  return null;
}

function calendarMain() {
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("main h1, main h2"),
  ).find((node) => visible(node) && normalized(node.textContent) === "calendar");
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function markCalendar() {
  const root = calendarMain();
  if (!root) return;
  root.classList.add("atlas-mobile-calendar-root");

  const controls = Array.from(root.querySelectorAll<HTMLElement>("button, summary"));
  const byText = (label: string) =>
    controls.find((control) => normalized(control.textContent) === normalized(label)) || null;

  const previous = byText("Previous");
  const today = byText("Today");
  const next = byText("Next");
  if (previous && today && next) {
    const parent = commonParent([previous, today, next], root);
    if (parent) {
      parent.classList.add("atlas-mobile-calendar-period-controls");
      parent.parentElement?.classList.add("atlas-mobile-calendar-heading-row");
    }
  }

  const month = byText("Month");
  const add = byText("+ Add");
  const upcoming = byText("Upcoming");
  const filters =
    controls.find((control) => normalized(control.textContent).startsWith("filters")) || null;
  const toolElements = [month, add, upcoming, filters].filter(Boolean) as HTMLElement[];
  const tools = commonParent(toolElements, root);
  if (!tools) return;

  tools.classList.add("atlas-mobile-calendar-tools");
  month?.classList.add("atlas-mobile-calendar-month");
  upcoming?.classList.add("atlas-mobile-calendar-upcoming");
  add?.closest("details")?.classList.add("atlas-mobile-calendar-add");
  filters?.closest("details")?.classList.add("atlas-mobile-calendar-filters");

  tools
    .querySelector<HTMLInputElement>('input[type="search"]')
    ?.classList.add("atlas-mobile-calendar-search");

  const quick = Array.from(tools.querySelectorAll<HTMLSelectElement>("select")).find(
    (select) =>
      Array.from(select.options).some((option) => normalized(option.value) === "events") &&
      Array.from(select.options).some((option) => normalized(option.value) === "work"),
  );
  quick?.classList.add("atlas-mobile-calendar-quick-filter");
}

function scrollContainer(start: HTMLElement | null) {
  let node = start;
  while (node && node !== document.body) {
    if (/(auto|scroll)/.test(window.getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

function markWorkDetail() {
  const panel = Array.from(
    document.querySelectorAll<HTMLElement>("[data-atlas-work-detail-panel]"),
  ).find(visible);
  if (!panel) return;

  panel.classList.add("atlas-mobile-work-detail-panel");
  const dialog = panel.closest<HTMLElement>('[role="dialog"]');
  if (!dialog) return;
  dialog.classList.add("atlas-mobile-work-detail-dialog");

  const sharedClose = dialog.querySelector<HTMLElement>('button[aria-label="Close details"]');
  const firstChild = panel.firstElementChild;
  if (sharedClose && firstChild instanceof HTMLElement) {
    firstChild.classList.add("atlas-mobile-work-duplicate-nav");
  }

  const key = clean(
    dialog.getAttribute("aria-label") || panel.querySelector("h2")?.textContent || "work-detail",
  );
  if (dialog.dataset.atlasMobileWorkScrollKey === key) return;
  dialog.dataset.atlasMobileWorkScrollKey = key;

  const scroller = scrollContainer(panel.parentElement);
  window.requestAnimationFrame(() => {
    if (!scroller) return;
    scroller.scrollTop = 0;
    scroller.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function markOwnerReport() {
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("main h1, main h2"),
  ).find((node) => visible(node) && /^owners? report$/i.test(clean(node.textContent)));
  const root = heading?.closest<HTMLElement>("main");
  if (!root) return;

  root.classList.add("atlas-mobile-owner-report-root");
  const sharedHeading = Array.from(root.querySelectorAll<HTMLElement>("h2")).find(
    (node) => normalized(node.textContent) === "owners report",
  );
  sharedHeading
    ?.closest<HTMLElement>("section")
    ?.classList.add("atlas-mobile-owner-report-shared");
}

function applyMobilePresentation() {
  if (window.innerWidth > 900) return;
  document.documentElement.classList.add("atlas-mobile-unified-active");
  document.body.classList.add("atlas-mobile-unified-active");
  markBottomNavigation();
  markCalendar();
  markWorkDetail();
  markOwnerReport();
}

export default function AtlasMobileSyncPolish() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (window.innerWidth <= 900) {
          applyMobilePresentation();
        } else {
          document.documentElement.classList.remove("atlas-mobile-unified-active");
          document.body.classList.remove("atlas-mobile-unified-active");
        }
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (max-width: 900px) {
        html.atlas-mobile-unified-active,
        body.atlas-mobile-unified-active {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }

        body.atlas-mobile-unified-active main {
          width: 100vw !important;
          max-width: 100vw !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          box-sizing: border-box !important;
        }

        body.atlas-mobile-unified-active main > *,
        body.atlas-mobile-unified-active main section,
        body.atlas-mobile-unified-active main article {
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        select[aria-label="Active property"],
        .atlas-topbar-native-property-hidden,
        .atlas-sidebar-property-switcher {
          display: none !important;
        }

        .atlas-mobile-unified-nav {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        }
        .atlas-mobile-unified-nav .atlas-mobile-nav-dashboard { order: 1 !important; }
        .atlas-mobile-unified-nav .atlas-mobile-nav-work { order: 2 !important; }
        .atlas-mobile-unified-nav .atlas-mobile-nav-assets { order: 3 !important; }
        .atlas-mobile-unified-nav .atlas-mobile-nav-locations { order: 4 !important; }
        .atlas-mobile-unified-nav .atlas-mobile-nav-calendar { order: 5 !important; }

        .atlas-mobile-calendar-heading-row {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 6px !important;
          align-items: stretch !important;
        }

        .atlas-mobile-calendar-period-controls {
          width: 100% !important;
          margin-left: 0 !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 6px !important;
          align-items: stretch !important;
        }

        .atlas-mobile-calendar-period-controls > button {
          width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-calendar-period-controls > .atlas-day-off-toolbar-wrap {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          display: block !important;
        }

        .atlas-mobile-calendar-period-controls .atlas-day-off-toolbar-status,
        .atlas-mobile-calendar-period-controls .atlas-day-off-toolbar-button {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          justify-content: center !important;
        }

        .atlas-mobile-calendar-tools {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 5px !important;
          align-items: center !important;
          overflow: visible !important;
        }

        .atlas-mobile-calendar-month { order: 1 !important; width: 100% !important; }
        .atlas-mobile-calendar-add { order: 2 !important; min-width: 0 !important; }
        .atlas-mobile-calendar-upcoming { order: 3 !important; width: 100% !important; }
        .atlas-mobile-calendar-filters { order: 4 !important; min-width: 0 !important; }
        .atlas-mobile-calendar-search {
          order: 5 !important;
          grid-column: 1 / 4 !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        .atlas-mobile-calendar-quick-filter {
          order: 6 !important;
          grid-column: 4 !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .atlas-mobile-calendar-add > summary,
        .atlas-mobile-calendar-filters > summary {
          width: 100% !important;
          min-width: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-work-detail-panel {
          gap: 8px !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .atlas-mobile-work-duplicate-nav { display: none !important; }
        .atlas-mobile-work-detail-dialog .atlas-record-detail-content--mobile {
          padding: 8px !important;
        }
        .atlas-mobile-work-detail-panel > section:first-of-type {
          margin-top: 0 !important;
        }

        .atlas-mobile-owner-report-root,
        .atlas-mobile-owner-report-root > *,
        .atlas-mobile-owner-report-shared {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-owner-report-root input,
        .atlas-mobile-owner-report-root select,
        .atlas-mobile-owner-report-root textarea,
        .atlas-mobile-owner-report-root button {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      }
    `}</style>
  );
}
