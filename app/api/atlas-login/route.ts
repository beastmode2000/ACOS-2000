import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const SESSION_COOKIE = "atlas_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;

type AtlasUser = {
  name: string;
  email: string;
  password: string;
  role: "master" | "administrator" | "operations" | "viewer";
};

function getUsers(): AtlasUser[] {
  return [
    {
      name: "Nick Thornton",
      email: "nthornton87@yahoo.com",
      password: process.env.ATLAS_MASTER_PASSWORD || "",
      role: "master",
    },
    {
      name: "Steve",
      email: "stevem@arcticmgnt.com",
      password: process.env.ATLAS_STEVE_PASSWORD || "",
      role: "administrator",
    },
    {
      name: "Kenji",
      email: "kenjij@arcticmgnt.com",
      password: process.env.ATLAS_KENJI_PASSWORD || "",
      role: "administrator",
    },
  ];
}

async function loadSavedAccess(user: AtlasUser) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!url) return user;
  try {
    const sql = neon(url);
    const rows = await sql`SELECT role, active FROM atlas_team_access WHERE lower(email) = ${user.email.toLowerCase()} LIMIT 1`;
    const row = rows[0] as { role?: AtlasUser["role"]; active?: boolean } | undefined;
    if (row?.active === false) return null;
    return row?.role ? { ...user, role: row.role } : user;
  } catch {
    return user;
  }
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

async function signSessionPayload(payloadBase64: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadBase64)
  );

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

export async function POST(request: NextRequest) {
  const sessionUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const sessionSecret = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!sessionUsername || !sessionSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atlas access is not configured.",
      },
      { status: 500 }
    );
  }

  let body: {
    username?: string;
    email?: string;
    password?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid login request.",
      },
      { status: 400 }
    );
  }

  const login = String(body.username || body.email || "")
    .trim()
    .toLowerCase();

  const password = String(body.password || "");

  const matchedUser = getUsers().find(
    (item) =>
      item.password.length > 0 &&
      item.email.toLowerCase() === login &&
      item.password === password
  );

  const user = matchedUser ? await loadSavedAccess(matchedUser) : null;
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid Atlas login.",
      },
      { status: 401 }
    );
  }

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  const payloadBase64 = base64UrlEncodeText(
    JSON.stringify({
      username: sessionUsername,
      email: user.email,
      role: user.role,
      expiresAt,
    })
  );

  const signature = await signSessionPayload(
    payloadBase64,
    sessionSecret
  );

  const response = NextResponse.json({
    ok: true,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  response.cookies.set(
    SESSION_COOKIE,
    `${payloadBase64}.${signature}`,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    }
  );

  return response;
}
