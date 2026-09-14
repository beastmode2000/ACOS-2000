import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;

type OwnerInputPhoto = {
  id: string;
  name: string;
  caption: string;
  dataUrl: string;
  createdAt: string;
};

const VALID_PROPERTIES = new Set(["2000", "6855", "3661", "hangar"]);

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function propertyIdFrom(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "2000";
  return VALID_PROPERTIES.has(raw) ? raw : "";
}

function cleanText(value: unknown, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanDate(value: unknown) {
  const date = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function cleanPhotos(value: unknown): OwnerInputPhoto[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 3)
    .map((entry, index) => {
      const photo = entry && typeof entry === "object" ? (entry as Row) : {};
      const dataUrl = cleanText(photo.dataUrl, 2_000_000);
      if (!dataUrl.startsWith("data:image/")) return null;
      return {
        id: cleanText(photo.id, 200) || `owner-input-photo-${Date.now()}-${index}`,
        name: cleanText(photo.name, 240) || `Photo ${index + 1}`,
        caption: cleanText(photo.caption, 500),
        dataUrl,
        createdAt: cleanText(photo.createdAt, 100) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as OwnerInputPhoto[];
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_owner_input (
      id text PRIMARY KEY,
      property_id text NOT NULL DEFAULT '2000',
      project_id text NOT NULL DEFAULT '',
      project_title text NOT NULL DEFAULT '',
      question text NOT NULL,
      context text NOT NULL DEFAULT '',
      due_date date,
      photos jsonb NOT NULL DEFAULT '[]'::jsonb,
      status text NOT NULL DEFAULT 'Awaiting Owner',
      response text NOT NULL DEFAULT '',
      response_name text NOT NULL DEFAULT '',
      response_choice text NOT NULL DEFAULT '',
      response_at timestamptz,
      share_token text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE atlas_owner_input ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`
    CREATE INDEX IF NOT EXISTS atlas_owner_input_property_status_idx
    ON atlas_owner_input(property_id, status, created_at DESC)
  `;
}

async function canAccessProperty(sql: ReturnType<typeof neon>, request: NextRequest, propertyId: string) {
  const email = cleanText(request.headers.get("x-atlas-user-email"), 320).toLowerCase();
  const headerRole = cleanText(request.headers.get("x-atlas-user-role"), 80).toLowerCase();
  if (!email || headerRole === "master") return true;

  const rows = await sql`
    SELECT role, active, property_ids
    FROM atlas_team_access
    WHERE lower(email) = ${email}
    LIMIT 1
  `;
  const row = rows[0] as Row | undefined;
  if (!row || row.active === false) return false;
  const role = String(row.role || headerRole).toLowerCase();
  if (role === "master") return true;
  const propertyIds = Array.isArray(row.property_ids) ? row.property_ids.map(String) : ["2000"];
  return propertyIds.includes(propertyId);
}

function mapRow(row: Row, includeToken = false) {
  return {
    id: String(row.id || ""),
    propertyId: String(row.property_id || "2000"),
    projectId: String(row.project_id || ""),
    projectTitle: String(row.project_title || ""),
    question: String(row.question || ""),
    context: String(row.context || ""),
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : "",
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: String(row.status || "Awaiting Owner"),
    response: String(row.response || ""),
    responseName: String(row.response_name || ""),
    responseChoice: String(row.response_choice || ""),
    responseAt: row.response_at ? new Date(String(row.response_at)).toISOString() : "",
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : "",
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : "",
    ...(includeToken ? { shareToken: String(row.share_token || "") } : {}),
  };
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const token = cleanText(request.nextUrl.searchParams.get("token"), 200);

    if (token) {
      const rows = await sql`
        SELECT * FROM atlas_owner_input
        WHERE share_token = ${token}
        LIMIT 1
      `;
      if (!rows.length) return NextResponse.json({ ok: false, error: "Owner input request not found." }, { status: 404 });
      return NextResponse.json({ ok: true, item: mapRow(rows[0] as Row, false) }, { headers: { "Cache-Control": "no-store" } });
    }

    const propertyId = propertyIdFrom(request.nextUrl.searchParams.get("propertyId"));
    if (!propertyId) return NextResponse.json({ ok: false, error: "Invalid property ID." }, { status: 400 });
    if (!(await canAccessProperty(sql, request, propertyId))) {
      return NextResponse.json({ ok: false, error: "You do not have access to this property." }, { status: 403 });
    }

    const rows = await sql`
      SELECT * FROM atlas_owner_input
      WHERE property_id = ${propertyId}
      ORDER BY
        CASE WHEN status = 'Awaiting Owner' THEN 0 ELSE 1 END,
        due_date ASC NULLS LAST,
        created_at DESC
      LIMIT 250
    `;
    return NextResponse.json({ ok: true, propertyId, items: (rows as unknown as Row[]).map((row) => mapRow(row, true)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner input could not load." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = (await request.json().catch(() => ({}))) as Row;
    const token = cleanText(request.nextUrl.searchParams.get("token"), 200);

    if (token) {
      const response = cleanText(body.response, 8000);
      const responseName = cleanText(body.responseName, 200);
      const responseChoice = cleanText(body.responseChoice, 100);
      if (!response && !responseChoice) {
        return NextResponse.json({ ok: false, error: "Please enter a response or choose an option." }, { status: 400 });
      }
      const rows = await sql`
        UPDATE atlas_owner_input
        SET response = ${response},
            response_name = ${responseName},
            response_choice = ${responseChoice},
            response_at = NOW(),
            status = 'Answered',
            updated_at = NOW()
        WHERE share_token = ${token}
        RETURNING *
      `;
      if (!rows.length) return NextResponse.json({ ok: false, error: "Owner input request not found." }, { status: 404 });
      return NextResponse.json({ ok: true, item: mapRow(rows[0] as Row, false) });
    }

    const propertyId = propertyIdFrom(body.propertyId);
    if (!propertyId) return NextResponse.json({ ok: false, error: "Invalid property ID." }, { status: 400 });
    if (!(await canAccessProperty(sql, request, propertyId))) {
      return NextResponse.json({ ok: false, error: "You do not have access to this property." }, { status: 403 });
    }

    const question = cleanText(body.question, 3000);
    if (!question) return NextResponse.json({ ok: false, error: "Owner question is required." }, { status: 400 });

    const id = cleanText(body.id, 240) || `owner-input-${Date.now()}-${randomBytes(5).toString("hex")}`;
    const shareToken = randomBytes(24).toString("hex");
    const projectId = cleanText(body.projectId, 240);
    const projectTitle = cleanText(body.projectTitle, 500);
    const context = cleanText(body.context, 8000);
    const dueDate = cleanDate(body.dueDate);
    const photos = cleanPhotos(body.photos);

    const rows = await sql`
      INSERT INTO atlas_owner_input (
        id, property_id, project_id, project_title, question, context, due_date, photos,
        status, response, response_name, response_choice, share_token, created_at, updated_at
      ) VALUES (
        ${id}, ${propertyId}, ${projectId}, ${projectTitle}, ${question}, ${context},
        ${dueDate || null}::date, ${JSON.stringify(photos)}::jsonb,
        'Awaiting Owner', '', '', '', ${shareToken}, NOW(), NOW()
      )
      RETURNING *
    `;
    return NextResponse.json({ ok: true, item: mapRow(rows[0] as Row, true) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner input could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = (await request.json().catch(() => ({}))) as Row;
    const id = cleanText(body.id, 240);
    if (!id) return NextResponse.json({ ok: false, error: "Owner input id is required." }, { status: 400 });

    const existing = await sql`SELECT property_id FROM atlas_owner_input WHERE id = ${id} LIMIT 1`;
    if (!existing.length) return NextResponse.json({ ok: false, error: "Owner input request not found." }, { status: 404 });
    const propertyId = propertyIdFrom((existing[0] as Row).property_id);
    if (!propertyId || !(await canAccessProperty(sql, request, propertyId))) {
      return NextResponse.json({ ok: false, error: "You do not have access to this property." }, { status: 403 });
    }

    const status = cleanText(body.status, 100) === "Closed" ? "Closed" : "Awaiting Owner";
    await sql`UPDATE atlas_owner_input SET status = ${status}, updated_at = NOW() WHERE id = ${id} AND property_id = ${propertyId}`;
    return NextResponse.json({ ok: true, id, propertyId, status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner input could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const id = cleanText(request.nextUrl.searchParams.get("id"), 240);
    if (!id) return NextResponse.json({ ok: false, error: "Owner input id is required." }, { status: 400 });

    const existing = await sql`SELECT property_id FROM atlas_owner_input WHERE id = ${id} LIMIT 1`;
    if (!existing.length) return NextResponse.json({ ok: false, error: "Owner input request not found." }, { status: 404 });
    const propertyId = propertyIdFrom((existing[0] as Row).property_id);
    if (!propertyId || !(await canAccessProperty(sql, request, propertyId))) {
      return NextResponse.json({ ok: false, error: "You do not have access to this property." }, { status: 403 });
    }

    await sql`DELETE FROM atlas_owner_input WHERE id = ${id} AND property_id = ${propertyId}`;
    return NextResponse.json({ ok: true, id, propertyId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner input could not be deleted." }, { status: 500 });
  }
}
