import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

type AskAtlasRequest = {
  question?: unknown;
  atlas?: unknown;
  allowWebSearch?: unknown;
  conversation?: unknown;
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

type OpenAIContent = {
  type?: string;
  text?: string;
  refusal?: string;
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAIContent[];
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
const CONTEXT_LIMIT = 260_000;

const QUESTION_STOP_WORDS = new Set([
  "what",
  "when",
  "where",
  "which",
  "show",
  "tell",
  "find",
  "about",
  "with",
  "from",
  "that",
  "this",
  "have",
  "does",
  "need",
  "atlas",
  "property",
]);

function questionTokens(question: string) {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter(
          (token) =>
            token.length >= 3 && !QUESTION_STOP_WORDS.has(token),
        ),
    ),
  );
}

function removeHeavyData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeHeavyData);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/^(dataUrl|base64|blob|binary|thumbnail)$/i.test(key))
      .map(([key, entry]) => [key, removeHeavyData(entry)]),
  );
}

function recordSearchText(value: unknown) {
  if (!value || typeof value !== "object") return String(value ?? "");
  const record = value as Record<string, unknown>;
  return [
    record.name,
    record.title,
    record.label,
    record.category,
    record.status,
    record.priority,
    record.date,
    record.notes,
    record.purpose,
    record.make,
    record.manufacturer,
    record.model,
    record.serial,
    record.assetName,
    record.locationName,
    record.vendorName,
    record.requesterName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function arrayLimit(key: string) {
  const normalized = key.toLowerCase();
  if (/work|service/.test(normalized)) return 80;
  if (/calendar|event/.test(normalized)) return 60;
  if (/asset|location/.test(normalized)) return 60;
  if (/procedure|manual/.test(normalized)) return 45;
  if (/document|request|vendor/.test(normalized)) return 35;
  return 40;
}

function selectRelevantSnapshot(snapshot: unknown, question: string) {
  const cleaned = removeHeavyData(snapshot);
  const initial = JSON.stringify(cleaned ?? {});
  if (initial.length <= CONTEXT_LIMIT) return initial;
  if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned))
    return initial.slice(0, CONTEXT_LIMIT);

  const tokens = questionTokens(question);
  const broadQuestion =
    tokens.length <= 1 ||
    /\b(today|overdue|upcoming|everything|all|weekly|plan|priority)\b/i.test(
      question,
    );

  const compact = Object.fromEntries(
    Object.entries(cleaned as Record<string, unknown>).map(([key, value]) => {
      if (!Array.isArray(value)) return [key, value];

      const ranked = value
        .map((record, index) => {
          const text = recordSearchText(record);
          const matchScore = tokens.reduce(
            (score, token) =>
              score + (text.includes(token) ? Math.max(2, token.length) : 0),
            0,
          );
          const operationalScore =
            /\b(overdue|open|scheduled|in progress|high|monitor|new|needs review)\b/.test(
              text,
            )
              ? 4
              : 0;
          return { record, index, score: matchScore + operationalScore };
        })
        .sort(
          (left, right) =>
            right.score - left.score || left.index - right.index,
        );

      const limit = arrayLimit(key);
      const selected = broadQuestion
        ? ranked.slice(0, limit)
        : [
            ...ranked.filter((entry) => entry.score > 0).slice(0, limit),
            ...ranked.filter((entry) => entry.score === 0).slice(0, 8),
          ].slice(0, limit);

      return [key, selected.map((entry) => entry.record)];
    }),
  );

  return JSON.stringify(compact);
}

function extractOutputText(payload: OpenAIResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => {
      if (typeof content.text === "string") return content.text;
      if (typeof content.refusal === "string") return content.refusal;
      return "";
    })
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
        ? `I found ${manuals.length} official manual option${manuals.length === 1 ? "" : "s"} below.`
        : "Atlas could not find enough information to answer."),
    manuals,
  };
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
  const conversation = Array.isArray(body.conversation)
    ? body.conversation.slice(-12)
    : [];
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
    atlasJson = selectRelevantSnapshot(body.atlas ?? {}, question);
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

Your only task is to find up to 3 official manufacturer PDF documents that best match the user's equipment and Atlas asset details.

Rules:
- Prefer the exact manufacturer and model found in the Atlas asset list.
- Search official manufacturer domains first.
- Return direct public HTTPS PDF URLs whenever possible.
- Do not use scraped manual sites, retailer uploads, file-sharing sites, or unrelated products when an official source exists.
- Never invent a title, URL, model, or source.
- Return only the strongest 1 to 3 matches.
- Keep the answer under 2 sentences.
- Never say anything was saved.

Return ONLY one JSON object:
{
  "answer": "short readable summary",
  "manuals": [
    {
      "title": "exact document title",
      "manufacturer": "manufacturer",
      "model": "model",
      "url": "direct https URL",
      "sourceDomain": "domain",
      "sourceLabel": "official source label",
      "confidence": "High or Medium or Low",
      "reason": "one short sentence explaining the match",
      "assetId": "matching Atlas asset id or empty string",
      "assetName": "matching Atlas asset name or empty string"
    }
  ]
}`;

    const response = await callOpenAI(apiKey, {
      model,
      instructions,
      input: `QUESTION\n${question}\n\nRELEVANT ATLAS ASSETS\n${atlasJson}`,
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "auto",
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
    const result = parsed
      ? safeResult(parsed)
      : {
          answer:
            "I could not verify an official PDF from that search. Include the exact manufacturer and model number and try again.",
          manuals: [],
        };

    manualCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      result,
    });

    return NextResponse.json({ ok: true, ...result, cached: false });
  }

  const instructions = `You are Ask Atlas, the private property-operations assistant inside Atlas / 2000.

Use only the supplied Atlas snapshot as the authority for private property facts. Resolve IDs to readable names and connect information across assets, locations, vendors, work orders, procedures, documents, manuals, parts, calendar items, requests, and service history.

Answer rules:
- Lead with the direct answer.
- Use exact Atlas names, dates, statuses, and quantities when available.
- Explain the strongest connected evidence without dumping unrelated records.
- Distinguish completed history from open or upcoming work.
- When useful, finish with one practical next action.
- Never invent records, dates, vendors, costs, maintenance history, relationships, or document contents.
- If Atlas does not contain enough evidence, say exactly what is missing.
- Do not claim anything was changed or saved.

Return ONLY one JSON object with this exact shape:
{
  "answer": "readable answer"
}`;

  try {
    const response = await callOpenAI(apiKey, {
      model,
      instructions,
      input: `RECENT CONVERSATION\n${JSON.stringify(conversation)}\n\nQUESTION\n${question}\n\nATLAS SNAPSHOT\n${atlasJson}`,
      max_output_tokens: 4000,
      text: {
        format: {
          type: "json_schema",
          name: "ask_atlas_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["answer"],
            properties: {
              answer: { type: "string" },
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
    if (!parsed) {
      const reason = response.payload.incomplete_details?.reason;
      console.error("Ask Atlas unreadable response:", {
        status: response.payload.status,
        reason,
        outputText,
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            reason === "max_output_tokens"
              ? "Ask Atlas ran out of response space. Please try the question again."
              : "Ask Atlas could not read the AI response. Please try again.",
        },
        { status: 502 },
      );
    }

    const result = safeResult(parsed);

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
