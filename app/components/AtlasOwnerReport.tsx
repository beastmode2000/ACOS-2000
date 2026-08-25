`app/components/AtlasOwnerReport.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;

type ReportItem = {
  id: string;
  sourceKey: string;
  sourceType: "Work Order" | "Task / Routine" | "Team Work" | "Manual" | "Vendor Visit";
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
  "Maintenance",
  "Landscape",
  "Interior / House",
  "Cleaning",
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

function mondayOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return localDate(date);
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

function recordText(...values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function inferDepartment(row: Row) {
  const value = recordText(
    row.department,
    row.workCategory,
    row.work_category,
    row.responsibilityArea,
    row.responsibility_area,
    row.category,
    row.title,
    row.taskTitle,
    row.task_title,
    row.listName,
    row.location,
    row.notes,
    row.note,
  );

  if (/dock|marine|boat|cobalt|sea.?doo|watercraft|sunstream|lift box|liftbox|waterfront/.test(value)) return "Dock & Marine";
  if (/landscap|irrigat|fertiliz|lawn|garden|weed|plant|tree|shrub|yard|grounds/.test(value)) return "Landscape";
  if (/garage|vehicle|ford|f-?150|mercedes|rivian|porsche|car clean|wash car|detail/.test(value)) return "Garage / Vehicles";
  if (/pool|spa|hot tub|sundance|chlorine|filter|backwash/.test(value)) return "Pool & Spa";
  if (/project|construction|paint|siding|renovat|install/.test(value)) return "Projects";
  if (/admin|invoice|receipt|owner update|meeting|email|computer/.test(value)) return "Administration";
  if (/clean|laundry|housekeep|vacuum|mop|linen/.test(value)) return "Cleaning";
  if (/interior|house|room|kitchen|bath|bedroom|appliance|furniture|cabinet|blind|shade/.test(value)) return "Interior / House";
  if (/maintenance|service|repair|inspect|window|trash|reset/.test(value)) return "Maintenance";
  return "Other";
}

function displayPerson(row: Row) {
  return String(
    row.completedBy ||
      row.completed_by ||
      row.assignedTo ||
      row.assigned_to ||
      row.assignee ||
      row.employeeName ||
      row.employee_name ||
      "",
  ).trim();
}

function completedWorkOrderItems(workOrders: Row[]) {
  const items: ReportItem[] = [];

  for (const row of workOrders) {
    const id = String(row.id || "");
    const completionHistory = Array.isArray(row.completionHistory)
      ? row.completionHistory
      : [];
    const serviceHistory = Array.isArray(row.serviceHistory)
      ? (row.serviceHistory as Row[])
      : [];

    const dates = uniqueDates([
      ...completionHistory,
      row.lastCompletedDate,
      row.last_completed_date,
      row.status === "Completed" || row.status === "Closed"
        ? row.completedAt || row.completed_at || row.updatedAt || row.date
        : "",
      ...serviceHistory.map(
        (entry) => entry.completedAt || entry.completed_at,
      ),
    ]);

    for (const date of dates) {
      const matchingHistory = serviceHistory.filter(
        (entry) =>
          dateOnly(entry.completedAt || entry.completed_at) === date,
      );

      if (matchingHistory.length > 1) {
        matchingHistory.forEach((historyEntry, index) => {
          items.push({
            id: `wo-${id}-${date}-${index}`,
            sourceKey: `work-order:${id}:${date}:${index}`,
            sourceType: "Work Order",
            sourceId: id,
            date,
            person: displayPerson({
              ...row,
              ...historyEntry,
            }),
            department: inferDepartment({
              ...row,
              ...historyEntry,
            }),
            title: String(
              historyEntry.title ||
                historyEntry.name ||
                historyEntry.assetName ||
                historyEntry.asset_name ||
                row.title ||
                row.name ||
                "Work order completed",
            ),
            notes: String(
              historyEntry.notes ||
                historyEntry.note ||
                row.completionNotes ||
                row.completion_notes ||
                "",
            ),
          });
        });

        continue;
      }

      const historyEntry = matchingHistory[0];

      items.push({
        id: `wo-${id}-${date}`,
        sourceKey: `work-order:${id}:${date}`,
        sourceType: "Work Order",
        sourceId: id,
        date,
        person: displayPerson({
          ...row,
          ...(historyEntry || {}),
        }),
        department: inferDepartment({
          ...row,
          ...(historyEntry || {}),
        }),
        title: String(
          historyEntry?.title ||
            historyEntry?.name ||
            historyEntry?.assetName ||
            historyEntry?.asset_name ||
            row.title ||
            row.name ||
            "Work order completed",
        ),
        notes: String(
          historyEntry?.notes ||
            historyEntry?.note ||
            row.completionNotes ||
            row.completion_notes ||
            row.notes ||
            "",
        ),
      });
    }
  }

  return items;
}

function completedTaskItems(tasks: Row[]) {
  const items: ReportItem[] = [];

  for (const row of tasks) {
    const meta =
      row.taskMeta && typeof row.taskMeta === "object"
        ? (row.taskMeta as Row)
        : row;

    const id = String(row.id || meta.id || "");
    const completionHistory = Array.isArray(meta.completionHistory)
      ? meta.completionHistory
      : [];

    const dates = uniqueDates([
      ...completionHistory,
      meta.completedAt,
      meta.completed_at,
      meta.lastCompletedDate,
      meta.last_completed_date,
      meta.status === "Completed"
        ? meta.dueDate ||
          meta.due_date ||
          row.scheduledDate ||
          row.scheduled_date
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
        title: String(row.title || meta.title || "Task completed"),
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

function completedTeamItems(rows: Row[], propertyId: string) {
  return rows
    .filter(
      (row) =>
        String(row.propertyId || row.property_id || "2000") ===
        propertyId,
    )
    .map((row): ReportItem => {
      const id = String(
        row.id ||
          row.eventKey ||
          row.event_key ||
          "",
      );

      return {
        id: `team-${id}`,
        sourceKey: `team-work:${id}`,
        sourceType: "Team Work",
        sourceId: String(
          row.taskId ||
            row.task_id ||
            id,
        ),
        date: dateOnly(
          row.completedAt ||
            row.completed_at,
        ),
        person: displayPerson(row),
        department: inferDepartment(row),
        title: String(
          row.taskTitle ||
            row.task_title ||
            row.title ||
            "Team work completed",
        ),
        notes: String(
          row.note ||
            row.notes ||
            "",
        ),
      };
    })
    .filter((item) => Boolean(item.id && item.date));
}

function dedupeItems(items: ReportItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.sourceKey)) {
      return false;
    }

    seen.add(item.sourceKey);
    return true;
  });
}

function mergeSourceWithDraft(
  source: ReportItem[],
  current: ReportItem[],
) {
  const currentSourceItems = new Map(
    current
      .filter(
        (item) =>
          item.sourceType !== "Manual" &&
          item.sourceType !== "Vendor Visit",
      )
      .map((item) => [
        item.sourceKey,
        item,
      ]),
  );

  const sourceWithEdits = source.map(
    (item) => {
      const edited =
        currentSourceItems.get(
          item.sourceKey,
        );

      if (!edited) {
        return item;
      }

      return {
        ...item,
        person: edited.person,
        department: edited.department,
        title: edited.title,
        notes: edited.notes,
      };
    },
  );

  const manualItems = current.filter(
    (item) =>
      item.sourceType === "Manual" ||
      item.sourceType === "Vendor Visit",
  );

  return dedupeItems([
    ...sourceWithEdits,
    ...manualItems,
  ]);
}

function reportTitle(start: string, end: string) {
  if (!start || !end) {
    return "Weekly Owner Report";
  }

  const format = (value: string) =>
    new Date(
      `${value}T12:00:00`,
    ).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  return `Weekly Owner Report · ${format(start)}–${format(end)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dayLabel(date: string) {
  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function personLabel(person: string) {
  return person.trim() || "Team";
}

export default function AtlasOwnerReport({
  propertyId,
  workOrders,
  colors,
  isMobile,
}: Props) {
  const [periodStart, setPeriodStart] =
    useState(mondayOfCurrentWeek());

  const [periodEnd, setPeriodEnd] =
    useState(localDate());

  const [tasks, setTasks] =
    useState<Row[]>([]);

  const [teamHistory, setTeamHistory] =
    useState<Row[]>([]);

  const [items, setItems] =
    useState<ReportItem[]>([]);

  const [savedReports, setSavedReports] =
    useState<SavedReport[]>([]);

  const [activeReportId, setActiveReportId] =
    useState("");

  const [status, setStatus] = useState<
    "Draft" | "Final"
  >("Draft");

  const [message, setMessage] =
    useState("");

  const [
    showSavedReports,
    setShowSavedReports,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const sourceItems = useMemo(
    () =>
      dedupeItems([
        ...completedWorkOrderItems(
          workOrders,
        ),
        ...completedTaskItems(tasks),
        ...completedTeamItems(
          teamHistory,
          propertyId,
        ),
      ]),
    [
      workOrders,
      tasks,
      teamHistory,
      propertyId,
    ],
  );

  const filteredSourceItems = useMemo(
    () =>
      sourceItems.filter(
        (item) =>
          (!periodStart ||
            item.date >= periodStart) &&
          (!periodEnd ||
            item.date <= periodEnd),
      ),
    [
      sourceItems,
      periodStart,
      periodEnd,
    ],
  );

  const regularItems = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.sourceType !==
            "Vendor Visit",
        )
        .sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(
              b.date,
            );
          }

          const people =
            personLabel(
              a.person,
            ).localeCompare(
              personLabel(b.person),
            );

          if (people !== 0) {
            return people;
          }

          return (
            departments.indexOf(
              a.department,
            ) -
            departments.indexOf(
              b.department,
            )
          );
        }),
    [items],
  );

  const vendorItems = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.sourceType ===
            "Vendor Visit",
        )
        .sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
    [items],
  );

  const reportDays = useMemo(
    () =>
      Array.from(
        new Set(
          regularItems.map(
            (item) => item.date,
          ),
        ),
      ).sort(),
    [regularItems],
  );

  async function loadSavedReports() {
    const response = await fetch(
      `/api/atlas-owner-reports?propertyId=${encodeURIComponent(
        propertyId,
      )}`,
      {
        cache: "no-store",
      },
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (
      response.ok &&
      payload.ok &&
      Array.isArray(payload.reports)
    ) {
      setSavedReports(payload.reports);
    }
  }

  useEffect(() => {
    setActiveReportId("");
    setStatus("Draft");
    setItems([]);

    void loadSavedReports().catch(
      () =>
        setMessage(
          "Saved owner reports could not be loaded.",
        ),
    );
  }, [propertyId]);

  useEffect(() => {
    void fetch(
      `/api/atlas?propertyId=${encodeURIComponent(
        propertyId,
      )}`,
      {
        cache: "no-store",
      },
    )
      .then((response) =>
        response.json(),
      )
      .then((payload) => {
        if (!payload.ok) return;

        setTasks(
          Array.isArray(
            payload.taskRecords,
          )
            ? payload.taskRecords
            : Array.isArray(
                  payload.tasks,
                )
              ? payload.tasks
              : [],
        );
      })
      .catch(() => setTasks([]));
  }, [propertyId]);

  useEffect(() => {
    void fetch(
      "/api/atlas-team-work",
      {
        cache: "no-store",
      },
    )
      .then((response) =>
        response.json(),
      )
      .then((payload) =>
        setTeamHistory(
          payload.ok &&
            Array.isArray(
              payload.workHistory,
            )
            ? payload.workHistory
            : [],
        ),
      )
      .catch(() =>
        setTeamHistory([]),
      );
  }, []);

  useEffect(() => {
    if (activeReportId) {
      return;
    }

    setItems((current) =>
      mergeSourceWithDraft(
        filteredSourceItems,
        current,
      ),
    );
  }, [
    filteredSourceItems,
    activeReportId,
  ]);

  function refreshFromAtlas() {
    setActiveReportId("");
    setStatus("Draft");

    setItems((current) => {
      const manualItems =
        current.filter(
          (item) =>
            item.sourceType ===
              "Manual" ||
            item.sourceType ===
              "Vendor Visit",
        );

      return dedupeItems([
        ...filteredSourceItems,
        ...manualItems,
      ]);
    });

    setMessage(
      "Report refreshed from completed Atlas work.",
    );
  }

  function updateItem(
    id: string,
    patch: Partial<ReportItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function addManualItem(
    date = periodEnd || localDate(),
  ) {
    const id = `manual-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    setItems((current) => [
      ...current,
      {
        id,
        sourceKey: id,
        sourceType: "Manual",
        sourceId: "",
        date,
        person: "",
        department: "Maintenance",
        title: "",
        notes: "",
      },
    ]);
  }

  function addVendorVisit(
    date = periodEnd || localDate(),
  ) {
    const id = `vendor-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    setItems((current) => [
      ...current,
      {
        id,
        sourceKey: id,
        sourceType: "Vendor Visit",
        sourceId: "",
        date,
        person: "",
        department: "Other",
        title: "",
        notes: "",
      },
    ]);
  }

  async function saveReport(
    nextStatus: "Draft" | "Final",
  ) {
    if (!periodStart || !periodEnd) {
      setMessage(
        "Choose the report start and end dates.",
      );
      return;
    }

    setSaving(true);
    setMessage(
      "Saving owner report...",
    );

    try {
      const id =
        activeReportId ||
        `owner-report-${propertyId}-${periodStart}-${periodEnd}`;

      const response = await fetch(
        "/api/atlas-owner-reports",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            propertyId,
            periodStart,
            periodEnd,
            title: reportTitle(
              periodStart,
              periodEnd,
            ),
            status: nextStatus,
            items,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !payload.ok
      ) {
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
      setSaving(false);
    }
  }

  function openSavedReport(
    report: SavedReport,
  ) {
    setActiveReportId(report.id);
    setPeriodStart(report.periodStart);
    setPeriodEnd(report.periodEnd);
    setStatus(report.status);

    setItems(
      Array.isArray(report.items)
        ? report.items
        : [],
    );

    setShowSavedReports(false);

    setMessage(
      `Opened ${report.title}.`,
    );
  }

  async function deleteSavedReport(
    report: SavedReport,
  ) {
    if (
      !window.confirm(
        "Delete this saved owner report? Source Atlas records will not be deleted.",
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/atlas-owner-reports?id=${encodeURIComponent(
        report.id,
      )}&propertyId=${encodeURIComponent(
        propertyId,
      )}`,
      {
        method: "DELETE",
      },
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (
      !response.ok ||
      !payload.ok
    ) {
      setMessage(
        String(
          payload.error ||
            "Saved report could not be deleted.",
        ),
      );

      return;
    }

    if (
      activeReportId === report.id
    ) {
      refreshFromAtlas();
    }

    await loadSavedReports();

    setMessage(
      "Saved report deleted. Source records were not changed.",
    );
  }

  function printReport() {
    if (!items.length) return;

    const popup =
      window.open("", "_blank");

    if (!popup) return;

    const days = Array.from(
      new Set(
        regularItems.map(
          (item) => item.date,
        ),
      ),
    ).sort();

    const dayHtml = days
      .map((date) => {
        const dayItems =
          regularItems.filter(
            (item) =>
              item.date === date,
          );

        const people = Array.from(
          new Set(
            dayItems.map((item) =>
              personLabel(
                item.person,
              ),
            ),
          ),
        ).sort();

        return `
          <section class="day">
            <div class="dayHead">
              <strong>${escapeHtml(
                dayLabel(date),
              )}</strong>
            </div>

            ${people
              .map((person) => {
                const personItems =
                  dayItems.filter(
                    (item) =>
                      personLabel(
                        item.person,
                      ) ===
                      person,
                  );

                const groups =
                  departments
                    .map(
                      (
                        department,
                      ) => ({
                        department,
                        rows: personItems.filter(
                          (item) =>
                            item.department ===
                            department,
                        ),
                      }),
                    )
                    .filter(
                      (group) =>
                        group.rows
                          .length,
                    );

                return `
                  <div class="person">
                    <div class="personName">
                      ${escapeHtml(
                        person,
                      )}
                    </div>

                    ${groups
                      .map(
                        (group) => `
                        <div class="group">
                          <div class="groupName">
                            ${escapeHtml(
                              group.department,
                            )}
                          </div>

                          ${group.rows
                            .map(
                              (
                                item,
                              ) => `
                              <div class="item">
                                <div class="title">
                                  ${escapeHtml(
                                    item.title ||
                                      "Completed work",
                                  )}
                                </div>

                                ${
                                  item.notes
                                    ? `<div class="notes">${escapeHtml(
                                        item.notes,
                                      )}</div>`
                                    : ""
                                }
                              </div>
                            `,
                            )
                            .join(
                              "",
                            )}
                        </div>
                      `,
                      )
                      .join("")}
                  </div>
                `;
              })
              .join("")}
          </section>
        `;
      })
      .join("");

    const vendorHtml =
      vendorItems.length
        ? `
        <section class="vendors">
          <div class="vendorTitle">
            Vendor Visits
          </div>

          ${vendorItems
            .map(
              (item) => `
            <div class="vendor">
              <div class="vendorTop">
                <strong>
                  ${escapeHtml(
                    item.person ||
                      "Vendor",
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    dayLabel(
                      item.date,
                    ),
                  )}
                </span>
              </div>

              ${
                item.title
                  ? `<div class="vendorService">${escapeHtml(
                      item.title,
                    )}</div>`
                  : ""
              }

              ${
                item.notes
                  ? `<div class="notes">${escapeHtml(
                      item.notes,
                    )}</div>`
                  : ""
              }
            </div>
          `,
            )
            .join("")}
        </section>
      `
        : "";

    popup.document.write(
      `<!doctype html>
<html>
<head>
<title>${escapeHtml(
        reportTitle(
          periodStart,
          periodEnd,
        ),
      )}</title>

<style>
@page{size:letter;margin:.45in}
*{box-sizing:border-box}
body{margin:0;font-family:Arial,sans-serif;color:#071B2F;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{background:#071B2F;border-radius:10px;overflow:hidden;margin-bottom:14px}
.headerMain{display:flex;justify-content:space-between;align-items:center;padding:16px 18px}
.brand{display:flex;align-items:center;gap:13px}
.logoBox{width:54px;height:54px;border-radius:9px;background:#fff;display:grid;place-items:center}
.logo{width:46px;height:46px;object-fit:contain}
.kicker{color:#C99A3D;font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
h1{margin:3px 0 0;color:#fff;font-size:22px}
.range{margin-top:4px;color:rgba(255,255,255,.72);font-size:9px}
.property{text-align:right;color:#fff}
.property small{display:block;color:#C99A3D;font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.property strong{display:block;margin-top:3px;font-size:18px}
.gold{height:5px;background:#C99A3D}
.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
.summaryBox{border:1px solid #DDE7F0;border-radius:8px;padding:7px 9px;background:#F8FAFC}
.summaryBox small{display:block;color:#64748B;font-size:7px;font-weight:900;text-transform:uppercase}
.summaryBox strong{display:block;margin-top:2px;font-size:13px}
.day{border:1px solid #DDE7F0;border-radius:8px;overflow:hidden;margin-bottom:12px;break-inside:avoid-page}
.dayHead{padding:7px 9px;background:#071B2F;color:#fff;font-size:12px}
.person{padding:8px 10px}
.person+.person{border-top:1px solid #DDE7F0}
.personName{font-size:12px;font-weight:900;padding-bottom:4px;margin-bottom:5px;border-bottom:2px solid #C99A3D}
.group{margin-bottom:7px}
.groupName{color:#C99A3D;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
.item{padding:4px 7px;border-left:3px solid #DDE7F0;background:#F8FAFC;margin-bottom:3px}
.title{font-size:9.5px;font-weight:700}
.notes{margin-top:2px;color:#64748B;font-size:8.5px;line-height:1.35;white-space:pre-wrap}
.vendors{margin-top:16px}
.vendorTitle{background:#071B2F;color:#fff;padding:7px 9px;border-radius:7px;font-size:12px;font-weight:900;margin-bottom:7px}
.vendor{border:1px solid #DDE7F0;border-left:4px solid #C99A3D;border-radius:7px;padding:7px 9px;margin-bottom:6px;break-inside:avoid}
.vendorTop{display:flex;justify-content:space-between;gap:10px;font-size:9px}
.vendorTop span{color:#64748B;font-size:8px}
.vendorService{margin-top:3px;font-size:9px;font-weight:700}
.footer{display:flex;justify-content:space-between;margin-top:16px;padding-top:6px;border-top:1px solid #DDE7F0;color:#64748B;font-size:7px}
</style>
</head>

<body>

<header class="header">
  <div class="headerMain">
    <div class="brand">
      <div class="logoBox">
        <img class="logo" src="/atlas-logo.png" alt="Atlas">
      </div>

      <div>
        <div class="kicker">
          Atlas Estate Operations
        </div>

        <h1>
          Weekly Owner Report
        </h1>

        <div class="range">
          ${escapeHtml(
            periodStart,
          )} – ${escapeHtml(
            periodEnd,
          )}
        </div>
      </div>
    </div>

    <div class="property">
      <small>Property</small>
      <strong>
        ${escapeHtml(
          propertyId,
        )}
      </strong>
    </div>
  </div>

  <div class="gold"></div>
</header>

<div class="summary">
  <div class="summaryBox">
    <small>Team Work</small>
    <strong>
      ${regularItems.length}
    </strong>
  </div>

  <div class="summaryBox">
    <small>Vendor Visits</small>
    <strong>
      ${vendorItems.length}
    </strong>
  </div>
</div>

${dayHtml}
${vendorHtml}

<footer class="footer">
  <span>
    Atlas Estate Operations
  </span>

  <span>
    Generated ${escapeHtml(
      new Date().toLocaleString(),
    )}
  </span>
</footer>

</body>
</html>`,
    );

    popup.document.close();
    popup.focus();

    window.setTimeout(
      () => popup.print(),
      250,
    );
  }

  const cardStyle = {
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    background: colors.card,
    padding: isMobile ? 14 : 18,
    boxShadow:
      "0 8px 24px rgba(7,27,47,.05)",
  };

  const controlStyle = {
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

  const buttonStyle = {
    border: 0,
    borderRadius: 9,
    background: colors.gold,
    color: colors.navy,
    padding: "9px 12px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  const quietButtonStyle = {
    ...buttonStyle,
    background: "#fff",
    border: `1px solid ${colors.line}`,
  };

  function deleteItem(id: string) {
    setItems((current) =>
      current.filter(
        (item) =>
          item.id !== id,
      ),
    );
  }

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
          alignItems:
            "flex-start",
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
              letterSpacing:
                ".12em",
              textTransform:
                "uppercase",
            }}
          >
            Weekly reporting
          </div>

          <h2
            style={{
              margin:
                "4px 0 2px",
              color:
                colors.navy,
              fontSize: 20,
            }}
          >
            Weekly Owner Report
          </h2>

          <div
            style={{
              color:
                colors.muted,
              fontSize: 12,
            }}
          >
            Property{" "}
            {propertyId} ·{" "}
            {activeReportId
              ? `${status} saved report`
              : "live draft"}
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
              setShowSavedReports(
                (value) =>
                  !value,
              )
            }
            style={
              quietButtonStyle
            }
          >
            Saved Reports
          </button>

          <button
            type="button"
            onClick={
              printReport
            }
            disabled={
              !items.length
            }
            style={{
              ...quietButtonStyle,
              opacity:
                items.length
                  ? 1
                  : 0.5,
            }}
          >
            Print / PDF
          </button>

          <button
            type="button"
            onClick={() =>
              void saveReport(
                "Draft",
              )
            }
            disabled={saving}
            style={
              quietButtonStyle
            }
          >
            Save
          </button>

          <button
            type="button"
            onClick={() =>
              void saveReport(
                "Final",
              )
            }
            disabled={
              saving ||
              !items.length
            }
            style={{
              ...buttonStyle,
              opacity:
                items.length
                  ? 1
                  : 0.5,
            }}
          >
            Finalize
          </button>
        </div>
      </div>

      {showSavedReports ? (
        <div
          style={{
            display: "grid",
            gap: 6,
            marginBottom: 12,
            padding: 10,
            border: `1px solid ${colors.line}`,
            borderRadius: 11,
            background:
              colors.panel,
          }}
        >
          {savedReports.length ? (
            savedReports.map(
              (report) => (
                <div
                  key={
                    report.id
                  }
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    gap: 8,
                    alignItems:
                      "center",
                    flexWrap:
                      "wrap",
                    padding:
                      "7px 8px",
                    background:
                      "#fff",
                    borderRadius: 9,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      openSavedReport(
                        report,
                      )
                    }
                    style={{
                      border: 0,
                      background:
                        "transparent",
                      padding: 0,
                      color:
                        colors.navy,
                      fontWeight: 850,
                      cursor:
                        "pointer",
                      textAlign:
                        "left",
                    }}
                  >
                    {report.title} ·{" "}
                    {report.status} ·{" "}
                    {
                      report.items
                        .length
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void deleteSavedReport(
                        report,
                      )
                    }
                    style={{
                      ...quietButtonStyle,
                      padding:
                        "6px 8px",
                      fontSize: 11,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            )
          ) : (
            <div
              style={{
                color:
                  colors.muted,
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
          gridTemplateColumns:
            isMobile
              ? "1fr 1fr"
              : "150px 150px auto auto auto",
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
            value={
              periodStart
            }
            onChange={(
              event,
            ) => {
              setActiveReportId(
                "",
              );

              setPeriodStart(
                event
                  .currentTarget
                  .value,
              );
            }}
            style={
              controlStyle
            }
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
            onChange={(
              event,
            ) => {
              setActiveReportId(
                "",
              );

              setPeriodEnd(
                event
                  .currentTarget
                  .value,
              );
            }}
            style={
              controlStyle
            }
          />
        </label>

        <button
          type="button"
          onClick={
            refreshFromAtlas
          }
          style={
            quietButtonStyle
          }
        >
          Refresh from Atlas
        </button>

        <button
          type="button"
          onClick={() =>
            addManualItem()
          }
          style={
            quietButtonStyle
          }
        >
          Add Work
        </button>

        <button
          type="button"
          onClick={() =>
            addVendorVisit()
          }
          style={
            quietButtonStyle
          }
        >
          Add Vendor Visit
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        {reportDays.map(
          (date) => {
            const dayItems =
              regularItems.filter(
                (item) =>
                  item.date ===
                  date,
              );

            const people =
              Array.from(
                new Set(
                  dayItems.map(
                    (
                      item,
                    ) =>
                      personLabel(
                        item.person,
                      ),
                  ),
                ),
              ).sort();

            return (
              <section
                key={date}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 11,
                  overflow:
                    "hidden",
                }}
              >
                <div
                  style={{
                    background:
                      colors.navy,
                    color:
                      "#fff",
                    padding:
                      "8px 10px",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                  }}
                >
                  <strong>
                    {dayLabel(
                      date,
                    )}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      addManualItem(
                        date,
                      )
                    }
                    style={{
                      ...quietButtonStyle,
                      padding:
                        "5px 8px",
                      color:
                        "#fff",
                      background:
                        "rgba(255,255,255,.08)",
                      borderColor:
                        "rgba(255,255,255,.25)",
                      fontSize: 11,
                    }}
                  >
                    + Add Work
                  </button>
                </div>

                <div
                  style={{
                    padding: 10,
                    display:
                      "grid",
                    gap: 10,
                  }}
                >
                  {people.map(
                    (
                      person,
                    ) => {
                      const personItems =
                        dayItems.filter(
                          (
                            item,
                          ) =>
                            personLabel(
                              item.person,
                            ) ===
                            person,
                        );

                      return (
                        <div
                          key={`${date}-${person}`}
                        >
                          <div
                            style={{
                              color:
                                colors.navy,
                              fontWeight: 900,
                              fontSize: 14,
                              paddingBottom: 4,
                              borderBottom: `2px solid ${colors.gold}`,
                            }}
                          >
                            {
                              person
                            }
                          </div>

                          {personItems.map(
                            (
                              item,
                            ) => (
                              <div
                                key={
                                  item.id
                                }
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    isMobile
                                      ? "1fr"
                                      : "150px minmax(180px,1fr) minmax(220px,1.4fr) auto",
                                  gap: 7,
                                  padding:
                                    "7px 0",
                                  borderBottom: `1px solid ${colors.line}`,
                                }}
                              >
                                <select
                                  value={
                                    item.department
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      item.id,
                                      {
                                        department:
                                          event
                                            .currentTarget
                                            .value,
                                      },
                                    )
                                  }
                                  style={
                                    controlStyle
                                  }
                                >
                                  {departments.map(
                                    (
                                      department,
                                    ) => (
                                      <option
                                        key={
                                          department
                                        }
                                      >
                                        {
                                          department
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>

                                <input
                                  value={
                                    item.title
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      item.id,
                                      {
                                        title:
                                          event
                                            .currentTarget
                                            .value,
                                      },
                                    )
                                  }
                                  placeholder="Completed work"
                                  style={
                                    controlStyle
                                  }
                                />

                                <textarea
                                  value={
                                    item.notes
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      item.id,
                                      {
                                        notes:
                                          event
                                            .currentTarget
                                            .value,
                                      },
                                    )
                                  }
                                  placeholder="What was done"
                                  rows={1}
                                  style={{
                                    ...controlStyle,
                                    resize:
                                      "vertical",
                                    minHeight: 38,
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteItem(
                                      item.id,
                                    )
                                  }
                                  style={{
                                    ...quietButtonStyle,
                                    padding:
                                      "8px 9px",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            );
          },
        )}

        <section
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 11,
            padding: 10,
            background:
              colors.panel,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 8,
              alignItems:
                "center",
              marginBottom: 8,
            }}
          >
            <strong
              style={{
                color:
                  colors.navy,
                fontSize: 15,
              }}
            >
              Vendor Visits
            </strong>

            <button
              type="button"
              onClick={() =>
                addVendorVisit()
              }
              style={
                quietButtonStyle
              }
            >
              + Add Vendor Visit
            </button>
          </div>

          {vendorItems.length ? (
            vendorItems.map(
              (item) => (
                <div
                  key={item.id}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      isMobile
                        ? "1fr"
                        : "115px 160px 190px minmax(220px,1fr) auto",
                    gap: 7,
                    padding:
                      "7px 0",
                    borderBottom: `1px solid ${colors.line}`,
                  }}
                >
                  <input
                    type="date"
                    value={
                      item.date
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        item.id,
                        {
                          date: event
                            .currentTarget
                            .value,
                        },
                      )
                    }
                    style={
                      controlStyle
                    }
                  />

                  <input
                    value={
                      item.person
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        item.id,
                        {
                          person:
                            event
                              .currentTarget
                              .value,
                        },
                      )
                    }
                    placeholder="Vendor"
                    style={
                      controlStyle
                    }
                  />

                  <input
                    value={
                      item.title
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        item.id,
                        {
                          title:
                            event
                              .currentTarget
                              .value,
                        },
                      )
                    }
                    placeholder="Service / visit"
                    style={
                      controlStyle
                    }
                  />

                  <textarea
                    value={
                      item.notes
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        item.id,
                        {
                          notes:
                            event
                              .currentTarget
                              .value,
                        },
                      )
                    }
                    placeholder="What was done"
                    rows={1}
                    style={{
                      ...controlStyle,
                      resize:
                        "vertical",
                      minHeight: 38,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      deleteItem(
                        item.id,
                      )
                    }
                    style={{
                      ...quietButtonStyle,
                      padding:
                        "8px 9px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            )
          ) : (
            <div
              style={{
                color:
                  colors.muted,
                fontSize: 12,
              }}
            >
              No vendor visits added for this week.
            </div>
          )}
        </section>
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
```
