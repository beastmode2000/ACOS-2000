"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dashboardMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "dashboard",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function workMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "work",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function firstHeadingText(element: HTMLElement) {
  const heading = element.querySelector<HTMLElement>("h2, h3, h4, strong");
  return normalized(heading?.textContent || "");
}

function markDashboard(root: HTMLElement) {
  root.classList.add("atlas-dashboard-polish-root");
  const command = root.querySelector<HTMLElement>(".atlas-command-dashboard");
  if (!command) return;
  command.classList.add("atlas-dashboard-polish-command");

  const firstChild = command.firstElementChild as HTMLElement | null;
  firstChild?.classList.add("atlas-dashboard-polish-primary");

  const layoutGrid = command.querySelector<HTMLElement>(".atlas-dashboard-layout-grid");
  if (layoutGrid) {
    layoutGrid.classList.add("atlas-dashboard-polish-grid");
    for (const child of Array.from(layoutGrid.children)) {
      if (child instanceof HTMLElement) child.classList.add("atlas-dashboard-polish-widget");
    }
  }

  const weather = command.querySelector<HTMLElement>("#atlas-dashboard-weather");
  weather?.classList.add("atlas-dashboard-polish-weather");

  for (const element of Array.from(command.querySelectorAll<HTMLElement>("section, details"))) {
    const heading = firstHeadingText(element);
    const body = normalized(element.textContent);

    if (heading === "remember it") {
      element.classList.add("atlas-dashboard-polish-remember");
    }
    if (heading === "work lists" || body.startsWith("workwork lists")) {
      element.classList.add("atlas-dashboard-polish-work");
    }
    if (heading === "updates from the last 7 days" || body.includes("updates from the last 7 days")) {
      element.classList.add("atlas-dashboard-polish-recent");
      if (element instanceof HTMLDetailsElement && !element.dataset.atlasPolishDefaulted) {
        element.open = false;
        element.dataset.atlasPolishDefaulted = "true";
      }
    }
    if (heading === "vendor visit" || body.startsWith("quick logvendor visit")) {
      element.classList.add("atlas-dashboard-polish-vendor");
    }
    if (body.includes("weather") || body.includes("irrigation")) {
      element.classList.add("atlas-dashboard-polish-weather-section");
    }
  }

  const workSection = command.querySelector<HTMLElement>(".atlas-dashboard-polish-work");
  if (workSection) {
    for (const section of Array.from(workSection.querySelectorAll<HTMLElement>("section"))) {
      const title = normalized(section.querySelector<HTMLElement>("strong")?.textContent || "");
      if (["nick", "addison", "pat", "sean", "patrick tanner", "sean powell"].includes(title)) {
        section.classList.add("atlas-dashboard-polish-person-lane");
      }
    }

    for (const element of Array.from(workSection.querySelectorAll<HTMLElement>("div"))) {
      const style = window.getComputedStyle(element);
      if (!/auto|scroll/.test(style.overflowY)) continue;
      if (element.clientHeight < 180) continue;
      element.classList.add("atlas-dashboard-polish-lane-scroll");
    }

    for (const input of Array.from(workSection.querySelectorAll<HTMLInputElement>("input"))) {
      if (normalized(input.placeholder).includes("add work")) {
        input.classList.add("atlas-dashboard-polish-quick-add");
      }
    }
  }
}

function markWork(root: HTMLElement) {
  root.classList.add("atlas-work-viewport-polish");
}

export default function AtlasDashboardPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const dashboard = dashboardMain();
      if (dashboard) markDashboard(dashboard);
      const work = workMain();
      if (work) markWork(work);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-dashboard-polish-root {
        overflow-x: hidden !important;
      }

      .atlas-dashboard-polish-command {
        width: 100% !important;
        max-width: none !important;
        gap: 10px !important;
        padding-bottom: 12px !important;
      }

      .atlas-dashboard-polish-primary,
      .atlas-dashboard-polish-widget,
      .atlas-dashboard-polish-command > section,
      .atlas-dashboard-polish-command > details,
      .atlas-dashboard-polish-command .atlas-dashboard-polish-work,
      .atlas-dashboard-polish-command .atlas-dashboard-polish-remember,
      .atlas-dashboard-polish-command .atlas-dashboard-polish-vendor {
        border-radius: 12px !important;
        box-shadow: none !important;
        border-color: #dce4ec !important;
      }

      .atlas-dashboard-polish-primary {
        margin: 0 !important;
      }

      .atlas-dashboard-polish-grid {
        gap: 10px !important;
        align-items: start !important;
      }

      .atlas-dashboard-polish-widget {
        min-width: 0 !important;
        overflow: hidden !important;
      }

      .atlas-dashboard-polish-widget > section,
      .atlas-dashboard-polish-widget > article,
      .atlas-dashboard-polish-widget > div {
        box-shadow: none !important;
      }

      .atlas-dashboard-polish-remember {
        padding: 10px 11px !important;
      }

      .atlas-dashboard-polish-remember h2 {
        font-size: 16px !important;
        margin-bottom: 4px !important;
      }

      .atlas-dashboard-polish-work {
        padding: 10px !important;
        border: 1px solid #dce4ec !important;
        background: #ffffff !important;
      }

      .atlas-dashboard-polish-work h2,
      .atlas-dashboard-polish-work h3 {
        margin-top: 0 !important;
        margin-bottom: 4px !important;
      }

      .atlas-dashboard-polish-person-lane {
        padding: 8px !important;
        border-radius: 10px !important;
        border: 1px solid #e1e7ee !important;
        box-shadow: none !important;
        background: #fbfcfe !important;
      }

      .atlas-dashboard-polish-person-lane > div:first-child strong {
        font-size: 15px !important;
      }

      .atlas-dashboard-polish-person-lane button,
      .atlas-dashboard-polish-person-lane input,
      .atlas-dashboard-polish-person-lane select {
        min-height: 30px !important;
      }

      .atlas-dashboard-polish-person-lane [class*="atlas-gold-hover-card"],
      .atlas-dashboard-polish-person-lane button {
        box-shadow: none !important;
      }

      .atlas-dashboard-polish-person-lane button[class*="atlas-gold-hover-card"] {
        border-radius: 8px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }

      .atlas-dashboard-polish-lane-scroll {
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
        padding-right: 3px !important;
      }

      .atlas-dashboard-polish-quick-add {
        background: #fff !important;
        border-radius: 9px !important;
      }

      .atlas-dashboard-polish-recent {
        padding: 9px 10px !important;
      }

      .atlas-dashboard-polish-recent summary {
        min-height: 32px !important;
      }

      .atlas-dashboard-polish-vendor {
        padding: 10px !important;
      }

      .atlas-dashboard-polish-weather,
      .atlas-dashboard-polish-weather-section {
        box-shadow: none !important;
        border-radius: 12px !important;
      }

      .atlas-dashboard-polish-weather {
        margin: 0 !important;
      }

      .atlas-dashboard-polish-command input,
      .atlas-dashboard-polish-command select,
      .atlas-dashboard-polish-command textarea,
      .atlas-dashboard-polish-command button {
        box-shadow: none !important;
      }

      .atlas-work-viewport-polish .atlas-work-split-grid {
        align-items: stretch !important;
      }

      .atlas-work-viewport-polish .atlas-work-list-pane,
      .atlas-work-viewport-polish .atlas-work-detail-pane {
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
      }

      .atlas-work-viewport-polish .atlas-work-row {
        border-radius: 9px !important;
        box-shadow: none !important;
        gap: 5px !important;
      }

      .atlas-work-viewport-polish .atlas-work-row-main {
        min-height: 0 !important;
      }

      .atlas-work-viewport-polish .atlas-work-search {
        min-height: 36px !important;
      }

      .atlas-work-viewport-polish .atlas-work-secondary-clutter {
        display: none !important;
      }

      .atlas-work-viewport-polish .atlas-work-detail-root section,
      .atlas-work-viewport-polish .atlas-work-detail-root article {
        border-radius: 10px !important;
        box-shadow: none !important;
      }

      .atlas-work-viewport-polish .atlas-work-detail-heading {
        margin-bottom: 5px !important;
      }

      @media (min-width: 901px) {
        .atlas-dashboard-polish-root {
          padding-left: 10px !important;
          padding-right: 10px !important;
        }

        .atlas-dashboard-polish-command {
          min-height: calc(100dvh - 112px);
        }

        .atlas-dashboard-polish-primary {
          padding: 10px !important;
        }

        .atlas-dashboard-polish-work {
          grid-column: 1 / -1 !important;
        }

        .atlas-dashboard-polish-vendor {
          grid-column: span 4 !important;
        }

        .atlas-dashboard-polish-weather,
        .atlas-dashboard-polish-weather-section {
          grid-column: span 8 !important;
        }

        .atlas-dashboard-polish-lane-scroll {
          height: clamp(390px, calc(100dvh - 370px), 700px) !important;
          max-height: clamp(390px, calc(100dvh - 370px), 700px) !important;
        }

        .atlas-work-viewport-polish .atlas-work-split-grid {
          height: calc(100dvh - 150px) !important;
          max-height: calc(100dvh - 150px) !important;
          min-height: 560px !important;
        }

        .atlas-work-viewport-polish .atlas-work-list-pane,
        .atlas-work-viewport-polish .atlas-work-detail-pane {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-dashboard-polish-command {
          gap: 8px !important;
        }

        .atlas-dashboard-polish-grid {
          gap: 8px !important;
        }

        .atlas-dashboard-polish-lane-scroll {
          height: auto !important;
          max-height: 420px !important;
        }

        .atlas-dashboard-polish-person-lane {
          padding: 8px !important;
        }

        .atlas-work-viewport-polish .atlas-work-split-grid {
          height: auto !important;
          max-height: none !important;
        }
      }
    `}</style>
  );
}
