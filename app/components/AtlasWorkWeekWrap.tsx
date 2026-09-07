"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";

type WorkRow = {
  id: string;
  title?: string;
  status?: string;
  assigned_to?: string;
  due_date?: string;
  recurring?: boolean;
  updated_at?: string;
};

type WorkAction =
  | "carry-tomorrow"
  | "skip"
  | "didnt-week"
  | "move-date"
  | "blocked"
  | "reopen";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activePropertyIdFromDom() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  const propertySelect = selects.find((select) => {
    const values = Array.from(select.options).map((option) => String(option.value || ""));
    return (
      values.includes("2000") &&
      values.some(
        (value) =>
          value === "4725" ||
          value === "6855" ||
          value === "3661" ||
          value.toLowerCase() === "hangar",
      )
    );
  });
  return String(propertySelect?.value || "2000");
}

function workIsVisible() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "work",
  );
  const root = (heading?.closest("main") as HTMLElement | null) || null;
  if (!root) return false;
  const style = window.getComputedStyle(root);
  const rect = root.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function formatDate(value: unknown) {
  const text = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "No date";
  const parsed = new Date(`${text}T12:00:00`);
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function safeFileName(value: string) {
  return (value || "photo")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "photo";
}

export default function AtlasWorkWeekWrap() {
  const [visible, setVisible] = useState(false);
  const [propertyId, setPropertyId] = useState("2000");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [reopenable, setReopenable] = useState<WorkRow[]>([]);
  const [selected, setSelected] = useState<WorkRow | null>(null);
  const [action, setAction] = useState<WorkAction>("carry-tomorrow");
  const [note, setNote] = useState("");
  const [moveDate, setMoveDate] = useState(localDateKey());
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const today = localDateKey();

  const loadRows = async (targetPropertyId = activePropertyIdFromDom()) => {
    const response = await fetch(
      `/api/atlas-workflow?propertyId=${encodeURIComponent(targetPropertyId)}&today=${encodeURIComponent(today)}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Atlas could not load Week Wrap-Up.");
    }
    setRows(Array.isArray(data.active) ? data.active : []);
    setReopenable(Array.isArray(data.reopenable) ? data.reopenable : []);
  };

  const rollover = async (targetPropertyId: string) => {
    const key = `atlas-work-rollover-${targetPropertyId}-${today}`;
    if (window.localStorage.getItem(key) === "done") return;

    const response = await fetch("/api/atlas-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rollover",
        propertyId: targetPropertyId,
        today,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Atlas could not carry unfinished work forward.");
    }

    window.localStorage.setItem(key, "done");
  };

  useEffect(() => {
    let frame = 0;
    let lastProperty = "";

    const apply = () => {
      frame = 0;
      const nextProperty = activePropertyIdFromDom();
      setVisible(workIsVisible());
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));

      if (nextProperty !== lastProperty) {
        lastProperty = nextProperty;
        void rollover(nextProperty)
          .then(() => loadRows(nextProperty))
          .catch((error) => console.warn(error));
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const count = rows.length;

  const grouped = useMemo(() => {
    const overdue = rows.filter((row) => String(row.due_date || "").slice(0, 10) < today);
    const current = rows.filter((row) => String(row.due_date || "").slice(0, 10) >= today);
    return { overdue, current };
  }, [rows, today]);

  const startAction = (row: WorkRow, nextAction?: WorkAction) => {
    setSelected(row);
    setAction(nextAction || (row.status === "Cancelled" ? "reopen" : "carry-tomorrow"));
    setNote("");
    setPhoto(null);
    setMoveDate(today);
    setMessage("");
  };

  const submit = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setMessage("");

    try {
      const photos: Array<Record<string, unknown>> = [];

      if (photo) {
        const blob = await upload(
          `atlas-workflow/${propertyId}/${selected.id}/${Date.now()}-${safeFileName(photo.name)}`,
          photo,
          {
            access: "public",
            handleUploadUrl: "/api/atlas-document-upload",
            contentType: photo.type || undefined,
          },
        );

        photos.push({
          id: `workflow-photo-${Date.now()}`,
          name: photo.name || "Work photo",
          type: photo.type || "image/jpeg",
          url: blob.url,
          createdAt: new Date().toISOString(),
        });
      }

      const response = await fetch("/api/atlas-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          propertyId,
          today,
          id: selected.id,
          note,
          moveDate,
          photos,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Atlas could not update that work item.");
      }

      await loadRows(propertyId);
      setSelected(null);
      setSaving(false);
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update that work item.");
      setSaving(false);
    }
  };

  return (
    <>
      {visible ? (
        <button
          type="button"
          className="atlas-week-wrap-launch"
          onClick={() => {
            setOpen(true);
            void loadRows(propertyId).catch((error) => setMessage(error.message));
          }}
        >
          Week Wrap-Up{count ? ` ${count}` : ""}
        </button>
      ) : null}

      {open ? (
        <div
          className="atlas-week-wrap-overlay"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="atlas-week-wrap-panel" role="dialog" aria-modal="true" aria-label="Week Wrap-Up">
            <div className="atlas-week-wrap-header">
              <div>
                <strong>Week Wrap-Up</strong>
                <span>Unfinished work can carry forward, be skipped, moved, or marked waiting.</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="atlas-week-wrap-list">
              {[...grouped.overdue, ...grouped.current].map((row) => (
                <div className="atlas-week-wrap-row" key={row.id}>
                  <div>
                    <strong>{row.title || "Untitled work"}</strong>
                    <span>
                      {formatDate(row.due_date)}
                      {row.assigned_to ? ` · ${row.assigned_to}` : ""}
                      {row.status === "Waiting" ? " · Waiting" : ""}
                    </span>
                  </div>
                  <button type="button" onClick={() => startAction(row)}>Action</button>
                </div>
              ))}

              {!rows.length ? <div className="atlas-week-wrap-empty">No unfinished work to wrap up.</div> : null}
            </div>

            {reopenable.length ? (
              <details className="atlas-week-wrap-reopen">
                <summary>Recently skipped</summary>
                {reopenable.map((row) => (
                  <div className="atlas-week-wrap-row" key={row.id}>
                    <div>
                      <strong>{row.title || "Untitled work"}</strong>
                      <span>Skipped · {formatDate(row.due_date)}</span>
                    </div>
                    <button type="button" onClick={() => startAction(row, "reopen")}>Reopen</button>
                  </div>
                ))}
              </details>
            ) : null}

            {message && !selected ? <div className="atlas-week-wrap-message">{message}</div> : null}
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="atlas-week-action-overlay">
          <div className="atlas-week-action-card" role="dialog" aria-modal="true" aria-label="Work action">
            <div className="atlas-week-wrap-header">
              <div>
                <strong>{selected.title || "Work item"}</strong>
                <span>{formatDate(selected.due_date)}</span>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>

            <label>
              <span>Action</span>
              <select value={action} onChange={(event) => setAction(event.target.value as WorkAction)}>
                <option value="carry-tomorrow">Carry to Tomorrow</option>
                <option value="skip">Skip / Not Needed</option>
                <option value="didnt-week">Didn't Get To This Week</option>
                <option value="move-date">Move to Date</option>
                <option value="blocked">Blocked / Waiting</option>
                <option value="reopen">Reopen</option>
              </select>
            </label>

            {action === "move-date" ? (
              <label>
                <span>Move to</span>
                <input type="date" value={moveDate} onChange={(event) => setMoveDate(event.target.value)} />
              </label>
            ) : null}

            <label>
              <span>Note <em>optional</em></span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a reason or detail if useful"
              />
            </label>

            <label>
              <span>Photo <em>optional</em></span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPhoto(event.target.files?.[0] || null)}
              />
            </label>

            {photo ? <div className="atlas-week-action-file">{photo.name}</div> : null}
            {message ? <div className="atlas-week-wrap-message">{message}</div> : null}

            <div className="atlas-week-action-buttons">
              <button type="button" onClick={() => setSelected(null)}>Cancel</button>
              <button type="button" className="atlas-week-action-save" disabled={saving} onClick={() => void submit()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .atlas-week-wrap-launch {
          position: fixed !important;
          right: 22px !important;
          top: 82px !important;
          z-index: 8500 !important;
          min-height: 36px !important;
          padding: 7px 12px !important;
          border: 1px solid #0b2c43 !important;
          border-radius: 9px !important;
          background: #0b2c43 !important;
          color: #fff !important;
          font: inherit !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(11, 44, 67, 0.16) !important;
        }

        .atlas-week-wrap-overlay,
        .atlas-week-action-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 100000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 18px !important;
          background: rgba(7, 24, 39, 0.68) !important;
        }

        .atlas-week-action-overlay { z-index: 100100 !important; }

        .atlas-week-wrap-panel,
        .atlas-week-action-card {
          width: min(700px, 96vw) !important;
          max-height: 90dvh !important;
          overflow-y: auto !important;
          display: grid !important;
          gap: 10px !important;
          padding: 14px !important;
          border-radius: 14px !important;
          background: #fff !important;
          box-shadow: 0 22px 70px rgba(0,0,0,.28) !important;
        }

        .atlas-week-action-card { width: min(520px, 96vw) !important; }

        .atlas-week-wrap-header {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 12px !important;
        }

        .atlas-week-wrap-header > div {
          display: grid !important;
          gap: 2px !important;
        }

        .atlas-week-wrap-header strong { color: #0b2c43 !important; font-size: 16px !important; }
        .atlas-week-wrap-header span { color: #66788a !important; font-size: 11px !important; }

        .atlas-week-wrap-header > button,
        .atlas-week-wrap-row > button,
        .atlas-week-action-buttons button {
          min-height: 32px !important;
          padding: 5px 9px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .atlas-week-wrap-header > button {
          width: 34px !important;
          min-width: 34px !important;
          padding: 0 !important;
          font-size: 20px !important;
        }

        .atlas-week-wrap-list,
        .atlas-week-wrap-reopen {
          display: grid !important;
          gap: 6px !important;
        }

        .atlas-week-wrap-row {
          min-height: 52px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 10px !important;
          padding: 8px 9px !important;
          border: 1px solid #e0e6ec !important;
          border-radius: 9px !important;
          background: #fbfcfe !important;
        }

        .atlas-week-wrap-row > div { min-width: 0 !important; display: grid !important; gap: 2px !important; }
        .atlas-week-wrap-row strong { color: #0b2c43 !important; font-size: 12px !important; }
        .atlas-week-wrap-row span { color: #66788a !important; font-size: 10px !important; }
        .atlas-week-wrap-empty { padding: 16px !important; text-align: center !important; color: #66788a !important; font-size: 12px !important; }

        .atlas-week-wrap-reopen summary {
          cursor: pointer !important;
          color: #526579 !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          margin-bottom: 6px !important;
        }

        .atlas-week-action-card label {
          display: grid !important;
          gap: 4px !important;
        }

        .atlas-week-action-card label > span {
          color: #526579 !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: .04em !important;
        }

        .atlas-week-action-card label em {
          color: #8a98a6 !important;
          font-style: normal !important;
          font-weight: 700 !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
        }

        .atlas-week-action-card select,
        .atlas-week-action-card input,
        .atlas-week-action-card textarea {
          width: 100% !important;
          min-height: 36px !important;
          padding: 7px 8px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 12px !important;
          box-sizing: border-box !important;
        }

        .atlas-week-action-card textarea { min-height: 82px !important; resize: vertical !important; }
        .atlas-week-action-file,
        .atlas-week-wrap-message { color: #526579 !important; font-size: 11px !important; }

        .atlas-week-action-buttons {
          display: flex !important;
          justify-content: flex-end !important;
          gap: 7px !important;
        }

        .atlas-week-action-save {
          background: #0b2c43 !important;
          border-color: #0b2c43 !important;
          color: #fff !important;
        }

        @media (max-width: 900px) {
          .atlas-week-wrap-launch {
            top: auto !important;
            right: 12px !important;
            bottom: 76px !important;
          }
          .atlas-week-wrap-overlay,
          .atlas-week-action-overlay { padding: 8px !important; }
          .atlas-week-wrap-row { align-items: flex-start !important; }
        }
      `}</style>
    </>
  );
}
