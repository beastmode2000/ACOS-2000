import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const response = await handleUpload({
      request,
      body,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
        multipart,
      ) => {
        if (!pathname || typeof pathname !== "string") {
          throw new Error("No valid file name was provided.");
        }

        console.log("Atlas Blob upload token requested:", {
          pathname,
          clientPayload,
          multipart,
        });

        return {
          allowedContentTypes: [
            "application/pdf",

            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
            "image/svg+xml",

            "text/plain",
            "text/csv",

            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",

            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
          ],

          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: clientPayload || undefined,
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Atlas Blob upload completed:", {
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          tokenPayload,
        });
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Atlas document upload failed.";

    console.error("Atlas document Blob route failed:", error);

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
