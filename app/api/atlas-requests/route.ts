import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { sendAtlasPush } from "../../lib/server/atlas-push";

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


type RequestAccess = {
  email: string;
  role: string;
  profiles: string[];
  propertyIds: string[];
  restricted: boolean;
};

async function getRequestAccess(request: NextRequest): Promise<RequestAccess> {
  const email = (request.headers.get("x-atlas-user-email") || "").toLowerCase();
  const role = String(request.headers.get("x-atlas-user-role") || "").toLowerCase();
  if (!email || role === "master" || role === "administrator") {
    return { email, role, profiles: [], propertyIds: [], restricted: false };
  }

  const sql = getSql();
  const rows = await sql`
    SELECT name, role, active, access_profiles, property_ids
    FROM atlas_team_access
    WHERE lower(email)=${email}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  const storedProfiles = Array.isArray(row?.access_profiles)
    ? (row!.access_profiles as unknown[]).map(String)
    : [];
  const name = String(row?.name || "").trim();
  const profiles = /^delaney(?:\s|$)/i.test(name) && !storedProfiles.includes("request-coordinator")
    ? [...storedProfiles, "request-coordinator"]
    : storedProfiles;
  const propertyIds = Array.isArray(row?.property_ids)
    ? (row!.property_ids as unknown[]).map(String)
    : [];

  return {
    email,
    role: String(row?.role || role),
    profiles,
    propertyIds,
    restricted: Boolean(row && row.active !== false && profiles.length),
  };
}

function isMarineRequest(row: any) {
  const text = [row.category, row.asset_name, row.assetName, row.location_name, row.locationName, row.title, row.description].map((value)=>String(value ?? "")).join(" ").toLowerCase();
  return ["dock & marine", "marine", "boat", "cobalt", "sea-doo", "seadoo", "watercraft", "pwc", "jet ski", "dock lift", "boat lift", "sunstream"].some((term)=>text.includes(term));
}

function requestAllowed(access: RequestAccess, row: any) {
  if (!access.restricted) return true;

  if (access.profiles.includes("request-coordinator")) {
    const propertyId = String(row?.property_id || row?.propertyId || "").trim();
    return Boolean(propertyId && access.propertyIds.includes(propertyId));
  }

  if (access.profiles.includes("marine") && isMarineRequest(row)) return true;
  const text = Object.values(row || {}).map(String).join(" ").toLowerCase();
  return access.profiles.some((profile)=>text.includes(profile.replace("-", " ")));
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
    category: row.category ?? "Maintenance",
    status: safeStatus(row.status),
    photos: Array.isArray(row.photos) ? row.photos : [],
    adminNotes: row.admin_notes ?? "",
    convertedWorkOrderId: row.converted_work_order_id ?? "",
    completedAt: row.completed_at ?? "",
    submittedAt: row.submitted_at ?? "",
    updatedAt: row.updated_at ?? "",
    propertyId: row.property_id ?? "",
    portalType: row.portal_type ?? "owner",
    assignedTo: row.assigned_to ?? "",
    accessProfile: row.access_profile ?? "",
    visibilityUserIds: Array.isArray(row.visibility_user_ids)
      ? row.visibility_user_ids
      : [],
    source: row.source ?? "",
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
      category TEXT NOT NULL DEFAULT 'Maintenance',
      status TEXT NOT NULL DEFAULT 'New',
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      admin_notes TEXT NOT NULL DEFAULT '',
      converted_work_order_id TEXT NOT NULL DEFAULT '',
      completed_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      property_id TEXT NOT NULL DEFAULT '',
      portal_type TEXT NOT NULL DEFAULT 'owner',
      assigned_to TEXT NOT NULL DEFAULT '',
      access_profile TEXT NOT NULL DEFAULT '',
      visibility_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      source TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Maintenance'`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS property_id TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS portal_type TEXT NOT NULL DEFAULT 'owner'`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS access_profile TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS visibility_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_requests ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT ''`;

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

type PortalContext = {
  valid: boolean;
  type: "owner" | "marine";
  baseToken: string;
};

async function resolvePortalToken(token: string): Promise<PortalContext> {
  if (!token) return { valid: false, type: "owner", baseToken: "" };

  const portalToken = await getPortalToken();
  if (!portalToken) return { valid: false, type: "owner", baseToken: "" };

  if (token === portalToken) {
    return { valid: true, type: "owner", baseToken: portalToken };
  }

  if (token === `marine-${portalToken}`) {
    return { valid: true, type: "marine", baseToken: portalToken };
  }

  return { valid: false, type: "owner", baseToken: portalToken };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";

    if (token) {
      const portal = await resolvePortalToken(token);

      if (!portal.valid) {
        return NextResponse.json(
          { ok: false, error: "Request link not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        publicPortal: true,
        portalType: portal.type,
        title:
          portal.type === "marine"
            ? "Request Boat or Marine Service"
            : "Request Maintenance",
        category: portal.type === "marine" ? "Dock & Marine" : "Maintenance",
        assignedTo: portal.type === "marine" ? "Sean" : "",
        properties:
          portal.type === "marine" ? ["2000", "3661", "6855"] : [],
      });
    }

    const access = await getRequestAccess(request);
    if (!request.headers.get("x-atlas-user-email")) {
      const blocked = adminBlockResponse(request);
      if (blocked) return blocked;
    }

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
      marinePortalToken: `marine-${await getPortalToken()}`,
      requests: rows.filter((row) => requestAllowed(access, row)).map(normalizeRequest),
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

    const portal = await resolvePortalToken(token);

    if (!portal.valid) {
      return NextResponse.json(
        { ok: false, error: "Request link not found." },
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
    const requestedCategory = cleanText(body.category, 200) || "Maintenance";
    const photos = safePhotos(body.photos);
    const propertyId = cleanText(body.propertyId, 100);
    const portalType = portal.type;
    const category =
      portalType === "marine" ? "Dock & Marine" : requestedCategory;
    const assignedTo = portalType === "marine" ? "Sean" : "";
    const accessProfile = portalType === "marine" ? "marine" : "";
    const visibilityUserIds =
      portalType === "marine" ? ["sean", "nick", "steve"] : [];
    const source =
      portalType === "marine" ? "Sean Marine QR" : "Owner Request QR";

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
        category,
        status,
        photos,
        property_id,
        portal_type,
        assigned_to,
        access_profile,
        visibility_user_ids,
        source
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
        ${category},
        'New',
        ${JSON.stringify(photos)}::jsonb,
        ${propertyId},
        ${portalType},
        ${assignedTo},
        ${accessProfile},
        ${JSON.stringify(visibilityUserIds)}::jsonb,
        ${source}
      )
      RETURNING *
    `;

    const savedRequest = normalizeRequest(rows[0]);
    await sendAtlasPush({
      title:
        savedRequest.portalType === "marine"
          ? "New Sean Marine Request"
          : savedRequest.propertyId === "3661"
            ? "New 3661 Owner Request"
            : "New Atlas Owner Request",
      body: `${savedRequest.title || (savedRequest.portalType === "marine" ? "Marine Request" : "Maintenance Request")}${savedRequest.requesterName ? ` · ${savedRequest.requesterName}` : ""}${savedRequest.propertyId ? ` · ${savedRequest.propertyId}` : ""}`,
      url: "/#requests",
      tag: `atlas-request-${savedRequest.id}`,
      category: "requests",
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      request: savedRequest,
      message:
        savedRequest.portalType === "marine"
          ? "Your marine request was sent to Sean."
          : "Your request was submitted.",
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

    const access = await getRequestAccess(request);
    if (!request.headers.get("x-atlas-user-email")) {
      const blocked = adminBlockResponse(request);
      if (blocked) return blocked;
    }

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
    if (!requestAllowed(access, existing)) {
      return NextResponse.json({ ok:false, error:"This request is outside your assigned access profile." }, { status:403 });
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
    const category =
      body.category === undefined
        ? existing.category || "Maintenance"
        : cleanText(body.category, 200) || "Maintenance";
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
    const propertyId =
      body.propertyId === undefined
        ? existing.property_id || ""
        : cleanText(body.propertyId, 100);
    const assignedTo =
      body.assignedTo === undefined
        ? existing.assigned_to || ""
        : cleanText(body.assignedTo, 200);
    const wasCompleted = Boolean(existing.completed_at);
    const isCompleted = status === "Closed" || status === "Declined";
    const completedAt = isCompleted
      ? (wasCompleted ? existing.completed_at : new Date().toISOString())
      : null;

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
        category = ${category},
        status = ${status},
        admin_notes = ${adminNotes},
        converted_work_order_id = ${convertedWorkOrderId},
        property_id = ${propertyId},
        assigned_to = ${assignedTo},
        completed_at = ${completedAt},
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



export async function DELETE(request: NextRequest) {
  try {
    await ensureSchema();
    const access = await getRequestAccess(request);
    if (!request.headers.get("x-atlas-user-email")) {
      const blocked = adminBlockResponse(request);
      if (blocked) return blocked;
    }

    const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing request id." }, { status: 400 });
    }

    const sql = getSql();
    const existingRows = await sql`SELECT * FROM atlas_requests WHERE id=${id}::uuid LIMIT 1`;
    if (!existingRows[0] || !requestAllowed(access, existingRows[0])) {
      return NextResponse.json({ ok:false, error:"Request not found or outside your assigned access profile." }, { status:404 });
    }
    const rows = await sql`DELETE FROM atlas_requests WHERE id = ${id}::uuid RETURNING id`;
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Request deletion failed." },
      { status: 500 },
    );
  }
}
