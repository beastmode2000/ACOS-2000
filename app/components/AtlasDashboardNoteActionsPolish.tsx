"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TeamMember = {
  id?: string;
  name?: string;
  active?: boolean;
  role?: string;
};

type TeamPayload = {
  ok?: boolean;
  members?: TeamMember[];
};

type NoteMeta = {
  property_id?: string;
  note_key?: string;
  assigned_to?: string;
  reminder_date?: string | null;
  pinned?: boolean;
};

type NoteRow = {
  key: string;
  title: string;
  card: HTMLElement;
  host: HTMLElement;
  nativeActions: HTMLElement | null;
  nativeDelete: HTMLButtonElement | null;
  nativeCheckbox: HTMLInputElement | null;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function activePropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const select = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((candidate) =>
    Array.from(candidate.options).some((option) => option.value === "2000"),
  );
  return String(select?.value || "2000");
}

function noteKey(title: string, occurrence: number) {
  return `${normalized(title).replace(/\s+/g, " ").slice(0, 360)}::${occurrence}`;
}

function findRememberItRoot() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3")).find(
    (node) => normalized(node.textContent) === "remember it",
  );
  if (!heading) return null;
  return (heading.closest("section") || heading.parentElement?.parentElement || heading.parentElement) as HTMLElement | null;
}

function scanNoteRows(): NoteRow[] {
  const root = findRememberItRoot();
  if (!root) return [];

  const deleteButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => normalized(button.textContent) === "delete" && !button.closest("[data-atlas-note-actions-host]"),
  );

  const counts = new Map<string, number>();
  const rows: NoteRow[] = [];

  for (const nativeDelete of deleteButtons) {
    let card = nativeDelete.parentElement as HTMLElement | null;
    while (card && card !== root) {
      if (card.querySelector('input[type="checkbox"]') && card.querySelector("strong")) break;
      card = card.parentElement;
    }
    if (!card || card === root) continue;

    const strong = card.querySelector<HTMLElement>("strong");
    const title = String(strong?.textContent || "").trim();
    if (!title) continue;

    const base = normalized(title).replace(/\s+/g, " ");
    const occurrence = (counts.get(base) || 0) + 1;
    counts.set(base, occurrence);
    const key = noteKey(title, occurrence);

    let host = card.querySelector<HTMLElement>("[data-atlas-note-actions-host]");
    if (!host) {
      host = document.createElement("div");
      host.dataset.atlasNoteActionsHost = key;
      card.appendChild(host);
    }

    const nativeActions = nativeDelete.parentElement as HTMLElement | null;
    if (nativeActions && nativeActions !== host) {
      nativeActions.classList.add("atlas-dashboard-note-native-actions-hidden");
    }

    rows.push({
      key,
      title,
      card,
      host,
      nativeActions,
      nativeDelete,
      nativeCheckbox: card.querySelector<HTMLInputElement>('input[type="checkbox"]'),
    });
  }

  return rows;
}

function localDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AtlasDashboardNoteActionsPolish() {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [meta, setMeta] = useState<Record<string, NoteMeta>>({});
  const [propertyId, setPropertyId] = useState("2000");
  const [busyKey, setBusyKey] = useState("");

  const activeMembers = useMemo(
    () =>
      members
        .filter((member) => member.active !== false)
        .filter((member) => Boolean(String(member.name || "").trim()))
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [members],
  );

  const loadMeta = async (nextPropertyId: string) => {
    const response = await fetch(
      `/api/atlas-dashboard-note-meta?propertyId=${encodeURIComponent(nextPropertyId)}&t=${Date.now()}`,
      { cache: "no-store", credentials: "include" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) return;
    const next: Record<string, NoteMeta> = {};
    for (const item of Array.isArray(payload.items) ? payload.items : []) {
      const key = String(item.note_key || "");
      if (key) next[key] = item;
    }
    setMeta(next);
  };

  useEffect(() => {
    void fetch("/api/atlas-team", { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((payload: TeamPayload) => {
        if (payload?.ok !== false && Array.isArray(payload?.members)) setMembers(payload.members);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastProperty = "";

    const apply = () => {
      frame = 0;
      const nextProperty = activePropertyId();
      if (nextProperty !== lastProperty) {
        lastProperty = nextProperty;
        setPropertyId(nextProperty);
        setMeta({});
        void loadMeta(nextProperty);
      }
      setRows(scanNoteRows());
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("change", schedule, true);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
      document
        .querySelectorAll<HTMLElement>(".atlas-dashboard-note-native-actions-hidden")
        .forEach((node) => node.classList.remove("atlas-dashboard-note-native-actions-hidden"));
    };
  }, []);

  useEffect(() => {
    const ordered = [...rows].sort((a, b) => {
      const aPinned = meta[a.key]?.pinned === true ? 1 : 0;
      const bPinned = meta[b.key]?.pinned === true ? 1 : 0;
      return bPinned - aPinned;
    });
    if (!ordered.length) return;
    const parent = ordered[0].card.parentElement;
    if (!parent || !ordered.every((row) => row.card.parentElement === parent)) return;
    for (const row of ordered) parent.appendChild(row.card);
  }, [rows, meta]);

  const saveMeta = async (row: NoteRow, patch: Partial<NoteMeta>) => {
    const current = meta[row.key] || {};
    const next: NoteMeta = { ...current, ...patch };
    setMeta((previous) => ({ ...previous, [row.key]: next }));
    const response = await fetch("/api/atlas-dashboard-note-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        propertyId,
        noteKey: row.key,
        assignedTo: String(next.assigned_to || ""),
        reminderDate: String(next.reminder_date || ""),
        pinned: next.pinned === true,
      }),
    });
    if (!response.ok) await loadMeta(propertyId);
  };

  const moveToWork = async (row: NoteRow) => {
    if (busyKey) return;
    setBusyKey(row.key);
    try {
      const settings = meta[row.key] || {};
      const assignedTo = String(settings.assigned_to || "").trim();
      const dueDate = String(settings.reminder_date || "").slice(0, 10) || localDateKey();
      const id = `work-dashboard-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id,
        propertyId,
        title: row.title,
        date: dueDate,
        status: "Open",
        priority: "Medium",
        assignedTo,
        recurring: false,
        workType: "Quick Task",
        workCategory: "Maintenance",
        responsibilityArea: "Dashboard Note",
        notes: "Moved from Remember It",
      };

      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-atlas-request-id": `dashboard-note-work-${id}`,
        },
        credentials: "include",
        body: JSON.stringify({ table: "work_orders", propertyId, record }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) return;

      await fetch("/api/atlas-dashboard-note-meta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId, noteKey: row.key }),
      }).catch(() => undefined);

      row.nativeDelete?.click();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } finally {
      setBusyKey("");
    }
  };

  const deleteNote = async (row: NoteRow) => {
    await fetch("/api/atlas-dashboard-note-meta", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ propertyId, noteKey: row.key }),
    }).catch(() => undefined);
    row.nativeDelete?.click();
  };

  return (
    <>
      <style jsx global>{`
        .atlas-dashboard-note-native-actions-hidden {
          display: none !important;
        }
        [data-atlas-note-actions-host] {
          display: block !important;
          margin-top: 8px !important;
          padding-left: 24px !important;
        }
        .atlas-dashboard-note-actions {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          flex-wrap: wrap !important;
        }
        .atlas-dashboard-note-actions select,
        .atlas-dashboard-note-actions input[type="date"],
        .atlas-dashboard-note-actions button {
          min-height: 34px !important;
          border: 1px solid #d1dae3 !important;
          border-radius: 9px !important;
          background: #fff !important;
          color: #163f63 !important;
          padding: 6px 9px !important;
          font: inherit !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          box-sizing: border-box !important;
        }
        .atlas-dashboard-note-actions select {
          min-width: 126px !important;
        }
        .atlas-dashboard-note-actions button {
          cursor: pointer !important;
        }
        .atlas-dashboard-note-actions button.is-primary {
          background: #163f63 !important;
          border-color: #163f63 !important;
          color: #fff !important;
        }
        .atlas-dashboard-note-actions button.is-danger {
          color: #b42318 !important;
        }
        .atlas-dashboard-note-actions button.is-pinned {
          background: #fff7df !important;
          border-color: #e4c66d !important;
          color: #725300 !important;
        }
        @media (max-width: 900px) {
          [data-atlas-note-actions-host] {
            padding-left: 0 !important;
          }
          .atlas-dashboard-note-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .atlas-dashboard-note-actions select,
          .atlas-dashboard-note-actions input[type="date"],
          .atlas-dashboard-note-actions button {
            width: 100% !important;
          }
        }
      `}</style>
      {rows.map((row) => {
        const settings = meta[row.key] || {};
        return createPortal(
          <div className="atlas-dashboard-note-actions" key={row.key}>
            <select
              aria-label={`Assign ${row.title}`}
              value={String(settings.assigned_to || "")}
              onChange={(event) => void saveMeta(row, { assigned_to: event.target.value })}
            >
              <option value="">Assign to…</option>
              <option value="Everyone">Everyone</option>
              {activeMembers.map((member) => (
                <option key={String(member.id || member.name)} value={String(member.name || "")}>
                  {member.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label={`Remind date for ${row.title}`}
              value={String(settings.reminder_date || "").slice(0, 10)}
              min={localDateKey()}
              onChange={(event) => void saveMeta(row, { reminder_date: event.target.value })}
            />
            <button
              type="button"
              className={settings.pinned ? "is-pinned" : ""}
              onClick={() => void saveMeta(row, { pinned: !settings.pinned })}
            >
              {settings.pinned ? "Unpin" : "Pin"}
            </button>
            <button type="button" onClick={() => row.nativeCheckbox?.click()}>
              Done
            </button>
            <button
              type="button"
              className="is-primary"
              disabled={busyKey === row.key}
              onClick={() => void moveToWork(row)}
            >
              {busyKey === row.key ? "Moving…" : "Move to Work"}
            </button>
            <button type="button" className="is-danger" onClick={() => void deleteNote(row)}>
              Delete
            </button>
          </div>,
          row.host,
        );
      })}
    </>
  );
}
