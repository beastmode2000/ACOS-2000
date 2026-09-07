"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";

type SharedItem = {
  id: string;
  property_id?: string;
  title?: string;
  notes?: string;
  assigned_to?: string;
  due_date?: string | null;
  status?: string;
  created_by?: string;
  photo_url?: string;
  photo_name?: string;
  created_at?: string;
  updated_at?: string;
};

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

function activeActor() {
  if (window.location.pathname.toLowerCase().includes("addison")) return "Addison";

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("[data-user-name], header, aside"),
  );
  for (const element of candidates) {
    const text = normalized(element.dataset.userName || element.textContent);
    if (text.includes("addison")) return "Addison";
    if (text.includes("patrick tanner") || text.includes("pat tanner")) return "Patrick Tanner";
    if (text.includes("sean powell")) return "Sean Powell";
  }
  return "Nick";
}

function shouldShowLauncher() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("addison-work")) return true;

  const visibleHeadings = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).filter((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });

  return visibleHeadings.some((heading) =>
    ["dashboard", "work", "notes", "team"].includes(normalized(heading.textContent)),
  );
}

function formatDate(value: unknown) {
  const key = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function safeFileName(value: string) {
  return (
    (value || "photo")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "photo"
  );
}

export default function AtlasSharedTeamList() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [propertyId, setPropertyId] = useState("2000");
  const [actor, setActor] = useState("Nick");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const load = async (targetPropertyId = activePropertyIdFromDom()) => {
    const response = await fetch(
      `/api/atlas-shared-list?propertyId=${encodeURIComponent(targetPropertyId)}&t=${Date.now()}`,
      { cache: "no-store", credentials: "include" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Atlas could not load the shared list.");
    }
    setItems(Array.isArray(payload.items) ? payload.items : []);
  };

  useEffect(() => {
    let frame = 0;
    let lastProperty = "";

    const apply = () => {
      frame = 0;
      const nextProperty = activePropertyIdFromDom();
      setVisible(shouldShowLauncher());
      setActor(activeActor());
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));

      if (nextProperty !== lastProperty) {
        lastProperty = nextProperty;
        setItems([]);
        void load(nextProperty).catch(() => undefined);
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
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const openItems = useMemo(
    () => items.filter((item) => String(item.status || "Open") === "Open"),
    [items],
  );

  const completedItems = useMemo(
    () => items.filter((item) => String(item.status || "") !== "Open"),
    [items],
  );

  const resetDraft = () => {
    setTitle("");
    setNotes("");
    setAssignedTo("");
    setDueDate("");
    setPhoto(null);
  };

  const createItem = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setMessage("");

    try {
      let photoUrl = "";
      let photoName = "";

      if (photo) {
        const blob = await upload(
          `atlas-shared-list/${propertyId}/${Date.now()}-${safeFileName(photo.name)}`,
          photo,
          {
            access: "public",
            handleUploadUrl: "/api/atlas-document-upload",
            contentType: photo.type || undefined,
          },
        );
        photoUrl = blob.url;
        photoName = photo.name || "Photo";
      }

      const response = await fetch("/api/atlas-shared-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "create",
          propertyId,
          title: title.trim(),
          notes: notes.trim(),
          assignedTo,
          dueDate,
          createdBy: actor,
          photoUrl,
          photoName,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Atlas could not add that list item.");
      }

      resetDraft();
      await load(propertyId);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not add that list item.");
    } finally {
      setSaving(false);
    }
  };

  const itemAction = async (item: SharedItem, action: "done" | "reopen" | "moved-to-work") => {
    const response = await fetch("/api/atlas-shared-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, propertyId, id: item.id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Atlas could not update that list item.");
    }
  };

  const moveToWork = async (item: SharedItem) => {
    setMessage("");
    try {
      const workId = `work-shared-${item.id}`;
      const workRecord = {
        id: workId,
        propertyId,
        title: String(item.title || "Shared list item"),
        date: String(item.due_date || "").slice(0, 10) || localDateKey(),
        status: "Open",
        priority: "Medium",
        assignedTo: String(item.assigned_to || ""),
        recurring: false,
        workType: "Quick Task",
        workCategory: "Maintenance",
        responsibilityArea: "Team List",
        notes: String(item.notes || ""),
        photos: item.photo_url
          ? [
              {
                id: `shared-photo-${item.id}`,
                name: item.photo_name || "Shared list photo",
                url: item.photo_url,
                type: "image/jpeg",
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      };

      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-atlas-request-id": `shared-list-work-${item.id}`,
        },
        credentials: "include",
        body: JSON.stringify({ table: "work_orders", propertyId, record: workRecord }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Atlas could not create the work item.");
      }

      await itemAction(item, "moved-to-work");
      await load(propertyId);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not move that item to Work.");
    }
  };

  const deleteItem = async (item: SharedItem) => {
    if (!window.confirm(`Delete ${item.title || "this list item"}?`)) return;
    try {
      const response = await fetch("/api/atlas-shared-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId, id: item.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Atlas could not delete that list item.");
      }
      await load(propertyId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not delete that list item.");
    }
  };

  return (
    <>
      {visible ? (
        <button
          type="button"
          className="atlas-shared-list-launch"
          onClick={() => {
            setOpen(true);
            setMessage("");
            void load(propertyId).catch((error) =>
              setMessage(error instanceof Error ? error.message : "Atlas could not load the shared list."),
            );
          }}
        >
          Team List{openItems.length ? ` ${openItems.length}` : ""}
        </button>
      ) : null}

      {open ? (
        <div
          className="atlas-shared-list-overlay"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="atlas-shared-list-panel" role="dialog" aria-modal="true" aria-label="Team List">
            <div className="atlas-shared-list-header">
              <div>
                <strong>Team List</strong>
                <span>{propertyId} · shared by the team</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="atlas-shared-list-quick-add">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createItem();
                  }
                }}
                placeholder="Add something to the team list"
                autoFocus
              />
              <button type="button" disabled={saving || !title.trim()} onClick={() => void createItem()}>
                {saving ? "Adding…" : "Add"}
              </button>
            </div>

            <details className="atlas-shared-list-details">
              <summary>Details</summary>
              <div className="atlas-shared-list-detail-grid">
                <label>
                  <span>Assign</span>
                  <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                    <option value="">Anyone</option>
                    <option value="Nick">Nick</option>
                    <option value="Addison">Addison</option>
                    <option value="Patrick Tanner">Patrick Tanner</option>
                    <option value="Sean Powell">Sean Powell</option>
                  </select>
                </label>
                <label>
                  <span>Due</span>
                  <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </label>
                <label className="atlas-shared-list-wide">
                  <span>Note</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
                </label>
                <label className="atlas-shared-list-wide">
                  <span>Photo</span>
                  <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                </label>
              </div>
            </details>

            <div className="atlas-shared-list-items">
              {openItems.map((item) => (
                <div className="atlas-shared-list-row" key={item.id}>
                  {item.photo_url ? <img src={item.photo_url} alt={item.photo_name || item.title || "Team list"} /> : null}
                  <div className="atlas-shared-list-row-main">
                    <strong>{item.title || "Untitled"}</strong>
                    <span>
                      {item.assigned_to ? item.assigned_to : "Anyone"}
                      {item.due_date ? ` · ${formatDate(item.due_date)}` : ""}
                      {item.created_by ? ` · added by ${item.created_by}` : ""}
                    </span>
                    {item.notes ? <p>{item.notes}</p> : null}
                  </div>
                  <div className="atlas-shared-list-row-actions">
                    <button type="button" onClick={() => void itemAction(item, "done").then(() => load(propertyId))}>
                      Done
                    </button>
                    <button type="button" onClick={() => void moveToWork(item)}>
                      Move to Work
                    </button>
                    <button type="button" className="atlas-shared-list-delete" onClick={() => void deleteItem(item)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {!openItems.length ? <div className="atlas-shared-list-empty">Nothing open on the team list.</div> : null}
            </div>

            {completedItems.length ? (
              <div className="atlas-shared-list-completed">
                <button type="button" onClick={() => setShowCompleted((current) => !current)}>
                  {showCompleted ? "Hide" : "Show"} completed · {completedItems.length}
                </button>
                {showCompleted ? (
                  <div className="atlas-shared-list-items">
                    {completedItems.map((item) => (
                      <div className="atlas-shared-list-row atlas-shared-list-row-completed" key={item.id}>
                        <div className="atlas-shared-list-row-main">
                          <strong>{item.title || "Untitled"}</strong>
                          <span>{item.status || "Completed"}</span>
                        </div>
                        <div className="atlas-shared-list-row-actions">
                          <button
                            type="button"
                            onClick={() => void itemAction(item, "reopen").then(() => load(propertyId))}
                          >
                            Reopen
                          </button>
                          <button
                            type="button"
                            className="atlas-shared-list-delete"
                            onClick={() => void deleteItem(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {message ? <div className="atlas-shared-list-message">{message}</div> : null}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .atlas-shared-list-launch {
          position: fixed !important;
          top: 126px !important;
          right: 22px !important;
          z-index: 8400 !important;
          min-height: 34px !important;
          padding: 6px 11px !important;
          border: 1px solid #d1dae3 !important;
          border-radius: 9px !important;
          background: #fff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
          box-shadow: 0 3px 10px rgba(11, 44, 67, 0.1) !important;
        }

        .atlas-shared-list-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 100200 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 16px !important;
          background: rgba(7, 24, 39, 0.68) !important;
        }

        .atlas-shared-list-panel {
          width: min(760px, 96vw) !important;
          max-height: 92dvh !important;
          overflow-y: auto !important;
          display: grid !important;
          gap: 10px !important;
          padding: 14px !important;
          border-radius: 14px !important;
          background: #fff !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28) !important;
        }

        .atlas-shared-list-header,
        .atlas-shared-list-quick-add,
        .atlas-shared-list-row,
        .atlas-shared-list-row-actions {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .atlas-shared-list-header {
          justify-content: space-between !important;
        }

        .atlas-shared-list-header > div,
        .atlas-shared-list-row-main {
          display: grid !important;
          gap: 2px !important;
          min-width: 0 !important;
        }

        .atlas-shared-list-header strong {
          color: #0b2c43 !important;
          font-size: 16px !important;
        }

        .atlas-shared-list-header span,
        .atlas-shared-list-row span,
        .atlas-shared-list-row p {
          color: #66788a !important;
          font-size: 10px !important;
        }

        .atlas-shared-list-header > button,
        .atlas-shared-list-quick-add button,
        .atlas-shared-list-row-actions button,
        .atlas-shared-list-completed > button {
          min-height: 32px !important;
          padding: 5px 9px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
        }

        .atlas-shared-list-header > button {
          width: 34px !important;
          min-width: 34px !important;
          padding: 0 !important;
          font-size: 20px !important;
        }

        .atlas-shared-list-quick-add input,
        .atlas-shared-list-detail-grid input,
        .atlas-shared-list-detail-grid select,
        .atlas-shared-list-detail-grid textarea {
          width: 100% !important;
          min-height: 36px !important;
          padding: 7px 9px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 12px !important;
          box-sizing: border-box !important;
        }

        .atlas-shared-list-quick-add input {
          flex: 1 1 auto !important;
        }

        .atlas-shared-list-quick-add button {
          background: #0b2c43 !important;
          border-color: #0b2c43 !important;
          color: #fff !important;
        }

        .atlas-shared-list-details summary {
          cursor: pointer !important;
          color: #526579 !important;
          font-size: 11px !important;
          font-weight: 800 !important;
        }

        .atlas-shared-list-detail-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
          margin-top: 8px !important;
        }

        .atlas-shared-list-detail-grid label {
          display: grid !important;
          gap: 4px !important;
        }

        .atlas-shared-list-detail-grid label > span {
          color: #526579 !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }

        .atlas-shared-list-wide {
          grid-column: 1 / -1 !important;
        }

        .atlas-shared-list-detail-grid textarea {
          min-height: 70px !important;
          resize: vertical !important;
        }

        .atlas-shared-list-items {
          display: grid !important;
          gap: 6px !important;
        }

        .atlas-shared-list-row {
          align-items: flex-start !important;
          padding: 8px !important;
          border: 1px solid #e0e6ec !important;
          border-radius: 9px !important;
          background: #fbfcfe !important;
        }

        .atlas-shared-list-row > img {
          width: 58px !important;
          height: 58px !important;
          flex: 0 0 58px !important;
          border-radius: 8px !important;
          object-fit: cover !important;
        }

        .atlas-shared-list-row-main {
          flex: 1 1 auto !important;
        }

        .atlas-shared-list-row-main strong {
          color: #0b2c43 !important;
          font-size: 12px !important;
        }

        .atlas-shared-list-row p {
          margin: 3px 0 0 !important;
          white-space: pre-wrap !important;
          line-height: 1.35 !important;
        }

        .atlas-shared-list-row-actions {
          flex: 0 0 auto !important;
          flex-wrap: wrap !important;
          justify-content: flex-end !important;
        }

        .atlas-shared-list-delete {
          color: #9f1d20 !important;
        }

        .atlas-shared-list-row-completed {
          opacity: 0.72 !important;
        }

        .atlas-shared-list-empty,
        .atlas-shared-list-message {
          padding: 10px !important;
          color: #66788a !important;
          font-size: 11px !important;
        }

        .atlas-shared-list-completed {
          display: grid !important;
          gap: 7px !important;
        }

        .atlas-shared-list-completed > button {
          justify-self: start !important;
        }

        @media (max-width: 900px) {
          .atlas-shared-list-launch {
            top: auto !important;
            right: 12px !important;
            bottom: 122px !important;
          }

          .atlas-shared-list-overlay {
            padding: 7px !important;
          }

          .atlas-shared-list-detail-grid {
            grid-template-columns: 1fr !important;
          }

          .atlas-shared-list-wide {
            grid-column: auto !important;
          }

          .atlas-shared-list-row {
            display: grid !important;
            grid-template-columns: auto 1fr !important;
          }

          .atlas-shared-list-row-actions {
            grid-column: 1 / -1 !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </>
  );
}
