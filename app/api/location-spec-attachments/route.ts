import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PROPERTY_ID = "2000";

type AttachmentKind = "image" | "document";

type AttachmentRow = {
  id: string;
  property_id: string;
  location_name: string;
  spec_key: string;
  file_url: string;
  file_name: string;
  content_type: string;
  attachment_kind: AttachmentKind;
  created_at: string;
};

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";
  if (!connectionString) throw new Error("Atlas database is not connected.");
  return neon(connectionString);
}

function cleanText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanPropertyId(value: unknown) {
  return cleanText(value, 80) || DEFAULT_PROPERTY_ID;
}

function isSafeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_location_spec_attachments (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      location_name text NOT NULL,
      spec_key text NOT NULL,
      file_url text NOT NULL,
      file_name text NOT NULL DEFAULT '',
      content_type text NOT NULL DEFAULT '',
      attachment_kind text NOT NULL DEFAULT 'document',
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS atlas_location_spec_attachments_lookup_idx
    ON atlas_location_spec_attachments(property_id, location_name, spec_key, created_at)
  `;
}

function normalizeRow(row: AttachmentRow) {
  return {
    id: String(row.id || ""),
    propertyId: String(row.property_id || DEFAULT_PROPERTY_ID),
    locationName: String(row.location_name || ""),
    specKey: String(row.spec_key || ""),
    url: String(row.file_url || ""),
    name: String(row.file_name || "Attachment"),
    contentType: String(row.content_type || ""),
    kind: row.attachment_kind === "image" ? "image" : "document",
    createdAt: String(row.created_at || ""),
  };
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const url = new URL(request.url);
    const propertyId = cleanPropertyId(url.searchParams.get("propertyId"));
    const locationName = cleanText(url.searchParams.get("locationName"), 220);
    const specKey = cleanText(url.searchParams.get("specKey"), 240);

    if (!locationName || !specKey) {
      return NextResponse.json(
        { ok: false, error: "Location and specification are required." },
        { status: 400 },
      );
    }

    const rows = (await sql`
      SELECT id, property_id, location_name, spec_key, file_url, file_name,
             content_type, attachment_kind, created_at
      FROM atlas_location_spec_attachments
      WHERE property_id = ${propertyId}
        AND location_name = ${locationName}
        AND spec_key = ${specKey}
      ORDER BY created_at ASC
    `) as AttachmentRow[];

    return NextResponse.json({ ok: true, attachments: rows.map(normalizeRow) });
  } catch (error) {
    console.error("Location specification attachment read failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not load specification attachments." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanPropertyId(body.propertyId);
    const locationName = cleanText(body.locationName, 220);
    const specKey = cleanText(body.specKey, 240);
    const fileUrl = cleanText(body.url, 2000);
    const fileName = cleanText(body.name, 500) || "Attachment";
    const contentType = cleanText(body.contentType, 180);
    const kind: AttachmentKind = body.kind === "image" ? "image" : "document";

    if (!locationName || !specKey || !fileUrl || !isSafeUrl(fileUrl)) {
      return NextResponse.json(
        { ok: false, error: "A valid location, specification, and uploaded file are required." },
        { status: 400 },
      );
    }

    const id = `spec-attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const rows = (await sql`
      INSERT INTO atlas_location_spec_attachments (
        id, property_id, location_name, spec_key, file_url, file_name,
        content_type, attachment_kind, created_at
      ) VALUES (
        ${id}, ${propertyId}, ${locationName}, ${specKey}, ${fileUrl}, ${fileName},
        ${contentType}, ${kind}, NOW()
      )
      RETURNING id, property_id, location_name, spec_key, file_url, file_name,
                content_type, attachment_kind, created_at
    `) as AttachmentRow[];

    return NextResponse.json({ ok: true, attachment: normalizeRow(rows[0]) });
  } catch (error) {
    console.error("Location specification attachment save failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not save the specification attachment." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const id = cleanText(body.id, 220);
    const propertyId = cleanPropertyId(body.propertyId);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Attachment id is required." }, { status: 400 });
    }

    await sql`
      DELETE FROM atlas_location_spec_attachments
      WHERE id = ${id} AND property_id = ${propertyId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Location specification attachment delete failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not delete the specification attachment." },
      { status: 500 },
    );
  }
}
