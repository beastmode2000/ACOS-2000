import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

type AskAtlasSource = {
  title: string;
  url: string;
  page?: number;
  sheetTitle?: string;
  kind?: string;
};

type StoredKnowledgeRow = {
  document_url: string;
  document_title: string;
  document_filename: string;
  search_text: string;
  knowledge: unknown;
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

type KnowledgeFile = {
  title: string;
  filename: string;
  url: string;
  kind: "Manual" | "Document";
  searchText: string;
};

const manualCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CONTEXT_LIMIT = 260000;
const MAX_KNOWLEDGE_FILES = 8;
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
          (token) => (token.length >= 3 || /^\d+$/.test(token)) && !QUESTION_STOP_WORDS.has(token),
        ),
    ),
  );
}


function exactEquipmentTerms(text: string) {
  const normalized = text.toLowerCase();
  const terms = new Set<string>();
  const patterns = [
    /\b(?:pump|boiler|unit|fan|valve|zone|circuit|loop)\s*[-#:]?\s*[a-z]?\d+[a-z]?\b/gi,
    /\b[a-z]{1,4}[- ]\d+[a-z]?\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const raw = String(match[0] || "").trim();
      if (!raw) continue;
      terms.add(raw);
      terms.add(raw.replace(/[-#:\s]+/g, " "));
      terms.add(raw.replace(/[-#:\s]+/g, ""));
    }
  }
  return Array.from(terms).filter(Boolean);
}

function isDrawingLike(text: string) {
  return /as[- ]?buil(?:t|d|ds|ts)?|as\s+buids?|blueprint|drawing|plan|schematic|diagram|hydronic\s+schematic|mechanical\s+plan/.test(
    text.toLowerCase(),
  );
}

function isTechnicalDrawingSplit(text: string) {
  const normalized = text.toLowerCase();
  return (
    isDrawingLike(normalized) &&
    /mechanical|hvac|radiant|hydronic|boiler|pump\s+schedule/.test(normalized)
  );
}

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  );
}

function snapshotPropertyId(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "2000";
  const root = snapshot as Record<string, unknown>;
  const active = root.activeProperty;
  const candidates = [
    root.propertyId,
    root.property_id,
    root.activePropertyId,
    typeof active === "object" && active && !Array.isArray(active)
      ? (active as Record<string, unknown>).id
      : "",
    typeof active === "object" && active && !Array.isArray(active)
      ? (active as Record<string, unknown>).propertyId
      : "",
  ];
  return String(candidates.find((value) => String(value ?? "").trim()) ?? "2000").trim() || "2000";
}

async function ensureDocumentKnowledgeTable(sql: ReturnType<typeof neon>) {
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
}

function technicalDocumentIntent(text: string) {
  return /\b(pump|boiler|dhw|domestic hot water|radiant|heated floor|hydronic|hvac|heating|terminal|wiring|controller|mechanical room|as[- ]?built|blueprint|drawing|schematic|diagram|manual|equipment|valve|circuit|loop|serve|served|temperature|temp)\b/i.test(
    text,
  );
}

function indexCoversQuestion(question: string, context: string) {
  const normalizedQuestion = question.toLowerCase();
  const normalizedContext = context.toLowerCase();
  const deepTerms = [
    "terminal",
    "wiring",
    "wired",
    "voltage",
    "amperage",
    "breaker",
    "terminal number",
  ];
  for (const term of deepTerms) {
    if (normalizedQuestion.includes(term) && !normalizedContext.includes(term)) {
      return false;
    }
  }
  return true;
}

function knowledgeEquipmentEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const equipment = (value as Record<string, unknown>).equipment;
  return Array.isArray(equipment)
    ? equipment.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
}

function knowledgePages(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const pages = (value as Record<string, unknown>).pages;
  return Array.isArray(pages)
    ? pages.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
}

function sourceKey(source: AskAtlasSource) {
  return `${source.url}|${source.page || 0}|${source.sheetTitle || ""}`;
}

async function loadIndexedKnowledge(
  snapshot: unknown,
  files: KnowledgeFile[],
  question: string,
  conversation: unknown[],
): Promise<{ context: string; sources: AskAtlasSource[]; matched: boolean }> {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl || !files.length) return { context: "", sources: [], matched: false };

  const propertyId = snapshotPropertyId(snapshot);
  const urls = files.map((file) => file.url).filter(Boolean);
  if (!urls.length) return { context: "", sources: [], matched: false };

  try {
    const sql = neon(databaseUrl);
    await ensureDocumentKnowledgeTable(sql);
    const rows = (await sql`
      select document_url, document_title, document_filename, search_text, knowledge
      from atlas_document_knowledge
      where property_id = ${propertyId}
        and status = 'ready'
        and document_url = any(${urls}::text[])
      order by updated_at desc
      limit 20
    `) as StoredKnowledgeRow[];
    if (!rows.length) return { context: "", sources: [], matched: false };

    const conversationText = conversation
      .map((turn) =>
        turn && typeof turn === "object" && !Array.isArray(turn)
          ? String((turn as Record<string, unknown>).text ?? "")
          : "",
      )
      .join(" ");
    const contextQuestion = `${conversationText} ${question}`.trim();
    const exactTerms = exactEquipmentTerms(contextQuestion).map((term) => term.toLowerCase());
    const tokens = questionTokens(contextQuestion);
    const relevant: Array<{ row: StoredKnowledgeRow; equipment: Record<string, unknown>[]; pages: Record<string, unknown>[] }> = [];
    const sources: AskAtlasSource[] = [];

    for (const row of rows) {
      const equipment = knowledgeEquipmentEntries(row.knowledge);
      const pages = knowledgePages(row.knowledge);
      const matchedEquipment = equipment.filter((item) => {
        const haystack = JSON.stringify(item).toLowerCase();
        if (exactTerms.length) {
          return exactTerms.some((term) => haystack.includes(term));
        }
        return tokens.some((token) => haystack.includes(token));
      });
      const matchedPages = pages.filter((item) => {
        const haystack = JSON.stringify(item).toLowerCase();
        return tokens.some((token) => haystack.includes(token));
      });

      const useWholeFocusedIndex =
        !matchedEquipment.length &&
        !matchedPages.length &&
        technicalDocumentIntent(contextQuestion) &&
        isTechnicalDrawingSplit(`${row.document_title} ${row.document_filename}`);

      if (!matchedEquipment.length && !matchedPages.length && !useWholeFocusedIndex) continue;

      const selectedEquipment = matchedEquipment.length ? matchedEquipment.slice(0, 12) : equipment.slice(0, 18);
      const selectedPages = matchedPages.length ? matchedPages.slice(0, 12) : pages.slice(0, 16);
      relevant.push({ row, equipment: selectedEquipment, pages: selectedPages });

      for (const item of selectedEquipment) {
        const page = Math.max(1, Number(item.page || 0));
        const sheetTitle = String(item.sheetTitle ?? "").trim();
        sources.push({
          title: row.document_title,
          url: row.document_url,
          page: Number.isFinite(page) ? page : undefined,
          sheetTitle: sheetTitle || undefined,
          kind: "Indexed PDF",
        });
      }
      if (!selectedEquipment.length && selectedPages.length) {
        const page = Math.max(1, Number(selectedPages[0].page || 0));
        const sheetTitle = String(selectedPages[0].sheetTitle ?? "").trim();
        sources.push({
          title: row.document_title,
          url: row.document_url,
          page: Number.isFinite(page) ? page : undefined,
          sheetTitle: sheetTitle || undefined,
          kind: "Indexed PDF",
        });
      }
    }

    if (!relevant.length) return { context: "", sources: [], matched: false };
    const compact = relevant.map(({ row, equipment, pages }) => ({
      document: row.document_title,
      filename: row.document_filename,
      url: row.document_url,
      equipment,
      pages,
    }));
    const dedupedSources = Array.from(new Map(sources.map((source) => [sourceKey(source), source])).values()).slice(0, 6);
    return {
      context: JSON.stringify(compact).slice(0, 70000),
      sources: dedupedSources,
      matched: true,
    };
  } catch (error) {
    console.warn("Ask Atlas document index lookup failed:", error);
    return { context: "", sources: [], matched: false };
  }
}

function sourcesFromPdfAnswer(
  answer: string,
  files: PreparedKnowledgeFile[],
): AskAtlasSource[] {
  if (!files.length) return [];
  const pageMatch = answer.match(/(?:pdf\s+)?page\s+(\d{1,4})/i);
  const sheetMatch = answer.match(/sheet\s+(?:\*\*)?([^\n,.]+?)(?:\*\*)?(?:[.,\n]|$)/i);
  const page = pageMatch ? Math.max(1, Number(pageMatch[1])) : undefined;
  const sheetTitle = sheetMatch?.[1]?.trim() || undefined;
  return files.slice(0, 2).map((file) => ({
    title: file.title,
    url: file.url,
    page,
    sheetTitle,
    kind: file.kind,
  }));
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

function recordPropertyId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  return String(record.propertyId ?? record.property_id ?? "").trim();
}

function snapshotIs4725(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return false;
  }
  const root = snapshot as Record<string, unknown>;
  const active = root.activeProperty;
  const candidates = [
    root.propertyId,
    root.property_id,
    root.activePropertyId,
    typeof active === "object" && active
      ? (active as Record<string, unknown>).id
      : "",
    typeof active === "object" && active
      ? (active as Record<string, unknown>).propertyId
      : "",
    typeof active === "object" && active
      ? (active as Record<string, unknown>).name
      : "",
    active,
  ];
  return candidates.some(
    (value) =>
      String(value ?? "").trim() === "4725" ||
      /\b4725\b/.test(String(value ?? "")),
  );
}

function scope4725Snapshot(snapshot: unknown): unknown {
  if (
    !snapshotIs4725(snapshot) ||
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  ) {
    return snapshot;
  }

  const root = snapshot as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(root)) {
    const normalized = key.toLowerCase();
    if (
      normalized === "portfolio" ||
      normalized === "properties" ||
      normalized === "propertysummaries" ||
      normalized === "portfolioitems" ||
      normalized === "portfolioproperties"
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value
        .filter((item) => {
          const id = recordPropertyId(item);
          return !id || id === "4725";
        })
        .map(removeHeavyData);
      continue;
    }

    if (value && typeof value === "object") {
      const id = recordPropertyId(value);
      if (id && id !== "4725") continue;
      result[key] = removeHeavyData(value);
      continue;
    }

    result[key] = value;
  }

  result.propertyId = "4725";
  if (
    result.activeProperty &&
    typeof result.activeProperty === "object" &&
    !Array.isArray(result.activeProperty)
  ) {
    result.activeProperty = {
      ...(result.activeProperty as Record<string, unknown>),
      id: "4725",
      propertyId: "4725",
    };
  }
  return result;
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
    record.linkedAssetName,
    record.locationName,
    record.area,
    record.targetName,
    record.vendorName,
    record.requesterName,
    record.documentNumber,
    record.sourceLabel,
    record.pastedText,
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
  if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) {
    return initial.slice(0, CONTEXT_LIMIT);
  }

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
        .sort((left, right) =>
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

function isPdfFile(name: string, type: string, url: string) {
  return (
    type.toLowerCase().includes("pdf") ||
    name.toLowerCase().endsWith(".pdf") ||
    /\.pdf(?:$|[?#])/i.test(url)
  );
}

const MAX_PREPARED_KNOWLEDGE_FILES = 4;
const KNOWLEDGE_FETCH_TIMEOUT_MS = 20000;
const DRAWING_FETCH_TIMEOUT_MS = 60000;

type PreparedKnowledgeFile = KnowledgeFile & {
  fileId: string;
  bytes: number;
};

type OpenAIFileCacheEntry = {
  fileId: string;
  expiresAt: number;
};

const openAIKnowledgeFileCache = new Map<string, OpenAIFileCacheEntry>();
const OPENAI_FILE_CACHE_TTL_MS = 20 * 60 * 60 * 1000;
const MAX_OPENAI_UPLOAD_BYTES = 512 * 1024 * 1024;
const CHUNKED_UPLOAD_THRESHOLD_BYTES = 48 * 1024 * 1024;
const OPENAI_UPLOAD_PART_BYTES = 32 * 1024 * 1024;

async function uploadLargeKnowledgeFileToOpenAI(
  apiKey: string,
  file: KnowledgeFile,
  buffer: Buffer,
): Promise<string | null> {
  let uploadId = "";
  let completed = false;
  try {
    const createResponse = await fetch("https://api.openai.com/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purpose: "user_data",
        filename: file.filename,
        bytes: buffer.length,
        mime_type: "application/pdf",
        expires_after: {
          anchor: "created_at",
          seconds: 24 * 60 * 60,
        },
      }),
    });

    const createPayload = (await createResponse.json()) as {
      id?: string;
      error?: { message?: string };
    };
    uploadId = String(createPayload.id ?? "").trim();

    if (!createResponse.ok || !uploadId) {
      console.warn("Ask Atlas could not create chunked OpenAI upload:", {
        title: file.title,
        status: createResponse.status,
        message: createPayload.error?.message || "",
      });
      return null;
    }

    const partIds: string[] = [];
    for (
      let offset = 0;
      offset < buffer.length;
      offset += OPENAI_UPLOAD_PART_BYTES
    ) {
      const end = Math.min(buffer.length, offset + OPENAI_UPLOAD_PART_BYTES);
      const partBuffer = buffer.subarray(offset, end);
      const form = new FormData();
      form.append(
        "data",
        new Blob([Uint8Array.from(partBuffer)], {
          type: "application/octet-stream",
        }),
        `${file.filename}.part-${partIds.length + 1}`,
      );

      const partResponse = await fetch(
        `https://api.openai.com/v1/uploads/${encodeURIComponent(uploadId)}/parts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: form,
        },
      );

      const partPayload = (await partResponse.json()) as {
        id?: string;
        error?: { message?: string };
      };
      const partId = String(partPayload.id ?? "").trim();

      if (!partResponse.ok || !partId) {
        console.warn("Ask Atlas could not upload OpenAI PDF part:", {
          title: file.title,
          uploadId,
          part: partIds.length + 1,
          status: partResponse.status,
          message: partPayload.error?.message || "",
        });
        return null;
      }

      partIds.push(partId);
    }

    const completeResponse = await fetch(
      `https://api.openai.com/v1/uploads/${encodeURIComponent(uploadId)}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ part_ids: partIds }),
      },
    );

    const completePayload = (await completeResponse.json()) as {
      id?: string;
      file_id?: string;
      file?: { id?: string };
      error?: { message?: string };
    };
    const fileId = String(
      completePayload.file?.id ??
        completePayload.file_id ??
        (String(completePayload.id ?? "").startsWith("file")
          ? completePayload.id
          : ""),
    ).trim();

    if (!completeResponse.ok || !fileId) {
      console.warn("Ask Atlas could not complete chunked OpenAI upload:", {
        title: file.title,
        uploadId,
        status: completeResponse.status,
        responseId: completePayload.id || "",
        message: completePayload.error?.message || "",
      });
      return null;
    }

    completed = true;
    return fileId;
  } catch (error) {
    console.warn("Ask Atlas chunked OpenAI upload failed:", {
      title: file.title,
      uploadId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    if (uploadId && !completed) {
      // If a part failed, cancel the abandoned upload.
      void fetch(
        `https://api.openai.com/v1/uploads/${encodeURIComponent(uploadId)}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      ).catch(() => undefined);
    }
  }
}

async function uploadKnowledgeFileToOpenAI(
  apiKey: string,
  file: KnowledgeFile,
  buffer: Buffer,
): Promise<string | null> {
  const cached = openAIKnowledgeFileCache.get(file.url);
  if (cached && cached.expiresAt > Date.now()) return cached.fileId;

  try {
    let fileId = "";

    if (buffer.length >= CHUNKED_UPLOAD_THRESHOLD_BYTES) {
      fileId =
        (await uploadLargeKnowledgeFileToOpenAI(apiKey, file, buffer)) || "";
    } else {
      const form = new FormData();
      form.append("purpose", "user_data");
      form.append("expires_after[anchor]", "created_at");
      form.append("expires_after[seconds]", String(24 * 60 * 60));
      form.append(
        "file",
        new Blob([Uint8Array.from(buffer)], { type: "application/pdf" }),
        file.filename,
      );

      const response = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });

      const payload = (await response.json()) as {
        id?: string;
        error?: { message?: string };
      };
      fileId = String(payload.id ?? "").trim();

      if (!response.ok || !fileId) {
        console.warn("Ask Atlas could not upload saved PDF to OpenAI Files:", {
          title: file.title,
          status: response.status,
          message: payload.error?.message || "",
        });
        return null;
      }
    }

    if (!fileId) return null;

    openAIKnowledgeFileCache.set(file.url, {
      fileId,
      expiresAt: Date.now() + OPENAI_FILE_CACHE_TTL_MS,
    });
    return fileId;
  } catch (error) {
    console.warn("Ask Atlas OpenAI file upload failed:", {
      title: file.title,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function fetchKnowledgeFileData(
  apiKey: string,
  file: KnowledgeFile,
): Promise<PreparedKnowledgeFile | null> {
  const cached = openAIKnowledgeFileCache.get(file.url);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...file,
      fileId: cached.fileId,
      bytes: 0,
    };
  }

  const controller = new AbortController();
  const fetchTimeoutMs = isDrawingLike(file.searchText)
    ? DRAWING_FETCH_TIMEOUT_MS
    : KNOWLEDGE_FETCH_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const response = await fetch(file.url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
      },
    });
    if (!response.ok) {
      console.warn("Ask Atlas could not fetch saved PDF:", {
        title: file.title,
        status: response.status,
      });
      return null;
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_OPENAI_UPLOAD_BYTES) {
      console.warn("Ask Atlas skipped oversized saved PDF:", {
        title: file.title,
        bytes: declaredLength,
      });
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_OPENAI_UPLOAD_BYTES) {
      console.warn("Ask Atlas skipped unreadable/oversized saved PDF:", {
        title: file.title,
        bytes: buffer.length,
      });
      return null;
    }

    const fileId = await uploadKnowledgeFileToOpenAI(apiKey, file, buffer);
    if (!fileId) return null;

    return {
      ...file,
      fileId,
      bytes: buffer.length,
    };
  } catch (error) {
    console.warn("Ask Atlas saved PDF fetch failed:", {
      title: file.title,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function prepareKnowledgeFiles(
  apiKey: string,
  files: KnowledgeFile[],
  question: string,
): Promise<PreparedKnowledgeFile[]> {
  const prepared: PreparedKnowledgeFile[] = [];
  const exactEquipmentQuestion = exactEquipmentTerms(question).length > 0;
  const drawings = files.filter((file) => isDrawingLike(file.searchText));
  const orderedFiles =
    exactEquipmentQuestion && drawings.length
      ? [
          ...drawings,
          ...files.filter((file) => !isDrawingLike(file.searchText)),
        ]
      : files;

  for (const file of orderedFiles) {
    if (prepared.length >= MAX_PREPARED_KNOWLEDGE_FILES) break;

    let loaded = await fetchKnowledgeFileData(apiKey, file);

    if (!loaded && exactEquipmentQuestion && isDrawingLike(file.searchText)) {
      console.warn("Ask Atlas retrying high-priority drawing PDF:", {
        title: file.title,
        filename: file.filename,
      });
      loaded = await fetchKnowledgeFileData(apiKey, file);
    }

    if (!loaded) continue;
    prepared.push(loaded);

    if (
      exactEquipmentQuestion &&
      isTechnicalDrawingSplit(file.searchText)
    ) {
      return [loaded];
    }
  }

  return exactEquipmentQuestion ? prepared.slice(0, 2) : prepared;
}

function selectKnowledgeFiles(
  snapshot: unknown,
  question: string,
  conversation: unknown[],
): KnowledgeFile[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return [];
  }

  const root = snapshot as Record<string, unknown>;
  const records: KnowledgeFile[] = [];

  const addRecordFiles = (kind: "Manual" | "Document", entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const title = String(record.title ?? record.name ?? kind).trim() || kind;
    const searchText = recordSearchText(record);
    const files = Array.isArray(record.files) ? record.files : [];

    for (const rawFile of files) {
      if (!rawFile || typeof rawFile !== "object" || Array.isArray(rawFile)) {
        continue;
      }
      const file = rawFile as Record<string, unknown>;
      const filename = String(file.name ?? `${title}.pdf`).trim() || `${title}.pdf`;
      const type = String(file.type ?? "").trim();
      const url = String(file.url ?? file.href ?? "").trim();
      if (!/^https:\/\//i.test(url) || !isPdfFile(filename, type, url)) continue;
      records.push({
        title,
        filename,
        url,
        kind,
        searchText: `${searchText} ${filename}`.toLowerCase(),
      });
    }

    const href = String(record.href ?? "").trim();
    if (/^https:\/\//i.test(href) && isPdfFile(title, "application/pdf", href)) {
      records.push({
        title,
        filename: title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`,
        url: href,
        kind,
        searchText: `${searchText} ${title}`.toLowerCase(),
      });
    }
  };

  (Array.isArray(root.manuals) ? root.manuals : []).forEach((entry) =>
    addRecordFiles("Manual", entry),
  );
  (Array.isArray(root.documents) ? root.documents : []).forEach((entry) =>
    addRecordFiles("Document", entry),
  );

  const deduped = Array.from(
    new Map(records.map((file) => [file.url, file])).values(),
  );
  if (!deduped.length) return [];

  const conversationText = conversation
    .map((turn) =>
      turn && typeof turn === "object" && !Array.isArray(turn)
        ? String((turn as Record<string, unknown>).text ?? "")
        : "",
    )
    .join(" ");
  const contextQuestion = `${conversationText} ${question}`.trim();
  const tokens = questionTokens(contextQuestion);
  const equipmentTerms = exactEquipmentTerms(contextQuestion);
  const mechanicalQuestion =
    /\b(mechanical room|pump|boiler|dhw|domestic hot water|radiant|heated floor|hydronic|hvac|heating|terminal|wiring|controller|vitotronic|vitocell)\b/i.test(
      contextQuestion,
    );
  const drawingQuestion =
    /\b(as[- ]?buil(?:t|d|ds|ts)?|as\s+buids?|blueprint|drawing|plan|schematic|diagram)\b/i.test(
      contextQuestion,
    );
  const manualQuestion =
    /\b(manual|installation guide|service guide|wiring diagram|documentation)\b/i.test(
      contextQuestion,
    );

  const ranked = deduped
    .map((file, index) => {
      let score = tokens.reduce(
        (total, token) =>
          total +
          (file.searchText.includes(token) ? Math.max(3, token.length) : 0),
        0,
      );
      if (
        mechanicalQuestion &&
        /mechanical|pump|boiler|heating|hydronic|hvac|vitotronic|vitocell/.test(
          file.searchText,
        )
      ) {
        score += 20;
      }
      const drawingLike = isDrawingLike(file.searchText);
      const technicalDrawingSplit = isTechnicalDrawingSplit(file.searchText);
      if (equipmentTerms.some((term) => file.searchText.includes(term))) {
        score += 80;
      }
      if (mechanicalQuestion && technicalDrawingSplit) {
        score += equipmentTerms.length ? 180 : 120;
      } else if (mechanicalQuestion && drawingLike) {
        score += equipmentTerms.length ? 60 : 28;
      }
      if (drawingQuestion && drawingLike) {
        score += 36;
      }
      if (manualQuestion && file.kind === "Manual") score += 24;
      return { file, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  if (mechanicalQuestion && equipmentTerms.length) {
    const drawings = ranked
      .filter((entry) => isDrawingLike(entry.file.searchText))
      .sort((left, right) => {
        const leftFocused = isTechnicalDrawingSplit(left.file.searchText) ? 1 : 0;
        const rightFocused = isTechnicalDrawingSplit(right.file.searchText) ? 1 : 0;
        return rightFocused - leftFocused || right.score - left.score || left.index - right.index;
      });
    const others = ranked.filter((entry) => !isDrawingLike(entry.file.searchText));
    const selected = [
      ...drawings.slice(0, Math.min(4, MAX_KNOWLEDGE_FILES)),
      ...others.slice(0, Math.max(0, MAX_KNOWLEDGE_FILES - Math.min(4, drawings.length))),
    ];
    if (selected.length < MAX_KNOWLEDGE_FILES) {
      const selectedUrls = new Set(selected.map((entry) => entry.file.url));
      selected.push(
        ...ranked
          .filter((entry) => !selectedUrls.has(entry.file.url))
          .slice(0, MAX_KNOWLEDGE_FILES - selected.length),
      );
    }
    return selected.slice(0, MAX_KNOWLEDGE_FILES).map((entry) => entry.file);
  }

  return ranked
    .slice(0, MAX_KNOWLEDGE_FILES)
    .map((entry) => entry.file);
}

function extractOutputText(payload: OpenAIResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) =>
      typeof content.text === "string"
        ? content.text
        : typeof content.refusal === "string"
          ? content.refusal
          : "",
    )
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

function isManualSearchQuestion(question: string) {
  const hasManualTerm =
    /\b(manual|owner'?s manual|user guide|installation guide|service manual|pdf|documentation|spec sheet|datasheet)\b/i.test(
      question,
    );
  if (!hasManualTerm) return false;
  return (
    /(?:\bfind\b|\blocate\b|\bdownload\b|\bget\b|\bsearch(?:\s+for)?\b|\blook\s+for\b).{0,80}\b(manual|pdf|documentation|spec sheet|datasheet)\b/i.test(
      question,
    ) ||
    /\b(manual|pdf|documentation|spec sheet|datasheet)\s+(?:for|of)\b/i.test(
      question,
    )
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
    sourceLabel:
      String(item.sourceLabel ?? sourceDomain).trim() || sourceDomain,
    confidence,
    reason:
      String(item.reason ?? "Review this result before saving.").trim() ||
      "Review this result before saving.",
    assetId: String(item.assetId ?? "").trim() || undefined,
    assetName: String(item.assetName ?? "").trim() || undefined,
  };
}

function safeResult(raw: unknown): AskAtlasResult {
  const source =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const nestedAnswer = source.answer;
  if (typeof nestedAnswer === "string") {
    const nested = parseJsonResponse(nestedAnswer);
    if (nested && typeof nested === "object") return safeResult(nested);
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
): Promise<{
  ok: boolean;
  status: number;
  payload: OpenAIResponsePayload;
}> {
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

  const home4725 = snapshotIs4725(body.atlas ?? {});
  const scopedSnapshot = scope4725Snapshot(body.atlas ?? {});
  let atlasJson = "{}";
  try {
    atlasJson = selectRelevantSnapshot(scopedSnapshot, question);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Atlas could not prepare its records." },
      { status: 400 },
    );
  }

  if (atlasJson.length > 900000) {
    return NextResponse.json(
      {
        ok: false,
        error: "The Atlas snapshot is too large for one question.",
      },
      { status: 413 },
    );
  }

  const manualSearchQuestion = isManualSearchQuestion(question);
  const allowWebSearch = body.allowWebSearch === true;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const documentModel = process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6-sol";

  if (manualSearchQuestion && allowWebSearch) {
    const cacheKey = makeCacheKey(question, atlasJson);
    const cached = manualCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ok: true, ...cached.result, cached: true });
    }

    const instructions = `You are the manual-finder inside Ask Atlas.\n\nYour only task is to find up to 3 official manufacturer PDF documents that best match the user's equipment and Atlas asset details.\n\nRules:\n- Prefer the exact manufacturer and model found in the Atlas asset list.\n- Search official manufacturer domains first.\n- Return direct public HTTPS PDF URLs whenever possible.\n- Do not use scraped manual sites, retailer uploads, file-sharing sites, or unrelated products when an official source exists.\n- Never invent a title, URL, model, or source.\n- Return only the strongest 1 to 3 matches.\n- Keep the answer under 2 sentences.\n- Never say anything was saved.\n${home4725 ? "- This request is for private property 4725. Use only 4725 asset data from the supplied snapshot and never introduce another property's records.\n" : ""}\nReturn ONLY one JSON object:\n{\n  \"answer\": \"short readable summary\",\n  \"manuals\": [\n    {\n      \"title\": \"exact document title\",\n      \"manufacturer\": \"manufacturer\",\n      \"model\": \"model\",\n      \"url\": \"direct https URL\",\n      \"sourceDomain\": \"domain\",\n      \"sourceLabel\": \"official source label\",\n      \"confidence\": \"High or Medium or Low\",\n      \"reason\": \"one short sentence explaining the match\",\n      \"assetId\": \"matching Atlas asset id or empty string\",\n      \"assetName\": \"matching Atlas asset name or empty string\"\n    }\n  ]\n}`;

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
      console.error(
        "Ask Atlas manual search error:",
        providerMessage || response.payload,
      );
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

  const knowledgeFiles = selectKnowledgeFiles(
    scopedSnapshot,
    question,
    conversation,
  );
  const indexedKnowledge = await loadIndexedKnowledge(
    scopedSnapshot,
    knowledgeFiles,
    question,
    conversation,
  );
  const conversationText = conversation
    .map((turn) =>
      turn && typeof turn === "object" && !Array.isArray(turn)
        ? String((turn as Record<string, unknown>).text ?? "")
        : "",
    )
    .join(" ");
  const technicalContextQuestion = `${conversationText} ${question}`.trim();
  const useIndexedKnowledge =
    indexedKnowledge.matched &&
    technicalDocumentIntent(technicalContextQuestion) &&
    indexCoversQuestion(question, indexedKnowledge.context);
  const preparedKnowledgeFiles = useIndexedKnowledge
    ? []
    : await prepareKnowledgeFiles(apiKey, knowledgeFiles, question);
  const preparedUrls = new Set(preparedKnowledgeFiles.map((file) => file.url));
  const sourceList = knowledgeFiles.length
    ? knowledgeFiles
        .map(
          (file, index) =>
            `${index + 1}. ${file.title} (${file.kind}) — ${file.filename}${
              indexedKnowledge.matched && indexedKnowledge.sources.some((source) => source.url === file.url)
                ? " [INDEX READY]"
                : preparedUrls.has(file.url)
                  ? " [PDF loaded]"
                  : isDrawingLike(file.searchText)
                    ? " [HIGH-PRIORITY DRAWING FAILED TO LOAD]"
                    : " [PDF not loaded]"
            }`,
        )
        .join("\n")
    : "No relevant saved PDF was selected for this question.";

  const instructions = `You are Ask Atlas, the private property-operations assistant inside Atlas.\n\nUse the supplied Atlas snapshot and any attached saved Atlas PDFs as the authority for private property facts. Resolve IDs to readable names and connect information across assets, locations, vendors, work orders, procedures, documents, manuals, parts, calendar items, requests, and service history.\nThe snapshot's activeProperty identifies the property currently selected by the user. Keep every answer scoped to that property unless the snapshot explicitly contains a portfolio-wide comparison. State the active property name when it prevents ambiguity.\n${home4725 ? "\nCRITICAL 4725 PRIVACY RULE: The active property is 4725. Answer only from 4725 records. Never reference, infer from, compare with, or reveal records from any estate property, portfolio, employee workspace, or other property even if unrelated context is accidentally supplied.\n" : ""}\n\nKnowledge rules:\n- For questions about equipment, mechanical rooms, pumps, boilers, wiring, controls, as-builts, blueprints, drawings, or manuals, use the attached saved Atlas PDFs when they contain relevant evidence.\n- A PERSISTENT DOCUMENT INDEX may be supplied. It was created earlier by inspecting the actual saved PDF page-by-page. Treat matching indexed facts as source-grounded PDF evidence and use them before reopening the PDF.\n- For follow-up questions, resolve the equipment subject from recent conversation and use its indexed aliases (for example Pump 6 / P-6 / P6) when available.\n- Treat a saved PDF's actual contents as stronger evidence than a filename or metadata guess.\n- For exact equipment questions, a loaded as-built/blueprint outranks manufacturer manuals. Inspect the drawing first, then use manuals only to explain the identified equipment.\n- When a focused Mechanical/HVAC/Radiant split drawing is loaded, use it as the primary drawing source and do not require the original full-size as-built to answer the question.\n- The source list marks each selected PDF as [PDF loaded] or [PDF not loaded]. Only claim to have inspected a PDF when it is marked [PDF loaded].\n- For exact equipment labels such as "Pump 6", "Pump 10", "B-1", or "B-2", inspect the attached drawings/manuals for that exact label and reasonable formatting variants before concluding the answer is unknown.\n- For technical questions when saved PDFs are loaded, the saved PDFs are mounted inside the Code Interpreter container. You MUST use the python tool before answering. Search those mounted PDFs page-by-page using exact and alternate labels (for example Pump 6, P-6, P6), sheet titles, schedules, legends, and nearby system terms. Do not rely on a first-pass whole-document reading.\n- When the relevant PDF is a drawing set or scanned plan, use Code Interpreter to locate likely pages and render/inspect the relevant page when text extraction alone is incomplete. Tables, schedules, callouts, and diagram labels are authoritative evidence.\n- Before saying an equipment identity is unknown, verify that the exact-label search and at least one system-context search were attempted in the loaded PDFs.\n- When a technical answer comes from a drawing, identify the source PDF and the PDF page or sheet title when it can be determined reliably.\n- Mechanical as-builts and schematics may be scanned drawings. Use both visible diagram labels and extracted text; do not rely only on searchable text.\n- Combine PDF evidence with related Atlas asset/location/service records when that makes the answer more useful.\n- Preserve conversational context: follow-up words such as \"it\", \"that pump\", or \"that room\" should resolve from the recent conversation when clear.\n- Name the source document or manual used for important technical claims. If multiple sources disagree, say so.\n- Do not invent page numbers, terminal numbers, equipment relationships, or document contents.\n- If the saved PDFs and Atlas records do not establish the answer, say exactly what is missing or unclear.\n\nAnswer rules:\n- Lead with the direct answer.\n- Answer conversationally, like a knowledgeable property expert, rather than returning search results.\n- Use exact Atlas names, dates, statuses, and quantities when available.\n- Explain the strongest connected evidence without dumping unrelated records.\n- Distinguish completed history from open or upcoming work.\n- When useful, finish with one practical next action.\n- Never invent records, dates, vendors, costs, maintenance history, relationships, or document contents.\n- Do not claim anything was changed or saved.\n\nReturn ONLY one JSON object with this exact shape:\n{\n  \"answer\": \"readable answer\"\n}`;

  const textInput = `RECENT CONVERSATION\n${JSON.stringify(conversation)}\n\nQUESTION\n${question}\n\nPERSISTENT DOCUMENT INDEX\n${indexedKnowledge.context || "No matching persistent document index was available."}\n\nSAVED PDF SOURCES ATTACHED TO THIS QUESTION\n${sourceList}\n\nATLAS SNAPSHOT\n${atlasJson}`;

  const technicalDocumentQuestion =
    !useIndexedKnowledge &&
    preparedKnowledgeFiles.length > 0 &&
    technicalDocumentIntent(technicalContextQuestion);
  const codeInterpreterFileIds = preparedKnowledgeFiles.map((file) => file.fileId);

  const content: Array<Record<string, unknown>> = technicalDocumentQuestion
    ? [{ type: "input_text", text: textInput }]
    : [
        { type: "input_text", text: textInput },
        ...preparedKnowledgeFiles.map((file) => ({
          type: "input_file",
          file_id: file.fileId,
        })),
      ];

  const responseModel = technicalDocumentQuestion ? documentModel : model;

  const requestBody: Record<string, unknown> = {
    model: responseModel,
    instructions,
    input: [{ role: "user", content }],
    ...(technicalDocumentQuestion
      ? {
          tools: [
            {
              type: "code_interpreter",
              container: {
                type: "auto",
                file_ids: codeInterpreterFileIds,
                memory_limit: "4g",
              },
            },
          ],
          tool_choice: "required",
          include: ["code_interpreter_call.outputs"],
        }
      : {}),
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
          properties: { answer: { type: "string" } },
        },
      },
    },
  };

  try {
    let response = await callOpenAI(apiKey, requestBody);

    // If the first technical document attempt fails, retry once while keeping
    // the PDFs mounted only inside Code Interpreter. Do not re-attach a large
    // drawing as a normal input_file.
    if (!response.ok && technicalDocumentQuestion && preparedKnowledgeFiles.length) {
      const toolError = response.payload.error?.message?.trim() || `HTTP ${response.status}`;
      console.warn("Ask Atlas Code Interpreter attempt failed; retrying container processing:", toolError);
      response = await callOpenAI(apiKey, {
        ...requestBody,
        model: documentModel,
      });
    }

    // Only after both container-based PDF attempts fail do we fall back to Atlas
    // metadata. Preserve the provider failure in server logs for diagnosis.
    if (!response.ok && preparedKnowledgeFiles.length) {
      const providerMessage = response.payload.error?.message?.trim() || `HTTP ${response.status}`;
      console.error("Ask Atlas PDF processing failed after direct retry:", providerMessage);
      const fallbackTextInput = `${textInput}\n\nPDF ATTACHMENT STATUS\nAtlas selected the saved PDFs for this question, but both container-based PDF processing attempts failed. Do not claim to have inspected their contents. Answer only from the Atlas snapshot and state that document processing failed if the missing PDF evidence is necessary.`;
      response = await callOpenAI(apiKey, {
        ...requestBody,
        model,
        tools: undefined,
        tool_choice: undefined,
        include: undefined,
        input: [{ role: "user", content: [{ type: "input_text", text: fallbackTextInput }] }],
      });
    }

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
    const sources = useIndexedKnowledge
      ? indexedKnowledge.sources
      : sourcesFromPdfAnswer(result.answer, preparedKnowledgeFiles);
    return NextResponse.json({ ok: true, ...result, sources, indexed: useIndexedKnowledge });
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
