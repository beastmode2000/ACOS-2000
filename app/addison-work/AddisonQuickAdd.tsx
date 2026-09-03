"use client";

import React, { useMemo, useState } from "react";

const colors = {
  navy: "#0B1E33",
  gold: "#C99A3D",
  gold2: "#E6C16A",
  card: "#FFFFFF",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
  red: "#B42318",
};

function addisonToken() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get("token") || "";
  if (queryToken.trim()) return queryToken.trim();
  return "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";
}

function makeRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AddisonQuickAdd() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [requestId, setRequestId] = useState(() => makeRequestId());

  const canSave = useMemo(
    () => Boolean(title.trim() && category.trim()) && !saving,
    [title, category, saving],
  );

  function reset() {
    setTitle("");
    setCategory("");
    setNotes("");
    setError("");
    setSaved(false);
    setRequestId(makeRequestId());
  }

  function close() {
    if (saving) return;
    setOpen(false);
    reset();
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/addison-create-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: addisonToken(),
          clientRequestId: requestId,
          title: title.trim(),
          category: category.trim(),
          notes: notes.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Atlas could not add that work.");
      }

      setSaved(true);
      setTitle("");
      setCategory("");
      setNotes("");
      setRequestId(makeRequestId());

      window.dispatchEvent(new Event("focus"));

      window.setTimeout(() => {
        setOpen(false);
        setSaved(false);
      }, 700);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Atlas could not add that work.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSaved(false);
        }}
        aria-label="Add work"
        style={{
          position: "fixed",
          right: 16,
          bottom: 18,
          zIndex: 80,
          minHeight: 48,
          border: 0,
          borderRadius: 999,
          padding: "0 18px",
          background: colors.gold,
          color: colors.navy,
          fontWeight: 900,
          fontSize: 14,
          boxShadow: "0 10px 28px rgba(11,30,51,.24)",
          cursor: "pointer",
        }}
      >
        + Add Work
      </button>

      {open ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(7,27,47,.52)",
            display: "grid",
            placeItems: "end center",
            padding: 12,
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Add work"
            style={{
              width: "min(100%, 520px)",
              maxHeight: "88vh",
              overflowY: "auto",
              background: colors.card,
              border: `1px solid ${colors.line}`,
              borderRadius: 18,
              boxShadow: "0 24px 70px rgba(7,27,47,.3)",
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    color: colors.gold,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Addison
                </div>
                <h2
                  style={{
                    margin: "2px 0 0",
                    color: colors.navy,
                    fontSize: 22,
                  }}
                >
                  Add Work
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                aria-label="Close"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${colors.line}`,
                  background: "#FFFFFF",
                  color: colors.navy,
                  fontSize: 20,
                  fontWeight: 900,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <label style={{ display: "grid", gap: 5 }}>
              <span
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Title
              </span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What did you see that needs doing?"
                maxLength={160}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: 44,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  padding: "10px 11px",
                  fontSize: 15,
                  color: colors.text,
                  background: "#FFFFFF",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 5 }}>
              <span
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Category
              </span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Maintenance, Cleanup, Landscaping…"
                maxLength={80}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: 44,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  padding: "10px 11px",
                  fontSize: 15,
                  color: colors.text,
                  background: "#FFFFFF",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 5 }}>
              <span
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional details"
                maxLength={3000}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: 92,
                  resize: "vertical",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  padding: "10px 11px",
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: colors.text,
                  background: "#FFFFFF",
                }}
              />
            </label>

            {error ? (
              <div
                style={{
                  border: "1px solid #F1A7A7",
                  borderRadius: 10,
                  background: "#FFF4F4",
                  color: colors.red,
                  padding: 9,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            ) : null}

            {saved ? (
              <div
                style={{
                  border: "1px solid #BDE7D2",
                  borderRadius: 10,
                  background: "#EAF7F1",
                  color: "#087443",
                  padding: 9,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Added.
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave}
              style={{
                minHeight: 46,
                border: 0,
                borderRadius: 11,
                background: canSave ? colors.gold : "#D5DDE5",
                color: canSave ? colors.navy : colors.muted,
                fontWeight: 900,
                fontSize: 15,
                cursor: canSave ? "pointer" : "default",
              }}
            >
              {saving ? "Adding…" : "Add Work"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
