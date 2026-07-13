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
  vendorRecords: any;
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

export default function AtlasWorkOrders(props: AtlasWorkOrdersProps) {
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
                style={controlStyle}
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

