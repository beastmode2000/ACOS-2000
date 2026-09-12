"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function headingSection(doc: Document, label: string) {
  const heading = Array.from(doc.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .find((node) => normalized(node.textContent) === normalized(label));
  return (heading?.closest("section") as HTMLElement | null) || null;
}

function flattenRoutineWork(doc: Document) {
  const routineSection = headingSection(doc, "Routine Work");
  const completedSection = headingSection(doc, "Completed Work");
  if (!routineSection || !completedSection) return;
  if (routineSection.dataset.atlasRoutineFlattened === "true") return;

  const table = routineSection.querySelector<HTMLTableElement>("table");
  if (!table) {
    routineSection.remove();
    return;
  }

  const dateLabels = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"))
    .slice(1)
    .map((cell) => String(cell.querySelector("span")?.textContent || cell.textContent || "").trim());

  const events: Array<{ title: string; person: string; date: string; order: number }> = [];

  for (const row of Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"))) {
    const firstCell = row.querySelector<HTMLTableCellElement>("td");
    if (!firstCell) continue;
    const title = String(firstCell.querySelector("strong")?.textContent || firstCell.childNodes[0]?.textContent || firstCell.textContent || "").trim();
    const person = String(firstCell.querySelector("span")?.textContent || "").trim();
    if (!title) continue;

    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td")).slice(1);
    cells.forEach((cell, index) => {
      const mark = String(cell.textContent || "").trim();
      if (!mark.includes("✓")) return;
      events.push({
        title,
        person,
        date: dateLabels[index] || "",
        order: index,
      });
    });
  }

  events.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const heading = completedSection.querySelector<HTMLElement>("h2");
  const insertionPoint = heading?.nextSibling || completedSection.firstChild;
  const existingKeys = new Set(
    Array.from(completedSection.querySelectorAll<HTMLElement>(".item")).map((item) => {
      const title = normalized(item.querySelector("strong")?.textContent);
      const meta = normalized(item.querySelector(".item-main span")?.textContent);
      return `${title}|${meta}`;
    }),
  );

  for (const event of events) {
    const meta = [event.person, event.date].filter(Boolean).join(" · ");
    const key = `${normalized(event.title)}|${normalized(meta)}`;
    if (existingKeys.has(key)) continue;

    const item = doc.createElement("div");
    item.className = "item";
    item.setAttribute("data-atlas-routine-flat", "true");

    const main = doc.createElement("div");
    main.className = "item-main";

    const strong = doc.createElement("strong");
    strong.textContent = event.title;
    main.appendChild(strong);

    if (meta) {
      const span = doc.createElement("span");
      span.textContent = meta;
      main.appendChild(span);
    }

    item.appendChild(main);
    completedSection.insertBefore(item, insertionPoint);
    existingKeys.add(key);
  }

  routineSection.dataset.atlasRoutineFlattened = "true";
  routineSection.remove();

  const summary = doc.querySelector<HTMLElement>(".summary");
  if (summary) {
    summary.innerHTML = summary.innerHTML
      .replace(/\s*\d+ recurring routine(?:s)? (?:was|were) rolled up by completion day\./i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
}

export default function AtlasOwnerReportRoutineClassificationFix() {
  useEffect(() => {
    let frame = 0;

    const applyToLiveReport = () => {
      frame = 0;
      try {
        const hasOwnerReport = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2"))
          .some((node) => /owners? report/i.test(String(node.textContent || "")));
        if (hasOwnerReport) flattenRoutineWork(document);
      } catch {
        // Presentation cleanup must never block Atlas.
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(applyToLiveReport);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const originalOpen = window.open.bind(window);
    const patchedOpen: typeof window.open = ((...args: Parameters<typeof window.open>) => {
      const popup = originalOpen(...args);
      if (!popup) return popup;

      const originalPrint = popup.print.bind(popup);
      popup.print = () => {
        try {
          const hasOwnerReport = Array.from(popup.document.querySelectorAll<HTMLElement>("h1,h2"))
            .some((node) => /owners? report/i.test(String(node.textContent || "")));
          if (hasOwnerReport) flattenRoutineWork(popup.document);
        } catch {
          // Never block printing if cleanup cannot be applied.
        }
        originalPrint();
      };

      return popup;
    }) as typeof window.open;

    window.open = patchedOpen;

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.open = originalOpen;
    };
  }, []);

  return null;
}
