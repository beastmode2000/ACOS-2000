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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendInviteEmail(input: {
  to: string;
  name: string;
  role: string;
  inviteUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATLAS_INVITE_FROM;
  if (!apiKey || !from) {
    throw new Error("Atlas invitation email is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `atlas-member-invite-${createHash("sha256")
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
                <p style="font-size:13px;line-height:1.5;color:#64748b;margin:22px 0 0;">This secure invitation expires in 7 days.</p>
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
      payload.message || payload.error?.message || "Invitation email could not be sent.",
    );
  }

  return String(payload.id || "");
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

    const body = (await request.json()) as { memberId?: string; sendEmail?: boolean };
    const memberId = String(body.memberId || "").trim();
    if (!memberId) {
      return NextResponse.json({ ok: false, error: "Missing team member." }, { status: 400 });
    }

    const sql = getSql();
    const rows = (await sql`
      SELECT id, name, email, role, password_hash
      FROM atlas_team_access
      WHERE id = ${memberId}
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      name: string;
      email: string;
      role: string;
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

    await sql`
      UPDATE atlas_team_invites
      SET used_at = NOW()
      WHERE member_id = ${member.id} AND used_at IS NULL
    `;

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
        ${body.sendEmail ? "Not Sent" : "Created"},
        NOW()
      )
    `;

    const invitePath = `/invite?token=${token}`;
    const inviteUrl = new URL(invitePath, request.nextUrl.origin).toString();

    if (!body.sendEmail) {
      return NextResponse.json({
        ok: true,
        invitePath,
        expiresInDays: 7,
        emailSent: false,
      });
    }

    try {
      const messageId = await sendInviteEmail({
        to: member.email.toLowerCase(),
        name: member.name,
        role: normalizeRole(member.role),
        inviteUrl,
      });

      await sql`
        UPDATE atlas_team_invites
        SET email_status = 'Sent',
            email_message_id = ${messageId || null},
            email_sent_at = NOW(),
            email_error = NULL
        WHERE token_hash = ${tokenHash}
      `;

      return NextResponse.json({
        ok: true,
        invitePath,
        expiresInDays: 7,
        emailSent: true,
      });
    } catch (error) {
      const emailError = error instanceof Error ? error.message : "Invitation email could not be sent.";
      await sql`
        UPDATE atlas_team_invites
        SET email_status = 'Failed', email_error = ${emailError}
        WHERE token_hash = ${tokenHash}
      `;

      return NextResponse.json({
        ok: true,
        invitePath,
        expiresInDays: 7,
        emailSent: false,
        emailError,
      });
    }
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
