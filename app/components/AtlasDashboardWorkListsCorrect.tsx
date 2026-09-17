"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TeamMember = {
  id?: string;
  name?: string;
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
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function visibleButton(label: string, scope: ParentNode = document) {
  const wanted = normalized(label);
  return Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.offsetParent !== null && normalized(button.textContent) === wanted,
  ) || null;
}

function workSection() {
  const daily = visibleButton("Nick + Addison");
  const direct = daily?.closest("section") as HTMLElement | null;
  if (direct) return direct;
  return Array.from(document.querySelectorAll<HTMLElement>("main section, section")).find((section) =>
    section.offsetParent !== null &&
    Array.from(section.querySelectorAll<HTMLElement>("h1,h2,h3,strong")).some(
      (node) => normalized(node.textContent) === "work lists",
    ),
  ) || null;
}

function personLane(section: HTMLElement, person: string) {
  const wanted = normalized(person);
  for (const heading of Array.from(section.querySelectorAll<HTMLElement>("strong"))) {
    if (normalized(heading.textContent) !== wanted) continue;
    const lane = heading.closest("section") as HTMLElement | null;
    if (lane && lane !== section) return lane;
  }
  return null;
}

function dateKey(value: unknown) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}

function dueDate(record: WorkRow) {
  return dateKey(
    record.dueDate || record.due_date || record.nextDueDate || record.next_due_date ||
    record.nextServiceDate || record.next_service_date || record.date || record.item_date ||
    record.scheduledDate || record.scheduled_date,
  );
}

function assignee(record: WorkRow) {
  return String(record.assignedTo || record.assigned_to || record.assignee || record.assignedPerson || "").trim();
}

function title(record: WorkRow) {
  return String(record.title || record.name || record.taskTitle || "Work").trim();
}

function priority(record: WorkRow) {
  return String(record.priority || record.urgency || "Medium").trim();
}

function isClosed(record: WorkRow) {
  return ["completed", "closed", "cancelled", "canceled", "skipped", "moved to work"].includes(
    normalized(record.status),
  );
}

function completedToday(record: WorkRow, today: string) {
  if (dateKey(record.lastCompletedDate || record.last_completed_date || record.completedAt || record.completed_at) === today) {
    return true;
  }
  const completionHistory = Array.isArray(record.completionHistory)
    ? record.completionHistory
    : Array.isArray(record.completion_history)
      ? record.completion_history
      : [];
  if (completionHistory.some((value) => dateKey(value) === today)) return true;
  const serviceHistory = Array.isArray(record.serviceHistory)
    ? record.serviceHistory
    : Array.isArray(record.service_history)
      ? record.service_history
      : [];
  return serviceHistory.some((entry: any) => dateKey(entry?.completedAt || entry?.completed_at) === today);
}

function matchesPerson(name: string, assignment: string) {
  const full = normalized(name);
  const assigned = normalized(assignment);
  if (!full || !assigned) return false;
  const first = full.split(/\s+/)[0] || full;
  if (assigned === full || assigned === first || full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `)) {
    return true;
  }
  if ((first === "patrick" || first === "pat") && (assigned === "pat" || assigned.startsWith("pat ") || assigned.includes("pat's crew"))) {
    return true;
  }
  return false;
}

function shortName(value: string) {
  if (/^patrick(?:\s|$)|^pat(?:\s|$)/i.test(value)) return "Pat";
  if (/^sean(?:\s|$)/i.test(value)) return "Sean";
  if (/^addison(?:\s|$)/i.test(value)) return "Addison";
  if (/^nick(?:\s|$)/i.test(value)) return "Nick";
  return value;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function openWork() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.offsetParent !== null && normalized(candidate.textContent) === "work",
  );
  if (button) button.click();
  else window.location.assign("/?section=work");
}

export default function AtlasDashboardWorkListsCorrect() {
  const [propertyId, setPropertyId] = useState("2000");
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("Nick");
  const [upcomingHost, setUpcomingHost] = useState<HTMLElement | null>(null);
  const [completedHost, setCompletedHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let hiddenLane: HTMLElement | null = null;

    const restoreLane = (lane: HTMLElement | null) => {
      if (!lane) return;
      Array.from(lane.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child.dataset.atlasCorrectUpcomingHost === "true") return;
        if (child.dataset.atlasCorrectHidden === "true") {
          child.style.removeProperty("display");
          delete child.dataset.atlasCorrectHidden;
        }
      });
    };

    const apply = () => {
      frame = 0;
      const section = workSection();
      if (!section) {
        restoreLane(hiddenLane);
        hiddenLane = null;
        setUpcomingHost(null);
        setCompletedHost(null);
        return;
      }

      const nextProperty = currentPropertyId();
      setPropertyId((current) => current === nextProperty ? current : nextProperty);

      const daily = visibleButton("Nick + Addison", section);
      const nick = personLane(section, "Nick");
      const secondary = personLane(section, "Addison");
      if ((!nick || !secondary) && daily) {
        daily.click();
        return;
      }
      if (!nick || !secondary) return;

      for (const label of ["Nick + Addison", "Sean", "Pat", "Everyone"]) {
        const button = visibleButton(label, section);
        if (button) button.style.setProperty("display", "none", "important");
      }

      if (hiddenLane && hiddenLane !== secondary) restoreLane(hiddenLane);
      hiddenLane = secondary;
      Array.from(secondary.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child.dataset.atlasCorrectUpcomingHost === "true") return;
        child.dataset.atlasCorrectHidden = "true";
        child.style.setProperty("display", "none", "important");
      });

      let rightHost = secondary.querySelector<HTMLElement>(":scope > [data-atlas-correct-upcoming-host]");
      if (!rightHost) {
        rightHost = document.createElement("div");
        rightHost.dataset.atlasCorrectUpcomingHost = "true";
        secondary.prepend(rightHost);
      }
      setUpcomingHost((current) => current === rightHost ? current : rightHost);

      const completedDetails = Array.from(nick.querySelectorAll<HTMLDetailsElement>("details")).find((details) => {
        const summary = details.querySelector("summary");
        return normalized(summary?.textContent).startsWith("completed today");
      });

      if (completedDetails) {
        let host = completedDetails.querySelector<HTMLElement>(":scope > [data-atlas-all-completed-host]");
        if (!host) {
          host = document.createElement("div");
          host.dataset.atlasAllCompletedHost = "true";
          completedDetails.appendChild(host);
        }
        Array.from(completedDetails.children).forEach((child) => {
          if (!(child instanceof HTMLElement)) return;
          if (child.tagName === "SUMMARY" || child.dataset.atlasAllCompletedHost === "true") return;
          child.style.setProperty("display", "none", "important");
        });
        setCompletedHost((current) => current === host ? current : host);
      } else {
        setCompletedHost(null);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      restoreLane(hiddenLane);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [teamResponse, atlasResponse] = await Promise.all([
          fetch("/api/atlas-team", { cache: "no-store", credentials: "include" }),
          fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);
        const team = await teamResponse.json().catch(() => ({}));
        const atlas = await atlasResponse.json().catch(() => ({}));
        if (cancelled) return;
        setMembers(Array.isArray(team?.members) ? team.members : []);
        setRows(Array.isArray(atlas?.serviceRecords) ? atlas.serviceRecords : Array.isArray(atlas?.workOrders) ? atlas.workOrders : []);
      } catch {
        if (!cancelled) {
          setMembers([]);
          setRows([]);
        }
      }
    };
    void load();
    const refresh = () => void load();
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [propertyId]);

  const employees = useMemo(() => {
    const names = new Map<string, string>();
    names.set("nick", "Nick");
    members
      .filter((member) => member?.active !== false)
      .filter((member) => !member?.propertyIds?.length || member.propertyIds.includes(propertyId))
      .filter((member) => !normalized(member.role).includes("vendor"))
      .forEach((member) => {
        const name = String(member.name || "").trim();
        if (!name) return;
        const key = normalized(name);
        if (!names.has(key)) names.set(key, name);
      });
    return [...names.values()].sort((a, b) => {
      if (shortName(a) === "Nick") return -1;
      if (shortName(b) === "Nick") return 1;
      return shortName(a).localeCompare(shortName(b));
    });
  }, [members, propertyId]);

  useEffect(() => {
    if (!employees.some((name) => matchesPerson(name, selectedPerson) || matchesPerson(selectedPerson, name))) {
      setSelectedPerson("Nick");
    }
  }, [employees, selectedPerson]);

  const today = localDateKey();
  const horizon = localDateKey(7);
  const upcoming = useMemo(() => rows
    .filter((record) => !isClosed(record))
    .filter((record) => matchesPerson(selectedPerson, assignee(record)))
    .filter((record) => {
      const date = dueDate(record);
      return Boolean(date && date > today && date <= horizon);
    })
    .sort((a, b) => dueDate(a).localeCompare(dueDate(b)) || title(a).localeCompare(title(b))),
  [rows, selectedPerson, today, horizon]);

  const completed = useMemo(() => rows
    .filter((record) => completedToday(record, today))
    .filter((record) => {
      const assigned = assignee(record);
      return !assigned || employees.some((name) => matchesPerson(name, assigned));
    })
    .sort((a, b) => title(a).localeCompare(title(b))),
  [rows, employees, today]);

  useEffect(() => {
    if (!completedHost) return;
    const details = completedHost.closest("details");
    const summary = details?.querySelector("summary");
    if (summary) summary.textContent = `Completed today · ${completed.length}`;
  }, [completedHost, completed.length]);

  const row = (record: WorkRow, prefix: string) => (
    <button
      type="button"
      key={`${prefix}-${String(record.id || `${title(record)}-${dueDate(record)}`)}`}
      onClick={openWork}
      className="atlas-correct-work-row"
    >
      <strong>{title(record)}</strong>
      <small>{dueDate(record) ? formatDate(dueDate(record)) : "Completed today"}</small>
    </button>
  );

  return (
    <>
      <style jsx global>{`
        .atlas-correct-upcoming { display: grid; gap: 8px; }
        .atlas-correct-upcoming-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .atlas-correct-upcoming-head strong { color: #17324D; font-size: 18px; }
        .atlas-correct-upcoming select {
          min-height: 32px; border: 1px solid #D8E0E8; border-radius: 8px; background: #fff;
          color: #17324D; padding: 5px 9px; font: inherit; font-size: 11px; font-weight: 800;
        }
        .atlas-correct-upcoming details, [data-atlas-all-completed-host] { margin-top: 6px; }
        .atlas-correct-upcoming summary { cursor: pointer; color: #17324D; font-size: 13px; font-weight: 900; }
        .atlas-correct-work-list { display: grid; gap: 6px; margin-top: 7px; max-height: 300px; overflow-y: auto; }
        .atlas-correct-work-row {
          width: 100%; border: 1px solid #D8E0E8; border-radius: 9px; background: #fff; padding: 8px 9px;
          text-align: left; color: #17324D; cursor: pointer;
        }
        .atlas-correct-work-row strong { display: block; font-size: 13px; line-height: 1.3; }
        .atlas-correct-work-row small { display: block; margin-top: 2px; color: #718196; font-size: 11px; }
        .atlas-correct-empty { margin-top: 7px; border: 1px dashed #D8E0E8; border-radius: 9px; padding: 9px; color: #718196; font-size: 12px; }
      `}</style>

      {completedHost ? createPortal(
        <div className="atlas-correct-work-list">
          {completed.length ? completed.map((record) => row(record, "completed")) : <div className="atlas-correct-empty">No completed work today.</div>}
        </div>,
        completedHost,
      ) : null}

      {upcomingHost ? createPortal(
        <div className="atlas-correct-upcoming">
          <div className="atlas-correct-upcoming-head">
            <strong>Upcoming</strong>
            <select value={selectedPerson} onChange={(event) => setSelectedPerson(event.currentTarget.value)} aria-label="Upcoming employee">
              {employees.map((name) => <option key={name} value={name}>{shortName(name)}</option>)}
            </select>
          </div>
          <details>
            <summary>Upcoming · next 7 days · {upcoming.length}</summary>
            <div className="atlas-correct-work-list">
              {upcoming.length ? upcoming.map((record) => row(record, "upcoming")) : <div className="atlas-correct-empty">No upcoming work.</div>}
            </div>
          </details>
        </div>,
        upcomingHost,
      ) : null}
    </>
  );
}
