import { NextRequest, NextResponse } from "next/server"

const OWNER_EMAIL = "nickt@arcticmgnt.com"

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Atlas 2000"',
    },
  })
}

export function proxy(request: NextRequest) {
  const setupKey = process.env.ACOS_OWNER_SETUP_KEY

  if (!setupKey) {
    return new NextResponse("Atlas owner key is not configured.", {
      status: 500,
    })
  }

  const authHeader = request.headers.get("authorization")

  if (!authHeader) {
    return unauthorized()
  }

  const [scheme, encoded] = authHeader.split(" ")

  if (scheme !== "Basic" || !encoded) {
    return unauthorized()
  }

  try {
    const decoded = atob(encoded)
    const separatorIndex = decoded.indexOf(":")

    if (separatorIndex === -1) {
      return unauthorized()
    }

    const username = decoded.slice(0, separatorIndex).trim().toLowerCase()
    const password = decoded.slice(separatorIndex + 1)

    if (username === OWNER_EMAIL && password === setupKey) {
      return NextResponse.next()
    }

    return unauthorized()
  } catch {
    return unauthorized()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
