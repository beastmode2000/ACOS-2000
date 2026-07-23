import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { ensurePushSchema } from "../../lib/server/atlas-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSql() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing DATABASE_URL");
  return neon(databaseUrl);
}

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_ATLAS_VAPID_PUBLIC_KEY || "";
  return NextResponse.json({
    ok: Boolean(publicKey),
    publicKey,
    configured: Boolean(
      publicKey && process.env.ATLAS_VAPID_PRIVATE_KEY,
    ),
  });
}

export async function POST(request: NextRequest) {
  try {
    await ensurePushSchema();
    const body = await request.json().catch(() => ({}));
    const subscription = body.subscription;
    const endpoint = String(subscription?.endpoint || "").trim();
    const propertyId = String(body.propertyId || "all").trim() || "all";
    const preferences =
      body.preferences && typeof body.preferences === "object"
        ? body.preferences
        : {};
    if (!endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { ok: false, error: "The device subscription is incomplete." },
        { status: 400 },
      );
    }

    const sql = getSql();
    await sql`
      INSERT INTO atlas_push_subscriptions (
        endpoint,
        subscription,
        property_id,
        user_agent,
        preferences,
        updated_at
      )
      VALUES (
        ${endpoint},
        ${JSON.stringify(subscription)}::jsonb,
        ${propertyId},
        ${request.headers.get("user-agent") || ""},
        ${JSON.stringify(preferences)}::jsonb,
        now()
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        subscription = EXCLUDED.subscription,
        property_id = EXCLUDED.property_id,
        user_agent = EXCLUDED.user_agent,
        preferences = EXCLUDED.preferences,
        updated_at = now()
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Atlas could not enable notifications." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensurePushSchema();
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body.endpoint || "").trim();
    if (endpoint) {
      const sql = getSql();
      await sql`
        DELETE FROM atlas_push_subscriptions
        WHERE endpoint = ${endpoint}
      `;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Atlas could not disable notifications." },
      { status: 500 },
    );
  }
}
