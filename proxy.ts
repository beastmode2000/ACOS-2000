import { NextRequest, NextResponse } from "next/server"

const OWNER_EMAIL = "nickt@arcticmgnt.com"

function askForLogin() {
  return new NextResponse("Atlas login required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Atlas 2000"',
    },
  })
}

export function proxy(request: NextRequest) {
  const key = process.env.ACOS_OWNER_SETUP_KEY
  const auth = request.headers.get("authorization")

  if (!key) {
    return new NextResponse("Missing owner setup key", { status: 500 })
  }

  if (!auth) {
    return askForLogin()
  }

  const [type, value] = auth.split(" ")

  if (type !== "Basic" || !value) {
    return askForLogin()
  }

  const decoded = atob(value)
  const splitAt = decoded.indexOf(":")

  if (splitAt === -1) {
    return askForLogin()
  }

  const email = decoded.slice(0, splitAt).trim().toLowerCase()
  const password = decoded.slice(splitAt + 1)

  if (email === OWNER_EMAIL && password === key) {
    return NextResponse.next()
  }

  return askForLogin()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
