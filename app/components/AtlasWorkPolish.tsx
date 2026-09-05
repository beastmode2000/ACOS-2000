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

function restructureWorkDetail(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;

  panel.classList.add("atlas-work-detail-root");

  const backRow = panel.firstElementChild as HTMLElement | null;
  backRow?.classList.add("atlas-work-back-row");

  const primarySection = Array.from(panel.children).find(
    (element) => element.tagName.toLowerCase() === "section",
  ) as HTMLElement | undefined;
  const viewRoot = primarySection?.firstElementChild as HTMLElement | null;
  if (!primarySection || !viewRoot) return;

  primarySection.classList.add("atlas-work-primary-section");
  viewRoot.classList.add("atlas-work-detail-flow");

  const title = viewRoot.querySelector<HTMLHeadingElement>("h2");
  if (!title) return;
  title.classList.add("atlas-work-sticky-title");

  let heroCard: HTMLElement | null = title.parentElement;
  while (heroCard?.parentElement && heroCard.parentElement !== viewRoot) {
    heroCard = heroCard.parentElement;
  }
  if (!heroCard || heroCard.parentElement !== viewRoot) return;
  heroCard.classList.add("atlas-work-description-card");

  const headerRow = heroCard.firstElementChild as HTMLElement | null;
  if (headerRow) {
    headerRow.classList.add("atlas-work-sticky-header");
    if (headerRow.parentElement !== viewRoot) {
      viewRoot.insertBefore(headerRow, heroCard);
    }
  }

  const titleBlock = title.parentElement;
  const notes = titleBlock?.querySelector<HTMLElement>(":scope > p") || null;
  if (notes) {
    notes.classList.add("atlas-work-description-text");
  }

  let descriptionHeading = heroCard.querySelector<HTMLElement>(
    ':scope > [data-atlas-work-description-heading="true"]',
  );
  if (!descriptionHeading) {
    descriptionHeading = document.createElement("div");
    descriptionHeading.dataset.atlasWorkDescriptionHeading = "true";
    descriptionHeading.className = "atlas-work-description-heading";
    descriptionHeading.textContent = "Description";
    heroCard.insertBefore(descriptionHeading, heroCard.firstChild);
  }

  if (notes && notes.parentElement !== heroCard) {
    descriptionHeading.insertAdjacentElement("afterend", notes);
  }

  const extraDetails = Array.from(viewRoot.querySelectorAll<HTMLDetailsElement>("details")).find(
    (details) => normalized(details.querySelector("summary")?.textContent) === "additional details",
  );
  if (extraDetails) {
    extraDetails.open = true;
    extraDetails.classList.add("atlas-work-description-extra");
    extraDetails.querySelector("summary")?.classList.add("atlas-work-description-extra-summary");
    if (extraDetails.parentElement !== heroCard) heroCard.appendChild(extraDetails);
  }

  const actionRow = headerRow
    ? Array.from(headerRow.children).find((child) => {
        const value = normalized(child.textContent);
        return value.includes("complete") || value.includes("actions") || value.includes("edit");
      }) as HTMLElement | undefined
    : undefined;
  actionRow?.classList.add("atlas-work-sticky-actions");

  const statusTitleBlock = title.closest<HTMLElement>("div");
  statusTitleBlock?.classList.add("atlas-work-sticky-title-block");
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

  restructureWorkDetail(root);
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
        min-height: 36px !important;
        height: 36px !important;
        border-radius: 9px !important;
      }

      .atlas-work-polish-root .atlas-work-secondary-clutter {
        display: none !important;
      }

      .atlas-work-polish-root .atlas-work-group-header {
        min-height: 34px !important;
        padding: 6px 9px !important;
        background: #f8fafc !important;
        border-radius: 0 !important;
        font-size: 12.5px !important;
      }

      .atlas-work-polish-root .atlas-work-row {
        min-height: 0 !important;
        padding: 6px 7px !important;
        gap: 6px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-row-main strong {
        font-size: 13px !important;
        line-height: 1.18 !important;
      }

      .atlas-work-polish-root .atlas-work-row-main span {
        margin-top: 2px !important;
        font-size: 10px !important;
        line-height: 1.18 !important;
      }

      .atlas-work-polish-root .atlas-work-row-assignee,
      .atlas-work-polish-root .atlas-work-row-date {
        min-height: 30px !important;
        height: 30px !important;
        padding-top: 3px !important;
        padding-bottom: 3px !important;
        border-radius: 7px !important;
        font-size: 10.5px !important;
      }

      .atlas-work-polish-root .atlas-work-row-details {
        display: none !important;
      }

      .atlas-work-polish-root .atlas-work-detail-section {
        border-color: var(--atlas-work-line) !important;
        border-radius: 10px !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-detail-heading {
        font-size: 13px !important;
        line-height: 1.25 !important;
      }

      .atlas-work-polish-root .atlas-work-primary-section {
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-detail-flow {
        gap: 8px !important;
      }

      .atlas-work-polish-root .atlas-work-sticky-header {
        background: rgba(255, 255, 255, 0.98) !important;
        border: 1px solid var(--atlas-work-line) !important;
        border-radius: 10px !important;
        padding: 7px 9px !important;
        box-shadow: 0 4px 12px rgba(15, 42, 67, 0.06) !important;
      }

      .atlas-work-polish-root .atlas-work-sticky-title {
        margin: 3px 0 0 !important;
        font-size: 18px !important;
        line-height: 1.15 !important;
        letter-spacing: -0.01em !important;
      }

      .atlas-work-polish-root .atlas-work-sticky-title-block > div:first-child {
        gap: 5px !important;
      }

      .atlas-work-polish-root .atlas-work-sticky-actions {
        gap: 5px !important;
      }

      .atlas-work-polish-root .atlas-work-sticky-actions button,
      .atlas-work-polish-root .atlas-work-sticky-actions select {
        min-height: 32px !important;
        height: 32px !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        font-size: 11px !important;
      }

      .atlas-work-polish-root .atlas-work-description-card {
        display: grid !important;
        gap: 8px !important;
        padding: 10px 11px !important;
        border: 1px solid var(--atlas-work-line) !important;
        border-radius: 10px !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-description-heading {
        color: #172331 !important;
        font-size: 13px !important;
        line-height: 1.2 !important;
        font-weight: 800 !important;
      }

      .atlas-work-polish-root .atlas-work-description-text {
        margin: 0 !important;
        color: #475569 !important;
        font-size: 13px !important;
        line-height: 1.4 !important;
      }

      .atlas-work-polish-root .atlas-work-description-card > div:not(.atlas-work-description-heading) {
        gap: 6px !important;
      }

      .atlas-work-polish-root .atlas-work-description-card > div:not(.atlas-work-description-heading) > div {
        padding: 7px 8px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .atlas-work-polish-root .atlas-work-description-extra {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }

      .atlas-work-polish-root .atlas-work-description-extra-summary {
        display: none !important;
      }

      .atlas-work-polish-root .atlas-work-description-extra > div {
        margin-top: 0 !important;
        padding-top: 2px !important;
        border-top: 1px solid #edf2f7 !important;
      }

      @media (min-width: 901px) {
        .atlas-work-polish-root > div,
        .atlas-work-polish-root > section {
          min-height: 0 !important;
        }

        .atlas-work-polish-root .atlas-work-back-row {
          display: none !important;
        }

        .atlas-work-polish-root .atlas-work-detail-pane {
          position: relative !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }

        .atlas-work-polish-root .atlas-work-sticky-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 20 !important;
        }

        .atlas-work-polish-root .atlas-work-list-pane,
        .atlas-work-polish-root .atlas-work-detail-pane {
          max-height: calc(100dvh - 118px) !important;
          min-height: calc(100dvh - 118px) !important;
          scrollbar-gutter: stable !important;
          overscroll-behavior: contain !important;
        }

        .atlas-work-polish-root .atlas-work-row {
          grid-template-columns: auto minmax(205px, 1fr) minmax(104px, 0.34fr) 118px !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-work-polish-root .atlas-work-more-select {
          min-width: 92px !important;
        }

        .atlas-work-polish-root .atlas-work-row {
          padding: 8px 7px !important;
        }

        .atlas-work-polish-root .atlas-work-back-row {
          position: sticky !important;
          top: 0 !important;
          z-index: 30 !important;
          background: #fff !important;
        }

        .atlas-work-polish-root .atlas-work-sticky-header {
          position: sticky !important;
          top: 52px !important;
          z-index: 20 !important;
        }

        .atlas-work-polish-root .atlas-work-sticky-title {
          font-size: 17px !important;
        }

        .atlas-work-polish-root .atlas-work-sticky-header {
          align-items: flex-start !important;
        }

        .atlas-work-polish-root .atlas-work-list-pane,
        .atlas-work-polish-root .atlas-work-detail-pane {
          max-height: none !important;
          min-height: 0 !important;
          overflow: visible !important;
          scrollbar-gutter: auto !important;
        }
      }
    `}</style>
  );
}
