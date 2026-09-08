import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactRecord = Record<string, unknown>;

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";
  if (!connectionString) throw new Error("Atlas database is not connected.");
  return neon(connectionString);
}

function cleanText(value: unknown, max = 220) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanContacts(value: unknown) {
  if (!Array.isArray(value)) return [] as ContactRecord[];
  return value
    .filter((item): item is ContactRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item) => ({ ...item }))
    .slice(0, 100);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_vendor_contact_sets (
      property_id text NOT NULL,
      vendor_id text NOT NULL,
      contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, vendor_id)
    )
  `;
}

export async function GET(request: NextRequest) {
  try {
    const propertyId = cleanText(request.nextUrl.searchParams.get("propertyId"), 80) || "2000";
    const vendorId = cleanText(request.nextUrl.searchParams.get("vendorId"), 220);
    const sql = getSql();
    await ensureTable(sql);

    if (vendorId) {
      const rows = (await sql`
        SELECT vendor_id, contacts, updated_at
        FROM atlas_vendor_contact_sets
        WHERE property_id = ${propertyId} AND vendor_id = ${vendorId}
        LIMIT 1
      `) as unknown as Array<{ vendor_id: string; contacts: ContactRecord[]; updated_at: string }>;
      return NextResponse.json({
        ok: true,
        vendorId,
        contacts: cleanContacts(rows[0]?.contacts),
        updatedAt: rows[0]?.updated_at || null,
      });
    }

    const rows = (await sql`
      SELECT vendor_id, contacts, updated_at
      FROM atlas_vendor_contact_sets
      WHERE property_id = ${propertyId}
      ORDER BY updated_at DESC
    `) as unknown as Array<{ vendor_id: string; contacts: ContactRecord[]; updated_at: string }>;

    const contactsByVendor = Object.fromEntries(
      rows.map((row) => [row.vendor_id, cleanContacts(row.contacts)]),
    );
    return NextResponse.json({ ok: true, propertyId, contactsByVendor });
  } catch (error) {
    console.error("Atlas vendor contact read failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not load vendor contacts." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const vendorId = cleanText(body.vendorId, 220);
    const contacts = cleanContacts(body.contacts);
    if (!vendorId) {
      return NextResponse.json({ ok: false, error: "Vendor is required." }, { status: 400 });
    }

    const sql = getSql();
    await ensureTable(sql);

    const vendorRows = (await sql`
      SELECT id
      FROM atlas_vendors
      WHERE id = ${vendorId} AND property_id = ${propertyId}
      LIMIT 1
    `) as unknown as Array<{ id: string }>;
    if (!vendorRows.length) {
      return NextResponse.json({ ok: false, error: "Vendor was not found for this property." }, { status: 404 });
    }

    await sql`
      INSERT INTO atlas_vendor_contact_sets (property_id, vendor_id, contacts, updated_at)
      VALUES (${propertyId}, ${vendorId}, ${JSON.stringify(contacts)}::jsonb, NOW())
      ON CONFLICT (property_id, vendor_id)
      DO UPDATE SET contacts = EXCLUDED.contacts, updated_at = NOW()
    `;

    const verifyRows = (await sql`
      SELECT contacts
      FROM atlas_vendor_contact_sets
      WHERE property_id = ${propertyId} AND vendor_id = ${vendorId}
      LIMIT 1
    `) as unknown as Array<{ contacts: ContactRecord[] }>;
    const saved = cleanContacts(verifyRows[0]?.contacts);

    if (saved.length !== contacts.length) {
      return NextResponse.json(
        { ok: false, error: "Vendor contacts did not verify after save." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, vendorId, contacts: saved });
  } catch (error) {
    console.error("Atlas vendor contact save failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not save vendor contacts." },
      { status: 500 },
    );
  }
}
