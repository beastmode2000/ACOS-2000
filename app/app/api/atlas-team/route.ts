import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Role = "master" | "administrator" | "operations" | "viewer";
type Member = { id: string; name: string; email: string; role: Role; active: boolean };

const defaults: Member[] = [
  { id: "nick", name: "Nick Thornton", email: "nthornton87@yahoo.com", role: "master", active: true },
  { id: "steve", name: "Steve", email: "stevem@arcticmgnt.com", role: "administrator", active: true },
  { id: "kenji", name: "Kenji", email: "kenjij@arcticmgnt.com", role: "administrator", active: true },
];

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`CREATE TABLE IF NOT EXISTS atlas_team_access (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )`;
  for (const member of defaults) {
    await sql`INSERT INTO atlas_team_access (id, name, email, role, active)
      VALUES (${member.id}, ${member.name}, ${member.email}, ${member.role}, ${member.active})
      ON CONFLICT (email) DO NOTHING`;
  }
}

export async function GET() {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const rows = await sql`SELECT id, name, email, role, active FROM atlas_team_access ORDER BY CASE role WHEN 'master' THEN 0 ELSE 1 END, name`;
    return NextResponse.json({ ok: true, members: rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load team access." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { members?: Member[] };
    if (!Array.isArray(body.members)) return NextResponse.json({ ok: false, error: "Missing team members." }, { status: 400 });
    const sql = getSql();
    await ensureTable(sql);
    for (const member of body.members) {
      const role: Role = ["master", "administrator", "operations", "viewer"].includes(member.role) ? member.role : "viewer";
      const existingMaster = defaults.find((item) => item.id === member.id && item.role === "master");
      await sql`INSERT INTO atlas_team_access (id, name, email, role, active, updated_at)
        VALUES (${member.id}, ${member.name}, ${member.email.toLowerCase()}, ${existingMaster ? "master" : role}, ${existingMaster ? true : member.active}, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email,
          role = EXCLUDED.role, active = EXCLUDED.active, updated_at = NOW()`;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save team access." }, { status: 500 });
  }
}
