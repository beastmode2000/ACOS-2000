import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AtlasDocumentRecord = {
  id?: string;
  title?: string;
  area?: string;
  type?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  notes?: string;
  pastedText?: string;
  files?: unknown[];
  createdAt?: string;
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
}

function sanitizeDocument(record: AtlasDocumentRecord): Required<AtlasDocumentRecord> {
  const now = new Date().toISOString();
  const title = String(record.title || "Untitled Document").trim() || "Untitled Document";
  const targetType = String(record.targetType || "General");
  const targetId = String(record.targetId || "");
  const targetName = String(record.targetName || record.area || "General");

  return {
    id: String(record.id || `doc-${Date.now()}`),
    title,
    area: String(record.area || targetName || "General"),
    type: String(record.type || "Paperwork / Scan"),
    targetType,
    targetId,
    targetName,
    notes: String(record.notes || ""),
    pastedText: String(record.pastedText || ""),
    files: Array.isArray(record.files) ? record.files : [],
    createdAt: String(record.createdAt || now),
  };
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    create table if not exists atlas_documents (
      id text primary key,
      title text not null,
      target_type text,
      target_id text,
      target_name text,
      record jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`create index if not exists atlas_documents_created_at_idx on atlas_documents (created_at desc)`;
  await sql`create index if not exists atlas_documents_target_idx on atlas_documents (target_type, target_id)`;
}

export async function GET() {
  const url = databaseUrl();
  if (!url) {
    return NextResponse.json({ ok: false, documents: [], error: "Missing DATABASE_URL / POSTGRES_URL / NEON_DATABASE_URL" }, { status: 500 });
  }

  const sql = neon(url);
  await ensureTable(sql);

  const rows = await sql<{ record: AtlasDocumentRecord }[]>`
    select record
    from atlas_documents
    order by created_at desc
    limit 500
  `;

  return NextResponse.json({ ok: true, documents: rows.map((row) => row.record) });
}

export async function POST(request: Request) {
  const url = databaseUrl();
  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing DATABASE_URL / POSTGRES_URL / NEON_DATABASE_URL" }, { status: 500 });
  }

  const body = (await request.json()) as { record?: AtlasDocumentRecord };
  const record = sanitizeDocument(body.record || {});
  const sql = neon(url);
  await ensureTable(sql);

  await sql`
    insert into atlas_documents (id, title, target_type, target_id, target_name, record, created_at, updated_at)
    values (${record.id}, ${record.title}, ${record.targetType}, ${record.targetId}, ${record.targetName}, ${JSON.stringify(record)}::jsonb, ${record.createdAt}::timestamptz, now())
    on conflict (id) do update set
      title = excluded.title,
      target_type = excluded.target_type,
      target_id = excluded.target_id,
      target_name = excluded.target_name,
      record = excluded.record,
      updated_at = now()
  `;

  return NextResponse.json({ ok: true, record });
}
