type RecordValue = Record<string, unknown>;

const STOP_WORDS = new Set([
  "about", "atlas", "does", "find", "from", "have", "need", "show", "that",
  "the", "this", "what", "when", "where", "which", "with", "would", "your",
]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function tokens(value: string) {
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word)))];
}

function searchable(record: RecordValue) {
  return Object.entries(record)
    .filter(([key]) => !["files", "photos", "completionHistory"].includes(key))
    .map(([, value]) => Array.isArray(value) ? value.join(" ") : text(value))
    .join(" ")
    .toLowerCase();
}

function score(record: RecordValue, words: string[]) {
  const haystack = searchable(record);
  const name = text(record.name || record.title).toLowerCase();
  return words.reduce((total, word) => total + (name.includes(word) ? 5 : haystack.includes(word) ? 1 : 0), 0);
}

function recordLine(kind: string, record: RecordValue) {
  const name = text(record.name || record.title) || "Untitled";
  const details = [
    text(record.status), text(record.priority), text(record.date || record.followUpDate),
    text(record.locationName), text(record.assetName), text(record.vendorName),
    text(record.make), text(record.model), text(record.phone), text(record.email),
  ].filter(Boolean);
  return `• ${kind}: ${name}${details.length ? ` — ${details.join(" · ")}` : ""}`;
}

export function answerAskAtlasFree(question: string, snapshot: unknown) {
  const atlas = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as RecordValue
    : {};
  const normalized = question.toLowerCase();
  const words = tokens(question);
  const collections: Array<[string, string]> = [
    ["Asset", "assets"], ["Location", "locations"], ["Vendor", "vendors"],
    ["Contact", "contacts"], ["Work order", "workOrders"], ["Calendar", "calendarItems"],
    ["Procedure", "procedures"], ["Manual", "manuals"], ["Part", "parts"],
    ["Document", "documents"], ["Request", "requests"],
  ];

  if (/high[- ]priority|priority.*high/.test(normalized)) {
    const work = (Array.isArray(atlas.workOrders) ? atlas.workOrders : []) as RecordValue[];
    const open = work.filter((record) => text(record.priority).toLowerCase() === "high" && text(record.status).toLowerCase() !== "completed");
    return { answer: open.length ? `High-priority open work (${open.length}):\n${open.slice(0, 12).map((record) => recordLine("Work order", record)).join("\n")}` : "There are no high-priority open work orders in the current property.", manuals: [] };
  }

  const matches = collections.flatMap(([kind, key]) => {
    const records = (Array.isArray(atlas[key]) ? atlas[key] : []) as RecordValue[];
    return records.map((record) => ({ kind, record, score: score(record, words) }));
  }).filter((match) => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);

  if (!matches.length) {
    const counts = atlas.counts && typeof atlas.counts === "object" ? atlas.counts as RecordValue : {};
    const summary = Object.entries(counts).filter(([, value]) => Number(value) > 0)
      .map(([key, value]) => `${value} ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`).join(", ");
    return {
      answer: `I couldn’t find a saved Atlas record matching “${question}.”${summary ? ` The current property contains ${summary}.` : ""} Try using the exact asset, vendor, location, or work-order name.`,
      manuals: [],
    };
  }

  const bestScore = matches[0].score;
  const strongest = matches.filter((match) => match.score >= Math.max(1, bestScore - 2)).slice(0, 8);
  return {
    answer: `I found ${strongest.length} matching Atlas record${strongest.length === 1 ? "" : "s"}:\n${strongest.map(({ kind, record }) => recordLine(kind, record)).join("\n")}`,
    manuals: [],
  };
}
