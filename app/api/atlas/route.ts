import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function getDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL. Add the Neon connection string to Vercel environment variables.");
  }

  return url;
}

function getSql() {
  return neon(getDatabaseUrl());
}

function dateOnly(value: unknown) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asJsonArray(value: unknown): JsonValue[] {
  return Array.isArray(value) ? (value as JsonValue[]) : [];
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function toPostgresTextArray(values: unknown) {
  const items = asTextArray(values);

  if (!items.length) return "{}";

  return `{${items
    .map((item) => `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;
}

function normalizeStatus(value: unknown) {
  const status = asString(value, "Monitor");

  if (["Online", "Offline", "Seasonal", "Monitor"].includes(status)) {
    return status;
  }

  return "Monitor";
}

function normalizeWorkStatus(value: unknown) {
  const status = asString(value, "Open");

  if (["Open", "Scheduled", "Completed", "Monitor"].includes(status)) {
    return status;
  }

  return "Open";
}

function normalizePriority(value: unknown) {
  const priority = asString(value, "Normal");

  if (["High", "Normal", "Seasonal"].includes(priority)) {
    return priority;
  }

  return "Normal";
}

export async function GET() {
  try {
    const sql = getSql();

    const [
      locations,
      vendors,
      assets,
      procedures,
      workOrders,
      calendarItems,
      documents,
      assetPhotos,
    ] = await Promise.all([
      sql`
        SELECT id, name, type, zone, notes, sort_order
        FROM atlas_locations
        ORDER BY sort_order ASC, name ASC
      `,
      sql`
        SELECT id, name, category, phone, email, website, notes, logo_data_url, documents
        FROM atlas_vendors
        ORDER BY name ASC
      `,
      sql`
        SELECT id, name, location_id, category, status, make, model, serial, notes, vendor_ids, documents
        FROM atlas_assets
        ORDER BY name ASC
      `,
      sql`
        SELECT id, title, area, priority, steps
        FROM atlas_procedures
        ORDER BY title ASC
      `,
      sql`
        SELECT id, asset_id, vendor_id, procedure_id, work_date, title, status, notes, follow_up_date, photos, documents
        FROM atlas_work_orders
        ORDER BY work_date DESC, created_at DESC
      `,
      sql`
        SELECT id, item_date, title, area, status
        FROM atlas_calendar_items
        ORDER BY item_date ASC, title ASC
      `,
      sql`
        SELECT id, title, area, document_type, linked_asset_id, notes
        FROM atlas_documents
        ORDER BY title ASC
      `,
      sql`
        SELECT id, asset_id, name, data_url, created_at
        FROM atlas_asset_photos
        ORDER BY created_at DESC
      `,
    ]);

    return Response.json({
      ok: true,
      source: "neon",
      locations,
      vendorRecords: vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        phone: vendor.phone || "",
        email: vendor.email || "",
        website: vendor.website || "",
        notes: vendor.notes || "",
        logoDataUrl: vendor.logo_data_url || "",
        documents: vendor.documents || [],
      })),
      assetRecords: assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        locationId: asset.location_id,
        category: asset.category,
        status: asset.status,
        make: asset.make || "",
        model: asset.model || "",
        serial: asset.serial || "",
        notes: asset.notes || "",
        vendorIds: asset.vendor_ids || [],
        documents: asset.documents || [],
      })),
      procedureRecords: procedures.map((procedure) => ({
        id: procedure.id,
        title: procedure.title,
        area: procedure.area,
        priority: procedure.priority,
        steps: procedure.steps || [],
      })),
      serviceRecords: workOrders.map((record) => ({
        id: record.id,
        assetId: record.asset_id,
        vendorId: record.vendor_id || "",
        procedureId: record.procedure_id || "",
        date: dateOnly(record.work_date),
        title: record.title,
        status: record.status,
        notes: record.notes || "",
        followUpDate: dateOnly(record.follow_up_date),
        photos: record.photos || [],
        documents: record.documents || [],
      })),
      calendarItems: calendarItems.map((item) => ({
        id: item.id,
        date: dateOnly(item.item_date),
        title: item.title,
        area: item.area,
        status: item.status,
      })),
      documents: documents.map((document) => ({
        id: document.id,
        title: document.title,
        area: document.area,
        type: document.document_type,
        linkedAssetId: document.linked_asset_id || "",
        notes: document.notes || "",
      })),
      photos: assetPhotos.map((photo) => ({
        id: photo.id,
        assetId: photo.asset_id,
        name: photo.name,
        dataUrl: photo.data_url,
        createdAt: photo.created_at,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const table = asString(body.table);
    const record = body.record || {};

    if (table === "vendors") {
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
          documents
        )
        VALUES (
          ${asString(record.id)},
          ${asString(record.name, "Unnamed Vendor")},
          ${asString(record.category, "General")},
          ${asString(record.phone)},
          ${asString(record.email)},
          ${asString(record.website)},
          ${asString(record.notes)},
          ${asString(record.logoDataUrl)},
          ${JSON.stringify(asJsonArray(record.documents))}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          notes = EXCLUDED.notes,
          logo_data_url = EXCLUDED.logo_data_url,
          documents = EXCLUDED.documents
      `;
    } else if (table === "assets") {
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
          documents
        )
        VALUES (
          ${asString(record.id)},
          ${asString(record.name, "Unnamed Asset")},
          ${asString(record.locationId, "general")},
          ${asString(record.category, "General")},
          ${normalizeStatus(record.status)},
          ${asString(record.make)},
          ${asString(record.model)},
          ${asString(record.serial)},
          ${asString(record.notes)},
          ${toPostgresTextArray(record.vendorIds)}::text[],
          ${JSON.stringify(asJsonArray(record.documents))}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          location_id = EXCLUDED.location_id,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          serial = EXCLUDED.serial,
          notes = EXCLUDED.notes,
          vendor_ids = EXCLUDED.vendor_ids,
          documents = EXCLUDED.documents
      `;
    } else if (table === "procedures") {
      await sql`
        INSERT INTO atlas_procedures (
          id,
          title,
          area,
          priority,
          steps
        )
        VALUES (
          ${asString(record.id)},
          ${asString(record.title, "Untitled Procedure")},
          ${asString(record.area, "General")},
          ${normalizePriority(record.priority)},
          ${toPostgresTextArray(record.steps)}::text[]
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          priority = EXCLUDED.priority,
          steps = EXCLUDED.steps
      `;
    } else if (table === "work_orders") {
      await sql`
        INSERT INTO atlas_work_orders (
          id,
          asset_id,
          vendor_id,
          procedure_id,
          work_date,
          title,
          status,
          notes,
          follow_up_date,
          photos,
          documents
        )
        VALUES (
          ${asString(record.id)},
          ${asString(record.assetId, "general")},
          ${asString(record.vendorId) || null},
          ${asString(record.procedureId) || null},
          ${asString(record.date, new Date().toISOString().slice(0, 10))}::date,
          ${asString(record.title, "Untitled Work Order")},
          ${normalizeWorkStatus(record.status)},
          ${asString(record.notes)},
          ${asString(record.followUpDate) || null}::date,
          ${JSON.stringify(asJsonArray(record.photos))}::jsonb,
          ${JSON.stringify(asJsonArray(record.documents))}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          asset_id = EXCLUDED.asset_id,
          vendor_id = EXCLUDED.vendor_id,
          procedure_id = EXCLUDED.procedure_id,
          work_date = EXCLUDED.work_date,
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          follow_up_date = EXCLUDED.follow_up_date,
          photos = EXCLUDED.photos,
          documents = EXCLUDED.documents
      `;
    } else if (table === "calendar") {
      await sql`
        INSERT INTO atlas_calendar_items (
          id,
          item_date,
          title,
          area,
          status
        )
        VALUES (
          ${asString(record.id)},
          ${asString(record.date, new Date().toISOString().slice(0, 10))}::date,
          ${asString(record.title, "Untitled Calendar Item")},
          ${asString(record.area, "General")},
          ${normalizeWorkStatus(record.status)}
        )
        ON CONFLICT (id) DO UPDATE SET
          item_date = EXCLUDED.item_date,
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          status = EXCLUDED.status
      `;
    } else if (table === "asset_photos") {
      await sql`
        INSERT INTO atlas_asset_photos (
          id,
          asset_id,
          name,
          data_url
        )
        VALUES (
          ${asString(record.id)},
          ${asString(record.assetId)},
          ${asString(record.name, "Photo")},
          ${asString(record.dataUrl)}
        )
        ON CONFLICT (id) DO UPDATE SET
          asset_id = EXCLUDED.asset_id,
          name = EXCLUDED.name,
          data_url = EXCLUDED.data_url
      `;
    } else {
      return Response.json(
        {
          ok: false,
          error: `Unsupported table: ${table}`,
        },
        { status: 400 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown database write error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    const body = await request.json();
    const table = asString(body.table);
    const id = asString(body.id);

    if (!id) {
      return Response.json(
        {
          ok: false,
          error: "Missing id",
        },
        { status: 400 }
      );
    }

    if (table === "vendors") {
      await sql`DELETE FROM atlas_vendors WHERE id = ${id}`;
    } else if (table === "assets") {
      await sql`DELETE FROM atlas_assets WHERE id = ${id}`;
    } else if (table === "procedures") {
      await sql`DELETE FROM atlas_procedures WHERE id = ${id}`;
    } else if (table === "work_orders") {
      await sql`DELETE FROM atlas_work_orders WHERE id = ${id}`;
    } else if (table === "calendar") {
      await sql`DELETE FROM atlas_calendar_items WHERE id = ${id}`;
    } else if (table === "asset_photos") {
      await sql`DELETE FROM atlas_asset_photos WHERE id = ${id}`;
    } else {
      return Response.json(
        {
          ok: false,
          error: `Unsupported table: ${table}`,
        },
        { status: 400 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown database delete error",
      },
      { status: 500 }
    );
  }
}
