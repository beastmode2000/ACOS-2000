import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPAIR_TOKEN = "6cdd29f8d2f24cb6a2e94e5f0b9f72db";
const PROPERTY_ID = "2000";

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function allowed(request: NextRequest) {
  return request.nextUrl.searchParams.get("token") === REPAIR_TOKEN;
}

function isExcludedTitle(title: string) {
  const text = title.toLowerCase();
  return [
    "pool",
    "spa",
    "hot tub",
    "garage door",
    "vehicle",
    "ford",
    "rivian",
    "porsche",
    "mercedes",
    "sea-doo",
    "seadoo",
    "boat",
    "watercraft",
    "irrigation",
    "sprinkler",
  ].some((term) => text.includes(term));
}

function isAnnualRow(row: Record<string, unknown>) {
  const title = String(row.title || "").toLowerCase();
  const unit = String(row.recurrence_unit || "").toLowerCase();
  return (
    title.includes("annual") ||
    title.includes("yearly") ||
    unit === "year" ||
    unit === "years" ||
    unit === "annual" ||
    unit === "annually" ||
    unit === "yearly"
  );
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const sql = getSql();
    const apply = request.nextUrl.searchParams.get("apply") === "1";
    const mappingsParam = request.nextUrl.searchParams.get("mappings") || "";

    if (apply) {
      const pairs = mappingsParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.split(":"))
        .filter((pair) => pair.length === 2 && pair[0] && pair[1]);

      const updated: Array<{ workOrderId: string; assetId: string }> = [];

      for (const [workOrderId, assetId] of pairs) {
        const workRows = (await sql`
          SELECT id, title, asset_id, recurrence_unit
          FROM atlas_work_orders
          WHERE id = ${workOrderId}
            AND property_id = ${PROPERTY_ID}
          LIMIT 1
        `) as unknown as Record<string, unknown>[];
        const assetRows = (await sql`
          SELECT id
          FROM atlas_assets
          WHERE id = ${assetId}
            AND property_id = ${PROPERTY_ID}
          LIMIT 1
        `) as unknown as Record<string, unknown>[];

        const work = workRows[0];
        if (!work || !assetRows[0]) continue;
        if (String(work.asset_id || "").trim()) continue;
        if (!isAnnualRow(work)) continue;
        if (isExcludedTitle(String(work.title || ""))) continue;

        await sql`
          UPDATE atlas_work_orders
          SET asset_id = ${assetId}
          WHERE id = ${workOrderId}
            AND property_id = ${PROPERTY_ID}
            AND (asset_id IS NULL OR asset_id = '')
        `;
        updated.push({ workOrderId, assetId });
      }

      return NextResponse.json({ ok: true, applied: true, updated });
    }

    const workOrders = (await sql`
      SELECT
        id,
        title,
        location_id,
        asset_id,
        recurring,
        recurrence_unit,
        recurrence_interval,
        status,
        date,
        due_date_value
      FROM atlas_work_orders
      WHERE property_id = ${PROPERTY_ID}
        AND (asset_id IS NULL OR asset_id = '')
        AND (
          lower(COALESCE(title, '')) LIKE '%annual%'
          OR lower(COALESCE(title, '')) LIKE '%yearly%'
          OR lower(COALESCE(recurrence_unit, '')) IN ('year','years','annual','annually','yearly')
        )
      ORDER BY lower(title), id
    `) as unknown as Record<string, unknown>[];

    const assets = (await sql`
      SELECT id, name, location_id, location_ids, category, status, make, model
      FROM atlas_assets
      WHERE property_id = ${PROPERTY_ID}
      ORDER BY lower(name), id
    `) as unknown as Record<string, unknown>[];

    const locations = (await sql`
      SELECT id, name, parent_id
      FROM atlas_locations
      WHERE property_id = ${PROPERTY_ID}
      ORDER BY lower(name), id
    `) as unknown as Record<string, unknown>[];

    return NextResponse.json({
      ok: true,
      propertyId: PROPERTY_ID,
      workOrders: workOrders.map((row) => ({
        ...row,
        excluded: isExcludedTitle(String(row.title || "")),
      })),
      assets,
      locations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Repair read failed",
      },
      { status: 500 },
    );
  }
}
