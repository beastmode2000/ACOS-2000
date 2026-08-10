import { createHmac, timingSafeEqual } from "crypto";
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
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
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
    const parsed = JSON.parse(decodeBase64Url(payloadBase64)) as SessionPayload;
    if (!parsed.email || !parsed.expiresAt || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function verifyPin(pin: unknown) {
  const configured = process.env.ATLAS_RESTRICTED_NOTES_PIN || "";
  const supplied = String(pin || "");
  if (!configured) return { ok: false as const, status: 503, error: "Restricted Notes code is not configured." };
  if (!safeEqualText(supplied, configured)) return { ok: false as const, status: 401, error: "Incorrect restricted-access code." };
  return { ok: true as const };
}

function propertyAllowed(session: SessionPayload, propertyId: string) {
  if (session.role === "master") return true;
  const propertyIds = Array.isArray(session.propertyIds) ? session.propertyIds.map(String) : ["2000"];
  return propertyIds.includes(propertyId);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_restricted_notes (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS atlas_restricted_notes_property_idx ON atlas_restricted_notes(property_id, created_at DESC)`;
}

function cleanPropertyId(value: unknown) {
  return String(value || "2000").trim() || "2000";
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
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function authorize(request: NextRequest, body: Record<string, unknown>) {
  const session = readSession(request);
  if (!session) {
    return { response: NextResponse.json({ ok: false, error: "Atlas login required." }, { status: 401 }) };
  }
  const pinCheck = verifyPin(body.pin);
  if (!pinCheck.ok) {
    return { response: NextResponse.json({ ok: false, error: pinCheck.error }, { status: pinCheck.status }) };
  }
  const propertyId = cleanPropertyId(body.propertyId);
  if (!propertyAllowed(session, propertyId)) {
    return { response: NextResponse.json({ ok: false, error: "You do not have access to this property." }, { status: 403 }) };
  }
  return { session, propertyId };
}

export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const auth = authorize(request, body);
  if ("response" in auth) return auth.response;

  const sql = getSql();
  await ensureTable(sql);

  const action = String(body.action || "list");

  if (action === "list") {
    const rows = await sql`
      SELECT id, property_id, text, created_at, updated_at
      FROM atlas_restricted_notes
      WHERE property_id = ${auth.propertyId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ ok: true, notes: rows.map((row) => serialize(row as RestrictedNoteRow)) });
  }

  if (action === "create") {
    const text = String(body.text || "").trim();
    if (!text) return NextResponse.json({ ok: false, error: "Note text is required." }, { status: 400 });
    const id = `restricted-note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const rows = await sql`
      INSERT INTO atlas_restricted_notes (id, property_id, text)
      VALUES (${id}, ${auth.propertyId}, ${text})
      RETURNING id, property_id, text, created_at, updated_at
    `;
    return NextResponse.json({ ok: true, note: serialize(rows[0] as RestrictedNoteRow) });
  }

  if (action === "update") {
    const id = String(body.id || "").trim();
    const text = String(body.text || "").trim();
    if (!id || !text) return NextResponse.json({ ok: false, error: "Note id and text are required." }, { status: 400 });
    const rows = await sql`
      UPDATE atlas_restricted_notes
      SET text = ${text}, updated_at = now()
      WHERE id = ${id} AND property_id = ${auth.propertyId}
      RETURNING id, property_id, text, created_at, updated_at
    `;
    if (!rows.length) return NextResponse.json({ ok: false, error: "Restricted note not found." }, { status: 404 });
    return NextResponse.json({ ok: true, note: serialize(rows[0] as RestrictedNoteRow) });
  }

  if (action === "delete") {
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Note id is required." }, { status: 400 });
    await sql`DELETE FROM atlas_restricted_notes WHERE id = ${id} AND property_id = ${auth.propertyId}`;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown restricted-notes action." }, { status: 400 });
}

