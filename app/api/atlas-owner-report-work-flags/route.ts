import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function cleanPropertyId(value: unknown) {
  const id = String(value || "2000").trim().toLowerCase();
  return ["2000", "6855", "3661", "hangar"].includes(id) ? id : "2000";
}

function cleanImage(value: unknown) {
  const result = String(value || "").trim();
  if (!result.startsWith("data:image/") && !/^https?:\/\//i.test(result)) return "";
  return result.slice(0, 8_000_000);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_owner_report_work_flags (
      property_id text NOT NULL,
      work_key text NOT NULL,
      title text NOT NULL DEFAULT '',
      work_date date,
      person text NOT NULL DEFAULT '',
      highlight boolean NOT NULL DEFAULT false,
      owner_attention boolean NOT NULL DEFAULT false,
      before_photo text NOT NULL DEFAULT '',
      after_photo text NOT NULL DEFAULT '',
      general_photo text NOT NULL DEFAULT '',
      before_caption text NOT NULL DEFAULT '',
      after_caption text NOT NULL DEFAULT '',
      general_caption text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, work_key)
    )
  `;
}

function mapRow(row: Row) {
  return {
    propertyId: String(row.property_id || "2000"),
    workKey: String(row.work_key || ""),
    title: String(row.title || ""),
    date: String(row.work_date || "").slice(0, 10),
    person: String(row.person || ""),
    highlight: row.highlight === true,
    ownerAttention: row.owner_attention === true,
    beforePhoto: String(row.before_photo || ""),
    afterPhoto: String(row.after_photo || ""),
    generalPhoto: String(row.general_photo || ""),
    beforeCaption: String(row.before_caption || ""),
    afterCaption: String(row.after_caption || ""),
    generalCaption: String(row.general_caption || ""),
  };
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const propertyId = cleanPropertyId(request.nextUrl.searchParams.get("propertyId"));
    const rows = await sql`
      SELECT property_id, work_key, title, work_date, person, highlight, owner_attention,
             before_photo, after_photo, general_photo,
             before_caption, after_caption, general_caption
      FROM atlas_owner_report_work_flags
      WHERE property_id = ${propertyId}
      ORDER BY work_date DESC NULLS LAST, updated_at DESC
      LIMIT 1000
    `;
    return NextResponse.json({ ok: true, propertyId, flags: (rows as unknown as Row[]).map(mapRow) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner report work flags could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = (await request.json().catch(() => ({}))) as Row;
    const propertyId = cleanPropertyId(body.propertyId);
    const workKey = String(body.workKey || "").trim().slice(0, 1000);
    if (!workKey) return NextResponse.json({ ok: false, error: "Work key is required." }, { status: 400 });
    const title = String(body.title || "").slice(0, 500);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? String(body.date) : null;
    const person = String(body.person || "").slice(0, 160);
    const highlight = body.highlight === true;
    const ownerAttention = body.ownerAttention === true;
    const beforePhoto = cleanImage(body.beforePhoto);
    const afterPhoto = cleanImage(body.afterPhoto);
    const generalPhoto = cleanImage(body.generalPhoto);
    const beforeCaption = String(body.beforeCaption || "").slice(0, 500);
    const afterCaption = String(body.afterCaption || "").slice(0, 500);
    const generalCaption = String(body.generalCaption || "").slice(0, 500);

    await sql`
      INSERT INTO atlas_owner_report_work_flags (
        property_id, work_key, title, work_date, person, highlight, owner_attention,
        before_photo, after_photo, general_photo,
        before_caption, after_caption, general_caption, updated_at
      ) VALUES (
        ${propertyId}, ${workKey}, ${title}, ${date}::date, ${person}, ${highlight}, ${ownerAttention},
        ${beforePhoto}, ${afterPhoto}, ${generalPhoto},
        ${beforeCaption}, ${afterCaption}, ${generalCaption}, NOW()
      )
      ON CONFLICT (property_id, work_key) DO UPDATE SET
        title = EXCLUDED.title,
        work_date = EXCLUDED.work_date,
        person = EXCLUDED.person,
        highlight = EXCLUDED.highlight,
        owner_attention = EXCLUDED.owner_attention,
        before_photo = EXCLUDED.before_photo,
        after_photo = EXCLUDED.after_photo,
        general_photo = EXCLUDED.general_photo,
        before_caption = EXCLUDED.before_caption,
        after_caption = EXCLUDED.after_caption,
        general_caption = EXCLUDED.general_caption,
        updated_at = NOW()
    `;

    return NextResponse.json({ ok: true, flag: { propertyId, workKey, title, date: date || "", person, highlight, ownerAttention, beforePhoto, afterPhoto, generalPhoto, beforeCaption, afterCaption, generalCaption } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Owner report work flag could not be saved." }, { status: 500 });
  }
}
