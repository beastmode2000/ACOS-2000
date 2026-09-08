import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const email = normalized(request.headers.get("x-atlas-user-email"));
    const role = normalized(request.headers.get("x-atlas-user-role"));
    let permissions: Record<string, unknown> = {};
    try {
      permissions = JSON.parse(request.headers.get("x-atlas-permissions") || "{}");
    } catch {
      permissions = {};
    }

    const allowed =
      !email ||
      email === "nthornton87@yahoo.com" ||
      role === "master" ||
      role === "administrator" ||
      permissions.manageUsers === true;

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to create work links." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { memberId?: string };
    const memberId = String(body.memberId || "").trim();
    if (!memberId) {
      return NextResponse.json({ ok: false, error: "Missing team member." }, { status: 400 });
    }

    const sql = getSql();
    const rows = (await sql`
      SELECT id, name, role, active
      FROM atlas_team_access
      WHERE id = ${memberId}
      LIMIT 1
    `) as unknown as Array<{ id: string; name: string; role: string; active: boolean }>;

    const member = rows[0];
    if (!member) {
      return NextResponse.json({ ok: false, error: "Team member not found." }, { status: 404 });
    }
    if (member.active === false) {
      return NextResponse.json({ ok: false, error: "That team member is currently paused." }, { status: 400 });
    }
    if (normalized(member.role) === "master") {
      return NextResponse.json({ ok: false, error: "The Master account does not need a My Work link." }, { status: 400 });
    }

    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");

    await sql`
      UPDATE atlas_team_access
      SET field_token_hash = ${hash},
          field_token_created_at = NOW(),
          updated_at = NOW()
      WHERE id = ${memberId}
    `;

    return NextResponse.json({
      ok: true,
      member: { id: member.id, name: member.name },
      workPath: `/my-work?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Atlas could not create the work link.",
      },
      { status: 500 },
    );
  }
}
