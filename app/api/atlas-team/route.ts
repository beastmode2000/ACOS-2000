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
  fieldLinkActive?: boolean;
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


function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendInviteEmail(input: {
  to: string;
  name: string;
  role: Role;
  inviteUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATLAS_INVITE_FROM;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY in Vercel environment variables.");
  }

  if (!from) {
    throw new Error(
      "Missing ATLAS_INVITE_FROM in Vercel environment variables, for example Atlas <invites@atlas2000.com>.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `atlas-invite-${createHash("sha256")
        .update(`${input.to}|${input.inviteUrl}`)
        .digest("hex")}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: process.env.ATLAS_INVITE_REPLY_TO || undefined,
      subject: "You have been invited to Atlas",
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172331;">
            <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
              <div style="background:#071b2f;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
                <div style="font-size:26px;font-weight:800;color:#ffffff;">Atlas</div>
                <div style="margin-top:5px;color:#e5c06b;font-size:13px;">Estate Operations</div>
              </div>
              <div style="background:#ffffff;border:1px solid #dde7f0;border-top:0;border-radius:0 0 16px 16px;padding:28px;">
                <h1 style="margin:0 0 14px;font-size:24px;color:#071b2f;">Welcome to Atlas</h1>
                <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">Hello ${escapeHtml(input.name)},</p>
                <p style="font-size:16px;line-height:1.55;margin:0 0 18px;">You have been invited to join Atlas as <strong>${escapeHtml(input.role)}</strong>.</p>
                <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#c99a3d;color:#071b2f;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:10px;">Accept Atlas Invite</a>
                <p style="font-size:13px;line-height:1.5;color:#64748b;margin:22px 0 0;">This secure invitation expires in 7 days. If the button does not work, paste this address into your browser:<br><span style="word-break:break-all;">${escapeHtml(input.inviteUrl)}</span></p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${input.name},\n\nYou have been invited to join Atlas as ${input.role}.\n\nAccept your invite: ${input.inviteUrl}\n\nThis secure invitation expires in 7 days.`,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.message || payload.error?.message || "Resend could not send the invitation email.",
    );
  }

  return String(payload.id || "");
}

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

  await sql`
    ALTER TABLE atlas_team_invites
    ADD COLUMN IF NOT EXISTS email_status text
    NOT NULL DEFAULT 'Not Sent'
  `;

  await sql`
    ALTER TABLE atlas_team_invites
    ADD COLUMN IF NOT EXISTS email_message_id text
  `;

  await sql`
    ALTER TABLE atlas_team_invites
    ADD COLUMN IF NOT EXISTS email_sent_at timestamptz
  `;

  await sql`
    ALTER TABLE atlas_team_invites
    ADD COLUMN IF NOT EXISTS email_error text
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
        (a.field_token_hash IS NOT NULL) AS field_link_active,
        CASE
          WHEN a.password_hash IS NOT NULL THEN 'Accepted'
          WHEN i.email_status = 'Failed' THEN 'Failed'
          WHEN i.email_status = 'Sent' AND i.expires_at > NOW() AND i.used_at IS NULL THEN 'Sent'
          WHEN i.expires_at > NOW() AND i.used_at IS NULL THEN 'Created'
          WHEN i.expires_at <= NOW() AND i.used_at IS NULL THEN 'Expired'
          ELSE 'Not Invited'
        END AS invite_status
      FROM atlas_team_access a
      LEFT JOIN LATERAL (
        SELECT expires_at, used_at, email_status
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
        fieldLinkActive: row.field_link_active === true,
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
      headerRole || current?.role || "viewer",
    );

    const isNick =
      current?.id === "nick" ||
      email === "nthornton87@yahoo.com";

    const isMaster =
      isNick ||
      currentRole === "master" ||
      current?.role === "master" ||
      !email;

    return NextResponse.json({
      ok: true,
      members,
      currentUser: {
        email,
        role: isMaster ? "master" : currentRole,
        propertyIds: isMaster
          ? ["2000", "6855", "3661", "hangar"]
          : current?.propertyIds || ["2000"],
        permissions: isMaster
          ? rolePermissions.master
          : current?.permissions ||
            rolePermissions[currentRole],
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
    const requestEmail = String(
      request.headers.get("x-atlas-user-email") || "",
    ).trim().toLowerCase();
    const isMasterUser =
      requestEmail === "nthornton87@yahoo.com" ||
      role === "master" ||
      !requestEmail;

    let headerPermissions: Record<string, unknown> = {};

    try {
      headerPermissions = JSON.parse(
        request.headers.get("x-atlas-permissions") || "{}",
      );
    } catch {
      headerPermissions = {};
    }

    if (
      !isMasterUser &&
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

    if (body.action === "field-link" || body.action === "field-link-revoke") {
      const memberId = String(body.memberId || "").trim();
      if (!memberId) return NextResponse.json({ ok:false, error:"Missing team member." }, { status:400 });
      const rows = await sql`
        SELECT id, name, role, active, property_ids
        FROM atlas_team_access
        WHERE id = ${memberId}
        LIMIT 1
      `;
      const member = rows[0] as any;
      if (!member) return NextResponse.json({ ok:false, error:"Team member not found." }, { status:404 });
      if (normalizeRole(member.role) !== "employee") {
        return NextResponse.json({ ok:false, error:"My Work links are only for employees." }, { status:400 });
      }
      if (body.action === "field-link-revoke") {
        await sql`UPDATE atlas_team_access SET field_token_hash=NULL, field_token_created_at=NULL, updated_at=NOW() WHERE id=${memberId}`;
        return NextResponse.json({ ok:true, revoked:true });
      }
      const token = `field-${randomBytes(32).toString("hex")}`;
      const hash = createHash("sha256").update(token).digest("hex");
      await sql`UPDATE atlas_team_access SET field_token_hash=${hash}, field_token_created_at=NOW(), updated_at=NOW() WHERE id=${memberId}`;
      return NextResponse.json({ ok:true, fieldPath:`/landscape-help?token=${encodeURIComponent(token)}` });
    }

    if (body.action === "delete") {
      const memberId = String(body.memberId || "").trim();

      if (!memberId) {
        return NextResponse.json(
          { ok: false, error: "Missing Atlas user id." },
          { status: 400 },
        );
      }

      const existing = (await sql`
        SELECT id, email, role
        FROM atlas_team_access
        WHERE id = ${memberId}
        LIMIT 1
      `) as unknown as Array<{ id: string; email: string; role: string }>;

      if (!existing.length) {
        return NextResponse.json(
          { ok: false, error: "Atlas user not found." },
          { status: 404 },
        );
      }

      const existingEmail = String(existing[0].email || "").toLowerCase();
      const existingRole = normalizeRole(existing[0].role);
      if (
        memberId === "nick" ||
        existingEmail === "nthornton87@yahoo.com" ||
        existingRole === "master"
      ) {
        return NextResponse.json(
          { ok: false, error: "The Master account cannot be deleted." },
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
          expires_at,
          email_status
        )
        VALUES (
          ${hash},
          ${id},
          NOW() + INTERVAL '7 days',
          'Created'
        )
      `;

      const invitePath = `/invite?token=${token}`;
      const inviteUrl = new URL(invitePath, request.nextUrl.origin).toString();

      try {
        const emailMessageId = await sendInviteEmail({
          to: member.email.toLowerCase(),
          name: member.name,
          role: memberRole,
          inviteUrl,
        });

        await sql`
          UPDATE atlas_team_invites
          SET
            email_status = 'Sent',
            email_message_id = ${emailMessageId || null},
            email_sent_at = NOW(),
            email_error = NULL
          WHERE token_hash = ${hash}
        `;

        return NextResponse.json({
          ok: true,
          emailSent: true,
          inviteStatus: "Sent",
          email: member.email.toLowerCase(),
        });
      } catch (emailError) {
        const emailErrorMessage =
          emailError instanceof Error
            ? emailError.message
            : "Invitation email could not be sent.";

        await sql`
          UPDATE atlas_team_invites
          SET
            email_status = 'Failed',
            email_error = ${emailErrorMessage}
          WHERE token_hash = ${hash}
        `;

        return NextResponse.json(
          {
            ok: false,
            emailSent: false,
            inviteStatus: "Failed",
            error: emailErrorMessage,
          },
          { status: 502 },
        );
      }
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
