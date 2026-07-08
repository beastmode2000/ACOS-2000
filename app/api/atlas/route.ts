import { NextRequest, NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAIN_EMAIL = "nthornton87@yahoo.com";
const API_VERSION = "atlas-route-work-orders-recurring-costs-v1";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type AnyRow = Record<string, any>;

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
  work_orders: ["atlas_work_orders", "work_orders", "workorders", "service_records", "services"],
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
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function queryRows<T extends AnyRow = AnyRow>(query: string, params: any[] = []): Promise<T[]> {
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
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const clean = String(value).trim().toLowerCase();
  if (["true", "t", "yes", "y", "1", "on"].includes(clean)) return true;
  if (["false", "f", "no", "n", "0", "off"].includes(clean)) return false;
  return fallback;
}

function intValue(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(text(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numberText(value: unknown) {
  const clean = text(value).trim();
  if (!clean) return "";
  return clean.replace(/[$,]/g, "");
}

function dateText(value: unknown, fallback = "") {
  const clean = text(value).trim();
  if (!clean) return fallback;
  return clean.slice(0, 10);
}

function arr<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined || value === "") return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function assetStatus(value: unknown) {
  const clean = text(value, "Monitor").trim().toLowerCase();

  if (clean === "online") return "Online";
  if (clean === "offline") return "Offline";
  if (clean === "seasonal") return "Seasonal";
  if (clean === "monitor") return "Monitor";

  return "Monitor";
}

function serviceStatus(value: unknown) {
  const clean = text(value, "Open").trim().toLowerCase();

  if (clean === "open") return "Open";
  if (clean === "scheduled") return "Scheduled";
  if (clean === "completed") return "Completed";
  if (clean === "complete") return "Completed";
  if (clean === "done") return "Completed";
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
  if (clean === "medium") return "Medium";

  return "Medium";
}

function normalizeId(value: unknown, prefix: string) {
  const raw = text(value).trim();
  if (raw) return raw;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function locationIdFromRecord(row: AnyRow) {
  const savedFrontendId = text(row.locationId).trim();
  if (savedFrontendId && LOCATION_NAME_BY_ID[savedFrontendId]) return savedFrontendId;

  const directLocationId = text(row.location_id).trim();
  if (directLocationId && LOCATION_NAME_BY_ID[directLocationId]) return directLocationId;

  const locationName = firstText(row.location_name, row.locationName, row.location).trim().toLowerCase();
  if (locationName && LOCATION_ID_BY_NAME[locationName]) return LOCATION_ID_BY_NAME[locationName];

  return "general";
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
    [table]
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
    [table]
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
    const assetColumns = await getColumns(assetsTable);
    const userColumn = hasUserColumn(assetColumns);

    if (userColumn) {
      const assetUserRows = await queryRows<{ user_id_value: string }>(
        `
          SELECT ${quoteIdentifier(userColumn)}::text AS user_id_value
          FROM ${quoteIdentifier(assetsTable)}
          WHERE ${quoteIdentifier(userColumn)} IS NOT NULL
          GROUP BY ${quoteIdentifier(userColumn)}
          ORDER BY COUNT(*) DESC
          LIMIT 1
        `
      );

      if (assetUserRows[0]?.user_id_value) return String(assetUserRows[0].user_id_value);
    }
  }

  if (await tableExists("user")) {
    const userRows = await queryRows<{ id: string }>(
      `
        SELECT id
        FROM "user"
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [MAIN_EMAIL]
    );

    if (userRows[0]?.id) return String(userRows[0].id);
  }

  return "atlas-master";
}

async function getOrCreateLocationId(userId: string, frontendLocationId: unknown) {
  if (!(await tableExists("locations"))) return null;

  const locationName = locationNameFromFrontendId(frontendLocationId);
  const columns = await getColumns("locations");
  const userColumn = hasUserColumn(columns);

  if (userColumn) {
    const existing = await queryRows<{ id: any }>(
      `
        SELECT id
        FROM locations
        WHERE ${quoteIdentifier(userColumn)} = $1
          AND lower(trim(name)) = lower(trim($2))
        LIMIT 1
      `,
      [userId, locationName]
    );

    if (existing[0]?.id !== undefined && existing[0]?.id !== null) return existing[0].id;

    const created = await queryRows<{ id: any }>(
      `
        INSERT INTO locations (${quoteIdentifier(userColumn)}, name)
        VALUES ($1, $2)
        RETURNING id
      `,
      [userId, locationName]
    );

    return created[0]?.id ?? null;
  }

  const existing = await queryRows<{ id: any }>(
    `
      SELECT id
      FROM locations
      WHERE lower(trim(name)) = lower(trim($1))
      LIMIT 1
    `,
    [locationName]
  );

  if (existing[0]?.id !== undefined && existing[0]?.id !== null) return existing[0].id;

  const created = await queryRows<{ id: any }>(
    `
      INSERT INTO locations (name)
      VALUES ($1)
      RETURNING id
    `,
    [locationName]
  );

  return created[0]?.id ?? null;
}

async function queryTable(table: AtlasTable, userId: string, orderColumn: string) {
  const actualTable = await resolveTable(table);
  if (!actualTable) return [];

  const columns = await getColumns(actualTable);
  const userColumn = hasUserColumn(columns);
  const hasOrderColumn = columns.has(orderColumn);
  const orderBy = hasOrderColumn ? `ORDER BY lower(${quoteIdentifier(orderColumn)}::text)` : `ORDER BY id`;

  if (userColumn) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE ${quoteIdentifier(userColumn)} = $1 OR ${quoteIdentifier(userColumn)} IS NULL
        ${orderBy}
      `,
      [userId]
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ${orderBy}
    `
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

  const titleColumn = columns.has("title") ? "title" : "";

  const orderBy =
    dateColumn && titleColumn
      ? `ORDER BY ${quoteIdentifier(dateColumn)} DESC NULLS LAST, lower(${quoteIdentifier(titleColumn)}::text)`
      : dateColumn
        ? `ORDER BY ${quoteIdentifier(dateColumn)} DESC NULLS LAST`
        : titleColumn
          ? `ORDER BY lower(${quoteIdentifier(titleColumn)}::text)`
          : `ORDER BY id`;

  if (userColumn) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE ${quoteIdentifier(userColumn)} = $1 OR ${quoteIdentifier(userColumn)} IS NULL
        ${orderBy}
      `,
      [userId]
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ${orderBy}
    `
  );
}

async function queryAssets(userId: string) {
  const actualTable = await resolveTable("assets");
  if (!actualTable) return [];

  const columns = await getColumns(actualTable);
  const userColumn = hasUserColumn(columns);
  const hasName = columns.has("name");

  if (userColumn) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE ${quoteIdentifier(userColumn)} = $1 OR ${quoteIdentifier(userColumn)} IS NULL
        ${hasName ? "ORDER BY lower(name::text)" : "ORDER BY id"}
      `,
      [userId]
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ${hasName ? "ORDER BY lower(name::text)" : "ORDER BY id"}
    `
  );
}

function mapVendor(row: AnyRow) {
  return {
    id: normalizeId(row.id, "vendor"),
    name: text(row.name, "Unnamed Vendor"),
    category: text(row.category, "General"),
    phone: text(row.phone),
    email: text(row.email),
    website: text(row.website),
    notes: text(row.notes, "No notes added yet."),
    logoDataUrl: text(row.logoDataUrl || row.logo_data_url),
    documents: arr(row.documents),
  };
}

function mapAsset(row: AnyRow) {
  return {
    id: normalizeId(row.id, "asset"),
    name: text(row.name, "Unnamed Asset"),
    locationId: locationIdFromRecord(row),
    category: text(row.category, "General"),
    status: assetStatus(row.status),
    make: firstText(row.make, row.manufacturer),
    model: text(row.model),
    serial: firstText(row.serial, row.serial_number),
    notes: firstText(row.notes, row.description) || "No notes added yet.",
    vendorIds: arr<string>(row.vendorIds || row.vendor_ids || row.vendorids),
    documents: arr(row.documents),
  };
}

function mapProcedure(row: AnyRow) {
  const steps = arr<string>(row.steps);

  return {
    id: normalizeId(row.id, "procedure"),
    title: text(row.title, "Untitled Procedure"),
    area: text(row.area, "General"),
    priority: priority(row.priority),
    steps: steps.length ? steps : [""],
  };
}

function mapWorkOrder(row: AnyRow) {
  return {
    id: normalizeId(row.id, "service"),
    assetId: text(row.assetId || row.asset_id),
    vendorId: text(row.vendorId || row.vendor_id),
    procedureId: text(row.procedureId || row.procedure_id),
    date: dateText(firstText(row.date, row.work_date, row.scheduled_date, row.due_date), new Date().toISOString().slice(0, 10)),
    title: text(row.title, "Untitled Work Order"),
    status: serviceStatus(row.status),
    priority: workOrderPriority(row.priority),
    notes: text(row.notes, "No notes added yet."),
    followUpDate: dateText(row.followUpDate || row.follow_up_date),

    photos: arr(row.photos),
    documents: arr(row.documents),

    isRecurring: bool(row.isRecurring ?? row.is_recurring),
    recurrenceFrequency: text(row.recurrenceFrequency || row.recurrence_frequency),
    recurrenceInterval: intValue(row.recurrenceInterval ?? row.recurrence_interval, 1),
    recurrenceDays: text(row.recurrenceDays || row.recurrence_days),
    recurrenceNextDue: dateText(row.recurrenceNextDue || row.recurrence_next_due),
    recurrenceEndType: text(row.recurrenceEndType || row.recurrence_end_type, "never"),
    recurrenceEndDate: dateText(row.recurrenceEndDate || row.recurrence_end_date),
    recurrenceCountLimit: text(row.recurrenceCountLimit || row.recurrence_count_limit),
    recurrenceCompletedCount: intValue(row.recurrenceCompletedCount ?? row.recurrence_completed_count, 0),
    recurrenceStatus: text(row.recurrenceStatus || row.recurrence_status, bool(row.isRecurring ?? row.is_recurring) ? "active" : "inactive"),
    parentWorkOrderId: text(row.parentWorkOrderId || row.parent_work_order_id),

    invoiceNumber: text(row.invoiceNumber || row.invoice_number),
    invoiceDate: dateText(row.invoiceDate || row.invoice_date),
    invoiceAmount: text(row.invoiceAmount || row.invoice_amount),
    invoiceStatus: text(row.invoiceStatus || row.invoice_status, "not added"),
    paymentStatus: text(row.paymentStatus || row.payment_status, "unknown"),
    costCategory: text(row.costCategory || row.cost_category),
    approvedBy: text(row.approvedBy || row.approved_by),
    approvedDate: dateText(row.approvedDate || row.approved_date),
    costNotes: text(row.costNotes || row.cost_notes),
    invoiceDocumentIds: text(row.invoiceDocumentIds || row.invoice_document_ids),
  };
}

function mapWorkOrderTemplate(row: AnyRow) {
  return {
    id: normalizeId(row.id, "work-order-template"),
    title: text(row.title || row.name, "Untitled Template"),
    name: text(row.name || row.title, "Untitled Template"),
    assetId: text(row.assetId || row.asset_id),
    vendorId: text(row.vendorId || row.vendor_id),
    procedureId: text(row.procedureId || row.procedure_id),
    priority: workOrderPriority(row.priority),
    notes: text(row.notes, ""),
    isRecurring: bool(row.isRecurring ?? row.is_recurring),
    recurrenceFrequency: text(row.recurrenceFrequency || row.recurrence_frequency),
    recurrenceInterval: intValue(row.recurrenceInterval ?? row.recurrence_interval, 1),
    recurrenceDays: text(row.recurrenceDays || row.recurrence_days),
    recurrenceNextDue: dateText(row.recurrenceNextDue || row.recurrence_next_due),
    recurrenceEndType: text(row.recurrenceEndType || row.recurrence_end_type, "never"),
    recurrenceEndDate: dateText(row.recurrenceEndDate || row.recurrence_end_date),
    recurrenceCountLimit: text(row.recurrenceCountLimit || row.recurrence_count_limit),
    recurrenceCompletedCount: intValue(row.recurrenceCompletedCount ?? row.recurrence_completed_count, 0),
    recurrenceStatus: text(row.recurrenceStatus || row.recurrence_status, bool(row.isRecurring ?? row.is_recurring) ? "active" : "inactive"),
  };
}

function mapCalendar(row: AnyRow) {
  return {
    id: normalizeId(row.id, "calendar"),
    date: dateText(firstText(row.date, row.calendar_date, row.scheduled_date), new Date().toISOString().slice(0, 10)),
    title: text(row.title, "Untitled Calendar Item"),
    area: text(row.area, "General"),
    status: serviceStatus(row.status),
  };
}

function mapPhoto(row: AnyRow) {
  return {
    id: normalizeId(row.id, "photo"),
    assetId: text(row.assetId || row.asset_id),
    name: text(row.name, "Photo"),
    dataUrl: text(row.dataUrl || row.data_url),
    createdAt: text(row.createdAt || row.created_at, new Date().toISOString()),
  };
}

async function buildPayload(table: AtlasTable, record: AnyRow, userId: string) {
  const actualTable = await resolveTable(table);
  if (!actualTable) throw new Error(`Missing database table for ${table}`);

  const columns = await getColumns(actualTable);
  const payload: AnyRow = {};
  const userColumn = hasUserColumn(columns);

  function set(column: string, value: unknown) {
    if (columns.has(column)) payload[column] = value;
  }

  set("id", normalizeId(record.id, table.replace("_", "-")));
  if (userColumn) set(userColumn, userId);

  if (table === "vendors") {
    set("name", text(record.name, "Unnamed Vendor"));
    set("category", text(record.category, "General"));
    set("phone", text(record.phone));
    set("email", text(record.email));
    set("website", text(record.website));
    set("notes", text(record.notes, "No notes added yet."));
    set("logoDataUrl", text(record.logoDataUrl));
    set("logo_data_url", text(record.logoDataUrl));
    set("documents", JSON.stringify(arr(record.documents)));
  }

  if (table === "assets") {
    const frontendLocationId = text(record.locationId, "general");
    const locationName = locationNameFromFrontendId(frontendLocationId);
    const locationDbId = await getOrCreateLocationId(userId, frontendLocationId);

    const makeValue = firstText(record.make, record.manufacturer);
    const serialValue = firstText(record.serial, record.serial_number);

    set("name", text(record.name, "Unnamed Asset"));

    set("location_id", locationDbId);
    set("locationId", frontendLocationId);
    set("location", locationName);
    set("location_name", locationName);

    set("category", text(record.category, "General"));
    set("status", assetStatus(record.status));

    set("make", makeValue);
    set("manufacturer", makeValue);

    set("model", text(record.model));

    set("serial", serialValue);
    set("serial_number", serialValue);

    set("notes", text(record.notes, "No notes added yet."));
    set("description", text(record.notes, "No notes added yet."));

    set("vendor_ids", JSON.stringify(arr(record.vendorIds)));
    set("vendorIds", JSON.stringify(arr(record.vendorIds)));
    set("documents", JSON.stringify(arr(record.documents)));
  }

  if (table === "procedures") {
    set("title", text(record.title, "Untitled Procedure"));
    set("area", text(record.area, "General"));
    set("priority", priority(record.priority));
    set("steps", JSON.stringify(arr(record.steps)));
  }

  if (table === "work_orders") {
    const dateValue = dateText(record.date, new Date().toISOString().slice(0, 10));

    set("asset_id", text(record.assetId));
    set("assetId", text(record.assetId));

    set("vendor_id", text(record.vendorId));
    set("vendorId", text(record.vendorId));

    set("procedure_id", text(record.procedureId));
    set("procedureId", text(record.procedureId));

    set("date", dateValue);
    set("work_date", dateValue);
    set("scheduled_date", dateValue);
    set("due_date", dateValue);

    set("title", text(record.title, "Untitled Work Order"));
    set("status", serviceStatus(record.status));
    set("priority", workOrderPriority(record.priority));
    set("notes", text(record.notes, "No notes added yet."));

    set("follow_up_date", dateText(record.followUpDate));
    set("followUpDate", dateText(record.followUpDate));

    set("photos", JSON.stringify(arr(record.photos)));
    set("documents", JSON.stringify(arr(record.documents)));

    const isRecurring = bool(record.isRecurring ?? record.is_recurring);
    const recurrenceStatus = text(record.recurrenceStatus || record.recurrence_status, isRecurring ? "active" : "inactive");

    set("is_recurring", isRecurring);
    set("isRecurring", isRecurring);
    set("recurrence_frequency", text(record.recurrenceFrequency || record.recurrence_frequency));
    set("recurrence_interval", intValue(record.recurrenceInterval ?? record.recurrence_interval, 1));
    set("recurrence_days", text(record.recurrenceDays || record.recurrence_days));
    set("recurrence_next_due", dateText(record.recurrenceNextDue || record.recurrence_next_due));
    set("recurrence_end_type", text(record.recurrenceEndType || record.recurrence_end_type, "never"));
    set("recurrence_end_date", dateText(record.recurrenceEndDate || record.recurrence_end_date));
    set("recurrence_count_limit", text(record.recurrenceCountLimit || record.recurrence_count_limit) || null);
    set("recurrence_completed_count", intValue(record.recurrenceCompletedCount ?? record.recurrence_completed_count, 0));
    set("recurrence_status", recurrenceStatus);
    set("parent_work_order_id", text(record.parentWorkOrderId || record.parent_work_order_id));

    set("invoice_number", text(record.invoiceNumber || record.invoice_number));
    set("invoice_date", dateText(record.invoiceDate || record.invoice_date));
    set("invoice_amount", numberText(record.invoiceAmount || record.invoice_amount) || null);
    set("invoice_status", text(record.invoiceStatus || record.invoice_status, "not added"));
    set("payment_status", text(record.paymentStatus || record.payment_status, "unknown"));
    set("cost_category", text(record.costCategory || record.cost_category));
    set("approved_by", text(record.approvedBy || record.approved_by));
    set("approved_date", dateText(record.approvedDate || record.approved_date));
    set("cost_notes", text(record.costNotes || record.cost_notes));
    set("invoice_document_ids", text(record.invoiceDocumentIds || record.invoice_document_ids));
  }

  if (table === "work_order_templates") {
    const isRecurring = bool(record.isRecurring ?? record.is_recurring);

    set("name", text(record.name || record.title, "Untitled Template"));
    set("title", text(record.title || record.name, "Untitled Template"));
    set("asset_id", text(record.assetId || record.asset_id));
    set("vendor_id", text(record.vendorId || record.vendor_id));
    set("procedure_id", text(record.procedureId || record.procedure_id));
    set("priority", workOrderPriority(record.priority));
    set("notes", text(record.notes));

    set("is_recurring", isRecurring);
    set("recurrence_frequency", text(record.recurrenceFrequency || record.recurrence_frequency));
    set("recurrence_interval", intValue(record.recurrenceInterval ?? record.recurrence_interval, 1));
    set("recurrence_days", text(record.recurrenceDays || record.recurrence_days));
    set("recurrence_next_due", dateText(record.recurrenceNextDue || record.recurrence_next_due));
    set("recurrence_end_type", text(record.recurrenceEndType || record.recurrence_end_type, "never"));
    set("recurrence_end_date", dateText(record.recurrenceEndDate || record.recurrence_end_date));
    set("recurrence_count_limit", text(record.recurrenceCountLimit || record.recurrence_count_limit) || null);
    set("recurrence_completed_count", intValue(record.recurrenceCompletedCount ?? record.recurrence_completed_count, 0));
    set("recurrence_status", text(record.recurrenceStatus || record.recurrence_status, isRecurring ? "active" : "inactive"));
  }

  if (table === "calendar") {
    const dateValue = dateText(record.date, new Date().toISOString().slice(0, 10));

    set("date", dateValue);
    set("calendar_date", dateValue);
    set("scheduled_date", dateValue);
    set("title", text(record.title, "Untitled Calendar Item"));
    set("area", text(record.area, "General"));
    set("status", serviceStatus(record.status));
  }

  if (table === "asset_photos") {
    set("asset_id", text(record.assetId));
    set("assetId", text(record.assetId));
    set("name", text(record.name, "Photo"));
    set("dataUrl", text(record.dataUrl));
    set("data_url", text(record.dataUrl));
    set("createdAt", text(record.createdAt, new Date().toISOString()));
    set("created_at", text(record.createdAt, new Date().toISOString()));
  }

  return { actualTable, payload };
}

async function upsertRecord(table: AtlasTable, record: AnyRow, userId: string) {
  const { actualTable, payload } = await buildPayload(table, record, userId);
  const columns = Object.keys(payload);

  if (!columns.length) throw new Error(`No writable columns found for ${table}`);

  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const values = columns.map((column) => payload[column]);

  const updateColumns = columns
    .filter((column) => column !== "id")
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
    .join(", ");

  const query = `
    INSERT INTO ${quoteIdentifier(actualTable)} (${quotedColumns})
    VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET
      ${updateColumns || `${quoteIdentifier("id")} = EXCLUDED.${quoteIdentifier("id")}`}
    RETURNING *
  `;

  const rows = await queryRows(query, values);
  return rows[0] || payload;
}

async function deleteRecord(table: AtlasTable, id: string, userId: string) {
  const actualTable = await resolveTable(table);
  if (!actualTable) return;

  const columns = await getColumns(actualTable);
  const userColumn = hasUserColumn(columns);

  if (userColumn) {
    await queryRows(
      `
        DELETE FROM ${quoteIdentifier(actualTable)}
        WHERE id = $1
          AND ${quoteIdentifier(userColumn)} = $2
      `,
      [id, userId]
    );
    return;
  }

  await queryRows(
    `
      DELETE FROM ${quoteIdentifier(actualTable)}
      WHERE id = $1
    `,
    [id]
  );
}

export async function GET() {
  try {
    const userId = await getTargetUserId();

    const vendorRows = await queryTable("vendors", userId, "name");
    const assetRows = await queryAssets(userId);
    const procedureRows = await queryTable("procedures", userId, "title");
    const serviceRows = await queryWorkOrders(userId);
    const templateRows = await queryTable("work_order_templates", userId, "name");
    const calendarRows = await queryTable("calendar", userId, "date");
    const photoRows = await queryTable("asset_photos", userId, "id");

    return jsonResponse({
      ok: true,
      source: "neon",
      apiVersion: API_VERSION,
      userId,
      vendorRecords: vendorRows.map(mapVendor),
      assetRecords: assetRows.map(mapAsset),
      procedureRecords: procedureRows.map(mapProcedure),
      serviceRecords: serviceRows.map(mapWorkOrder),
      workOrderTemplateRecords: templateRows.map(mapWorkOrderTemplate),
      calendarItems: calendarRows.map(mapCalendar),
      photos: photoRows.map(mapPhoto),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
        apiVersion: API_VERSION,
        error: error instanceof Error ? error.message : "Atlas API load failed",
      },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const table = body?.table as AtlasTable;
    const record = body?.record as AnyRow;

    if (!table || !record || !ALLOWED_TABLES.includes(table)) {
      return jsonResponse({ ok: false, error: "Invalid Atlas save request", apiVersion: API_VERSION }, 400);
    }

    const userId = await getTargetUserId();
    const saved = await upsertRecord(table, record, userId);

    return jsonResponse({
      ok: true,
      source: "neon",
      apiVersion: API_VERSION,
      table,
      record: saved,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
        apiVersion: API_VERSION,
        error: error instanceof Error ? error.message : "Atlas API save failed",
      },
      500
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const table = body?.table as AtlasTable;
    const id = text(body?.id);

    if (!table || !id || !ALLOWED_TABLES.includes(table)) {
      return jsonResponse({ ok: false, error: "Invalid Atlas delete request", apiVersion: API_VERSION }, 400);
    }

    const userId = await getTargetUserId();
    await deleteRecord(table, id, userId);

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
        error: error instanceof Error ? error.message : "Atlas API delete failed",
      },
      500
    );
  }
}
