import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

function clean(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function isAdminRequest(request: NextRequest) {
  const email = clean(request.headers.get("x-atlas-user-email"), 320).toLowerCase();
  const role = clean(request.headers.get("x-atlas-user-role"), 80).toLowerCase();
  return (
    !email ||
    email === "nthornton87@yahoo.com" ||
    role === "master" ||
    role === "administrator"
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to manage employment status." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const memberId = clean(body.memberId, 220);
    const action = clean(body.action, 60).toLowerCase();
    if (!memberId || !["pause", "resume"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Employee and employment action are required." },
        { status: 400 },
      );
    }

    const sql = getSql();
    const rows = (await sql`
      SELECT id, name, email, role, active
      FROM atlas_team_access
      WHERE id = ${memberId}
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      active: boolean;
    }>;

    const member = rows[0];
    if (!member) {
      return NextResponse.json({ ok: false, error: "Team member was not found." }, { status: 404 });
    }

    const role = clean(member.role, 80).toLowerCase();
    const email = clean(member.email, 320).toLowerCase();
    if (member.id === "nick" || email === "nthornton87@yahoo.com" || role === "master") {
      return NextResponse.json(
        { ok: false, error: "The Master account cannot be paused." },
        { status: 400 },
      );
    }

    const active = action === "resume";
    await sql`
      UPDATE atlas_team_access
      SET active = ${active}, updated_at = NOW()
      WHERE id = ${memberId}
    `;

    return NextResponse.json({
      ok: true,
      member: {
        id: member.id,
        name: member.name,
        active,
      },
    });
  } catch (error) {
    console.error("Atlas employment status update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Atlas could not update employment status." },
      { status: 500 },
    );
  }
}
