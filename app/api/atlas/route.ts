import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function atlasJson(
  body: JsonRecord,
  status = 200,
  requestId = "",
) {
  return NextResponse.json(
    {
      ...body,
      requestId: requestId || undefined,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Atlas-API": "atlas-core-save-engine-1",
        ...(requestId ? { "X-Atlas-Request-Id": requestId } : {}),
      },
    },
  );
}

function requestIdFor(request: NextRequest) {
  return (
    request.headers.get("x-atlas-request-id") ||
    `atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

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
  | "asset_photos"
  | "projects"
  | "tasks"
  | "vehicle_care"
  | "day_sessions";

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
  if (table === "projects") return "projects";
  if (table === "tasks") return "tasks";
  if (table === "vehicle_care") return "vehicle_care";
  if (table === "day_sessions") return "day_sessions";

  return "";
}

async function ensureAssetColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS year text`;
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS manufacturer text`;
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS serial_2 text`;
}

async function ensurePropertyColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS parent_id text`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS paint text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS bulbs text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS finishes text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS vendor_ids text[] NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_locations ADD COLUMN IF NOT EXISTS custom_details jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_assets ADD COLUMN IF NOT EXISTS location_ids text[] NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_documents ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_asset_photos ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_parts ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_vendors ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_contacts ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_procedures ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
}


type AtlasAccessContext = {
  email: string;
  role: string;
  accessProfiles: string[];
  restricted: boolean;
};

async function getAtlasAccessContext(sql: ReturnType<typeof neon>, request: NextRequest): Promise<AtlasAccessContext> {
  const email = (request.headers.get("x-atlas-user-email") || "").toLowerCase();
  const headerRole = String(request.headers.get("x-atlas-user-role") || "administrator").toLowerCase();
  if (!email || headerRole === "master" || headerRole === "administrator") {
    return { email, role: headerRole, accessProfiles: [], restricted: false };
  }
  const rows = await sql`SELECT role, active, access_profiles FROM atlas_team_access WHERE lower(email)=${email} LIMIT 1`;
  const row = rows[0] as Record<string, unknown> | undefined;
  const role = String(row?.role || headerRole).toLowerCase();
  const accessProfiles = Array.isArray(row?.access_profiles) ? (row!.access_profiles as unknown[]).map(String) : [];
  return { email, role, accessProfiles, restricted: Boolean(row && row.active !== false && accessProfiles.length && role !== "master" && role !== "administrator") };
}

function marineText(...values: unknown[]) {
  const text = values.map((value) => Array.isArray(value) ? value.join(" ") : String(value ?? "")).join(" ").toLowerCase();
  return ["dock & marine", "marine", "boat", "cobalt", "sea-doo", "seadoo", "watercraft", "pwc", "jet ski", "jetski", "dock lift", "boat lift", "sunstream", "trailer"].some((term) => text.includes(term));
}

function profileAllowsRecord(profiles: string[], record: JsonRecord) {
  if (!profiles.length) return true;
  if (profiles.includes("marine") && marineText(record.category, record.work_category, record.responsibility_area, record.name, record.title, record.notes, record.area, record.type)) return true;
  const text = Object.values(record).map(String).join(" ").toLowerCase();
  return profiles.some((profile) => text.includes(profile.replace("-", " ")));
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

  await sql`
    ALTER TABLE atlas_calendar_items
    ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'Calendar Event'
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


async function ensureProjectsTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_projects (
      id text PRIMARY KEY,
      property_id text NOT NULL DEFAULT '2000',
      title text NOT NULL,
      record jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS atlas_projects_property_idx ON atlas_projects(property_id)`;
}

async function ensureOperationalRecordsTable(sql: ReturnType<typeof neon>) {
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
  await sql`CREATE INDEX IF NOT EXISTS atlas_operational_records_property_idx ON atlas_operational_records(property_id, record_type)`;
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
    parentId: String(row.parent_id || ""),
    customDetails: asArray(row.custom_details).map((detail, index) => {
      const item = detail && typeof detail === "object" ? (detail as JsonRecord) : {};
      return {
        id: asString(item.id) || `detail-${index + 1}`,
        label: asString(item.label),
        value: asString(item.value),
      };
    }),
    vendorIds: asArray(row.vendor_ids).map(String),
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
    locationId: String(row.location_id || ""),
    locationIds: asStringArray(row.location_ids),
    category: String(row.category || ""),
    status: String(row.status || "Monitor"),
    make: row.make ? String(row.make) : "",
    model: row.model ? String(row.model) : "",
    year: row.year ? String(row.year) : "",
    manufacturer: row.manufacturer ? String(row.manufacturer) : "",
    serial: row.serial ? String(row.serial) : "",
    serial2: row.serial_2 ? String(row.serial_2) : "",
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
    eventType: String(row.event_type || "Calendar Event"),
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
    await ensureProjectsTable(sql);
    await ensureOperationalRecordsTable(sql);
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
      SELECT id, name, type, zone, notes, parent_id, custom_details, vendor_ids, sort_order
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
      SELECT id, name, location_id, location_ids, category, status, make, model, year, manufacturer, serial, serial_2, notes, vendor_ids, documents
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
        event_type,
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

    const projectRows = (await sql`
      SELECT record
      FROM atlas_projects
      WHERE property_id = ${propertyId}
      ORDER BY lower(title) ASC
    `) as unknown as JsonRecord[];

    const operationalRows = (await sql`
      SELECT record_type, record
      FROM atlas_operational_records
      WHERE property_id = ${propertyId}
      ORDER BY updated_at DESC
    `) as unknown as JsonRecord[];

    const access = await getAtlasAccessContext(sql, request);
    const mappedAssets = assetRows.map(mapAsset);
    const allowedAssets = access.restricted
      ? mappedAssets.filter((asset) => profileAllowsRecord(access.accessProfiles, asset as unknown as JsonRecord))
      : mappedAssets;
    const allowedAssetIds = new Set(allowedAssets.map((asset) => asset.id));

    const mappedWorkOrders = workOrderRows.map(mapWorkOrder);
    const allowedWorkOrders = access.restricted
      ? mappedWorkOrders.filter((work) =>
          allowedAssetIds.has(work.assetId) ||
          profileAllowsRecord(access.accessProfiles, work as unknown as JsonRecord) ||
          Boolean(access.email && String(work.assignedTo || "").toLowerCase() === access.email)
        )
      : mappedWorkOrders;

    const allowedVendorIds = new Set<string>();
    for (const asset of allowedAssets) for (const id of asset.vendorIds) allowedVendorIds.add(id);
    for (const work of allowedWorkOrders) if (work.vendorId) allowedVendorIds.add(work.vendorId);
    const mappedVendors = vendorRows.map(mapVendor);
    const allowedVendors = access.restricted
      ? mappedVendors.filter((vendor) => allowedVendorIds.has(vendor.id) || profileAllowsRecord(access.accessProfiles, vendor as unknown as JsonRecord))
      : mappedVendors;

    const allowedProcedureRows = access.restricted
      ? procedureRows.filter((row) => profileAllowsRecord(access.accessProfiles, row) || asStringArray(row.linked_asset_ids).some((id) => allowedAssetIds.has(id)))
      : procedureRows;
    const allowedDocumentRows = access.restricted
      ? documentRows.filter((row) => allowedAssetIds.has(String(row.linked_asset_id || "")) || profileAllowsRecord(access.accessProfiles, row))
      : documentRows;
    const allowedPhotoRows = access.restricted
      ? photoRows.filter((row) => allowedAssetIds.has(String(row.asset_id || "")))
      : photoRows;
    const allowedPartRows = access.restricted
      ? partRows.filter((row) => allowedAssetIds.has(String(row.asset_id || "")) || allowedVendorIds.has(String(row.vendor_id || "")) || profileAllowsRecord(access.accessProfiles, row))
      : partRows;
    const allowedCalendarRows = access.restricted
      ? calendarRows.filter((row) => allowedAssetIds.has(String(row.linked_id || "")) || profileAllowsRecord(access.accessProfiles, row))
      : calendarRows;
    const allowedOperationalRows = access.restricted
      ? operationalRows.filter((row) => profileAllowsRecord(access.accessProfiles, (row.record || {}) as JsonRecord))
      : operationalRows;
    const operationalRecords = (recordType: string) => allowedOperationalRows.filter((row) => String(row.record_type) === recordType).map((row) => row.record || {});

    return NextResponse.json({
      ok: true,
      source: "neon",
      propertyId,
      accessProfiles: access.accessProfiles,
      locations: locationRows.map(mapLocation),
      vendorRecords: allowedVendors,
      contactRecords: access.restricted ? [] : contactRows.map((row) => row.record || {}),
      assetRecords: allowedAssets,
      procedureRecords: allowedProcedureRows.map(mapProcedure),
      serviceRecords: allowedWorkOrders,
      calendarItems: allowedCalendarRows.map(mapCalendarItem),
      documents: allowedDocumentRows.map(mapDocument),
      photos: allowedPhotoRows.map(mapPhoto),
      partRecords: allowedPartRows.map(mapPart),
      projects: projectRows.map((row) => row.record || {}),
      projectRecords: projectRows.map((row) => row.record || {}),
      tasks: operationalRecords("tasks"),
      taskRecords: operationalRecords("tasks"),
      vehicleCare: operationalRecords("vehicle_care"),
      vehicleCareRecords: operationalRecords("vehicle_care"),
      daySessions: operationalRecords("day_sessions"),
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
  const requestId = requestIdFor(request);

  if (request.headers.get("x-atlas-user-role") === "viewer") {
    return atlasJson(
      { ok: false, error: "Viewer access is read-only." },
      403,
      requestId,
    );
  }

  try {
    const sql = getSql();
    await ensurePartsTable(sql);
    await ensureProjectsTable(sql);
    await ensureOperationalRecordsTable(sql);
    await ensurePropertyColumns(sql);

    let body: JsonRecord;
    try {
      const parsed = await request.json();
      body =
        parsed && typeof parsed === "object"
          ? (parsed as JsonRecord)
          : {};
    } catch {
      return atlasJson(
        { ok: false, error: "Atlas received invalid JSON." },
        400,
        requestId,
      );
    }

    const action = asString(body.action);

    if (action === "repair6855Calendar") {
      const sourcePropertyId = "6855";
      const destinationPropertyId = "2000";

      if (!(await authorizeAtlasRequest(sql, request, sourcePropertyId, "edit"))) {
        return NextResponse.json(
          { ok: false, error: "You do not have permission to repair this property." },
          { status: 403 },
        );
      }

      if (!(await authorizeAtlasRequest(sql, request, destinationPropertyId, "edit"))) {
        return NextResponse.json(
          { ok: false, error: "You do not have permission to restore the 2000 calendar." },
          { status: 403 },
        );
      }

      await sql`
        CREATE TABLE IF NOT EXISTS atlas_data_repairs (
          id text PRIMARY KEY,
          completed_at timestamptz NOT NULL DEFAULT NOW()
        )
      `;

      const completed = (await sql`
        SELECT id
        FROM atlas_data_repairs
        WHERE id = 'repair-6855-calendar-to-2000-v1'
        LIMIT 1
      `) as unknown as JsonRecord[];

      if (completed.length) {
        return NextResponse.json({ ok: true, moved: 0, alreadyCompleted: true });
      }

      const movedRows = (await sql`
        UPDATE atlas_calendar_items
        SET property_id = ${destinationPropertyId}, updated_at = NOW()
        WHERE property_id = ${sourcePropertyId}
        RETURNING id
      `) as unknown as JsonRecord[];

      await sql`
        INSERT INTO atlas_data_repairs (id, completed_at)
        VALUES ('repair-6855-calendar-to-2000-v1', NOW())
        ON CONFLICT (id) DO NOTHING
      `;

      return NextResponse.json({
        ok: true,
        moved: movedRows.length,
        alreadyCompleted: false,
      });
    }

    const table = cleanTable(body.table);
    if (!table) {
      return atlasJson(
        {
          ok: false,
          error: "Unsupported table: " + asString(body.table),
        },
        400,
        requestId,
      );
    }

    const record =
      body.record && typeof body.record === "object"
        ? (body.record as JsonRecord)
        : {};

    if (!Object.keys(record).length) {
      return atlasJson(
        { ok: false, error: "Atlas save record is required." },
        400,
        requestId,
      );
    }

    const propertyId =
      asString(record.propertyId) ||
      asString(body.propertyId) ||
      "2000";

    if (!(await authorizeAtlasRequest(sql, request, propertyId, "edit"))) {
      return NextResponse.json(
        {
          ok: false,
          error: "You do not have permission to edit this property.",
        },
        { status: 403 },
      );
    }

    const access = await getAtlasAccessContext(sql, request);
    if (access.restricted && ["assets", "vendors", "procedures", "work_orders", "parts", "documents", "asset_photos", "tasks", "vehicle_care", "day_sessions"].includes(table)) {
      let allowed = profileAllowsRecord(access.accessProfiles, record);
      if (!allowed && asString(record.assetId)) {
        const assetRows = await sql`SELECT id, name, category, notes FROM atlas_assets WHERE id=${asString(record.assetId)} AND property_id=${propertyId} LIMIT 1`;
        allowed = Boolean(assetRows[0] && profileAllowsRecord(access.accessProfiles, assetRows[0] as JsonRecord));
      }
      if (!allowed && table === "work_orders" && access.email) {
        allowed = asString(record.assignedTo).toLowerCase() === access.email;
      }
      if (!allowed) return NextResponse.json({ ok:false, error:"This record is outside your assigned access profile." }, { status:403 });
    }

    await recordChange(
      sql,
      request.headers.get("x-atlas-user-email") || "Atlas user",
      "save",
      table || asString(body.table),
      asString(record.id),
      record,
    );

    if (table === "locations") {
      const id = getId(record, "location");

      await sql`
        INSERT INTO atlas_locations (
          id,
          name,
          type,
          zone,
          notes,
          parent_id,
          paint,
          bulbs,
          finishes,
          custom_details,
          vendor_ids,
          sort_order,
          property_id
        )
        VALUES (
          ${id},
          ${asString(record.name) || "Untitled Location"},
          ${asString(record.type) || "General"},
          ${asString(record.zone)},
          ${asString(record.notes)},
          ${asString(record.parentId)},
          ${asString(record.paint)},
          ${asString(record.bulbs)},
          ${asString(record.finishes)},
          ${jsonArray(record.customDetails)}::jsonb,
          ${asStringArray(record.vendorIds)},
          ${Number(record.sort_order || 0)},
          ${propertyId}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          zone = EXCLUDED.zone,
          notes = EXCLUDED.notes,
          parent_id = EXCLUDED.parent_id,
          paint = EXCLUDED.paint,
          bulbs = EXCLUDED.bulbs,
          finishes = EXCLUDED.finishes,
          custom_details = EXCLUDED.custom_details,
          vendor_ids = EXCLUDED.vendor_ids,
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
          id,
          name,
          location_id,
          location_ids,
          category,
          status,
          make,
          model,
          year,
          manufacturer,
          serial,
          serial_2,
          notes,
          vendor_ids,
          documents,
          updated_at,
          property_id
        )
        VALUES (
          ${id},
          ${asString(record.name) || "Untitled Asset"},
          ${asString(record.locationId) || asStringArray(record.locationIds)[0] || ""},
          ${asStringArray(record.locationIds).filter(Boolean)},
          ${asString(record.category) || "General"},
          ${asStatus(record.status, "Monitor")},
          ${nullableString(record.make)},
          ${nullableString(record.model)},
          ${nullableString(record.year)},
          ${nullableString(record.manufacturer)},
          ${nullableString(record.serial)},
          ${nullableString(record.serial2)},
          ${asString(record.notes)},
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.vendorIds)}::jsonb
            )
          ),
          ${jsonArray(record.documents)}::jsonb,
          NOW(),
          ${propertyId}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          location_id = EXCLUDED.location_id,
          location_ids = EXCLUDED.location_ids,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          manufacturer = EXCLUDED.manufacturer,
          serial = EXCLUDED.serial,
          serial_2 = EXCLUDED.serial_2,
          notes = EXCLUDED.notes,
          vendor_ids = EXCLUDED.vendor_ids,
          documents = EXCLUDED.documents,
          updated_at = NOW(),
          property_id = EXCLUDED.property_id
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "procedures") {
      await ensureProcedureColumns(sql);
      const id = getId(record, "procedure");

      await sql`
        INSERT INTO atlas_procedures (
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
          updated_at,
          property_id
        )
        VALUES (
          ${id},
          ${asString(record.title) || "Untitled Procedure"},
          ${asString(record.area) || "General"},
          ${nullableString(record.category)},
          ${asStatus(record.priority, "Normal")},
          ${asStatus(record.status, "Draft")},
          ${nullableString(record.purpose)},
          ${nullableString(record.safetyNotes)},
          ${nullableString(record.toolsParts)},
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.requiredTools)}::jsonb
            )
          ),
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.requiredParts)}::jsonb
            )
          ),
          ${nullableString(record.estimatedTime)},
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.steps)}::jsonb
            )
          ),
          ${jsonArray(record.checklist)}::jsonb,
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.linkedAssetIds)}::jsonb
            )
          ),
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.linkedLocationIds)}::jsonb
            )
          ),
          ARRAY(
            SELECT jsonb_array_elements_text(
              ${jsonArray(record.linkedVendorIds)}::jsonb
            )
          ),
          ${jsonArray(record.photos)}::jsonb,
          ${jsonArray(record.documents)}::jsonb,
          NOW(),
          ${propertyId}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          category = EXCLUDED.category,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          purpose = EXCLUDED.purpose,
          safety_notes = EXCLUDED.safety_notes,
          tools_parts = EXCLUDED.tools_parts,
          required_tools = EXCLUDED.required_tools,
          required_parts = EXCLUDED.required_parts,
          estimated_time = EXCLUDED.estimated_time,
          steps = EXCLUDED.steps,
          checklist = EXCLUDED.checklist,
          linked_asset_ids = EXCLUDED.linked_asset_ids,
          linked_location_ids = EXCLUDED.linked_location_ids,
          linked_vendor_ids = EXCLUDED.linked_vendor_ids,
          photos = EXCLUDED.photos,
          documents = EXCLUDED.documents,
          updated_at = NOW(),
          property_id = EXCLUDED.property_id
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "work_orders") {
      await ensureWorkOrderColumns(sql);
      const id = getId(record, "work-order");

      const savedDate = asDate(record.date);
      const savedFollowUpDate = asDate(record.followUpDate);
      const savedRecurrenceEndDate = asDate(record.recurrenceEndDate);
      const savedLastCompletedDate = asDate(record.lastCompletedDate);

      const updatedRows = (await sql`
        UPDATE atlas_work_orders
        SET
          asset_id = ${nullableString(record.assetId)},
          vendor_id = ${nullableString(record.vendorId)},
          procedure_id = ${nullableString(record.procedureId)},
          location_id = ${nullableString(record.locationId)},
          due_date_value = ${savedDate}::date,
          due_date_initialized = true,
          title = ${asString(record.title) || "Untitled Work Order"},
          status = ${asStatus(record.status, "Open")},
          priority = ${asStatus(record.priority, "Medium")},
          notes = ${asString(record.notes)},
          follow_up_date = ${savedFollowUpDate}::date,
          recurring = ${asBoolean(record.recurring)},
          recurrence_interval = ${asPositiveInteger(
            record.recurrenceInterval,
            1,
          )},
          recurrence_unit = ${asStatus(record.recurrenceUnit, "Weeks")},
          recurrence_end_date = ${savedRecurrenceEndDate}::date,
          season = ${asStatus(record.season, "Year-Round")},
          last_completed_date = ${savedLastCompletedDate}::date,
          completion_history = ${jsonArray(
            record.completionHistory,
          )}::jsonb,
          work_type = ${asStatus(record.workType, "Work Order")},
          work_category = ${asStatus(record.workCategory, "Maintenance")},
          effort = ${nullableString(record.effort)},
          responsibility_area = ${nullableString(record.responsibilityArea)},
          emoji = ${nullableString(record.emoji)},
          assigned_to = ${nullableString(record.assignedTo)},
          checklist = ${jsonArray(record.checklist)}::jsonb,
          notes_history = ${jsonArray(record.notesHistory)}::jsonb,
          service_history = ${jsonArray(record.serviceHistory)}::jsonb,
          estimated_cost = ${asMoney(record.estimatedCost)},
          actual_cost = ${asMoney(record.actualCost)},
          invoice_number = ${nullableString(record.invoiceNumber)},
          photos = ${jsonArray(record.photos)}::jsonb,
          documents = ${jsonArray(record.documents)}::jsonb,
          updated_at = NOW(),
          property_id = ${propertyId}
        WHERE id = ${id} AND property_id = ${propertyId}
        RETURNING id, due_date_value, due_date_initialized
      `) as unknown as JsonRecord[];

      if (!updatedRows.length) {
        await sql`
          INSERT INTO atlas_work_orders (
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
            documents,
            updated_at,
            property_id
          )
          VALUES (
            ${id},
            ${nullableString(record.assetId)},
            ${nullableString(record.vendorId)},
            ${nullableString(record.procedureId)},
            ${nullableString(record.locationId)},
            COALESCE(${savedDate}::date, CURRENT_DATE),
            ${savedDate}::date,
            true,
            ${asString(record.title) || "Untitled Work Order"},
            ${asStatus(record.status, "Open")},
            ${asStatus(record.priority, "Medium")},
            ${asString(record.notes)},
            ${savedFollowUpDate}::date,
            ${asBoolean(record.recurring)},
            ${asPositiveInteger(record.recurrenceInterval, 1)},
            ${asStatus(record.recurrenceUnit, "Weeks")},
            ${savedRecurrenceEndDate}::date,
            ${asStatus(record.season, "Year-Round")},
            ${savedLastCompletedDate}::date,
            ${jsonArray(record.completionHistory)}::jsonb,
            ${asStatus(record.workType, "Work Order")},
            ${asStatus(record.workCategory, "Maintenance")},
            ${nullableString(record.effort)},
            ${nullableString(record.responsibilityArea)},
            ${nullableString(record.emoji)},
            ${nullableString(record.assignedTo)},
            ${jsonArray(record.checklist)}::jsonb,
            ${jsonArray(record.notesHistory)}::jsonb,
            ${jsonArray(record.serviceHistory)}::jsonb,
            ${asMoney(record.estimatedCost)},
            ${asMoney(record.actualCost)},
            ${nullableString(record.invoiceNumber)},
            ${jsonArray(record.photos)}::jsonb,
            ${jsonArray(record.documents)}::jsonb,
            NOW(),
            ${propertyId}
          )
        `;
      }

      const verifiedRows = (await sql`
        SELECT id, date, due_date_value, due_date_initialized
        FROM atlas_work_orders
        WHERE id = ${id} AND property_id = ${propertyId}
        LIMIT 1
      `) as unknown as JsonRecord[];

      const verified = verifiedRows[0];
      const verifiedDate = databaseDateKey(
        verified?.due_date_initialized
          ? verified?.due_date_value
          : verified?.date,
      );

      if (verifiedDate !== (savedDate || "")) {
        throw new Error(
          `Work order save verification failed. Expected date "${
            savedDate || ""
          }" but database returned "${verifiedDate}".`,
        );
      }

      return NextResponse.json({
        ok: true,
        id,
        savedDate: verifiedDate,
      });
    }

    if (table === "projects") {
      await ensureProjectsTable(sql);
      const id = getId(record, "project");
      const title = asString(record.title) || "New Project";
      const savedRecord = { ...record, id, title, propertyId };

      await sql`
        INSERT INTO atlas_projects (id, property_id, title, record, updated_at)
        VALUES (${id}, ${propertyId}, ${title}, ${JSON.stringify(savedRecord)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          property_id = EXCLUDED.property_id,
          title = EXCLUDED.title,
          record = EXCLUDED.record,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "tasks" || table === "vehicle_care" || table === "day_sessions") {
      await ensureOperationalRecordsTable(sql);
      const id = getId(record, table === "tasks" ? "task" : table === "vehicle_care" ? "vehicle" : "day-session");
      const savedRecord = { ...record, id, propertyId, updatedAt: new Date().toISOString() };

      await sql`
        INSERT INTO atlas_operational_records (record_type, id, property_id, record, updated_at)
        VALUES (${table}, ${id}, ${propertyId}, ${JSON.stringify(savedRecord)}::jsonb, NOW())
        ON CONFLICT (record_type, id) DO UPDATE SET
          property_id = EXCLUDED.property_id,
          record = EXCLUDED.record,
          updated_at = NOW()
      `;

      return NextResponse.json({ ok: true, id });
    }

    if (table === "calendar") {
      await ensureCalendarColumns(sql);
      const id = getId(record, "calendar");
      const savedDate = asDate(record.date);

      if (!savedDate) {
        return NextResponse.json(
          { ok: false, error: "Calendar date is required." },
          { status: 400 },
        );
      }

      const existingRows = (await sql`
        SELECT property_id
        FROM atlas_calendar_items
        WHERE id = ${id}
        LIMIT 1
      `) as unknown as JsonRecord[];

      const existingPropertyId = existingRows[0]
        ? String(existingRows[0].property_id || "")
        : "";

      if (existingPropertyId && existingPropertyId !== propertyId) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Calendar record belongs to property " +
              existingPropertyId +
              " and cannot be moved to property " +
              propertyId +
              ".",
          },
          { status: 409 },
        );
      }

      const savedRows = (await sql`
        INSERT INTO atlas_calendar_items (
          id, item_date, date, time, title, area, category_label, color_id,
          color_name, all_day, repeat, reminder, notes, linked_type, linked_id,
          linked_name, completed, source, original_id, instance_id, event_type,
          status, updated_at, property_id
        )
        VALUES (
          ${id}, ${savedDate}::date, ${savedDate}::date,
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
          ${asStatus(record.eventType, "Calendar Event")},
          ${asStatus(
            record.status,
            asBoolean(record.completed) ? "Completed" : "Scheduled",
          )},
          NOW(),
          ${propertyId}
        )
        ON CONFLICT (id) DO UPDATE SET
          item_date = EXCLUDED.item_date,
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
          event_type = EXCLUDED.event_type,
          status = EXCLUDED.status,
          updated_at = NOW()
        WHERE atlas_calendar_items.property_id = EXCLUDED.property_id
        RETURNING id, property_id, item_date, event_type
      `) as unknown as JsonRecord[];

      if (!savedRows.length) {
        return NextResponse.json(
          { ok: false, error: "Calendar save was blocked by property isolation." },
          { status: 409 },
        );
      }

      const verified = savedRows[0];
      const verifiedDate = databaseDateKey(verified.item_date);
      const verifiedPropertyId = String(verified.property_id || "");

      if (verifiedPropertyId !== propertyId || verifiedDate !== savedDate) {
        throw new Error(
          "Calendar save verification failed for " + id + ".",
        );
      }

      return NextResponse.json({
        ok: true,
        id,
        propertyId: verifiedPropertyId,
        savedDate: verifiedDate,
        eventType: String(verified.event_type || "Calendar Event"),
      });
    }

    if (table === "parts") {
      await ensurePartsTable(sql);
      const id = getId(record, "part");
      const quantity = Math.max(0, Math.floor(Number(record.quantity) || 0));
      const minQuantity = Math.max(
        0,
        Math.floor(Number(record.minQuantity) || 0),
      );
      const automaticStatus =
        quantity <= 0 ? "Out" : quantity <= minQuantity ? "Low" : "In Stock";

      await sql`
        INSERT INTO atlas_parts (
          id, name, category, location_id, asset_id, vendor_id,
          quantity, min_quantity, status, notes, updated_at, property_id
        ) VALUES (
          ${id},
          ${asString(record.name) || "Untitled Part"},
          ${asString(record.category) || "General"},
          ${nullableString(record.locationId)},
          ${nullableString(record.assetId)},
          ${nullableString(record.vendorId)},
          ${quantity},
          ${minQuantity},
          ${asStatus(record.status, automaticStatus)},
          ${asString(record.notes)},
          NOW(),
          ${propertyId}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          location_id = EXCLUDED.location_id,
          asset_id = EXCLUDED.asset_id,
          vendor_id = EXCLUDED.vendor_id,
          quantity = EXCLUDED.quantity,
          min_quantity = EXCLUDED.min_quantity,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = NOW(),
          property_id = EXCLUDED.property_id
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
          updated_at,
          property_id
        )
        VALUES (
          ${id},
          ${asString(record.title) || "Untitled Document"},
          ${asString(record.area) || "General"},
          ${asString(record.type) || "Document"},
          ${nullableString(record.linkedAssetId)},
          ${asString(record.notes)},
          NOW(),
          ${propertyId}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          type = EXCLUDED.type,
          linked_asset_id = EXCLUDED.linked_asset_id,
          notes = EXCLUDED.notes,
          updated_at = NOW(),
          property_id = EXCLUDED.property_id
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
          created_at,
          property_id
        )
        VALUES (
          ${id},
          ${asString(record.assetId) || "general"},
          ${asString(record.name) || "Photo"},
          ${asString(record.dataUrl)},
          COALESCE(
            ${nullableString(record.createdAt)}::timestamptz,
            NOW()
          ),
          ${propertyId}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          asset_id = EXCLUDED.asset_id,
          name = EXCLUDED.name,
          data_url = COALESCE(NULLIF(EXCLUDED.data_url, ''), atlas_asset_photos.data_url),
          property_id = EXCLUDED.property_id
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
    console.error("[Atlas POST error]", error);

    return atlasJson(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Atlas database save error",
      },
      500,
      requestId,
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = requestIdFor(request);

  try {
    const sql = getSql();

    await ensureContactsTable(sql);
    await ensurePartsTable(sql);
    await ensureProjectsTable(sql);
    await ensureOperationalRecordsTable(sql);
    await ensurePropertyColumns(sql);

    let body: JsonRecord;
    try {
      const parsed = await request.json();
      body =
        parsed && typeof parsed === "object"
          ? (parsed as JsonRecord)
          : {};
    } catch {
      return atlasJson(
        { ok: false, error: "Atlas received invalid JSON." },
        400,
        requestId,
      );
    }

    const table = cleanTable(body.table);
    const id = asString(body.id);
    const propertyId = asString(body.propertyId) || "2000";

    if (!table) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported table: " + asString(body.table),
        },
        { status: 400 },
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Record id is required.",
        },
        { status: 400 },
      );
    }

    if (!(await authorizeAtlasRequest(sql, request, propertyId, "delete"))) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You do not have permission to delete records for this property.",
        },
        { status: 403 },
      );
    }

    let deletedRows: JsonRecord[] = [];

    if (table === "locations") {
      const locationRows = (await sql`
        SELECT id, name
        FROM atlas_locations
        WHERE id = ${id} AND property_id = ${propertyId}
        LIMIT 1
      `) as unknown as JsonRecord[];

      if (!locationRows.length) {
        return NextResponse.json(
          { ok: false, error: "Location was not found." },
          { status: 404 },
        );
      }

      const locationName = asString(locationRows[0].name).trim();
      if (locationName.toLowerCase() === "2000") {
        return NextResponse.json(
          { ok: false, error: "2000 is the top-level property and cannot be deleted." },
          { status: 409 },
        );
      }

      const dockRows = (await sql`
        SELECT id
        FROM atlas_locations
        WHERE property_id = ${propertyId}
          AND LOWER(TRIM(name)) = 'dock'
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      `) as unknown as JsonRecord[];
      const dockId = dockRows.length ? asString(dockRows[0].id) : "";

      const matchingAssets = (await sql`
        SELECT id
        FROM atlas_assets
        WHERE property_id = ${propertyId}
          AND LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g')) =
              LOWER(REGEXP_REPLACE(TRIM(${locationName}), '\s+', ' ', 'g'))
      `) as unknown as JsonRecord[];
      const matchingAssetIds = matchingAssets.map((row) => asString(row.id)).filter(Boolean);

      if (matchingAssetIds.length && !dockId) {
        return NextResponse.json(
          { ok: false, error: "Create or restore the Dock location before deleting this false asset location." },
          { status: 409 },
        );
      }

      if (matchingAssetIds.length && dockId) {
        await sql`
          UPDATE atlas_assets
          SET location_id = ${dockId}, location_ids = ARRAY[${dockId}]::text[], updated_at = NOW()
          WHERE property_id = ${propertyId}
            AND id = ANY(${matchingAssetIds}::text[])
        `;

        await sql`
          UPDATE atlas_work_orders
          SET location_id = NULL,
              asset_id = CASE
                WHEN asset_id IS NULL AND ${matchingAssetIds.length} = 1 THEN ${matchingAssetIds[0] || null}
                ELSE asset_id
              END,
              updated_at = NOW()
          WHERE property_id = ${propertyId}
            AND location_id = ${id}
            AND (
              asset_id IS NOT NULL
              OR ${matchingAssetIds.length} = 1
            )
        `;
      } else {
        await sql`
          UPDATE atlas_work_orders
          SET location_id = NULL, updated_at = NOW()
          WHERE property_id = ${propertyId}
            AND location_id = ${id}
            AND asset_id IS NOT NULL
        `;
      }

      const remainingWorkOrders = (await sql`
        SELECT COUNT(*)::int AS count
        FROM atlas_work_orders
        WHERE property_id = ${propertyId}
          AND location_id = ${id}
          AND asset_id IS NULL
      `) as unknown as JsonRecord[];
      const remainingAssets = (await sql`
        SELECT COUNT(*)::int AS count
        FROM atlas_assets
        WHERE property_id = ${propertyId}
          AND (
            location_id = ${id}
            OR ${id} = ANY(COALESCE(location_ids, ARRAY[]::text[]))
          )
      `) as unknown as JsonRecord[];
      const childLocations = (await sql`
        SELECT COUNT(*)::int AS count
        FROM atlas_locations
        WHERE property_id = ${propertyId} AND parent_id = ${id}
      `) as unknown as JsonRecord[];

      const directWorkOrderCount = Number(remainingWorkOrders[0]?.count || 0);
      const assetCount = Number(remainingAssets[0]?.count || 0);
      const childCount = Number(childLocations[0]?.count || 0);
      if (directWorkOrderCount || assetCount || childCount) {
        return NextResponse.json(
          {
            ok: false,
            error: `Location still has ${assetCount} asset(s), ${directWorkOrderCount} location-only work order(s), and ${childCount} sub-location(s). Reassign those before deleting.`,
          },
          { status: 409 },
        );
      }

      await sql`
        UPDATE atlas_parts
        SET location_id = NULL
        WHERE location_id = ${id}
          AND property_id = ${propertyId}
      `;

      deletedRows = (await sql`
        DELETE FROM atlas_locations
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "vendors") {
      await sql`
        UPDATE atlas_assets
        SET vendor_ids = array_remove(vendor_ids, ${id})
        WHERE property_id = ${propertyId}
          AND ${id} = ANY(COALESCE(vendor_ids, ARRAY[]::text[]))
      `;

      await sql`
        UPDATE atlas_work_orders
        SET vendor_id = NULL
        WHERE vendor_id = ${id}
          AND property_id = ${propertyId}
      `;

      await sql`
        UPDATE atlas_parts
        SET vendor_id = NULL
        WHERE vendor_id = ${id}
          AND property_id = ${propertyId}
      `;

      deletedRows = (await sql`
        DELETE FROM atlas_vendors
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "contacts") {
      deletedRows = (await sql`
        DELETE FROM atlas_contacts
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "assets") {
      let assetPropertyId = propertyId;

      let assetRows = (await sql`
        SELECT id, property_id
        FROM atlas_assets
        WHERE id = ${id}
          AND property_id = ${propertyId}
        LIMIT 2
      `) as unknown as JsonRecord[];

      // Older Atlas assets can carry a stale property_id from before strict
      // property isolation. If the active-property lookup misses, resolve the
      // single stored record and authorize that stored property before deletion.
      if (!assetRows.length) {
        const legacyRows = (await sql`
          SELECT id, property_id
          FROM atlas_assets
          WHERE id = ${id}
          LIMIT 2
        `) as unknown as JsonRecord[];

        if (legacyRows.length === 1) {
          const storedPropertyId = asString(legacyRows[0].property_id) || "2000";
          if (
            storedPropertyId !== propertyId &&
            (await authorizeAtlasRequest(
              sql,
              request,
              storedPropertyId,
              "delete",
            ))
          ) {
            assetPropertyId = storedPropertyId;
            assetRows = legacyRows;
          }
        }
      }

      if (assetRows.length === 1) {
        await sql`
          DELETE FROM atlas_asset_photos
          WHERE asset_id = ${id}
            AND property_id = ${assetPropertyId}
        `;

        await sql`
          UPDATE atlas_work_orders
          SET asset_id = NULL
          WHERE asset_id = ${id}
            AND property_id = ${assetPropertyId}
        `;

        await sql`
          UPDATE atlas_parts
          SET asset_id = NULL
          WHERE asset_id = ${id}
            AND property_id = ${assetPropertyId}
        `;

        await sql`
          UPDATE atlas_documents
          SET linked_asset_id = NULL
          WHERE linked_asset_id = ${id}
            AND property_id = ${assetPropertyId}
        `;

        deletedRows = (await sql`
          DELETE FROM atlas_assets
          WHERE id = ${id}
            AND property_id = ${assetPropertyId}
          RETURNING id, property_id
        `) as unknown as JsonRecord[];
      }
    } else if (table === "procedures") {
      await sql`
        UPDATE atlas_work_orders
        SET procedure_id = NULL
        WHERE procedure_id = ${id}
          AND property_id = ${propertyId}
      `;

      deletedRows = (await sql`
        DELETE FROM atlas_procedures
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "work_orders") {
      // Delete against the active property first. Older Atlas records may carry a
      // stale property_id from before strict property isolation was introduced,
      // so resolve the record's stored property only when the normal delete finds
      // nothing. Authorization is checked again for that stored property before
      // deleting, preserving property isolation while making legacy records
      // deletable from the work-order screen.
      deletedRows = (await sql`
        DELETE FROM atlas_work_orders
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id, property_id
      `) as unknown as JsonRecord[];

      if (!deletedRows.length) {
        const legacyRows = (await sql`
          SELECT id, property_id
          FROM atlas_work_orders
          WHERE id = ${id}
          LIMIT 2
        `) as unknown as JsonRecord[];

        if (legacyRows.length === 1) {
          const storedPropertyId = asString(legacyRows[0].property_id) || "2000";

          if (
            storedPropertyId !== propertyId &&
            (await authorizeAtlasRequest(
              sql,
              request,
              storedPropertyId,
              "delete",
            ))
          ) {
            deletedRows = (await sql`
              DELETE FROM atlas_work_orders
              WHERE id = ${id}
                AND property_id = ${storedPropertyId}
              RETURNING id, property_id
            `) as unknown as JsonRecord[];
          }
        }
      }
    } else if (table === "calendar") {
      deletedRows = (await sql`
        DELETE FROM atlas_calendar_items
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "parts") {
      deletedRows = (await sql`
        DELETE FROM atlas_parts
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "documents") {
      deletedRows = (await sql`
        DELETE FROM atlas_documents
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "asset_photos") {
      deletedRows = (await sql`
        DELETE FROM atlas_asset_photos
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "projects") {
      deletedRows = (await sql`
        DELETE FROM atlas_projects
        WHERE id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    } else if (table === "tasks" || table === "vehicle_care" || table === "day_sessions") {
      deletedRows = (await sql`
        DELETE FROM atlas_operational_records
        WHERE record_type = ${table}
          AND id = ${id}
          AND property_id = ${propertyId}
        RETURNING id
      `) as unknown as JsonRecord[];
    }

    if (!deletedRows.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Record was not found in property " +
            propertyId +
            " or has already been deleted.",
        },
        { status: 404 },
      );
    }

    await recordChange(
      sql,
      request.headers.get("x-atlas-user-email") || "Atlas user",
      "delete",
      table,
      id,
      {
        id,
        propertyId,
        table,
      },
    );

    return NextResponse.json({
      ok: true,
      id,
      table,
      propertyId,
    });
  } catch (error) {
    console.error("[Atlas DELETE error]", error);

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

export async function OPTIONS(request: NextRequest) {
  const requestId = requestIdFor(request);
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, DELETE, OPTIONS",
      "Cache-Control": "no-store, max-age=0",
      "X-Atlas-API": "atlas-core-save-engine-1",
      "X-Atlas-Request-Id": requestId,
    },
  });
}
