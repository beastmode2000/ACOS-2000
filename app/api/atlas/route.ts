import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const MAIN_EMAIL = "nthornton87@yahoo.com";
const sql = neon(process.env.DATABASE_URL || "");

type AnyRow = Record<string, any>;

type AtlasTable =
  | "vendors"
  | "assets"
  | "procedures"
  | "work_orders"
  | "calendar"
  | "asset_photos";

const LOCATION_ID_BY_NAME: Record<string, string> = {
  "general": "general",
  "2000": "general",
  "main house": "main-house",
  "mechanical room": "mechanical-room",
  "mechanical room 2": "mechanical-room",
  "formal dining room": "main-house",
  "wine room": "wine-room",
  "fitness room": "fitness-room",
  "kitchen": "kitchen",
  "pantry": "pantry",
  "pool": "indoor-pool",
  "indoor pool": "indoor-pool",
  "pool equipment room": "pool-equipment",
  "back patio (water side)": "standalone-spa",
  "upstairs laundry closet": "upstairs-laundry",
  "pool changing room": "pool-changing-room",
  "house managers office": "house-office",
  "house manager office": "house-office",
  "west side of house": "exterior",
  "attic": "main-house",
  "attic 2": "main-house",
  "outdoor condenser area": "exterior",
  "outdoor generator area": "lower-generator-area",
  "vegetable garden": "irrigation",
  "garage": "garage",
  "garage (new)": "garage",
  "garage (old)": "old-garage",
  "old garage": "old-garage",
  "roof": "roof-gutters",
  "hangar": "hangar",
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
  "elyses-room": "Elyse's Room",
  "elliot-room": "Elliot's Room",
  "play-room": "Play Room",
  "exercise-room": "Exercise Room",
  "gym-nanny": "Gym / Nanny",
  "master-bath-floor": "Master Bath Floor",
  "indoor-pool": "Indoor Pool",
  "pool-equipment": "Pool Equipment Room",
  "standalone-spa": "Standalone Spa",
  dock: "Dock",
  "cobalt-lift": "Cobalt Lift",
  "seadoo-lift": "SeaDoo Lift",
  "dock-lift": "Dock Lift Box",
  "water-trampoline": "Water Trampoline",
  lakefront: "Lakefront",
  garage: "Garage",
  "old-garage": "Old Garage",
  adu: "ADU",
  driveway: "Driveway",
  gate: "Gate",
  exterior: "Exterior",
  "roof-gutters": "Roof / Gutters",
  irrigation: "Irrigation",
  "lower-generator-area": "Lower Generator Area",
  basement: "Basement",
  "basement-stairs-trampoline": "Basement Stairs from Trampoline Area",
  "addition-first-floor": "Addition First Floor",
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

async function queryRows<T = AnyRow>(query: string, params: any[] = []) {
  return (await sql(query, params)) as T[];
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function parseArray<T = any>(value: unknown): T[] {
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

function cleanStatus(value: unknown) {
  const status = normalizeText(value, "Monitor");
  if (["Online", "Offline", "Seasonal", "Monitor"].includes(status)) return status;
  return "Monitor";
}

function cleanServiceStatus(value: unknown) {
  const status = normalizeText(value, "Open");
  if (["Open", "Scheduled", "Completed", "Monitor"].includes(status)) return status;
  return "Open";
}

function cleanPriority(value: unknown) {
  const priority = normalizeText(value, "Normal");
  if (["High", "Normal", "Seasonal"].includes(priority)) return priority;
  return "Normal";
}

function cleanLocationId(locationName: unknown, fallbackLocationId: unknown) {
  const nameKey = normalizeText(locationName).trim().toLowerCase();
  if (nameKey && LOCATION_ID_BY_NAME[nameKey]) return LOCATION_ID_BY_NAME[nameKey];

  const fallback = normalizeText(fallbackLocationId, "general");
  if (LOCATION_NAME_BY_ID[fallback]) return fallback;

  return "general";
}

function normalizeId(value: unknown, prefix: string) {
  const raw = normalizeText(value).trim();
  if (raw) return raw;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
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
  const assetUsers = await queryRows<{ userId: string }>(
    `
      SELECT "userId"
      FROM assets
      WHERE "userId" IS NOT NULL
      GROUP BY "userId"
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `
  );

  if (assetUsers[0]?.userId) return String(assetUsers[0].userId);

  const emailUsers = await queryRows<{ id: string }>(
    `
      SELECT id
      FROM "user"
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [MAIN_EMAIL]
  );

  if (emailUsers[0]?.id) return String(emailUsers[0].id);

  const anyUsers = await queryRows<{ id: string }>(
    `
      SELECT id
      FROM "user"
      ORDER BY "createdAt" ASC NULLS LAST
      LIMIT 1
    `
  );

  if (anyUsers[0]?.id) return String(anyUsers[0].id);

  return "atlas-master";
}

async function getOrCreateLocationId(userId: string, locationId: unknown) {
  const staticLocationId = normalizeText(locationId, "general");
  const locationName = LOCATION_NAME_BY_ID[staticLocationId] || "General";

  const existing = await queryRows<{ id: string }>(
    `
      SELECT id
      FROM locations
      WHERE "userId" = $1
        AND lower(trim(name)) = lower(trim($2))
      LIMIT 1
    `,
    [userId, locationName]
  );

  if (existing[0]?.id) return existing[0].id;

  const created = await queryRows<{ id: string }>(
    `
      INSERT INTO locations ("userId", name)
      VALUES ($1, $2)
      RETURNING id
    `,
    [userId, locationName]
  );

  return created[0]?.id || null;
}

function mapVendor(row: AnyRow) {
  return {
    id: normalizeId(row.id, "vendor"),
    name: normalizeText(row.name, "Unnamed Vendor"),
    category: normalizeText(row.category, "General"),
    phone: normalizeText(row.phone),
    email: normalizeText(row.email),
    website: normalizeText(row.website),
    notes: normalizeText(row.notes, "No notes added yet."),
    logoDataUrl: normalizeText(row.logoDataUrl || row.logo_data_url),
    documents: parseArray(row.documents),
  };
}

function mapAsset(row: AnyRow) {
  return {
    id: normalizeId(row.id, "asset"),
    name: normalizeText(row.name, "Unnamed Asset"),
    locationId: cleanLocationId(row.location_name, row.locationId || row.location_id),
    category: normalizeText(row.category, "General"),
    status: cleanStatus(row.status),
    make: normalizeText(row.make),
    model: normalizeText(row.model),
    serial: normalizeText(row.serial),
    notes: normalizeText(row.notes, "No notes added yet."),
    vendorIds: parseArray<string>(row.vendorIds || row.vendor_ids || row.vendorids),
    documents: parseArray(row.documents),
  };
}

function mapProcedure(row: AnyRow) {
  return {
    id: normalizeId(row.id, "procedure"),
    title: normalizeText(row.title, "Untitled Procedure"),
    area: normalizeText(row.area, "General"),
    priority: cleanPriority(row.priority),
    steps: parseArray<string>(row.steps).length ? parseArray<string>(row.steps) : [],
  };
}

function mapWorkOrder(row: AnyRow) {
  return {
    id: normalizeId(row.id, "service"),
    assetId: normalizeText(row.assetId || row.asset_id, ""),
    vendorId: normalizeText(row.vendorId || row.vendor_id, ""),
    procedureId: normalizeText(row.procedureId || row.procedure_id, ""),
    date: normalizeText(row.date, new Date().toISOString().slice(0, 10)),
    title: normalizeText(row.title, "Untitled Work Order"),
    status: cleanServiceStatus(row.status),
    notes: normalizeText(row.notes, "No notes added yet."),
    followUpDate: normalizeText(row.followUpDate || row.follow_up_date),
    photos: parseArray(row.photos),
    documents: parseArray(row.documents),
  };
}

function mapCalendar(row: AnyRow) {
  return {
    id: normalizeId(row.id, "calendar"),
    date: normalizeText(row.date, new Date().toISOString().slice(0, 10)),
    title: normalizeText(row.title, "Untitled Calendar Item"),
    area: normalizeText(row.area, "General"),
    status: cleanServiceStatus(row.status),
  };
}

function mapPhoto(row: AnyRow) {
  return {
    id: normalizeId(row.id, "photo"),
    assetId: normalizeText(row.assetId || row.asset_id, ""),
    name: normalizeText(row.name, "Photo"),
    dataUrl: normalizeText(row.dataUrl || row.data_url),
    createdAt: normalizeText(row.createdAt || row.created_at, new Date().toISOString()),
  };
}

async function buildPayload(table: AtlasTable, record: AnyRow, userId: string) {
  const columns = await getColumns(table);
  const payload: AnyRow = {};

  function set(column: string, value: unknown) {
    if (columns.has(column)) payload[column] = value;
  }

  const id = normalizeId(record.id, table.replace("_", "-"));

  set("id", id);
  set("userId", userId);

  if (table === "vendors") {
    set("name", normalizeText(record.name, "Unnamed Vendor"));
    set("category", normalizeText(record.category, "General"));
    set("phone", normalizeText(record.phone));
    set("email", normalizeText(record.email));
    set("website", normalizeText(record.website));
    set("notes", normalizeText(record.notes, "No notes added yet."));
    set("logoDataUrl", normalizeText(record.logoDataUrl));
    set("logo_data_url", normalizeText(record.logoDataUrl));
    set("documents", JSON.stringify(parseArray(record.documents)));
  }

  if (table === "assets") {
    const locationDbId = await getOrCreateLocationId(userId, record.locationId);

    set("name", normalizeText(record.name, "Unnamed Asset"));
    set("location_id", locationDbId);
    set("locationId", record.locationId || "general");
    set("category", normalizeText(record.category, "General"));
    set("status", cleanStatus(record.status));
    set("make", normalizeText(record.make));
    set("model", normalizeText(record.model));
    set("serial", normalizeText(record.serial));
    set("notes", normalizeText(record.notes, "No notes added yet."));
    set("vendor_ids", JSON.stringify(parseArray(record.vendorIds)));
    set("vendorIds", JSON.stringify(parseArray(record.vendorIds)));
    set("documents", JSON.stringify(parseArray(record.documents)));
  }

  if (table === "procedures") {
    set("title", normalizeText(record.title, "Untitled Procedure"));
    set("area", normalizeText(record.area, "General"));
    set("priority", cleanPriority(record.priority));
    set("steps", JSON.stringify(parseArray(record.steps)));
  }

  if (table === "work_orders") {
    set("asset_id", normalizeText(record.assetId));
    set("assetId", normalizeText(record.assetId));
    set("vendor_id", normalizeText(record.vendorId));
    set("vendorId", normalizeText(record.vendorId));
    set("procedure_id", normalizeText(record.procedureId));
    set("procedureId", normalizeText(record.procedureId));
    set("date", normalizeText(record.date, new Date().toISOString().slice(0, 10)));
    set("title", normalizeText(record.title, "Untitled Work Order"));
    set("status", cleanServiceStatus(record.status));
    set("notes", normalizeText(record.notes, "No notes added yet."));
    set("follow_up_date", normalizeText(record.followUpDate));
    set("followUpDate", normalizeText(record.followUpDate));
    set("photos", JSON.stringify(parseArray(record.photos)));
    set("documents", JSON.stringify(parseArray(record.documents)));
  }

  if (table === "calendar") {
    set("date", normalizeText(record.date, new Date().toISOString().slice(0, 10)));
    set("title", normalizeText(record.title, "Untitled Calendar Item"));
    set("area", normalizeText(record.area, "General"));
    set("status", cleanServiceStatus(record.status));
  }

  if (table === "asset_photos") {
    set("asset_id", normalizeText(record.assetId));
    set("assetId", normalizeText(record.assetId));
    set("name", normalizeText(record.name, "Photo"));
    set("dataUrl", normalizeText(record.dataUrl));
    set("data_url", normalizeText(record.dataUrl));
    set("createdAt", normalizeText(record.createdAt, new Date().toISOString()));
    set("created_at", normalizeText(record.createdAt, new Date().toISOString()));
  }

  return payload;
}

async function upsertRecord(table: AtlasTable, record: AnyRow, userId: string) {
  const payload = await buildPayload(table, record, userId);
  const columns = Object.keys(payload);

  if (!columns.length) {
    throw new Error(`No writable columns found for ${table}`);
  }

  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const values = columns.map((column) => payload[column]);

  const updateColumns = columns
    .filter((column) => column !== "id")
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
    .join(", ");

  const query = `
    INSERT INTO ${quoteIdentifier(table)} (${quotedColumns})
    VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET
      ${updateColumns || `${quoteIdentifier("id")} = EXCLUDED.${quoteIdentifier("id")}`}
    RETURNING *
  `;

  const rows = await queryRows(query, values);
  return rows[0] || payload;
}

async function deleteRecord(table: AtlasTable, id: string, userId: string) {
  const columns = await getColumns(table);
  const hasUserId = columns.has("userId");

  if (hasUserId) {
    await queryRows(
      `
        DELETE FROM ${quoteIdentifier(table)}
        WHERE id = $1
          AND "userId" = $2
      `,
      [id, userId]
    );
    return;
  }

  await queryRows(
    `
      DELETE FROM ${quoteIdentifier(table)}
      WHERE id = $1
    `,
    [id]
  );
}

export async function GET() {
  try {
    const userId = await getTargetUserId();

    const [
      vendorRows,
      assetRows,
      procedureRows,
      serviceRows,
      calendarRows,
      photoRows,
    ] = await Promise.all([
      queryRows(
        `
          SELECT *
          FROM vendors
          WHERE "userId" = $1 OR "userId" IS NULL
          ORDER BY lower(name)
        `,
        [userId]
      ),
      queryRows(
        `
          SELECT
            a.*,
            l.name AS location_name
          FROM assets a
          LEFT JOIN locations l
            ON l.id = a.location_id
          WHERE a."userId" = $1
          ORDER BY lower(a.name)
        `,
        [userId]
      ),
      queryRows(
        `
          SELECT *
          FROM procedures
          WHERE "userId" = $1 OR "userId" IS NULL
          ORDER BY lower(title)
        `,
        [userId]
      ),
      queryRows(
        `
          SELECT *
          FROM work_orders
          WHERE "userId" = $1 OR "userId" IS NULL
          ORDER BY date DESC NULLS LAST, lower(title)
        `,
        [userId]
      ),
      queryRows(
        `
          SELECT *
          FROM calendar
          WHERE "userId" = $1 OR "userId" IS NULL
          ORDER BY date ASC NULLS LAST, lower(title)
        `,
        [userId]
      ),
      queryRows(
        `
          SELECT *
          FROM asset_photos
          WHERE "userId" = $1 OR "userId" IS NULL
          ORDER BY "createdAt" DESC NULLS LAST
        `,
        [userId]
      ).catch(() =>
        queryRows(
          `
            SELECT *
            FROM asset_photos
            WHERE "userId" = $1 OR "userId" IS NULL
            ORDER BY id DESC
          `,
          [userId]
        )
      ),
    ]);

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

    if (!table || !record) {
      return jsonResponse({ ok: false, error: "Missing table or record" }, 400);
    }

    if (!["vendors", "assets", "procedures", "work_orders", "calendar", "asset_photos"].includes(table)) {
      return jsonResponse({ ok: false, error: "Invalid Atlas table" }, 400);
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
    const id = normalizeText(body?.id);

    if (!table || !id) {
      return jsonResponse({ ok: false, error: "Missing table or id" }, 400);
    }

    if (!["vendors", "assets", "procedures", "work_orders", "calendar", "asset_photos"].includes(table)) {
      return jsonResponse({ ok: false, error: "Invalid Atlas table" }, 400);
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
