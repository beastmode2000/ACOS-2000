import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TeamRow = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  property_ids: string[];
};

type ListRow = {
  id: string;
  property_id: string;
  name: string;
  assigned_to: string[];
  status: string;
};

type ItemRow = {
  id: string;
  property_id: string;
  list_id: string;
  title: string;
  notes: string;
  assigned_to: string;
  due_date: string | null;
  status: string;
  photo_url: string;
  photo_name: string;
  updated_at: string;
};

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function nameMatches(person: string, value: unknown) {
  const assigned = normalized(value);
  const full = normalized(person);
  const first = full.split(/\s+/)[0] || full;
  if (!assigned || !full) return false;
  return (
    assigned === full ||
    assigned === first ||
    full.startsWith(`${assigned} `) ||
    assigned.startsWith(`${first} `)
  );
}

function listMatches(person: string, assignedTo: string[]) {
  const values = Array.isArray(assignedTo) ? assignedTo : [];
  if (!values.length) return false;
  if (values.some((value) => normalized(value) === "everyone")) return true;
  return values.some((value) => nameMatches(person, value));
}

function canPreview(request: NextRequest) {
  const email = normalized(request.headers.get("x-atlas-user-email"));
  const role = normalized(request.headers.get("x-atlas-user-role"));
  let permissions: Record<string, unknown> = {};
  try {
    permissions = JSON.parse(request.headers.get("x-atlas-permissions") || "{}");
  } catch {
    permissions = {};
  }
  return (
    !email ||
    email === "nthornton87@yahoo.com" ||
    role === "master" ||
    role === "administrator" ||
    permissions.manageUsers === true
  );
}

async function ensureSharedTables(sql: ReturnType<typeof neon>) {
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
}

async function memberForToken(sql: ReturnType<typeof neon>, token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = (await sql`
    SELECT id, name, role, active, property_ids
    FROM atlas_team_access
    WHERE field_token_hash = ${hash}
    LIMIT 1
  `) as unknown as TeamRow[];
  return rows[0] || null;
}

async function memberForId(sql: ReturnType<typeof neon>, memberId: string) {
  const rows = (await sql`
    SELECT id, name, role, active, property_ids
    FROM atlas_team_access
    WHERE id = ${memberId}
    LIMIT 1
  `) as unknown as TeamRow[];
  return rows[0] || null;
}

async function loadWork(sql: ReturnType<typeof neon>, member: TeamRow) {
  await ensureSharedTables(sql);
  const propertyIds = Array.isArray(member.property_ids) && member.property_ids.length
    ? member.property_ids
    : ["2000"];

  const lists = (await sql`
    SELECT id, property_id, name, assigned_to, status
    FROM atlas_shared_lists
    WHERE property_id = ANY(${propertyIds}::text[])
      AND status = 'Active'
    ORDER BY name ASC
  `) as unknown as ListRow[];

  const items = (await sql`
    SELECT id, property_id, list_id, title, notes, assigned_to, due_date,
           status, photo_url, photo_name, updated_at
    FROM atlas_shared_list_items
    WHERE property_id = ANY(${propertyIds}::text[])
    ORDER BY due_date NULLS LAST, updated_at DESC
  `) as unknown as ItemRow[];

  const visibleListIds = new Set(
    lists.filter((list) => listMatches(member.name, list.assigned_to)).map((list) => list.id),
  );

  const visibleItems = items.filter((item) => {
    const direct = nameMatches(member.name, item.assigned_to);
    if (direct) return true;
    if (!visibleListIds.has(item.list_id)) return false;
    return !String(item.assigned_to || "").trim();
  });

  const usedListIds = new Set(visibleItems.map((item) => item.list_id));
  const visibleLists = lists.filter(
    (list) => visibleListIds.has(list.id) || usedListIds.has(list.id),
  );

  return { lists: visibleLists, items: visibleItems };
}

export async function GET(request: NextRequest) {
  try {
    const token = String(request.nextUrl.searchParams.get("token") || "").trim();
    const memberId = String(request.nextUrl.searchParams.get("memberId") || "").trim();
    const preview = Boolean(memberId);
    if (!token && !memberId) {
      return NextResponse.json({ ok: false, error: "Missing work link." }, { status: 400 });
    }
    if (preview && !canPreview(request)) {
      return NextResponse.json({ ok: false, error: "Admin access is required to preview employee work." }, { status: 403 });
    }

    const sql = getSql();
    const member = preview
      ? await memberForId(sql, memberId)
      : await memberForToken(sql, token);
    if (!member || member.active === false) {
      return NextResponse.json({ ok: false, error: "This work view is no longer active." }, { status: 403 });
    }

    const work = await loadWork(sql, member);
    return NextResponse.json({
      ok: true,
      preview,
      member: {
        id: member.id,
        name: member.name,
        role: member.role,
        propertyIds: member.property_ids,
      },
      ...work,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Atlas could not load My Work." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string;
      action?: string;
      itemId?: string;
    };
    const token = String(body.token || "").trim();
    const itemId = String(body.itemId || "").trim();
    const action = String(body.action || "").trim();
    if (!token || !itemId || !["done", "reopen"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Invalid work update." }, { status: 400 });
    }

    const sql = getSql();
    const member = await memberForToken(sql, token);
    if (!member || member.active === false) {
      return NextResponse.json({ ok: false, error: "This work link is no longer active." }, { status: 403 });
    }

    const work = await loadWork(sql, member);
    const allowed = work.items.some((item) => item.id === itemId);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "That item is not assigned to this work list." }, { status: 403 });
    }

    const status = action === "done" ? "Completed" : "Open";
    await sql`
      UPDATE atlas_shared_list_items
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${itemId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Atlas could not update My Work." },
      { status: 500 },
    );
  }
}
