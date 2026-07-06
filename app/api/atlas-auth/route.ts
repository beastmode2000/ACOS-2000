import { NextRequest, NextResponse } from "next/server";

const MASTER_EMAIL = "nthornton87@yahoo.com";
const MASTER_PASSWORD = "Atlas2000Temp!";

function okResponse() {
  const res = NextResponse.json({
    ok: true,
    success: true,
    authenticated: true,
    message: "MASTER_LOGIN_READY",
    user: {
      id: "atlas-master",
      name: "Nick Thornton",
      email: MASTER_EMAIL,
      role: "master",
      approved: true,
    },
  });

  res.cookies.set("atlas_master_session", "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  res.cookies.set("atlas_user_email", MASTER_EMAIL, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}

export async function POST(req: NextRequest) {
  let body: any = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = String(body.email || body.Email || "").trim().toLowerCase();
  const password = String(body.password || body.Password || "");

  if (email === MASTER_EMAIL.toLowerCase() && password === MASTER_PASSWORD) {
    return okResponse();
  }

  return NextResponse.json(
    {
      ok: false,
      success: false,
      authenticated: false,
      error: "Invalid email or password.",
    },
    { status: 401 }
  );
}

export async function GET() {
  return okResponse();
}
