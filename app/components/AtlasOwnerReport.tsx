"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;

type ReportItem = {
  id: string;
  sourceKey: string;
  sourceType: "Work Order" | "Task / Routine" | "Team Work" | "Manual";
  sourceId: string;
  date: string;
  person: string;
  department: string;
  title: string;
  notes: string;
};

type SavedReport = {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  status: "Draft" | "Final";
  items: ReportItem[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  propertyId: string;
  workOrders: Row[];
  colors: {
    navy: string;
    gold: string;
    line: string;
    card: string;
    panel: string;
    muted: string;
    green: string;
  };
  isMobile: boolean;
};

const departments = [
  "Maintenance & Cleaning",
  "Landscape",
  "Dock & Marine",
  "Garage / Vehicles",
  "Pool & Spa",
  "Projects",
  "Administration",
  "Other",
];

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return localDate(copy);
}

function text(...values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function inferDepartment(row: Row) {
  const value = text(
    row.department,
    row.workCategory,
    row.work_category,
    row.responsibilityArea,
    row.responsibility_area,
    row.category,
    row.title,
    row.taskTitle,
    row.listName,
    row.location,
    row.notes,
  );

  if (
    /dock|marine|boat|cobalt|sea.?doo|watercraft|sunstream|lift box|liftbox|waterfront/.test(
      value,
    )
  )
    return "Dock & Marine";

  if (
    /landscap|irrigat|fertiliz|lawn|garden|weed|plant|tree|shrub|yard|grounds/.test(
      value,
    )
  )
    return "Landscape";

  if (
    /garage|vehicle|ford|f-?150|mercedes|rivian|porsche|car clean|wash car|detailing/.test(
      value,
    )
  )
    return "Garage / Vehicles";

  if (/pool|spa|hot tub|sundance|chlorine|filter|backwash/.test(value))
    return "Pool & Spa";

  if (
    /project|install|construction|paint|siding|repair project|renovation/.test(
      value,
    )
  )
    return "Projects";

  if (
    /admin|computer|invoice|receipt|owner update|meeting|email|meterviewer|ramp/.test(
      value,
    )
  )
    return "Administration";

  if (
    /clean|maintenance|appliance|house|window|trash|reset|service|repair|inspect/.test(
      value,
    )
  )
    return "Maintenance & Cleaning";

  return "Other";
}

function displayPerson(row: Row) {
  return String(
    row.assignedTo ||
      row.assignee ||
      row.employeeName ||
      row.employee_name ||
      row.completedBy ||
      "",
  ).trim();
}

function dateOnly(value: unknown) {
  return String(value || "").slice(0, 10);
}

function uniqueDates(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map(dateOnly)
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
    ),
  ).sort();
}

function itemId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function workOrderItems(workOrders: Row[]) {
  const items: ReportItem[] = [];

  for (const row of workOrders) {
    const id = String(row.id || "");
    const history = Array.isArray(row.completionHistory)
      ? row.completionHistory
      : [];
    const serviceHistory = Array.isArray(row.serviceHistory)
      ? (row.serviceHistory as Row[])
      : [];

    const dates = uniqueDates([
      ...history,
      row.lastCompletedDate,
      row.last_completed_date,
      row.status === "Completed"
        ? row.completedAt || row.updatedAt || row.date
        : "",
      ...serviceHistory.map((entry) => entry.completedAt),
    ]);

    for (const date of dates) {
      const matchingHistory = serviceHistory.find(
        (entry) => dateOnly(entry.completedAt) === date,
      );

      items.push({
        id: `wo-${id}-${date}`,
        sourceKey: `work-order:${id}:${date}`,
        sourceType: "Work Order",
        sourceId: id,
        date,
        person: displayPerson(row),
        department: inferDepartment(row),
        title: String(row.title || row.name || "Work order completed"),
        notes: String(
          matchingHistory?.notes ||
            row.completionNotes ||
            row.notes ||
            "",
        ),
      });
    }
  }

  return items;
}

function taskItems(tasks: Row[]) {
  const items: ReportItem[] = [];

  for (const row of tasks) {
    const id = String(row.id || "");
    const meta =
      row.taskMeta && typeof row.taskMeta === "object"
        ? (row.taskMeta as Row)
        : row;

    const history = Array.isArray(meta.completionHistory)
      ? meta.completionHistory
      : [];

    const dates = uniqueDates([
      ...history,
      meta.completedAt,
      meta.lastCompletedDate,
      meta.status === "Completed"
        ? meta.dueDate || row.scheduledDate
        : "",
    ]);

    for (const date of dates) {
      items.push({
        id: `task-${id}-${date}`,
        sourceKey: `task:${id}:${date}`,
        sourceType: "Task / Routine",
        sourceId: id,
        date,
        person: displayPerson({ ...row, ...meta }),
        department: inferDepartment({ ...row, ...meta }),
        title: String(row.title || "Task completed"),
        notes: String(
          meta.addisonNote ||
            meta.notes ||
            row.notes ||
            "",
        ),
      });
    }
  }

  return items;
}

function teamHistoryItems(rows: Row[], propertyId: string) {
  return rows
    .filter(
      (row) =>
        String(row.propertyId || row.property_id || "2000") === propertyId,
    )
    .map((row): ReportItem => {
      const date = dateOnly(row.completedAt || row.completed_at);
      const id = String(row.id || itemId("team"));

      return {
        id,
        sourceKey: `team-work:${id}`,
        sourceType: "Team Work",
        sourceId: String(row.taskId || row.task_id || id),
        date,
        person: displayPerson(row),
        department: inferDepartment(row),
        title: String(
          row.taskTitle ||
            row.task_title ||
            row.title ||
            "Team work completed",
        ),
        notes: String(row.note || row.notes || ""),
      };
    })
    .filter((item) => Boolean(item.date));
}

function dedupeItems(items: ReportItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalizedTitle = item.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ");

    const person = item.person.trim().toLowerCase();
    const key = `${item.date}|${person}|${normalizedTitle}`;

    if (seen.has(item.sourceKey) || seen.has(key)) return false;

    seen.add(item.sourceKey);
    seen.add(key);

    return true;
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reportTitle(start: string, end: string) {
  if (!start || !end) return "Owner Report";

  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  return `Owner Report · ${format(start)}–${format(end)}`;
}

export default function AtlasOwnerReport({
  propertyId,
  workOrders,
  colors,
  isMobile,
}: Props) {
  const [periodStart, setPeriodStart] = useState(startOfWeek());
  const [periodEnd, setPeriodEnd] = useState(localDate());
  const [teamHistory, setTeamHistory] = useState<Row[]>([]);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState("");
  const [status, setStatus] = useState<"Draft" | "Final">("Draft");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const sourceItems = useMemo(
    () =>
      dedupeItems([
        ...workOrderItems(workOrders),
        ...taskItems(tasks),
        ...teamHistoryItems(teamHistory, propertyId),
      ]),
    [workOrders, tasks, teamHistory, propertyId],
  );

  const filteredSourceItems = useMemo(
    () =>
      sourceItems.filter(
        (item) =>
          (!periodStart || item.date >= periodStart) &&
          (!periodEnd || item.date <= periodEnd),
      ),
    [sourceItems, periodStart, periodEnd],
  );

  const loadSavedReports = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/atlas-owner-reports?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store" },
      );

      const payload = await response.json().catch(() => ({}));

      if (
        response.ok &&
        payload.ok &&
        Array.isArray(payload.reports)
      ) {
        setSavedReports(payload.reports);
      }
    } catch {
      setMessage("Saved owner reports could not be loaded.");
    }
  }, [propertyId]);

  useEffect(() => {
    setActiveReportId("");
    setStatus("Draft");
    setItems([]);
    void loadSavedReports();
  }, [propertyId, loadSavedReports]);

  useEffect(() => {
    void fetch(
      `/api/atlas?propertyId=${encodeURIComponent(propertyId)}`,
      { cache: "no-store" },
    )
      .then((response) => response.json())
      .then((payload) => {
        if (payload.ok && Array.isArray(payload.taskRecords)) {
          setTasks(payload.taskRecords);
        } else if (payload.ok && Array.isArray(payload.tasks)) {
          setTasks(payload.tasks);
        }
      })
      .catch(() => undefined);
  }, [propertyId]);

  useEffect(() => {
    void fetch("/api/atlas-team-work", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.ok && Array.isArray(payload.workHistory)) {
          setTeamHistory(payload.workHistory);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeReportId) {
      setItems(filteredSourceItems);
    }
  }, [filteredSourceItems, activeReportId]);

  function buildFreshReport() {
    setActiveReportId("");
    setStatus("Draft");
    setItems(filteredSourceItems);
    setMessage("Report refreshed from completed Atlas work.");
  }

  function updateItem(id: string, patch: Partial<ReportItem>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.filter((item) => item.id !== id),
    );
  }

  function addManualItem() {
    setItems((current) => [
      ...current,
      {
        id: itemId("manual"),
        sourceKey: itemId("manual-source"),
        sourceType: "Manual",
        sourceId: "",
        date: periodEnd || localDate(),
        person: "",
        department: "Other",
        title: "",
        notes: "",
      },
    ]);
  }

  async function saveReport(nextStatus = status) {
    if (!periodStart || !periodEnd) {
      setMessage("Choose the report start and end dates.");
      return;
    }

    setLoading(true);
    setMessage("Saving owner report...");

    try {
      const id =
        activeReportId ||
        `owner-report-${propertyId}-${periodStart}-${periodEnd}`;

      const response = await fetch("/api/atlas-owner-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          propertyId,
          periodStart,
          periodEnd,
          title: reportTitle(periodStart, periodEnd),
          status: nextStatus,
          items,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(
          String(
            payload.error ||
              "Owner report could not be saved.",
          ),
        );
      }

      setActiveReportId(id);
      setStatus(nextStatus);
      setMessage(
        nextStatus === "Final"
          ? "Owner report finalized and saved."
          : "Owner report saved.",
      );

      await loadSavedReports();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Owner report could not be saved.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openSavedReport(report: SavedReport) {
    setActiveReportId(report.id);
    setPeriodStart(report.periodStart);
    setPeriodEnd(report.periodEnd);
    setStatus(report.status);
    setItems(
      Array.isArray(report.items) ? report.items : [],
    );
    setShowSaved(false);
    setMessage(`Opened ${report.title}.`);
  }

  async function deleteSavedReport(id: string) {
    if (
      !window.confirm(
        "Delete this saved owner report? This does not delete any Atlas work records.",
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/atlas-owner-reports?id=${encodeURIComponent(id)}&propertyId=${encodeURIComponent(propertyId)}`,
      {
        method: "DELETE",
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      setMessage(
        String(
          payload.error ||
            "Saved report could not be deleted.",
        ),
      );
      return;
    }

    if (activeReportId === id) {
      buildFreshReport();
    }

    await loadSavedReports();

    setMessage(
      "Saved report deleted. Source work records were not changed.",
    );
  }

  function printOwnerReport() {
    if (!items.length) return;

    const grouped = departments
      .map((department) => ({
        department,
        rows: items.filter(
          (item) => item.department === department,
        ),
      }))
      .filter((group) => group.rows.length);

    const popup = window.open("", "_blank");

    if (!popup) return;

    popup.document.write(
      `<!doctype html>
<html>
<head>
<title>${escapeHtml(reportTitle(periodStart, periodEnd))}</title>
<style>
@page{size:letter;margin:.55in}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#071b2f;margin:0}
.head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #c99a3d;padding-bottom:12px;margin-bottom:18px}
.logo{width:52px;height:52px;object-fit:contain}
h1{font-size:23px;margin:0}
.meta{font-size:11px;color:#667788;margin-top:4px}
.dept{margin:18px 0 8px;font-size:15px;border-bottom:1px solid #d8e0e8;padding-bottom:5px}
.item{padding:7px 0;border-bottom:1px solid #edf0f3;break-inside:avoid}
.line{display:flex;gap:10px;justify-content:space-between}
.title{font-weight:700;font-size:11px}
.when{font-size:10px;color:#667788;white-space:nowrap}
.notes{font-size:10px;color:#405164;margin-top:3px;white-space:pre-wrap}
.summary{font-size:11px;color:#667788;margin-bottom:10px}
</style>
</head>
<body>
<div class="head">
<img src="/atlas-logo.png" class="logo">
<div>
<h1>${escapeHtml(reportTitle(periodStart, periodEnd))}</h1>
<div class="meta">Property ${escapeHtml(propertyId)} · ${items.length} completed item${items.length === 1 ? "" : "s"}</div>
</div>
</div>
<div class="summary">Completed work reviewed and prepared from Atlas.</div>
${grouped
  .map(
    (group) =>
      `<section>
<h2 class="dept">${escapeHtml(group.department)}</h2>
${group.rows
  .map(
    (item) =>
      `<div class="item">
<div class="line">
<div class="title">${escapeHtml(item.title || "Completed work")}${item.person ? ` · ${escapeHtml(item.person)}` : ""}</div>
<div class="when">${escapeHtml(
        new Date(
          `${item.date}T12:00:00`,
        ).toLocaleDateString(),
      )}</div>
</div>
${item.notes ? `<div class="notes">${escapeHtml(item.notes)}</div>` : ""}
</div>`,
  )
  .join("")}
</section>`,
  )
  .join("")}
</body>
</html>`,
    );

    popup.document.close();
    popup.focus();

    window.setTimeout(() => {
      popup.print();
    }, 250);
  }

  const card = {
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    background: colors.card,
    padding: isMobile ? 14 : 18,
    boxShadow: "0 8px 24px rgba(7, 27, 47, 0.05)",
  };

  const control = {
    width: "100%",
    minHeight: 38,
    border: `1px solid ${colors.line}`,
    borderRadius: 9,
    padding: "8px 9px",
    background: "#fff",
    color: colors.navy,
    fontWeight: 700,
    fontSize: 12,
  };

  const button = {
    border: 0,
    borderRadius: 9,
    background: colors.gold,
    color: colors.navy,
    padding: "9px 12px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  const quietButton = {
    ...button,
    background: "#fff",
    border: `1px solid ${colors.line}`,
  };

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              color: colors.gold,
              fontSize: 10,
              fontWeight: 950,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Weekly reporting
          </div>

          <h2
            style={{
              margin: "4px 0 2px",
              color: colors.navy,
              fontSize: 20,
            }}
          >
            Owner Report
          </h2>

          <div
            style={{
              color: colors.muted,
              fontSize: 12,
            }}
          >
            {activeReportId
              ? `${status} saved report`
              : "Live draft from completed Atlas work"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setShowSaved((value) => !value)
            }
            style={quietButton}
          >
            Saved Reports
          </button>

          <button
            type="button"
            onClick={printOwnerReport}
            disabled={!items.length}
            style={{
              ...quietButton,
              opacity: items.length ? 1 : 0.5,
            }}
          >
            Print / PDF
          </button>

          <button
            type="button"
            onClick={() => void saveReport("Draft")}
            disabled={loading}
            style={quietButton}
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => void saveReport("Final")}
            disabled={loading || !items.length}
            style={{
              ...button,
              opacity: items.length ? 1 : 0.5,
            }}
          >
            Finalize
          </button>
        </div>
      </div>

      {showSaved ? (
        <div
          style={{
            display: "grid",
            gap: 6,
            marginBottom: 12,
            padding: 10,
            border: `1px solid ${colors.line}`,
            borderRadius: 11,
            background: colors.panel,
          }}
        >
          {savedReports.length ? (
            savedReports.map((report) => (
              <div
                key={report.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  padding: "7px 8px",
                  background: "#fff",
                  borderRadius: 9,
                }}
              >
                <button
                  type="button"
                  onClick={() => openSavedReport(report)}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    color: colors.navy,
                    fontWeight: 850,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {report.title} · {report.status} ·{" "}
                  {report.items.length}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void deleteSavedReport(report.id)
                  }
                  style={{
                    ...quietButton,
                    padding: "6px 8px",
                    fontSize: 11,
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div
              style={{
                color: colors.muted,
                fontSize: 12,
              }}
            >
              No saved owner reports yet.
            </div>
          )}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr 1fr"
            : "150px 150px auto auto",
          gap: 7,
          alignItems: "end",
          marginBottom: 11,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 4,
            color: colors.muted,
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          FROM
          <input
            type="date"
            value={periodStart}
            onChange={(event) => {
              setActiveReportId("");
              setPeriodStart(event.currentTarget.value);
            }}
            style={control}
          />
        </label>

        <label
          style={{
            display: "grid",
            gap: 4,
            color: colors.muted,
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          TO
          <input
            type="date"
            value={periodEnd}
            onChange={(event) => {
              setActiveReportId("");
              setPeriodEnd(event.currentTarget.value);
            }}
            style={control}
          />
        </label>

        <button
          type="button"
          onClick={buildFreshReport}
          style={quietButton}
        >
          Refresh from Atlas
        </button>

        <button
          type="button"
          onClick={addManualItem}
          style={quietButton}
        >
          Add Item
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
          color: colors.muted,
          fontSize: 11,
        }}
      >
        <span>
          <strong style={{ color: colors.navy }}>
            {items.length}
          </strong>{" "}
          items in report
        </span>

        <span>
          Edits and removals here do not change source records.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 7,
        }}
      >
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 11,
                padding: 9,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "110px 120px minmax(145px,.8fr) minmax(220px,1.5fr) minmax(220px,1.5fr) auto",
                gap: 7,
                alignItems: "start",
              }}
            >
              <input
                type="date"
                value={item.date}
                onChange={(event) =>
                  updateItem(item.id, {
                    date: event.currentTarget.value,
                  })
                }
                style={control}
              />

              <input
                value={item.person}
                onChange={(event) =>
                  updateItem(item.id, {
                    person: event.currentTarget.value,
                  })
                }
                placeholder="Person"
                style={control}
              />

              <select
                value={item.department}
                onChange={(event) =>
                  updateItem(item.id, {
                    department: event.currentTarget.value,
                  })
                }
                style={control}
              >
                {departments.map((department) => (
                  <option key={department}>
                    {department}
                  </option>
                ))}
              </select>

              <input
                value={item.title}
                onChange={(event) =>
                  updateItem(item.id, {
                    title: event.currentTarget.value,
                  })
                }
                placeholder="Completed work"
                style={control}
              />

              <textarea
                value={item.notes}
                onChange={(event) =>
                  updateItem(item.id, {
                    notes: event.currentTarget.value,
                  })
                }
                placeholder="Notes"
                rows={isMobile ? 2 : 1}
                style={{
                  ...control,
                  resize: "vertical",
                  minHeight: 38,
                }}
              />

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                style={{
                  ...quietButton,
                  padding: "9px 10px",
                }}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: 16,
              border: `1px dashed ${colors.line}`,
              borderRadius: 11,
              color: colors.muted,
              fontSize: 12,
            }}
          >
            No completed work found for this date range. You can
            add an item manually.
          </div>
        )}
      </div>

      {message ? (
        <div
          style={{
            marginTop: 10,
            color: colors.navy,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}
