"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type WorkRow = Record<string, unknown>;

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dateKey(value: unknown) {
  return String(value || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function assignee(record: WorkRow) {
  return String(record.assignedTo || record.assigned_to || record.assignee || record.assignedPerson || "").trim();
}

function title(record: WorkRow) {
  return String(record.title || record.name || record.taskTitle || "Work").trim();
}

function matchesPerson(name: string, assignment: string) {
  const full = normalized(name);
  const assigned = normalized(assignment);
  if (!full || !assigned) return false;
  const first = full.split(/\s+/)[0] || full;
  if (assigned === full || assigned === first || full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `)) return true;
  if ((first === "patrick" || first === "pat") && (assigned === "pat" || assigned.startsWith("pat ") || assigned.includes("pat's crew"))) return true;
  return false;
}

function completedToday(record: WorkRow, today: string) {
  if (dateKey(record.lastCompletedDate || record.last_completed_date || record.completedAt || record.completed_at) === today) return true;
  const history = Array.isArray(record.completionHistory)
    ? record.completionHistory
    : Array.isArray(record.completion_history)
      ? record.completion_history
      : [];
  if (history.some((value) => dateKey(value) === today)) return true;
  const service = Array.isArray(record.serviceHistory)
    ? record.serviceHistory
    : Array.isArray(record.service_history)
      ? record.service_history
      : [];
  if (service.some((entry: any) => dateKey(entry?.completedAt || entry?.completed_at) === today)) return true;
  if (["completed", "closed", "done"].includes(normalized(record.status))) {
    return dateKey(record.date || record.dueDate || record.due_date || record.updatedAt || record.updated_at) === today;
  }
  return false;
}

function propertyId() {
  return document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]')?.value || "2000";
}

function openWork() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.offsetParent !== null && normalized(candidate.textContent) === "work",
  );
  if (button) button.click();
  else window.location.assign("/?section=work");
}

export default function AtlasDashboardSelectedCompleted() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [selectedPerson, setSelectedPerson] = useState("Nick");
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [activePropertyId, setActivePropertyId] = useState("2000");

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const root = document.querySelector<HTMLElement>("[data-atlas-correct-upcoming-host] .atlas-correct-upcoming");
      const select = root?.querySelector<HTMLSelectElement>('select[aria-label="Upcoming employee"]') || null;
      if (!root || !select) {
        setHost(null);
        return;
      }
      setSelectedPerson(select.value || "Nick");
      setActivePropertyId(propertyId());
      let nextHost = root.querySelector<HTMLElement>(":scope > [data-atlas-selected-completed-host]");
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasSelectedCompletedHost = "true";
        const upcomingDetails = root.querySelector(":scope > details");
        if (upcomingDetails) root.insertBefore(nextHost, upcomingDetails);
        else root.appendChild(nextHost);
      }
      setHost((current) => current === nextHost ? current : nextHost);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.getAttribute("aria-label") === "Upcoming employee") {
        setSelectedPerson(target.value || "Nick");
      }
      schedule();
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("change", onChange, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("change", onChange, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [atlasResponse, teamResponse] = await Promise.all([
          fetch(`/api/atlas?propertyId=${encodeURIComponent(activePropertyId)}&t=${Date.now()}`, { cache: "no-store", credentials: "include" }),
          fetch("/api/atlas-team", { cache: "no-store", credentials: "include" }),
        ]);
        const atlas = await atlasResponse.json().catch(() => ({}));
        const team = await teamResponse.json().catch(() => ({}));
        if (cancelled) return;
        const atlasRows = Array.isArray(atlas?.serviceRecords) ? atlas.serviceRecords : Array.isArray(atlas?.workOrders) ? atlas.workOrders : [];
        const teamRows: WorkRow[] = (Array.isArray(team?.workLists) ? team.workLists : []).flatMap((list: any) =>
          (Array.isArray(list?.tasks) ? list.tasks : []).map((task: any) => ({
            ...task,
            assignedTo: task?.assignedTo || task?.assignee || list?.defaultAssignee || "",
          })),
        );
        setRows([...atlasRows, ...teamRows]);
      } catch {
        if (!cancelled) setRows([]);
      }
    };
    void load();
    const refresh = () => void load();
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [activePropertyId]);

  const completed = useMemo(() => {
    const today = localToday();
    const seen = new Set<string>();
    return rows
      .filter((record) => completedToday(record, today))
      .filter((record) => matchesPerson(selectedPerson, assignee(record)))
      .filter((record) => {
        const key = String(record.id || `${title(record)}|${assignee(record)}|${today}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => title(a).localeCompare(title(b)));
  }, [rows, selectedPerson]);

  if (!host) return null;

  return createPortal(
    <details className="atlas-selected-person-completed">
      <summary>Completed · {completed.length}</summary>
      <div className="atlas-correct-work-list">
        {completed.length ? completed.map((record) => (
          <button
            type="button"
            key={String(record.id || `${title(record)}-${assignee(record)}`)}
            className="atlas-correct-work-row"
            onClick={openWork}
          >
            <strong>{title(record)}</strong>
            <small>Completed today</small>
          </button>
        )) : <div className="atlas-correct-empty">No completed work today.</div>}
      </div>
      <style jsx global>{`
        .atlas-selected-person-completed { margin-top: 6px; }
        .atlas-selected-person-completed summary { cursor: pointer; color: #17324D; font-size: 13px; font-weight: 900; }
      `}</style>
    </details>,
    host,
  );
}
