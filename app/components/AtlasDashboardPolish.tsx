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
      .atlas-dashboard-polish-command {
        gap: 8px !important;
        padding-bottom: 8px !important;
      }

      .atlas-dashboard-polish-command > section,
      .atlas-dashboard-polish-command > details,
      .atlas-dashboard-polish-command .atlas-dashboard-polish-work,
      .atlas-dashboard-polish-command .atlas-dashboard-polish-remember,
      .atlas-dashboard-polish-command .atlas-dashboard-polish-vendor {
        border-radius: 10px !important;
        box-shadow: none !important;
      }

      .atlas-dashboard-polish-remember {
        padding: 9px 10px !important;
      }

      .atlas-dashboard-polish-remember h2 {
        font-size: 16px !important;
      }

      .atlas-dashboard-polish-work {
        padding: 10px !important;
      }

      .atlas-dashboard-polish-work h2,
      .atlas-dashboard-polish-work h3 {
        margin-top: 0 !important;
        margin-bottom: 4px !important;
      }

      .atlas-dashboard-polish-person-lane {
        padding: 8px !important;
        border-radius: 10px !important;
        box-shadow: none !important;
        background: #fbfcfe !important;
      }

      .atlas-dashboard-polish-person-lane > div:first-child strong {
        font-size: 16px !important;
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

      .atlas-dashboard-polish-lane-scroll {
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
        padding-right: 3px !important;
      }

      .atlas-dashboard-polish-quick-add {
        background: #fff !important;
      }

      .atlas-dashboard-polish-recent {
        padding: 9px 10px !important;
      }

      .atlas-dashboard-polish-recent summary {
        min-height: 34px !important;
      }

      .atlas-dashboard-polish-vendor {
        padding: 9px 10px !important;
      }

      .atlas-dashboard-polish-command .atlas-dashboard-layout-grid {
        gap: 8px !important;
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
        .atlas-dashboard-polish-command {
          min-height: calc(100dvh - 118px);
        }

        .atlas-dashboard-polish-lane-scroll {
          height: clamp(360px, calc(100dvh - 410px), 660px) !important;
          max-height: clamp(360px, calc(100dvh - 410px), 660px) !important;
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
          gap: 7px !important;
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
