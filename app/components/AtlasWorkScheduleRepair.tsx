"use client";

import { useEffect } from "react";

type AtlasRecord = Record<string, any>;

const PROPERTY_IDS = new Set(["2000", "6855", "3661", "Hangar", "4725"]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalized(value: unknown) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function serviceRecords(payload: any) {
  if (Array.isArray(payload?.serviceRecords)) return payload.serviceRecords as AtlasRecord[];
  if (Array.isArray(payload?.workOrders)) return payload.workOrders as AtlasRecord[];
  return [] as AtlasRecord[];
}

function isAnnual(record: AtlasRecord) {
  const title = normalized(record?.title);
  const unit = normalized(record?.recurrenceUnit || record?.recurrence_unit);
  return (
    title.includes("annual") ||
    title.includes("yearly") ||
    ["year", "years", "annual", "annually", "yearly"].includes(unit)
  );
}

function activePropertyId() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  for (const select of selects) {
    const options = Array.from(select.options).map((option) => text(option.value || option.textContent));
    const knownOptions = options.filter((option) => PROPERTY_IDS.has(option));
    if (knownOptions.length >= 2 && PROPERTY_IDS.has(text(select.value))) {
      return text(select.value);
    }
  }

  const controls = Array.from(document.querySelectorAll<HTMLElement>("button, [role='button']"));
  for (const control of controls) {
    const value = text(control.textContent);
    if (PROPERTY_IDS.has(value)) return value;
  }

  return "2000";
}

function dashboardRoot() {
  const mains = Array.from(document.querySelectorAll<HTMLElement>("main"));
  return (
    mains.find((main) => {
      const value = normalized(main.textContent);
      if (!value) return false;
      const buttons = Array.from(main.querySelectorAll<HTMLButtonElement>("button"))
        .map((button) => normalized(button.textContent));
      const hasToday = buttons.includes("today");
      const hasUpcoming = buttons.includes("upcoming");
      const hasOverdue = buttons.includes("overdue");
      return (
        (value.includes("daily operations") || value.includes("daily work") || value.includes("dashboard")) &&
        hasToday &&
        hasUpcoming &&
        hasOverdue
      );
    }) || null
  );
}

function restoreHiddenRows() {
  for (const row of Array.from(document.querySelectorAll<HTMLElement>("[data-atlas-undated-annual-hidden='true']"))) {
    row.style.removeProperty("display");
    delete row.dataset.atlasUndatedAnnualHidden;
  }
}

function matchingWorkRow(titleElement: HTMLElement, root: HTMLElement) {
  let current: HTMLElement | null = titleElement.parentElement;
  for (let depth = 0; current && current !== root && depth < 7; depth += 1) {
    const checkbox = current.querySelector<HTMLInputElement>("input[type='checkbox']");
    if (checkbox) return current;
    current = current.parentElement;
  }
  return null;
}

function hideUndatedAnnualRows(titles: Set<string>) {
  restoreHiddenRows();
  if (!titles.size) return;

  const root = dashboardRoot();
  if (!root) return;

  const strongs = Array.from(root.querySelectorAll<HTMLElement>("strong"));
  for (const strong of strongs) {
    const title = normalized(strong.textContent);
    if (!title || !titles.has(title)) continue;
    const row = matchingWorkRow(strong, root);
    if (!row) continue;
    row.dataset.atlasUndatedAnnualHidden = "true";
    row.style.setProperty("display", "none", "important");
  }
}

async function loadUndatedAnnualTitles(propertyId: string) {
  const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) return new Set<string>();

  return new Set(
    serviceRecords(payload)
      .filter((record) => record?.recurring)
      .filter((record) => text(record?.status) !== "Completed")
      .filter((record) => !text(record?.date))
      .filter(isAnnual)
      .map((record) => normalized(record?.title))
      .filter(Boolean),
  );
}

export default function AtlasWorkScheduleRepair() {
  useEffect(() => {
    let cancelled = false;
    let titles = new Set<string>();
    let frame = 0;

    const apply = () => {
      frame = 0;
      if (!cancelled) hideUndatedAnnualRows(titles);
    };

    const scheduleApply = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    const refresh = async () => {
      const next = await loadUndatedAnnualTitles(activePropertyId()).catch(() => new Set<string>());
      if (cancelled) return;
      titles = next;
      scheduleApply();
    };

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });

    const onDataChanged = () => void refresh();
    const onChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement) {
        window.setTimeout(() => void refresh(), 0);
      }
    };

    window.addEventListener("atlas:data-changed", onDataChanged);
    document.addEventListener("change", onChange, true);
    void refresh();

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", onDataChanged);
      document.removeEventListener("change", onChange, true);
      if (frame) window.cancelAnimationFrame(frame);
      restoreHiddenRows();
    };
  }, []);

  return null;
}
