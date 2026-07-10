import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REDIRECTS = 5;
const MAX_ALLOWED_BYTES = 30 * 1024 * 1024;

function isPrivateAddress(address: string): boolean {
  if (address === "::1" || address === "0.0.0.0" || address === "127.0.0.1") return true;

  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
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

async function assertSafeUrl(url: URL) {
  if (url.protocol !== "https:") throw new Error("Atlas only saves manuals from secure HTTPS links.");
  if (url.username || url.password) throw new Error("That manual URL is not allowed.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("That manual URL is not public.");
  }

  if (isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw new Error("That manual URL points to a private network.");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("That manual URL could not be safely verified.");
  }
}

function fileNameFromUrl(url: URL): string {
  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "manual.pdf");
  const cleaned = last.replace(/[^a-zA-Z0-9._()\- ]/g, "_");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned || "manual"}.pdf`;
}

async function fetchPdfMetadata(startUrl: URL) {
  let current = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertSafeUrl(current);

    const response = await fetch(current, {
      method: "GET",
      headers: {
        Accept: "application/pdf,*/*;q=0.5",
        Range: "bytes=0-1023",
        "User-Agent": "AtlasManualVerifier/1.0",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The manual link redirected without a destination.");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok && response.status !== 206) {
      throw new Error(`The manual source returned HTTP ${response.status}.`);
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const contentLength = Number(response.headers.get("content-length") || "0");
    const contentRange = response.headers.get("content-range") || "";
    const rangeTotal = Number(contentRange.match(/\/(\d+)$/)?.[1] || "0");
    const sizeBytes = rangeTotal || contentLength || 0;

    if (sizeBytes > MAX_ALLOWED_BYTES) {
      await response.body?.cancel();
      throw new Error("That PDF is larger than Atlas currently allows (30 MB). ");
    }

    const reader = response.body?.getReader();
    const firstChunk = reader ? await reader.read() : { value: undefined, done: true };
    await reader?.cancel();
    const bytes = firstChunk.value || new Uint8Array();
    const magic = new TextDecoder("latin1").decode(bytes.slice(0, 5));
    const looksLikePdf = magic === "%PDF-";

    if (!contentType.includes("application/pdf") && !looksLikePdf && !current.pathname.toLowerCase().endsWith(".pdf")) {
      throw new Error("That link is not a direct PDF manual. Ask Atlas for another result.");
    }

    return {
      url: current.toString(),
      contentType: "application/pdf",
      fileName: fileNameFromUrl(current),
      sizeBytes,
    };
  }

  throw new Error("The manual link redirected too many times.");
}

export async function POST(request: NextRequest) {
  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "The request was not valid JSON." }, { status: 400 });
  }

  const rawUrl = String(body.url ?? "").trim();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "That manual URL is not valid." }, { status: 400 });
  }

  try {
    const metadata = await fetchPdfMetadata(url);
    return NextResponse.json({ ok: true, ...metadata });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Atlas could not verify that manual.",
      },
      { status: 400 },
    );
  }
}
