"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type RoutineTask = {
  id: string;
  title: string;
  enabled: boolean;
  completed?: boolean;
  status?: "open" | "completed" | "skipped" | "deferred";
  assignedTo?: string;
  assigneeIds?: string[];
  deferredTo?: string;
  deferredFrom?: string;
};

type RoutineTemplate = {
  day: number;
  name: string;
  tasks: RoutineTask[];
};

type RoutineOccurrence = {
  date: string;
  day: number;
  name: string;
  tasks: RoutineTask[];
};

type Props = {
  mode: "dashboard" | "manager";
  isMobile?: boolean;
  onOpenManager?: () => void;
  activePropertyId?: string;
  onAddPhoto?: (task: { id: string; title: string }) => void;
  onAddNote?: (task: { id: string; title: string }) => void;
  onFlagProblem?: (task: { id: string; title: string }) => void;
  onAssignmentChange?: (task: { id: string; title: string; assignedTo: RoutineTask["assignedTo"]; date: string }) => void | Promise<void>;
  assigneeFilter?: RoutineTask["assignedTo"];
  allowTodayEditing?: boolean;
  defaultTodayAssignee?: RoutineTask["assignedTo"];
  employeeView?: boolean;
  teamDirectory?: Array<{
    id: string;
    name: string;
    email?: string;
    role?: string;
    active?: boolean;
    propertyIds?: string[];
  }>;
};

const dayNames = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const atlasWeeklyOperations: RoutineTemplate[] = [
  {
    day: 1,
    name: "Monday · Property Reset & Garage",
    tasks: [
      { id: "atlas-ops-mon-trash", title: "Move trash, recycling, and yard-waste cans to the street; clean cans after collection", enabled: true },
      { id: "atlas-ops-mon-reset", title: "Complete weekend cleanup and the interior/exterior walkthrough", enabled: true },
      { id: "atlas-ops-mon-review", title: "Review owner requests, urgent work, and overdue work", enabled: true },
      { id: "atlas-ops-mon-cleanup", title: "Clean geese debris and the dog area", enabled: true },
      { id: "atlas-ops-mon-garage", title: "Clean scheduled vehicles and check fuel or charge, tires, fluids, and warning lights", enabled: true },
      { id: "atlas-ops-mon-plan", title: "Process deliveries, restock supplies, plan the week, and delegate appropriate work", enabled: true },
      { id: "atlas-ops-mon-water", title: "Water pots and address lawn or planting dry spots", enabled: true },
    ],
  },
  {
    day: 2,
    name: "Tuesday · Dock, Waterfront & Recreation",
    tasks: [
      { id: "atlas-ops-tue-geese", title: "Clean geese debris from the dock and shoreline", enabled: true },
      { id: "atlas-ops-tue-dock", title: "Inspect dock boards, cleats, bumpers, dock boxes, and lighting", enabled: true },
      { id: "atlas-ops-tue-marine", title: "Inspect the Cobalt, Sea-Doo, lifts, covers, and rollers", enabled: true },
      { id: "atlas-ops-tue-recreation", title: "Inspect the sport court, trampoline, and recreation equipment", enabled: true },
      { id: "atlas-ops-tue-bbq", title: "Clean the BBQ and nearby outdoor work areas", enabled: true },
      { id: "atlas-ops-tue-lanken", title: "Review the Lanken half-day crew visit with Pat and record progress photos", enabled: true },
      { id: "atlas-ops-tue-meeting", title: "Attend the 10:00 AM weekly property meeting", enabled: true },
      { id: "atlas-ops-tue-water", title: "Water pots and address lawn or planting dry spots", enabled: true },
    ],
  },
  {
    day: 3,
    name: "Wednesday · Landscaping & Irrigation",
    tasks: [
      { id: "atlas-ops-wed-inspect", title: "Inspect lawns, beds, gardens, trees, pots, and specialty plantings", enabled: true },
      { id: "atlas-ops-wed-crew", title: "Review landscaping crew work and unfinished items", enabled: true },
      { id: "atlas-ops-wed-irrigation", title: "Check irrigation zones, heads, pressure, coverage, and dry spots", enabled: true },
      { id: "atlas-ops-wed-care", title: "Weed, prune, and hand-water where needed", enabled: true },
      { id: "atlas-ops-wed-veggie", title: "Inspect and maintain the veggie boxes", enabled: true },
      { id: "atlas-ops-wed-photos", title: "Photograph progress and record issues", enabled: true },
      { id: "atlas-ops-wed-repairs", title: "Create repair work orders for irrigation or landscape problems", enabled: true },
    ],
  },
  {
    day: 4,
    name: "Thursday · Pool, Spa & Outdoor Cleaning",
    tasks: [
      { id: "atlas-ops-thu-treatment", title: "Complete the linked Pool and Spa treatment and cleaning tasks", enabled: true },
      { id: "atlas-ops-thu-equipment", title: "Inspect Pool, Spa, filter pressure, equipment, and fountain", enabled: true },
      { id: "atlas-ops-thu-method", title: "Use the scheduled cleaning method: brush, hand vac, suction vac, or robot vac", enabled: true },
      { id: "atlas-ops-thu-outdoor", title: "Clean patio furniture, covers, outdoor heaters, and BBQ exterior", enabled: true },
      { id: "atlas-ops-thu-windows", title: "Clean skylights and complete this week’s rotating window zone", enabled: true },
      { id: "atlas-ops-thu-vehicles", title: "Finish vehicle cleaning when needed", enabled: true },
      { id: "atlas-ops-thu-water", title: "Water pots and address lawn or planting dry spots", enabled: true },
    ],
  },
  {
    day: 5,
    name: "Friday · Maintenance & Weekend Readiness",
    tasks: [
      { id: "atlas-ops-fri-grounds", title: "Mow, edge, blow, and complete final grounds presentation", enabled: true },
      { id: "atlas-ops-fri-mechanical", title: "Inspect boilers, pumps, HVAC, mechanical rooms, leaks, alarms, and temperatures", enabled: true },
      { id: "atlas-ops-fri-test", title: "Test important lights, doors, gates, and appliances", enabled: true },
      { id: "atlas-ops-fri-records", title: "Follow up with vendors and update Tasks, Work Orders, Projects, photos, and service history", enabled: true },
      { id: "atlas-ops-fri-walk", title: "Restock supplies and complete the final property walkthrough", enabled: true },
      { id: "atlas-ops-fri-meeting", title: "Attend the 9:00 AM Nick and Steve meeting", enabled: true },
      { id: "atlas-ops-fri-update", title: "Prepare the weekend, next week, and Friday owner-update draft", enabled: true },
      { id: "atlas-ops-fri-spiders", title: "April–October: remove spider webs and treat recurring exterior problem areas when appropriate", enabled: true },
    ],
  },
];

function normalizedRoutineText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const colors = {
  navy: "#071B2F",
  gold: "#C99A3D",
  bg: "#F4F7FB",
  line: "#DDE7F0",
  text: "#172331",
  muted: "#64748B",
  green: "#087443",
  red: "#B42318",
};

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createTaskId() {
  return `routine-task-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export default function AtlasRoutines({
  mode,
  isMobile = false,
  onOpenManager,
  activePropertyId = "2000",
  onAddPhoto,
  onAddNote,
  onFlagProblem,
  onAssignmentChange,
  assigneeFilter,
  allowTodayEditing = false,
  defaultTodayAssignee,
  employeeView = false,
  teamDirectory = [],
}: Props) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [occurrence, setOccurrence] =
    useState<RoutineOccurrence | null>(null);

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 7 : today;
  });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftTasks, setDraftTasks] = useState<RoutineTask[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("nick");
  const [newTask, setNewTask] = useState("");
  const [status, setStatus] = useState("Loading routines…");
  const [busy, setBusy] = useState(false);
  const [dashboardChecklistExpanded, setDashboardChecklistExpanded] = useState(false);
  const weeklySetupRunningRef = useRef(false);

  async function parseRoutineResponse(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};

    try {
      return JSON.parse(text) as Record<string, any>;
    } catch {
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error: "Atlas session was interrupted. Please try again.",
        };
      }

      return {
        ok: false,
        error: response.ok
          ? "Atlas returned an unreadable response. Please try again."
          : `Atlas request returned HTTP ${response.status}.`,
      };
    }
  }

  async function routineGetJson(url: string) {
    let lastResponse: Response | null = null;
    let lastPayload: Record<string, any> = {};

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(url, { cache: "no-store" });
      const payload = await parseRoutineResponse(response);
      lastResponse = response;
      lastPayload = payload;

      if (response.ok && payload?.ok !== false) {
        return { response, payload };
      }

      const sessionInterrupted = response.status === 401 || response.status === 403;
      if (sessionInterrupted && attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        continue;
      }

      break;
    }

    return { response: lastResponse, payload: lastPayload };
  }

  async function routinePost(body: Record<string, unknown>) {
    let lastError = "Routine save failed.";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch("/api/atlas-routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      const payload = await parseRoutineResponse(response);

      if (response.ok && payload?.ok !== false) {
        return payload;
      }

      lastError =
        payload?.error ||
        `Routine save returned HTTP ${response.status}.`;

      const hydrationRace =
        response.status === 404 &&
        /not found|does not exist|missing/i.test(
          String(payload?.error || payload?.message || ""),
        );

      if (hydrationRace && attempt < 3) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, attempt * 450),
        );
        continue;
      }

      throw new Error(lastError);
    }

    throw new Error(lastError);
  }

  async function mergeWeeklyOperations(currentTemplates: RoutineTemplate[]) {
    if (weeklySetupRunningRef.current) return currentTemplates;
    weeklySetupRunningRef.current = true;
    try {
      const mergedTemplates = atlasWeeklyOperations.map((operationsTemplate) => {
        const current = currentTemplates.find((template) => template.day === operationsTemplate.day) || {
          day: operationsTemplate.day,
          name: operationsTemplate.name,
          tasks: [],
        };
        const existingIds = new Set(current.tasks.map((task) => task.id));
        const existingTitles = new Set(current.tasks.map((task) => normalizedRoutineText(task.title)));
        const missing = operationsTemplate.tasks.filter((task) => !existingIds.has(task.id) && !existingTitles.has(normalizedRoutineText(task.title)));
        return {
          ...current,
          name: current.name?.trim() || operationsTemplate.name,
          tasks: [...current.tasks, ...missing],
          changed: missing.length > 0,
        };
      });
      const changed = mergedTemplates.filter((template) => template.changed);
      for (const template of changed) {
        const response = await fetch("/api/atlas-routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-template",
            propertyId: activePropertyId,
            day: template.day,
            name: template.name,
            tasks: template.tasks,
          }),
        });
        const payload = await parseRoutineResponse(response);
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error || `${dayNames[template.day]} routine did not save`);
        }
      }
      const operationsDays = new Set(atlasWeeklyOperations.map((template) => template.day));
      const untouchedTemplates = currentTemplates.filter((template) => !operationsDays.has(template.day));
      return [...mergedTemplates.map(({ changed: _changed, ...template }) => template), ...untouchedTemplates].sort((a, b) => a.day - b.day);
    } finally {
      weeklySetupRunningRef.current = false;
    }
  }

  async function load() {
    setStatus("Loading routines…");

    try {
      const { response, payload } = await routineGetJson(
        `/api/atlas-routines?date=${todayKey()}&propertyId=${encodeURIComponent(activePropertyId)}`,
      );

      if (!response || !response.ok || !payload.ok) {
        throw new Error(
          payload.error ||
            (response?.status === 401 || response?.status === 403
              ? "Atlas session was interrupted. Please try again."
              : "Could not load routines"),
        );
      }

      const loadedTemplates = Array.isArray(payload.templates) ? payload.templates : [];
      const mergedTemplates = await mergeWeeklyOperations(loadedTemplates);
      setTemplates(mergedTemplates);

      setOccurrence(payload.occurrence || null);
      setStatus("");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not load routines"
      );
    }
  }

  useEffect(() => {
    void load();
  }, [activePropertyId]);

  const selected = useMemo(
    () =>
      templates.find(
        (template) => template.day === selectedDay
      ) || null,
    [templates, selectedDay]
  );

  useEffect(() => {
    if (!selected || editing) {
      return;
    }

    setDraftName(selected.name);

    setDraftTasks(
      selected.tasks.map((task) => ({
        ...task,
      }))
    );
  }, [selected, editing]);

  async function toggleTask(taskId: string) {
    if (!occurrence || busy) {
      return;
    }

    const previous = occurrence;

    setOccurrence({
      ...occurrence,
      tasks: occurrence.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      ),
    });

    setBusy(true);

    try {
      const payload = await routinePost({
        action: "toggle-task",
        propertyId: activePropertyId,
        date: occurrence.date,
        taskId,
      });

      if (payload.occurrence) {
        setOccurrence(payload.occurrence);
      }
    } catch (error) {
      setOccurrence(previous);

      setStatus(
        error instanceof Error
          ? error.message
          : "Task did not save"
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateTodayTask(action: "skip-task" | "defer-task" | "assign-task", taskId: string, assignedTo?: RoutineTask["assignedTo"]) {
    if (!occurrence || busy) return;
    const previous = occurrence;
    setBusy(true);
    setStatus(action === "defer-task" ? "Moving…" : "Saving…");
    try {
      const payload = await routinePost({
        action,
        propertyId: activePropertyId,
        date: occurrence.date,
        taskId,
        assignedTo,
      });
      if (payload.occurrence) setOccurrence(payload.occurrence);
      if (action === "assign-task" && assignedTo) {
        const savedTask = (payload.occurrence?.tasks || occurrence.tasks).find((task: RoutineTask) => task.id === taskId);
        if (savedTask) await onAssignmentChange?.({ id: savedTask.id, title: savedTask.title, assignedTo, date: occurrence.date });
      }
      setStatus(action === "defer-task" && payload.movedTo ? `Moved to ${new Date(`${payload.movedTo}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.` : "Saved.");
    } catch (error) {
      setOccurrence(previous);
      setStatus(error instanceof Error ? error.message : "Routine item did not save");
    } finally {
      setBusy(false);
    }
  }


  async function mutateTodayOccurrence(
    action: "add-today-task" | "edit-today-task" | "delete-today-task",
    payload: Record<string, unknown>,
  ) {
    if (!occurrence || busy) return;
    setBusy(true);
    setStatus(action === "add-today-task" ? "Adding…" : "Saving…");
    try {
      const result = await routinePost({
        action,
        propertyId: activePropertyId,
        date: occurrence.date,
        ...payload,
      });
      if (result.occurrence) setOccurrence(result.occurrence);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Routine item did not save");
    } finally {
      setBusy(false);
    }
  }

  async function addTodayOccurrenceTask() {
    if (!occurrence) return;
    const title = window.prompt("Add to today’s routine")?.trim();
    if (!title) return;
    await mutateTodayOccurrence("add-today-task", {
      title,
      assignedTo: defaultTodayAssignee || assigneeFilter || "Nick",
    });
  }

  async function editTodayOccurrenceTask(task: RoutineTask) {
    const title = window.prompt("Edit today’s routine item", task.title)?.trim();
    if (!title || title === task.title) return;
    await mutateTodayOccurrence("edit-today-task", { taskId: task.id, title });
  }

  async function deleteTodayOccurrenceTask(task: RoutineTask) {
    if (!window.confirm(`Remove “${task.title}” from today only?`)) return;
    await mutateTodayOccurrence("delete-today-task", { taskId: task.id });
  }

  const activeRoutinePeople = teamDirectory.filter(
    (member) =>
      member.active !== false &&
      (!member.propertyIds?.length ||
        member.propertyIds.includes(activePropertyId)),
  );

  function routinePersonId(member: { id?: string; email?: string; name?: string }) {
    return String(member.id || member.email || member.name || "").trim();
  }

  function routinePersonName(personId: string) {
    return (
      activeRoutinePeople.find(
        (member) => routinePersonId(member) === personId,
      )?.name || personId
    );
  }

  const nickRoutinePersonId =
    routinePersonId(
      activeRoutinePeople.find(
        (member) => member.name.trim().toLowerCase() === "nick",
      ) || { id: "nick", name: "Nick" },
    ) || "nick";

  const effectiveSelectedPersonId =
    selectedPersonId === "nick" ? nickRoutinePersonId : selectedPersonId;

  function taskAssigneeIds(task: RoutineTask) {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length) {
      return task.assigneeIds.map(String);
    }

    // All routine items that predate universal assignments belong to Nick.
    if (!task.assignedTo || String(task.assignedTo).toLowerCase() === "nick") {
      return [nickRoutinePersonId];
    }

    const legacy = activeRoutinePeople.find(
      (member) =>
        member.name.toLowerCase() === String(task.assignedTo).toLowerCase(),
    );
    return legacy ? [routinePersonId(legacy)] : [];
  }

  function setTaskPerson(taskIndex: number, personId: string, checked: boolean) {
    setDraftTasks((current) =>
      current.map((task, index) => {
        if (index !== taskIndex) return task;
        const currentIds = taskAssigneeIds(task);
        const assigneeIds = checked
          ? Array.from(new Set([...currentIds, personId]))
          : currentIds.filter((id) => id !== personId);
        return {
          ...task,
          assigneeIds,
          assignedTo:
            assigneeIds.length === 1
              ? routinePersonName(assigneeIds[0])
              : assigneeIds.length > 1
                ? "Multiple"
                : "",
        };
      }),
    );
  }

  function assignVisibleRoutineToPerson(personId: string) {
    if (!personId || personId === "all") return;
    setDraftTasks((current) =>
      current.map((task) => ({
        ...task,
        assigneeIds: Array.from(
          new Set([...taskAssigneeIds(task), personId]),
        ),
        assignedTo:
          Array.from(new Set([...taskAssigneeIds(task), personId])).length === 1
            ? routinePersonName(personId)
            : "Multiple",
      })),
    );
  }

  function beginEdit() {
    if (!selected) {
      return;
    }

    setDraftName(selected.name);

    setDraftTasks(
      selected.tasks.map((task) => ({
        ...task,
      }))
    );

    setEditing(true);
    setStatus("");
  }

  function addTask() {
    const title = newTask.trim();

    if (!title) {
      return;
    }

    setDraftTasks((current) => [
      ...current,
      {
        id: createTaskId(),
        title,
        enabled: true,
        assignedTo:
          effectiveSelectedPersonId !== "all"
            ? routinePersonName(effectiveSelectedPersonId)
            : "",
        assigneeIds:
          effectiveSelectedPersonId !== "all" ? [effectiveSelectedPersonId] : [],
      },
    ]);

    setNewTask("");
  }

  function moveTask(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= draftTasks.length
    ) {
      return;
    }

    setDraftTasks((current) => {
      const copy = [...current];

      [copy[index], copy[nextIndex]] = [
        copy[nextIndex],
        copy[index],
      ];

      return copy;
    });
  }

  async function moveToDay(index: number, nextDay: number) {
    if (nextDay === selectedDay) {
      return;
    }

    const task = draftTasks[index];

    const target = templates.find(
      (template) => template.day === nextDay
    );

    if (!task || !target) {
      return;
    }

    setBusy(true);

    try {
      const sourceTasks = draftTasks.filter(
        (_, taskIndex) => taskIndex !== index
      );

      const targetTasks = [...target.tasks, task];

      const responses = await Promise.all([
        fetch("/api/atlas-routines", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "save-template",
            propertyId: activePropertyId,
            day: selectedDay,
            name: draftName,
            tasks: sourceTasks,
          }),
        }),
        fetch("/api/atlas-routines", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "save-template",
            propertyId: activePropertyId,
            day: nextDay,
            name: target.name,
            tasks: targetTasks,
          }),
        }),
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error("Task could not be moved");
      }

      setDraftTasks(sourceTasks);

      await load();

      setStatus(`Moved to ${dayNames[nextDay]}.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Task could not be moved"
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!selected || busy) {
      return;
    }

    setBusy(true);
    setStatus("Saving…");

    try {
      const payload = await routinePost({
        action: "save-template",
        propertyId: activePropertyId,
        date: todayKey(),
        day: selectedDay,
        name:
          draftName.trim() ||
          `${dayNames[selectedDay]} Routine`,
        tasks: draftTasks,
      });

      // Keep the dashboard occurrence in sync immediately after the save.
      // This prevents a newly added/edited task from being acted on against
      // the pre-save occurrence while the follow-up reload is still running.
      if (payload.occurrence) {
        setOccurrence(payload.occurrence);
      }

      setEditing(false);

      await load();

      setStatus("Routine saved.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Routine did not save"
      );
    } finally {
      setBusy(false);
    }
  }

  const panel: React.CSSProperties = {
    background: "#FFFFFF",
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    padding: isMobile ? 14 : 18,
    color: colors.text,
  };

  const button: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    padding: "9px 12px",
    background: "#FFFFFF",
    color: colors.text,
    fontWeight: 800,
    cursor: "pointer",
  };

  if (mode === "dashboard") {
    const dashboardTasks =
      occurrence?.tasks.filter((task) => {
        if (!assigneeFilter) return true;
        if (task.assignedTo === assigneeFilter) return true;
        const target = activeRoutinePeople.find(
          (member) =>
            member.name.toLowerCase() === String(assigneeFilter).toLowerCase(),
        );
        return target
          ? taskAssigneeIds(task).includes(routinePersonId(target))
          : false;
      }) || [];

    const completed = dashboardTasks.filter((task) => task.completed).length;

    const resolved = dashboardTasks.filter(
      (task) =>
        task.completed ||
        task.status === "skipped" ||
        task.status === "deferred",
    ).length;

    const total = dashboardTasks.length;

    return (
      <section style={panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                color: colors.gold,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              Today
            </div>

            <h2
              style={{
                margin: "3px 0 0",
                color: colors.navy,
                fontSize: 22,
              }}
            >
              {occurrence?.name || "Daily Routine"}
            </h2>
          </div>

          {onOpenManager ? (
            <button
              type="button"
              style={button}
              onClick={onOpenManager}
            >
              Open Routines
            </button>
          ) : null}
        </div>

        {status ? (
          <div
            style={{
              color: colors.muted,
              fontSize: 14,
            }}
          >
            {status}
          </div>
        ) : null}

        {!status && !occurrence ? (
          <div style={{ color: colors.muted }}>
            No weekday routine is scheduled today.
          </div>
        ) : null}

        {occurrence && total === 0 ? (
          <div style={{ color: colors.muted }}>
            {employeeView ? "No routine items are assigned to you today." : "No tasks have been added to today’s routine yet."}
          </div>
        ) : null}

        {occurrence && total > 0 ? (
          <>
            {(() => {
              const openTasks = dashboardTasks.filter(
                (task) =>
                  !task.completed &&
                  task.status !== "skipped" &&
                  task.status !== "deferred",
              );
              const nextTask = openTasks[0] || null;
              const visibleTasks = dashboardChecklistExpanded
                ? dashboardTasks
                : dashboardTasks.slice(0, 7);

              return (
                <>
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 5,
                      marginBottom: 9,
                      padding: "10px 11px",
                      border: `1px solid ${colors.gold}`,
                      borderRadius: 11,
                      background:
                        "linear-gradient(135deg, #FFF8E7 0%, #FFFFFF 78%)",
                      boxShadow: "0 7px 18px rgba(7,27,47,.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: colors.gold,
                            fontSize: 10,
                            fontWeight: 950,
                            letterSpacing: ".09em",
                            textTransform: "uppercase",
                          }}
                        >
                          Next Task
                        </div>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 2,
                            color: colors.navy,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {nextTask?.title || "Routine complete"}
                        </strong>
                      </div>
                      <span
                        style={{
                          flex: "0 0 auto",
                          color: colors.navy,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {resolved}/{total}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        marginTop: 8,
                        borderRadius: 99,
                        overflow: "hidden",
                        background: "#E8EDF3",
                      }}
                    >
                      <div
                        style={{
                          width: `${total ? (resolved / total) * 100 : 0}%`,
                          height: "100%",
                          borderRadius: 99,
                          background: colors.gold,
                          transition: "width 180ms ease",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 7,
                    }}
                  >
                    {visibleTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="atlas-routine-dashboard-row"
                        style={{
                          display: "grid",
                          gap: 7,
                          padding: "8px 9px",
                          border: `1px solid ${
                            task.completed ? "#B8E0CD" : colors.line
                          }`,
                          borderLeft: `4px solid ${
                            task.completed
                              ? colors.green
                              : task.status === "skipped" ||
                                  task.status === "deferred"
                                ? "#A8B4C2"
                                : index === 0
                                  ? colors.gold
                                  : colors.line
                          }`,
                          borderRadius: 10,
                          background: task.completed
                            ? "#F2FBF6"
                            : task.status === "skipped" ||
                                task.status === "deferred"
                              ? "#F8FAFC"
                              : "#FFFFFF",
                          boxShadow:
                            index === 0 &&
                            !task.completed &&
                            task.status !== "skipped" &&
                            task.status !== "deferred"
                              ? "0 6px 16px rgba(7,27,47,.07)"
                              : "none",
                          transition:
                            "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(task.completed)}
                            disabled={
                              busy ||
                              task.status === "skipped" ||
                              task.status === "deferred"
                            }
                            onChange={() => void toggleTask(task.id)}
                            style={{
                              width: 18,
                              height: 18,
                              accentColor: colors.green,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              textDecoration:
                                task.completed ||
                                task.status === "skipped" ||
                                task.status === "deferred"
                                  ? "line-through"
                                  : "none",
                              color:
                                task.completed ||
                                task.status === "skipped" ||
                                task.status === "deferred"
                                  ? colors.muted
                                  : colors.text,
                              fontWeight: 750,
                              lineHeight: 1.35,
                            }}
                          >
                            {task.title}
                          </span>
                          {task.status === "skipped" ? (
                            <small
                              style={{ color: colors.muted, fontWeight: 900 }}
                            >
                              Skipped
                            </small>
                          ) : task.status === "deferred" ? (
                            <small
                              style={{ color: colors.gold, fontWeight: 900 }}
                            >
                              Moved
                            </small>
                          ) : null}
                        </label>

                        {!task.completed &&
                        task.status !== "skipped" &&
                        task.status !== "deferred" ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 5,
                              flexWrap: "wrap",
                              alignItems: "center",
                              paddingLeft: isMobile ? 0 : 27,
                            }}
                          >
                            {!employeeView ? (
                            <>
                            <select
                              aria-label={`Assign ${task.title}`}
                              value={task.assignedTo || "Nick"}
                              disabled={busy}
                              onChange={(event) =>
                                void updateTodayTask(
                                  "assign-task",
                                  task.id,
                                  event.currentTarget
                                    .value as RoutineTask["assignedTo"],
                                )
                              }
                              style={{
                                ...button,
                                minHeight: 28,
                                padding: "3px 7px",
                                fontSize: 11,
                              }}
                            >
                              <option>Nick</option>
                              <option>Addison</option>
                              <option>Pat</option>
                              <option>Crew</option>
                            </select>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void updateTodayTask("skip-task", task.id)
                              }
                              style={{
                                ...button,
                                minHeight: 28,
                                padding: "3px 7px",
                                fontSize: 11,
                              }}
                            >
                              Skip Today
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void updateTodayTask("defer-task", task.id)
                              }
                              style={{
                                ...button,
                                minHeight: 28,
                                padding: "3px 7px",
                                fontSize: 11,
                              }}
                            >
                              Next Workday
                            </button>

                            </>
                            ) : allowTodayEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void editTodayOccurrenceTask(task)}
                                  style={{ ...button, minHeight: 28, padding: "3px 7px", fontSize: 11 }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void deleteTodayOccurrenceTask(task)}
                                  style={{ ...button, minHeight: 28, padding: "3px 7px", fontSize: 11, color: colors.red }}
                                >
                                  Remove Today
                                </button>
                              </>
                            ) : null}

                            {onAddPhoto || onAddNote || onFlagProblem ? (
                              <details style={{ position: "relative" }}>
                                <summary
                                  aria-label={`More actions for ${task.title}`}
                                  style={{
                                    listStyle: "none",
                                    minWidth: 29,
                                    minHeight: 28,
                                    display: "grid",
                                    placeItems: "center",
                                    border: `1px solid ${colors.line}`,
                                    borderRadius: 9,
                                    background: "#FFFFFF",
                                    color: colors.navy,
                                    fontSize: 16,
                                    fontWeight: 950,
                                    cursor: "pointer",
                                  }}
                                >
                                  •••
                                </summary>
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "calc(100% + 5px)",
                                    zIndex: 30,
                                    minWidth: 126,
                                    display: "grid",
                                    gap: 4,
                                    padding: 6,
                                    border: `1px solid ${colors.line}`,
                                    borderRadius: 10,
                                    background: "#FFFFFF",
                                    boxShadow:
                                      "0 12px 28px rgba(7,27,47,.16)",
                                  }}
                                >
                                  {onAddPhoto ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onAddPhoto(task)}
                                      style={{
                                        ...button,
                                        minHeight: 29,
                                        padding: "4px 8px",
                                        fontSize: 11,
                                        textAlign: "left",
                                      }}
                                    >
                                      Add Photo
                                    </button>
                                  ) : null}
                                  {onAddNote ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onAddNote(task)}
                                      style={{
                                        ...button,
                                        minHeight: 29,
                                        padding: "4px 8px",
                                        fontSize: 11,
                                        textAlign: "left",
                                      }}
                                    >
                                      Add Note
                                    </button>
                                  ) : null}
                                  {onFlagProblem ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onFlagProblem(task)}
                                      style={{
                                        ...button,
                                        minHeight: 29,
                                        padding: "4px 8px",
                                        fontSize: 11,
                                        color: colors.red,
                                        textAlign: "left",
                                      }}
                                    >
                                      Flag Problem
                                    </button>
                                  ) : null}
                                </div>
                              </details>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {dashboardTasks.length > 7 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDashboardChecklistExpanded((current) => !current)
                      }
                      style={{
                        ...button,
                        width: "100%",
                        minHeight: 34,
                        marginTop: 9,
                        padding: "6px 10px",
                        borderColor: `${colors.gold}88`,
                        color: colors.navy,
                        fontSize: 12,
                      }}
                    >
                      {dashboardChecklistExpanded
                        ? "Show fewer checklist items"
                        : `Show all ${dashboardTasks.length} checklist items`}
                    </button>
                  ) : null}
                </>
              );
            })()}

            {allowTodayEditing ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void addTodayOccurrenceTask()}
                style={{ ...button, width: "100%", marginTop: 10, borderColor: colors.gold }}
              >
                + Add to Today’s Routine
              </button>
            ) : null}

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <strong>
                {completed} complete · {resolved} of {total} handled
              </strong>

              <div
                style={{
                  width: 150,
                  height: 8,
                  borderRadius: 99,
                  background: colors.bg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${
                      total
                        ? (resolved / total) * 100
                        : 0
                    }%`,
                    height: "100%",
                    background: colors.gold,
                    transition: "width 180ms ease",
                  }}
                />
              </div>
            </div>

            <style>{`
              .atlas-routine-dashboard-row:hover {
                transform: translateY(-1px);
                box-shadow: 0 7px 18px rgba(7, 27, 47, 0.09) !important;
                border-color: rgba(201, 154, 61, 0.52) !important;
              }
              .atlas-routine-dashboard-row details > summary::-webkit-details-marker {
                display: none;
              }
              @media (prefers-reduced-motion: reduce) {
                .atlas-routine-dashboard-row {
                  transition: none !important;
                }
              }
            `}</style>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section
      style={{
        ...panel,
        display: "grid",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          background: `linear-gradient(135deg, ${colors.navy}, #173E68)`,
          color: "#FFFFFF",
          borderRadius: 14,
          padding: isMobile ? 14 : "15px 17px",
        }}
      >
        <div>
          <div
            style={{
              color: "#E8C778",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Weekly Operations
          </div>

          <h1
            style={{
              margin: "4px 0 3px",
              color: "#FFFFFF",
            }}
          >
            Routines
          </h1>

        </div>

        {!editing ? (
          <button
            type="button"
            style={{
              ...button,
              background: colors.gold,
              borderColor: colors.gold,
              color: colors.navy,
            }}
            onClick={beginEdit}
          >
            Edit Routine
          </button>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 7 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Routine For
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => { setSelectedPersonId("all"); setEditing(false); }}
            style={{
              ...button,
              background: selectedPersonId === "all" ? colors.navy : "#FFFFFF",
              color: selectedPersonId === "all" ? "#FFFFFF" : colors.text,
            }}
          >
            All Routines
          </button>
          {activeRoutinePeople.map((member) => {
            const personId = routinePersonId(member);
            const active = effectiveSelectedPersonId === personId;
            return (
              <button
                key={personId}
                type="button"
                onClick={() => { setSelectedPersonId(personId); setEditing(false); }}
                style={{
                  ...button,
                  background: active ? colors.navy : "#FFFFFF",
                  color: active ? "#FFFFFF" : colors.text,
                }}
              >
                {member.name}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(7, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => {
              setSelectedDay(day);
              setEditing(false);
              setStatus("");
            }}
            style={{
              ...button,
              background:
                selectedDay === day
                  ? colors.navy
                  : "#FFFFFF",
              color:
                selectedDay === day
                  ? "#FFFFFF"
                  : colors.text,
              borderColor:
                selectedDay === day
                  ? colors.navy
                  : colors.line,
            }}
          >
            {dayNames[day]}
          </button>
        ))}
      </div>

      {selected ? (
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {editing ? (
            <>
              {effectiveSelectedPersonId !== "all" ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={button}
                    onClick={() => assignVisibleRoutineToPerson(effectiveSelectedPersonId)}
                  >
                    Assign All to {routinePersonName(effectiveSelectedPersonId)}
                  </button>
                </div>
              ) : null}
              <input
              value={draftName}
              onChange={(event) =>
                setDraftName(event.currentTarget.value)
              }
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 10,
                padding: "11px 12px",
                fontSize: 18,
                fontWeight: 800,
              }}
            />
            </>
          ) : (
            <h2
              style={{
                margin: 0,
                color: colors.navy,
              }}
            >
              {selected.name}
            </h2>
          )}

          {!editing && selected.tasks.length === 0 ? (
            <div style={{ color: colors.muted }}>
              No tasks have been added yet.
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {(editing ? draftTasks : selected.tasks)
              .map((task, originalIndex) => ({ task, originalIndex }))
              .filter(({ task }) =>
                effectiveSelectedPersonId === "all"
                  ? true
                  : taskAssigneeIds(task).includes(effectiveSelectedPersonId)
              )
              .map(({ task, originalIndex }) => {
                const index = originalIndex;
                return (
                <div
                  key={task.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: editing
                      ? isMobile
                        ? "1fr"
                        : "minmax(0, 1fr) auto auto auto auto"
                      : "1fr",
                    gap: 8,
                    alignItems: "center",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 11,
                    padding: 10,
                  }}
                >
                  {editing ? (
                    <input
                      value={task.title}
                      onChange={(event) =>
                        setDraftTasks((current) =>
                          current.map(
                            (item, taskIndex) =>
                              taskIndex === index
                                ? {
                                    ...item,
                                    title:
                                      event.currentTarget.value,
                                  }
                                : item
                          )
                        )
                      }
                      style={{
                        border: 0,
                        outline: 0,
                        fontWeight: 700,
                        minWidth: 0,
                      }}
                    />
                  ) : (
                    <span>
                      <strong style={{ display: "block" }}>{task.title}</strong>
                      {taskAssigneeIds(task).length ? (
                        <small style={{ color: colors.muted }}>
                          {taskAssigneeIds(task).map(routinePersonName).join(", ")}
                        </small>
                      ) : null}
                    </span>
                  )}

                  {editing ? (
                    <>
                      <details style={{ position: "relative" }}>
                        <summary style={{ ...button, listStyle: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                          {taskAssigneeIds(task).length
                            ? `${taskAssigneeIds(task).length} assigned`
                            : "Assign"}
                        </summary>
                        <div style={{
                          position: "absolute",
                          zIndex: 20,
                          right: 0,
                          top: "calc(100% + 5px)",
                          minWidth: 210,
                          display: "grid",
                          gap: 6,
                          padding: 9,
                          border: `1px solid ${colors.line}`,
                          borderRadius: 10,
                          background: "#FFFFFF",
                          boxShadow: "0 10px 28px rgba(15,23,42,.14)",
                        }}>
                          {activeRoutinePeople.map((member) => {
                            const personId = routinePersonId(member);
                            const checked = taskAssigneeIds(task).includes(personId);
                            return (
                              <label key={personId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) =>
                                    setTaskPerson(index, personId, event.currentTarget.checked)
                                  }
                                />
                                {member.name}
                              </label>
                            );
                          })}
                        </div>
                      </details>
                      <div
                        style={{
                          display: "flex",
                          gap: 5,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Move up"
                          style={button}
                          onClick={() => moveTask(index, -1)}
                        >
                          Up
                        </button>

                        <button
                          type="button"
                          aria-label="Move down"
                          style={button}
                          onClick={() => moveTask(index, 1)}
                        >
                          Down
                        </button>
                      </div>

                      <select
                        value={selectedDay}
                        onChange={(event) =>
                          void moveToDay(
                            index,
                            Number(event.currentTarget.value)
                          )
                        }
                        style={{
                          ...button,
                          fontWeight: 700,
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <option key={day} value={day}>
                            {day === selectedDay
                              ? "Move to..."
                              : dayNames[day]}
                          </option>
                        ))}
                      </select>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <button
                          type="button"
                          style={button}
                          onClick={() =>
                            setDraftTasks((current) =>
                              current.map(
                                (item, taskIndex) =>
                                  taskIndex === index
                                    ? {
                                        ...item,
                                        enabled:
                                          !item.enabled,
                                      }
                                    : item
                              )
                            )
                          }
                        >
                          {task.enabled ? "On" : "Off"}
                        </button>

                        <button
                          type="button"
                          style={{
                            ...button,
                            color: colors.red,
                          }}
                          onClick={() =>
                            setDraftTasks((current) =>
                              current.filter(
                                (_, taskIndex) =>
                                  taskIndex !== index
                              )
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              );
              })}
          </div>

          {editing ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 8,
                }}
              >
                <input
                  value={newTask}
                  onChange={(event) =>
                    setNewTask(event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTask();
                    }
                  }}
                  placeholder="Add a task"
                  style={{
                    flex: 1,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 10,
                    padding: "10px 11px",
                  }}
                />

                <button
                  type="button"
                  style={button}
                  onClick={addTask}
                >
                  + Add Task
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  style={button}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={busy}
                  style={{
                    ...button,
                    background: colors.gold,
                    borderColor: colors.gold,
                    color: colors.navy,
                  }}
                  onClick={() => void saveTemplate()}
                >
                  Save Routine
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {status ? (
        <div
          style={{
            color:
              status.includes("failed") ||
              status.includes("could not")
                ? colors.red
                : colors.muted,
          }}
        >
          {status}
        </div>
      ) : null}
    </section>
  );
}
