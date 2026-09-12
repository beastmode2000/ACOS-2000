"use client";

import { useEffect, useRef } from "react";

type AtlasRecord = Record<string, unknown>;

function normalized(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recurringRecord(record: AtlasRecord) {
  const meta =
    record.taskMeta && typeof record.taskMeta === "object"
      ? (record.taskMeta as AtlasRecord)
      : record;

  const workType = String(record.workType || meta.workType || "").toLowerCase();
  return (
    record.recurring === true ||
    meta.recurring === true ||
    workType === "preventive maintenance" ||
    Boolean(meta.routineTaskId || meta.routineDate) ||
    Boolean(meta.recurrenceInterval || meta.recurrenceUnit)
  );
}

function recordTitle(record: AtlasRecord) {
  const meta =
    record.taskMeta && typeof record.taskMeta === "object"
      ? (record.taskMeta as AtlasRecord)
      : record;
  return String(
    record.title ||
      record.name ||
      record.taskTitle ||
      record.task_title ||
      meta.title ||
      "",
  ).trim();
}

function detectPropertyId() {
  for (const select of Array.from(document.querySelectorAll<HTMLSelectElement>("select"))) {
    const value = String(select.value || "").trim().toLowerCase();
    if (["2000", "6855", "3661", "hangar"].includes(value)) return value;
    const text = String(select.selectedOptions?.[0]?.textContent || "");
    const match = text.match(/^\s*(2000|6855|3661|hangar)\b/i);
    if (match) return match[1].toLowerCase();
  }

  const reportText = Array.from(document.querySelectorAll<HTMLElement>("main"))
    .map((node) => node.textContent || "")
    .find((text) => /owner report/i.test(text) && /property\s+(2000|6855|3661|hangar)/i.test(text));
  const match = reportText?.match(/property\s+(2000|6855|3661|hangar)/i);
  return match?.[1]?.toLowerCase() || "2000";
}

function headingSection(doc: Document, label: string) {
  const heading = Array.from(doc.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .find((node) => normalized(node.textContent) === normalized(label));
  return (heading?.closest("section") as HTMLElement | null) || null;
}

function tableDateLabels(table: HTMLTableElement) {
  return Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"))
    .slice(1)
    .map((cell) => normalized(cell.querySelector("span")?.textContent || cell.textContent));
}

function itemDateLabel(item: HTMLElement) {
  const span = item.querySelector<HTMLElement>(".item-main span");
  if (!span) return "";
  const parts = String(span.textContent || "").split("·").map((part) => part.trim()).filter(Boolean);
  return normalized(parts[parts.length - 1] || "");
}

function itemPerson(item: HTMLElement) {
  const span = item.querySelector<HTMLElement>(".item-main span");
  if (!span) return "";
  const parts = String(span.textContent || "").split("·").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(" · ") : "";
}

function repairPrintedOwnerReport(doc: Document, recurringTitles: Set<string>) {
  if (!recurringTitles.size) return;

  const routineSection = headingSection(doc, "Routine Work");
  const completedSection = headingSection(doc, "Completed Work");
  if (!completedSection) return;

  let table = routineSection?.querySelector<HTMLTableElement>("table.routine") || null;
  if (!table) {
    const completedHeading = completedSection.querySelector<HTMLElement>("h2");
    const section = doc.createElement("section");
    section.className = "section";
    section.innerHTML = `
      <h2>Routine Work</h2>
      <div class="routine-wrap">
        <table class="routine">
          <thead><tr><th>Routine</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    completedSection.parentElement?.insertBefore(section, completedSection);
    table = section.querySelector<HTMLTableElement>("table.routine");
    if (!table || !completedHeading) return;
  }

  const dateLabels = tableDateLabels(table);
  if (!dateLabels.length) return;

  const tbody = table.querySelector<HTMLTableSectionElement>("tbody");
  if (!tbody) return;

  const existingRows = new Map<string, HTMLTableRowElement>();
  for (const row of Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"))) {
    const title = row.querySelector("td strong")?.textContent || row.querySelector("td")?.textContent || "";
    const key = normalized(title);
    if (key) existingRows.set(key, row);
  }

  const items = Array.from(completedSection.querySelectorAll<HTMLElement>(".item"));
  for (const item of items) {
    const strong = item.querySelector<HTMLElement>(".item-main strong");
    const title = String(strong?.textContent || "").trim();
    const key = normalized(title);
    if (!key || !recurringTitles.has(key)) continue;

    const dateLabel = itemDateLabel(item);
    const columnIndex = dateLabels.findIndex((label) => label === dateLabel || label.endsWith(dateLabel) || dateLabel.endsWith(label));
    if (columnIndex < 0) continue;

    let row = existingRows.get(key) || null;
    if (!row) {
      row = doc.createElement("tr");
      const first = doc.createElement("td");
      const titleEl = doc.createElement("strong");
      titleEl.textContent = title;
      first.appendChild(titleEl);
      const person = itemPerson(item);
      if (person) {
        const personEl = doc.createElement("span");
        personEl.textContent = person;
        first.appendChild(personEl);
      }
      row.appendChild(first);
      for (let index = 0; index < dateLabels.length; index += 1) {
        const cell = doc.createElement("td");
        cell.className = "mark";
        cell.textContent = "—";
        row.appendChild(cell);
      }
      tbody.appendChild(row);
      existingRows.set(key, row);
    }

    const markCell = row.children[columnIndex + 1] as HTMLElement | undefined;
    if (markCell) markCell.textContent = "✓";
    item.remove();
  }

  for (const group of Array.from(completedSection.querySelectorAll<HTMLElement>(".dept-group"))) {
    if (!group.querySelector(".item")) group.remove();
  }
  if (!completedSection.querySelector(".item")) completedSection.remove();

  const rowCount = tbody.querySelectorAll("tr").length;
  const summary = doc.querySelector<HTMLElement>(".summary");
  if (summary && rowCount) {
    summary.innerHTML = summary.innerHTML.replace(
      /\d+ recurring routine(?:s)? (?:was|were) rolled up by completion day\./i,
      `${rowCount} recurring routine${rowCount === 1 ? " was" : "s were"} rolled up by completion day.`,
    );
  }
}

export default function AtlasOwnerReportRoutineClassificationFix() {
  const recurringTitlesRef = useRef<Set<string>>(new Set());
  const propertyRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let loadTimer = 0;

    const loadRecurringTitles = async () => {
      const propertyId = detectPropertyId();
      if (!propertyId || propertyId === propertyRef.current) return;
      propertyRef.current = propertyId;
      try {
        const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, {
          cache: "no-store",
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false || cancelled) return;

        const records = [
          ...(Array.isArray(payload?.workOrders)
            ? payload.workOrders
            : Array.isArray(payload?.serviceRecords)
              ? payload.serviceRecords
              : []),
          ...(Array.isArray(payload?.taskRecords)
            ? payload.taskRecords
            : Array.isArray(payload?.tasks)
              ? payload.tasks
              : []),
        ] as AtlasRecord[];

        recurringTitlesRef.current = new Set(
          records
            .filter(recurringRecord)
            .map(recordTitle)
            .map(normalized)
            .filter(Boolean),
        );
      } catch {
        // Keep the report usable if classification metadata cannot be loaded.
      }
    };

    const scheduleLoad = () => {
      window.clearTimeout(loadTimer);
      loadTimer = window.setTimeout(() => {
        const nextProperty = detectPropertyId();
        if (nextProperty !== propertyRef.current) propertyRef.current = "";
        void loadRecurringTitles();
      }, 80);
    };

    void loadRecurringTitles();
    document.addEventListener("change", scheduleLoad, true);

    const originalOpen = window.open.bind(window);
    const patchedOpen: typeof window.open = ((...args: Parameters<typeof window.open>) => {
      const popup = originalOpen(...args);
      if (!popup) return popup;

      const originalPrint = popup.print.bind(popup);
      popup.print = () => {
        try {
          const ownerReport = Array.from(popup.document.querySelectorAll<HTMLElement>("h1,h2"))
            .some((node) => /owners? report/i.test(String(node.textContent || "")));
          if (ownerReport) repairPrintedOwnerReport(popup.document, recurringTitlesRef.current);
        } catch {
          // Never block printing if the repair cannot be applied.
        }
        originalPrint();
      };
      return popup;
    }) as typeof window.open;

    window.open = patchedOpen;

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      document.removeEventListener("change", scheduleLoad, true);
      window.open = originalOpen;
    };
  }, []);

  return null;
}
