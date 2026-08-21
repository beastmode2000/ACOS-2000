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
    const token = String(url.searchParams.get("token") || "");
    let fieldWorker: { id: string; propertyId: string } | null = null;
    if (token !== ADDISON_WORK_TOKEN) {
      const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
      if (!databaseUrl) return NextResponse.json({ error: "Field upload is not configured." }, { status: 500 });
      const sql = neon(databaseUrl);
      const hash = createHash("sha256").update(token).digest("hex");
      const rows = await sql`SELECT id, active, role, property_ids, field_property_id FROM atlas_team_access WHERE field_token_hash=${hash} LIMIT 1`;
      const row = rows[0] as any;
      if (!row || row.active === false || String(row.role || "").toLowerCase() !== "employee") {
        return NextResponse.json({ error: "Invalid employee link." }, { status: 403 });
      }
      const properties = Array.isArray(row.property_ids) ? row.property_ids.map(String) : ["2000"];
      const propertyId = properties.includes(String(row.field_property_id || "")) ? String(row.field_property_id) : properties[0] || "2000";
      fieldWorker = { id: String(row.id), propertyId };
    }

    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const validPath = token === ADDISON_WORK_TOKEN
          ? pathname.startsWith("atlas-addison/2000/")
          : Boolean(fieldWorker && pathname.startsWith(`atlas-field/${fieldWorker.propertyId}/${fieldWorker.id}/`));
        if (!validPath) throw new Error("Invalid field upload path.");
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
      { error: error instanceof Error ? error.message : "Field photo upload failed." },
      { status: 400 },
    );
  }
}
