"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
type TeamMember = { id:string; name:string; email:string; role:TeamRole; active:boolean; propertyIds:string[]; permissions:TeamPermissions; accessProfiles:string[]; inviteStatus?:string; fieldLinkActive?:boolean; fieldOnly?:boolean };

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

type AddisonHistoryItem = {
  id: string;
  taskId: string;
  title: string;
  date: string;
  completedAt?: string;
  locationId?: string;
  locationName?: string;
  note?: string;
  recurring?: boolean;
  frequency?: string;
  photos?: Array<Record<string, any>>;
};

type AddisonNoteHistoryItem = {
  id: string;
  date: string;
  note: string;
  updatedAt?: string;
  taskId?: string;
  taskTitle?: string;
};

type AddisonLiveWork = {
  today: string;
  tasks: Array<Record<string, any>>;
  locations?: Array<{ id: string; name: string }>;
  dailyNote?: string;
  dailyNoteUpdatedAt?: string;
  history?: AddisonHistoryItem[];
  dailyNotes?: AddisonNoteHistoryItem[];
  taskNotes?: AddisonNoteHistoryItem[];
  weekStart?: string;
  weeklySummary?: string;
};

function addisonMeta(task: Record<string, any>) {
  return task?.taskMeta && typeof task.taskMeta === "object"
    ? task.taskMeta
    : task;
}

function addisonFrequency(task: Record<string, any>): AssignmentFrequency {
  const meta = addisonMeta(task);
  if (!task?.recurring) return "One-time";
  const unit = String(meta?.recurrenceUnit || "Weeks");
  const interval = Math.max(1, Number(meta?.recurrenceInterval || 1));
  if (unit === "Days") return "Daily";
  if (unit === "Months") return "Monthly";
  if (unit === "Weeks" && interval === 2) return "Biweekly";
  return "Weekly";
}


function addisonPriorityLabel(priority: unknown) {
  if (priority === "High") return "Must Do";
  if (priority === "Low") return "If Time";
  return "Normal";
}

function addisonPaused(task: Record<string, any>) {
  const meta = addisonMeta(task);
  return Boolean(meta?.paused);
}

function formatAddisonHistoryDate(dateKey: string) {
  if (!dateKey) return "";
  const date = new Date(`${dateKey}T12:00:00-07:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

const BASE_PEOPLE = ["Addison", "Pat's Crew", "Sean", "Nick", "Unassigned"];
const PROPERTY_IDS = ["2000", "3661", "6855", "hangar"];
const STORAGE_KEY = "atlas-team-work-v2";
const ADDISON_WORK_TOKEN =
  "addison-2000-7f94f468dca84de3a7b8c2d942ca3819";

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

const ADDISON_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type AddisonWeekday = (typeof ADDISON_WEEKDAYS)[number] | "Auto";

function nextDateForWeekday(day: AddisonWeekday, fromDate?: string) {
  if (day === "Auto") return fromDate || new Date().toISOString().slice(0, 10);
  const target = ADDISON_WEEKDAYS.indexOf(day as (typeof ADDISON_WEEKDAYS)[number]) + 1;
  const base = fromDate ? new Date(`${fromDate}T12:00:00`) : new Date();
  const current = base.getDay();
  let delta = (target - current + 7) % 7;
  if (delta === 0 && fromDate) delta = 0;
  base.setDate(base.getDate() + delta);
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`;
}

function dayFromTask(task: Record<string, any>): AddisonWeekday {
  const meta = addisonMeta(task);
  const value = String(task.preferredDay || meta?.preferredDay || "Auto");
  return (ADDISON_WEEKDAYS as readonly string[]).includes(value) ? value as AddisonWeekday : "Auto";
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
  const [sharedListsReady, setSharedListsReady] = useState(false);
  const [selectedListId, setSelectedListId] = useState("");
  const [search, setSearch] = useState("");
  const [teamView, setTeamView] = useState<"addison" | "assignments" | "people">("people");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberMessage, setMemberMessage] = useState("");
  const [fieldLinkUrls, setFieldLinkUrls] = useState<Record<string, string>>({});
  const [fieldLinkBusyId, setFieldLinkBusyId] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamRole>("Employee");
  const [fieldEmployeeName, setFieldEmployeeName] = useState("");
  const [fieldEmployeePropertyId, setFieldEmployeePropertyId] = useState(activePropertyId);
  const [fieldEmployeeBusy, setFieldEmployeeBusy] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const assignmentTitleRef = useRef<HTMLInputElement | null>(null);
  const [assignmentDueDate, setAssignmentDueDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  });
  const [assignmentFrequency, setAssignmentFrequency] =
    useState<AssignmentFrequency>("One-time");
  const [assignmentDay, setAssignmentDay] = useState<AddisonWeekday>("Auto");
  const [assignmentLocationId, setAssignmentLocationId] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentPriority, setAssignmentPriority] =
    useState<"High" | "Medium" | "Low">("Medium");
  const [assignmentMinutes, setAssignmentMinutes] = useState(30);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [addisonWork, setAddisonWork] = useState<AddisonLiveWork | null>(null);
  const [addisonLoading, setAddisonLoading] = useState(false);
  const [addisonLiveMessage, setAddisonLiveMessage] = useState("");
  const [editingAddisonTaskId, setEditingAddisonTaskId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingFrequency, setEditingFrequency] =
    useState<AssignmentFrequency>("One-time");
  const [editingDay, setEditingDay] = useState<AddisonWeekday>("Auto");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [editingInstructions, setEditingInstructions] = useState("");
  const [editingPriority, setEditingPriority] =
    useState<"High" | "Medium" | "Low">("Medium");
  const [editingMinutes, setEditingMinutes] = useState(30);
  const [historyCopied, setHistoryCopied] = useState(false);

  useEffect(() => {
    setFieldEmployeePropertyId(activePropertyId);
  }, [activePropertyId]);

  async function loadAddisonWork(showLoading = false) {
    if (activePropertyId !== "2000") {
      setAddisonWork(null);
      return;
    }
    if (showLoading) setAddisonLoading(true);
    try {
      const response = await fetch(
        `/api/landscape-help?token=${encodeURIComponent(ADDISON_WORK_TOKEN)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.addison) {
        throw new Error(payload?.error || "Could not load Addison.");
      }
      const work = payload.addison as AddisonLiveWork;
      setAddisonWork(work);
      setAddisonLiveMessage("");
    } catch (error) {
      setAddisonLiveMessage(
        error instanceof Error ? error.message : "Could not load Addison.",
      );
    } finally {
      if (showLoading) setAddisonLoading(false);
    }
  }

  async function patchAddisonLive(
    action: string,
    body: Record<string, unknown>,
    successMessage = "",
  ) {
    const response = await fetch(
      `/api/landscape-help?token=${encodeURIComponent(ADDISON_WORK_TOKEN)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ADDISON_WORK_TOKEN,
          action,
          ...body,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Could not update Addison.");
    }
    if (payload.addison) {
      const work = payload.addison as AddisonLiveWork;
      setAddisonWork(work);
    }
    if (successMessage) setAddisonLiveMessage(successMessage);
    return payload;
  }

  useEffect(() => {
    if (activePropertyId !== "2000") return;
    void loadAddisonWork(true);
    const timer = window.setInterval(() => {
      void loadAddisonWork(false);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [activePropertyId]);

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
        const remoteLists = Array.isArray(payload.workLists) ? payload.workLists as TeamList[] : [];
        if (remoteLists.length) {
          setLists(remoteLists);
          setSelectedListId((current) => remoteLists.some((list) => list.id === current) ? current : remoteLists[0]?.id || "");
        }
        setSharedListsReady(true);
      })
      .catch(() => {
        setSharedListsReady(true);
        setMemberMessage("Atlas could not load team users.");
      });
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
    if (!sharedListsReady) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "team-work-lists-save", workLists: lists }),
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Could not sync Team assignments.");
        })
        .catch(() => setMemberMessage("Team assignments are saved on this device but shared sync failed."));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [lists, sharedListsReady]);

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

  async function addFieldEmployee() {
    const name = fieldEmployeeName.trim();
    if (!name) {
      setMemberMessage("Enter the field employee name.");
      return;
    }
    if (fieldEmployeeBusy) return;

    setFieldEmployeeBusy(true);
    setMemberMessage("Creating field employee…");
    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "field-employee-create",
          name,
          propertyId: fieldEmployeePropertyId || activePropertyId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.member || !payload?.fieldPath) {
        throw new Error(payload?.error || "Could not create field employee.");
      }

      const member = payload.member as TeamMember;
      const link = `${window.location.origin}${payload.fieldPath}`;
      setMembers((current) => [
        ...current.filter((item) => item.id !== member.id),
        member,
      ]);
      setFieldLinkUrls((current) => ({ ...current, [member.id]: link }));
      setFieldEmployeeName("");
      setFieldEmployeePropertyId(activePropertyId);

      try {
        await navigator.clipboard?.writeText(link);
        setMemberMessage(`${member.name} added. My Work link created and copied.`);
      } catch {
        setMemberMessage(`${member.name} added. Open Access details to copy the My Work link.`);
      }
    } catch (error) {
      setMemberMessage(error instanceof Error ? error.message : "Could not create field employee.");
    } finally {
      setFieldEmployeeBusy(false);
    }
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

  async function manageFieldLink(member: TeamMember, revoke = false) {
    if (fieldLinkBusyId) return;
    setFieldLinkBusyId(member.id);
    setMemberMessage(revoke ? "Revoking My Work link…" : member.fieldLinkActive ? "Replacing My Work link…" : "Creating My Work link…");
    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: revoke ? "field-link-revoke" : "field-link", memberId: member.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Could not update My Work link.");

      if (revoke) {
        setMembers((current) => current.map((item) => item.id === member.id ? { ...item, fieldLinkActive: false } : item));
        setFieldLinkUrls((current) => {
          const next = { ...current };
          delete next[member.id];
          return next;
        });
        setMemberMessage(`${member.name}'s My Work link was revoked.`);
        return;
      }

      const link = `${window.location.origin}${payload.fieldPath}`;
      setFieldLinkUrls((current) => ({ ...current, [member.id]: link }));
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, fieldLinkActive: true } : item));

      try {
        await navigator.clipboard?.writeText(link);
        setMemberMessage(`${member.name}'s My Work link was created and copied.`);
      } catch {
        setMemberMessage(`${member.name}'s My Work link was created. Use Copy Link below.`);
      }
    } catch (error) {
      setMemberMessage(error instanceof Error ? error.message : "Could not update My Work link.");
    } finally {
      setFieldLinkBusyId("");
    }
  }

  async function copyFieldLink(member: TeamMember) {
    const link = fieldLinkUrls[member.id];
    if (!link) {
      setMemberMessage("For security, Atlas does not store the readable link. Use Replace & Copy Link to create a new one.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setMemberMessage(`${member.name}'s My Work link copied.`);
    } catch {
      setMemberMessage(link);
    }
  }

  function openFieldLink(member: TeamMember) {
    const link = fieldLinkUrls[member.id];
    if (!link) {
      setMemberMessage("For security, Atlas does not store the readable link. Use Replace & Copy Link to create a new one.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function resetAssignmentForm() {
    setAssignmentTitle("");
    setAssignmentFrequency("One-time");
    setAssignmentDay("Auto");
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

    setAssignmentSaving(true);
    setAssignmentMessage("Saving…");
    try {
      await patchAddisonLive(
        "task-create",
        {
          title: assignmentTitle.trim(),
          dueDate: assignmentDueDate,
          frequency: assignmentFrequency,
          preferredDay: assignmentDay,
          locationId: assignmentLocationId || "general",
          instructions: assignmentInstructions.trim(),
          priority: assignmentPriority,
          minutes: Math.max(5, Number(assignmentMinutes || 30)),
        },
        "Task added.",
      );
      setAssignmentTitle("");
      setAssignmentInstructions("");
      setAssignmentMessage("");
      requestAnimationFrame(() => {
        assignmentTitleRef.current?.focus();
      });
    } catch (error) {
      setAssignmentMessage(
        error instanceof Error ? error.message : "Atlas could not save this assignment.",
      );
    } finally {
      setAssignmentSaving(false);
    }
  }

  function beginEditAddisonTask(task: Record<string, any>) {
    const meta = addisonMeta(task);
    setEditingAddisonTaskId(String(task.id || ""));
    setEditingTitle(String(task.title || ""));
    setEditingDueDate(String(meta?.dueDate || "").slice(0, 10));
    setEditingFrequency(addisonFrequency(task));
    setEditingDay(dayFromTask(task));
    setEditingLocationId(String(task.locationId || "general"));
    setEditingInstructions(String(meta?.instructions || task.notes || ""));
    setEditingPriority(
      task.priority === "High" || task.priority === "Low" ? task.priority : "Medium",
    );
    setEditingMinutes(Math.max(5, Number(task.minutes || 30)));
  }

  async function saveAddisonTaskEdit() {
    if (!editingAddisonTaskId || !editingTitle.trim()) return;
    try {
      await patchAddisonLive(
        "task-update",
        {
          taskId: editingAddisonTaskId,
          title: editingTitle.trim(),
          dueDate: editingDueDate,
          frequency: editingFrequency,
          preferredDay: editingDay,
          locationId: editingLocationId || "general",
          instructions: editingInstructions.trim(),
          priority: editingPriority,
          minutes: editingMinutes,
        },
        "Task updated.",
      );
      setEditingAddisonTaskId("");
    } catch (error) {
      setAddisonLiveMessage(
        error instanceof Error ? error.message : "Could not update task.",
      );
    }
  }

  async function deleteAddisonLiveTask(taskId: string) {
    if (!window.confirm("Delete this Addison task?")) return;
    try {
      await patchAddisonLive("task-delete", { taskId }, "Task deleted.");
      if (editingAddisonTaskId === taskId) setEditingAddisonTaskId("");
    } catch (error) {
      setAddisonLiveMessage(
        error instanceof Error ? error.message : "Could not delete task.",
      );
    }
  }

  async function toggleAddisonPause(task: Record<string, any>) {
    const taskId = String(task.id || "");
    if (!taskId) return;
    try {
      await patchAddisonLive(
        "task-pause",
        { taskId, paused: !addisonPaused(task) },
        addisonPaused(task) ? "Task resumed." : "Task paused.",
      );
    } catch (error) {
      setAddisonLiveMessage(
        error instanceof Error ? error.message : "Could not update task.",
      );
    }
  }

  async function moveAddisonTask(taskId: string, direction: -1 | 1) {
    const openTasks = (addisonWork?.tasks || []).filter(
      (task) => String(addisonMeta(task)?.status || "") !== "Completed" && !addisonPaused(task),
    );
    const index = openTasks.findIndex((task) => String(task.id || "") === taskId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= openTasks.length) return;
    const next = [...openTasks];
    [next[index], next[target]] = [next[target], next[index]];
    await patchAddisonLive(
      "task-prioritize",
      { orderedTaskIds: next.map((task) => String(task.id || "")) },
      "Order saved.",
    );
  }

  async function toggleAddisonLiveTask(task: Record<string, any>) {
    const meta = addisonMeta(task);
    const completed = String(meta?.status || "") === "Completed";
    try {
      await patchAddisonLive(
        "task-status",
        { taskId: task.id, status: completed ? "Open" : "Completed" },
        completed ? "Task reopened." : "Task completed.",
      );
    } catch (error) {
      setAddisonLiveMessage(
        error instanceof Error ? error.message : "Could not update task.",
      );
    }
  }

  async function prioritizeAddisonDay() {
    const tasks = (addisonWork?.tasks || []).filter(
      (task) => String(addisonMeta(task)?.status || "") !== "Completed" && !addisonPaused(task),
    );
    const priorityWeight: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    const orderedTaskIds = [...tasks]
      .sort((a, b) => {
        const am = addisonMeta(a);
        const bm = addisonMeta(b);
        const ad = String(am?.dueDate || "9999-12-31").slice(0, 10);
        const bd = String(bm?.dueDate || "9999-12-31").slice(0, 10);
        if (ad !== bd) return ad.localeCompare(bd);
        const ap = priorityWeight[String(a.priority || "Medium")] ?? 1;
        const bp = priorityWeight[String(b.priority || "Medium")] ?? 1;
        if (ap !== bp) return ap - bp;
        return String(a.title || "").localeCompare(String(b.title || ""));
      })
      .map((task) => String(task.id || ""))
      .filter(Boolean);
    try {
      await patchAddisonLive(
        "task-prioritize",
        { orderedTaskIds },
        "Addison's day prioritized.",
      );
    } catch (error) {
      setAddisonLiveMessage(
        error instanceof Error ? error.message : "Could not prioritize Addison's day.",
      );
    }
  }

  async function copyAddisonWeeklySummary() {
    const summary = String(addisonWork?.weeklySummary || "").trim();
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setHistoryCopied(true);
      window.setTimeout(() => setHistoryCopied(false), 1800);
    } catch {
      setAddisonLiveMessage("Could not copy the weekly update.");
    }
  }


  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>TEAM OPERATIONS</div>
          <h1 style={titleStyle}>{teamView === "addison" ? "Addison" : "Team"}</h1>
          <p style={heroCopyStyle}>
            {teamView === "addison"
              ? "Add tasks here. Changes sync directly with Addison."
              : `Manage people, helpers, assignments, roles, and property access for ${activePropertyId}.`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {teamView === "addison" ? (
            <>
              <button
                type="button"
                style={goldButtonStyle}
                onClick={() => {
                  setAssignmentOpen((open) => !open);
                  setAssignmentMessage("");
                }}
              >
                {assignmentOpen ? "Close Add Task" : "Add Task"}
              </button>
              <button
                type="button"
                style={lightButtonStyle}
                onClick={() => window.open("/addison-work", "_blank", "noopener,noreferrer")}
              >
                View Addison Screen
              </button>
            </>
          ) : null}
          {teamView === "assignments" ? (
            <button type="button" style={goldButtonStyle} onClick={createList}>+ New List</button>
          ) : null}
        </div>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {([['addison','Addison'],['people','Users & Roles'],['assignments','Other Assignments']] as const).map(([value,label]) => (
          <button key={value} type="button" onClick={() => setTeamView(value)} style={{...lightButtonStyle, background:teamView===value?colors.navy3:colors.card, color:teamView===value?'#fff':colors.text, borderColor:teamView===value?colors.navy3:colors.line}}>{label}</button>
        ))}
      </div>

      {teamView === "addison" && assignmentOpen ? (
        <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
          <div>
            <div style={eyebrowStyle}>ADDISON</div>
            <h2 style={{ margin: "4px 0", color: colors.text }}>Add Task</h2>
          </div>
          <div className="atlas-addison-assignment-grid" style={{ display: "grid", gridTemplateColumns: "minmax(240px,1.5fr) minmax(145px,.7fr) minmax(150px,.8fr)", gap: 10 }}>
            <label style={labelStyle}>Task<input ref={assignmentTitleRef} value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveAddisonAssignment(); } }} placeholder="What does Addison need to do?" style={fieldStyle} autoFocus /></label>
            <label style={labelStyle}>Date<input type="date" value={assignmentDueDate} onChange={(event) => { setAssignmentDueDate(event.currentTarget.value); setAssignmentDay("Auto"); }} style={fieldStyle} /></label>
            <label style={labelStyle}>Repeat<select value={assignmentFrequency} onChange={(event) => setAssignmentFrequency(event.currentTarget.value as AssignmentFrequency)} style={fieldStyle}><option value="One-time">One time</option><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Biweekly">Every 2 weeks</option><option value="Monthly">Monthly</option></select></label>
            <div style={{ ...labelStyle, gridColumn: "1 / -1" }}><span>Day</span><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ADDISON_WEEKDAYS.map((day)=><button key={day} type="button" onClick={()=>{setAssignmentDay(day);setAssignmentDueDate(nextDateForWeekday(day));}} style={{...lightButtonStyle,background:assignmentDay===day?colors.navy3:colors.card,color:assignmentDay===day?"#fff":colors.text,borderColor:assignmentDay===day?colors.navy3:colors.line}}>{day.slice(0,3)}</button>)}</div></div>
            <label style={labelStyle}>Area<select value={assignmentLocationId} onChange={(event) => setAssignmentLocationId(event.currentTarget.value)} style={fieldStyle}><option value="">Anywhere / General</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            <label style={labelStyle}>Priority<select value={assignmentPriority} onChange={(event)=>setAssignmentPriority(event.currentTarget.value as "High"|"Medium"|"Low")} style={fieldStyle}><option value="High">Must Do</option><option value="Medium">Normal</option><option value="Low">If Time</option></select></label>
            <label style={{ ...labelStyle, gridColumn: "span 2" }}>Notes<textarea value={assignmentInstructions} onChange={(event) => setAssignmentInstructions(event.currentTarget.value)} placeholder="Optional" style={{ ...fieldStyle, minHeight: 58, resize: "vertical" }} /></label>
          </div>
          {assignmentMessage ? <div style={{ padding: "9px 11px", border: `1px solid ${colors.line}`, borderRadius: 10, background: colors.panel, color: colors.text, fontSize: 12, fontWeight: 800 }}>{assignmentMessage}</div> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void saveAddisonAssignment()} disabled={assignmentSaving} style={{ ...goldButtonStyle, opacity: assignmentSaving ? 0.65 : 1 }}>{assignmentSaving ? "Saving…" : "Add Task"}</button>
            <button type="button" onClick={() => { resetAssignmentForm(); setAssignmentOpen(false); }} disabled={assignmentSaving} style={lightButtonStyle}>Cancel</button>
          </div>
        </div>
      ) : null}

      {teamView === "addison" ? (
        activePropertyId !== "2000" ? (
          <div style={emptyStyle}>Addison is assigned to property 2000.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={summaryGridStyle}>
              <Stat
                label="Open"
                value={(addisonWork?.tasks || []).filter(
                  (task) => String(addisonMeta(task)?.status || "") !== "Completed",
                ).length}
              />
              <Stat
                label="Completed"
                value={(addisonWork?.tasks || []).filter(
                  (task) => String(addisonMeta(task)?.status || "") === "Completed",
                ).length}
              />
              <Stat label="Sync" value={addisonLoading ? "Loading" : "Live"} />
            </div>

            {addisonLiveMessage ? (
              <div style={{ ...panelStyle, padding: 10, fontWeight: 800, fontSize: 12 }}>
                {addisonLiveMessage}
              </div>
            ) : null}

            <div style={panelStyle}>
              <div style={editorHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>ASSIGNMENTS</div>
                  <h2 style={{ margin: "3px 0", color: colors.text }}>Addison Master Assignments</h2>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={goldButtonStyle} onClick={() => void prioritizeAddisonDay()}>
                    Prioritize
                  </button>
                  <button type="button" style={lightButtonStyle} onClick={() => void loadAddisonWork(true)}>
                    Refresh
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                {(addisonWork?.tasks || []).map((task) => {
                  const meta = addisonMeta(task);
                  const taskId = String(task.id || "");
                  const completed = String(meta?.status || "") === "Completed";
                  const editing = editingAddisonTaskId === taskId;
                  const locationLabel =
                    locations.find((location) => location.id === String(task.locationId || ""))?.name ||
                    String(task.locationId || "General");
                  return (
                    <div key={taskId} style={taskCardStyle}>
                      {editing ? (
                        <div style={{ display: "grid", gap: 9 }}>
                          <div className="atlas-addison-manager-edit-grid" style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(220px,1.4fr) minmax(145px,.7fr) minmax(150px,.8fr)",
                            gap: 8,
                          }}>
                            <label style={labelStyle}>Task<input value={editingTitle} onChange={(e) => setEditingTitle(e.currentTarget.value)} style={fieldStyle} /></label>
                            <label style={labelStyle}>Due date<input type="date" value={editingDueDate} onChange={(e) => { setEditingDueDate(e.currentTarget.value); setEditingDay("Auto"); }} style={fieldStyle} /></label>
                            <label style={labelStyle}>Frequency<select value={editingFrequency} onChange={(e) => setEditingFrequency(e.currentTarget.value as AssignmentFrequency)} style={fieldStyle}><option>One-time</option><option>Daily</option><option>Weekly</option><option>Biweekly</option><option>Monthly</option></select></label>
                            <div style={{ ...labelStyle, gridColumn:"1 / -1" }}><span>Day</span><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ADDISON_WEEKDAYS.map((day)=><button key={day} type="button" onClick={()=>{setEditingDay(day);setEditingDueDate(nextDateForWeekday(day));}} style={{...lightButtonStyle,background:editingDay===day?colors.navy3:colors.card,color:editingDay===day?"#fff":colors.text,borderColor:editingDay===day?colors.navy3:colors.line}}>{day.slice(0,3)}</button>)}<button type="button" onClick={()=>setEditingDay("Auto")} style={{...lightButtonStyle,background:editingDay==="Auto"?colors.navy3:colors.card,color:editingDay==="Auto"?"#fff":colors.text,borderColor:editingDay==="Auto"?colors.navy3:colors.line}}>As Needed</button></div></div>
                            <label style={labelStyle}>Location<select value={editingLocationId} onChange={(e) => setEditingLocationId(e.currentTarget.value)} style={fieldStyle}><option value="general">General property</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                            <label style={labelStyle}>Priority<select value={editingPriority} onChange={(e) => setEditingPriority(e.currentTarget.value as "High" | "Medium" | "Low")} style={fieldStyle}><option value="High">Must Do</option><option value="Medium">Normal</option><option value="Low">If Time</option></select></label>
                            <label style={labelStyle}>Time<select value={editingMinutes} onChange={(e) => setEditingMinutes(Number(e.currentTarget.value))} style={fieldStyle}><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={240}>Half day</option><option value={480}>Full day</option></select></label>
                          </div>
                          <label style={labelStyle}>Instructions<textarea value={editingInstructions} onChange={(e) => setEditingInstructions(e.currentTarget.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }} /></label>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={goldButtonStyle} onClick={() => void saveAddisonTaskEdit()}>Save</button>
                            <button type="button" style={lightButtonStyle} onClick={() => setEditingAddisonTaskId("")}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
                          <input
                            type="checkbox"
                            checked={completed}
                            onChange={() => void toggleAddisonLiveTask(task)}
                            style={{ width: 20, height: 20, marginTop: 2 }}
                          />
                          <div>
                            <strong style={{ color: colors.text, textDecoration: completed ? "line-through" : "none" }}>
                              {Number(meta?.addisonOrder || 0) > 0 ? `${Number(meta.addisonOrder)}. ` : ""}{String(task.title || "Task")}
                            </strong>
                            <div style={{ ...mutedStyle, marginTop: 4 }}>
                              {meta?.dueDate ? `Due ${String(meta.dueDate).slice(0,10)} · ` : ""}
                              {addisonFrequency(task)} · {locationLabel}
                              {dayFromTask(task) !== "Auto" ? ` · ${dayFromTask(task)}` : ""}
                              {task.priority ? ` · ${addisonPriorityLabel(task.priority)}` : ""}{addisonPaused(task) ? " · Paused" : ""}
                            </div>
                            {String(meta?.instructions || task.notes || "").trim() ? (
                              <div style={{ ...mutedStyle, marginTop: 5, color: colors.text }}>
                                {String(meta?.instructions || task.notes || "")}
                              </div>
                            ) : null}
                            {String(meta?.addisonNote || "").trim() ? (
                              <div style={{ ...mutedStyle, marginTop: 5 }}>
                                Addison: {String(meta.addisonNote)}
                              </div>
                            ) : null}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {!completed && !addisonPaused(task) ? <button type="button" style={lightButtonStyle} onClick={() => void moveAddisonTask(taskId, -1)}>↑</button> : null}
                            {!completed && !addisonPaused(task) ? <button type="button" style={lightButtonStyle} onClick={() => void moveAddisonTask(taskId, 1)}>↓</button> : null}
                            <button type="button" style={lightButtonStyle} onClick={() => beginEditAddisonTask(task)}>Edit</button>
                            {!completed ? <button type="button" style={lightButtonStyle} onClick={() => void toggleAddisonPause(task)}>{addisonPaused(task) ? "Resume" : "Pause"}</button> : null}
                            <button type="button" style={{ ...lightButtonStyle, color: colors.red }} onClick={() => void deleteAddisonLiveTask(taskId)}>Delete</button>
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
            <div style={panelStyle}>
              <div style={editorHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>HISTORY</div>
                  <h2 style={{ margin: "3px 0", color: colors.text }}>Addison History & Weekly Update</h2>
                </div>
                <button
                  type="button"
                  style={lightButtonStyle}
                  onClick={() => void copyAddisonWeeklySummary()}
                  disabled={!String(addisonWork?.weeklySummary || "").trim()}
                >
                  {historyCopied ? "Copied" : "Copy Weekly Update"}
                </button>
              </div>

              <div style={{
                marginTop: 12,
                padding: 12,
                border: `1px solid ${colors.line}`,
                borderRadius: 12,
                background: colors.panel,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.55,
                color: colors.text,
              }}>
                {String(addisonWork?.weeklySummary || "Addison\nNo completed work recorded this week yet.")}
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {(() => {
                  const completions = addisonWork?.history || [];
                  const dailyNotes = addisonWork?.dailyNotes || [];
                  const taskNotes = addisonWork?.taskNotes || [];
                  const dates = Array.from(new Set([
                    ...completions.map((item) => item.date),
                    ...dailyNotes.map((item) => item.date),
                    ...taskNotes.map((item) => item.date),
                  ].filter(Boolean))).sort((a, b) => b.localeCompare(a));

                  if (!dates.length) {
                    return <div style={emptyStyle}>No Addison history has been recorded yet.</div>;
                  }

                  return dates.slice(0, 30).map((date) => {
                    const dayCompletions = completions.filter((item) => item.date === date);
                    const dayDailyNotes = dailyNotes.filter((item) => item.date === date);
                    const dayTaskNotes = taskNotes.filter((item) => item.date === date);
                    return (
                      <details key={date} open={date === addisonWork?.today} style={{
                        border: `1px solid ${colors.line}`,
                        borderRadius: 12,
                        padding: 11,
                        background: colors.card,
                      }}>
                        <summary style={{ cursor: "pointer", fontWeight: 900, color: colors.text }}>
                          {formatAddisonHistoryDate(date)}
                          {dayCompletions.length ? ` · ${dayCompletions.length} completed` : ""}
                        </summary>
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {dayCompletions.map((item) => (
                            <div key={`done-${item.id}`} style={{ fontSize: 13, color: colors.text }}>
                              <strong>Completed:</strong> {item.title}
                              {item.locationName ? ` · ${item.locationName}` : ""}
                              {item.note ? <div style={{ ...mutedStyle, marginTop: 3 }}>Addison note: {item.note}</div> : null}
                              {Array.isArray(item.photos) && item.photos.length ? (
                                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 7 }}>
                                  {item.photos.map((photo, photoIndex) => {
                                    const src = String(photo?.url || photo?.dataUrl || photo?.data_url || photo?.src || "");
                                    if (!src) return null;
                                    return (
                                      <a key={`${item.id}-photo-${photoIndex}`} href={src} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                                        <img src={src} alt={`${item.title} photo ${photoIndex + 1}`} style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${colors.line}` }} />
                                      </a>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ))}
                          {dayDailyNotes.map((item) => (
                            <div key={`daily-${item.id}`} style={{ fontSize: 13, color: colors.text }}>
                              <strong>Daily note:</strong> {item.note}
                            </div>
                          ))}
                          {dayTaskNotes.map((item) => (
                            <div key={`tasknote-${item.id}`} style={{ fontSize: 13, color: colors.text }}>
                              <strong>Task note{item.taskTitle ? ` · ${item.taskTitle}` : ""}:</strong> {item.note}
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  });
                })()}
              </div>
            </div>

            </div>

          </div>
        )
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
      </> : null}

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
                  <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1.2fr) minmax(190px,1.4fr) minmax(140px,.7fr) auto auto",gap:8,alignItems:"center"}}>
                    <input value={member.name} onChange={(e)=>updateMember(member.id,{name:e.target.value})} style={{...fieldStyle,fontWeight:900}} />
                    {member.fieldOnly ? <div style={{...fieldStyle,display:"flex",alignItems:"center",color:colors.muted,fontWeight:800}}>No login · My Work link only</div> : <input value={member.email} onChange={(e)=>updateMember(member.id,{email:e.target.value})} style={fieldStyle} />}
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
                      <div style={{fontSize:11,color:colors.muted,fontWeight:800}}>{member.fieldOnly ? "Access: My Work link only" : `Invite status: ${member.inviteStatus || '—'}`}</div>{member.role === "Employee" ? <div style={{display:"grid",gap:7}}><div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}><button type="button" disabled={fieldLinkBusyId === member.id} onClick={()=>void manageFieldLink(member,false)} style={goldButtonStyle}>{fieldLinkBusyId === member.id ? "Working…" : member.fieldLinkActive ? (fieldLinkUrls[member.id] ? "Replace Link" : "Replace & Copy Link") : "Create My Work Link"}</button>{member.fieldLinkActive && fieldLinkUrls[member.id] ? <><button type="button" onClick={()=>void copyFieldLink(member)} style={lightButtonStyle}>Copy Link</button><button type="button" onClick={()=>openFieldLink(member)} style={lightButtonStyle}>Open</button></> : null}{member.fieldLinkActive ? <button type="button" disabled={fieldLinkBusyId === member.id} onClick={()=>void manageFieldLink(member,true)} style={lightButtonStyle}>Revoke</button> : null}<span style={{fontSize:11,color:colors.muted,fontWeight:800}}>No Atlas login required</span></div>{member.fieldLinkActive ? <div style={{fontSize:11,color:colors.muted,fontWeight:700}}>{fieldLinkUrls[member.id] ? "Link ready to send or test." : "Link active. Readable link is not stored; replace it when you need a new copy."}</div> : null}</div> : null}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={{margin:"0 0 4px",color:colors.text}}>Add Field Employee</h2>
            <p style={{...mutedStyle,margin:"0 0 12px"}}>No Atlas login or password. Creates a private My Work link for assigned tasks.</p>
            <div className="atlas-field-employee-create-grid" style={{display:"grid",gridTemplateColumns:"minmax(180px,1.3fr) minmax(170px,.8fr) auto",gap:8}}>
              <input value={fieldEmployeeName} onChange={(e)=>setFieldEmployeeName(e.target.value)} placeholder="Name" style={fieldStyle}/>
              <select value={fieldEmployeePropertyId} onChange={(e)=>setFieldEmployeePropertyId(e.target.value)} style={fieldStyle}>
                {PROPERTY_IDS.map((propertyId)=><option key={propertyId} value={propertyId}>{propertyId==='hangar'?'Hangar':propertyId}</option>)}
              </select>
              <button type="button" disabled={fieldEmployeeBusy} style={goldButtonStyle} onClick={()=>void addFieldEmployee()}>{fieldEmployeeBusy ? "Adding…" : "Add Field Employee"}</button>
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
          .atlas-field-employee-create-grid {
            grid-template-columns: 1fr !important;
          }
          .atlas-addison-assignment-grid,
          .atlas-addison-manager-edit-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
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
