"use client";

import React, { useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";

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

type AddisonWorkData = {
  today: string;
  tasks: Array<Record<string, any>>;
  dailyNote?: string;
  dailyNoteUpdatedAt?: string;
  routine: { date: string; name: string; tasks: Array<Record<string, any>> };
  nextRoutine?: { date: string; name: string; tasks: Array<Record<string, any>> } | null;
};

type LandscapeApiData = {
  ok?: boolean;
  error?: string;
  mode?: "landscape" | "addison";
  addison?: AddisonWorkData;
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

  // Dedicated Addison Home Screen route. This intentionally survives
  // iPhone/PWA launches even when the query string is dropped.
  if (pathParts[0] === "addison-work") {
    return "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";
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
  const [addisonData, setAddisonData] = useState<AddisonWorkData | null>(null);
  const [addisonSync, setAddisonSync] = useState<"saved" | "syncing" | "offline">("saved");
  const [uploadingItemId, setUploadingItemId] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [todayWeather, setTodayWeather] = useState<{
    temperature: number;
    code: number;
    high: number;
    low: number;
    precipChance: number;
  } | null>(null);

  useEffect(() => {
    const token = getLandscapeShareTokenFromUrl();
    setShareToken(token);
    setOrigin(window.location.origin);
    void loadCurrentWeek(token);
  }, []);

  useEffect(() => {
    if (addisonData) {
      setQuickNote(String(addisonData.dailyNote || ""));
    }
  }, [addisonData?.today, addisonData?.dailyNote]);

  useEffect(() => {
    if (!addisonData || !shareToken) return;
    const timer = window.setInterval(() => {
      void loadCurrentWeek(shareToken, false);
    }, 5000);
    const onFocus = () => void loadCurrentWeek(shareToken, false);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [Boolean(addisonData), shareToken]);

  function weatherText(code: number) {
    if (code === 0) return "Clear";
    if (code === 1 || code === 2) return "Mostly clear";
    if (code === 3) return "Cloudy";
    if (code === 45 || code === 48) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Showers";
    if ([85, 86].includes(code)) return "Snow showers";
    if ([95, 96, 99].includes(code)) return "Thunderstorms";
    return "Weather";
  }

  async function loadTodayWeather() {
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=47.60&longitude=-122.20&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&forecast_days=1";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Weather failed");
      const data = await response.json();

      setTodayWeather({
        temperature: Math.round(Number(data?.current?.temperature_2m ?? 0)),
        code: Number(data?.current?.weather_code ?? 0),
        high: Math.round(Number(data?.daily?.temperature_2m_max?.[0] ?? 0)),
        low: Math.round(Number(data?.daily?.temperature_2m_min?.[0] ?? 0)),
        precipChance: Math.round(
          Number(data?.daily?.precipitation_probability_max?.[0] ?? 0),
        ),
      });
    } catch {
      setTodayWeather(null);
    }
  }

  useEffect(() => {
    void loadTodayWeather();
    const timer = window.setInterval(() => {
      void loadTodayWeather();
    }, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function patchAddison(action: string, payload: Record<string, unknown>) {
    if (!shareToken) return;
    setSaving(true);
    setAddisonSync("syncing");
    setMessage("");
    try {
      const response = await fetch(landscapeApiUrl(shareToken), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareToken, action, ...payload }),
      });
      const data = await readLandscapeJson(response, "Could not save Addison work.");
      if (!data.ok) throw new Error(data.error || "Could not save Addison work.");
      if (data.mode === "addison" && data.addison) setAddisonData(data.addison);
      setAddisonSync("saved");
      setMessage("");
    } catch (error) {
      setAddisonSync("offline");
      setMessage(error instanceof Error ? error.message : "Could not save Addison work.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAddisonPhoto(kind: "task" | "routine", itemId: string, file: File) {
    if (!shareToken || !file) return;
    setUploadingItemId(itemId);
    setAddisonSync("syncing");
    try {
      const safeName = (file.name || "photo")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const blob = await upload(
        `atlas-addison/2000/${Date.now()}-${safeName || "photo"}`,
        file,
        {
          access: "public",
          handleUploadUrl: `/api/addison-upload?token=${encodeURIComponent(shareToken)}`,
          contentType: file.type || undefined,
        },
      );
      await patchAddison(kind === "task" ? "task-photo" : "routine-photo", {
        taskId: itemId,
        photo: {
          url: blob.url,
          name: file.name || "Photo",
          createdAt: new Date().toISOString(),
        },
      });
      setAddisonSync("saved");
    } catch (error) {
      setAddisonSync("offline");
      setMessage(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setUploadingItemId("");
    }
  }

  const completedCount = items.filter((item) => item.isDone).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  const shareLink = useMemo(() => {
    if (!week || !origin) return "";
    return `${origin}/landscape-help?token=${encodeURIComponent(week.shareToken)}`;
  }, [origin, week]);

  async function loadCurrentWeek(tokenOverride = shareToken, showLoading = true) {
    if (showLoading) {
      setLoading(true);
      setMessage("");
    }

    try {
      const response = await fetch(landscapeApiUrl(tokenOverride), { cache: "no-store" });
      const data = await readLandscapeJson(response, "Could not load Landscape Help.");

      if (!data.ok) throw new Error(data.error || "Could not load Landscape Help.");

      if (data.mode === "addison" && data.addison) {
        setAddisonData(data.addison);
        setWeek(null);
        setItems([]);
        setWeeks([]);
        return;
      }

      setAddisonData(null);
      setWeek(data.week || null);
      setItems(data.items || []);
      setWeeks(data.weeks || []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not load Landscape Help.";
      setMessage(text);
    } finally {
      if (showLoading) setLoading(false);
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
          <h1 style={styles.title}>{shareToken.startsWith("addison-") ? "Atlas Today" : "Landscape Help"}</h1>
          <p style={styles.muted}>Loading...</p>
        </section>
      </main>
    );
  }

  if (addisonData) {
    const today = addisonData.today;
    const taskMeta = (task: Record<string, any>) =>
      task.taskMeta && typeof task.taskMeta === "object" ? task.taskMeta : task;
    const routineTasks = addisonData.routine?.tasks || [];
    const activeTasks = addisonData.tasks.filter((task) => taskMeta(task).status !== "Completed");
    const completedTasks = addisonData.tasks.filter((task) => taskMeta(task).status === "Completed");
    const routineDone = routineTasks.filter((task) => Boolean(task.completed) || task.status === "completed" || task.checkedNothingNeeded).length;
    const total = addisonData.tasks.length + routineTasks.length;
    const done = completedTasks.length + routineDone;
    const progress = total ? Math.round((done / total) * 100) : 0;
    const prettyToday = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric"
    });
    const isAsNeeded = (title: string) =>
      /\bas needed\b|dog area|dock|geese|trash/i.test(title);

    const itemCard = (
      kind: "task" | "routine",
      item: Record<string, any>,
      completed: boolean,
    ) => {
      const meta = kind === "task" ? taskMeta(item) : item;
      const photos = Array.isArray(meta.photos) ? meta.photos : [];
      const note = String(meta.addisonNote || meta.note || "");
      const flagged = Boolean(meta.needsNick);
      const problem = Boolean(meta.problemFound);
      const nothingNeeded = Boolean(meta.checkedNothingNeeded);
      const title = String(item.title || "Work item");
      return (
        <div key={`${kind}-${String(item.id)}`} style={{
          border: `1px solid ${problem || flagged ? colors.gold : colors.line}`,
          borderRadius: 14,
          padding: 12,
          background: completed || nothingNeeded ? "#F7FAFC" : colors.card,
          opacity: completed || nothingNeeded ? .78 : 1,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={completed}
              disabled={saving}
              onChange={() =>
                void patchAddison(
                  kind === "task" ? "task-status" : "routine-toggle",
                  kind === "task"
                    ? { taskId: item.id, status: completed ? "Open" : "Completed" }
                    : { taskId: item.id },
                )
              }
              style={{ width: 21, height: 21, marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <strong style={{
                display: "block",
                color: colors.navy,
                textDecoration: completed ? "line-through" : "none",
              }}>{title}</strong>
              {kind === "task" && meta.dueDate ? (
                <small style={{ color: colors.muted }}>Due {formatDate(String(meta.dueDate).slice(0,10))}</small>
              ) : null}
              {nothingNeeded ? <small style={{ display:"block", color: colors.muted, marginTop: 3 }}>Checked — nothing needed</small> : null}
            </div>
          </div>

          <textarea
            defaultValue={note}
            placeholder="Add a note…"
            onBlur={(event) =>
              void patchAddison(kind === "task" ? "task-note" : "routine-note", {
                taskId: item.id,
                note: event.currentTarget.value,
              })
            }
            style={{ ...styles.textarea, minHeight: 58, marginTop: 9 }}
          />

          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:8 }}>
            {isAsNeeded(title) ? (
              <button
                type="button"
                onClick={() => void patchAddison(
                  kind === "task" ? "task-nothing-needed" : "routine-nothing-needed",
                  { taskId: item.id, value: !nothingNeeded }
                )}
                style={styles.secondaryButton}
              >
                {nothingNeeded ? "Undo Nothing Needed" : "Checked — Nothing Needed"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void patchAddison(
                kind === "task" ? "task-flag" : "routine-flag",
                { taskId: item.id, needsNick: !flagged }
              )}
              style={{ ...styles.secondaryButton, borderColor: flagged ? colors.gold : colors.line }}
            >
              {flagged ? "Needs Nick ✓" : "Needs Nick"}
            </button>
            <button
              type="button"
              onClick={() => void patchAddison(
                kind === "task" ? "task-problem" : "routine-problem",
                { taskId: item.id, problemFound: !problem }
              )}
              style={{ ...styles.secondaryButton, color: problem ? colors.red : colors.text }}
            >
              {problem ? "Problem Found ✓" : "Problem Found"}
            </button>
            <label style={{ ...styles.secondaryButton, cursor:"pointer", display:"inline-flex", alignItems:"center" }}>
              {uploadingItemId === String(item.id) ? "Uploading…" : "Add Photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display:"none" }}
                disabled={uploadingItemId === String(item.id)}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void uploadAddisonPhoto(kind, String(item.id), file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {photos.length ? (
            <div style={{ display:"flex", gap:7, overflowX:"auto", marginTop:9, paddingBottom:2 }}>
              {photos.map((photo:any, index:number) => (
                <a key={`${photo.url}-${index}`} href={String(photo.url)} target="_blank" rel="noreferrer">
                  <img
                    src={String(photo.url)}
                    alt={String(photo.name || "Addison photo")}
                    style={{ width:72, height:72, objectFit:"cover", borderRadius:10, border:`1px solid ${colors.line}` }}
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      );
    };

    return (
      <main style={{ ...styles.page, padding: 14, maxWidth: 760 }}>
        <section style={{ ...styles.header, padding: 18, borderRadius: 18, marginBottom: 12 }}>
          <div style={{ width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:14, alignItems:"flex-start" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", minWidth:0 }}>
                <img
                  src="/atlas-logo.png"
                  alt="Atlas"
                  onError={(event) => {
                    const image = event.currentTarget;
                    const fallbackIndex = Number(image.dataset.fallbackIndex || "0");
                    const fallbacks = [
                      "/atlas-logo.svg",
                      "/logo.png",
                      "/icon-512.png",
                      "/icon-192.png",
                      "/apple-touch-icon.png",
                    ];
                    if (fallbackIndex < fallbacks.length) {
                      image.dataset.fallbackIndex = String(fallbackIndex + 1);
                      image.src = fallbacks[fallbackIndex];
                    }
                  }}
                  style={{
                    width:58,
                    height:58,
                    objectFit:"contain",
                    flex:"0 0 auto",
                  }}
                />
                <div style={{ minWidth:0 }}>
                  <h1 style={{ ...styles.title, fontSize:30, marginBottom:2 }}>Atlas Today</h1>
                  <div style={{ color:"white", fontWeight:800, fontSize:14 }}>Addison Hutton · 2000</div>
                  <p style={{ ...styles.subtitle, marginTop:3 }}>{prettyToday}</p>
                </div>
              </div>

              <div style={{ textAlign:"right", flex:"0 0 auto" }}>
                {todayWeather ? (
                  <>
                    <div style={{ color:"white", fontWeight:900, fontSize:27, lineHeight:1 }}>
                      {todayWeather.temperature}°
                    </div>
                    <div style={{ color:"rgba(255,255,255,.88)", fontSize:12, fontWeight:800, marginTop:4 }}>
                      {weatherText(todayWeather.code)}
                    </div>
                    <div style={{ color:"rgba(255,255,255,.68)", fontSize:11, marginTop:2 }}>
                      H {todayWeather.high}° · L {todayWeather.low}°
                    </div>
                    <div style={{ color:"rgba(255,255,255,.68)", fontSize:11 }}>
                      Rain {todayWeather.precipChance}%
                    </div>
                  </>
                ) : (
                  <div style={{ color:"rgba(255,255,255,.65)", fontSize:12 }}>Weather loading…</div>
                )}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"end", marginTop:14 }}>
              <div>
                <div style={{ height:8, background:"rgba(255,255,255,.18)", borderRadius:999, overflow:"hidden" }}>
                  <div style={{ width:`${progress}%`, height:"100%", background:colors.gold2, borderRadius:999 }} />
                </div>
                <div style={{ marginTop:7, color:"rgba(255,255,255,.72)", fontSize:12 }}>
                  {addisonSync === "syncing" ? "Syncing…" : addisonSync === "offline" ? "Offline / not saved" : "Saved"}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:"white", fontWeight:900, fontSize:22 }}>{done}/{total}</div>
                <div style={{ color:"rgba(255,255,255,.72)", fontSize:12 }}>{progress}% complete</div>
              </div>
            </div>
          </div>
        </section>

        {message ? <div style={{ ...styles.card, padding: 10, marginBottom: 10 }}>{message}</div> : null}

        <section style={{ ...styles.card, padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:9 }}>
            <div>
              <div style={styles.eyebrow}>QUICK INPUT</div>
              <h2 style={{ ...styles.cardTitle, marginBottom:0 }}>Notes</h2>
            </div>
            <span style={{ ...styles.muted, fontSize:12 }}>
              {addisonData.dailyNoteUpdatedAt ? "Saved today" : "Today"}
            </span>
          </div>
          <textarea
            value={quickNote}
            onChange={(event) => setQuickNote(event.target.value)}
            placeholder="Add a quick note for today…"
            style={{ ...styles.textarea, minHeight:88 }}
          />
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => void patchAddison("daily-note", { note: quickNote })}
              style={styles.primaryButton}
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </section>

        <section style={{ ...styles.card, padding: 16, marginBottom: 14 }}>
          <div style={styles.rowBetween}>
            <div>
              <div style={styles.eyebrow}>Routine</div>
              <h2 style={styles.cardTitle}>{addisonData.routine?.name || "Today's Routine"}</h2>
            </div>
            <strong>{routineDone}/{routineTasks.length}</strong>
          </div>
          <div style={{ display:"grid", gap:9 }}>
            {routineTasks.filter((item) => !(Boolean(item.completed) || item.status === "completed" || item.checkedNothingNeeded))
              .map((item) => itemCard("routine", item, false))}
            {!routineTasks.filter((item) => !(Boolean(item.completed) || item.status === "completed" || item.checkedNothingNeeded)).length
              ? <p style={styles.muted}>Routine complete.</p> : null}
          </div>
        </section>

        <section style={{ ...styles.card, padding: 16, marginBottom: 14 }}>
          <div style={styles.rowBetween}>
            <div>
              <div style={styles.eyebrow}>Assigned Work</div>
              <h2 style={styles.cardTitle}>My Tasks</h2>
            </div>
            <strong>{activeTasks.length} open</strong>
          </div>
          <div style={{ display:"grid", gap:9 }}>
            {activeTasks.map((item) => itemCard("task", item, false))}
            {!activeTasks.length ? <p style={styles.muted}>No open assigned tasks.</p> : null}
          </div>
        </section>

        {(completedTasks.length || routineDone) ? (
          <details style={{ ...styles.card, padding: 14, marginBottom:14 }}>
            <summary style={{ cursor:"pointer", fontWeight:900, color:colors.navy }}>Completed Today · {completedTasks.length + routineDone}</summary>
            <div style={{ display:"grid", gap:8, marginTop:10 }}>
              {routineTasks.filter((item) => Boolean(item.completed) || item.status === "completed" || item.checkedNothingNeeded)
                .map((item) => itemCard("routine", item, Boolean(item.completed) || item.status === "completed"))}
              {completedTasks.map((item) => itemCard("task", item, true))}
            </div>
          </details>
        ) : null}

        {addisonData.nextRoutine?.tasks?.length ? (
          <section style={{ ...styles.card, padding: 16 }}>
            <div style={styles.eyebrow}>Next Workday</div>
            <h2 style={styles.cardTitle}>{addisonData.nextRoutine.name}</h2>
            <p style={styles.muted}>{formatDate(addisonData.nextRoutine.date)}</p>
            <div style={{ display:"grid", gap:6 }}>
              {addisonData.nextRoutine.tasks.map((item) => (
                <div key={String(item.id)} style={{ padding:"8px 10px", border:`1px solid ${colors.line}`, borderRadius:10 }}>
                  {String(item.title || "Routine item")}
                </div>
              ))}
            </div>
          </section>
        ) : null}
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
