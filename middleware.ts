import { NextRequest, NextResponse } from "next/server";

const REALM = "Atlas Private";

function unauthorized() {
  return new NextResponse("Atlas is private. Authorization required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

function protectionNotConfigured() {
  return new NextResponse("Atlas protection is not configured.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(request: NextRequest) {
  const requiredUsername = process.env.ATLAS_SITE_USERNAME;
  const requiredPassword = process.env.ATLAS_SITE_PASSWORD;

  if (!requiredUsername || !requiredPassword) {
    return protectionNotConfigured();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const encodedCredentials = authHeader.replace("Basic ", "");
    const decodedCredentials = atob(encodedCredentials);

    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex === -1) {
      return unauthorized();
    }

    const submittedUsername = decodedCredentials.slice(0, separatorIndex);
    const submittedPassword = decodedCredentials.slice(separatorIndex + 1);

    if (
      submittedUsername === requiredUsername &&
      submittedPassword === requiredPassword
    ) {
      return NextResponse.next();
    }

    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: "/:path*",
};
