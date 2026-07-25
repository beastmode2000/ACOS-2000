import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type AtlasTable =
  | "locations"
  | "vendors"
  | "assets"
  | "contacts"
  | "procedures"
  | "work_orders"
  | "calendar"
  | "parts"
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

function asMoney(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Number(parsed.toFixed(2));
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

  if (table === "locations") return "locations";
  if (table === "vendors") return "vendors";
  if (table === "assets") return "assets";
  if (table === "contacts") return "contacts";
  if (table === "procedures") return "procedures";
  if (table === "work_orders") return "work_orders";
  if (table === "calendar") return "calendar";
  if (table === "parts") return "parts";
  if (table === "documents") return "documents";
  if (table === "asset_photos") return "asset_photos";

  return "";
}

async function ensureAssetColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS year text`;
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS manufacturer text`;
}

async function ensurePropertyColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_documents ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_asset_photos ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_parts ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_vendors ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_contacts ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
}

async function authorizeAtlasRequest(
  sql: ReturnType<typeof neon>,
  request: NextRequest,
  propertyId: string,
  permission: "view" | "edit" | "delete",
) {
  const email = (request.headers.get("x-atlas-user-email") || "").toLowerCase();
  const headerRole =
    request.headers.get("x-atlas-user-role") || "administrator";
  if (!email || headerRole === "master") return true;
  const rows =
    await sql`SELECT role, active, property_ids, permissions FROM atlas_team_access WHERE lower(email)=${email} LIMIT 1`;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row || (row as { active?: boolean }).active === false) return false;
  const role = String(row.role || headerRole);
  const propertyIds = Array.isArray(row.property_ids)
    ? row.property_ids.map(String)
    : ["2000"];
  if (!propertyIds.includes(propertyId)) return false;
  if (permission === "view") return true;
  const permissions =
    row.permissions && typeof row.permissions === "object"
      ? (row.permissions as Record<string, unknown>)
      : {};
  const defaults =
    role === "administrator" || role === "manager"
      ? { edit: true, delete: role === "administrator" }
      : { edit: role === "employee", delete: false };
  return permission === "edit"
    ? Boolean(permissions.edit ?? defaults.edit)
    : Boolean(permissions.delete ?? defaults.delete);
}

async function ensureCalendarColumns(sql: ReturnType<typeof neon>) {
  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS item_date date
  `;

  await sql`
    UPDATE atlas_calendar_items
    SET item_date = date
    WHERE item_date IS NULL
      AND date IS NOT NULL
  `;

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
}

async function ensureContactsTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_contacts (
      id text PRIMARY KEY,
      name text NOT NULL,
      record jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function ensurePartsTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_parts (
      id text PRIMARY KEY,
      name text NOT NULL,
      category text NOT NULL DEFAULT 'General',
      location_id text,
      asset_id text,
      vendor_id text,
      quantity integer NOT NULL DEFAULT 0,
      min_quantity integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'In Stock',
      notes text NOT NULL DEFAULT '',
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
}

async function recordChange(
  sql: ReturnType<typeof neon>,
  actor: string,
  action: string,
  table: string,
  recordId: string,
  record: JsonRecord,
) {
  await sql`CREATE TABLE IF NOT EXISTS atlas_change_history (
    id bigserial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT NOW(), actor text,
    action text NOT NULL, table_name text NOT NULL, record_id text, record jsonb
  )`;
  await sql`INSERT INTO atlas_change_history (actor, action, table_name, record_id, record)
    VALUES (${
      actor || "Atlas user"
    }, ${action}, ${table}, ${recordId}, ${JSON.stringify(record)}::jsonb)`;
}

async function ensureWorkOrderColumns(sql: ReturnType<typeof neon>) {
  await sql`
    ALTER TABLE atlas_work_orders
    ALTER COLUMN asset_id DROP NOT NULL
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS due_date_value date
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS due_date_initialized boolean NOT NULL DEFAULT false
  `;

  await sql`
    UPDATE atlas_work_orders
    SET
      due_date_value = date,
      due_date_initialized = true
    WHERE due_date_initialized = false
  `;

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

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS location_id text
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT 'Work Order'
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS work_category text NOT NULL DEFAULT 'Maintenance'
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS effort text
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS responsibility_area text
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS emoji text
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS assigned_to text
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS notes_history jsonb NOT NULL DEFAULT '[]'::jsonb
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS service_history jsonb NOT NULL DEFAULT '[]'::jsonb
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,2)
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS actual_cost numeric(12,2)
  `;

  await sql`
    ALTER TABLE atlas_work_orders
    ADD COLUMN IF NOT EXISTS invoice_number text
  `;
}

async function ensureProcedureColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS category text`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS purpose text`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS safety_notes text`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS tools_parts text`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS required_tools text[] DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS required_parts text[] DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS estimated_time text`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS linked_asset_ids text[] DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS linked_location_ids text[] DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS linked_vendor_ids text[] DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()`;
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
    year: row.year ? String(row.year) : "",
    manufacturer: row.manufacturer ? String(row.manufacturer) : "",
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
    category: row.category ? String(row.category) : "",
    priority: String(row.priority || "Normal"),
    status: row.status ? String(row.status) : "Draft",
    purpose: row.purpose ? String(row.purpose) : "",
    safetyNotes: row.safety_notes ? String(row.safety_notes) : "",
    toolsParts: row.tools_parts ? String(row.tools_parts) : "",
    requiredTools: asStringArray(row.required_tools),
    requiredParts: asStringArray(row.required_parts),
    estimatedTime: row.estimated_time ? String(row.estimated_time) : "",
    steps: asStringArray(row.steps),
    checklist: asArray(row.checklist),
    linkedAssetIds: asStringArray(row.linked_asset_ids),
    linkedLocationIds: asStringArray(row.linked_location_ids),
    linkedVendorIds: asStringArray(row.linked_vendor_ids),
    photos: asArray(row.photos),
    documents: asArray(row.documents),
    createdAt: row.created_at ? String(row.created_at) : "",
    updatedAt: row.updated_at ? String(row.updated_at) : "",
  };
}

function mapPart(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    category: String(row.category || "General"),
    locationId: String(row.location_id || ""),
    assetId: String(row.asset_id || ""),
    vendorId: String(row.vendor_id || ""),
    quantity: Number(row.quantity || 0),
    minQuantity: Number(row.min_quantity || 0),
    status: String(row.status || "In Stock"),
    notes: String(row.notes || ""),
  };
}

function mapWorkOrder(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    assetId: row.asset_id ? String(row.asset_id) : "",
    vendorId: row.vendor_id ? String(row.vendor_id) : "",
    procedureId: row.procedure_id ? String(row.procedure_id) : "",
    locationId: row.location_id ? String(row.location_id) : "",
    date: databaseDateKey(
      row.due_date_initialized ? row.due_date_value : row.date,
    ),
    title: String(row.title || ""),
    status: String(row.status || "Open"),
    priority: String(row.priority || "Medium"),
    notes: String(row.notes || ""),
    followUpDate: databaseDateKey(row.follow_up_date),
    recurring: Boolean(row.recurring),
    recurrenceInterval: Math.max(
      1,
      Number(row.recurrence_interval || 1),
    ),
    recurrenceUnit: String(row.recurrence_unit || "Weeks"),
    recurrenceEndDate: databaseDateKey(row.recurrence_end_date),
    season: String(row.season || "Year-Round"),
    lastCompletedDate: databaseDateKey(row.last_completed_date),
    completionHistory: asArray(row.completion_history).map(String),
    workType: String(row.work_type || "Work Order"),
    workCategory: String(row.work_category || "Maintenance"),
    effort: row.effort ? String(row.effort) : "",
    responsibilityArea: row.responsibility_area
      ? String(row.responsibility_area)
      : "",
    emoji: row.emoji ? String(row.emoji) : "",
    assignedTo: row.assigned_to ? String(row.assigned_to) : "",
    checklist: asArray(row.checklist),
    notesHistory: asArray(row.notes_history),
    serviceHistory: asArray(row.service_history),
    estimatedCost: Number(row.estimated_cost || 0),
    actualCost: Number(row.actual_cost || 0),
    invoiceNumber: row.invoice_number ? String(row.invoice_number) : "",
    photos: asArray(row.photos),
    documents: asArray(row.documents),
  };
}

function databaseDateKey(value: unknown) {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

function mapCalendarItem(row: JsonRecord) {
  return {
    id: String(row.id || ""),
    date: databaseDateKey(row.item_date || row.date),
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
    linkedAssetId: row.linked_asset_id ? String(row.linked_asset_id) : "",
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

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureAssetColumns(sql);
    await ensureWorkOrderColumns(sql);
    await ensureCalendarColumns(sql);
    await ensureContactsTable(sql);
    await ensurePartsTable(sql);
    await ensurePropertyColumns(sql);
    if (request.nextUrl.searchParams.get("portfolio") === "1") {
      const propertyIds = ["2000", "6855", "3661", "hangar"];
      const accessible = (
        await Promise.all(
          propertyIds.map(async (propertyId) => ({
            propertyId,
            allowed: await authorizeAtlasRequest(
              sql,
              request,
              propertyId,
              "view",
            ),
          })),
        )
      )
        .filter((item) => item.allowed)
        .map((item) => item.propertyId);
      const accessibleSet = new Set(accessible);

      const [
        locationCounts,
        assetCounts,
        workCounts,
        partCounts,
        calendarCounts,
        documentCounts,
      ] = await Promise.all([
        sql`
          SELECT property_id, COUNT(*)::int AS total
          FROM atlas_locations
          WHERE property_id = ANY(${accessible}::text[])
          GROUP BY property_id
        `,
        sql`
          SELECT
            property_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status IN ('Offline', 'Monitor')
            )::int AS risks
          FROM atlas_assets
          WHERE property_id = ANY(${accessible}::text[])
          GROUP BY property_id
        `,
        sql`
          SELECT
            property_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status NOT IN ('Completed', 'Closed', 'Cancelled')
            )::int AS open,
            COUNT(*) FILTER (
              WHERE status NOT IN ('Completed', 'Closed', 'Cancelled')
                AND COALESCE(due_date_value, date) < CURRENT_DATE
            )::int AS overdue,
            COUNT(*) FILTER (
              WHERE status NOT IN ('Completed', 'Closed', 'Cancelled')
                AND priority = 'High'
            )::int AS high_priority,
            COUNT(*) FILTER (
              WHERE status IN ('Completed', 'Closed')
            )::int AS completed
          FROM atlas_work_orders
          WHERE property_id = ANY(${accessible}::text[])
          GROUP BY property_id
        `,
        sql`
          SELECT
            property_id,
            COUNT(*) FILTER (
              WHERE quantity <= min_quantity
                 OR status IN ('Low', 'Out', 'Order')
            )::int AS low_stock
          FROM atlas_parts
          WHERE property_id = ANY(${accessible}::text[])
          GROUP BY property_id
        `,
        sql`
          SELECT
            property_id,
            COUNT(*) FILTER (
              WHERE COALESCE(item_date, date) >= CURRENT_DATE
                AND COALESCE(item_date, date) < CURRENT_DATE + INTERVAL '30 days'
                AND completed = false
            )::int AS upcoming
          FROM atlas_calendar_items
          WHERE property_id = ANY(${accessible}::text[])
          GROUP BY property_id
        `,
        sql`
          SELECT property_id, COUNT(*)::int AS total
          FROM atlas_documents
          WHERE property_id = ANY(${accessible}::text[])
          GROUP BY property_id
        `,
      ]);

      const rowMap = (rows: readonly Record<string, unknown>[]) =>
        new Map(
          rows
            .filter((row) => accessibleSet.has(String(row.property_id)))
            .map((row) => [String(row.property_id), row]),
        );
      const locationsByProperty = rowMap(locationCounts);
      const assetsByProperty = rowMap(assetCounts);
      const workByProperty = rowMap(workCounts);
      const partsByProperty = rowMap(partCounts);
      const calendarByProperty = rowMap(calendarCounts);
      const documentsByProperty = rowMap(documentCounts);
      const number = (value: unknown) => Number(value || 0);

      return NextResponse.json({
        ok: true,
        source: "neon",
        generatedAt: new Date().toISOString(),
        properties: accessible.map((propertyId) => {
          const locations = locationsByProperty.get(propertyId) || {};
          const assets = assetsByProperty.get(propertyId) || {};
          const work = workByProperty.get(propertyId) || {};
          const parts = partsByProperty.get(propertyId) || {};
          const calendar = calendarByProperty.get(propertyId) || {};
          const documents = documentsByProperty.get(propertyId) || {};
          return {
            propertyId,
            locations: number(locations.total),
            assets: number(assets.total),
            assetRisks: number(assets.risks),
            workOrders: number(work.total),
            openWork: number(work.open),
            overdueWork: number(work.overdue),
            highPriorityWork: number(work.high_priority),
            completedWork: number(work.completed),
            lowStockParts: number(parts.low_stock),
            upcomingEvents: number(calendar.upcoming),
            documents: number(documents.total),
          };
        }),
      });
    }
    const propertyId =
      asString(request.nextUrl.searchParams.get("propertyId")) || "2000";
    if (!(await authorizeAtlasRequest(sql, request, propertyId, "view"))) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this property." },
        { status: 403 },
      );
    }

    const locationRows = (await sql`
      SELECT id, name, type, zone, notes, sort_order
      FROM atlas_locations
      WHERE property_id = ${propertyId}
      ORDER BY sort_order ASC, name ASC
    `) as unknown as JsonRecord[];

    const vendorRows = (await sql`
      SELECT id, name, category, phone, email, website, notes, logo_data_url, documents
      FROM atlas_vendors
      WHERE property_id = ${propertyId}
      ORDER BY name ASC
    `) as unknown as JsonRecord[];

    const contactRows = (await sql`
      SELECT record FROM atlas_contacts
      WHERE property_id = ${propertyId}
      ORDER BY lower(name) ASC
    `) as unknown as JsonRecord[];

    const assetRows = (await sql`
      SELECT id, name, location_id, category, status, make, model, year, manufacturer, serial, notes, vendor_ids, documents
      FROM atlas_assets
      WHERE property_id = ${propertyId}
      ORDER BY name ASC
    `) as unknown as JsonRecord[];

    let procedureRows: JsonRecord[];
    try {
      await ensureProcedureColumns(sql);
      procedureRows = (await sql`
        SELECT
          id,
          title,
          area,
          category,
          priority,
          status,
          purpose,
          safety_notes,
          tools_parts,
          required_tools,
          required_parts,
          estimated_time,
          steps,
          checklist,
          linked_asset_ids,
          linked_location_ids,
          linked_vendor_ids,
          photos,
          documents,
          created_at,
          updated_at
        FROM atlas_procedures
        WHERE property_id = ${propertyId}
        ORDER BY title ASC
      `) as unknown as JsonRecord[];
    } catch {
      procedureRows = (await sql`
        SELECT id, title, area, priority, steps
        FROM atlas_procedures
        WHERE property_id = ${propertyId}
        ORDER BY title ASC
      `) as unknown as JsonRecord[];
    }

    const workOrderRows = (await sql`
      SELECT
        id,
        asset_id,
        vendor_id,
        procedure_id,
        location_id,
        date,
        due_date_value,
        due_date_initialized,
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
        work_type,
        work_category,
        effort,
        responsibility_area,
        emoji,
        assigned_to,
        checklist,
        notes_history,
        service_history,
        estimated_cost,
        actual_cost,
        invoice_number,
        photos,
        documents
      FROM atlas_work_orders
      WHERE property_id = ${propertyId}
      ORDER BY (CASE WHEN due_date_initialized THEN due_date_value ELSE date END) ASC NULLS LAST, title ASC
    `) as unknown as JsonRecord[];

    const calendarRows = (await sql`
      SELECT
        id,
        item_date,
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
      WHERE property_id = ${propertyId}
      ORDER BY COALESCE(item_date, date) ASC, time ASC NULLS LAST, title ASC
    `) as unknown as JsonRecord[];

    const documentRows = (await sql`
      SELECT id, title, area, type, linked_asset_id, notes
      FROM atlas_documents
      WHERE property_id = ${propertyId}
      ORDER BY title ASC
    `) as unknown as JsonRecord[];

    const photoRows = (await sql`
      SELECT id, asset_id, name, data_url, created_at
      FROM atlas_asset_photos
      WHERE property_id = ${propertyId}
      ORDER BY created_at DESC
    `) as unknown as JsonRecord[];

    const partRows = (await sql`
      SELECT id, name, category, location_id, asset_id, vendor_id,
             quantity, min_quantity, status, notes
      FROM atlas_parts
      WHERE property_id = ${propertyId}
      ORDER BY lower(name) ASC
    `) as unknown as JsonRecord[];

    return NextResponse.json({
      ok: true,
      source: "neon",
      locations: locationRows.map(mapLocation),
      vendorRecords: vendorRows.map(mapVendor),
      contactRecords: contactRows.map((row) => row.record || {}),
      assetRecords: assetRows.map(mapAsset),
      procedureRecords: procedureRows.map(mapProcedure),
      serviceRecords: workOrderRows.map(mapWorkOrder),
      calendarItems: calendarRows.map(mapCalendarItem),
      documents: documentRows.map(mapDocument),
      photos: photoRows.map(mapPhoto),
      partRecords: partRows.map(mapPart),
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
  if (request.headers.get("x-atlas-user-role") === "viewer") {
    return NextResponse.json(
      { ok: false, error: "Viewer access is read-only." },
      { status: 403 },
    );
  }
  try {
    const sql = getSql();
    await ensurePartsTable(sql);
    await ensurePropertyColumns(sql);
    const body = (await request.json().catch(function () {
      return {};
    })) as JsonRecord;

    const table = cleanTable(body.table);
    const record =
      body.record && typeof body.record === "object"
        ? (body.record as JsonRecord)
        : {};
    const propertyId = asString(record.propertyId) || "2000";
    if (!(await authorizeAtlasRequest(sql, request, propertyId, "edit"))) {
      return NextResponse.json(
        {
          ok: false,
          error: "You do not have permission to edit this property.",
        },
        { status: 403 },
      );
    }

    await recordChange(
      sql,
      request.headers.get("x-atlas-user-email") || "Atlas user",
      "save",
      table || asString(body.table),
      asString(record.id),
      record,
    );

    if (!table) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported table: " + asString(body.table),
        },
        { status: 400 },
      );
    }

    if (table === "locations") {
      const id = getId(record, "location");

      await sql`
        INSERT INTO atlas_locations (
          id,
          name,
          type,
          zone,
          notes,
          sort_order,
          property_id
        )
        VALUES (
          ${id},
          ${asString(record.name) || "Untitled Location"},
          ${asString(record.type) || "General"},
          ${asString(record.zone)},
          ${asString(record.notes)},
          ${Number(record.sort_order || 0)},
          ${propertyId}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          zone = EXCLUDED.zone,
          notes = EXCLUDED.notes,
          sort_order = EXCLUDED.sort_order,
          property_id = EXCLUDED.property_id
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "contacts") {
      await ensureContactsTable(sql);
      const id = getId(record, "contact");
      const name = asString(record.name) || "Unnamed Contact";
      await sql`
        INSERT INTO atlas_contacts (id, name, record, updated_at, property_id)
        VALUES (${id}, ${name}, ${JSON.stringify({
          ...record,
          id,
          name,
        })}::jsonb, NOW(), ${propertyId})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          record = EXCLUDED.record,
          updated_at = NOW(),
          property_id = EXCLUDED.property_id
      `;
      return NextResponse.json({ ok: true, id });
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
          updated_at,
          property_id
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
          NOW(),
          ${propertyId}
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
          updated_at = NOW(),
          property_id = EXCLUDED.property_id
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "assets") {
      await ensureAssetColumns(sql);
      const id = getId(record, "asset");

      await sql`
        INSERT INTO atlas_assets (
          id
