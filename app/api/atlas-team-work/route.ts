import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TeamTaskStatus = "Open" | "In Progress" | "Waiting" | "Completed";

type TeamTask = {
  id: string;
  title: string;
  assignee: string;
  location: string;
  notes: string;
  status: TeamTaskStatus;
  requirePhoto: boolean;
  completionPhotoUrl?: string;
  completedAt?: string;
  completedBy?: string;
};

type TeamList = {
  id: string;
  name: string;
  description: string;
  defaultAssignee: string;
  propertyIds: string[];
  schedule: string;
  active: boolean;
  tasks: TeamTask[];
};

type SaveBody = {
  lists?: TeamList[];
};

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }

  return neon(url);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_team_work (
      id text PRIMARY KEY,
      lists jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      updated_by text
    )
  `;

  await sql`
    INSERT INTO atlas_team_work (id, lists)
    VALUES ('shared', '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `;
}

function normalizeRole(value: string | null) {
  return String(value || "viewer").trim().toLowerCase();
}

function readHeaderPermissions(request: NextRequest) {
  try {
    const parsed = JSON.parse(
      request.headers.get("x-atlas-permissions") || "{}",
    );

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function canEdit(request: NextRequest) {
  const role = normalizeRole(
    request.headers.get("x-atlas-user-role"),
  );
  const permissions = readHeaderPermissions(request);

  return (
    role === "master" ||
    role === "administrator" ||
    role === "manager" ||
    permissions.edit === true
  );
}

function isValidStatus(value: unknown): value is TeamTaskStatus {
  return ["Open", "In Progress", "Waiting", "Completed"].includes(
    String(value),
  );
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanTask(value: unknown): TeamTask | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = cleanText(row.id);
  const title = cleanText(row.title);

  if (!id || !title) {
    return null;
  }

  const status = isValidStatus(row.status) ? row.status : "Open";

  return {
    id,
    title,
    assignee: cleanText(row.assignee, "Unassigned"),
    location: cleanText(row.location),
    notes: cleanText(row.notes),
    status,
    requirePhoto: row.requirePhoto === true,
    ...(cleanText(row.completionPhotoUrl)
      ? { completionPhotoUrl: cleanText(row.completionPhotoUrl) }
      : {}),
    ...(cleanText(row.completedAt)
      ? { completedAt: cleanText(row.completedAt) }
      : {}),
    ...(cleanText(row.completedBy)
      ? { completedBy: cleanText(row.completedBy) }
      : {}),
  };
}

function cleanList(value: unknown): TeamList | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = cleanText(row.id);
  const name = cleanText(row.name);

  if (!id || !name) {
    return null;
  }

  const propertyIds = Array.isArray(row.propertyIds)
    ? row.propertyIds
        .map((item) => cleanText(item))
        .filter(Boolean)
    : [];

  const tasks = Array.isArray(row.tasks)
    ? row.tasks
        .map(cleanTask)
        .filter((item): item is TeamTask => item !== null)
    : [];

  return {
    id,
    name,
    description: cleanText(row.description),
    defaultAssignee: cleanText(
      row.defaultAssignee,
      "Unassigned",
    ),
    propertyIds: propertyIds.length ? propertyIds : ["2000"],
    schedule: cleanText(row.schedule, "As needed"),
    active: row.active !== false,
    tasks,
  };
}

function cleanLists(value: unknown): TeamList[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(cleanList)
    .filter((item): item is TeamList => item !== null);
}

export async function GET() {
  try {
    const sql = getSql();
    await ensureTable(sql);

    const rows = (await sql`
      SELECT lists, updated_at, updated_by
      FROM atlas_team_work
      WHERE id = 'shared'
      LIMIT 1
    `) as unknown as Array<{
      lists: unknown;
      updated_at: string;
      updated_by: string | null;
    }>;

    const row = rows[0];

    return NextResponse.json({
      ok: true,
      lists: cleanLists(row?.lists),
      updatedAt: row?.updated_at || null,
      updatedBy: row?.updated_by || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load Team Work.",
      },
      { status: 500 },
    );
  }
}

async function saveTeamWork(request: NextRequest) {
  try {
    if (!canEdit(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "You do not have permission to edit Team Work.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as SaveBody;

    if (!Array.isArray(body.lists)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Team Work lists.",
        },
        { status: 400 },
      );
    }

    const lists = cleanLists(body.lists);
    const updatedBy =
      request.headers.get("x-atlas-user-email") ||
      request.headers.get("x-atlas-user-name") ||
      "Atlas user";

    const sql = getSql();
    await ensureTable(sql);

    await sql`
      INSERT INTO atlas_team_work (
        id,
        lists,
        updated_at,
        updated_by
      )
      VALUES (
        'shared',
        ${JSON.stringify(lists)}::jsonb,
        NOW(),
        ${updatedBy}
      )
      ON CONFLICT (id)
      DO UPDATE SET
        lists = EXCLUDED.lists,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
    `;

    return NextResponse.json({
      ok: true,
      lists,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not save Team Work.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return saveTeamWork(request);
}

export async function PUT(request: NextRequest) {
  return saveTeamWork(request);
}

