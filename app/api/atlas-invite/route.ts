import { neon } from "@neondatabase/serverless";
import { createHash, pbkdf2Sync, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; password?: string };
    const token = String(body.token || "");
    const password = String(body.password || "");
    if (token.length < 40 || password.length < 10) return NextResponse.json({ ok:false, error:"Use a password with at least 10 characters." }, { status:400 });
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
    if (!url) throw new Error("Missing DATABASE_URL");
    const sql = neon(url);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await sql`SELECT member_id FROM atlas_team_invites WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at > NOW() LIMIT 1`;
    const memberId = String(rows[0]?.member_id || "");
    if (!memberId) return NextResponse.json({ ok:false, error:"This invitation is invalid or expired." }, { status:400 });
    const salt = randomBytes(16).toString("hex");
    const passwordHash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
    await sql`UPDATE atlas_team_access SET password_hash=${passwordHash}, password_salt=${salt}, active=true, updated_at=NOW() WHERE id=${memberId}`;
    await sql`UPDATE atlas_team_invites SET used_at=NOW() WHERE token_hash=${tokenHash}`;
    return NextResponse.json({ ok:true });
  } catch (error) {
    return NextResponse.json({ ok:false, error:error instanceof Error ? error.message : "Could not complete setup." }, { status:500 });
  }
}
