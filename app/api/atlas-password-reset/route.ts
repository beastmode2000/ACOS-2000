import { neon } from "@neondatabase/serverless";
import { createHash, pbkdf2Sync, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESET_TTL_MINUTES = 30;
const RESET_RESPONSE =
  "If that email is connected to Atlas, a password reset link has been sent.";

const defaultUsers = [
  {
    id: "nick",
    name: "Nick Thornton",
    email: "nthornton87@yahoo.com",
    role: "master",
    propertyIds: ["2000", "6855", "3661", "hangar"],
  },
  {
    id: "steve",
    name: "Steve",
    email: "stevem@arcticmgnt.com",
    role: "administrator",
    propertyIds: ["2000"],
  },
  {
    id: "kenji",
    name: "Kenji",
    email: "kenjij@arcticmgnt.com",
    role: "administrator",
    propertyIds: ["2000"],
  },
];

type DatabaseRow = Record<string, unknown>;

function getSql() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Atlas database is not configured.");
  return neon(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function ensureTables(sql: ReturnType<typeof getSql>) {
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
  await sql`ALTER TABLE atlas_team_access ADD COLUMN IF NOT EXISTS password_hash text`;
  await sql`ALTER TABLE atlas_team_access ADD COLUMN IF NOT EXISTS password_salt text`;
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
    CREATE TABLE IF NOT EXISTS atlas_password_resets (
      token_hash text PRIMARY KEY,
      email text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      requested_ip text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS atlas_password_resets_email_created_idx
    ON atlas_password_resets(email, created_at DESC)
  `;
  await sql`
    DELETE FROM atlas_password_resets
    WHERE expires_at < NOW() - INTERVAL '7 days'
       OR used_at < NOW() - INTERVAL '7 days'
  `;
}

async function sendResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATLAS_INVITE_FROM;
  if (!apiKey || !from) {
    throw new Error("Atlas password-reset email is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `atlas-password-reset-${createHash("sha256")
        .update(`${input.to}|${input.resetUrl}`)
        .digest("hex")}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: process.env.ATLAS_INVITE_REPLY_TO || undefined,
      subject: "Reset your Atlas password",
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
                <h1 style="margin:0 0 14px;font-size:24px;color:#071b2f;">Reset your password</h1>
                <p style="font-size:16px;line-height:1.55;margin:0 0 18px;">Hello ${escapeHtml(input.name)},</p>
                <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#c99a3d;color:#071b2f;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:10px;">Reset Atlas Password</a>
                <p style="font-size:13px;line-height:1.5;color:#64748b;margin:22px 0 0;">This secure link expires in ${RESET_TTL_MINUTES} minutes and can be used once. If you did not request it, you can ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${input.name},\n\nReset your Atlas password: ${input.resetUrl}\n\nThis secure link expires in ${RESET_TTL_MINUTES} minutes and can be used once.`,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: { message?: string };
    };
    throw new Error(
      payload.message || payload.error?.message || "Reset email could not be sent.",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      email?: string;
      token?: string;
      password?: string;
    };
    const action = String(body.action || "request");
    const sql = getSql();
    await ensureTables(sql);

    if (action === "request") {
      const email = String(body.email || "").trim().toLowerCase().slice(0, 320);
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
      }

      const requestedIp = String(
        request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
      ).split(",")[0].trim().slice(0, 120);
      const recentRows = (await sql`
        SELECT
          COUNT(*) FILTER (WHERE email = ${email})::int AS email_count,
          COUNT(*) FILTER (WHERE requested_ip = ${requestedIp} AND ${requestedIp} <> '')::int AS ip_count
        FROM atlas_password_resets
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `) as unknown as DatabaseRow[];
      if (Number(recentRows[0]?.email_count || 0) >= 5 || Number(recentRows[0]?.ip_count || 0) >= 20) {
        return NextResponse.json({ ok: true, message: RESET_RESPONSE });
      }

      const accountRows = (await sql`
        SELECT id, name, email, role, active, property_ids
        FROM atlas_team_access
        WHERE lower(email) = ${email}
        LIMIT 1
      `) as unknown as DatabaseRow[];
      let account = accountRows[0];
      const defaultUser = defaultUsers.find((user) => user.email === email);

      if (!account && defaultUser) {
        const inserted = (await sql`
          INSERT INTO atlas_team_access (id, name, email, role, active, property_ids)
          VALUES (
            ${defaultUser.id},
            ${defaultUser.name},
            ${defaultUser.email},
            ${defaultUser.role},
            true,
            ${defaultUser.propertyIds}
          )
          ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
          RETURNING id, name, email, role, active, property_ids
        `) as unknown as DatabaseRow[];
        account = inserted[0];
      }

      if (!account || account.active === false) {
        return NextResponse.json({ ok: true, message: RESET_RESPONSE });
      }

      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString();
      const resetUrl = `${request.nextUrl.origin}/reset-password?token=${encodeURIComponent(token)}`;

      await sql`
        UPDATE atlas_password_resets
        SET used_at = NOW()
        WHERE email = ${email} AND used_at IS NULL
      `;
      await sql`
        INSERT INTO atlas_password_resets (
          token_hash, email, expires_at, requested_ip
        ) VALUES (
          ${tokenHash}, ${email}, ${expiresAt}::timestamptz, ${requestedIp}
        )
      `;

      try {
        await sendResetEmail({
          to: email,
          name: String(account.name || "Atlas user"),
          resetUrl,
        });
      } catch (error) {
        await sql`DELETE FROM atlas_password_resets WHERE token_hash = ${tokenHash}`;
        throw error;
      }

      return NextResponse.json({ ok: true, message: RESET_RESPONSE });
    }

    if (action === "complete") {
      const token = String(body.token || "");
      const password = String(body.password || "");
      if (token.length < 40 || token.length > 200) {
        return NextResponse.json({ ok: false, error: "This reset link is invalid or expired." }, { status: 400 });
      }
      if (password.length < 10 || password.length > 200) {
        return NextResponse.json({ ok: false, error: "Use a password with at least 10 characters." }, { status: 400 });
      }

      const tokenHash = createHash("sha256").update(token).digest("hex");
      const resetRows = (await sql`
        SELECT email
        FROM atlas_password_resets
        WHERE token_hash = ${tokenHash}
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `) as unknown as DatabaseRow[];
      const email = String(resetRows[0]?.email || "").toLowerCase();
      if (!email) {
        return NextResponse.json({ ok: false, error: "This reset link is invalid or expired." }, { status: 400 });
      }

      const salt = randomBytes(16).toString("hex");
      const passwordHash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
      const updatedRows = (await sql`
        UPDATE atlas_team_access
        SET password_hash = ${passwordHash},
            password_salt = ${salt},
            active = true,
            updated_at = NOW()
        WHERE lower(email) = ${email}
        RETURNING id
      `) as unknown as DatabaseRow[];
      if (!updatedRows.length) {
        return NextResponse.json({ ok: false, error: "This Atlas account is no longer available." }, { status: 400 });
      }

      await sql`
        UPDATE atlas_password_resets
        SET used_at = NOW()
        WHERE email = ${email} AND used_at IS NULL
      `;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid reset request." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Password reset could not be completed.",
      },
      { status: 500 },
    );
  }
}

