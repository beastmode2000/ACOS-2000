import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADDISON_WORK_TOKEN =
  process.env.ADDISON_WORK_TOKEN ||
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== ADDISON_WORK_TOKEN) {
      return NextResponse.json({ error: "Invalid Addison link." }, { status: 403 });
    }

    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("atlas-addison/2000/")) {
          throw new Error("Invalid Addison upload path.");
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

