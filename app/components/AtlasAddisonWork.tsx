"use client";

import React, { useMemo, useState } from "react";
import type { UploadedFileRecord, WorkPlanTask } from "../lib/atlas-types";
import type { AtlasTaskMeta } from "./AtlasAppFoundation";

type ToastTone = "warning" | "success" | "error" | string;

type FieldReportDraft = {
  description: string;
  locationId: string;
  canHandle: boolean;
  files: UploadedFileRecord[];
};

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
  locations?: Array<{ id: string; name: string }>;
  submitFieldReport?: (
    report: FieldReportDraft,
  ) => Promise<{ ok: boolean; error?: string }>;
};

function normalizedText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export default function AtlasAddisonWork({
  workPlanTasks,
  taskDetails,
  todayISO,
  fileToUploadedRecord,
  updateTaskDetails,
  showSaveToast,
  locationName,
  setSelectedTaskId,
  setTasksView,
  badgeStyle,
  mutedSmallStyle,
  minutesLabel,
  formatDate,
  inputStyle,
  noticeStyle,
  setPreviewFile,
  goldButtonStyle,
  secondaryButtonStyle,
  completeAtlasTask,
  isMobile,
  cardStyle,
  eyebrowStyle,
  fieldLabelStyle,
  colors,
  locations = [],
  submitFieldReport = async () => ({
    ok: false,
    error: "Field reporting is not connected yet.",
  }),
}: AtlasAddisonWorkProps) {
  const today = todayISO();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportLocationId, setReportLocationId] = useState("");
  const [reportCanHandle, setReportCanHandle] = useState(false);
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");

  const addisonTasks = useMemo(() => {
    const seen = new Set<string>();
    return workPlanTasks.filter((task) => {
      const meta = taskDetails(task.id);
      if (normalizedText(meta.assignee) !== "addison") return false;

      const identity = [
        normalizedText(task.title),
        String(meta.dueDate || "").slice(0, 10),
        normalizedText(task.locationId || "general"),
        task.recurring
          ? `${Number(meta.recurrenceInterval || 1)}-${normalizedText(meta.recurrenceUnit || "weeks")}`
          : "one-time",
        meta.status === "Completed" ? "completed" : "active",
      ].join("||");

      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  }, [workPlanTasks, taskDetails]);

  const activeAssigned = addisonTasks
    .filter((task) => taskDetails(task.id).status !== "Completed")
    .sort((a, b) =>
      String(taskDetails(a.id).dueDate || "9999-12-31").localeCompare(
        String(taskDetails(b.id).dueDate || "9999-12-31"),
      ),
    );
  const todayAssigned = activeAssigned.filter((task) => {
    const dueDate = taskDetails(task.id).dueDate;
    return !dueDate || dueDate <= today;
  });
  const upcomingAssigned = activeAssigned.filter(
    (task) => String(taskDetails(task.id).dueDate || "") > today,
  );
  const completedToday = addisonTasks.filter((task) => {
    const meta = taskDetails(task.id);
    return (
      meta.status === "Completed" &&
      String(meta.completedAt || "").slice(0, 10) === today
    );
  });

  const addTaskPhotos = async (task: WorkPlanTask, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const uploaded = await Promise.all(
        Array.from(files)
          .filter((file) => file.type.startsWith("image/"))
          .map(fileToUploadedRecord),
      );
      if (!uploaded.length) return;
      updateTaskDetails(task.id, {
        photos: [...(taskDetails(task.id).photos || []), ...uploaded],
      });
      showSaveToast(
        `${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} added to ${task.title}.`,
      );
    } catch {
      showSaveToast("Atlas could not add that photo.", "warning");
    }
  };

  const addReportFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setReportFiles((current) => {
      const next = [...current];
      Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .forEach((file) => {
          const key = `${file.name}|${file.size}|${file.lastModified}`;
          if (
            !next.some(
              (item) =>
                `${item.name}|${item.size}|${item.lastModified}` === key,
            )
          ) {
            next.push(file);
          }
        });
      return next;
    });
  };

  const resetReport = () => {
    setReportDescription("");
    setReportLocationId("");
    setReportCanHandle(false);
    setReportFiles([]);
    setReportError("");
  };

  const sendReport = async () => {
    if (reportSubmitting) return;
    if (!reportDescription.trim()) {
      setReportError("Describe what you found.");
      return;
    }

    setReportSubmitting(true);
    setReportError("");
    try {
      const uploaded = await Promise.all(reportFiles.map(fileToUploadedRecord));
      const result = await submitFieldReport({
        description: reportDescription.trim(),
        locationId: reportLocationId,
        canHandle: reportCanHandle,
        files: uploaded,
      });
      if (!result.ok) {
        setReportError(result.error || "Atlas could not send this report.");
        return;
      }
      resetReport();
      setReportOpen(false);
    } catch {
      setReportError("Atlas could not send this report.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const flagProblem = (task: WorkPlanTask) => {
    const meta = taskDetails(task.id);
    const problem = window.prompt(
      "What problem is blocking this work?",
      meta.problemFlag || "",
    );
    if (problem === null) return;
    const clean = problem.trim();
    updateTaskDetails(task.id, {
      status: clean ? "Blocked" : "Open",
      problemFlag: clean,
      notes: clean
        ? `${meta.notes ? `${meta.notes}\n` : ""}PROBLEM: ${clean} — ${new Date().toLocaleString()}`
        : meta.notes,
    });
    showSaveToast(clean ? "Problem reported." : "Problem flag cleared.");
  };

  const taskCard = (task: WorkPlanTask) => {
    const meta = taskDetails(task.id);
    const location = locationName(task.locationId) || "General property";

    return (
      <article
        key={`addison-${task.id}`}
        style={{
          border: `1px solid ${meta.status === "Blocked" ? "#F1A7A7" : colors.line}`,
          borderRadius: 14,
          background: meta.status === "Blocked" ? "#FFF8F8" : "#FFFFFF",
          padding: isMobile ? 11 : 13,
          display: "grid",
          gap: 10,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedTaskId(task.id);
            setTasksView("tasks");
          }}
          style={{
            border: 0,
            background: "transparent",
            textAlign: "left",
            padding: 0,
            cursor: "pointer",
            minWidth: 0,
          }}
        >
          <span
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <strong style={{ color: colors.navy, overflowWrap: "anywhere" }}>
              {task.title}
            </strong>
            <span style={badgeStyle(meta.status === "Blocked" ? "High" : task.priority)}>
              {meta.status === "Blocked" ? "Problem" : task.priority}
            </span>
          </span>
          <small style={{ ...mutedSmallStyle, display: "block", marginTop: 5 }}>
            {location} · {minutesLabel(task.minutes)}
            {meta.dueDate ? ` · ${formatDate(meta.dueDate)}` : ""}
          </small>
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "minmax(0,1fr)"
              : "minmax(0,1fr) minmax(220px,.7fr)",
            gap: 9,
            minWidth: 0,
          }}
        >
          <div
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 10,
              background: "#F8FAFC",
              padding: 9,
              minWidth: 0,
            }}
          >
            <small style={fieldLabelStyle}>INSTRUCTIONS</small>
            <p
              style={{
                margin: "5px 0 0",
                color: colors.text,
                fontSize: 13,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {meta.instructions ||
                task.notes ||
                meta.notes ||
                "Complete the work carefully and report anything unusual."}
            </p>
          </div>
          <label style={{ display: "grid", gap: 5, minWidth: 0 }}>
            <span style={fieldLabelStyle}>FIELD NOTE</span>
            <textarea
              key={`addison-field-note-${task.id}`}
              defaultValue={meta.addisonNote || ""}
              onBlur={(event) => {
                const nextNote = event.currentTarget.value;
                if (nextNote !== (meta.addisonNote || "")) {
                  updateTaskDetails(task.id, { addisonNote: nextNote });
                }
              }}
              placeholder="Add progress, completion, or access notes…"
              style={{ ...inputStyle, width: "100%", minHeight: 72, resize: "vertical" }}
            />
          </label>
        </div>

        {meta.problemFlag ? (
          <div
            style={{
              ...noticeStyle,
              borderColor: "#F1A7A7",
              background: "#FFF2F2",
              color: colors.red,
              overflowWrap: "anywhere",
            }}
          >
            <strong>Problem:</strong> {meta.problemFlag}
          </div>
        ) : null}

        {(meta.photos || []).length ? (
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {(meta.photos || []).map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPreviewFile(photo)}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 9,
                  padding: 0,
                  overflow: "hidden",
                  background: "#FFFFFF",
                  flex: "0 0 auto",
                  cursor: "pointer",
                }}
              >
                <img
                  src={photo.dataUrl || photo.url}
                  alt={photo.name}
                  style={{ width: 74, height: 58, objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", minWidth: 0 }}>
          <button
            type="button"
            onClick={() => updateTaskDetails(task.id, { status: "In Progress" })}
            style={meta.status === "In Progress" ? goldButtonStyle : secondaryButtonStyle}
          >
            {meta.status === "In Progress" ? "Working" : "Start"}
          </button>
          <button type="button" onClick={() => completeAtlasTask(task)} style={goldButtonStyle}>
            Complete
          </button>
          <button
            type="button"
            onClick={() => flagProblem(task)}
            style={{ ...secondaryButtonStyle, color: colors.red }}
          >
            {meta.problemFlag ? "Update Problem" : "Problem"}
          </button>
          <label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                void addTaskPhotos(task, event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
          <label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>
            Choose from Library
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                void addTaskPhotos(task, event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </article>
    );
  };

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <section style={{ ...cardStyle, background: colors.navy, color: "#FFFFFF" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ ...eyebrowStyle, color: colors.gold2 }}>MY WORK</div>
            <h2 style={{ margin: "3px 0 4px", color: "#FFFFFF" }}>Today</h2>
            <p style={{ margin: 0, opacity: 0.84 }}>
              {todayAssigned.length} task{todayAssigned.length === 1 ? "" : "s"} assigned to you
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setReportOpen((open) => !open);
              setReportError("");
            }}
            style={goldButtonStyle}
          >
            {reportOpen ? "Close Report" : "Report Something"}
          </button>
        </div>
      </section>

      {reportOpen ? (
        <section style={{ ...cardStyle, display: "grid", gap: 11, minWidth: 0 }}>
          <div>
            <div style={eyebrowStyle}>FIELD REPORT</div>
            <h3 style={{ margin: "4px 0", color: colors.navy }}>What did you find?</h3>
            <p style={{ ...mutedSmallStyle, margin: 0 }}>
              This sends a report to the manager. It does not create a task automatically.
            </p>
          </div>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={fieldLabelStyle}>DESCRIPTION</span>
            <textarea
              value={reportDescription}
              onChange={(event) => setReportDescription(event.currentTarget.value)}
              placeholder="Describe what you found and what may need to be done."
              style={{ ...inputStyle, width: "100%", minHeight: 110, resize: "vertical" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={fieldLabelStyle}>LOCATION</span>
            <select
              value={reportLocationId}
              onChange={(event) => setReportLocationId(event.currentTarget.value)}
              style={{ ...inputStyle, width: "100%" }}
            >
              <option value="">General property</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>
              Take Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  addReportFiles(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
            <label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>
              Choose from Library
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  addReportFiles(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {reportFiles.length ? (
            <div style={{ ...noticeStyle, display: "grid", gap: 5 }}>
              <strong>
                {reportFiles.length} photo{reportFiles.length === 1 ? "" : "s"} ready
              </strong>
              {reportFiles.map((file) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <span style={{ overflowWrap: "anywhere", minWidth: 0 }}>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setReportFiles((current) => current.filter((item) => item !== file))}
                    style={secondaryButtonStyle}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minHeight: 42,
              fontWeight: 800,
              color: colors.navy,
            }}
          >
            <input
              type="checkbox"
              checked={reportCanHandle}
              onChange={(event) => setReportCanHandle(event.currentTarget.checked)}
            />
            I can handle this
          </label>

          {reportError ? (
            <div style={{ ...noticeStyle, borderColor: "#F1A7A7", color: colors.red }}>
              {reportError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void sendReport()}
              disabled={reportSubmitting}
              style={{ ...goldButtonStyle, opacity: reportSubmitting ? 0.65 : 1 }}
            >
              {reportSubmitting ? "Sending…" : "Send Report"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetReport();
                setReportOpen(false);
              }}
              disabled={reportSubmitting}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section style={cardStyle}>
        <div style={fieldLabelStyle}>TODAY</div>
        <div style={{ display: "grid", gap: 9, marginTop: 8 }}>
          {todayAssigned.map(taskCard)}
          {!todayAssigned.length ? (
            <div style={noticeStyle}>You have no assigned tasks due today.</div>
          ) : null}
        </div>
      </section>

      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 900, color: colors.navy }}>
          Upcoming · {upcomingAssigned.length}
        </summary>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {upcomingAssigned.map(taskCard)}
          {!upcomingAssigned.length ? (
            <div style={noticeStyle}>No upcoming tasks assigned to you.</div>
          ) : null}
        </div>
      </details>

      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 900, color: colors.green }}>
          Completed today · {completedToday.length}
        </summary>
        <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
          {completedToday.map((task) => (
            <button
              key={`addison-complete-${task.id}`}
              type="button"
              onClick={() => {
                setSelectedTaskId(task.id);
                setTasksView("tasks");
              }}
              style={{
                ...secondaryButtonStyle,
                textAlign: "left",
                justifyContent: "space-between",
                minWidth: 0,
              }}
            >
              <span style={{ overflowWrap: "anywhere" }}>{task.title}</span>
              <span>{minutesLabel(task.minutes)}</span>
            </button>
          ))}
          {!completedToday.length ? (
            <div style={noticeStyle}>No tasks completed today yet.</div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
