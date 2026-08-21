import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";

export const runtime = "nodejs";

const ADDISON_WORK_TOKEN =
  process.env.ADDISON_WORK_TOKEN ||
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    let validFieldEmployee = false;
    if (token && token !== ADDISON_WORK_TOKEN) {
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
      if (databaseUrl) {
        const sql = neon(databaseUrl);
        await sql`ALTER TABLE atlas_team_access ADD COLUMN IF NOT EXISTS field_token_hash text`;
        const hash = createHash("sha256").update(token).digest("hex");
        const rows = await sql`SELECT id FROM atlas_team_access WHERE field_token_hash=${hash} AND active=true AND role='employee' LIMIT 1`;
        validFieldEmployee = Boolean(rows[0]);
      }
    }
    if (token !== ADDISON_WORK_TOKEN && !validFieldEmployee) {
      return NextResponse.json({ error: "Invalid field work link." }, { status: 403 });
    }

    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("atlas-addison/") && !pathname.startsWith("atlas-field/")) {
          throw new Error("Invalid field upload path.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Addison photo upload failed." },
      { status: 400 },
    );
  }
}

