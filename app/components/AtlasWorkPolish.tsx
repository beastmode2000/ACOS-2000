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

function isLegacyGeneratedDescription(value: unknown) {
  const description = normalized(value);
  if (!description) return false;
  return (
    (/^weekly\b/.test(description) && /\bapproved\b/.test(description)) ||
    (/\bvehicle cleaning\b/.test(description) && /\bapproved\b/.test(description)) ||
    description.includes("weekly approved vehicle cleaning")
  );
}

function markWorkDetail(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  panel.classList.add("atlas-work-detail-root");

  const title = panel.querySelector<HTMLHeadingElement>("h2");
  if (title) {
    title.classList.add("atlas-work-detail-title");

    const titleBlock = title.parentElement;
    const description = titleBlock?.querySelector<HTMLElement>(":scope > p") || null;
    if (description) {
      description.classList.add("atlas-work-primary-description");
      if (isLegacyGeneratedDescription(description.textContent)) {
        description.classList.add("atlas-work-generated-description");
      }
    }

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
  if (actions && !actions.querySelector('option[value="photo"]')) {
    const option = document.createElement("option");
    option.value = "photo";
    option.textContent = "Add Photo";
    const deleteOption = actions.querySelector('option[value="delete"]');
    if (deleteOption) actions.insertBefore(option, deleteOption);
    else actions.appendChild(option);
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

  const scrollables = Array.from(root.querySelectorAll<HTMLElement>("div, section")).filter((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return /auto|scroll/.test(style.overflowY) && rect.height > 260 && rect.width > 260;
  });

  if (scrollables.length) {
    scrollables.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    scrollables[0]?.classList.add("atlas-work-list-pane");
    const last = scrollables[scrollables.length - 1];
    if (last && last !== scrollables[0]) last.classList.add("atlas-work-detail-pane");
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
        min-height: 36px !important;
        height: 36px !important;
        min-width: 104px !important;
        padding-top: 5px !important;
        padding-bottom: 5px !important;
      }

      .atlas-work-polish-root .atlas-work-search {
        min-height: 38px !important;
        height: 38px !important;
        border-radius: 9px !important;
      }

      .atlas-work-polish-root .atlas-work-secondary-clutter,
      .atlas-work-polish-root .atlas-work-redundant-badge,
      .atlas-work-polish-root .atlas-work-generated-description,
      .atlas-work-polish-root .atlas-work-latest-update-duplicate {
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
        font-size: 19px !important;
        line-height: 1.18 !important;
        font-weight: 600 !important;
        letter-spacing: -0.018em !important;
      }

      .atlas-work-polish-root .atlas-work-primary-description {
        margin-top: 6px !important;
        color: #475569 !important;
        font-size: 13px !important;
        line-height: 1.42 !important;
        font-weight: 400 !important;
      }

      .atlas-work-polish-root .atlas-work-primary-description:not(.atlas-work-generated-description)::before {
        content: "Description";
        display: block;
        margin-bottom: 3px;
        color: #667085;
        font-size: 10.5px;
        line-height: 1.2;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.035em;
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
        padding: 9px 10px !important;
        border-radius: 10px !important;
        background: #ffffff !important;
      }

      .atlas-work-polish-root .atlas-work-reference-details > div {
        grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)) !important;
        gap: 7px !important;
        margin-top: 8px !important;
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

        .atlas-work-polish-root .atlas-work-list-pane,
        .atlas-work-polish-root .atlas-work-detail-pane {
          max-height: calc(100dvh - 130px) !important;
          min-height: calc(100dvh - 130px) !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-work-polish-root .atlas-work-row {
          grid-template-columns: auto minmax(220px, 1fr) minmax(112px, 0.38fr) 128px !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-work-polish-root .atlas-work-more-select {
          min-width: 92px !important;
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
