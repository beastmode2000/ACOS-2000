"use client";

import { useEffect } from "react";

type AtlasRecord = Record<string, any>;

const SEASON_MONTHS: Record<string, number[]> = {
  Spring: [3, 4, 5],
  Summer: [6, 7, 8],
  Fall: [9, 10, 11],
  Winter: [12, 1, 2],
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function activePropertyId() {
  const known = new Set(["2000", "6855", "3661", "Hangar", "4725"]);
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  for (const select of selects) {
    const options = Array.from(select.options).map((option) => text(option.value || option.textContent));
    if (options.filter((option) => known.has(option)).length >= 2 && known.has(text(select.value))) {
      return text(select.value);
    }
  }

  const controls = Array.from(document.querySelectorAll<HTMLElement>("button, [role='button']"));
  for (const control of controls) {
    const value = text(control.textContent);
    if (known.has(value)) return value;
  }

  return "2000";
}

function showToast(message: string, warning = false) {
  const existing = document.querySelector<HTMLElement>("[data-atlas-workflow-toast]");
  existing?.remove();
  const toast = document.createElement("div");
  toast.dataset.atlasWorkflowToast = "true";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    left: "50%",
    bottom: "92px",
    transform: "translateX(-50%)",
    zIndex: "120000",
    maxWidth: "calc(100vw - 24px)",
    padding: "10px 14px",
    borderRadius: "12px",
    background: warning ? "#7A271A" : "#0B2C43",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: "800",
    boxShadow: "0 12px 30px rgba(0,0,0,.2)",
  } as CSSStyleDeclaration);
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

async function loadAtlas(propertyId: string) {
  const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Atlas data could not be loaded.");
  return payload;
}

function serviceRecords(payload: any) {
  if (Array.isArray(payload?.serviceRecords)) return payload.serviceRecords as AtlasRecord[];
  if (Array.isArray(payload?.workOrders)) return payload.workOrders as AtlasRecord[];
  return [] as AtlasRecord[];
}

async function saveWorkRecord(record: AtlasRecord) {
  const propertyId = text(record.propertyId || record.property_id) || activePropertyId();
  const response = await fetch("/api/atlas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-request-id": `workflow-${text(record.id) || uid("work")}-${Date.now()}`,
    },
    credentials: "include",
    body: JSON.stringify({ table: "work_orders", propertyId, record: { ...record, propertyId } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Work did not save.");
  return payload;
}

async function saveCalendarRecord(propertyId: string, record: AtlasRecord) {
  const response = await fetch("/api/atlas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-request-id": `vendor-calendar-${record.id}`,
    },
    credentials: "include",
    body: JSON.stringify({ table: "calendar", propertyId, record: { ...record, propertyId } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Vendor visit calendar event did not save.");
}

function notesHistory(record: AtlasRecord) {
  return Array.isArray(record.notesHistory) ? record.notesHistory as AtlasRecord[] : [];
}

function latestMarker(record: AtlasRecord, prefixes: string[]) {
  for (const entry of notesHistory(record)) {
    const value = text(entry?.text);
    if (prefixes.some((prefix) => value.startsWith(prefix))) return value;
  }
  return "";
}

function isManuallyPaused(record: AtlasRecord) {
  const marker = latestMarker(record, ["ATLAS_RECURRING_PAUSED|", "ATLAS_RECURRING_RESUMED|"]);
  return marker.startsWith("ATLAS_RECURRING_PAUSED|");
}

function isSeasonallyPaused(record: AtlasRecord) {
  const marker = latestMarker(record, ["ATLAS_SEASONAL_PAUSED|", "ATLAS_SEASONAL_RESUMED|"]);
  return marker.startsWith("ATLAS_SEASONAL_PAUSED|");
}

function seasonIsActive(season: string, month = new Date().getMonth() + 1) {
  if (!season || season === "Year-Round") return true;
  return (SEASON_MONTHS[season] || []).includes(month);
}

function prependNote(record: AtlasRecord, marker: string, outcome: string) {
  return [
    { id: uid("note"), text: marker, outcome, createdAt: new Date().toISOString() },
    ...notesHistory(record),
  ];
}

function nextSeasonStart(season: string) {
  const months = SEASON_MONTHS[season];
  if (!months?.length) return todayKey();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const targetMonth = months.find((month) => month > currentMonth) ?? months[0];
  const year = targetMonth > currentMonth ? now.getFullYear() : now.getFullYear() + 1;
  return `${year}-${String(targetMonth).padStart(2, "0")}-01`;
}

async function enforceSeasonalRecords() {
  const propertyId = activePropertyId();
  const payload = await loadAtlas(propertyId);
  const records = serviceRecords(payload).filter((record) => Boolean(record?.recurring));
  let changed = false;

  for (const record of records) {
    const season = text(record.season || "Year-Round");
    if (season === "Year-Round" || isManuallyPaused(record)) continue;
    const active = seasonIsActive(season);
    const seasonalPaused = isSeasonallyPaused(record);

    if (!active && !seasonalPaused) {
      const previousDate = text(record.date).slice(0, 10);
      const marker = `ATLAS_SEASONAL_PAUSED|${season}|${previousDate}|${new Date().toISOString()}`;
      await saveWorkRecord({
        ...record,
        date: "",
        status: "Monitor",
        recurrenceEndDate: todayKey(),
        lastOutcome: `Seasonal pause — ${season}`,
        lastOutcomeAt: new Date().toISOString(),
        notesHistory: prependNote(record, marker, "Seasonal Pause"),
      });
      changed = true;
      continue;
    }

    if (active && seasonalPaused) {
      const marker = `ATLAS_SEASONAL_RESUMED|${season}|${new Date().toISOString()}`;
      await saveWorkRecord({
        ...record,
        date: text(record.date).slice(0, 10) || todayKey(),
        status: "Scheduled",
        recurrenceEndDate: "",
        lastOutcome: `Seasonal recurrence resumed — ${season}`,
        lastOutcomeAt: new Date().toISOString(),
        notesHistory: prependNote(record, marker, "Seasonal Resume"),
      });
      changed = true;
    }
  }

  if (changed) {
    window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { table: "work_orders", reason: "seasonal-recurrence" } }));
  }
}

function workTitleFromPanel(panel: HTMLElement) {
  return text(panel.querySelector("h2")?.textContent);
}

async function resolveRecurringRecord(panel: HTMLElement) {
  const title = workTitleFromPanel(panel);
  if (!title) return null;
  const propertyId = activePropertyId();
  const payload = await loadAtlas(propertyId);
  const matches = serviceRecords(payload).filter((record) => Boolean(record?.recurring) && text(record?.title) === title);
  if (matches.length === 1) return matches[0];
  if (!matches.length) return null;

  const panelText = normalized(panel.textContent);
  const exact = matches.filter((record) => {
    const due = text(record.date).slice(0, 10);
    if (!due) return panelText.includes("next due");
    const date = new Date(`${due}T12:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const short = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
    return panelText.includes(short);
  });
  return exact.length === 1 ? exact[0] : null;
}

async function renderRecurringControl(host: HTMLElement, panel: HTMLElement) {
  host.innerHTML = "<span style='font-size:12px;color:#667085'>Loading recurrence controls…</span>";
  try {
    const record = await resolveRecurringRecord(panel);
    if (!record) {
      host.innerHTML = "<span style='font-size:12px;color:#667085'>Recurring controls are available when this work item can be identified uniquely.</span>";
      return;
    }

    const paused = isManuallyPaused(record);
    const season = text(record.season || "Year-Round") || "Year-Round";
    const seasonalPaused = isSeasonallyPaused(record);
    const resumeDate = nextSeasonStart(season);

    host.innerHTML = "";
    const heading = document.createElement("div");
    heading.innerHTML = `<strong style="color:#0B2C43;font-size:13px">Recurrence</strong><span style="font-size:11px;color:#667085">${paused ? "Paused" : seasonalPaused ? `Paused for ${season}` : season === "Year-Round" ? "Active year-round" : `Active · ${season}`}</span>`;
    Object.assign(heading.style, { display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" });

    const controls = document.createElement("div");
    Object.assign(controls.style, { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "7px", marginTop: "8px" });

    const pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.textContent = paused ? "Resume" : "Pause";
    pauseButton.style.cssText = "min-height:38px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#0B2C43;font-weight:800;cursor:pointer;padding:7px 10px";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = paused ? todayKey() : resumeDate;
    dateInput.title = paused ? "Resume date" : "Date to resume after pausing";
    dateInput.style.cssText = "min-height:38px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#0B2C43;padding:6px 8px;box-sizing:border-box";

    const seasonSelect = document.createElement("select");
    seasonSelect.style.cssText = "min-height:38px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#0B2C43;padding:6px 8px;font-weight:700";
    for (const optionValue of ["Year-Round", "Spring", "Summer", "Fall", "Winter"]) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = season === optionValue;
      seasonSelect.appendChild(option);
    }

    pauseButton.addEventListener("click", async () => {
      pauseButton.disabled = true;
      try {
        if (!paused) {
          const previousDate = text(record.date).slice(0, 10);
          const marker = `ATLAS_RECURRING_PAUSED|${previousDate}|${new Date().toISOString()}`;
          await saveWorkRecord({
            ...record,
            date: "",
            status: "Monitor",
            recurrenceEndDate: todayKey(),
            lastOutcome: "Recurring Series Paused",
            lastOutcomeAt: new Date().toISOString(),
            notesHistory: prependNote(record, marker, "Paused"),
          });
          showToast("Recurring work paused.");
        } else {
          const restart = dateInput.value || todayKey();
          const marker = `ATLAS_RECURRING_RESUMED|${restart}|${new Date().toISOString()}`;
          await saveWorkRecord({
            ...record,
            date: restart,
            status: "Scheduled",
            recurrenceEndDate: "",
            lastOutcome: "Recurring Series Resumed",
            lastOutcomeAt: new Date().toISOString(),
            notesHistory: prependNote(record, marker, "Resumed"),
          });
          showToast("Recurring work resumed.");
        }
        window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { table: "work_orders" } }));
        window.setTimeout(() => window.location.reload(), 450);
      } catch (error) {
        pauseButton.disabled = false;
        showToast(error instanceof Error ? error.message : "Recurring work did not save.", true);
      }
    });

    seasonSelect.addEventListener("change", async () => {
      seasonSelect.disabled = true;
      try {
        const nextSeason = seasonSelect.value;
        let next: AtlasRecord = { ...record, season: nextSeason };
        const active = seasonIsActive(nextSeason);

        if (nextSeason !== "Year-Round" && !active && !isManuallyPaused(record)) {
          const previousDate = text(record.date).slice(0, 10);
          const marker = `ATLAS_SEASONAL_PAUSED|${nextSeason}|${previousDate}|${new Date().toISOString()}`;
          next = {
            ...next,
            date: "",
            status: "Monitor",
            recurrenceEndDate: todayKey(),
            lastOutcome: `Seasonal pause — ${nextSeason}`,
            lastOutcomeAt: new Date().toISOString(),
            notesHistory: prependNote(record, marker, "Seasonal Pause"),
          };
        } else if ((nextSeason === "Year-Round" || active) && isSeasonallyPaused(record) && !isManuallyPaused(record)) {
          const marker = `ATLAS_SEASONAL_RESUMED|${nextSeason}|${new Date().toISOString()}`;
          next = {
            ...next,
            date: text(record.date).slice(0, 10) || todayKey(),
            status: "Scheduled",
            recurrenceEndDate: "",
            lastOutcome: `Seasonal recurrence resumed — ${nextSeason}`,
            lastOutcomeAt: new Date().toISOString(),
            notesHistory: prependNote(record, marker, "Seasonal Resume"),
          };
        }

        await saveWorkRecord(next);
        showToast(nextSeason === "Year-Round" ? "Recurrence set to year-round." : `Recurrence set to ${nextSeason}.`);
        window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { table: "work_orders" } }));
        window.setTimeout(() => window.location.reload(), 450);
      } catch (error) {
        seasonSelect.disabled = false;
        showToast(error instanceof Error ? error.message : "Seasonal schedule did not save.", true);
      }
    });

    controls.append(pauseButton, dateInput, seasonSelect);
    host.append(heading, controls);
  } catch (error) {
    host.innerHTML = `<span style="font-size:12px;color:#B42318">${error instanceof Error ? error.message : "Recurring controls could not load."}</span>`;
  }
}

function enhanceRecurringPanel() {
  const panel = document.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  const badges = Array.from(panel.querySelectorAll<HTMLElement>("span"));
  if (!badges.some((badge) => normalized(badge.textContent) === "recurring")) return;
  const title = workTitleFromPanel(panel);
  if (!title) return;

  const existing = panel.querySelector<HTMLElement>("[data-atlas-recurring-control]");
  if (existing?.dataset.recordTitle === title) return;
  existing?.remove();

  const host = document.createElement("section");
  host.dataset.atlasRecurringControl = "true";
  host.dataset.recordTitle = title;
  host.style.cssText = "border:1px solid #DCE4EC;border-radius:12px;background:#F8FAFC;padding:10px 12px;box-sizing:border-box";

  const firstSection = panel.querySelector("section");
  if (firstSection?.parentElement) firstSection.insertAdjacentElement("afterend", host);
  else panel.prepend(host);
  void renderRecurringControl(host, panel);
}

function enhanceNewWorkSave() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("main section"));
  const section = sections.find((candidate) => {
    const value = normalized(candidate.textContent);
    return value.includes("new work") && value.includes("nothing is added until you press create");
  });
  if (!section) return;

  const nativeCreate = Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "create" || normalized(button.textContent) === "save work",
  );
  if (!nativeCreate) return;
  nativeCreate.textContent = "Save Work";

  if (section.querySelector("[data-atlas-new-work-save]")) return;
  const header = Array.from(section.querySelectorAll<HTMLElement>("div")).find((element) => {
    const value = normalized(element.textContent);
    return value.includes("new work") && value.includes("cancel") && element.querySelector("button");
  });
  if (!header) return;

  const save = document.createElement("button");
  save.type = "button";
  save.dataset.atlasNewWorkSave = "true";
  save.textContent = "Save Work";
  save.style.cssText = "min-height:40px;border:1px solid #E6A92B;border-radius:10px;background:#E6A92B;color:#0B2C43;font-weight:900;padding:8px 13px;cursor:pointer";
  save.addEventListener("click", () => {
    if (save.disabled) return;
    save.disabled = true;
    save.textContent = "Saving…";
    nativeCreate.click();
    const started = Date.now();
    const timer = window.setInterval(() => {
      const stillOpen = document.body.contains(section);
      if (!stillOpen) {
        window.clearInterval(timer);
        showToast("Work saved.");
        return;
      }
      if (Date.now() - started > 10000) {
        window.clearInterval(timer);
        save.disabled = false;
        save.textContent = "Save Work";
        showToast("Work did not save. The form is still open so nothing was lost.", true);
      }
    }, 180);
  });

  const cancel = Array.from(header.querySelectorAll<HTMLButtonElement>("button")).find((button) => normalized(button.textContent) === "cancel");
  if (cancel?.parentElement) cancel.parentElement.insertBefore(save, cancel);
  else header.appendChild(save);

  Object.assign(header.style, {
    position: "sticky",
    top: "0",
    zIndex: "20",
    background: "#FFFFFF",
    paddingTop: "6px",
    paddingBottom: "8px",
  });
}

function vendorVisitSectionFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const section = target.closest<HTMLElement>("section");
  if (!section) return null;
  const value = normalized(section.textContent);
  if (!value.includes("vendor visit")) return null;
  if (!value.includes("quick log") && !value.includes("log visit")) return null;
  return section;
}

function visitDraftFromSection(section: HTMLElement) {
  const inputs = Array.from(section.querySelectorAll<HTMLInputElement>("input"))
    .filter((input) => input.type !== "hidden")
    .map((input) => text(input.value))
    .filter(Boolean);
  const select = section.querySelector<HTMLSelectElement>("select");
  const selectedOption = select?.selectedOptions?.[0];
  const vendorFromSelect = text(selectedOption?.textContent);
  const vendorName = vendorFromSelect && !/choose|select|vendor/i.test(vendorFromSelect) ? vendorFromSelect : inputs[0] || "Vendor";
  const note = inputs.find((value) => value !== vendorName) || "Onsite visit";
  const vendorId = text(select?.value);
  return { vendorName, note, vendorId };
}

async function persistDashboardVendorVisit(section: HTMLElement) {
  const { vendorName, note, vendorId } = visitDraftFromSection(section);
  if (!vendorName || vendorName === "Vendor") return;
  const propertyId = activePropertyId();
  const date = todayKey();
  const dedupeKey = `atlas-vendor-visit:${propertyId}:${date}:${normalized(vendorName)}:${normalized(note)}`;
  const last = Number(window.sessionStorage.getItem(dedupeKey) || "0");
  if (Date.now() - last < 15000) return;
  window.sessionStorage.setItem(dedupeKey, String(Date.now()));

  const timestamp = Date.now();
  const completedAt = new Date().toISOString();
  const purpose = note || "Onsite visit";
  const calendarRecord = {
    id: `visit-calendar-${timestamp}`,
    propertyId,
    date,
    time: "",
    title: `${vendorName} — ${purpose}`,
    area: "Vendor Visit",
    categoryLabel: "Vendor Visit",
    colorId: "vendor-visit",
    allDay: true,
    repeat: "None",
    reminder: "None",
    notes: purpose,
    linkedType: vendorId ? "Vendor" : undefined,
    linkedId: vendorId,
    linkedName: vendorName,
    completed: true,
    status: "Completed",
    source: "manual",
  };
  const workRecord = {
    id: `vendor-visit-${timestamp}`,
    propertyId,
    vendorId,
    date,
    title: `${vendorName} onsite — ${purpose}`,
    status: "Completed",
    priority: "Medium",
    notes: purpose,
    recurring: false,
    lastCompletedDate: date,
    completedAt,
    completionHistory: [date],
    workType: "Quick Task",
    workCategory: "Vendor Visit",
    responsibilityArea: "Vendor Visit",
    photos: [],
    documents: [],
  };

  try {
    await Promise.all([saveCalendarRecord(propertyId, calendarRecord), saveWorkRecord(workRecord)]);
    window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { table: "vendor_visit" } }));
    showToast("Vendor visit added to Calendar, Dashboard, and Owner Report.");
  } catch (error) {
    window.sessionStorage.removeItem(dedupeKey);
    showToast(error instanceof Error ? error.message : "Vendor visit did not fully save.", true);
  }
}

export default function AtlasWorkflowReliability() {
  useEffect(() => {
    let frame = 0;
    let seasonalTimer = 0;

    const apply = () => {
      frame = 0;
      enhanceNewWorkSave();
      enhanceRecurringPanel();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onClickCapture = (event: MouseEvent) => {
      const section = vendorVisitSectionFromTarget(event.target);
      if (!section) return;
      const control = event.target instanceof Element ? event.target.closest<HTMLElement>("button") : null;
      if (!control) return;
      const label = normalized(control.textContent);
      if (label.includes("log") && label.includes("visit")) {
        void persistDashboardVendorVisit(section);
      }
    };

    const onKeyCapture = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const section = vendorVisitSectionFromTarget(event.target);
      if (!section) return;
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input) return;
      window.setTimeout(() => void persistDashboardVendorVisit(section), 0);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyCapture, true);
    window.addEventListener("atlas:data-changed", schedule as EventListener);
    schedule();

    seasonalTimer = window.setTimeout(() => {
      void enforceSeasonalRecords().catch(() => undefined);
    }, 1800);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("keydown", onKeyCapture, true);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
      if (seasonalTimer) window.clearTimeout(seasonalTimer);
    };
  }, []);

  return null;
}
