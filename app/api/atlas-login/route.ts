import { NextRequest, NextResponse } from "next/server";

type AtlasUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "master" | "admin";
};

function getUsers(): AtlasUser[] {
  return [
    {
      id: "atlas-master",
      name: "Nick Thornton",
      email: "nthornton87@yahoo.com",
      password: process.env.ATLAS_MASTER_PASSWORD || "",
      role: "master",
    },
    {
      id: "atlas-admin-steve",
      name: "Steve",
      email: "stevem@arcticmgnt.com",
      password: process.env.ATLAS_STEVE_PASSWORD || "",
      role: "admin",
    },
    {
      id: "atlas-admin-kenji",
      name: "Kenji",
      email: "kenjij@arcticmgnt.com",
      password: process.env.ATLAS_KENJI_PASSWORD || "",
      role: "admin",
    },
  ];
}

function createLoginResponse(user: AtlasUser) {
  const response = NextResponse.json({
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

  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("atlas_master_session", "active", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  response.cookies.set("atlas_user_email", user.email, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  response.cookies.set("atlas_user_role", user.role, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = String(body.email || body.Email || "")
    .trim()
    .toLowerCase();

  const password = String(body.password || body.Password || "");

  const user = getUsers().find(
    (item) =>
      item.password.length > 0 &&
      item.email.toLowerCase() === email &&
      item.password === password
  );

  if (!user) {
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

  return createLoginResponse(user);
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get("atlas_master_session")?.value;
  const email = req.cookies.get("atlas_user_email")?.value
    ?.trim()
    .toLowerCase();

  if (session !== "active" || !email) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
      },
      { status: 401 }
    );
  }

  const user = getUsers().find(
    (item) => item.email.toLowerCase() === email
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
