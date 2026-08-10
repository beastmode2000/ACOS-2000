import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_COOKIE = "atlas_session";

type SessionPayload = {
  email?: string;
  role?: string;
  propertyIds?: string[];
  expiresAt?: number;
};

type RestrictedNoteRow = {
  id: string;
  property_id: string;
  text: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type RestrictedAccessRow = {
  property_id: string;
  pin_hash: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

function base64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(padded, "base64").toString("utf8");
}

function safeEqualText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function readSession(request: NextRequest): SessionPayload | null {
  const secret = process.env.ATLAS_ACCESS_PASSWORD || "";
  const raw = request.cookies.get(SESSION_COOKIE)?.value || "";

  if (!secret || !raw.includes(".")) return null;

  const [payloadBase64, signature] = raw.split(".", 2);

  if (!payloadBase64 || !signature) return null;

  const expected = base64Url(
    createHmac("sha256", secret).update(payloadBase64).digest(),
  );

  if (!safeEqualText(signature, expected)) return null;

  try {
    const parsed = JSON.parse(
      decodeBase64Url(payloadBase64),
    ) as SessionPayload;

    if (
      !parsed.email ||
      !parsed.expiresAt ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function cleanPropertyId(value: unknown) {
  return String(value || "2000").trim() || "2000";
}

function propertyAllowed(
  session: SessionPayload,
  propertyId: string,
) {
  if (session.role === "master") return true;

  const propertyIds = Array.isArray(session.propertyIds)
    ? session.propertyIds.map(String)
    : ["2000"];

  return propertyIds.includes(propertyId);
}

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function verifyHashedPin(
  suppliedPin: string,
  storedValue: string,
) {
  const [salt, storedHash] = storedValue.split(":", 2);

  if (!salt || !storedHash) return false;

  try {
    const suppliedHash = scryptSync(
      suppliedPin,
      salt,
      64,
    );

    const storedBuffer = Buffer.from(storedHash, "hex");

    return (
      suppliedHash.length === storedBuffer.length &&
      timingSafeEqual(suppliedHash, storedBuffer)
    );
  } catch {
    return false;
  }
}

async function ensureTables(
  sql: ReturnType<typeof neon>,
) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_restricted_notes (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS atlas_restricted_notes_property_idx
    ON atlas_restricted_notes(property_id, created_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS atlas_restricted_notes_access (
      property_id text PRIMARY KEY,
      pin_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function readAccessRow(
  sql: ReturnType<typeof neon>,
  propertyId: string,
) {
  const rows = await sql`
    SELECT property_id, pin_hash, created_at, updated_at
    FROM atlas_restricted_notes_access
    WHERE property_id = ${propertyId}
    LIMIT 1
  `;

  return rows.length
    ? (rows[0] as RestrictedAccessRow)
    : null;
}

function serialize(row: RestrictedNoteRow) {
  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    text: String(row.text || ""),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function readBody(request: NextRequest) {
  try {
    return (
      (await request.json()) as Record<string, unknown>
    );
  } catch {
    return {};
  }
}

function authorizeProperty(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const session = readSession(request);

  if (!session) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Atlas login required.",
        },
        { status: 401 },
      ),
    };
  }

  const propertyId = cleanPropertyId(body.propertyId);

  if (!propertyAllowed(session, propertyId)) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error:
            "You do not have access to this property.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    session,
    propertyId,
  };
}

async function authorizePin(
  sql: ReturnType<typeof neon>,
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const propertyAuth = authorizeProperty(request, body);

  if ("response" in propertyAuth) {
    return propertyAuth;
  }

  const accessRow = await readAccessRow(
    sql,
    propertyAuth.propertyId,
  );

  if (!accessRow) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Restricted Notes PIN has not been created yet.",
        },
        { status: 409 },
      ),
    };
  }

  const suppliedPin = String(body.pin || "");

  if (
    !verifyHashedPin(
      suppliedPin,
      accessRow.pin_hash,
    )
  ) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Incorrect Restricted Notes PIN.",
        },
        { status: 401 },
      ),
    };
  }

  return propertyAuth;
}

export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const action = String(body.action || "list");

  const sql = getSql();
  await ensureTables(sql);

  if (action === "status") {
    const auth = authorizeProperty(request, body);

    if ("response" in auth) {
      return auth.response;
    }

    const accessRow = await readAccessRow(
      sql,
      auth.propertyId,
    );

    return NextResponse.json({
      ok: true,
      configured: Boolean(accessRow),
    });
  }

  if (action === "setupPin") {
    const auth = authorizeProperty(request, body);

    if ("response" in auth) {
      return auth.response;
    }

    if (auth.session.role !== "master") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only the Atlas master account can create the Restricted Notes PIN.",
        },
        { status: 403 },
      );
    }

    const existing = await readAccessRow(
      sql,
      auth.propertyId,
    );

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A Restricted Notes PIN already exists.",
        },
        { status: 409 },
      );
    }

    const newPin = String(body.newPin || "").trim();

    if (newPin.length < 4) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PIN must be at least 4 characters.",
        },
        { status: 400 },
      );
    }

    const pinHash = hashPin(newPin);

    await sql`
      INSERT INTO atlas_restricted_notes_access (
        property_id,
        pin_hash
      )
      VALUES (
        ${auth.propertyId},
        ${pinHash}
      )
    `;

    return NextResponse.json({
      ok: true,
      configured: true,
    });
  }

  if (action === "changePin") {
    const auth = await authorizePin(
      sql,
      request,
      body,
    );

    if ("response" in auth) {
      return auth.response;
    }

    if (auth.session.role !== "master") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only the Atlas master account can change the Restricted Notes PIN.",
        },
        { status: 403 },
      );
    }

    const newPin = String(body.newPin || "").trim();

    if (newPin.length < 4) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "New PIN must be at least 4 characters.",
        },
        { status: 400 },
      );
    }

    const pinHash = hashPin(newPin);

    await sql`
      UPDATE atlas_restricted_notes_access
      SET
        pin_hash = ${pinHash},
        updated_at = now()
      WHERE property_id = ${auth.propertyId}
    `;

    return NextResponse.json({
      ok: true,
      configured: true,
    });
  }

  const auth = await authorizePin(
    sql,
    request,
    body,
  );

  if ("response" in auth) {
    return auth.response;
  }

  if (action === "list") {
    const rows = await sql`
      SELECT
        id,
        property_id,
        text,
        created_at,
        updated_at
      FROM atlas_restricted_notes
      WHERE property_id = ${auth.propertyId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      ok: true,
      notes: rows.map((row) =>
        serialize(row as RestrictedNoteRow),
      ),
    });
  }

  if (action === "create") {
    const text = String(body.text || "").trim();

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "Note text is required.",
        },
        { status: 400 },
      );
    }

    const id =
      `restricted-note-${Date.now()}-` +
      Math.random().toString(16).slice(2);

    const rows = await sql`
      INSERT INTO atlas_restricted_notes (
        id,
        property_id,
        text
      )
      VALUES (
        ${id},
        ${auth.propertyId},
        ${text}
      )
      RETURNING
        id,
        property_id,
        text,
        created_at,
        updated_at
    `;

    return NextResponse.json({
      ok: true,
      note: serialize(
        rows[0] as RestrictedNoteRow,
      ),
    });
  }

  if (action === "update") {
    const id = String(body.id || "").trim();
    const text = String(body.text || "").trim();

    if (!id || !text) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Note id and text are required.",
        },
        { status: 400 },
      );
    }

    const rows = await sql`
      UPDATE atlas_restricted_notes
      SET
        text = ${text},
        updated_at = now()
      WHERE
        id = ${id}
        AND property_id = ${auth.propertyId}
      RETURNING
        id,
        property_id,
        text,
        created_at,
        updated_at
    `;

    if (!rows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Restricted note not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      note: serialize(
        rows[0] as RestrictedNoteRow,
      ),
    });
  }

  if (action === "delete") {
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Note id is required.",
        },
        { status: 400 },
      );
    }

    await sql`
      DELETE FROM atlas_restricted_notes
      WHERE
        id = ${id}
        AND property_id = ${auth.propertyId}
    `;

    return NextResponse.json({
      ok: true,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Unknown restricted-notes action.",
    },
    { status: 400 },
  );
}
