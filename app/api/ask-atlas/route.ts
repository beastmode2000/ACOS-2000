import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

type AskAtlasRequest = {
  question?: unknown;
  atlas?: unknown;
  allowWebSearch?: unknown;
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

type AskAtlasResult = {
  answer: string;
  manuals: ManualCandidate[];
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
  action?: {
    sources?: WebSource[];
  };
};

type OpenAIResponsePayload = {
  id?: string;
  status?: string;
  output_text?: string;
  output?: OpenAIOutputItem[];
  incomplete_details?: { reason?: string };
  error?: { message?: string };
};

type CacheEntry = {
  expiresAt: number;
  result: AskAtlasResult;
};

const manualCache = new Map<string, CacheEntry>();
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

function parseJsonResponse(outputText: string): unknown | null {
  const cleaned = outputText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isManualQuestion(question: string): boolean {
  return /\b(manual|owner'?s manual|user guide|installation guide|service manual|pdf|documentation|spec sheet|datasheet)\b/i.test(
    question,
  );
}

function normalizeManual(entry: unknown): ManualCandidate | null {
  if (!entry || typeof entry !== "object") return null;
  const item = entry as Record<string, unknown>;
  const url = String(item.url ?? "").trim();
  if (!/^https:\/\//i.test(url)) return null;

  let sourceDomain = String(item.sourceDomain ?? "").trim();
  try {
    sourceDomain = new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }

  const confidenceValue = String(item.confidence ?? "Medium");
  const confidence: ManualCandidate["confidence"] =
    confidenceValue === "High" || confidenceValue === "Low"
      ? confidenceValue
      : "Medium";

  const title = String(item.title ?? "").trim();
  if (!title) return null;

  return {
    title,
    manufacturer: String(item.manufacturer ?? "").trim(),
    model: String(item.model ?? "").trim(),
    url,
    sourceDomain,
    sourceLabel: String(item.sourceLabel ?? sourceDomain).trim() || sourceDomain,
    confidence,
    reason:
      String(item.reason ?? "Review this result before saving.").trim() ||
      "Review this result before saving.",
    assetId: String(item.assetId ?? "").trim() || undefined,
    assetName: String(item.assetName ?? "").trim() || undefined,
  };
}

function safeResult(raw: unknown): AskAtlasResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nestedAnswer = source.answer;

  if (typeof nestedAnswer === "string") {
    const nested = parseJsonResponse(nestedAnswer);
    if (nested && typeof nested === "object") {
      return safeResult(nested);
    }
  }

  const manuals = (Array.isArray(source.manuals) ? source.manuals : [])
    .map(normalizeManual)
    .filter((item): item is ManualCandidate => Boolean(item))
    .slice(0, 3);

  const answer = String(source.answer ?? "").trim();

  return {
    answer:
      answer ||
      (manuals.length
        ? `I found ${manuals.length} manual option${manuals.length === 1 ? "" : "s"} below.`
        : "Atlas could not find enough information to answer."),
    manuals,
  };
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(/https:\/\/[^\s"'<>\\\]\)]+/gi) || [];
  return matches.map((url) => url.replace(/[.,;:!?]+$/g, ""));
}

function extractWebSources(payload: OpenAIResponsePayload): WebSource[] {
  const sources: WebSource[] = [];

  for (const item of payload.output || []) {
    for (const source of item.action?.sources || []) {
      if (source?.url) sources.push(source);
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

function manualFromUrl(
  url: string,
  titleHint: string,
  question: string,
): ManualCandidate | null {
  try {
    const parsed = new URL(url);
    const sourceDomain = parsed.hostname.replace(/^www\./i, "");
    const pathname = decodeURIComponent(parsed.pathname);
    const filename = pathname.split("/").filter(Boolean).pop() || "";
    const titleFromFile = filename
      .replace(/\.pdf(?:$|\?.*)/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const title =
      titleHint.trim() ||
      titleFromFile ||
      "Equipment manual";

    const looksRelevant =
      /\.pdf(?:$|\?)/i.test(url) ||
      /\b(manual|guide|instructions|documentation|spec|datasheet|controller)\b/i.test(
        `${title} ${url} ${question}`,
      );

    if (!looksRelevant) return null;

    return {
      title,
      manufacturer: "",
      model: "",
      url,
      sourceDomain,
      sourceLabel: sourceDomain,
      confidence: /\.pdf(?:$|\?)/i.test(url) ? "High" : "Medium",
      reason: /\.pdf(?:$|\?)/i.test(url)
        ? "Direct PDF result found from the web search."
        : "Official documentation page found from the web search.",
    };
  } catch {
    return null;
  }
}

function fallbackManuals(
  payload: OpenAIResponsePayload,
  outputText: string,
  question: string,
): ManualCandidate[] {
  const candidates: ManualCandidate[] = [];
  const seen = new Set<string>();

  const sourcePairs = extractWebSources(payload).map((source) => ({
    url: String(source.url || "").trim(),
    title: String(source.title || "").trim(),
  }));

  const textPairs = extractUrlsFromText(outputText).map((url) => ({
    url,
    title: "",
  }));

  const allPairs = [...sourcePairs, ...textPairs];

  for (const pair of allPairs) {
    if (!pair.url || seen.has(pair.url)) continue;
    seen.add(pair.url);

    const candidate = manualFromUrl(pair.url, pair.title, question);
    if (candidate) candidates.push(candidate);
  }

  return candidates
    .sort((a, b) => {
      const aPdf = /\.pdf(?:$|\?)/i.test(a.url) ? 1 : 0;
      const bPdf = /\.pdf(?:$|\?)/i.test(b.url) ? 1 : 0;
      return bPdf - aPdf;
    })
    .slice(0, 3);
}

function makeCacheKey(question: string, atlasJson: string): string {
  const normalizedQuestion = question.toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 2166136261;
  const source = `${normalizedQuestion}|${atlasJson}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${normalizedQuestion}|${hash >>> 0}`;
}

async function callOpenAI(
  apiKey: string,
  requestBody: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; payload: OpenAIResponsePayload }> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json()) as OpenAIResponsePayload;
  return { ok: response.ok, status: response.status, payload };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Ask Atlas is not connected. Add OPENAI_API_KEY in Vercel and redeploy.",
      },
      { status: 503 },
    );
  }

  let body: AskAtlasRequest;
  try {
    body = (await request.json()) as AskAtlasRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "The request was not valid JSON." },
      { status: 400 },
    );
  }

  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json(
      { ok: false, error: "Type a question first." },
      { status: 400 },
    );
  }

  if (question.length > 4000) {
    return NextResponse.json(
      { ok: false, error: "Please shorten the question." },
      { status: 400 },
    );
  }

  let atlasJson = "{}";
  try {
    atlasJson = JSON.stringify(body.atlas ?? {});
  } catch {
    return NextResponse.json(
      { ok: false, error: "Atlas could not prepare its records." },
      { status: 400 },
    );
  }

  if (atlasJson.length > 900_000) {
    return NextResponse.json(
      { ok: false, error: "The Atlas snapshot is too large for one question." },
      { status: 413 },
    );
  }

  const manualQuestion = isManualQuestion(question);
  const allowWebSearch = body.allowWebSearch === true;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  if (manualQuestion && allowWebSearch) {
    const cacheKey = makeCacheKey(question, atlasJson);
    const cached = manualCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ok: true, ...cached.result, cached: true });
    }

    const instructions = `You are the manual-finder inside Ask Atlas.

Find up to 3 official manufacturer documents that best match the user's equipment and Atlas asset details.

Rules:
- Prefer the exact manufacturer and model found in the Atlas asset list.
- Search official manufacturer domains first.
- Prefer direct public HTTPS PDF URLs.
- Do not use scraped manual sites, retailer uploads, file-sharing sites, or unrelated products when an official source exists.
- Never invent a title, URL, model, or source.
- Keep the answer under 2 sentences.
- Never say anything was saved.
- Return a plain JSON object only.`;

    const response = await callOpenAI(apiKey, {
      model,
      instructions,
      input: `QUESTION\n${question}\n\nRELEVANT ATLAS ASSETS\n${atlasJson}\n\nReturn this exact JSON shape:\n{"answer":"short summary","manuals":[{"title":"document title","manufacturer":"manufacturer","model":"model","url":"https URL","sourceDomain":"domain","sourceLabel":"official source","confidence":"High","reason":"why it matches","assetId":"","assetName":""}]}`,
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      max_output_tokens: 1400,
    });

    if (!response.ok) {
      const providerMessage = response.payload.error?.message?.trim();
      console.error("Ask Atlas manual search error:", providerMessage || response.payload);
      return NextResponse.json(
        {
          ok: false,
          error: providerMessage || "The manual search could not be completed.",
        },
        { status: response.status },
      );
    }

    const outputText = extractOutputText(response.payload);
    const parsed = outputText ? parseJsonResponse(outputText) : null;
    let result = parsed ? safeResult(parsed) : { answer: "", manuals: [] };

    if (!result.manuals.length) {
      const fallback = fallbackManuals(response.payload, outputText, question);
      result = {
        answer: fallback.length
          ? `I found ${fallback.length} manual result${fallback.length === 1 ? "" : "s"} below. Review the model before saving.`
          : "I could not verify an official manual from that search. Include the exact manufacturer and model number and try again.",
        manuals: fallback,
      };
    }

    manualCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      result,
    });

    return NextResponse.json({ ok: true, ...result, cached: false });
  }

  const instructions = `You are Ask Atlas, the private property-operations assistant inside Atlas / 2000.

Use only the Atlas snapshot as the authority for private property facts. Resolve IDs to readable names. Never invent records, dates, vendors, costs, maintenance history, or document contents. Give a direct useful answer. If the answer is not in Atlas, say so clearly.

Return ONLY one JSON object with this exact shape:
{
  "answer": "readable answer",
  "manuals": []
}`;

  try {
    const response = await callOpenAI(apiKey, {
      model,
      instructions,
      input: `QUESTION\n${question}\n\nATLAS SNAPSHOT\n${atlasJson}`,
      max_output_tokens: 1400,
      text: {
        format: {
          type: "json_schema",
          name: "ask_atlas_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["answer", "manuals"],
            properties: {
              answer: { type: "string" },
              manuals: {
                type: "array",
                maxItems: 0,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {},
                },
              },
            },
          },
        },
      },
    });

    if (!response.ok) {
      const providerMessage = response.payload.error?.message?.trim();
      console.error("Ask Atlas OpenAI error:", providerMessage || response.payload);
      return NextResponse.json(
        {
          ok: false,
          error: providerMessage || "Ask Atlas could not reach the AI service.",
        },
        { status: response.status },
      );
    }

    const outputText = extractOutputText(response.payload);
    const parsed = outputText ? parseJsonResponse(outputText) : null;
    const result = parsed
      ? safeResult(parsed)
      : {
          answer: "Ask Atlas did not return a readable answer.",
          manuals: [],
        };

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Ask Atlas route error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Ask Atlas could not connect to the AI service right now.",
      },
      { status: 502 },
    );
  }
}
