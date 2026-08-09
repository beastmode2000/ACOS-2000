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
  recurrenceUnit?: "Days" | "Weeks" | "Months";
  recurrenceInterval?: number;
  recurrenceAnchorDate?: string;
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

function seedTemplates(): RoutineTemplate[] {
  return [
    {
      day: 1,
      name: "Monday Morning Routine",
      tasks: [
        {
          id: "mon-garbage-cans",
          title: "Clean garbage cans after they are emptied",
          enabled: true,
        },
        {
          id: "mon-goose",
          title: "Clean up after geese",
          enabled: true,
        },
        {
          id: "mon-dog",
          title: "Clean up after the dog",
          enabled: true,
        },
        {
          id: "mon-garages",
          title: "Check garages",
          enabled: true,
        },
        {
          id: "mon-front-entry",
          title: "Check front entry",
          enabled: true,
        },
        {
          id: "mon-water-pots",
          title: "Water pots",
          enabled: true,
        },
        {
          id: "mon-dry-spots",
          title: "Water dry spots",
          enabled: true,
        },
        {
          id: "mon-fountain",
          title: "Clean and treat fountain",
          enabled: true,
        },
      ],
    },
    {
      day: 2,
      name: "Tuesday Routine",
      tasks: [],
    },
    {
      day: 3,
      name: "Wednesday Landscape Routine",
      tasks: [],
    },
    {
      day: 4,
      name: "Thursday Routine",
      tasks: [],
    },
    {
      day: 5,
      name: "Friday Boat and Cars Routine",
      tasks: [
        {
          id: "fri-clean-boat",
          title: "Clean boat",
          enabled: true,
        },
        {
          id: "fri-clean-cars",
          title: "Clean cars",
          enabled: true,
        },
      ],
    },
    {
      day: 6,
      name: "Saturday Routine",
      tasks: [],
    },
    {
      day: 7,
      name: "Sunday Routine",
      tasks: [],
    },
  ];
}

async function ensureTables(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_templates (
      property_id text NOT NULL DEFAULT '2000',
      day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      recurrence_unit text NOT NULL DEFAULT 'Weeks',
      recurrence_interval integer NOT NULL DEFAULT 1,
      recurrence_anchor_date date,
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
    ALTER TABLE atlas_routine_templates
    ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'
  `;
  await sql`
    ALTER TABLE atlas_routine_templates
    ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1
  `;
  await sql`
    ALTER TABLE atlas_routine_templates
    ADD COLUMN IF NOT EXISTS recurrence_anchor_date date
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

async function ensurePropertySeeds(
  sql: ReturnType<typeof neon>,
  propertyId: string,
) {
  for (const seed of seedTemplates()) {
    await sql`
      INSERT INTO atlas_routine_templates (
        property_id,
        day_of_week,
        name,
        tasks
      )
      VALUES (
        ${propertyId},
        ${seed.day},
        ${seed.name},
        ${JSON.stringify(seed.tasks)}::jsonb
      )
      ON CONFLICT (property_id, day_of_week) DO NOTHING
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
      tasks,
      recurrence_unit,
      recurrence_interval,
      recurrence_anchor_date
    FROM atlas_routine_templates
    WHERE property_id = ${propertyId}
    ORDER BY day_of_week ASC
  `) as unknown as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    day: Number(row.day_of_week),
    name: String(row.name || "Routine"),
    tasks: normalizeTasks(row.tasks).map(asTemplateTask),
    recurrenceUnit:
      row.recurrence_unit === "Days" || row.recurrence_unit === "Months"
        ? row.recurrence_unit
        : "Weeks",
    recurrenceInterval: Math.max(1, Number(row.recurrence_interval || 1)),
    recurrenceAnchorDate: row.recurrence_anchor_date
      ? String(row.recurrence_anchor_date).slice(0, 10)
      : "",
  }));
}

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function wholeDaysBetween(a: string, b: string) {
  return Math.floor(
    (dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000,
  );
}

function wholeMonthsBetween(a: string, b: string) {
  const start = dateOnly(a);
  const end = dateOnly(b);
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  );
}

function templateDueOnDate(
  template: Record<string, unknown>,
  dateKey: string,
) {
  const unit =
    template.recurrence_unit === "Days" ||
    template.recurrence_unit === "Months"
      ? String(template.recurrence_unit)
      : "Weeks";
  const interval = Math.max(1, Number(template.recurrence_interval || 1));
  const anchor = template.recurrence_anchor_date
    ? String(template.recurrence_anchor_date).slice(0, 10)
    : dateKey;

  if (dateKey < anchor) return false;

  if (unit === "Days") {
    return wholeDaysBetween(anchor, dateKey) % interval === 0;
  }

  if (unit === "Months") {
    const anchorDate = dateOnly(anchor);
    const date = dateOnly(dateKey);
    return (
      date.getUTCDate() === anchorDate.getUTCDate() &&
      wholeMonthsBetween(anchor, dateKey) % interval === 0
    );
  }

  const day = weekdayFromDate(dateKey);
  if (day !== Number(template.day_of_week)) return false;

  const days = wholeDaysBetween(anchor, dateKey);
  return Math.floor(Math.max(0, days) / 7) % interval === 0;
}

async function scheduledTemplateForDate(
  sql: ReturnType<typeof neon>,
  propertyId: string,
  dateKey: string,
) {
  const rows = (await sql`
    SELECT
      day_of_week,
      name,
      tasks,
      recurrence_unit,
      recurrence_interval,
      recurrence_anchor_date
    FROM atlas_routine_templates
    WHERE property_id = ${propertyId}
    ORDER BY day_of_week ASC
  `) as unknown as Array<Record<string, unknown>>;

  const due = rows.filter((row) => templateDueOnDate(row, dateKey));
  if (!due.length) return null;

  return {
    day: weekdayFromDate(dateKey),
    name: due.map((row) => String(row.name || "Routine")).join(" + "),
    tasks: due.flatMap((row) =>
      normalizeTasks(row.tasks).filter((task) => task.enabled),
    ),
  };
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

  const scheduled = await scheduledTemplateForDate(
    sql,
    propertyId,
    dateKey,
  );

  if (!scheduled) {
    return null;
  }

  const templateName = scheduled.name;
  const templateTasks = scheduled.tasks;

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
    await ensurePropertySeeds(sql, propertyId);

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
    await ensurePropertySeeds(sql, propertyId);

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
      const recurrenceUnit =
        body.recurrenceUnit === "Days" || body.recurrenceUnit === "Months"
          ? String(body.recurrenceUnit)
          : "Weeks";
      const recurrenceInterval = Math.max(
        1,
        Math.floor(Number(body.recurrenceInterval || 1)),
      );
      const recurrenceAnchorDate =
        typeof body.recurrenceAnchorDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.recurrenceAnchorDate)
          ? body.recurrenceAnchorDate
          : typeof body.date === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(body.date)
            ? body.date
            : new Date().toISOString().slice(0, 10);

      await sql`
        INSERT INTO atlas_routine_templates (
          property_id,
          day_of_week,
          name,
          tasks,
          recurrence_unit,
          recurrence_interval,
          recurrence_anchor_date,
          updated_at
        )
        VALUES (
          ${propertyId},
          ${day},
          ${name},
          ${JSON.stringify(tasks)}::jsonb,
          ${recurrenceUnit},
          ${recurrenceInterval},
          ${recurrenceAnchorDate}::date,
          NOW()
        )
        ON CONFLICT (property_id, day_of_week)
        DO UPDATE SET
          name = EXCLUDED.name,
          tasks = EXCLUDED.tasks,
          recurrence_unit = EXCLUDED.recurrence_unit,
          recurrence_interval = EXCLUDED.recurrence_interval,
          recurrence_anchor_date = EXCLUDED.recurrence_anchor_date,
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
        const scheduled = await scheduledTemplateForDate(
          sql,
          propertyId,
          candidateDate,
        );

        if (!scheduled) {
          await sql`
            DELETE FROM atlas_routine_occurrences
            WHERE property_id = ${propertyId}
              AND occurrence_date = ${candidateDate}::date
          `;
          continue;
        }

        const rows = (await sql`
          SELECT tasks
          FROM atlas_routine_occurrences
          WHERE property_id = ${propertyId}
            AND occurrence_date = ${candidateDate}::date
          LIMIT 1
        `) as unknown as Array<Record<string, unknown>>;

        if (rows.length) {
          const existingTasks = normalizeTasks(rows[0].tasks);
          const refreshedTasks = synchronizeOccurrenceTasks(
            scheduled.tasks,
            existingTasks,
          );
          await sql`
            UPDATE atlas_routine_occurrences
            SET
              day_of_week = ${scheduled.day},
              routine_name = ${scheduled.name},
              tasks = ${JSON.stringify(refreshedTasks)}::jsonb,
              updated_at = NOW()
            WHERE property_id = ${propertyId}
              AND occurrence_date = ${candidateDate}::date
          `;
        }
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
