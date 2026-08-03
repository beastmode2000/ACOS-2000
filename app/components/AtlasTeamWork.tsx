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
  completionPhotoUrl?: string;
  completedAt?: string;
  completedBy?: string;
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

type Props = {
  activePropertyId: string;
};

type AtlasCurrentUser = {
  email: string;
  role: string;
  permissions: Record<string, boolean>;
};

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
  const [currentUser, setCurrentUser] = useState<AtlasCurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loadedFromServer, setLoadedFromServer] = useState(false);

  function authHeaders(user = currentUser): HeadersInit {
    if (!user) return {};

    return {
      "Content-Type": "application/json",
      "x-atlas-user-email": user.email || "",
      "x-atlas-user-role": user.role || "viewer",
      "x-atlas-permissions": JSON.stringify(user.permissions || {}),
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTeamWork() {
      setLoading(true);
      setSaveMessage("");

      try {
        const teamResponse = await fetch("/api/atlas-team", {
          cache: "no-store",
        });
        const teamPayload = await teamResponse.json();

        if (!teamResponse.ok || !teamPayload?.ok) {
          throw new Error(
            teamPayload?.error || "Could not identify the current Atlas user.",
          );
        }

        const user: AtlasCurrentUser = {
          email: String(teamPayload.currentUser?.email || ""),
          role: String(teamPayload.currentUser?.role || "viewer"),
          permissions:
            teamPayload.currentUser?.permissions &&
            typeof teamPayload.currentUser.permissions === "object"
              ? teamPayload.currentUser.permissions
              : {},
        };

        if (cancelled) return;
        setCurrentUser(user);

        const response = await fetch("/api/atlas-team-work", {
          cache: "no-store",
          headers: authHeaders(user),
        });
        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Could not load Team Work.");
        }

        let next: TeamList[] =
          Array.isArray(payload.lists) && payload.lists.length
            ? payload.lists
            : [];

        if (!next.length) {
          try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? (JSON.parse(raw) as TeamList[]) : null;
            next =
              Array.isArray(parsed) && parsed.length
                ? parsed
                : starterLists();
          } catch {
            next = starterLists();
          }
        }

        if (cancelled) return;

        setLists(next);
        setSelectedListId(next[0]?.id || "");
        setLoadedFromServer(true);
        setSaveMessage(
          Array.isArray(payload.lists) && payload.lists.length
            ? "Shared Team Work loaded."
            : "Starter Team Work loaded. Save once to publish it for the team.",
        );
      } catch (error) {
        if (cancelled) return;

        let fallback = starterLists();

        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? (JSON.parse(raw) as TeamList[]) : null;
          if (Array.isArray(parsed) && parsed.length) fallback = parsed;
        } catch {
          // Use starter lists.
        }

        setLists(fallback);
        setSelectedListId(fallback[0]?.id || "");
        setLoadedFromServer(false);
        setSaveMessage(
          error instanceof Error
            ? `${error.message} Showing the browser copy.`
            : "Could not load shared Team Work. Showing the browser copy.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTeamWork();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!lists.length) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      // Keep the page usable if browser storage is unavailable.
    }
  }, [lists]);

  async function saveSharedTeamWork() {
    if (!currentUser) {
      setSaveMessage("Atlas could not identify the current user.");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/atlas-team-work", {
        method: "PUT",
        headers: authHeaders(currentUser),
        body: JSON.stringify({ lists }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not save Team Work.");
      }

      setLists(Array.isArray(payload.lists) ? payload.lists : lists);
      setLoadedFromServer(true);
      setSaveMessage("Shared Team Work saved.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Could not save shared Team Work.",
      );
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>TEAM OPERATIONS</div>
          <h1 style={titleStyle}>Team Work</h1>
          <p style={heroCopyStyle}>{activePropertyId} assignments and progress.</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={lightHeroButtonStyle}
            onClick={() => void saveSharedTeamWork()}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save Shared"}
          </button>
          <button
            type="button"
            style={goldButtonStyle}
            onClick={createList}
            disabled={loading}
          >
            + New List
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          style={{
            ...noticeStyle,
            borderColor: loadedFromServer ? colors.line : colors.gold,
          }}
        >
          {saveMessage}
        </div>
      )}

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
          {loading && <div style={emptyStyle}>Loading shared Team Work...</div>}

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

              <details style={{ marginTop: 14, border: `1px solid ${colors.line}`, borderRadius: 11, padding: 10 }}>
                <summary style={{ cursor: "pointer", fontWeight: 850, color: colors.text }}>List details</summary>
              <div style={{ ...settingsGridStyle, marginTop: 10 }}>
                <label style={labelStyle}>
                  Default assignee
                  <select
                    value={selected.defaultAssignee}
                    onChange={(event) =>
                      updateList(selected.id, {
                        defaultAssignee: event.target.value,
                      })
                    }
                    style={fieldStyle}
                  >
                    {PEOPLE.map((person) => (
                      <option key={person}>{person}</option>
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
              </details>

              <div style={{ ...editorHeaderStyle, marginTop: 22 }}>
                <div>
                  <h2 style={{ margin: 0, color: colors.text }}>Tasks</h2>
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
                            completedAt: event.target.checked
                              ? new Date().toISOString()
                              : undefined,
                            completedBy: event.target.checked
                              ? currentUser?.email || item.assignee
                              : undefined,
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
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            assignee: event.target.value,
                          })
                        }
                        style={fieldStyle}
                      >
                        {PEOPLE.map((person) => (
                          <option key={person}>{person}</option>
                        ))}
                      </select>

                      <select
                        value={item.status}
                        onChange={(event) =>
                          updateTask(selected.id, item.id, {
                            status: event.target.value as TeamTaskStatus,
                            completedAt:
                              event.target.value === "Completed"
                                ? new Date().toISOString()
                                : undefined,
                            completedBy:
                              event.target.value === "Completed"
                                ? currentUser?.email || item.assignee
                                : undefined,
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

                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: "pointer", color: colors.muted, fontSize: 12, fontWeight: 800 }}>
                        {item.location || item.notes || item.requirePhoto ? "Location & notes" : "Add details"}
                      </summary>
                    <div style={{ ...taskDetailGridStyle, marginTop: 8 }}>
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
                    </details>
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

const lightHeroButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.35)",
  borderRadius: 10,
  padding: "10px 14px",
  background: "rgba(255,255,255,.10)",
  color: "#FFFFFF",
  fontWeight: 900,
};

const noticeStyle: React.CSSProperties = {
  padding: "11px 14px",
  border: "1px solid",
  borderRadius: 12,
  background: colors.card,
  color: colors.text,
  fontSize: 13,
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  border: `1px dashed ${colors.line}`,
  borderRadius: 12,
  color: colors.muted,
  textAlign: "center",
};
