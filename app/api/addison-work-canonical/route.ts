import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROPERTY_ID = "2000";
const ADDISON_WORK_TOKEN =
  process.env.ADDISON_WORK_TOKEN ||
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";
  if (!connectionString) throw new Error("Atlas database is not connected.");
  return neon(connectionString);
}

function pacificDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

function sqlDateKey(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function isAddison(value: unknown) {
  const assigned = String(value || "").trim().toLowerCase();
  return assigned === "addison" || assigned === "addison hutton" || assigned.startsWith("addison ");
}

function sourceWorkOrderId(taskId: unknown) {
  const value = String(taskId || "");
  return value.startsWith("work-order:") ? value.slice("work-order:".length) : "";
}

function nextRecurringDate(dateKey: string, intervalValue: unknown, unitValue: unknown) {
  const interval = Math.max(1, Number(intervalValue || 1));
  const unit = String(unitValue || "Weeks");
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  if (unit === "Days") date.setDate(date.getDate() + interval);
  else if (unit === "Months") date.setMonth(date.getMonth() + interval);
  else if (unit === "Years") date.setFullYear(date.getFullYear() + interval);
  else date.setDate(date.getDate() + interval * 7);
  return date.toISOString().slice(0, 10);
}

function authorizedToken(request: NextRequest, bodyToken = "") {
  const queryToken = request.nextUrl.searchParams.get("token")?.trim() || "";
  return queryToken || bodyToken.trim();
}

async function loadAddisonData() {
  const sql = getSql();
  const today = pacificDateKey();
  const rows = await sql`
    SELECT id, property_id, title, status, priority, notes, recurring,
      recurrence_interval, recurrence_unit, last_completed_date,
      completion_history, service_history, due_date_value, date, work_type,
      work_category, responsibility_area, assigned_to, location_id, photos,
      checklist, updated_at
    FROM atlas_work_orders
    WHERE property_id = ${PROPERTY_ID}
    ORDER BY COALESCE(due_date_value, date) ASC, updated_at DESC
  `;

  const tasks = (rows as Array<Record<string, any>>)
    .filter((row) => isAddison(row.assigned_to))
    .map((row) => {
      const dueDate = sqlDateKey(row.due_date_value || row.date || today) || today;
      const lastCompletedDate = row.last_completed_date
        ? sqlDateKey(row.last_completed_date)
        : "";
      const completionHistory = Array.isArray(row.completion_history)
        ? row.completion_history.map((value: unknown) => sqlDateKey(value)).filter(Boolean)
        : [];
      const serviceHistory = Array.isArray(row.service_history)
        ? row.service_history
        : [];
      const completedToday =
        lastCompletedDate === today ||
        completionHistory.includes(today) ||
        serviceHistory.some(
          (entry: any) => String(entry?.completedAt || "").slice(0, 10) === today,
        );
      const notes = String(row.notes || "");

      return {
        id: `work-order:${String(row.id || "")}`,
        source: "unified-work",
        sourceWorkOrderId: String(row.id || ""),
        propertyId: String(row.property_id || PROPERTY_ID),
        title: String(row.title || "Work"),
        category: String(row.work_category || "Work"),
        locationId: String(row.location_id || ""),
        recurring: Boolean(row.recurring),
        priority: String(row.priority || "Medium"),
        notes,
        taskMeta: {
          status: completedToday ? "Completed" : String(row.status || "Open"),
          assignee: String(row.assigned_to || "Addison"),
          assignedTo: String(row.assigned_to || "Addison"),
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
    });

  return { today, tasks };
}

export async function GET(request: NextRequest) {
  try {
    const token = authorizedToken(request);
    if (token !== ADDISON_WORK_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Addison access is not authorized." },
        { status: 401 },
      );
    }

    const addison = await loadAddisonData();
    return NextResponse.json(
      { ok: true, mode: "addison", addison },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Addison canonical work read failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not load Addison work." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const token = authorizedToken(request, typeof body.token === "string" ? body.token : "");
    if (token !== ADDISON_WORK_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Addison access is not authorized." },
        { status: 401 },
      );
    }

    const action = String(body.action || "");
    const id = sourceWorkOrderId(body.taskId);
    if (!id) {
      return NextResponse.json({ ok: false, error: "Addison work item was not found." }, { status: 404 });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, property_id, title, status, priority, notes, recurring,
        recurrence_interval, recurrence_unit, last_completed_date,
        completion_history, service_history, due_date_value, date, work_type,
        work_category, responsibility_area, assigned_to, location_id, photos,
        checklist, updated_at
      FROM atlas_work_orders
      WHERE id = ${id} AND property_id = ${PROPERTY_ID}
      LIMIT 1
    `;
    const row = rows[0] as Record<string, any> | undefined;
    if (!row || !isAddison(row.assigned_to)) {
      return NextResponse.json({ ok: false, error: "Addison work item was not found." }, { status: 404 });
    }

    const today = pacificDateKey();
    const requestedCompletedDate = sqlDateKey(body.completedDate) || today;
    const completedDate = requestedCompletedDate > today ? today : requestedCompletedDate;
    let status = String(row.status || "Open");
    let dueDate = sqlDateKey(row.due_date_value || row.date || today) || today;
    let lastCompletedDate = row.last_completed_date ? sqlDateKey(row.last_completed_date) : "";
    let history = Array.isArray(row.completion_history)
      ? row.completion_history.map((value: unknown) => sqlDateKey(value)).filter(Boolean)
      : [];
    let serviceHistory = Array.isArray(row.service_history) ? [...row.service_history] : [];
    let notes = String(row.notes || "");
    let photos = Array.isArray(row.photos) ? [...row.photos] : [];

    if (action === "task-status") {
      const completed = String(body.status || "Open") === "Completed";
      if (completed) {
        history = Array.from(new Set([...history, completedDate])).sort();
        lastCompletedDate = completedDate;
        if (!serviceHistory.some((entry: any) => String(entry?.completedAt || "").slice(0, 10) === completedDate)) {
          serviceHistory.push({
            id: `field-${id}-${completedDate}`,
            completedAt: `${completedDate}T12:00:00-07:00`,
            completedBy: "Addison",
            notes,
            dueDate,
          });
        }
        if (Boolean(row.recurring)) {
          const recurrenceBase = dueDate > completedDate ? dueDate : completedDate;
          dueDate = nextRecurringDate(recurrenceBase, row.recurrence_interval, row.recurrence_unit);
          status = "Scheduled";
        } else {
          status = "Completed";
        }
      } else {
        const removeDate = sqlDateKey(body.completedDate) || lastCompletedDate || today;
        status = String(body.status || "Open");
        history = history.filter((value: string) => value !== removeDate);
        serviceHistory = serviceHistory.filter(
          (entry: any) => String(entry?.completedAt || "").slice(0, 10) !== removeDate,
        );
        if (lastCompletedDate === removeDate) lastCompletedDate = "";
      }
    } else if (action === "task-note") {
      notes = String(body.note || "");
    } else if (action === "task-photo") {
      if (body.photo) photos.push(body.photo);
    } else if (action === "task-flag") {
      if (Boolean(body.needsNick)) {
        notes = `${notes}${notes ? "\n\n" : ""}NEEDS NICK: Flagged by Addison on ${today}.`;
      }
    } else if (action === "task-problem") {
      if (Boolean(body.problemFound)) {
        notes = `${notes}${notes ? "\n\n" : ""}PROBLEM FOUND: Reported by Addison on ${today}.`;
        status = "Waiting";
      }
    } else if (action !== "task-nothing-needed") {
      return NextResponse.json({ ok: false, error: "Unsupported Addison work action." }, { status: 400 });
    }

    await sql`
      UPDATE atlas_work_orders SET
        status = ${status},
        notes = ${notes},
        due_date_value = ${dueDate}::date,
        due_date_initialized = true,
        last_completed_date = ${lastCompletedDate || null}::date,
        completion_history = ${JSON.stringify(history)}::jsonb,
        service_history = ${JSON.stringify(serviceHistory)}::jsonb,
        photos = ${JSON.stringify(photos)}::jsonb,
        updated_at = NOW()
      WHERE id = ${id} AND property_id = ${PROPERTY_ID}
    `;

    const addison = await loadAddisonData();
    return NextResponse.json(
      { ok: true, mode: "addison", addison },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Addison canonical work update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not save Addison work." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
