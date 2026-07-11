
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnalyzeFile = {
  name?: string;
  type?: string;
  dataUrl?: string;
  url?: string;
};

type AnalyzeRequest = {
  item?: {
    id?: string;
    title?: string;
    intakeType?: string;
    notes?: string;
    pastedText?: string;
    files?: AnalyzeFile[];
  };
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: { type: "string" },
    summary: { type: "string" },
    rawText: { type: "string" },
    manufacturer: { type: "string" },
    model: { type: "string" },
    serial: { type: "string" },
    assetName: { type: "string" },
    vendorName: { type: "string" },
    invoiceNumber: { type: "string" },
    amount: { type: "string" },
    date: { type: "string" },
    locationName: { type: "string" },
    readings: {
      type: "object",
      additionalProperties: false,
      properties: {
        psi: { type: "string" },
        temperature: { type: "string" },
        ph: { type: "string" },
        hours: { type: "string" },
      },
      required: ["psi", "temperature", "ph", "hours"],
    },
    confidence: { type: "string", enum: ["High", "Medium", "Low"] },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "documentType", "summary", "rawText", "manufacturer", "model", "serial",
    "assetName", "vendorName", "invoiceNumber", "amount", "date",
    "locationName", "readings", "confidence", "warnings",
  ],
} as const;

function safeText(value: unknown, max = 12000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of parts) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is not configured in Vercel." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as AnalyzeRequest;
    const item = body.item || {};
    const files = Array.isArray(item.files) ? item.files.slice(0, 3) : [];

    const content: any[] = [
      {
        type: "input_text",
        text: [
          "Analyze this Atlas estate-operations Inbox item.",
          "Extract only information clearly visible or explicitly provided.",
          "Do not invent values. Use empty strings when unknown.",
          "Preserve serial numbers, model numbers, invoice numbers, dates, amounts, and readings exactly.",
          "This is review-only; do not claim that any database record was updated.",
          `Title: ${safeText(item.title, 500)}`,
          `Intake type: ${safeText(item.intakeType, 200)}`,
          `Notes: ${safeText(item.notes)}`,
          `Pasted text: ${safeText(item.pastedText)}`,
        ].join("\n"),
      },
    ];

    for (const file of files) {
      const type = safeText(file.type, 200).toLowerCase();
      const dataUrl = safeText(file.dataUrl, 8_000_000);
      const url = safeText(file.url, 4000);
      const source = dataUrl || url;
      if (!source) continue;

      if (type.startsWith("image/") || source.startsWith("data:image/")) {
        content.push({ type: "input_image", image_url: source, detail: "high" });
      } else if (type.includes("pdf") || source.startsWith("data:application/pdf")) {
        content.push({
          type: "input_file",
          filename: safeText(file.name, 300) || "atlas-inbox.pdf",
          file_data: source,
        });
      }
    }

    if (content.length === 1 && !safeText(item.notes) && !safeText(item.pastedText) && !safeText(item.title)) {
      return NextResponse.json(
        { ok: false, error: "No supported image, PDF, or text was supplied." },
        { status: 400 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ATLAS_OPENAI_MODEL || "gpt-5-mini",
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "atlas_inbox_analysis",
            strict: true,
            schema: analysisSchema,
          },
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || "OpenAI analysis request failed.";
      return NextResponse.json({ ok: false, error: message }, { status: response.status });
    }

    const text = outputText(payload);
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "The analysis service returned no structured result." },
        { status: 502 },
      );
    }

    let analysis: unknown;
    try {
      analysis = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, error: "The analysis service returned invalid JSON." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Inbox analysis failed.",
      },
      { status: 500 },
    );
  }
}
