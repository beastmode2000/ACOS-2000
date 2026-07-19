import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sqlClient() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

async function ensure(sql: ReturnType<typeof neon>) {
  await sql`CREATE TABLE IF NOT EXISTS atlas_backups (
    id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT NOW(), created_by text,
    reason text NOT NULL, snapshot jsonb NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS atlas_change_history (
    id bigserial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT NOW(), actor text,
    action text NOT NULL, table_name text NOT NULL, record_id text, record jsonb
  )`;
}

async function snapshot(sql: ReturnType<typeof neon>, reason: string, actor: string) {
  const rows = await sql`SELECT jsonb_build_object(
    'createdAt', NOW(),
    'vendors', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_vendors t),
    'assets', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_assets t),
    'contacts', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_contacts t),
    'procedures', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_procedures t),
    'workOrders', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_work_orders t),
    'calendar', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_calendar_items t),
    'documents', (SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM atlas_documents t)
  ) AS snapshot`;
  const id = `backup-${Date.now()}`;
  await sql`INSERT INTO atlas_backups (id, created_by, reason, snapshot) VALUES (${id}, ${actor}, ${reason}, ${JSON.stringify(rows[0]?.snapshot || {})}::jsonb)`;
  return id;
}

export async function GET(request: NextRequest) {
  try {
    const sql = sqlClient(); await ensure(sql);
    const today = await sql`SELECT id FROM atlas_backups WHERE created_at::date = CURRENT_DATE AND reason='automatic-daily' LIMIT 1`;
    if (!today.length) await snapshot(sql, "automatic-daily", request.headers.get("x-atlas-user-email") || "Atlas");
    const backups = await sql`SELECT id, created_at, created_by, reason FROM atlas_backups ORDER BY created_at DESC LIMIT 30`;
    const history = await sql`SELECT id, created_at, actor, action, table_name, record_id FROM atlas_change_history ORDER BY created_at DESC LIMIT 50`;
    return NextResponse.json({ ok:true, backups, history });
  } catch (error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Reliability center failed."},{status:500}); }
}

export async function POST(request: NextRequest) {
  try {
    const sql = sqlClient(); await ensure(sql);
    const id = await snapshot(sql, "manual", request.headers.get("x-atlas-user-email") || "Atlas");
    return NextResponse.json({ok:true,id});
  } catch (error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Backup failed."},{status:500}); }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    const sql = sqlClient(); await ensure(sql);
    const rows = await sql`SELECT snapshot FROM atlas_backups WHERE id=${id} LIMIT 1`;
    if (!rows.length) return NextResponse.json({ok:false,error:"Backup not found."},{status:404});
    return NextResponse.json({ok:true,snapshot:rows[0].snapshot});
  } catch (error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Backup download failed."},{status:500}); }
}
