"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchResult } from "../../lib/atlas-types";
import { explainRelationship } from "../../lib/ai/relationship-engine";

type Props = {
  selected?: SearchResult;
  related: SearchResult[];
  onOpen: (result: SearchResult) => void;
  colors: {
    line: string;
    panel: string;
  };
};

type LinkDecision = "approved" | "dismissed";

type SavedDecision = {
  key: string;
  sourceId: string;
  relatedId: string;
  decision: LinkDecision;
  updatedAt: string;
};

const STORAGE_KEY = "atlas-ai-cross-link-decisions-v1";

function pairKey(sourceId: string, relatedId: string) {
  return [sourceId, relatedId].sort().join("::");
}

function readSavedDecisions(): SavedDecision[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDecisions(decisions: SavedDecision[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch {
    // Atlas can still show suggestions even when browser storage is unavailable.
  }
}

export default function RelationshipPanel({
  selected,
  related,
  onOpen,
  colors,
}: Props) {
  const [decisions, setDecisions] = useState<SavedDecision[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);

  useEffect(() => {
    setDecisions(readSavedDecisions());
  }, []);

  const decisionByKey = useMemo(
    () => new Map(decisions.map((decision) => [decision.key, decision])),
    [decisions],
  );

  if (!selected) return null;

  function setDecision(relatedId: string, decision: LinkDecision) {
    if (!selected) return;

    const key = pairKey(selected.id, relatedId);
    const nextDecision: SavedDecision = {
      key,
      sourceId: selected.id,
      relatedId,
      decision,
      updatedAt: new Date().toISOString(),
    };

    setDecisions((current) => {
      const next = [
        nextDecision,
        ...current.filter((entry) => entry.key !== key),
      ];
      saveDecisions(next);
      return next;
    });
  }

  function clearDecision(relatedId: string) {
    if (!selected) return;

    const key = pairKey(selected.id, relatedId);
    setDecisions((current) => {
      const next = current.filter((entry) => entry.key !== key);
      saveDecisions(next);
      return next;
    });
  }

  const visibleRelated = related.filter((result) => {
    const saved = decisionByKey.get(pairKey(selected.id, result.id));
    return showDismissed || saved?.decision !== "dismissed";
  });

  const approvedCount = related.filter(
    (result) =>
      decisionByKey.get(pairKey(selected.id, result.id))?.decision ===
      "approved",
  ).length;

  const dismissedCount = related.filter(
    (result) =>
      decisionByKey.get(pairKey(selected.id, result.id))?.decision ===
      "dismissed",
  ).length;

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
        Automatic Cross-Link Suggestions
      </div>

      <h3 style={{ margin: "4px 0 6px", fontSize: 18 }}>
        Suggested connections for {selected.title}
      </h3>

      <div
        style={{
          marginBottom: 10,
          fontSize: 12,
          opacity: 0.7,
          lineHeight: 1.45,
        }}
      >
        Review each suggested relationship. Atlas will remember approved and
        dismissed suggestions.
      </div>

      {(approvedCount > 0 || dismissedCount > 0) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 850,
          }}
        >
          {approvedCount > 0 ? (
            <span
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 999,
                padding: "4px 8px",
                background: colors.panel,
              }}
            >
              {approvedCount} approved
            </span>
          ) : null}

          {dismissedCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowDismissed((current) => !current)}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 999,
                padding: "4px 8px",
                background: colors.panel,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              {showDismissed ? "Hide" : "Show"} {dismissedCount} dismissed
            </button>
          ) : null}
        </div>
      )}

      {visibleRelated.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {visibleRelated.map((result) => {
            const saved = decisionByKey.get(pairKey(selected.id, result.id));
            const approved = saved?.decision === "approved";
            const dismissed = saved?.decision === "dismissed";
            const explanation = explainRelationship(selected, result);

            return (
              <div
                key={result.id}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  background: colors.panel,
                  padding: 10,
                  display: "grid",
                  gap: 9,
                  opacity: dismissed ? 0.65 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpen(result)}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
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
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.type}
                    </span>
                  </div>

                  {result.subtitle ? (
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                      {result.subtitle}
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "3px 7px",
                        background:
                          explanation.confidence === "Direct"
                            ? "#E9F7EE"
                            : explanation.confidence === "Strong"
                              ? "#FFF4D6"
                              : "#EEF4FF",
                        color:
                          explanation.confidence === "Direct"
                            ? "#176B3A"
                            : explanation.confidence === "Strong"
                              ? "#8A641A"
                              : "#315A9A",
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      {explanation.confidence}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.72 }}>
                      {explanation.label}
                    </span>
                  </div>
                </button>

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {approved ? (
                    <>
                      <span
                        style={{
                          borderRadius: 8,
                          padding: "7px 9px",
                          fontSize: 11,
                          fontWeight: 900,
                          background: "#E9F7EE",
                          color: "#176B3A",
                        }}
                      >
                        ✓ Approved Connection
                      </span>
                      <button
                        type="button"
                        onClick={() => clearDecision(result.id)}
                        style={smallButtonStyle(colors)}
                      >
                        Undo
                      </button>
                    </>
                  ) : dismissed ? (
                    <button
                      type="button"
                      onClick={() => clearDecision(result.id)}
                      style={smallButtonStyle(colors)}
                    >
                      Restore Suggestion
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setDecision(result.id, "approved")}
                        style={{
                          ...smallButtonStyle(colors),
                          fontWeight: 950,
                        }}
                      >
                        Approve Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision(result.id, "dismissed")}
                        style={smallButtonStyle(colors)}
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpen(result)}
                        style={smallButtonStyle(colors)}
                      >
                        Open Record
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
          {related.length
            ? "All current suggestions are dismissed."
            : "No reliable connected records were found yet."}
        </div>
      )}
    </div>
  );
}

function smallButtonStyle(colors: Props["colors"]): React.CSSProperties {
  return {
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: "transparent",
    padding: "7px 9px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 800,
  };
}
