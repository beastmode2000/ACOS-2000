import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { atlasHomeCookbookSeed } from "../../../lib/atlas-home-cookbook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOME_PROPERTY_ID = "4725";
const HOME_OWNER_EMAIL = "nthornton87@yahoo.com";
const COOKBOOK_SEED_ID = "system-cookbook-seed-v1";

type HomeRecordType = "recipe" | "chore" | "goal" | "setting";
type HomeRecord = {
  id: string;
  propertyId: string;
  recordType: HomeRecordType;
  title: string;
  [key: string]: unknown;
};

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function ensureHomeTables(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_home_records (
      property_id text NOT NULL,
      id text NOT NULL,
      record_type text NOT NULL,
      record jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_home_records_property_type_idx
    ON atlas_home_records(property_id, record_type, updated_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS atlas_home_shares (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      person text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      revoked_at timestamptz
    )
  `;
}

async function canAccessHome(
  sql: ReturnType<typeof neon>,
  request: NextRequest,
) {
  const email = String(
    request.headers.get("x-atlas-user-email") || "",
  )
    .trim()
    .toLowerCase();

  if (!email) return false;
  if (email === HOME_OWNER_EMAIL) return true;

  const rows = await sql`
    SELECT active, property_ids
    FROM atlas_team_access
    WHERE lower(email) = ${email}
    LIMIT 1
  `;

  const row = rows[0] as
    | { active?: boolean; property_ids?: unknown }
    | undefined;

  if (!row || row.active === false) return false;

  const propertyIds = Array.isArray(row.property_ids)
    ? row.property_ids.map(String)
    : [];

  return propertyIds.includes(HOME_PROPERTY_ID);
}

function privateResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "This account does not have access to 4725.",
    },
    { status: 403 },
  );
}

async function seedCookbookOnce(sql: ReturnType<typeof neon>) {
  const markerRows = (await sql`
    SELECT id
    FROM atlas_home_records
    WHERE property_id = ${HOME_PROPERTY_ID}
      AND id = ${COOKBOOK_SEED_ID}
    LIMIT 1
  `) as unknown as Array<{ id: string }>;

  if (markerRows.length > 0) return;

  for (const seed of atlasHomeCookbookSeed) {
    const now = new Date().toISOString();

    const record = {
      id: seed.id,
      propertyId: HOME_PROPERTY_ID,
      recordType: "recipe",
      title: seed.title,
      code: seed.code,
      category: seed.category,
      meta: seed.meta,
      fullRecipe: seed.fullRecipe,
      ingredients: "",
      instructions: "",
      notes: "Imported from Nick's Meal Picker Cookbook.",
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };

    await sql`
      INSERT INTO atlas_home_records (
        property_id,
        id,
        record_type,
        record,
        updated_at
      )
      VALUES (
        ${HOME_PROPERTY_ID},
        ${record.id},
        'recipe',
        ${JSON.stringify(record)}::jsonb,
        NOW()
      )
      ON CONFLICT (property_id, id)
      DO NOTHING
    `;
  }

  const marker = {
    id: COOKBOOK_SEED_ID,
    propertyId: HOME_PROPERTY_ID,
    recordType: "setting",
    title: "Cookbook imported",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await sql`
    INSERT INTO atlas_home_records (
      property_id,
      id,
      record_type,
      record,
      updated_at
    )
    VALUES (
      ${HOME_PROPERTY_ID},
      ${COOKBOOK_SEED_ID},
      'setting',
      ${JSON.stringify(marker)}::jsonb,
      NOW()
    )
    ON CONFLICT (property_id, id)
    DO NOTHING
  `;
}

async function upsertChoreCalendar(
  sql: ReturnType<typeof neon>,
  record: HomeRecord,
) {
  if (record.recordType !== "chore") return;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS property_id text
    NOT NULL DEFAULT '2000'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS item_date date
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS category_label text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS color_id text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS color_name text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS all_day boolean
    NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS repeat text
    NOT NULL DEFAULT 'None'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS reminder text
    NOT NULL DEFAULT 'None'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS notes text
    NOT NULL DEFAULT ''
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS linked_type text
    NOT NULL DEFAULT 'None'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS linked_id text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS linked_name text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS completed boolean
    NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS source text
    NOT NULL DEFAULT 'manual'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS event_type text
    NOT NULL DEFAULT 'Calendar Event'
  `;

  const calendarId = `home-chore-${record.id}`;
  const date =
    String(record.date || "").slice(0, 10) || null;

  const title =
    `${String(record.emoji || "⭐")} ${record.title}`;

  const person =
    String(record.person || "Family");

  const points =
    Number(record.points || 0);

  const notes = [
    person,
    points ? `${points} points` : "",
    String(record.notes || ""),
  ]
    .filter(Boolean)
    .join(" · ");

  const repeat =
    String(record.recurring || "None");

  await sql`
    INSERT INTO atlas_calendar_items (
      id,
      date,
      item_date,
      title,
      area,
      category_label,
      color_id,
      color_name,
      all_day,
      repeat,
      reminder,
      notes,
      linked_type,
      linked_id,
      linked_name,
      completed,
      source,
      event_type,
      property_id
    )
    VALUES (
      ${calendarId},
      ${date},
      ${date},
      ${title},
      'Family',
      'Chore',
      'home-chore',
      'Blue',
      true,
      ${repeat},
      'None',
      ${notes},
      'Task',
      ${record.id},
      ${record.title},
      ${Boolean(record.completed)},
      'home-chore',
      'Chore',
      ${HOME_PROPERTY_ID}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      date = EXCLUDED.date,
      item_date = EXCLUDED.item_date,
      title = EXCLUDED.title,
      area = EXCLUDED.area,
      category_label = EXCLUDED.category_label,
      repeat = EXCLUDED.repeat,
      notes = EXCLUDED.notes,
      linked_id = EXCLUDED.linked_id,
      linked_name = EXCLUDED.linked_name,
      completed = EXCLUDED.completed,
      property_id = EXCLUDED.property_id
  `;
}

async function deleteChoreCalendar(
  sql: ReturnType<typeof neon>,
  id: string,
) {
  await sql`
    DELETE FROM atlas_calendar_items
    WHERE id = ${`home-chore-${id}`}
      AND property_id = ${HOME_PROPERTY_ID}
  `;
}

async function publicShare(
  sql: ReturnType<typeof neon>,
  token: string,
) {
  const rows = await sql`
    SELECT id, person
    FROM atlas_home_shares
    WHERE property_id = ${HOME_PROPERTY_ID}
      AND token_hash = ${tokenHash(token)}
      AND revoked_at IS NULL
    LIMIT 1
  `;

  return rows[0] as
    | { id?: string; person?: string }
    | undefined;
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();

    await ensureHomeTables(sql);

    const token = String(
      request.nextUrl.searchParams.get("token") || "",
    ).trim();

    if (token) {
      const share = await publicShare(sql, token);

      if (!share) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "This family link is invalid or has been revoked.",
          },
          { status: 403 },
        );
      }

      const person =
        String(share.person || "Cooper");

      const choreRows = (await sql`
        SELECT record
        FROM atlas_home_records
        WHERE property_id = ${HOME_PROPERTY_ID}
          AND record_type IN ('chore', 'goal')
        ORDER BY updated_at DESC
      `) as unknown as Array<{
        record: HomeRecord;
      }>;

      const calendarRows = (await sql`
        SELECT
          id,
          item_date,
          time,
          end_time,
          title,
          area,
          category_label,
          notes,
          event_type,
          completed,
          linked_id
        FROM atlas_calendar_items
        WHERE property_id = ${HOME_PROPERTY_ID}
        ORDER BY item_date ASC, time ASC
      `) as unknown as Array<
        Record<string, unknown>
      >;

      return NextResponse.json({
        ok: true,
        person,
        records: choreRows.map(
          (row) => row.record,
        ),
        calendar: calendarRows.map(
          (row) => ({
            id: String(row.id || ""),
            date: row.item_date
              ? String(row.item_date).slice(0, 10)
              : "",
            time: String(row.time || ""),
            endTime: String(row.end_time || ""),
            title: String(row.title || ""),
            area: String(row.area || ""),
            categoryLabel: String(
              row.category_label || "",
            ),
            notes: String(row.notes || ""),
            eventType: String(
              row.event_type ||
                "Calendar Event",
            ),
            completed: Boolean(
              row.completed,
            ),
            linkedId: String(
              row.linked_id || "",
            ),
          }),
        ),
      });
    }

    const propertyId = String(
      request.nextUrl.searchParams.get(
        "propertyId",
      ) || "",
    );

    if (propertyId !== HOME_PROPERTY_ID) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unknown home property.",
        },
        { status: 404 },
      );
    }

    if (
      !(await canAccessHome(sql, request))
    ) {
      return privateResponse();
    }

    await seedCookbookOnce(sql);

    const rows = (await sql`
      SELECT record
      FROM atlas_home_records
      WHERE property_id = ${HOME_PROPERTY_ID}
        AND record_type <> 'setting'
      ORDER BY updated_at DESC
    `) as unknown as Array<{
      record: HomeRecord;
    }>;

    return NextResponse.json({
      ok: true,
      records: rows.map(
        (row) => row.record,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load 4725.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const sql = getSql();

    await ensureHomeTables(sql);

    if (
      !(await canAccessHome(sql, request))
    ) {
      return privateResponse();
    }

    const body =
      (await request.json()) as HomeRecord & {
        action?: string;
        person?: string;
      };

    if (body.action === "createShare") {
      if (
        String(body.propertyId || "") !==
        HOME_PROPERTY_ID
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid property.",
          },
          { status: 400 },
        );
      }

      const person =
        String(body.person || "Cooper")
          .trim() || "Cooper";

      const token =
        randomBytes(32).toString("hex");

      const id =
        `family-share-${Date.now()}-${randomBytes(4).toString("hex")}`;

      await sql`
        INSERT INTO atlas_home_shares (
          id,
          property_id,
          person,
          token_hash
        )
        VALUES (
          ${id},
          ${HOME_PROPERTY_ID},
          ${person},
          ${tokenHash(token)}
        )
      `;

      return NextResponse.json({
        ok: true,
        token,
        person,
      });
    }

    const id =
      String(body?.id || "").trim();

    const title =
      String(body?.title || "").trim();

    const propertyId =
      String(body?.propertyId || "");

    const recordType =
      String(
        body?.recordType || "",
      ) as HomeRecordType;

    const allowedTypes: HomeRecordType[] = [
      "recipe",
      "chore",
      "goal",
      "setting",
    ];

    if (
      propertyId !== HOME_PROPERTY_ID ||
      !id ||
      !title ||
      !allowedTypes.includes(recordType)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid 4725 record.",
        },
        { status: 400 },
      );
    }

    const record: HomeRecord = {
      ...body,
      action: undefined,
      propertyId: HOME_PROPERTY_ID,
      id,
      title,
      recordType,
      updatedAt:
        new Date().toISOString(),
    };

    await sql`
      INSERT INTO atlas_home_records (
        property_id,
        id,
        record_type,
        record,
        updated_at
      )
      VALUES (
        ${HOME_PROPERTY_ID},
        ${id},
        ${recordType},
        ${JSON.stringify(record)}::jsonb,
        NOW()
      )
      ON CONFLICT (property_id, id)
      DO UPDATE SET
        record_type = EXCLUDED.record_type,
        record = EXCLUDED.record,
        updated_at = NOW()
    `;

    await upsertChoreCalendar(
      sql,
      record,
    );

    return NextResponse.json({
      ok: true,
      record,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not save 4725.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const sql = getSql();

    await ensureHomeTables(sql);

    const body =
      (await request.json()) as {
        token?: string;
        choreId?: string;
      };

    const token =
      String(body.token || "").trim();

    const share = token
      ? await publicShare(sql, token)
      : undefined;

    if (!share) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid family link.",
        },
        { status: 403 },
      );
    }

    const choreId =
      String(body.choreId || "").trim();

    const rows = (await sql`
      SELECT record
      FROM atlas_home_records
      WHERE property_id = ${HOME_PROPERTY_ID}
        AND id = ${choreId}
        AND record_type = 'chore'
      LIMIT 1
    `) as unknown as Array<{
      record: HomeRecord;
    }>;

    const chore =
      rows[0]?.record;

    if (!chore) {
      return NextResponse.json(
        {
          ok: false,
          error: "Chore not found.",
        },
        { status: 404 },
      );
    }

    const person =
      String(chore.person || "Family");

    if (
      person !==
        String(
          share.person || "Cooper",
        ) &&
      person !== "Family"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This chore is assigned to someone else.",
        },
        { status: 403 },
      );
    }

    const recurrence =
      String(
        chore.recurring || "None",
      );

    const currentDate =
      String(
        chore.date ||
          new Date()
            .toISOString()
            .slice(0, 10),
      );

    const nextDate = new Date(
      `${currentDate}T12:00:00`,
    );

    if (recurrence === "Daily") {
      nextDate.setDate(
        nextDate.getDate() + 1,
      );
    }

    if (recurrence === "Weekly") {
      nextDate.setDate(
        nextDate.getDate() + 7,
      );
    }

    if (recurrence === "Monthly") {
      nextDate.setMonth(
        nextDate.getMonth() + 1,
      );
    }

    const completedAt =
      new Date().toISOString();

    const points =
      Number(chore.points || 0);

    const next: HomeRecord = {
      ...chore,
      completed:
        recurrence === "None",
      date:
        recurrence === "None"
          ? currentDate
          : nextDate
              .toISOString()
              .slice(0, 10),
      completionHistory: [
        {
          id: `done-${Date.now()}`,
          completedAt,
          points,
        },
        ...(Array.isArray(
          chore.completionHistory,
        )
          ? chore.completionHistory
          : []),
      ],
      updatedAt: completedAt,
    };

    await sql`
      UPDATE atlas_home_records
      SET
        record = ${JSON.stringify(next)}::jsonb,
        updated_at = NOW()
      WHERE property_id = ${HOME_PROPERTY_ID}
        AND id = ${choreId}
    `;

    await upsertChoreCalendar(
      sql,
      next,
    );

    return NextResponse.json({
      ok: true,
      record: next,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not update chore.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const propertyId =
      String(
        request.nextUrl.searchParams.get(
          "propertyId",
        ) || "",
      );

    const id =
      String(
        request.nextUrl.searchParams.get(
          "id",
        ) || "",
      ).trim();

    if (
      propertyId !== HOME_PROPERTY_ID ||
      !id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid delete request.",
        },
        { status: 400 },
      );
    }

    const sql = getSql();

    await ensureHomeTables(sql);

    if (
      !(await canAccessHome(sql, request))
    ) {
      return privateResponse();
    }

    const rows = (await sql`
      SELECT record_type
      FROM atlas_home_records
      WHERE property_id = ${HOME_PROPERTY_ID}
        AND id = ${id}
      LIMIT 1
    `) as unknown as Array<{
      record_type?: string;
    }>;

    await sql`
      DELETE FROM atlas_home_records
      WHERE property_id = ${HOME_PROPERTY_ID}
        AND id = ${id}
    `;

    if (
      rows[0]?.record_type === "chore"
    ) {
      await deleteChoreCalendar(
        sql,
        id,
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not delete 4725 record.",
      },
      { status: 500 },
    );
  }
}
