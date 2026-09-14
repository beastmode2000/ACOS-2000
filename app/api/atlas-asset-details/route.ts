import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;

type CustomDetail = {
  id: string;
  label: string;
  value: string;
};

type InfoField = {
  key: string;
  label: string;
  visible: boolean;
};

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

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanDetails(value: unknown): CustomDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 25)
    .map((entry, index) => {
      const row = entry && typeof entry === "object" ? (entry as Row) : {};
      return {
        id: cleanText(row.id, 200) || `asset-detail-${index + 1}`,
        label: cleanText(row.label, 200),
        value: cleanText(row.value, 2000),
      };
    })
    .filter((detail) => detail.label || detail.value);
}

function cleanInfoFields(value: unknown): InfoField[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((entry) => {
      const row = entry && typeof entry === "object" ? (entry as Row) : {};
      return {
        key: cleanText(row.key, 100).toLowerCase(),
        label: cleanText(row.label, 200),
        visible: row.visible !== false,
      };
    })
    .filter((field) => field.key);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_asset_details (
      property_id text NOT NULL DEFAULT '2000',
      asset_id text NOT NULL,
      license_plate text NOT NULL DEFAULT '',
      custom_details jsonb NOT NULL DEFAULT '[]'::jsonb,
      info_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, asset_id)
    )
  `;
  await sql`ALTER TABLE atlas_asset_details ADD COLUMN IF NOT EXISTS info_fields jsonb NOT NULL DEFAULT '[]'::jsonb`;
}

function mapRow(row: Row | undefined, propertyId: string, assetId: string) {
  return {
    propertyId,
    assetId,
    licensePlate: String(row?.license_plate || ""),
    customDetails: Array.isArray(row?.custom_details) ? row?.custom_details : [],
    infoFields: Array.isArray(row?.info_fields) ? row?.info_fields : [],
    updatedAt: row?.updated_at ? new Date(String(row.updated_at)).toISOString() : "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const propertyId = propertyIdFrom(request.nextUrl.searchParams.get("propertyId"));
    if (!propertyId) {
      return NextResponse.json({ ok: false, error: "Invalid property ID." }, { status: 400 });
    }
    const assetId = cleanText(request.nextUrl.searchParams.get("assetId"), 240);
    if (!assetId) {
      return NextResponse.json({ ok: false, error: "Asset id is required." }, { status: 400 });
    }

    const sql = getSql();
    await ensureTable(sql);
    const rows = await sql`
      SELECT property_id, asset_id, license_plate, custom_details, info_fields, updated_at
      FROM atlas_asset_details
      WHERE property_id = ${propertyId} AND asset_id = ${assetId}
      LIMIT 1
    `;

    return NextResponse.json(
      { ok: true, details: mapRow(rows[0] as Row | undefined, propertyId, assetId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Asset details could not load." },
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
    const assetId = cleanText(body.assetId, 240);
    if (!assetId) {
      return NextResponse.json({ ok: false, error: "Asset id is required." }, { status: 400 });
    }

    const licensePlate = cleanText(body.licensePlate, 100);
    const customDetails = cleanDetails(body.customDetails);
    const infoFields = cleanInfoFields(body.infoFields);
    const sql = getSql();
    await ensureTable(sql);

    const rows = await sql`
      INSERT INTO atlas_asset_details (
        property_id, asset_id, license_plate, custom_details, info_fields, created_at, updated_at
      ) VALUES (
        ${propertyId}, ${assetId}, ${licensePlate}, ${JSON.stringify(customDetails)}::jsonb, ${JSON.stringify(infoFields)}::jsonb, NOW(), NOW()
      )
      ON CONFLICT (property_id, asset_id) DO UPDATE SET
        license_plate = EXCLUDED.license_plate,
        custom_details = EXCLUDED.custom_details,
        info_fields = EXCLUDED.info_fields,
        updated_at = NOW()
      RETURNING property_id, asset_id, license_plate, custom_details, info_fields, updated_at
    `;

    return NextResponse.json({
      ok: true,
      details: mapRow(rows[0] as Row, propertyId, assetId),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Asset details could not save." },
      { status: 500 },
    );
  }
}
