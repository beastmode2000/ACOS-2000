"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function ownerReportMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === "owner report",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function propertyKey(root: HTMLElement) {
  const text = String(root.textContent || "");
  const match = text.match(/Property\s+(2000|6855|3661|Hangar)/i);
  return String(match?.[1] || "2000").toLowerCase();
}

function editorRow(element: Element, root: HTMLElement) {
  let current = element.parentElement;
  while (current && current !== root) {
    if (
      current.querySelector('input[type="date"]') &&
      current.querySelector("textarea") &&
      current.querySelector("select")
    ) {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
}

function noteKey(row: HTMLElement, root: HTMLElement) {
  const date = String(row.querySelector<HTMLInputElement>('input[type="date"]')?.value || "").trim();
  const textInputs = Array.from(row.querySelectorAll<HTMLInputElement>('input:not([type="date"])'));
  const person = String(textInputs[0]?.value || "").trim().toLowerCase();
  const title = String(textInputs[1]?.value || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!date || !title) return "";
  return `atlas.owner-report.note.v1|${propertyKey(root)}|${date}|${person}|${title}`;
}

function saveRowNote(row: HTMLElement, root: HTMLElement) {
  const key = noteKey(row, root);
  const textarea = row.querySelector<HTMLTextAreaElement>("textarea");
  if (!key || !textarea) return;
  try {
    window.localStorage.setItem(key, textarea.value);
  } catch {
    // Note persistence is a safety net and must never block the report.
  }
}

function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function restoreNotes(root: HTMLElement) {
  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    const row = editorRow(textarea, root);
    if (!row) continue;
    const key = noteKey(row, root);
    if (!key) continue;

    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(key);
    } catch {
      saved = null;
    }

    if (saved === null || textarea.value === saved) continue;
    setReactTextareaValue(textarea, saved);
  }
}

function sectionByHeading(doc: Document, label: string) {
  const heading = Array.from(doc.querySelectorAll<HTMLElement>("h1,h2,h3")).find(
    (node) => normalized(node.textContent) === normalized(label),
  );
  return (heading?.closest("section") as HTMLElement | null) || null;
}

function dateKeyFromLabel(label: string) {
  const year = new Date().getFullYear();
  const parsed = new Date(`${label}, ${year} 12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 10);
}

function reportPropertyKey(doc: Document) {
  const property = Array.from(doc.querySelectorAll<HTMLElement>(".property,h1,h2,h3,div,span")).find(
    (node) => /Property\s+(2000|6855|3661|Hangar)/i.test(String(node.textContent || "")),
  );
  const match = String(property?.textContent || "").match(/Property\s+(2000|6855|3661|Hangar)/i);
  return String(match?.[1] || "2000").toLowerCase();
}

function savedReportNote(property: string, dateLabel: string, person: string, title: string) {
  const date = dateKeyFromLabel(dateLabel);
  if (!date || !title) return "";
  const key = `atlas.owner-report.note.v1|${property}|${date}|${person.trim().toLowerCase()}|${title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`;
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function flattenRoutineWork(doc: Document) {
  const routineSection = sectionByHeading(doc, "Routine Work");
  if (!routineSection || routineSection.dataset.atlasFlattened === "true") return;

  const routineTable = routineSection.querySelector<HTMLTableElement>("table");
  if (!routineTable) {
    routineSection.remove();
    return;
  }

  let completedSection = sectionByHeading(doc, "Completed Work");
  if (!completedSection) {
    completedSection = doc.createElement("section");
    completedSection.className = "section";
    const heading = doc.createElement("h2");
    heading.textContent = "Completed Work";
    completedSection.appendChild(heading);
    routineSection.parentElement?.insertBefore(completedSection, routineSection.nextSibling);
  }

  const completedHeading = completedSection.querySelector<HTMLElement>("h2");
  if (!completedHeading) return;

  const dateLabels = Array.from(routineTable.querySelectorAll<HTMLTableCellElement>("thead th"))
    .slice(1)
    .map((cell) => String(cell.querySelector("span")?.textContent || "").trim());

  const property = reportPropertyKey(doc);
  const existing = new Set(
    Array.from(completedSection.querySelectorAll<HTMLElement>(".item")).map((item) => {
      const title = normalized(item.querySelector("strong")?.textContent);
      const meta = normalized(item.querySelector(".item-main span")?.textContent);
      return `${title}|${meta}`;
    }),
  );

  const insertionAnchor = completedHeading.nextSibling;

  for (const row of Array.from(routineTable.querySelectorAll<HTMLTableRowElement>("tbody tr"))) {
    const firstCell = row.querySelector<HTMLTableCellElement>("td");
    if (!firstCell) continue;

    const title = String(firstCell.querySelector("strong")?.textContent || "").trim();
    const person = String(firstCell.querySelector("span")?.textContent || "").trim();
    if (!title) continue;

    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td")).slice(1);
    cells.forEach((cell, index) => {
      if (!String(cell.textContent || "").includes("✓")) return;

      const dateLabel = dateLabels[index] || "";
      const meta = [person, dateLabel].filter(Boolean).join(" · ");
      const key = `${normalized(title)}|${normalized(meta)}`;
      if (existing.has(key)) return;

      const item = doc.createElement("div");
      item.className = "item";

      const main = doc.createElement("div");
      main.className = "item-main";

      const strong = doc.createElement("strong");
      strong.textContent = title;
      main.appendChild(strong);

      if (meta) {
        const span = doc.createElement("span");
        span.textContent = meta;
        main.appendChild(span);
      }

      item.appendChild(main);

      const noteText = savedReportNote(property, dateLabel, person, title);
      if (noteText) {
        const note = doc.createElement("div");
        note.className = "note";
        note.textContent = noteText;
        item.appendChild(note);
      }

      completedSection?.insertBefore(item, insertionAnchor);
      existing.add(key);
    });
  }

  routineSection.dataset.atlasFlattened = "true";
  routineSection.remove();

  const summary = doc.querySelector<HTMLElement>(".summary");
  if (summary) {
    summary.innerHTML = summary.innerHTML
      .replace(/\s*\d+ recurring routine(?:s)? (?:was|were) rolled up by completion day\./i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
}

export default function AtlasOwnerReportHeaderPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const root = ownerReportMain();
      if (!root) return;

      root.classList.add("atlas-owner-report-compact-root");

      const heading = Array.from(root.querySelectorAll<HTMLElement>("h1, h2")).find(
        (node) => normalized(node.textContent) === "owner report",
      );
      if (!heading) return;

      heading.classList.add("atlas-owner-report-compact-title");

      const header = (heading.closest("header") as HTMLElement | null) || heading.parentElement;
      if (header) {
        header.classList.add("atlas-owner-report-compact-header");
        const next = header.nextElementSibling as HTMLElement | null;
        next?.classList.add("atlas-owner-report-compact-first-content");
      }

      restoreNotes(root);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const rememberNote = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
      const root = ownerReportMain();
      if (!root || !root.contains(target)) return;
      const row = editorRow(target, root);
      if (!row) return;
      saveRowNote(row, root);
    };

    const originalOpen = window.open;
    const patchedOpen = ((url?: string | URL, target?: string, features?: string) => {
      const popup = originalOpen(
        typeof url === "string" ? url : url?.toString(),
        target,
        features,
      );

      if (popup) {
        let attempts = 0;
        const repairPopup = () => {
          attempts += 1;
          try {
            flattenRoutineWork(popup.document);
          } catch {
            // Report cleanup must never block printing.
          }
          if (!popup.closed && attempts < 40) window.setTimeout(repairPopup, 25);
        };
        window.setTimeout(repairPopup, 0);
      }

      return popup;
    }) as typeof window.open;

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("input", rememberNote, true);
    document.addEventListener("change", rememberNote, true);
    window.open = patchedOpen;

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("input", rememberNote, true);
      document.removeEventListener("change", rememberNote, true);
      window.open = originalOpen;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-owner-report-compact-root {
        padding-top: 0 !important;
      }

      .atlas-owner-report-compact-header {
        min-height: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        border-bottom-width: 1px !important;
      }

      .atlas-owner-report-compact-title {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        line-height: 1.15 !important;
      }

      .atlas-owner-report-compact-first-content {
        margin-top: 0 !important;
        padding-top: 8px !important;
      }

      @media (max-width: 900px) {
        .atlas-owner-report-compact-header {
          padding-top: 4px !important;
          padding-bottom: 5px !important;
        }

        .atlas-owner-report-compact-first-content {
          padding-top: 6px !important;
        }
      }
    `}</style>
  );
}
