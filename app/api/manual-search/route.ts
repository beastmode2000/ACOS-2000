import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 35;

type ManualSearchRequest = {
  query?: unknown;
  asset?: unknown;
};

type ManualCandidate = {
  title: string;
  manufacturer: string;
  model: string;
  url: string;
  sourceDomain: string;
  sourceLabel: string;
  confidence: "High" | "Medium" | "Low";
  reason: string;
  assetId?: string;
  assetName?: string;
};

type UrlCitation = {
  type?: string;
  url?: string;
  title?: string;
};

type OpenAIContent = {
  type?: string;
  text?: string;
  annotations?: UrlCitation[];
};

type WebSource = {
  type?: string;
  url?: string;
  title?: string;
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAIContent[];
  action?: { sources?: WebSource[] };
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

type CacheEntry = {
  expiresAt: number;
  answer: string;
  manuals: ManualCandidate[];
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function extractOutputText(payload: OpenAIResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function cleanJson(text: string): unknown | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeManual(
  value: unknown,
  fallbackAsset?: Record<string, unknown> | null,
): ManualCandidate | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const url = String(item.url || "").trim();
  if (!/^https:\/\//i.test(url)) return null;

  let sourceDomain = "";
  try {
    sourceDomain = new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }

  const title = String(item.title || "").trim();
  if (!title) return null;

  const confidenceText = String(item.confidence || "Medium");
  const confidence: ManualCandidate["confidence"] =
    confidenceText === "High" || confidenceText === "Low"
      ? confidenceText
      : "Medium";

  return {
    title,
    manufacturer: String(
      item.manufacturer || fallbackAsset?.make || "",
    ).trim(),
    model: String(item.model || fallbackAsset?.model || "").trim(),
    url,
    sourceDomain,
    sourceLabel:
      String(item.sourceLabel || "").trim() || sourceDomain,
    confidence,
    reason:
      String(item.reason || "").trim() ||
      "Review the document title and model before saving.",
    assetId: String(item.assetId || fallbackAsset?.id || "").trim() || undefined,
    assetName:
      String(item.assetName || fallbackAsset?.name || "").trim() || undefined,
  };
}

function extractSources(payload: OpenAIResponsePayload): WebSource[] {
  const sources: WebSource[] = [];

  for (const item of payload.output || []) {
    for (const source of item.action?.sources || []) {
      if (source.url) sources.push(source);
    }

    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.type === "url_citation" && annotation.url) {
          sources.push({
            type: "url_citation",
            url: annotation.url,
            title: annotation.title,
          });
        }
      }
    }
  }

  return sources;
}

function sourceFallback(
  payload: OpenAIResponsePayload,
  asset?: Record<string, unknown> | null,
): ManualCandidate[] {
  const seen = new Set<string>();
  const results: ManualCandidate[] = [];

  for (const source of extractSources(payload)) {
    const url = String(source.url || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    try {
      const parsed = new URL(url);
      const sourceDomain = parsed.hostname.replace(/^www\./i, "");
      const fileName = decodeURIComponent(
        parsed.pathname.split("/").filter(Boolean).pop() || "",
      )
        .replace(/\.pdf$/i, "")
        .replace(/[-_]+/g, " ")
        .trim();

      const directPdf = /\.pdf(?:$|\?)/i.test(url);
      const candidate: ManualCandidate = {
        title:
          String(source.title || "").trim() ||
          fileName ||
          "Official equipment documentation",
        manufacturer: String(asset?.make || "").trim(),
        model: String(asset?.model || "").trim(),
        url,
        sourceDomain,
        sourceLabel: sourceDomain,
        confidence: directPdf ? "High" : "Medium",
        reason: directPdf
          ? "Direct PDF source returned by the live manufacturer search."
          : "Official documentation source returned by the live web search.",
        assetId: String(asset?.id || "").trim() || undefined,
        assetName: String(asset?.name || "").trim() || undefined,
      };

      results.push(candidate);
    } catch {
      // Ignore invalid source URLs.
    }
  }

  return results
    .sort((a, b) => Number(/\.pdf(?:$|\?)/i.test(b.url)) - Number(/\.pdf(?:$|\?)/i.test(a.url)))
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Manual Finder is not connected. Add OPENAI_API_KEY in Vercel and redeploy.",
      },
      { status: 503 },
    );
  }

  let body: ManualSearchRequest;
  try {
    body = (await request.json()) as ManualSearchRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "The request was not valid JSON." },
      { status: 400 },
    );
  }

  const query = String(body.query || "").trim();
  const asset =
    body.asset && typeof body.asset === "object"
      ? (body.asset as Record<string, unknown>)
      : null;

  if (!query) {
    return NextResponse.json(
      { ok: false, error: "Enter the equipment manufacturer and model." },
      { status: 400 },
    );
  }

  const cacheKey = JSON.stringify({
    query: query.toLowerCase(),
    make: asset?.make || "",
    model: asset?.model || "",
  });
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      ok: true,
      answer: cached.answer,
      manuals: cached.manuals,
      cached: true,
    });
  }

  const equipment = [
    asset?.make,
    asset?.model,
    asset?.name,
    query,
  ]
    .filter(Boolean)
    .join(" ");

  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: `You are Manual Finder inside Atlas.

Search the live web for official manufacturer documentation for the exact equipment supplied.

Priorities:
1. Exact manufacturer and model match.
2. Official manufacturer domain.
3. Direct public PDF for owner, user, installation, service, or technical documentation.
4. Return no more than 3 strongest results.

Do not use scraped manual repositories, retailers, social sites, or unrelated models when an official manufacturer source exists. Never invent a URL or document title.

Return only JSON:
{
  "answer": "one short sentence",
  "manuals": [
    {
      "title": "document title",
      "manufacturer": "manufacturer",
      "model": "model",
      "url": "https URL",
      "sourceLabel": "official source",
      "confidence": "High or Medium or Low",
      "reason": "one short reason",
      "assetId": "Atlas asset id or empty string",
      "assetName": "Atlas asset name or empty string"
    }
  ]
}`,
        input: `EQUIPMENT\n${equipment}\n\nATLAS ASSET\n${JSON.stringify(asset || {})}`,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        max_output_tokens: 1000,
      }),
    });

    const payload = (await response.json()) as OpenAIResponsePayload;

    if (!response.ok) {
      const message = payload.error?.message?.trim();
      console.error("Manual Finder error:", message || payload);
      return NextResponse.json(
        {
          ok: false,
          error: message || "Manual Finder could not complete the web search.",
        },
        { status: response.status },
      );
    }

    const outputText = extractOutputText(payload);
    const parsed = cleanJson(outputText);
    const raw =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    let manuals = (Array.isArray(raw.manuals) ? raw.manuals : [])
      .map((item) => normalizeManual(item, asset))
      .filter((item): item is ManualCandidate => Boolean(item))
      .slice(0, 3);

    if (!manuals.length) {
      manuals = sourceFallback(payload, asset);
    }

    const answer =
      String(raw.answer || "").trim() ||
      (manuals.length
        ? `Found ${manuals.length} likely documentation match${manuals.length === 1 ? "" : "es"}.`
        : "No verified official manual was returned. Add the exact model number or use Open Web Search.");

    cache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      answer,
      manuals,
    });

    return NextResponse.json({
      ok: true,
      answer,
      manuals,
      cached: false,
    });
  } catch (error) {
    console.error("Manual Finder route error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Manual Finder could not connect to the search service.",
      },
      { status: 502 },
    );
  }
}

