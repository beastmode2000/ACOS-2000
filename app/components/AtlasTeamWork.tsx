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
  locations?: Array<{ id: string; name: string }>;
  createAddisonAssignment?: (draft: AddisonAssignmentDraft) =>
    | { ok: boolean; error?: string }
    | Promise<{ ok: boolean; error?: string }>;
};

type AssignmentFrequency =
  | "One-time"
  | "Daily"
  | "Weekly"
  | "Biweekly"
  | "Monthly";

type AddisonAssignmentDraft = {
  title: string;
  dueDate: string;
  frequency: AssignmentFrequency;
  locationId: string;
  instructions: string;
  priority: "High" | "Medium" | "Low";
  minutes: number;
};

const BASE_PEOPLE = ["Addison", "Pat's Crew", "Sean", "Nick", "Unassigned"];
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

export default function AtlasTeamWork({
  activePropertyId,
  locations = [],
  createAddisonAssignment,
}: Props) {
  const [lists, setLists] = useState<TeamList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [search, setSearch] = useState("");
  const [teamView, setTeamView] = useState<"assignments" | "people">("people");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberMessage, setMemberMessage] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamRole>("Employee");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  });
  const [assignmentFrequency, setAssignmentFrequency] =
    useState<AssignmentFrequency>("One-time");
  const [assignmentLocationId, setAssignmentLocationId] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentPriority, setAssignmentPriority] =
    useState<"High" | "Medium" | "Low">("Medium");
  const [assignmentMinutes, setAssignmentMinutes] = useState(30);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const assigneeOptions = useMemo(() => {
    const values = [
      ...members.filter((member) => member.active).map((member) => member.name.trim()),
      ...BASE_PEOPLE,
    ].filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [members]);

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
      const stored = Array.isArray(parsed) ? parsed : [];
      const withoutLegacyAddisonRoutine = stored.filter(
        (list) =>
          list.id !== "addison-daily-routine" &&
          list.name.trim().toLowerCase() !== "addison daily routine",
      );
      const next = withoutLegacyAddisonRoutine.length
        ? withoutLegacyAddisonRoutine
        : starterLists();
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

  function addTaskForPerson(person: string) {
    const cleanPerson = person.trim() || "Unassigned";
    const directId = `direct-assignments-${activePropertyId}`;
    setLists((current) => {
      const existing = current.find((list) => list.id === directId);
      if (existing) {
        return current.map((list) =>
          list.id === directId
            ? {
                ...list,
                tasks: [...list.tasks, task("New task", cleanPerson)],
              }
            : list,
        );
      }
      const directList: TeamList = {
        id: directId,
        name: "Direct Assignments",
        description: "One-off tasks assigned directly to team members and crews.",
        defaultAssignee: cleanPerson,
        propertyIds: [activePropertyId],
        schedule: "As needed",
        active: true,
        tasks: [task("New task", cleanPerson)],
      };
      return [directList, ...current];
    });
    setSelectedListId(directId);
    setTeamView("assignments");
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

  function resetAssignmentForm() {
    setAssignmentTitle("");
    setAssignmentFrequency("One-time");
    setAssignmentLocationId("");
    setAssignmentInstructions("");
    setAssignmentPriority("Medium");
    setAssignmentMinutes(30);
    setAssignmentMessage("");
  }

  async function saveAddisonAssignment() {
    if (assignmentSaving) return;
    if (!assignmentTitle.trim()) {
      setAssignmentMessage("Enter a task name.");
      return;
    }
    if (!createAddisonAssignment) {
      setAssignmentMessage("Finish deploying the matching AtlasApp file first.");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentMessage("Saving…");
    try {
      const result = await createAddisonAssignment({
        title: assignmentTitle.trim(),
        dueDate: assignmentDueDate,
        frequency: assignmentFrequency,
        locationId: assignmentLocationId,
        instructions: assignmentInstructions.trim(),
        priority: assignmentPriority,
        minutes: Math.max(5, Number(assignmentMinutes || 30)),
      });
      if (!result.ok) {
        setAssignmentMessage(result.error || "Atlas could not save this assignment.");
        return;
      }
      resetAssignmentForm();
      setAssignmentOpen(false);
    } catch {
      setAssignmentMessage("Atlas could not save this assignment.");
    } finally {
      setAssignmentSaving(false);
    }
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={goldButtonStyle}
            onClick={() => {
              setAssignmentOpen((open) => !open);
              setAssignmentMessage("");
            }}
          >
            {assignmentOpen ? "Close Assignment" : "Assign Addison"}
          </button>
          {teamView === "assignments" ? <button type="button" style={goldButtonStyle} onClick={createList}>+ New List</button> : null}
        </div>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {([['people','Users & Roles'],['assignments','Assignments']] as const).map(([value,label]) => (
          <button key={value} type="button" onClick={() => setTeamView(value)} style={{...lightButtonStyle, background:teamView===value?colors.navy3:colors.card, color:teamView===value?'#fff':colors.text, borderColor:teamView===value?colors.navy3:colors.line}}>{label}</button>
        ))}
      </div>

      {assignmentOpen ? (
        <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
          <div>
            <div style={eyebrowStyle}>ADDISON</div>
            <h2 style={{ margin: "4px 0", color: colors.text }}>Assign Work</h2>
          </div>

          <div
            className="atlas-addison-assignment-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px,1.5fr) minmax(145px,.7fr) minmax(150px,.8fr)",
              gap: 10,
            }}
          >
            <label style={labelStyle}>
              Task
              <input
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.currentTarget.value)}
                placeholder="Task name"
                style={fieldStyle}
                autoFocus
              />
            </label>
            <label style={labelStyle}>
              Due date
              <input
                type="date"
                value={assignmentDueDate}
                onChange={(event) => setAssignmentDueDate(event.currentTarget.value)}
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Frequency
              <select
                value={assignmentFrequency}
                onChange={(event) =>
                  setAssignmentFrequency(event.currentTarget.value as AssignmentFrequency)
                }
                style={fieldStyle}
              >
                <option value="One-time">One-time / As needed</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Biweekly">Every 2 weeks</option>
                <option value="Monthly">Monthly</option>
              </select>
            </label>
            <label style={labelStyle}>
              Location
              <select
                value={assignmentLocationId}
                onChange={(event) => setAssignmentLocationId(event.currentTarget.value)}
                style={fieldStyle}
              >
                <option value="">General property</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Priority
              <select
                value={assignmentPriority}
                onChange={(event) =>
                  setAssignmentPriority(
                    event.currentTarget.value as "High" | "Medium" | "Low",
                  )
                }
                style={fieldStyle}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label style={labelStyle}>
              Estimated time
              <select
                value={assignmentMinutes}
                onChange={(event) => setAssignmentMinutes(Number(event.currentTarget.value))}
                style={fieldStyle}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>Half day</option>
                <option value={480}>Full day</option>
              </select>
            </label>
          </div>

          <label style={labelStyle}>
            Instructions
            <textarea
              value={assignmentInstructions}
              onChange={(event) => setAssignmentInstructions(event.currentTarget.value)}
              placeholder="What Addison needs to do"
              style={{ ...fieldStyle, minHeight: 88, resize: "vertical" }}
            />
          </label>

          {assignmentMessage ? (
            <div
              style={{
                padding: "9px 11px",
                border: `1px solid ${colors.line}`,
                borderRadius: 10,
                background: colors.panel,
                color: colors.text,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {assignmentMessage}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void saveAddisonAssignment()}
              disabled={assignmentSaving}
              style={{ ...goldButtonStyle, opacity: assignmentSaving ? 0.65 : 1 }}
            >
              {assignmentSaving ? "Saving…" : "Save Assignment"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetAssignmentForm();
                setAssignmentOpen(false);
              }}
              disabled={assignmentSaving}
              style={lightButtonStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {teamView === "assignments" ? <>
      <div style={summaryGridStyle}>
        <Stat label="Active Lists" value={visibleLists.filter((item) => item.active).length} />
        <Stat label="Assigned Tasks" value={propertyTasks.length} />
        <Stat
          label="Open"
          value={propertyTasks.filter((item) => item.status !== "Completed").length}
        />
        <Stat
          label="Completed"
          value={propertyTasks.filter((item) => item.status === "Completed").length}
        />
      </div>

      <div style={workspaceStyle}>
        <aside style={panelStyle}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lists, people, or tasks"
            style={fieldStyle}
          />

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {visibleLists.map((list) => {
              const completed = list.tasks.filter(
                (item) => item.status === "Completed",
              ).length;

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  style={{
                    ...listCardStyle,
                    borderColor:
                      selected?.id === list.id ? colors.gold : colors.line,
                    boxShadow:
                      selected?.id === list.id
                        ? "0 0 0 2px rgba(201,154,61,.16)"
                        : "none",
                  }}
                >
                  <strong style={{ color: colors.text }}>{list.name}</strong>
                  <span style={mutedStyle}>
                    {list.defaultAssignee} · {list.schedule}
                  </span>
                  <span style={mutedStyle}>
                    {completed} of {list.tasks.length} complete
                  </span>
                </button>
              );
            })}

            {!visibleLists.length && (
              <div style={emptyStyle}>
                No Team Work lists are assigned to {activePropertyId}.
              </div>
            )}
          </div>
        </aside>

        <div style={panelStyle}>
          {!selected ? (
            <div style={emptyStyle}>
              Create a list or switch to a property with an existing list.
            </div>
          ) : (
            <>
              <div style={editorHeaderStyle}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <input
                    value={selected.name}
                    onChange={(event) =>
                      updateList(selected.id, { name: event.target.value })
                    }
                    style={titleFieldStyle}
                  />
                  <textarea
                    value={selected.description}
                    onChange={(event) =>
                      updateList(selected.id, {
                        description: event.target.value,
                      })
                    }
                    placeholder="Describe this list"
                    style={{ ...fieldStyle, minHeight: 72, marginTop: 8 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={lightButtonStyle}
                    onClick={duplicateList}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    style={{ ...lightButtonStyle, color: colors.red }}
                    onClick={deleteList}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={settingsGridStyle}>
                <label style={labelStyle}>
                  Default assignee
                  <select
                    value={selected.defaultAssignee}
                    onChange={(event) => {
                      if (event.target.value === "__add_person__") {
                        setTeamView("people");
                        return;
                      }
                      updateList(selected.id, {
                        defaultAssignee: event.target.value,
                      });
                    }}
                    style={fieldStyle}
                  >
                    <option value="__add_person__">+ Add / manage person…</option>
                    {assigneeOptions.map((person) => (
                      <option key={person} value={person}>{person}</option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Schedule
                  <input
                    value={selected.schedule}
                    onChange={(event) =>
                      updateList(selected.id, {
                        schedule: event.target.value,
                      })
                    }
                    style={fieldStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Status
                  <select
                    value={selected.active ? "Active" : "Paused"}
                    onChange={(event) =>
                      updateList(selected.id, {
                        active: event.target.value === "Active",
                      })
                    }
                    style={fieldStyle}
                  >
                    <option>Active</option>
                    <option>Paused</option>
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={labelStyle}>Properties</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PROPERTY_IDS.map((propertyId) => {
                    const active = selected.propertyIds.includes(propertyId);

                    return (
                      <button
                        key={propertyId}
                        type="button"
                        onClick={() => toggleProperty(propertyId)}
                        style={{
                          ...propertyChipStyle,
                          background: active ? colors.navy3 : colors.card,
                          color: active ? "#FFFFFF" : colors.text,
                        }}
                      >
                        {propertyId === "hangar" ? "Hangar" : propertyId}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ ...editorHeaderStyle, marginTop: 22 }}>
                <div>
                  <h2 style={{ margin: 0, color: colors.text }}>Tasks</h2>
                  <p style={{ ...mutedStyle, margin: "4px 0 0" }}>
                    Every item is editable, reorderable, and assignable.
                  </p>
                </div>

                <button type="button" style={goldButtonStyle} onClick={addTask}>
                  + Add Task
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {selected.tasks.map((item, index) => (
                  <div key={item.id} style={taskCardStyle}>
                    <div style={taskMainGridStyle}>
                      <input
                        type="checkbox"
                        checked={item.status === "Completed"}
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            status: event.target.checked
                              ? "Completed"
                              : "Open",
                          })
                        }
                        style={{ width: 20, height: 20 }}
                      />

                      <input
                        value={item.title}
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            title: event.target.value,
                          })
                        }
                        style={{ ...fieldStyle, fontWeight: 800 }}
                      />

                      <select
                        value={item.assignee}
                        onChange={(event) => {
                          if (event.target.value === "__add_person__") {
                            setTeamView("people");
                            return;
                          }
                          updateTask(selected.id, item.id, {
                            assignee: event.target.value,
                          });
                        }}
                        style={fieldStyle}
                      >
                        <option value="__add_person__">+ Add / manage person…</option>
                        {assigneeOptions.map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                      </select>

                      <select
                        value={item.status}
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            status: event.target.value as TeamTaskStatus,
                          })
                        }
                        style={fieldStyle}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Waiting</option>
                        <option>Completed</option>
                      </select>

                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveTask(index, -1)}
                          style={iconButtonStyle}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === selected.tasks.length - 1}
                          onClick={() => moveTask(index, 1)}
                          style={iconButtonStyle}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(item.id)}
                          style={{ ...iconButtonStyle, color: colors.red }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div style={taskDetailGridStyle}>
                      <input
                        value={item.location}
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            location: event.target.value,
                          })
                        }
                        placeholder="Location"
                        style={fieldStyle}
                      />

                      <input
                        value={item.notes}
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            notes: event.target.value,
                          })
                        }
                        placeholder="Instructions or notes"
                        style={fieldStyle}
                      />

                      <label style={photoLabelStyle}>
                        <input
                          type="checkbox"
                          checked={item.requirePhoto}
                          onChange={(event) =>
                            updateTask(selected.id, item.id, {
                              requirePhoto: event.target.checked,
                            })
                          }
                        />
                        Require photo
                      </label>
                    </div>
                  </div>
                ))}

                {!selected.tasks.length && (
                  <div style={emptyStyle}>
                    This list has no tasks yet. Select Add Task.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </> : (
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
                  <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1.2fr) minmax(190px,1.4fr) minmax(140px,.7fr) auto auto",gap:8,alignItems:"center"}}>
                    <input value={member.name} onChange={(e)=>updateMember(member.id,{name:e.target.value})} style={{...fieldStyle,fontWeight:900}} />
                    <input value={member.email} onChange={(e)=>updateMember(member.id,{email:e.target.value})} style={fieldStyle} />
                    <select value={member.role} onChange={(e)=>{const role=e.target.value as TeamRole;updateMember(member.id,{role,permissions:{...ROLE_DEFAULTS[role]}})}} style={fieldStyle}>
                      {Object.keys(ROLE_DEFAULTS).map((role)=><option key={role}>{role}</option>)}
                    </select>
                    <label style={{display:"flex",alignItems:"center",gap:6,fontWeight:800,fontSize:12}}><input type="checkbox" checked={member.active} onChange={(e)=>updateMember(member.id,{active:e.target.checked})}/> Active</label>
                    <button type="button" style={goldButtonStyle} onClick={() => addTaskForPerson(member.name)}>+ Add Task</button>
                  </div>
                  <details style={{marginTop:10}}>
                    <summary style={{cursor:"pointer",fontSize:12,fontWeight:900,color:colors.navy}}>Access details</summary>
                    <div style={{marginTop:10,display:"grid",gap:8}}>
                      <div><div style={labelStyle}>Properties</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PROPERTY_IDS.map((propertyId)=>{const on=member.propertyIds.includes(propertyId);return <button key={propertyId} type="button" onClick={()=>updateMember(member.id,{propertyIds:on?member.propertyIds.filter((id)=>id!==propertyId):[...member.propertyIds,propertyId]})} style={{...propertyChipStyle,background:on?colors.navy3:colors.card,color:on?'#fff':colors.text}}>{propertyId==='hangar'?'Hangar':propertyId}</button>})}</div></div>
                      <div><div style={labelStyle}>Permissions</div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{(['view','edit','approve','delete','manageUsers'] as const).map((permission)=><label key={permission} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:800}}><input type="checkbox" checked={member.permissions[permission]} onChange={(e)=>updateMember(member.id,{permissions:{...member.permissions,[permission]:e.target.checked}})}/>{permission==='manageUsers'?'Manage users':permission[0].toUpperCase()+permission.slice(1)}</label>)}</div></div>
                      <div><div style={labelStyle}>Operating areas</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ACCESS_PROFILES.map(([id,label])=>{const on=member.accessProfiles.includes(id);return <button key={id} type="button" onClick={()=>updateMember(member.id,{accessProfiles:on?member.accessProfiles.filter((value)=>value!==id):[...member.accessProfiles,id]})} style={{...propertyChipStyle,background:on?'#FFF3CF':colors.card,borderColor:on?colors.gold:colors.line}}>{label}</button>})}</div></div>
                      <div style={{fontSize:11,color:colors.muted,fontWeight:800}}>Invite status: {member.inviteStatus || '—'}</div>
                    </div>
                  </details>
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
      )}

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
          .atlas-addison-assignment-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
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
