"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { colors } from "../lib/atlas-page-config";

type TeamMember = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  active?: boolean;
  propertyIds?: string[];
  accessProfiles?: string[];
  fieldOnly?: boolean;
};

type TeamTask = {
  id?: string;
  title?: string;
  assignee?: string;
  location?: string;
  status?: string;
  completedAt?: string;
};

type TeamList = {
  id?: string;
  name?: string;
  propertyIds?: string[];
  tasks?: TeamTask[];
};

type WorkHistoryItem = {
  id?: string;
  memberId?: string;
  employeeName?: string;
  propertyId?: string;
  taskTitle?: string;
  location?: string;
  completedAt?: string;
  listName?: string;
};

type TeamPayload = {
  ok?: boolean;
  members?: TeamMember[];
  workLists?: TeamList[];
  workHistory?: WorkHistoryItem[];
};

type AtlasWorkOrder = {
  id?: string;
  title?: string;
  name?: string;
  assignedTo?: string;
  assigned_to?: string;
  assignee?: string;
  status?: string;
  location?: string;
  locationName?: string;
  locationId?: string;
  completedAt?: string;
  completed_at?: string;
  updatedAt?: string;
  updated_at?: string;
  date?: string;
  item_date?: string;
  propertyId?: string;
  property_id?: string;
};

type AtlasPayload = {
  serviceRecords?: AtlasWorkOrder[];
  workOrders?: AtlasWorkOrder[];
};

type AddisonPayload = {
  ok?: boolean;
  addison?: {
    tasks?: Array<Record<string, unknown>>;
    history?: Array<Record<string, unknown>>;
  };
};

type PersonWorkRow = {
  id: string;
  title: string;
  location: string;
  source: string;
  completedAt?: string;
};

const ACCESS_LABELS: Record<string, string> = {
  marine: "Marine",
  landscaping: "Landscaping",
  house: "House",
  maintenance: "Maintenance",
  "pool-spa": "Pool & Spa",
  vehicles: "Garage / Vehicles",
  electrical: "Electrical",
  plumbing: "Plumbing",
  inventory: "Inventory",
};

const ADDISON_WORK_TOKEN =
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

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

function isHiddenAdmin(member: TeamMember) {
  const name = normalized(member.name);
  return (
    name === "steve" ||
    name.startsWith("steve ") ||
    name === "kenji" ||
    name.startsWith("kenji ")
  );
}

function memberMatchesAssignee(member: TeamMember, assignee: unknown) {
  const assigned = normalized(assignee);
  const full = normalized(member.name);
  const first = full.split(/\s+/)[0] || full;
  if (!assigned || !full) return false;
  if (assigned === full || assigned === first) return true;
  if (full.startsWith(`${assigned} `)) return true;
  if (assigned.startsWith(`${first} `)) return true;
  if (first === "pat" && assigned.includes("pat") && assigned.includes("crew")) {
    return true;
  }
  return false;
}

function isCompleted(status: unknown) {
  return ["completed", "closed", "cancelled"].includes(normalized(status));
}

function isCompletedHistory(status: unknown) {
  return ["completed", "closed"].includes(normalized(status));
}

function atlasAssignee(record: AtlasWorkOrder) {
  return record.assignedTo || record.assigned_to || record.assignee || "";
}

function atlasLocation(record: AtlasWorkOrder) {
  return record.locationName || record.location || record.locationId || "";
}

function atlasCompletedAt(record: AtlasWorkOrder) {
  return (
    record.completedAt ||
    record.completed_at ||
    record.updatedAt ||
    record.updated_at ||
    record.date ||
    record.item_date ||
    ""
  );
}

function atlasPropertyMatches(record: AtlasWorkOrder, propertyId: string) {
  const recordProperty = String(record.propertyId || record.property_id || "").trim();
  return !recordProperty || recordProperty === propertyId;
}

function dedupeWorkRows(rows: PersonWorkRow[]) {
  const seenIds = new Set<string>();
  const seenFallbacks = new Set<string>();
  return rows.filter((row) => {
    const cleanId = normalized(row.id);
    if (cleanId) {
      if (seenIds.has(cleanId)) return false;
      seenIds.add(cleanId);
    }

    const fallback = `${normalized(row.title)}|${normalized(row.location)}`;
    if (!fallback.replace("|", "")) return true;
    if (seenFallbacks.has(fallback)) return false;
    seenFallbacks.add(fallback);
    return true;
  });
}

function displayDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "Completed";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findPeopleWorkspace() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h2")).find(
    (node) => normalized(node.textContent) === "people & access",
  );
  if (!heading) return null;

  const root = heading.closest("section") as HTMLElement | null;
  if (!root) return null;

  let nativePeople = heading.parentElement as HTMLElement | null;
  while (nativePeople?.parentElement && nativePeople.parentElement !== root) {
    nativePeople = nativePeople.parentElement;
  }
  if (!nativePeople || nativePeople.parentElement !== root) return null;

  return { root, nativePeople };
}

function clickNativeTeamButton(label: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => normalized(candidate.textContent) === normalized(label),
  );
  button?.click();
}

export default function AtlasTeamPeoplePolish() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [nativePeople, setNativePeople] = useState<HTMLElement | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [payload, setPayload] = useState<TeamPayload | null>(null);
  const [atlasPayload, setAtlasPayload] = useState<AtlasPayload | null>(null);
  const [addisonPayload, setAddisonPayload] = useState<AddisonPayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("employee");
  const [newPersonProperties, setNewPersonProperties] = useState<string[]>(["2000"]);
  const [addPersonBusy, setAddPersonBusy] = useState(false);
  const [addPersonMessage, setAddPersonMessage] = useState("");

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      document
        .querySelectorAll<HTMLElement>(".atlas-team-native-people-hidden")
        .forEach((element) => element.classList.remove("atlas-team-native-people-hidden"));

      const found = findPeopleWorkspace();
      if (!found) {
        setPortalTarget(null);
        setNativePeople(null);
        return;
      }

      const nextProperty = currentPropertyId();
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));

      found.root.classList.add("atlas-team-people-polish-root");
      found.nativePeople.classList.add("atlas-team-native-people-hidden");
      setNativePeople(found.nativePeople);

      let host = found.root.querySelector<HTMLElement>(
        "[data-atlas-team-people-polish-host]",
      );
      if (!host) {
        host = document.createElement("div");
        host.dataset.atlasTeamPeoplePolishHost = "true";
        found.root.insertBefore(host, found.nativePeople);
      }
      setPortalTarget((current) => (current === host ? current : host));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
      document
        .querySelectorAll<HTMLElement>(".atlas-team-native-people-hidden")
        .forEach((element) => element.classList.remove("atlas-team-native-people-hidden"));
    };
  }, []);

  const loadTeam = async () => {
    try {
      const response = await fetch("/api/atlas-team", {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await response.json().catch(() => ({}))) as TeamPayload;
      if (response.ok && data?.ok !== false) setPayload(data);
    } catch {
      setPayload(null);
    }
  };

  const loadAtlasWork = async (nextPropertyId: string) => {
    try {
      const response = await fetch(
        `/api/atlas?propertyId=${encodeURIComponent(nextPropertyId)}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );
      const data = (await response.json().catch(() => ({}))) as AtlasPayload;
      if (response.ok) setAtlasPayload(data);
      else setAtlasPayload(null);
    } catch {
      setAtlasPayload(null);
    }
  };

  useEffect(() => {
    void loadTeam();
    const refresh = () => void loadTeam();
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => window.removeEventListener("atlas:data-changed", refresh as EventListener);
  }, []);

  useEffect(() => {
    setAtlasPayload(null);
    void loadAtlasWork(propertyId);
    const refresh = () => void loadAtlasWork(propertyId);
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => window.removeEventListener("atlas:data-changed", refresh as EventListener);
  }, [propertyId]);

  useEffect(() => {
    if (propertyId !== "2000") {
      setAddisonPayload(null);
      return;
    }

    let cancelled = false;
    void fetch(
      `/api/landscape-help?token=${encodeURIComponent(ADDISON_WORK_TOKEN)}`,
      { cache: "no-store" },
    )
      .then((response) => response.json())
      .then((data: AddisonPayload) => {
        if (!cancelled && data?.ok) setAddisonPayload(data);
      })
      .catch(() => {
        if (!cancelled) setAddisonPayload(null);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const atlasWorkOrders = useMemo(
    () => atlasPayload?.serviceRecords || atlasPayload?.workOrders || [],
    [atlasPayload],
  );

  const members = useMemo(() => {
    const query = normalized(search);
    return (payload?.members || [])
      .filter((member) => member.active !== false)
      .filter(
        (member) =>
          !member.propertyIds?.length || member.propertyIds.includes(propertyId),
      )
      .filter((member) => !query || normalized(member.name).includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payload, propertyId, search]);

  useEffect(() => {
    if (!members.length) {
      setSelectedId("");
      return;
    }
    if (!members.some((member) => member.id === selectedId)) {
      setSelectedId(members[0].id);
    }
  }, [members, selectedId]);

  const selected = members.find((member) => member.id === selectedId) || null;

  const openWorkForMember = (member: TeamMember) => {
    const atlasRows: PersonWorkRow[] = atlasWorkOrders
      .filter((record) => atlasPropertyMatches(record, propertyId))
      .filter((record) => memberMatchesAssignee(member, atlasAssignee(record)))
      .filter((record) => !isCompleted(record.status))
      .map((record) => ({
        id: `work-order-${String(record.id || `${record.title || record.name || "work"}-${record.date || record.item_date || ""}`)}`,
        title: String(record.title || record.name || "Untitled work order"),
        location: atlasLocation(record),
        source: "Work Order",
      }));

    const teamRows: PersonWorkRow[] = (payload?.workLists || [])
      .filter(
        (list) =>
          !list.propertyIds?.length || list.propertyIds.includes(propertyId),
      )
      .flatMap((list) =>
        (list.tasks || [])
          .filter((item) => memberMatchesAssignee(member, item.assignee))
          .filter((item) => !isCompleted(item.status))
          .map((item) => ({
            id: `team-${list.id || "list"}-${item.id || item.title || "task"}`,
            title: item.title || "Untitled task",
            location: item.location || "",
            source: list.name || "Assignment",
          })),
      );

    const addisonRows: PersonWorkRow[] =
      /^addison(?:\s|$)/i.test(member.name) && propertyId === "2000"
        ? (addisonPayload?.addison?.tasks || [])
            .filter(
              (item) =>
                !isCompleted(
                  (item.taskMeta as Record<string, unknown> | undefined)?.status ||
                    item.status,
                ),
            )
            .map((item) => ({
              id: `addison-${String(item.id || item.title || "task")}`,
              title: String(item.title || "Untitled task"),
              location: String(item.locationName || item.locationId || ""),
              source: "Addison Work",
            }))
        : [];

    return dedupeWorkRows([...atlasRows, ...teamRows, ...addisonRows]);
  };

  const selectedOpenWork = useMemo(
    () => (selected ? openWorkForMember(selected) : []),
    [selected, atlasWorkOrders, payload, propertyId, addisonPayload],
  );

  const selectedHistory = useMemo(() => {
    if (!selected) return [];
    const memberId = normalized(selected.id);
    const memberName = normalized(selected.name);

    const atlasCompleted: PersonWorkRow[] = atlasWorkOrders
      .filter((record) => atlasPropertyMatches(record, propertyId))
      .filter((record) => memberMatchesAssignee(selected, atlasAssignee(record)))
      .filter((record) => isCompletedHistory(record.status))
      .map((record) => ({
        id: `work-order-${String(record.id || `${record.title || record.name || "work"}-${atlasCompletedAt(record)}`)}`,
        title: String(record.title || record.name || "Completed work"),
        location: atlasLocation(record),
        source: "Work Order",
        completedAt: atlasCompletedAt(record),
      }));

    const shared: PersonWorkRow[] = (payload?.workHistory || [])
      .filter(
        (item) =>
          (!item.propertyId || item.propertyId === propertyId) &&
          (normalized(item.memberId) === memberId ||
            normalized(item.employeeName) === memberName),
      )
      .map((item) => ({
        id: `team-history-${String(item.id || `${item.taskTitle}-${item.completedAt}`)}`,
        title: item.taskTitle || "Completed work",
        location: item.location || "",
        source: item.listName || "Team Work",
        completedAt: item.completedAt || "",
      }));

    const addison: PersonWorkRow[] =
      /^addison(?:\s|$)/i.test(selected.name) && propertyId === "2000"
        ? (addisonPayload?.addison?.history || []).map((item) => ({
            id: `addison-history-${String(item.id || item.taskId || item.title || "item")}`,
            title: String(item.title || "Completed work"),
            location: String(item.locationName || item.locationId || ""),
            source: "Addison Work",
            completedAt: String(item.completedAt || item.date || ""),
          }))
        : [];

    return dedupeWorkRows([...atlasCompleted, ...shared, ...addison]).sort((a, b) =>
      String(b.completedAt || "").localeCompare(String(a.completedAt || "")),
    );
  }, [selected, atlasWorkOrders, payload, propertyId, addisonPayload]);

  const openCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      counts.set(member.id, openWorkForMember(member).length);
    }
    return counts;
  }, [members, atlasWorkOrders, payload, propertyId, addisonPayload]);

  const responsibilities = useMemo(
    () =>
      (selected?.accessProfiles || [])
        .map((profile) => ACCESS_LABELS[profile] || profile)
        .filter(Boolean),
    [selected],
  );

  const addPerson = async () => {
    const name = newPersonName.trim();
    const email = newPersonEmail.trim().toLowerCase();
    if (!name || !email) {
      setAddPersonMessage("Enter a name and email.");
      return;
    }
    if (addPersonBusy) return;

    const role = newPersonRole || "employee";
    const permissionsByRole: Record<string, Record<string, boolean>> = {
      administrator: { view: true, edit: true, approve: true, delete: true, manageUsers: true },
      manager: { view: true, edit: true, approve: true, delete: false, manageUsers: false },
      employee: { view: true, edit: true, approve: false, delete: false, manageUsers: false },
      vendor: { view: true, edit: false, approve: false, delete: false, manageUsers: false },
      viewer: { view: true, edit: false, approve: false, delete: false, manageUsers: false },
    };
    const member = {
      id: `team-${Date.now()}`,
      name,
      email,
      role,
      active: true,
      propertyIds: newPersonProperties.length ? newPersonProperties : [propertyId],
      permissions: permissionsByRole[role] || permissionsByRole.employee,
      accessProfiles: [],
    };

    setAddPersonBusy(true);
    setAddPersonMessage("Creating invitation…");
    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "invite", member }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || "Could not create invitation.");
      }
      setNewPersonName("");
      setNewPersonEmail("");
      setNewPersonRole("employee");
      setNewPersonProperties([propertyId]);
      setShowAddPerson(false);
      setAddPersonMessage("");
      await loadTeam();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setAddPersonMessage(error instanceof Error ? error.message : "Could not create invitation.");
    } finally {
      setAddPersonBusy(false);
    }
  };

  const assignWork = async () => {
    if (!selected) return;
    const title = window.prompt(`Add work for ${selected.name}`);
    if (!title?.trim()) return;

    const directId = `direct-assignments-${propertyId}`;
    const currentLists = Array.isArray(payload?.workLists) ? payload!.workLists! : [];
    const now = new Date().toISOString();
    const task = {
      id: `team-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      assignee: selected.name,
      location: "",
      notes: "",
      status: "Open",
      requirePhoto: false,
      createdAt: now,
    };

    const existing = currentLists.find((list) => String(list.id) === directId);
    const nextLists = existing
      ? currentLists.map((list) =>
          String(list.id) === directId
            ? { ...list, tasks: [...(Array.isArray(list.tasks) ? list.tasks : []), task] }
            : list,
        )
      : [
          {
            id: directId,
            name: "Direct Assignments",
            description: "One-off work assigned directly to team members.",
            defaultAssignee: selected.name,
            propertyIds: [propertyId],
            schedule: "As needed",
            active: true,
            tasks: [task],
          },
          ...currentLists,
        ];

    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "team-work-lists-save", workLists: nextLists }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.error || "Could not assign work.");
      setPayload((current) => current ? { ...current, workLists: nextLists } : current);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not assign work.");
    }
  };

  if (!portalTarget) return <TeamPeopleStyles />;

  return (
    <>
      <TeamPeopleStyles />
      {createPortal(
        <div className="atlas-team-people-shell">
          <aside className="atlas-team-people-list">
            <div className="atlas-team-people-list-head">
              <strong>People</strong>
              <button
                type="button"
                className="atlas-team-add-person-button"
                onClick={() => {
                  setShowAddPerson((open) => !open);
                  setNewPersonProperties([propertyId]);
                  setAddPersonMessage("");
                }}
              >
                + Add Person
              </button>
            </div>
            <input
              className="atlas-team-people-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team"
            />
            {showAddPerson ? (
              <div className="atlas-team-add-person-panel">
                <label>
                  <span>Name</span>
                  <input value={newPersonName} onChange={(event) => setNewPersonName(event.target.value)} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={newPersonEmail} onChange={(event) => setNewPersonEmail(event.target.value)} />
                </label>
                <label>
                  <span>Role</span>
                  <select value={newPersonRole} onChange={(event) => setNewPersonRole(event.target.value)}>
                    <option value="administrator">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="vendor">Vendor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </label>
                <div>
                  <span className="atlas-team-add-person-label">Properties</span>
                  <div className="atlas-team-property-checks">
                    {["2000", "6855", "3661", "hangar"].map((id) => (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={newPersonProperties.includes(id)}
                          onChange={(event) =>
                            setNewPersonProperties((current) => {
                              const next = event.target.checked
                                ? Array.from(new Set([...current, id]))
                                : current.filter((item) => item !== id);
                              return next.length ? next : current;
                            })
                          }
                        />
                        {id}
                      </label>
                    ))}
                  </div>
                </div>
                {addPersonMessage ? <div className="atlas-team-add-person-message">{addPersonMessage}</div> : null}
                <div className="atlas-team-add-person-actions">
                  <button type="button" onClick={() => setShowAddPerson(false)}>Cancel</button>
                  <button type="button" onClick={() => void addPerson()} disabled={addPersonBusy}>
                    {addPersonBusy ? "Sending…" : "Send Invite"}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="atlas-team-people-rows">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`atlas-team-person-row${selected?.id === member.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(member.id)}
                >
                  <span className="atlas-team-person-main">
                    <strong>{member.name}</strong>
                    <span>{member.fieldOnly ? "Field employee" : member.role || "Team member"}</span>
                  </span>
                  <span className="atlas-team-person-count">
                    <strong>{openCounts.get(member.id) || 0}</strong>
                    <small>open</small>
                  </span>
                </button>
              ))}
              {!members.length ? (
                <div className="atlas-team-people-empty">No team members found.</div>
              ) : null}
            </div>
          </aside>

          <div className="atlas-team-person-detail">
            {!selected ? (
              <div className="atlas-team-people-empty">Select a team member.</div>
            ) : (
              <>
                <div className="atlas-team-person-header">
                  <div>
                    <h2>{selected.name}</h2>
                    <div className="atlas-team-person-subtitle">
                      {selected.fieldOnly ? "Field employee" : selected.role || "Team member"}
                    </div>
                    {selected.email ? (
                      <a href={`mailto:${selected.email}`} className="atlas-team-person-email">
                        {selected.email}
                      </a>
                    ) : null}
                  </div>
                  <button type="button" className="atlas-team-assign-button" onClick={assignWork}>
                    + Assign Work
                  </button>
                </div>

                <section className="atlas-team-detail-section">
                  <div className="atlas-team-detail-heading">Responsibilities</div>
                  {responsibilities.length ? (
                    <div className="atlas-team-responsibility-chips">
                      {responsibilities.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="atlas-team-detail-muted">No operating areas assigned.</div>
                  )}
                </section>

                <section className="atlas-team-detail-section">
                  <div className="atlas-team-detail-heading-row">
                    <div className="atlas-team-detail-heading">Current Work</div>
                    <span>{selectedOpenWork.length} open</span>
                  </div>
                  {selectedOpenWork.length ? (
                    <div className="atlas-team-work-list">
                      {selectedOpenWork.slice(0, 20).map((item) => (
                        <div key={item.id} className="atlas-team-work-row">
                          <div>
                            <strong>{item.title}</strong>
                            <span>{[item.source, item.location].filter(Boolean).join(" · ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="atlas-team-detail-muted">No current assignments.</div>
                  )}
                </section>

                <section className="atlas-team-detail-section">
                  <div className="atlas-team-detail-heading">Recent Completed Work</div>
                  {selectedHistory.length ? (
                    <div className="atlas-team-work-list">
                      {selectedHistory.slice(0, 8).map((item) => (
                        <div key={item.id} className="atlas-team-work-row is-complete">
                          <div>
                            <strong>{item.title}</strong>
                            <span>{[item.source, item.location].filter(Boolean).join(" · ")}</span>
                          </div>
                          <time>{displayDate(item.completedAt)}</time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="atlas-team-detail-muted">No completed work recorded yet.</div>
                  )}
                </section>

                <details className="atlas-team-access-summary">
                  <summary>
                    <span>
                      <strong>Access</strong>
                      <small>Property access and permissions</small>
                    </span>
                    <span aria-hidden="true">⌄</span>
                  </summary>
                  <div className="atlas-team-access-content">
                    <label>
                      <span>Role</span>
                      <select
                        value={selected.role || "employee"}
                        disabled={normalized(selected.role) === "master"}
                        onChange={(event) => {
                          const role = event.target.value;
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  members: (current.members || []).map((member) =>
                                    member.id === selected.id ? { ...member, role } : member,
                                  ),
                                }
                              : current,
                          );
                        }}
                      >
                        <option value="administrator">Administrator</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                        <option value="vendor">Vendor</option>
                        <option value="viewer">Viewer</option>
                        {normalized(selected.role) === "master" ? <option value="master">Master</option> : null}
                      </select>
                    </label>
                    <div>
                      <span>Properties</span>
                      <div className="atlas-team-property-checks">
                        {["2000", "6855", "3661", "hangar"].map((id) => (
                          <label key={id}>
                            <input
                              type="checkbox"
                              checked={(selected.propertyIds || []).includes(id)}
                              disabled={normalized(selected.role) === "master"}
                              onChange={(event) => {
                                const currentIds = selected.propertyIds || [];
                                const propertyIds = event.target.checked
                                  ? Array.from(new Set([...currentIds, id]))
                                  : currentIds.filter((item) => item !== id);
                                if (!propertyIds.length) return;
                                setPayload((current) =>
                                  current
                                    ? {
                                        ...current,
                                        members: (current.members || []).map((member) =>
                                          member.id === selected.id ? { ...member, propertyIds } : member,
                                        ),
                                      }
                                    : current,
                                );
                              }}
                            />
                            {id}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span>Operating areas</span>
                      <strong>{responsibilities.length ? responsibilities.join(", ") : "None"}</strong>
                    </div>
                    <button
                      type="button"
                      className="atlas-team-save-access"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/atlas-team", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ members: payload?.members || [] }),
                          });
                          const data = await response.json().catch(() => ({}));
                          if (!response.ok || data?.ok === false) throw new Error(data?.error || "Could not save access.");
                          window.dispatchEvent(new CustomEvent("atlas:data-changed"));
                        } catch (error) {
                          window.alert(error instanceof Error ? error.message : "Could not save access.");
                        }
                      }}
                    >
                      Save Access
                    </button>
                  </div>
                </details>
              </>
            )}
          </div>
        </div>,
        portalTarget,
      )}
    </>
  );
}

function TeamPeopleStyles() {
  return (
    <style jsx global>{`
      .atlas-team-native-people-hidden {
        display: none !important;
      }

      [data-atlas-team-people-polish-host] {
        display: block;
        width: 100%;
        min-width: 0;
      }

      .atlas-team-people-shell {
        display: grid;
        grid-template-columns: minmax(250px, 330px) minmax(0, 1fr);
        gap: 14px;
        min-width: 0;
      }

      .atlas-team-people-list,
      .atlas-team-person-detail {
        min-width: 0;
        border: 1px solid ${colors.line};
        border-radius: 14px;
        background: ${colors.card};
        box-shadow: 0 8px 22px rgba(7, 27, 47, 0.05);
      }

      .atlas-team-people-list {
        overflow: hidden;
        align-self: start;
      }

      .atlas-team-people-list-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 10px 0;
      }

      .atlas-team-people-list-head strong {
        color: ${colors.text};
        font-size: 13px;
      }

      .atlas-team-add-person-button {
        min-height: 34px !important;
        padding: 6px 9px !important;
        border: 1px solid #1f6fd1 !important;
        border-radius: 8px !important;
        background: #1f6fd1 !important;
        color: #fff !important;
        font-size: 11px !important;
        font-weight: 800;
        cursor: pointer;
      }

      .atlas-team-add-person-panel {
        display: grid;
        gap: 8px;
        margin: 0 10px 10px;
        padding: 10px;
        border: 1px solid ${colors.line};
        border-radius: 10px;
        background: ${colors.panel};
      }

      .atlas-team-add-person-panel > label {
        display: grid;
        gap: 4px;
      }

      .atlas-team-add-person-panel span,
      .atlas-team-add-person-label {
        color: ${colors.muted};
        font-size: 10px;
        font-weight: 800;
      }

      .atlas-team-add-person-panel input,
      .atlas-team-add-person-panel select {
        width: 100%;
        min-height: 36px;
        border: 1px solid ${colors.line};
        border-radius: 8px;
        background: #fff;
        padding: 6px 8px;
      }

      .atlas-team-add-person-message {
        color: ${colors.text};
        font-size: 11px;
        font-weight: 700;
      }

      .atlas-team-add-person-actions {
        display: flex;
        justify-content: flex-end;
        gap: 7px;
      }

      .atlas-team-add-person-actions button {
        min-height: 34px !important;
        padding: 6px 9px !important;
        border: 1px solid ${colors.line} !important;
        border-radius: 8px !important;
        background: #fff !important;
        color: ${colors.text} !important;
        font-size: 11px !important;
        font-weight: 800;
      }

      .atlas-team-add-person-actions button:last-child {
        border-color: #1f6fd1 !important;
        background: #1f6fd1 !important;
        color: #fff !important;
      }

      .atlas-team-people-search {
        width: calc(100% - 20px);
        margin: 10px;
        min-height: 38px;
        padding: 8px 10px;
        border: 1px solid ${colors.line};
        border-radius: 9px;
        background: #fff;
        color: ${colors.text};
      }

      .atlas-team-people-rows {
        display: grid;
      }

      .atlas-team-person-row {
        width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        padding: 13px 14px;
        border: 0 !important;
        border-top: 1px solid ${colors.line} !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: ${colors.text} !important;
        text-align: left;
        box-shadow: none !important;
      }

      .atlas-team-person-row.is-selected {
        background: #eef6ff !important;
        box-shadow: inset 3px 0 0 #1f6fd1 !important;
      }

      .atlas-team-person-main {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .atlas-team-person-main strong {
        font-size: 14px !important;
      }

      .atlas-team-person-main span {
        color: ${colors.muted};
        font-size: 12px;
      }

      .atlas-team-person-count {
        display: grid;
        justify-items: center;
        min-width: 38px;
      }

      .atlas-team-person-count strong {
        font-size: 18px !important;
        line-height: 1 !important;
      }

      .atlas-team-person-count small {
        color: ${colors.muted};
        font-size: 10px !important;
      }

      .atlas-team-person-detail {
        padding: 16px;
        display: grid;
        gap: 12px;
      }

      .atlas-team-person-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding-bottom: 13px;
        border-bottom: 1px solid ${colors.line};
      }

      .atlas-team-person-header h2 {
        margin: 0 !important;
        font-size: 22px !important;
      }

      .atlas-team-person-subtitle {
        margin-top: 3px;
        color: ${colors.muted};
        font-size: 12px;
      }

      .atlas-team-person-email {
        display: inline-block;
        margin-top: 5px;
        color: #1f6fd1;
        font-size: 12px;
        text-decoration: none;
      }

      .atlas-team-assign-button {
        min-height: 36px !important;
        padding: 8px 12px !important;
        border: 1px solid #1f6fd1 !important;
        border-radius: 9px !important;
        background: #1f6fd1 !important;
        color: #fff !important;
        white-space: nowrap;
      }

      .atlas-team-detail-section {
        padding: 13px;
        border: 1px solid ${colors.line};
        border-radius: 11px;
        background: #fff;
      }

      .atlas-team-detail-heading,
      .atlas-team-detail-heading-row {
        color: ${colors.text};
        font-size: 13px;
        font-weight: 700;
      }

      .atlas-team-detail-heading-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .atlas-team-detail-heading-row > span {
        color: ${colors.muted};
        font-size: 11px;
        font-weight: 600;
      }

      .atlas-team-responsibility-chips {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        margin-top: 9px;
      }

      .atlas-team-responsibility-chips span {
        padding: 6px 9px;
        border-radius: 8px;
        background: #edf5ff;
        color: #175fae;
        font-size: 11px;
        font-weight: 650;
      }

      .atlas-team-detail-muted {
        margin-top: 8px;
        color: ${colors.muted};
        font-size: 12px;
      }

      .atlas-team-work-list {
        display: grid;
        margin-top: 8px;
        border-top: 1px solid #edf1f5;
      }

      .atlas-team-work-row {
        min-width: 0;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        padding: 9px 2px;
        border-bottom: 1px solid #edf1f5;
      }

      .atlas-team-work-row:last-child {
        border-bottom: 0;
      }

      .atlas-team-work-row > div {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .atlas-team-work-row strong {
        color: ${colors.text};
        font-size: 12.5px !important;
      }

      .atlas-team-work-row span,
      .atlas-team-work-row time {
        color: ${colors.muted};
        font-size: 11px;
      }

      .atlas-team-work-row.is-complete strong::before {
        content: "✓";
        display: inline-block;
        margin-right: 7px;
        color: #138a55;
      }

      .atlas-team-access-summary {
        border: 1px solid ${colors.line};
        border-radius: 11px;
        background: #fff;
        overflow: hidden;
      }

      .atlas-team-access-summary summary {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        padding: 12px 13px;
        cursor: pointer;
        list-style: none;
      }

      .atlas-team-access-summary summary::-webkit-details-marker {
        display: none;
      }

      .atlas-team-access-summary summary > span:first-child {
        display: grid;
        gap: 2px;
      }

      .atlas-team-access-summary summary strong {
        font-size: 13px !important;
      }

      .atlas-team-access-summary summary small {
        color: ${colors.muted};
        font-size: 11px !important;
      }

      .atlas-team-access-content {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 0 13px 13px;
      }
      .atlas-team-access-content select {
        width: 100%;
        min-height: 36px;
        border: 1px solid ${colors.line};
        border-radius: 8px;
        background: #fff;
        padding: 6px 8px;
      }

      .atlas-team-property-checks {
        display: flex;
        flex-wrap: wrap;
        gap: 7px 12px;
        margin-top: 5px;
      }

      .atlas-team-property-checks label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
      }

      .atlas-team-save-access {
        min-height: 36px !important;
        border: 1px solid #1f6fd1 !important;
        border-radius: 9px !important;
        background: #1f6fd1 !important;
        color: #fff !important;
        padding: 7px 11px !important;
        font-weight: 800;
        cursor: pointer;
      }


      .atlas-team-access-content > div {
        display: grid;
        gap: 3px;
        padding: 9px;
        border-radius: 8px;
        background: ${colors.panel};
      }

      .atlas-team-access-content span {
        color: ${colors.muted};
        font-size: 10px;
      }

      .atlas-team-access-content strong {
        font-size: 11.5px !important;
        overflow-wrap: anywhere;
      }

      .atlas-team-people-empty {
        padding: 18px;
        color: ${colors.muted};
        font-size: 12px;
        text-align: center;
      }

      @media (max-width: 900px) {
        .atlas-team-people-shell {
          grid-template-columns: 1fr;
        }

        .atlas-team-people-list {
          max-height: 260px;
          overflow-y: auto;
        }

        .atlas-team-person-header {
          flex-direction: column;
        }

        .atlas-team-assign-button {
          align-self: flex-start;
        }

        .atlas-team-access-content {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
