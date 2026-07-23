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

export type RelationshipExplanation = {
  score: number;
  confidence: "Direct" | "Strong" | "Possible";
  label: string;
  sharedKeys: string[];
};

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

function relationshipKeys(record: SearchResult) {
  return Array.from(
    new Set(
      [
        ...(record.relatedIds || []),
        record.locationId ? `location:${record.locationId}` : "",
        record.assetId ? `asset:${record.assetId}` : "",
        record.vendorId ? `vendor:${record.vendorId}` : "",
        record.contactId ? `contact:${record.contactId}` : "",
        record.serviceId ? `work-order:${record.serviceId}` : "",
        record.mapLabelId ? `map:${record.mapLabelId}` : "",
        record.procedureId ? `procedure:${record.procedureId}` : "",
        record.calendarId ? `calendar:${record.calendarId}` : "",
        record.partId ? `part:${record.partId}` : "",
        record.manualId ? `manual:${record.manualId}` : "",
      ].filter(Boolean),
    ),
  );
}

function keyLabel(key: string) {
  const kind = key.split(":")[0];
  if (kind === "asset") return "the same asset";
  if (kind === "location") return "the same location";
  if (kind === "vendor") return "the same vendor";
  if (kind === "work-order") return "a work order";
  if (kind === "procedure") return "a procedure";
  if (kind === "document") return "a document";
  if (kind === "manual") return "a manual";
  if (kind === "part") return "an inventory part";
  if (kind === "calendar") return "a calendar item";
  if (kind === "contact") return "the same contact";
  if (kind === "map") return "the same map record";
  return "an Atlas record";
}

export function explainRelationship(
  source: SearchResult,
  candidate: SearchResult,
): RelationshipExplanation {
  const sourceText =
    `${source.title} ${source.subtitle} ${source.detail}`.trim();
  const candidateText =
    `${candidate.title} ${candidate.subtitle} ${candidate.detail}`.trim();
  const sourceKeys = new Set(relationshipKeys(source));
  const sharedKeys = relationshipKeys(candidate).filter((key) =>
    sourceKeys.has(key),
  );

  let score = 0;
  if (sharedKeys.length) score += 20 + Math.min(20, sharedKeys.length * 5);

  const sourceTokens = relationshipTokens(sourceText);
  const candidateTokens = new Set(relationshipTokens(candidateText));
  const sharedTokens = sourceTokens.filter((token) =>
    candidateTokens.has(token),
  );
  score += sharedTokens.reduce(
    (total, token) => total + (token.length >= 7 ? 3 : 2),
    0,
  );

  const sourceTitle = source.title.trim().toLowerCase();
  const candidateTitle = candidate.title.trim().toLowerCase();
  if (sourceTitle.length >= 4 && candidateText.toLowerCase().includes(sourceTitle))
    score += 9;
  if (
    candidateTitle.length >= 4 &&
    sourceText.toLowerCase().includes(candidateTitle)
  )
    score += 7;

  if (sharedKeys.length) {
    const labels = Array.from(new Set(sharedKeys.map(keyLabel)));
    return {
      score,
      confidence: "Direct",
      label: `Connected through ${labels.slice(0, 2).join(" and ")}`,
      sharedKeys,
    };
  }

  if (score >= 9) {
    return {
      score,
      confidence: "Strong",
      label: sharedTokens.length
        ? `Strong record match: ${sharedTokens.slice(0, 3).join(", ")}`
        : "Strong Atlas record match",
      sharedKeys,
    };
  }

  return {
    score,
    confidence: "Possible",
    label: sharedTokens.length
      ? `Possible match: ${sharedTokens.slice(0, 3).join(", ")}`
      : "Possible related record",
    sharedKeys,
  };
}

export function findRelatedRecords(
  source: SearchResult,
  allRecords: SearchResult[],
  limit = 10,
) {
  return allRecords
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => ({
      candidate,
      explanation: explainRelationship(source, candidate),
    }))
    .filter(({ explanation }) =>
      explanation.sharedKeys.length
        ? explanation.score >= 20
        : explanation.score >= 6,
    )
    .sort(
      (left, right) =>
        right.explanation.score - left.explanation.score ||
        left.candidate.title.localeCompare(right.candidate.title),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
