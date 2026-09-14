"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  active?: boolean;
  propertyIds?: string[];
};

type WorkRow = Record<string, unknown>;

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function localDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>(
    'select[aria-label="Active property"]',
  );
  if (labelled?.value) return labelled.value;

  const candidate = Array.from(
    document.querySelectorAll<HTMLSelectElement>("select"),
  ).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );

  return candidate?.value || "2000";
}

function visibleButton(label: string, scope: ParentNode = document) {
  const wanted = normalized(label);
  return (
    Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) =>
        button.offsetParent !== null && normalized(button.textContent) === wanted,
    ) || null
  );
}

function findNativeDashboardWorkSection() {
  const daily = visibleButton("Nick + Addison");
  const dailySection = daily?.closest("section") as HTMLElement | null;
  if (dailySection) return dailySection;

  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("main section, section"),
  ).filter((section) => section.offsetParent !== null);

  return (
    sections.find((section) => {
      const heading = Array.from(section.querySelectorAll("h1,h2,h3,strong")).find(
        (node) => normalized(node.textContent) === "work lists",
      );
      return Boolean(heading);
    }) || null
  );
}

function findPersonLane(section: HTMLElement, person: string) {
  const wanted = normalized(person);
  const headings = Array.from(section.querySelectorAll<HTMLElement>("strong"));
  for (const heading of headings) {
    if (normalized(heading.textContent) !== wanted) continue;
    const lane = heading.closest("section") as HTMLElement | null;
    if (lane && lane !== section) return lane;
  }
  return null;
}

function isComplete(status: unknown) {
  return [
    "completed",
    "closed",
    "cancelled",
    "canceled",
    "skipped",
    "moved to work",
  ].includes(normalized(status));
}

function dateKey(value: unknown) {
  const text = String(value || "").trim();
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}

function workDueDate(record: WorkRow) {
  return dateKey(
    record.dueDate ||
      record.due_date ||
      record.nextDueDate ||
      record.next_due_date ||
      record.nextServiceDate ||
      record.next_service_date ||
      record.date ||
      record.item_date ||
      record.scheduledDate ||
      record.scheduled_date,
  );
}

function workCompletedDate(record: WorkRow) {
  return dateKey(
    record.lastCompletedDate ||
      record.last_completed_date ||
      record.completedAt ||
      record.completed_at ||
      record.updatedAt ||
      record.updated_at ||
      workDueDate(record),
  );
}

function workAssignee(record: WorkRow) {
  return String(
    record.assignedTo ||
      record.assigned_to ||
      record.assignee ||
      record.assignedPerson ||
      "",
  ).trim();
}

function workTitle(record: WorkRow) {
  return String(
    record.title || record.name || record.taskTitle || "Untitled work",
  ).trim();
}

function priorityOf(record: WorkRow) {
  return String(record.priority || record.urgency || "Medium").trim();
}

function memberMatches(name: string, assignment: string) {
  const full = normalized(name);
  const assigned = normalized(assignment);
  if (!full || !assigned) return false;

  const first = full.split(/\s+/)[0] || full;
  if (assigned === full || assigned === first) return true;
  if (full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `)) return true;
  if (
    (first === "patrick" || first === "pat") &&
    (assigned === "pat" || assigned.startsWith("pat ") || assigned.includes("pat's crew"))
  ) {
    return true;
  }
  return false;
}

function displayName(name: string) {
  const clean = name.trim();
  if (/^patrick(?:\s|$)|^pat(?:\s|$)/i.test(clean)) return "Pat";
  if (/^sean(?:\s|$)/i.test(clean)) return "Sean";
  if (/^addison(?:\s|$)/i.test(clean)) return "Addison";
  if (/^nick(?:\s|$)/i.test(clean)) return "Nick";
  return clean;
}

function formatDue(value: string) {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function priorityWeight(value: string) {
  const clean = normalized(value);
  if (clean === "urgent" || clean === "high") return 0;
  if (clean === "medium" || clean === "normal") return 1;
  if (clean === "low") return 2;
  return 3;
}

function openWorkPage() {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  ).find(
    (candidate) =>
      normalized(candidate.textContent) === "work" &&
      candidate.offsetParent !== null,
  );

  if (button) {
    button.click();
    return;
  }

  window.location.assign("/?section=work");
}

function restoreLaneChildren(lane: HTMLElement | null) {
  if (!lane) return;
  Array.from(lane.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.dataset.atlasSecondaryWorkHost === "true") return;
    if (child.dataset.atlasSecondaryWorkHidden === "true") {
      child.style.removeProperty("display");
      delete child.dataset.atlasSecondaryWorkHidden;
    }
  });
}

export default function AtlasDashboardUpcomingWork() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [nativeLane, setNativeLane] = useState<HTMLElement | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workRows, setWorkRows] = useState<WorkRow[]>([]);
  const [workLists, setWorkLists] = useState<any[]>([]);
  const [mode, setMode] = useState("");
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [newWorkDate, setNewWorkDate] = useState(() => localDateKey(1));
  const [savingWork, setSavingWork] = useState(false);

  useEffect(() => {
    let frame = 0;
    let activeLane: HTMLElement | null = null;

    const restoreLegacyViewButtons = () => {
      document
        .querySelectorAll<HTMLElement>("[data-atlas-secondary-view-hidden]")
        .forEach((node) => {
          node.style.removeProperty("display");
          delete node.dataset.atlasSecondaryViewHidden;
        });
    };

    const apply = () => {
      frame = 0;
      const workSection = findNativeDashboardWorkSection();
      if (!workSection) {
        restoreLaneChildren(activeLane);
        activeLane = null;
        setNativeLane(null);
        setHost(null);
        restoreLegacyViewButtons();
        return;
      }

      const nextProperty = currentPropertyId();
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));

      const dailyButton = visibleButton("Nick + Addison", workSection);
      const addisonLane = findPersonLane(workSection, "Addison");
      const nickLane = findPersonLane(workSection, "Nick");

      if ((!addisonLane || !nickLane) && dailyButton) {
        dailyButton.click();
        return;
      }

      if (!addisonLane || !nickLane) {
        restoreLaneChildren(activeLane);
        activeLane = null;
        setNativeLane(null);
        setHost(null);
        return;
      }

      if (activeLane && activeLane !== addisonLane) restoreLaneChildren(activeLane);
      activeLane = addisonLane;
      setNativeLane((current) => (current === addisonLane ? current : addisonLane));

      for (const label of ["Nick + Addison", "Sean", "Pat", "Everyone"]) {
        const button = visibleButton(label, workSection);
        if (!button) continue;
        button.dataset.atlasSecondaryViewHidden = "true";
        button.style.setProperty("display", "none", "important");
      }

      let nextHost = addisonLane.querySelector<HTMLElement>(
        ":scope > [data-atlas-secondary-work-host]",
      );
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasSecondaryWorkHost = "true";
        addisonLane.prepend(nextHost);
      }
      setHost((current) => (current === nextHost ? current : nextHost));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      restoreLaneChildren(activeLane);
      restoreLegacyViewButtons();
      document
        .querySelectorAll<HTMLElement>("[data-atlas-secondary-work-host]")
        .forEach((node) => node.remove());
    };
  }, []);

  useEffect(() => {
    if (!nativeLane) return;
    restoreLaneChildren(nativeLane);

    Array.from(nativeLane.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child.dataset.atlasSecondaryWorkHost === "true") return;
      child.dataset.atlasSecondaryWorkHidden = "true";
      child.style.setProperty("display", "none", "important");
    });
  }, [mode, nativeLane]);

  useEffect(() => {
    let cancelled = false;
    setWorkRows([]);

    const load = async () => {
      const [teamResponse, atlasResponse] = await Promise.all([
        fetch("/api/atlas-team", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(
          `/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        ),
      ]);

      const team = await teamResponse.json().catch(() => ({}));
      const atlas = await atlasResponse.json().catch(() => ({}));
      if (cancelled) return;

      const activeMembers = (Array.isArray(team?.members) ? team.members : [])
        .filter((member: TeamMember) => member?.active !== false)
        .filter(
          (member: TeamMember) =>
            !member.propertyIds?.length || member.propertyIds.includes(propertyId),
        );

      setMembers(activeMembers);
      setWorkLists(Array.isArray(team?.workLists) ? team.workLists : []);
      setWorkRows(
        Array.isArray(atlas?.serviceRecords)
          ? atlas.serviceRecords
          : Array.isArray(atlas?.workOrders)
            ? atlas.workOrders
            : [],
      );
    };

    void load().catch(() => undefined);
    const refresh = () => void load().catch(() => undefined);
    window.addEventListener("atlas:data-changed", refresh as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [propertyId]);

  const employeeOptions = useMemo(() => {
    const names = new Map<string, string>();

    members.forEach((member) => {
      const clean = String(member.name || "").trim();
      if (!clean) return;
      if (/^nick(?:\s|$)/i.test(clean)) return;
      const key = normalized(clean);
      if (!names.has(key)) names.set(key, clean);
    });

    return [...names.values()].sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [members]);

  useEffect(() => {
    if (!employeeOptions.length) return;
    if (!employeeOptions.includes(mode)) setMode(employeeOptions[0]);
  }, [employeeOptions, mode]);

  useEffect(() => {
    setNewWorkTitle("");
    setNewWorkDate(localDateKey(1));
  }, [mode]);

  const allWorkRows = useMemo(() => {
    const sharedRows: WorkRow[] = workLists.flatMap((list: any) =>
      (Array.isArray(list?.tasks) ? list.tasks : []).map((task: any) => ({
        ...task,
        __teamListId: String(list?.id || ""),
        __teamTaskId: String(task?.id || ""),
        propertyId: propertyId,
      })),
    );
    return [...workRows, ...sharedRows];
  }, [workRows, workLists, propertyId]);

  const personRows = useMemo(() => {
    if (!mode) return [];
    return allWorkRows.filter((record) =>
      record && memberMatches(mode, workAssignee(record)),
    );
  }, [mode, allWorkRows]);

  const today = localDateKey();

  const todayRows = useMemo(
    () =>
      personRows
        .filter((record) => !isComplete(record.status))
        .filter((record) => {
          const due = workDueDate(record);
          return Boolean(due && due <= today);
        })
        .sort((a, b) => {
          const aDate = workDueDate(a);
          const bDate = workDueDate(b);
          return (
            aDate.localeCompare(bDate) ||
            priorityWeight(priorityOf(a)) - priorityWeight(priorityOf(b)) ||
            workTitle(a).localeCompare(workTitle(b))
          );
        }),
    [personRows, today],
  );

  const upcomingRows = useMemo(
    () =>
      personRows
        .filter((record) => !isComplete(record.status))
        .filter((record) => {
          const due = workDueDate(record);
          return Boolean(due && due > today);
        })
        .sort((a, b) =>
          workDueDate(a).localeCompare(workDueDate(b)) ||
          priorityWeight(priorityOf(a)) - priorityWeight(priorityOf(b)) ||
          workTitle(a).localeCompare(workTitle(b)),
        ),
    [personRows, today],
  );

  const needsDateRows = useMemo(
    () =>
      personRows
        .filter((record) => !isComplete(record.status))
        .filter((record) => !workDueDate(record))
        .sort((a, b) =>
          priorityWeight(priorityOf(a)) - priorityWeight(priorityOf(b)) ||
          workTitle(a).localeCompare(workTitle(b)),
        ),
    [personRows],
  );

  const completedRows = useMemo(
    () =>
      personRows
        .filter((record) => isComplete(record.status))
        .sort((a, b) =>
          workCompletedDate(b).localeCompare(workCompletedDate(a)) ||
          workTitle(a).localeCompare(workTitle(b)),
        )
        .slice(0, 20),
    [personRows],
  );

  const activeCount = todayRows.length + upcomingRows.length + needsDateRows.length;

  async function addWorkForSelectedPerson() {
    const title = newWorkTitle.trim();
    if (!mode || !title || savingWork) return;

    setSavingWork(true);
    const directId = `direct-assignments-${propertyId}`;
    const task = {
      id: `team-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      assignee: mode,
      location: "",
      notes: "",
      status: "Open",
      priority: "Medium",
      dueDate: newWorkDate || "",
      date: newWorkDate || "",
      requirePhoto: false,
      createdAt: new Date().toISOString(),
    };

    const existing = workLists.find((list) => String(list?.id) === directId);
    const nextLists = existing
      ? workLists.map((list) =>
          String(list?.id) === directId
            ? { ...list, tasks: [...(Array.isArray(list.tasks) ? list.tasks : []), task] }
            : list,
        )
      : [
          {
            id: directId,
            name: "Direct Assignments",
            description: "One-off work assigned directly to team members.",
            defaultAssignee: mode,
            propertyIds: [propertyId],
            schedule: "As needed",
            active: true,
            tasks: [task],
          },
          ...workLists,
        ];

    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "team-work-lists-save", workLists: nextLists }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Could not add work.");
      setWorkLists(nextLists);
      setNewWorkTitle("");
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not add work.");
    } finally {
      setSavingWork(false);
    }
  }

  if (!host) return null;

  const workRow = (record: WorkRow, keyPrefix: string) => {
    const due = workDueDate(record);
    const overdue = Boolean(due && due < today && !isComplete(record.status));
    return (
      <button
        type="button"
        className="atlas-secondary-custom-row"
        key={`${keyPrefix}-${String(record.id || `${workTitle(record)}-${due}`)}`}
        onClick={openWorkPage}
      >
        <strong>{workTitle(record)}</strong>
        <small>
          {due ? formatDue(due) : "Needs date"} · {priorityOf(record)}
          {overdue ? " · Overdue" : ""}
        </small>
      </button>
    );
  };

  return createPortal(
    <>
      <style>{`
        .atlas-secondary-work-switcher {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 5px;
          padding: 0 0 8px;
          margin: 0 0 6px;
        }
        .atlas-secondary-work-switcher select,
        .atlas-secondary-work-switcher button,
        .atlas-secondary-add-form input {
          border: 1px solid #D8E0E8;
          background: #FFFFFF;
          color: #17324D;
          border-radius: 8px;
          min-height: 30px;
          padding: 4px 8px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          min-width: 0;
        }
        .atlas-secondary-work-switcher select { width: 100%; cursor: pointer; }
        .atlas-secondary-work-switcher button,
        .atlas-secondary-add-form button { cursor: pointer; white-space: nowrap; }
        .atlas-secondary-work-switcher button[data-active="true"] {
          border-color: #D5B65C;
          background: #D5B65C;
          color: #102A43;
        }
        .atlas-secondary-add-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 128px auto;
          gap: 5px;
          margin-bottom: 10px;
        }
        .atlas-secondary-add-form button {
          border: 1px solid #D5B65C;
          background: #D5B65C;
          color: #102A43;
          border-radius: 8px;
          min-height: 30px;
          padding: 4px 9px;
          font: inherit;
          font-size: 11px;
          font-weight: 850;
        }
        .atlas-secondary-add-form button:disabled { opacity: .55; cursor: default; }
        .atlas-secondary-custom-list { display: grid; gap: 7px; }
        .atlas-secondary-custom-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          margin-bottom: 2px;
        }
        .atlas-secondary-custom-head strong { color: #17324D; font-size: 18px; }
        .atlas-secondary-custom-count {
          border: 1px solid #D8E0E8;
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 11px;
          font-weight: 800;
          color: #53677A;
          background: #FFFFFF;
        }
        .atlas-secondary-section {
          border-top: 1px solid #E4EAF0;
          padding-top: 8px;
          margin-top: 2px;
        }
        .atlas-secondary-section:first-of-type { border-top: 0; padding-top: 0; }
        .atlas-secondary-section-title {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          color: #17324D;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 6px;
        }
        .atlas-secondary-section-title span:last-child {
          color: #617487;
          font-size: 11px;
          font-weight: 800;
        }
        .atlas-secondary-custom-rows {
          display: grid;
          gap: 6px;
          max-height: 330px;
          overflow-y: auto;
          padding-right: 2px;
        }
        .atlas-secondary-custom-row,
        .atlas-secondary-custom-row:hover,
        .atlas-secondary-custom-row:focus,
        .atlas-secondary-custom-row:focus-visible,
        .atlas-secondary-custom-row:active {
          width: 100%;
          border: 1px solid #D8E0E8 !important;
          border-radius: 9px;
          background: #FFFFFF !important;
          padding: 8px;
          text-align: left;
          cursor: pointer;
          color: #17324D !important;
          box-shadow: none !important;
          transform: none !important;
        }
        .atlas-secondary-custom-row strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          line-height: 1.3;
        }
        .atlas-secondary-custom-row small {
          display: block;
          margin-top: 2px;
          color: #617487;
          font-size: 12px;
          line-height: 1.3;
        }
        .atlas-secondary-custom-empty {
          border: 1px dashed #D8E0E8;
          border-radius: 9px;
          padding: 9px 10px;
          color: #617487;
          font-size: 12px;
          background: #FFFFFF;
        }
        .atlas-secondary-completed summary {
          cursor: pointer;
          color: #17324D;
          font-size: 12px;
          font-weight: 900;
          list-style-position: inside;
        }
        .atlas-secondary-completed .atlas-secondary-custom-rows { margin-top: 6px; max-height: 220px; }
        .atlas-secondary-completed .atlas-secondary-custom-row { opacity: .72; }
        .atlas-secondary-open-all {
          border: 0;
          background: transparent;
          color: #17324D;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          padding: 3px 0;
          text-align: left;
        }
        @media (max-width: 720px) {
          .atlas-secondary-work-switcher { grid-template-columns: minmax(0, 1fr) auto auto; }
          .atlas-secondary-add-form { grid-template-columns: minmax(0,1fr) auto; }
          .atlas-secondary-add-form input[type="date"] { grid-column: 1 / -1; }
          .atlas-secondary-custom-rows { max-height: 280px; }
        }
      `}</style>

      <div className="atlas-secondary-work-switcher" aria-label="Choose employee work list">
        <select
          aria-label="Choose employee work list"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
        >
          {employeeOptions.map((name) => (
            <option key={name} value={name}>
              {displayName(name)}
            </option>
          ))}
        </select>
        <button type="button" data-active={newWorkDate === localDateKey()} onClick={() => setNewWorkDate(localDateKey())}>
          Today
        </button>
        <button type="button" data-active={newWorkDate === localDateKey(1)} onClick={() => setNewWorkDate(localDateKey(1))}>
          Tomorrow
        </button>
      </div>

      {mode ? (
        <div className="atlas-secondary-custom-list">
          <div className="atlas-secondary-custom-head">
            <div>
              <strong>{displayName(mode)}</strong>
              <div style={{ color: "#617487", fontSize: 11, marginTop: 1 }}>
                {activeCount} active · {upcomingRows.length} upcoming
              </div>
            </div>
            <span className="atlas-secondary-custom-count">{activeCount}</span>
          </div>

          <div className="atlas-secondary-add-form">
            <input
              value={newWorkTitle}
              onChange={(event) => setNewWorkTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addWorkForSelectedPerson();
                }
              }}
              placeholder={`Add work for ${displayName(mode)}…`}
            />
            <input
              type="date"
              aria-label="Work date"
              value={newWorkDate}
              onChange={(event) => setNewWorkDate(event.currentTarget.value)}
            />
            <button
              type="button"
              disabled={!newWorkTitle.trim() || savingWork}
              onClick={() => void addWorkForSelectedPerson()}
            >
              {savingWork ? "Adding…" : "Add Work"}
            </button>
          </div>

          <button type="button" className="atlas-secondary-open-all" onClick={openWorkPage}>
            Open All Work
          </button>

          <section className="atlas-secondary-section">
            <div className="atlas-secondary-section-title">
              <span>Today</span>
              <span>{todayRows.length}</span>
            </div>
            <div className="atlas-secondary-custom-rows">
              {todayRows.length ? (
                todayRows.map((record) => workRow(record, "today"))
              ) : (
                <div className="atlas-secondary-custom-empty">Nothing scheduled today.</div>
              )}
            </div>
          </section>

          {completedRows.length ? (
            <details className="atlas-secondary-completed atlas-secondary-section">
              <summary>Completed · {completedRows.length}</summary>
              <div className="atlas-secondary-custom-rows">
                {completedRows.map((record) => workRow(record, "completed"))}
              </div>
            </details>
          ) : null}

          <section className="atlas-secondary-section">
            <div className="atlas-secondary-section-title">
              <span>Upcoming</span>
              <span>{upcomingRows.length}</span>
            </div>
            <div className="atlas-secondary-custom-rows">
              {upcomingRows.length ? (
                upcomingRows.map((record) => workRow(record, "upcoming"))
              ) : (
                <div className="atlas-secondary-custom-empty">No future work scheduled.</div>
              )}
            </div>
          </section>

          {needsDateRows.length ? (
            <section className="atlas-secondary-section">
              <div className="atlas-secondary-section-title">
                <span>Needs Date</span>
                <span>{needsDateRows.length}</span>
              </div>
              <div className="atlas-secondary-custom-rows">
                {needsDateRows.map((record) => workRow(record, "undated"))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </>,
    host,
  );
}
