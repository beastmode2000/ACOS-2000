"use client";

import { useEffect, useState } from "react";

type DayOffRecord = {
  id: string;
  property_id?: string;
  off_date?: string;
  kind?: string;
  scope?: string;
  person?: string;
  title?: string;
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

function mainFor(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === title,
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function calendarIsVisible() {
  const root = mainFor("calendar");
  if (!root) return false;
  const style = window.getComputedStyle(root);
  const rect = root.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

export default function AtlasDayOffControl() {
  const [open, setOpen] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);
  const [propertyId, setPropertyId] = useState("2000");
  const [date, setDate] = useState(localDateKey());
  const [kind, setKind] = useState<"Holiday" | "PTO" | "Off">("Holiday");
  const [scope, setScope] = useState<"person" | "team">("team");
  const [person, setPerson] = useState("Nick");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [todayRecords, setTodayRecords] = useState<DayOffRecord[]>([]);

  const loadToday = async (targetPropertyId = activePropertyIdFromDom()) => {
    try {
      const response = await fetch(
        `/api/atlas-day-off?propertyId=${encodeURIComponent(targetPropertyId)}&date=${encodeURIComponent(localDateKey())}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok || !data?.ok) return;
      setTodayRecords(Array.isArray(data.dayOffs) ? data.dayOffs : []);
    } catch {
      // Day-off status must never interrupt Atlas.
    }
  };

  useEffect(() => {
    let frame = 0;
    let lastPropertyId = "";

    const apply = () => {
      frame = 0;

      const nextPropertyId = activePropertyIdFromDom();
      setPropertyId((current) => (current === nextPropertyId ? current : nextPropertyId));
      setShowLauncher(calendarIsVisible());

      if (nextPropertyId !== lastPropertyId) {
        lastPropertyId = nextPropertyId;
        void loadToday(nextPropertyId);
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

  const openEditor = () => {
    const nextPropertyId = activePropertyIdFromDom();
    setPropertyId(nextPropertyId);
    setDate(localDateKey());
    setMessage("");
    setSaving(false);
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/atlas-day-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          date,
          kind,
          scope,
          person: scope === "person" ? person : "",
          title,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Atlas could not save the day off.");
      }

      const moved = Number(data.movedRecurringWork || 0);

      setMessage(
        moved
          ? `Saved. ${moved} recurring work item${moved === 1 ? "" : "s"} moved to the next working day.`
          : "Saved. No recurring work needed to move.",
      );

      await loadToday(propertyId);

      window.setTimeout(() => {
        window.location.reload();
      }, 650);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Atlas could not save the day off.",
      );
      setSaving(false);
    }
  };

  const remove = async (record: DayOffRecord) => {
    if (
      !window.confirm(
        "Remove this day off? Moved work will stay on its current date.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/atlas-day-off", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          id: record.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Atlas could not remove the day off.");
      }

      await loadToday(propertyId);
      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Atlas could not remove the day off.",
      );
    }
  };

  const todayLabel = todayRecords
    .map((record) => {
      if (record.scope === "team") return record.title || "Holiday / Off";
      return record.title || `${record.person || "Staff"} Off`;
    })
    .join(" · ");

  return (
    <>
      {showLauncher ? (
        <div className="atlas-day-off-floating-wrap">
          {todayLabel ? (
            <div className="atlas-day-off-floating-status">{todayLabel}</div>
          ) : null}

          <button
            type="button"
            className="atlas-day-off-floating-button"
            onClick={openEditor}
          >
            Day Off
          </button>
        </div>
      ) : null}

      {open ? (
        <div
          className="atlas-day-off-overlay"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setOpen(false)
          }
        >
          <div
            className="atlas-day-off-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Holiday PTO or day off"
          >
            <div className="atlas-day-off-header">
              <strong>Holiday / PTO / Off</strong>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="atlas-day-off-grid">
              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              <label>
                <span>Type</span>
                <select
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as "Holiday" | "PTO" | "Off")
                  }
                >
                  <option value="Holiday">Holiday</option>
                  <option value="PTO">PTO</option>
                  <option value="Off">Off</option>
                </select>
              </label>

              <label>
                <span>Applies to</span>
                <select
                  value={scope}
                  onChange={(event) =>
                    setScope(event.target.value as "person" | "team")
                  }
                >
                  <option value="person">Just one person</option>
                  <option value="team">Property / team</option>
                </select>
              </label>

              {scope === "person" ? (
                <label>
                  <span>Person</span>
                  <select
                    value={person}
                    onChange={(event) => setPerson(event.target.value)}
                  >
                    <option value="Nick">Nick</option>
                    <option value="Addison">Addison</option>
                    <option value="Patrick Tanner">Patrick Tanner</option>
                    <option value="Sean Powell">Sean Powell</option>
                  </select>
                </label>
              ) : null}

              <label className="atlas-day-off-title-field">
                <span>Name</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    kind === "Holiday"
                      ? "Labor Day"
                      : kind === "PTO"
                        ? `${person} PTO`
                        : "Day Off"
                  }
                />
              </label>
            </div>

            {todayRecords.length > 0 && date === localDateKey() ? (
              <div className="atlas-day-off-existing">
                {todayRecords.map((record) => (
                  <div key={record.id}>
                    <span>{record.title || record.kind || "Day Off"}</span>
                    <button
                      type="button"
                      onClick={() => void remove(record)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {message ? (
              <div className="atlas-day-off-message">{message}</div>
            ) : null}

            <div className="atlas-day-off-actions">
              <button type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>

              <button
                type="button"
                className="atlas-day-off-save"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save Day Off"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .atlas-day-off-floating-wrap {
          position: fixed !important;
          top: 82px !important;
          right: 22px !important;
          z-index: 9000 !important;
          display: flex !important;
          align-items: center !important;
          gap: 7px !important;
          pointer-events: none !important;
        }

        .atlas-day-off-floating-button,
        .atlas-day-off-floating-status {
          pointer-events: auto !important;
        }

        .atlas-day-off-floating-button {
          min-height: 36px !important;
          padding: 7px 12px !important;
          border: 1px solid #0b2c43 !important;
          border-radius: 9px !important;
          background: #0b2c43 !important;
          color: #ffffff !important;
          font: inherit !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(11, 44, 67, 0.16) !important;
        }

        .atlas-day-off-floating-button:hover {
          border-color: #c99a3d !important;
        }

        .atlas-day-off-floating-status {
          min-height: 32px !important;
          display: flex !important;
          align-items: center !important;
          padding: 5px 9px !important;
          border: 1px solid #f0c36a !important;
          border-radius: 9px !important;
          background: #fff8e8 !important;
          color: #7a4b00 !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          box-shadow: 0 2px 8px rgba(122, 75, 0, 0.08) !important;
        }

        .atlas-day-off-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 100000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 18px !important;
          background: rgba(7, 24, 39, 0.68) !important;
        }

        .atlas-day-off-dialog {
          width: min(560px, 96vw) !important;
          max-height: 92dvh !important;
          overflow-y: auto !important;
          display: grid !important;
          gap: 12px !important;
          padding: 14px !important;
          border-radius: 14px !important;
          background: #ffffff !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28) !important;
        }

        .atlas-day-off-header,
        .atlas-day-off-actions,
        .atlas-day-off-existing > div {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 8px !important;
        }

        .atlas-day-off-header strong {
          color: #0b2c43 !important;
          font-size: 16px !important;
        }

        .atlas-day-off-header button,
        .atlas-day-off-actions button,
        .atlas-day-off-existing button {
          min-height: 32px !important;
          padding: 5px 9px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 8px !important;
          background: #ffffff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          box-shadow: none !important;
        }

        .atlas-day-off-header button {
          width: 34px !important;
          min-width: 34px !important;
          padding: 0 !important;
          font-size: 20px !important;
        }

        .atlas-day-off-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 9px !important;
        }

        .atlas-day-off-grid label {
          display: grid !important;
          gap: 4px !important;
          min-width: 0 !important;
        }

        .atlas-day-off-grid label > span {
          color: #526579 !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.04em !important;
        }

        .atlas-day-off-grid input,
        .atlas-day-off-grid select {
          width: 100% !important;
          min-height: 36px !important;
          padding: 6px 8px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 8px !important;
          background: #ffffff !important;
          color: #0b2c43 !important;
          font: inherit !important;
          font-size: 12px !important;
          box-sizing: border-box !important;
        }

        .atlas-day-off-title-field {
          grid-column: 1 / -1 !important;
        }

        .atlas-day-off-existing {
          display: grid !important;
          gap: 6px !important;
          padding: 8px !important;
          border: 1px solid #f0c36a !important;
          border-radius: 9px !important;
          background: #fffaf0 !important;
        }

        .atlas-day-off-existing span,
        .atlas-day-off-message {
          color: #526579 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
        }

        .atlas-day-off-existing button {
          min-height: 28px !important;
          color: #9f1d20 !important;
        }

        .atlas-day-off-actions {
          justify-content: flex-end !important;
        }

        .atlas-day-off-save {
          background: #0b2c43 !important;
          border-color: #0b2c43 !important;
          color: #ffffff !important;
        }

        @media (max-width: 900px) {
          .atlas-day-off-floating-wrap {
            top: auto !important;
            right: 12px !important;
            bottom: 76px !important;
            max-width: calc(100vw - 24px) !important;
            align-items: flex-end !important;
            flex-direction: column !important;
          }

          .atlas-day-off-floating-status {
            max-width: min(320px, calc(100vw - 24px)) !important;
            white-space: normal !important;
          }

          .atlas-day-off-overlay {
            padding: 8px !important;
          }

          .atlas-day-off-grid {
            grid-template-columns: 1fr !important;
          }

          .atlas-day-off-title-field {
            grid-column: auto !important;
          }
        }
      `}</style>
    </>
  );
}
