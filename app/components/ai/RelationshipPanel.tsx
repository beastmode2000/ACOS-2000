"use client";

import type { SearchResult } from "../../lib/atlas-types";

type Props = {
  selected?: SearchResult;
  related: SearchResult[];
  onOpen: (result: SearchResult) => void;
  colors: {
    line: string;
    panel: string;
  };
};

export default function RelationshipPanel({
  selected,
  related,
  onOpen,
  colors,
}: Props) {
  if (!selected) return null;

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `1px solid ${colors.line}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Relationship Engine
      </div>
      <h3 style={{ margin: "4px 0 10px", fontSize: 18 }}>
        Connected to {selected.title}
      </h3>

      {related.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {related.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => onOpen(result)}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 10,
                background: colors.panel,
                padding: 10,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <strong>{result.title}</strong>
                <span style={{ fontSize: 11, opacity: 0.7, whiteSpace: "nowrap" }}>
                  {result.type}
                </span>
              </div>
              {result.subtitle ? (
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {result.subtitle}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 10,
            padding: 12,
            background: colors.panel,
          }}
        >
          No reliable connected records were found yet.
        </div>
      )}
    </div>
  );
}

