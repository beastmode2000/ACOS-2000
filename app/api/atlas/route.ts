import { NextRequest, NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAIN_EMAIL = "nthornton87@yahoo.com";
const API_VERSION = "atlas-route-photo-protection-v2";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type AnyRow = Record<string, unknown>;

type AtlasTable =
  | "vendors"
  | "assets"
  | "procedures"
  | "work_orders"
  | "work_order_templates"
  | "calendar"
  | "asset_photos";

const ALLOWED_TABLES: AtlasTable[] = [
  "vendors",
  "assets",
  "procedures",
  "work_orders",
  "work_order_templates",
  "calendar",
  "asset_photos",
];

const FALLBACK_TABLES: Record<AtlasTable, string[]> = {
  vendors: ["vendors"],
  assets: ["assets"],
  procedures: ["procedures"],
  work_orders: [
    "atlas_work_orders",
    "work_orders",
    "workorders",
    "service_records",
    "services",
  ],
  work_order_templates: ["work_order_templates"],
  calendar: ["atlas_calendar_items", "calendar", "calendar_items"],
  asset_photos: ["asset_photos", "photos"],
};

const LOCATION_ID_BY_NAME: Record<string, string> = {
  general: "general",
  "2000": "general",
  "main house": "main-house",
  "mechanical room": "mechanical-room",
  "mechanical room 2": "mechanical-room",
  "formal dining room": "main-house",
  "wine room": "wine-room",
  "fitness room": "fitness-room",
  kitchen: "kitchen",
  pantry: "pantry",
  pool: "indoor-pool",
  "indoor pool": "indoor-pool",
  "pool equipment room": "pool-equipment",
  "back patio (water side)": "standalone-spa",
  "upstairs laundry closet": "upstairs-laundry",
  "pool changing room": "pool-changing-room",
  "house managers office": "house-office",
  "house manager office": "house-office",
  "west side of house": "exterior",
  attic: "main-house",
  "attic 2": "main-house",
  "outdoor condenser area": "exterior",
  "outdoor generator area": "lower-generator-area",
  "vegetable garden": "irrigation",
  garage: "garage",
  "garage (new)": "garage",
  "garage (old)": "old-garage",
  "old garage": "old-garage",
  roof: "roof-gutters",
  hangar: "hangar",
  dock: "dock",
  "gulfstream g600 n23pa": "gulfstream-g600-n23pa",
  "gulfstream g280 n280cc": "gulfstream-g280-n280cc",
  "gulfstream g280 n755pa": "gulfstream-g280-n755pa",
  "pilatus pc12 n126al": "pilatus-pc12-n126al",
};

const LOCATION_NAME_BY_ID: Record<string, string> = {
  general: "General",
  "main-house": "Main House",
  "mechanical-room": "Mechanical Room",
  kitchen: "Kitchen",
  pantry: "Pantry",
  "wine-room": "Wine Room",
  "upstairs-laundry": "Upstairs Laundry Closet",
  "pool-changing-room": "Pool Changing Room",
  "fitness-room": "Fitness Room",
  "house-office": "House Managers Office",
  "indoor-pool": "Pool",
  "pool-equipment": "Pool Equipment Room",
  "standalone-spa": "Standalone Spa",
  dock: "Dock",
  garage: "Garage",
  "old-garage": "Old Garage",
  exterior: "Exterior",
  "roof-gutters": "Roof / Gutters",
  irrigation: "Irrigation",
  "lower-generator-area": "Lower Generator Area",
  hangar: "Hangar",
  "gulfstream-g600-n23pa": "Gulfstream G600 N23PA",
  "gulfstream-g280-n280cc": "Gulfstream G280 N280CC",
  "gulfstream-g280-n755pa": "Gulfstream G280 N755PA",
  "pilatus-pc12-n126al": "Pilatus PC12 N126AL",
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function queryRows<T extends AnyRow = AnyRow>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(query, params);
  return result.rows as T[];
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const clean = text(value).trim();
    if (clean) return clean;
  }

  return "";
}

function bool(value: unknown, fallback = false) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;

  const clean = String(value).trim().toLowerCase();

  if (["true", "t", "yes", "y", "1", "on"].includes(clean)) {
    return true;
  }

  if (["false", "f", "no", "n", "0", "off"].includes(clean)) {
    return false;
  }

  return fallback;
}

function intValue(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(text(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numberText(value: unknown) {
  const clean = text(value).trim();
  return clean ? clean.replace(/[$,]/g, "") : "";
}

function dateText(value: unknown, fallback = "") {
  const clean = text(value).trim();
  return clean ? clean.slice(0, 10) : fallback;
}

function arr<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function nestedRecord(row: AnyRow) {
  const nested = row.record;

  return nested && typeof nested === "object"
    ? (nested as AnyRow)
    : ({} as AnyRow);
}

function mergedRow(row: AnyRow) {
  return {
    ...nestedRecord(row),
    ...row,
  };
}

function assetStatus(value: unknown) {
  const clean = text(value, "Monitor").trim().toLowerCase();

  if (clean === "online") return "Online";
  if (clean === "offline") return "Offline";
  if (clean === "seasonal") return "Seasonal";

  return "Monitor";
}

function serviceStatus(value: unknown) {
  const clean = text(value, "Open").trim().toLowerCase();

  if (clean === "scheduled") return "Scheduled";

  if (["completed", "complete", "done"].includes(clean)) {
    return "Completed";
  }

  if (clean === "monitor") return "Monitor";

  return "Open";
}

function priority(value: unknown) {
  const clean = text(value, "Normal").trim().toLowerCase();

  if (clean === "high") return "High";
  if (clean === "seasonal") return "Seasonal";

  return "Normal";
}

function workOrderPriority(value: unknown) {
  const clean = text(value, "Medium").trim().toLowerCase();

  if (clean === "high") return "High";
  if (clean === "low") return "Low";

  return "Medium";
}

function normalizeId(value: unknown, prefix: string) {
  const raw = text(value).trim();

  return (
    raw ||
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function locationIdFromRecord(input: AnyRow) {
  const row = mergedRow(input);
  const savedFrontendId = text(row.locationId).trim();

  if (savedFrontendId && LOCATION_NAME_BY_ID[savedFrontendId]) {
    return savedFrontendId;
  }

  const directLocationId = text(row.location_id).trim();

  if (directLocationId && LOCATION_NAME_BY_ID[directLocationId]) {
    return directLocationId;
  }

  const locationName = firstText(
    row.location_name,
    row.locationName,
    row.location,
  )
    .trim()
    .toLowerCase();

  return LOCATION_ID_BY_NAME[locationName] || "general";
}

function locationNameFromFrontendId(frontendLocationId: unknown) {
  const id = text(frontendLocationId, "general").trim();
  return LOCATION_NAME_BY_ID[id] || "General";
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

async function resolveTable(table: AtlasTable) {
  for (const candidate of FALLBACK_TABLES[table]) {
    if (await tableExists(candidate)) return candidate;
  }

  return null;
}

async function getColumns(table: string) {
  const rows = await queryRows<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [table],
  );

  return new Set(rows.map((row) => row.column_name));
}

function hasUserColumn(columns: Set<string>) {
  if (columns.has("userId")) return "userId";
  if (columns.has("user_id")) return "user_id";

  return null;
}

async function getTargetUserId() {
  const assetsTable = await resolveTable("assets");

  if (assetsTable) {
    const columns = await getColumns(assetsTable);
    const userColumn = hasUserColumn(columns);

    if (userColumn) {
      const rows = await queryRows<{ user_id_value: string }>(
        `
          SELECT ${quoteIdentifier(userColumn)}::text AS user_id_value
          FROM ${quoteIdentifier(assetsTable)}
          WHERE ${quoteIdentifier(userColumn)} IS NOT NULL
          GROUP BY ${quoteIdentifier(userColumn)}
          ORDER BY COUNT(*) DESC
          LIMIT 1
        `,
      );

      if (rows[0]?.user_id_value) {
        return String(rows[0].user_id_value);
      }
    }
  }

  if (await tableExists("user")) {
    const rows = await queryRows<{ id: string }>(
      `
        SELECT id
        FROM "user"
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [MAIN_EMAIL],
    );

    if (rows[0]?.id) {
      return String(rows[0].id);
    }
  }

  return "atlas-master";
}

async function getOrCreateLocationId(
  userId: string,
  frontendLocationId: unknown,
) {
  if (!(await tableExists("locations"))) return null;

  const locationName =
    locationNameFromFrontendId(frontendLocationId);

  const columns = await getColumns("locations");
  const userColumn = hasUserColumn(columns);

  if (userColumn) {
    const existing = await queryRows<{ id: unknown }>(
      `
        SELECT id
        FROM locations
        WHERE ${quoteIdentifier(userColumn)} = $1
          AND lower(trim(name)) = lower(trim($2))
        LIMIT 1
      `,
      [userId, locationName],
    );

    if (
      existing[0]?.id !== undefined &&
      existing[0]?.id !== null
    ) {
      return existing[0].id;
    }

    const created = await queryRows<{ id: unknown }>(
      `
        INSERT INTO locations (
          ${quoteIdentifier(userColumn)},
          name
        )
        VALUES ($1, $2)
        RETURNING id
      `,
      [userId, locationName],
    );

    return created[0]?.id ?? null;
  }

  const existing = await queryRows<{ id: unknown }>(
    `
      SELECT id
      FROM locations
      WHERE lower(trim(name)) = lower(trim($1))
      LIMIT 1
    `,
    [locationName],
  );

  if (
    existing[0]?.id !== undefined &&
    existing[0]?.id !== null
  ) {
    return existing[0].id;
  }

  const created = await queryRows<{ id: unknown }>(
    `
      INSERT INTO locations (name)
      VALUES ($1)
      RETURNING id
    `,
    [locationName],
  );

  return created[0]?.id ?? null;
}

async function queryTable(
  table: AtlasTable,
  userId: string,
  orderColumn: string,
) {
  const actualTable = await resolveTable(table);

  if (!actualTable) return [];

  const columns = await getColumns(actualTable);
  const userColumn = hasUserColumn(columns);

  const orderBy = columns.has(orderColumn)
    ? `ORDER BY lower(${quoteIdentifier(orderColumn)}::text)`
    : "ORDER BY id";

  if (userColumn) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE ${quoteIdentifier(userColumn)} = $1
           OR ${quoteIdentifier(userColumn)} IS NULL
        ${orderBy}
      `,
      [userId],
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ${orderBy}
    `,
  );
}

async function queryAssets(userId: string) {
  const actualTable = await resolveTable("assets");

  if (!actualTable) return [];

  const columns = await getColumns(actualTable);
  const userColumn = hasUserColumn(columns);

  const orderBy = columns.has("name")
    ? "ORDER BY lower(name::text)"
    : "ORDER BY id";

  if (userColumn) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE ${quoteIdentifier(userColumn)} = $1
           OR ${quoteIdentifier(userColumn)} IS NULL
        ${orderBy}
      `,
      [userId],
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ${orderBy}
    `,
  );
}

async function queryWorkOrders(userId: string) {
  const actualTable = await resolveTable("work_orders");

  if (!actualTable) return [];

  const columns = await getColumns(actualTable);
  const userColumn = hasUserColumn(columns);

  const dateColumn = columns.has("work_date")
    ? "work_date"
    : columns.has("date")
      ? "date"
      : columns.has("scheduled_date")
        ? "scheduled_date"
        : columns.has("due_date")
          ? "due_date"
          : "";

  const titleColumn = columns.has("title")
    ? "title"
    : "";

  const orderBy =
    dateColumn && titleColumn
      ? `ORDER BY ${quoteIdentifier(
          dateColumn,
        )} DESC NULLS LAST, lower(${quoteIdentifier(
          titleColumn,
        )}::text)`
      : dateColumn
        ? `ORDER BY ${quoteIdentifier(
            dateColumn,
          )} DESC NULLS LAST`
        : titleColumn
          ? `ORDER BY lower(${quoteIdentifier(
              titleColumn,
            )}::text)`
          : "ORDER BY id";

  if (userColumn) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE ${quoteIdentifier(userColumn)} = $1
           OR ${quoteIdentifier(userColumn)} IS NULL
        ${orderBy}
      `,
      [userId],
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ${orderBy}
    `,
  );
}

function mapVendor(input: AnyRow) {
  const row = mergedRow(input);

  return {
    id: normalizeId(row.id, "vendor"),
    name: text(row.name, "Unnamed Vendor"),
    category: text(row.category, "General"),
    phone: text(row.phone),
    email: text(row.email),
    website: text(row.website),
    notes: text(row.notes, "No notes added yet."),
    logoDataUrl: firstText(
      row.logoDataUrl,
      row.logo_data_url,
    ),
    documents: arr(row.documents),
  };
}

function mapAsset(input: AnyRow) {
  const row = mergedRow(input);

  return {
    id: normalizeId(row.id, "asset"),
    name: text(row.name, "Unnamed Asset"),
    locationId: locationIdFromRecord(row),
    category: text(row.category, "General"),
    status: assetStatus(row.status),
    make: firstText(row.make, row.manufacturer),
    model: text(row.model),
    serial: firstText(row.serial, row.serial_number),
    notes:
      firstText(row.notes, row.description) ||
      "No notes added yet.",
    vendorIds: arr(
      row.vendorIds ??
        row.vendor_ids ??
        row.vendorids,
    ),
    documents: arr(row.documents),
  };
}

function mapProcedure(input: AnyRow) {
  const row = mergedRow(input);
  const steps = arr<string>(row.steps);

  return {
    id: normalizeId(row.id, "procedure"),
    title: text(row.title, "Untitled Procedure"),
    area: text(row.area, "General"),
    priority: priority(row.priority),
    steps: steps.length ? steps : [""],
  };
}

function mapWorkOrder(input: AnyRow) {
  const row = mergedRow(input);

  return {
    id: normalizeId(row.id, "service"),

    assetId: firstText(
      row.assetId,
      row.asset_id,
    ),

    vendorId: firstText(
      row.vendorId,
      row.vendor_id,
    ),

    procedureId: firstText(
      row.procedureId,
      row.procedure_id,
    ),

    date: dateText(
      firstText(
        row.date,
        row.work_date,
        row.scheduled_date,
        row.due_date,
      ),
      new Date().toISOString().slice(0, 10),
    ),

    title: text(
      row.title,
      "Untitled Work Order",
    ),

    status: serviceStatus(row.status),

    priority: workOrderPriority(
      row.priority,
    ),

    notes: text(
      row.notes,
      "No notes added yet.",
    ),

    followUpDate: dateText(
      firstText(
        row.followUpDate,
        row.follow_up_date,
      ),
    ),

    photos: arr(row.photos),
    documents: arr(row.documents),

    isRecurring: bool(
      row.isRecurring ??
        row.is_recurring,
    ),

    recurrenceFrequency: firstText(
      row.recurrenceFrequency,
      row.recurrence_frequency,
    ),

    recurrenceInterval: intValue(
      row.recurrenceInterval ??
        row.recurrence_interval,
      1,
    ),

    recurrenceDays: firstText(
      row.recurrenceDays,
      row.recurrence_days,
    ),

    recurrenceNextDue: dateText(
      firstText(
        row.recurrenceNextDue,
        row.recurrence_next_due,
      ),
    ),

    recurrenceEndType:
      firstText(
        row.recurrenceEndType,
        row.recurrence_end_type,
      ) || "never",

    recurrenceEndDate: dateText(
      firstText(
        row.recurrenceEndDate,
        row.recurrence_end_date,
      ),
    ),

    recurrenceCountLimit: firstText(
      row.recurrenceCountLimit,
      row.recurrence_count_limit,
    ),

    recurrenceCompletedCount: intValue(
      row.recurrenceCompletedCount ??
        row.recurrence_completed_count,
      0,
    ),

    recurrenceStatus:
      firstText(
        row.recurrenceStatus,
        row.recurrence_status,
      ) ||
      (bool(
        row.isRecurring ??
          row.is_recurring,
      )
        ? "active"
        : "inactive"),

    parentWorkOrderId: firstText(
      row.parentWorkOrderId,
      row.parent_work_order_id,
    ),

    invoiceNumber: firstText(
      row.invoiceNumber,
      row.invoice_number,
    ),

    invoiceDate: dateText(
      firstText(
        row.invoiceDate,
        row.invoice_date,
      ),
    ),

    invoiceAmount: firstText(
      row.invoiceAmount,
      row.invoice_amount,
    ),

    invoiceStatus:
      firstText(
        row.invoiceStatus,
        row.invoice_status,
      ) || "not added",

    paymentStatus:
      firstText(
        row.paymentStatus,
        row.payment_status,
      ) || "unknown",

    costCategory: firstText(
      row.costCategory,
      row.cost_category,
    ),

    approvedBy: firstText(
      row.approvedBy,
      row.approved_by,
    ),

    approvedDate: dateText(
      firstText(
        row.approvedDate,
        row.approved_date,
      ),
    ),

    costNotes: firstText(
      row.costNotes,
      row.cost_notes,
    ),

    invoiceDocumentIds: firstText(
      row.invoiceDocumentIds,
      row.invoice_document_ids,
    ),
  };
}

function mapWorkOrderTemplate(input: AnyRow) {
  const row = mergedRow(input);

  const isRecurring = bool(
    row.isRecurring ??
      row.is_recurring,
  );

  return {
    id: normalizeId(
      row.id,
      "work-order-template",
    ),

    title:
      firstText(row.title, row.name) ||
      "Untitled Template",

    name:
      firstText(row.name, row.title) ||
      "Untitled Template",

    assetId: firstText(
      row.assetId,
      row.asset_id,
    ),

    vendorId: firstText(
      row.vendorId,
      row.vendor_id,
    ),

    procedureId: firstText(
      row.procedureId,
      row.procedure_id,
    ),

    priority: workOrderPriority(
      row.priority,
    ),

    notes: text(row.notes),
    isRecurring,

    recurrenceFrequency: firstText(
      row.recurrenceFrequency,
      row.recurrence_frequency,
    ),

    recurrenceInterval: intValue(
      row.recurrenceInterval ??
        row.recurrence_interval,
      1,
    ),

    recurrenceDays: firstText(
      row.recurrenceDays,
      row.recurrence_days,
    ),

    recurrenceNextDue: dateText(
      firstText(
        row.recurrenceNextDue,
        row.recurrence_next_due,
      ),
    ),

    recurrenceEndType:
      firstText(
        row.recurrenceEndType,
        row.recurrence_end_type,
      ) || "never",

    recurrenceEndDate: dateText(
      firstText(
        row.recurrenceEndDate,
        row.recurrence_end_date,
      ),
    ),

    recurrenceCountLimit: firstText(
      row.recurrenceCountLimit,
      row.recurrence_count_limit,
    ),

    recurrenceCompletedCount: intValue(
      row.recurrenceCompletedCount ??
        row.recurrence_completed_count,
      0,
    ),

    recurrenceStatus:
      firstText(
        row.recurrenceStatus,
        row.recurrence_status,
      ) ||
      (isRecurring
        ? "active"
        : "inactive"),
  };
}

function mapCalendar(input: AnyRow) {
  const row = mergedRow(input);

  return {
    id: normalizeId(row.id, "calendar"),

    date: dateText(
      firstText(
        row.date,
        row.calendar_date,
        row.scheduled_date,
      ),
      new Date().toISOString().slice(0, 10),
    ),

    time: firstText(
      row.time,
      row.event_time,
    ),

    title: text(
      row.title,
      "Untitled Calendar Item",
    ),

    area: text(row.area, "General"),

    categoryLabel: firstText(
      row.categoryLabel,
      row.category_label,
    ),

    colorId: firstText(
      row.colorId,
      row.color_id,
    ),

    colorName: firstText(
      row.colorName,
      row.color_name,
    ),

    allDay: bool(
      row.allDay ??
        row.all_day,
    ),

    repeat:
      firstText(
        row.repeat,
        row.repeat_type,
      ) || "None",

    reminder:
      firstText(row.reminder) ||
      "None",

    notes: text(row.notes),

    linkedType:
      firstText(
        row.linkedType,
        row.linked_type,
      ) || "None",

    linkedId: firstText(
      row.linkedId,
      row.linked_id,
    ),

    linkedName: firstText(
      row.linkedName,
      row.linked_name,
    ),

    completed: bool(row.completed),

    source:
      firstText(row.source) ||
      "manual",

    originalId: firstText(
      row.originalId,
      row.original_id,
    ),

    instanceId: firstText(
      row.instanceId,
      row.instance_id,
    ),

    status: serviceStatus(row.status),
  };
}

function mapPhoto(input: AnyRow) {
  const row = mergedRow(input);

  return {
    id: normalizeId(row.id, "photo"),

    assetId: firstText(
      row.assetId,
      row.asset_id,
    ),

    name: text(row.name, "Photo"),

    dataUrl: firstText(
      row.dataUrl,
      row.data_url,
    ),

    url: firstText(
      row.url,
      row.fileUrl,
      row.file_url,
    ),

    createdAt:
      firstText(
        row.createdAt,
        row.created_at,
      ) ||
      new Date().toISOString(),
  };
}

async function buildPayload(
  table: AtlasTable,
  record: AnyRow,
  userId: string,
) {
  const actualTable =
    await resolveTable(table);

  if (!actualTable) {
    throw new Error(
      `Missing database table for ${table}`,
    );
  }

  const columns =
    await getColumns(actualTable);

  const payload: AnyRow = {};

  const userColumn =
    hasUserColumn(columns);

  function set(
    column: string,
    value: unknown,
  ) {
    if (columns.has(column)) {
      payload[column] = value;
    }
  }

  function setTextIfPresent(
    column: string,
    value: unknown,
  ) {
    const clean = text(value).trim();

    if (
      clean &&
      columns.has(column)
    ) {
      payload[column] = clean;
    }
  }

  set(
    "id",
    normalizeId(
      record.id,
      table.replaceAll("_", "-"),
    ),
  );

  if (userColumn) {
    set(userColumn, userId);
  }

  if (columns.has("record")) {
    set(
      "record",
      JSON.stringify(record),
    );
  }

  if (table === "vendors") {
    set(
      "name",
      text(
        record.name,
        "Unnamed Vendor",
      ),
    );

    set(
      "category",
      text(
        record.category,
        "General",
      ),
    );

    set("phone", text(record.phone));
    set("email", text(record.email));
    set(
      "website",
      text(record.website),
    );

    set(
      "notes",
      text(
        record.notes,
        "No notes added yet.",
      ),
    );

    set(
      "logoDataUrl",
      text(record.logoDataUrl),
    );

    set(
      "logo_data_url",
      text(record.logoDataUrl),
    );

    set(
      "documents",
      JSON.stringify(
        arr(record.documents),
      ),
    );
  }

  if (table === "assets") {
    const frontendLocationId =
      text(
        record.locationId,
        "general",
      );

    const locationName =
      locationNameFromFrontendId(
        frontendLocationId,
      );

    const locationDbId =
      await getOrCreateLocationId(
        userId,
        frontendLocationId,
      );

    const makeValue = firstText(
      record.make,
      record.manufacturer,
    );

    const serialValue = firstText(
      record.serial,
      record.serial_number,
    );

    set(
      "name",
      text(
        record.name,
        "Unnamed Asset",
      ),
    );

    set(
      "location_id",
      locationDbId,
    );

    set(
      "locationId",
      frontendLocationId,
    );

    set(
      "location",
      locationName,
    );

    set(
      "location_name",
      locationName,
    );

    set(
      "category",
      text(
        record.category,
        "General",
      ),
    );

    set(
      "status",
      assetStatus(record.status),
    );

    set("make", makeValue);
    set("manufacturer", makeValue);
    set("model", text(record.model));
    set("serial", serialValue);
    set("serial_number", serialValue);

    set(
      "notes",
      text(
        record.notes,
        "No notes added yet.",
      ),
    );

    set(
      "description",
      text(
        record.notes,
        "No notes added yet.",
      ),
    );

    set(
      "vendor_ids",
      JSON.stringify(
        arr(record.vendorIds),
      ),
    );

    set(
      "vendorIds",
      JSON.stringify(
        arr(record.vendorIds),
      ),
    );

    set(
      "documents",
      JSON.stringify(
        arr(record.documents),
      ),
    );
  }

  if (table === "procedures") {
    set(
      "title",
      text(
        record.title,
        "Untitled Procedure",
      ),
    );

    set(
      "area",
      text(
        record.area,
        "General",
      ),
    );

    set(
      "priority",
      priority(record.priority),
    );

    set(
      "steps",
      JSON.stringify(
        arr(record.steps),
      ),
    );
  }

  if (table === "work_orders") {
    const dateValue = dateText(
      record.date,
      new Date()
        .toISOString()
        .slice(0, 10),
    );

    const isRecurring = bool(
      record.isRecurring ??
        record.is_recurring,
    );

    const recurrenceStatusValue =
      firstText(
        record.recurrenceStatus,
        record.recurrence_status,
      ) ||
      (isRecurring
        ? "active"
        : "inactive");

    set(
      "asset_id",
      text(record.assetId),
    );

    set(
      "assetId",
      text(record.assetId),
    );

    set(
      "vendor_id",
      text(record.vendorId),
    );

    set(
      "vendorId",
      text(record.vendorId),
    );

    set(
      "procedure_id",
      text(record.procedureId),
    );

    set(
      "procedureId",
      text(record.procedureId),
    );

    set("date", dateValue);
    set("work_date", dateValue);
    set("scheduled_date", dateValue);
    set("due_date", dateValue);

    set(
      "title",
      text(
        record.title,
        "Untitled Work Order",
      ),
    );

    set(
      "status",
      serviceStatus(record.status),
    );

    set(
      "priority",
      workOrderPriority(
        record.priority,
      ),
    );

    set(
      "notes",
      text(
        record.notes,
        "No notes added yet.",
      ),
    );

    set(
      "follow_up_date",
      dateText(
        record.followUpDate,
      ),
    );

    set(
      "followUpDate",
      dateText(
        record.followUpDate,
      ),
    );

    set(
      "photos",
      JSON.stringify(
        arr(record.photos),
      ),
    );

    set(
      "documents",
      JSON.stringify(
        arr(record.documents),
      ),
    );

    set(
      "is_recurring",
      isRecurring,
    );

    set(
      "isRecurring",
      isRecurring,
    );

    set(
      "recurrence_frequency",
      firstText(
        record.recurrenceFrequency,
        record.recurrence_frequency,
      ),
    );

    set(
      "recurrence_interval",
      intValue(
        record.recurrenceInterval ??
          record.recurrence_interval,
        1,
      ),
    );

    set(
      "recurrence_days",
      firstText(
        record.recurrenceDays,
        record.recurrence_days,
      ),
    );

    set(
      "recurrence_next_due",
      dateText(
        firstText(
          record.recurrenceNextDue,
          record.recurrence_next_due,
        ),
      ),
    );

    set(
      "recurrence_end_type",
      firstText(
        record.recurrenceEndType,
        record.recurrence_end_type,
      ) || "never",
    );

    set(
      "recurrence_end_date",
      dateText(
        firstText(
          record.recurrenceEndDate,
          record.recurrence_end_date,
        ),
      ),
    );

    set(
      "recurrence_count_limit",
      firstText(
        record.recurrenceCountLimit,
        record.recurrence_count_limit,
      ) || null,
    );

    set(
      "recurrence_completed_count",
      intValue(
        record.recurrenceCompletedCount ??
          record.recurrence_completed_count,
        0,
      ),
    );

    set(
      "recurrence_status",
      recurrenceStatusValue,
    );

    set(
      "parent_work_order_id",
      firstText(
        record.parentWorkOrderId,
        record.parent_work_order_id,
      ),
    );

    set(
      "invoice_number",
      firstText(
        record.invoiceNumber,
        record.invoice_number,
      ),
    );

    set(
      "invoice_date",
      dateText(
        firstText(
          record.invoiceDate,
          record.invoice_date,
        ),
      ),
    );

    set(
      "invoice_amount",
      numberText(
        firstText(
          record.invoiceAmount,
          record.invoice_amount,
        ),
      ) || null,
    );

    set(
      "invoice_status",
      firstText(
        record.invoiceStatus,
        record.invoice_status,
      ) || "not added",
    );

    set(
      "payment_status",
      firstText(
        record.paymentStatus,
        record.payment_status,
      ) || "unknown",
    );

    set(
      "cost_category",
      firstText(
        record.costCategory,
        record.cost_category,
      ),
    );

    set(
      "approved_by",
      firstText(
        record.approvedBy,
        record.approved_by,
      ),
    );

    set(
      "approved_date",
      dateText(
        firstText(
          record.approvedDate,
          record.approved_date,
        ),
      ),
    );

    set(
      "cost_notes",
      firstText(
        record.costNotes,
        record.cost_notes,
      ),
    );

    set(
      "invoice_document_ids",
      firstText(
        record.invoiceDocumentIds,
        record.invoice_document_ids,
      ),
    );
  }

  if (
    table ===
    "work_order_templates"
  ) {
    const isRecurring = bool(
      record.isRecurring ??
        record.is_recurring,
    );

    set(
      "name",
      firstText(
        record.name,
        record.title,
      ) || "Untitled Template",
    );

    set(
      "title",
      firstText(
        record.title,
        record.name,
      ) || "Untitled Template",
    );

    set(
      "asset_id",
      firstText(
        record.assetId,
        record.asset_id,
      ),
    );

    set(
      "vendor_id",
      firstText(
        record.vendorId,
        record.vendor_id,
      ),
    );

    set(
      "procedure_id",
      firstText(
        record.procedureId,
        record.procedure_id,
      ),
    );

    set(
      "priority",
      workOrderPriority(
        record.priority,
      ),
    );

    set(
      "notes",
      text(record.notes),
    );

    set(
      "is_recurring",
      isRecurring,
    );

    set(
      "recurrence_frequency",
      firstText(
        record.recurrenceFrequency,
        record.recurrence_frequency,
      ),
    );

    set(
      "recurrence_interval",
      intValue(
        record.recurrenceInterval ??
          record.recurrence_interval,
        1,
      ),
    );

    set(
      "recurrence_days",
      firstText(
        record.recurrenceDays,
        record.recurrence_days,
      ),
    );

    set(
      "recurrence_next_due",
      dateText(
        firstText(
          record.recurrenceNextDue,
          record.recurrence_next_due,
        ),
      ),
    );

    set(
      "recurrence_end_type",
      firstText(
        record.recurrenceEndType,
        record.recurrence_end_type,
      ) || "never",
    );

    set(
      "recurrence_end_date",
      dateText(
        firstText(
          record.recurrenceEndDate,
          record.recurrence_end_date,
        ),
      ),
    );

    set(
      "recurrence_count_limit",
      firstText(
        record.recurrenceCountLimit,
        record.recurrence_count_limit,
      ) || null,
    );

    set(
      "recurrence_completed_count",
      intValue(
        record.recurrenceCompletedCount ??
          record.recurrence_completed_count,
        0,
      ),
    );

    set(
      "recurrence_status",
      firstText(
        record.recurrenceStatus,
        record.recurrence_status,
      ) ||
        (isRecurring
          ? "active"
          : "inactive"),
    );
  }

  if (table === "calendar") {
    const dateValue = dateText(
      record.date,
      new Date()
        .toISOString()
        .slice(0, 10),
    );

    set("date", dateValue);
    set(
      "calendar_date",
      dateValue,
    );
    set(
      "scheduled_date",
      dateValue,
    );

    set("time", text(record.time));
    set(
      "event_time",
      text(record.time),
    );

    set(
      "title",
      text(
        record.title,
        "Untitled Calendar Item",
      ),
    );

    set(
      "area",
      text(
        record.area,
        "General",
      ),
    );

    set(
      "categoryLabel",
      text(record.categoryLabel),
    );

    set(
      "category_label",
      text(record.categoryLabel),
    );

    set(
      "colorId",
      text(record.colorId),
    );

    set(
      "color_id",
      text(record.colorId),
    );

    set(
      "colorName",
      text(record.colorName),
    );

    set(
      "color_name",
      text(record.colorName),
    );

    set(
      "allDay",
      bool(record.allDay),
    );

    set(
      "all_day",
      bool(record.allDay),
    );

    set(
      "repeat",
      text(
        record.repeat,
        "None",
      ),
    );

    set(
      "repeat_type",
      text(
        record.repeat,
        "None",
      ),
    );

    set(
      "reminder",
      text(
        record.reminder,
        "None",
      ),
    );

    set(
      "notes",
      text(record.notes),
    );

    set(
      "linkedType",
      text(
        record.linkedType,
        "None",
      ),
    );

    set(
      "linked_type",
      text(
        record.linkedType,
        "None",
      ),
    );

    set(
      "linkedId",
      text(record.linkedId),
    );

    set(
      "linked_id",
      text(record.linkedId),
    );

    set(
      "linkedName",
      text(record.linkedName),
    );

    set(
      "linked_name",
      text(record.linkedName),
    );

    set(
      "completed",
      bool(record.completed),
    );

    set(
      "source",
      text(
        record.source,
        "manual",
      ),
    );

    set(
      "originalId",
      text(record.originalId),
    );

    set(
      "original_id",
      text(record.originalId),
    );

    set(
      "instanceId",
      text(record.instanceId),
    );

    set(
      "instance_id",
      text(record.instanceId),
    );

    set(
      "status",
      serviceStatus(record.status),
    );
  }

  if (table === "asset_photos") {
    const assetId = firstText(
      record.assetId,
      record.asset_id,
    );

    const dataUrl = firstText(
      record.dataUrl,
      record.data_url,
    );

    const fileUrl = firstText(
      record.url,
      record.fileUrl,
      record.file_url,
    );

    const createdAt =
      firstText(
        record.createdAt,
        record.created_at,
      ) ||
      new Date().toISOString();

    set("asset_id", assetId);
    set("assetId", assetId);

    set(
      "name",
      text(
        record.name,
        "Photo",
      ),
    );

    // Blank image fields are intentionally omitted.
    // This prevents a stale browser record from
    // erasing a photo already saved in Neon.
    setTextIfPresent(
      "dataUrl",
      dataUrl,
    );

    setTextIfPresent(
      "data_url",
      dataUrl,
    );

    setTextIfPresent(
      "url",
      fileUrl,
    );

    setTextIfPresent(
      "fileUrl",
      fileUrl,
    );

    setTextIfPresent(
      "file_url",
      fileUrl,
    );

    set(
      "createdAt",
      createdAt,
    );

    set(
      "created_at",
      createdAt,
    );
  }

  return {
    actualTable,
    payload,
  };
}

async function findRecordById(
  table: AtlasTable,
  id: string,
  userId: string,
) {
  const actualTable =
    await resolveTable(table);

  if (!actualTable) return null;

  const columns =
    await getColumns(actualTable);

  const userColumn =
    hasUserColumn(columns);

  if (userColumn) {
    const rows = await queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(
          actualTable,
        )}
        WHERE id = $1
          AND (
            ${quoteIdentifier(
              userColumn,
            )} = $2
            OR ${quoteIdentifier(
              userColumn,
            )} IS NULL
          )
        LIMIT 1
      `,
      [id, userId],
    );

    return rows[0] || null;
  }

  const rows = await queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(
        actualTable,
      )}
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return rows[0] || null;
}

async function upsertRecord(
  table: AtlasTable,
  record: AnyRow,
  userId: string,
) {
  const {
    actualTable,
    payload,
  } = await buildPayload(
    table,
    record,
    userId,
  );

  const columns =
    Object.keys(payload);

  if (!columns.length) {
    throw new Error(
      `No writable columns found for ${table}`,
    );
  }

  const quotedColumns = columns
    .map(quoteIdentifier)
    .join(", ");

  const placeholders = columns
    .map(
      (_, index) =>
        `$${index + 1}`,
    )
    .join(", ");

  const values = columns.map(
    (column) => payload[column],
  );

  const updateColumns = columns
    .filter(
      (column) =>
        column !== "id",
    )
    .map(
      (column) =>
        `${quoteIdentifier(
          column,
        )} = EXCLUDED.${quoteIdentifier(
          column,
        )}`,
    )
    .join(", ");

  const rows = await queryRows(
    `
      INSERT INTO ${quoteIdentifier(
        actualTable,
      )} (${quotedColumns})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
        ${
          updateColumns ||
          `${quoteIdentifier(
            "id",
          )} = EXCLUDED.${quoteIdentifier(
            "id",
          )}`
        }
      RETURNING *
    `,
    values,
  );

  return rows[0] || payload;
}

async function deleteRecord(
  table: AtlasTable,
  id: string,
  userId: string,
) {
  const actualTable =
    await resolveTable(table);

  if (!actualTable) return;

  const columns =
    await getColumns(actualTable);

  const userColumn =
    hasUserColumn(columns);

  if (userColumn) {
    await queryRows(
      `
        DELETE FROM ${quoteIdentifier(
          actualTable,
        )}
        WHERE id = $1
          AND ${quoteIdentifier(
            userColumn,
          )} = $2
      `,
      [id, userId],
    );

    return;
  }

  await queryRows(
    `
      DELETE FROM ${quoteIdentifier(
        actualTable,
      )}
      WHERE id = $1
    `,
    [id],
  );
}

export async function GET() {
  try {
    const userId =
      await getTargetUserId();

    const [
      vendorRows,
      assetRows,
      procedureRows,
      serviceRows,
      templateRows,
      calendarRows,
      photoRows,
    ] = await Promise.all([
      queryTable(
        "vendors",
        userId,
        "name",
      ),

      queryAssets(userId),

      queryTable(
        "procedures",
        userId,
        "title",
      ),

      queryWorkOrders(userId),

      queryTable(
        "work_order_templates",
        userId,
        "name",
      ),

      queryTable(
        "calendar",
        userId,
        "date",
      ),

      queryTable(
        "asset_photos",
        userId,
        "id",
      ),
    ]);

    return jsonResponse({
      ok: true,
      source: "neon",
      apiVersion: API_VERSION,
      userId,

      vendorRecords:
        vendorRows.map(mapVendor),

      assetRecords:
        assetRows.map(mapAsset),

      procedureRecords:
        procedureRows.map(
          mapProcedure,
        ),

      serviceRecords:
        serviceRows.map(
          mapWorkOrder,
        ),

      workOrderTemplateRecords:
        templateRows.map(
          mapWorkOrderTemplate,
        ),

      calendarItems:
        calendarRows.map(
          mapCalendar,
        ),

      photos:
        photoRows.map(mapPhoto),

      assetPhotos:
        photoRows.map(mapPhoto),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
        apiVersion: API_VERSION,

        error:
          error instanceof Error
            ? error.message
            : "Atlas API load failed",
      },
      500,
    );
  }
}

export async function POST(
  req: NextRequest,
) {
  try {
    const body =
      (await req.json()) as AnyRow;

    const table =
      body.table as AtlasTable;

    const record =
      body.record as AnyRow;

    if (
      !table ||
      !record ||
      !ALLOWED_TABLES.includes(
        table,
      )
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Invalid Atlas save request",
          apiVersion: API_VERSION,
        },
        400,
      );
    }

    const userId =
      await getTargetUserId();

    if (
      table ===
      "asset_photos"
    ) {
      const photoId =
        text(record.id).trim();

      const assetId = firstText(
        record.assetId,
        record.asset_id,
      );

      const incomingImage =
        firstText(
          record.dataUrl,
          record.data_url,
          record.url,
          record.fileUrl,
          record.file_url,
        );

      if (
        !photoId ||
        !assetId
      ) {
        return jsonResponse(
          {
            ok: false,

            error:
              "Asset photo requires both an id and an assetId",

            apiVersion:
              API_VERSION,
          },
          400,
        );
      }

      // Metadata-only saves can never overwrite
      // or create a blank image.
      if (!incomingImage) {
        const existing =
          await findRecordById(
            "asset_photos",
            photoId,
            userId,
          );

        if (existing) {
          return jsonResponse({
            ok: true,
            source: "neon",
            apiVersion:
              API_VERSION,
            table,

            preservedExistingImage:
              true,

            record:
              mapPhoto(existing),
          });
        }

        return jsonResponse({
          ok: true,
          source: "neon",
          apiVersion:
            API_VERSION,
          table,

          skippedBlankPhoto:
            true,

          record: null,
        });
      }
    }

    const saved =
      await upsertRecord(
        table,
        record,
        userId,
      );

    return jsonResponse({
      ok: true,
      source: "neon",
      apiVersion: API_VERSION,
      table,

      record:
        table ===
        "asset_photos"
          ? mapPhoto(saved)
          : saved,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
        apiVersion: API_VERSION,

        error:
          error instanceof Error
            ? error.message
            : "Atlas API save failed",
      },
      500,
    );
  }
}

export async function DELETE(
  req: NextRequest,
) {
  try {
    const body =
      (await req.json()) as AnyRow;

    const table =
      body.table as AtlasTable;

    const id =
      text(body.id).trim();

    if (
      !table ||
      !id ||
      !ALLOWED_TABLES.includes(
        table,
      )
    ) {
      return jsonResponse(
        {
          ok: false,

          error:
            "Invalid Atlas delete request",

          apiVersion: API_VERSION,
        },
        400,
      );
    }

    const userId =
      await getTargetUserId();

    await deleteRecord(
      table,
      id,
      userId,
    );

    return jsonResponse({
      ok: true,
      source: "neon",
      apiVersion: API_VERSION,
      table,
      id,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
        apiVersion: API_VERSION,

        error:
          error instanceof Error
            ? error.message
            : "Atlas API delete failed",
      },
      500,
    );
  }
}
