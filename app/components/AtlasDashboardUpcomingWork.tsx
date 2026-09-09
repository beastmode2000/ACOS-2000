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

const UPCOMING_MODE = "__nick_upcoming__";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
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
  const [mode, setMode] = useState("Addison");

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

    if (mode === "Addison") return;

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

    return [...names.values()].sort((a, b) => {
      const rank = (name: string) =>
        /^addison(?:\s|$)/i.test(name)
          ? 0
          : /^sean(?:\s|$)/i.test(name)
            ? 1
            : /^patrick(?:\s|$)|^pat(?:\s|$)/i.test(name)
              ? 2
              : 3;
      return rank(a) - rank(b) || a.localeCompare(b);
    });
  }, [members]);

  const customRows = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return workRows
      .filter((record) => record && !isComplete(record.status))
      .filter((record) => {
        const due = workDueDate(record);
        const assigned = workAssignee(record);
        if (mode === UPCOMING_MODE) {
          return memberMatches("Nick", assigned) && Boolean(due && due > today);
        }
        return memberMatches(mode, assigned) && (!due || due <= today);
      })
      .sort((a, b) => {
        const aDate = workDueDate(a) || "0000-00-00";
        const bDate = workDueDate(b) || "0000-00-00";
        return (
          aDate.localeCompare(bDate) ||
          priorityWeight(priorityOf(a)) - priorityWeight(priorityOf(b)) ||
          workTitle(a).localeCompare(workTitle(b))
        );
      })
      .slice(0, 20);
  }, [mode, workRows]);

  if (!host) return null;

  const selector = (
    <div className="atlas-secondary-work-switcher" aria-label="Choose secondary work list">
      <select
        aria-label="Choose employee work list"
        defaultValue="Addison"
        onChange={(event) => setMode(event.target.value)}
      >
        {employeeOptions.map((name) => (
          <option key={name} value={name}>
            {displayName(name)}
          </option>
        ))}
      </select>
      <button
        type="button"
        data-active={mode === UPCOMING_MODE}
        onClick={() => setMode(UPCOMING_MODE)}
      >
        Nick Upcoming
      </button>
    </div>
  );

  return createPortal(
    <>
      <style>{`
        .atlas-secondary-work-switcher {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          padding: 0 0 8px;
          margin: 0 0 8px;
          scrollbar-width: none;
        }
        .atlas-secondary-work-switcher::-webkit-scrollbar { display: none; }
        .atlas-secondary-work-switcher select {
          flex: 1 1 auto;
          min-width: 0;
          border: 1px solid #D8E0E8;
          background: #FFFFFF;
          color: #17324D;
          border-radius: 8px;
          min-height: 28px;
          padding: 3px 8px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .atlas-secondary-work-switcher button {
          flex: 0 0 auto;
          border: 1px solid #D8E0E8;
          background: #FFFFFF;
          color: #17324D;
          border-radius: 8px;
          min-height: 28px;
          padding: 3px 8px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .atlas-secondary-work-switcher button[data-active="true"] {
          border-color: #D5B65C;
          background: #D5B65C;
          color: #102A43;
        }
        .atlas-secondary-custom-list {
          display: grid;
          gap: 7px;
        }
        .atlas-secondary-custom-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          margin-bottom: 2px;
        }
        .atlas-secondary-custom-head strong {
          color: #17324D;
          font-size: 18px;
        }
        .atlas-secondary-custom-count {
          border: 1px solid #D8E0E8;
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 11px;
          font-weight: 800;
          color: #53677A;
          background: #FFFFFF;
        }
        .atlas-secondary-custom-rows {
          display: grid;
          gap: 6px;
          max-height: 470px;
          overflow-y: auto;
          padding-right: 2px;
        }
        .atlas-secondary-custom-row {
          width: 100%;
          border: 1px solid #D8E0E8;
          border-radius: 9px;
          background: #FFFFFF;
          padding: 8px;
          text-align: left;
          cursor: pointer;
          color: #17324D;
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
          padding: 12px;
          color: #617487;
          font-size: 12px;
          background: #FFFFFF;
        }
        .atlas-secondary-open-all {
          border: 0;
          background: transparent;
          color: #17324D;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          padding: 3px 0;
        }
        @media (max-width: 720px) {
          .atlas-secondary-custom-rows { max-height: 340px; }
        }
      `}</style>
      {selector}
      {mode !== "Addison" ? (
        <div className="atlas-secondary-custom-list">
          <div className="atlas-secondary-custom-head">
            <strong>{mode === UPCOMING_MODE ? "Nick Upcoming" : displayName(mode)}</strong>
            <span className="atlas-secondary-custom-count">{customRows.length}</span>
          </div>
          <button type="button" className="atlas-secondary-open-all" onClick={openWorkPage}>
            Open All Work
          </button>
          <div className="atlas-secondary-custom-rows">
            {customRows.length ? (
              customRows.map((record) => {
                const due = workDueDate(record);
                return (
                  <button
                    type="button"
                    className="atlas-secondary-custom-row"
                    key={String(record.id || `${workTitle(record)}-${due}`)}
                    onClick={openWorkPage}
                  >
                    <strong>{workTitle(record)}</strong>
                    <small>
                      {formatDue(due)} · {priorityOf(record)}
                    </small>
                  </button>
                );
              })
            ) : (
              <div className="atlas-secondary-custom-empty">
                {mode === UPCOMING_MODE
                  ? "No future scheduled work for Nick."
                  : `No current work for ${displayName(mode)}.`}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>,
    host,
  );
}