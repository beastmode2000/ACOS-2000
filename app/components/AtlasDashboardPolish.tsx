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

function directGridChild(element: HTMLElement, grid: HTMLElement | null) {
  if (!grid) return null;
  let current: HTMLElement | null = element;
  while (current && current.parentElement !== grid) current = current.parentElement;
  return current?.parentElement === grid ? current : null;
}

function findButton(root: HTMLElement, phrases: string[]) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const text = normalized(button.textContent);
    return phrases.some((phrase) => text === phrase || text.includes(phrase));
  });
}

function extractCount(root: HTMLElement, labels: string[]) {
  for (const element of Array.from(root.querySelectorAll<HTMLElement>("span, div, button, small"))) {
    const text = normalized(element.textContent);
    if (!text || text.length > 90) continue;
    if (!labels.some((label) => text.includes(label))) continue;

    const strong = element.querySelector<HTMLElement>("strong, b");
    const strongText = String(strong?.textContent || "");
    if (/\d/.test(strongText)) return Number(strongText.replace(/[^0-9]/g, ""));

    const match = text.match(/(?:^|\s)(\d{1,4})(?:\s|$)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function makeProxyButton(root: HTMLElement, label: string, phrases: string[]) {
  const target = findButton(root, phrases);
  if (!target) return null;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "atlas-dashboard-command-action";
  button.textContent = label;
  button.addEventListener("click", () => target.click());
  return button;
}

function ensureCommandBar(command: HTMLElement) {
  let bar = command.querySelector<HTMLElement>(":scope > .atlas-dashboard-command-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "atlas-dashboard-command-bar";
    command.insertBefore(bar, command.firstChild);
  }

  if (bar.dataset.atlasDashboardCommandReady === "true") return;

  const status = document.createElement("div");
  status.className = "atlas-dashboard-command-status";

  const statusDefinitions: Array<[string, string[]]> = [
    ["Open Work", ["open work", "open"]],
    ["Overdue", ["overdue"]],
    ["Today", ["today", "due today"]],
    ["Upcoming", ["upcoming", "due soon"]],
    ["Requests", ["requests", "request"]],
  ];

  for (const [label, phrases] of statusDefinitions) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "atlas-dashboard-command-status-item";

    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    item.appendChild(labelNode);

    const value = extractCount(command, phrases);
    if (value !== null) {
      const valueNode = document.createElement("strong");
      valueNode.textContent = String(value);
      item.appendChild(valueNode);
    }

    item.addEventListener("click", () => {
      const target = findButton(command, phrases);
      if (target && target !== item) target.click();
    });
    status.appendChild(item);
  }

  const actions = document.createElement("div");
  actions.className = "atlas-dashboard-command-actions";

  const actionDefinitions: Array<[string, string[]]> = [
    ["Add Work", ["add work", "new work", "+ work"]],
    ["Note", ["add note", "new note", "remember it", "quick note"]],
    ["Vendor", ["vendor visit", "quick log"]],
    ["Reminder", ["add reminder", "new reminder", "reminder"]],
  ];

  for (const [label, phrases] of actionDefinitions) {
    const button = makeProxyButton(command, label, phrases);
    if (button) actions.appendChild(button);
  }

  bar.replaceChildren(status, actions);
  bar.dataset.atlasDashboardCommandReady = "true";
}

function markDashboard(root: HTMLElement) {
  root.classList.add("atlas-dashboard-polish-root");
  const command = root.querySelector<HTMLElement>(".atlas-command-dashboard");
  if (!command) return;
  command.classList.add("atlas-dashboard-polish-command");

  ensureCommandBar(command);

  const primary = Array.from(command.children).find(
    (child) => child instanceof HTMLElement && !child.classList.contains("atlas-dashboard-command-bar"),
  ) as HTMLElement | undefined;
  primary?.classList.add("atlas-dashboard-polish-primary");

  const layoutGrid = command.querySelector<HTMLElement>(".atlas-dashboard-layout-grid");
  if (layoutGrid) {
    layoutGrid.classList.add("atlas-dashboard-polish-grid");
    for (const child of Array.from(layoutGrid.children)) {
      if (child instanceof HTMLElement) child.classList.add("atlas-dashboard-polish-widget");
    }
  }

  const weather = command.querySelector<HTMLElement>("#atlas-dashboard-weather");
  if (weather) {
    weather.classList.add("atlas-dashboard-polish-weather");
    directGridChild(weather, layoutGrid)?.classList.add("atlas-dashboard-polish-weather-widget");
  }

  for (const element of Array.from(command.querySelectorAll<HTMLElement>("section, details"))) {
    const heading = firstHeadingText(element);
    const body = normalized(element.textContent);
    const widget = directGridChild(element, layoutGrid);

    if (heading === "remember it") {
      element.classList.add("atlas-dashboard-polish-remember");
      widget?.classList.add("atlas-dashboard-polish-remember-widget");
    }

    if (heading === "work lists" || body.startsWith("workwork lists")) {
      element.classList.add("atlas-dashboard-polish-work");
      widget?.classList.add("atlas-dashboard-polish-work-widget");
    }

    if (
      heading === "updates from the last 7 days" ||
      body.includes("updates from the last 7 days") ||
      body.includes("recent activity")
    ) {
      element.classList.add("atlas-dashboard-polish-recent");
      widget?.classList.add("atlas-dashboard-polish-recent-widget");
      if (element instanceof HTMLDetailsElement && !element.dataset.atlasPolishDefaulted) {
        element.open = false;
        element.dataset.atlasPolishDefaulted = "true";
      }
    }

    if (heading === "vendor visit" || body.startsWith("quick logvendor visit")) {
      element.classList.add("atlas-dashboard-polish-vendor");
      widget?.classList.add("atlas-dashboard-polish-vendor-widget");
    }

    if (body.includes("weather") || body.includes("irrigation")) {
      element.classList.add("atlas-dashboard-polish-weather-section");
      widget?.classList.add("atlas-dashboard-polish-weather-widget");
    }

    if (body.includes("request") || body.includes("problem") || body.includes("blocked")) {
      widget?.classList.add("atlas-dashboard-polish-attention-widget");
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

  for (const element of Array.from(command.querySelectorAll<HTMLElement>("p, small"))) {
    const text = normalized(element.textContent);
    if (!text || text.length > 160) continue;
    if (
      text.includes("use this") ||
      text.includes("everyone assigned") ||
      text.includes("quick way to") ||
      text.includes("shows the same") ||
      text.includes("this section")
    ) {
      element.classList.add("atlas-dashboard-polish-explanatory");
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

      .atlas-dashboard-command-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
        padding: 8px 9px;
        border: 1px solid #dce4ec;
        border-radius: 12px;
        background: #ffffff;
      }

      .atlas-dashboard-command-status,
      .atlas-dashboard-command-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex-wrap: wrap;
      }

      .atlas-dashboard-command-status-item,
      .atlas-dashboard-command-action {
        min-height: 32px;
        padding: 5px 9px;
        border: 1px solid #dce4ec;
        border-radius: 9px;
        background: #ffffff;
        color: #0b2c43;
        font: inherit;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: none !important;
      }

      .atlas-dashboard-command-status-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .atlas-dashboard-command-status-item strong {
        font-size: 13px;
        color: #0b1e33;
      }

      .atlas-dashboard-command-status-item:hover,
      .atlas-dashboard-command-action:hover {
        border-color: #c99a3d;
        background: #fffaf0;
      }

      .atlas-dashboard-command-action {
        background: #0b2c43;
        border-color: #0b2c43;
        color: #ffffff;
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
        order: 30;
      }

      .atlas-dashboard-polish-work-widget { order: 1 !important; }
      .atlas-dashboard-polish-attention-widget { order: 2 !important; }
      .atlas-dashboard-polish-remember-widget { order: 3 !important; }
      .atlas-dashboard-polish-weather-widget { order: 20 !important; }
      .atlas-dashboard-polish-vendor-widget { order: 21 !important; }
      .atlas-dashboard-polish-recent-widget { order: 50 !important; }

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
        padding: 8px 9px !important;
        max-height: 180px !important;
        overflow-y: auto !important;
      }

      .atlas-dashboard-polish-recent summary {
        min-height: 30px !important;
      }

      .atlas-dashboard-polish-vendor {
        padding: 9px !important;
        max-height: 170px !important;
        overflow: hidden !important;
      }

      .atlas-dashboard-polish-weather,
      .atlas-dashboard-polish-weather-section {
        box-shadow: none !important;
        border-radius: 12px !important;
      }

      .atlas-dashboard-polish-weather {
        margin: 0 !important;
        max-height: 220px !important;
        overflow: hidden !important;
      }

      .atlas-dashboard-polish-explanatory {
        display: none !important;
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

        .atlas-dashboard-polish-work-widget,
        .atlas-dashboard-polish-work {
          grid-column: 1 / -1 !important;
        }

        .atlas-dashboard-polish-attention-widget { grid-column: span 6 !important; }
        .atlas-dashboard-polish-remember-widget { grid-column: span 6 !important; }
        .atlas-dashboard-polish-vendor-widget { grid-column: span 4 !important; }

        .atlas-dashboard-polish-weather-widget,
        .atlas-dashboard-polish-weather,
        .atlas-dashboard-polish-weather-section {
          grid-column: span 8 !important;
        }

        .atlas-dashboard-polish-recent-widget {
          grid-column: 1 / -1 !important;
        }

        .atlas-dashboard-polish-lane-scroll {
          height: clamp(330px, calc(100dvh - 390px), 620px) !important;
          max-height: clamp(330px, calc(100dvh - 390px), 620px) !important;
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
        .atlas-dashboard-command-bar {
          align-items: stretch;
          flex-direction: column;
          padding: 8px;
        }

        .atlas-dashboard-command-status,
        .atlas-dashboard-command-actions {
          width: 100%;
        }

        .atlas-dashboard-command-status-item,
        .atlas-dashboard-command-action {
          flex: 1 1 auto;
        }

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

        .atlas-dashboard-polish-weather,
        .atlas-dashboard-polish-vendor,
        .atlas-dashboard-polish-recent {
          max-height: none !important;
        }

        .atlas-work-viewport-polish .atlas-work-split-grid {
          height: auto !important;
          max-height: none !important;
        }
      }
    `}</style>
  );
}