import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "atlas_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function hasShareToken(request: NextRequest) {
  return request.nextUrl.searchParams.has("token");
}

function redirectOldLandscapeTokenLink(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/landscape-help/")) return null;

  const token = pathname.replace("/landscape-help/", "").trim();
  if (!token || token.includes("/")) return null;

  const url = request.nextUrl.clone();
  url.pathname = "/landscape-help";
  url.search = "";
  url.searchParams.set("token", token);
  return NextResponse.redirect(url);
}

function isPublicPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/manifest.json") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/site.webmanifest") return true;
  if (pathname === "/sw.js") return true;
  if (pathname === "/atlas-icon-192.png") return true;
  if (pathname === "/atlas-icon-512.png") return true;
  if (pathname === "/apple-touch-icon.png") return true;

  if (pathname === "/login") return true;
  if (pathname === "/api/atlas-login") return true;
  if (pathname === "/api/atlas-logout") return true;

  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|json)$/i.test(pathname)) return true;

  if (pathname === "/landscape-help" && hasShareToken(request)) return true;
  if (pathname === "/api/landscape-help" && hasShareToken(request)) return true;

  return false;
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeText(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
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

async function verifySessionCookie(cookieValue: string | undefined, expectedUsername: string, secret: string) {
  if (!cookieValue) return false;

  const [payloadBase64, signature] = cookieValue.split(".");
  if (!payloadBase64 || !signature) return false;

  const expectedSignature = await signSessionPayload(payloadBase64, secret);
  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(base64UrlDecodeText(payloadBase64)) as { username?: string; expiresAt?: number };
    if (payload.username !== expectedUsername) return false;
    if (!payload.expiresAt || Date.now() > payload.expiresAt) return false;
    return true;
  } catch {
    return false;
  }
}

function getBasicAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice(6));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function createBasicAuthHeader(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const redirectedOldLandscapeLink = redirectOldLandscapeTokenLink(request);
  if (redirectedOldLandscapeLink) return redirectedOldLandscapeLink;

  if (isPublicPath(request)) return NextResponse.next();

  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse(
      "Atlas access is not configured. Add ATLAS_ACCESS_USERNAME and ATLAS_ACCESS_PASSWORD in Vercel environment variables.",
      { status: 500 }
    );
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const hasValidSession = await verifySessionCookie(sessionCookie, expectedUsername, expectedPassword);

  const basicAuth = getBasicAuth(request);
  const hasValidBasicAuth = basicAuth?.username === expectedUsername && basicAuth?.password === expectedPassword;

  if (hasValidSession || hasValidBasicAuth) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("authorization", createBasicAuthHeader(expectedUsername, expectedPassword));

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    if (hasValidBasicAuth && !hasValidSession) {
      const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
      const payloadBase64 = base64UrlEncodeText(JSON.stringify({ username: expectedUsername, expiresAt }));
      const signature = await signSessionPayload(payloadBase64, expectedPassword);
      response.cookies.set(SESSION_COOKIE, `${payloadBase64}.${signature}`, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      });
    }

    return response;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse("Atlas login required.", { status: 401 });
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
