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

function cleanItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2500).map((entry, index) => {
    const row = entry && typeof entry === "object" ? (entry as Row) : {};
    return {
      id: String(row.id || `owner-report-item-${index}`),
      sourceKey: String(row.sourceKey || ""),
      sourceType: String(row.sourceType || "Manual"),
      sourceId: String(row.sourceId || ""),
      date: cleanDate(row.date),
      person: String(row.person || "").slice(0, 160),
      department: String(row.department || "Other").slice(0, 160),
      title: String(row.title || "").slice(0, 500),
      notes: String(row.notes || "").slice(0, 5000),
    };
  }).filter((item) => Boolean(item.date || item.title || item.notes));
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_owner_reports (
      id text PRIMARY KEY,
      property_id text NOT NULL DEFAULT '2000',
      period_start date NOT NULL,
      period_end date NOT NULL,
      title text NOT NULL,
      status text NOT NULL DEFAULT 'Draft',
      items jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS atlas_owner_reports_property_period_idx
    ON atlas_owner_reports(property_id, period_end DESC, period_start DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_owner_report_exclusions (
      property_id text NOT NULL,
      source_key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, source_key)
    )
  `;
}

function mapReport(row: Row) {
  return {
    id: String(row.id || ""),
    propertyId: String(row.property_id || "2000"),
    periodStart: cleanDate(row.period_start),
    periodEnd: cleanDate(row.period_end),
    title: String(row.title || "Owner Report"),
    status: String(row.status || "Draft") === "Final" ? "Final" : "Draft",
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : "",
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const propertyId = cleanPropertyId(request.nextUrl.searchParams.get("propertyId"));
    const rows = await sql`
      SELECT id, property_id, period_start, period_end, title, status, items, created_at, updated_at
      FROM atlas_owner_reports
      WHERE property_id = ${propertyId}
      ORDER BY period_end DESC, updated_at DESC
      LIMIT 104
    `;
    const exclusionRows = await sql`
      SELECT source_key
      FROM atlas_owner_report_exclusions
      WHERE property_id = ${propertyId}
    `;
    return NextResponse.json(
      {
        ok: true,
        propertyId,
        reports: (rows as unknown as Row[]).map(mapReport),
        excludedSourceKeys: (exclusionRows as unknown as Row[]).map((row) => String(row.source_key || "")).filter(Boolean),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Owner reports could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = await request.json().catch(() => ({})) as Row;
    const propertyId = cleanPropertyId(body.propertyId);
    if (String(body.action || "") === "exclude-item") {
      const sourceKey = String(body.sourceKey || "").trim().slice(0, 1000);
      if (!sourceKey) {
        return NextResponse.json({ ok: false, error: "Report item source is required." }, { status: 400 });
      }
      await sql`
        INSERT INTO atlas_owner_report_exclusions (property_id, source_key, created_at)
        VALUES (${propertyId}, ${sourceKey}, NOW())
        ON CONFLICT (property_id, source_key) DO NOTHING
      `;
      return NextResponse.json({ ok: true, propertyId, sourceKey });
    }
    const periodStart = cleanDate(body.periodStart);
    const periodEnd = cleanDate(body.periodEnd);

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ ok: false, error: "Report start and end dates are required." }, { status: 400 });
    }
    if (periodEnd < periodStart) {
      return NextResponse.json({ ok: false, error: "Report end date cannot be before the start date." }, { status: 400 });
    }

    const id = String(body.id || `owner-report-${propertyId}-${periodStart}-${periodEnd}`).trim().slice(0, 240);
    const title = String(body.title || `Owner Report ${periodStart}–${periodEnd}`).trim().slice(0, 500);
    const status = String(body.status || "Draft") === "Final" ? "Final" : "Draft";
    const items = cleanItems(body.items);

    await sql`
      INSERT INTO atlas_owner_reports (
        id, property_id, period_start, period_end, title, status, items, created_at, updated_at
      ) VALUES (
        ${id}, ${propertyId}, ${periodStart}::date, ${periodEnd}::date, ${title}, ${status},
        ${JSON.stringify(items)}::jsonb, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        property_id = EXCLUDED.property_id,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        items = EXCLUDED.items,
        updated_at = NOW()
    `;

    return NextResponse.json({ ok: true, id, propertyId, itemCount: items.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Owner report could not be saved." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const id = String(request.nextUrl.searchParams.get("id") || "").trim();
    const propertyId = cleanPropertyId(request.nextUrl.searchParams.get("propertyId"));
    if (!id) return NextResponse.json({ ok: false, error: "Report id is required." }, { status: 400 });

    const rows = await sql`
      DELETE FROM atlas_owner_reports
      WHERE id = ${id} AND property_id = ${propertyId}
      RETURNING id
    `;
    return NextResponse.json({ ok: true, deleted: (rows as unknown as Row[]).length > 0 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Saved report could not be deleted." },
      { status: 500 },
    );
  }
}
