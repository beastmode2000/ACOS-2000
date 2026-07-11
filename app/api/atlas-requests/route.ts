import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestStatus =
  | "New"
  | "Under Review"
  | "Approved"
  | "Converted to Work Order"
  | "Declined"
  | "Closed";

type RequestPriority = "Low" | "Medium" | "High";

type UploadedPhoto = {
  id: string;
  name: string;
  type?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return neon(databaseUrl);
}

function getAdminAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function adminBlockResponse(request: NextRequest) {
  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Atlas access is not configured. Add ATLAS_ACCESS_USERNAME and ATLAS_ACCESS_PASSWORD in Vercel.",
      },
      { status: 500 },
    );
  }

  const auth = getAdminAuth(request);
  if (
    !auth ||
    auth.username !== expectedUsername ||
    auth.password !== expectedPassword
  ) {
    return NextResponse.json(
      { ok: false, error: "Atlas login required." },
      { status: 401 },
    );
  }

  return null;
}

function cleanText(value: unknown, maxLength = 5000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safePriority(value: unknown): RequestPriority {
  return value === "Low" || value === "High" ? value : "Medium";
}

function safeStatus(value: unknown): RequestStatus {
  if (
    value === "New" ||
    value === "Under Review" ||
    value === "Approved" ||
    value === "Converted to Work Order" ||
    value === "Declined" ||
    value === "Closed"
  ) {
    return value;
  }

  return "New";
}

function safePhotos(value: unknown): UploadedPhoto[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 3)
    .map((photo, index) => {
      const item = photo && typeof photo === "object" ? (photo as any) : {};
      const dataUrl = cleanText(item.dataUrl, 1_200_000);
      const url = cleanText(item.url, 4000);

      return {
        id: cleanText(item.id, 200) || `request-photo-${Date.now()}-${index}`,
        name: cleanText(item.name, 240) || `Request photo ${index + 1}`,
        type: cleanText(item.type, 120),
        dataUrl: dataUrl.startsWith("data:image/") ? dataUrl : "",
        url,
        createdAt: cleanText(item.createdAt, 100) || new Date().toISOString(),
      };
    })
    .filter((photo) => photo.dataUrl || photo.url);
}

function normalizeRequest(row: any) {
  return {
    id: String(row.id),
    requesterName: row.requester_name ?? "",
    requesterContact: row.requester_contact ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    locationName: row.location_name ?? "",
    assetName: row.asset_name ?? "",
    priority: safePriority(row.priority),
    preferredTiming: row.preferred_timing ?? "",
    status: safeStatus(row.status),
    photos: Array.isArray(row.photos) ? row.photos : [],
    adminNotes: row.admin_notes ?? "",
    convertedWorkOrderId: row.converted_work_order_id ?? "",
    submittedAt: row.submitted_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

async function ensureSchema() {
  const sql = getSql();

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS atlas_request_portal (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    INSERT INTO atlas_request_portal (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS atlas_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_name TEXT NOT NULL DEFAULT '',
      requester_contact TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      location_name TEXT NOT NULL DEFAULT '',
      asset_name TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'Medium',
      preferred_timing TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New',
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      admin_notes TEXT NOT NULL DEFAULT '',
      converted_work_order_id TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_requests_status_date_idx
    ON atlas_requests (status, submitted_at DESC)
  `;
}

async function getPortalToken() {
  const sql = getSql();
  const rows = await sql`
    SELECT share_token
    FROM atlas_request_portal
    WHERE id = 1
    LIMIT 1
  `;

  return String(rows[0]?.share_token || "");
}

async function tokenIsValid(token: string) {
  if (!token) return false;
  const portalToken = await getPortalToken();
  return Boolean(portalToken && token === portalToken);
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";

    if (token) {
      if (!(await tokenIsValid(token))) {
        return NextResponse.json(
          { ok: false, error: "Owner request link not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        publicPortal: true,
        title: "Request Maintenance",
      });
    }

    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    const sql = getSql();
    const rows = await sql`
      SELECT *
      FROM atlas_requests
      ORDER BY
        CASE status
          WHEN 'New' THEN 1
          WHEN 'Under Review' THEN 2
          WHEN 'Approved' THEN 3
          WHEN 'Converted to Work Order' THEN 4
          WHEN 'Declined' THEN 5
          ELSE 6
        END,
        submitted_at DESC
    `;

    return NextResponse.json({
      ok: true,
      portalToken: await getPortalToken(),
      requests: rows.map(normalizeRequest),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Requests could not load.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";

    if (!(await tokenIsValid(token))) {
      return NextResponse.json(
        { ok: false, error: "Owner request link not found." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const requesterName = cleanText(body.requesterName, 200);
    const requesterContact = cleanText(body.requesterContact, 300);
    const title = cleanText(body.title, 300);
    const description = cleanText(body.description, 8000);
    const locationName = cleanText(body.locationName, 300);
    const assetName = cleanText(body.assetName, 300);
    const priority = safePriority(body.priority);
    const preferredTiming = cleanText(body.preferredTiming, 500);
    const photos = safePhotos(body.photos);

    if (!requesterName || !description) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please enter your name and describe the request.",
        },
        { status: 400 },
      );
    }

    const sql = getSql();
    const rows = await sql`
      INSERT INTO atlas_requests (
        requester_name,
        requester_contact,
        title,
        description,
        location_name,
        asset_name,
        priority,
        preferred_timing,
        status,
        photos
      )
      VALUES (
        ${requesterName},
        ${requesterContact},
        ${title || "Maintenance Request"},
        ${description},
        ${locationName},
        ${assetName},
        ${priority},
        ${preferredTiming},
        'New',
        ${JSON.stringify(photos)}::jsonb
      )
      RETURNING *
    `;

    return NextResponse.json({
      ok: true,
      request: normalizeRequest(rows[0]),
      message: "Your request was submitted.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Request submission failed.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureSchema();
    const blocked = adminBlockResponse(request);
    if (blocked) return blocked;

    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 100);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing request id." },
        { status: 400 },
      );
    }

    const sql = getSql();
    const existingRows = await sql`
      SELECT * FROM atlas_requests WHERE id = ${id}::uuid LIMIT 1
    `;
    const existing = existingRows[0];

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Request not found." },
        { status: 404 },
      );
    }

    const requesterName =
      body.requesterName === undefined
        ? existing.requester_name
        : cleanText(body.requesterName, 200);
    const requesterContact =
      body.requesterContact === undefined
        ? existing.requester_contact
        : cleanText(body.requesterContact, 300);
    const title =
      body.title === undefined ? existing.title : cleanText(body.title, 300);
    const description =
      body.description === undefined
        ? existing.description
        : cleanText(body.description, 8000);
    const locationName =
      body.locationName === undefined
        ? existing.location_name
        : cleanText(body.locationName, 300);
    const assetName =
      body.assetName === undefined
        ? existing.asset_name
        : cleanText(body.assetName, 300);
    const priority =
      body.priority === undefined
        ? safePriority(existing.priority)
        : safePriority(body.priority);
    const preferredTiming =
      body.preferredTiming === undefined
        ? existing.preferred_timing
        : cleanText(body.preferredTiming, 500);
    const status =
      body.status === undefined
        ? safeStatus(existing.status)
        : safeStatus(body.status);
    const adminNotes =
      body.adminNotes === undefined
        ? existing.admin_notes
        : cleanText(body.adminNotes, 8000);
    const convertedWorkOrderId =
      body.convertedWorkOrderId === undefined
        ? existing.converted_work_order_id
        : cleanText(body.convertedWorkOrderId, 300);

    const rows = await sql`
      UPDATE atlas_requests
      SET
        requester_name = ${requesterName},
        requester_contact = ${requesterContact},
        title = ${title},
        description = ${description},
        location_name = ${locationName},
        asset_name = ${assetName},
        priority = ${priority},
        preferred_timing = ${preferredTiming},
        status = ${status},
        admin_notes = ${adminNotes},
        converted_work_order_id = ${convertedWorkOrderId},
        updated_at = now()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    return NextResponse.json({ ok: true, request: normalizeRequest(rows[0]) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Request update failed.",
      },
      { status: 500 },
    );
  }
}

