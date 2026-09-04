import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROPERTY_ID = "2000";
const UNIFIED_WORK_PREFIX = "work-order:";

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function cleanString(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
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

function isAddisonValue(value: unknown) {
  const assigned = String(value || "").trim().toLowerCase();
  return assigned === "addison" || assigned === "addison hutton" || assigned.startsWith("addison ");
}

function taskMeta(task: Record<string, any>) {
  return task?.taskMeta && typeof task.taskMeta === "object" ? task.taskMeta : task;
}

function isAddisonTask(task: Record<string, any>) {
  const meta = taskMeta(task);
  return isAddisonValue(
    meta?.assignee ||
      meta?.assignedTo ||
      meta?.assigned_to ||
      task?.assignee ||
      task?.assignedTo ||
      task?.assigned_to,
  );
}

function legacyWorkId(taskId: string) {
  const safe = taskId
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return `addison-legacy-${safe || taskId}`;
}

async function ensureColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_work_orders ALTER COLUMN asset_id DROP NOT NULL`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_value date`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_initialized boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'Year-Round'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS completion_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS last_completed_date date`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT 'Work Order'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS work_category text NOT NULL DEFAULT 'Maintenance'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS responsibility_area text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS assigned_to text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS notes_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS service_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb`;
}

async function syncAddisonWork() {
  const sql = getSql();
  await ensureColumns(sql);

  const today = pacificDateKey();
  const rows = await sql`
    SELECT id, record
    FROM atlas_operational_records
    WHERE record_type = 'tasks'
      AND property_id = ${PROPERTY_ID}
    ORDER BY updated_at DESC
  `;

  let migrated = 0;
  let alreadyUnified = 0;
  let ignored = 0;

  for (const row of rows as Array<{ id?: unknown; record?: Record<string, any> }>) {
    const taskId = cleanString(row.id || row.record?.id, 180);
    if (!taskId) continue;

    const task = { ...(row.record || {}), id: taskId } as Record<string, any>;
    if (!isAddisonTask(task)) continue;

    const meta = taskMeta(task);
    if (Boolean(meta?.paused)) {
      ignored += 1;
      continue;
    }

    const status = cleanString(meta?.status || task?.status || "Open", 40);
    const completionHistory = Array.isArray(meta?.completionHistory)
      ? meta.completionHistory.map(String)
      : [];
    const lastCompletedDate = cleanString(
      meta?.lastCompletedDate || meta?.completedAt || "",
      32,
    ).slice(0, 10);
    const completedToday =
      status === "Completed" &&
      (completionHistory.includes(today) ||
        lastCompletedDate === today ||
        cleanString(meta?.completedAt || "", 32).slice(0, 10) === today);

    if (status === "Completed" && !completedToday) {
      ignored += 1;
      continue;
    }

    const existingLegacyRows = await sql`
      SELECT id
      FROM atlas_work_orders
      WHERE property_id = ${PROPERTY_ID}
        AND responsibility_area = ${`Legacy task ${taskId}`}
      LIMIT 1
    `;
    if (existingLegacyRows.length) {
      alreadyUnified += 1;
      continue;
    }

    let id = legacyWorkId(taskId);
    if (taskId.startsWith(UNIFIED_WORK_PREFIX)) {
      const referencedId = cleanString(taskId.slice(UNIFIED_WORK_PREFIX.length), 180);
      if (referencedId) {
        const referencedRows = await sql`
          SELECT id, assigned_to
          FROM atlas_work_orders
          WHERE id = ${referencedId}
            AND property_id = ${PROPERTY_ID}
          LIMIT 1
        `;
        const referenced = referencedRows[0] as { assigned_to?: unknown } | undefined;
        if (referenced && isAddisonValue(referenced.assigned_to)) {
          alreadyUnified += 1;
          continue;
        }
        id = referenced ? legacyWorkId(taskId) : referencedId;
      }
    }

    const recurring = Boolean(task?.recurring || meta?.recurring);
    const dueDate =
      cleanString(
        completedToday && recurring
          ? meta?.nextDueDate || meta?.dueDate || task?.dueDate || today
          : meta?.dueDate || task?.dueDate || today,
        10,
      ).slice(0, 10) || today;
    const title = cleanString(task?.title || meta?.title || "Addison work", 160) || "Addison work";
    const notes = cleanString(meta?.instructions || meta?.notes || task?.notes || "", 3000);
    const category = cleanString(task?.category || meta?.category || "Maintenance", 80) || "Maintenance";
    const priority = ["High", "Medium", "Low"].includes(String(task?.priority || meta?.priority || ""))
      ? String(task?.priority || meta?.priority)
      : "Medium";
    const recurrenceInterval = Math.max(1, Number(meta?.recurrenceInterval || 1));
    const recurrenceUnit = ["Days", "Weeks", "Months", "Years"].includes(String(meta?.recurrenceUnit || ""))
      ? String(meta?.recurrenceUnit)
      : "Weeks";
    const serviceHistory = Array.isArray(meta?.serviceHistory) ? meta.serviceHistory : [];
    const photos = Array.isArray(meta?.photos) ? meta.photos : [];
    const checklist = Array.isArray(meta?.checklist) ? meta.checklist : [];

    await sql`
      INSERT INTO atlas_work_orders (
        id, asset_id, date, due_date_value, due_date_initialized, title, status,
        notes, priority, recurring, recurrence_interval, recurrence_unit, season,
        completion_history, last_completed_date, work_type, work_category,
        responsibility_area, assigned_to, checklist, notes_history,
        service_history, photos, documents, property_id
      ) VALUES (
        ${id}, NULL, ${dueDate}::date, ${dueDate}::date, true, ${title},
        ${completedToday ? (recurring ? "Scheduled" : "Completed") : "Open"},
        ${notes}, ${priority}, ${recurring}, ${recurrenceInterval}, ${recurrenceUnit},
        'Year-Round', ${JSON.stringify(completionHistory)}::jsonb,
        ${completedToday ? today : lastCompletedDate || null}::date,
        'Work Order', ${category}, ${`Legacy task ${taskId}`}, 'Addison',
        ${JSON.stringify(checklist)}::jsonb, '[]'::jsonb,
        ${JSON.stringify(serviceHistory)}::jsonb, ${JSON.stringify(photos)}::jsonb,
        '[]'::jsonb, ${PROPERTY_ID}
      )
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        due_date_value = EXCLUDED.due_date_value,
        due_date_initialized = true,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        priority = EXCLUDED.priority,
        recurring = EXCLUDED.recurring,
        recurrence_interval = EXCLUDED.recurrence_interval,
        recurrence_unit = EXCLUDED.recurrence_unit,
        completion_history = EXCLUDED.completion_history,
        last_completed_date = EXCLUDED.last_completed_date,
        work_category = EXCLUDED.work_category,
        responsibility_area = EXCLUDED.responsibility_area,
        assigned_to = 'Addison',
        checklist = EXCLUDED.checklist,
        service_history = EXCLUDED.service_history,
        photos = EXCLUDED.photos,
        property_id = ${PROPERTY_ID},
        updated_at = NOW()
    `;
    migrated += 1;
  }

  return { migrated, alreadyUnified, ignored };
}

export async function GET(request: NextRequest) {
  try {
    const result = await syncAddisonWork();
    const returnTo = cleanString(request.nextUrl.searchParams.get("returnTo"), 1000);

    if (returnTo.startsWith("/")) {
      const response = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
      response.cookies.set("atlas_addison_sync", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 5,
      });
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Atlas Addison sync failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not sync Addison work." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
