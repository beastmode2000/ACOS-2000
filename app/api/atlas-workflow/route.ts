import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type WorkAction =
  | "rollover"
  | "carry-tomorrow"
  | "skip"
  | "didnt-week"
  | "move-date"
  | "blocked"
  | "reopen";

type WorkRow = {
  id: string;
  title?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  date?: string | null;
  due_date_value?: string | null;
  recurring?: boolean | null;
  recurrence_interval?: number | null;
  recurrence_unit?: string | null;
  updated_at?: string | null;
};

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";

  if (!connectionString) throw new Error("Atlas database is not connected.");
  return neon(connectionString);
}

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function dateKey(value: unknown) {
  const text = cleanText(value, 32);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function addMonths(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + amount);
  return parsed.toISOString().slice(0, 10);
}

function addYears(date: string, amount: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCFullYear(parsed.getUTCFullYear() + amount);
  return parsed.toISOString().slice(0, 10);
}

function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function weekStart(date: string) {
  const day = weekday(date);
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

function weekEnd(date: string) {
  return addDays(weekStart(date), 6);
}

function nextMonday(date: string) {
  let candidate = addDays(date, 1);
  for (let index = 0; index < 8; index += 1) {
    if (weekday(candidate) === 1) return candidate;
    candidate = addDays(candidate, 1);
  }
  return addDays(date, 7);
}

function recurrenceDate(row: WorkRow, fromDate: string) {
  const interval = Math.max(1, Math.floor(Number(row.recurrence_interval || 1)));
  const unit = cleanText(row.recurrence_unit, 40).toLowerCase();
  if (unit.startsWith("day")) return addDays(fromDate, interval);
  if (unit.startsWith("month")) return addMonths(fromDate, interval);
  if (unit.startsWith("year")) return addYears(fromDate, interval);
  return addDays(fromDate, interval * 7);
}

function safeJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function historyText(label: string, fromDate: string, toDate: string, note: string, hasPhoto: boolean) {
  const pieces = [label];
  if (fromDate && toDate && fromDate !== toDate) pieces.push(`${fromDate} → ${toDate}`);
  if (note) pieces.push(note);
  if (hasPhoto) pieces.push("Photo attached");
  return pieces.join(" — ");
}

async function ensureColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_value date`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS notes_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'`;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_day_offs (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      off_date date NOT NULL,
      kind text NOT NULL DEFAULT 'Off',
      scope text NOT NULL DEFAULT 'person',
      person text NOT NULL DEFAULT '',
      title text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function isDayOff(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  date: string,
  person: string,
) {
  const rows = (await sql`
    SELECT id
    FROM atlas_day_offs
    WHERE property_id = ${propertyId}
      AND off_date = ${date}::date
      AND (
        scope = 'team'
        OR (scope = 'person' AND lower(person) = lower(${person}))
      )
    LIMIT 1
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

async function nextWorkingDate(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  date: string,
  person: string,
  includeDate: boolean,
) {
  let candidate = includeDate ? date : addDays(date, 1);

  for (let attempt = 0; attempt < 31; attempt += 1) {
    const day = weekday(candidate);
    if (
      day !== 0 &&
      day !== 6 &&
      !(await isDayOff(sql, propertyId, candidate, person))
    ) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
  }

  return includeDate ? date : addDays(date, 1);
}

async function appendHistoryAndPhotos(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  id: string,
  label: string,
  fromDate: string,
  toDate: string,
  note: string,
  photos: JsonRecord[],
) {
  const createdAt = new Date().toISOString();
  const entry = {
    id: `workflow-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: historyText(label, fromDate, toDate, note, photos.length > 0),
    createdAt,
  };

  await sql`
    UPDATE atlas_work_orders
    SET
      notes_history = COALESCE(notes_history, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb,
      photos = COALESCE(photos, '[]'::jsonb) || ${JSON.stringify(photos)}::jsonb,
      updated_at = NOW()
    WHERE property_id = ${propertyId}
      AND id = ${id}
  `;
}

async function loadWorkRow(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  id: string,
) {
  const rows = (await sql`
    SELECT
      id,
      title,
      status,
      assigned_to,
      date,
      due_date_value,
      recurring,
      recurrence_interval,
      recurrence_unit,
      updated_at
    FROM atlas_work_orders
    WHERE property_id = ${propertyId}
      AND id = ${id}
    LIMIT 1
  `) as unknown as WorkRow[];

  return rows[0] || null;
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    await ensureColumns(sql);

    const url = new URL(request.url);
    const propertyId = cleanText(url.searchParams.get("propertyId"), 80) || "2000";
    const today = dateKey(url.searchParams.get("today"));

    if (!today) {
      return NextResponse.json(
        { ok: false, error: "A valid local date is required." },
        { status: 400 },
      );
    }

    const start = weekStart(today);
    const end = weekEnd(today);

    const active = (await sql`
      SELECT
        id,
        title,
        status,
        assigned_to,
        COALESCE(due_date_value, date) AS due_date,
        recurring,
        updated_at
      FROM atlas_work_orders
      WHERE property_id = ${propertyId}
        AND COALESCE(status, '') NOT IN ('Completed', 'Cancelled')
        AND COALESCE(due_date_value, date) IS NOT NULL
        AND COALESCE(due_date_value, date) <= ${end}::date
      ORDER BY COALESCE(due_date_value, date) ASC, title ASC
      LIMIT 150
    `) as unknown as JsonRecord[];

    const reopenable = (await sql`
      SELECT
        id,
        title,
        status,
        assigned_to,
        COALESCE(due_date_value, date) AS due_date,
        recurring,
        updated_at
      FROM atlas_work_orders
      WHERE property_id = ${propertyId}
        AND status = 'Cancelled'
        AND updated_at >= ${start}::date
      ORDER BY updated_at DESC
      LIMIT 50
    `) as unknown as JsonRecord[];

    return NextResponse.json({
      ok: true,
      weekStart: start,
      weekEnd: end,
      active,
      reopenable,
    });
  } catch (error) {
    console.error("Atlas work workflow read failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not load the week wrap-up." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    await ensureColumns(sql);

    const body = (await request.json()) as JsonRecord;
    const action = cleanText(body.action, 40) as WorkAction;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const today = dateKey(body.today);

    if (!today) {
      return NextResponse.json(
        { ok: false, error: "A valid local date is required." },
        { status: 400 },
      );
    }

    if (action === "rollover") {
      const rows = (await sql`
        SELECT
          id,
          title,
          status,
          assigned_to,
          date,
          due_date_value,
          recurring,
          recurrence_interval,
          recurrence_unit,
          updated_at
        FROM atlas_work_orders
        WHERE property_id = ${propertyId}
          AND COALESCE(status, '') NOT IN ('Completed', 'Cancelled')
          AND COALESCE(due_date_value, date) IS NOT NULL
          AND COALESCE(due_date_value, date) < ${today}::date
        ORDER BY COALESCE(due_date_value, date) ASC
        LIMIT 500
      `) as unknown as WorkRow[];

      let moved = 0;

      for (const row of rows) {
        const fromDate = dateKey(row.due_date_value || row.date) || today;
        const person = cleanText(row.assigned_to, 120) || "Nick";
        const target = await nextWorkingDate(
          sql,
          propertyId,
          today,
          person,
          true,
        );

        if (fromDate === target) continue;

        await sql`
          UPDATE atlas_work_orders
          SET
            date = ${target}::date,
            due_date_value = ${target}::date,
            status = CASE WHEN status = 'Waiting' THEN status ELSE 'Scheduled' END,
            updated_at = NOW()
          WHERE property_id = ${propertyId}
            AND id = ${row.id}
            AND COALESCE(status, '') NOT IN ('Completed', 'Cancelled')
            AND COALESCE(due_date_value, date) = ${fromDate}::date
        `;

        await appendHistoryAndPhotos(
          sql,
          propertyId,
          row.id,
          "Carried forward automatically",
          fromDate,
          target,
          "",
          [],
        );
        moved += 1;
      }

      return NextResponse.json({ ok: true, moved });
    }

    const id = cleanText(body.id, 240);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "A work item is required." },
        { status: 400 },
      );
    }

    const row = await loadWorkRow(sql, propertyId, id);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "That work item could not be found." },
        { status: 404 },
      );
    }

    const fromDate = dateKey(row.due_date_value || row.date) || today;
    const person = cleanText(row.assigned_to, 120) || "Nick";
    const note = cleanText(body.note, 2000);
    const photos = safeJsonArray(body.photos)
      .filter((item) => item && typeof item === "object")
      .slice(0, 10) as JsonRecord[];

    let targetDate = fromDate;
    let targetStatus = cleanText(row.status, 80) || "Scheduled";
    let label = "Work updated";

    if (action === "carry-tomorrow") {
      targetDate = await nextWorkingDate(sql, propertyId, today, person, false);
      targetStatus = "Scheduled";
      label = "Carry to Tomorrow";
    } else if (action === "move-date") {
      const requestedDate = dateKey(body.moveDate);
      if (!requestedDate) {
        return NextResponse.json(
          { ok: false, error: "Choose the date to move this work to." },
          { status: 400 },
        );
      }
      targetDate = requestedDate;
      targetStatus = "Scheduled";
      label = "Moved to Date";
    } else if (action === "blocked") {
      targetDate = fromDate < today ? today : fromDate;
      targetStatus = "Waiting";
      label = "Blocked / Waiting";
    } else if (action === "skip") {
      label = "Skip / Not Needed";
      if (Boolean(row.recurring)) {
        targetDate = recurrenceDate(row, fromDate);
        targetStatus = "Scheduled";
      } else {
        targetStatus = "Cancelled";
      }
    } else if (action === "didnt-week") {
      label = "Didn't Get To This Week";
      targetDate = Boolean(row.recurring)
        ? recurrenceDate(row, fromDate)
        : nextMonday(today);
      targetStatus = "Scheduled";
    } else if (action === "reopen") {
      label = "Reopened";
      targetDate = await nextWorkingDate(sql, propertyId, today, person, true);
      targetStatus = "Scheduled";
    } else {
      return NextResponse.json(
        { ok: false, error: "That work action is not supported." },
        { status: 400 },
      );
    }

    await sql`
      UPDATE atlas_work_orders
      SET
        date = CASE WHEN ${targetStatus} = 'Cancelled' THEN date ELSE ${targetDate}::date END,
        due_date_value = CASE WHEN ${targetStatus} = 'Cancelled' THEN due_date_value ELSE ${targetDate}::date END,
        status = ${targetStatus},
        updated_at = NOW()
      WHERE property_id = ${propertyId}
        AND id = ${id}
    `;

    await appendHistoryAndPhotos(
      sql,
      propertyId,
      id,
      label,
      fromDate,
      targetDate,
      note,
      photos,
    );

    return NextResponse.json({
      ok: true,
      id,
      action,
      status: targetStatus,
      date: targetStatus === "Cancelled" ? fromDate : targetDate,
    });
  } catch (error) {
    console.error("Atlas work workflow save failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not update that work item." },
      { status: 500 },
    );
  }
}
