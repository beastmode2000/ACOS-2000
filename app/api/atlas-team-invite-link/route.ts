import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

function normalizeRole(value: unknown) {
  const role = String(value || "").toLowerCase();
  if (role === "operations") return "employee";
  return ["master", "administrator", "manager", "employee", "vendor", "viewer"].includes(role)
    ? role
    : "viewer";
}

export async function POST(request: NextRequest) {
  try {
    const role = normalizeRole(request.headers.get("x-atlas-user-role") || "viewer");
    const requestEmail = String(request.headers.get("x-atlas-user-email") || "")
      .trim()
      .toLowerCase();

    let headerPermissions: Record<string, unknown> = {};
    try {
      headerPermissions = JSON.parse(request.headers.get("x-atlas-permissions") || "{}");
    } catch {
      headerPermissions = {};
    }

    const canManage =
      !requestEmail ||
      requestEmail === "nthornton87@yahoo.com" ||
      role === "master" ||
      role === "administrator" ||
      headerPermissions.manageUsers === true;

    if (!canManage) {
      return NextResponse.json(
        { ok: false, error: "You do not have permission to manage Atlas users." },
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
      SELECT id, name, email, password_hash
      FROM atlas_team_access
      WHERE id = ${memberId}
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      name: string;
      email: string;
      password_hash: string | null;
    }>;

    const member = rows[0];
    if (!member) {
      return NextResponse.json({ ok: false, error: "Team member not found." }, { status: 404 });
    }

    if (member.password_hash) {
      return NextResponse.json(
        { ok: false, error: "This Atlas account has already accepted an invite." },
        { status: 400 },
      );
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await sql`
      INSERT INTO atlas_team_invites (
        token_hash,
        member_id,
        expires_at,
        email_status,
        created_at
      )
      VALUES (
        ${tokenHash},
        ${member.id},
        NOW() + INTERVAL '7 days',
        'Created',
        NOW()
      )
    `;

    return NextResponse.json({
      ok: true,
      invitePath: `/invite?token=${token}`,
      expiresInDays: 7,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not create invite link.",
      },
      { status: 500 },
    );
  }
}
