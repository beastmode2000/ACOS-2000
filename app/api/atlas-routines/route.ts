import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RoutineTask = {
  id: string;
  title: string;
  enabled: boolean;
  completed?: boolean;
  status?: "open" | "completed" | "skipped" | "deferred";
  assignedTo?: string;
  assigneeIds?: string[];
  deferredTo?: string;
  deferredFrom?: string;
};

type RoutineTemplate = {
  day: number;
  name: string;
  tasks: RoutineTask[];
};

const DEFAULT_PROPERTY_ID = "2000";

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

function cleanPropertyId(value: unknown) {
  const propertyId = typeof value === "string" ? value.trim() : "";
  return propertyId || DEFAULT_PROPERTY_ID;
}

function propertyIdFromRequest(request: NextRequest) {
  return cleanPropertyId(
    request.nextUrl.searchParams.get("propertyId") ||
      request.nextUrl.searchParams.get("property_id") ||
      request.headers.get("x-atlas-property-id"),
  );
}

function asDateKey(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";

  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text
    : new Date().toISOString().slice(0, 10);
}

function normalizeTasks(value: unknown): RoutineTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      const title =
        typeof record.title === "string" ? record.title.trim() : "";

      if (!title) {
        return null;
      }

      const completed = record.completed === true;
      const status = cleanTaskStatus(record.status, completed);

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id.trim()
            : `routine-task-${Date.now()}-${index}`,
        title,
        enabled: record.enabled !== false,
        completed: status === "completed",
        status,
        assignedTo: cleanAssignee(record.assignedTo),
        assigneeIds: Array.isArray(record.assigneeIds)
          ? Array.from(
              new Set(
                record.assigneeIds
                  .map((value) => String(value || "").trim())
                  .filter(Boolean),
              ),
            )
          : [],
        ...(typeof record.deferredTo === "string" && record.deferredTo ? { deferredTo: record.deferredTo } : {}),
        ...(typeof record.deferredFrom === "string" && record.deferredFrom ? { deferredFrom: record.deferredFrom } : {}),
      };
    })
    .filter(Boolean) as RoutineTask[];
}

function asTemplateTask(task: RoutineTask): RoutineTask {
  const { completed: _completed, status: _status, deferredTo: _deferredTo, deferredFrom: _deferredFrom, ...templateTask } = task;
  return templateTask;
}

function weekdayFromDate(dateKey: string) {
  const day = new Date(`${dateKey}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

const LEGACY_GENERATED_ROUTINE_TASK_IDS = new Set([
  "mon-garbage-cans", "mon-goose", "mon-dog", "mon-garages", "mon-front-entry",
  "mon-water-pots", "mon-dry-spots", "mon-fountain", "fri-clean-boat", "fri-clean-cars",
]);

function isLegacyGeneratedRoutineTask(task: RoutineTask) {
  const id = String(task.id || "");
  return id.startsWith("atlas-ops-") || LEGACY_GENERATED_ROUTINE_TASK_IDS.has(id);
}

async function ensureTables(sql: ReturnType<typeof neon>) {
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

  await sql`
    ALTER TABLE atlas_routine_templates
    ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'
  `;

  await sql`
    ALTER TABLE atlas_routine_occurrences
    ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'
  `;

  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'atlas_routine_templates_day_of_week_check'
          AND pg_get_constraintdef(oid) NOT LIKE '%7%'
      ) THEN
        ALTER TABLE atlas_routine_templates DROP CONSTRAINT atlas_routine_templates_day_of_week_check;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'atlas_routine_templates_day_of_week_check') THEN
        ALTER TABLE atlas_routine_templates ADD CONSTRAINT atlas_routine_templates_day_of_week_check CHECK (day_of_week BETWEEN 1 AND 7);
      END IF;
    END $$
  `;

  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'atlas_routine_occurrences_day_of_week_check'
          AND pg_get_constraintdef(oid) NOT LIKE '%7%'
      ) THEN
        ALTER TABLE atlas_routine_occurrences DROP CONSTRAINT atlas_routine_occurrences_day_of_week_check;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'atlas_routine_occurrences_day_of_week_check') THEN
        ALTER TABLE atlas_routine_occurrences ADD CONSTRAINT atlas_routine_occurrences_day_of_week_check CHECK (day_of_week BETWEEN 1 AND 7);
      END IF;
    END $$
  `;

  // The original tables used global primary keys. Remove those so the same
  // weekday/date can exist independently for every property.
  await sql`
    ALTER TABLE atlas_routine_templates
    DROP CONSTRAINT IF EXISTS atlas_routine_templates_pkey
  `;

  await sql`
    ALTER TABLE atlas_routine_occurrences
    DROP CONSTRAINT IF EXISTS atlas_routine_occurrences_pkey
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS atlas_routine_templates_property_day_uidx
    ON atlas_routine_templates (property_id, day_of_week)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS atlas_routine_occurrences_property_date_uidx
    ON atlas_routine_occurrences (property_id, occurrence_date)
  `;
}

async function cleanupLegacyGeneratedRoutines(
  sql: ReturnType<typeof neon>,
  propertyId: string,
) {
  const templates = (await sql`
    SELECT day_of_week, name, tasks
    FROM atlas_routine_templates
    WHERE property_id = ${propertyId}
  `) as unknown as Array<Record<string, unknown>>;

  for (const row of templates) {
    const tasks = normalizeTasks(row.tasks);
    const cleaned = tasks.filter((task) => !isLegacyGeneratedRoutineTask(task));
    if (cleaned.length === tasks.length) continue;
    await sql`
      UPDATE atlas_routine_templates
      SET tasks = ${JSON.stringify(cleaned.map(asTemplateTask))}::jsonb, updated_at = NOW()
      WHERE property_id = ${propertyId}
        AND day_of_week = ${Number(row.day_of_week)}
    `;
  }

  const occurrences = (await sql`
    SELECT occurrence_date, tasks
    FROM atlas_routine_occurrences
    WHERE property_id = ${propertyId}
  `) as unknown as Array<Record<string, unknown>>;

  for (const row of occurrences) {
    const tasks = normalizeTasks(row.tasks);
    const cleaned = tasks.filter((task) => !isLegacyGeneratedRoutineTask(task));
    if (cleaned.length === tasks.length) continue;
    await sql`
      UPDATE atlas_routine_occurrences
      SET tasks = ${JSON.stringify(cleaned)}::jsonb, updated_at = NOW()
      WHERE property_id = ${propertyId}
        AND occurrence_date = ${String(row.occurrence_date).slice(0, 10)}::date
    `;
  }
}

async function loadTemplates(
  sql: ReturnType<typeof neon>,
  propertyId: string,
) {
  const rows = (await sql`
    SELECT
      day_of_week,
      name,
      tasks
    FROM atlas_routine_templates
    WHERE property_id = ${propertyId}
    ORDER BY day_of_week ASC
  `) as unknown as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    day: Number(row.day_of_week),
    name: String(row.name || "Routine"),
    tasks: normalizeTasks(row.tasks).map(asTemplateTask),
  }));
}

async function getOrCreateOccurrence(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  dateKey: string,
) {
  const day = weekdayFromDate(dateKey);

  if (!day) {
    return null;
  }

  const templateRows = (await sql`
    SELECT
      day_of_week,
      name,
      tasks
    FROM atlas_routine_templates
    WHERE property_id = ${propertyId}
      AND day_of_week = ${day}
    LIMIT 1
  `) as unknown as Array<Record<string, unknown>>;

  const template = templateRows[0];

  if (!template) {
    return null;
  }

  const templateName = String(template.name || "Routine");
  const templateTasks = normalizeTasks(template.tasks).filter(
    (task) => task.enabled,
  );

  const occurrenceRows = (await sql`
    SELECT
      occurrence_date,
      day_of_week,
      routine_name,
      tasks
    FROM atlas_routine_occurrences
    WHERE property_id = ${propertyId}
      AND occurrence_date = ${dateKey}::date
    LIMIT 1
  `) as unknown as Array<Record<string, unknown>>;

  if (!occurrenceRows.length) {
    const occurrenceTasks = synchronizeOccurrenceTasks(templateTasks);

    await sql`
      INSERT INTO atlas_routine_occurrences (
        property_id,
        occurrence_date,
        day_of_week,
        routine_name,
        tasks,
        updated_at
      )
      VALUES (
        ${propertyId},
        ${dateKey}::date,
        ${day},
        ${templateName},
        ${JSON.stringify(occurrenceTasks)}::jsonb,
        NOW()
      )
      ON CONFLICT (property_id, occurrence_date) DO NOTHING
    `;

    return {
      propertyId,
      date: dateKey,
      day,
      name: templateName,
      tasks: occurrenceTasks,
    };
  }

  const occurrence = occurrenceRows[0];
  const existingTasks = normalizeTasks(occurrence.tasks);
  const synchronizedTasks = synchronizeOccurrenceTasks(templateTasks, existingTasks);
  const existingComparable = existingTasks;

  const needsSynchronization =
    String(occurrence.routine_name || "") !== templateName ||
    JSON.stringify(existingComparable) !== JSON.stringify(synchronizedTasks);

  if (needsSynchronization) {
    await sql`
      UPDATE atlas_routine_occurrences
      SET
        day_of_week = ${day},
        routine_name = ${templateName},
        tasks = ${JSON.stringify(synchronizedTasks)}::jsonb,
        updated_at = NOW()
      WHERE property_id = ${propertyId}
        AND occurrence_date = ${dateKey}::date
    `;
  }

  return {
    propertyId,
    date: dateKey,
    day,
    name: templateName,
    tasks: synchronizedTasks,
  };
}

async function refreshOccurrenceForDate(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  dateKey: string,
  day: number,
  name: string,
  templateTasks: RoutineTask[],
) {
  if (weekdayFromDate(dateKey) !== day) {
    return;
  }

  const rows = (await sql`
    SELECT tasks
    FROM atlas_routine_occurrences
    WHERE property_id = ${propertyId}
      AND occurrence_date = ${dateKey}::date
    LIMIT 1
  `) as unknown as Array<Record<string, unknown>>;

  if (!rows.length) {
    return;
  }

  const existingTasks = normalizeTasks(rows[0].tasks);
  const refreshedTasks = synchronizeOccurrenceTasks(templateTasks, existingTasks);

  await sql`
    UPDATE atlas_routine_occurrences
    SET
      day_of_week = ${day},
      routine_name = ${name},
      tasks = ${JSON.stringify(refreshedTasks)}::jsonb,
      updated_at = NOW()
    WHERE property_id = ${propertyId}
      AND occurrence_date = ${dateKey}::date
  `;
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    const propertyId = propertyIdFromRequest(request);
    const dateKey = asDateKey(request.nextUrl.searchParams.get("date"));

    await ensureTables(sql);
    await cleanupLegacyGeneratedRoutines(sql, propertyId);

    const [templates, occurrence] = await Promise.all([
      loadTemplates(sql, propertyId),
      getOrCreateOccurrence(sql, propertyId, dateKey),
    ]);

    return NextResponse.json({
      ok: true,
      propertyId,
      templates,
      occurrence,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Routine read failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("x-atlas-user-role") === "viewer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Viewer access is read-only.",
      },
      { status: 403 },
    );
  }

  try {
    const sql = getSql();
    const body = (await request.json()) as Record<string, unknown>;
    const propertyId = cleanPropertyId(
      body.propertyId ||
        body.property_id ||
        request.headers.get("x-atlas-property-id"),
    );
    const action = String(body.action || "");

    await ensureTables(sql);
    await cleanupLegacyGeneratedRoutines(sql, propertyId);

    if (action === "clear-all") {
      await sql`DELETE FROM atlas_routine_occurrences WHERE property_id = ${propertyId}`;
      await sql`DELETE FROM atlas_routine_templates WHERE property_id = ${propertyId}`;
      return NextResponse.json({ ok: true, propertyId, templates: [], occurrence: null });
    }

    if (action === "save-template") {
      const day = Number(body.day);

      if (!Number.isInteger(day) || day < 1 || day > 7) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid routine day",
          },
          { status: 400 },
        );
      }

      const name = String(body.name || "Routine").trim() || "Routine";
      const tasks = normalizeTasks(body.tasks).map(asTemplateTask);

      await sql`
        INSERT INTO atlas_routine_templates (
          property_id,
          day_of_week,
          name,
          tasks,
          updated_at
        )
        VALUES (
          ${propertyId},
          ${day},
          ${name},
          ${JSON.stringify(tasks)}::jsonb,
          NOW()
        )
        ON CONFLICT (property_id, day_of_week)
        DO UPDATE SET
          name = EXCLUDED.name,
          tasks = EXCLUDED.tasks,
          updated_at = NOW()
      `;

      const requestedDate =
        typeof body.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.date)
          ? body.date
          : "";

      const utcToday = new Date().toISOString().slice(0, 10);
      const utcYesterdayDate = new Date();
      utcYesterdayDate.setUTCDate(utcYesterdayDate.getUTCDate() - 1);
      const utcYesterday = utcYesterdayDate.toISOString().slice(0, 10);

      const candidateDates = Array.from(
        new Set([requestedDate, utcToday, utcYesterday].filter(Boolean)),
      );

      for (const candidateDate of candidateDates) {
        await refreshOccurrenceForDate(
          sql,
          propertyId,
          candidateDate,
          day,
          name,
          tasks,
        );
      }

      const responseDate =
        requestedDate ||
        candidateDates.find(
          (candidateDate) => weekdayFromDate(candidateDate) === day,
        );

      return NextResponse.json({
        ok: true,
        propertyId,
        occurrence: responseDate
          ? await getOrCreateOccurrence(sql, propertyId, responseDate)
          : null,
      });
    }

    if (
      action === "add-today-task" ||
      action === "edit-today-task" ||
      action === "delete-today-task"
    ) {
      const dateKey = asDateKey(body.date);
      const occurrence = await getOrCreateOccurrence(sql, propertyId, dateKey);

      if (!occurrence) {
        return NextResponse.json(
          { ok: false, error: "No weekday routine" },
          { status: 400 },
        );
      }

      let tasks = [...occurrence.tasks];

      if (action === "add-today-task") {
        const title = String(body.title || "").trim();
        if (!title) {
          return NextResponse.json(
            { ok: false, error: "Routine item needs a title" },
            { status: 400 },
          );
        }
        tasks.push({
          id: `today-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title,
          enabled: true,
          completed: false,
          status: "open",
          assignedTo: cleanAssignee(body.assignedTo),
        });
      }

      if (action === "edit-today-task") {
        const taskId = String(body.taskId || "");
        const title = String(body.title || "").trim();
        if (!taskId || !title) {
          return NextResponse.json(
            { ok: false, error: "Routine item could not be edited" },
            { status: 400 },
          );
        }
        tasks = tasks.map((item) =>
          item.id === taskId ? { ...item, title } : item,
        );
      }

      if (action === "delete-today-task") {
        const taskId = String(body.taskId || "");
        tasks = tasks.filter((item) => item.id !== taskId);
      }

      await sql`
        UPDATE atlas_routine_occurrences
        SET tasks = ${JSON.stringify(tasks)}::jsonb, updated_at = NOW()
        WHERE property_id = ${propertyId}
          AND occurrence_date = ${dateKey}::date
      `;

      return NextResponse.json({
        ok: true,
        propertyId,
        occurrence: { ...occurrence, tasks },
      });
    }

    if (action === "toggle-task") {
      const dateKey = asDateKey(body.date);
      const taskId = String(body.taskId || "");
      const occurrence = await getOrCreateOccurrence(
        sql,
        propertyId,
        dateKey,
      );

      if (!occurrence) {
        return NextResponse.json(
          {
            ok: false,
            error: "No weekday routine",
          },
          { status: 400 },
        );
      }

      const tasks = occurrence.tasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              completed: item.status !== "completed",
              status: item.status === "completed" ? "open" : "completed",
              deferredTo: undefined,
            }
          : item,
      );

      await sql`
        UPDATE atlas_routine_occurrences
        SET
          tasks = ${JSON.stringify(tasks)}::jsonb,
          updated_at = NOW()
        WHERE property_id = ${propertyId}
          AND occurrence_date = ${dateKey}::date
      `;

      return NextResponse.json({
        ok: true,
        propertyId,
        occurrence: {
          ...occurrence,
          tasks,
        },
      });
    }

    if (action === "assign-task" || action === "skip-task" || action === "defer-task") {
      const dateKey = asDateKey(body.date);
      const taskId = String(body.taskId || "");
      let occurrence = await getOrCreateOccurrence(sql, propertyId, dateKey);
      let selectedTask = occurrence?.tasks.find((item) => item.id === taskId);

      // A newly saved routine can be followed immediately by an assignment,
      // skip, or defer action from the dashboard. Re-read/synchronize once
      // before treating the task as missing so the first action does not 404
      // against a stale occurrence.
      if (occurrence && !selectedTask) {
        const templateRows = (await sql`
          SELECT name, tasks
          FROM atlas_routine_templates
          WHERE property_id = ${propertyId}
            AND day_of_week = ${occurrence.day}
          LIMIT 1
        `) as unknown as Array<Record<string, unknown>>;

        const templateRow = templateRows[0];
        if (templateRow) {
          const templateTasks = normalizeTasks(templateRow.tasks).map(asTemplateTask);
          const synchronizedTasks = synchronizeOccurrenceTasks(templateTasks, occurrence.tasks);

          await sql`
            UPDATE atlas_routine_occurrences
            SET
              routine_name = ${String(templateRow.name || occurrence.name)},
              tasks = ${JSON.stringify(synchronizedTasks)}::jsonb,
              updated_at = NOW()
            WHERE property_id = ${propertyId}
              AND occurrence_date = ${dateKey}::date
          `;

          occurrence = {
            ...occurrence,
            name: String(templateRow.name || occurrence.name),
            tasks: synchronizedTasks,
          };
          selectedTask = occurrence.tasks.find((item) => item.id === taskId);
        }
      }

      if (!occurrence || !selectedTask) {
        return NextResponse.json(
          { ok: false, error: "Routine item was not found" },
          { status: 404 },
        );
      }

      if (action === "assign-task") {
        const assignedTo = cleanAssignee(body.assignedTo);
        const tasks = occurrence.tasks.map((item) => item.id === taskId ? { ...item, assignedTo } : item);
        await sql`
          UPDATE atlas_routine_occurrences
          SET tasks = ${JSON.stringify(tasks)}::jsonb, updated_at = NOW()
          WHERE property_id = ${propertyId} AND occurrence_date = ${dateKey}::date
        `;
        return NextResponse.json({ ok: true, propertyId, occurrence: { ...occurrence, tasks } });
      }

      if (action === "skip-task") {
        const tasks = occurrence.tasks.map((item) => item.id === taskId ? { ...item, completed: false, status: "skipped" as const, deferredTo: undefined } : item);
        await sql`
          UPDATE atlas_routine_occurrences
          SET tasks = ${JSON.stringify(tasks)}::jsonb, updated_at = NOW()
          WHERE property_id = ${propertyId} AND occurrence_date = ${dateKey}::date
        `;
        return NextResponse.json({ ok: true, propertyId, occurrence: { ...occurrence, tasks } });
      }

      const targetDate = nextWorkdayDate(dateKey);
      const targetOccurrence = await getOrCreateOccurrence(sql, propertyId, targetDate);
      if (!targetOccurrence) {
        return NextResponse.json({ ok: false, error: "The next workday routine could not be created" }, { status: 400 });
      }
      const arrivalId = `${selectedTask.id}--from-${dateKey}`;
      const arrival: RoutineTask = {
        ...selectedTask,
        id: arrivalId,
        completed: false,
        status: "open",
        deferredFrom: dateKey,
        deferredTo: undefined,
      };
      const targetTasks = targetOccurrence.tasks.some((item) => item.id === arrivalId) ? targetOccurrence.tasks : [...targetOccurrence.tasks, arrival];
      const sourceTasks = occurrence.tasks.map((item) => item.id === taskId ? { ...item, completed: false, status: "deferred" as const, deferredTo: targetDate } : item);
      await sql`
        UPDATE atlas_routine_occurrences
        SET tasks = ${JSON.stringify(targetTasks)}::jsonb, updated_at = NOW()
        WHERE property_id = ${propertyId} AND occurrence_date = ${targetDate}::date
      `;
      await sql`
        UPDATE atlas_routine_occurrences
        SET tasks = ${JSON.stringify(sourceTasks)}::jsonb, updated_at = NOW()
        WHERE property_id = ${propertyId} AND occurrence_date = ${dateKey}::date
      `;
      return NextResponse.json({ ok: true, propertyId, movedTo: targetDate, occurrence: { ...occurrence, tasks: sourceTasks } });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported routine action",
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Routine save failed",
      },
      { status: 500 },
    );
  }
}

function synchronizeOccurrenceTasks(templateTasks: RoutineTask[], existingTasks: RoutineTask[] = []) {
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  const templateIds = new Set(templateTasks.map((task) => task.id));
  const scheduled = templateTasks.filter((task) => task.enabled).map((task) => {
    const existing = existingById.get(task.id);
    const status = existing?.status || (existing?.completed ? "completed" : "open");
    return {
      id: task.id,
      title: task.title,
      enabled: task.enabled,
      completed: status === "completed",
      status,
      assignedTo: existing?.assignedTo || task.assignedTo || "Nick",
      ...(existing?.deferredTo ? { deferredTo: existing.deferredTo } : {}),
    } as RoutineTask;
  });
  const deferredArrivals = existingTasks.filter((task) => task.deferredFrom && !templateIds.has(task.id));
  return [...scheduled, ...deferredArrivals];
}

function nextWorkdayDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  do {
    date.setUTCDate(date.getUTCDate() + 1);
  } while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return date.toISOString().slice(0, 10);
}

function cleanAssignee(value: unknown): RoutineTask["assignedTo"] {
  const assignee =
    typeof value === "string" ? value.trim() : "";

  // Preserve real Atlas user names and the multi-assignee compatibility label.
  // Legacy records with no assignment still belong to Nick.
  return assignee || "Nick";
}

function cleanTaskStatus(value: unknown, completed = false): RoutineTask["status"] {
  return value === "skipped" || value === "deferred" ? value : completed || value === "completed" ? "completed" : "open";
}
