import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SESSION_COOKIE = "atlas_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

async function signSessionPayload(payloadBase64: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadBase64));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function safeNextPath(next: unknown) {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next.startsWith("/login")) return "/";
  return next;
}

export async function POST(request: NextRequest) {
  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      { error: "Atlas login is not configured." },
      { status: 500 }
    );
  }

  let body: {
    username?: string;
    password?: string;
    next?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid login request." },
      { status: 400 }
    );
  }

  const username = body.username || "";
  const password = body.password || "";

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payloadBase64 = base64UrlEncodeText(
    JSON.stringify({
      username: expectedUsername,
      expiresAt,
    })
  );

  const signature = await signSessionPayload(payloadBase64, expectedPassword);
  const sessionValue = `${payloadBase64}.${signature}`;

  const response = NextResponse.json({
    ok: true,
    next: safeNextPath(body.next),
  });

  response.cookies.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
