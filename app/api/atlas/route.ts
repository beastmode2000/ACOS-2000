import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AtlasRole = "owner" | "admin" | "manager" | "tech" | "viewer";
type AtlasUserStatus = "pending" | "approved" | "disabled";

type AtlasUser = {
  id: string;
  email: string;
  displayName: string;
  role: AtlasRole;
  status: AtlasUserStatus;
  approvedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

type CurrentAuth = {
  user: AtlasUser;
  sessionToken: string;
};

type Sql = ReturnType<typeof neon>;

const COOKIE_NAME = "atlas_session";
const SESSION_DAYS = 30;

const allowedRoles: AtlasRole[] = ["owner", "admin", "manager", "tech", "viewer"];

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  return neon(connectionString);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase();
}

function isRole(value: unknown): value is AtlasRole {
  return typeof value === "string" && allowedRoles.includes(value as AtlasRole);
}

function cleanRole(value: unknown, fallback: AtlasRole = "viewer"): AtlasRole {
  return isRole(value) ? value : fallback;
}

function isAdmin(user: AtlasUser) {
  return user.role === "owner" || user.role === "admin";
}

function sanitizeUser(row: Record<string, unknown>): AtlasUser {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    displayName: String(row.display_name ?? ""),
    role: cleanRole(row.role),
    status: (String(row.status ?? "pending") as AtlasUserStatus) || "pending",
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  };
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

function validatePassword(password: string) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}

async function createSession(sql: Sql, userId: string) {
  const rows = await sql`
    INSERT INTO atlas_sessions (user_id)
    VALUES (${userId})
    RETURNING session_token, expires_at
  `;

  await sql`
    UPDATE atlas_users
    SET last_login_at = NOW()
    WHERE id = ${userId}
  `;

  return {
    token: String(rows[0]?.session_token ?? ""),
    expiresAt: String(rows[0]?.expires_at ?? ""),
  };
}

async function getCurrentUser(sql: Sql): Promise<CurrentAuth | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  const rows = await sql`
    SELECT
      u.id,
      u.email,
      u.display_name,
      u.role,
      u.status,
      u.approved_at,
      u.last_login_at,
      u.created_at
    FROM atlas_sessions s
    JOIN atlas_users u ON u.id = s.user_id
    WHERE s.session_token = ${sessionToken}
      AND s.expires_at > NOW()
      AND u.status = 'approved'
    LIMIT 1
  `;

  if (!rows.length) return null;

  return {
    user: sanitizeUser(rows[0] as Record<string, unknown>),
    sessionToken,
  };
}

async function requireAdmin(sql: Sql) {
  const current = await getCurrentUser(sql);

  if (!current) {
    return { current: null, response: fail("Not logged in.", 401) };
  }

  if (!isAdmin(current.user)) {
    return { current: null, response: fail("Admin access required.", 403) };
  }

  return { current, response: null };
}

async function bootstrapAdmin(sql: Sql, body: Record<string, unknown>) {
  const countRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM atlas_users
  `;

  const userCount = Number(countRows[0]?.count ?? 0);

  if (userCount > 0) {
    return fail("Atlas already has users. Log in or request access.", 409);
  }

  const email = normalizeEmail(body.email);
  const displayName = asString(body.displayName) || asString(body.display_name) || "Atlas Owner";
  const password = asString(body.password);

  if (!email) return fail("Email is required.");
  if (!displayName) return fail("Display name is required.");

  const passwordError = validatePassword(password);
  if (passwordError) return fail(passwordError);

  const rows = await sql`
    INSERT INTO atlas_users (
      email,
      display_name,
      role,
      status,
      password_hash,
      approved_at
    )
    VALUES (
      ${email},
      ${displayName},
      'owner',
      'approved',
      atlas_hash_password(${password}),
      NOW()
    )
    RETURNING
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at
  `;

  const user = sanitizeUser(rows[0] as Record<string, unknown>);
  const session = await createSession(sql, user.id);

  const response = NextResponse.json({
    ok: true,
    authenticated: true,
    setupRequired: false,
    user,
    message: "Owner account created.",
  });

  response.cookies.set(COOKIE_NAME, session.token, sessionCookieOptions());

  return response;
}

async function requestAccess(sql: Sql, body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const displayName = asString(body.displayName) || asString(body.display_name);
  const password = asString(body.password);
  const requestedRole = cleanRole(body.requestedRole || body.requested_role, "viewer");
  const message = asString(body.message);

  if (!email) return fail("Email is required.");
  if (!displayName) return fail("Display name is required.");

  const passwordError = validatePassword(password);
  if (passwordError) return fail(passwordError);

  const existingRows = await sql`
    SELECT id, email, display_name, role, status, approved_at, last_login_at, created_at
    FROM atlas_users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existingRows.length) {
    const existingUser = sanitizeUser(existingRows[0] as Record<string, unknown>);

    await sql`
      INSERT INTO atlas_invite_requests (
        email,
        display_name,
        requested_role,
        message,
        status
      )
      VALUES (
        ${email},
        ${displayName},
        ${requestedRole},
        ${message},
        'pending'
      )
    `;

    return NextResponse.json({
      ok: true,
      authenticated: false,
      status: existingUser.status,
      message:
        existingUser.status === "approved"
          ? "This account already exists. Log in instead."
          : "Access request saved.",
    });
  }

  await sql`
    INSERT INTO atlas_users (
      email,
      display_name,
      role,
      status,
      password_hash
    )
    VALUES (
      ${email},
      ${displayName},
      ${requestedRole},
      'pending',
      atlas_hash_password(${password})
    )
  `;

  await sql`
    INSERT INTO atlas_invite_requests (
      email,
      display_name,
      requested_role,
      message,
      status
    )
    VALUES (
      ${email},
      ${displayName},
      ${requestedRole},
      ${message},
      'pending'
    )
  `;

  return NextResponse.json({
    ok: true,
    authenticated: false,
    status: "pending",
    message: "Access request submitted. An approved Atlas admin must approve this account.",
  });
}

async function login(sql: Sql, body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const password = asString(body.password);

  if (!email) return fail("Email is required.");
  if (!password) return fail("Password is required.");

  const rows = await sql`
    SELECT
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at,
      atlas_check_password(${password}, password_hash) AS password_valid
    FROM atlas_users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (!rows.length || !rows[0]?.password_valid) {
    return fail("Invalid email or password.", 401);
  }

  const user = sanitizeUser(rows[0] as Record<string, unknown>);

  if (user.status === "pending") {
    return fail("This account is pending approval.", 403);
  }

  if (user.status === "disabled") {
    return fail("This account is disabled.", 403);
  }

  if (user.status !== "approved") {
    return fail("This account is not approved.", 403);
  }

  const session = await createSession(sql, user.id);

  const response = NextResponse.json({
    ok: true,
    authenticated: true,
    user,
    message: "Logged in.",
  });

  response.cookies.set(COOKIE_NAME, session.token, sessionCookieOptions());

  return response;
}

async function logout(sql: Sql) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;

  if (sessionToken) {
    await sql`
      DELETE FROM atlas_sessions
      WHERE session_token = ${sessionToken}
    `;
  }

  const response = NextResponse.json({
    ok: true,
    authenticated: false,
    message: "Logged out.",
  });

  response.cookies.set(COOKIE_NAME, "", clearCookieOptions());

  return response;
}

async function approveUser(sql: Sql, body: Record<string, unknown>) {
  const { current, response } = await requireAdmin(sql);
  if (response) return response;

  const userId = asString(body.userId) || asString(body.user_id);
  const role = cleanRole(body.role, "viewer");

  if (!userId) return fail("User ID is required.");

  const rows = await sql`
    UPDATE atlas_users
    SET
      status = 'approved',
      role = ${role},
      approved_at = COALESCE(approved_at, NOW())
    WHERE id = ${userId}
    RETURNING
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at
  `;

  if (!rows.length) {
    return fail("User not found.", 404);
  }

  const user = sanitizeUser(rows[0] as Record<string, unknown>);

  await sql`
    UPDATE atlas_invite_requests
    SET
      status = 'approved',
      reviewed_by = ${current?.user.id},
      reviewed_at = NOW()
    WHERE email = ${user.email}
      AND status = 'pending'
  `;

  return NextResponse.json({
    ok: true,
    user,
    message: "User approved.",
  });
}

async function denyUser(sql: Sql, body: Record<string, unknown>) {
  const { current, response } = await requireAdmin(sql);
  if (response) return response;

  const userId = asString(body.userId) || asString(body.user_id);

  if (!userId) return fail("User ID is required.");
  if (current?.user.id === userId) return fail("You cannot deny your own account.", 400);

  const rows = await sql`
    UPDATE atlas_users
    SET status = 'disabled'
    WHERE id = ${userId}
    RETURNING
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at
  `;

  if (!rows.length) {
    return fail("User not found.", 404);
  }

  const user = sanitizeUser(rows[0] as Record<string, unknown>);

  await sql`
    UPDATE atlas_invite_requests
    SET
      status = 'denied',
      reviewed_by = ${current?.user.id},
      reviewed_at = NOW()
    WHERE email = ${user.email}
      AND status = 'pending'
  `;

  await sql`
    DELETE FROM atlas_sessions
    WHERE user_id = ${userId}
  `;

  return NextResponse.json({
    ok: true,
    user,
    message: "User disabled.",
  });
}

async function disableUser(sql: Sql, body: Record<string, unknown>) {
  const { current, response } = await requireAdmin(sql);
  if (response) return response;

  const userId = asString(body.userId) || asString(body.user_id);

  if (!userId) return fail("User ID is required.");
  if (current?.user.id === userId) return fail("You cannot disable your own account.", 400);

  const rows = await sql`
    UPDATE atlas_users
    SET status = 'disabled'
    WHERE id = ${userId}
    RETURNING
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at
  `;

  if (!rows.length) {
    return fail("User not found.", 404);
  }

  await sql`
    DELETE FROM atlas_sessions
    WHERE user_id = ${userId}
  `;

  return NextResponse.json({
    ok: true,
    user: sanitizeUser(rows[0] as Record<string, unknown>),
    message: "User disabled.",
  });
}

async function changeRole(sql: Sql, body: Record<string, unknown>) {
  const { response } = await requireAdmin(sql);
  if (response) return response;

  const userId = asString(body.userId) || asString(body.user_id);
  const role = cleanRole(body.role, "viewer");

  if (!userId) return fail("User ID is required.");

  const rows = await sql`
    UPDATE atlas_users
    SET role = ${role}
    WHERE id = ${userId}
    RETURNING
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at
  `;

  if (!rows.length) {
    return fail("User not found.", 404);
  }

  return NextResponse.json({
    ok: true,
    user: sanitizeUser(rows[0] as Record<string, unknown>),
    message: "Role changed.",
  });
}

async function changePassword(sql: Sql, body: Record<string, unknown>) {
  const current = await getCurrentUser(sql);

  if (!current) {
    return fail("Not logged in.", 401);
  }

  const currentPassword = asString(body.currentPassword) || asString(body.current_password);
  const newPassword = asString(body.newPassword) || asString(body.new_password);

  if (!currentPassword) return fail("Current password is required.");

  const passwordError = validatePassword(newPassword);
  if (passwordError) return fail(passwordError);

  const rows = await sql`
    SELECT atlas_check_password(${currentPassword}, password_hash) AS password_valid
    FROM atlas_users
    WHERE id = ${current.user.id}
    LIMIT 1
  `;

  if (!rows.length || !rows[0]?.password_valid) {
    return fail("Current password is incorrect.", 401);
  }

  await sql`
    UPDATE atlas_users
    SET password_hash = atlas_hash_password(${newPassword})
    WHERE id = ${current.user.id}
  `;

  return NextResponse.json({
    ok: true,
    message: "Password changed.",
  });
}

async function adminResetPassword(sql: Sql, body: Record<string, unknown>) {
  const { response } = await requireAdmin(sql);
  if (response) return response;

  const userId = asString(body.userId) || asString(body.user_id);
  const newPassword = asString(body.newPassword) || asString(body.new_password);

  if (!userId) return fail("User ID is required.");

  const passwordError = validatePassword(newPassword);
  if (passwordError) return fail(passwordError);

  const rows = await sql`
    UPDATE atlas_users
    SET password_hash = atlas_hash_password(${newPassword})
    WHERE id = ${userId}
    RETURNING
      id,
      email,
      display_name,
      role,
      status,
      approved_at,
      last_login_at,
      created_at
  `;

  if (!rows.length) {
    return fail("User not found.", 404);
  }

  await sql`
    DELETE FROM atlas_sessions
    WHERE user_id = ${userId}
  `;

  return NextResponse.json({
    ok: true,
    user: sanitizeUser(rows[0] as Record<string, unknown>),
    message: "Password reset. User must log in again.",
  });
}

export async function GET() {
  try {
    const sql = getSql();

    const countRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM atlas_users
    `;

    const userCount = Number(countRows[0]?.count ?? 0);
    const current = await getCurrentUser(sql);

    if (!current) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        setupRequired: userCount === 0,
        hasUsers: userCount > 0,
      });
    }

    let users: AtlasUser[] = [];
    let inviteRequests: unknown[] = [];

    if (isAdmin(current.user)) {
      const userRows = await sql`
        SELECT
          id,
          email,
          display_name,
          role,
          status,
          approved_at,
          last_login_at,
          created_at
        FROM atlas_users
        ORDER BY created_at DESC
      `;

      users = userRows.map((row) => sanitizeUser(row as Record<string, unknown>));

      inviteRequests = await sql`
        SELECT
          id,
          email,
          display_name,
          requested_role,
          message,
          status,
          reviewed_by,
          reviewed_at,
          created_at
        FROM atlas_invite_requests
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      setupRequired: false,
      user: current.user,
      users,
      inviteRequests,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Atlas auth API failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asString(body.action);

    if (action === "bootstrap-admin") return bootstrapAdmin(sql, body);
    if (action === "request-access") return requestAccess(sql, body);
    if (action === "login") return login(sql, body);
    if (action === "logout") return logout(sql);
    if (action === "approve-user") return approveUser(sql, body);
    if (action === "deny-user") return denyUser(sql, body);
    if (action === "disable-user") return disableUser(sql, body);
    if (action === "change-role") return changeRole(sql, body);
    if (action === "change-password") return changePassword(sql, body);
    if (action === "admin-reset-password") return adminResetPassword(sql, body);

    return fail("Unknown auth action.", 400);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Atlas auth API failed.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const sql = getSql();
    return logout(sql);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Atlas logout failed.",
      },
      { status: 500 }
    );
  }
}
