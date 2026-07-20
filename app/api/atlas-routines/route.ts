import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RoutineTask = {
  id: string;
  title: string;
  enabled: boolean;
};

type RoutineTemplate = {
  day: number;
  name: string;
  tasks: RoutineTask[];
};

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

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id.trim()
            : `routine-task-${Date.now()}-${index}`,
        title,
        enabled: record.enabled !== false,
      };
    })
    .filter((task): task is RoutineTask => Boolean(task));
}

async function ensureTables(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_templates (
      day_of_week integer PRIMARY KEY CHECK (day_of_week BETWEEN 1 AND 5),
      name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS atlas_routine_occurrences (
      occurrence_date date PRIMARY KEY,
      day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
      routine_name text NOT NULL,
      tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  const seeds: RoutineTemplate[] = [
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
  ];

  for (const seed of seeds) {
    await sql`
      INSERT INTO atlas_routine_templates (
        day_of_week,
        name,
        tasks
      )
      VALUES (
        ${seed.day},
        ${seed.name},
        ${JSON.stringify(seed.tasks)}::jsonb
      )
      ON CONFLICT (day_of_week) DO NOTHING
    `;
  }
}

function weekdayFromDate(dateKey: string) {
  const day = new Date(`${dateKey}T12:00:00`).getDay();

  return day >= 1 && day <= 5 ? day : 0;
}

async function loadTemplates(sql: ReturnType<typeof neon>) {
  const rows = (await sql`
    SELECT
      day_of_week,
      name,
      tasks
    FROM atlas_routine_templates
    ORDER BY day_of_week ASC
  `) as unknown as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    day: Number(row.day_of_week),
    name: String(row.name || "Routine"),
    tasks: normalizeTasks(row.tasks),
  }));
}

async function getOrCreateOccurrence(
  sql: ReturnType<typeof neon>,
  dateKey: string
) {
  const day = weekdayFromDate(dateKey);

  if (!day) {
    return null;
  }

  let rows = (await sql`
    SELECT
      occurrence_date,
      day_of_week,
      routine_name,
      tasks
    FROM atlas_routine_occurrences
    WHERE occurrence_date = ${dateKey}::date
    LIMIT 1
  `) as unknown as Array<Record<string, unknown>>;

  if (!rows.length) {
    const templates = (await sql`
      SELECT
        day_of_week,
        name,
        tasks
      FROM atlas_routine_templates
      WHERE day_of_week = ${day}
      LIMIT 1
    `) as unknown as Array<Record<string, unknown>>;

    const template = templates[0];

    if (!template) {
      return null;
    }

    const occurrenceTasks = normalizeTasks(template.tasks)
      .filter((task) => task.enabled)
      .map((task) => ({
        ...task,
        completed: false,
      }));

    await sql`
      INSERT INTO atlas_routine_occurrences (
        occurrence_date,
        day_of_week,
        routine_name,
        tasks,
        updated_at
      )
      VALUES (
        ${dateKey}::date,
        ${day},
        ${String(template.name || "Routine")},
        ${JSON.stringify(occurrenceTasks)}::jsonb,
        NOW()
      )
      ON CONFLICT (occurrence_date) DO NOTHING
    `;

    rows = (await sql`
      SELECT
        occurrence_date,
        day_of_week,
        routine_name,
        tasks
      FROM atlas_routine_occurrences
      WHERE occurrence_date = ${dateKey}::date
      LIMIT 1
    `) as unknown as Array<Record<string, unknown>>;
  }

  const row = rows[0];

  return row
    ? {
        date: dateKey,
        day: Number(row.day_of_week),
        name: String(row.routine_name || "Routine"),
        tasks: Array.isArray(row.tasks) ? row.tasks : [],
      }
    : null;
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();

    await ensureTables(sql);

    const dateKey = asDateKey(
      request.nextUrl.searchParams.get("date")
    );

    const [templates, occurrence] = await Promise.all([
      loadTemplates(sql),
      getOrCreateOccurrence(sql, dateKey),
    ]);

    return NextResponse.json({
      ok: true,
      templates,
      occurrence,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Routine read failed",
      },
      { status: 500 }
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
      { status: 403 }
    );
  }

  try {
    const sql = getSql();

    await ensureTables(sql);

    const body =
      (await request.json()) as Record<string, unknown>;

    const action = String(body.action || "");

    if (action === "save-template") {
      const day = Number(body.day);

      if (
        !Number.isInteger(day) ||
        day < 1 ||
        day > 5
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid routine day",
          },
          { status: 400 }
        );
      }

      const name =
        String(body.name || "Routine").trim() || "Routine";

      const tasks = normalizeTasks(body.tasks);

      await sql`
        INSERT INTO atlas_routine_templates (
          day_of_week,
          name,
          tasks,
          updated_at
        )
        VALUES (
          ${day},
          ${name},
          ${JSON.stringify(tasks)}::jsonb,
          NOW()
        )
        ON CONFLICT (day_of_week)
        DO UPDATE SET
          name = EXCLUDED.name,
          tasks = EXCLUDED.tasks,
          updated_at = NOW()
      `;

      return NextResponse.json({
        ok: true,
      });
    }

    if (action === "toggle-task") {
      const dateKey = asDateKey(body.date);
      const taskId = String(body.taskId || "");

      const occurrence = await getOrCreateOccurrence(
        sql,
        dateKey
      );

      if (!occurrence) {
        return NextResponse.json(
          {
            ok: false,
            error: "No weekday routine",
          },
          { status: 400 }
        );
      }

      const tasks = occurrence.tasks.map(
        (item: unknown) => {
          const task =
            item && typeof item === "object"
              ? {
                  ...(item as Record<string, unknown>),
                }
              : {};

          if (String(task.id || "") === taskId) {
            task.completed = !Boolean(task.completed);
          }

          return task;
        }
      );

      await sql`
        UPDATE atlas_routine_occurrences
        SET
          tasks = ${JSON.stringify(tasks)}::jsonb,
          updated_at = NOW()
        WHERE occurrence_date = ${dateKey}::date
      `;

      return NextResponse.json({
        ok: true,
        occurrence: {
          ...occurrence,
          tasks,
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported routine action",
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Routine save failed",
      },
      { status: 500 }
    );
  }
}
