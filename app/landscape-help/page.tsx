"use client";

import React, { useEffect, useMemo, useState } from "react";

type LandscapeStatus =
  | "Not Started"
  | "In Progress"
  | "Complete"
  | "Needs Review";

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
  bg: "#F5F7FA",
  card: "#FFFFFF",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
};

const statusOptions: LandscapeStatus[] = [
  "Not Started",
  "In Progress",
  "Needs Review",
  "Complete",
];

function formatDate(date: string) {
  if (!date) return "No date";

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function landscapeApiUrl(
  token: string,
  params: Record<string, string> = {},
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  if (token) searchParams.set("token", token);

  const query = searchParams.toString();
  return query
    ? `/api/landscape-help?${query}`
    : "/api/landscape-help";
}

async function readLandscapeJson(
  response: Response,
  fallbackMessage: string,
): Promise<LandscapeApiData> {
  const text = await response.text();

  try {
    const data = JSON.parse(text) as LandscapeApiData;
    if (!response.ok) throw new Error(data.error || fallbackMessage);
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      if (text.toLowerCase().includes("atlas login")) {
        throw new Error(
          "Landscape Help API is still asking for Atlas login. The share token is not reaching /api/landscape-help.",
        );
      }

      throw new Error(text || fallbackMessage);
    }

    throw error;
  }
}

function getStatusClass(status: LandscapeStatus) {
  if (status === "Complete") return "lh-status-complete";
  if (status === "Needs Review") return "lh-status-review";
  if (status === "In Progress") return "lh-status-progress";
  return "lh-status-not-started";
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
  const [editingTasks, setEditingTasks] = useState(false);

  useEffect(() => {
    const token = getLandscapeShareTokenFromUrl();
    setShareToken(token);
    setOrigin(window.location.origin);
    void loadCurrentWeek(token);
  }, []);

  const completedCount = items.filter((item) => item.isDone).length;
  const progress = items.length
    ? Math.round((completedCount / items.length) * 100)
    : 0;

  const shareLink = useMemo(() => {
    if (!week || !origin) return "";

    return `${origin}/landscape-help?token=${encodeURIComponent(
      week.shareToken,
    )}`;
  }, [origin, week]);

  async function loadCurrentWeek(tokenOverride = shareToken) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(landscapeApiUrl(tokenOverride), {
        cache: "no-store",
      });

      const data = await readLandscapeJson(
        response,
        "Could not load Daily Crew Work.",
      );

      if (!data.ok) {
        throw new Error(
          data.error || "Could not load Daily Crew Work.",
        );
      }

      setWeek(data.week || null);
      setItems(data.items || []);
      setWeeks(data.weeks || []);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Could not load Daily Crew Work.";

      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeek(
    weekId: string,
    tokenOverride = shareToken,
  ) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        landscapeApiUrl(tokenOverride, { weekId }),
        { cache: "no-store" },
      );

      const data = await readLandscapeJson(
        response,
        "Could not load selected week.",
      );

      if (!data.ok) {
        throw new Error(
          data.error || "Could not load selected week.",
        );
      }

      setWeek(data.week || null);
      setItems(data.items || []);
      setWeeks(data.weeks || []);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Could not load selected week.";

      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(
    id: string,
    changes: Partial<LandscapeItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  }

  function addTask() {
    const id = crypto.randomUUID();
    setItems((current) => [
      ...current,
      {
        id,
        weekId: week?.id || "",
        sortOrder: current.length + 1,
        label: "New task",
        category: "General",
        priority: "Normal",
        isDone: false,
        notes: "",
        updatedBy: "Atlas Admin",
        updatedAt: "",
      },
    ]);
    setEditingTasks(true);
  }

  function deleteTask(id: string) {
    setItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sortOrder: index + 1 })),
    );
  }

  function moveTask(id: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, itemIndex) => ({
        ...item,
        sortOrder: itemIndex + 1,
      }));
    });
  }

  async function saveUpdates(
    nextStatus?: LandscapeStatus,
  ) {
    if (!week) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        landscapeApiUrl(shareToken),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weekId: week.id,
            title: week.title,
            status: nextStatus || week.status,
            crewName: week.crewName,
            managerNotes: week.managerNotes,
            crewNotes: week.crewNotes,
            items,
          }),
        },
      );

      const data = await readLandscapeJson(
        response,
        "Could not save Daily Crew Work.",
      );

      if (!data.ok) {
        throw new Error(
          data.error || "Could not save Daily Crew Work.",
        );
      }

      setWeek(data.week || null);
      setItems(data.items || []);
      setMessage("Saved.");
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Could not save Daily Crew Work.";

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
      <>
        <LandscapeHelpStyles />

        <main className="lh-page">
          <div className="lh-shell">
            <section className="lh-card lh-loading-card">
              <div className="lh-eyebrow">
                Atlas / 2000
              </div>

              <h1 className="lh-title lh-loading-title">
                Daily Crew Work
              </h1>

              <p className="lh-muted">
                Loading crew work list...
              </p>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <LandscapeHelpStyles />

      <main className="lh-page">
        <div className="lh-shell">
          <section className="lh-header">
            <div className="lh-header-copy">
              <div className="lh-eyebrow">
                Atlas / 2000
              </div>

              <h1 className="lh-title">
                Daily Crew Work
              </h1>

              <p className="lh-subtitle">
                Assign, share, and track daily or weekly work for landscaping,
                maintenance, cleaning, seasonal help, and other crew members.
              </p>
            </div>

            <a
              href="/"
              className="lh-back-link"
            >
              Back to Atlas
            </a>
          </section>

          {message ? (
            <div
              className="lh-message"
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          ) : null}

          {week ? (
            <section
              className="lh-main-grid"
              aria-busy={saving || loading}
            >
              <div className="lh-controls-column">
                <div className="lh-card">
                  <div className="lh-row-between">
                    <div className="lh-min-width-zero">
                      <div className="lh-eyebrow">
                        Work List
                      </div>

                      <h2 className="lh-card-title">
                        Week of{" "}
                        {formatDate(week.weekStart)}
                      </h2>
                    </div>

                    <span
                      className={`lh-status-pill ${getStatusClass(
                        week.status,
                      )}`}
                    >
                      {week.status}
                    </span>
                  </div>

                  <div
                    className="lh-progress-shell"
                    aria-label={`${progress}% complete`}
                  >
                    <div
                      className="lh-progress-bar"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <p className="lh-muted">
                    {completedCount} of {items.length} items
                    complete · {progress}%
                  </p>

                  {!shareToken ? (
                    <label className="lh-label">
                      <span>List Title</span>
                      <input
                        value={week.title}
                        onChange={(event) =>
                          setWeek({ ...week, title: event.target.value })
                        }
                        className="lh-input"
                      />
                    </label>
                  ) : null}

                  <div className="lh-form-grid">
                    <label className="lh-label">
                      <span>Status</span>

                      <select
                        value={week.status}
                        onChange={(event) =>
                          setWeek({
                            ...week,
                            status:
                              event.target
                                .value as LandscapeStatus,
                          })
                        }
                        className="lh-input"
                      >
                        {statusOptions.map((status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="lh-label">
                      <span>
                        Crew / Company Name
                      </span>

                      <input
                        value={week.crewName}
                        onChange={(event) =>
                          setWeek({
                            ...week,
                            crewName:
                              event.target.value,
                          })
                        }
                        placeholder="Example: Peter Clark crew"
                        className="lh-input"
                      />
                    </label>
                  </div>

                  {!shareToken ? (
                  <label className="lh-label">
                    <span>Manager Notes</span>

                    <textarea
                      value={week.managerNotes}
                      onChange={(event) =>
                        setWeek({
                          ...week,
                          managerNotes:
                            event.target.value,
                        })
                      }
                      placeholder="Notes for the crew before they start this week."
                      className="lh-textarea"
                    />
                  </label>

                  ) : week.managerNotes ? (
                    <div className="lh-readonly-note">
                      <strong>Instructions</strong>
                      <p>{week.managerNotes}</p>
                    </div>
                  ) : null}

                  <label className="lh-label">
                    <span>Crew Notes</span>

                    <textarea
                      value={week.crewNotes}
                      onChange={(event) =>
                        setWeek({
                          ...week,
                          crewNotes:
                            event.target.value,
                        })
                      }
                      placeholder="Notes from the crew after they work."
                      className="lh-textarea"
                    />
                  </label>

                  <div className="lh-actions">
                    <button
                      type="button"
                      onClick={() => saveUpdates()}
                      disabled={saving}
                      className="lh-button lh-button-primary"
                    >
                      {saving
                        ? "Saving..."
                        : "Save Work List"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        saveUpdates("Complete")
                      }
                      disabled={saving}
                      className="lh-button lh-button-secondary"
                    >
                      Mark Complete
                    </button>
                  </div>
                </div>

                <div className="lh-card">
                  <div className="lh-eyebrow">
                    Crew Share Link
                  </div>

                  <h2 className="lh-card-title">
                    Send this link to the assigned crew member
                  </h2>

                  <p className="lh-muted">
                    This opens only this crew work list. It does not show full Atlas records.
                  </p>

                  <div className="lh-share-box">
                    <input
                      value={shareLink}
                      readOnly
                      className="lh-share-input"
                      aria-label="Daily Crew Work share link"
                    />

                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="lh-button lh-button-primary"
                    >
                      Copy Link
                    </button>
                  </div>

                  {shareLink ? (
                    <a
                      href={shareLink}
                      target="_blank"
                      rel="noreferrer"
                      className="lh-open-link"
                    >
                      Open crew link
                    </a>
                  ) : null}
                </div>

                <div className="lh-card">
                  <div className="lh-eyebrow">
                    History
                  </div>

                  <h2 className="lh-card-title">
                    Recent Work Lists
                  </h2>

                  <div className="lh-week-list">
                    {weeks.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          loadWeek(item.id)
                        }
                        className={
                          week.id === item.id
                            ? "lh-week-button lh-week-button-active"
                            : "lh-week-button"
                        }
                      >
                        <strong>
                          Week of{" "}
                          {formatDate(
                            item.weekStart,
                          )}
                        </strong>

                        <span>{item.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lh-card lh-checklist-card">
                <div className="lh-row-between lh-checklist-heading">
                  <div className="lh-min-width-zero">
                    <div className="lh-eyebrow">
                      Checklist
                    </div>

                    <h2 className="lh-card-title">
                      Assigned Tasks
                    </h2>
                  </div>

                  <div className="lh-task-header-actions">
                    {!shareToken ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingTasks((current) => !current)}
                          className="lh-button lh-button-secondary"
                        >
                          {editingTasks ? "Done Editing" : "Edit Tasks"}
                        </button>
                        <button
                          type="button"
                          onClick={addTask}
                          className="lh-button lh-button-secondary"
                        >
                          Add Task
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => saveUpdates()}
                      disabled={saving}
                      className="lh-button lh-button-secondary lh-top-save-button"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                <div className="lh-item-list">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={item.isDone ? "lh-item lh-item-done" : "lh-item"}
                    >
                      {!shareToken && editingTasks ? (
                        <div className="lh-task-editor">
                          <input
                            value={item.label}
                            onChange={(event) =>
                              updateItem(item.id, { label: event.target.value })
                            }
                            className="lh-input lh-task-title-input"
                          />
                          <div className="lh-task-editor-grid">
                            <input
                              value={item.category}
                              onChange={(event) =>
                                updateItem(item.id, { category: event.target.value })
                              }
                              className="lh-input"
                              aria-label="Task category"
                            />
                            <select
                              value={item.priority}
                              onChange={(event) =>
                                updateItem(item.id, { priority: event.target.value })
                              }
                              className="lh-input"
                              aria-label="Task priority"
                            >
                              <option value="Highest">Highest</option>
                              <option value="High">High</option>
                              <option value="Normal">Normal</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>
                          <div className="lh-task-edit-actions">
                            <button type="button" onClick={() => moveTask(item.id, -1)} disabled={index === 0} className="lh-small-button">Move Up</button>
                            <button type="button" onClick={() => moveTask(item.id, 1)} disabled={index === items.length - 1} className="lh-small-button">Move Down</button>
                            <button type="button" onClick={() => deleteTask(item.id)} className="lh-small-button lh-small-button-danger">Delete</button>
                          </div>
                        </div>
                      ) : (
                        <label className="lh-check-row">
                          <input
                            type="checkbox"
                            checked={item.isDone}
                            onChange={(event) =>
                              updateItem(item.id, {
                                isDone: event.target.checked,
                                updatedBy: shareToken ? "Crew" : "Atlas Admin",
                              })
                            }
                            className="lh-checkbox"
                          />
                          <span className="lh-item-copy">
                            <strong>{item.label}</strong>
                            <small>{item.category} · {item.priority}</small>
                          </span>
                        </label>
                      )}

                      <textarea
                        value={item.notes}
                        onChange={(event) =>
                          updateItem(item.id, {
                            notes: event.target.value,
                            updatedBy: shareToken ? "Crew" : "Atlas Admin",
                          })
                        }
                        placeholder="Optional task note..."
                        className="lh-item-notes"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="lh-card">
              <h2 className="lh-card-title">
                Daily Crew Work did not load
              </h2>

              <p className="lh-muted">
                Check the API route and DATABASE_URL.
              </p>
            </section>
          )}
        </div>

        {week ? (
          <div className="lh-mobile-save-bar">
            <div className="lh-mobile-progress-copy">
              <strong>
                {progress}% complete
              </strong>

              <span>
                {completedCount}/{items.length} tasks
              </span>
            </div>

            <button
              type="button"
              onClick={() => saveUpdates()}
              disabled={saving}
              className="lh-button lh-button-primary lh-mobile-save-button"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : null}
      </main>
    </>
  );
}

function LandscapeHelpStyles() {
  return (
    <style>{`
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-width: 0;
        overflow-x: hidden;
        background: ${colors.bg};
      }

      button,
      input,
      select,
      textarea {
        font: inherit;
      }

      .lh-page {
        min-height: 100vh;
        min-height: 100dvh;
        background: ${colors.bg};
        color: ${colors.text};
        padding: 24px;
        font-family: Arial, Helvetica, sans-serif;
        overflow-x: hidden;
      }

      .lh-shell {
        width: min(100%, 1440px);
        margin: 0 auto;
        min-width: 0;
      }

      .lh-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        min-width: 0;
        margin-bottom: 18px;
        padding: 24px;
        border-radius: 24px;
        color: white;
        background: linear-gradient(
          135deg,
          ${colors.navy},
          ${colors.navy3}
        );
      }

      .lh-header-copy,
      .lh-min-width-zero {
        min-width: 0;
      }

      .lh-eyebrow {
        color: ${colors.gold};
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1.2px;
      }

      .lh-title {
        margin: 6px 0 8px;
        font-size: clamp(30px, 4vw, 40px);
        line-height: 1.02;
        letter-spacing: -0.8px;
        overflow-wrap: anywhere;
      }

      .lh-loading-title {
        color: ${colors.navy};
      }

      .lh-subtitle {
        max-width: 760px;
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.5;
      }

      .lh-back-link {
        flex: 0 0 auto;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 14px;
        border-radius: 999px;
        color: ${colors.navy};
        background: white;
        text-decoration: none;
        font-weight: 900;
        white-space: nowrap;
      }

      .lh-main-grid {
        display: grid;
        grid-template-columns:
          minmax(300px, 0.82fr)
          minmax(0, 1.18fr);
        grid-template-areas:
          "controls checklist";
        gap: 18px;
        align-items: start;
        min-width: 0;
      }

      .lh-controls-column {
        grid-area: controls;
        display: grid;
        gap: 18px;
        min-width: 0;
      }

      .lh-checklist-card {
        grid-area: checklist;
        min-width: 0;
      }

      .lh-card {
        min-width: 0;
        padding: 20px;
        border: 1px solid ${colors.line};
        border-radius: 22px;
        background: ${colors.card};
        box-shadow:
          0 14px 34px
          rgba(11, 30, 51, 0.07);
      }

      .lh-loading-card {
        max-width: 620px;
      }

      .lh-card-title {
        margin: 5px 0 12px;
        color: ${colors.navy};
        font-size: clamp(20px, 2.5vw, 24px);
        line-height: 1.18;
        overflow-wrap: anywhere;
      }

      .lh-muted {
        margin: 8px 0;
        color: ${colors.muted};
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .lh-row-between {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }

      .lh-status-pill {
        flex: 0 0 auto;
        max-width: 100%;
        padding: 7px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.2;
        text-align: center;
        white-space: normal;
      }

      .lh-status-complete {
        color: #087443;
        background: #eaf7f1;
        border: 1px solid #bde7d2;
      }

      .lh-status-review {
        color: #b42318;
        background: #feecec;
        border: 1px solid #facaca;
      }

      .lh-status-progress {
        color: #175cd3;
        background: #edf3ff;
        border: 1px solid #c8d9ff;
      }

      .lh-status-not-started {
        color: #b54708;
        background: #fff4e5;
        border: 1px solid #ffd8a8;
      }

      .lh-progress-shell {
        height: 12px;
        margin-top: 12px;
        overflow: hidden;
        border-radius: 999px;
        background: #e8eef5;
      }

      .lh-progress-bar {
        height: 100%;
        border-radius: inherit;
        background: ${colors.gold};
        transition: width 160ms ease;
      }

      .lh-form-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
        min-width: 0;
      }

      .lh-label {
        display: grid;
        gap: 7px;
        min-width: 0;
        margin-top: 12px;
        color: ${colors.muted};
        font-size: 12px;
        font-weight: 900;
      }

      .lh-input,
      .lh-textarea,
      .lh-share-input,
      .lh-item-notes {
        width: 100%;
        min-width: 0;
        border: 1px solid ${colors.line};
        color: ${colors.text};
        background: white;
        outline: none;
      }

      .lh-input:focus,
      .lh-textarea:focus,
      .lh-share-input:focus,
      .lh-item-notes:focus {
        border-color: ${colors.gold};
        box-shadow:
          0 0 0 3px
          rgba(201, 154, 61, 0.18);
      }

      .lh-input,
      .lh-share-input {
        min-height: 46px;
        padding: 12px;
        border-radius: 14px;
        font-size: 14px;
      }

      .lh-textarea {
        min-height: 96px;
        padding: 12px;
        border-radius: 14px;
        font-size: 14px;
        line-height: 1.4;
        resize: vertical;
      }

      .lh-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }

      .lh-button {
        min-height: 44px;
        min-width: 0;
        border-radius: 14px;
        padding: 11px 14px;
        font-weight: 900;
        line-height: 1.2;
        cursor: pointer;
        touch-action: manipulation;
      }

      .lh-button:disabled {
        cursor: not-allowed;
        opacity: 0.62;
      }

      .lh-button-primary {
        border: 1px solid ${colors.gold};
        color: ${colors.navy};
        background: ${colors.gold};
      }

      .lh-button-secondary {
        border: 1px solid ${colors.line};
        color: ${colors.navy};
        background: #fbfcfe;
      }

      .lh-share-box {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr) auto;
        gap: 10px;
        min-width: 0;
        margin-top: 12px;
      }

      .lh-share-input {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .lh-open-link {
        display: inline-block;
        max-width: 100%;
        margin-top: 12px;
        color: ${colors.navy};
        font-weight: 900;
        overflow-wrap: anywhere;
      }

      .lh-week-list,
      .lh-item-list {
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .lh-week-button {
        width: 100%;
        min-width: 0;
        min-height: 52px;
        display: grid;
        gap: 4px;
        padding: 12px;
        border: 1px solid ${colors.line};
        border-radius: 14px;
        color: ${colors.text};
        background: #fbfcfe;
        text-align: left;
        overflow-wrap: anywhere;
        cursor: pointer;
      }

      .lh-week-button-active {
        border-color: ${colors.gold};
        background: #fff8e6;
      }

      .lh-checklist-heading {
        margin-bottom: 12px;
      }

      .lh-item {
        min-width: 0;
        padding: 14px;
        border: 1px solid ${colors.line};
        border-radius: 16px;
        background: #fbfcfe;
      }

      .lh-item-done {
        border-color: #bde7d2;
        background: #eaf7f1;
      }

      .lh-check-row {
        display: grid;
        grid-template-columns:
          28px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        min-width: 0;
        cursor: pointer;
      }

      .lh-checkbox {
        width: 24px;
        height: 24px;
        margin: 0;
        accent-color: ${colors.navy3};
        cursor: pointer;
      }

      .lh-item-copy {
        min-width: 0;
        display: grid;
        gap: 5px;
      }

      .lh-item-copy strong {
        color: ${colors.navy};
        font-size: 15px;
        line-height: 1.32;
        overflow-wrap: anywhere;
      }

      .lh-item-copy small {
        color: ${colors.muted};
        font-size: 12px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .lh-item-notes {
        min-height: 58px;
        margin-top: 11px;
        padding: 10px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.4;
        resize: vertical;
      }

      .lh-message {
        margin-bottom: 18px;
        padding: 12px;
        border: 1px solid ${colors.line};
        border-radius: 16px;
        color: ${colors.navy};
        background: #fff8e6;
        font-weight: 800;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .lh-mobile-save-bar {
        display: none;
      }

      @media (max-width: 960px) {
        .lh-page {
          padding: 16px;
        }

        .lh-main-grid {
          grid-template-columns:
            minmax(0, 1fr);
          grid-template-areas:
            "checklist"
            "controls";
        }
      }

      @media (max-width: 620px) {
        .lh-page {
          padding:
            10px
            10px
            calc(
              96px +
              env(safe-area-inset-bottom)
            );
        }

        .lh-header {
          flex-direction: column;
          gap: 16px;
          padding: 18px;
          border-radius: 18px;
        }

        .lh-title {
          font-size: 30px;
        }

        .lh-subtitle {
          font-size: 14px;
        }

        .lh-back-link {
          width: 100%;
          border-radius: 14px;
        }

        .lh-main-grid,
        .lh-controls-column {
          gap: 12px;
        }

        .lh-card {
          padding: 16px;
          border-radius: 18px;
          box-shadow:
            0 8px 24px
            rgba(11, 30, 51, 0.06);
        }

        .lh-row-between {
          flex-wrap: wrap;
        }

        .lh-form-grid {
          grid-template-columns:
            minmax(0, 1fr);
          gap: 0;
        }

        .lh-input,
        .lh-share-input,
        .lh-textarea,
        .lh-item-notes {
          font-size: 16px;
        }

        .lh-actions,
        .lh-share-box {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr);
        }

        .lh-actions .lh-button,
        .lh-share-box .lh-button,
        .lh-top-save-button {
          width: 100%;
        }

        .lh-checklist-heading {
          align-items: stretch;
        }

        .lh-item {
          padding: 13px;
        }

        .lh-mobile-save-bar {
          position: fixed;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 40;
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(104px, auto);
          gap: 12px;
          align-items: center;
          padding:
            10px
            12px
            calc(
              10px +
              env(safe-area-inset-bottom)
            );
          border-top:
            1px solid ${colors.line};
          background:
            rgba(255, 255, 255, 0.96);
          box-shadow:
            0 -8px 24px
            rgba(11, 30, 51, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter:
            blur(12px);
        }

        .lh-mobile-progress-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
          color: ${colors.navy};
        }

        .lh-mobile-progress-copy strong,
        .lh-mobile-progress-copy span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lh-mobile-progress-copy strong {
          font-size: 14px;
        }

        .lh-mobile-progress-copy span {
          color: ${colors.muted};
          font-size: 12px;
        }

        .lh-mobile-save-button {
          width: 100%;
          min-height: 48px;
        }
      }

      @media (max-width: 380px) {
        .lh-page {
          padding-right: 8px;
          padding-left: 8px;
        }

        .lh-header,
        .lh-card {
          padding: 14px;
        }

        .lh-title {
          font-size: 27px;
        }

        .lh-mobile-save-bar {
          grid-template-columns:
            minmax(0, 1fr) 96px;
          gap: 8px;
          padding-right: 8px;
          padding-left: 8px;
        }
      }

        .lh-task-header-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .lh-task-editor { display: grid; gap: 10px; }
        .lh-task-editor-grid { display: grid; grid-template-columns: 1fr 150px; gap: 10px; }
        .lh-task-title-input { font-weight: 700; }
        .lh-task-edit-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .lh-small-button { border: 1px solid ${colors.line}; background: #fff; border-radius: 8px; padding: 7px 10px; cursor: pointer; font: inherit; }
        .lh-small-button:disabled { opacity: .45; cursor: not-allowed; }
        .lh-small-button-danger { color: #a12424; }
        .lh-readonly-note { border: 1px solid ${colors.line}; background: #f8fafc; border-radius: 12px; padding: 14px; margin-top: 14px; }
        .lh-readonly-note p { margin: 6px 0 0; white-space: pre-wrap; }
        @media (max-width: 640px) { .lh-task-editor-grid { grid-template-columns: 1fr; } .lh-task-header-actions { justify-content: stretch; } .lh-task-header-actions .lh-button { flex: 1; } }
    `}</style>
  );
}
