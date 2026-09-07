import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayOffScope = "person" | "team";
type DayOffKind = "Holiday" | "PTO" | "Off";

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";

  if (!connectionString) throw new Error("Atlas database is not connected.");
  return neon(connectionString);
}

function cleanText(value: unknown, max = 240) {
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

function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function safeIdPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "all";
}

async function ensureTables(sql: ReturnType<typeof neon>) {
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

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS atlas_day_offs_unique_idx
    ON atlas_day_offs(property_id, off_date, scope, person)
  `;

  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS item_date date`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS category_label text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS color_id text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS color_name text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS repeat text NOT NULL DEFAULT 'None'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS reminder text NOT NULL DEFAULT 'None'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS linked_type text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS linked_id text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS linked_name text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS source text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS event_type text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_value date`;
}

async function isDayOff(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  date: string,
  person: string,
) {
  const rows = await sql`
    SELECT id
    FROM atlas_day_offs
    WHERE property_id = ${propertyId}
      AND off_date = ${date}::date
      AND (
        scope = 'team'
        OR (scope = 'person' AND lower(person) = lower(${person}))
      )
    LIMIT 1
  `;
  return rows.length > 0;
}

async function nextWorkingDate(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  date: string,
  person: string,
) {
  let candidate = addDays(date, 1);

  for (let attempt = 0; attempt < 21; attempt += 1) {
    const day = weekday(candidate);
    if (day !== 0 && day !== 6 && !(await isDayOff(sql, propertyId, candidate, person))) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
  }

  return addDays(date, 1);
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    await ensureTables(sql);

    const url = new URL(request.url);
    const propertyId = cleanText(url.searchParams.get("propertyId"), 80) || "2000";
    const date = dateKey(url.searchParams.get("date"));

    const rows = date
      ? await sql`
          SELECT id, property_id, off_date, kind, scope, person, title, created_at, updated_at
          FROM atlas_day_offs
          WHERE property_id = ${propertyId}
            AND off_date = ${date}::date
          ORDER BY scope DESC, person ASC
        `
      : await sql`
          SELECT id, property_id, off_date, kind, scope, person, title, created_at, updated_at
          FROM atlas_day_offs
          WHERE property_id = ${propertyId}
            AND off_date >= CURRENT_DATE
          ORDER BY off_date ASC, scope DESC, person ASC
          LIMIT 60
        `;

    return NextResponse.json({ ok: true, dayOffs: rows });
  } catch (error) {
    console.error("Atlas day off read failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not load day-off scheduling." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    await ensureTables(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const date = dateKey(body.date);
    const kind = (["Holiday", "PTO", "Off"].includes(cleanText(body.kind))
      ? cleanText(body.kind)
      : "Off") as DayOffKind;
    const scope = (body.scope === "team" ? "team" : "person") as DayOffScope;
    const person = scope === "team" ? "" : cleanText(body.person, 120);
    const suppliedTitle = cleanText(body.title, 180);

    if (!date) {
      return NextResponse.json({ ok: false, error: "A valid date is required." }, { status: 400 });
    }

    if (scope === "person" && !person) {
      return NextResponse.json({ ok: false, error: "Choose who is off." }, { status: 400 });
    }

    const title = suppliedTitle || (kind === "Holiday" ? "Holiday / Off" : kind === "PTO" ? `${person} PTO` : scope === "team" ? "Property / Team Off" : `${person} Off`);
    const id = `day-off-${propertyId}-${date}-${scope}-${safeIdPart(person)}`;

    await sql`
      INSERT INTO atlas_day_offs (
        id, property_id, off_date, kind, scope, person, title, created_at, updated_at
      )
      VALUES (
        ${id}, ${propertyId}, ${date}::date, ${kind}, ${scope}, ${person}, ${title}, NOW(), NOW()
      )
      ON CONFLICT (property_id, off_date, scope, person)
      DO UPDATE SET
        kind = EXCLUDED.kind,
        title = EXCLUDED.title,
        updated_at = NOW()
    `;

    const calendarId = `calendar-${id}`;
    const calendarNotes = scope === "team" ? "Day off scope: Property / team" : `Day off scope: ${person}`;

    await sql`
      INSERT INTO atlas_calendar_items (
        id, item_date, date, time, end_time, title, area, category_label,
        color_id, color_name, all_day, repeat, reminder, notes,
        linked_type, linked_id, linked_name, completed, source, event_type, property_id
      )
      VALUES (
        ${calendarId}, ${date}::date, ${date}::date, '', '', ${title},
        'Holiday / PTO / Off', 'PTO / Off', 'pto-off', 'orange', true,
        'None', 'None', ${calendarNotes}, 'None', NULL, NULL, false,
        'manual', 'PTO / Off', ${propertyId}
      )
      ON CONFLICT (id)
      DO UPDATE SET
        item_date = EXCLUDED.item_date,
        date = EXCLUDED.date,
        title = EXCLUDED.title,
        area = EXCLUDED.area,
        category_label = EXCLUDED.category_label,
        color_id = EXCLUDED.color_id,
        color_name = EXCLUDED.color_name,
        all_day = true,
        notes = EXCLUDED.notes,
        source = EXCLUDED.source,
        event_type = EXCLUDED.event_type,
        property_id = EXCLUDED.property_id
    `;

    const affected = scope === "team"
      ? await sql`
          SELECT id, assigned_to
          FROM atlas_work_orders
          WHERE property_id = ${propertyId}
            AND status <> 'Completed'
            AND recurring = true
            AND COALESCE(due_date_value, date) = ${date}::date
        `
      : await sql`
          SELECT id, assigned_to
          FROM atlas_work_orders
          WHERE property_id = ${propertyId}
            AND status <> 'Completed'
            AND recurring = true
            AND COALESCE(due_date_value, date) = ${date}::date
            AND lower(COALESCE(assigned_to, '')) = lower(${person})
        `;

    let moved = 0;

    for (const row of affected as Array<{ id: string; assigned_to?: string | null }>) {
      const assignedTo = cleanText(row.assigned_to, 120) || person || "Nick";
      const nextDate = await nextWorkingDate(sql, propertyId, date, assignedTo);

      await sql`
        UPDATE atlas_work_orders
        SET
          date = ${nextDate}::date,
          due_date_value = CASE
            WHEN due_date_value IS NULL OR due_date_value = ${date}::date
              THEN ${nextDate}::date
            ELSE due_date_value
          END,
          updated_at = NOW()
        WHERE property_id = ${propertyId}
          AND id = ${row.id}
          AND status <> 'Completed'
          AND recurring = true
          AND COALESCE(due_date_value, date) = ${date}::date
      `;

      moved += 1;
    }

    return NextResponse.json({
      ok: true,
      dayOff: { id, propertyId, date, kind, scope, person, title },
      movedRecurringWork: moved,
    });
  } catch (error) {
    console.error("Atlas day off save failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not save the day off." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    await ensureTables(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const id = cleanText(body.id, 260);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Day-off id is required." }, { status: 400 });
    }

    await sql`
      DELETE FROM atlas_day_offs
      WHERE property_id = ${propertyId}
        AND id = ${id}
    `;

    await sql`
      DELETE FROM atlas_calendar_items
      WHERE property_id = ${propertyId}
        AND id = ${`calendar-${id}`}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Atlas day off delete failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not remove the day off." },
      { status: 500 },
    );
  }
}
