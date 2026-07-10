import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_REDIRECTS = 5;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function isPrivateAddress(address: string): boolean {
  if (
    address === "::1" ||
    address === "0.0.0.0" ||
    address === "127.0.0.1"
  ) {
    return true;
  }

  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function assertSafePublicUrl(url: URL) {
  if (url.protocol !== "https:") {
    throw new Error("Atlas can only import images from secure HTTPS links.");
  }

  if (url.username || url.password) {
    throw new Error("That image URL is not allowed.");
  }

  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("That image URL is not public.");
  }

  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw new Error("That image URL points to a private network.");
  }

  const addresses = await lookup(url.hostname, {
    all: true,
    verbatim: true,
  });

  if (
    !addresses.length ||
    addresses.some((entry) => isPrivateAddress(entry.address))
  ) {
    throw new Error("That image URL could not be safely verified.");
  }
}

async function fetchPublicImage(startUrl: URL) {
  let current = startUrl;

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    await assertSafePublicUrl(current);

    const response = await fetch(current, {
      method: "GET",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
        Referer: `${current.protocol}//${current.hostname}/`,
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();

      if (!location) {
        throw new Error(
          "The image link redirected without a destination.",
        );
      }

      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `The image source returned HTTP ${response.status}.`,
      );
    }

    return { response, finalUrl: current };
  }

  throw new Error("The image link redirected too many times.");
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim() || "";

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return new NextResponse("That copied image link is not valid.", {
      status: 400,
    });
  }

  try {
    const { response } = await fetchPublicImage(url);
    const contentType = (
      response.headers.get("content-type") || ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!contentType.startsWith("image/")) {
      await response.body?.cancel();
      return new NextResponse(
        "The copied link did not return an image. Use Copy image instead of Copy link.",
        { status: 415 },
      );
    }

    const contentLength = Number(
      response.headers.get("content-length") || "0",
    );

    if (contentLength > MAX_IMAGE_BYTES) {
      await response.body?.cancel();
      return new NextResponse(
        "That image is too large for Atlas to import.",
        { status: 413 },
      );
    }

    const bytes = await response.arrayBuffer();

    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return new NextResponse(
        "That image is too large for Atlas to import.",
        { status: 413 },
      );
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error
        ? error.message
        : "Atlas could not import that copied image.",
      { status: 502 },
    );
  }
}
