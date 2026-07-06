import { NextRequest, NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const MAIN_EMAIL = "nthornton87@yahoo.com";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type AnyRow = Record<string, any>;

type AtlasTable =
  | "vendors"
  | "assets"
  | "procedures"
  | "work_orders"
  | "calendar"
  | "asset_photos";

const ALLOWED_TABLES: AtlasTable[] = [
  "vendors",
  "assets",
  "procedures",
  "work_orders",
  "calendar",
  "asset_photos",
];

const FALLBACK_TABLES: Record<AtlasTable, string[]> = {
  vendors: ["vendors"],
  assets: ["assets"],
  procedures: ["procedures"],
  work_orders: ["work_orders", "workorders", "service_records", "services"],
  calendar: ["calendar", "calendar_items"],
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
  "indoor-pool": "Indoor Pool",
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

function status(value: unknown) {
  const clean = text(value, "Monitor");
  if (clean === "Online" || clean === "Offline" || clean === "Seasonal" || clean === "Monitor") return clean;
  return "Monitor";
}

function serviceStatus(value: unknown) {
  const clean = text(value, "Open");
  if (clean === "Open" || clean === "Scheduled" || clean === "Completed" || clean === "Monitor") return clean;
  return "Open";
}

function priority(value: unknown) {
  const clean = text(value, "Normal");
  if (clean === "High" || clean === "Normal" || clean === "Seasonal") return clean;
  return "Normal";
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
  const savedFrontendId = text(row.locationId);
  if (savedFrontendId && LOCATION_NAME_BY_ID[savedFrontendId]) return savedFrontendId;

  const locationName = text(row.location_name).trim().toLowerCase();
  if (locationName && LOCATION_ID_BY_NAME[locationName]) return LOCATION_ID_BY_NAME[locationName];

  return "general";
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

async function getTargetUserId() {
  const assetsTable = await resolveTable("assets");

  if (assetsTable) {
    const assetColumns = await getColumns(assetsTable);

    if (assetColumns.has("userId")) {
      const assetUserRows = await queryRows<{ userId: string }>(
        `
          SELECT "userId"
          FROM ${quoteIdentifier(assetsTable)}
          WHERE "userId" IS NOT NULL
          GROUP BY "userId"
          ORDER BY COUNT(*) DESC
          LIMIT 1
        `
      );

      if (assetUserRows[0]?.userId) return String(assetUserRows[0].userId);
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

  const frontendId = text(frontendLocationId, "general");
  const locationName = LOCATION_NAME_BY_ID[frontendId] || "General";
  const columns = await getColumns("locations");

  if (columns.has("userId")) {
    const existing = await queryRows<{ id: any }>(
      `
        SELECT id
        FROM locations
        WHERE "userId" = $1
          AND lower(trim(name)) = lower(trim($2))
        LIMIT 1
      `,
      [userId, locationName]
    );

    if (existing[0]?.id !== undefined && existing[0]?.id !== null) return existing[0].id;

    const created = await queryRows<{ id: any }>(
      `
        INSERT INTO locations ("userId", name)
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
  const hasUserId = columns.has("userId");
  const hasOrderColumn = columns.has(orderColumn);
  const orderBy = hasOrderColumn ? `ORDER BY lower(${quoteIdentifier(orderColumn)}::text)` : `ORDER BY id`;

  if (hasUserId) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE "userId" = $1 OR "userId" IS NULL
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
  const hasUserId = columns.has("userId");
  const hasDate = columns.has("date");
  const hasTitle = columns.has("title");

  const orderBy =
    hasDate && hasTitle
      ? `ORDER BY date DESC NULLS LAST, lower(title::text)`
      : hasDate
      ? `ORDER BY date DESC NULLS LAST`
      : hasTitle
      ? `ORDER BY lower(title::text)`
      : `ORDER BY id`;

  if (hasUserId) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE "userId" = $1 OR "userId" IS NULL
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
  const hasUserId = columns.has("userId");

  if (hasUserId) {
    return queryRows(
      `
        SELECT *
        FROM ${quoteIdentifier(actualTable)}
        WHERE "userId" = $1
        ORDER BY lower(name::text)
      `,
      [userId]
    );
  }

  return queryRows(
    `
      SELECT *
      FROM ${quoteIdentifier(actualTable)}
      ORDER BY lower(name::text)
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
    status: status(row.status),
    make: text(row.make),
    model: text(row.model),
    serial: text(row.serial),
    notes: text(row.notes, "No notes added yet."),
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
    date: text(row.date, new Date().toISOString().slice(0, 10)),
    title: text(row.title, "Untitled Work Order"),
    status: serviceStatus(row.status),
    notes: text(row.notes, "No notes added yet."),
    followUpDate: text(row.followUpDate || row.follow_up_date),
    photos: arr(row.photos),
    documents: arr(row.documents),
  };
}

function mapCalendar(row: AnyRow) {
  return {
    id: normalizeId(row.id, "calendar"),
    date: text(row.date, new Date().toISOString().slice(0, 10)),
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

  function set(column: string, value: unknown) {
    if (columns.has(column)) payload[column] = value;
  }

  set("id", normalizeId(record.id, table.replace("_", "-")));
  set("userId", userId);

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
    const locationDbId = await getOrCreateLocationId(userId, record.locationId);

    set("name", text(record.name, "Unnamed Asset"));
    set("location_id", locationDbId);
    set("locationId", text(record.locationId, "general"));
    set("category", text(record.category, "General"));
    set("status", status(record.status));
    set("make", text(record.make));
    set("model", text(record.model));
    set("serial", text(record.serial));
    set("notes", text(record.notes, "No notes added yet."));
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
    set("asset_id", text(record.assetId));
    set("assetId", text(record.assetId));
    set("vendor_id", text(record.vendorId));
    set("vendorId", text(record.vendorId));
    set("procedure_id", text(record.procedureId));
    set("procedureId", text(record.procedureId));
    set("date", text(record.date, new Date().toISOString().slice(0, 10)));
    set("title", text(record.title, "Untitled Work Order"));
    set("status", serviceStatus(record.status));
    set("notes", text(record.notes, "No notes added yet."));
    set("follow_up_date", text(record.followUpDate));
    set("followUpDate", text(record.followUpDate));
    set("photos", JSON.stringify(arr(record.photos)));
    set("documents", JSON.stringify(arr(record.documents)));
  }

  if (table === "calendar") {
    set("date", text(record.date, new Date().toISOString().slice(0, 10)));
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

  if (columns.has("userId")) {
    await queryRows(
      `
        DELETE FROM ${quoteIdentifier(actualTable)}
        WHERE id = $1
          AND "userId" = $2
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
    const calendarRows = await queryTable("calendar", userId, "date");
    const photoRows = await queryTable("asset_photos", userId, "id");

    return jsonResponse({
      ok: true,
      source: "neon",
      userId,
      vendorRecords: vendorRows.map(mapVendor),
      assetRecords: assetRows.map(mapAsset),
      procedureRecords: procedureRows.map(mapProcedure),
      serviceRecords: serviceRows.map(mapWorkOrder),
      calendarItems: calendarRows.map(mapCalendar),
      photos: photoRows.map(mapPhoto),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
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
      return jsonResponse({ ok: false, error: "Invalid Atlas save request" }, 400);
    }

    const userId = await getTargetUserId();
    const saved = await upsertRecord(table, record, userId);

    return jsonResponse({
      ok: true,
      source: "neon",
      table,
      record: saved,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
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
      return jsonResponse({ ok: false, error: "Invalid Atlas delete request" }, 400);
    }

    const userId = await getTargetUserId();
    await deleteRecord(table, id, userId);

    return jsonResponse({
      ok: true,
      source: "neon",
      table,
      id,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        source: "neon",
        error: error instanceof Error ? error.message : "Atlas API delete failed",
      },
      500
    );
  }
}
