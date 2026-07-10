import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

type OpenAIContent = {
  type?: string;
  text?: string;
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

function isLikelyPdfUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && (/\.pdf(?:$|[?#])/i.test(url) || /\/pdf\//i.test(url));
}

function normalizeManual(entry: unknown): ManualCandidate | null {
  if (!entry || typeof entry !== "object") return null;
  const item = entry as Record<string, unknown>;
  const url = String(item.url ?? "").trim();
  if (!/^https:\/\//i.test(url)) return null;

  let sourceDomain = String(item.sourceDomain ?? "").trim();
  try {
    sourceDomain = new URL(url).hostname;
  } catch {
    return null;
  }

  const confidenceValue = String(item.confidence ?? "Medium");
  const confidence: ManualCandidate["confidence"] =
    confidenceValue === "High" || confidenceValue === "Low"
      ? confidenceValue
      : "Medium";

  return {
    title: String(item.title ?? "Equipment Manual").trim() || "Equipment Manual",
    manufacturer: String(item.manufacturer ?? "").trim(),
    model: String(item.model ?? "").trim(),
    url,
    sourceDomain,
    sourceLabel: String(item.sourceLabel ?? sourceDomain).trim() || sourceDomain,
    confidence,
    reason: String(item.reason ?? "Review this result before saving.").trim(),
    assetId: String(item.assetId ?? "").trim() || undefined,
    assetName: String(item.assetName ?? "").trim() || undefined,
  };
}

function safeResult(raw: unknown): AskAtlasResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answer = String(source.answer ?? "").trim();
  const manuals = (Array.isArray(source.manuals) ? source.manuals : [])
    .map(normalizeManual)
    .filter((item): item is ManualCandidate => Boolean(item))
    .slice(0, 4);

  return {
    answer:
      answer ||
      (manuals.length
        ? "I found the manual option below. Review it before saving."
        : "Atlas could not find enough information to answer."),
    manuals,
  };
}

function fallbackReadableResult(outputText: string): AskAtlasResult {
  const plain = outputText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const urls = Array.from(
    new Set(plain.match(/https:\/\/[^\s<>"')\]]+/gi) || []),
  )
    .map((url) => url.replace(/[.,;:]+$/, ""))
    .filter(isLikelyPdfUrl)
    .slice(0, 4);

  const manuals = urls.map((url): ManualCandidate => {
    let sourceDomain = "Official source";
    try {
      sourceDomain = new URL(url).hostname;
    } catch {
      // The URL was already filtered as HTTPS.
    }

    return {
      title: "Equipment Manual",
      manufacturer: "",
      model: "",
      url,
      sourceDomain,
      sourceLabel: sourceDomain,
      confidence: "Medium",
      reason: "Ask Atlas found this PDF. Confirm the model before saving.",
    };
  });

  return {
    answer:
      plain ||
      (manuals.length
        ? "I found the manual option below. Review it before saving."
        : "The manual search completed, but no verified PDF was returned."),
    manuals,
  };
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
  const allowWebSearch = body.allowWebSearch !== false;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const instructions = `You are Ask Atlas, the private property-operations assistant inside Atlas / 2000.

Use Atlas records as the authority for private property facts. Resolve IDs to readable names. Never invent Atlas records, dates, vendors, costs, or maintenance history.

When the user asks for an equipment manual, owner manual, installation guide, service guide, specification sheet, or PDF documentation:
- Search the live web.
- Use the manufacturer and exact model from Atlas whenever available.
- Prefer the official manufacturer's domain.
- Prefer a direct public HTTPS PDF URL.
- Never invent a URL.
- Avoid scraped manual sites, retailer uploads, file-sharing sites, and unrelated products when an official source exists.
- Return no more than four candidates.
- Confidence is High only when the manufacturer, model, and document clearly match.
- Include the matching Atlas assetId and assetName when supported by the snapshot.
- Never say a document was saved; the user must press Save to Atlas Documents.

Return ONLY one JSON object with this exact shape:
{
  "answer": "short readable answer",
  "manuals": [
    {
      "title": "document title",
      "manufacturer": "manufacturer",
      "model": "model",
      "url": "direct https URL",
      "sourceDomain": "domain",
      "sourceLabel": "source label",
      "confidence": "High or Medium or Low",
      "reason": "why it matches",
      "assetId": "matching Atlas asset id or empty string",
      "assetName": "matching Atlas asset name or empty string"
    }
  ]
}

For non-manual questions, manuals must be an empty array.`;

  const inputText = `QUESTION\n${question}\n\nATLAS SNAPSHOT\n${atlasJson}`;

  try {
    // Manual searches intentionally avoid strict Structured Outputs because web-search
    // tool calls can occasionally complete without a final schema-formatted text block.
    // Plain JSON instructions plus a retry are more reliable for this flow.
    const firstBody: Record<string, unknown> = {
      model,
      instructions,
      input: inputText,
      max_output_tokens: manualQuestion ? 3200 : 1800,
    };

    if (manualQuestion && allowWebSearch) {
      firstBody.tools = [{ type: "web_search", search_context_size: "medium" }];
      firstBody.tool_choice = "auto";
    } else {
      firstBody.text = {
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
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "title",
                    "manufacturer",
                    "model",
                    "url",
                    "sourceDomain",
                    "sourceLabel",
                    "confidence",
                    "reason",
                    "assetId",
                    "assetName",
                  ],
                  properties: {
                    title: { type: "string" },
                    manufacturer: { type: "string" },
                    model: { type: "string" },
                    url: { type: "string" },
                    sourceDomain: { type: "string" },
                    sourceLabel: { type: "string" },
                    confidence: {
                      type: "string",
                      enum: ["High", "Medium", "Low"],
                    },
                    reason: { type: "string" },
                    assetId: { type: "string" },
                    assetName: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };
    }

    const first = await callOpenAI(apiKey, firstBody);

    if (!first.ok) {
      const providerMessage = first.payload.error?.message?.trim();
      console.error("Ask Atlas OpenAI error:", providerMessage || first.payload);
      return NextResponse.json(
        {
          ok: false,
          error: providerMessage || "Ask Atlas could not reach the AI service.",
        },
        { status: first.status },
      );
    }

    let outputText = extractOutputText(first.payload);

    // Retry only for manual searches that returned no final text. This second call is
    // shorter and explicitly demands at least a readable answer even if no PDF exists.
    if (!outputText && manualQuestion && allowWebSearch) {
      console.warn("Ask Atlas manual search returned empty text; retrying once.", {
        responseId: first.payload.id,
        status: first.payload.status,
        incompleteReason: first.payload.incomplete_details?.reason,
      });

      const retry = await callOpenAI(apiKey, {
        model,
        instructions,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "auto",
        input: `${inputText}\n\nIMPORTANT: Always finish with a JSON object. If no verified PDF is found, return a helpful answer and an empty manuals array. Never return an empty response.`,
        max_output_tokens: 2400,
      });

      if (!retry.ok) {
        const providerMessage = retry.payload.error?.message?.trim();
        console.error("Ask Atlas retry error:", providerMessage || retry.payload);
        return NextResponse.json(
          {
            ok: false,
            error: providerMessage || "The manual search could not be completed.",
          },
          { status: retry.status },
        );
      }

      outputText = extractOutputText(retry.payload);
    }

    if (!outputText) {
      return NextResponse.json(
        {
          ok: true,
          answer:
            "I could not verify a manual from the search results. Try including the exact manufacturer and model number.",
          manuals: [],
        },
        { status: 200 },
      );
    }

    const parsed = parseJsonResponse(outputText);
    const result = parsed ? safeResult(parsed) : fallbackReadableResult(outputText);

    return NextResponse.json({
      ok: true,
      answer: result.answer,
      manuals: result.manuals,
    });
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
