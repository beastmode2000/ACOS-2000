import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

type LandscapeStatus = "Not Started" | "In Progress" | "Complete" | "Needs Review";

type AddisonTaskRecord = {
  id: string;
  title?: string;
  taskMeta?: Record<string, any>;
  [key: string]: any;
};

const ADDISON_WORK_TOKEN =
  process.env.ADDISON_WORK_TOKEN ||
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

function pacificDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((part) => part.type === "year")?.value || "";
  const m = parts.find((part) => part.type === "month")?.value || "";
  const d = parts.find((part) => part.type === "day")?.value || "";
  return `${y}-${m}-${d}`;
}

function sqlDateKey(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error(`Invalid Atlas date value: ${text || "empty"}`);
}

function weekdayFromDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

function addisonTaskMeta(record: AddisonTaskRecord) {
  return record?.taskMeta && typeof record.taskMeta === "object"
    ? record.taskMeta
    : record;
}

function isAddisonAssigned(record: AddisonTaskRecord) {
  const meta = addisonTaskMeta(record);
  return isAddisonAssigneeValue(
    meta?.assignee ||
      meta?.assignedTo ||
      meta?.assigned_to ||
      record?.assignee ||
      record?.assignedTo ||
      record?.assigned_to,
  );
}

async function ensureAddisonBackingTables() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_operational_records (
      record_type text NOT NULL,
      id text NOT NULL,
      property_id text NOT NULL DEFAULT '2000',
      record jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (record_type, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_templates (
      property_id text NOT NULL DEFAULT '2000',
      day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_occurrences (
      property_id text NOT NULL DEFAULT '2000',
      occurrence_date date NOT NULL,
      day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      routine_name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureInboxTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_inbox_items (
      id text PRIMARY KEY,
      title text NOT NULL,
      intake_type text NOT NULL DEFAULT 'Document',
      status text NOT NULL DEFAULT 'New',
      source text NOT NULL DEFAULT 'Fast Intake',
      notes text NOT NULL DEFAULT '',
      pasted_text text NOT NULL DEFAULT '',
      files jsonb NOT NULL DEFAULT '[]'::jsonb,
      target_type text NOT NULL DEFAULT 'General',
      target_id text NOT NULL DEFAULT '',
      target_name text NOT NULL DEFAULT '',
      proposed_action text NOT NULL DEFAULT 'Attach to Existing',
      extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}


function isAddisonAssigneeValue(value: unknown) {
  const assigned = String(value || "").trim().toLowerCase();
  return assigned === "addison" || assigned === "addison hutton" || assigned.startsWith("addison ");
}

function nextAddisonWorkDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  do {
    date.setDate(date.getDate() + 1);
  } while ([0,1,6].includes(date.getDay()));
  return date.toISOString().slice(0, 10);
}

function nextRecurringDate(
  dateKey: string,
  intervalValue: unknown,
  unitValue: unknown,
) {
  const interval = Math.max(1, Number(intervalValue || 1));
  const unit = String(unitValue || "Weeks");
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  if (unit === "Days") date.setDate(date.getDate() + interval);
  else if (unit === "Months") date.setMonth(date.getMonth() + interval);
  else if (unit === "Years") date.setFullYear(date.getFullYear() + interval);
  else date.setDate(date.getDate() + interval * 7);
  return date.toISOString().slice(0, 10);
}

const UNIFIED_WORK_PREFIX = "work-order:";

function unifiedWorkTaskId(id: unknown) {
  return `${UNIFIED_WORK_PREFIX}${String(id || "")}`;
}

function sourceWorkOrderId(taskId: unknown) {
  const value = String(taskId || "");
  return value.startsWith(UNIFIED_WORK_PREFIX) ? value.slice(UNIFIED_WORK_PREFIX.length) : "";
}

function unifiedWorkRowToTask(row: Record<string, any>, today = pacificDateKey()) {
  const dueDate = sqlDateKey(row.due_date_value || row.date || today);
  const lastCompletedDate = row.last_completed_date ? sqlDateKey(row.last_completed_date) : "";
  const completionHistory = Array.isArray(row.completion_history) ? row.completion_history.map((value: unknown) => sqlDateKey(value)) : [];
  const serviceHistory = Array.isArray(row.service_history) ? row.service_history : [];
  const completedToday = lastCompletedDate === today || completionHistory.includes(today) || serviceHistory.some((entry: any) => String(entry?.completedAt || "").slice(0, 10) === today);
  const status = completedToday ? "Completed" : String(row.status || "Open");
  const assignedTo = String(row.assigned_to || "");
  const notes = String(row.notes || "");
  return {
    id: unifiedWorkTaskId(row.id),
    source: "unified-work",
    sourceWorkOrderId: String(row.id || ""),
    propertyId: String(row.property_id || "2000"),
    title: String(row.title || "Work"),
    category: String(row.work_category || "Work"),
    locationId: String(row.location_id || ""),
    recurring: Boolean(row.recurring),
    priority: String(row.priority || "Medium"),
    notes,
    taskMeta: {
      status,
      assignee: assignedTo,
      assignedTo,
      dueDate,
      notes,
      instructions: notes,
      recurring: Boolean(row.recurring),
      recurrenceInterval: Math.max(1, Number(row.recurrence_interval || 1)),
      recurrenceUnit: String(row.recurrence_unit || "Weeks"),
      lastCompletedDate,
      completionHistory,
      serviceHistory,
      photos: Array.isArray(row.photos) ? row.photos : [],
      checklist: Array.isArray(row.checklist) ? row.checklist : [],
      workType: String(row.work_type || "Work Order"),
      responsibilityArea: String(row.responsibility_area || ""),
      updatedAt: row.updated_at,
    },
  };
}

async function loadUnifiedWorkForEmployee(employee: {id:string;name:string;propertyIds:string[]}) {
  const sql = getSql();
  const properties = employee.propertyIds.length ? employee.propertyIds : ["2000"];
  const rows = await sql`
    SELECT id, property_id, title, status, priority, notes, recurring,
      recurrence_interval, recurrence_unit, last_completed_date,
      completion_history, service_history, due_date_value, date, work_type,
      work_category, responsibility_area, assigned_to, location_id, photos,
      checklist, updated_at
    FROM atlas_work_orders
    WHERE property_id = ANY(${properties}::text[])
    ORDER BY COALESCE(due_date_value, date) ASC, updated_at DESC
  `;
  return (rows as any[])
    .filter((row) => isAssignedToName({ id: String(row.id || ""), assignedTo: row.assigned_to }, employee.name))
    .map((row) => unifiedWorkRowToTask(row));
}

async function patchUnifiedWorkForEmployee(
  employee: {id:string;name:string;propertyIds:string[]},
  taskId: string,
  action: string,
  body: Record<string, any>,
) {
  const id = sourceWorkOrderId(taskId);
  if (!id) return false;
  const sql = getSql();
  const properties = employee.propertyIds.length ? employee.propertyIds : ["2000"];
  const rows = await sql`
    SELECT id, property_id, title, status, priority, notes, recurring,
      recurrence_interval, recurrence_unit, last_completed_date,
      completion_history, service_history, due_date_value, date, work_type,
      work_category, responsibility_area, assigned_to, location_id, photos,
      checklist, updated_at
    FROM atlas_work_orders
    WHERE id=${id} AND property_id = ANY(${properties}::text[])
    LIMIT 1
  `;
  const row = rows[0] as any;
  if (!row || !isAssignedToName({ id: String(row.id || ""), assignedTo: row.assigned_to }, employee.name)) return false;

  const today = pacificDateKey();
  let status = String(row.status || "Open");
  let dueDate = sqlDateKey(row.due_date_value || row.date || today);
  let lastCompletedDate = row.last_completed_date ? sqlDateKey(row.last_completed_date) : "";
  let history = Array.isArray(row.completion_history) ? row.completion_history.map((value: unknown) => sqlDateKey(value)) : [];
  let serviceHistory = Array.isArray(row.service_history) ? [...row.service_history] : [];
  let notes = String(row.notes || "");
  let photos = Array.isArray(row.photos) ? [...row.photos] : [];

  if (action === "task-status") {
    const completed = String(body.status || "Open") === "Completed";
    if (completed) {
      history = Array.from(new Set([...history, today])).sort();
      lastCompletedDate = today;
      if (!serviceHistory.some((entry: any) => String(entry?.completedAt || "").slice(0, 10) === today)) {
        serviceHistory.push({
          id: `field-${id}-${today}`,
          completedAt: new Date().toISOString(),
          completedBy: employee.name,
          notes,
          dueDate,
        });
      }
      if (Boolean(row.recurring)) {
        dueDate = nextRecurringDate(dueDate > today ? dueDate : today, row.recurrence_interval, row.recurrence_unit);
        status = "Scheduled";
      } else {
        status = "Completed";
      }
    } else {
      status = String(body.status || "Open");
      history = history.filter((value: string) => value !== today);
      serviceHistory = serviceHistory.filter((entry: any) => String(entry?.completedAt || "").slice(0, 10) !== today);
      if (lastCompletedDate === today) lastCompletedDate = "";
    }
  } else if (action === "task-note") {
    notes = String(body.note || "");
  } else if (action === "task-photo") {
    if (body.photo) photos.push(body.photo);
  } else if (action === "task-flag" && Boolean(body.needsNick)) {
    notes = `${notes}${notes ? "\n\n" : ""}NEEDS NICK: Flagged by ${employee.name} on ${today}.`;
  } else if (action === "task-problem" && Boolean(body.problemFound)) {
    notes = `${notes}${notes ? "\n\n" : ""}PROBLEM FOUND: Reported by ${employee.name} on ${today}.`;
    status = "Waiting";
  } else if (action !== "task-nothing-needed") {
    return false;
  }

  await sql`
    UPDATE atlas_work_orders SET
      status=${status}, notes=${notes}, due_date_value=${dueDate}::date,
      due_date_initialized=true, last_completed_date=${lastCompletedDate || null}::date,
      completion_history=${JSON.stringify(history)}::jsonb,
      service_history=${JSON.stringify(serviceHistory)}::jsonb,
      photos=${JSON.stringify(photos)}::jsonb, updated_at=NOW()
    WHERE id=${id} AND property_id=${String(row.property_id)}
  `;
  return true;
}

function addDateKeyDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function mondayForDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function weekdayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
  }).format(new Date(`${dateKey}T12:00:00-07:00`));
}

function cleanHistoryText(value: unknown) {
  return String(value || "").trim();
}

async function loadAddisonWork() {
  await ensureAddisonBackingTables();

  const sql = getSql();
  const today = pacificDateKey();

  const deletedTaskRows = await sql`
    SELECT id
    FROM atlas_operational_records
    WHERE record_type = 'addison_task_tombstone'
      AND property_id = '2000'
  `;
  const deletedTaskIds = new Set(
    deletedTaskRows.map((row: any) => String(row.id || "")).filter(Boolean),
  );

  const rows = await sql`
    SELECT id, record, updated_at
    FROM atlas_operational_records
    WHERE record_type = 'tasks'
      AND property_id = '2000'
    ORDER BY updated_at DESC
  `;

  let allTasks = rows.map((row: any) => ({
    ...(row.record || {}),
    id: String(row.id || row.record?.id || ''),
    serverUpdatedAt: row.updated_at,
  })) as AddisonTaskRecord[];

  const unifiedWork = await loadUnifiedWorkForEmployee({ id: "addison", name: "Addison", propertyIds: ["2000"] });
  const migratedLegacyTaskIds = new Set(
    unifiedWork
      .map((task: any) => String(task.taskMeta?.responsibilityArea || "").match(/legacy task\s+(.+)$/i)?.[1] || "")
      .filter(Boolean),
  );
  allTasks = [
    ...allTasks.filter((task) => !migratedLegacyTaskIds.has(String(task.id || ""))),
    ...unifiedWork,
  ];

  // Recurring Addison work stays visibly completed after he checks it off.
  // Only reopen that same task when its next occurrence is actually due.
  for (const task of allTasks) {
    if (!isAddisonAssigned(task) || !task.recurring) continue;
    const meta = addisonTaskMeta(task) || {};
    if (Boolean(meta?.paused)) continue;
    const nextDueDate = String(meta?.nextDueDate || '').slice(0, 10);
    if (
      String(meta?.status || '') !== 'Completed' ||
      !nextDueDate ||
      nextDueDate > today ||
      // A completion made today must never reopen again today, even if an
      // older/bad recurrence value left nextDueDate equal to or before today.
      String(meta?.lastCompletedDate || '').slice(0, 10) === today
    ) continue;

    const updatedAt = new Date().toISOString();
    const nextMeta = {
      ...meta,
      assignee: 'Addison',
      status: 'Open',
      dueDate: nextDueDate,
      completedAt: undefined,
      nextDueDate: '',
      needsReview: false,
      updatedAt,
    };
    const nextRecord = {
      ...task,
      ...nextMeta,
      taskMeta: nextMeta,
      propertyId: '2000',
      updatedAt,
    };

    await sql`
      UPDATE atlas_operational_records
      SET record = ${JSON.stringify(nextRecord)}::jsonb,
          updated_at = NOW()
      WHERE record_type = 'tasks'
        AND property_id = '2000'
        AND id = ${String(task.id)}
    `;

    Object.assign(task, nextRecord, { serverUpdatedAt: updatedAt });
  }

  const seenTasks = new Set<string>();
  const tasks = allTasks
    .filter((task) => !deletedTaskIds.has(String(task.id || "")))
    .filter(isAddisonAssigned)
    .filter((task) => {
      const meta = addisonTaskMeta(task);
      const identity = [
        String(task.title || '').trim().toLowerCase().replace(/\s+/g, ' '),
        String(meta?.dueDate || '').slice(0, 10),
        String(task.locationId || 'general'),
        task.recurring
          ? `${Number(meta?.recurrenceInterval || 1)}-${String(meta?.recurrenceUnit || 'Weeks')}`
          : 'one-time',
        meta?.status === 'Completed' ? 'completed' : 'active',
      ].join('||');

      if (seenTasks.has(identity)) return false;
      seenTasks.add(identity);
      return true;
    })
    .sort((a, b) => {
      const am = addisonTaskMeta(a);
      const bm = addisonTaskMeta(b);
      const aPaused = Boolean(am?.paused);
      const bPaused = Boolean(bm?.paused);
      if (aPaused !== bPaused) return aPaused ? 1 : -1;
      const ao = Number(am?.addisonOrder || 0);
      const bo = Number(bm?.addisonOrder || 0);
      if (ao > 0 || bo > 0) {
        if (ao <= 0) return 1;
        if (bo <= 0) return -1;
        if (ao !== bo) return ao - bo;
      }
      const dueCompare = String(am?.dueDate || '9999-12-31').localeCompare(
        String(bm?.dueDate || '9999-12-31'),
      );
      if (dueCompare) return dueCompare;
      const weight: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      return (weight[String(a.priority || 'Medium')] ?? 1) - (weight[String(b.priority || 'Medium')] ?? 1);
    });

  const dailyNoteRows = await sql`
    SELECT id, record, updated_at
    FROM atlas_operational_records
    WHERE record_type = 'addison_daily_note'
      AND property_id = '2000'
    ORDER BY id DESC
    LIMIT 45
  `;

  const dailyNoteRecord = dailyNoteRows.find((row: any) => String(row.id || "") === today)?.record || {};

  const completionRows = await sql`
    SELECT id, record, updated_at
    FROM atlas_operational_records
    WHERE record_type = 'addison_completion_history'
      AND property_id = '2000'
    ORDER BY updated_at DESC
    LIMIT 250
  `;

  const taskNoteRows = await sql`
    SELECT id, record, updated_at
    FROM atlas_operational_records
    WHERE record_type = 'addison_note_history'
      AND property_id = '2000'
    ORDER BY updated_at DESC
    LIMIT 150
  `;

  const locationRows = await sql`
    SELECT id, record
    FROM atlas_operational_records
    WHERE record_type = 'locations'
      AND property_id = '2000'
    ORDER BY COALESCE(record->>'name', record->>'title', id) ASC
  `;

  const locations = locationRows.map((row: any) => ({
    id: String(row.id || row.record?.id || ''),
    name: String(row.record?.name || row.record?.title || 'Location'),
  }));


  const locationNameById = new Map(
    locations.map((location: any) => [String(location.id || ""), String(location.name || "")]),
  );

  const storedHistory = completionRows.map((row: any) => {
    const record = row.record || {};
    const locationId = String(record.locationId || "general");
    return {
      id: String(row.id || record.id || ""),
      taskId: String(record.taskId || ""),
      title: String(record.title || "Task"),
      date: String(record.date || "").slice(0, 10),
      completedAt: String(record.completedAt || row.updated_at || ""),
      locationId,
      locationName: String(record.locationName || locationNameById.get(locationId) || (locationId === "general" ? "General" : locationId)),
      note: String(record.note || ""),
      instructions: String(record.instructions || ""),
      recurring: Boolean(record.recurring),
      frequency: String(record.frequency || ""),
      photos: Array.isArray(record.photos) ? record.photos : [],
    };
  }).filter((item: any) => item.date && item.taskId);

  // Backfill completion history from the task metadata so completions made before
  // the permanent history table existed are still visible to Nick.
  const virtualHistory: Array<Record<string, any>> = [];
  for (const task of allTasks.filter(isAddisonAssigned)) {
    const meta = addisonTaskMeta(task) || {};
    const dates = Array.isArray(meta?.completionHistory)
      ? meta.completionHistory.map((value: unknown) => String(value || "").slice(0, 10)).filter(Boolean)
      : [];
    for (const date of dates) {
      const locationId = String(task.locationId || "general");
      virtualHistory.push({
        id: `legacy::${date}::${String(task.id || "")}`,
        taskId: String(task.id || ""),
        title: String(task.title || "Task"),
        date,
        completedAt: date === String(meta?.lastCompletedDate || "").slice(0, 10)
          ? String(meta?.completedAt || `${date}T12:00:00-07:00`)
          : `${date}T12:00:00-07:00`,
        locationId,
        locationName: String(locationNameById.get(locationId) || (locationId === "general" ? "General" : locationId)),
        note: String(meta?.addisonNote || ""),
        instructions: String(meta?.instructions || task.notes || ""),
        recurring: Boolean(task.recurring),
        frequency: task.recurring
          ? `${Math.max(1, Number(meta?.recurrenceInterval || 1))} ${String(meta?.recurrenceUnit || "Weeks")}`
          : "One-time",
        photos: Array.isArray(meta?.photos) ? meta.photos : [],
      });
    }
  }

  const historyByKey = new Map<string, Record<string, any>>();
  for (const item of [...virtualHistory, ...storedHistory]) {
    historyByKey.set(`${String(item.taskId)}::${String(item.date)}`, item);
  }
  const history = Array.from(historyByKey.values())
    .sort((a, b) => String(b.completedAt || b.date).localeCompare(String(a.completedAt || a.date)))
    .slice(0, 250);

  const dailyNotes = dailyNoteRows
    .map((row: any) => ({
      id: String(row.id || ""),
      date: String(row.id || row.record?.date || "").slice(0, 10),
      note: cleanHistoryText(row.record?.note),
      updatedAt: String(row.record?.updatedAt || row.updated_at || ""),
    }))
    .filter((item: any) => item.date && item.note);

  const persistedTaskNotes = taskNoteRows
    .map((row: any) => ({
      id: String(row.id || ""),
      taskId: String(row.record?.taskId || ""),
      taskTitle: String(row.record?.taskTitle || "Task"),
      date: String(row.record?.date || pacificDateKey(new Date(row.updated_at))).slice(0, 10),
      note: cleanHistoryText(row.record?.note),
      updatedAt: String(row.record?.updatedAt || row.updated_at || ""),
    }))
    .filter((item: any) => item.note);

  const taskNoteKeys = new Set(persistedTaskNotes.map((item: any) => `${item.taskId}::${item.note}`));
  const currentTaskNotes = allTasks
    .filter(isAddisonAssigned)
    .map((task) => {
      const meta = addisonTaskMeta(task) || {};
      const note = cleanHistoryText(meta?.addisonNote);
      const updatedAt = String(meta?.updatedAt || task.updatedAt || task.serverUpdatedAt || "");
      const taskId = String(task.id || "");
      return {
        id: `current-note::${taskId}`,
        taskId,
        taskTitle: String(task.title || "Task"),
        date: updatedAt ? pacificDateKey(new Date(updatedAt)) : today,
        note,
        updatedAt,
      };
    })
    .filter((item) => item.note && !taskNoteKeys.has(`${item.taskId}::${item.note}`));

  const taskNotes = [...persistedTaskNotes, ...currentTaskNotes]
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)))
    .slice(0, 150);

  const weekStart = mondayForDateKey(today);
  const weekEnd = addDateKeyDays(weekStart, 6);
  const weekHistory = history.filter((item: any) => item.date >= weekStart && item.date <= weekEnd);
  const weekDailyNotes = dailyNotes.filter((item: any) => item.date >= weekStart && item.date <= weekEnd);
  const lines = ["Addison"];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDateKeyDays(weekStart, offset);
    const completed = weekHistory.filter((item: any) => item.date === date);
    const dayNotes = weekDailyNotes.filter((item: any) => item.date === date);
    if (!completed.length && !dayNotes.length) continue;
    const parts: string[] = [];
    if (completed.length) parts.push(completed.map((item: any) => item.title).join(", "));
    for (const note of dayNotes) parts.push(`Note: ${note.note}`);
    lines.push(`${weekdayLabel(date)} — ${parts.join("; ")}`);
  }

  return {
    today,
    tasks,
    locations,
    dailyNote: String(dailyNoteRecord.note || ''),
    dailyNoteUpdatedAt: String(dailyNoteRecord.updatedAt || ''),
    history,
    dailyNotes,
    taskNotes,
    weekStart,
    weeklySummary: lines.join("\n"),
    deletedTaskIds: Array.from(deletedTaskIds),
  };
}

async function patchAddisonTask(
  taskId: string,
  patch: Record<string, unknown>,
) {
  const sql = getSql();
  const rows = await sql`
    SELECT record
    FROM atlas_operational_records
    WHERE record_type = 'tasks'
      AND property_id = '2000'
      AND id = ${taskId}
    LIMIT 1
  `;
  const current = rows[0]?.record as AddisonTaskRecord | undefined;
  if (!current || !isAddisonAssigned(current)) return false;

  const baseMeta = addisonTaskMeta(current) || {};
  const nextMeta = {
    ...baseMeta,
    ...patch,
    assignee: "Addison",
    updatedAt: new Date().toISOString(),
  };
  const nextRecord = {
    ...current,
    ...nextMeta,
    taskMeta: nextMeta,
    propertyId: "2000",
    updatedAt: nextMeta.updatedAt,
  };

  await sql`
    UPDATE atlas_operational_records
    SET record = ${JSON.stringify(nextRecord)}::jsonb,
        updated_at = NOW()
    WHERE record_type = 'tasks'
      AND property_id = '2000'
      AND id = ${taskId}
  `;
  return true;
}

type LandscapeHelpItemInput = {
  id: string;
  isDone?: boolean;
  notes?: string;
  updatedBy?: string;
};

const DEFAULT_ITEMS = [
  { label: "Weed waterside / lake-facing beds first", category: "Weeding", priority: "Highest" },
  { label: "Weed patio beds", category: "Weeding", priority: "High" },
  { label: "Weed courtyard beds", category: "Weeding", priority: "High" },
  { label: "Weed driveway beds", category: "Weeding", priority: "Normal" },
  { label: "Weed dock path and edges", category: "Weeding", priority: "High" },
  { label: "Clean lawn edges where needed", category: "Grounds", priority: "Normal" },
  { label: "Water pots", category: "Watering", priority: "High" },
  { label: "Prune / shear as needed", category: "Pruning", priority: "Normal" },
  { label: "Remove yard debris", category: "Cleanup", priority: "High" },
  { label: "Blow patios, paths, driveway, and hardscape after work", category: "Cleanup", priority: "High" },
  { label: "Check for dry areas, irrigation issues, or broken heads", category: "Irrigation", priority: "High" },
  { label: "Monitor / adjust lake-water irrigation use and report concerns to Pat", category: "Irrigation", priority: "Normal" },
  { label: "Record lawn treatment, fertilizer, soil, or mowing/edging notes if completed", category: "Lawn", priority: "Normal" },
  { label: "Add notes for anything Nick or Pat needs to review", category: "Notes", priority: "High" },
];

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return neon(databaseUrl);
}

function getAdminAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";

  if (!header.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function adminBlockResponse(request: NextRequest) {
  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atlas access is not configured. Add ATLAS_ACCESS_USERNAME and ATLAS_ACCESS_PASSWORD in Vercel.",
      },
      { status: 500 }
    );
  }

  const auth = getAdminAuth(request);

  if (!auth || auth.username !== expectedUsername || auth.password !== expectedPassword) {
    return NextResponse.json(
      { ok: false, error: "Atlas login required." },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Atlas 2000", charset="UTF-8"',
        },
      }
    );
  }

  return null;
}

function getPacificWeekStartISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diffToMonday);

  return utcDate.toISOString().slice(0, 10);
}

function safeStatus(value: unknown): LandscapeStatus {
  if (value === "In Progress" || value === "Complete" || value === "Needs Review" || value === "Not Started") return value;
  return "Not Started";
}

function normalizeWeek(row: any) {
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title,
    shareToken: row.share_token,
    status: row.status,
    crewName: row.crew_name ?? "",
    managerNotes: row.manager_notes ?? "",
    crewNotes: row.crew_notes ?? "",
    completedAt: row.completed_at ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function normalizeItem(row: any) {
  return {
    id: row.id,
    weekId: row.week_id,
    sortOrder: row.sort_order,
    label: row.label,
    category: row.category,
    priority: row.priority,
    isDone: Boolean(row.is_done),
    notes: row.notes ?? "",
    updatedBy: row.updated_by ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

async function ensureSchema() {
  const sql = getSql();

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_weeks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start DATE NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT 'Landscape Help',
      share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
      status TEXT NOT NULL DEFAULT 'Not Started',
      crew_name TEXT DEFAULT '',
      manager_notes TEXT DEFAULT '',
      crew_notes TEXT DEFAULT '',
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id UUID NOT NULL REFERENCES landscape_help_weeks(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      priority TEXT NOT NULL DEFAULT 'Normal',
      is_done BOOLEAN NOT NULL DEFAULT false,
      notes TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS landscape_help_items_week_idx
    ON landscape_help_items (week_id, sort_order)
  `;
}

async function ensureWeek(weekStart: string) {
  const sql = getSql();

  const existing = await sql`
    SELECT *
    FROM landscape_help_weeks
    WHERE week_start = ${weekStart}::date
    LIMIT 1
  `;

  let week = existing[0];

  if (!week) {
    const created = await sql`
      INSERT INTO landscape_help_weeks (week_start, title, status)
      VALUES (${weekStart}::date, 'Landscape Help', 'Not Started')
      RETURNING *
    `;
    week = created[0];
  }

  const itemCount = await sql`
    SELECT COUNT(*)::int AS count
    FROM landscape_help_items
    WHERE week_id = ${week.id}
  `;

  if (Number(itemCount[0]?.count ?? 0) === 0) {
    for (let index = 0; index < DEFAULT_ITEMS.length; index += 1) {
      const item = DEFAULT_ITEMS[index];

      await sql`
        INSERT INTO landscape_help_items (week_id, sort_order, label, category, priority)
        VALUES (${week.id}, ${index + 1}, ${item.label}, ${item.category}, ${item.priority})
      `;
    }
  }

  return week;
}

async function loadWeekById(weekId: string) {
  const sql = getSql();

  const weeks = await sql`
    SELECT *
    FROM landscape_help_weeks
    WHERE id = ${weekId}
    LIMIT 1
  `;

  if (!weeks[0]) return null;

  const items = await sql`
    SELECT *
    FROM landscape_help_items
    WHERE week_id = ${weekId}
    ORDER BY sort_order ASC
  `;

  return {
    week: normalizeWeek(weeks[0]),
    items: items.map(normalizeItem),
  };
}

async function loadWeekByToken(token: string) {
  const sql = getSql();

  const weeks = await sql`
    SELECT *
    FROM landscape_help_weeks
    WHERE share_token = ${token}
    LIMIT 1
  `;

  if (!weeks[0]) return null;

  return loadWeekById(weeks[0].id);
}


async function resolveFieldEmployee(token: string) {
  if (!token || token === ADDISON_WORK_TOKEN) return null;
  const sql = getSql();
  await sql`ALTER TABLE atlas_team_access ADD COLUMN IF NOT EXISTS field_token_hash text`;
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = await sql`
    SELECT id, name, role, active, property_ids
    FROM atlas_team_access
    WHERE field_token_hash=${hash} AND active=true
    LIMIT 1
  `;
  const row = rows[0] as any;
  if (!row || String(row.role).toLowerCase() !== "employee") return null;
  return { id:String(row.id), name:String(row.name || "Team Member"), propertyIds:Array.isArray(row.property_ids) ? row.property_ids.map(String) : ["2000"] };
}

function isAssignedToName(record: AddisonTaskRecord, name: string) {
  const meta = addisonTaskMeta(record);
  const assigned = String(meta?.assignee || meta?.assignedTo || meta?.assigned_to || record?.assignee || record?.assignedTo || "").trim().toLowerCase();
  const target = name.trim().toLowerCase();
  const first = target.split(/\s+/)[0] || target;
  if (/^pat(?:rick)?(?:[^a-z]|$)/.test(target) && /^pat(?:rick)?(?:[^a-z]|$)/.test(assigned)) return true;
  return Boolean(assigned && (assigned === target || assigned === first || assigned.startsWith(`${first} `)));
}

async function ensureTeamWorkListsTableForField(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_team_work_lists (
      id text PRIMARY KEY,
      record jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureTeamEmployeeHistoryTableForField(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_team_work_history (
      id text PRIMARY KEY,
      event_key text UNIQUE NOT NULL,
      member_id text,
      employee_name text NOT NULL,
      property_id text NOT NULL,
      source text NOT NULL,
      list_id text,
      list_name text,
      task_id text NOT NULL,
      task_title text NOT NULL,
      location text,
      note text,
      completed_at timestamptz NOT NULL,
      needs_nick boolean NOT NULL DEFAULT false,
      problem_found boolean NOT NULL DEFAULT false,
      photos jsonb NOT NULL DEFAULT '[]'::jsonb,
      snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensureEmployeeAlertInboxTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_inbox_items (
      id text PRIMARY KEY,
      title text NOT NULL,
      intake_type text NOT NULL DEFAULT 'Document',
      status text NOT NULL DEFAULT 'New',
      source text NOT NULL DEFAULT 'Fast Intake',
      notes text NOT NULL DEFAULT '',
      pasted_text text NOT NULL DEFAULT '',
      files jsonb NOT NULL DEFAULT '[]'::jsonb,
      target_type text NOT NULL DEFAULT 'General',
      target_id text NOT NULL DEFAULT '',
      target_name text NOT NULL DEFAULT '',
      proposed_action text NOT NULL DEFAULT 'Attach to Existing',
      extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function upsertEmployeeAlertInboxItem(
  employee: { id: string; name: string; propertyIds: string[] },
  task: Record<string, any>,
  alertType: "Needs Nick" | "Problem Found",
) {
  const sql = getSql();
  await ensureEmployeeAlertInboxTable(sql);
  const meta = addisonTaskMeta(task as AddisonTaskRecord) || task;
  const taskId = String(task.id || "");
  const taskTitle = String(task.title || "Assigned work");
  const propertyId = String(task.propertyId || employee.propertyIds[0] || "2000");
  const locationId = String(meta?.locationId || task.locationId || "");
  const locationName = String(meta?.locationName || task.locationName || task.location || "");
  const note = String(meta?.addisonNote || meta?.note || task.notes || "").trim();
  const photos = Array.isArray(meta?.photos) ? meta.photos : Array.isArray(task.photos) ? task.photos : [];
  const alertKey = `${employee.id}|${propertyId}|${taskId}|${alertType}`;
  const id = `employee-alert-${createHash("sha256").update(alertKey).digest("hex").slice(0, 24)}`;
  const extractedData = {
    propertyId, reportType: "Employee Alert", alertType,
    submittedBy: employee.name, submittedById: employee.id,
    employeeId: employee.id, employeeName: employee.name,
    taskId, taskTitle, locationId, locationName,
    employeeAlertKey: alertKey, suggestedAction: "Review Employee Alert",
  };
  await sql`
    INSERT INTO atlas_inbox_items (
      id, title, intake_type, status, source, notes, pasted_text, files,
      target_type, target_id, target_name, proposed_action, extracted_data, created_at, updated_at
    ) VALUES (
      ${id}, ${`${alertType} — ${employee.name} — ${taskTitle}`}, 'Employee Alert', 'Needs Review',
      'Employee My Work', ${note}, '', ${JSON.stringify(photos)}::jsonb,
      ${locationId ? 'Location' : 'General'}, ${locationId}, ${locationName},
      'Attach to Existing', ${JSON.stringify(extractedData)}::jsonb, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, status = 'Needs Review', source = EXCLUDED.source,
      notes = EXCLUDED.notes, files = EXCLUDED.files, target_type = EXCLUDED.target_type,
      target_id = EXCLUDED.target_id, target_name = EXCLUDED.target_name,
      extracted_data = EXCLUDED.extracted_data, updated_at = NOW()
  `;
}

async function upsertFieldEmployeeHistory(
  sql: ReturnType<typeof neon>,
  employee: { id: string; name: string; propertyIds: string[] },
  task: Record<string, any>,
  context: { source: string; propertyId: string; listId?: string; listName?: string },
) {
  const meta = addisonTaskMeta(task as AddisonTaskRecord) || task;
  if (String(meta?.status || task.status || "Open") !== "Completed") return;
  const completedAt = String(meta?.completedAt || task.completedAt || new Date().toISOString());
  const taskId = String(task.id || "");
  if (!taskId) return;
  const listId = String(context.listId || "");
  const eventKey = `${context.source}:${context.propertyId}:${listId}:${taskId}:${completedAt}`;
  const historyId = `history-${createHash("sha256").update(eventKey).digest("hex").slice(0, 24)}`;
  const photos = Array.isArray(meta?.photos) ? meta.photos : Array.isArray(task.photos) ? task.photos : [];
  const note = String(meta?.addisonNote || meta?.notes || task.notes || "");
  const snapshot = {
    ...task,
    taskMeta: meta,
    source: context.source,
    propertyId: context.propertyId,
    listId,
    listName: String(context.listName || ""),
    completedAt,
  };

  await ensureTeamEmployeeHistoryTableForField(sql);
  await sql`
    INSERT INTO atlas_team_work_history (
      id, event_key, member_id, employee_name, property_id, source,
      list_id, list_name, task_id, task_title, location, note,
      completed_at, needs_nick, problem_found, photos, snapshot, updated_at
    )
    VALUES (
      ${historyId}, ${eventKey}, ${employee.id}, ${employee.name}, ${context.propertyId}, ${context.source},
      ${listId || null}, ${String(context.listName || "") || null}, ${taskId}, ${String(task.title || "Task")},
      ${String(task.location || meta?.location || "") || null}, ${note || null}, ${completedAt}::timestamptz,
      ${Boolean(meta?.needsNick || task.needsNick)}, ${Boolean(meta?.problemFound || task.problemFound)},
      ${JSON.stringify(photos)}::jsonb, ${JSON.stringify(snapshot)}::jsonb, NOW()
    )
    ON CONFLICT (event_key)
    DO UPDATE SET
      employee_name = EXCLUDED.employee_name,
      task_title = EXCLUDED.task_title,
      location = EXCLUDED.location,
      note = EXCLUDED.note,
      needs_nick = EXCLUDED.needs_nick,
      problem_found = EXCLUDED.problem_found,
      photos = EXCLUDED.photos,
      snapshot = EXCLUDED.snapshot,
      updated_at = NOW()
  `;
}

function isTeamTaskAssignedToName(task: Record<string, any>, name: string) {
  const assigned = String(task.assignee || task.assignedTo || task.assigned_to || "").trim().toLowerCase();
  const target = name.trim().toLowerCase();
  const first = target.split(/\s+/)[0] || target;
  return Boolean(assigned && (assigned === target || assigned === first || assigned.startsWith(`${first} `)));
}


function isSeanFieldEmployee(employee: { name: string }) {
  return /^sean(?:\s|$)/i.test(String(employee.name || "").trim());
}

function marineRecordText(...values: unknown[]) {
  return values.map((value) => {
    if (typeof value === "string" || typeof value === "number") return String(value);
    try { return JSON.stringify(value || ""); } catch { return ""; }
  }).join(" ").toLowerCase();
}

const marineRecordPattern = /marine|dock|boat|cobalt|sea.?doo|jet.?ski|pwc|lift|water trampoline/i;

async function saveSeanMarineVisit(
  employee: { id: string; name: string; propertyIds: string[] },
  body: Record<string, any>,
) {
  if (!isSeanFieldEmployee(employee)) throw new Error("Marine visit logging is only available for Sean.");
  const summary = String(body.summary || "").trim();
  if (!summary) throw new Error("Enter what you did during this visit.");
  const properties = employee.propertyIds.length ? employee.propertyIds : ["2000"];
  const requestedProperty = String(body.propertyId || properties[0] || "2000");
  const propertyId = properties.includes(requestedProperty) ? requestedProperty : properties[0];
  const sql = getSql();
  const now = new Date().toISOString();
  const visitDate = String(body.visitDate || pacificDateKey()).slice(0, 10);
  const assetId = String(body.assetId || "");
  const workOrderId = String(body.workOrderId || "");
  const taskId = String(body.taskId || "");
  const taskTitle = String(body.taskTitle || "");
  const followUp = String(body.followUp || "").trim();
  const partsNeeded = String(body.partsNeeded || "").trim();
  const photos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : [];

  let assetName = String(body.assetName || "").trim();
  if (assetId) {
    const rows = await sql`
      SELECT id, name, category, location_id
      FROM atlas_assets
      WHERE id=${assetId} AND property_id=${propertyId}
      LIMIT 1
    `;
    const row = rows[0] as any;
    if (row) assetName = String(row.name || assetName || "");
  }

  let workOrderTitle = String(body.workOrderTitle || "").trim();
  if (workOrderId) {
    const rows = await sql`
      SELECT id, title
      FROM atlas_work_orders
      WHERE id=${workOrderId} AND property_id=${propertyId}
      LIMIT 1
    `;
    const row = rows[0] as any;
    if (row) workOrderTitle = String(row.title || workOrderTitle || "");
  }

  const visitId = `marine-visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id: visitId,
    employeeId: employee.id,
    employeeName: employee.name,
    propertyId,
    department: "Dock & Marine",
    departmentKey: "dock",
    category: "Marine Visit",
    visitDate,
    summary,
    assetId,
    assetName,
    workOrderId,
    workOrderTitle,
    taskId,
    taskTitle,
    followUp,
    partsNeeded,
    photos,
    createdAt: now,
    updatedAt: now,
  };

  await sql`
    INSERT INTO atlas_operational_records (record_type, id, property_id, record, updated_at)
    VALUES ('marine_visit_log', ${visitId}, ${propertyId}, ${JSON.stringify(record)}::jsonb, NOW())
    ON CONFLICT (record_type, id, property_id)
    DO UPDATE SET record=EXCLUDED.record, updated_at=NOW()
  `;

  await ensureTeamEmployeeHistoryTableForField(sql);
  const eventKey = `marine-visit:${propertyId}:${visitId}`;
  const historyId = `history-${createHash("sha256").update(eventKey).digest("hex").slice(0, 24)}`;
  const displayTitle = assetName
    ? `Marine Visit · ${assetName}`
    : workOrderTitle
      ? `Marine Visit · ${workOrderTitle}`
      : "Marine Visit · Dock & Marine";
  const historyNote = [summary, followUp ? `Follow-up: ${followUp}` : "", partsNeeded ? `Parts/materials: ${partsNeeded}` : ""]
    .filter(Boolean)
    .join("\n");
  await sql`
    INSERT INTO atlas_team_work_history (
      id, event_key, member_id, employee_name, property_id, source,
      list_id, list_name, task_id, task_title, location, note,
      completed_at, needs_nick, problem_found, photos, snapshot, updated_at
    ) VALUES (
      ${historyId}, ${eventKey}, ${employee.id}, ${employee.name}, ${propertyId}, 'marine-visit',
      ${workOrderId || null}, 'Dock & Marine', ${visitId}, ${displayTitle}, ${assetName || 'Dock & Marine'},
      ${historyNote}, ${now}::timestamptz, false, false,
      ${JSON.stringify(photos)}::jsonb, ${JSON.stringify(record)}::jsonb, NOW()
    )
    ON CONFLICT (event_key) DO UPDATE SET
      task_title=EXCLUDED.task_title,
      location=EXCLUDED.location,
      note=EXCLUDED.note,
      photos=EXCLUDED.photos,
      snapshot=EXCLUDED.snapshot,
      updated_at=NOW()
  `;

  return record;
}

function isPatFieldEmployee(employee: { name: string }) {
  return /^(pat|patrick)(?:\\s|$)/i.test(String(employee.name || "").trim());
}

const landscapeRecordPattern = /landscap|irrigat|fertiliz|lawn|garden|yard|plant|tree|shrub|hedge|bed|weeding|watering/i;

async function savePatLandscapeVisit(
  employee: { id: string; name: string; propertyIds: string[] },
  body: Record<string, any>,
) {
  if (!isPatFieldEmployee(employee)) throw new Error("Landscaping visit logging is only available for Pat.");
  const summary = String(body.summary || "").trim();
  if (!summary) throw new Error("Enter what was done during this visit.");
  const properties = employee.propertyIds.length ? employee.propertyIds : ["2000"];
  const requestedProperty = String(body.propertyId || properties[0] || "2000");
  const propertyId = properties.includes(requestedProperty) ? requestedProperty : properties[0];
  const sql = getSql();
  const now = new Date().toISOString();
  const visitDate = String(body.visitDate || pacificDateKey()).slice(0, 10);
  const area = String(body.area || "").trim();
  const workOrderId = String(body.workOrderId || "");
  const taskId = String(body.taskId || "");
  const taskTitle = String(body.taskTitle || "");
  const crew = String(body.crew || "Pat / Crew").trim() || "Pat / Crew";
  const followUp = String(body.followUp || "").trim();
  const materialsNeeded = String(body.materialsNeeded || "").trim();
  const photos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : [];

  let workOrderTitle = String(body.workOrderTitle || "").trim();
  if (workOrderId) {
    const rows = await sql`
      SELECT id, title
      FROM atlas_work_orders
      WHERE id=${workOrderId} AND property_id=${propertyId}
      LIMIT 1
    `;
    const row = rows[0] as any;
    if (row) workOrderTitle = String(row.title || workOrderTitle || "");
  }

  const visitId = `landscape-visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id: visitId,
    employeeId: employee.id,
    employeeName: employee.name,
    propertyId,
    department: "Landscaping & Irrigation",
    departmentKey: "landscape",
    category: "Landscaping Visit",
    visitDate,
    area,
    crew,
    summary,
    workOrderId,
    workOrderTitle,
    taskId,
    taskTitle,
    followUp,
    materialsNeeded,
    photos,
    createdAt: now,
    updatedAt: now,
  };

  await sql`
    INSERT INTO atlas_operational_records (record_type, id, property_id, record, updated_at)
    VALUES ('landscape_visit_log', ${visitId}, ${propertyId}, ${JSON.stringify(record)}::jsonb, NOW())
    ON CONFLICT (record_type, id, property_id)
    DO UPDATE SET record=EXCLUDED.record, updated_at=NOW()
  `;

  await ensureTeamEmployeeHistoryTableForField(sql);
  const eventKey = `landscape-visit:${propertyId}:${visitId}`;
  const historyId = `history-${createHash("sha256").update(eventKey).digest("hex").slice(0, 24)}`;
  const displayTitle = area
    ? `Landscaping Visit · ${area}`
    : workOrderTitle
      ? `Landscaping Visit · ${workOrderTitle}`
      : "Landscaping Visit · Landscaping & Irrigation";
  const historyNote = [
    summary,
    crew ? `Completed by: ${crew}` : "",
    followUp ? `Follow-up: ${followUp}` : "",
    materialsNeeded ? `Materials: ${materialsNeeded}` : "",
  ].filter(Boolean).join("\\n");
  await sql`
    INSERT INTO atlas_team_work_history (
      id, event_key, member_id, employee_name, property_id, source,
      list_id, list_name, task_id, task_title, location, note,
      completed_at, needs_nick, problem_found, photos, snapshot, updated_at
    ) VALUES (
      ${historyId}, ${eventKey}, ${employee.id}, ${employee.name}, ${propertyId}, 'landscape-visit',
      ${workOrderId || null}, 'Landscaping & Irrigation', ${visitId}, ${displayTitle}, ${area || 'Landscaping & Irrigation'},
      ${historyNote}, ${now}::timestamptz, false, false,
      ${JSON.stringify(photos)}::jsonb, ${JSON.stringify(record)}::jsonb, NOW()
    )
    ON CONFLICT (event_key) DO UPDATE SET
      task_title=EXCLUDED.task_title,
      location=EXCLUDED.location,
      note=EXCLUDED.note,
      photos=EXCLUDED.photos,
      snapshot=EXCLUDED.snapshot,
      updated_at=NOW()
  `;

  return record;
}

async function loadFieldEmployeeWork(employee: {id:string;name:string;propertyIds:string[]}) {
  await ensureAddisonBackingTables();
  const sql = getSql();
  const today = pacificDateKey();
  const properties = employee.propertyIds.length ? employee.propertyIds : ["2000"];
  const rows = await sql`
    SELECT id, property_id, record, updated_at
    FROM atlas_operational_records
    WHERE record_type='tasks' AND property_id = ANY(${properties}::text[])
    ORDER BY updated_at DESC
  `;
  const tasks = rows.map((row:any)=>({...(row.record||{}), id:String(row.id || row.record?.id || ""), propertyId:String(row.property_id || row.record?.propertyId || "2000")}))
    .filter((task:AddisonTaskRecord)=>isAssignedToName(task, employee.name))
    .filter((task:AddisonTaskRecord)=>{
      const meta=addisonTaskMeta(task); const status=String(meta?.status||task.status||"Open");
      const completed=String(meta?.completedAt||"").slice(0,10)===today || (Array.isArray(meta?.completionHistory)&&meta.completionHistory.includes(today));
      return status !== "Completed" || completed;
    });

  await ensureTeamWorkListsTableForField(sql);
  const listRows = await sql`SELECT id, record FROM atlas_team_work_lists ORDER BY updated_at DESC`;
  const listTasks = (listRows as any[]).flatMap((row:any) => {
    const list = row.record && typeof row.record === "object" ? row.record : {};
    if (list.active === false) return [];
    const listProperties = Array.isArray(list.propertyIds) ? list.propertyIds.map(String) : ["2000"];
    const matchingProperties = listProperties.filter((propertyId:string) => properties.includes(propertyId));
    if (!matchingProperties.length) return [];
    const sourceTasks = Array.isArray(list.tasks) ? list.tasks : [];
    return sourceTasks
      .filter((task:Record<string,any>) => isTeamTaskAssignedToName(task, employee.name))
      .map((task:Record<string,any>) => ({
        ...task,
        id: String(task.id || ""),
        propertyId: matchingProperties[0],
        source: "team-work-list",
        sourceListId: String(list.id || row.id || ""),
        taskMeta: {
          ...task,
          status: String(task.status || "Open"),
          assignee: String(task.assignee || employee.name),
          addisonNote: String(task.addisonNote || task.notes || ""),
        },
      }));
  });

  const unifiedWork = await loadUnifiedWorkForEmployee(employee);
  const migratedLegacyTaskIds = new Set(
    unifiedWork
      .map((task:any) => String(task.taskMeta?.responsibilityArea || "").match(/legacy task\s+(.+)$/i)?.[1] || "")
      .filter(Boolean),
  );
  const merged = [...tasks.filter((task:any) => !migratedLegacyTaskIds.has(String(task.id || ""))), ...listTasks, ...unifiedWork].filter((task:any,index:number,all:any[]) =>
    task.id && all.findIndex((candidate:any) => String(candidate.id) === String(task.id)) === index
  );

  let marineAssets: Array<Record<string, any>> = [];
  let marineWorkOrders: Array<Record<string, any>> = [];
  let marineVisits: Array<Record<string, any>> = [];
  let landscapeWorkOrders: Array<Record<string, any>> = [];
  let landscapeVisits: Array<Record<string, any>> = [];
  let landscapeAreas: string[] = [];
  if (isSeanFieldEmployee(employee)) {
    const assetRows = await sql`
      SELECT id, name, category, location_id
      FROM atlas_assets
      WHERE property_id = ANY(${properties}::text[])
      ORDER BY name ASC
    `;
    marineAssets = (assetRows as any[])
      .filter((row:any) => marineRecordPattern.test(marineRecordText(row.name, row.category, row.location_id)))
      .map((row:any) => ({ id:String(row.id || ""), name:String(row.name || "Marine asset"), category:String(row.category || ""), locationId:String(row.location_id || "") }));

    const workRows = await sql`
      SELECT id, title, status, asset_id, location_id, assigned_to, work_type, work_category, responsibility_area
      FROM atlas_work_orders
      WHERE property_id = ANY(${properties}::text[])
      ORDER BY updated_at DESC
      LIMIT 100
    `;
    marineWorkOrders = (workRows as any[])
      .filter((row:any) => marineRecordPattern.test(marineRecordText(row.title, row.work_type, row.work_category, row.responsibility_area, row.assigned_to)))
      .map((row:any) => ({ id:String(row.id || ""), title:String(row.title || "Work order"), status:String(row.status || ""), assetId:String(row.asset_id || ""), locationId:String(row.location_id || "") }))
      .slice(0, 40);

    const visitRows = await sql`
      SELECT record
      FROM atlas_operational_records
      WHERE record_type='marine_visit_log'
        AND property_id = ANY(${properties}::text[])
      ORDER BY updated_at DESC
      LIMIT 30
    `;
    marineVisits = (visitRows as any[])
      .map((row:any) => row.record && typeof row.record === "object" ? row.record : {})
      .filter((visit:any) => String(visit.employeeId || "") === employee.id || /^sean(?:\s|$)/i.test(String(visit.employeeName || "")));
  }

  if (isPatFieldEmployee(employee)) {
    const workRows = await sql`
      SELECT id, title, status, asset_id, location_id, assigned_to, work_type, work_category, responsibility_area
      FROM atlas_work_orders
      WHERE property_id = ANY(${properties}::text[])
      ORDER BY updated_at DESC
      LIMIT 120
    `;
    landscapeWorkOrders = (workRows as any[])
      .filter((row:any) => landscapeRecordPattern.test(marineRecordText(row.title, row.work_type, row.work_category, row.responsibility_area, row.assigned_to)))
      .map((row:any) => ({ id:String(row.id || ""), title:String(row.title || "Work order"), status:String(row.status || ""), assetId:String(row.asset_id || ""), locationId:String(row.location_id || "") }))
      .slice(0, 50);

    landscapeAreas = Array.from(new Set(merged.map((task:any) => String(task.location || task.taskMeta?.location || "").trim()).filter(Boolean))).sort();

    const visitRows = await sql`
      SELECT record
      FROM atlas_operational_records
      WHERE record_type='landscape_visit_log'
        AND property_id = ANY(${properties}::text[])
      ORDER BY updated_at DESC
      LIMIT 40
    `;
    landscapeVisits = (visitRows as any[])
      .map((row:any) => row.record && typeof row.record === "object" ? row.record : {})
      .filter((visit:any) => String(visit.employeeId || "") === employee.id || /^(pat|patrick)(?:\s|$)/i.test(String(visit.employeeName || "")));
  }

  return { today, employeeId:employee.id, employeeName:employee.name, propertyIds:properties, tasks:merged, marineAssets, marineWorkOrders, marineVisits, landscapeWorkOrders, landscapeVisits, landscapeAreas };
}

async function patchFieldEmployeeTask(employee:{id:string;name:string;propertyIds:string[]}, taskId:string, patch:Record<string,unknown>) {
  const sql=getSql();
  const properties=employee.propertyIds.length?employee.propertyIds:["2000"];
  const rows=await sql`SELECT property_id, record FROM atlas_operational_records WHERE record_type='tasks' AND id=${taskId} AND property_id = ANY(${properties}::text[]) LIMIT 1`;
  const row=rows[0] as any;
  if(row) {
    const record={...(row.record||{}), id:taskId};
    if(!isAssignedToName(record, employee.name)) return false;
    const meta=addisonTaskMeta(record)||{}; const updatedAt=new Date().toISOString();
    const nextMeta={...meta,...patch,updatedAt}; const next={...record,...nextMeta,taskMeta:nextMeta,propertyId:String(row.property_id),updatedAt};
    await sql`UPDATE atlas_operational_records SET record=${JSON.stringify(next)}::jsonb, updated_at=NOW() WHERE record_type='tasks' AND property_id=${String(row.property_id)} AND id=${taskId}`;
    await upsertFieldEmployeeHistory(sql, employee, next, {
      source: "atlas-task",
      propertyId: String(row.property_id),
    });
    return true;
  }

  await ensureTeamWorkListsTableForField(sql);
  const listRows = await sql`SELECT id, record FROM atlas_team_work_lists ORDER BY updated_at DESC`;
  for (const listRow of listRows as any[]) {
    const list = listRow.record && typeof listRow.record === "object" ? { ...listRow.record } : {};
    const listProperties = Array.isArray(list.propertyIds) ? list.propertyIds.map(String) : ["2000"];
    if (!listProperties.some((propertyId:string) => properties.includes(propertyId))) continue;
    const sourceTasks = Array.isArray(list.tasks) ? list.tasks : [];
    const index = sourceTasks.findIndex((task:Record<string,any>) => String(task.id) === taskId && isTeamTaskAssignedToName(task, employee.name));
    if (index < 0) continue;
    const updatedAt = new Date().toISOString();
    const currentTask = sourceTasks[index] || {};
    const nextTask = { ...currentTask, ...patch, updatedAt };
    if (typeof patch.addisonNote === "string") nextTask.notes = patch.addisonNote;
    const nextTasks = [...sourceTasks];
    nextTasks[index] = nextTask;
    const nextList = { ...list, tasks: nextTasks };
    await sql`UPDATE atlas_team_work_lists SET record=${JSON.stringify(nextList)}::jsonb, updated_at=NOW() WHERE id=${String(listRow.id)}`;
    await upsertFieldEmployeeHistory(sql, employee, nextTask, {
      source: "team-work-list",
      propertyId: listProperties.find((propertyId:string) => properties.includes(propertyId)) || properties[0] || "2000",
      listId: String(list.id || listRow.id || ""),
      listName: String(list.name || ""),
    });
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const sql = getSql();
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (token === ADDISON_WORK_TOKEN) {
      const addison = await loadAddisonWork();
      return NextResponse.json({ ok: true, mode: "addison", addison });
    }
    if (token) {
      const employee = await resolveFieldEmployee(token);
      if (employee) return NextResponse.json({ ok:true, mode:"employee", employee:await loadFieldEmployeeWork(employee) }, { headers:{"Cache-Control":"no-store, max-age=0"} });
    }
    const weekId = url.searchParams.get("weekId");
    const weekStart = url.searchParams.get("weekStart") || getPacificWeekStartISO();

    if (token) {
      const tokenWeek = await loadWeekByToken(token);
      if (!tokenWeek) return NextResponse.json({ ok: false, error: "Landscape Help link not found." }, { status: 404 });
      return NextResponse.json({ ok: true, ...tokenWeek });
    }

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    if (url.searchParams.get("addison") === "1") {
      const addison = await loadAddisonWork();
      return NextResponse.json(
        { ok: true, mode: "addison", addison },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    if (weekId) {
      const selectedWeek = await loadWeekById(weekId);
      if (!selectedWeek) return NextResponse.json({ ok: false, error: "Landscape Help week not found." }, { status: 404 });

      const weeks = await sql`
        SELECT *
        FROM landscape_help_weeks
        ORDER BY week_start DESC
        LIMIT 20
      `;

      return NextResponse.json({
        ok: true,
        ...selectedWeek,
        weeks: weeks.map(normalizeWeek),
      });
    }

    const current = await ensureWeek(weekStart);
    const currentWeek = await loadWeekById(current.id);

    const weeks = await sql`
      SELECT *
      FROM landscape_help_weeks
      ORDER BY week_start DESC
      LIMIT 20
    `;

    return NextResponse.json({
      ok: true,
      ...currentWeek,
      weeks: weeks.map(normalizeWeek),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    const body = await request.json().catch(() => ({}));
    const weekStart = body.weekStart || getPacificWeekStartISO();

    const week = await ensureWeek(weekStart);
    const loaded = await loadWeekById(week.id);

    return NextResponse.json({ ok: true, ...loaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureSchema();

    const sql = getSql();
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token") || "";
    const body = await request.json();

    const bodyToken = typeof body.token === "string" ? body.token : "";
    const token = queryToken || bodyToken;
    const weekId = typeof body.weekId === "string" ? body.weekId : "";

    const fieldEmployee = token ? await resolveFieldEmployee(token) : null;
    if (fieldEmployee) {
      const action=String(body.action||"");
      if (action === "marine-visit-log") {
        try {
          await saveSeanMarineVisit(fieldEmployee, body as Record<string, any>);
          return NextResponse.json({ok:true,mode:"employee",employee:await loadFieldEmployeeWork(fieldEmployee)});
        } catch (error) {
          return NextResponse.json({ok:false,error:error instanceof Error ? error.message : "Could not save marine visit."},{status:400});
        }
      }
      if (action === "landscape-visit-log") {
        try {
          await savePatLandscapeVisit(fieldEmployee, body as Record<string, any>);
          return NextResponse.json({ok:true,mode:"employee",employee:await loadFieldEmployeeWork(fieldEmployee)});
        } catch (error) {
          return NextResponse.json({ok:false,error:error instanceof Error ? error.message : "Could not save landscaping visit."},{status:400});
        }
      }
      const taskId=String(body.taskId||"");
      if (!taskId) return NextResponse.json({ok:false,error:"Missing task."},{status:400});
      let patch:Record<string,unknown>={};
      if(action==="task-status") {
        const status=String(body.status||"Open");
        patch={status, completedAt: status==="Completed" ? new Date().toISOString() : undefined, lastCompletedDate: status==="Completed" ? pacificDateKey() : undefined};
      } else if(action==="task-note") patch={addisonNote:String(body.note||"")};
      else if(action==="task-photo") {
        const current=await loadFieldEmployeeWork(fieldEmployee); const task=current.tasks.find((t:any)=>String(t.id)===taskId); if(!task) return NextResponse.json({ok:false,error:"Task not found."},{status:404});
        const meta=addisonTaskMeta(task); patch={photos:[...(Array.isArray(meta?.photos)?meta.photos:[]),body.photo].filter(Boolean)};
      } else if(action==="task-flag") patch={needsNick:Boolean(body.needsNick)};
      else if(action==="task-problem") patch={problemFound:Boolean(body.problemFound)};
      else if(action==="task-nothing-needed") patch={checkedNothingNeeded:Boolean(body.value)};
      else return NextResponse.json({ok:false,error:"Unsupported employee action."},{status:400});
      const beforeUpdate = await loadFieldEmployeeWork(fieldEmployee);
      const alertTask = beforeUpdate.tasks.find((task:any)=>String(task.id)===taskId);
      const ok=sourceWorkOrderId(taskId)
        ? await patchUnifiedWorkForEmployee(fieldEmployee, taskId, action, body as Record<string, any>)
        : await patchFieldEmployeeTask(fieldEmployee,taskId,patch);
      if(!ok) return NextResponse.json({ok:false,error:"Assigned work not found."},{status:404});
      if (alertTask && action === "task-flag" && Boolean(body.needsNick)) {
        await upsertEmployeeAlertInboxItem(fieldEmployee, alertTask, "Needs Nick");
      }
      if (alertTask && action === "task-problem" && Boolean(body.problemFound)) {
        await upsertEmployeeAlertInboxItem(fieldEmployee, alertTask, "Problem Found");
      }
      return NextResponse.json({ok:true,mode:"employee",employee:await loadFieldEmployeeWork(fieldEmployee)});
    }

    if (token === ADDISON_WORK_TOKEN) {
      const action = String(body.action || "");
      const today = pacificDateKey();

      if (sourceWorkOrderId(body.taskId) && ["task-status", "task-note", "task-photo", "task-flag", "task-problem", "task-nothing-needed"].includes(action)) {
        const ok = await patchUnifiedWorkForEmployee(
          { id: "addison", name: "Addison", propertyIds: ["2000"] },
          String(body.taskId),
          action,
          body as Record<string, any>,
        );
        if (!ok) return NextResponse.json({ ok: false, error: "Assigned work not found." }, { status: 404 });
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "field-report") {
        const description = String(body.description || "").trim();
        if (!description) {
          return NextResponse.json(
            { ok: false, error: "Describe what you found." },
            { status: 400 },
          );
        }

        await ensureInboxTable();
        const locationId = String(body.locationId || "");
        const locationName = String(body.locationName || "General property");
        const canHandle = Boolean(body.canHandle);
        const files = Array.isArray(body.files) ? body.files : [];
        const firstLine =
          description.split(/\r?\n/).find((line) => line.trim())?.trim() ||
          "Field Report";
        const title =
          firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;

        const duplicates = await sql`
          SELECT id
          FROM atlas_inbox_items
          WHERE source = 'Addison Field Report'
            AND status <> 'Archived'
            AND LOWER(TRIM(notes)) = LOWER(TRIM(${description}))
            AND COALESCE(extracted_data->>'propertyId', '') = '2000'
            AND COALESCE(extracted_data->>'locationId', '') = ${locationId}
          LIMIT 1
        `;
        if (!duplicates[0]) {
          const id = `inbox-addison-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const extractedData = {
            propertyId: "2000",
            reportType: "Field Report",
            submittedBy: "Addison Hutton",
            canHandle,
            locationId,
            locationName,
            suggestedAction: "Create Task",
          };
          await sql`
            INSERT INTO atlas_inbox_items (
              id, title, intake_type, status, source, notes, pasted_text,
              files, target_type, target_id, target_name, proposed_action,
              extracted_data, created_at, updated_at
            )
            VALUES (
              ${id}, ${title}, 'Work Order Issue', 'Needs Review',
              'Addison Field Report', ${description}, '',
              ${JSON.stringify(files)}::jsonb,
              ${locationId ? "Location" : "General"}, ${locationId},
              ${locationName}, 'Attach to Existing',
              ${JSON.stringify(extractedData)}::jsonb, NOW(), NOW()
            )
          `;
        }

        return NextResponse.json({
          ok: true,
          mode: "addison",
          addison: await loadAddisonWork(),
        });
      }

      if (String(action || "").startsWith("routine-")) {
        return NextResponse.json(
          {
            ok: false,
            error: "Addison routines have been retired. Use Tasks with a frequency instead.",
          },
          { status: 410 },
        );
      }

      if (action === "task-create") {
        const title = String(body.title || "").trim();
        if (!title) {
          return NextResponse.json(
            { ok: false, error: "Task title is required." },
            { status: 400 },
          );
        }

        const dueDate = String(body.dueDate || today).slice(0, 10);
        const frequency = String(body.frequency || "One-time");
        const recurrence =
          frequency === "Daily"
            ? { recurring: true, interval: 1, unit: "Days" }
            : frequency === "Weekly"
              ? { recurring: true, interval: 1, unit: "Weeks" }
              : frequency === "Biweekly"
                ? { recurring: true, interval: 2, unit: "Weeks" }
                : frequency === "Monthly"
                  ? { recurring: true, interval: 1, unit: "Months" }
                  : { recurring: false, interval: 1, unit: "Weeks" };

        const locationId = String(body.locationId || "general") || "general";
        const preferredDay = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(String(body.preferredDay || ""))
          ? String(body.preferredDay)
          : "Auto";
        const currentWork = await loadAddisonWork();
        const duplicate = currentWork.tasks.find((task: any) => {
          const meta = addisonTaskMeta(task);
          const sameFrequency =
            (!recurrence.recurring && !task.recurring) ||
            (recurrence.recurring &&
              Boolean(task.recurring) &&
              Number(meta?.recurrenceInterval || 1) === recurrence.interval &&
              String(meta?.recurrenceUnit || "Weeks") === recurrence.unit);
          return (
            String(meta?.status || "") !== "Completed" &&
            String(task.title || "").trim().toLowerCase() === title.toLowerCase() &&
            String(meta?.dueDate || "").slice(0, 10) === dueDate &&
            String(task.locationId || "general") === locationId &&
            sameFrequency
          );
        });
        if (duplicate) {
          return NextResponse.json(
            { ok: false, error: "That Addison task already exists." },
            { status: 409 },
          );
        }

        const id = `task-addison-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const createdAt = new Date().toISOString();
        const instructions = String(body.instructions || "");
        const priority =
          body.priority === "High" || body.priority === "Low"
            ? String(body.priority)
            : "Medium";
        const minutes = Math.max(5, Number(body.minutes || 30));

        const taskMeta = {
          assignee: "Addison",
          dueDate,
          status: "Open",
          assignmentScope: recurrence.recurring
            ? "All future occurrences"
            : "This occurrence",
          recurrenceInterval: recurrence.interval,
          recurrenceUnit: recurrence.unit,
          recurrenceEndDate: "",
          completionHistory: [],
          lastCompletedDate: "",
          completedAt: undefined,
          needsReview: false,
          paused: false,
          instructions,
          notes: instructions,
          preferredDay,
          addisonOrder: 0,
          createdAt,
          updatedAt: createdAt,
        };
        const record = {
          id,
          title,
          minutes,
          priority,
          category: "General",
          locationId,
          preferredDay,
          locked: false,
          recurring: recurrence.recurring,
          fixedTime: "",
          notes: instructions,
          ...taskMeta,
          taskMeta,
          propertyId: "2000",
          updatedAt: createdAt,
        };
        const sql = getSql();
        await ensureAddisonBackingTables();
        await sql`
          INSERT INTO atlas_operational_records (
            record_type, id, property_id, record, updated_at
          )
          VALUES (
            'tasks', ${id}, '2000', ${JSON.stringify(record)}::jsonb, NOW()
          )
          ON CONFLICT (record_type, id)
          DO UPDATE SET
            property_id = EXCLUDED.property_id,
            record = EXCLUDED.record,
            updated_at = NOW()
        `;
        return NextResponse.json({
          ok: true,
          mode: "addison",
          addison: await loadAddisonWork(),
        });
      }

      if (action === "task-update") {
        const taskId = String(body.taskId || "");
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find(
          (task: any) => String(task.id) === taskId,
        );
        if (!currentTask) {
          return NextResponse.json(
            { ok: false, error: "Addison task not found." },
            { status: 404 },
          );
        }

        const currentMeta = addisonTaskMeta(currentTask);
        const title = String(body.title ?? currentTask.title ?? "").trim();
        if (!title) {
          return NextResponse.json(
            { ok: false, error: "Task title is required." },
            { status: 400 },
          );
        }

        const dueDate = String(
          body.dueDate ?? currentMeta?.dueDate ?? today,
        ).slice(0, 10);

        const currentFrequency = !currentTask.recurring
          ? "One-time"
          : Number(currentMeta?.recurrenceInterval || 1) === 2 &&
              String(currentMeta?.recurrenceUnit || "") === "Weeks"
            ? "Biweekly"
            : String(currentMeta?.recurrenceUnit || "") === "Days"
              ? "Daily"
              : String(currentMeta?.recurrenceUnit || "") === "Months"
                ? "Monthly"
                : "Weekly";

        const frequency = String(body.frequency || currentFrequency);
        const recurrence =
          frequency === "Daily"
            ? { recurring: true, interval: 1, unit: "Days" }
            : frequency === "Weekly"
              ? { recurring: true, interval: 1, unit: "Weeks" }
              : frequency === "Biweekly"
                ? { recurring: true, interval: 2, unit: "Weeks" }
                : frequency === "Monthly"
                  ? { recurring: true, interval: 1, unit: "Months" }
                  : { recurring: false, interval: 1, unit: "Weeks" };

        const instructions = String(
          body.instructions ??
            currentMeta?.instructions ??
            currentTask.notes ??
            "",
        );
        const locationId = String(
          body.locationId ?? currentTask.locationId ?? "general",
        ) || "general";
        const preferredDay = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(String(body.preferredDay || ""))
          ? String(body.preferredDay)
          : String(currentTask.preferredDay || currentMeta?.preferredDay || "Auto");
        const priority =
          body.priority === "High" ||
          body.priority === "Medium" ||
          body.priority === "Low"
            ? String(body.priority)
            : String(currentTask.priority || "Medium");
        const minutes = Math.max(
          5,
          Number(body.minutes ?? currentTask.minutes ?? 30),
        );

        const duplicate = currentWork.tasks.find((task: any) => {
          if (String(task.id || "") === taskId) return false;
          const meta = addisonTaskMeta(task);
          const sameFrequency =
            (!recurrence.recurring && !task.recurring) ||
            (recurrence.recurring &&
              Boolean(task.recurring) &&
              Number(meta?.recurrenceInterval || 1) === recurrence.interval &&
              String(meta?.recurrenceUnit || "Weeks") === recurrence.unit);
          return (
            String(meta?.status || "") !== "Completed" &&
            String(task.title || "").trim().toLowerCase() === title.toLowerCase() &&
            String(meta?.dueDate || "").slice(0, 10) === dueDate &&
            String(task.locationId || "general") === locationId &&
            sameFrequency
          );
        });
        if (duplicate) {
          return NextResponse.json(
            { ok: false, error: "That Addison task already exists." },
            { status: 409 },
          );
        }

        const patch: Record<string, unknown> = {
          dueDate,
          recurrenceInterval: recurrence.interval,
          recurrenceUnit: recurrence.unit,
          recurrenceEndDate: "",
          assignmentScope: recurrence.recurring
            ? "All future occurrences"
            : "This occurrence",
          instructions,
          notes: instructions,
          preferredDay,
        };

        const ok = await patchAddisonTask(taskId, patch);
        if (!ok) {
          return NextResponse.json(
            { ok: false, error: "Addison task not found." },
            { status: 404 },
          );
        }

        const sql = getSql();
        const rows = await sql`
          SELECT record
          FROM atlas_operational_records
          WHERE record_type = 'tasks'
            AND property_id = '2000'
            AND id = ${taskId}
          LIMIT 1
        `;
        if (rows[0]?.record) {
          const existing = rows[0].record;
          const existingMeta = addisonTaskMeta(existing) || {};
          const nextMeta = {
            ...existingMeta,
            ...patch,
            assignee: "Addison",
            updatedAt: new Date().toISOString(),
          };
          const nextRecord = {
            ...existing,
            title,
            recurring: recurrence.recurring,
            locationId,
            preferredDay,
            priority,
            minutes,
            notes: instructions,
            ...nextMeta,
            taskMeta: nextMeta,
            updatedAt: nextMeta.updatedAt,
          };
          await sql`
            UPDATE atlas_operational_records
            SET record = ${JSON.stringify(nextRecord)}::jsonb,
                updated_at = NOW()
            WHERE record_type = 'tasks'
              AND property_id = '2000'
              AND id = ${taskId}
          `;
        }

        return NextResponse.json({
          ok: true,
          mode: "addison",
          addison: await loadAddisonWork(),
        });
      }

      if (action === "task-pause") {
        const taskId = String(body.taskId || "");
        const paused = Boolean(body.paused);
        const ok = await patchAddisonTask(taskId, { paused, needsReview: false });
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-prioritize") {
        const orderedTaskIds = Array.isArray(body.orderedTaskIds)
          ? body.orderedTaskIds.map(String).filter(Boolean)
          : [];
        const currentWork = await loadAddisonWork();
        const validIds = new Set(currentWork.tasks.map((task: any) => String(task.id || "")));
        const cleanIds = orderedTaskIds.filter((id: string) => validIds.has(id));
        const sql = getSql();
        for (let index = 0; index < cleanIds.length; index += 1) {
          const taskId = cleanIds[index];
          const rows = await sql`
            SELECT record
            FROM atlas_operational_records
            WHERE record_type = 'tasks'
              AND property_id = '2000'
              AND id = ${taskId}
            LIMIT 1
          `;
          const existing = rows[0]?.record;
          if (!existing) continue;
          const meta = addisonTaskMeta(existing) || {};
          const updatedAt = new Date().toISOString();
          const nextMeta = { ...meta, assignee: "Addison", addisonOrder: index + 1, updatedAt };
          const nextRecord = { ...existing, ...nextMeta, taskMeta: nextMeta, updatedAt };
          await sql`
            UPDATE atlas_operational_records
            SET record = ${JSON.stringify(nextRecord)}::jsonb, updated_at = NOW()
            WHERE record_type = 'tasks' AND property_id = '2000' AND id = ${taskId}
          `;
        }
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-delete") {
        const taskId = String(body.taskId || "").trim();
        if (!taskId) {
          return NextResponse.json({ ok: false, error: "Missing Addison task id." }, { status: 400 });
        }

        const sql = getSql();
        const existingRows = await sql`
          SELECT record
          FROM atlas_operational_records
          WHERE record_type = 'tasks'
            AND property_id = '2000'
            AND id = ${taskId}
          LIMIT 1
        `;
        const existingRecord = existingRows[0]?.record || {};
        const deletedAt = new Date().toISOString();
        const tombstoneRecord = {
          taskId,
          title: String(existingRecord?.title || "Addison task"),
          deletedAt,
          deletedBy: "Atlas Admin",
        };

        // Persist the deletion independently from the task row. Atlas has multiple
        // task sync paths; this tombstone prevents an older browser snapshot from
        // recreating a task that Nick intentionally removed from Addison's master list.
        await sql`
          INSERT INTO atlas_operational_records (
            record_type, id, property_id, record, updated_at
          )
          VALUES (
            'addison_task_tombstone', ${taskId}, '2000',
            ${JSON.stringify(tombstoneRecord)}::jsonb, NOW()
          )
          ON CONFLICT (record_type, id)
          DO UPDATE SET
            property_id = EXCLUDED.property_id,
            record = EXCLUDED.record,
            updated_at = NOW()
        `;

        await sql`
          DELETE FROM atlas_operational_records
          WHERE record_type = 'tasks'
            AND property_id = '2000'
            AND id = ${taskId}
        `;

        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-status") {
        const taskId = String(body.taskId || "");
        const status = String(body.status || "Open");
        const completed = status === "Completed";
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => task.id === taskId);
        const currentMeta = currentTask ? addisonTaskMeta(currentTask) : {};
        const history = Array.isArray(currentMeta?.completionHistory)
          ? currentMeta.completionHistory.map(String)
          : [];
        const nextHistory = completed
          ? Array.from(new Set([...history, today])).sort()
          : history.filter((value: string) => value !== today);

        const recurring = Boolean(currentTask?.recurring);
        const completedAt = completed ? new Date().toISOString() : "";
        const ok = await patchAddisonTask(
          taskId,
          completed && recurring
            ? {
                // Keep the completed occurrence completed and visible. Store the next
                // due date separately; loadAddisonWork reopens it only when that date arrives.
                status: "Completed",
                completedAt,
                lastCompletedDate: today,
                completionHistory: nextHistory,
                nextDueDate: nextRecurringDate(
                  // Advance from today when a recurring task is completed late.
                  // Advancing from an overdue dueDate can produce a nextDueDate that
                  // is still today or in the past, which makes loadAddisonWork reopen
                  // the task immediately after refresh.
                  String(currentMeta?.dueDate || today).slice(0, 10) > today
                    ? String(currentMeta?.dueDate || today).slice(0, 10)
                    : today,
                  currentMeta?.recurrenceInterval,
                  currentMeta?.recurrenceUnit,
                ),
                needsReview: true,
              }
            : {
                status,
                completedAt: completed ? completedAt : undefined,
                lastCompletedDate: completed
                  ? today
                  : String(currentMeta?.lastCompletedDate || "").slice(0, 10) === today
                    ? ""
                    : currentMeta?.lastCompletedDate || "",
                completionHistory: nextHistory,
                nextDueDate: completed ? currentMeta?.nextDueDate || "" : "",
                needsReview: completed,
              },
        );
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });

        const sql = getSql();
        const historyId = `${today}::${taskId}`;
        if (completed && currentTask) {
          const locationId = String(currentTask.locationId || "general");
          const locationRows = await sql`
            SELECT record
            FROM atlas_operational_records
            WHERE record_type = 'locations'
              AND property_id = '2000'
              AND id = ${locationId}
            LIMIT 1
          `;
          const locationName = String(
            locationRows[0]?.record?.name ||
            locationRows[0]?.record?.title ||
            (locationId === "general" ? "General" : locationId),
          );
          const historyRecord = {
            id: historyId,
            taskId,
            title: String(currentTask.title || "Task"),
            date: today,
            completedAt,
            locationId,
            locationName,
            note: String(currentMeta?.addisonNote || ""),
            instructions: String(currentMeta?.instructions || currentTask.notes || ""),
            recurring,
            frequency: recurring
              ? `${Math.max(1, Number(currentMeta?.recurrenceInterval || 1))} ${String(currentMeta?.recurrenceUnit || "Weeks")}`
              : "One-time",
            photos: Array.isArray(currentMeta?.photos) ? currentMeta.photos : [],
          };
          await sql`
            INSERT INTO atlas_operational_records (
              record_type, id, property_id, record, updated_at
            )
            VALUES (
              'addison_completion_history', ${historyId}, '2000',
              ${JSON.stringify(historyRecord)}::jsonb, NOW()
            )
            ON CONFLICT (record_type, id)
            DO UPDATE SET
              property_id = EXCLUDED.property_id,
              record = EXCLUDED.record,
              updated_at = NOW()
          `;
        } else if (!completed) {
          await sql`
            DELETE FROM atlas_operational_records
            WHERE record_type = 'addison_completion_history'
              AND property_id = '2000'
              AND id = ${historyId}
          `;
        }

        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "daily-note") {
        const note = String(body.note || "");
        const sql = getSql();
        const updatedAt = new Date().toISOString();

        await sql`
          INSERT INTO atlas_operational_records (
            record_type, id, property_id, record, updated_at
          )
          VALUES (
            'addison_daily_note',
            ${today},
            '2000',
            ${JSON.stringify({ date: today, note, updatedAt })}::jsonb,
            NOW()
          )
          ON CONFLICT (record_type, id)
          DO UPDATE SET
            property_id = EXCLUDED.property_id,
            record = EXCLUDED.record,
            updated_at = NOW()
        `;

        await sql`
          UPDATE atlas_operational_records
          SET record = ${JSON.stringify({ date: today, note, updatedAt })}::jsonb,
              updated_at = NOW()
          WHERE record_type = 'addison_daily_note'
            AND property_id = '2000'
            AND id = ${today}
        `;

        return NextResponse.json({
          ok: true,
          mode: "addison",
          addison: await loadAddisonWork(),
        });
      }

      if (action === "task-note") {
        const taskId = String(body.taskId || "");
        const note = String(body.note || "");
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => String(task.id || "") === taskId);
        const currentMeta = currentTask ? addisonTaskMeta(currentTask) : {};
        const previousNote = String(currentMeta?.addisonNote || "");
        const updatedAt = new Date().toISOString();
        const ok = await patchAddisonTask(taskId, { addisonNote: note, addisonNoteUpdatedAt: updatedAt });
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });

        if (note.trim() && note.trim() !== previousNote.trim()) {
          const sql = getSql();
          const noteId = `${taskId}::${Date.now()}::${Math.random().toString(36).slice(2, 7)}`;
          const noteRecord = {
            id: noteId,
            taskId,
            taskTitle: String(currentTask?.title || "Task"),
            date: today,
            note,
            updatedAt,
          };
          await sql`
            INSERT INTO atlas_operational_records (
              record_type, id, property_id, record, updated_at
            )
            VALUES (
              'addison_note_history', ${noteId}, '2000',
              ${JSON.stringify(noteRecord)}::jsonb, NOW()
            )
          `;
        }

        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-photo") {
        const taskId = String(body.taskId || "");
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => String(task.id) === taskId);
        if (!currentTask) return NextResponse.json({ ok:false, error:"Addison task not found." }, { status:404 });
        const meta = addisonTaskMeta(currentTask);
        const photos = Array.isArray(meta?.photos) ? meta.photos : [];
        const nextPhotos = [...photos, body.photo].filter(Boolean);
        const ok = await patchAddisonTask(taskId, { photos: nextPhotos });
        if (!ok) return NextResponse.json({ ok:false, error:"Addison task not found." }, { status:404 });

        const historyId = `${today}::${taskId}`;
        const sql = getSql();
        const historyRows = await sql`
          SELECT record
          FROM atlas_operational_records
          WHERE record_type = 'addison_completion_history'
            AND property_id = '2000'
            AND id = ${historyId}
          LIMIT 1
        `;
        if (historyRows[0]?.record) {
          const historyRecord = { ...historyRows[0].record, photos: nextPhotos };
          await sql`
            UPDATE atlas_operational_records
            SET record = ${JSON.stringify(historyRecord)}::jsonb, updated_at = NOW()
            WHERE record_type = 'addison_completion_history'
              AND property_id = '2000'
              AND id = ${historyId}
          `;
        }

        return NextResponse.json({ ok:true, mode:"addison", addison:await loadAddisonWork() });
      }

      if (action === "task-flag" || action === "task-problem" || action === "task-nothing-needed") {
        const taskId = String(body.taskId || "");
        const patch =
          action === "task-flag" ? { needsNick: Boolean(body.needsNick) } :
          action === "task-problem" ? { problemFound: Boolean(body.problemFound) } :
          { checkedNothingNeeded: Boolean(body.value) };
        const ok = await patchAddisonTask(taskId, patch);
        if (!ok) return NextResponse.json({ ok:false, error:"Addison task not found." }, { status:404 });
        return NextResponse.json({ ok:true, mode:"addison", addison:await loadAddisonWork() });
      }

      return NextResponse.json({ ok: false, error: "Unsupported Addison action." }, { status: 400 });
    }

    const isPublicCrewUpdate = Boolean(token);

    if (!isPublicCrewUpdate) {
      const blocked = adminBlockResponse(request);
      if (blocked) return blocked;
    }

    let targetWeekId = weekId;

    if (token) {
      const tokenRows = await sql`
        SELECT id
        FROM landscape_help_weeks
        WHERE share_token = ${token}
        LIMIT 1
      `;

      if (!tokenRows[0]) return NextResponse.json({ ok: false, error: "Landscape Help link not found." }, { status: 404 });
      targetWeekId = tokenRows[0].id;
    }

    if (!targetWeekId) return NextResponse.json({ ok: false, error: "Missing week id." }, { status: 400 });

    const status = safeStatus(body.status);
    const crewName = typeof body.crewName === "string" ? body.crewName : "";
    const managerNotes = typeof body.managerNotes === "string" ? body.managerNotes : "";
    const crewNotes = typeof body.crewNotes === "string" ? body.crewNotes : "";

    await sql`
      UPDATE landscape_help_weeks
      SET
        status = ${status},
        crew_name = ${crewName},
        manager_notes = CASE WHEN ${isPublicCrewUpdate} THEN manager_notes ELSE ${managerNotes} END,
        crew_notes = ${crewNotes},
        completed_at = CASE WHEN ${status} = 'Complete' THEN COALESCE(completed_at, now()) ELSE NULL END,
        updated_at = now()
      WHERE id = ${targetWeekId}
    `;

    const items = Array.isArray(body.items) ? (body.items as LandscapeHelpItemInput[]) : [];

    for (const item of items) {
      if (!item.id) continue;

      await sql`
        UPDATE landscape_help_items
        SET
          is_done = ${Boolean(item.isDone)},
          notes = ${typeof item.notes === "string" ? item.notes : ""},
          updated_by = ${typeof item.updatedBy === "string" ? item.updatedBy : ""},
          updated_at = now()
        WHERE id = ${item.id}
        AND week_id = ${targetWeekId}
      `;
    }

    const loaded = await loadWeekById(targetWeekId);
    return NextResponse.json({ ok: true, ...loaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
