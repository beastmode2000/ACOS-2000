import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

type Role =
  | "master"
  | "administrator"
  | "manager"
  | "employee"
  | "vendor"
  | "viewer";

type Permissions = {
  view: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
  manageUsers: boolean;
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  propertyIds?: string[];
  permissions?: Permissions;
  accessProfiles?: string[];
};

const rolePermissions: Record<Role, Permissions> = {
  master: {
    view: true,
    edit: true,
    approve: true,
    delete: true,
    manageUsers: true,
  },
  administrator: {
    view: true,
    edit: true,
    approve: true,
    delete: true,
    manageUsers: true,
  },
  manager: {
    view: true,
    edit: true,
    approve: true,
    delete: false,
    manageUsers: false,
  },
  employee: {
    view: true,
    edit: true,
    approve: false,
    delete: false,
    manageUsers: false,
  },
  vendor: {
    view: true,
    edit: false,
    approve: false,
    delete: false,
    manageUsers: false,
  },
  viewer: {
    view: true,
    edit: false,
    approve: false,
    delete: false,
    manageUsers: false,
  },
};

function normalizeRole(value: unknown): Role {
  const role = String(value || "").toLowerCase();

  if (role === "operations") {
    return "employee";
  }

  return (
    [
      "master",
      "administrator",
      "manager",
      "employee",
      "vendor",
      "viewer",
    ].includes(role)
      ? role
      : "viewer"
  ) as Role;
}

const defaults: Member[] = [
  {
    id: "nick",
    name: "Nick Thornton",
    email: "nthornton87@yahoo.com",
    role: "master",
    active: true,
    propertyIds: ["2000", "6855", "3661", "hangar"],
  },
  {
    id: "steve",
    name: "Steve",
    email: "stevem@arcticmgnt.com",
    role: "administrator",
    active: true,
  },
  {
    id: "kenji",
    name: "Kenji",
    email: "kenjij@arcticmgnt.com",
    role: "administrator",
    active: true,
  },
];

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }

  return neon(url);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_team_access (
      id text PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      role text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE atlas_team_access
    ADD COLUMN IF NOT EXISTS password_hash text
  `;

  await sql`
    ALTER TABLE atlas_team_access
    ADD COLUMN IF NOT EXISTS password_salt text
  `;

  await sql`
    ALTER TABLE atlas_team_access
    ADD COLUMN IF NOT EXISTS property_ids text[]
    NOT NULL DEFAULT ARRAY['2000']::text[]
  `;

  await sql`
    ALTER TABLE atlas_team_access
    ADD COLUMN IF NOT EXISTS permissions jsonb
    NOT NULL DEFAULT '{}'::jsonb
  `;

  await sql`
    ALTER TABLE atlas_team_access
    ADD COLUMN IF NOT EXISTS access_profiles text[]
    NOT NULL DEFAULT '{}'::text[]
  `;

  await sql`
    UPDATE atlas_team_access
    SET role = 'employee'
    WHERE role = 'operations'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS atlas_team_invites (
      token_hash text PRIMARY KEY,
      member_id text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  for (const member of defaults) {
    const propertyIds =
      member.id === "nick"
        ? ["2000", "6855", "3661", "hangar"]
        : member.propertyIds || ["2000"];

    await sql`
      INSERT INTO atlas_team_access (
        id,
        name,
        email,
        role,
        active,
        property_ids
      )
      VALUES (
        ${member.id},
        ${member.name},
        ${member.email},
        ${member.role},
        ${member.active},
        ${propertyIds}
      )
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        role = CASE
          WHEN atlas_team_access.id = 'nick' THEN 'master'
          ELSE atlas_team_access.role
        END,
        active = CASE
          WHEN atlas_team_access.id = 'nick' THEN true
          ELSE atlas_team_access.active
        END,
        property_ids = CASE
          WHEN atlas_team_access.id = 'nick'
          THEN ARRAY['2000', '6855', '3661', 'hangar']::text[]
          ELSE atlas_team_access.property_ids
        END
    `;
  }
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();

    await ensureTable(sql);

    const rows = (await sql`
      SELECT
        a.id,
        a.name,
        a.email,
        a.role,
        a.active,
        a.property_ids,
        a.permissions,
        a.access_profiles,
        CASE
          WHEN a.password_hash IS NOT NULL THEN 'Accepted'
          WHEN i.expires_at > NOW() AND i.used_at IS NULL THEN 'Invited'
          WHEN i.expires_at <= NOW() AND i.used_at IS NULL THEN 'Expired'
          ELSE 'Not Invited'
        END AS invite_status
      FROM atlas_team_access a
      LEFT JOIN LATERAL (
        SELECT expires_at, used_at
        FROM atlas_team_invites
        WHERE member_id = a.id
        ORDER BY created_at DESC
        LIMIT 1
      ) i ON true
      ORDER BY
        CASE a.role
          WHEN 'master' THEN 0
          ELSE 1
        END,
        a.name
    `) as unknown as Record<string, unknown>[];

    const members = rows.map((row) => {
      const role = normalizeRole(row.role);
      const id = String(row.id || "");
      const email = String(row.email || "").toLowerCase();

      const isNick =
        id === "nick" || email === "nthornton87@yahoo.com";

      return {
        id,
        name: String(row.name || ""),
        email,
        active: isNick ? true : row.active !== false,
        role: isNick ? ("master" as Role) : role,
        propertyIds: isNick
          ? ["2000", "6855", "3661", "hangar"]
          : Array.isArray(row.property_ids)
            ? row.property_ids.map(String)
            : ["2000"],
        permissions: {
          ...rolePermissions[isNick ? "master" : role],
          ...(row.permissions && typeof row.permissions === "object"
            ? row.permissions
            : {}),
        },
        accessProfiles: Array.isArray(row.access_profiles)
          ? row.access_profiles.map(String)
          : [],
        inviteStatus: row.invite_status,
      };
    });

    const email = (
      request.headers.get("x-atlas-user-email") || ""
    ).toLowerCase();

    const current = members.find(
      (member) => member.email.toLowerCase() === email,
    );

    const headerRole = request.headers.get("x-atlas-user-role");
    const currentRole = normalizeRole(
      current?.role || headerRole || "viewer",
    );

    const isNick =
      current?.id === "nick" ||
      email === "nthornton87@yahoo.com";

    const isMaster =
      isNick ||
      currentRole === "master" ||
      current?.role === "master";

    return NextResponse.json({
      ok: true,
      members,
      currentUser: {
        email,
        name: current?.name || "Atlas User",
        role: isMaster ? "master" : current ? currentRole : "viewer",
        propertyIds: isMaster
          ? ["2000", "6855", "3661", "hangar"]
          : current?.propertyIds || [],
        permissions: isMaster
          ? rolePermissions.master
          : current?.permissions ||
            rolePermissions.viewer,
        accessProfiles: isMaster ? [] : current?.accessProfiles || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load team access.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = normalizeRole(
      request.headers.get("x-atlas-user-role") || "viewer",
    );

    let headerPermissions: Record<string, unknown> = {};

    try {
      headerPermissions = JSON.parse(
        request.headers.get("x-atlas-permissions") || "{}",
      );
    } catch {
      headerPermissions = {};
    }

    if (
      role !== "master" &&
      role !== "administrator" &&
      headerPermissions.manageUsers !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "You do not have permission to manage Atlas users.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      members?: Member[];
      action?: string;
      member?: Member;
      memberId?: string;
    };

    const sql = getSql();

    await ensureTable(sql);

    if (body.action === "delete") {
      const memberId = String(body.memberId || "").trim();
      if (!memberId) {
        return NextResponse.json(
          { ok: false, error: "Missing Atlas user id." },
          { status: 400 },
        );
      }
      if (memberId === "nick") {
        return NextResponse.json(
          { ok: false, error: "The Master account cannot be deleted." },
          { status: 400 },
        );
      }

      const existing = (await sql`
        SELECT id, role
        FROM atlas_team_access
        WHERE id = ${memberId}
        LIMIT 1
      `) as unknown as Array<{ id: string; role: string }>;

      if (!existing.length) {
        return NextResponse.json(
          { ok: false, error: "Atlas user not found." },
          { status: 404 },
        );
      }

      if (normalizeRole(existing[0].role) === "master") {
        return NextResponse.json(
          { ok: false, error: "A Master account cannot be deleted." },
          { status: 400 },
        );
      }

      await sql`
        DELETE FROM atlas_team_invites
        WHERE member_id = ${memberId}
      `;
      await sql`
        DELETE FROM atlas_team_access
        WHERE id = ${memberId}
      `;

      return NextResponse.json({ ok: true });
    }

    if (body.action === "invite" && body.member) {
      const member = body.member;
      const id = member.id || `team-${Date.now()}`;
      const memberRole = normalizeRole(member.role);

      const propertyIds =
        Array.isArray(member.propertyIds) &&
        member.propertyIds.length
          ? member.propertyIds
          : ["2000"];

      const permissions = {
        ...rolePermissions[memberRole],
        ...(member.permissions || {}),
      };

      await sql`
        INSERT INTO atlas_team_access (
          id,
          name,
          email,
          role,
          active,
          property_ids,
          permissions,
          access_profiles,
          updated_at
        )
        VALUES (
          ${id},
          ${member.name},
          ${member.email.toLowerCase()},
          ${memberRole},
          true,
          ${propertyIds},
          ${JSON.stringify(permissions)}::jsonb,
          ${Array.isArray(member.accessProfiles) ? member.accessProfiles : []},
          NOW()
        )
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          active = true,
          property_ids = EXCLUDED.property_ids,
          permissions = EXCLUDED.permissions,
          access_profiles = EXCLUDED.access_profiles,
          updated_at = NOW()
      `;

      const token = randomBytes(32).toString("hex");
      const hash = createHash("sha256")
        .update(token)
        .digest("hex");

      await sql`
        INSERT INTO atlas_team_invites (
          token_hash,
          member_id,
          expires_at
        )
        VALUES (
          ${hash},
          ${id},
          NOW() + INTERVAL '7 days'
        )
      `;

      return NextResponse.json({
        ok: true,
        invitePath: `/invite?token=${token}`,
      });
    }

    if (!Array.isArray(body.members)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing team members.",
        },
        { status: 400 },
      );
    }

    for (const member of body.members) {
      const memberRole = normalizeRole(member.role);

      const isNick =
        member.id === "nick" ||
        member.email.toLowerCase() ===
          "nthornton87@yahoo.com";

      const finalRole: Role = isNick
        ? "master"
        : memberRole;

      const propertyIds = isNick
        ? ["2000", "6855", "3661", "hangar"]
        : Array.isArray(member.propertyIds) &&
            member.propertyIds.length
          ? member.propertyIds
          : ["2000"];

      const permissions = {
        ...rolePermissions[finalRole],
        ...(member.permissions || {}),
      };

      await sql`
        INSERT INTO atlas_team_access (
          id,
          name,
          email,
          role,
          active,
          property_ids,
          permissions,
          access_profiles,
          updated_at
        )
        VALUES (
          ${member.id},
          ${member.name},
          ${member.email.toLowerCase()},
          ${finalRole},
          ${isNick ? true : member.active},
          ${propertyIds},
          ${JSON.stringify(permissions)}::jsonb,
          ${Array.isArray(member.accessProfiles) ? member.accessProfiles : []},
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          active = EXCLUDED.active,
          property_ids = EXCLUDED.property_ids,
          permissions = EXCLUDED.permissions,
          access_profiles = EXCLUDED.access_profiles,
          updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not save team access.",
      },
      { status: 500 },
    );
  }
}
