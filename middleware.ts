import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "atlas_session";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/login/")) return true;

  if (pathname === "/api/atlas-auth") return true;
  if (pathname.startsWith("/api/atlas-auth/")) return true;

  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;

  if (pathname === "/atlas-logo.png") return true;
  if (pathname === "/atlas-property-map.png") return true;

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Not logged in.",
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
