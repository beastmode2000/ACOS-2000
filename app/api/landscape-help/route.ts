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

async function ensureInboxTable() {
  const sql = getSql();
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
}


function isAddisonAssigneeValue(value: unknown) {
  const assigned = String(value || "").trim().toLowerCase();
  return assigned === "addison" || assigned === "addison hutton" || assigned.startsWith("addison ");
}

function nextAddisonWorkDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  do {
    date.setDate(date.getDate() + 1);
  } while ([0,1,6].includes(date.getDay()));
  return date.toISOString().slice(0, 10);
}

function nextRecurringDate(
  dateKey: string,
  intervalValue: unknown,
  unitValue: unknown,
) {
  const interval = Math.max(1, Number(intervalValue || 1));
  const unit = String(unitValue || "Weeks");
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  if (unit === "Days") date.setDate(date.getDate() + interval);
  else if (unit === "Months") date.setMonth(date.getMonth() + interval);
  else if (unit === "Years") date.setFullYear(date.getFullYear() + interval);
  else date.setDate(date.getDate() + interval * 7);
  return date.toISOString().slice(0, 10);
}

async function removeAddisonRoutineAssignments() {
  await ensureAddisonBackingTables();
  const sql = getSql();

  const templateRows = await sql`
    SELECT day_of_week, tasks
    FROM atlas_routine_templates
    WHERE property_id = '2000'
  `;

  for (const row of templateRows) {
    const currentTasks = Array.isArray(row.tasks) ? row.tasks : [];
    const nextTasks = currentTasks.filter(
      (task: any) =>
        !isAddisonAssigneeValue(
          task?.assignedTo || task?.assignee || task?.assigned_to,
        ),
    );

    if (nextTasks.length !== currentTasks.length) {
      await sql`
        UPDATE atlas_routine_templates
        SET tasks = ${JSON.stringify(nextTasks)}::jsonb,
            updated_at = NOW()
        WHERE property_id = '2000'
          AND day_of_week = ${Number(row.day_of_week)}
      `;
    }
  }

  const occurrenceRows = await sql`
    SELECT occurrence_date, tasks
    FROM atlas_routine_occurrences
    WHERE property_id = '2000'
  `;

  for (const row of occurrenceRows) {
    const currentTasks = Array.isArray(row.tasks) ? row.tasks : [];
    const nextTasks = currentTasks.filter(
      (task: any) =>
        !isAddisonAssigneeValue(
          task?.assignedTo || task?.assignee || task?.assigned_to,
        ),
    );

    if (nextTasks.length !== currentTasks.length) {
      await sql`
        UPDATE atlas_routine_occurrences
        SET tasks = ${JSON.stringify(nextTasks)}::jsonb,
            updated_at = NOW()
        WHERE property_id = '2000'
          AND occurrence_date = ${String(row.occurrence_date).slice(0, 10)}::date
      `;
    }
  }
}

async function loadAddisonWork() {
  await ensureAddisonBackingTables();
  await removeAddisonRoutineAssignments();

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
    id: String(row.id || row.record?.id || ''),
    serverUpdatedAt: row.updated_at,
  })) as AddisonTaskRecord[];

  const seenTasks = new Set<string>();
  const tasks = allTasks
    .filter(isAddisonAssigned)
    .filter((task) => {
      const meta = addisonTaskMeta(task);
      const identity = [
        String(task.title || '').trim().toLowerCase().replace(/\s+/g, ' '),
        String(meta?.dueDate || '').slice(0, 10),
        String(task.locationId || 'general'),
        task.recurring
          ? `${Number(meta?.recurrenceInterval || 1)}-${String(meta?.recurrenceUnit || 'Weeks')}`
          : 'one-time',
        meta?.status === 'Completed' ? 'completed' : 'active',
      ].join('||');

      if (seenTasks.has(identity)) return false;
      seenTasks.add(identity);
      return true;
    })
    .sort((a, b) => {
      const am = addisonTaskMeta(a);
      const bm = addisonTaskMeta(b);
      return String(am?.dueDate || '9999-12-31').localeCompare(
        String(bm?.dueDate || '9999-12-31'),
      );
    });

  const dailyNoteRows = await sql`
    SELECT record
    FROM atlas_operational_records
    WHERE record_type = 'addison_daily_note'
      AND property_id = '2000'
      AND id = ${today}
    LIMIT 1
  `;

  const dailyNoteRecord = dailyNoteRows[0]?.record || {};

  const locationRows = await sql`
    SELECT id, record
    FROM atlas_operational_records
    WHERE record_type = 'locations'
      AND property_id = '2000'
    ORDER BY COALESCE(record->>'name', record->>'title', id) ASC
  `;

  const locations = locationRows.map((row: any) => ({
    id: String(row.id || row.record?.id || ''),
    name: String(row.record?.name || row.record?.title || 'Location'),
  }));

  return {
    today,
    tasks,
    locations,
    dailyNote: String(dailyNoteRecord.note || ''),
    dailyNoteUpdatedAt: String(dailyNoteRecord.updatedAt || ''),
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

      if (action === "field-report") {
        const description = String(body.description || "").trim();
        if (!description) {
          return NextResponse.json(
            { ok: false, error: "Describe what you found." },
            { status: 400 },
          );
        }

        await ensureInboxTable();
        const locationId = String(body.locationId || "");
        const locationName = String(body.locationName || "General property");
        const canHandle = Boolean(body.canHandle);
        const files = Array.isArray(body.files) ? body.files : [];
        const firstLine =
          description.split(/\r?\n/).find((line) => line.trim())?.trim() ||
          "Field Report";
        const title =
          firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;

        const duplicates = await sql`
          SELECT id
          FROM atlas_inbox_items
          WHERE source = 'Addison Field Report'
            AND status <> 'Archived'
            AND LOWER(TRIM(notes)) = LOWER(TRIM(${description}))
            AND COALESCE(extracted_data->>'propertyId', '') = '2000'
            AND COALESCE(extracted_data->>'locationId', '') = ${locationId}
          LIMIT 1
        `;
        if (!duplicates[0]) {
          const id = `inbox-addison-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const extractedData = {
            propertyId: "2000",
            reportType: "Field Report",
            submittedBy: "Addison Hutton",
            canHandle,
            locationId,
            locationName,
            suggestedAction: "Create Task",
          };
          await sql`
            INSERT INTO atlas_inbox_items (
              id, title, intake_type, status, source, notes, pasted_text,
              files, target_type, target_id, target_name, proposed_action,
              extracted_data, created_at, updated_at
            )
            VALUES (
              ${id}, ${title}, 'Work Order Issue', 'Needs Review',
              'Addison Field Report', ${description}, '',
              ${JSON.stringify(files)}::jsonb,
              ${locationId ? "Location" : "General"}, ${locationId},
              ${locationName}, 'Attach to Existing',
              ${JSON.stringify(extractedData)}::jsonb, NOW(), NOW()
            )
          `;
        }

        return NextResponse.json({
          ok: true,
          mode: "addison",
          addison: await loadAddisonWork(),
        });
      }

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

        const recurring = Boolean(currentTask?.recurring);
        const ok = await patchAddisonTask(
          taskId,
          completed && recurring
            ? {
                status: "Open",
                dueDate: nextRecurringDate(
                  String(currentMeta?.dueDate || today).slice(0, 10),
                  currentMeta?.recurrenceInterval,
                  currentMeta?.recurrenceUnit,
                ),
                completedAt: undefined,
                lastCompletedDate: today,
                completionHistory: nextHistory,
                needsReview: true,
              }
            : {
                status,
                completedAt: completed ? new Date().toISOString() : undefined,
                lastCompletedDate: completed
                  ? today
                  : String(currentMeta?.lastCompletedDate || "").slice(0, 10) === today
                    ? ""
                    : currentMeta?.lastCompletedDate || "",
                completionHistory: nextHistory,
                needsReview: completed,
              },
        );
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "daily-note") {
        const note = String(body.note || "");
        const sql = getSql();
        const updatedAt = new Date().toISOString();

        await sql`
          INSERT INTO atlas_operational_records (
            record_type, id, property_id, record, updated_at
          )
          VALUES (
            'addison_daily_note',
            ${today},
            '2000',
            ${JSON.stringify({ date: today, note, updatedAt })}::jsonb,
            NOW()
          )
          ON CONFLICT (record_type, id)
          DO UPDATE SET
            property_id = EXCLUDED.property_id,
            record = EXCLUDED.record,
            updated_at = NOW()
        `;

        await sql`
          UPDATE atlas_operational_records
          SET record = ${JSON.stringify({ date: today, note, updatedAt })}::jsonb,
              updated_at = NOW()
          WHERE record_type = 'addison_daily_note'
            AND property_id = '2000'
            AND id = ${today}
        `;

        return NextResponse.json({
          ok: true,
          mode: "addison",
          addison: await loadAddisonWork(),
        });
      }

      if (action === "task-note") {
        const taskId = String(body.taskId || "");
        const note = String(body.note || "");
        const ok = await patchAddisonTask(taskId, { addisonNote: note });
        if (!ok) return NextResponse.json({ ok: false, error: "Addison task not found." }, { status: 404 });
        return NextResponse.json({ ok: true, mode: "addison", addison: await loadAddisonWork() });
      }

      if (action === "task-photo") {
        const taskId = String(body.taskId || "");
        const currentWork = await loadAddisonWork();
        const currentTask = currentWork.tasks.find((task: any) => String(task.id) === taskId);
        if (!currentTask) return NextResponse.json({ ok:false, error:"Addison task not found." }, { status:404 });
        const meta = addisonTaskMeta(currentTask);
        const photos = Array.isArray(meta?.photos) ? meta.photos : [];
        const ok = await patchAddisonTask(taskId, { photos: [...photos, body.photo].filter(Boolean) });
        if (!ok) return NextResponse.json({ ok:false, error:"Addison task not found." }, { status:404 });
        return NextResponse.json({ ok:true, mode:"addison", addison:await loadAddisonWork() });
      }

      if (action === "task-flag" || action === "task-problem" || action === "task-nothing-needed") {
        const taskId = String(body.taskId || "");
        const patch =
          action === "task-flag" ? { needsNick: Boolean(body.needsNick) } :
          action === "task-problem" ? { problemFound: Boolean(body.problemFound) } :
          { checkedNothingNeeded: Boolean(body.value) };
        const ok = await patchAddisonTask(taskId, patch);
        if (!ok) return NextResponse.json({ ok:false, error:"Addison task not found." }, { status:404 });
        return NextResponse.json({ ok:true, mode:"addison", addison:await loadAddisonWork() });
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
