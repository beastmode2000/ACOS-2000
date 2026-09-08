import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

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

function cleanText(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function canEdit(request: NextRequest) {
  const role = cleanText(request.headers.get("x-atlas-user-role"), 80).toLowerCase();
  const email = cleanText(request.headers.get("x-atlas-user-email"), 200).toLowerCase();
  return (
    !email ||
    email === "nthornton87@yahoo.com" ||
    role === "master" ||
    role === "administrator" ||
    role === "manager"
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!canEdit(request)) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to change asset categories." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const assetId = cleanText(body.assetId, 220);
    const category = cleanText(body.category, 160);

    if (!assetId) {
      return NextResponse.json(
        { ok: false, error: "An asset is required." },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Enter a category or department." },
        { status: 400 },
      );
    }

    const sql = getSql();
    const rows = (await sql`
      UPDATE atlas_assets
      SET category = ${category}, updated_at = NOW()
      WHERE id = ${assetId}
        AND property_id = ${propertyId}
      RETURNING id, category, property_id
    `) as unknown as Array<{ id: string; category: string; property_id: string }>;

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "That asset was not found for the active property." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      assetId: rows[0].id,
      category: rows[0].category,
      propertyId: rows[0].property_id,
    });
  } catch (error) {
    console.error("Atlas asset category update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not update that asset category." },
      { status: 500 },
    );
  }
}
