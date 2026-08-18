"use client";

import React from "react";
import type { WorkPlanTask, UploadedFileRecord } from "../lib/atlas-types";
import type { AtlasTaskMeta } from "./AtlasAppFoundation";

type ToastTone = "warning" | "success" | "error" | string;

type AtlasAddisonWorkProps = {
  workPlanTasks: WorkPlanTask[];
  taskDetails: (taskId: string) => AtlasTaskMeta;
  todayISO: () => string;
  fileToUploadedRecord: (file: File) => Promise<UploadedFileRecord>;
  updateTaskDetails: (taskId: string, patch: Partial<AtlasTaskMeta>) => void;
  showSaveToast: (message: string, tone?: ToastTone) => void;
  locationName: (locationId?: string) => string;
  setSelectedTaskId: (taskId: string) => void;
  setTasksView: (view: any) => void;
  badgeStyle: (value: any) => React.CSSProperties;
  mutedSmallStyle: React.CSSProperties;
  minutesLabel: (minutes: number) => string;
  formatDate: (value: string) => string;
  inputStyle: React.CSSProperties;
  noticeStyle: React.CSSProperties;
  setPreviewFile: (file: any) => void;
  goldButtonStyle: React.CSSProperties;
  secondaryButtonStyle: React.CSSProperties;
  completeAtlasTask: (task: WorkPlanTask) => void;
  isAddisonUser: boolean;
  isMobile: boolean;
  cardStyle: React.CSSProperties;
  eyebrowStyle: React.CSSProperties;
  fieldLabelStyle: React.CSSProperties;
  colors: Record<string, string>;
};

export default function AtlasAddisonWork({
workPlanTasks, taskDetails, todayISO, fileToUploadedRecord, updateTaskDetails, showSaveToast,
locationName, setSelectedTaskId, setTasksView, badgeStyle, mutedSmallStyle, minutesLabel, formatDate,
inputStyle, noticeStyle, setPreviewFile, goldButtonStyle, secondaryButtonStyle, completeAtlasTask,
isAddisonUser, isMobile, cardStyle, eyebrowStyle, fieldLabelStyle, colors,
}: AtlasAddisonWorkProps) {
  const today = todayISO();
  const assigned = workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    return meta.assignee === "Addison" && meta.status !== "Completed";
  }).sort((a, b) => String(taskDetails(a.id).dueDate || "9999-12-31").localeCompare(String(taskDetails(b.id).dueDate || "9999-12-31")));
  const todayAssigned = assigned.filter((task) => !taskDetails(task.id).dueDate || taskDetails(task.id).dueDate <= today);
  const upcomingAssigned = assigned.filter((task) => taskDetails(task.id).dueDate > today);
  const assignedMinutes = todayAssigned.reduce((sum, task) => sum + Math.max(5, Number(task.minutes || 0)), 0);
  const inProgressCount = todayAssigned.filter((task) => taskDetails(task.id).status === "In Progress").length;
  const problemCount = todayAssigned.filter((task) => taskDetails(task.id).status === "Blocked" || Boolean(taskDetails(task.id).problemFlag)).length;
  const completedToday = workPlanTasks.filter((task) => taskDetails(task.id).assignee === "Addison" && taskDetails(task.id).status === "Completed" && String(taskDetails(task.id).completedAt || "").slice(0, 10) === today);
  const delegatedReview = workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    return meta.needsReview && meta.assignee === "Addison";
  });
  const addAddisonPhoto = async (task: WorkPlanTask, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const uploaded = await Promise.all(Array.from(files).filter((file) => file.type.startsWith("image/")).map(fileToUploadedRecord));
      if (!uploaded.length) return;
      updateTaskDetails(task.id, { photos: [...(taskDetails(task.id).photos || []), ...uploaded] });
      showSaveToast(`${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} added to ${task.title}.`);
    } catch {
      showSaveToast("Atlas could not add that photo.", "warning");
    }
  };
  const flagAddisonProblem = (task: WorkPlanTask) => {
    const meta = taskDetails(task.id);
    const problem = window.prompt("What problem is blocking this work?", meta.problemFlag || "");
    if (problem === null) return;
    updateTaskDetails(task.id, { status: problem.trim() ? "Blocked" : "Open", problemFlag: problem.trim(), notes: problem.trim() ? `${meta.notes ? `${meta.notes}\n` : ""}PROBLEM: ${problem.trim()} — ${new Date().toLocaleString()}` : meta.notes });
    showSaveToast(problem.trim() ? "Problem sent to the dashboard." : "Problem flag cleared.");
  };
  const taskCard = (task: WorkPlanTask) => {
    const meta = taskDetails(task.id);
    const location = locationName(task.locationId) || "General property";
    return <div key={`addison-${task.id}`} style={{ border: `1px solid ${meta.status === "Blocked" ? "#F1A7A7" : colors.line}`, borderRadius: 14, background: meta.status === "Blocked" ? "#FFF8F8" : "#FFFFFF", padding: 12, display: "grid", gap: 10 }}>
      <button type="button" onClick={() => { setSelectedTaskId(task.id); setTasksView("tasks"); }} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, cursor: "pointer" }}><span style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><strong style={{ display: "block", color: colors.navy }}>{task.title}</strong><span style={badgeStyle(meta.status === "Blocked" ? "High" : task.priority)}>{meta.status === "Blocked" ? "Problem" : task.priority}</span></span><small style={{ ...mutedSmallStyle, display: "block", marginTop: 5 }}>{location} · {minutesLabel(task.minutes)}{meta.dueDate ? ` · ${formatDate(meta.dueDate)}` : ""}</small></button>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(220px,.7fr)", gap: 9 }}><div style={{ border: `1px solid ${colors.line}`, borderRadius: 10, background: "#F8FAFC", padding: 9 }}><small style={fieldLabelStyle}>INSTRUCTIONS</small><p style={{ margin: "5px 0 0", color: colors.text, fontSize: 13, whiteSpace: "pre-wrap" }}>{meta.instructions || task.notes || meta.notes || "Complete the work carefully and report anything unusual."}</p></div><label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>FIELD NOTE</span><textarea key={`addison-field-note-${task.id}`} defaultValue={meta.addisonNote || ""} onBlur={(event) => { const nextNote = event.currentTarget.value; if (nextNote !== (meta.addisonNote || "")) updateTaskDetails(task.id, { addisonNote: nextNote }); }} placeholder="Add progress, completion, or access notes…" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} /></label></div>
      {meta.problemFlag ? <div style={{ ...noticeStyle, borderColor: "#F1A7A7", background: "#FFF2F2", color: colors.red }}><strong>Problem:</strong> {meta.problemFlag}</div> : null}
      {(meta.photos || []).length ? <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>{(meta.photos || []).map((photo) => <button key={photo.id} type="button" onClick={() => setPreviewFile(photo)} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: 0, overflow: "hidden", background: "#FFFFFF", flex: "0 0 auto", cursor: "pointer" }}><img src={photo.dataUrl || photo.url} alt={photo.name} style={{ width: 74, height: 58, objectFit: "cover", display: "block" }} /></button>)}</div> : null}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" onClick={() => updateTaskDetails(task.id, { status: "In Progress" })} style={meta.status === "In Progress" ? goldButtonStyle : secondaryButtonStyle}>{meta.status === "In Progress" ? "Working" : "Start"}</button><button type="button" onClick={() => completeAtlasTask(task)} style={goldButtonStyle}>Complete</button><button type="button" onClick={() => flagAddisonProblem(task)} style={{ ...secondaryButtonStyle, color: colors.red }}>{meta.problemFlag ? "Update Problem" : "Problem"}</button><label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>Take Photo<input type="file" accept="image/*" capture="environment" onChange={(event) => { void addAddisonPhoto(task, event.currentTarget.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label><label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>Choose from Library<input type="file" accept="image/*" multiple onChange={(event) => { void addAddisonPhoto(task, event.currentTarget.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label>{!isAddisonUser ? <button type="button" onClick={() => updateTaskDetails(task.id, { assignee: "Nick" })} style={secondaryButtonStyle}>Return to Nick</button> : null}</div>
    </div>;
  };
  return <div style={{ display: "grid", gap: 12 }}><section style={{ ...cardStyle, background: colors.navy, color: "#FFFFFF" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}><div><div style={{ ...eyebrowStyle, color: colors.gold2 }}>Addison Work Manager</div><h2 style={{ margin: "3px 0 4px", color: "#FFFFFF" }}>Today’s assigned work</h2><p style={{ margin: 0, opacity: .84 }}>Assignments, instructions, progress, photos, completion notes, and problems update your dashboard automatically.</p></div><div style={{ textAlign: "right" }}><strong style={{ display: "block", fontSize: 25 }}>{minutesLabel(assignedMinutes)}</strong><small style={{ opacity: .82 }}>{todayAssigned.length} assigned today</small></div></div></section><div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>{[["Assigned",todayAssigned.length],["Working",inProgressCount],["Problems",problemCount],["Review",delegatedReview.length]].map(([label,value]) => <div key={String(label)} style={{ ...cardStyle, padding: 10 }}><small style={fieldLabelStyle}>{String(label).toUpperCase()}</small><strong style={{ display: "block", marginTop: 3, fontSize: 22, color: label === "Problems" && Number(value) ? colors.red : colors.navy }}>{value}</strong></div>)}</div><section style={cardStyle}><div style={fieldLabelStyle}>TODAY</div><div style={{ display: "grid", gap: 9, marginTop: 8 }}>{todayAssigned.map(taskCard)}{!todayAssigned.length ? <div style={noticeStyle}>No work is assigned to Addison for today.</div> : null}</div></section>{delegatedReview.length ? <section style={cardStyle}><div style={eyebrowStyle}>Review Delegated Work</div><div style={{ display: "grid", gap: 7, marginTop: 8 }}>{delegatedReview.map((task) => <div key={`review-${task.id}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 10, padding: 9 }}><button type="button" onClick={() => { setSelectedTaskId(task.id); setTasksView("tasks"); }} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0 }}><strong>{task.title}</strong><small style={{ ...mutedSmallStyle, display: "block" }}>{taskDetails(task.id).assignee} · completed for review</small></button><button type="button" onClick={() => updateTaskDetails(task.id, { needsReview: false })} style={goldButtonStyle}>Approve</button></div>)}</div></section> : null}{completedToday.length ? <details style={cardStyle}><summary style={{ cursor: "pointer", fontWeight: 900, color: colors.green }}>Completed today · {completedToday.length}</summary><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{completedToday.map((task) => <button key={`addison-complete-${task.id}`} type="button" onClick={() => { setSelectedTaskId(task.id); setTasksView("tasks"); }} style={{ ...secondaryButtonStyle, textAlign: "left", justifyContent: "space-between" }}><span>{task.title}</span><span>{minutesLabel(task.minutes)}</span></button>)}</div></details> : null}<details style={cardStyle}><summary style={{ cursor: "pointer", fontWeight: 900, color: colors.navy }}>Upcoming · {upcomingAssigned.length}</summary><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{upcomingAssigned.map(taskCard)}{!upcomingAssigned.length ? <div style={noticeStyle}>No upcoming Addison tasks.</div> : null}</div></details></div>;
}
