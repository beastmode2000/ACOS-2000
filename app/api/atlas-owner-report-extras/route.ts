import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function cleanPropertyId(value: unknown) {
  const id = String(value || "2000").trim().toLowerCase();
  return ["2000", "6855", "3661", "hangar"].includes(id) ? id : "2000";
}

function cleanDate(value: unknown) {
  const result = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : "";
}

function cleanTextList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim().slice(0, 1500)).filter(Boolean).slice(0, 8);
}

function cleanImage(value: unknown) {
  const result = String(value || "").trim();
  if (!result.startsWith("data:image/") && !/^https?:\/\//i.test(result)) return "";
  return result.slice(0, 8_000_000);
}

function cleanPhotos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((entry, index) => {
    const row = entry && typeof entry === "object" ? (entry as Row) : {};
    return {
      id: String(row.id || `report-photo-${index}`).slice(0, 240),
      sourceId: String(row.sourceId || "").slice(0, 240),
      title: String(row.title || "").slice(0, 500),
      date: cleanDate(row.date),
      person: String(row.person || "").slice(0, 160),
      beforePhoto: cleanImage(row.beforePhoto),
      afterPhoto: cleanImage(row.afterPhoto),
      beforeCaption: String(row.beforeCaption || "").slice(0, 500),
      afterCaption: String(row.afterCaption || "").slice(0, 500),
    };
  }).filter((row) => Boolean(row.title && row.date && (row.beforePhoto || row.afterPhoto)));
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_owner_report_extras (
      property_id text NOT NULL,
      period_start date NOT NULL,
      period_end date NOT NULL,
      highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
      owner_attention jsonb NOT NULL DEFAULT '[]'::jsonb,
      work_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, period_start, period_end)
    )
  `;
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const propertyId = cleanPropertyId(request.nextUrl.searchParams.get("propertyId"));
    const periodStart = cleanDate(request.nextUrl.searchParams.get("periodStart"));
    const periodEnd = cleanDate(request.nextUrl.searchParams.get("periodEnd"));
    if (!periodStart || !periodEnd) {
      return NextResponse.json({ ok: true, propertyId, highlights: [], ownerAttention: [], workPhotos: [] });
    }
    const rows = await sql`
      SELECT highlights, owner_attention, work_photos, updated_at
      FROM atlas_owner_report_extras
      WHERE property_id = ${propertyId}
        AND period_start = ${periodStart}::date
        AND period_end = ${periodEnd}::date
      LIMIT 1
    `;
    const row = (rows as unknown as Row[])[0];
    return NextResponse.json({
      ok: true,
      propertyId,
      highlights: Array.isArray(row?.highlights) ? row.highlights : [],
      ownerAttention: Array.isArray(row?.owner_attention) ? row.owner_attention : [],
      workPhotos: Array.isArray(row?.work_photos) ? row.work_photos : [],
      updatedAt: row?.updated_at ? new Date(String(row.updated_at)).toISOString() : "",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner report extras could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = (await request.json().catch(() => ({}))) as Row;
    const propertyId = cleanPropertyId(body.propertyId);
    const periodStart = cleanDate(body.periodStart);
    const periodEnd = cleanDate(body.periodEnd);
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      return NextResponse.json({ ok: false, error: "Valid report dates are required." }, { status: 400 });
    }
    const highlights = cleanTextList(body.highlights);
    const ownerAttention = cleanTextList(body.ownerAttention);
    const workPhotos = cleanPhotos(body.workPhotos);
    await sql`
      INSERT INTO atlas_owner_report_extras (
        property_id, period_start, period_end, highlights, owner_attention, work_photos, updated_at
      ) VALUES (
        ${propertyId}, ${periodStart}::date, ${periodEnd}::date,
        ${JSON.stringify(highlights)}::jsonb,
        ${JSON.stringify(ownerAttention)}::jsonb,
        ${JSON.stringify(workPhotos)}::jsonb,
        NOW()
      )
      ON CONFLICT (property_id, period_start, period_end) DO UPDATE SET
        highlights = EXCLUDED.highlights,
        owner_attention = EXCLUDED.owner_attention,
        work_photos = EXCLUDED.work_photos,
        updated_at = NOW()
    `;
    return NextResponse.json({ ok: true, propertyId, highlights, ownerAttention, workPhotos });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner report extras could not be saved." }, { status: 500 });
  }
}
