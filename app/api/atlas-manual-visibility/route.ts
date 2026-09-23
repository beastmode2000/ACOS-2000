import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;

const VALID_PROPERTIES = new Set(["2000", "6855", "3661", "hangar"]);

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function propertyIdFrom(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "2000";
  return VALID_PROPERTIES.has(raw) ? raw : "";
}

function cleanKey(value: unknown) {
  return String(value || "").trim().slice(0, 2000);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_manual_visibility (
      property_id text NOT NULL,
      manual_key text NOT NULL,
      title text NOT NULL DEFAULT '',
      hidden boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, manual_key)
    )
  `;
}

export async function GET(request: NextRequest) {
  try {
    const propertyId = propertyIdFrom(request.nextUrl.searchParams.get("propertyId"));
    if (!propertyId) {
      return NextResponse.json({ ok: false, error: "Invalid property ID." }, { status: 400 });
    }

    const sql = getSql();
    await ensureTable(sql);
    const rows = await sql`
      SELECT manual_key
      FROM atlas_manual_visibility
      WHERE property_id = ${propertyId}
        AND hidden = true
      ORDER BY updated_at DESC
      LIMIT 2000
    `;

    return NextResponse.json(
      {
        ok: true,
        propertyId,
        hiddenKeys: (rows as unknown as Row[])
          .map((row) => String(row.manual_key || ""))
          .filter(Boolean),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Manual visibility could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Row;
    const propertyId = propertyIdFrom(body.propertyId);
    if (!propertyId) {
      return NextResponse.json({ ok: false, error: "Invalid property ID." }, { status: 400 });
    }

    const manualKey = cleanKey(body.manualKey);
    if (!manualKey) {
      return NextResponse.json({ ok: false, error: "Manual key is required." }, { status: 400 });
    }

    const title = String(body.title || "").trim().slice(0, 500);
    const hidden = body.hidden !== false;
    const sql = getSql();
    await ensureTable(sql);

    await sql`
      INSERT INTO atlas_manual_visibility (
        property_id, manual_key, title, hidden, updated_at
      ) VALUES (
        ${propertyId}, ${manualKey}, ${title}, ${hidden}, NOW()
      )
      ON CONFLICT (property_id, manual_key) DO UPDATE SET
        title = EXCLUDED.title,
        hidden = EXCLUDED.hidden,
        updated_at = NOW()
    `;

    return NextResponse.json({
      ok: true,
      propertyId,
      manualKey,
      title,
      hidden,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Manual visibility could not be saved.",
      },
      { status: 500 },
    );
  }
}
