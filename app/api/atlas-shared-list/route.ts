import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SharedListRow = {
  id: string;
  property_id: string;
  name: string;
  assigned_to: string[];
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SharedItemRow = {
  id: string;
  property_id: string;
  list_id: string;
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

function cleanAssignments(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const clean = values.map((item) => cleanText(item, 120)).filter(Boolean);
  if (clean.some((item) => item.toLowerCase() === "everyone")) return ["Everyone"];
  return Array.from(new Set(clean)).slice(0, 30);
}

function dateKey(value: unknown) {
  const valueText = cleanText(value, 32);
  return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : "";
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultListId(propertyId: string) {
  return `shared-list-default-${propertyId.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
}

async function ensureTables(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_shared_lists (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      name text NOT NULL,
      assigned_to text[] NOT NULL DEFAULT ARRAY['Everyone']::text[],
      status text NOT NULL DEFAULT 'Active',
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_shared_lists_property_idx
    ON atlas_shared_lists(property_id, status, updated_at DESC)
  `;

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
    ALTER TABLE atlas_shared_list_items
    ADD COLUMN IF NOT EXISTS list_id text NOT NULL DEFAULT ''
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_shared_list_property_status_idx
    ON atlas_shared_list_items(property_id, status, updated_at DESC)
  `;
}

async function ensureDefaultList(sql: ReturnType<typeof neon>, propertyId: string) {
  const id = defaultListId(propertyId);
  await sql`
    INSERT INTO atlas_shared_lists (
      id, property_id, name, assigned_to, status, created_by, created_at, updated_at
    ) VALUES (
      ${id}, ${propertyId}, 'General', ARRAY['Everyone']::text[], 'Active', '', NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    UPDATE atlas_shared_list_items
    SET list_id = ${id}, updated_at = updated_at
    WHERE property_id = ${propertyId} AND (list_id IS NULL OR list_id = '')
  `;

  return id;
}

export async function GET(request: Request) {
  try {
    const sql = getSql();
    await ensureTables(sql);

    const url = new URL(request.url);
    const propertyId = cleanText(url.searchParams.get("propertyId"), 80) || "2000";
    await ensureDefaultList(sql, propertyId);

    const lists = (await sql`
      SELECT
        id,
        property_id,
        name,
        assigned_to,
        status,
        created_by,
        created_at,
        updated_at
      FROM atlas_shared_lists
      WHERE property_id = ${propertyId}
      ORDER BY
        CASE WHEN status = 'Active' THEN 0 WHEN status = 'Paused' THEN 1 ELSE 2 END,
        updated_at DESC,
        name ASC
      LIMIT 100
    `) as unknown as SharedListRow[];

    const items = (await sql`
      SELECT
        id,
        property_id,
        list_id,
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
        CASE
          WHEN status = 'Open' THEN 0
          WHEN status = 'Paused' THEN 1
          WHEN status = 'Skipped' THEN 2
          WHEN status = 'Moved to Work' THEN 3
          ELSE 4
        END,
        due_date NULLS LAST,
        updated_at DESC
      LIMIT 500
    `) as unknown as SharedItemRow[];

    return NextResponse.json({ ok: true, lists, items });
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
    await ensureTables(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const action = cleanText(body.action, 60) || "create";
    const fallbackListId = await ensureDefaultList(sql, propertyId);

    if (action === "create-list") {
      const name = cleanText(body.name, 180);
      if (!name) {
        return NextResponse.json({ ok: false, error: "Add a list title first." }, { status: 400 });
      }
      const id = cleanText(body.id, 220) || makeId("shared-list");
      const assignedTo = cleanAssignments(body.assignedTo);
      const createdBy = cleanText(body.createdBy, 120);

      await sql`
        INSERT INTO atlas_shared_lists (
          id, property_id, name, assigned_to, status, created_by, created_at, updated_at
        ) VALUES (
          ${id}, ${propertyId}, ${name}, ${assignedTo.length ? assignedTo : ["Everyone"]}, 'Active', ${createdBy}, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ ok: true, id });
    }

    if (action === "update-list") {
      const id = cleanText(body.id, 220);
      const name = cleanText(body.name, 180);
      const assignedTo = cleanAssignments(body.assignedTo);
      if (!id || !name) {
        return NextResponse.json({ ok: false, error: "List and title are required." }, { status: 400 });
      }
      await sql`
        UPDATE atlas_shared_lists
        SET name = ${name}, assigned_to = ${assignedTo.length ? assignedTo : ["Everyone"]}, updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "pause-list" || action === "resume-list") {
      const id = cleanText(body.id, 220);
      if (!id) return NextResponse.json({ ok: false, error: "List is required." }, { status: 400 });
      const status = action === "pause-list" ? "Paused" : "Active";
      await sql`
        UPDATE atlas_shared_lists
        SET status = ${status}, updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "create") {
      const title = cleanText(body.title, 280);
      if (!title) {
        return NextResponse.json({ ok: false, error: "Add a list item first." }, { status: 400 });
      }
      const id = cleanText(body.id, 220) || makeId("shared");
      const listId = cleanText(body.listId, 220) || fallbackListId;
      const notes = cleanText(body.notes, 4000);
      const assignedTo = cleanText(body.assignedTo, 120);
      const dueDate = dateKey(body.dueDate);
      const createdBy = cleanText(body.createdBy, 120);
      const photoUrl = cleanText(body.photoUrl, 2000);
      const photoName = cleanText(body.photoName, 300);

      await sql`
        INSERT INTO atlas_shared_list_items (
          id, property_id, list_id, title, notes, assigned_to, due_date,
          status, created_by, photo_url, photo_name, created_at, updated_at
        ) VALUES (
          ${id}, ${propertyId}, ${listId}, ${title}, ${notes}, ${assignedTo},
          ${dueDate || null}::date, 'Open', ${createdBy}, ${photoUrl}, ${photoName}, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ ok: true, id });
    }

    const id = cleanText(body.id, 220);
    if (!id) {
      return NextResponse.json({ ok: false, error: "A shared-list item is required." }, { status: 400 });
    }

    if (["done", "reopen", "moved-to-work", "pause", "skip"].includes(action)) {
      const status =
        action === "done"
          ? "Completed"
          : action === "reopen"
            ? "Open"
            : action === "moved-to-work"
              ? "Moved to Work"
              : action === "pause"
                ? "Paused"
                : "Skipped";
      await sql`
        UPDATE atlas_shared_list_items
        SET status = ${status}, updated_at = NOW()
        WHERE property_id = ${propertyId} AND id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "reassign") {
      const assignedTo = cleanText(body.assignedTo, 120);
      await sql`
        UPDATE atlas_shared_list_items
        SET assigned_to = ${assignedTo}, status = 'Open', updated_at = NOW()
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
      const listId = cleanText(body.listId, 220) || fallbackListId;
      if (!title) {
        return NextResponse.json({ ok: false, error: "A title is required." }, { status: 400 });
      }
      await sql`
        UPDATE atlas_shared_list_items
        SET title = ${title}, notes = ${notes}, assigned_to = ${assignedTo},
            due_date = ${dueDate || null}::date, photo_url = ${photoUrl},
            photo_name = ${photoName}, list_id = ${listId}, updated_at = NOW()
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
    await ensureTables(sql);

    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanText(body.propertyId, 80) || "2000";
    const id = cleanText(body.id, 220);
    const kind = cleanText(body.kind, 40) || "item";
    if (!id) return NextResponse.json({ ok: false, error: "A shared-list record is required." }, { status: 400 });

    if (kind === "list") {
      if (id === defaultListId(propertyId)) {
        return NextResponse.json({ ok: false, error: "The General list cannot be deleted." }, { status: 400 });
      }
      await sql`DELETE FROM atlas_shared_list_items WHERE property_id = ${propertyId} AND list_id = ${id}`;
      await sql`DELETE FROM atlas_shared_lists WHERE property_id = ${propertyId} AND id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    await sql`
      DELETE FROM atlas_shared_list_items
      WHERE property_id = ${propertyId} AND id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Atlas shared list delete failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not delete that shared-list record." },
      { status: 500 },
    );
  }
}
