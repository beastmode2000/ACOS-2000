import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { answerAskAtlasFree } from "../ask-atlas/free-answer";

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

function clean(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function propertyIdFrom(value: unknown) {
  const id = clean(value, 40).toLowerCase() || "2000";
  return VALID_PROPERTIES.has(id) ? id : "";
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_ask_atlas_shares (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      share_token text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      last_used_at timestamptz
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS atlas_ask_atlas_shares_property_active_idx
    ON atlas_ask_atlas_shares(property_id)
    WHERE active = true
  `;
}

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function rowRecord(row: Row) {
  return asRecord(row.record);
}

function str(value: unknown) {
  return String(value ?? "").trim();
}

async function publicSnapshot(sql: ReturnType<typeof neon>, propertyId: string) {
  const [
    locationRows,
    vendorRows,
    assetRows,
    workRows,
    calendarRows,
    procedureRows,
    documentRows,
    partRows,
  ] = await Promise.all([
    sql`SELECT to_jsonb(t) AS record FROM atlas_locations t WHERE property_id = ${propertyId} ORDER BY name ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_vendors t WHERE property_id = ${propertyId} ORDER BY name ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_assets t WHERE property_id = ${propertyId} ORDER BY name ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_work_orders t WHERE property_id = ${propertyId} ORDER BY COALESCE(due_date_value, date) ASC NULLS LAST, title ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_calendar_items t WHERE property_id = ${propertyId} ORDER BY COALESCE(item_date, date) ASC NULLS LAST, title ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_procedures t WHERE property_id = ${propertyId} ORDER BY title ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_documents t WHERE property_id = ${propertyId} ORDER BY title ASC`,
    sql`SELECT to_jsonb(t) AS record FROM atlas_parts t WHERE property_id = ${propertyId} ORDER BY name ASC`,
  ]);

  const locations = (locationRows as unknown as Row[]).map(rowRecord);
  const vendors = (vendorRows as unknown as Row[]).map(rowRecord);
  const assets = (assetRows as unknown as Row[]).map(rowRecord);

  const locationNames = new Map(locations.map((row) => [str(row.id), str(row.name)]));
  const vendorNames = new Map(vendors.map((row) => [str(row.id), str(row.name)]));
  const assetNames = new Map(assets.map((row) => [str(row.id), str(row.name)]));

  const safeLocations = locations.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    type: str(row.type),
    zone: str(row.zone),
    notes: str(row.notes),
  }));

  const safeVendors = vendors.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    category: str(row.category),
    phone: str(row.phone),
    email: str(row.email),
    website: str(row.website),
    notes: str(row.notes),
  }));

  const safeAssets = assets.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    category: str(row.category),
    status: str(row.status),
    make: str(row.make || row.manufacturer),
    manufacturer: str(row.manufacturer),
    model: str(row.model),
    year: str(row.year),
    locationName: locationNames.get(str(row.location_id)) || "",
    notes: str(row.notes),
  }));

  const workOrders = (workRows as unknown as Row[]).map(rowRecord).map((row) => ({
    id: str(row.id),
    title: str(row.title),
    status: str(row.status),
    priority: str(row.priority),
    date: str(row.due_date_value || row.date).slice(0, 10),
    followUpDate: str(row.follow_up_date).slice(0, 10),
    locationName: locationNames.get(str(row.location_id)) || "",
    assetName: assetNames.get(str(row.asset_id)) || "",
    vendorName: vendorNames.get(str(row.vendor_id)) || "",
    assignedTo: str(row.assigned_to),
    workType: str(row.work_type),
    workCategory: str(row.work_category),
    notes: str(row.notes),
  }));

  const calendarItems = (calendarRows as unknown as Row[]).map(rowRecord).map((row) => ({
    id: str(row.id),
    title: str(row.title),
    date: str(row.item_date || row.date).slice(0, 10),
    time: str(row.time),
    area: str(row.area),
    category: str(row.category_label),
    status: str(row.status),
    notes: str(row.notes),
  }));

  const procedures = (procedureRows as unknown as Row[]).map(rowRecord).map((row) => ({
    id: str(row.id),
    title: str(row.title),
    area: str(row.area),
    category: str(row.category),
    status: str(row.status),
    priority: str(row.priority),
    purpose: str(row.purpose),
    safetyNotes: str(row.safety_notes),
    estimatedTime: str(row.estimated_time),
  }));

  const documents = (documentRows as unknown as Row[]).map(rowRecord).map((tableRow) => {
    const row = tableRow.record && typeof tableRow.record === "object"
      ? asRecord(tableRow.record)
      : tableRow;
    return {
      id: str(row.id),
      title: str(row.title || row.name),
      area: str(row.area),
      type: str(row.type),
      notes: str(row.notes),
    };
  });

  const parts = (partRows as unknown as Row[]).map(rowRecord).map((row) => ({
    id: str(row.id),
    name: str(row.name),
    category: str(row.category),
    status: str(row.status),
    quantity: Number(row.quantity || 0),
    minimumQuantity: Number(row.min_quantity || 0),
    locationName: locationNames.get(str(row.location_id)) || "",
    assetName: assetNames.get(str(row.asset_id)) || "",
    vendorName: vendorNames.get(str(row.vendor_id)) || "",
    notes: str(row.notes),
  }));

  return {
    propertyId,
    locations: safeLocations,
    vendors: safeVendors,
    assets: safeAssets,
    workOrders,
    calendarItems,
    procedures,
    documents,
    parts,
    counts: {
      assets: safeAssets.length,
      locations: safeLocations.length,
      vendors: safeVendors.length,
      workOrders: workOrders.length,
      calendarItems: calendarItems.length,
      procedures: procedures.length,
      documents: documents.length,
      parts: parts.length,
    },
  };
}

async function validShare(sql: ReturnType<typeof neon>, token: string) {
  if (!token || token.length < 24 || token.length > 200) return null;
  const rows = (await sql`
    SELECT id, property_id, share_token
    FROM atlas_ask_atlas_shares
    WHERE share_token = ${token}
      AND active = true
    LIMIT 1
  `) as unknown as Row[];
  return rows[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const token = clean(request.nextUrl.searchParams.get("token"), 200);
    if (token) {
      const share = await validShare(sql, token);
      if (!share) {
        return NextResponse.json(
          { ok: false, error: "This Ask Atlas link is invalid or no longer active." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { ok: true, propertyId: str(share.property_id) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const propertyId = propertyIdFrom(request.nextUrl.searchParams.get("propertyId"));
    if (!propertyId) {
      return NextResponse.json({ ok: false, error: "Invalid property." }, { status: 400 });
    }

    let rows = (await sql`
      SELECT share_token
      FROM atlas_ask_atlas_shares
      WHERE property_id = ${propertyId}
        AND active = true
      LIMIT 1
    `) as unknown as Row[];

    if (!rows.length) {
      const shareToken = randomBytes(32).toString("hex");
      rows = (await sql`
        INSERT INTO atlas_ask_atlas_shares (
          id, property_id, share_token, active, created_at, updated_at
        ) VALUES (
          ${`ask-share-${propertyId}-${Date.now()}`},
          ${propertyId},
          ${shareToken},
          true,
          NOW(),
          NOW()
        )
        RETURNING share_token
      `) as unknown as Row[];
    }

    return NextResponse.json({
      ok: true,
      propertyId,
      token: str(rows[0]?.share_token),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ask Atlas share link could not load." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const token = clean(request.nextUrl.searchParams.get("token"), 200);
    const share = await validShare(sql, token);
    if (!share) {
      return NextResponse.json(
        { ok: false, error: "This Ask Atlas link is invalid or no longer active." },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Row;
    const question = clean(body.question, 800);
    if (!question) {
      return NextResponse.json({ ok: false, error: "Type a question first." }, { status: 400 });
    }

    const propertyId = propertyIdFrom(share.property_id);
    if (!propertyId) {
      return NextResponse.json({ ok: false, error: "This shared property is unavailable." }, { status: 400 });
    }

    const snapshot = await publicSnapshot(sql, propertyId);
    const result = answerAskAtlasFree(question, snapshot);

    await sql`
      UPDATE atlas_ask_atlas_shares
      SET last_used_at = NOW(), updated_at = NOW()
      WHERE id = ${str(share.id)}
    `;

    return NextResponse.json(
      { ok: true, propertyId, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ask Atlas could not answer that question." },
      { status: 500 },
    );
  }
}
