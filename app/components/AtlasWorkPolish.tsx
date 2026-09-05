"use client";

import { useEffect } from "react";

function text(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase();
}

function workMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "work",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function findScrollAncestor(node: HTMLElement | null, stop: HTMLElement) {
  let current = node?.parentElement || null;
  while (current && current !== stop) {
    const style = window.getComputedStyle(current);
    if (/auto|scroll/.test(style.overflowY)) return current;
    current = current.parentElement;
  }
  return null;
}

function ensureActionOption(
  actions: HTMLSelectElement,
  value: string,
  label: string,
) {
  if (actions.querySelector(`option[value="${value}"]`)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  const deleteOption = actions.querySelector('option[value="delete"]');
  if (deleteOption) actions.insertBefore(option, deleteOption);
  else actions.appendChild(option);
}

function markWorkDetail(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  panel.classList.add("atlas-work-detail-root");

  const drawerPane = findScrollAncestor(panel, root);
  if (drawerPane) {
    drawerPane.classList.add("atlas-work-detail-pane");
    const splitGrid = drawerPane.parentElement;
    if (splitGrid && splitGrid !== root) {
      splitGrid.classList.add("atlas-work-split-grid");
      for (const child of Array.from(splitGrid.children)) {
        if (child instanceof HTMLElement && child !== drawerPane) {
          child.classList.add("atlas-work-list-pane");
          break;
        }
      }
    }
  }

  const backButton = panel.querySelector<HTMLButtonElement>('button[aria-label="Back to work"]');
  backButton?.parentElement?.parentElement?.classList.add("atlas-work-desktop-back-row");

  const title = panel.querySelector<HTMLHeadingElement>("h2");
  if (title) {
    title.classList.add("atlas-work-detail-title");

    const titleBlock = title.parentElement;
    titleBlock?.classList.add("atlas-work-title-block");
    const summaryHeader = titleBlock?.parentElement || null;
    summaryHeader?.classList.add("atlas-work-summary-header");
    const summaryCard = summaryHeader?.parentElement || null;
    summaryCard?.classList.add("atlas-work-summary-card");
    const summaryFields = summaryCard?.children?.[1];
    if (summaryFields instanceof HTMLElement) {
      summaryFields.classList.add("atlas-work-summary-fields");
    }

    const description = titleBlock?.querySelector<HTMLElement>(":scope > p") || null;
    description?.classList.add("atlas-work-primary-description");

    const badgeTexts = new Set([
      "open",
      "scheduled",
      "in progress",
      "waiting",
      "monitor",
      "completed",
      "cancelled",
      "recurring",
    ]);
    for (const badge of Array.from(titleBlock?.querySelectorAll<HTMLElement>("span") || [])) {
      if (badgeTexts.has(normalized(badge.textContent))) {
        badge.classList.add("atlas-work-redundant-badge");
      }
    }
  }

  for (const button of Array.from(panel.querySelectorAll<HTMLButtonElement>("button"))) {
    const value = normalized(button.textContent).replace(/[’]/g, "'");
    if (value === "didn't get to" || value === "didn't get to this week") {
      button.classList.add("atlas-work-defer-button");
    }
  }

  const workDetails = Array.from(panel.querySelectorAll<HTMLDetailsElement>("details")).find(
    (details) => {
      const summary = details.querySelector<HTMLElement>("summary");
      const value = normalized(summary?.textContent);
      return value === "additional details" || value === "work details";
    },
  );
  if (workDetails) {
    workDetails.classList.add("atlas-work-reference-details");
    workDetails.open = true;
    const summary = workDetails.querySelector<HTMLElement>("summary");
    if (summary && normalized(summary.textContent) !== "work details") {
      summary.textContent = "Work details";
    }
  }

  for (const strong of Array.from(panel.querySelectorAll<HTMLElement>("strong"))) {
    if (normalized(strong.textContent) === "work notes") {
      strong.textContent = "Notes";
      strong.classList.add("atlas-work-notes-heading");
    }
  }

  const notesInput = Array.from(panel.querySelectorAll<HTMLInputElement>("input")).find(
    (input) => normalized(input.placeholder).startsWith("add a note"),
  );
  if (notesInput) notesInput.placeholder = "Add a note...";

  for (const element of Array.from(panel.querySelectorAll<HTMLElement>("span, div"))) {
    if (normalized(element.textContent) !== "latest update") continue;
    const updateCard = element.parentElement;
    updateCard?.classList.add("atlas-work-latest-update-duplicate");
  }

  const actions = panel.querySelector<HTMLSelectElement>('select[aria-label="Work order actions"]');
  if (actions) {
    const isClosed = Boolean(actions.querySelector('option[value="reopen"]'));
    const isRecurring = Boolean(actions.querySelector('option[value="edit-series"]'));
    if (!isClosed) {
      ensureActionOption(actions, "start", "Start Work");
      ensureActionOption(actions, "didnt-get-to", "Didn't Get To This Week");
    }
    if (!isClosed && !isRecurring) {
      ensureActionOption(actions, "tomorrow", "Move to Tomorrow");
      ensureActionOption(actions, "next-week", "Move to Next Week");
    }
    ensureActionOption(actions, "photo", "Add Photo");
    ensureActionOption(actions, "duplicate", "Duplicate Work");
  }
}

function markWorkPage() {
  const root = workMain();
  if (!root) return;
  root.classList.add("atlas-work-polish-root");

  const addWork = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent).replace(/^\+\s*/, "") === "add work",
  );
  addWork?.classList.add("atlas-work-add-button");

  const more = Array.from(root.querySelectorAll<HTMLSelectElement>("select")).find(
    (select) => normalized(select.getAttribute("aria-label")) === "work options",
  );
  more?.classList.add("atlas-work-more-select");

  const search = Array.from(root.querySelectorAll<HTMLInputElement>("input")).find(
    (input) => normalized(input.placeholder).includes("search"),
  );
  search?.classList.add("atlas-work-search");

  const listPane = findScrollAncestor(search || null, root);
  if (listPane) {
    listPane.classList.add("atlas-work-list-pane");
    const splitGrid = listPane.parentElement;
    if (splitGrid && splitGrid !== root) splitGrid.classList.add("atlas-work-split-grid");
  }

  const rows = Array.from(root.querySelectorAll<HTMLElement>("div")).filter((element) => {
    const checkbox = element.querySelector(':scope > input[type="checkbox"]');
    const details = Array.from(element.querySelectorAll<HTMLButtonElement>(":scope > button")).find(
      (button) => normalized(button.textContent) === "details",
    );
    return Boolean(checkbox && details);
  });

  rows.forEach((row) => {
    row.classList.add("atlas-work-row");
    const details = Array.from(row.querySelectorAll<HTMLButtonElement>(":scope > button")).find(
      (button) => normalized(button.textContent) === "details",
    );
    details?.classList.add("atlas-work-row-details");
    const titleButton = Array.from(row.querySelectorAll<HTMLButtonElement>(":scope > button")).find(
      (button) => normalized(button.textContent) !== "details",
    );
    titleButton?.classList.add("atlas-work-row-main");
    row.querySelector<HTMLSelectElement>(":scope > select")?.classList.add("atlas-work-row-assignee");
    row.querySelector<HTMLInputElement>(':scope > input[type="date"]')?.classList.add("atlas-work-row-date");
  });

  const groupLabels = new Set(["today", "this week", "upcoming", "recurring", "projects"]);
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const first = normalized(button.querySelector("strong")?.textContent || button.textContent)
      .replace(/^📋\s*/, "");
    if (groupLabels.has(first)) button.classList.add("atlas-work-group-header");
  }

  const clutterPhrases = [
    "record quality",
    "favorites",
    "recent work",
    "recently viewed",
    "work intelligence",
    "work summary",
  ];

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))) {
    const value = normalized(element.textContent);
    if (!value || value.length > 220) continue;
    if (!clutterPhrases.some((phrase) => value.includes(phrase))) continue;
    if (element.querySelector("input, textarea, select")) continue;
    element.classList.add("atlas-work-secondary-clutter");
  }

  const detailSections = [
    "what to do",
    "what was done",
    "notes",
    "work notes",
    "photos",
    "documents",
    "procedure",
    "history",
    "recurrence",
  ];

  for (const heading of Array.from(root.querySelectorAll<HTMLElement>("h2, h3, h4, strong"))) {
    const value = normalized(heading.textContent);
    if (!detailSections.some((label) => value === label || value.startsWith(`${label} (`))) continue;
    heading.classList.add("atlas-work-detail-heading");
    const section = heading.closest<HTMLElement>("section, article") || heading.parentElement;
    section?.classList.add("atlas-work-detail-section");
  }

  markWorkDetail(root);
}

export default function AtlasWorkPolish() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      markWorkPage();
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
      .atlas-work-polish-root {
        --atlas-work-line: #dce4ec;
        --atlas-work-soft: #f8fafc;
      }

      .atlas-work-polish-root .atlas-work-add-button {
        min-height: 36px !important;
        height: 36px !important;
        padding: 6px 12px !important;
        border-radius: 9px !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-more-select {
        display: none !important;
      }

      .atlas-work-polish-root .atlas-work-search {
        min-height: 38px !important;
        height: 38px !important;
        border-radius: 9px !important;
      }

      .atlas-work-polish-root .atlas-work-secondary-clutter,
      .atlas-work-polish-root .atlas-work-redundant-badge,
      .atlas-work-polish-root .atlas-work-primary-description,
      .atlas-work-polish-root .atlas-work-latest-update-duplicate,
      .atlas-work-polish-root .atlas-work-defer-button {
        display: none !important;
      }

      .atlas-work-polish-root .atlas-work-group-header {
        min-height: 38px !important;
        padding: 8px 10px !important;
        background: #f8fafc !important;
        border-radius: 0 !important;
        font-size: 13px !important;
        font-weight: 600 !important;
      }

      .atlas-work-polish-root .atlas-work-row {
        min-height: 0 !important;
        padding: 7px 8px !important;
        gap: 7px !important;
        border-radius: 9px !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-row-main strong {
        font-size: 13.5px !important;
        line-height: 1.2 !important;
        font-weight: 600 !important;
      }

      .atlas-work-polish-root .atlas-work-row-main span {
        margin-top: 2px !important;
        font-size: 10.5px !important;
        line-height: 1.2 !important;
        font-weight: 400 !important;
      }

      .atlas-work-polish-root .atlas-work-row-assignee,
      .atlas-work-polish-root .atlas-work-row-date {
        min-height: 32px !important;
        height: 32px !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        border-radius: 8px !important;
        font-size: 11px !important;
        font-weight: 400 !important;
      }

      .atlas-work-polish-root .atlas-work-row-details {
        display: none !important;
      }

      .atlas-work-polish-root .atlas-work-summary-card {
        padding: 3px 2px 8px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-summary-header {
        display: grid !important;
        grid-template-columns: minmax(220px, 1fr) auto !important;
        align-items: start !important;
        gap: 12px !important;
        padding: 2px 2px 9px !important;
        border-bottom: 1px solid var(--atlas-work-line) !important;
      }

      .atlas-work-polish-root .atlas-work-title-block {
        min-width: 220px !important;
      }

      .atlas-work-polish-root .atlas-work-summary-header > :last-child {
        width: auto !important;
        justify-content: flex-end !important;
        align-items: center !important;
        gap: 6px !important;
      }

      .atlas-work-polish-root .atlas-work-summary-header button,
      .atlas-work-polish-root .atlas-work-summary-header select {
        min-height: 32px !important;
        height: 32px !important;
        padding-top: 5px !important;
        padding-bottom: 5px !important;
        border-radius: 8px !important;
      }

      .atlas-work-polish-root .atlas-work-summary-fields {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 0 !important;
        margin-top: 0 !important;
        border-bottom: 1px solid var(--atlas-work-line) !important;
      }

      .atlas-work-polish-root .atlas-work-summary-fields > div {
        min-width: 0 !important;
        padding: 9px 10px !important;
        border: 0 !important;
        border-right: 1px solid #edf1f5 !important;
        border-radius: 0 !important;
        background: transparent !important;
      }

      .atlas-work-polish-root .atlas-work-summary-fields > div:last-child {
        border-right: 0 !important;
      }

      .atlas-work-polish-root .atlas-work-summary-fields > div > div {
        margin-top: 2px !important;
        font-size: 12.5px !important;
        line-height: 1.3 !important;
        font-weight: 600 !important;
      }

      .atlas-work-polish-root .atlas-work-detail-section {
        border-color: var(--atlas-work-line) !important;
        border-radius: 10px !important;
        box-shadow: none !important;
        font-size: 13px !important;
        font-weight: 400 !important;
      }

      .atlas-work-polish-root .atlas-work-detail-heading,
      .atlas-work-polish-root .atlas-work-notes-heading {
        font-size: 13px !important;
        line-height: 1.25 !important;
        font-weight: 600 !important;
        letter-spacing: -0.006em !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] {
        font-size: 13px !important;
        line-height: 1.42 !important;
        font-weight: 400 !important;
        letter-spacing: -0.004em !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] h2,
      .atlas-work-polish-root .atlas-work-detail-title {
        margin-top: 2px !important;
        font-size: 18px !important;
        line-height: 1.18 !important;
        font-weight: 600 !important;
        letter-spacing: -0.018em !important;
        overflow-wrap: normal !important;
        word-break: normal !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] h3,
      .atlas-work-polish-root [data-atlas-work-detail-panel] h4 {
        font-size: 14px !important;
        line-height: 1.28 !important;
        font-weight: 600 !important;
        letter-spacing: -0.008em !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] strong,
      .atlas-work-polish-root [data-atlas-work-detail-panel] b {
        font-weight: 600 !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] p,
      .atlas-work-polish-root [data-atlas-work-detail-panel] li,
      .atlas-work-polish-root [data-atlas-work-detail-panel] dd,
      .atlas-work-polish-root [data-atlas-work-detail-panel] dt {
        font-size: 13px !important;
        line-height: 1.45 !important;
        font-weight: 400 !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] label,
      .atlas-work-polish-root [data-atlas-work-detail-panel] small {
        font-size: 11.5px !important;
        line-height: 1.35 !important;
        font-weight: 500 !important;
        letter-spacing: 0 !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] summary {
        font-size: 13px !important;
        line-height: 1.3 !important;
        font-weight: 600 !important;
        letter-spacing: -0.004em !important;
      }

      .atlas-work-polish-root .atlas-work-reference-details {
        margin-top: 2px !important;
        padding: 8px 2px 10px !important;
        border: 0 !important;
        border-bottom: 1px solid var(--atlas-work-line) !important;
        border-radius: 0 !important;
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-reference-details > summary {
        color: #475569 !important;
        font-size: 12px !important;
        font-weight: 600 !important;
      }

      .atlas-work-polish-root .atlas-work-reference-details > div {
        grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)) !important;
        gap: 7px 14px !important;
        margin-top: 7px !important;
      }

      .atlas-work-polish-root .atlas-work-reference-details > div > div {
        padding: 0 !important;
      }

      .atlas-work-polish-root .atlas-work-reference-details > div > div > div {
        margin-top: 2px !important;
        font-size: 12.5px !important;
        font-weight: 500 !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] button,
      .atlas-work-polish-root [data-atlas-work-detail-panel] select {
        font-size: 12px !important;
        font-weight: 600 !important;
      }

      .atlas-work-polish-root [data-atlas-work-detail-panel] input,
      .atlas-work-polish-root [data-atlas-work-detail-panel] textarea {
        font-weight: 400 !important;
      }

      @media (min-width: 901px) {
        .atlas-work-polish-root > div,
        .atlas-work-polish-root > section {
          min-height: 0 !important;
        }

        .atlas-work-polish-root .atlas-work-desktop-back-row {
          display: none !important;
        }

        .atlas-work-polish-root .atlas-work-split-grid {
          height: 100% !important;
          min-height: 0 !important;
          align-items: stretch !important;
          overflow: hidden !important;
        }

        .atlas-work-polish-root .atlas-work-list-pane,
        .atlas-work-polish-root .atlas-work-detail-pane {
          height: 100% !important;
          max-height: none !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
          align-self: stretch !important;
        }

        .atlas-work-polish-root .atlas-work-row {
          grid-template-columns: auto minmax(220px, 1fr) minmax(112px, 0.38fr) 128px !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-work-polish-root .atlas-work-summary-header {
          grid-template-columns: 1fr !important;
        }

        .atlas-work-polish-root .atlas-work-title-block {
          min-width: 0 !important;
        }

        .atlas-work-polish-root .atlas-work-summary-header > :last-child {
          justify-content: flex-start !important;
        }

        .atlas-work-polish-root .atlas-work-summary-fields {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .atlas-work-polish-root .atlas-work-summary-fields > div:nth-child(2n) {
          border-right: 0 !important;
        }

        .atlas-work-polish-root .atlas-work-row {
          padding: 9px 8px !important;
        }

        .atlas-work-polish-root .atlas-work-list-pane,
        .atlas-work-polish-root .atlas-work-detail-pane {
          max-height: none !important;
          min-height: 0 !important;
          overflow: visible !important;
          scrollbar-gutter: auto !important;
        }

        .atlas-work-polish-root [data-atlas-work-detail-panel] h2,
        .atlas-work-polish-root .atlas-work-detail-title {
          font-size: 18px !important;
        }
      }
    `}</style>
  );
}
