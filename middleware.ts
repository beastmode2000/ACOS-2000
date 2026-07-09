import { NextRequest, NextResponse } from "next/server";

function hasShareToken(request: NextRequest) {
  return request.nextUrl.searchParams.has("token");
}

function redirectOldLandscapeTokenLink(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Old/bad format:
  // /landscape-help/REAL_TOKEN
  //
  // Redirect to correct format:
  // /landscape-help?token=REAL_TOKEN
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

  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt)$/i.test(pathname)) {
    return true;
  }

  // Correct public crew page:
  // /landscape-help?token=REAL_TOKEN
  if (pathname === "/landscape-help" && hasShareToken(request)) {
    return true;
  }

  // Correct public crew API:
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
  const redirectedOldLandscapeLink = redirectOldLandscapeTokenLink(request);

  if (redirectedOldLandscapeLink) {
    return redirectedOldLandscapeLink;
  }

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
