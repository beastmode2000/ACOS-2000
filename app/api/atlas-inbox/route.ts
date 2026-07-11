
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type InboxStatus =
  | "New"
  | "Analyzed"
  | "Needs Review"
  | "Approved"
  | "Saved"
  | "Archived"
  | "Error";

const ALLOWED_STATUSES = new Set<InboxStatus>([
  "New",
  "Analyzed",
  "Needs Review",
  "Approved",
  "Saved",
  "Archived",
  "Error",
]);

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  return neon(connectionString);
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function jsonArray(value: unknown) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function jsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return JSON.stringify({});
}

function makeId() {
  return `inbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStatus(value: unknown): InboxStatus {
  const candidate = text(value) as InboxStatus;
  return ALLOWED_STATUSES.has(candidate) ? candidate : "New";
}

async function ensureInboxTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_inbox_items (
      id text PRIMARY KEY,
      title text NOT NULL,
      intake_type text NOT NULL DEFAULT 'Document',
      status text NOT NULL DEFAULT 'New',
      source text NOT NULL DEFAULT 'Fast Intake',
      notes text NOT NULL DEFAULT '',
      pasted_text text NOT NULL DEFAULT '',
      files jsonb NOT NULL DEFAULT '[]'::jsonb,
      target_type text NOT NULL DEFAULT 'General',
      target_id text NOT NULL DEFAULT '',
      target_name text NOT NULL DEFAULT '',
      proposed_action text NOT NULL DEFAULT 'Attach to Existing',
      extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_inbox_items_status_idx
    ON atlas_inbox_items (status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_inbox_items_updated_at_idx
    ON atlas_inbox_items (updated_at DESC)
  `;
}

function mapItem(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    title: String(row.title || "Untitled Inbox item"),
    intakeType: String(row.intake_type || "Document"),
    status: String(row.status || "New"),
    source: String(row.source || "Fast Intake"),
    notes: String(row.notes || ""),
    pastedText: String(row.pasted_text || ""),
    files: Array.isArray(row.files) ? row.files : [],
    targetType: String(row.target_type || "General"),
    targetId: String(row.target_id || ""),
    targetName: String(row.target_name || ""),
    proposedAction: String(row.proposed_action || "Attach to Existing"),
    extractedData:
      row.extracted_data && typeof row.extracted_data === "object"
        ? row.extracted_data
        : {},
    createdAt: row.created_at
      ? String(row.created_at)
      : new Date().toISOString(),
    updatedAt: row.updated_at
      ? String(row.updated_at)
      : new Date().toISOString(),
  };
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET() {
  try {
    const sql = getSql();
    await ensureInboxTable(sql);

    const rows = (await sql`
      SELECT *
      FROM atlas_inbox_items
      ORDER BY updated_at DESC, created_at DESC
    `) as unknown as JsonRecord[];

    return response({ ok: true, items: rows.map(mapItem) });
  } catch (error) {
    return response(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Atlas Inbox could not be loaded.",
      },
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureInboxTable(sql);

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const id = text(body.id) || makeId();
    const title = text(body.title) || "Untitled Inbox item";
    const files = Array.isArray(body.files) ? body.files : [];

    const serializedFiles = jsonArray(files);
    if (Buffer.byteLength(serializedFiles, "utf8") > 8_000_000) {
      return response(
        {
          ok: false,
          error:
            "This Inbox upload is too large. Keep the combined files under 8 MB and try again.",
        },
        413,
      );
    }

    const rows = (await sql`
      INSERT INTO atlas_inbox_items (
        id,
        title,
        intake_type,
        status,
        source,
        notes,
        pasted_text,
        files,
        target_type,
        target_id,
        target_name,
        proposed_action,
        extracted_data,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${title},
        ${text(body.intakeType, "Document")},
        ${normalizeStatus(body.status)},
        ${text(body.source, "Fast Intake")},
        ${text(body.notes)},
        ${text(body.pastedText)},
        ${serializedFiles}::jsonb,
        ${text(body.targetType, "General")},
        ${text(body.targetId)},
        ${text(body.targetName)},
        ${text(body.proposedAction, "Attach to Existing")},
        ${jsonObject(body.extractedData)}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        intake_type = EXCLUDED.intake_type,
        status = EXCLUDED.status,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        pasted_text = EXCLUDED.pasted_text,
        files = EXCLUDED.files,
        target_type = EXCLUDED.target_type,
        target_id = EXCLUDED.target_id,
        target_name = EXCLUDED.target_name,
        proposed_action = EXCLUDED.proposed_action,
        extracted_data = EXCLUDED.extracted_data,
        updated_at = NOW()
      RETURNING *
    `) as unknown as JsonRecord[];

    return response({ ok: true, item: mapItem(rows[0] || {}) });
  } catch (error) {
    return response(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Inbox save failed.",
      },
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureInboxTable(sql);

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const id = text(body.id);
    if (!id) {
      return response({ ok: false, error: "Inbox item id is required." }, 400);
    }

    const existingRows = (await sql`
      SELECT *
      FROM atlas_inbox_items
      WHERE id = ${id}
      LIMIT 1
    `) as unknown as JsonRecord[];

    if (!existingRows.length) {
      return response({ ok: false, error: "Inbox item was not found." }, 404);
    }

    const current = mapItem(existingRows[0]);
    const files = Array.isArray(body.files) ? body.files : current.files;
    const serializedFiles = jsonArray(files);

    if (Buffer.byteLength(serializedFiles, "utf8") > 8_000_000) {
      return response(
        {
          ok: false,
          error:
            "This Inbox upload is too large. Keep the combined files under 8 MB and try again.",
        },
        413,
      );
    }

    const rows = (await sql`
      UPDATE atlas_inbox_items
      SET
        title = ${text(body.title, current.title)},
        intake_type = ${text(body.intakeType, current.intakeType)},
        status = ${body.status === undefined ? current.status : normalizeStatus(body.status)},
        source = ${text(body.source, current.source)},
        notes = ${body.notes === undefined ? current.notes : text(body.notes)},
        pasted_text = ${body.pastedText === undefined ? current.pastedText : text(body.pastedText)},
        files = ${serializedFiles}::jsonb,
        target_type = ${text(body.targetType, current.targetType)},
        target_id = ${body.targetId === undefined ? current.targetId : text(body.targetId)},
        target_name = ${body.targetName === undefined ? current.targetName : text(body.targetName)},
        proposed_action = ${text(body.proposedAction, current.proposedAction)},
        extracted_data = ${body.extractedData === undefined ? JSON.stringify(current.extractedData) : jsonObject(body.extractedData)}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `) as unknown as JsonRecord[];

    return response({ ok: true, item: mapItem(rows[0] || {}) });
  } catch (error) {
    return response(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Inbox update failed.",
      },
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureInboxTable(sql);

    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const id = text(body.id);
    if (!id) {
      return response({ ok: false, error: "Inbox item id is required." }, 400);
    }

    await sql`
      DELETE FROM atlas_inbox_items
      WHERE id = ${id}
    `;

    return response({ ok: true, id });
  } catch (error) {
    return response(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Inbox delete failed.",
      },
      500,
    );
  }
}
