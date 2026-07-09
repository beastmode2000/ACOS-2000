"use client";

import React, { useEffect, useMemo, useState } from "react";

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

type LandscapeApiData = {
  ok?: boolean;
  error?: string;
  week?: LandscapeWeek;
  weeks?: LandscapeWeek[];
  items?: LandscapeItem[];
};

const colors = {
  navy: "#0B1E33",
  navy2: "#102A44",
  navy3: "#163B5C",
  gold: "#C99A3D",
  gold2: "#E6C16A",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
  red: "#B42318",
};

const statusOptions: LandscapeStatus[] = ["Not Started", "In Progress", "Needs Review", "Complete"];

function formatDate(date: string) {
  if (!date) return "No date";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getLandscapeShareTokenFromUrl() {
  if (typeof window === "undefined") return "";

  const currentUrl = new URL(window.location.href);
  const tokenFromQuery = currentUrl.searchParams.get("token") || "";

  if (tokenFromQuery.trim()) return tokenFromQuery.trim();

  const pathParts = currentUrl.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "landscape-help" && pathParts[1]) {
    return decodeURIComponent(pathParts[1]);
  }

  return "";
}

function landscapeApiUrl(token: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  if (token) searchParams.set("token", token);

  const query = searchParams.toString();
  return query ? `/api/landscape-help?${query}` : "/api/landscape-help";
}

async function readLandscapeJson(response: Response, fallbackMessage: string): Promise<LandscapeApiData> {
  const text = await response.text();

  try {
    const data = JSON.parse(text) as LandscapeApiData;
    if (!response.ok) throw new Error(data.error || fallbackMessage);
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      if (text.toLowerCase().includes("atlas login")) {
        throw new Error("Landscape Help API is still asking for Atlas login. The share token is not reaching /api/landscape-help.");
      }

      throw new Error(text || fallbackMessage);
    }

    throw error;
  }
}

function getStatusStyle(status: LandscapeStatus): React.CSSProperties {
  if (status === "Complete") return { background: "#EAF7F1", color: "#087443", border: "1px solid #BDE7D2" };
  if (status === "Needs Review") return { background: "#FEECEC", color: "#B42318", border: "1px solid #FACACA" };
  if (status === "In Progress") return { background: "#EDF3FF", color: "#175CD3", border: "1px solid #C8D9FF" };
  return { background: "#FFF4E5", color: "#B54708", border: "1px solid #FFD8A8" };
}

export default function LandscapeHelpPage() {
  const [week, setWeek] = useState<LandscapeWeek | null>(null);
  const [weeks, setWeeks] = useState<LandscapeWeek[]>([]);
  const [items, setItems] = useState<LandscapeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");
  const [shareToken, setShareToken] = useState("");

  useEffect(() => {
    const token = getLandscapeShareTokenFromUrl();
    setShareToken(token);
    setOrigin(window.location.origin);
    void loadCurrentWeek(token);
  }, []);

  const completedCount = items.filter((item) => item.isDone).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  const shareLink = useMemo(() => {
    if (!week || !origin) return "";
    return `${origin}/landscape-help/${encodeURIComponent(week.shareToken)}`;
  }, [origin, week]);

  async function loadCurrentWeek(tokenOverride = shareToken) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(landscapeApiUrl(tokenOverride), { cache: "no-store" });
      const data = await readLandscapeJson(response, "Could not load Landscape Help.");

      if (!data.ok) throw new Error(data.error || "Could not load Landscape Help.");

      setWeek(data.week || null);
      setItems(data.items || []);
      setWeeks(data.weeks || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not load Landscape Help.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeek(weekId: string, tokenOverride = shareToken) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(landscapeApiUrl(tokenOverride, { weekId }), { cache: "no-store" });
      const data = await readLandscapeJson(response, "Could not load selected week.");

      if (!data.ok) throw new Error(data.error || "Could not load selected week.");

      setWeek(data.week || null);
      setItems(data.items || []);
      setWeeks(data.weeks || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not load selected week.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(id: string, changes: Partial<LandscapeItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function saveUpdates(nextStatus?: LandscapeStatus) {
    if (!week) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(landscapeApiUrl(shareToken), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: week.id,
          status: nextStatus || week.status,
          crewName: week.crewName,
          managerNotes: week.managerNotes,
          crewNotes: week.crewNotes,
          items,
        }),
      });

      const data = await readLandscapeJson(response, "Could not save Landscape Help.");

      if (!data.ok) throw new Error(data.error || "Could not save Landscape Help.");

      setWeek(data.week || null);
      setItems(data.items || []);
      setMessage("Saved.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not save Landscape Help.";
      setMessage(text);
    } finally {
      setSaving(false);
    }
  }

  async function copyShareLink() {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setMessage("Crew link copied.");
    } catch {
      setMessage(shareLink);
    }
  }

  if (loading && !week) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>Atlas / 2000</div>
          <h1 style={styles.title}>Landscape Help</h1>
          <p style={styles.muted}>Loading weekly checklist...</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Atlas / 2000</div>
          <h1 style={styles.title}>Landscape Help</h1>
          <p style={styles.subtitle}>Weekly outside-crew checklist for weeding, watering, pruning, cleanup, irrigation notes, and review items.</p>
        </div>

        <a href="/" style={styles.backLink}>Back to Atlas</a>
      </section>

      {message ? <div style={styles.message}>{message}</div> : null}

      {week ? (
        <section style={styles.grid}>
          <div style={styles.leftColumn}>
            <div style={styles.card}>
              <div style={styles.rowBetween}>
                <div>
                  <div style={styles.eyebrow}>Current Week</div>
                  <h2 style={styles.cardTitle}>Week of {formatDate(week.weekStart)}</h2>
                </div>
                <span style={{ ...styles.statusPill, ...getStatusStyle(week.status) }}>{week.status}</span>
              </div>

              <div style={styles.progressShell}>
                <div style={{ ...styles.progressBar, width: `${progress}%` }} />
              </div>

              <p style={styles.muted}>
                {completedCount} of {items.length} items complete · {progress}%
              </p>

              <div style={styles.formGrid}>
                <label style={styles.label}>
                  Status
                  <select value={week.status} onChange={(event) => setWeek({ ...week, status: event.target.value as LandscapeStatus })} style={styles.input}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>

                <label style={styles.label}>
                  Crew / Company Name
                  <input value={week.crewName} onChange={(event) => setWeek({ ...week, crewName: event.target.value })} placeholder="Example: Peter Clark crew" style={styles.input} />
                </label>
              </div>

              <label style={styles.label}>
                Manager Notes
                <textarea value={week.managerNotes} onChange={(event) => setWeek({ ...week, managerNotes: event.target.value })} placeholder="Notes for the crew before they start this week." style={styles.textarea} />
              </label>

              <label style={styles.label}>
                Crew Notes
                <textarea value={week.crewNotes} onChange={(event) => setWeek({ ...week, crewNotes: event.target.value })} placeholder="Notes from the crew after they work." style={styles.textarea} />
              </label>

              <div style={styles.actions}>
                <button type="button" onClick={() => saveUpdates()} disabled={saving} style={styles.primaryButton}>{saving ? "Saving..." : "Save Landscape Help"}</button>
                <button type="button" onClick={() => saveUpdates("Complete")} disabled={saving} style={styles.secondaryButton}>Mark Complete</button>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.eyebrow}>Crew Share Link</div>
              <h2 style={styles.cardTitle}>Send this link to the landscaping help</h2>
              <p style={styles.muted}>This opens only the weekly Landscape Help checklist. It does not show full Atlas records.</p>

              <div style={styles.shareBox}>
                <input value={shareLink} readOnly style={styles.shareInput} />
                <button type="button" onClick={copyShareLink} style={styles.primaryButton}>Copy Link</button>
              </div>

              {shareLink ? <a href={shareLink} target="_blank" rel="noreferrer" style={styles.openLink}>Open crew link</a> : null}
            </div>

            <div style={styles.card}>
              <div style={styles.eyebrow}>History</div>
              <h2 style={styles.cardTitle}>Recent Landscape Help Weeks</h2>

              <div style={styles.weekList}>
                {weeks.map((item) => (
                  <button key={item.id} type="button" onClick={() => loadWeek(item.id)} style={week.id === item.id ? styles.weekButtonActive : styles.weekButton}>
                    <strong>Week of {formatDate(item.weekStart)}</strong>
                    <span>{item.status}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.rowBetween}>
              <div>
                <div style={styles.eyebrow}>Checklist</div>
                <h2 style={styles.cardTitle}>Weekly Landscape Help Tasks</h2>
              </div>
              <button type="button" onClick={() => saveUpdates()} disabled={saving} style={styles.secondaryButton}>Save</button>
            </div>

            <div style={styles.itemList}>
              {items.map((item) => (
                <div key={item.id} style={item.isDone ? styles.itemDone : styles.item}>
                  <label style={styles.checkRow}>
                    <input type="checkbox" checked={item.isDone} onChange={(event) => updateItem(item.id, { isDone: event.target.checked, updatedBy: shareToken ? "Landscape Crew" : "Atlas Admin" })} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.category} · {item.priority}</small>
                    </span>
                  </label>

                  <textarea value={item.notes} onChange={(event) => updateItem(item.id, { notes: event.target.value, updatedBy: shareToken ? "Landscape Crew" : "Atlas Admin" })} placeholder="Optional item note..." style={styles.itemNotes} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Landscape Help did not load</h2>
          <p style={styles.muted}>Check the API route and DATABASE_URL.</p>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    padding: 24,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
    background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`,
    color: "white",
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
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
    fontSize: 34,
    lineHeight: 1,
    letterSpacing: -0.8,
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    maxWidth: 760,
    lineHeight: 1.5,
  },
  backLink: {
    color: colors.navy,
    background: "white",
    borderRadius: 999,
    padding: "10px 14px",
    textDecoration: "none",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 0.8fr) minmax(420px, 1.2fr)",
    gap: 18,
    alignItems: "start",
  },
  leftColumn: {
    display: "grid",
    gap: 18,
  },
  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 14px 34px rgba(11,30,51,0.07)",
  },
  cardTitle: {
    margin: "5px 0 12px",
    color: colors.navy,
    fontSize: 22,
  },
  muted: {
    color: colors.muted,
    lineHeight: 1.45,
    margin: "8px 0",
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  statusPill: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
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
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 14,
  },
  label: {
    display: "grid",
    gap: 7,
    fontSize: 12,
    fontWeight: 900,
    color: colors.muted,
    marginTop: 12,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    background: "white",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 90,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    resize: "vertical",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
  },
  primaryButton: {
    border: "none",
    background: colors.gold,
    color: colors.navy,
    fontWeight: 950,
    borderRadius: 14,
    padding: "11px 14px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: `1px solid ${colors.line}`,
    background: "#FBFCFE",
    color: colors.navy,
    fontWeight: 950,
    borderRadius: 14,
    padding: "11px 14px",
    cursor: "pointer",
  },
  shareBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    marginTop: 12,
  },
  shareInput: {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    overflow: "hidden",
  },
  openLink: {
    display: "inline-block",
    marginTop: 12,
    color: colors.navy,
    fontWeight: 900,
  },
  weekList: {
    display: "grid",
    gap: 8,
  },
  weekButton: {
    border: `1px solid ${colors.line}`,
    background: "#FBFCFE",
    borderRadius: 14,
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    color: colors.text,
  },
  weekButtonActive: {
    border: `1px solid ${colors.gold}`,
    background: "#FFF8E6",
    borderRadius: 14,
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    color: colors.text,
  },
  itemList: {
    display: "grid",
    gap: 10,
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
    gridTemplateColumns: "24px 1fr",
    gap: 10,
    alignItems: "start",
    cursor: "pointer",
  },
  itemNotes: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 54,
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    marginTop: 10,
    resize: "vertical",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  message: {
    border: `1px solid ${colors.line}`,
    background: "#FFF8E6",
    color: colors.navy,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    fontWeight: 800,
  },
};
