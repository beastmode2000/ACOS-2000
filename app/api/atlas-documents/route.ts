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

type SqlClient = ReturnType<typeof neon>;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
}

function cleanString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanDocument(record: AtlasDocumentRecord): Required<AtlasDocumentRecord> {
  const now = new Date().toISOString();
  const title = cleanString(record.title, "Untitled Document");
  const targetType = cleanString(record.targetType, "General");
  const targetId = cleanString(record.targetId, "");
  const targetName = cleanString(record.targetName || record.area, "General");

  return {
    id: cleanString(record.id, `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title,
    area: cleanString(record.area, targetName),
    type: cleanString(record.type, "Paperwork / Scan"),
    targetType,
    targetId,
    targetName,
    notes: cleanString(record.notes, ""),
    pastedText: cleanString(record.pastedText, ""),
    files: Array.isArray(record.files) ? record.files : [],
    createdAt: cleanString(record.createdAt, now),
  };
}

async function ensureDocumentsTable(sql: SqlClient) {
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

  await sql`
    create index if not exists atlas_documents_created_at_idx
    on atlas_documents (created_at desc)
  `;

  await sql`
    create index if not exists atlas_documents_target_idx
    on atlas_documents (target_type, target_id)
  `;
}

export async function GET() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        documents: [],
        error: "Missing database connection string.",
      },
      { status: 500 }
    );
  }

  const sql = neon(databaseUrl);
  await ensureDocumentsTable(sql);

  const rows = (await sql`
    select record
    from atlas_documents
    order by lower(title) asc, created_at desc
    limit 500
  `) as { record: AtlasDocumentRecord }[];

  return NextResponse.json({
    ok: true,
    documents: rows.map((row) => row.record),
  });
}

export async function POST(request: Request) {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing database connection string.",
      },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { record?: AtlasDocumentRecord };
  const record = cleanDocument(body.record || {});
  const sql = neon(databaseUrl);

  await ensureDocumentsTable(sql);

  await sql`
    insert into atlas_documents (
      id,
      title,
      target_type,
      target_id,
      target_name,
      record,
      created_at,
      updated_at
    )
    values (
      ${record.id},
      ${record.title},
      ${record.targetType},
      ${record.targetId},
      ${record.targetName},
      ${JSON.stringify(record)}::jsonb,
      ${record.createdAt}::timestamptz,
      now()
    )
    on conflict (id) do update set
      title = excluded.title,
      target_type = excluded.target_type,
      target_id = excluded.target_id,
      target_name = excluded.target_name,
      record = excluded.record,
      updated_at = now()
  `;

  return NextResponse.json({
    ok: true,
    record,
  });
}

export async function DELETE(request: Request) {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing database connection string.",
      },
      { status: 500 }
    );
  }

  const documentId = new URL(request.url).searchParams.get("id");

  if (!documentId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing document id.",
      },
      { status: 400 }
    );
  }

  const sql = neon(databaseUrl);
  await ensureDocumentsTable(sql);

  await sql`
    delete from atlas_documents
    where id = ${documentId}
  `;

  return NextResponse.json({
    ok: true,
    id: documentId,
  });
}
