import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type LandscapeStatus = "Not Started" | "In Progress" | "Complete" | "Needs Review";

type LandscapeHelpItemInput = {
  id: string;
  sortOrder?: number;
  label?: string;
  category?: string;
  priority?: string;
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

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const sql = getSql();
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const weekId = url.searchParams.get("weekId");
    const weekStart = url.searchParams.get("weekStart") || getPacificWeekStartISO();

    if (token) {
      const tokenWeek = await loadWeekByToken(token);
      if (!tokenWeek) return NextResponse.json({ ok: false, error: "Landscape Help link not found." }, { status: 404 });
      return NextResponse.json({ ok: true, ...tokenWeek });
    }

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

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

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Daily Crew Work";
    const status = safeStatus(body.status);
    const crewName = typeof body.crewName === "string" ? body.crewName : "";
    const managerNotes = typeof body.managerNotes === "string" ? body.managerNotes : "";
    const crewNotes = typeof body.crewNotes === "string" ? body.crewNotes : "";

    await sql`
      UPDATE landscape_help_weeks
      SET
        title = CASE WHEN ${isPublicCrewUpdate} THEN title ELSE ${title} END,
        status = ${status},
        crew_name = ${crewName},
        manager_notes = CASE WHEN ${isPublicCrewUpdate} THEN manager_notes ELSE ${managerNotes} END,
        crew_notes = ${crewNotes},
        completed_at = CASE WHEN ${status} = 'Complete' THEN COALESCE(completed_at, now()) ELSE NULL END,
        updated_at = now()
      WHERE id = ${targetWeekId}
    `;

    const items = Array.isArray(body.items) ? (body.items as LandscapeHelpItemInput[]) : [];

    if (!isPublicCrewUpdate) {
      const incomingIds = items.map((item) => item.id).filter(Boolean);
      if (incomingIds.length) {
        await sql`DELETE FROM landscape_help_items WHERE week_id = ${targetWeekId} AND NOT (id = ANY(${incomingIds}::uuid[]))`;
      } else {
        await sql`DELETE FROM landscape_help_items WHERE week_id = ${targetWeekId}`;
      }
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.id) continue;

      if (isPublicCrewUpdate) {
        await sql`
          UPDATE landscape_help_items
          SET
            is_done = ${Boolean(item.isDone)},
            notes = ${typeof item.notes === "string" ? item.notes : ""},
            updated_by = ${typeof item.updatedBy === "string" ? item.updatedBy : "Crew"},
            updated_at = now()
          WHERE id = ${item.id} AND week_id = ${targetWeekId}
        `;
      } else {
        await sql`
          INSERT INTO landscape_help_items (id, week_id, sort_order, label, category, priority, is_done, notes, updated_by, updated_at)
          VALUES (
            ${item.id}::uuid,
            ${targetWeekId},
            ${Number(item.sortOrder) || index + 1},
            ${typeof item.label === "string" && item.label.trim() ? item.label.trim() : "Untitled task"},
            ${typeof item.category === "string" && item.category.trim() ? item.category.trim() : "General"},
            ${typeof item.priority === "string" && item.priority.trim() ? item.priority.trim() : "Normal"},
            ${Boolean(item.isDone)},
            ${typeof item.notes === "string" ? item.notes : ""},
            ${typeof item.updatedBy === "string" ? item.updatedBy : "Atlas Admin"},
            now()
          )
          ON CONFLICT (id) DO UPDATE SET
            sort_order = EXCLUDED.sort_order,
            label = EXCLUDED.label,
            category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            is_done = EXCLUDED.is_done,
            notes = EXCLUDED.notes,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
          WHERE landscape_help_items.week_id = ${targetWeekId}
        `;
      }
    }

    const loaded = await loadWeekById(targetWeekId);
    return NextResponse.json({ ok: true, ...loaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
