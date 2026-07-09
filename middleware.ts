import { NextRequest, NextResponse } from "next/server";

function hasShareToken(request: NextRequest) {
  return request.nextUrl.searchParams.has("token");
}

function isPublicPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/manifest.json") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/site.webmanifest") return true;

  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt)$/i.test(pathname)) {
    return true;
  }

  // Public crew page ONLY with token:
  // /landscape-help?token=REAL_TOKEN
  if (pathname === "/landscape-help" && hasShareToken(request)) {
    return true;
  }

  // Public crew API ONLY with token:
  // /api/landscape-help?token=REAL_TOKEN
  if (pathname === "/api/landscape-help" && hasShareToken(request)) {
    return true;
  }

  return false;
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

function unauthorizedResponse() {
  return new NextResponse("Atlas login required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Atlas 2000", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  if (isPublicPath(request)) {
    return NextResponse.next();
  }

  const expectedUsername = process.env.ATLAS_ACCESS_USERNAME || "";
  const expectedPassword = process.env.ATLAS_ACCESS_PASSWORD || "";

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse(
      "Atlas access is not configured. Add ATLAS_ACCESS_USERNAME and ATLAS_ACCESS_PASSWORD in Vercel environment variables.",
      { status: 500 }
    );
  }

  const auth = getBasicAuth(request);

  if (!auth) {
    return unauthorizedResponse();
  }

  if (auth.username !== expectedUsername || auth.password !== expectedPassword) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
