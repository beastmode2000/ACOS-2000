"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type RoutineTask = {
  id: string;
  title: string;
  enabled: boolean;
  completed?: boolean;
  status?: "open" | "completed" | "skipped" | "deferred";
  assignedTo?: "Nick" | "Addison" | "Pat" | "Crew";
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
      { id: "atlas-ops-thu-outdoor", title: "Clean patio furniture, covers, outdoor heaters, BBQ exterior, and skylights", enabled: true },
      { id: "atlas-ops-thu-windows", title: "Complete this week’s rotating window zone", enabled: true },
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
  const [newTask, setNewTask] = useState("");
  const [status, setStatus] = useState("Loading routines…");
  const [busy, setBusy] = useState(false);
  const weeklySetupRunningRef = useRef(false);

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
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok === false) throw new Error(payload.error || `${dayNames[template.day]} routine did not save`);
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
      const response = await fetch(
        `/api/atlas-routines?date=${todayKey()}&propertyId=${encodeURIComponent(activePropertyId)}`,
        {
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not load routines");
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
      const response = await fetch("/api/atlas-routines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle-task",
          propertyId: activePropertyId,
          date: occurrence.date,
          taskId,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Task did not save");
      }

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
      const response = await fetch("/api/atlas-routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, propertyId: activePropertyId, date: occurrence.date, taskId, assignedTo }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Routine item did not save");
      if (payload.occurrence) setOccurrence(payload.occurrence);
      setStatus(action === "defer-task" && payload.movedTo ? `Moved to ${new Date(`${payload.movedTo}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.` : "Saved.");
    } catch (error) {
      setOccurrence(previous);
      setStatus(error instanceof Error ? error.message : "Routine item did not save");
    } finally {
      setBusy(false);
    }
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
        assignedTo: "Nick",
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
      const response = await fetch("/api/atlas-routines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save-template",
          propertyId: activePropertyId,
          day: selectedDay,
          name:
            draftName.trim() ||
            `${dayNames[selectedDay]} Routine`,
          tasks: draftTasks,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error || "Routine did not save"
        );
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
    const completed =
      occurrence?.tasks.filter((task) => task.completed).length || 0;

    const resolved = occurrence?.tasks.filter((task) => task.completed || task.status === "skipped" || task.status === "deferred").length || 0;

    const total = occurrence?.tasks.length || 0;

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
            No tasks have been added to today&apos;s routine yet.
          </div>
        ) : null}

        {occurrence && total > 0 ? (
          <>
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {occurrence.tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "10px 11px",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 11,
                    background: task.completed ? "#F2FBF6" : task.status === "skipped" || task.status === "deferred" ? "#F8FAFC" : "#FFFFFF",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(task.completed)} disabled={busy || task.status === "skipped" || task.status === "deferred"} onChange={() => void toggleTask(task.id)} style={{ width: 19, height: 19, accentColor: colors.green }} />
                    <span style={{ flex: 1, textDecoration: task.completed || task.status === "skipped" || task.status === "deferred" ? "line-through" : "none", color: task.completed || task.status === "skipped" || task.status === "deferred" ? colors.muted : colors.text, fontWeight: 700 }}>{task.title}</span>
                    {task.status === "skipped" ? <small style={{ color: colors.muted, fontWeight: 900 }}>Skipped</small> : task.status === "deferred" ? <small style={{ color: colors.gold, fontWeight: 900 }}>Moved</small> : null}
                  </label>
                  {!task.completed && task.status !== "skipped" && task.status !== "deferred" ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: isMobile ? 0 : 30 }}>
                    <select aria-label={`Assign ${task.title}`} value={task.assignedTo || "Nick"} disabled={busy} onChange={(event) => void updateTodayTask("assign-task", task.id, event.currentTarget.value as RoutineTask["assignedTo"])} style={{ ...button, minHeight: 30, padding: "4px 7px", fontSize: 12 }}><option>Nick</option><option>Addison</option><option>Pat</option><option>Crew</option></select>
                    <button type="button" disabled={busy} onClick={() => void updateTodayTask("skip-task", task.id)} style={{ ...button, minHeight: 30, padding: "4px 8px", fontSize: 12 }}>Skip Today</button>
                    <button type="button" disabled={busy} onClick={() => void updateTodayTask("defer-task", task.id)} style={{ ...button, minHeight: 30, padding: "4px 8px", fontSize: 12 }}>Next Workday</button>
                    {onAddPhoto ? <button type="button" disabled={busy} onClick={() => onAddPhoto(task)} style={{ ...button, minHeight: 30, padding: "4px 8px", fontSize: 12 }}>Photo</button> : null}
                    {onAddNote ? <button type="button" disabled={busy} onClick={() => onAddNote(task)} style={{ ...button, minHeight: 30, padding: "4px 8px", fontSize: 12 }}>Note</button> : null}
                    {onFlagProblem ? <button type="button" disabled={busy} onClick={() => onFlagProblem(task)} style={{ ...button, minHeight: 30, padding: "4px 8px", fontSize: 12, color: colors.red }}>Problem</button> : null}
                  </div> : null}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
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
                  }}
                />
              </div>
            </div>
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

          <div style={{ color: "rgba(255,255,255,.78)", fontSize: 13 }}>
            Edit the recurring checklist shown in Mission Control.
          </div>
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
            {(editing ? draftTasks : selected.tasks).map(
              (task, index) => (
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
                    <span><strong style={{ display: "block" }}>{task.title}</strong><small style={{ color: colors.muted }}>Default: {task.assignedTo || "Nick"}</small></span>
                  )}

                  {editing ? (
                    <>
                      <select value={task.assignedTo || "Nick"} onChange={(event) => setDraftTasks((current) => current.map((item, taskIndex) => taskIndex === index ? { ...item, assignedTo: event.currentTarget.value as RoutineTask["assignedTo"] } : item))} style={{ ...button, fontWeight: 700 }}><option>Nick</option><option>Addison</option><option>Pat</option><option>Crew</option></select>
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
              )
            )}
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
