import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_dashboard_note_meta (
      property_id text NOT NULL,
      note_key text NOT NULL,
      assigned_to text NOT NULL DEFAULT '',
      reminder_date date,
      pinned boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, note_key)
    )
  `;
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const url = new URL(request.url);
    const propertyId = cleanText(url.searchParams.get("propertyId"), 80) || "2000";
    const rows = await sql`
      SELECT property_id, note_key, assigned_to, reminder_date, pinned, updated_at
      FROM atlas_dashboard_note_meta
      WHERE property_id = ${propertyId}
      ORDER BY pinned DESC, updated_at DESC
    `;
    return NextResponse.json({ ok: true, items: rows });
  } catch (error) {
    console.error("Dashboard note meta read failed:", error);
    return NextResponse.json({ ok: false, error: "Atlas could not load note settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const noteKey = cleanText(body.noteKey, 500);
    const assignedTo = cleanText(body.assignedTo, 160);
    const reminderDate = cleanText(body.reminderDate, 20);
    const pinned = body.pinned === true;

    if (!noteKey) {
      return NextResponse.json({ ok: false, error: "Missing dashboard note key." }, { status: 400 });
    }

    await sql`
      INSERT INTO atlas_dashboard_note_meta (
        property_id, note_key, assigned_to, reminder_date, pinned, updated_at
      ) VALUES (
        ${propertyId},
        ${noteKey},
        ${assignedTo},
        ${/^\d{4}-\d{2}-\d{2}$/.test(reminderDate) ? reminderDate : null}::date,
        ${pinned},
        NOW()
      )
      ON CONFLICT (property_id, note_key)
      DO UPDATE SET
        assigned_to = EXCLUDED.assigned_to,
        reminder_date = EXCLUDED.reminder_date,
        pinned = EXCLUDED.pinned,
        updated_at = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Dashboard note meta save failed:", error);
    return NextResponse.json({ ok: false, error: "Atlas could not save note settings." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const noteKey = cleanText(body.noteKey, 500);
    if (noteKey) {
      await sql`
        DELETE FROM atlas_dashboard_note_meta
        WHERE property_id = ${propertyId} AND note_key = ${noteKey}
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Dashboard note meta delete failed:", error);
    return NextResponse.json({ ok: false, error: "Atlas could not remove note settings." }, { status: 500 });
  }
}
