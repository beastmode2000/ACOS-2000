import { NextRequest, NextResponse } from "next/server";

const USERS = [
  {
    id: "atlas-master",
    name: "Nick Thornton",
    email: "nthornton87@yahoo.com",
    password: "Atlas2000Temp!",
    role: "master",
  },
  {
    id: "atlas-admin-kenji",
    name: "Kenji",
    email: "kenjij@arcticmgnt.com",
    password: "KenjiAtlas2026!",
    role: "admin",
  },
];

function createLoginResponse(user: (typeof USERS)[number]) {
  const res = NextResponse.json({
    ok: true,
    success: true,
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
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

  res.cookies.set("atlas_user_email", user.email, {
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  res.cookies.set("atlas_user_role", user.role, {
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

  const email = String(body.email || body.Email || "")
    .trim()
    .toLowerCase();

  const password = String(body.password || body.Password || "");

  const user = USERS.find(
    (item) =>
      item.email.toLowerCase() === email &&
      item.password === password
  );

  if (user) {
    return createLoginResponse(user);
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

export async function GET(req: NextRequest) {
  const session = req.cookies.get("atlas_master_session")?.value;
  const email = req.cookies.get("atlas_user_email")?.value;

  if (session !== "active" || !email) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
      },
      { status: 401 }
    );
  }

  const user = USERS.find(
    (item) => item.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    success: true,
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approved: true,
    },
  });
}
