import type { SearchResult } from "./atlas-types";

export type AtlasSearchRecord = SearchResult & {
  searchableText: string;
  normalizedTitle: string;
  normalizedType: string;
  tokens: string[];
};

export type AtlasSearchMatch = {
  item: SearchResult;
  score: number;
  matchedTerms: string[];
};

