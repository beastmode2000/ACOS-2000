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

async function ensureOperationalRecordsTable(
  sql: ReturnType<typeof neon>,
) {
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
    await ensureOperationalRecordsTable(sql);

    const today = pacificDateKey();
    const now = new Date().toISOString();
    const clientRequestId = safeRequestId(body.clientRequestId);
    const id = `addison-self-${clientRequestId}`;

    const record = {
      id,
      propertyId: PROPERTY_ID,
      title,
      category,
      notes,
      priority: "Medium",
      minutes: 30,
      locationId: "",
      recurring: false,
      createdAt: now,
      source: "Addison self-added",
      taskMeta: {
        status: "Open",
        assignee: "Addison",
        assignedTo: "Addison",
        dueDate: today,
        notes,
        instructions: notes,
        category,
        source: "Addison self-added",
        createdBy: "Addison",
        createdAt: now,
      },
    };

    await sql`
      INSERT INTO atlas_operational_records (
        record_type,
        id,
        property_id,
        record,
        updated_at
      )
      VALUES (
        'tasks',
        ${id},
        ${PROPERTY_ID},
        ${JSON.stringify(record)}::jsonb,
        NOW()
      )
      ON CONFLICT (record_type, id) DO NOTHING
    `;

    return NextResponse.json({
      ok: true,
      task: record,
    });
  } catch (error) {
    console.error("Addison create work failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not add that work." },
      { status: 500 },
    );
  }
}
