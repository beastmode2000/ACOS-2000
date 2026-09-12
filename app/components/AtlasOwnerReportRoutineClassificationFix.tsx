"use client";

import { useEffect, useRef } from "react";

type AtlasRecord = Record<string, unknown>;

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecurringRecord(record: AtlasRecord) {
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
  for (const select of Array.from(document.querySelectorAll("select"))) {
    const element = select as HTMLSelectElement;
    const value = String(element.value || "").trim().toLowerCase();
    if (["2000", "6855", "3661", "hangar"].includes(value)) return value;

    const text = String(element.selectedOptions?.[0]?.textContent || "");
    const match = text.match(/^\s*(2000|6855|3661|hangar)\b/i);
    if (match) return match[1].toLowerCase();
  }

  return "2000";
}

function ownerReportRoot(doc: Document) {
  const heading = Array.from(doc.querySelectorAll("h1,h2"))
    .find((node) => /owners? report/i.test(String(node.textContent || "")));
  if (!heading) return null;
  return heading.closest("section") || heading.parentElement;
}

function currentPeriod() {
  const root = ownerReportRoot(document);
  const dates = root ? Array.from(root.querySelectorAll('input[type="date"]')) : [];
  const start = String((dates[0] as HTMLInputElement | undefined)?.value || "");
  const end = String((dates[1] as HTMLInputElement | undefined)?.value || "");
  return { start, end };
}

function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function businessDays(start: string, end: string) {
  if (!start || !end) return [] as Array<{ key: string; day: string; label: string }>;

  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];

  const result: Array<{ key: string; day: string; label: string }> = [];
  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = cursor.getDay();
    if (weekday === 0 || weekday === 6) continue;
    result.push({
      key: localDate(cursor),
      day: cursor.toLocaleDateString(undefined, { weekday: "short" }),
      label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  return result;
}

function headingSection(doc: Document, label: string) {
  const heading = Array.from(doc.querySelectorAll("h1,h2,h3"))
    .find((node) => normalize(node.textContent) === normalize(label));
  return (heading?.closest("section") as HTMLElement | null) || null;
}

function itemMeta(item: HTMLElement) {
  const span = item.querySelector(".item-main span");
  const parts = String(span?.textContent || "")
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    person: parts.length > 1 ? parts.slice(0, -1).join(" · ") : "",
    dateLabel: parts.length ? parts[parts.length - 1] : "",
  };
}

function ensureRoutineTable(
  doc: Document,
  completedSection: HTMLElement,
  periodStart: string,
  periodEnd: string,
) {
  let routineSection = headingSection(doc, "Routine Work");
  let table = routineSection?.querySelector("table.routine") as HTMLTableElement | null;
  if (table) return { section: routineSection as HTMLElement, table };

  const days = businessDays(periodStart, periodEnd);
  if (!days.length) return null;

  routineSection = doc.createElement("section");
  routineSection.className = "section";
  routineSection.innerHTML = `
    <h2>Routine Work</h2>
    <div class="routine-wrap">
      <table class="routine">
        <thead>
          <tr>
            <th>Routine</th>
            ${days.map((day) => `<th>${day.day}<span>${day.label}</span></th>`).join("")}
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  completedSection.parentElement?.insertBefore(routineSection, completedSection);
  table = routineSection.querySelector("table.routine") as HTMLTableElement | null;
  return table ? { section: routineSection, table } : null;
}

function repairOwnerReport(
  doc: Document,
  recurringTitles: Set<string>,
  periodStart: string,
  periodEnd: string,
) {
  if (!recurringTitles.size) return;

  const completedSection = headingSection(doc, "Completed Work");
  if (!completedSection) return;

  const routine = ensureRoutineTable(doc, completedSection, periodStart, periodEnd);
  if (!routine) return;

  const table = routine.table;
  const headers = Array.from(table.querySelectorAll("thead th")).slice(1);
  const headerLabels = headers.map((cell) => normalize(cell.querySelector("span")?.textContent || cell.textContent));
  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  const existingRows = new Map<string, HTMLTableRowElement>();
  for (const row of Array.from(tbody.querySelectorAll("tr"))) {
    const title = String(row.querySelector("td strong")?.textContent || row.querySelector("td")?.textContent || "");
    const key = normalize(title);
    if (key) existingRows.set(key, row as HTMLTableRowElement);
  }

  const completedItems = Array.from(completedSection.querySelectorAll(".item")) as HTMLElement[];

  for (const item of completedItems) {
    const title = String(item.querySelector(".item-main strong")?.textContent || "").trim();
    const titleKey = normalize(title);
    if (!titleKey || !recurringTitles.has(titleKey)) continue;

    const meta = itemMeta(item);
    const dateKey = normalize(meta.dateLabel);
    const columnIndex = headerLabels.findIndex(
      (header) => header === dateKey || header.endsWith(dateKey) || dateKey.endsWith(header),
    );
    if (columnIndex < 0) continue;

    let row = existingRows.get(titleKey) || null;
    if (!row) {
      row = doc.createElement("tr");
      const firstCell = doc.createElement("td");
      const strong = doc.createElement("strong");
      strong.textContent = title;
      firstCell.appendChild(strong);

      if (meta.person) {
        const span = doc.createElement("span");
        span.textContent = meta.person;
        firstCell.appendChild(span);
      }

      row.appendChild(firstCell);
      for (let index = 0; index < headerLabels.length; index += 1) {
        const cell = doc.createElement("td");
        cell.className = "mark";
        cell.textContent = "—";
        row.appendChild(cell);
      }
      tbody.appendChild(row);
      existingRows.set(titleKey, row);
    }

    const markCell = row.children[columnIndex + 1] as HTMLElement | undefined;
    if (markCell) markCell.textContent = "✓";
    item.remove();
  }

  for (const group of Array.from(completedSection.querySelectorAll(".dept-group"))) {
    if (!group.querySelector(".item")) group.remove();
  }

  if (!completedSection.querySelector(".item")) completedSection.remove();

  const rowCount = tbody.querySelectorAll("tr").length;
  const summary = doc.querySelector(".summary") as HTMLElement | null;
  if (summary && rowCount) {
    const current = summary.innerHTML;
    if (/\d+ recurring routine(?:s)? (?:was|were) rolled up by completion day\./i.test(current)) {
      summary.innerHTML = current.replace(
        /\d+ recurring routine(?:s)? (?:was|were) rolled up by completion day\./i,
        `${rowCount} recurring routine${rowCount === 1 ? " was" : "s were"} rolled up by completion day.`,
      );
    }
  }
}

export default function AtlasOwnerReportRoutineClassificationFix() {
  const recurringTitlesRef = useRef<Set<string>>(new Set());
  const propertyRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecurringTitles() {
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
            .filter(isRecurringRecord)
            .map(recordTitle)
            .map(normalize)
            .filter(Boolean),
        );
      } catch {
        // Leave the native report untouched if Atlas metadata cannot be loaded.
      }
    }

    void loadRecurringTitles();

    const onChange = () => {
      const propertyId = detectPropertyId();
      if (propertyId !== propertyRef.current) {
        propertyRef.current = "";
        void loadRecurringTitles();
      }
    };
    document.addEventListener("change", onChange, true);

    const originalOpen = window.open.bind(window);

    const patchedOpen = (...args: any[]) => {
      const popup = originalOpen.apply(window, args as any);
      if (!popup) return popup;

      const originalPrint = popup.print.bind(popup);
      popup.print = () => {
        try {
          const hasOwnerReport = Array.from(popup.document.querySelectorAll("h1,h2"))
            .some((node) => /owners? report/i.test(String(node.textContent || "")));
          if (hasOwnerReport) {
            const period = currentPeriod();
            repairOwnerReport(
              popup.document,
              recurringTitlesRef.current,
              period.start,
              period.end,
            );
          }
        } catch {
          // Report cleanup must never block printing.
        }
        originalPrint();
      };

      return popup;
    };

    (window as any).open = patchedOpen;

    return () => {
      cancelled = true;
      document.removeEventListener("change", onChange, true);
      (window as any).open = originalOpen;
    };
  }, []);

  return null;
}
