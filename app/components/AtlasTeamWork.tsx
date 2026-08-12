"use client";

import React, { useEffect, useMemo, useState } from "react";
import { colors } from "../lib/atlas-page-config";

type TeamTaskStatus = "Open" | "In Progress" | "Waiting" | "Completed";

type TeamTask = {
  id: string;
  title: string;
  assignee: string;
  location: string;
  notes: string;
  status: TeamTaskStatus;
  requirePhoto: boolean;
};

type TeamList = {
  id: string;
  name: string;
  description: string;
  defaultAssignee: string;
  propertyIds: string[];
  schedule: string;
  active: boolean;
  tasks: TeamTask[];
};

type TeamRole = "Master" | "Administrator" | "Manager" | "Employee" | "Vendor" | "Viewer";
type TeamPermissions = { view:boolean; edit:boolean; approve:boolean; delete:boolean; manageUsers:boolean };
type TeamMember = { id:string; name:string; email:string; role:TeamRole; active:boolean; propertyIds:string[]; permissions:TeamPermissions; accessProfiles:string[]; inviteStatus?:string };

const ROLE_DEFAULTS: Record<TeamRole, TeamPermissions> = {
  Master:{view:true,edit:true,approve:true,delete:true,manageUsers:true},
  Administrator:{view:true,edit:true,approve:true,delete:true,manageUsers:true},
  Manager:{view:true,edit:true,approve:true,delete:false,manageUsers:false},
  Employee:{view:true,edit:true,approve:false,delete:false,manageUsers:false},
  Vendor:{view:true,edit:false,approve:false,delete:false,manageUsers:false},
  Viewer:{view:true,edit:false,approve:false,delete:false,manageUsers:false},
};
const ACCESS_PROFILES = [
  ["marine","Marine"],["landscaping","Landscaping"],["house","House"],["maintenance","Maintenance"],
  ["pool-spa","Pool & Spa"],["vehicles","Vehicles"],["electrical","Electrical"],["plumbing","Plumbing"],["inventory","Inventory"],
] as const;

type Props = {
  activePropertyId: string;
};

type AddisonWorkData = {
  today: string;
  tasks: Array<Record<string, any>>;
  routine: {
    date: string;
    name: string;
    tasks: Array<Record<string, any>>;
  };
};

const ADDISON_WORK_TOKEN =
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

function addisonTaskMeta(task: Record<string, any>) {
  return task?.taskMeta && typeof task.taskMeta === "object"
    ? task.taskMeta
    : task;
}

const PEOPLE = ["Addison", "Pat's Crew", "Sean", "Nick", "Unassigned"];
const PROPERTY_IDS = ["2000", "3661", "6855", "hangar"];
const STORAGE_KEY = "atlas-team-work-v2";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function task(
  title: string,
  assignee: string,
  location = "",
  notes = "",
): TeamTask {
  return {
    id: uid("team-task"),
    title,
    assignee,
    location,
    notes,
    status: "Open",
    requirePhoto: false,
  };
}

function starterLists(): TeamList[] {
  return [
    {
      id: "addison-daily-routine",
      name: "Addison Daily Routine",
      description:
        "Daily appearance, cleanup, watering, inspections, and reporting.",
      defaultAssignee: "Addison",
      propertyIds: ["2000"],
      schedule: "Monday-Friday",
      active: true,
      tasks: [
        task("Walk the property and report anything unusual", "Addison"),
        task(
          "Clean the dog turf and trampoline area",
          "Addison",
          "Trampoline / Dog",
        ),
        task("Pick up litter, branches, and visible debris", "Addison"),
        task("Check packages and garage garbage", "Addison", "Garages"),
        task("Check and refill fountains as needed", "Addison", "Courtyard"),
        task("Water pots and obvious dry spots", "Addison"),
        task("Sweep courtyard, patios, and main walkways", "Addison"),
        task("Walk the dock and remove goose debris", "Addison", "Dock"),
        task("Put tools away and report unfinished work", "Addison"),
      ],
    },
    {
      id: "pat-tuesday-landscaping",
      name: "Tuesday Landscaping Crew",
      description:
        "Pat's two-person crew completes priority areas section-by-section every Tuesday.",
      defaultAssignee: "Pat's Crew",
      propertyIds: ["2000"],
      schedule: "Every Tuesday",
      active: true,
      tasks: [
        task(
          "Complete waterside beds and lake-facing areas",
          "Pat's Crew",
          "Waterside Lawn",
        ),
        task(
          "Complete main patio and Addition beds",
          "Pat's Crew",
          "Addition",
        ),
        task("Complete courtyard beds", "Pat's Crew", "Courtyard"),
        task(
          "Complete driveway and entrance beds",
          "Pat's Crew",
          "Driveway",
        ),
        task(
          "Complete dock approach and shoreline edges",
          "Pat's Crew",
          "Dock",
        ),
        task(
          "Complete East Lawn, Sport Court, and garage beds",
          "Pat's Crew",
          "East Lawn",
        ),
        task(
          "Remove debris and report spraying, pruning, or irrigation needs",
          "Pat's Crew",
        ),
      ],
    },
    {
      id: "sean-marine-service",
      name: "Sean Boat Detailing & Marine Requests",
      description:
        "Boat detailing and marine-service assignments, with 3661 as the primary property.",
      defaultAssignee: "Sean",
      propertyIds: ["3661", "2000", "6855"],
      schedule: "As requested",
      active: true,
      tasks: [
        task("Review new boat service requests", "Sean"),
        task("Confirm property, watercraft, and requested service", "Sean"),
        task("Take before photos when needed", "Sean"),
        task("Complete scheduled wash, detail, wax, or interior work", "Sean"),
        task("Upload after photos and service notes", "Sean"),
        task(
          "Report repairs, damage, supplies, or recommended maintenance",
          "Sean",
        ),
        task("Mark request completed", "Sean"),
      ],
    },
  ];
}

export default function AtlasTeamWork({ activePropertyId }: Props) {
  const [lists, setLists] = useState<TeamList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [search, setSearch] = useState("");
  const [teamView, setTeamView] = useState<"people" | "addison">("people");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberMessage, setMemberMessage] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamRole>("Employee");
  const [addisonWork, setAddisonWork] = useState<AddisonWorkData | null>(null);
  const [addisonLoading, setAddisonLoading] = useState(false);
  const [addisonMessage, setAddisonMessage] = useState("");
  const [newAddisonTask, setNewAddisonTask] = useState("");
  const [newAddisonDueDate, setNewAddisonDueDate] = useState("");
  const [editingAddisonTaskId, setEditingAddisonTaskId] = useState("");
  const [editingAddisonTitle, setEditingAddisonTitle] = useState("");
  const [editingAddisonDueDate, setEditingAddisonDueDate] = useState("");
  const [addisonFilter, setAddisonFilter] = useState<"active" | "completed" | "all">("active");

  useEffect(() => {
    void fetch("/api/atlas-team")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok || !Array.isArray(payload.members)) return;
        setMembers(payload.members.map((member: any) => ({
          ...member,
          role: member.role === "master" ? "Master" : member.role === "administrator" ? "Administrator" : member.role === "manager" ? "Manager" : member.role === "employee" || member.role === "operations" ? "Employee" : member.role === "vendor" ? "Vendor" : "Viewer",
          propertyIds: Array.isArray(member.propertyIds) ? member.propertyIds : ["2000"],
          permissions: { ...ROLE_DEFAULTS.Viewer, ...(member.permissions || {}) },
          accessProfiles: Array.isArray(member.accessProfiles) ? member.accessProfiles.map(String) : [],
        })));
      })
      .catch(() => setMemberMessage("Atlas could not load team users."));
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as TeamList[]) : null;
      const next =
        Array.isArray(parsed) && parsed.length ? parsed : starterLists();
      setLists(next);
      setSelectedListId(next[0]?.id || "");
    } catch {
      const next = starterLists();
      setLists(next);
      setSelectedListId(next[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    if (!lists.length) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      // Keep the page usable if browser storage is unavailable.
    }
  }, [lists]);

  const visibleLists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return lists.filter((list) => {
      const matchesProperty = list.propertyIds.includes(activePropertyId);
      const matchesSearch =
        !query ||
        [
          list.name,
          list.description,
          list.defaultAssignee,
          list.schedule,
          ...list.tasks.flatMap((item) => [
            item.title,
            item.assignee,
            item.location,
            item.notes,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesProperty && matchesSearch;
    });
  }, [activePropertyId, lists, search]);

  useEffect(() => {
    if (
      visibleLists.length &&
      !visibleLists.some((list) => list.id === selectedListId)
    ) {
      setSelectedListId(visibleLists[0].id);
    }
  }, [selectedListId, visibleLists]);

  const selected =
    lists.find((list) => list.id === selectedListId) || visibleLists[0];

  const propertyTasks = lists
    .filter((list) => list.propertyIds.includes(activePropertyId))
    .flatMap((list) => list.tasks);

  function updateList(id: string, patch: Partial<TeamList>) {
    setLists((current) =>
      current.map((list) => (list.id === id ? { ...list, ...patch } : list)),
    );
  }

  function updateTask(
    listId: string,
    taskId: string,
    patch: Partial<TeamTask>,
  ) {
    setLists((current) =>
      current.map((list) =>
        list.id !== listId
          ? list
          : {
              ...list,
              tasks: list.tasks.map((item) =>
                item.id === taskId ? { ...item, ...patch } : item,
              ),
            },
      ),
    );
  }

  function createList() {
    const next: TeamList = {
      id: uid("team-list"),
      name: "New Team List",
      description: "",
      defaultAssignee: "Unassigned",
      propertyIds: [activePropertyId],
      schedule: "As needed",
      active: true,
      tasks: [],
    };

    setLists((current) => [next, ...current]);
    setSelectedListId(next.id);
  }

  function duplicateList() {
    if (!selected) return;

    const copy: TeamList = {
      ...selected,
      id: uid("team-list"),
      name: `${selected.name} Copy`,
      tasks: selected.tasks.map((item) => ({
        ...item,
        id: uid("team-task"),
        status: "Open",
      })),
    };

    setLists((current) => [copy, ...current]);
    setSelectedListId(copy.id);
  }

  function deleteList() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}"?`)) return;

    setLists((current) =>
      current.filter((list) => list.id !== selected.id),
    );
    setSelectedListId("");
  }

  function addTask() {
    if (!selected) return;

    updateList(selected.id, {
      tasks: [
        ...selected.tasks,
        task("New task", selected.defaultAssignee || "Unassigned"),
      ],
    });
  }

  function deleteTask(taskId: string) {
    if (!selected) return;

    updateList(selected.id, {
      tasks: selected.tasks.filter((item) => item.id !== taskId),
    });
  }

  function moveTask(index: number, direction: -1 | 1) {
    if (!selected) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selected.tasks.length) return;

    const next = [...selected.tasks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    updateList(selected.id, { tasks: next });
  }

  function toggleProperty(propertyId: string) {
    if (!selected) return;

    const exists = selected.propertyIds.includes(propertyId);
    const next = exists
      ? selected.propertyIds.filter((id) => id !== propertyId)
      : [...selected.propertyIds, propertyId];

    if (next.length) updateList(selected.id, { propertyIds: next });
  }

  function updateMember(id: string, patch: Partial<TeamMember>) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
    setMemberMessage("");
  }

  async function saveMembers() {
    setMemberMessage("Saving users…");
    try {
      const response = await fetch("/api/atlas-team", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ members }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Could not save users.");
      setMemberMessage("Users and access saved.");
    } catch (error) {
      setMemberMessage(error instanceof Error ? error.message : "Could not save users.");
    }
  }

  async function inviteMember() {
    const name = newMemberName.trim();
    const email = newMemberEmail.trim().toLowerCase();
    if (!name || !email) { setMemberMessage("Enter a name and email."); return; }
    const member: TeamMember = {
      id: `team-${Date.now()}`, name, email, role:newMemberRole, active:true, propertyIds:[activePropertyId],
      permissions:{...ROLE_DEFAULTS[newMemberRole]}, accessProfiles:[], inviteStatus:"Invited",
    };
    setMemberMessage("Creating invitation…");
    try {
      const response = await fetch("/api/atlas-team", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"invite", member }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Could not create invitation.");
      setMembers((current) => [...current, member]);
      setNewMemberName(""); setNewMemberEmail("");
      setMemberMessage(payload.invitePath ? `Invite created: ${payload.invitePath}` : "Invite created.");
    } catch (error) { setMemberMessage(error instanceof Error ? error.message : "Could not create invitation."); }
  }

  async function loadAddisonWork(silent = false) {
    if (activePropertyId !== "2000") {
      setAddisonWork(null);
      return;
    }
    if (!silent) setAddisonLoading(true);
    try {
      const response = await fetch(
        `/api/landscape-help?token=${encodeURIComponent(ADDISON_WORK_TOKEN)}&ts=${Date.now()}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || payload?.mode !== "addison") {
        throw new Error(payload?.error || "Could not load Addison work.");
      }
      setAddisonWork(payload.addison || null);
      if (!silent) setAddisonMessage("");
    } catch (error) {
      if (!silent) {
        setAddisonMessage(
          error instanceof Error ? error.message : "Could not load Addison work.",
        );
      }
    } finally {
      if (!silent) setAddisonLoading(false);
    }
  }

  useEffect(() => {
    if (teamView !== "addison" || activePropertyId !== "2000") return;
    void loadAddisonWork();
    const timer = window.setInterval(() => {
      void loadAddisonWork(true);
    }, 5000);
    const onFocus = () => void loadAddisonWork(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [teamView, activePropertyId]);

  async function patchAddison(
    action: string,
    payload: Record<string, unknown>,
    successMessage = "Saved.",
  ) {
    setAddisonMessage("Saving…");
    try {
      const response = await fetch(
        `/api/landscape-help?token=${encodeURIComponent(ADDISON_WORK_TOKEN)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: ADDISON_WORK_TOKEN,
            action,
            ...payload,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Could not save Addison work.");
      }
      if (data?.mode === "addison" && data?.addison) {
        setAddisonWork(data.addison);
      } else {
        await loadAddisonWork(true);
      }
      setAddisonMessage(successMessage);
    } catch (error) {
      setAddisonMessage(
        error instanceof Error ? error.message : "Could not save Addison work.",
      );
    }
  }

  async function createAddisonTask() {
    const title = newAddisonTask.trim();
    if (!title) return;
    await patchAddison(
      "task-create",
      {
        title,
        dueDate:
          newAddisonDueDate ||
          addisonWork?.today ||
          new Date().toISOString().slice(0, 10),
      },
      "Task added for Addison.",
    );
    setNewAddisonTask("");
    setNewAddisonDueDate("");
  }

  function beginEditAddisonTask(task: Record<string, any>) {
    const meta = addisonTaskMeta(task);
    setEditingAddisonTaskId(String(task.id || ""));
    setEditingAddisonTitle(String(task.title || ""));
    setEditingAddisonDueDate(String(meta?.dueDate || "").slice(0, 10));
  }

  async function saveAddisonTaskEdit() {
    if (!editingAddisonTaskId || !editingAddisonTitle.trim()) return;
    await patchAddison(
      "task-update",
      {
        taskId: editingAddisonTaskId,
        title: editingAddisonTitle.trim(),
        dueDate: editingAddisonDueDate,
      },
      "Addison task updated.",
    );
    setEditingAddisonTaskId("");
  }

  async function deleteAddisonTask(taskId: string) {
    if (!window.confirm("Delete this Addison task?")) return;
    await patchAddison(
      "task-delete",
      { taskId },
      "Addison task deleted.",
    );
  }


  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>TEAM OPERATIONS</div>
          <h1 style={titleStyle}>Team</h1>
          <p style={heroCopyStyle}>
            Manage people, helpers, assignments, roles, and property access for {activePropertyId}.
          </p>
        </div>

        
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {([['people','Users & Roles'],['addison','Addison']] as const).map(([value,label]) => (
          <button key={value} type="button" onClick={() => setTeamView(value)} style={{...lightButtonStyle, background:teamView===value?colors.navy3:colors.card, color:teamView===value?'#fff':colors.text, borderColor:teamView===value?colors.navy3:colors.line}}>{label}</button>
        ))}
      </div>

      {teamView === "addison" ? (
        <div style={{ display: "grid", gap: 14 }}>
          {activePropertyId !== "2000" ? (
            <div style={emptyStyle}>Addison is currently assigned to property 2000.</div>
          ) : (
            <>
              <div style={summaryGridStyle}>
                <Stat
                  label="Open Tasks"
                  value={(addisonWork?.tasks || []).filter((task) => addisonTaskMeta(task).status !== "Completed").length}
                />
                <Stat
                  label="Completed"
                  value={(addisonWork?.tasks || []).filter((task) => addisonTaskMeta(task).status === "Completed").length}
                />
                <Stat
                  label="Routine"
                  value={`${(addisonWork?.routine?.tasks || []).filter((task) => Boolean(task.completed) || task.status === "completed").length}/${addisonWork?.routine?.tasks?.length || 0}`}
                />
                <Stat
                  label="Last Sync"
                  value={addisonLoading ? "Loading" : addisonWork ? "Live" : "—"}
                />
              </div>

              <div style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={eyebrowStyle}>ADDISON WORK</div>
                    <h2 style={{ margin: "3px 0", color: colors.text }}>Tasks</h2>
                    <div style={mutedStyle}>This is the same live list Addison sees on his phone.</div>
                  </div>
                  <button type="button" style={lightButtonStyle} onClick={() => void loadAddisonWork()}>
                    Refresh
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 160px auto", gap: 8, marginTop: 14 }}>
                  <input
                    value={newAddisonTask}
                    onChange={(event) => setNewAddisonTask(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void createAddisonTask();
                      }
                    }}
                    placeholder="Add a task for Addison"
                    style={fieldStyle}
                  />
                  <input
                    type="date"
                    value={newAddisonDueDate}
                    onChange={(event) => setNewAddisonDueDate(event.target.value)}
                    style={fieldStyle}
                  />
                  <button type="button" style={goldButtonStyle} onClick={() => void createAddisonTask()}>
                    Add
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {(["active","completed","all"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAddisonFilter(value)}
                      style={{
                        ...lightButtonStyle,
                        background: addisonFilter === value ? colors.navy3 : colors.card,
                        color: addisonFilter === value ? "#fff" : colors.text,
                      }}
                    >
                      {value === "active" ? "Active" : value === "completed" ? "Completed" : "All"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                  {(addisonWork?.tasks || [])
                    .filter((task) => {
                      const done = addisonTaskMeta(task).status === "Completed";
                      if (addisonFilter === "active") return !done;
                      if (addisonFilter === "completed") return done;
                      return true;
                    })
                    .map((task) => {
                      const meta = addisonTaskMeta(task);
                      const done = meta.status === "Completed";
                      const editing = editingAddisonTaskId === String(task.id);
                      return (
                        <div key={String(task.id)} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 11, background: colors.card }}>
                          {editing ? (
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 160px auto auto", gap: 7 }}>
                              <input value={editingAddisonTitle} onChange={(event) => setEditingAddisonTitle(event.target.value)} style={fieldStyle} />
                              <input type="date" value={editingAddisonDueDate} onChange={(event) => setEditingAddisonDueDate(event.target.value)} style={fieldStyle} />
                              <button type="button" style={goldButtonStyle} onClick={() => void saveAddisonTaskEdit()}>Save</button>
                              <button type="button" style={lightButtonStyle} onClick={() => setEditingAddisonTaskId("")}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => void patchAddison("task-status", { taskId: task.id, status: done ? "Open" : "Completed" })}
                                style={{ width: 19, height: 19, marginTop: 2 }}
                              />
                              <div>
                                <strong style={{ display: "block", color: colors.text, textDecoration: done ? "line-through" : "none", opacity: done ? .55 : 1 }}>
                                  {String(task.title || "Task")}
                                </strong>
                                <span style={mutedStyle}>
                                  {meta.dueDate ? `Due ${String(meta.dueDate).slice(0,10)}` : "No due date"}
                                  {meta.addisonNote ? ` · Addison: ${meta.addisonNote}` : ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button type="button" style={lightButtonStyle} onClick={() => beginEditAddisonTask(task)}>Edit</button>
                                <button type="button" style={{ ...lightButtonStyle, color: colors.red }} onClick={() => void deleteAddisonTask(String(task.id))}>Delete</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {!addisonLoading && !(addisonWork?.tasks || []).length ? (
                    <div style={emptyStyle}>No tasks are assigned to Addison.</div>
                  ) : null}
                </div>
              </div>

              <div style={panelStyle}>
                <div>
                  <div style={eyebrowStyle}>TODAY'S ROUTINE</div>
                  <h2 style={{ margin: "3px 0", color: colors.text }}>{addisonWork?.routine?.name || "Addison Routine"}</h2>
                  <div style={mutedStyle}>Live completion from the same routine Addison sees on his phone.</div>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {(addisonWork?.routine?.tasks || []).map((item) => {
                    const checked = Boolean(item.completed) || item.status === "completed";
                    return (
                      <label key={String(item.id)} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => void patchAddison("routine-toggle", { taskId: item.id })}
                          style={{ width: 19, height: 19 }}
                        />
                        <span style={{ fontWeight: 800, textDecoration: checked ? "line-through" : "none", opacity: checked ? .55 : 1 }}>
                          {String(item.title || "Routine item")}
                        </span>
                      </label>
                    );
                  })}
                  {!addisonLoading && !(addisonWork?.routine?.tasks || []).length ? (
                    <div style={emptyStyle}>No routine items are assigned to Addison today.</div>
                  ) : null}
                </div>
              </div>

              {addisonMessage ? <div style={{ ...panelStyle, padding: 10 }}>{addisonMessage}</div> : null}
            </>
          )}
        </div>
      ) : null}

      {teamView === "people" ? (
        <div style={{ display:"grid", gap:14 }}>
          <div style={summaryGridStyle}>
            <Stat label="Users" value={members.length} />
            <Stat label="Active" value={members.filter((member) => member.active).length} />
            <Stat label="Admins" value={members.filter((member) => member.role === "Master" || member.role === "Administrator").length} />
            <Stat label="Property Users" value={members.filter((member) => member.propertyIds.includes(activePropertyId)).length} />
          </div>

          <div style={panelStyle}>
            <div style={editorHeaderStyle}>
              <div><h2 style={{margin:0,color:colors.text}}>People & Access</h2><p style={{...mutedStyle,margin:"4px 0 0"}}>Users, helpers, roles, permissions, properties, and operating areas.</p></div>
              <button type="button" style={goldButtonStyle} onClick={saveMembers}>Save Access</button>
            </div>
            {memberMessage ? <div style={{marginTop:10,padding:"9px 11px",border:`1px solid ${colors.line}`,borderRadius:10,color:colors.text,background:colors.panel,fontWeight:800,fontSize:12}}>{memberMessage}</div> : null}

            <div style={{display:"grid",gap:10,marginTop:14}}>
              {members.map((member) => (
                <div key={member.id} style={{border:`1px solid ${colors.line}`,borderRadius:14,padding:13,background:colors.card}}>
                  <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1.2fr) minmax(190px,1.4fr) minmax(140px,.7fr) auto",gap:8,alignItems:"center"}}>
                    <input value={member.name} onChange={(e)=>updateMember(member.id,{name:e.target.value})} style={{...fieldStyle,fontWeight:900}} />
                    <input value={member.email} onChange={(e)=>updateMember(member.id,{email:e.target.value})} style={fieldStyle} />
                    <select value={member.role} onChange={(e)=>{const role=e.target.value as TeamRole;updateMember(member.id,{role,permissions:{...ROLE_DEFAULTS[role]}})}} style={fieldStyle}>
                      {Object.keys(ROLE_DEFAULTS).map((role)=><option key={role}>{role}</option>)}
                    </select>
                    <label style={{display:"flex",alignItems:"center",gap:6,fontWeight:800,fontSize:12}}><input type="checkbox" checked={member.active} onChange={(e)=>updateMember(member.id,{active:e.target.checked})}/> Active</label>
                  </div>
                  <div style={{marginTop:10,display:"grid",gap:8}}>
                    <div><div style={labelStyle}>Properties</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PROPERTY_IDS.map((propertyId)=>{const on=member.propertyIds.includes(propertyId);return <button key={propertyId} type="button" onClick={()=>updateMember(member.id,{propertyIds:on?member.propertyIds.filter((id)=>id!==propertyId):[...member.propertyIds,propertyId]})} style={{...propertyChipStyle,background:on?colors.navy3:colors.card,color:on?'#fff':colors.text}}>{propertyId==='hangar'?'Hangar':propertyId}</button>})}</div></div>
                    <div><div style={labelStyle}>Permissions</div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{(['view','edit','approve','delete','manageUsers'] as const).map((permission)=><label key={permission} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:800}}><input type="checkbox" checked={member.permissions[permission]} onChange={(e)=>updateMember(member.id,{permissions:{...member.permissions,[permission]:e.target.checked}})}/>{permission==='manageUsers'?'Manage users':permission[0].toUpperCase()+permission.slice(1)}</label>)}</div></div>
                    <div><div style={labelStyle}>Operating areas</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ACCESS_PROFILES.map(([id,label])=>{const on=member.accessProfiles.includes(id);return <button key={id} type="button" onClick={()=>updateMember(member.id,{accessProfiles:on?member.accessProfiles.filter((value)=>value!==id):[...member.accessProfiles,id]})} style={{...propertyChipStyle,background:on?'#FFF3CF':colors.card,borderColor:on?colors.gold:colors.line}}>{label}</button>})}</div></div>
                    <div style={{fontSize:11,color:colors.muted,fontWeight:800}}>Invite status: {member.inviteStatus || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={{margin:"0 0 4px",color:colors.text}}>Invite Team Member</h2>
            <p style={{...mutedStyle,margin:"0 0 12px"}}>Create an Atlas user and assign a starting role and property.</p>
            <div style={{display:"grid",gridTemplateColumns:"minmax(160px,1fr) minmax(220px,1.3fr) minmax(140px,.7fr) auto",gap:8}}>
              <input value={newMemberName} onChange={(e)=>setNewMemberName(e.target.value)} placeholder="Name" style={fieldStyle}/>
              <input value={newMemberEmail} onChange={(e)=>setNewMemberEmail(e.target.value)} placeholder="Email" style={fieldStyle}/>
              <select value={newMemberRole} onChange={(e)=>setNewMemberRole(e.target.value as TeamRole)} style={fieldStyle}>{Object.keys(ROLE_DEFAULTS).map((role)=><option key={role}>{role}</option>)}</select>
              <button type="button" style={goldButtonStyle} onClick={inviteMember}>Invite</button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 980px) {
          .atlas-team-workspace {
            grid-template-columns: 1fr !important;
          }
          .atlas-team-settings {
            grid-template-columns: 1fr !important;
          }
          .atlas-team-task-main {
            grid-template-columns: auto minmax(0, 1fr) !important;
          }
          .atlas-team-task-main > :nth-child(3),
          .atlas-team-task-main > :nth-child(4),
          .atlas-team-task-main > :nth-child(5) {
            grid-column: 2;
          }
          .atlas-team-task-details {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={statStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

const heroStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  padding: 22,
  borderRadius: 22,
  background: `linear-gradient(135deg, ${colors.navy2}, ${colors.navy3})`,
  color: "#FFFFFF",
  border: `1px solid rgba(255,255,255,.08)`,
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold2,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const titleStyle: React.CSSProperties = {
  margin: "5px 0 4px",
  fontSize: 34,
  lineHeight: 1.05,
};

const heroCopyStyle: React.CSSProperties = {
  margin: 0,
  color: "#D8E5F1",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const workspaceStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(275px, 360px) minmax(0, 1fr)",
  gap: 16,
  alignItems: "start",
};

const panelStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 12px 30px rgba(7,27,47,.08)",
};

const statStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: 15,
};

const statLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const statValueStyle: React.CSSProperties = {
  marginTop: 4,
  color: colors.text,
  fontSize: 30,
  fontWeight: 900,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${colors.line}`,
  borderRadius: 10,
  padding: "10px 11px",
  background: colors.card,
  color: colors.text,
  font: "inherit",
};

const titleFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  fontSize: 24,
  fontWeight: 900,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 800,
};

const mutedStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
};

const goldButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold2}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: colors.gold,
  color: colors.navy,
  fontWeight: 900,
};

const lightButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 10,
  padding: "9px 12px",
  background: colors.card,
  color: colors.text,
  fontWeight: 800,
};

const listCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  width: "100%",
  padding: 12,
  border: "2px solid",
  borderRadius: 14,
  background: colors.card,
  textAlign: "left",
};

const editorHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const settingsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(150px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const propertyChipStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  padding: "7px 11px",
  fontWeight: 800,
};

const taskCardStyle: React.CSSProperties = {
  padding: 12,
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: colors.panel,
};

const taskMainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "auto minmax(180px, 1.5fr) minmax(130px, .65fr) minmax(125px, .65fr) auto",
  gap: 8,
  alignItems: "center",
};

const taskDetailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(140px, .6fr) minmax(220px, 1fr) auto",
  gap: 8,
  alignItems: "center",
  marginTop: 8,
  paddingLeft: 28,
};

const photoLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: `1px solid ${colors.line}`,
  borderRadius: 8,
  background: colors.card,
  color: colors.text,
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  border: `1px dashed ${colors.line}`,
  borderRadius: 12,
  color: colors.muted,
  textAlign: "center",
};
