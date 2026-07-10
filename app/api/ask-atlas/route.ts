import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type AskAtlasRequest = {
  question?: unknown;
  atlas?: unknown;
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
  output_text?: string;
  output?: OpenAIOutputItem[];
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

function parseAnswer(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { answer?: unknown };
    return String(parsed.answer || "").trim();
  } catch {
    return cleaned;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ask Atlas is not connected. Add OPENAI_API_KEY in Vercel and redeploy.",
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
        instructions: `You are Ask Atlas, the private property-operations assistant inside Atlas / 2000.

Use only the supplied Atlas snapshot as the authority for private property facts. Resolve IDs to readable names. Never invent records, dates, vendors, costs, maintenance history, or document contents.

Give a direct, useful, clearly formatted answer. If the answer is not in Atlas, say so clearly. Do not search the web.

Return a JSON object with one string property named answer.`,
        input: `QUESTION\n${question}\n\nATLAS SNAPSHOT\n${atlasJson}`,
        max_output_tokens: 1400,
        text: {
          format: {
            type: "json_schema",
            name: "ask_atlas_answer",
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
      }),
    });

    const payload = (await response.json()) as OpenAIResponsePayload;

    if (!response.ok) {
      const message = payload.error?.message?.trim();
      console.error("Ask Atlas error:", message || payload);
      return NextResponse.json(
        { ok: false, error: message || "Ask Atlas could not reach the AI service." },
        { status: response.status },
      );
    }

    const answer = parseAnswer(extractOutputText(payload));

    return NextResponse.json({
      ok: true,
      answer: answer || "Ask Atlas did not return a readable answer.",
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
