import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HOME_PROPERTY_ID = "4725";
const HOME_OWNER_EMAIL = "nthornton87@yahoo.com";

type HomeRecordType = "recipe" | "chore" | "event" | "asset" | "location";

type HomeRecord = {
  id: string;
  propertyId: string;
  recordType: HomeRecordType;
  title: string;
  [key: string]: unknown;
};

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

async function ensureHomeTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_home_records (
      property_id text NOT NULL,
      id text NOT NULL,
      record_type text NOT NULL,
      record jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS atlas_home_records_property_type_idx
    ON atlas_home_records(property_id, record_type, updated_at DESC)
  `;
}

async function canAccessHome(sql: ReturnType<typeof neon>, request: NextRequest) {
  const email = String(request.headers.get("x-atlas-user-email") || "").trim().toLowerCase();
  if (!email) return false;
  if (email === HOME_OWNER_EMAIL) return true;

  const rows = await sql`
    SELECT active, property_ids
    FROM atlas_team_access
    WHERE lower(email) = ${email}
    LIMIT 1
  `;
  const row = rows[0] as { active?: boolean; property_ids?: unknown } | undefined;
  if (!row || row.active === false) return false;
  const propertyIds = Array.isArray(row.property_ids) ? row.property_ids.map(String) : [];
  return propertyIds.includes(HOME_PROPERTY_ID);
}

function privateResponse() {
  return NextResponse.json({ ok: false, error: "This account does not have access to 4725." }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    const propertyId = String(request.nextUrl.searchParams.get("propertyId") || "");
    if (propertyId !== HOME_PROPERTY_ID) {
      return NextResponse.json({ ok: false, error: "Unknown home property." }, { status: 404 });
    }

    const sql = getSql();
    await ensureHomeTable(sql);
    if (!(await canAccessHome(sql, request))) return privateResponse();

    const rows = await sql`
      SELECT record
      FROM atlas_home_records
      WHERE property_id = ${HOME_PROPERTY_ID}
      ORDER BY updated_at DESC
    ` as unknown as Array<{ record: HomeRecord }>;

    return NextResponse.json({ ok: true, records: rows.map((row) => row.record) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load 4725." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureHomeTable(sql);
    if (!(await canAccessHome(sql, request))) return privateResponse();

    const body = await request.json() as HomeRecord;
    const id = String(body?.id || "").trim();
    const title = String(body?.title || "").trim();
    const propertyId = String(body?.propertyId || "");
    const recordType = String(body?.recordType || "") as HomeRecordType;
    const allowedTypes: HomeRecordType[] = ["recipe", "chore", "event", "asset", "location"];

    if (propertyId !== HOME_PROPERTY_ID || !id || !title || !allowedTypes.includes(recordType)) {
      return NextResponse.json({ ok: false, error: "Invalid 4725 record." }, { status: 400 });
    }

    const record = {
      ...body,
      propertyId: HOME_PROPERTY_ID,
      id,
      title,
      recordType,
      updatedAt: new Date().toISOString(),
    };

    await sql`
      INSERT INTO atlas_home_records (property_id, id, record_type, record, updated_at)
      VALUES (${HOME_PROPERTY_ID}, ${id}, ${recordType}, ${JSON.stringify(record)}::jsonb, NOW())
      ON CONFLICT (property_id, id)
      DO UPDATE SET
        record_type = EXCLUDED.record_type,
        record = EXCLUDED.record,
        updated_at = NOW()
    `;

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save 4725." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyId = String(request.nextUrl.searchParams.get("propertyId") || "");
    const id = String(request.nextUrl.searchParams.get("id") || "").trim();
    if (propertyId !== HOME_PROPERTY_ID || !id) {
      return NextResponse.json({ ok: false, error: "Invalid delete request." }, { status: 400 });
    }

    const sql = getSql();
    await ensureHomeTable(sql);
    if (!(await canAccessHome(sql, request))) return privateResponse();

    await sql`
      DELETE FROM atlas_home_records
      WHERE property_id = ${HOME_PROPERTY_ID} AND id = ${id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not delete 4725 record." }, { status: 500 });
  }
}
