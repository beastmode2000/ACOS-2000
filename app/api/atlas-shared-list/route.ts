import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SharedListRow = {
  id: string;
  property_id: string;
  title: string;
  notes: string;
  assigned_to: string;
  due_date: string | null;
  status: string;
  created_by: string;
  photo_url: string;
  photo_name: string;
  created_at: string;
  updated_at: string;
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

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function dateKey(value: unknown) {
  const valueText = cleanText(value, 32);
  return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : "";
}

function makeId() {
  return `shared-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_shared_list_items (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      title text NOT NULL,
      notes text NOT NULL DEFAULT '',
      assigned_to text NOT NULL DEFAULT '',
      due_date date,
      status text NOT NULL DEFAULT 'Open',
      created_by text NOT NULL DEFAULT '',
      photo_url text NOT NULL DEFAULT '',
      photo_name text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_shared_list_property_status_idx
    ON atlas_shared_list_items(property_id, status, updated_at DESC)
  `;
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const url = new URL(request.url);
    const propertyId = cleanText(url.searchParams.get("propertyId"), 80) || "2000";

    const rows = (await sql`
      SELECT
        id,
        property_id,
        title,
        notes,
        assigned_to,
        due_date,
        status,
        created_by,
        photo_url,
        photo_name,
        created_at,
        updated_at
      FROM atlas_shared_list_items
      WHERE property_id = ${propertyId}
      ORDER BY
        CASE WHEN status = 'Open' THEN 0 WHEN status = 'Moved to Work' THEN 1 ELSE 2 END,
        due_date NULLS LAST,
        updated_at DESC
      LIMIT 250
    `) as unknown as SharedListRow[];

    return NextResponse.json({ ok: true, items: rows });
  } catch (error) {
    console.error("Atlas shared list read failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not load the shared list." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const action = cleanText(body.action, 40) || "create";

    if (action === "create") {
      const title = cleanText(body.title, 280);
      if (!title) {
        return NextResponse.json(
          { ok: false, error: "Add a list item first." },
          { status: 400 },
        );
      }

      const id = cleanText(body.id, 220) || makeId();
      const notes = cleanText(body.notes, 4000);
      const assignedTo = cleanText(body.assignedTo, 120);
      const dueDate = dateKey(body.dueDate);
      const createdBy = cleanText(body.createdBy, 120);
      const photoUrl = cleanText(body.photoUrl, 2000);
      const photoName = cleanText(body.photoName, 300);

      await sql`
        INSERT INTO atlas_shared_list_items (
          id,
          property_id,
          title,
          notes,
          assigned_to,
          due_date,
          status,
          created_by,
          photo_url,
          photo_name,
          created_at,
          updated_at
        ) VALUES (
          ${id},
          ${propertyId},
          ${title},
          ${notes},
          ${assignedTo},
          ${dueDate || null}::date,
          'Open',
          ${createdBy},
          ${photoUrl},
          ${photoName},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;

      return NextResponse.json({ ok: true, id });
    }

    const id = cleanText(body.id, 220);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "A shared-list item is required." },
        { status: 400 },
      );
    }

    if (action === "done") {
      await sql`
        UPDATE atlas_shared_list_items
        SET status = 'Completed', updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "reopen") {
      await sql`
        UPDATE atlas_shared_list_items
        SET status = 'Open', updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "moved-to-work") {
      await sql`
        UPDATE atlas_shared_list_items
        SET status = 'Moved to Work', updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const title = cleanText(body.title, 280);
      const notes = cleanText(body.notes, 4000);
      const assignedTo = cleanText(body.assignedTo, 120);
      const dueDate = dateKey(body.dueDate);
      const photoUrl = cleanText(body.photoUrl, 2000);
      const photoName = cleanText(body.photoName, 300);

      if (!title) {
        return NextResponse.json(
          { ok: false, error: "A title is required." },
          { status: 400 },
        );
      }

      await sql`
        UPDATE atlas_shared_list_items
        SET
          title = ${title},
          notes = ${notes},
          assigned_to = ${assignedTo},
          due_date = ${dueDate || null}::date,
          photo_url = ${photoUrl},
          photo_name = ${photoName},
          updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "That shared-list action is not supported." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Atlas shared list save failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not update the shared list." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const id = cleanText(body.id, 220);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "A shared-list item is required." },
        { status: 400 },
      );
    }

    await sql`
      DELETE FROM atlas_shared_list_items
      WHERE property_id = ${propertyId} AND id = ${id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Atlas shared list delete failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not delete that shared-list item." },
      { status: 500 },
    );
  }
}
