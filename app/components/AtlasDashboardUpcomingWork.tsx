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

type UpcomingRow = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: string;
  source: "Work" | "Team List";
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function findDashboardMain() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2"));
  const dashboardHeading = headings.find((node) => normalized(node.textContent) === "dashboard");
  return (dashboardHeading?.closest("main") as HTMLElement | null) || null;
}

function directLabel(section: HTMLElement) {
  const candidates = Array.from(section.querySelectorAll<HTMLElement>("h2, h3, h4, strong"));
  return candidates.map((node) => normalized(node.textContent)).find(Boolean) || "";
}

function findAddisonLane(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("section")).find((section) => {
    const label = directLabel(section);
    if (label === "addison" || label === "addison's list" || label === "addison work") return true;
    const text = normalized(section.textContent);
    return (
      (text.includes("addison") && text.includes("list")) ||
      (text.includes("addison") && text.includes("work"))
    ) && section.querySelectorAll("section").length === 0;
  }) || null;
}

function findTodayWorkSection(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("section")).find((section) => {
    const label = directLabel(section);
    return label === "today's work" || label === "todays work" || label === "today";
  }) || null;
}

function isComplete(status: unknown) {
  return ["completed", "closed", "cancelled", "canceled", "skipped", "moved to work"].includes(normalized(status));
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
    record.assignedTo || record.assigned_to || record.assignee || record.assignedPerson || "",
  ).trim();
}

function workTitle(record: WorkRow) {
  return String(record.title || record.name || record.taskTitle || "Untitled work").trim();
}

function priorityOf(record: WorkRow) {
  return String(record.priority || record.urgency || "").trim();
}

function memberMatches(name: string, assignment: string) {
  const full = normalized(name);
  const assigned = normalized(assignment);
  if (!full || !assigned) return false;
  const first = full.split(/\s+/)[0] || full;
  if (assigned === full || assigned === first) return true;
  if (full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `)) return true;
  if (first === "patrick" && (assigned === "pat" || assigned.startsWith("pat "))) return true;
  return false;
}

function displayName(name: string) {
  const clean = name.trim();
  if (/^patrick(?:\s|$)/i.test(clean)) return "Pat";
  if (/^sean(?:\s|$)/i.test(clean)) return "Sean";
  if (/^addison(?:\s|$)/i.test(clean)) return "Addison";
  return clean.split(/\s+/)[0] || clean;
}

function formatDue(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function priorityWeight(value: string) {
  const clean = normalized(value);
  if (clean === "urgent" || clean === "high") return 0;
  if (clean === "medium" || clean === "normal") return 1;
  if (clean === "low") return 2;
  return 3;
}

function openWorkPage() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((candidate) =>
    normalized(candidate.textContent) === "work" && candidate.offsetParent !== null,
  );
  if (button) {
    button.click();
    return;
  }
  window.location.assign("/?section=work");
}

export default function AtlasDashboardUpcomingWork() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workRows, setWorkRows] = useState<WorkRow[]>([]);
  const [sharedRows, setSharedRows] = useState<WorkRow[]>([]);
  const [person, setPerson] = useState("All");

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const root = findDashboardMain();
      if (!root) {
        setHost(null);
        return;
      }

      const nextProperty = currentPropertyId();
      setPropertyId((current) => current === nextProperty ? current : nextProperty);

      const addisonLane = findAddisonLane(root);
      let nextHost = root.querySelector<HTMLElement>("[data-atlas-upcoming-work-host]");
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasUpcomingWorkHost = "true";
        if (addisonLane?.parentElement) addisonLane.parentElement.insertBefore(nextHost, addisonLane);
        else {
          const todaySection = findTodayWorkSection(root);
          if (todaySection?.parentElement) todaySection.parentElement.insertBefore(nextHost, todaySection.nextSibling);
          else root.appendChild(nextHost);
        }
      }

      if (addisonLane && !addisonLane.contains(nextHost)) {
        addisonLane.dataset.atlasDashboardLegacyAddison = "true";
        addisonLane.style.setProperty("display", "none", "important");
      }
      setHost((current) => current === nextHost ? current : nextHost);
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
    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      document.querySelectorAll<HTMLElement>("[data-atlas-dashboard-legacy-addison]").forEach((node) => {
        node.style.removeProperty("display");
        delete node.dataset.atlasDashboardLegacyAddison;
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setWorkRows([]);
    setSharedRows([]);
    setPerson("All");

    const load = async () => {
      const [teamResponse, atlasResponse, sharedResponse] = await Promise.all([
        fetch("/api/atlas-team", { cache: "no-store", credentials: "include" }),
        fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/atlas-shared-list?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);
      if (cancelled) return;

      const team = await teamResponse.json().catch(() => ({}));
      const atlas = await atlasResponse.json().catch(() => ({}));
      const shared = await sharedResponse.json().catch(() => ({}));
      if (cancelled) return;

      const activeMembers = (Array.isArray(team?.members) ? team.members : [])
        .filter((member: TeamMember) => member?.active !== false)
        .filter((member: TeamMember) => !member.propertyIds?.length || member.propertyIds.includes(propertyId))
        .filter((member: TeamMember) => normalized(member.role) !== "master")
        .filter((member: TeamMember) => normalized(member.name) !== "nick" && !normalized(member.name).startsWith("nick "));
      setMembers(activeMembers);
      setWorkRows(Array.isArray(atlas?.serviceRecords) ? atlas.serviceRecords : Array.isArray(atlas?.workOrders) ? atlas.workOrders : []);
      setSharedRows(Array.isArray(shared?.items) ? shared.items : []);
    };

    void load().catch(() => {});
    const refresh = () => void load().catch(() => {});
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [propertyId]);

  const filterMembers = useMemo(() => {
    const unique = new Map<string, TeamMember>();
    for (const member of members) {
      if (!member?.id || !member?.name) continue;
      unique.set(member.id, member);
    }
    return [...unique.values()].sort((a, b) => {
      const rank = (name: string) => /^addison(?:\s|$)/i.test(name) ? 0 : /^sean(?:\s|$)/i.test(name) ? 1 : /^patrick(?:\s|$)|^pat(?:\s|$)/i.test(name) ? 2 : 3;
      const difference = rank(a.name) - rank(b.name);
      return difference || a.name.localeCompare(b.name);
    });
  }, [members]);

  const upcoming = useMemo(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const rows: UpcomingRow[] = [];

    for (const record of workRows) {
      if (!record || isComplete(record.status)) continue;
      const dueDate = workDueDate(record);
      if (!dueDate || dueDate <= todayKey) continue;
      rows.push({
        id: `work-${String(record.id || `${workTitle(record)}-${dueDate}`)}`,
        title: workTitle(record),
        assignee: workAssignee(record),
        dueDate,
        priority: priorityOf(record),
        source: "Work",
      });
    }

    for (const record of sharedRows) {
      if (!record || isComplete(record.status)) continue;
      const dueDate = dateKey(record.due_date || record.dueDate);
      if (!dueDate || dueDate <= todayKey) continue;
      rows.push({
        id: `list-${String(record.id || `${workTitle(record)}-${dueDate}`)}`,
        title: workTitle(record),
        assignee: String(record.assigned_to || record.assignedTo || "").trim(),
        dueDate,
        priority: priorityOf(record),
        source: "Team List",
      });
    }

    const deduped = new Map<string, UpcomingRow>();
    for (const row of rows) {
      const key = `${normalized(row.title)}|${row.dueDate}|${normalized(row.assignee)}`;
      const existing = deduped.get(key);
      if (!existing || existing.source === "Team List") deduped.set(key, row);
    }

    return [...deduped.values()]
      .filter((row) => person === "All" || memberMatches(person, row.assignee))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || priorityWeight(a.priority) - priorityWeight(b.priority) || a.title.localeCompare(b.title))
      .slice(0, 7);
  }, [workRows, sharedRows, person]);

  if (!host) return null;

  return createPortal(
    <section className="atlas-upcoming-work-card" aria-label="Upcoming Work">
      <div className="atlas-upcoming-work-head">
        <div>
          <strong>Upcoming Work</strong>
          <span>Next scheduled work after today</span>
        </div>
        <button type="button" onClick={openWorkPage}>View All Work</button>
      </div>

      <div className="atlas-upcoming-work-filters" aria-label="Filter upcoming work by employee">
        <button type="button" data-active={person === "All"} onClick={() => setPerson("All")}>All</button>
        {filterMembers.map((member) => (
          <button
            type="button"
            key={member.id}
            data-active={person === member.name}
            onClick={() => setPerson(member.name)}
          >
            {displayName(member.name)}
          </button>
        ))}
      </div>

      <div className="atlas-upcoming-work-list">
        {upcoming.length ? upcoming.map((row) => (
          <button type="button" className="atlas-upcoming-work-row" key={row.id} onClick={openWorkPage}>
            <span className="atlas-upcoming-work-copy">
              <strong>{row.title}</strong>
              <small>{row.assignee || "Unassigned"}</small>
            </span>
            <span className="atlas-upcoming-work-date">{formatDue(row.dueDate)}</span>
          </button>
        )) : (
          <div className="atlas-upcoming-work-empty">No upcoming scheduled work for this filter.</div>
        )}
      </div>

      <style jsx global>{`
        [data-atlas-upcoming-work-host] { min-width: 0; }
        .atlas-upcoming-work-card {
          background: #fff;
          border: 1px solid #dbe4ec;
          border-radius: 15px;
          padding: 13px;
          display: grid;
          gap: 10px;
          min-width: 0;
          box-shadow: none;
        }
        .atlas-upcoming-work-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .atlas-upcoming-work-head > div { display: grid; gap: 2px; min-width: 0; }
        .atlas-upcoming-work-head strong { color: #0b3153; font-size: 15px; }
        .atlas-upcoming-work-head span { color: #758492; font-size: 10px; font-weight: 700; }
        .atlas-upcoming-work-head button {
          border: 1px solid #d7e0e8;
          background: #f8fafc;
          color: #0b3153;
          border-radius: 8px;
          padding: 7px 9px;
          font: inherit;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }
        .atlas-upcoming-work-filters { display: flex; gap: 5px; overflow-x: auto; scrollbar-width: thin; padding-bottom: 1px; }
        .atlas-upcoming-work-filters button {
          border: 1px solid #dbe4ec;
          background: #fff;
          color: #516273;
          border-radius: 999px;
          padding: 5px 9px;
          font: inherit;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }
        .atlas-upcoming-work-filters button[data-active="true"] { background: #0b3153; border-color: #0b3153; color: #fff; }
        .atlas-upcoming-work-list { display: grid; border-top: 1px solid #edf1f4; }
        .atlas-upcoming-work-row {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #edf1f4;
          background: transparent;
          padding: 9px 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: left;
          font: inherit;
          cursor: pointer;
        }
        .atlas-upcoming-work-copy { display: grid; gap: 2px; min-width: 0; }
        .atlas-upcoming-work-copy strong { color: #1c2936; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .atlas-upcoming-work-copy small { color: #7a8895; font-size: 9px; font-weight: 750; }
        .atlas-upcoming-work-date { flex: 0 0 auto; color: #536577; font-size: 9px; font-weight: 850; }
        .atlas-upcoming-work-empty { color: #798896; font-size: 11px; font-weight: 700; padding: 13px 2px 5px; }
        @media (max-width: 720px) {
          .atlas-upcoming-work-card { padding: 11px; border-radius: 13px; }
          .atlas-upcoming-work-head span { display: none; }
          .atlas-upcoming-work-row { padding: 10px 1px; }
        }
      `}</style>
    </section>,
    host,
  );
}
