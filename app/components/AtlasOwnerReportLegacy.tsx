"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;

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
};

type SavedReport = {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  status: "Draft" | "Final";
  items: ReportItem[];
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

type Props = {
  propertyId: string;
  workOrders: Row[];
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
        notes: String(historyEntry?.notes || row.completionNotes || "Completed"),
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

function reportTitle(start: string, end: string) {
  if (!start || !end) return "Owner Report";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Owner Report · ${format(start)}–${format(end)}`;
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

function buildReportPresentation(items: ReportItem[]) {
  const outcomeItems = items.filter(isOutcomeItem);
  const completedItems = items.filter((item) => !isOutcomeItem(item));
  const grouped = new Map<string, ReportItem[]>();

  completedItems.forEach((item) => {
    const identity = item.sourceId || itemTitleKey(item);
    const key = `${item.sourceType}|${identity}|${itemTitleKey(item)}`;
    grouped.set(key, [...(grouped.get(key) || []), item]);
  });

  const routineGroups: RoutineGroup[] = [];
  const routineItemIds = new Set<string>();
  grouped.forEach((rows, key) => {
    const dates = uniqueDates(rows.map((row) => row.date));
    if (dates.length < 2) return;
    rows.forEach((row) => routineItemIds.add(row.id));
    routineGroups.push({
      key,
      title: rows[0]?.title || "Routine work",
      department: rows[0]?.department || "Other",
      person: rows.map((row) => row.person).find(Boolean) || "",
      dates,
    });
  });

  routineGroups.sort((a, b) => a.title.localeCompare(b.title));
  const completed = completedItems
    .filter((item) => !routineItemIds.has(item.id))
    .sort((a, b) => a.department.localeCompare(b.department) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const exceptions = [...outcomeItems].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  return { routineGroups, completed, exceptions };
}

export default function AtlasOwnerReport({ propertyId, workOrders, colors, isMobile }: Props) {
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
      sourceItems.filter(
        (item) =>
          !excludedSourceKeys.includes(item.sourceKey) &&
          (!periodStart || item.date >= periodStart) &&
          (!periodEnd || item.date <= periodEnd),
      ),
    [sourceItems, excludedSourceKeys, periodStart, periodEnd],
  );

  const presentation = useMemo(() => buildReportPresentation(items), [items]);
  const weekdayColumns = useMemo(() => businessDays(periodStart, periodEnd), [periodStart, periodEnd]);

  const upcomingWork = useMemo(() => {
    if (!periodEnd) return [] as Row[];
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
      .slice(0, 8);
  }, [workOrders, periodEnd]);

  const reportSummary = useMemo(() => {
    const completedCount = presentation.completed.length + presentation.routineGroups.reduce((total, group) => total + group.dates.length, 0);
    const areaCount = new Set(items.map((item) => item.department).filter(Boolean)).size;
    const pieces = [`${completedCount} completed work item${completedCount === 1 ? "" : "s"} recorded${areaCount ? ` across ${areaCount} areas` : ""}.`];
    if (presentation.routineGroups.length) {
      pieces.push(`${presentation.routineGroups.length} recurring routine${presentation.routineGroups.length === 1 ? " was" : "s were"} rolled up by completion day.`);
    }
    if (presentation.exceptions.length) {
      pieces.push(`${presentation.exceptions.length} item${presentation.exceptions.length === 1 ? "" : "s"} had a deferred, not-needed, or in-progress update.`);
    }
    return pieces.join(" ");
  }, [items, presentation]);

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
          setItems(Array.isArray(currentReport.items) ? currentReport.items : []);
        }
      }
    }
  }

  useEffect(() => {
    setActiveReportId("");
    setStatus("Draft");
    setItems([]);
    setExcludedSourceKeys([]);
    void loadSavedReports(true).catch(() => setMessage("Saved owner reports could not be loaded."));
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
    if (!activeReportId) setItems(filteredSourceItems);
  }, [filteredSourceItems, activeReportId]);

  function refreshFromAtlas() {
    setActiveReportId("");
    setStatus("Draft");
    setItems(filteredSourceItems);
    setMessage("Report refreshed from Atlas work activity.");
  }

  function updateItem(id: string, patch: Partial<ReportItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addManualItem() {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
      item.sourceType === "Manual" ? "Note saved to the owner report." : "Report item saved.",
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
    setMessage("Saving owner report...");

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
          items: nextItems,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(String(payload.error || "Owner report could not be saved."));
      }

      setActiveReportId(id);
      setStatus(nextStatus);
      setMessage(
        successMessage ||
          (nextStatus === "Final" ? "Owner report finalized and saved." : "Owner report saved."),
      );
      await loadSavedReports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Owner report could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReportItem(itemId: string) {
    const deletedItem = items.find((item) => item.id === itemId);
    if (!deletedItem) return;
    const nextItems = items.filter((item) => item.id !== itemId);
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
      } catch {
        // Keep the item removed from this saved report even if the permanent
        // source exclusion request needs to be retried on a later delete.
      }
    }
    await saveReport(
      activeReportId ? status : "Draft",
      nextItems,
      "Item deleted permanently from the owner report.",
    );
  }

  function openSavedReport(report: SavedReport) {
    setActiveReportId(report.id);
    setPeriodStart(report.periodStart);
    setPeriodEnd(report.periodEnd);
    setStatus(report.status);
    setItems(Array.isArray(report.items) ? report.items : []);
    setShowSavedReports(false);
    setMessage(`Opened ${report.title}.`);
  }

  async function deleteSavedReport(report: SavedReport) {
    if (!window.confirm("Delete this saved owner report? Source Atlas records will not be deleted.")) return;
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
    setMessage("Saved report deleted. Source records were not changed.");
  }

  function printReport() {
    if (!items.length) return;
    const popup = window.open("", "_blank");
    if (!popup) return;

    const logoUrl = `${window.location.origin}/atlas-logo.png`;
    const completedByDepartment = departments
      .map((department) => ({
        department,
        rows: presentation.completed.filter((item) => item.department === department),
      }))
      .filter((group) => group.rows.length);

    const routineMarkup = presentation.routineGroups.length
      ? `<section class="section"><h2>Routine Work</h2><div class="routine-wrap"><table class="routine"><thead><tr><th>Routine</th>${weekdayColumns
          .map((day) => `<th>${escapeHtml(day.label)}<span>${escapeHtml(displayDate(day.date))}</span></th>`)
          .join("")}</tr></thead><tbody>${presentation.routineGroups
          .map(
            (group) =>
              `<tr><td><strong>${escapeHtml(group.title)}</strong>${group.person ? `<span>${escapeHtml(group.person)}</span>` : ""}</td>${weekdayColumns
                .map((day) => `<td class="mark">${group.dates.includes(day.date) ? "✓" : "—"}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table></div></section>`
      : "";

    const completedMarkup = completedByDepartment.length
      ? `<section class="section"><h2>Completed Work</h2>${completedByDepartment
          .map(
            (group) =>
              `<div class="dept-group"><h3>${escapeHtml(group.department)}</h3>${group.rows
                .map((item) => {
                  const note = meaningfulNotes(item.notes);
                  return `<div class="item"><div class="item-main"><strong>${escapeHtml(item.title || "Work activity")}</strong><span>${escapeHtml([item.person, displayDate(item.date)].filter(Boolean).join(" · "))}</span></div>${note ? `<div class="note">${escapeHtml(note)}</div>` : ""}</div>`;
                })
                .join("")}</div>`,
          )
          .join("")}</section>`
      : "";

    const exceptionMarkup = presentation.exceptions.length
      ? `<section class="section"><h2>Open / Deferred</h2>${presentation.exceptions
          .map(
            (item) =>
              `<div class="item"><div class="item-main"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml([item.person, displayDate(item.date)].filter(Boolean).join(" · "))}</span></div><div class="note">${escapeHtml(item.notes)}</div></div>`,
          )
          .join("")}</section>`
      : "";

    const upcomingMarkup = upcomingWork.length
      ? `<section class="section"><h2>Next Week</h2>${upcomingWork
          .map(
            (row) =>
              `<div class="upcoming"><strong>${escapeHtml(row.title || row.name || "Upcoming work")}</strong><span>${escapeHtml(displayDate(dateOnly(row.date || row.dueDate || row.due_date)))}</span></div>`,
          )
          .join("")}</section>`
      : "";

    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(
      reportTitle(periodStart, periodEnd),
    )}</title><style>
      @page{size:letter;margin:.48in}
      *{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;color:#0b2a44;margin:0;background:#fff;font-size:10px;line-height:1.35}
      .header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:12px;border-bottom:3px solid #c99a3d;margin-bottom:14px}
      .brand{display:flex;align-items:center;gap:11px}.logo{width:58px;height:58px;object-fit:contain}.brand-name{font-size:18px;font-weight:800;letter-spacing:.08em}.brand-sub{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#667788;margin-top:2px}
      .report-head{text-align:right}.report-head h1{margin:0;font-size:22px;line-height:1.05}.report-head .property{font-size:11px;font-weight:700;margin-top:4px}.report-head .dates{font-size:9px;color:#667788;margin-top:2px}
      .summary{padding:11px 13px;background:#f5f8fb;border-left:4px solid #c99a3d;margin-bottom:14px;font-size:10.5px}
      .section{margin:0 0 15px;break-inside:auto}.section h2{font-size:13px;margin:0 0 7px;padding-bottom:4px;border-bottom:1px solid #cfd9e2;text-transform:uppercase;letter-spacing:.06em}.dept-group{margin-bottom:8px}.dept-group h3{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#7a8794;margin:8px 0 2px}
      .item{display:grid;grid-template-columns:minmax(0,1fr);gap:2px;padding:4px 0;border-bottom:1px solid #edf1f4;break-inside:avoid}.item-main{display:flex;justify-content:space-between;gap:14px;align-items:baseline}.item-main strong{font-size:10px}.item-main span{font-size:8.5px;color:#6a7886;white-space:nowrap}.note{font-size:9px;color:#46596b;padding-right:8px}
      .routine-wrap{overflow:hidden;border:1px solid #d7e0e8;border-radius:6px}.routine{width:100%;border-collapse:collapse}.routine th,.routine td{border-right:1px solid #e4e9ee;border-bottom:1px solid #e4e9ee;padding:5px 6px;text-align:center}.routine th:first-child,.routine td:first-child{text-align:left;width:48%}.routine th{background:#f5f8fb;font-size:8px;text-transform:uppercase;letter-spacing:.04em}.routine th span{display:block;font-size:7px;color:#7a8794;margin-top:1px}.routine td:first-child strong{display:block;font-size:9.5px}.routine td:first-child span{display:block;font-size:7.5px;color:#7a8794;margin-top:1px}.routine .mark{font-size:12px;font-weight:800;color:#0b6b48}.routine tr:last-child td{border-bottom:0}.routine th:last-child,.routine td:last-child{border-right:0}
      .upcoming{display:flex;justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px solid #edf1f4}.upcoming strong{font-size:9.5px}.upcoming span{font-size:8.5px;color:#6a7886;white-space:nowrap}
      .footer{margin-top:16px;padding-top:7px;border-top:1px solid #c99a3d;display:flex;justify-content:space-between;color:#7a8794;font-size:7.5px}
      @media print{.section{page-break-inside:auto}.item,.routine tr,.upcoming{page-break-inside:avoid}}
    </style></head><body>
      <header class="header"><div class="brand"><img class="logo" src="${escapeHtml(logoUrl)}" alt="Atlas"><div><div class="brand-name">ATLAS</div><div class="brand-sub">2000 Estate Systems</div></div></div><div class="report-head"><h1>Owners Report</h1><div class="property">Property ${escapeHtml(propertyId)}</div><div class="dates">${escapeHtml(displayDate(periodStart))} – ${escapeHtml(displayDate(periodEnd))}</div></div></header>
      <div class="summary"><strong>This Week</strong><br>${escapeHtml(reportSummary)}</div>
      ${routineMarkup}${completedMarkup}${exceptionMarkup}${upcomingMarkup}
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
            <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 20 }}>Owners Report</h2>
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
            disabled={!items.length}
            style={{ ...quietButtonStyle, opacity: items.length ? 1 : 0.5 }}
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
            <div style={{ color: colors.muted, fontSize: 12 }}>No saved owner reports yet.</div>
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, color: colors.muted, fontSize: 10.5 }}>
          {presentation.routineGroups.length ? <span>{presentation.routineGroups.length} routines rolled up</span> : null}
          {presentation.completed.length ? <span>{presentation.completed.length} one-time items</span> : null}
          {presentation.exceptions.length ? <span>{presentation.exceptions.length} open/deferred updates</span> : null}
          {upcomingWork.length ? <span>{upcomingWork.length} upcoming</span> : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
          color: colors.muted,
          fontSize: 11,
        }}
      >
        <span>
          <strong style={{ color: colors.navy }}>{items.length}</strong> source items in report
        </span>
        <span>Print / PDF now rolls recurring work into one line.</span>
      </div>

      <details>
        <summary
          style={{
            cursor: "pointer",
            color: colors.navy,
            fontSize: 12,
            fontWeight: 850,
            padding: "8px 0",
          }}
        >
          Edit report items
        </summary>
        <div style={{ display: "grid", gap: 7, marginTop: 4 }}>
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 11,
                  padding: 9,
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "110px 120px minmax(145px,.8fr) minmax(220px,1.5fr) minmax(220px,1.5fr) auto",
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
                <input
                  value={item.person}
                  onChange={(event) => updateItem(item.id, { person: event.currentTarget.value })}
                  placeholder="Person"
                  style={controlStyle}
                />
                <select
                  value={item.department}
                  onChange={(event) => updateItem(item.id, { department: event.currentTarget.value })}
                  style={controlStyle}
                >
                  {departments.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </select>
                <input
                  value={item.title}
                  onChange={(event) => updateItem(item.id, { title: event.currentTarget.value })}
                  placeholder="Work activity"
                  style={controlStyle}
                />
                <textarea
                  value={item.notes}
                  onChange={(event) => updateItem(item.id, { notes: event.currentTarget.value })}
                  placeholder="Outcome / notes"
                  rows={isMobile ? 2 : 1}
                  style={{ ...controlStyle, resize: "vertical", minHeight: 38 }}
                />
                <div style={{ display: "grid", gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => void saveReportItem(item.id)}
                    disabled={saving}
                    style={{ ...buttonStyle, padding: "9px 10px", opacity: saving ? 0.5 : 1 }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteReportItem(item.id)}
                    disabled={saving}
                    style={{ ...quietButtonStyle, padding: "9px 10px", opacity: saving ? 0.5 : 1 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: 16,
                border: `1px dashed ${colors.line}`,
                borderRadius: 11,
                color: colors.muted,
                fontSize: 12,
              }}
            >
              No work activity found for this date range.
            </div>
          )}
        </div>
      </details>

      {message ? (
        <div style={{ marginTop: 10, color: colors.navy, fontSize: 12, fontWeight: 800 }}>{message}</div>
      ) : null}
    </section>
  );
}
