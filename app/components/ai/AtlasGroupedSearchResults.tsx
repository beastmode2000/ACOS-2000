"use client";

import type { ReactNode } from "react";
import type { SearchResult } from "../../lib/atlas-types";

type Props = {
  results: SearchResult[];
  activeIndex: number;
  query: string;
  onHover: (index: number) => void;
  onOpen: (result: SearchResult) => void;
  highlight: (value: string) => ReactNode;
};

const GROUP_ORDER = [
  "Location",
  "Map Label",
  "Asset",
  "Work Order",
  "Procedure",
  "Document",
  "Manual",
  "Vendor",
  "Contact",
  "Part",
  "Photo",
  "Calendar",
  "Work Link",
];

function sharedKeys(
  left?: SearchResult,
  right?: SearchResult,
) {
  if (!left || !right) return [];

  const leftKeys = new Set(left.relatedIds || []);

  return (right.relatedIds || []).filter((key) =>
    leftKeys.has(key),
  );
}

function relationshipLabel(
  result: SearchResult,
  anchor?: SearchResult,
) {
  if (!anchor || result.id === anchor.id) {
    return "Direct search match";
  }

  const shared = sharedKeys(anchor, result);

  if (!shared.length) return "Matching Atlas record";

  const kinds = new Set(
    shared.map((key) => key.split(":")[0]),
  );

  if (kinds.has("asset")) {
    return "Connected through the same asset";
  }

  if (kinds.has("location")) {
    return "Connected through the same location";
  }

  if (kinds.has("vendor")) {
    return "Connected through the same vendor";
  }

  if (kinds.has("work-order")) {
    return "Connected through a work order";
  }

  if (kinds.has("procedure")) {
    return "Connected through a procedure";
  }

  return "Connected Atlas record";
}

export default function AtlasGroupedSearchResults({
  results,
  activeIndex,
  query,
  onHover,
  onOpen,
  highlight,
}: Props) {
  const anchor = results[0];

  const groups = Array.from(
    new Set(results.map((result) => result.type)),
  ).sort((a, b) => {
    const left = GROUP_ORDER.indexOf(a);
    const right = GROUP_ORDER.indexOf(b);

    return (
      (left < 0 ? 999 : left) -
        (right < 0 ? 999 : right) ||
      a.localeCompare(b)
    );
  });

  return (
    <div aria-label={`Search results for ${query}`}>
      {groups.map((type) => {
        const group = results
          .map((result, index) => ({
            result,
            index,
          }))
          .filter(
            (entry) => entry.result.type === type,
          );

        return (
          <section
            key={type}
            style={{
              borderBottom: "1px solid #E5EAF0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 10px 5px",
                background: "#F7F9FC",
                color: "#667085",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span>
                {type}
                {group.length === 1 ? "" : "s"}
              </span>

              <span>{group.length}</span>
            </div>

            {group.map(({ result, index }) => {
              const relationship =
                relationshipLabel(result, anchor);

              return (
                <button
                  key={result.id}
                  type="button"
                  onMouseEnter={() => onHover(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onOpen(result);
                  }}
                  style={{
                    width: "100%",
                    display: "grid",
                    gap: 3,
                    padding: "9px 10px",
                    border: 0,
                    borderLeft:
                      index === activeIndex
                        ? "3px solid #C99A3D"
                        : "3px solid transparent",
                    background:
                      index === activeIndex
                        ? "#FFF9E8"
                        : "#FFFFFF",
                    color: "#09243C",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <strong style={{ minWidth: 0 }}>
                      {highlight(result.title)}
                    </strong>

                    <span
                      style={{
                        flex: "0 0 auto",
                        border: "1px solid #D8E0E8",
                        borderRadius: 999,
                        padding: "2px 6px",
                        fontSize: 9,
                        fontWeight: 850,
                      }}
                    >
                      {result.type}
                    </span>
                  </span>

                  <span
                    style={{
                      color: "#667085",
                      fontSize: 11,
                    }}
                  >
                    {highlight(result.subtitle)}
                  </span>

                  <span
                    style={{
                      color: relationship.startsWith(
                        "Connected",
                      )
                        ? "#8A641A"
                        : "#667085",
                      fontSize: 10,
                      fontWeight: 750,
                    }}
                  >
                    {relationship}
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
