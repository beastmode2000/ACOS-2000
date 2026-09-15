"use client";

import { useEffect } from "react";

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function visible(element: HTMLElement | null) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function workMain() {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>("main h1")).find(
    (node) => normalized(node.textContent) === "work" && visible(node),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function actionSelect(panel: HTMLElement) {
  return panel.querySelector<HTMLSelectElement>('select[aria-label="Work order actions"]');
}

function runAction(select: HTMLSelectElement | null, value: string) {
  if (!select || !Array.from(select.options).some((option) => option.value === value)) return false;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  select.value = "";
  return true;
}

function currentStatus(panel: HTMLElement) {
  const statuses = new Set([
    "open",
    "scheduled",
    "in progress",
    "waiting",
    "monitor",
    "completed",
    "cancelled",
  ]);

  const badge = Array.from(panel.querySelectorAll<HTMLElement>("span")).find((node) =>
    statuses.has(normalized(node.textContent)),
  );
  return normalized(badge?.textContent || "open");
}

function findCompleteButton(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const value = normalized(button.textContent);
    return value === "complete" || value === "complete & advance";
  }) || null;
}

function focusNotes(panel: HTMLElement) {
  const input = Array.from(panel.querySelectorAll<HTMLInputElement>("input")).find((item) =>
    normalized(item.placeholder).startsWith("add a note"),
  );
  const textarea = Array.from(panel.querySelectorAll<HTMLTextAreaElement>("textarea")).find((item) => {
    const parent = item.closest("section, div");
    return normalized(parent?.textContent).includes("notes");
  });
  const target = input || textarea;
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => target?.focus(), 180);
}

function makeStatusButton(
  label: string,
  active: boolean,
  enabled: boolean,
  onClick: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "atlas-work-mx-status-button";
  button.dataset.active = active ? "true" : "false";
  button.disabled = !enabled;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function decorateDetail(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  panel.classList.add("atlas-work-mx-detail");

  const summaryCard = panel.querySelector<HTMLElement>(".atlas-work-summary-card") ||
    panel.querySelector<HTMLElement>("section");
  if (!summaryCard) return;

  const summaryFields = summaryCard.querySelector<HTMLElement>(".atlas-work-summary-fields");
  summaryFields?.classList.add("atlas-work-mx-summary-fields");

  const summaryHeader = summaryCard.querySelector<HTMLElement>(".atlas-work-summary-header");
  if (summaryHeader && !summaryHeader.querySelector(".atlas-work-mx-note-action")) {
    const note = document.createElement("button");
    note.type = "button";
    note.className = "atlas-work-mx-note-action";
    note.textContent = "Add Note";
    note.addEventListener("click", () => focusNotes(panel));
    summaryHeader.appendChild(note);
  }

  let strip = summaryCard.querySelector<HTMLElement>(".atlas-work-mx-status-strip");
  if (!strip) {
    strip = document.createElement("div");
    strip.className = "atlas-work-mx-status-strip";
    const header = document.createElement("div");
    header.className = "atlas-work-mx-status-label";
    header.textContent = "Status";
    strip.appendChild(header);

    if (summaryFields) summaryCard.insertBefore(strip, summaryFields);
    else summaryCard.appendChild(strip);
  }

  const status = currentStatus(panel);
  const actions = actionSelect(panel);
  const closed = status === "completed" || status === "cancelled";
  const hasReopen = Boolean(actions?.querySelector('option[value="reopen"]'));
  const hasStart = Boolean(actions?.querySelector('option[value="start"]'));
  const hasNotNeeded = Boolean(actions?.querySelector('option[value="not-needed"]'));
  const completeButton = findCompleteButton(panel);

  strip.querySelectorAll(".atlas-work-mx-status-button").forEach((node) => node.remove());

  strip.appendChild(
    makeStatusButton("Open", status === "open" || status === "scheduled", closed && hasReopen, () => {
      void runAction(actions, "reopen");
    }),
  );
  strip.appendChild(
    makeStatusButton("In Progress", status === "in progress", !closed && hasStart, () => {
      void runAction(actions, "start");
    }),
  );
  strip.appendChild(
    makeStatusButton("Done", status === "completed", !closed && Boolean(completeButton), () => {
      completeButton?.click();
    }),
  );
  if (hasNotNeeded) {
    strip.appendChild(
      makeStatusButton("Not Needed", false, !closed, () => {
        void runAction(actions, "not-needed");
      }),
    );
  }

  actions?.classList.add("atlas-work-mx-actions");
  completeButton?.classList.add("atlas-work-mx-native-complete");
}

function filterSelects(root: HTMLElement) {
  const accepted = [
    "category",
    "work status",
    "due date",
    "location",
    "priority",
    "assigned to",
    "work type",
    "type",
  ];
  return Array.from(root.querySelectorAll<HTMLSelectElement>("select")).filter((select) => {
    const aria = normalized(select.getAttribute("aria-label"));
    return accepted.includes(aria);
  });
}

function decorateFilters(root: HTMLElement) {
  const toggle = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const value = normalized(button.textContent);
    return value === "filters" || value === "hide filters" || value.startsWith("filters ·");
  });

  if (
    toggle &&
    window.innerWidth > 900 &&
    root.dataset.atlasMxFiltersOpened !== "true" &&
    !normalized(toggle.textContent).startsWith("hide filters")
  ) {
    root.dataset.atlasMxFiltersOpened = "true";
    toggle.click();
    return;
  }

  const selects = filterSelects(root);
  selects.forEach((select) => select.classList.add("atlas-work-mx-filter-chip"));

  if (selects.length >= 2) {
    let candidate = selects[0].parentElement;
    while (candidate && candidate !== root) {
      const count = selects.filter((select) => candidate?.contains(select)).length;
      if (count >= Math.min(3, selects.length)) {
        candidate.classList.add("atlas-work-mx-filter-row");
        break;
      }
      candidate = candidate.parentElement;
    }
  }

  toggle?.classList.add("atlas-work-mx-filter-toggle");

  const clear = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "clear",
  );
  clear?.classList.add("atlas-work-mx-clear-filters");
}

function decorateRows(root: HTMLElement) {
  for (const row of Array.from(root.querySelectorAll<HTMLElement>(".atlas-work-row"))) {
    row.classList.add("atlas-work-mx-row");
    const title = row.querySelector<HTMLElement>(".atlas-work-row-main strong");
    title?.classList.add("atlas-work-mx-row-title");
  }
}

function decorateWork() {
  const root = workMain();
  if (!root) return;
  root.classList.add("atlas-work-mx-root");
  decorateFilters(root);
  decorateRows(root);
  decorateDetail(root);
}

export default function AtlasWorkMaintainXPolish() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        decorateWork();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-work-mx-root .atlas-work-mx-filter-row {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        flex-wrap: wrap !important;
        padding: 2px 0 4px !important;
      }

      .atlas-work-mx-root .atlas-work-mx-filter-chip {
        width: auto !important;
        min-width: 108px !important;
        min-height: 36px !important;
        padding: 7px 30px 7px 10px !important;
        border: 1px solid #d9e3ec !important;
        border-radius: 9px !important;
        background-color: #ffffff !important;
        color: #0b2c43 !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        box-shadow: none !important;
      }

      .atlas-work-mx-root .atlas-work-mx-filter-chip:hover,
      .atlas-work-mx-root .atlas-work-mx-filter-chip:focus {
        border-color: #93b8d9 !important;
        outline: none !important;
      }

      .atlas-work-mx-root .atlas-work-mx-filter-toggle,
      .atlas-work-mx-root .atlas-work-mx-clear-filters {
        min-height: 34px !important;
        border-radius: 9px !important;
      }

      .atlas-work-mx-root .atlas-work-mx-row {
        transition: background 120ms ease, border-color 120ms ease !important;
      }

      .atlas-work-mx-root .atlas-work-mx-row:hover {
        background: #f7fbff !important;
        border-color: #c7dceb !important;
      }

      .atlas-work-mx-root .atlas-work-mx-row-title {
        font-weight: 750 !important;
      }

      .atlas-work-mx-root .atlas-work-mx-detail .atlas-work-summary-card {
        border-radius: 12px !important;
        overflow: visible !important;
      }

      .atlas-work-mx-root .atlas-work-mx-detail .atlas-work-summary-header {
        align-items: flex-start !important;
        gap: 10px !important;
      }

      .atlas-work-mx-note-action {
        flex: 0 0 auto !important;
        min-height: 34px !important;
        padding: 7px 11px !important;
        border: 1px solid #cddbe7 !important;
        border-radius: 9px !important;
        background: #ffffff !important;
        color: #0b5cad !important;
        font: inherit !important;
        font-size: 11.5px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .atlas-work-mx-note-action:hover {
        background: #eef7ff !important;
      }

      .atlas-work-mx-status-strip {
        display: grid !important;
        grid-template-columns: auto repeat(4, minmax(105px, 1fr)) !important;
        gap: 7px !important;
        align-items: stretch !important;
        margin: 10px 0 11px !important;
      }

      .atlas-work-mx-status-label {
        display: flex !important;
        align-items: center !important;
        padding-right: 4px !important;
        color: #66788a !important;
        font-size: 10.5px !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: .06em !important;
      }

      .atlas-work-mx-status-button {
        min-height: 42px !important;
        padding: 7px 10px !important;
        border: 1px solid #d6e1ea !important;
        border-radius: 9px !important;
        background: #f8fafc !important;
        color: #27445c !important;
        font: inherit !important;
        font-size: 11.5px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .atlas-work-mx-status-button[data-active="true"] {
        border-color: #1976d2 !important;
        background: #1976d2 !important;
        color: #ffffff !important;
      }

      .atlas-work-mx-status-button:not(:disabled):not([data-active="true"]):hover {
        background: #eef6ff !important;
        border-color: #a9c7e2 !important;
      }

      .atlas-work-mx-status-button:disabled:not([data-active="true"]) {
        opacity: .48 !important;
        cursor: default !important;
      }

      .atlas-work-mx-root .atlas-work-mx-summary-fields {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 0 !important;
        border-top: 1px solid #e4ebf1 !important;
      }

      .atlas-work-mx-root .atlas-work-mx-summary-fields > * {
        min-width: 0 !important;
        padding: 10px 12px !important;
        border-right: 1px solid #e4ebf1 !important;
        border-bottom: 1px solid #e4ebf1 !important;
      }

      .atlas-work-mx-root .atlas-work-mx-summary-fields > *:nth-child(4n) {
        border-right: 0 !important;
      }

      .atlas-work-mx-root .atlas-work-mx-actions {
        min-height: 36px !important;
        border-radius: 9px !important;
      }

      @media (max-width: 1100px) {
        .atlas-work-mx-status-strip {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .atlas-work-mx-status-label {
          grid-column: 1 / -1 !important;
        }
        .atlas-work-mx-root .atlas-work-mx-summary-fields {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .atlas-work-mx-root .atlas-work-mx-summary-fields > *:nth-child(4n) {
          border-right: 1px solid #e4ebf1 !important;
        }
        .atlas-work-mx-root .atlas-work-mx-summary-fields > *:nth-child(2n) {
          border-right: 0 !important;
        }
      }

      @media (max-width: 760px) {
        .atlas-work-mx-root .atlas-work-mx-filter-row {
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          padding-bottom: 7px !important;
          scrollbar-width: none !important;
        }
        .atlas-work-mx-root .atlas-work-mx-filter-row::-webkit-scrollbar {
          display: none !important;
        }
        .atlas-work-mx-root .atlas-work-mx-filter-chip {
          flex: 0 0 auto !important;
          min-width: 116px !important;
        }
        .atlas-work-mx-status-strip {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 6px !important;
        }
        .atlas-work-mx-root .atlas-work-mx-summary-fields {
          grid-template-columns: 1fr !important;
        }
        .atlas-work-mx-root .atlas-work-mx-summary-fields > * {
          border-right: 0 !important;
        }
      }
    `}</style>
  );
}
