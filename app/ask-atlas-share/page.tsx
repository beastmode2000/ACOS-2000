"use client";

import { useEffect, useState } from "react";

type Turn = {
  id: string;
  question: string;
  answer: string;
};

export default function SharedAskAtlasPage() {
  const [token, setToken] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextToken = new URL(window.location.href).searchParams.get("token") || "";
    setToken(nextToken);

    if (!nextToken) {
      setError("This Ask Atlas link is missing its access token.");
      setLoading(false);
      return;
    }

    void fetch(`/api/ask-atlas-share?token=${encodeURIComponent(nextToken)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok !== true) {
          throw new Error(payload?.error || "This Ask Atlas link could not be opened.");
        }
        setPropertyId(String(payload.propertyId || ""));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "This Ask Atlas link could not be opened."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function ask() {
    const nextQuestion = question.trim();
    if (!token || !nextQuestion || asking) return;

    setAsking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/ask-atlas-share?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: nextQuestion }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || "Ask Atlas could not answer that question.");
      }

      setTurns((current) => [
        {
          id: `turn-${Date.now()}`,
          question: nextQuestion,
          answer: String(payload.answer || "No answer was returned."),
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
    <main
      style={{
        minHeight: "100dvh",
        background: "#F4F7FA",
        padding: "max(28px, env(safe-area-inset-top)) 14px max(28px, env(safe-area-inset-bottom))",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#1B2A36",
      }}
    >
      <section
        style={{
          width: "min(760px,100%)",
          margin: "0 auto",
          display: "grid",
          gap: 12,
        }}
      >
        <header
          style={{
            border: "1px solid #D9E2EA",
            borderRadius: 16,
            background: "#0A2841",
            color: "#FFFFFF",
            padding: 18,
            boxShadow: "0 12px 30px rgba(10,40,65,.12)",
          }}
        >
          <div
            style={{
              color: "#D7AD57",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Atlas
          </div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 28 }}>Ask Atlas</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,.78)", lineHeight: 1.5, fontSize: 14 }}>
            Search the saved property records without signing in.
          </p>
          {propertyId ? (
            <div style={{ marginTop: 9, fontSize: 11, color: "rgba(255,255,255,.62)" }}>
              Property {propertyId}
            </div>
          ) : null}
        </header>

        <section
          style={{
            border: "1px solid #D9E2EA",
            borderRadius: 16,
            background: "#FFFFFF",
            padding: 14,
            display: "grid",
            gap: 9,
          }}
        >
          {loading ? <div style={{ color: "#6B7C8C", fontSize: 13 }}>Opening Ask Atlas…</div> : null}
          {error ? (
            <div
              style={{
                border: "1px solid #F1B7B0",
                background: "#FFF4F2",
                color: "#B42318",
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          {!loading && token && !error ? (
            <>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void ask();
                  }
                }}
                rows={4}
                placeholder="Ask about an asset, location, vendor, work order, calendar item, procedure, document, or part."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  minHeight: 108,
                  border: "1px solid #C9D4DD",
                  borderRadius: 11,
                  padding: 12,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: "#1B2A36",
                  background: "#FFFFFF",
                }}
              />
              <button
                type="button"
                onClick={() => void ask()}
                disabled={asking || !question.trim()}
                style={{
                  minHeight: 46,
                  border: "1px solid #C99A3D",
                  borderRadius: 10,
                  background: "#C99A3D",
                  color: "#0A2841",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: asking || !question.trim() ? "default" : "pointer",
                  opacity: asking || !question.trim() ? 0.55 : 1,
                }}
              >
                {asking ? "Searching Atlas…" : "Ask Atlas"}
              </button>
            </>
          ) : null}
        </section>

        {turns.map((turn) => (
          <article
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
                padding: "10px 12px",
                borderBottom: "1px solid #E7EDF2",
                background: "#F8FAFC",
                color: "#0A2841",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {turn.question}
            </div>
            <div
              style={{
                padding: 13,
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: 14,
              }}
            >
              {turn.answer}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
