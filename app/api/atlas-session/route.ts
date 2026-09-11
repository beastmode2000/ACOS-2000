import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const role = String(request.headers.get("x-atlas-user-role") || "viewer")
    .trim()
    .toLowerCase();

  return NextResponse.json(
    {
      ok: true,
      role,
      isMaster: role === "master",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
