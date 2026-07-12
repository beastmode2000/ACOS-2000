"use client";

import React from "react";
import type { WorkPlanDay, WorkPlanTask } from "../lib/atlas-types";

type OperationsPlannerProps = {
  approveWorkPlan: any;
  buildWorkPlan: any;
  buttonRowStyle: any;
  calendarCompactPillStyle: any;
  cardStyle: any;
  colors: any;
  cyclePlannerDay: any;
  cyclePlannerLocation: any;
  cyclePlannerPriority: any;
  dangerButtonStyle: any;
  fieldLabelStyle: any;
  goldButtonStyle: any;
  importWorkPlanTasks: any;
  inputStyle: any;
  isMobile: any;
  minutesLabel: any;
  mutedSmallStyle: any;
  nextWorkWeekDates: any;
  noticeStyle: any;
  plannerControlButtonStyle: any;
  plannerControlButtonsStyle: any;
  plannerControlCardStyle: any;
  plannerControlLabelStyle: any;
  plannerLocationName: any;
  plannerMiniButtonStyle: any;
  secondaryButtonStyle: any;
  sectionStyle: any;
  setScreen: any;
  setWorkPlanInput: any;
  setWorkPlanTargetHours: any;
  setWorkPlanTasks: any;
  shiftPlannerTime: any;
  statGridStyle: any;
  updateWorkPlanTask: any;
  workPlanDays: any;
  workPlanInput: any;
  workPlanMessage: any;
  workPlanSaving: any;
  workPlanTargetHours: any;
  workPlanTasks: any;
  SectionHeader: any;
  StatCard: any;
};

export default function OperationsPlanner(props: OperationsPlannerProps) {
  const {
    approveWorkPlan,
    buildWorkPlan,
    buttonRowStyle,
    calendarCompactPillStyle,
    cardStyle,
    colors,
    cyclePlannerDay,
    cyclePlannerLocation,
    cyclePlannerPriority,
    dangerButtonStyle,
    fieldLabelStyle,
    goldButtonStyle,
    importWorkPlanTasks,
    inputStyle,
    isMobile,
    minutesLabel,
    mutedSmallStyle,
    nextWorkWeekDates,
    noticeStyle,
    plannerControlButtonStyle,
    plannerControlButtonsStyle,
    plannerControlCardStyle,
    plannerControlLabelStyle,
    plannerLocationName,
    plannerMiniButtonStyle,
    secondaryButtonStyle,
    sectionStyle,
    setScreen,
    setWorkPlanInput,
    setWorkPlanTargetHours,
    setWorkPlanTasks,
    shiftPlannerTime,
    statGridStyle,
    updateWorkPlanTask,
    workPlanDays,
    workPlanInput,
    workPlanMessage,
    workPlanSaving,
    workPlanTargetHours,
    workPlanTasks,
    SectionHeader,
    StatCard
  } = props;

    const scheduledMinutes = (workPlanDays as WorkPlanDay[]).reduce<
      Record<WorkPlanDay, number>
    >((acc, day) => {
      acc[day] = workPlanTasks
        .filter((task) => task.scheduledDay === day)
        .reduce((sum, task) => sum + task.minutes, 0);
      return acc;
    }, {} as Record<WorkPlanDay, number>);
    const lockedCount = workPlanTasks.filter((task) => task.locked).length;
    const recurringCount = workPlanTasks.filter((task) => task.recurring).length;

    return (
      <div
        style={{ display: "grid", gap: 16 }}
        onClick={(event) => {
          event.stopPropagation();
          const target =
            event.target instanceof HTMLElement ? event.target : null;
          const outsideAnchor = target?.closest("a");
          if (outsideAnchor && !event.currentTarget.contains(outsideAnchor)) {
            event.preventDefault();
          }
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <section style={sectionStyle}>
          <SectionHeader
            brand
            eyebrow="Weekly Operations"
            title="Operations Planner"
            detail="Lock recurring commitments first, then let Atlas build a balanced week around them."
            right={
              <div style={buttonRowStyle}>
                <button type="button" onClick={() => setScreen("dashboard")} style={secondaryButtonStyle}>← Dashboard</button>
                <button type="button" onClick={buildWorkPlan} style={goldButtonStyle}>Build My Week</button>
              </div>
            }
          />
          <div style={statGridStyle}>
            <StatCard label="Tasks" value={workPlanTasks.length} />
            <StatCard label="Locked" value={lockedCount} />
            <StatCard label="Weekly" value={recurringCount} />
            <StatCard label="Daily Target" value={`${workPlanTargetHours}h`} />
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 180px", gap: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Add tasks — one per line</label>
              <textarea
                value={workPlanInput}
                onChange={(event) => setWorkPlanInput(event.currentTarget.value)}
                placeholder={"Trash and recycling Monday 8 AM 45 minutes locked weekly\nTuesday landscaping 3 hours\nFriday final walkthrough 1 hour locked weekly"}
                style={{ ...inputStyle, minHeight: 135, resize: "vertical" }}
              />
              <p style={mutedSmallStyle}>Use plain language. Add “locked,” “weekly,” a weekday, and a time when a commitment must not move.</p>
            </div>
            <div style={{ display: "grid", alignContent: "start", gap: 10 }}>
              <label style={fieldLabelStyle}>Scheduled work per day</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[6, 6.5, 7, 7.5].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setWorkPlanTargetHours(hours)}
                    style={{
                      ...secondaryButtonStyle,
                      padding: "8px 6px",
                      background:
                        workPlanTargetHours === hours ? colors.gold : colors.card,
                      color:
                        workPlanTargetHours === hours ? colors.navy : colors.text,
                      borderColor:
                        workPlanTargetHours === hours ? colors.gold : colors.line,
                    }}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
              <button type="button" onClick={importWorkPlanTasks} style={secondaryButtonStyle}>Import Tasks</button>
              <button type="button" onClick={buildWorkPlan} style={goldButtonStyle}>Build My Week</button>
            </div>
          </div>
          <div style={{ ...noticeStyle, marginTop: 12 }}>{workPlanMessage}</div>
        </section>

        {workPlanTasks.length ? (
          <>
            <section style={sectionStyle}>
              <SectionHeader eyebrow="Week" title="Planned Work" detail="Locked items stay fixed. Flexible work fills the remaining time." />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: 10 }}>
                {workPlanDays.map((day) => {
                  const tasks = workPlanTasks.filter((task) => task.scheduledDay === day);
                  const total = scheduledMinutes[day] || 0;
                  const buffer = Math.max(0, 8 * 60 - total);
                  const percent = Math.min(100, Math.round((total / (8 * 60)) * 100));
                  return (
                    <div key={day} style={{ ...cardStyle, minHeight: 170, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{day}</strong><span style={mutedSmallStyle}>{minutesLabel(buffer)} open</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: colors.line, overflow: "hidden", margin: "8px 0" }}>
                        <div style={{ width: `${percent}%`, height: "100%", background: percent > 94 ? colors.red : colors.gold }} />
                      </div>
                      <div style={{ display: "grid", gap: 7 }}>
                        {tasks.map((task) => (
                          <div key={task.id} style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 7 }}>
                            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                              {task.locked ? <span style={calendarCompactPillStyle}>Locked</span> : null}
                              {task.recurring ? <span style={calendarCompactPillStyle}>Weekly</span> : null}
                              <strong style={{ fontSize: 12 }}>{task.title}</strong>
                            </div>
                            <div style={{ ...mutedSmallStyle, fontSize: 11 }}>{task.fixedTime ? `${task.fixedTime} · ` : ""}{minutesLabel(task.minutes)} · {task.category}</div>
                          </div>
                        ))}
                        {!tasks.length ? <span style={mutedSmallStyle}>Open</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={sectionStyle}>
              <SectionHeader eyebrow="Review" title="Tasks & Commitments" detail="Edit estimates, lock fixed items, and set recurring weekly tasks before approval." />
              <div style={{ maxHeight: 430, overflowY: "auto", border: `1px solid ${colors.line}`, borderRadius: 12 }}>
                {workPlanTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 10,
                      borderBottom: `1px solid ${colors.line}`,
                      background: colors.card,
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      value={task.title}
                      onChange={(event) =>
                        updateWorkPlanTask(task.id, {
                          title: event.currentTarget.value,
                        })
                      }
                      style={inputStyle}
                    />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr 1fr"
                          : "repeat(7, minmax(95px, 1fr))",
                        gap: 7,
                      }}
                    >
                      <div style={plannerControlCardStyle}>
                        <span style={plannerControlLabelStyle}>Minutes</span>
                        <strong>{task.minutes}</strong>
                        <div style={plannerControlButtonsStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                minutes: Math.max(15, task.minutes - 15),
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            −15
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                minutes: task.minutes + 15,
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            +15
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            priority: cyclePlannerPriority(task.priority),
                          })
                        }
                        style={plannerControlButtonStyle}
                      >
                        <span style={plannerControlLabelStyle}>Priority</span>
                        <strong>{task.priority}</strong>
                        <small>Tap to change</small>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            locationId: cyclePlannerLocation(task.locationId),
                          })
                        }
                        style={plannerControlButtonStyle}
                      >
                        <span style={plannerControlLabelStyle}>Location</span>
                        <strong>{plannerLocationName(task.locationId)}</strong>
                        <small>Tap to change</small>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextDay = cyclePlannerDay(
                            task.scheduledDay || task.preferredDay,
                          );
                          updateWorkPlanTask(task.id, {
                            preferredDay: nextDay,
                            scheduledDay:
                              nextDay === "Auto" ? undefined : nextDay,
                            scheduledDate:
                              nextDay === "Auto"
                                ? undefined
                                : nextWorkWeekDates()[nextDay],
                          });
                        }}
                        style={plannerControlButtonStyle}
                      >
                        <span style={plannerControlLabelStyle}>Day</span>
                        <strong>
                          {task.scheduledDay || task.preferredDay || "Auto"}
                        </strong>
                        <small>Tap to change</small>
                      </button>

                      <div style={plannerControlCardStyle}>
                        <span style={plannerControlLabelStyle}>Time</span>
                        <strong>{task.fixedTime || "Auto"}</strong>
                        <div style={plannerControlButtonsStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                fixedTime: shiftPlannerTime(
                                  task.fixedTime,
                                  -15,
                                ),
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            −15
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                fixedTime: shiftPlannerTime(
                                  task.fixedTime,
                                  15,
                                ),
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            +15
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, { fixedTime: "" })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            Auto
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            locked: !task.locked,
                          })
                        }
                        style={{
                          ...plannerControlButtonStyle,
                          background: task.locked
                            ? "#FFF4D8"
                            : colors.card,
                          borderColor: task.locked
                            ? colors.gold
                            : colors.line,
                        }}
                      >
                        <span style={plannerControlLabelStyle}>Locked</span>
                        <strong>{task.locked ? "Yes" : "No"}</strong>
                        <small>Tap to toggle</small>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            recurring: !task.recurring,
                          })
                        }
                        style={{
                          ...plannerControlButtonStyle,
                          background: task.recurring
                            ? "#EEF6FF"
                            : colors.card,
                          borderColor: task.recurring
                            ? colors.navy3
                            : colors.line,
                        }}
                      >
                        <span style={plannerControlLabelStyle}>Weekly</span>
                        <strong>{task.recurring ? "Yes" : "No"}</strong>
                        <small>Tap to toggle</small>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...buttonRowStyle, marginTop: 12 }}>
                <button type="button" onClick={() => { if (window.confirm("Clear all planner tasks?")) setWorkPlanTasks([]); }} style={dangerButtonStyle}>Clear Planner</button>
                <button type="button" onClick={buildWorkPlan} style={secondaryButtonStyle}>Rebalance Week</button>
                <button
                  type="button"
                  onClick={() => void approveWorkPlan()}
                  disabled={workPlanSaving}
                  style={{
                    ...goldButtonStyle,
                    opacity: workPlanSaving ? 0.65 : 1,
                    cursor: workPlanSaving ? "wait" : "pointer",
                  }}
                >
                  {workPlanSaving
                    ? "Adding to Calendar..."
                    : "Approve & Add to Calendar"}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    );
  
}
