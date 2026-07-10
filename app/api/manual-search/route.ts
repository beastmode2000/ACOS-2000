import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RequestBody = {
  query?: unknown;
  asset?: unknown;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Manual Finder is not connected." },
      { status: 503 },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "The request was not valid JSON." },
      { status: 400 },
    );
  }

  const query = String(body.query ?? "").trim();

  if (!query) {
    return NextResponse.json(
      { ok: false, error: "Enter the equipment manufacturer and model." },
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
        instructions:
          "Search the live web for the best official manufacturer manual or documentation for the requested equipment. Give a short readable answer with the strongest official source links. Do not invent links.",
        input: `Find official manufacturer documentation for: ${query}`,
        tools: [{ type: "web_search", search_context_size: "low" }],
        max_output_tokens: 900,
      }),
    });

    const payload = (await response.json()) as {
      output_text?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            payload.error?.message ||
            "Manual Finder could not complete the search.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      answer:
        String(payload.output_text || "").trim() ||
        "No readable manual-search result was returned.",
      manuals: [],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Manual Finder could not connect right now." },
      { status: 502 },
    );
  }
}
