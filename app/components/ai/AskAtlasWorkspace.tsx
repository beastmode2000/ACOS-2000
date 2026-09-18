"use client";

import { useState, type ReactNode } from "react";

type Props = {
  isMobile: boolean;
  main: ReactNode;
  sidebar: ReactNode;
};

type AskTurn = {
  id: string;
  question: string;
  answer: string;
};

export default function AskAtlasWorkspace({
  isMobile,
  main,
  sidebar,
}: Props) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [turns, setTurns] = useState<AskTurn[]>([]);

  async function askAtlas() {
    const nextQuestion = question.trim();
    if (!nextQuestion || asking) return;

    setAsking(true);
    setError("");

    try {
      const atlasResponse = await fetch("/api/atlas?propertyId=2000", {
        cache: "no-store",
        credentials: "include",
      });
      const atlas = await atlasResponse.json().catch(() => ({}));
      if (!atlasResponse.ok || atlas?.ok === false) {
        throw new Error(atlas?.error || "Atlas records could not be loaded.");
      }

      const response = await fetch("/api/ask-atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: nextQuestion,
          atlas,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || "Ask Atlas could not answer that question.");
      }

      setTurns((current) => [
        {
          id: `ask-${Date.now()}`,
          question: nextQuestion,
          answer: String(payload.answer || "Atlas did not return an answer."),
        },
        ...current,
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask Atlas could not answer that question.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "minmax(0, 1.45fr) minmax(300px, 0.8fr)",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <section
          style={{
            border: "1px solid #D9E2EA",
            borderRadius: 14,
            background: "#FFFFFF",
            padding: isMobile ? 12 : 14,
            display: "grid",
            gap: 9,
          }}
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void askAtlas();
              }
            }}
            placeholder="Ask Atlas anything about the property..."
            rows={isMobile ? 4 : 3}
            style={{
              width: "100%",
              minHeight: isMobile ? 110 : 86,
              boxSizing: "border-box",
              resize: "vertical",
              border: "1px solid #C9D4DD",
              borderRadius: 10,
              background: "#FFFFFF",
              color: "#1B2A36",
              padding: "11px 12px",
              fontSize: 15,
              lineHeight: 1.45,
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={() => void askAtlas()}
            disabled={asking || !question.trim()}
            style={{
              minHeight: 44,
              border: "1px solid #C99A3D",
              borderRadius: 10,
              background: "#C99A3D",
              color: "#0A2841",
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: 900,
              cursor: asking || !question.trim() ? "default" : "pointer",
              opacity: asking || !question.trim() ? 0.55 : 1,
            }}
          >
            {asking ? "Searching Atlas…" : "Ask Atlas"}
          </button>
          {error ? (
            <div
              style={{
                border: "1px solid #F1B7B0",
                borderRadius: 9,
                background: "#FFF4F2",
                color: "#B42318",
                padding: 9,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          ) : null}
        </section>

        {turns.map((turn) => (
          <section
            key={turn.id}
            style={{
              border: "1px solid #D9E2EA",
              borderRadius: 14,
              background: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "9px 11px",
                borderBottom: "1px solid #E5EBF0",
                background: "#F7F9FB",
                color: "#0A2841",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {turn.question}
            </div>
            <div
              style={{
                padding: 12,
                color: "#1B2A36",
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {turn.answer}
            </div>
          </section>
        ))}

        {main}
      </div>
      <aside style={{ display: "grid", gap: 14 }}>{sidebar}</aside>
    </div>
  );
}
