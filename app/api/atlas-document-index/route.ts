import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type AtlasFile = {
  name?: string;
  type?: string;
  url?: string;
  href?: string;
};

type AtlasDocument = {
  id?: string;
  propertyId?: string;
  title?: string;
  type?: string;
  area?: string;
  notes?: string;
  pastedText?: string;
  files?: AtlasFile[];
  href?: string;
};

type IndexRequest = {
  propertyId?: unknown;
  document?: unknown;
  force?: unknown;
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ text?: string; refusal?: string }>;
  }>;
  error?: { message?: string };
  incomplete_details?: { reason?: string };
};

type KnowledgeIndex = {
  summary: string;
  pages: Array<{
    page: number;
    sheetTitle: string;
    systems: string[];
    equipmentTags: string[];
    summary: string;
  }>;
  equipment: Array<{
    canonicalId: string;
    aliases: string[];
    name: string;
    system: string;
    manufacturer: string;
    model: string;
    page: number;
    sheetTitle: string;
    facts: string[];
  }>;
};

type SqlClient = ReturnType<typeof neon>;

const MAX_INDEX_PDF_BYTES = 48 * 1024 * 1024;
const PDF_FETCH_TIMEOUT_MS = 60000;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  );
}

function cleanString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isPdfFile(name: string, type: string, url: string) {
  return (
    type.toLowerCase().includes("pdf") ||
    name.toLowerCase().endsWith(".pdf") ||
    /\.pdf(?:$|[?#])/i.test(url)
  );
}

function isFocusedTechnicalDrawing(text: string) {
  const normalized = text.toLowerCase();
  return (
    /as[- ]?built|as\s+buids?|blueprint|drawing|plan|schematic/.test(normalized) &&
    /mechanical|hvac|radiant|hydronic|boiler|pump/.test(normalized)
  );
}

function documentFiles(document: AtlasDocument) {
  const title = cleanString(document.title, "Document");
  const searchText = [
    title,
    document.type,
    document.area,
    document.notes,
    document.pastedText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const files: Array<{
    name: string;
    url: string;
    searchText: string;
  }> = [];

  for (const rawFile of Array.isArray(document.files) ? document.files : []) {
    const name = cleanString(rawFile?.name, `${title}.pdf`);
    const type = cleanString(rawFile?.type);
    const url = cleanString(rawFile?.url || rawFile?.href);
    if (!/^https:\/\//i.test(url) || !isPdfFile(name, type, url)) continue;
    files.push({
      name,
      url,
      searchText: `${searchText} ${name}`.toLowerCase(),
    });
  }

  const href = cleanString(document.href);
  if (
    /^https:\/\//i.test(href) &&
    isPdfFile(title, "application/pdf", href) &&
    !files.some((file) => file.url === href)
  ) {
    files.push({
      name: title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`,
      url: href,
      searchText: `${searchText} ${title}`.toLowerCase(),
    });
  }

  return files.sort((left, right) => {
    const leftFocused = isFocusedTechnicalDrawing(left.searchText) ? 1 : 0;
    const rightFocused = isFocusedTechnicalDrawing(right.searchText) ? 1 : 0;
    return rightFocused - leftFocused;
  });
}

async function ensureKnowledgeTable(sql: SqlClient) {
  await sql`
    create table if not exists atlas_document_knowledge (
      id text primary key,
      property_id text not null,
      document_id text not null default '',
      document_url text not null,
      document_title text not null,
      document_filename text not null default '',
      status text not null default 'processing',
      search_text text not null default '',
      knowledge jsonb not null default '{}'::jsonb,
      error text not null default '',
      indexed_at timestamptz,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create unique index if not exists atlas_document_knowledge_property_url_idx
    on atlas_document_knowledge (property_id, document_url)
  `;
  await sql`
    create index if not exists atlas_document_knowledge_property_status_idx
    on atlas_document_knowledge (property_id, status)
  `;
}

function knowledgeId(propertyId: string, url: string) {
  let hash = 2166136261;
  const source = `${propertyId}|${url}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `doc-knowledge-${propertyId}-${hash >>> 0}`;
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.refusal || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseJsonResponse(value: string): unknown | null {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function normalizeIndex(raw: unknown): KnowledgeIndex | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const pages = (Array.isArray(record.pages) ? record.pages : [])
    .map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const page = value as Record<string, unknown>;
      return {
        page: Math.max(1, Number(page.page || 1)),
        sheetTitle: cleanString(page.sheetTitle),
        systems: (Array.isArray(page.systems) ? page.systems : []).map((item) => cleanString(item)).filter(Boolean),
        equipmentTags: (Array.isArray(page.equipmentTags) ? page.equipmentTags : []).map((item) => cleanString(item)).filter(Boolean),
        summary: cleanString(page.summary),
      };
    })
    .filter((value): value is KnowledgeIndex["pages"][number] => Boolean(value));
  const equipment = (Array.isArray(record.equipment) ? record.equipment : [])
    .map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const item = value as Record<string, unknown>;
      return {
        canonicalId: cleanString(item.canonicalId),
        aliases: (Array.isArray(item.aliases) ? item.aliases : []).map((alias) => cleanString(alias)).filter(Boolean),
        name: cleanString(item.name),
        system: cleanString(item.system),
        manufacturer: cleanString(item.manufacturer),
        model: cleanString(item.model),
        page: Math.max(1, Number(item.page || 1)),
        sheetTitle: cleanString(item.sheetTitle),
        facts: (Array.isArray(item.facts) ? item.facts : []).map((fact) => cleanString(fact)).filter(Boolean),
      };
    })
    .filter((value): value is KnowledgeIndex["equipment"][number] => Boolean(value));

  return {
    summary: cleanString(record.summary),
    pages,
    equipment,
  };
}

async function uploadPdf(apiKey: string, filename: string, buffer: Buffer) {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("expires_after[anchor]", "created_at");
  form.append("expires_after[seconds]", String(24 * 60 * 60));
  form.append(
    "file",
    new Blob([Uint8Array.from(buffer)], { type: "application/pdf" }),
    filename,
  );

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const payload = (await response.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message || `PDF upload failed (${response.status}).`);
  }
  return payload.id;
}

async function createDocumentIndex(
  apiKey: string,
  title: string,
  filename: string,
  fileId: string,
): Promise<KnowledgeIndex> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6-sol",
      instructions:
        "Build a durable page-level knowledge index for an Atlas property document. Use Code Interpreter to inspect the entire PDF page-by-page. For drawing sheets, inspect visible labels, schedules, legends, tables, callouts, and diagrams; do not rely only on extracted text. Capture equipment identifiers and useful aliases exactly as shown. Never invent a page, sheet title, manufacturer, model, relationship, or fact. Keep facts concise and source-grounded.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Index this saved Atlas PDF for fast future property questions.\n\nDocument: ${title}\nFilename: ${filename}\n\nReturn a compact but useful index covering every page. For equipment labels such as P-6, Pump 6, B-1, HWT-1, HX-1, capture the canonical identifier, reasonable aliases, system/function, page, sheet title, and only facts that are actually supported by the document.`,
            },
          ],
        },
      ],
      tools: [
        {
          type: "code_interpreter",
          container: {
            type: "auto",
            file_ids: [fileId],
            memory_limit: "4g",
          },
        },
      ],
      tool_choice: "required",
      max_output_tokens: 12000,
      text: {
        format: {
          type: "json_schema",
          name: "atlas_document_index",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "pages", "equipment"],
            properties: {
              summary: { type: "string" },
              pages: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["page", "sheetTitle", "systems", "equipmentTags", "summary"],
                  properties: {
                    page: { type: "integer" },
                    sheetTitle: { type: "string" },
                    systems: { type: "array", items: { type: "string" } },
                    equipmentTags: { type: "array", items: { type: "string" } },
                    summary: { type: "string" },
                  },
                },
              },
              equipment: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["canonicalId", "aliases", "name", "system", "manufacturer", "model", "page", "sheetTitle", "facts"],
                  properties: {
                    canonicalId: { type: "string" },
                    aliases: { type: "array", items: { type: "string" } },
                    name: { type: "string" },
                    system: { type: "string" },
                    manufacturer: { type: "string" },
                    model: { type: "string" },
                    page: { type: "integer" },
                    sheetTitle: { type: "string" },
                    facts: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAIResponsePayload;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Document indexing failed (${response.status}).`);
  }
  const outputText = extractOutputText(payload);
  const parsed = outputText ? parseJsonResponse(outputText) : null;
  const normalized = normalizeIndex(parsed);
  if (!normalized) {
    throw new Error(
      payload.incomplete_details?.reason === "max_output_tokens"
        ? "Document index exceeded the response limit."
        : "Document index response was unreadable.",
    );
  }
  return normalized;
}

async function indexOne(
  sql: SqlClient,
  apiKey: string,
  propertyId: string,
  document: AtlasDocument,
  file: { name: string; url: string; searchText: string },
  force: boolean,
) {
  const existing = (await sql`
    select status, indexed_at
    from atlas_document_knowledge
    where property_id = ${propertyId} and document_url = ${file.url}
    limit 1
  `) as Array<{ status?: string; indexed_at?: string }>;

  if (!force && existing[0]?.status === "ready") {
    return { url: file.url, status: "ready", cached: true };
  }

  const id = knowledgeId(propertyId, file.url);
  await sql`
    insert into atlas_document_knowledge (
      id, property_id, document_id, document_url, document_title,
      document_filename, status, search_text, knowledge, error, updated_at
    ) values (
      ${id}, ${propertyId}, ${cleanString(document.id)}, ${file.url},
      ${cleanString(document.title, file.name)}, ${file.name}, 'processing', '', '{}'::jsonb, '', now()
    )
    on conflict (property_id, document_url) do update set
      document_id = excluded.document_id,
      document_title = excluded.document_title,
      document_filename = excluded.document_filename,
      status = 'processing',
      error = '',
      updated_at = now()
  `;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);
  let fileId = "";
  try {
    const response = await fetch(file.url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
      },
    });
    if (!response.ok) throw new Error(`Saved PDF fetch failed (${response.status}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_INDEX_PDF_BYTES) {
      throw new Error("PDF is too large for background indexing. Use a smaller split drawing set.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error("Saved PDF was empty.");
    if (buffer.length > MAX_INDEX_PDF_BYTES) {
      throw new Error("PDF is too large for background indexing. Use a smaller split drawing set.");
    }

    fileId = await uploadPdf(apiKey, file.name, buffer);
    const knowledge = await createDocumentIndex(
      apiKey,
      cleanString(document.title, file.name),
      file.name,
      fileId,
    );
    const searchText = JSON.stringify(knowledge).toLowerCase();

    await sql`
      update atlas_document_knowledge
      set status = 'ready',
          search_text = ${searchText},
          knowledge = ${JSON.stringify(knowledge)}::jsonb,
          error = '',
          indexed_at = now(),
          updated_at = now()
      where property_id = ${propertyId} and document_url = ${file.url}
    `;
    return { url: file.url, status: "ready", cached: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sql`
      update atlas_document_knowledge
      set status = 'failed', error = ${message}, updated_at = now()
      where property_id = ${propertyId} and document_url = ${file.url}
    `;
    return { url: file.url, status: "failed", error: message };
  } finally {
    clearTimeout(timeout);
    if (fileId) {
      void fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => undefined);
    }
  }
}

export async function GET(request: Request) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return NextResponse.json({ ok: false, error: "Missing database connection string." }, { status: 500 });
  }
  const propertyId = cleanString(new URL(request.url).searchParams.get("propertyId"), "2000");
  const sql = neon(databaseUrl);
  await ensureKnowledgeTable(sql);
  const rows = await sql`
    select document_id, document_url, document_title, document_filename,
           status, error, indexed_at, updated_at
    from atlas_document_knowledge
    where property_id = ${propertyId}
    order by updated_at desc
    limit 500
  `;
  return NextResponse.json({ ok: true, propertyId, indexes: rows });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const databaseUrl = getDatabaseUrl();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }
  if (!databaseUrl) {
    return NextResponse.json({ ok: false, error: "Missing database connection string." }, { status: 500 });
  }

  let body: IndexRequest;
  try {
    body = (await request.json()) as IndexRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "The request was not valid JSON." }, { status: 400 });
  }

  const propertyId = cleanString(body.propertyId, "2000");
  const document =
    body.document && typeof body.document === "object" && !Array.isArray(body.document)
      ? (body.document as AtlasDocument)
      : null;
  if (!document) {
    return NextResponse.json({ ok: false, error: "Document is required." }, { status: 400 });
  }

  const files = documentFiles(document);
  if (!files.length) {
    return NextResponse.json({ ok: true, propertyId, results: [] });
  }

  const sql = neon(databaseUrl);
  await ensureKnowledgeTable(sql);
  const force = body.force === true;
  const selected = isFocusedTechnicalDrawing(files[0].searchText)
    ? files.filter((file) => isFocusedTechnicalDrawing(file.searchText)).slice(0, 2)
    : files.slice(0, 1);

  const results = [];
  for (const file of selected) {
    results.push(await indexOne(sql, apiKey, propertyId, document, file, force));
  }

  return NextResponse.json({ ok: true, propertyId, results });
}

