import type { SearchResult } from "./atlas-types";
import {
  buildAtlasSearchIndex,
  expandSearchTerms,
  normalizeSearchText,
} from "./search-index";
import type {
  AtlasSearchMatch,
  AtlasSearchRecord,
} from "./search-types";

const SEARCH_FILLER_WORDS = new Set([
  "a",
  "about",
  "all",
  "an",
  "and",
  "anything",
  "everything",
  "find",
  "for",
  "from",
  "give",
  "in",
  "is",
  "list",
  "me",
  "of",
  "on",
  "related",
  "show",
  "the",
  "to",
  "what",
  "with",
]);

function meaningfulTerms(query: string) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter(
      (term) => term && !SEARCH_FILLER_WORDS.has(term),
    );
}

function wantsRelationshipResults(query: string) {
  return /\b(everything|anything|all|related|connected|history|records?|documents?|manuals?|work orders?|procedures?|vendors?)\b/i.test(
    query,
  );
}

function relationshipKeys(result: SearchResult) {
  return new Set(
    (result.relatedIds || []).filter(Boolean),
  );
}

function sharesRelationship(
  left: SearchResult,
  right: SearchResult,
) {
  const leftKeys = relationshipKeys(left);
  if (!leftKeys.size) return false;

  return (right.relatedIds || []).some((key) =>
    leftKeys.has(key),
  );
}

function termScore(
  record: AtlasSearchRecord,
  term: string,
): number {
  if (!term) return 0;
  if (record.normalizedTitle === term) return 130;
  if (record.normalizedTitle.startsWith(term)) return 95;
  if (record.normalizedTitle.includes(term)) return 70;
  if (record.normalizedType === term) return 45;
  if (record.tokens.includes(term)) return 32;

  if (
    record.tokens.some((token) =>
      token.startsWith(term),
    )
  ) {
    return 20;
  }

  if (record.searchableText.includes(term)) return 12;
  return 0;
}

export function searchAtlas(
  items: SearchResult[],
  query: string,
  limit = 30,
): SearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const usefulTerms = meaningfulTerms(query);
  const directTerms = usefulTerms.length
    ? usefulTerms
    : normalizedQuery.split(/\s+/).filter(Boolean);

  const expandedTerms = Array.from(
    new Set([
      ...directTerms,
      ...expandSearchTerms(directTerms.join(" ")),
    ]),
  );

  const index = buildAtlasSearchIndex(items);

  const matches: AtlasSearchMatch[] = index
    .map((record) => {
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of expandedTerms) {
        const current = termScore(record, term);

        if (current > 0) {
          score += directTerms.includes(term)
            ? current
            : Math.round(current * 0.45);

          matchedTerms.push(term);
        }
      }

      const directMatches = directTerms.filter(
        (term) => termScore(record, term) > 0,
      );

      if (directMatches.length === directTerms.length) {
        score += 80;
      }

      const meaningfulPhrase = directTerms.join(" ");

      if (
        meaningfulPhrase &&
        record.searchableText.includes(meaningfulPhrase)
      ) {
        score += 75;
      }

      if (
        record.searchableText.includes(normalizedQuery)
      ) {
        score += 60;
      }

      return {
        item: record,
        score,
        matchedTerms,
      };
    })
    .filter((match) => match.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.type.localeCompare(b.item.type) ||
        a.item.title.localeCompare(b.item.title),
    );

  const unique = new Map<string, SearchResult>();

  for (const match of matches) {
    if (!unique.has(match.item.id)) {
      unique.set(match.item.id, match.item);
    }

    if (unique.size >= limit) break;
  }

  if (
    wantsRelationshipResults(query) &&
    matches.length
  ) {
    const anchors = matches
      .slice(0, 5)
      .map((match) => match.item);

    const connected = items
      .filter(
        (candidate) =>
          !unique.has(candidate.id) &&
          anchors.some(
            (anchor) =>
              candidate.id !== anchor.id &&
              sharesRelationship(anchor, candidate),
          ),
      )
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          a.title.localeCompare(b.title),
      );

    for (const candidate of connected) {
      unique.set(candidate.id, candidate);
      if (unique.size >= limit) break;
    }
  }

  return Array.from(unique.values());
}
