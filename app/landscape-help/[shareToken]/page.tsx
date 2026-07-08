"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type LandscapeStatus = "Not Started" | "In Progress" | "Complete" | "Needs Review";

type LandscapeWeek = {
  id: string;
  weekStart: string;
  title: string;
  shareToken: string;
  status: LandscapeStatus;
  crewName: string;
  managerNotes: string;
  crewNotes: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

type LandscapeItem = {
  id: string;
  weekId: string;
  sortOrder: number;
  label: string;
  category: string;
  priority: string;
  isDone: boolean;
  notes: string;
  updatedBy: string;
  updatedAt: string;
};

const colors = {
  navy: "#0B1E33",
  navy3: "#163B5C",
  gold: "#C99A3D",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
};

const statusOptions: LandscapeStatus[] = ["Not Started", "In Progress", "Needs Review", "Complete"];

function formatDate(date: string) {
  if (!date) return "No date";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function LandscapeHelpSharePage() {
  const params = useParams();
  const shareToken = String(params.shareToken || "");

  const [week, setWeek] = useState<LandscapeWeek | null>(null);
  const [items, setItems] = useState<LandscapeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (shareToken) void loadChecklist();
  }, [shareToken]);

  const completedCount = items.filter((item) => item.isDone).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  async function loadChecklist() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/landscape-help?token=${encodeURIComponent(shareToken)}`, { cache: "no-store" });
      const data = await response.json();

      if (!data.ok) throw new Error(data.error || "Could not load Landscape Help checklist.");

      setWeek(data.week);
      setItems(data.items || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not load Landscape Help checklist.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(id: string, changes: Partial<LandscapeItem>) {
    const updatedBy = week?.crewName?.trim() || "Landscape Help";
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes, updatedBy } : item)));
  }

  async function saveUpdates(nextStatus?: LandscapeStatus) {
    if (!week) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/landscape-help?token=${encodeURIComponent(shareToken)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus || week.status,
          crewName: week.crewName,
          crewNotes: week.crewNotes,
          items,
        }),
      });

      const data = await response.json();

      if (!data.ok) throw new Error(data.error || "Could not save Landscape Help.");

      setWeek(data.week);
      setItems(data.items || []);
      setMessage("Saved. Atlas has been updated.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not save Landscape Help.";
      setMessage(text);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>Atlas / 2000</div>
          <h1 style={styles.title}>Landscape Help</h1>
          <p style={styles.muted}>Loading checklist...</p>
        </section>
      </main>
    );
  }

  if (!week) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>Atlas / 2000</div>
          <h1 style={styles.title}>Landscape Help</h1>
          <p style={styles.muted}>{message || "This Landscape Help link was not found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.eyebrow}>Atlas / 2000</div>
        <h1 style={styles.title}>Landscape Help</h1>
        <p style={styles.subtitle}>Weekly checklist for the landscaping help. Check off completed items and add notes before saving.</p>
      </section>

      {message ? <div style={styles.message}>{message}</div> : null}

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div>
            <div style={styles.eyebrow}>Week</div>
            <h2 style={styles.cardTitle}>Week of {formatDate(week.weekStart)}</h2>
          </div>

          <select value={week.status} onChange={(event) => setWeek({ ...week, status: event.target.value as LandscapeStatus })} style={styles.statusSelect}>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div style={styles.progressShell}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>

        <p style={styles.muted}>
          {completedCount} of {items.length} items complete · {progress}%
        </p>

        <label style={styles.label}>
          Crew / Company Name
          <input value={week.crewName} onChange={(event) => setWeek({ ...week, crewName: event.target.value })} placeholder="Your name or company" style={styles.input} />
        </label>

        {week.managerNotes ? (
          <div style={styles.noteBox}>
            <strong>Notes from Atlas:</strong>
            <p>{week.managerNotes}</p>
          </div>
        ) : null}

        <div style={styles.itemList}>
          {items.map((item) => (
            <div key={item.id} style={item.isDone ? styles.itemDone : styles.item}>
              <label style={styles.checkRow}>
                <input type="checkbox" checked={item.isDone} onChange={(event) => updateItem(item.id, { isDone: event.target.checked })} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.category} · {item.priority}</small>
                </span>
              </label>

              <textarea value={item.notes} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder="Optional note..." style={styles.itemNotes} />
            </div>
          ))}
        </div>

        <label style={styles.label}>
          Final Notes
          <textarea value={week.crewNotes} onChange={(event) => setWeek({ ...week, crewNotes: event.target.value })} placeholder="Anything Atlas should know after this week's visit?" style={styles.textarea} />
        </label>

        <div style={styles.actions}>
          <button type="button" onClick={() => saveUpdates()} disabled={saving} style={styles.primaryButton}>{saving ? "Saving..." : "Save Updates"}</button>
          <button type="button" onClick={() => saveUpdates("Complete")} disabled={saving} style={styles.secondaryButton}>Save + Mark Complete</button>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    padding: 18,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  hero: {
    background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`,
    color: "white",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },
  card: {
    maxWidth: 900,
    margin: "0 auto",
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 14px 34px rgba(11,30,51,0.07)",
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    margin: "6px 0 8px",
    fontSize: 32,
    lineHeight: 1,
    letterSpacing: -0.8,
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    maxWidth: 760,
    lineHeight: 1.5,
  },
  cardTitle: {
    margin: "5px 0 10px",
    color: colors.navy,
    fontSize: 22,
  },
  muted: {
    color: colors.muted,
    lineHeight: 1.45,
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  statusSelect: {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: 11,
    fontWeight: 900,
    color: colors.navy,
    background: "white",
  },
  progressShell: {
    height: 12,
    borderRadius: 999,
    background: "#E8EEF5",
    overflow: "hidden",
    marginTop: 12,
  },
  progressBar: {
    height: "100%",
    background: colors.gold,
  },
  label: {
    display: "grid",
    gap: 7,
    fontSize: 12,
    fontWeight: 900,
    color: colors.muted,
    marginTop: 14,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    background: "white",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 100,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    resize: "vertical",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  noteBox: {
    border: "1px solid #FFD8A8",
    background: "#FFF8E6",
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    lineHeight: 1.45,
  },
  itemList: {
    display: "grid",
    gap: 10,
    marginTop: 16,
  },
  item: {
    border: `1px solid ${colors.line}`,
    background: "#FBFCFE",
    borderRadius: 16,
    padding: 14,
  },
  itemDone: {
    border: "1px solid #BDE7D2",
    background: "#EAF7F1",
    borderRadius: 16,
    padding: 14,
  },
  checkRow: {
    display: "grid",
    gridTemplateColumns: "26px 1fr",
    gap: 10,
    alignItems: "start",
    cursor: "pointer",
  },
  itemNotes: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 56,
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    marginTop: 10,
    resize: "vertical",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  primaryButton: {
    border: "none",
    background: colors.gold,
    color: colors.navy,
    fontWeight: 950,
    borderRadius: 14,
    padding: "13px 16px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: `1px solid ${colors.line}`,
    background: "#FBFCFE",
    color: colors.navy,
    fontWeight: 950,
    borderRadius: 14,
    padding: "13px 16px",
    cursor: "pointer",
  },
  message: {
    maxWidth: 900,
    margin: "0 auto 16px",
    border: `1px solid ${colors.line}`,
    background: "#FFF8E6",
    color: colors.navy,
    borderRadius: 16,
    padding: 12,
    fontWeight: 800,
  },
};
