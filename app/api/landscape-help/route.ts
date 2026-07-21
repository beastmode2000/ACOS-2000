import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CrewStatus = "Not Started" | "In Progress" | "Complete" | "Needs Review";
type JsonRecord = Record<string, unknown>;

type CrewItemInput = {
  id?: string;
  label?: string;
  category?: string;
  location?: string;
  priority?: string;
  isDone?: boolean;
  notes?: string;
  updatedBy?: string;
  photos?: unknown[];
  sortOrder?: number;
};

const DEFAULT_ITEMS = [
  { label: "Weed waterside / lake-facing beds first", category: "Landscaping", location: "Waterside beds", priority: "Highest" },
  { label: "Weed patio and courtyard beds", category: "Landscaping", location: "Patio / Courtyard", priority: "High" },
  { label: "Weed driveway beds and dock path edges", category: "Landscaping", location: "Driveway / Dock path", priority: "High" },
  { label: "Water pots and check dry lawn areas", category: "Watering", location: "Property-wide", priority: "High" },
  { label: "Check irrigation for leaks, broken heads, or poor coverage", category: "Irrigation", location: "Property-wide", priority: "High" },
  { label: "Prune or shear plants as needed", category: "Landscaping", location: "Property-wide", priority: "Normal" },
  { label: "Remove yard debris and blow hardscape after work", category: "Cleanup", location: "Property-wide", priority: "High" },
  { label: "Add notes or photos for anything Nick needs to review", category: "Inspection", location: "Property-wide", priority: "High" },
];

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return neon(databaseUrl);
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

function getAdminAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;
    return { username: decoded.slice(0, separatorIndex), password: decoded.slice(separatorIndex + 1) };
  } catch {
    return null;
  }
}

function adminBlockResponse(request: NextRequest) {
  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";
  if (!expectedUsername || !expectedPassword) {
    return response({ ok: false, error: "Atlas access is not configured in Vercel." }, 500);
  }
  const auth = getAdminAuth(request);
  if (!auth || auth.username !== expectedUsername || auth.password !== expectedPassword) {
    return NextResponse.json(
      { ok: false, error: "Atlas login required." },
      { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Atlas 2000", charset="UTF-8"' } },
    );
  }
  return null;
}

function pacificDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function safeStatus(value: unknown): CrewStatus {
  return value === "In Progress" || value === "Complete" || value === "Needs Review" ? value : "Not Started";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safePhotos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((photo) => photo && typeof photo === "object")
    .slice(0, 8)
    .map((photo) => {
      const record = photo as JsonRecord;
      return {
        id: text(record.id),
        name: text(record.name, "Crew photo"),
        type: text(record.type, "image/jpeg"),
        dataUrl: text(record.dataUrl),
        addedAt: text(record.addedAt, new Date().toISOString()),
      };
    })
    .filter((photo) => photo.dataUrl.startsWith("data:image/"));
}

function normalizeList(row: any) {
  return {
    id: String(row.id),
    workDate: String(row.week_start),
    title: String(row.title || "Daily Crew Work"),
    shareToken: String(row.share_token || ""),
    status: safeStatus(row.status),
    crewName: String(row.crew_name || ""),
    managerNotes: String(row.manager_notes || ""),
    crewNotes: String(row.crew_notes || ""),
    property: String(row.property || "2000"),
    templateName: String(row.template_name || ""),
    completedAt: row.completed_at ? String(row.completed_at) : "",
    createdAt: row.created_at ? String(row.created_at) : "",
    updatedAt: row.updated_at ? String(row.updated_at) : "",
  };
}

function normalizeItem(row: any) {
  return {
    id: String(row.id),
    listId: String(row.week_id),
    sortOrder: Number(row.sort_order || 0),
    label: String(row.label || ""),
    category: String(row.category || "General"),
    location: String(row.location || ""),
    priority: String(row.priority || "Normal"),
    isDone: Boolean(row.is_done),
    notes: String(row.notes || ""),
    updatedBy: String(row.updated_by || ""),
    photos: Array.isArray(row.photos) ? row.photos : [],
    completedAt: row.completed_at ? String(row.completed_at) : "",
    updatedAt: row.updated_at ? String(row.updated_at) : "",
  };
}

function normalizeTemplate(row: any) {
  return {
    id: String(row.id),
    name: String(row.name || "Untitled Template"),
    category: String(row.category || "General"),
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at ? String(row.created_at) : "",
    updatedAt: row.updated_at ? String(row.updated_at) : "",
  };
}

async function ensureSchema() {
  const sql = getSql();
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_weeks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start DATE NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT 'Daily Crew Work',
      share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
      status TEXT NOT NULL DEFAULT 'Not Started',
      crew_name TEXT DEFAULT '',
      manager_notes TEXT DEFAULT '',
      crew_notes TEXT DEFAULT '',
      property TEXT DEFAULT '2000',
      template_name TEXT DEFAULT '',
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE landscape_help_weeks ADD COLUMN IF NOT EXISTS property TEXT DEFAULT '2000'`;
  await sql`ALTER TABLE landscape_help_weeks ADD COLUMN IF NOT EXISTS template_name TEXT DEFAULT ''`;
  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id UUID NOT NULL REFERENCES landscape_help_weeks(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      location TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'Normal',
      is_done BOOLEAN NOT NULL DEFAULT false,
      notes TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE landscape_help_items ADD COLUMN IF NOT EXISTS location TEXT DEFAULT ''`;
  await sql`ALTER TABLE landscape_help_items ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE landscape_help_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS landscape_help_items_week_idx ON landscape_help_items (week_id, sort_order)`;
  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'General',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function loadListById(listId: string) {
  const sql = getSql();
  const lists = await sql`SELECT * FROM landscape_help_weeks WHERE id = ${listId} LIMIT 1`;
  if (!lists[0]) return null;
  const items = await sql`SELECT * FROM landscape_help_items WHERE week_id = ${listId} ORDER BY sort_order ASC`;
  return { list: normalizeList(lists[0]), items: items.map(normalizeItem) };
}

async function loadListByToken(token: string) {
  const sql = getSql();
  const rows = await sql`SELECT id FROM landscape_help_weeks WHERE share_token = ${token} LIMIT 1`;
  return rows[0] ? loadListById(String(rows[0].id)) : null;
}

async function createList(workDate: string, title = "Daily Crew Work", crewName = "", property = "2000") {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO landscape_help_weeks (week_start, title, crew_name, property, status)
    VALUES (${workDate}::date, ${title}, ${crewName}, ${property}, 'Not Started')
    ON CONFLICT (week_start) DO UPDATE SET updated_at = now()
    RETURNING *
  `;
  const list = rows[0];
  const count = await sql`SELECT COUNT(*)::int AS count FROM landscape_help_items WHERE week_id = ${list.id}`;
  if (Number(count[0]?.count || 0) === 0) {
    for (let index = 0; index < DEFAULT_ITEMS.length; index += 1) {
      const item = DEFAULT_ITEMS[index];
      await sql`
        INSERT INTO landscape_help_items (week_id, sort_order, label, category, location, priority)
        VALUES (${list.id}, ${index + 1}, ${item.label}, ${item.category}, ${item.location}, ${item.priority})
      `;
    }
  }
  return loadListById(String(list.id));
}

async function historyAndTemplates() {
  const sql = getSql();
  const lists = await sql`SELECT * FROM landscape_help_weeks ORDER BY week_start DESC, updated_at DESC LIMIT 100`;
  const templates = await sql`SELECT * FROM landscape_help_templates ORDER BY name ASC`;
  return { lists: lists.map(normalizeList), templates: templates.map(normalizeTemplate) };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    const listId = url.searchParams.get("listId") || url.searchParams.get("weekId") || "";
    const workDate = url.searchParams.get("workDate") || pacificDateISO();

    if (token) {
      const loaded = await loadListByToken(token);
      if (!loaded) return response({ ok: false, error: "Daily Crew Work link not found." }, 404);
      return response({ ok: true, ...loaded, isCrewView: true });
    }

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    let loaded = listId ? await loadListById(listId) : null;
    if (!loaded) loaded = await createList(workDate);
    const extras = await historyAndTemplates();
    return response({ ok: true, ...loaded, ...extras, isCrewView: false });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Daily Crew Work could not be loaded." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;
    const sql = getSql();
    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const action = text(body.action, "createList");

    if (action === "createList") {
      const workDate = text(body.workDate, pacificDateISO());
      const loaded = await createList(workDate, text(body.title, "Daily Crew Work"), text(body.crewName), text(body.property, "2000"));
      const extras = await historyAndTemplates();
      return response({ ok: true, ...loaded, ...extras });
    }

    if (action === "duplicateList") {
      const sourceId = text(body.sourceId);
      const workDate = text(body.workDate, pacificDateISO());
      const source = await loadListById(sourceId);
      if (!source) return response({ ok: false, error: "Source list was not found." }, 404);
      const created = await createList(workDate, text(body.title, source.list.title), text(body.crewName, source.list.crewName), text(body.property, source.list.property));
      if (!created) throw new Error("Could not create the duplicated list.");
      await sql`DELETE FROM landscape_help_items WHERE week_id = ${created.list.id}`;
      for (let index = 0; index < source.items.length; index += 1) {
        const item = source.items[index];
        await sql`
          INSERT INTO landscape_help_items (week_id, sort_order, label, category, location, priority)
          VALUES (${created.list.id}, ${index + 1}, ${item.label}, ${item.category}, ${item.location}, ${item.priority})
        `;
      }
      const loaded = await loadListById(created.list.id);
      const extras = await historyAndTemplates();
      return response({ ok: true, ...loaded, ...extras });
    }

    if (action === "saveTemplate") {
      const name = text(body.name);
      const category = text(body.category, "General");
      const items = Array.isArray(body.items) ? body.items : [];
      if (!name) return response({ ok: false, error: "Template name is required." }, 400);
      await sql`
        INSERT INTO landscape_help_templates (name, category, items)
        VALUES (${name}, ${category}, ${JSON.stringify(items)}::jsonb)
        ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, items = EXCLUDED.items, updated_at = now()
      `;
      const extras = await historyAndTemplates();
      return response({ ok: true, ...extras });
    }

    if (action === "applyTemplate") {
      const listId = text(body.listId);
      const templateId = text(body.templateId);
      const templateRows = await sql`SELECT * FROM landscape_help_templates WHERE id = ${templateId} LIMIT 1`;
      if (!templateRows[0]) return response({ ok: false, error: "Template was not found." }, 404);
      const template = normalizeTemplate(templateRows[0]);
      await sql`DELETE FROM landscape_help_items WHERE week_id = ${listId}`;
      for (let index = 0; index < template.items.length; index += 1) {
        const raw = template.items[index] as JsonRecord;
        await sql`
          INSERT INTO landscape_help_items (week_id, sort_order, label, category, location, priority)
          VALUES (${listId}, ${index + 1}, ${text(raw.label, "New task")}, ${text(raw.category, "General")}, ${text(raw.location)}, ${text(raw.priority, "Normal")})
        `;
      }
      await sql`UPDATE landscape_help_weeks SET template_name = ${template.name}, updated_at = now() WHERE id = ${listId}`;
      const loaded = await loadListById(listId);
      return response({ ok: true, ...loaded });
    }

    return response({ ok: false, error: "Unknown Daily Crew Work action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Daily Crew Work action failed." }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const token = url.searchParams.get("token") || text(body.token);
    const isCrewView = Boolean(token);
    let listId = text(body.listId) || text(body.weekId);

    if (token) {
      const tokenRows = await sql`SELECT id FROM landscape_help_weeks WHERE share_token = ${token} LIMIT 1`;
      if (!tokenRows[0]) return response({ ok: false, error: "Daily Crew Work link not found." }, 404);
      listId = String(tokenRows[0].id);
    } else {
      const blocked = adminBlockResponse(request);
      if (blocked) return blocked;
    }

    if (!listId) return response({ ok: false, error: "Missing work-list id." }, 400);
    const current = await loadListById(listId);
    if (!current) return response({ ok: false, error: "Daily Crew Work list not found." }, 404);

    const status = safeStatus(body.status ?? current.list.status);
    await sql`
      UPDATE landscape_help_weeks
      SET
        title = CASE WHEN ${isCrewView} THEN title ELSE ${text(body.title, current.list.title)} END,
        status = ${status},
        crew_name = CASE WHEN ${isCrewView} THEN crew_name ELSE ${text(body.crewName, current.list.crewName)} END,
        manager_notes = CASE WHEN ${isCrewView} THEN manager_notes ELSE ${text(body.managerNotes, current.list.managerNotes)} END,
        crew_notes = ${body.crewNotes === undefined ? current.list.crewNotes : text(body.crewNotes)},
        property = CASE WHEN ${isCrewView} THEN property ELSE ${text(body.property, current.list.property)} END,
        completed_at = CASE WHEN ${status} = 'Complete' THEN COALESCE(completed_at, now()) ELSE NULL END,
        updated_at = now()
      WHERE id = ${listId}
    `;

    const items = Array.isArray(body.items) ? (body.items as CrewItemInput[]) : [];
    if (!isCrewView) {
      const incomingIds = items.map((item) => text(item.id)).filter(Boolean);
      if (incomingIds.length) {
        await sql`DELETE FROM landscape_help_items WHERE week_id = ${listId} AND NOT (id::text = ANY(${incomingIds}))`;
      } else {
        await sql`DELETE FROM landscape_help_items WHERE week_id = ${listId}`;
      }
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemId = text(item.id);
      const done = Boolean(item.isDone);
      const photos = safePhotos(item.photos);
      if (itemId) {
        if (isCrewView) {
          await sql`
            UPDATE landscape_help_items SET
              is_done = ${done}, notes = ${text(item.notes)}, updated_by = ${text(item.updatedBy)},
              photos = ${JSON.stringify(photos)}::jsonb,
              completed_at = CASE WHEN ${done} THEN COALESCE(completed_at, now()) ELSE NULL END,
              updated_at = now()
            WHERE id = ${itemId} AND week_id = ${listId}
          `;
        } else {
          await sql`
            UPDATE landscape_help_items SET
              sort_order = ${index + 1}, label = ${text(item.label, "New task")}, category = ${text(item.category, "General")},
              location = ${text(item.location)}, priority = ${text(item.priority, "Normal")}, is_done = ${done},
              notes = ${text(item.notes)}, updated_by = ${text(item.updatedBy)}, photos = ${JSON.stringify(photos)}::jsonb,
              completed_at = CASE WHEN ${done} THEN COALESCE(completed_at, now()) ELSE NULL END,
              updated_at = now()
            WHERE id = ${itemId} AND week_id = ${listId}
          `;
        }
      } else if (!isCrewView) {
        await sql`
          INSERT INTO landscape_help_items (week_id, sort_order, label, category, location, priority, is_done, notes, updated_by, photos, completed_at)
          VALUES (${listId}, ${index + 1}, ${text(item.label, "New task")}, ${text(item.category, "General")}, ${text(item.location)},
            ${text(item.priority, "Normal")}, ${done}, ${text(item.notes)}, ${text(item.updatedBy)}, ${JSON.stringify(photos)}::jsonb,
            CASE WHEN ${done} THEN now() ELSE NULL END)
        `;
      }
    }

    const loaded = await loadListById(listId);
    const extras = isCrewView ? {} : await historyAndTemplates();
    return response({ ok: true, ...loaded, ...extras, isCrewView });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Daily Crew Work could not be saved." }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureSchema();
    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;
    const sql = getSql();
    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const action = text(body.action);
    if (action === "deleteTemplate") {
      await sql`DELETE FROM landscape_help_templates WHERE id = ${text(body.templateId)}`;
      return response({ ok: true, ...(await historyAndTemplates()) });
    }
    const listId = text(body.listId);
    if (!listId) return response({ ok: false, error: "Missing work-list id." }, 400);
    await sql`DELETE FROM landscape_help_weeks WHERE id = ${listId}`;
    return response({ ok: true, ...(await historyAndTemplates()) });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Daily Crew Work could not be deleted." }, 500);
  }
}
