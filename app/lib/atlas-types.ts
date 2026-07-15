import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type AtlasTable =
  | "vendors"
  | "assets"
  | "procedures"
  | "work_orders"
  | "calendar"
  | "documents"
  | "asset_photos";

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

function asString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function nullableString(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  return text;
}

function asDate(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  return text;
}

function asStatus(value: unknown, fallback: string) {
  const text = asString(value);
  if (!text) return fallback;
  return text;
}

function asBoolean(value: unknown) {
  return value === true || value === "true" || value === 1;
}

function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value;
  return [];
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      return String(item);
    });
  }

  if (
    typeof value === "string" &&
    value.startsWith("{") &&
    value.endsWith("}")
  ) {
    return value
      .slice(1, -1)
      .split(",")
      .map(function (item) {
        return item.replace(/^"|"$/g, "").trim();
      })
      .filter(Boolean);
  }

  return [];
}

function jsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return "[]";
}

function makeId(prefix: string) {
  return (
    prefix +
    "-" +
    Date.now().toString() +
    "-" +
    Math.random().toString(16).slice(2)
  );
}

function getId(record: JsonRecord, prefix: string) {
  const existingId = asString(record.id);
  if (existingId) return existingId;
  return makeId(prefix);
}

function cleanTable(value: unknown): AtlasTable | "" {
  const table = asString(value);

  if (table === "vendors") return "vendors";
  if (table === "assets") return "assets";
  if (table === "procedures") return "procedures";
  if (table === "work_orders") return "work_orders";
  if (table === "calendar") return "calendar";
  if (table === "documents") return "documents";
  if (table === "asset_photos") return "asset_photos";

  return "";
}


async function ensureCalendarColumns(sql: ReturnType<typeof neon>) {
  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS time text
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
    ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS repeat text NOT NULL DEFAULT 'None'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS reminder text NOT NULL DEFAULT 'None'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT ''
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS linked_type text NOT NULL DEFAULT 'None'
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
    ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS original_id text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS instance_id text
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Scheduled'
  `;

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW()
  `;
}

async function ensureWorkOrderColumns(sql: ReturnType<typeof neon>) {
  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium'
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS recurrence_end_date date
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'Year-Round'
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS last_completed_date date
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS completion_history jsonb NOT NULL DEFAULT '[]'::jsonb
  `;
}

function mapLocation(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    type: String(row.type || ""),
    zone: String(row.zone || ""),
    notes: String(row.notes || ""),
    sort_order: Number(row.sort_order || 0),
  };
}

function mapVendor(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    category: String(row.category || ""),
    phone: row.phone ? String(row.phone) : "",
    email: row.email ? String(row.email) : "",
    website: row.website ? String(row.website) : "",
    notes: String(row.notes || ""),
    logoDataUrl: row.logo_data_url ? String(row.logo_data_url) : "",
    documents: asArray(row.documents),
  };
}

function mapAsset(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    locationId: String(row.location_id || "general"),
    category: String(row.category || ""),
    status: String(row.status || "Monitor"),
    make: row.make ? String(row.make) : "",
    model: row.model ? String(row.model) : "",
    serial: row.serial ? String(row.serial) : "",
    notes: String(row.notes || ""),
    vendorIds: asStringArray(row.vendor_ids),
    documents: asArray(row.documents),
  };
}

function mapProcedure(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    title: String(row.title || ""),
    area: String(row.area || ""),
    priority: String(row.priority || "Normal"),
    steps: asStringArray(row.steps),
  };
}

function mapWorkOrder(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    assetId: String(row.asset_id || ""),
    vendorId: row.vendor_id ? String(row.vendor_id) : "",
    procedureId: row.procedure_id ? String(row.procedure_id) : "",
    date: row.date ? String(row.date).slice(0, 10) : "",
    title: String(row.title || ""),
    status: String(row.status || "Open"),
    priority: String(row.priority || "Medium"),
    notes: String(row.notes || ""),
    followUpDate: row.follow_up_date
      ? String(row.follow_up_date).slice(0, 10)
      : "",
    recurring: Boolean(row.recurring),
    recurrenceInterval: Math.max(
      1,
      Number(row.recurrence_interval || 1),
    ),
    recurrenceUnit: String(row.recurrence_unit || "Weeks"),
    recurrenceEndDate: row.recurrence_end_date
      ? String(row.recurrence_end_date).slice(0, 10)
      : "",
    season: String(row.season || "Year-Round"),
    lastCompletedDate: row.last_completed_date
      ? String(row.last_completed_date).slice(0, 10)
      : "",
    completionHistory: asArray(row.completion_history).map(String),
    photos: asArray(row.photos),
    documents: asArray(row.documents),
  };
}

function mapCalendarItem(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    date: row.date ? String(row.date).slice(0, 10) : "",
    time: row.time ? String(row.time) : "",
    title: String(row.title || ""),
    area: String(row.area || ""),
    categoryLabel: row.category_label ? String(row.category_label) : "",
    colorId: row.color_id ? String(row.color_id) : "",
    colorName: row.color_name ? String(row.color_name) : "",
    allDay: Boolean(row.all_day),
    repeat: String(row.repeat || "None"),
    reminder: String(row.reminder || "None"),
    notes: String(row.notes || ""),
    linkedType: String(row.linked_type || "None"),
    linkedId: row.linked_id ? String(row.linked_id) : "",
    linkedName: row.linked_name ? String(row.linked_name) : "",
    completed: Boolean(row.completed),
    source: String(row.source || "manual"),
    originalId: row.original_id ? String(row.original_id) : "",
    instanceId: row.instance_id ? String(row.instance_id) : "",
    status: String(row.status || "Scheduled"),
  };
}

function mapDocument(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    title: String(row.title || ""),
    area: String(row.area || ""),
    type: String(row.type || ""),
    linkedAssetId: row.linked_asset_id
      ? String(row.linked_asset_id)
      : "",
    notes: String(row.notes || ""),
  };
}

function mapPhoto(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    assetId: String(row.asset_id || ""),
    name: String(row.name || ""),
    dataUrl: String(row.data_url || ""),
    createdAt: row.created_at
      ? String(row.created_at)
      : new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const sql = getSql();
    await ensureWorkOrderColumns(sql);
    await ensureCalendarColumns(sql);

    const locationRows = (await sql`
      SELECT id, name, type, zone, notes, sort_order
      FROM atlas_locations
      ORDER BY sort_order ASC, name ASC
    `) as unknown as JsonRecord[];

    const vendorRows = (await sql`
      SELECT id, name, category, phone, email, website, notes, logo_data_url, documents
      FROM atlas_vendors
      ORDER BY name ASC
    `) as unknown as JsonRecord[];

    const assetRows = (await sql`
      SELECT id, name, location_id, category, status, make, model, serial, notes, vendor_ids, documents
      FROM atlas_assets
      ORDER BY name ASC
    `) as unknown as JsonRecord[];

    const procedureRows = (await sql`
      SELECT id, title, area, priority, steps
      FROM atlas_procedures
      ORDER BY title ASC
    `) as unknown as JsonRecord[];

    const workOrderRows = (await sql`
      SELECT
        id,
        asset_id,
        vendor_id,
        procedure_id,
        date,
        title,
        status,
        priority,
        notes,
        follow_up_date,
        recurring,
        recurrence_interval,
        recurrence_unit,
        recurrence_end_date,
        season,
        last_completed_date,
        completion_history,
        photos,
        documents
      FROM atlas_work_orders
      ORDER BY date ASC NULLS LAST, title ASC
    `) as unknown as JsonRecord[];

    const calendarRows = (await sql`
      SELECT
        id,
        date,
        time,
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
        original_id,
        instance_id,
        status
      FROM atlas_calendar_items
      ORDER BY date ASC, time ASC NULLS LAST, title ASC
    `) as unknown as JsonRecord[];

    const documentRows = (await sql`
      SELECT id, title, area, type, linked_asset_id, notes
      FROM atlas_documents
      ORDER BY title ASC
    `) as unknown as JsonRecord[];

    const photoRows = (await sql`
      SELECT id, asset_id, name, data_url, created_at
      FROM atlas_asset_photos
      ORDER BY created_at DESC
    `) as unknown as JsonRecord[];

    return NextResponse.json({
      ok: true,
      source: "neon",
      locations: locationRows.map(mapLocation),
      vendorRecords: vendorRows.map(mapVendor),
      assetRecords: assetRows.map(mapAsset),
      procedureRecords: procedureRows.map(mapProcedure),
      serviceRecords: workOrderRows.map(mapWorkOrder),
      calendarItems: calendarRows.map(mapCalendarItem),
      documents: documentRows.map(mapDocument),
      photos: photoRows.map(mapPhoto),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Atlas database read error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    const body = (await request.json().catch(function () {
      return {};
    })) as JsonRecord;

    const table = cleanTable(body.table);
    const record =
      body.record && typeof body.record === "object"
        ? (body.record as JsonRecord)
        : {};

    if (!table) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported table: " + asString(body.table),
        },
        { status: 400 },
      );
    }

    if (table === "vendors") {
      const id = getId(record, "vendor");

      await sql`
        INSERT INTO atlas_vendors (
          id,
          name,
          category,
          phone,
          email,
          website,
          notes,
          logo_data_url,
          documents,
          updated_at
        )
        VALUES (
          ${id},
          ${asString(record.name) || "Untitled Vendor"},
          ${asString(record.category) || "General"},
          ${nullableString(record.phone)},
          ${nullableString(record.email)},
          ${nullableString(record.website)},
          ${asString(record.notes)},
          ${nullableString(record.logoDataUrl)},
          ${jsonArray(record.documents)}::jsonb,
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          notes = EXCLUDED.notes,
          logo_data_url = EXCLUDED.logo_data_url,
          documents = EXCLUDED.documents,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "assets") {
      const id = getId(record, "asset");

      await sql`
        INSERT INTO atlas_assets (
          id,
          name,
          location_id,
          category,
          status,
          make,
          model,
          serial,
          notes,
          vendor_ids,
          documents,
          updated_at
        )
        VALUES (
          ${id},
          ${asString(record.name) || "Untitled Asset"},
          ${asString(record.locationId) || "general"},
          ${asString(record.category) || "General"},
          ${asStatus(record.status, "Monitor")},
          ${nullableString(record.make)},
          ${nullableString(record.model)},
          ${nullableString(record.serial)},
          ${asString(record.notes)},
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.vendorIds)}::jsonb
            )
          ),
          ${jsonArray(record.documents)}::jsonb,
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          location_id = EXCLUDED.location_id,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          serial = EXCLUDED.serial,
          notes = EXCLUDED.notes,
          vendor_ids = EXCLUDED.vendor_ids,
          documents = EXCLUDED.documents,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "procedures") {
      const id = getId(record, "procedure");

      await sql`
        INSERT INTO atlas_procedures (
          id,
          title,
          area,
          priority,
          steps,
          updated_at
        )
        VALUES (
          ${id},
          ${asString(record.title) || "Untitled Procedure"},
          ${asString(record.area) || "General"},
          ${asString(record.priority) || "Normal"},
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.steps)}::jsonb
            )
          ),
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          priority = EXCLUDED.priority,
          steps = EXCLUDED.steps,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "work_orders") {
      await ensureWorkOrderColumns(sql);
      const id = getId(record, "work-order");

      await sql`
        INSERT INTO atlas_work_orders (
          id,
          asset_id,
          vendor_id,
          procedure_id,
          date,
          title,
          status,
          priority,
          notes,
          follow_up_date,
          recurring,
          recurrence_interval,
          recurrence_unit,
          recurrence_end_date,
          season,
          last_completed_date,
          completion_history,
          photos,
          documents,
          updated_at
        )
        VALUES (
          ${id},
          ${asString(record.assetId) || "general"},
          ${nullableString(record.vendorId)},
          ${nullableString(record.procedureId)},
          ${asDate(record.date)}::date,
          ${asString(record.title) || "Untitled Work Order"},
          ${asStatus(record.status, "Open")},
          ${asStatus(record.priority, "Medium")},
          ${asString(record.notes)},
          ${asDate(record.followUpDate)}::date,
          ${asBoolean(record.recurring)},
          ${asPositiveInteger(record.recurrenceInterval, 1)},
          ${asStatus(record.recurrenceUnit, "Weeks")},
          ${asDate(record.recurrenceEndDate)}::date,
          ${asStatus(record.season, "Year-Round")},
          ${asDate(record.lastCompletedDate)}::date,
          ${jsonArray(record.completionHistory)}::jsonb,
          ${jsonArray(record.photos)}::jsonb,
          ${jsonArray(record.documents)}::jsonb,
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          asset_id = EXCLUDED.asset_id,
          vendor_id = EXCLUDED.vendor_id,
          procedure_id = EXCLUDED.procedure_id,
          date = EXCLUDED.date,
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          notes = EXCLUDED.notes,
          follow_up_date = EXCLUDED.follow_up_date,
          recurring = EXCLUDED.recurring,
          recurrence_interval = EXCLUDED.recurrence_interval,
          recurrence_unit = EXCLUDED.recurrence_unit,
          recurrence_end_date = EXCLUDED.recurrence_end_date,
          season = EXCLUDED.season,
          last_completed_date = EXCLUDED.last_completed_date,
          completion_history = EXCLUDED.completion_history,
          photos = EXCLUDED.photos,
          documents = EXCLUDED.documents,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "calendar") {
      await ensureCalendarColumns(sql);
      const id = getId(record, "calendar");

      await sql`
        INSERT INTO atlas_calendar_items (
          id,
          date,
          time,
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
          original_id,
          instance_id,
          status,
          updated_at
        )
        VALUES (
          ${id},
          ${asDate(record.date)}::date,
          ${nullableString(record.time)},
          ${asString(record.title) || "Untitled Calendar Item"},
          ${asString(record.area) || "General"},
          ${nullableString(record.categoryLabel)},
          ${nullableString(record.colorId)},
          ${nullableString(record.colorName)},
          ${asBoolean(record.allDay)},
          ${asStatus(record.repeat, "None")},
          ${asStatus(record.reminder, "None")},
          ${asString(record.notes)},
          ${asStatus(record.linkedType, "None")},
          ${nullableString(record.linkedId)},
          ${nullableString(record.linkedName)},
          ${asBoolean(record.completed)},
          ${asStatus(record.source, "manual")},
          ${nullableString(record.originalId)},
          ${nullableString(record.instanceId)},
          ${asStatus(
            record.status,
            asBoolean(record.completed) ? "Completed" : "Scheduled"
          )},
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          date = EXCLUDED.date,
          time = EXCLUDED.time,
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          category_label = EXCLUDED.category_label,
          color_id = EXCLUDED.color_id,
          color_name = EXCLUDED.color_name,
          all_day = EXCLUDED.all_day,
          repeat = EXCLUDED.repeat,
          reminder = EXCLUDED.reminder,
          notes = EXCLUDED.notes,
          linked_type = EXCLUDED.linked_type,
          linked_id = EXCLUDED.linked_id,
          linked_name = EXCLUDED.linked_name,
          completed = EXCLUDED.completed,
          source = EXCLUDED.source,
          original_id = EXCLUDED.original_id,
          instance_id = EXCLUDED.instance_id,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "documents") {
      const id = getId(record, "document");

      await sql`
        INSERT INTO atlas_documents (
          id,
          title,
          area,
          type,
          linked_asset_id,
          notes,
          updated_at
        )
        VALUES (
          ${id},
          ${asString(record.title) || "Untitled Document"},
          ${asString(record.area) || "General"},
          ${asString(record.type) || "Document"},
          ${nullableString(record.linkedAssetId)},
          ${asString(record.notes)},
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          type = EXCLUDED.type,
          linked_asset_id = EXCLUDED.linked_asset_id,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "asset_photos") {
      const id = getId(record, "photo");

      await sql`
        INSERT INTO atlas_asset_photos (
          id,
          asset_id,
          name,
          data_url,
          created_at
        )
        VALUES (
          ${id},
          ${asString(record.assetId) || "general"},
          ${asString(record.name) || "Photo"},
          ${asString(record.dataUrl)},
          COALESCE(
            ${nullableString(record.createdAt)}::timestamptz,
            NOW()
          )
        )
        ON CONFLICT (id)
        DO UPDATE SET
          asset_id = EXCLUDED.asset_id,
          name = EXCLUDED.name,
          data_url = EXCLUDED.data_url
      `;

      return NextResponse.json({ ok: true, id });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported table: " + table,
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Atlas database save error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getSql();
    const body = (await request.json().catch(function () {
      return {};
    })) as JsonRecord;

    const table = cleanTable(body.table);
    const id = asString(body.id);

    if (!table || !id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Table and id are required.",
        },
        { status: 400 },
      );
    }

    if (table === "vendors") {
      await sql`
        DELETE FROM atlas_vendors
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    if (table === "assets") {
      await sql`
        DELETE FROM atlas_asset_photos
        WHERE asset_id = ${id}
      `;

      await sql`
        DELETE FROM atlas_work_orders
        WHERE asset_id = ${id}
      `;

      await sql`
        DELETE FROM atlas_assets
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    if (table === "procedures") {
      await sql`
        DELETE FROM atlas_procedures
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    if (table === "work_orders") {
      await sql`
        DELETE FROM atlas_work_orders
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    if (table === "calendar") {
      await sql`
        DELETE FROM atlas_calendar_items
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    if (table === "documents") {
      await sql`
        DELETE FROM atlas_documents
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    if (table === "asset_photos") {
      await sql`
        DELETE FROM atlas_asset_photos
        WHERE id = ${id}
      `;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported table: " + table,
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Atlas database delete error",
      },
      { status: 500 },
    );
  }
}
