"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;

type ReportClass =
  | "Routine"
  | "Project Update"
  | "Vendor Activity"
  | "IT / Technology"
  | "Completed Work"
  | "Issue / Follow-Up"
  | "Other"
  | "Internal Task";

type ReportPhoto = {
  id: string;
  name: string;
  caption: string;
  dataUrl: string;
  createdAt: string;
};

type ReportItem = {
  id: string;
  sourceKey: string;
  sourceType: "Work Order" | "Task / Routine" | "Team Work" | "Manual";
  sourceId: string;
  date: string;
  person: string;
  department: string;
  title: string;
  notes: string;
  vendor?: string;
  reportClass?: ReportClass;
  recurring?: boolean;
  includeInReport?: boolean;
  reportCategory?: string;
  highPriority?: boolean;
  ownerNote?: string;
  reportPhotos?: ReportPhoto[];
};

type UpcomingReportItem = {
  id: string;
  date: string;
  title: string;
  notes: string;
};

type SavedReport = {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  status: "Draft" | "Final";
  items: ReportItem[];
  upcomingItems?: UpcomingReportItem[];
  createdAt: string;
  updatedAt: string;
};

type RoutineGroup = {
  key: string;
  title: string;
  department: string;
  person: string;
  dates: string[];
};

type RoutineSummary = {
  key: string;
  title: string;
  detail: string;
  dates: string[];
};

type VehicleCareItem = {
  key: string;
  vehicle: string;
  status: "Washed" | "Not washed" | "Not needed";
  date: string;
  person: string;
};

type Props = {
  propertyId: string;
  workOrders: Row[];
  ownerInputItems?: Row[];
  colors: {
    navy: string;
    gold: string;
    line: string;
    card: string;
    panel: string;
    muted: string;
    green: string;
  };
  isMobile: boolean;
};

const departments = [
  "Maintenance & Cleaning",
  "Landscape",
  "Dock & Marine",
  "Garage / Vehicles",
  "Pool & Spa",
  "Projects",
  "Administration",
  "Other",
];

const reportCategories = [
  "Garage / Vehicles",
  "Dock & Marine",
  "Landscaping",
  "HVAC / Mechanical",
  "Pool & Spa",
  "Property Operations",
  "Maintenance & Cleaning",
  "Vendors",
  "IT / Technology",
  "Projects",
  "Administration / Office",
  "Other",
];

const reportClasses: ReportClass[] = [
  "Routine",
  "Project Update",
  "Vendor Activity",
  "IT / Technology",
  "Completed Work",
  "Issue / Follow-Up",
  "Other",
  "Internal Task",
];

function reportClassLabel(reportClass: ReportClass) {
  if (reportClass === "Vendor Activity") return "Vendors";
  return reportClass;
}

const reportOutcomeLabels = [
  "not needed this time",
  "didn't get to this week",
  "didnt get to this week",
  "rescheduled",
  "started / in progress",
  "reopened",
  "cancelled",
  "canceled",
  "recurring series stopped",
  "waiting",
  "monitor",
];

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function mondayOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return localDate(date);
}

function dateOnly(value: unknown) {
  return String(value || "").slice(0, 10);
}

function uniqueDates(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map(dateOnly)
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
    ),
  ).sort();
}

function recordText(...values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function inferDepartment(row: Row) {
  const value = recordText(
    row.department,
    row.workCategory,
    row.work_category,
    row.responsibilityArea,
    row.responsibility_area,
    row.category,
    row.title,
    row.taskTitle,
    row.task_title,
    row.listName,
    row.location,
    row.notes,
    row.note,
  );

  if (/dock|marine|boat|cobalt|sea.?doo|watercraft|sunstream|lift box|liftbox|waterfront/.test(value)) return "Dock & Marine";
  if (/landscap|irrigat|fertiliz|lawn|garden|weed|plant|tree|shrub|yard|grounds/.test(value)) return "Landscape";
  if (/garage|vehicle|ford|f-?150|mercedes|rivian|porsche|car clean|wash car|detail/.test(value)) return "Garage / Vehicles";
  if (/pool|spa|hot tub|sundance|chlorine|filter|backwash/.test(value)) return "Pool & Spa";
  if (/project|construction|paint|siding|renovat|install/.test(value)) return "Projects";
  if (/admin|invoice|receipt|owner update|meeting|email|computer/.test(value)) return "Administration";
  if (/clean|maintenance|appliance|house|window|trash|reset|service|repair|inspect/.test(value)) return "Maintenance & Cleaning";
  return "Other";
}

function isRecurringRecord(row: Row) {
  return Boolean(
    row.recurring === true ||
      row.isRecurring === true ||
      row.is_recurring === true ||
      row.repeat === true ||
      row.repeats === true,
  );
}

function inferReportClass(row: Row, sourceType: ReportItem["sourceType"]): ReportClass {
  const department = inferDepartment(row);
  const workType = String(row.workType || row.work_type || row.type || "").trim().toLowerCase();
  if (department === "Projects" || workType === "project") return "Project Update";
  if (row.vendorId || row.vendor_id || row.vendorName || row.vendor_name) return "Vendor Activity";
  const value = recordText(
    row.title,
    row.name,
    row.notes,
    row.note,
    row.category,
    row.workCategory,
    row.work_category,
    row.location,
  );
  if (/\b(xfinity|wi-?fi|wifi|network|internet|unifi|control4|alarm\.com|router|modem|ethernet|access point|computer|printer|server|av|audio|video)\b/.test(value)) {
    return "IT / Technology";
  }
  if (isRecurringRecord(row)) return "Routine";
  if (sourceType === "Task / Routine") return "Internal Task";
  return "Completed Work";
}

function displayPerson(row: Row) {
  return String(
    row.actionBy ||
      row.action_by ||
      row.actor ||
      row.performedBy ||
      row.performed_by ||
      row.assignedTo ||
      row.assignee ||
      row.employeeName ||
      row.employee_name ||
      row.completedBy ||
      "",
  ).trim();
}

function displayVendor(row: Row) {
  const values = [row.vendorName, row.vendor_name, row.vendor];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizedOutcome(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function reportableOutcomeFromEntry(entry: Row) {
  const explicit = normalizedOutcome(entry.outcome || entry.action || entry.status);
  const text = String(entry.text || entry.note || entry.notes || "").trim();
  const normalizedText = text.toLowerCase();

  if (explicit.includes("not needed") || normalizedText.startsWith("not needed")) {
    return { label: "Not Needed This Time", detail: text };
  }
  if (
    explicit.includes("deferred") ||
    explicit.includes("didn't get to") ||
    explicit.includes("didnt get to") ||
    normalizedText.includes("didn't get to this week") ||
    normalizedText.includes("didnt get to this week")
  ) {
    return { label: "Didn't Get To This Week", detail: text };
  }
  if (explicit.includes("resched") || normalizedText.startsWith("rescheduled")) {
    return { label: "Rescheduled", detail: text };
  }
  if (explicit.includes("started") || explicit.includes("in progress") || normalizedText.startsWith("started")) {
    return { label: "Started / In Progress", detail: text };
  }
  if (explicit.includes("reopen") || normalizedText.startsWith("reopened")) {
    return { label: "Reopened", detail: text };
  }
  if (explicit.includes("cancel") || normalizedText.startsWith("cancelled") || normalizedText.startsWith("canceled")) {
    return { label: "Cancelled", detail: text };
  }
  if (explicit.includes("stop") || normalizedText.startsWith("stopped recurring")) {
    return { label: "Recurring Series Stopped", detail: text };
  }
  if (explicit.includes("waiting") || normalizedText.startsWith("waiting")) {
    return { label: "Waiting", detail: text };
  }
  if (explicit.includes("monitor") || normalizedText.startsWith("monitor")) {
    return { label: "Monitor", detail: text };
  }

  return null;
}

function completedWorkOrderItems(workOrders: Row[]) {
  const items: ReportItem[] = [];

  for (const row of workOrders) {
    const id = String(row.id || "");
    const completionHistory = Array.isArray(row.completionHistory) ? row.completionHistory : [];
    const serviceHistory = Array.isArray(row.serviceHistory) ? (row.serviceHistory as Row[]) : [];
    const dates = uniqueDates([
      ...completionHistory,
      row.lastCompletedDate,
      row.last_completed_date,
      row.status === "Completed" || row.status === "Closed"
        ? row.completedAt || row.updatedAt || row.date
        : "",
      ...serviceHistory.map((entry) => entry.completedAt),
    ]);

    for (const date of dates) {
      const historyEntry = serviceHistory.find((entry) => dateOnly(entry.completedAt) === date);
      items.push({
        id: `wo-${id}-${date}`,
        sourceKey: `work-order:${id}:${date}:completed`,
        sourceType: "Work Order",
        sourceId: id,
        date,
        person: displayPerson(historyEntry ? { ...row, ...historyEntry } : row),
        department: inferDepartment(row),
        title: String(row.title || row.name || "Work order completed"),
        notes: String(historyEntry?.notes || row.completionNotes || ""),
        vendor: displayVendor(row),
        reportClass: inferReportClass(row, "Work Order"),
        recurring: isRecurringRecord(row),
      });
    }
  }

  return items;
}

function workOrderActionItems(workOrders: Row[]) {
  const items: ReportItem[] = [];

  for (const row of workOrders) {
    const id = String(row.id || "");
    if (!id) continue;

    const notesHistory = Array.isArray(row.notesHistory) ? (row.notesHistory as Row[]) : [];

    for (const entry of notesHistory) {
      const outcome = reportableOutcomeFromEntry(entry);
      if (!outcome) continue;

      const date = dateOnly(
        entry.createdAt ||
          entry.created_at ||
          entry.actionAt ||
          entry.action_at ||
          entry.updatedAt,
      );
      if (!date) continue;

      const entryId = String(
        entry.id || `${outcome.label}-${date}-${String(entry.text || entry.note || "").slice(0, 40)}`,
      );

      items.push({
        id: `wo-action-${id}-${entryId}`,
        sourceKey: `work-order-action:${id}:${entryId}`,
        sourceType: "Work Order",
        sourceId: id,
        date,
        person: displayPerson({ ...row, ...entry }),
        department: inferDepartment(row),
        title: String(row.title || row.name || "Work order"),
        notes:
          outcome.detail && normalizedOutcome(outcome.detail) !== normalizedOutcome(outcome.label)
            ? `${outcome.label} — ${outcome.detail}`
            : outcome.label,
        vendor: displayVendor(row),
        reportClass: "Issue / Follow-Up",
        recurring: isRecurringRecord(row),
      });
    }

    const lastOutcome = String(row.lastOutcome || row.last_outcome || "").trim();
    const lastOutcomeAt = dateOnly(
      row.lastOutcomeAt || row.last_outcome_at || row.lastSkippedAt || row.last_skipped_at,
    );
    if (lastOutcome && lastOutcomeAt) {
      const alreadyRepresented = items.some(
        (item) =>
          item.sourceId === id &&
          item.date === lastOutcomeAt &&
          normalizedOutcome(item.notes).includes(normalizedOutcome(lastOutcome)),
      );
      if (!alreadyRepresented) {
        items.push({
          id: `wo-outcome-${id}-${lastOutcomeAt}`,
          sourceKey: `work-order-outcome:${id}:${lastOutcomeAt}:${normalizedOutcome(lastOutcome)}`,
          sourceType: "Work Order",
          sourceId: id,
          date: lastOutcomeAt,
          person: displayPerson(row),
          department: inferDepartment(row),
          title: String(row.title || row.name || "Work order"),
          notes: lastOutcome,
          vendor: displayVendor(row),
          reportClass: "Issue / Follow-Up",
          recurring: isRecurringRecord(row),
        });
      }
    }
  }

  return items;
}

function completedTaskItems(tasks: Row[]) {
  const items: ReportItem[] = [];

  for (const row of tasks) {
    const meta = row.taskMeta && typeof row.taskMeta === "object" ? (row.taskMeta as Row) : row;
    const id = String(row.id || meta.id || "");
    const completionHistory = Array.isArray(meta.completionHistory) ? meta.completionHistory : [];
    const dates = uniqueDates([
      ...completionHistory,
      meta.completedAt,
      meta.lastCompletedDate,
      meta.status === "Completed" ? meta.dueDate || row.scheduledDate : "",
    ]);

    for (const date of dates) {
      items.push({
        id: `task-${id}-${date}`,
        sourceKey: `task:${id}:${date}`,
        sourceType: "Task / Routine",
        sourceId: id,
        date,
        person: displayPerson({ ...row, ...meta }),
        department: inferDepartment({ ...row, ...meta }),
        title: String(row.title || meta.title || "Task completed"),
        notes: String(
          (Array.isArray(meta.completionNotes)
            ? meta.completionNotes.find((entry: Row) => dateOnly(entry.completedAt) === date)?.note
            : "") ||
            meta.lastCompletionNote ||
            meta.addisonNote ||
            "",
        ),
        vendor: displayVendor({ ...row, ...meta }),
        reportClass: inferReportClass({ ...row, ...meta }, "Task / Routine"),
        recurring: isRecurringRecord({ ...row, ...meta }),
      });
    }
  }

  return items;
}

function completedTeamItems(rows: Row[], propertyId: string) {
  return rows
    .filter((row) => String(row.propertyId || row.property_id || "2000") === propertyId)
    .map((row): ReportItem => {
      const id = String(row.id || row.eventKey || row.event_key || "");
      const outcome = String(row.outcome || row.action || row.status || "").trim();
      const baseNote = String(row.note || row.notes || "").trim();
      return {
        id: `team-${id}`,
        sourceKey: `team-work:${id}`,
        sourceType: "Team Work",
        sourceId: String(row.taskId || row.task_id || id),
        date: dateOnly(
          row.completedAt ||
            row.completed_at ||
            row.actionAt ||
            row.action_at ||
            row.updatedAt ||
            row.updated_at,
        ),
        person: displayPerson(row),
        department: inferDepartment(row),
        title: String(row.taskTitle || row.task_title || row.title || "Team work"),
        notes: outcome ? (baseNote ? `${outcome} — ${baseNote}` : outcome) : baseNote,
        vendor: displayVendor(row),
        reportClass: inferReportClass(row, "Team Work"),
        recurring: isRecurringRecord(row),
      };
    })
    .filter((item) => Boolean(item.id && item.date));
}

function dedupeItems(items: ReportItem[]) {
  const seenSource = new Set<string>();
  const seenDisplay = new Set<string>();

  return items.filter((item) => {
    const title = item.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const notes = item.notes.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const displayKey = `${item.date}|${item.person.trim().toLowerCase()}|${title}|${notes}`;
    if (seenSource.has(item.sourceKey) || seenDisplay.has(displayKey)) return false;
    seenSource.add(item.sourceKey);
    seenDisplay.add(displayKey);
    return true;
  });
}

function sortReportItems(items: ReportItem[]) {
  return [...items].sort(
    (a, b) =>
      String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31")) ||
      a.person.localeCompare(b.person) ||
      a.title.localeCompare(b.title),
  );
}

function reportTitle(start: string, end: string) {
  if (!start || !end) return "Weekly Report";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Weekly Report · ${format(start)}–${format(end)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemTitleKey(item: ReportItem) {
  return item.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isOutcomeItem(item: ReportItem) {
  const value = normalizedOutcome(item.notes);
  return reportOutcomeLabels.some((label) => value.startsWith(label));
}

function reportClassForItem(item: ReportItem): ReportClass {
  if (item.reportClass && reportClasses.includes(item.reportClass)) return item.reportClass;
  if (isOutcomeItem(item)) return "Issue / Follow-Up";
  if (item.recurring) return "Routine";
  if (item.department === "Projects") return "Project Update";
  if (item.sourceType === "Task / Routine") return "Internal Task";
  return "Completed Work";
}

function reportCategoryForItem(item: ReportItem) {
  if (item.reportCategory && reportCategories.includes(item.reportCategory)) return item.reportCategory;
  const text = recordText(item.title, item.notes, item.department, item.vendor, item.reportClass);
  if (item.vendor || reportClassForItem(item) === "Vendor Activity") return "Vendors";
  if (/\b(trash|recycl|garbage|yard[- ]?waste|front entry|walkthrough|property check|exterior walkthrough)\b/.test(text)) return "Property Operations";
  if (reportClassForItem(item) === "IT / Technology" || /\b(xfinity|wi-?fi|wifi|network|internet|unifi|control4|alarm\.com|router|modem|ethernet|access point|printer|server|av)\b/.test(text)) return "IT / Technology";
  if (/\b(hvac|boiler|furnace|heat pump|air handler|thermostat|filter|mechanical|radiant|vitodens|viessmann)\b/.test(text)) return "HVAC / Mechanical";
  if (item.department === "Garage / Vehicles") return "Garage / Vehicles";
  if (item.department === "Dock & Marine") return "Dock & Marine";
  if (item.department === "Landscape") return "Landscaping";
  if (item.department === "Pool & Spa") return "Pool & Spa";
  if (item.department === "Projects") return "Projects";
  if (item.department === "Administration") return "Administration / Office";
  if (item.department === "Maintenance & Cleaning") return "Maintenance & Cleaning";
  return "Other";
}

async function reportPhotoFromFile(file: File): Promise<ReportPhoto> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });

  let dataUrl = original;
  try {
    dataUrl = await new Promise<string>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        if (scale >= 1 && original.length < 900_000) {
          resolve(original);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(original);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => resolve(original);
      image.src = original;
    });
  } catch {
    dataUrl = original;
  }

  return {
    id: `weekly-report-photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name || "Photo",
    caption: "",
    dataUrl,
    createdAt: new Date().toISOString(),
  };
}

function meaningfulNotes(value: unknown) {
  const note = String(value || "").trim();
  if (!note) return "";
  const normalized = note.toLowerCase().replace(/[.!]+$/g, "").trim();
  if (["completed", "complete", "done", "end", "nothing needed", "n/a", "na"].includes(normalized)) {
    return "";
  }
  return note;
}

function displayDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function businessDays(start: string, end: string) {
  if (!start || !end) return [] as { date: string; label: string }[];
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const result: { date: string; label: string }[] = [];
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) continue;
    result.push({ date: localDate(cursor), label: labels[day] });
  }
  return result;
}

function isNotNeededItem(item: ReportItem) {
  return normalizedOutcome(item.notes).startsWith("not needed");
}

function vehicleNameFromTitle(value: unknown) {
  const title = String(value || "").trim();
  const match = title.match(/^(?:clean|wash|detail)\s+(.+)$/i);
  if (!match) return "";
  const vehicle = match[1].trim();
  if (!vehicle) return "";
  if (
    !/\b(ford|f-?150|raptor|mercedes|porsche|rivian|lucid|kia|sportage|subaru|car|truck|suv|vehicle)\b/i.test(
      vehicle,
    )
  ) {
    return "";
  }
  return vehicle;
}

function routineBucket(group: Pick<RoutineGroup, "title" | "department">) {
  const title = group.title.toLowerCase();
  if (vehicleNameFromTitle(group.title)) return "vehicle";
  if (/owner.?update draft|set schedule|schedule.?addison/.test(title)) return "internal";
  if (/gutter|downspout|flat roof|roof drain/.test(title)) return "gutters";
  if (/goose|geese/.test(title)) return "goose";
  if (group.department === "Pool & Spa" || /pool|spa|hot tub|sundance/.test(title)) return "pool";
  if (group.department === "Landscape") return "grounds";
  if (group.department === "Dock & Marine") return "dock";
  if (/check|inspect|walkthrough|mechanical room|front entry/.test(title)) return "checks";
  if (
    group.department === "Maintenance & Cleaning" ||
    /trash|recycl|garbage|laundry|bbq|dog|webs|sliding.?door|pest/.test(title)
  ) {
    return "care";
  }
  return `other:${group.department || "Other"}`;
}

function routineSummaries(
  groups: RoutineGroup[],
  suppressedNotNeeded: ReportItem[],
): RoutineSummary[] {
  const buckets = new Map<string, { dates: Set<string>; examples: Set<string> }>();
  const add = (key: string, title: string, dates: string[]) => {
    if (key === "vehicle" || key === "internal") return;
    const current = buckets.get(key) || { dates: new Set<string>(), examples: new Set<string>() };
    dates.forEach((date) => current.dates.add(date));
    if (title) current.examples.add(title);
    buckets.set(key, current);
  };

  groups.forEach((group) => add(routineBucket(group), group.title, group.dates));
  suppressedNotNeeded.forEach((item) =>
    add(
      routineBucket({ title: item.title, department: item.department }),
      item.title,
      item.date ? [item.date] : [],
    ),
  );

  const order = ["gutters", "goose", "grounds", "pool", "checks", "dock", "care"];
  const titleFor = (key: string) => {
    if (key === "gutters") return "Gutters / Roof Drainage";
    if (key === "goose") return "Goose Control";
    if (key === "grounds") return "Grounds";
    if (key === "pool") return "Pool & Spa";
    if (key === "checks") return "Property Checks";
    if (key === "dock") return "Dock & Marine";
    if (key === "care") return "Property Care";
    return key.startsWith("other:") ? key.slice(6) : "Routine Property Care";
  };
  const detailFor = (key: string, dates: string[]) => {
    if (key === "gutters") return "Weekly gutters and roof-drainage areas checked and cleaned as needed.";
    if (key === "goose") {
      const noCleanup = suppressedNotNeeded.some(
        (item) => /goose|geese/i.test(item.title) && isNotNeededItem(item),
      );
      return noCleanup
        ? "Goose control monitored; no cleanup was needed this week."
        : "Goose control, deterrents, and cleanup needs were monitored and handled as needed.";
    }
    if (key === "grounds") return "Routine mowing, edging, leaf cleanup, beds, and grounds care completed.";
    if (key === "pool") {
      const hadThursday = dates.some(
        (date) => new Date(`${date}T12:00:00`).getDay() === 4,
      );
      return hadThursday
        ? "Thursday pool and spa service completed."
        : "Weekly pool and spa service completed.";
    }
    if (key === "checks") return "Routine property checks and walkthroughs completed.";
    if (key === "dock") return "Routine dock and watercraft care completed.";
    if (key === "care") return "Routine property cleaning and upkeep completed.";
    return "Routine work completed.";
  };

  return Array.from(buckets.entries())
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      return a.localeCompare(b);
    })
    .map(([key, value]) => {
      const dates = Array.from(value.dates).sort();
      return {
        key,
        title: titleFor(key),
        detail: detailFor(key, dates),
        dates,
      };
    });
}

function collapseByTitle(rows: ReportItem[]) {
  const groups = new Map<string, ReportItem[]>();
  rows.forEach((item) => {
    const key = itemTitleKey(item) || item.id;
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return Array.from(groups.values()).map((group) => {
    const first = group[0];
    const notes = Array.from(
      new Set(group.map((item) => meaningfulNotes(item.notes)).filter(Boolean)),
    );
    const people = Array.from(new Set(group.map((item) => item.person).filter(Boolean)));
    return {
      ...first,
      id: group.map((item) => item.id).join("|"),
      date: group.map((item) => item.date).filter(Boolean).sort().at(-1) || first.date,
      person: people.join(", "),
      notes: notes.join(" • "),
    };
  });
}

function collapseVendorRows(rows: ReportItem[]) {
  const groups = new Map<string, ReportItem[]>();
  rows.forEach((item) => {
    const key = (item.vendor || item.title || item.id).trim().toLowerCase();
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return Array.from(groups.values()).map((group) => {
    const first = group[0];
    const vendor = group.map((item) => item.vendor).find(Boolean) || "";
    const activities = Array.from(
      new Set(
        group
          .map((item) => {
            const note = meaningfulNotes(item.notes);
            if (vendor && item.title.trim().toLowerCase() !== vendor.trim().toLowerCase()) {
              return [item.title, note].filter(Boolean).join(" — ");
            }
            return note || item.title;
          })
          .filter(Boolean),
      ),
    );
    const people = Array.from(new Set(group.map((item) => item.person).filter(Boolean)));
    return {
      ...first,
      id: group.map((item) => item.id).join("|"),
      title: vendor || first.title,
      vendor,
      date: group.map((item) => item.date).filter(Boolean).sort().at(-1) || first.date,
      person: people.join(", "),
      notes: activities.join(" • "),
    };
  });
}

function buildVehicleCare(
  workOrders: Row[],
  sourceItems: ReportItem[],
): VehicleCareItem[] {
  const vehicles = new Map<string, { label: string; sourceIds: Set<string> }>();

  workOrders.forEach((row) => {
    if (inferDepartment(row) !== "Garage / Vehicles") return;
    const label = vehicleNameFromTitle(row.title || row.name);
    if (!label) return;
    const key = label.toLowerCase();
    const current = vehicles.get(key) || { label, sourceIds: new Set<string>() };
    if (row.id) current.sourceIds.add(String(row.id));
    vehicles.set(key, current);
  });

  sourceItems.forEach((item) => {
    const label = vehicleNameFromTitle(item.title);
    if (!label) return;
    const key = label.toLowerCase();
    const current = vehicles.get(key) || { label, sourceIds: new Set<string>() };
    if (item.sourceId) current.sourceIds.add(item.sourceId);
    vehicles.set(key, current);
  });

  return Array.from(vehicles.entries())
    .map(([key, vehicle]) => {
      const related = sourceItems.filter((item) => {
        const itemVehicle = vehicleNameFromTitle(item.title).toLowerCase();
        return (
          itemVehicle === key ||
          (item.sourceId && vehicle.sourceIds.has(item.sourceId))
        );
      });
      const completed = related
        .filter((item) => !isOutcomeItem(item))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const notNeeded = related
        .filter((item) => isNotNeededItem(item))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const deferred = related
        .filter((item) => /didn.?t get to|deferred/i.test(item.notes))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const result = completed || notNeeded || deferred;
      return {
        key,
        vehicle: vehicle.label,
        status: completed ? "Washed" : notNeeded ? "Not needed" : "Not washed",
        date: result?.date || "",
        person: result?.person || "",
      } as VehicleCareItem;
    })
    .sort((a, b) => a.vehicle.localeCompare(b.vehicle));
}

function buildReportPresentation(items: ReportItem[]) {
  const includedItems = items.filter((item) => item.includeInReport !== false);
  const suppressedNotNeeded = includedItems.filter(isNotNeededItem);
  const suppressedNotNeededIds = new Set(suppressedNotNeeded.map((item) => item.id));

  const exceptions = includedItems
    .filter(
      (item) =>
        !suppressedNotNeededIds.has(item.id) &&
        (reportClassForItem(item) === "Issue / Follow-Up" || isOutcomeItem(item)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  const exceptionIds = new Set(exceptions.map((item) => item.id));
  const routineItems = includedItems.filter(
    (item) =>
      !exceptionIds.has(item.id) &&
      !suppressedNotNeededIds.has(item.id) &&
      reportClassForItem(item) === "Routine",
  );
  const grouped = new Map<string, ReportItem[]>();

  routineItems.forEach((item) => {
    const identity = item.sourceId || itemTitleKey(item);
    const key = `routine|${identity}|${itemTitleKey(item)}`;
    grouped.set(key, [...(grouped.get(key) || []), item]);
  });

  const routineGroups: RoutineGroup[] = [];
  const routineItemIds = new Set<string>();
  grouped.forEach((rows, key) => {
    const dates = uniqueDates(rows.map((row) => row.date));
    rows.forEach((row) => routineItemIds.add(row.id));
    routineGroups.push({
      key,
      title: rows[0]?.title || "Routine work",
      department: rows[0]?.department || "Other",
      person: rows.map((row) => row.person).find(Boolean) || "",
      dates,
    });
  });

  routineGroups.sort((a, b) => a.department.localeCompare(b.department) || a.title.localeCompare(b.title));

  const remaining = includedItems.filter(
    (item) =>
      !routineItemIds.has(item.id) &&
      !exceptionIds.has(item.id) &&
      !suppressedNotNeededIds.has(item.id) &&
      !vehicleNameFromTitle(item.title),
  );
  const byClass = (reportClass: ReportClass) =>
    remaining
      .filter((item) => reportClassForItem(item) === reportClass)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.department.localeCompare(b.department) ||
          a.title.localeCompare(b.title),
      );

  return {
    routineGroups,
    routineSummaries: routineSummaries(routineGroups, suppressedNotNeeded),
    projectUpdates: collapseByTitle(byClass("Project Update")),
    vendorActivity: collapseVendorRows(byClass("Vendor Activity")),
    itTechnology: byClass("IT / Technology"),
    completed: byClass("Completed Work"),
    other: byClass("Other"),
    internalTasks: byClass("Internal Task"),
    exceptions,
    suppressedNotNeeded,
  };
}

export default function AtlasOwnerReport({ propertyId, workOrders, ownerInputItems = [], colors, isMobile }: Props) {
  const [periodStart, setPeriodStart] = useState(mondayOfCurrentWeek());
  const [periodEnd, setPeriodEnd] = useState(localDate());
  const [tasks, setTasks] = useState<Row[]>([]);
  const [teamHistory, setTeamHistory] = useState<Row[]>([]);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [excludedSourceKeys, setExcludedSourceKeys] = useState<string[]>([]);
  const [activeReportId, setActiveReportId] = useState("");
  const [status, setStatus] = useState<"Draft" | "Final">("Draft");
  const [message, setMessage] = useState("");
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftTouched, setDraftTouched] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingReportItem[]>([]);
  const [upcomingTouched, setUpcomingTouched] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState<"All" | ReportClass>("All");
  const [reportDepartmentFilter, setReportDepartmentFilter] = useState("All");
  const [reportPersonFilter, setReportPersonFilter] = useState("All");
  const [reportIncludeFilter, setReportIncludeFilter] = useState<"All" | "Included" | "Removed">("All");

  const sourceItems = useMemo(
    () =>
      dedupeItems([
        ...completedWorkOrderItems(workOrders),
        ...workOrderActionItems(workOrders),
        ...completedTaskItems(tasks),
        ...completedTeamItems(teamHistory, propertyId),
      ]),
    [workOrders, tasks, teamHistory, propertyId],
  );

  const filteredSourceItems = useMemo(
    () =>
      sortReportItems(
        sourceItems.filter(
          (item) =>
            !excludedSourceKeys.includes(item.sourceKey) &&
            (!periodStart || item.date >= periodStart) &&
            (!periodEnd || item.date <= periodEnd),
        ),
      ),
    [sourceItems, excludedSourceKeys, periodStart, periodEnd],
  );

  const presentation = useMemo(() => buildReportPresentation(items), [items]);
  const vehicleCare = useMemo(
    () => buildVehicleCare(workOrders, filteredSourceItems),
    [workOrders, filteredSourceItems],
  );
  const reportEditorItems = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();
    return sortReportItems(items).filter((item) => {
      const reportClass = reportClassForItem(item);
      const included = item.includeInReport !== false;
      if (reportIncludeFilter === "Included" && !included) return false;
      if (reportIncludeFilter === "Removed" && included) return false;
      if (reportTypeFilter !== "All" && reportClass !== reportTypeFilter) return false;
      if (reportDepartmentFilter !== "All" && item.department !== reportDepartmentFilter) return false;
      if (reportPersonFilter !== "All" && item.person !== reportPersonFilter) return false;
      if (
        search &&
        ![
          item.title,
          item.notes,
          item.person,
          item.department,
          item.vendor,
          reportClassLabel(reportClass),
          item.sourceType,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [
    items,
    reportIncludeFilter,
    reportTypeFilter,
    reportDepartmentFilter,
    reportPersonFilter,
    reportSearch,
  ]);

  const reviewQueueItems = useMemo(
    () =>
      reportEditorItems.filter((item) => {
        const reportClass = reportClassForItem(item);
        return (
          item.includeInReport !== false &&
          reportClass !== "Routine" &&
          reportClass !== "Internal Task" &&
          !isNotNeededItem(item)
        );
      }),
    [reportEditorItems],
  );

  const supportingReportItems = useMemo(
    () =>
      reportEditorItems.filter((item) => {
        const reportClass = reportClassForItem(item);
        return (
          item.includeInReport !== false &&
          (reportClass === "Routine" || reportClass === "Internal Task" || isNotNeededItem(item))
        );
      }),
    [reportEditorItems],
  );

  const removedReportItems = useMemo(
    () => reportEditorItems.filter((item) => item.includeInReport === false),
    [reportEditorItems],
  );
  const reportPeople = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.person.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const reportDepartments = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.department.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const weekdayColumns = useMemo(() => businessDays(periodStart, periodEnd), [periodStart, periodEnd]);

  const atlasUpcomingItems = useMemo(() => {
    if (!periodEnd) return [] as UpcomingReportItem[];
    const start = new Date(`${periodEnd}T12:00:00`);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startKey = localDate(start);
    const endKey = localDate(end);
    const seen = new Set<string>();
    return workOrders
      .filter((row) => {
        const statusValue = String(row.status || "").toLowerCase();
        if (statusValue === "completed" || statusValue === "closed" || statusValue === "cancelled") return false;
        if (isRecurringRecord(row) && inferReportClass(row, "Work Order") === "Routine") return false;
        const due = dateOnly(row.date || row.dueDate || row.due_date);
        return Boolean(due && due >= startKey && due <= endKey);
      })
      .sort((a, b) => dateOnly(a.date || a.dueDate).localeCompare(dateOnly(b.date || b.dueDate)))
      .filter((row) => {
        const key = `${String(row.title || row.name || "").trim().toLowerCase()}|${dateOnly(row.date || row.dueDate)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map((row, index) => ({
        id: `atlas-upcoming-${String(row.id || index)}-${dateOnly(row.date || row.dueDate || row.due_date)}`,
        date: dateOnly(row.date || row.dueDate || row.due_date),
        title: String(row.title || row.name || "Upcoming work"),
        notes: String(row.notes || ""),
      }));
  }, [workOrders, periodEnd]);

  useEffect(() => {
    if (!activeReportId && !upcomingTouched) {
      setUpcomingItems([]);
    }
  }, [periodStart, periodEnd, activeReportId, upcomingTouched]);

  useEffect(() => {
    void fetch("/api/atlas-team", { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok || !Array.isArray(payload.members)) return;
        const names = payload.members
          .filter((member: any) => member && member.active !== false)
          .filter((member: any) => String(member.role || "").toLowerCase() !== "vendor")
          .filter((member: any) => {
            const propertyIds = Array.isArray(member.propertyIds) ? member.propertyIds.map(String) : [];
            return !propertyIds.length || propertyIds.some((id: string) => id.toLowerCase() === propertyId.toLowerCase());
          })
          .map((member: any) => String(member.name || "").trim())
          .filter(Boolean);
        setTeamMembers(Array.from(new Set(names)));
      })
      .catch(() => setTeamMembers([]));
  }, [propertyId]);

  const awaitingOwnerInput = useMemo(
    () => ownerInputItems.filter((item) => String(item?.status || "") === "Awaiting Owner"),
    [ownerInputItems],
  );

  const reportSummary = useMemo(() => {
    const included = items.filter((item) => item.includeInReport !== false);
    const priorities = included.filter((item) => item.highPriority).length;
    const pieces = [
      `${included.length} weekly update${included.length === 1 ? "" : "s"}`,
    ];
    if (awaitingOwnerInput.length) {
      pieces.unshift(
        `${awaitingOwnerInput.length} owner input item${awaitingOwnerInput.length === 1 ? "" : "s"} needed`,
      );
    }
    if (priorities) pieces.splice(awaitingOwnerInput.length ? 1 : 0, 0, `${priorities} high-priority item${priorities === 1 ? "" : "s"}`);
    if (upcomingItems.length) pieces.push(`${upcomingItems.length} upcoming`);
    return pieces.join(" · ");
  }, [items, upcomingItems, awaitingOwnerInput]);


  async function loadSavedReports(openCurrentReport = false) {
    const response = await fetch(
      `/api/atlas-owner-reports?propertyId=${encodeURIComponent(propertyId)}`,
      { cache: "no-store" },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.ok && Array.isArray(payload.reports)) {
      const reports = payload.reports as SavedReport[];
      setSavedReports(reports);
      const savedExclusions = Array.isArray(payload.excludedSourceKeys)
        ? payload.excludedSourceKeys.map(String)
        : [];
      setExcludedSourceKeys((current) => Array.from(new Set([...current, ...savedExclusions])));
      if (openCurrentReport) {
        const currentReport = reports.find(
          (report) => report.periodStart === periodStart && report.periodEnd === periodEnd,
        );
        if (currentReport) {
          setActiveReportId(currentReport.id);
          setStatus(currentReport.status);
          setItems(sortReportItems(Array.isArray(currentReport.items) ? currentReport.items : []));
          setUpcomingItems(Array.isArray(currentReport.upcomingItems) ? currentReport.upcomingItems : atlasUpcomingItems);
          setUpcomingTouched(Array.isArray(currentReport.upcomingItems));
        }
      }
    }
  }

  useEffect(() => {
    setActiveReportId("");
    setStatus("Draft");
    setItems([]);
    setExcludedSourceKeys([]);
    setDraftTouched(false);
    setUpcomingItems([]);
    setUpcomingTouched(false);
    void loadSavedReports(true).catch(() => setMessage("Saved weekly reports could not be loaded."));
  }, [propertyId]);

  useEffect(() => {
    void fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok) return;
        setTasks(
          Array.isArray(payload.taskRecords)
            ? payload.taskRecords
            : Array.isArray(payload.tasks)
              ? payload.tasks
              : [],
        );
      })
      .catch(() => setTasks([]));
  }, [propertyId]);

  useEffect(() => {
    void fetch("/api/atlas-team-work", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) =>
        setTeamHistory(payload.ok && Array.isArray(payload.workHistory) ? payload.workHistory : []),
      )
      .catch(() => setTeamHistory([]));
  }, []);

  useEffect(() => {
    if (!activeReportId && !draftTouched) setItems(filteredSourceItems);
  }, [filteredSourceItems, activeReportId, draftTouched]);

  function refreshFromAtlas() {
    setActiveReportId("");
    setStatus("Draft");
    setItems(filteredSourceItems);
    setUpcomingItems([]);
    setDraftTouched(false);
    setUpcomingTouched(false);
    setMessage("Weekly report refreshed from Atlas work activity.");
  }

  function updateItem(id: string, patch: Partial<ReportItem>) {
    setDraftTouched(true);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateUpcomingItem(id: string, patch: Partial<UpcomingReportItem>) {
    setUpcomingTouched(true);
    setUpcomingItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addUpcomingItem() {
    const start = periodEnd ? new Date(`${periodEnd}T12:00:00`) : new Date();
    start.setDate(start.getDate() + 1);
    const date = localDate(start);
    setUpcomingTouched(true);
    setUpcomingItems((current) => [
      ...current,
      {
        id: `weekly-upcoming-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        title: "",
        notes: "",
      },
    ]);
  }

  function deleteUpcomingItem(id: string) {
    setUpcomingTouched(true);
    setUpcomingItems((current) => current.filter((item) => item.id !== id));
  }

  function addAtlasUpcomingItem(item: UpcomingReportItem) {
    setUpcomingTouched(true);
    setUpcomingItems((current) =>
      current.some((row) => row.id === item.id) ? current : [...current, { ...item }],
    );
  }

  async function addReportPhotoFiles(itemId: string, files: FileList | File[]) {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!selected.length) return;
    const currentItem = items.find((item) => item.id === itemId);
    const room = Math.max(0, 3 - (currentItem?.reportPhotos?.length || 0));
    if (!room) {
      setMessage("Weekly report items support up to 3 photos.");
      return;
    }
    try {
      const photos = await Promise.all(selected.slice(0, room).map(reportPhotoFromFile));
      updateItem(itemId, {
        reportPhotos: [...(currentItem?.reportPhotos || []), ...photos].slice(0, 3),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo could not be added.");
    }
  }

  function removeReportPhoto(itemId: string, photoId: string) {
    const item = items.find((row) => row.id === itemId);
    if (!item) return;
    updateItem(itemId, {
      reportPhotos: (item.reportPhotos || []).filter((photo) => photo.id !== photoId),
    });
  }

  function updateReportPhotoCaption(itemId: string, photoId: string, caption: string) {
    const item = items.find((row) => row.id === itemId);
    if (!item) return;
    updateItem(itemId, {
      reportPhotos: (item.reportPhotos || []).map((photo) =>
        photo.id === photoId ? { ...photo, caption } : photo,
      ),
    });
  }

  function addManualItem() {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDraftTouched(true);
    setItems((current) => [
      ...current,
      {
        id,
        sourceKey: id,
        sourceType: "Manual",
        sourceId: "",
        date: periodEnd || localDate(),
        person: "",
        department: "Other",
        title: "Note",
        notes: "",
        reportClass: "Completed Work",
        recurring: false,
        includeInReport: true,
      },
    ]);
  }

  async function saveReportItem(itemId: string) {
    const item = items.find((row) => row.id === itemId);
    if (!item || (!item.title.trim() && !item.notes.trim())) {
      setMessage("Enter a title or note before saving.");
      return;
    }
    await saveReport(
      activeReportId ? status : "Draft",
      items,
      item.sourceType === "Manual" ? "Note saved to the weekly report." : "Report item saved.",
    );
  }

  async function saveReport(
    nextStatus: "Draft" | "Final",
    nextItems: ReportItem[] = items,
    successMessage?: string,
  ) {
    if (!periodStart || !periodEnd) {
      setMessage("Choose the report start and end dates.");
      return;
    }

    setSaving(true);
    setMessage("Saving weekly report...");

    try {
      const id = activeReportId || `owner-report-${propertyId}-${periodStart}-${periodEnd}`;
      const response = await fetch("/api/atlas-owner-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          propertyId,
          periodStart,
          periodEnd,
          title: reportTitle(periodStart, periodEnd),
          status: nextStatus,
          items: sortReportItems(nextItems),
          upcomingItems,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(String(payload.error || "Weekly report could not be saved."));
      }

      setActiveReportId(id);
      setStatus(nextStatus);
      setDraftTouched(false);
      setMessage(
        successMessage ||
          (nextStatus === "Final" ? "Weekly report finalized and saved." : "Weekly report saved."),
      );
      await loadSavedReports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Weekly report could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReportItem(itemId: string) {
    const deletedItem = items.find((item) => item.id === itemId);
    if (!deletedItem) return;
    const nextItems = items.filter((item) => item.id !== itemId);
    setDraftTouched(true);
    setItems(nextItems);
    if (deletedItem.sourceType !== "Manual" && deletedItem.sourceKey) {
      setExcludedSourceKeys((current) =>
        current.includes(deletedItem.sourceKey) ? current : [...current, deletedItem.sourceKey],
      );
      try {
        const response = await fetch("/api/atlas-owner-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "exclude-item",
            propertyId,
            sourceKey: deletedItem.sourceKey,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(String(payload.error || "Report item could not be deleted."));
        }
      } catch (error) {
        setItems(items);
        setExcludedSourceKeys((current) => current.filter((key) => key !== deletedItem.sourceKey));
        setMessage(error instanceof Error ? error.message : "Report item could not be deleted.");
        return;
      }
    }
    await saveReport(
      activeReportId ? status : "Draft",
      nextItems,
      "Item deleted permanently from the weekly report.",
    );
  }

  function openSavedReport(report: SavedReport) {
    setActiveReportId(report.id);
    setPeriodStart(report.periodStart);
    setPeriodEnd(report.periodEnd);
    setStatus(report.status);
    setItems(sortReportItems(Array.isArray(report.items) ? report.items : []));
    setUpcomingItems(Array.isArray(report.upcomingItems) ? report.upcomingItems : atlasUpcomingItems);
    setDraftTouched(false);
    setUpcomingTouched(Array.isArray(report.upcomingItems));
    setShowSavedReports(false);
    setMessage(`Opened ${report.title}.`);
  }

  async function deleteSavedReport(report: SavedReport) {
    if (!window.confirm("Delete this saved weekly report? Source Atlas records will not be deleted.")) return;
    const response = await fetch(
      `/api/atlas-owner-reports?id=${encodeURIComponent(report.id)}&propertyId=${encodeURIComponent(propertyId)}`,
      { method: "DELETE" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      setMessage(String(payload.error || "Saved report could not be deleted."));
      return;
    }
    if (activeReportId === report.id) refreshFromAtlas();
    await loadSavedReports();
    setMessage("Saved weekly report deleted. Source records were not changed.");
  }

  function printReport() {
    const included = sortReportItems(items.filter((item) => item.includeInReport !== false));
    if (!included.length && !upcomingItems.length && !awaitingOwnerInput.length) return;
    const popup = window.open("", "_blank");
    if (!popup) return;

    const logoUrl = `${window.location.origin}/atlas-logo.png`;
    const photoMarkup = (item: ReportItem) => {
      const photos = Array.isArray(item.reportPhotos) ? item.reportPhotos.filter((photo) => photo?.dataUrl) : [];
      if (!photos.length) return "";
      return `<div class="photos">${photos
        .slice(0, 3)
        .map((photo) => `<figure><img src="${escapeHtml(photo.dataUrl)}" alt="${escapeHtml(photo.caption || photo.name || "Report photo")}">${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ""}</figure>`)
        .join("")}</div>`;
    };
    const itemMarkup = (item: ReportItem) => {
      const note = String(item.ownerNote || "").trim();
      return `<div class="item"><div class="item-main"><strong>${escapeHtml(item.title || "Work activity")}</strong><span>${escapeHtml(displayDate(item.date))}</span></div>${note ? `<div class="note">${escapeHtml(note)}</div>` : ""}${photoMarkup(item)}</div>`;
    };

    const ownerInputMarkup = awaitingOwnerInput.length
      ? `<section class="section owner-input" data-atlas-owner-input-print="true"><h2>Owner Input Needed</h2>${awaitingOwnerInput
          .map((request) => {
            const question = String(request?.question || "Owner decision needed");
            const project = String(request?.projectTitle || "").trim();
            const due = String(request?.dueDate || "").slice(0, 10);
            const context = String(request?.context || "").trim();
            const photos = Array.isArray(request?.photos)
              ? request.photos.filter((photo: Row) => String(photo?.dataUrl || "").startsWith("data:image/")).slice(0, 3)
              : [];
            const meta = [project, due ? `By ${displayDate(due)}` : ""].filter(Boolean).join(" · ");
            const photoHtml = photos.length
              ? `<div class="photos">${photos.map((photo: Row) => `<figure><img src="${escapeHtml(photo.dataUrl)}" alt="${escapeHtml(photo.caption || photo.name || "Owner request photo")}">${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`
              : "";
            return `<div class="item"><div class="item-main"><strong>${escapeHtml(question)}</strong>${meta ? `<span>${escapeHtml(meta)}</span>` : ""}</div>${context ? `<div class="note">${escapeHtml(context)}</div>` : ""}${photoHtml}</div>`;
          })
          .join("")}</section>`
      : "";

    const highPriority = included.filter((item) => item.highPriority);
    const normalItems = included.filter((item) => !item.highPriority);
    const grouped = new Map<string, ReportItem[]>();
    normalItems.forEach((item) => {
      const category = reportCategoryForItem(item);
      grouped.set(category, [...(grouped.get(category) || []), item]);
    });

    const priorityMarkup = highPriority.length
      ? `<section class="section priority"><h2>High Priority / Needs Attention</h2>${highPriority.map(itemMarkup).join("")}</section>`
      : "";

    const categoryMarkup = reportCategories
      .map((category) => {
        const rows = grouped.get(category) || [];
        if (!rows.length) return "";
        return `<section class="section"><h2>${escapeHtml(category)}</h2>${rows.map(itemMarkup).join("")}</section>`;
      })
      .join("");

    const upcomingMarkup = upcomingItems.length
      ? `<section class="section"><h2>Upcoming</h2>${upcomingItems
          .filter((row) => row.title.trim() || row.notes.trim())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((row) => `<div class="item"><div class="item-main"><strong>${escapeHtml(row.title || "Upcoming work")}</strong><span>${escapeHtml(displayDate(row.date))}</span></div>${row.notes ? `<div class="note">${escapeHtml(row.notes)}</div>` : ""}</div>`)
          .join("")}</section>`
      : "";

    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(reportTitle(periodStart, periodEnd))}</title><style>
      @page{size:letter;margin:.48in}
      *{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;color:#0b2a44;margin:0;background:#fff;font-size:10px;line-height:1.35}
      .header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:12px;border-bottom:3px solid #c99a3d;margin-bottom:14px}
      .brand{display:flex;align-items:center;gap:11px}.logo{width:58px;height:58px;object-fit:contain}.brand-name{font-size:18px;font-weight:800;letter-spacing:.08em}.brand-sub{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#667788;margin-top:2px}
      .report-head{text-align:right}.report-head h1{margin:0;font-size:22px;line-height:1.05}.report-head .property{font-size:11px;font-weight:700;margin-top:4px}.report-head .dates{font-size:9px;color:#667788;margin-top:2px}
      .summary{padding:11px 13px;background:#f5f8fb;border-left:4px solid #c99a3d;margin-bottom:14px;font-size:10.5px}
      .section{margin:0 0 15px}.section h2{font-size:13px;margin:0 0 7px;padding-bottom:4px;border-bottom:1px solid #cfd9e2;text-transform:uppercase;letter-spacing:.06em}
      .owner-input{border:1px solid #d9e2ea;border-left:4px solid #c99a3d;border-radius:7px;padding:9px 11px;background:#fffdf7}
      .priority{border:1px solid #e8c66f;border-left:4px solid #c99a3d;border-radius:7px;padding:9px 11px;background:#fffaf0}
      .item{display:grid;gap:3px;padding:5px 0;border-bottom:1px solid #edf1f4;break-inside:avoid}.item-main{display:flex;justify-content:space-between;gap:14px;align-items:baseline}.item-main strong{font-size:10px}.item-main span{font-size:8.5px;color:#6a7886;white-space:nowrap}.note{font-size:9px;color:#46596b;padding-right:8px}
      .photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:5px}.photos figure{margin:0}.photos img{width:100%;max-height:160px;object-fit:cover;border:1px solid #d7e0e8;border-radius:6px}.photos figcaption{font-size:7.5px;color:#6a7886;margin-top:2px}
      .footer{margin-top:16px;padding-top:7px;border-top:1px solid #c99a3d;display:flex;justify-content:space-between;color:#7a8794;font-size:7.5px}
      @media print{.section,.item,.photos figure{page-break-inside:avoid}}
    </style></head><body>
      <header class="header"><div class="brand"><img class="logo" src="${escapeHtml(logoUrl)}" alt="Atlas"><div><div class="brand-name">ATLAS</div><div class="brand-sub">2000 Estate Systems</div></div></div><div class="report-head"><h1>Weekly Report</h1><div class="property">Property ${escapeHtml(propertyId)}</div><div class="dates">${escapeHtml(displayDate(periodStart))} – ${escapeHtml(displayDate(periodEnd))}</div></div></header>
      ${ownerInputMarkup}
      <div class="summary"><strong>This Week</strong><br>${escapeHtml(reportSummary)}</div>
      ${priorityMarkup}${categoryMarkup}${upcomingMarkup}
      <div class="footer"><span>Atlas Estate Operations</span><span>${escapeHtml(reportTitle(periodStart, periodEnd))}</span></div>
    </body></html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 350);
  }

  const cardStyle = {
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    background: colors.card,
    padding: isMobile ? 14 : 18,
    boxShadow: "0 8px 24px rgba(7,27,47,.05)",
  };
  const controlStyle = {
    width: "100%",
    minHeight: 38,
    border: `1px solid ${colors.line}`,
    borderRadius: 9,
    padding: "8px 9px",
    background: "#fff",
    color: colors.navy,
    fontWeight: 700,
    fontSize: 12,
  };
  const buttonStyle = {
    border: 0,
    borderRadius: 9,
    background: colors.gold,
    color: colors.navy,
    padding: "9px 12px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
  const quietButtonStyle = {
    ...buttonStyle,
    background: "#fff",
    border: `1px solid ${colors.line}`,
  };

  const renderReportItemEditor = (item: ReportItem) => {
    const photos = Array.isArray(item.reportPhotos) ? item.reportPhotos : [];
    return (
      <div
        key={item.id}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
          if (files.length) {
            event.preventDefault();
            void addReportPhotoFiles(item.id, files);
          }
        }}
        style={{
          border: `1px solid ${item.highPriority ? colors.gold : colors.line}`,
          borderRadius: 11,
          padding: 9,
          display: "grid",
          gap: 7,
          opacity: item.includeInReport === false ? 0.65 : 1,
          background: item.includeInReport === false ? colors.panel : "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "110px 165px minmax(220px,1.3fr) minmax(220px,1.1fr) auto",
            gap: 7,
            alignItems: "start",
          }}
        >
          <input
            type="date"
            value={item.date}
            onChange={(event) => updateItem(item.id, { date: event.currentTarget.value })}
            style={controlStyle}
          />
          <select
            value={reportCategoryForItem(item)}
            onChange={(event) => updateItem(item.id, { reportCategory: event.currentTarget.value })}
            aria-label="Owner report category"
            style={controlStyle}
          >
            {reportCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input
            value={item.title}
            onChange={(event) => updateItem(item.id, { title: event.currentTarget.value })}
            placeholder="What happened"
            style={controlStyle}
          />
          <textarea
            value={item.ownerNote || ""}
            onChange={(event) => updateItem(item.id, { ownerNote: event.currentTarget.value })}
            placeholder="Owner-facing note (optional)"
            rows={isMobile ? 2 : 1}
            style={{ ...controlStyle, resize: "vertical", minHeight: 38 }}
          />
          <div style={{ display: "grid", gap: 5 }}>
            <button
              type="button"
              onClick={() => updateItem(item.id, { highPriority: !item.highPriority })}
              style={{
                ...quietButtonStyle,
                padding: "8px 9px",
                background: item.highPriority ? "#fff6dd" : "#fff",
                borderColor: item.highPriority ? colors.gold : colors.line,
              }}
            >
              {item.highPriority ? "High Priority ✓" : "High Priority"}
            </button>
            <button
              type="button"
              onClick={() => updateItem(item.id, { includeInReport: item.includeInReport === false })}
              style={{ ...quietButtonStyle, padding: "8px 9px" }}
            >
              {item.includeInReport === false ? "Add to Report" : "Remove from Report"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ ...quietButtonStyle, padding: "6px 8px", fontSize: 10, cursor: "pointer" }}>
            Add Photo
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                void addReportPhotoFiles(item.id, event.currentTarget.files || []);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label style={{ ...quietButtonStyle, padding: "6px 8px", fontSize: 10, cursor: "pointer" }}>
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                void addReportPhotoFiles(item.id, event.currentTarget.files || []);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <span style={{ color: colors.muted, fontSize: 10 }}>Paste an image with Ctrl+V · up to 3 photos</span>
          <span style={{ marginLeft: "auto", color: colors.muted, fontSize: 10 }}>
            {item.includeInReport === false ? "Removed from report" : reportCategoryForItem(item)}
          </span>
        </div>

        {photos.length ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 7 }}>
            {photos.map((photo) => (
              <div key={photo.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                <img src={photo.dataUrl} alt={photo.caption || photo.name || "Report photo"} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                <div style={{ padding: 6, display: "grid", gap: 5 }}>
                  <input
                    value={photo.caption || ""}
                    onChange={(event) => updateReportPhotoCaption(item.id, photo.id, event.currentTarget.value)}
                    placeholder="Photo caption (optional)"
                    style={{ ...controlStyle, minHeight: 30, padding: "5px 7px", fontSize: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeReportPhoto(item.id, photo.id)}
                    style={{ ...quietButtonStyle, padding: "5px 7px", fontSize: 10 }}
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <img src="/atlas-logo.png" alt="Atlas" style={{ width: 48, height: 48, objectFit: "contain" }} />
          <div>
            <div
              style={{
                color: colors.gold,
                fontSize: 10,
                fontWeight: 950,
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              Weekly reporting
            </div>
            <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 20 }}>Weekly Report</h2>
            <div style={{ color: colors.muted, fontSize: 12 }}>
              Property {propertyId} · {activeReportId ? `${status} saved report` : "live draft"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowSavedReports((value) => !value)}
            style={quietButtonStyle}
          >
            Saved Reports
          </button>
          <button
            type="button"
            onClick={printReport}
            disabled={!items.length && !awaitingOwnerInput.length && !upcomingItems.length}
            style={{ ...quietButtonStyle, opacity: items.length || awaitingOwnerInput.length || upcomingItems.length ? 1 : 0.5 }}
          >
            Print / PDF
          </button>
          <button
            type="button"
            onClick={() => void saveReport("Draft")}
            disabled={saving}
            style={quietButtonStyle}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => void saveReport("Final")}
            disabled={saving || !items.length}
            style={{ ...buttonStyle, opacity: items.length ? 1 : 0.5 }}
          >
            Finalize
          </button>
        </div>
      </div>

      {showSavedReports ? (
        <div
          style={{
            display: "grid",
            gap: 6,
            marginBottom: 12,
            padding: 10,
            border: `1px solid ${colors.line}`,
            borderRadius: 11,
            background: colors.panel,
          }}
        >
          {savedReports.length ? (
            savedReports.map((report) => (
              <div
                key={report.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  padding: "7px 8px",
                  background: "#fff",
                  borderRadius: 9,
                }}
              >
                <button
                  type="button"
                  onClick={() => openSavedReport(report)}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    color: colors.navy,
                    fontWeight: 850,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {report.title} · {report.status} · {report.items.length}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSavedReport(report)}
                  style={{ ...quietButtonStyle, padding: "6px 8px", fontSize: 11 }}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div style={{ color: colors.muted, fontSize: 12 }}>No saved weekly reports yet.</div>
          )}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "150px 150px auto auto",
          gap: 7,
          alignItems: "end",
          marginBottom: 11,
        }}
      >
        <label
          style={{ display: "grid", gap: 4, color: colors.muted, fontSize: 10, fontWeight: 850 }}
        >
          FROM
          <input
            type="date"
            value={periodStart}
            onChange={(event) => {
              setActiveReportId("");
              setDraftTouched(false);
              setPeriodStart(event.currentTarget.value);
            }}
            style={controlStyle}
          />
        </label>
        <label
          style={{ display: "grid", gap: 4, color: colors.muted, fontSize: 10, fontWeight: 850 }}
        >
          TO
          <input
            type="date"
            value={periodEnd}
            onChange={(event) => {
              setActiveReportId("");
              setDraftTouched(false);
              setPeriodEnd(event.currentTarget.value);
            }}
            style={controlStyle}
          />
        </label>
        <button type="button" onClick={refreshFromAtlas} style={quietButtonStyle}>
          Refresh from Atlas
        </button>
        <button type="button" onClick={addManualItem} style={quietButtonStyle}>
          Add Note
        </button>
      </div>

      <div
        style={{
          border: `1px solid ${colors.line}`,
          borderTop: `3px solid ${colors.gold}`,
          borderRadius: 12,
          background: "#fff",
          padding: isMobile ? 12 : 16,
          marginBottom: 12,
        }}
      >
        <div style={{ color: colors.gold, fontSize: 9, fontWeight: 900, letterSpacing: ".11em", textTransform: "uppercase" }}>
          This Week
        </div>
        <div style={{ color: colors.navy, fontSize: 13, lineHeight: 1.5, marginTop: 5 }}>{reportSummary}</div>
      </div>

      <section
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: 12,
          background: "#fff",
          padding: isMobile ? 10 : 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: colors.gold, fontSize: 9, fontWeight: 900, letterSpacing: ".11em", textTransform: "uppercase" }}>Report Prep</div>
            <strong style={{ display: "block", color: colors.navy, marginTop: 2 }}>Weekly Report List</strong>
          </div>
          <span style={{ color: colors.muted, fontSize: 10 }}>
            Choose a category, mark High Priority if needed, and remove anything the owners do not need.
          </span>
        </div>
        <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
          {sortReportItems(items).length ? sortReportItems(items).map(renderReportItemEditor) : (
            <div style={{ color: colors.muted, fontSize: 12 }}>No work activity found for this date range.</div>
          )}
        </div>
      </section>

      <section
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: 12,
          background: "#fff",
          padding: isMobile ? 10 : 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: colors.gold, fontSize: 9, fontWeight: 900, letterSpacing: ".11em", textTransform: "uppercase" }}>Next Week</div>
            <strong style={{ display: "block", color: colors.navy, marginTop: 2 }}>Upcoming</strong>
          </div>
          <button type="button" onClick={addUpcomingItem} style={quietButtonStyle}>Add Manual Upcoming</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <strong style={{ color: colors.navy, fontSize: 11 }}>Available from Atlas</strong>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {atlasUpcomingItems.filter((candidate) => !upcomingItems.some((item) => item.id === candidate.id)).length ? (
              atlasUpcomingItems
                .filter((candidate) => !upcomingItems.some((item) => item.id === candidate.id))
                .map((candidate) => (
                  <div key={candidate.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 8, padding: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: colors.navy, fontSize: 11 }}>{candidate.title}</strong>
                      <div style={{ color: colors.muted, fontSize: 10 }}>{displayDate(candidate.date)}</div>
                    </div>
                    <button type="button" onClick={() => addAtlasUpcomingItem(candidate)} style={{ ...quietButtonStyle, padding: "7px 9px", fontSize: 10 }}>
                      Add to Report
                    </button>
                  </div>
                ))
            ) : <div style={{ color: colors.muted, fontSize: 11 }}>No additional upcoming Atlas items for this period.</div>}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong style={{ color: colors.navy, fontSize: 11 }}>Included in Owner Report</strong>
          <div style={{ display: "grid", gap: 7, marginTop: 6 }}>
            {upcomingItems.length ? upcomingItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "125px minmax(180px,1fr) minmax(180px,1fr) auto",
                  gap: 7,
                  alignItems: "start",
                }}
              >
                <input type="date" value={item.date} onChange={(event) => updateUpcomingItem(item.id, { date: event.currentTarget.value })} style={controlStyle} />
                <input value={item.title} onChange={(event) => updateUpcomingItem(item.id, { title: event.currentTarget.value })} placeholder="Upcoming work" style={controlStyle} />
                <input value={item.notes} onChange={(event) => updateUpcomingItem(item.id, { notes: event.currentTarget.value })} placeholder="Owner note (optional)" style={controlStyle} />
                <button type="button" onClick={() => deleteUpcomingItem(item.id)} style={{ ...quietButtonStyle, padding: "9px 10px" }}>Remove</button>
              </div>
            )) : <div style={{ color: colors.muted, fontSize: 11 }}>Nothing upcoming has been added to the owner report yet.</div>}
          </div>
        </div>
      </section>

      {message ? (
        <div style={{ marginTop: 10, color: colors.navy, fontSize: 12, fontWeight: 800 }}>{message}</div>
      ) : null}
    </section>
  );
}
