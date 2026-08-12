import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type LandscapeStatus = "Not Started" | "In Progress" | "Complete" | "Needs Review";

type AddisonTaskRecord = {
  id: string;
  title?: string;
  taskMeta?: Record<string, any>;
  [key: string]: any;
};

const ADDISON_WORK_TOKEN =
  process.env.ADDISON_WORK_TOKEN ||
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

function pacificDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((part) => part.type === "year")?.value || "";
  const m = parts.find((part) => part.type === "month")?.value || "";
  const d = parts.find((part) => part.type === "day")?.value || "";
  return `${y}-${m}-${d}`;
}

function weekdayFromDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

function addisonTaskMeta(record: AddisonTaskRecord) {
  return record?.taskMeta && typeof record.taskMeta === "object"
    ? record.taskMeta
    : record;
}

function isAddisonAssigned(record: AddisonTaskRecord) {
  return String(addisonTaskMeta(record)?.assignee || "").trim().toLowerCase() === "addison";
}

async function ensureAddisonBackingTables() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_operational_records (
      record_type text NOT NULL,
      id text NOT NULL,
      property_id text NOT NULL DEFAULT '2000',
      record jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (record_type, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_templates (
      property_id text NOT NULL DEFAULT '2000',
      day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_occurrences (
      property_id text NOT NULL DEFAULT '2000',
      occurrence_date date NOT NULL,
      day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      routine_name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function loadAddisonWork() {
  await ensureAddisonBackingTables();
  const sql = getSql();
  const today = pacificDateKey();

  const rows = await sql`
    SELECT id, record, updated_at
    FROM atlas_operational_records
    WHERE record_type = 'tasks'
      AND property_id = '2000'
    ORDER BY updated_at DESC
  `;
  const allTasks = rows.map((row: any) => ({
    ...(row.record || {}),
    id: String(row.id || row.record?.id || ""),
    serverUpdatedAt: row.updated_at,
  })) as AddisonTaskRecord[];

  const tasks = allTasks
    .filter(isAddisonAssigned)
    .sort((a, b) => {
      const am = addisonTaskMeta(a);
      const bm = addisonTaskMeta(b);
      return String(am?.dueDate || "9999-12-31").localeCompare(
        String(bm?.dueDate || "9999-12-31"),
      );
    });

  const day = weekdayFromDateKey(today);

  const templateRows = await sql`
    SELECT name, tasks
    FROM atlas_routine_templates
    WHERE property_id = '2000'
      AND day_of_week = ${day}
    LIMIT 1
  `;

  let occurrenceRows = await sql`
    SELECT occurrence_date, routine_name, tasks
    FROM atlas_routine_occurrences
    WHERE property_id = '2000'
      AND occurrence_date = ${today}::date
    LIMIT 1
  `;

  if (templateRows[0]) {
    const templateTasks = Array.isArray(templateRows[0].tasks)
      ? templateRows[0].tasks
      : [];

    if (!occurrenceRows[0]) {
      await sql`
        INSERT INTO atlas_routine_occurrences (
          property_id, occurrence_date, day_of_week, routine_name, tasks, updated_at
        )
        VALUES (
          '2000', ${today}::date, ${day},
          ${String(templateRows[0].name || "Daily Routine")},
          ${JSON.stringify(templateTasks)}::jsonb,
          NOW()
        )
        ON CONFLICT (property_id, occurrence_date) DO NOTHING
      `;
    } else {
      // Keep today's completion/progress state, but always pull in the latest
      // template assignments so a routine edited in Atlas appears on Addison's
      // field page immediately.
      const existingTasks = Array.isArray(occurrenceRows[0].tasks)
        ? occurrenceRows[0].tasks
        : [];
      const existingById = new Map(
        existingTasks.map((task: any) => [String(task?.id || ""), task]),
      );

      const synchronizedTasks = templateTasks.map((task: any) => {
        const existing = existingById.get(String(task?.id || ""));
        if (!existing) return task;

        return {
          ...task,
          completed: Boolean(existing?.completed),
          status:
            existing?.status === "completed" ||
            existing?.status === "skipped" ||
            existing?.status === "deferred"
              ? existing.status
              : Boolean(existing?.completed)
                ? "completed"
                : task?.status || "open",
          ...(existing?.deferredTo
            ? { deferredTo: existing.deferredTo }
            : {}),
          ...(existing?.deferredFrom
            ? { deferredFrom: existing.deferredFrom }
            : {}),
        };
      });

      await sql`
        UPDATE atlas_routine_occurrences
        SET
          day_of_week = ${day},
          routine_name = ${String(templateRows[0].name || "Daily Routine")},
          tasks = ${JSON.stringify(synchronizedTasks)}::jsonb,
          updated_at = NOW()
        WHERE property_id = '2000'
          AND occurrence_date = ${today}::date
      `;
    }

    occurrenceRows = await sql`
      SELECT occurrence_date, routine_name, tasks
      FROM atlas_routine_occurrences
      WHERE property_id = '2000'
        AND occurrence_date = ${today}::date
      LIMIT 1
    `;
  }

  const occurrence = occurrenceRows[0] || null;
  const routineTasks = Array.isArray(occurrence?.tasks)
    ? occurrence.tasks.filter((task: any) => {
        if (task?.enabled === false) return false;
        const assigned = String(
          task?.assignedTo ||
          task?.assignee ||
          task?.assigned_to ||
          ""
        )
          .trim()
          .toLowerCase();

        // Atlas may store/display the person as either "Addison"
        // or the full team-member name "Addison Hutton".
        return (
          assigned === "addison" ||
          assigned === "addison hutton" ||
          assigned.startsWith("addison ")
        );
      })
    : [];

  return {
    today,
    tasks,
    routine: occurrence
      ? {
          date: String(occurrence.occurrence_date || today).slice(0, 10),
          name: String(occurrence.routine_name || "Addison Routine"),
          tasks: routineTasks,
        }
      : { date: today, name: "Addison Routine", tasks: [] },
  };
}

async function patchAddisonTask(
  taskId: string,
  patch: Record<string, unknown>,
) {
  const sql = getSql();
  const rows = await sql`
    SELECT record
    FROM atlas_operational_records
    WHERE record_type = 'tasks'
      AND property_id = '2000'
      AND id = ${taskId}
    LIMIT 1
  `;
  const current = rows[0]?.record as AddisonTaskRecord | undefined;
  if (!current || !isAddisonAssigned(current)) return false;

  const baseMeta = addisonTaskMeta(current) || {};
  const nextMeta = {
    ...baseMeta,
    ...patch,
    assignee: "Addison",
    updatedAt: new Date().toISOString(),
  };
  const nextRecord = {
    ...current,
    ...nextMeta,
    taskMeta: nextMeta,
    propertyId: "2000",
    updatedAt: nextMeta.updatedAt,
  };

  await sql`
    UPDATE atlas_operational_records
    SET record = ${JSON.stringify(nextRecord)}::jsonb,
        updated_at = NOW()
    WHERE record_type = 'tasks'
      AND property_id = '2000'
      AND id = ${taskId}
  `;
  return true;
}

type LandscapeHelpItemInput = {
  id: string;
  isDone?: boolean;
  notes?: string;
  updatedBy?: string;
};

const DEFAULT_ITEMS = [
  { label: "Weed waterside / lake-facing beds first", category: "Weeding", priority: "Highest" },
  { label: "Weed patio beds", category: "Weeding", priority: "High" },
  { label: "Weed courtyard beds", category: "Weeding", priority: "High" },
  { label: "Weed driveway beds", category: "Weeding", priority: "Normal" },
  { label: "Weed dock path and edges", category: "Weeding", priority: "High" },
  { label: "Clean lawn edges where needed", category: "Grounds", priority: "Normal" },
  { label: "Water pots", category: "Watering", priority: "High" },
  { label: "Prune / shear as needed", category: "Pruning", priority: "Normal" },
  { label: "Remove yard debris", category: "Cleanup", priority: "High" },
  { label: "Blow patios, paths, driveway, and hardscape after work", category: "Cleanup", priority: "High" },
  { label: "Check for dry areas, irrigation issues, or broken heads", category: "Irrigation", priority: "High" },
  { label: "Monitor / adjust lake-water irrigation use and report concerns to Pat", category: "Irrigation", priority: "Normal" },
  { label: "Record lawn treatment, fertilizer, soil, or mowing/edging notes if completed", category: "Lawn", priority: "Normal" },
  { label: "Add notes for anything Nick or Pat needs to review", category: "Notes", priority: "High" },
];

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return neon(databaseUrl);
}

function getAdminAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";

  if (!header.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function adminBlockResponse(request: NextRequest) {
  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atlas access is not configured. Add ATLAS_ACCESS_USERNAME and ATLAS_ACCESS_PASSWORD in Vercel.",
      },
      { status: 500 }
    );
  }

  const auth = getAdminAuth(request);

  if (!auth || auth.username !== expectedUsername || auth.password !== expectedPassword) {
    return NextResponse.json(
      { ok: false, error: "Atlas login required." },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Atlas 2000", charset="UTF-8"',
        },
      }
    );
  }

  return null;
}

function getPacificWeekStartISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diffToMonday);

  return utcDate.toISOString().slice(0, 10);
}

function safeStatus(value: unknown): LandscapeStatus {
  if (value === "In Progress" || value === "Complete" || value === "Needs Review" || value === "Not Started") return value;
  return "Not Started";
}

function normalizeWeek(row: any) {
  return {
    id: row.id,
    weekStart: row.week_start,
    title: row.title,
    shareToken: row.share_token,
    status: row.status,
    crewName: row.crew_name ?? "",
    managerNotes: row.manager_notes ?? "",
    crewNotes: row.crew_notes ?? "",
    completedAt: row.completed_at ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function normalizeItem(row: any) {
  return {
    id: row.id,
    weekId: row.week_id,
    sortOrder: row.sort_order,
    label: row.label,
    category: row.category,
    priority: row.priority,
    isDone: Boolean(row.is_done),
    notes: row.notes ?? "",
    updatedBy: row.updated_by ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

async function ensureSchema() {
  const sql = getSql();

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_weeks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start DATE NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT 'Landscape Help',
      share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
      status TEXT NOT NULL DEFAULT 'Not Started',
      crew_name TEXT DEFAULT '',
      manager_notes TEXT DEFAULT '',
      crew_notes TEXT DEFAULT '',
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS landscape_help_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id UUID NOT NULL REFERENCES landscape_help_weeks(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      priority TEXT NOT NULL DEFAULT 'Normal',
      is_done BOOLEAN NOT NULL DEFAULT false,
      notes TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS landscape_help_items_week_idx
    ON landscape_help_items (week_id, sort_order)
  `;
}

async function ensureWeek(weekStart: string) {
  const sql = getSql();

  const existing = await sql`
    SELECT *
    FROM landscape_help_weeks
    WHERE week_start = ${weekStart}::date
    LIMIT 1
  `;

  let week = existing[0];

  if (!week) {
    const created = await sql`
      INSERT INTO landscape_help_weeks (week_start, title, status)
      VALUES (${weekStart}::date, 'Landscape Help', 'Not Started')
      RETURNING *
    `;
    week = created[0];
  }

  const itemCount = await sql`
    SELECT COUNT(*)::int AS count
    FROM landscape_help_items
    WHERE week_id = ${week.id}
  `;

  if (Number(itemCount[0]?.count ?? 0) === 0) {
    for (let index = 0; index < DEFAULT_ITEMS.length; index += 1) {
      const item = DEFAULT_ITEMS[index];

      await sql`
        INSERT INTO landscape_help_items (week_id, sort_order, label, category, priority)
        VALUES (${week.id}, ${index + 1}, ${item.label}, ${item.category}, ${item.priority})
      `;
    }
  }

  return week;
}

async function loadWeekById(weekId: string) {
  const sql = getSql();

  const weeks = await sql`
    SELECT *
    FROM landscape_help_weeks
    WHERE id = ${weekId}
    LIMIT 1
  `;

  if (!weeks[0]) return null;

  const items = await sql`
    SELECT *
    FROM landscape_help_items
    WHERE week_id = ${weekId}
    ORDER BY sort_order ASC
  `;

  return {
    week: normalizeWeek(weeks[0]),
    items: items.map(normalizeItem),
  };
}

async function loadWeekByToken(token: string) {
  const sql = getSql();

  const weeks = await sql`
    SELECT *
    FROM landscape_help_weeks
    WHERE share_token = ${token}
    LIMIT 1
  `;

  if (!weeks[0]) return null;

  return loadWeekById(weeks[0].id);
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const sql = getSql();
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (token === ADDISON_WORK_TOKEN) {
      const addison = await loadAddisonWork();
      return NextResponse.json({ ok: true, mode: "addison", addison });
    }
    const weekId = url.searchParams.get("weekId");
    const weekStart = url.searchParams.get("weekStart") || getPacificWeekStartISO();

    if (token) {
      const tokenWeek = await loadWeekByToken(token);
      if (!tokenWeek) return NextResponse.json({ ok: false, error: "Landscape Help link not found." }, { status: 404 });
      return NextResponse.json({ ok: true, ...tokenWeek });
    }

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    if (weekId) {
      const selectedWeek = await loadWeekById(weekId);
      if (!selectedWeek) return NextResponse.json({ ok: false, error: "Landscape Help week not found." }, { status: 404 });

      const weeks = await sql`
        SELECT *
        FROM landscape_help_weeks
        ORDER BY week_start DESC
        LIMIT 20
      `;

      return NextResponse.json({
        ok: true,
        ...selectedWeek,
        weeks: weeks.map(normalizeWeek),
      });
    }

    const current = await ensureWeek(weekStart);
    const currentWeek = await loadWeekById(current.id);

    const weeks = await sql`
      SELECT *
      FROM landscape_help_weeks
      ORDER BY week_start DESC
      LIMIT 20
    `;

    return NextResponse.json({
      ok: true,
      ...currentWeek,
      weeks: weeks.map(normalizeWeek),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    const body = await request.json().catch(() => ({}));
    const weekStart = body.weekStart || getPacificWeekStartISO();

    const week = await ensureWeek(weekStart);
    const loaded = await loadWeekById(week.id);

    return NextResponse.json({ ok: true, ...loaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureSchema();

    const sql = getSql();
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token") || "";
    const body = await request.json();

    const bodyToken = typeof body.token === "string" ? body.token : "";
    const token = queryToken || bodyToken;
    const weekId = typeof body.weekId === "string" ? body.weekId : "";

    if (token === ADDISON_WORK_TOKEN) {
      const action = String(body.action || "");
      const today = pacificDateKey();

      if (action === "task-create") {
        const title = String(body.title || "").trim();
        if (!title) {
          return NextResponse.json({ ok: false, error: "Task title is required." }, { status: 400 });
        }
        const dueDate = String(body.dueDate || today).slice(0, 10);
        const id = `task-addison-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const createdAt = new Date().toISOString();
        const taskMeta = {
          assignee: "Addison",
          dueDate,
          status: "Open",
          assignmentScope: "This occurrence",
          completedAt: undefined,
          needsReview: false,
          createdAt,
          updatedAt: createdAt,
        };
        const record = {
          id,
          title,
          minutes: 30,
          priority: "Medium",
          category: "General",
          locationId: "general",
          preferredDay: "Auto",
          locked: false,
          recurring: false,
          fixedTime: "",
          notes: "",
          ...taskMeta,
          taskMeta,
          propertyId: "2000",
          updatedAt: createdAt,
        };
        const sql = getSql();
        await ensureAddisonBackingTables();
        await sql`
          INSERT INTO atlas_operational_records (
            record_type, id, property_id, record, updated_at
          )
          VALUES (
            'tasks', ${id}, '2000', ${JSON.stringify(record)}::jsonb, NOW()
          )
          ON CONFLICT (record_type, id)
          DO UPDATE SET
            property_id = EXCLUDED.property_id,
            record = EXCLUDED.record,
            updated_at = NOW()
        `;
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-update") {
        const taskId = String(body.taskId || "");
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => String(task.id) === taskId);
        if (!currentTask) {
          return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        }
        const currentMeta = addisonTaskMeta(currentTask);
        const title = String(body.title || currentTask.title || "").trim();
        const dueDate = String(body.dueDate || currentMeta?.dueDate || "").slice(0, 10);
        const patch: Record<string, unknown> = {
          ...(dueDate ? { dueDate } : {}),
        };
        const ok = await patchAddisonTask(taskId, patch);
        if (!ok) {
          return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        }
        const sql = getSql();
        const rows = await sql`
          SELECT record
          FROM atlas_operational_records
          WHERE record_type = 'tasks'
            AND property_id = '2000'
            AND id = ${taskId}
          LIMIT 1
        `;
        if (rows[0]?.record) {
          const nextRecord = {
            ...rows[0].record,
            title,
            updatedAt: new Date().toISOString(),
          };
          await sql`
            UPDATE atlas_operational_records
            SET record = ${JSON.stringify(nextRecord)}::jsonb,
                updated_at = NOW()
            WHERE record_type = 'tasks'
              AND property_id = '2000'
              AND id = ${taskId}
          `;
        }
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-delete") {
        const taskId = String(body.taskId || "");
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => String(task.id) === taskId);
        if (!currentTask) {
          return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        }
        const sql = getSql();
        await sql`
          DELETE FROM atlas_operational_records
          WHERE record_type = 'tasks'
            AND property_id = '2000'
            AND id = ${taskId}
        `;
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-status") {
        const taskId = String(body.taskId || "");
        const status = String(body.status || "Open");
        const completed = status === "Completed";
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => task.id === taskId);
        const currentMeta = currentTask ? addisonTaskMeta(currentTask) : {};
        const history = Array.isArray(currentMeta?.completionHistory)
          ? currentMeta.completionHistory.map(String)
          : [];
        const nextHistory = completed
          ? Array.from(new Set([...history, today])).sort()
          : history.filter((value: string) => value !== today);

        const ok = await patchAddisonTask(taskId, {
          status,
          completedAt: completed ? new Date().toISOString() : undefined,
          lastCompletedDate: completed ? today : currentMeta?.lastCompletedDate || "",
          completionHistory: nextHistory,
          needsReview: completed,
        });
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-note") {
        const taskId = String(body.taskId || "");
        const note = String(body.note || "");
        const ok = await patchAddisonTask(taskId, { addisonNote: note });
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "routine-toggle") {
        const taskId = String(body.taskId || "");
        const sql = getSql();
        const rows = await sql`
          SELECT tasks
          FROM atlas_routine_occurrences
          WHERE property_id = '2000'
            AND occurrence_date = ${today}::date
          LIMIT 1
        `;
        if (!rows[0]) return NextResponse.json({ ok: false, error: "Routine not found." }, { status: 404 });
        const tasks = Array.isArray(rows[0].tasks) ? rows[0].tasks : [];
        const target = tasks.find((item: any) => String(item.id) === taskId);
        const targetAssignee = String(
          target?.assignedTo ||
          target?.assignee ||
          target?.assigned_to ||
          ""
        )
          .trim()
          .toLowerCase();

        if (
          !target ||
          !(
            targetAssignee === "addison" ||
            targetAssignee === "addison hutton" ||
            targetAssignee.startsWith("addison ")
          )
        ) {
          return NextResponse.json({ ok: false, error: "Addison routine item not found." }, { status: 404 });
        }
        const next = tasks.map((item: any) =>
          String(item.id) === taskId
            ? {
                ...item,
                completed: !Boolean(item.completed),
                status: Boolean(item.completed) ? "open" : "completed",
              }
            : item
        );
        await sql`
          UPDATE atlas_routine_occurrences
          SET tasks = ${JSON.stringify(next)}::jsonb,
              updated_at = NOW()
          WHERE property_id = '2000'
            AND occurrence_date = ${today}::date
        `;
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      return NextResponse.json({ ok: false, error: "Unsupported Addison action." }, { status: 400 });
    }

    const isPublicCrewUpdate = Boolean(token);

    if (!isPublicCrewUpdate) {
      const blocked = adminBlockResponse(request);
      if (blocked) return blocked;
    }

    let targetWeekId = weekId;

    if (token) {
      const tokenRows = await sql`
        SELECT id
        FROM landscape_help_weeks
        WHERE share_token = ${token}
        LIMIT 1
      `;

      if (!tokenRows[0]) return NextResponse.json({ ok: false, error: "Landscape Help link not found." }, { status: 404 });
      targetWeekId = tokenRows[0].id;
    }

    if (!targetWeekId) return NextResponse.json({ ok: false, error: "Missing week id." }, { status: 400 });

    const status = safeStatus(body.status);
    const crewName = typeof body.crewName === "string" ? body.crewName : "";
    const managerNotes = typeof body.managerNotes === "string" ? body.managerNotes : "";
    const crewNotes = typeof body.crewNotes === "string" ? body.crewNotes : "";

    await sql`
      UPDATE landscape_help_weeks
      SET
        status = ${status},
        crew_name = ${crewName},
        manager_notes = CASE WHEN ${isPublicCrewUpdate} THEN manager_notes ELSE ${managerNotes} END,
        crew_notes = ${crewNotes},
        completed_at = CASE WHEN ${status} = 'Complete' THEN COALESCE(completed_at, now()) ELSE NULL END,
        updated_at = now()
      WHERE id = ${targetWeekId}
    `;

    const items = Array.isArray(body.items) ? (body.items as LandscapeHelpItemInput[]) : [];

    for (const item of items) {
      if (!item.id) continue;

      await sql`
        UPDATE landscape_help_items
        SET
          is_done = ${Boolean(item.isDone)},
          notes = ${typeof item.notes === "string" ? item.notes : ""},
          updated_by = ${typeof item.updatedBy === "string" ? item.updatedBy : ""},
          updated_at = now()
        WHERE id = ${item.id}
        AND week_id = ${targetWeekId}
      `;
    }

    const loaded = await loadWeekById(targetWeekId);
    return NextResponse.json({ ok: true, ...loaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Landscape Help error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
