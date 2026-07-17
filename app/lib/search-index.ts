import type { SearchResult } from "./atlas-types";
import type { AtlasSearchRecord } from "./search-types";

const SYNONYMS: Record<string, string[]> = {
  ai: ["assistant", "ask atlas"],
  ac: ["air conditioning", "hvac"],
  hvac: ["heating", "cooling", "air conditioning", "boiler"],
  pm: ["preventive maintenance", "maintenance"],
  wo: ["work order", "service"],
  doc: ["document", "manual", "pdf"],
  docs: ["documents", "manuals", "pdfs"],
  irrigation: ["sprinkler", "watering", "hydrawise", "lawn zone"],
  boat: ["cobalt", "seadoo", "sea-doo", "dock", "marine"],
  generator: ["kohler", "backup power"],
};

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function expandSearchTerms(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const base = normalized.split(/\s+/).filter(Boolean);
  const expanded = new Set(base);

  for (const term of base) {
    for (const synonym of SYNONYMS[term] ?? []) {
      normalizeSearchText(synonym)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => expanded.add(token));
    }
  }

  return Array.from(expanded);
}

export function buildAtlasSearchIndex(items: SearchResult[]): AtlasSearchRecord[] {
  return items.map((item) => {
    const normalizedTitle = normalizeSearchText(item.title);
    const normalizedType = normalizeSearchText(item.type);
    const searchableText = normalizeSearchText(
      [item.type, item.title, item.subtitle, item.detail].filter(Boolean).join(" "),
    );

    return {
      ...item,
      normalizedTitle,
      normalizedType,
      searchableText,
      tokens: searchableText.split(/\s+/).filter(Boolean),
    };
  });
}

