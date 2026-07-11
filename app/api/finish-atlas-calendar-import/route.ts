import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAIN_EMAIL = "nthornton87@yahoo.com";

const CALENDAR_ID = "999101";
const EVENT_DATE = "2026-07-13";
const EVENT_TITLE = "Walk Around 2000 Landscaping";

const EVENT_NOTES =
  "Walk around 2000 to review landscaping. Organizer: Steve Martz. Attendees: Patrick Tanner and Nick Thornton. Time: 10:00 AM–11:00 AM. RSVP was pending in the source email.";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type AnyRow = Record<string, unknown>;

type ColumnInfo = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function queryRows<T extends AnyRow = AnyRow>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(query, params);
  return result.rows as T[];
}

async function tableExists(table: string) {
  const rows = await queryRows<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `,
    [table],
  );

  return Boolean(rows[0]?.exists);
}

async function resolveCalendarTable() {
  for (const table of [
    "atlas_calendar_items",
    "calendar",
    "calendar_items",
  ]) {
    if (await tableExists(table)) {
      return table;
    }
  }

  throw new Error("No Atlas calendar table was found.");
}

async function getColumns(table: string) {
  return queryRows<ColumnInfo>(
    `
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );
}

async function getTargetUserId() {
  if (await tableExists("assets")) {
    const columns = await getColumns("assets");

    const userColumn = columns.find((column) =>
      ["userId", "user_id"].includes(column.column_name),
    )?.column_name;

    if (userColumn) {
      const rows = await queryRows<{
        user_id_value: string;
      }>(
        `
          SELECT
            ${quoteIdentifier(userColumn)}::text AS user_id_value
          FROM assets
          WHERE ${quoteIdentifier(userColumn)} IS NOT NULL
          GROUP BY ${quoteIdentifier(userColumn)}
          ORDER BY COUNT(*) DESC
          LIMIT 1
        `,
      );

      if (rows[0]?.user_id_value) {
        return rows[0].user_id_value;
      }
    }
  }

  if (await tableExists("user")) {
    const rows = await queryRows<{ id: string }>(
      `
        SELECT id::text AS id
        FROM "user"
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [MAIN_EMAIL],
    );

    if (rows[0]?.id) {
      return rows[0].id;
    }
  }

  return "atlas-master";
}

function fallbackValue(column: ColumnInfo): unknown {
  const type = column.data_type.toLowerCase();
  const udt = column.udt_name.toLowerCase();

  if (type === "boolean") {
    return false;
  }

  if (type === "date") {
    return EVENT_DATE;
  }

  if (type.includes("timestamp")) {
    return new Date().toISOString();
  }

  if (type.includes("time")) {
    return "10:00:00";
  }

  if (
    [
      "smallint",
      "integer",
      "bigint",
      "numeric",
      "decimal",
      "real",
      "double precision",
    ].includes(type)
  ) {
    return 0;
  }

  if (
    type === "json" ||
    type === "jsonb" ||
    udt === "json" ||
    udt === "jsonb"
  ) {
    return JSON.stringify({});
  }

  if (type === "array" || udt.startsWith("_")) {
    return [];
  }

  return "";
}

function successHtml(table: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <title>Atlas Calendar Import Complete</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #f5f7fa;
      color: #172331;
    }

    main {
      width: min(100%, 680px);
      padding: 26px;
      border: 1px solid #dce4ec;
      border-radius: 22px;
      background: white;
      box-shadow: 0 14px 34px rgba(11, 30, 51, 0.08);
    }

    .eyebrow {
      color: #c99a3d;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    h1 {
      margin: 8px 0 12px;
      color: #0b1e33;
    }

    .ok {
      margin: 16px 0;
      padding: 14px;
      border-radius: 14px;
      color: #087443;
      background: #eaf7f1;
      font-weight: 800;
      line-height: 1.45;
    }

    p {
      line-height: 1.5;
    }

    a {
      display: inline-flex;
      min-height: 48px;
      align-items: center;
      justify-content: center;
      padding: 12px 16px;
      border-radius: 14px;
      background: #c99a3d;
      color: #0b1e33;
      text-decoration: none;
      font-weight: 900;
    }
  </style>
</head>

<body>
  <main>
    <div class="eyebrow">Atlas / 2000</div>

    <h1>Calendar import complete</h1>

    <div class="ok">
      Walk Around 2000 Landscaping was saved for
      Monday, July 13, 2026, from 10:00–11:00 AM.
    </div>

    <p>
      The earlier vendor and work-order import was left
      untouched.
    </p>

    <p>
      Calendar table used:
      <strong>${table}</strong>
    </p>

    <a href="/">Open Atlas</a>
  </main>
</body>
</html>`;
}

function errorHtml(message: string) {
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <title>Atlas Calendar Import Error</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #f5f7fa;
      color: #172331;
    }

    main {
      width: min(100%, 680px);
      padding: 26px;
      border: 1px solid #dce4ec;
      border-radius: 22px;
      background: white;
    }

    h1 {
      color: #0b1e33;
    }

    .error {
      padding: 14px;
      border-radius: 14px;
      color: #b42318;
      background: #feecec;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
  </style>
</head>

<body>
  <main>
    <h1>Calendar import stopped</h1>

    <div class="error">
      ${safeMessage}
    </div>
  </main>
</body>
</html>`;
}

export async function GET() {
  try {
    const table = await resolveCalendarTable();
    const columns = await getColumns(table);

    const columnNames = new Set(
      columns.map((column) => column.column_name),
    );

    const userId = await getTargetUserId();
    const payload: AnyRow = {};

    function set(column: string, value: unknown) {
      if (columnNames.has(column)) {
        payload[column] = value;
      }
    }

    set("id", CALENDAR_ID);

    set("userId", userId);
    set("user_id", userId);

    set("item_date", EVENT_DATE);
    set("date", EVENT_DATE);
    set("calendar_date", EVENT_DATE);
    set("scheduled_date", EVENT_DATE);

    set("time", "10:00");
    set("item_time", "10:00");
    set("event_time", "10:00");
    set("start_time", "10:00");
    set("end_time", "11:00");

    set("title", EVENT_TITLE);
    set("name", EVENT_TITLE);
    set("summary", EVENT_TITLE);

    set("area", "Landscaping");
    set("category", "Landscaping");

    set("categoryLabel", "Landscaping");
    set("category_label", "Landscaping");

    set("status", "Scheduled");

    set("notes", EVENT_NOTES);
    set("description", EVENT_NOTES);

    set("allDay", false);
    set("all_day", false);
    set("completed", false);

    set("repeat", "None");
    set("repeat_type", "None");

    set("reminder", "None");

    set("source", "Atlas screenshot intake");

    set(
      "record",
      JSON.stringify({
        id: CALENDAR_ID,
        date: EVENT_DATE,
        itemDate: EVENT_DATE,
        time: "10:00",
        endTime: "11:00",
        title: EVENT_TITLE,
        area: "Landscaping",
        status: "Scheduled",
        notes: EVENT_NOTES,
        source: "Atlas screenshot intake",
      }),
    );

    for (const column of columns) {
      const requiresValue =
        column.is_nullable === "NO" &&
        column.column_default === null &&
        payload[column.column_name] === undefined;

      if (requiresValue) {
        payload[column.column_name] =
          fallbackValue(column);
      }
    }

    const names = Object.keys(payload);

    const values = names.map(
      (name) => payload[name],
    );

    const placeholders = names
      .map((_, index) => `$${index + 1}`)
      .join(", ");

    const quotedNames = names
      .map(quoteIdentifier)
      .join(", ");

    const updateColumns = names
      .filter((name) => name !== "id")
      .map(
        (name) =>
          `${quoteIdentifier(
            name,
          )} = EXCLUDED.${quoteIdentifier(name)}`,
      )
      .join(", ");

    if (columnNames.has("id")) {
      await queryRows(
        `
          INSERT INTO ${quoteIdentifier(
            table,
          )} (${quotedNames})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET
            ${
              updateColumns ||
              `${quoteIdentifier(
                "id",
              )} = EXCLUDED.${quoteIdentifier("id")}`
            }
        `,
        values,
      );
    } else {
      await queryRows(
        `
          INSERT INTO ${quoteIdentifier(
            table,
          )} (${quotedNames})
          VALUES (${placeholders})
        `,
        values,
      );
    }

    return new NextResponse(
      successHtml(table),
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Calendar import failed.";

    return new NextResponse(
      errorHtml(message),
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
