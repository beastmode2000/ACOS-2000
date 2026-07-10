import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ManualSearchRequest = {
  query?: unknown;
  asset?: {
    id?: unknown;
    name?: unknown;
    make?: unknown;
    model?: unknown;
    serial?: unknown;
  } | null;
};

type UrlCitation = {
  type?: string;
  url?: string;
  title?: string;
};

type ResponseContent = {
  type?: string;
  text?: string;
  annotations?: UrlCitation[];
};

type ResponseOutputItem = {
  type?: string;
  content?: ResponseContent[];
  action?: {
    sources?: Array<{
      type?: string;
      url?: string;
      title?: string;
    }>;
  };
};

type OpenAIResponse = {
  output_text?: string;
  output?: ResponseOutputItem[];
  error?: {
    message?: string;
  };
};

type ManualResult = {
  title: string;
  url: string;
  sourceDomain: string;
  sourceLabel: string;
  isPdf: boolean;
  confidence: "High" | "Medium";
  reason: string;
  assetId?: string;
  assetName?: string;
};

function clean(value: unknown, maxLength = 300): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function getFileTitle(url: string): string {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const fileName = pathname.split("/").filter(Boolean).pop() || "";
    return fileName
      .replace(/\.pdf$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function extractText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => clean(content.text, 5000))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractSources(payload: OpenAIResponse): Array<{
  url: string;
  title: string;
}> {
  const sources: Array<{ url: string; title: string }> = [];

  for (const item of payload.output || []) {
    for (const source of item.action?.sources || []) {
      const url = clean(source.url, 2000);
      if (url) {
        sources.push({
          url,
          title: clean(source.title, 500),
        });
      }
    }

    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.type !== "url_citation") continue;

        const url = clean(annotation.url, 2000);
        if (url) {
          sources.push({
            url,
            title: clean(annotation.title, 500),
          });
        }
      }
    }
  }

  return sources;
}

function makeResults(
  payload: OpenAIResponse,
  asset: ManualSearchRequest["asset"],
): ManualResult[] {
  const seen = new Set<string>();
  const results: ManualResult[] = [];

  for (const source of extractSources(payload)) {
    if (!/^https:\/\//i.test(source.url) || seen.has(source.url)) continue;
    seen.add(source.url);

    const sourceDomain = getDomain(source.url);
    if (!sourceDomain) continue;

    const isPdf = /\.pdf(?:$|[?#])/i.test(source.url);
    const title =
      source.title ||
      getFileTitle(source.url) ||
      "Official equipment documentation";

    results.push({
      title,
      url: source.url,
      sourceDomain,
      sourceLabel: sourceDomain,
      isPdf,
      confidence: isPdf ? "High" : "Medium",
      reason: isPdf
        ? "Direct PDF returned by the live documentation search."
        : "Official documentation source returned by the live web search.",
      assetId: clean(asset?.id, 150) || undefined,
      assetName: clean(asset?.name, 250) || undefined,
    });
  }

  return results
    .sort((a, b) => Number(b.isPdf) - Number(a.isPdf))
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Manual Finder is not connected. OPENAI_API_KEY is missing in Vercel.",
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

  const query = clean(body.query, 600);
  const asset = body.asset ?? null;

  const equipment = [
    clean(asset?.make, 200),
    clean(asset?.model, 200),
    clean(asset?.name, 250),
    query,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!equipment) {
    return NextResponse.json(
      {
        ok: false,
        error: "Enter or select the equipment manufacturer and model.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        instructions: `Search the live web for official manufacturer documentation for the exact equipment requested.

Prioritize:
1. The exact manufacturer and model.
2. The official manufacturer website.
3. Direct PDF manuals, installation guides, user guides, service guides, or technical documentation.

Do not use scraped manual repositories, file-sharing sites, retailers, forums, or unrelated models when an official manufacturer source exists.

Give a brief readable summary and cite the strongest official sources.`,
        input: `Find official documentation for: ${equipment}`,
        tools: [
          {
            type: "web_search",
            search_context_size: "low",
          },
        ],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        max_output_tokens: 700,
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      const providerError = clean(payload.error?.message, 1000);
      console.error("Manual Finder provider error:", providerError || payload);

      return NextResponse.json(
        {
          ok: false,
          error:
            providerError ||
            "Manual Finder could not complete the internet search.",
        },
        { status: response.status },
      );
    }

    const answer = extractText(payload);
    const results = makeResults(payload, asset);

    return NextResponse.json({
      ok: true,
      answer:
        answer ||
        (results.length
          ? `Found ${results.length} official documentation result${
              results.length === 1 ? "" : "s"
            }.`
          : "No verified official documentation was returned. Add the exact model number and try again."),
      results,
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
