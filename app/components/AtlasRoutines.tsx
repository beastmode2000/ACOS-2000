"use client";

import React, { useEffect, useMemo, useState } from "react";

type RoutineTask = {
  id: string;
  title: string;
  enabled: boolean;
  completed?: boolean;
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
};

const dayNames = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

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
}: Props) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [occurrence, setOccurrence] =
    useState<RoutineOccurrence | null>(null);

  const [selectedDay, setSelectedDay] = useState(1);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftTasks, setDraftTasks] = useState<RoutineTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [status, setStatus] = useState("Loading routines…");
  const [busy, setBusy] = useState(false);

  async function load() {
    setStatus("Loading routines…");

    try {
      const response = await fetch(
        `/api/atlas-routines?date=${todayKey()}`,
        {
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not load routines");
      }

      setTemplates(
        Array.isArray(payload.templates) ? payload.templates : []
      );

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
  }, []);

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
                <label
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 11px",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 11,
                    cursor: "pointer",
                    background: task.completed
                      ? "#F2FBF6"
                      : "#FFFFFF",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(task.completed)}
                    disabled={busy}
                    onChange={() => void toggleTask(task.id)}
                    style={{
                      width: 19,
                      height: 19,
                      accentColor: colors.green,
                    }}
                  />

                  <span
                    style={{
                      textDecoration: task.completed
                        ? "line-through"
                        : "none",
                      color: task.completed
                        ? colors.muted
                        : colors.text,
                      fontWeight: 700,
                    }}
                  >
                    {task.title}
                  </span>
                </label>
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
                {completed} of {total} complete
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
                        ? (completed / total) * 100
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
            Weekly Operations
          </div>

          <h1
            style={{
              margin: "4px 0 3px",
              color: colors.navy,
            }}
          >
            Routines
          </h1>

          <div style={{ color: colors.muted }}>
            Build the recurring checklists that appear on
            the Dashboard.
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
            ? "1fr"
            : "repeat(5, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {[1, 2, 3, 4, 5].map((day) => (
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
                        : "minmax(0, 1fr) auto auto auto"
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
                    <strong>{task.title}</strong>
                  )}

                  {editing ? (
                    <>
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
                        {[1, 2, 3, 4, 5].map((day) => (
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
