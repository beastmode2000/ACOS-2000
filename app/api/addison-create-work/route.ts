import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROPERTY_ID = "2000";
const ADDISON_WORK_TOKEN =
  process.env.ADDISON_WORK_TOKEN ||
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  );
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

function safeRequestId(value: unknown) {
  const cleaned = cleanString(value, 120).replace(/[^a-zA-Z0-9_-]+/g, "-");
  return cleaned || randomUUID();
}

async function ensureWorkOrderColumns(sql: ReturnType<typeof neon>) {
  await sql`
    ALTER TABLE atlas_work_orders
    ALTER COLUMN asset_id DROP NOT NULL
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS due_date_value date
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS due_date_initialized boolean NOT NULL DEFAULT false
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium'
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'Year-Round'
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS completion_history jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT 'Work Order'
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS work_category text NOT NULL DEFAULT 'Maintenance'
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS responsibility_area text
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS assigned_to text
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS notes_history jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS service_history jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
}


function isAddisonAssignedTask(record: Record<string, any>) {
  const meta =
    record?.taskMeta && typeof record.taskMeta === "object"
      ? record.taskMeta
      : record;
  const assigned = String(
    meta?.assignee ||
      meta?.assignedTo ||
      meta?.assigned_to ||
      record?.assignee ||
      record?.assignedTo ||
      record?.assigned_to ||
      "",
  )
    .trim()
    .toLowerCase();

  return (
    assigned === "addison" ||
    assigned === "addison hutton" ||
    assigned.startsWith("addison ")
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

async function syncLegacyAddisonTasksToWorkOrders(
  sql: ReturnType<typeof neon>,
) {
  await ensureWorkOrderColumns(sql);

  const today = pacificDateKey();
  const rows = await sql`
    SELECT id, record
    FROM atlas_operational_records
    WHERE record_type = 'tasks'
      AND property_id = ${PROPERTY_ID}
    ORDER BY updated_at DESC
  `;

  let migrated = 0;

  for (const row of rows as Array<{ id?: unknown; record?: Record<string, any> }>) {
    const taskId = cleanString(row.id || row.record?.id, 160);
    if (!taskId || taskId.startsWith("work-order:")) continue;

    const task = {
      ...(row.record || {}),
      id: taskId,
    } as Record<string, any>;

    if (!isAddisonAssignedTask(task)) continue;

    const meta =
      task?.taskMeta && typeof task.taskMeta === "object"
        ? task.taskMeta
        : task;
    const status = cleanString(meta?.status || task?.status || "Open", 40);
    if (Boolean(meta?.paused)) continue;

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

    // Older completed occurrences still need to be promoted when they were
    // completed today so Nick's dashboard history matches Addison's phone.
    if (status === "Completed" && !completedToday) continue;

    const recurring = Boolean(task?.recurring || meta?.recurring);
    const dueDate =
      cleanString(
        completedToday && recurring
          ? meta?.nextDueDate || meta?.dueDate || task?.dueDate || today
          : meta?.dueDate || task?.dueDate || today,
        10,
      ).slice(0, 10) || today;
    if (dueDate > today && !completedToday) continue;

    const id = legacyWorkId(taskId);
    const title =
      cleanString(task?.title || meta?.title || "Addison work", 160) ||
      "Addison work";
    const notes = cleanString(
      meta?.instructions || meta?.notes || task?.notes || "",
      3000,
    );
    const category =
      cleanString(task?.category || meta?.category || "Maintenance", 80) ||
      "Maintenance";
    const priority = ["High", "Medium", "Low"].includes(
      String(task?.priority || meta?.priority || ""),
    )
      ? String(task?.priority || meta?.priority)
      : "Medium";
    const recurrenceInterval = Math.max(
      1,
      Number(meta?.recurrenceInterval || 1),
    );
    const recurrenceUnit = ["Days", "Weeks", "Months", "Years"].includes(
      String(meta?.recurrenceUnit || ""),
    )
      ? String(meta?.recurrenceUnit)
      : "Weeks";
    const serviceHistory = Array.isArray(meta?.serviceHistory)
      ? meta.serviceHistory
      : [];
    const photos = Array.isArray(meta?.photos) ? meta.photos : [];
    const checklist = Array.isArray(meta?.checklist) ? meta.checklist : [];

    const result = await sql`
      INSERT INTO atlas_work_orders (
        id,
        asset_id,
        date,
        due_date_value,
        due_date_initialized,
        title,
        status,
        notes,
        priority,
        recurring,
        recurrence_interval,
        recurrence_unit,
        season,
        completion_history,
        last_completed_date,
        work_type,
        work_category,
        responsibility_area,
        assigned_to,
        checklist,
        notes_history,
        service_history,
        photos,
        documents,
        property_id
      )
      VALUES (
        ${id},
        NULL,
        ${dueDate}::date,
        ${dueDate}::date,
        true,
        ${title},
        ${completedToday ? (recurring ? "Scheduled" : "Completed") : "Open"},
        ${notes},
        ${priority},
        ${recurring},
        ${recurrenceInterval},
        ${recurrenceUnit},
        'Year-Round',
        ${JSON.stringify(completionHistory)}::jsonb,
        ${completedToday ? today : lastCompletedDate || null}::date,
        'Work Order',
        ${category},
        ${`Legacy task ${taskId}`},
        'Addison',
        ${JSON.stringify(checklist)}::jsonb,
        '[]'::jsonb,
        ${JSON.stringify(serviceHistory)}::jsonb,
        ${JSON.stringify(photos)}::jsonb,
        '[]'::jsonb,
        ${PROPERTY_ID}
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
      RETURNING id
    `;

    if (Array.isArray(result) && result.length > 0) migrated += 1;
  }

  return migrated;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = cleanString(url.searchParams.get("token"), 256);
    if (!token || token !== ADDISON_WORK_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Addison access is not authorized." },
        { status: 401 },
      );
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Atlas database is not connected." },
        { status: 503 },
      );
    }

    const sql = neon(databaseUrl);
    const migrated = await syncLegacyAddisonTasksToWorkOrders(sql);

    return NextResponse.json(
      { ok: true, migrated },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Addison legacy work sync failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not sync Addison work." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const token = cleanString(body.token, 256);
    if (!token || token !== ADDISON_WORK_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Addison access is not authorized." },
        { status: 401 },
      );
    }

    const title = cleanString(body.title, 160);
    const category = cleanString(body.category, 80);
    const notes = cleanString(body.notes, 3000);

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Add a title first." },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Add a category first." },
        { status: 400 },
      );
    }

    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Atlas database is not connected." },
        { status: 503 },
      );
    }

    const sql = neon(databaseUrl);
    await ensureWorkOrderColumns(sql);

    const today = pacificDateKey();
    const clientRequestId = safeRequestId(body.clientRequestId);
    const id = `addison-self-${clientRequestId}`;

    await sql`
      INSERT INTO atlas_work_orders (
        id,
        asset_id,
        date,
        due_date_value,
        due_date_initialized,
        title,
        status,
        notes,
        priority,
        recurring,
        recurrence_interval,
        recurrence_unit,
        season,
        completion_history,
        work_type,
        work_category,
        responsibility_area,
        assigned_to,
        checklist,
        notes_history,
        service_history,
        photos,
        documents,
        property_id
      )
      VALUES (
        ${id},
        NULL,
        ${today}::date,
        ${today}::date,
        true,
        ${title},
        'Open',
        ${notes},
        'Medium',
        false,
        1,
        'Weeks',
        'Year-Round',
        '[]'::jsonb,
        'Work Order',
        ${category},
        'Addison self-added',
        'Addison',
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        ${PROPERTY_ID}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        notes = EXCLUDED.notes,
        work_category = EXCLUDED.work_category,
        assigned_to = 'Addison',
        property_id = ${PROPERTY_ID},
        updated_at = NOW()
    `;

    // Clean up a same-id record created by the prior quick-add implementation.
    // This does not touch any other Addison work or operational records.
    await sql`
      DELETE FROM atlas_operational_records
      WHERE record_type = 'tasks'
        AND property_id = ${PROPERTY_ID}
        AND id = ${id}
    `;

    // Keep older Addison task records visible to the manager dashboard by
    // promoting active due work into the unified work-order table.
    await syncLegacyAddisonTasksToWorkOrders(sql);

    return NextResponse.json({
      ok: true,
      task: {
        id,
        propertyId: PROPERTY_ID,
        title,
        category,
        notes,
        status: "Open",
        assignee: "Addison",
        dueDate: today,
      },
    });
  } catch (error) {
    console.error("Addison create work failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not add that work." },
      { status: 500 },
    );
  }
}
