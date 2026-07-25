"use client";

import React, { useMemo, useState } from "react";

import type {
  WorkOrderRecurrenceUnit,
  WorkSeason,
} from "../lib/atlas-types";

type WorkItemType =
  | "Quick Task"
  | "Work Order"
  | "Preventive Maintenance"
  | "Project";

type WorkEffort =
  | "5 minutes"
  | "15 minutes"
  | "30 minutes"
  | "1 hour"
  | "Half Day"
  | "Full Day"
  | "Multi-Day";

const DEFAULT_CATEGORIES = [
  "🧹 Cleaning",
  "🔧 Maintenance",
  "🌳 Landscaping",
  "💧 Irrigation",
  "⚡ Electrical",
  "🚿 Plumbing",
  "❄️ HVAC",
  "🔥 Boilers",
  "🏊 Pool & Spa",
  "🚤 Dock / Marine",
  "🚗 Vehicles",
  "🏠 Interior",
  "🏡 Exterior",
  "🎨 Painting",
  "🔍 Inspection",
  "🛡️ Safety",
  "📦 Parts / Ordering",
  "🤝 Vendor Coordination",
  "🗂️ Administrative",
];

const TYPE_TABS: Array<{ id: string; label: string }> = [
  { id: "my-work", label: "📋 My Work" },
  { id: "Quick Task", label: "✅ Tasks" },
  { id: "Work Order", label: "🛠️ Work Orders" },
  { id: "Preventive Maintenance", label: "🔁 Maintenance" },
  { id: "completed", label: "📚 Completed" },
];

function itemType(record: any): WorkItemType {
  if (
    record.workType === "Quick Task" ||
    record.workType === "Work Order" ||
    record.workType === "Preventive Maintenance" ||
    record.workType === "Project"
  ) {
    return record.workType;
  }

  return record.recurring ? "Preventive Maintenance" : "Work Order";
}

function categoryLabel(record: any) {
  return String(record.workCategory || record.category || "🔧 Maintenance");
}

function isDueNow(record: any) {
  if (record.status === "Completed") return false;
  if (!record.date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${record.date}T12:00:00`);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);
  return due <= soon;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateFromValue(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;

  const date = new Date(
    text.includes("T") ? text : `${text}T12:00:00`,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function recordCompletionDate(record: any) {
  const direct = dateFromValue(record.lastCompletedDate);
  if (direct) return direct;

  const completionHistory = Array.isArray(record.completionHistory)
    ? record.completionHistory
        .map((value: unknown) => dateFromValue(value))
        .filter((value: Date | null): value is Date => Boolean(value))
    : [];

  const serviceHistory = Array.isArray(record.serviceHistory)
    ? record.serviceHistory
        .map((entry: any) => dateFromValue(entry?.completedAt))
        .filter((value: Date | null): value is Date => Boolean(value))
    : [];

  const candidates = [...completionHistory, ...serviceHistory];

  if (candidates.length) {
    return candidates.sort((a, b) => b.getTime() - a.getTime())[0];
  }

  return record.status === "Completed" ? dateFromValue(record.date) : null;
}

function daysFromToday(value: unknown) {
  const date = dateFromValue(value);
  if (!date) return null;

  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - startOfToday().getTime()) / oneDay);
}

type AtlasWorkOrdersProps = {
  ListDrawerLayout: any;
  Field: any;
  SelectField: any;
  isMobile: any;
  addWorkOrder: any;
  goldButtonStyle: any;
  stackStyle: any;
  eyebrowStyle: any;
  serviceRecords: any;
  colors: any;
  filteredServices: any;
  listStyle: any;
  setSelectedServiceId: any;
  rowButtonStyle: any;
  selectedService: any;
  mutedSmallStyle: any;
  formatDate: any;
  assetName: any;
  vendorName: any;
  recurrenceLabel: any;
  workOrderListBadgesStyle: any;
  recurringBadgeStyle: any;
  badgeStyle: any;
  noticeStyle: any;
  editorHeaderStyle: any;
  detailSectionStyle: any;
  formGridStyle: any;
  updateWorkOrder: any;
  fieldLabelStyle: any;
  inputStyle: any;
  byName: any;
  assetRecords: any;
  assetPhotoRecords?: any;
  vendorRecords: any;
  locationRecords?: any;
  contactRecords?: any;
  procedureRecords?: any;
  documentRecords?: any;
  calendarItems?: any;
  weatherDays?: any;
  openResetKey?: any;
  detailSectionHeaderStyle: any;
  recurrenceToggleStyle: any;
  recurrenceGridStyle: any;
  recurrenceHistoryStyle: any;
  buttonRowStyle: any;
  isRecordDirty: any;
  saveWorkOrderRecord: any;
  completeWorkOrder: any;
  secondaryButtonStyle: any;
  deleteWorkOrderRecord: any;
  dangerButtonStyle: any;
  renderLinkedDocuments: any;

  // Old seasonal props remain optional so app/page.tsx does not need to be
  // changed just to render this replacement component.
  seasonPlannerStyle?: any;
  seasonCardGridStyle?: any;
  workOrderSeasonFilter?: any;
  setWorkOrderSeasonFilter?: any;
  seasonCardStyle?: any;
  seasonCardTitleStyle?: any;
  currentSeasonTagStyle?: any;
  seasonCardDescriptionStyle?: any;
};

export function AtlasWorkOrders(props: AtlasWorkOrdersProps) {
  const {
    ListDrawerLayout,
    Field,
    isMobile,
    addWorkOrder,
    goldButtonStyle,
    stackStyle,
    eyebrowStyle,
    serviceRecords,
    colors,
    filteredServices,
    listStyle,
    setSelectedServiceId,
    rowButtonStyle,
    selectedService,
    mutedSmallStyle,
    formatDate,
    assetName,
    vendorName,
    recurrenceLabel,
    workOrderListBadgesStyle,
    recurringBadgeStyle,
    badgeStyle,
    noticeStyle,
    editorHeaderStyle,
    detailSectionStyle,
    formGridStyle,
    updateWorkOrder,
    fieldLabelStyle,
    inputStyle,
    byName,
    assetRecords,
    vendorRecords,
    detailSectionHeaderStyle,
    recurrenceToggleStyle,
    recurrenceGridStyle,
    recurrenceHistoryStyle,
    buttonRowStyle,
    isRecordDirty,
    saveWorkOrderRecord,
    completeWorkOrder,
    secondaryButtonStyle,
    deleteWorkOrderRecord,
    dangerButtonStyle,
    renderLinkedDocuments,
  } = props;

  const [activeView, setActiveView] = useState("my-work");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [localSearch, setLocalSearch] = useState("");

  const categories = useMemo(() => {
    const values = new Set(DEFAULT_CATEGORIES);
    serviceRecords.forEach((record: any) => {
      const category = categoryLabel(record).trim();
      if (category) values.add(category);
    });
    return ["All", ...Array.from(values)];
  }, [serviceRecords]);

  const visibleRecords = useMemo(() => {
    const search = localSearch.trim().toLowerCase();

    return filteredServices.filter((record: any) => {
      const type = itemType(record);
      const category = categoryLabel(record);

      const matchesView =
        activeView === "my-work"
          ? isDueNow(record)
          : activeView === "completed"
            ? record.status === "Completed"
            : record.status !== "Completed" && type === activeView;

      const matchesCategory =
        categoryFilter === "All" || category === categoryFilter;

      const matchesSearch =
        !search ||
        [
          record.title,
          record.notes,
          record.status,
          record.priority,
          record.date,
          type,
          category,
          record.effort,
          record.responsibilityArea,
          assetName(record.assetId),
          vendorName(record.vendorId),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return matchesView && matchesCategory && matchesSearch;
    });
  }, [
    activeView,
    categoryFilter,
    filteredServices,
    localSearch,
    assetName,
    vendorName,
  ]);

  const tabCounts = useMemo(() => {
    const count = (id: string) =>
      filteredServices.filter((record: any) => {
        if (id === "my-work") return isDueNow(record);
        if (id === "completed") return record.status === "Completed";
        return record.status !== "Completed" && itemType(record) === id;
      }).length;

    return Object.fromEntries(TYPE_TABS.map((tab) => [tab.id, count(tab.id)]));
  }, [filteredServices]);

  const commandCenter = useMemo(() => {
    const today = startOfToday();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const nextSevenDays = new Date(today);
    nextSevenDays.setDate(today.getDate() + 7);

    const openRecords = filteredServices.filter(
      (record: any) => record.status !== "Completed",
    );

    const dueToday = openRecords.filter(
      (record: any) => daysFromToday(record.date) === 0,
    );

    const overdue = openRecords
      .filter((record: any) => {
        const distance = daysFromToday(record.date);
        return distance !== null && distance < 0;
      })
      .sort((a: any, b: any) =>
        String(a.date || "").localeCompare(String(b.date || "")),
      );

    const highPriority = openRecords.filter(
      (record: any) => record.priority === "High",
    );

    const recurring = openRecords.filter((record: any) =>
      Boolean(record.recurring),
    );

    const completedThisWeek = filteredServices.filter((record: any) => {
      if (record.status !== "Completed") return false;
      const completedAt = recordCompletionDate(record);
      return Boolean(completedAt && completedAt >= weekStart && completedAt <= new Date());
    });

    const recentlyCompleted = filteredServices
      .filter((record: any) => record.status === "Completed")
      .map((record: any) => ({
        record,
        completedAt: recordCompletionDate(record),
      }))
      .sort(
        (a: any, b: any) =>
          (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0),
      )
      .slice(0, 4);

    const dueThisWeek = openRecords
      .filter((record: any) => {
        const date = dateFromValue(record.date);
        return Boolean(date && date >= today && date <= nextSevenDays);
      })
      .sort((a: any, b: any) =>
        String(a.date || "").localeCompare(String(b.date || "")),
      )
      .slice(0, 4);

    const needsAttention = [...openRecords]
      .filter((record: any) => {
        const distance = daysFromToday(record.date);
        return record.priority === "High" || (distance !== null && distance < 0);
      })
      .sort((a: any, b: any) => {
        const aOverdue = (daysFromToday(a.date) ?? 9999) < 0 ? 0 : 1;
        const bOverdue = (daysFromToday(b.date) ?? 9999) < 0 ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (a.priority !== b.priority) return a.priority === "High" ? -1 : 1;
        return String(a.date || "").localeCompare(String(b.date || ""));
      })
      .slice(0, 4);

    const aging = overdue
      .map((record: any) => ({
        record,
        age: Math.abs(daysFromToday(record.date) || 0),
      }))
      .filter((item: any) => item.age >= 14)
      .sort((a: any, b: any) => b.age - a.age)
      .slice(0, 4);

    return {
      open: openRecords.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      highPriority: highPriority.length,
      completedThisWeek: completedThisWeek.length,
      recurring: recurring.length,
      recentlyCompleted,
      dueThisWeek,
      needsAttention,
      aging,
    };
  }, [filteredServices]);

  const controlStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 44,
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: "#FFFFFF",
    padding: "9px 11px",
    font: "inherit",
    color: colors.text,
  };

  const searchControlStyle: React.CSSProperties = {
    ...controlStyle,
    border: `1px solid ${colors.navy}`,
    boxShadow: "0 0 0 1px rgba(15, 31, 48, 0.05)",
  };

  const filterPanelStyle: React.CSSProperties = {
    display: "grid",
    gap: 10,
    padding: 12,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    background: "#F8FAFC",
  };

  const tabRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 2,
  };

  const tabButtonStyle = (selected: boolean): React.CSSProperties => ({
    flex: "0 0 auto",
    minHeight: 42,
    borderRadius: 999,
    border: `1px solid ${selected ? colors.gold : colors.line}`,
    background: selected ? "#FFF8E8" : "#FFFFFF",
    color: colors.text,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
  });

  const dashboardShellStyle: React.CSSProperties = {
    marginBottom: 18,
    borderRadius: 24,
    overflow: "hidden",
    background: colors.card,
    border: `1px solid ${colors.line}`,
    boxShadow: "0 14px 38px rgba(15, 31, 48, 0.1)",
  };

  const dashboardHeaderStyle: React.CSSProperties = {
    padding: isMobile ? 18 : 24,
    background: `linear-gradient(135deg, ${colors.navy} 0%, #183B55 100%)`,
    color: "#FFFFFF",
  };

  const commandMetricGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(5, minmax(0, 1fr))",
    gap: 10,
    marginTop: 20,
  };

  const commandMetricStyle: React.CSSProperties = {
    display: "grid",
    gap: 4,
    minWidth: 0,
    padding: "13px 14px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.08)",
  };

  const driverPanelStyle: React.CSSProperties = {
    marginTop: 14,
    padding: 13,
    borderRadius: 15,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const driverGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(5, minmax(0, 1fr))",
    gap: 9,
  };

  const driverItemStyle: React.CSSProperties = {
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.09)",
  };

  const summaryGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(2, minmax(0, 1fr))",
    gap: 12,
  };

  const summaryCardStyle: React.CSSProperties = {
    minWidth: 0,
    padding: 14,
    border: `1px solid ${colors.line}`,
    borderRadius: 15,
    background: "#FFFFFF",
  };

  const summaryRecordButtonStyle: React.CSSProperties = {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    border: 0,
    borderBottom: `1px solid ${colors.line}`,
    background: "transparent",
    color: colors.text,
    textAlign: "left",
    cursor: "pointer",
  };

  const openSummaryRecord = (record: any) => {
    setSelectedServiceId(record.id);
  };

  const showAllWork = () => {
    setActiveView("my-work");
    setCategoryFilter("All");
    setLocalSearch("");
  };

  const showCompleted = () => {
    setActiveView("completed");
    setCategoryFilter("All");
    setLocalSearch("");
  };

  const showOverdue = () => {
    setActiveView("my-work");
    setCategoryFilter("All");
    setLocalSearch("");
  };

  return (
    <ListDrawerLayout
      eyebrow="Organize / Complete"
      title="My Work"
      detail="Quick tasks, tracked work orders, preventive maintenance, projects, and completed history in one searchable system."
      isMobile={isMobile}
      right={
        <button type="button" onClick={addWorkOrder} style={goldButtonStyle}>
          Add Work
        </button>
      }
      list={
        <div style={stackStyle}>
          <section style={dashboardShellStyle}>
            <header style={dashboardHeaderStyle}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: colors.gold,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Work Management
                </div>

                <h2
                  style={{
                    margin: "7px 0 3px",
                    fontSize: isMobile ? 25 : 31,
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Work Orders Command Center
                </h2>

                <div
                  style={{
                    fontSize: 14,
                    opacity: 0.72,
                    fontWeight: 650,
                  }}
                >
                  Active workload and service history
                </div>

                <p
                  style={{
                    maxWidth: 820,
                    margin: "13px 0 0",
                    fontSize: isMobile ? 13 : 14,
                    lineHeight: 1.65,
                    opacity: 0.86,
                  }}
                >
                  {commandCenter.overdue
                    ? `${commandCenter.overdue} overdue work order${commandCenter.overdue === 1 ? " needs" : "s need"} attention. `
                    : "There are no overdue work orders. "}
                  {commandCenter.dueToday
                    ? `${commandCenter.dueToday} item${commandCenter.dueToday === 1 ? " is" : "s are"} due today. `
                    : "Nothing is due today. "}
                  {commandCenter.highPriority
                    ? `${commandCenter.highPriority} high-priority item${commandCenter.highPriority === 1 ? " remains" : "s remain"} active. `
                    : "There is no high-priority backlog. "}
                  {commandCenter.recurring} recurring maintenance item
                  {commandCenter.recurring === 1 ? " is" : "s are"} currently
                  tracked.
                </p>
              </div>

              <div style={commandMetricGridStyle}>
                {[
                  ["Open Work", commandCenter.open, "active items"],
                  ["Due Today", commandCenter.dueToday, "scheduled today"],
                  ["Overdue", commandCenter.overdue, "need attention"],
                  ["High Priority", commandCenter.highPriority, "active priority"],
                  [
                    "Completed",
                    commandCenter.completedThisWeek,
                    "finished this week",
                  ],
                ].map(([label, value, detail]) => (
                  <div key={String(label)} style={commandMetricStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        opacity: 0.64,
                      }}
                    >
                      {label}
                    </span>
                    <strong style={{ fontSize: 25, lineHeight: 1.05 }}>
                      {value}
                    </strong>
                    <span style={{ fontSize: 12, opacity: 0.72 }}>
                      {detail}
                    </span>
                  </div>
                ))}
              </div>

              <div style={driverPanelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 9,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      color: colors.gold,
                    }}
                  >
                    Workload Drivers
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.68,
                      whiteSpace: "nowrap",
                    }}
                  >
                    What needs attention
                  </div>
                </div>

                <div style={driverGridStyle}>
                  {[
                    {
                      label: "Overdue work",
                      value: commandCenter.overdue
                        ? `${commandCenter.overdue} overdue`
                        : "No overdue work",
                      symbol: commandCenter.overdue ? "▼" : "▲",
                      accent: commandCenter.overdue ? "#FCA5A5" : "#86E1B5",
                    },
                    {
                      label: "Today’s schedule",
                      value: commandCenter.dueToday
                        ? `${commandCenter.dueToday} due today`
                        : "Schedule is open",
                      symbol: commandCenter.dueToday ? "●" : "▲",
                      accent: commandCenter.dueToday ? colors.gold : "#86E1B5",
                    },
                    {
                      label: "Priority workload",
                      value: commandCenter.highPriority
                        ? `${commandCenter.highPriority} high priority`
                        : "No high-priority backlog",
                      symbol: commandCenter.highPriority ? "▼" : "▲",
                      accent: commandCenter.highPriority ? "#FCA5A5" : "#86E1B5",
                    },
                    {
                      label: "Preventive maintenance",
                      value: `${commandCenter.recurring} recurring`,
                      symbol: "▲",
                      accent: "#86E1B5",
                    },
                    {
                      label: "Completion pace",
                      value: `${commandCenter.completedThisWeek} this week`,
                      symbol: commandCenter.completedThisWeek ? "▲" : "●",
                      accent: commandCenter.completedThisWeek
                        ? "#86E1B5"
                        : "rgba(255,255,255,0.6)",
                    },
                  ].map((driver) => (
                    <div key={driver.label} style={driverItemStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: driver.accent,
                            fontWeight: 900,
                            fontSize: 11,
                          }}
                        >
                          {driver.symbol}
                        </span>
                        <strong
                          style={{
                            minWidth: 0,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {driver.label}
                        </strong>
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          opacity: 0.68,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {driver.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </header>
          </section>

          <section style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div>
                  <div style={eyebrowStyle}>Priority Queue</div>
                  <strong>Needs Attention</strong>
                </div>
                <span style={badgeStyle(commandCenter.overdue ? "High" : "Monitor")}>
                  {commandCenter.needsAttention.length}
                </span>
              </div>

              {commandCenter.needsAttention.map((record: any) => {
                const distance = daysFromToday(record.date);
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => openSummaryRecord(record)}
                    style={summaryRecordButtonStyle}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{record.title || "Untitled Work"}</strong>
                      <div style={mutedSmallStyle}>
                        {record.priority === "High" ? "High priority" : "Open"}
                        {" · "}
                        {distance !== null && distance < 0
                          ? `${Math.abs(distance)} day${Math.abs(distance) === 1 ? "" : "s"} overdue`
                          : `Due ${formatDate(record.date)}`}
                      </div>
                    </div>
                    <span aria-hidden="true">›</span>
                  </button>
                );
              })}

              {!commandCenter.needsAttention.length ? (
                <p style={mutedSmallStyle}>
                  No overdue or high-priority work needs attention.
                </p>
              ) : null}
            </div>

            <div style={summaryCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div>
                  <div style={eyebrowStyle}>Next 7 Days</div>
                  <strong>Due This Week</strong>
                </div>
                <span style={badgeStyle("Scheduled")}>
                  {commandCenter.dueThisWeek.length}
                </span>
              </div>

              {commandCenter.dueThisWeek.map((record: any) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => openSummaryRecord(record)}
                  style={summaryRecordButtonStyle}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{record.title || "Untitled Work"}</strong>
                    <div style={mutedSmallStyle}>
                      {formatDate(record.date)} · {assetName(record.assetId)}
                    </div>
                  </div>
                  <span aria-hidden="true">›</span>
                </button>
              ))}

              {!commandCenter.dueThisWeek.length ? (
                <p style={mutedSmallStyle}>
                  No dated work is due in the next seven days.
                </p>
              ) : null}
            </div>

            <div style={summaryCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div>
                  <div style={eyebrowStyle}>Work History</div>
                  <strong>Recently Completed</strong>
                </div>
                <button
                  type="button"
                  onClick={showCompleted}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: colors.blue || "#175CD3",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  View all
                </button>
              </div>

              {commandCenter.recentlyCompleted.map(
                ({ record, completedAt }: any) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => openSummaryRecord(record)}
                    style={summaryRecordButtonStyle}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{record.title || "Untitled Work"}</strong>
                      <div style={mutedSmallStyle}>
                        Completed{" "}
                        {completedAt
                          ? formatDate(completedAt.toISOString().slice(0, 10))
                          : "recently"}
                        {" · "}
                        {assetName(record.assetId)}
                      </div>
                    </div>
                    <span aria-hidden="true">›</span>
                  </button>
                ),
              )}

              {!commandCenter.recentlyCompleted.length ? (
                <p style={mutedSmallStyle}>
                  Completed work will appear here.
                </p>
              ) : null}
            </div>

            <div style={summaryCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div>
                  <div style={eyebrowStyle}>Backlog Health</div>
                  <strong>Aging Work Orders</strong>
                </div>
                <span style={badgeStyle(commandCenter.aging.length ? "Open" : "Monitor")}>
                  14+ days
                </span>
              </div>

              {commandCenter.aging.map(({ record, age }: any) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => openSummaryRecord(record)}
                  style={summaryRecordButtonStyle}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{record.title || "Untitled Work"}</strong>
                    <div style={mutedSmallStyle}>
                      {age} days overdue · {categoryLabel(record)}
                    </div>
                  </div>
                  <span aria-hidden="true">›</span>
                </button>
              ))}

              {!commandCenter.aging.length ? (
                <p style={mutedSmallStyle}>
                  No work orders are more than 14 days overdue.
                </p>
              ) : null}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={showAllWork}
                  style={secondaryButtonStyle}
                >
                  View Active Work
                </button>
                <button
                  type="button"
                  onClick={showOverdue}
                  style={secondaryButtonStyle}
                >
                  Review Overdue
                </button>
              </div>
            </div>
          </section>

          <section style={filterPanelStyle}>
            <div style={tabRowStyle}>
              {TYPE_TABS.map((tab) => {
                const selected = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveView(tab.id)}
                    style={tabButtonStyle(selected)}
                  >
                    {tab.label} ({tabCounts[tab.id] || 0})
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 220px",
                gap: 10,
              }}
            >
              <input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.currentTarget.value)}
                placeholder="Search work, asset, vendor, category..."
                style={{
                  ...searchControlStyle,
                  border: "1px solid #0F1F30",
                  outline: "1px solid #0F1F30",
                  outlineOffset: "-1px",
                  backgroundColor: "#FFFFFF",
                }}
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.currentTarget.value)}
                style={controlStyle}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "All" ? "All Categories" : category}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div style={listStyle}>
            {visibleRecords.map((record: any) => {
              const type = itemType(record);
              const category = categoryLabel(record);

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedServiceId(record.id)}
                  style={{
                    ...rowButtonStyle,
                    borderColor:
                      record.id === selectedService.id
                        ? colors.gold
                        : colors.line,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{record.title || "Untitled Work"}</strong>
                    <p style={mutedSmallStyle}>
                      {category} · {type}
                    </p>
                    <p style={mutedSmallStyle}>
                      {record.recurring ? "Next due" : "Due"}{" "}
                      {formatDate(record.date)} · {assetName(record.assetId)} ·{" "}
                      {vendorName(record.vendorId)}
                    </p>
                  </div>

                  <div style={workOrderListBadgesStyle}>
                    {record.effort ? (
                      <span style={recurringBadgeStyle}>{record.effort}</span>
                    ) : null}
                    {record.recurring ? (
                      <span style={recurringBadgeStyle}>Recurring</span>
                    ) : null}
                    <span style={badgeStyle(record.status)}>
                      {record.status}
                    </span>
                  </div>
                </button>
              );
            })}

            {!visibleRecords.length ? (
              <div style={noticeStyle}>
                No work matches this view, category, or search.
              </div>
            ) : null}
          </div>
        </div>
      }
      drawer={
        selectedService.id ? (
          <div style={stackStyle}>
            <div>
              <h3 style={editorHeaderStyle}>
                {selectedService.title.trim() || "New Work"}
              </h3>
              <p style={mutedSmallStyle}>
                {categoryLabel(selectedService)} · {itemType(selectedService)}
              </p>
            </div>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Work Classification</div>

              <div style={formGridStyle}>
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Work Type</span>
                  <select
                    value={itemType(selectedService)}
                    onChange={(event) => {
                      const workType = event.currentTarget.value as WorkItemType;
                      updateWorkOrder({
                        workType,
                        recurring:
                          workType === "Preventive Maintenance"
                            ? true
                            : selectedService.recurring,
                      });
                    }}
                    style={inputStyle}
                  >
                    <option value="Quick Task">✅ Quick Task</option>
                    <option value="Work Order">🛠️ Work Order</option>
                    <option value="Preventive Maintenance">
                      🔁 Preventive Maintenance
                    </option>
                    <option value="Project">📐 Project</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Category</span>
                  <input
                    list="atlas-work-categories"
                    value={categoryLabel(selectedService)}
                    onChange={(event) =>
                      updateWorkOrder({
                        workCategory: event.currentTarget.value,
                      })
                    }
                    placeholder="Choose or type an emoji category"
                    style={inputStyle}
                  />
                  <datalist id="atlas-work-categories">
                    {DEFAULT_CATEGORIES.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Estimated Effort</span>
                  <select
                    value={selectedService.effort || ""}
                    onChange={(event) =>
                      updateWorkOrder({ effort: event.currentTarget.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">Not set</option>
                    {(
                      [
                        "5 minutes",
                        "15 minutes",
                        "30 minutes",
                        "1 hour",
                        "Half Day",
                        "Full Day",
                        "Multi-Day",
                      ] as WorkEffort[]
                    ).map((effort) => (
                      <option key={effort} value={effort}>
                        {effort}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label="Responsibility Area"
                  value={selectedService.responsibilityArea || ""}
                  onChange={(value: string) =>
                    updateWorkOrder({ responsibilityArea: value })
                  }
                  placeholder="Estate, Grounds, Waterfront, Pool & Spa..."
                />
              </div>
            </section>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Work Information</div>
              <div style={formGridStyle}>
                <Field
                  label="Title"
                  value={selectedService.title}
                  onChange={(value: string) => updateWorkOrder({ title: value })}
                />

                <Field
                  label={selectedService.recurring ? "Next Due" : "Due Date"}
                  value={selectedService.date}
                  onChange={(value: string) => updateWorkOrder({ date: value })}
                />

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Status</span>
                  <select
                    value={selectedService.status}
                    onChange={(event) =>
                      updateWorkOrder({ status: event.currentTarget.value })
                    }
                    style={inputStyle}
                  >
                    <option value="Open">Open</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Priority</span>
                  <select
                    value={selectedService.priority || "Medium"}
                    onChange={(event) =>
                      updateWorkOrder({ priority: event.currentTarget.value })
                    }
                    style={inputStyle}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Asset</span>
                  <select
                    value={selectedService.assetId || ""}
                    onChange={(event) =>
                      updateWorkOrder({ assetId: event.currentTarget.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">No linked asset</option>
                    {byName(assetRecords).map((asset: any) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Vendor</span>
                  <select
                    value={selectedService.vendorId || ""}
                    onChange={(event) =>
                      updateWorkOrder({ vendorId: event.currentTarget.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">No vendor</option>
                    {byName(vendorRecords).map((vendor: any) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label="Follow-up Date"
                  value={selectedService.followUpDate || ""}
                  onChange={(value: string) =>
                    updateWorkOrder({ followUpDate: value })
                  }
                />
              </div>
            </section>

            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Recurring Schedule</div>
                  <strong>
                    {selectedService.recurring
                      ? recurrenceLabel(selectedService)
                      : "One-time work"}
                  </strong>
                </div>

                <label style={recurrenceToggleStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedService.recurring)}
                    onChange={(event) =>
                      updateWorkOrder({ recurring: event.currentTarget.checked })
                    }
                  />
                  Recurring
                </label>
              </div>

              {selectedService.recurring ? (
                <div style={recurrenceGridStyle}>
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Every</span>
                    <input
                      type="number"
                      min={1}
                      value={selectedService.recurrenceInterval || 1}
                      onChange={(event) =>
                        updateWorkOrder({
                          recurrenceInterval: Math.max(
                            1,
                            Number(event.currentTarget.value) || 1,
                          ),
                        })
                      }
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Unit</span>
                    <select
                      value={selectedService.recurrenceUnit || "Weeks"}
                      onChange={(event) =>
                        updateWorkOrder({
                          recurrenceUnit:
                            event.currentTarget
                              .value as WorkOrderRecurrenceUnit,
                        })
                      }
                      style={inputStyle}
                    >
                      {(
                        ["Days", "Weeks", "Months", "Years"] as WorkOrderRecurrenceUnit[]
                      ).map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Field
                    label="Stop Repeating After"
                    value={selectedService.recurrenceEndDate || ""}
                    onChange={(value: string) =>
                      updateWorkOrder({ recurrenceEndDate: value })
                    }
                    placeholder="Optional end date"
                  />
                </div>
              ) : (
                <p style={mutedSmallStyle}>
                  Turn recurrence on for weekly, monthly, yearly, or custom
                  preventive maintenance.
                </p>
              )}

              {selectedService.lastCompletedDate ? (
                <div style={recurrenceHistoryStyle}>
                  <strong>
                    Last completed {formatDate(selectedService.lastCompletedDate)}
                  </strong>
                  <span style={mutedSmallStyle}>
                    {(selectedService.completionHistory || []).length} recorded
                    completion
                    {(selectedService.completionHistory || []).length === 1
                      ? ""
                      : "s"}
                  </span>
                </div>
              ) : null}
            </section>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Notes</div>
              <textarea
                value={selectedService.notes || ""}
                onChange={(event) =>
                  updateWorkOrder({ notes: event.currentTarget.value })
                }
                rows={7}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </section>

            <div style={buttonRowStyle}>
              {isRecordDirty("work_order", selectedService.id) ? (
                <button
                  type="button"
                  onClick={() => void saveWorkOrderRecord()}
                  style={goldButtonStyle}
                >
                  Save Work
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void completeWorkOrder(selectedService)}
                style={
                  selectedService.recurring
                    ? goldButtonStyle
                    : secondaryButtonStyle
                }
              >
                {selectedService.recurring
                  ? "Complete & Move to Next Due"
                  : "Mark Completed"}
              </button>

              <button
                type="button"
                onClick={() => void deleteWorkOrderRecord(selectedService)}
                style={dangerButtonStyle}
              >
                Delete
              </button>
            </div>

            {renderLinkedDocuments("Work Order", selectedService.id)}
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select work or add a new item.</strong>
            <p style={mutedSmallStyle}>
              Use Quick Tasks for small jobs, Work Orders for tracked repairs,
              and Preventive Maintenance for recurring service.
            </p>
          </div>
        )
      }
    />
  );
}

export default AtlasWorkOrders;
