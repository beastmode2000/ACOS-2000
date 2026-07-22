import type { SearchResult } from "../atlas-types";

const IGNORED_TOKENS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "general",
  "online",
  "open",
  "completed",
  "scheduled",
  "medium",
  "high",
  "low",
  "document",
  "manual",
  "asset",
  "vendor",
  "location",
  "procedure",
  "calendar",
  "work",
  "order",
  "photo",
]);

function relationshipTokens(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !IGNORED_TOKENS.has(token)),
    ),
  );
}

function relationshipIds(record: SearchResult) {
  return [
    ...(record.relatedIds || []),
    record.locationId,
    record.assetId,
    record.vendorId,
    record.contactId,
    record.serviceId,
    record.mapLabelId,
    record.procedureId,
    record.calendarId,
    record.partId,
    record.manualId,
  ].filter(Boolean);
}

export function findRelatedRecords(
  source: SearchResult,
  allRecords: SearchResult[],
  limit = 10,
) {
  const sourceText = `${source.title} ${source.subtitle} ${source.detail}`;
  const sourceTokens = relationshipTokens(sourceText);
  const sourceIds = new Set(relationshipIds(source));

  return allRecords
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => {
      let score = 0;
      const candidateIds = relationshipIds(candidate);

      const sharedIds = candidateIds.filter((id) => sourceIds.has(id));
      if (sharedIds.length) score += 12 + Math.min(12, sharedIds.length * 4);

      const candidateText =
        `${candidate.title} ${candidate.subtitle} ${candidate.detail}`.toLowerCase();

      for (const token of sourceTokens) {
        if (candidateText.includes(token)) score += token.length >= 7 ? 3 : 2;
      }

      if (
        source.title.length >= 4 &&
        candidateText.includes(source.title.toLowerCase())
      ) {
        score += 8;
      }

      if (
        candidate.title.length >= 4 &&
        sourceText.toLowerCase().includes(candidate.title.toLowerCase())
      ) {
        score += 6;
      }

      return { candidate, score };
    })
    .filter((entry) => entry.score >= 4)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.title.localeCompare(right.candidate.title),
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
