"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { WorkOrderRecurrenceUnit } from "../lib/atlas-types";

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

type WorkSection = {
  id: string;
  label: string;
  kind:
    | "my-work"
    | "Quick Task"
    | "Work Order"
    | "Preventive Maintenance"
    | "Project"
    | "completed";
};

type PhotoLike = {
  id: string;
  name: string;
  type?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

const DEFAULT_CATEGORIES = [
  "🔧 Maintenance",
  "🧹 Cleaning",
  "🌿 Landscaping",
  "🚿 Pool & Spa",
  "💧 Irrigation",
  "⚡ Electrical",
  "🚰 Plumbing",
  "❄️ HVAC",
  "🚤 Dock & Marine",
  "🚗 Vehicles",
  "🏠 House",
  "📦 Inventory",
  "📋 Project",
  "✅ Inspection",
  "🚨 Safety",
  "📄 Admin",
];

const DEFAULT_SECTIONS: WorkSection[] = [
  { id: "my-work", label: "🏠 My Work", kind: "my-work" },
  { id: "tasks", label: "📌 Tasks", kind: "Quick Task" },
  { id: "work-orders", label: "🛠️ Work Orders", kind: "Work Order" },
  {
    id: "maintenance",
    label: "🔁 Preventive Maintenance",
    kind: "Preventive Maintenance",
  },
  { id: "projects", label: "🏗️ Projects", kind: "Project" },
  { id: "completed", label: "📚 Completed", kind: "completed" },
];

const SECTION_STORAGE_KEY = "atlas-work-section-settings-v1";

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

function parseDate(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayDistance(dateValue: string) {
  const due = parseDate(dateValue);
  if (!due) return Number.POSITIVE_INFINITY;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((due.getTime() - startOfToday().getTime()) / oneDay);
}

function myWorkGroup(record: any) {
  if (record.status === "Completed") return "";
  const type = itemType(record);
  if (type === "Project") return "projects";
  if (type === "Preventive Maintenance" || record.recurring) {
    return "maintenance";
  }
  const distance = dayDistance(String(record.date || ""));
  if (distance <= 0) return "today";
  if (distance <= 7) return "week";
  return "upcoming";
}

function safeReadSections(): WorkSection[] {
  if (typeof window === "undefined") return DEFAULT_SECTIONS;
  try {
    const raw = window.localStorage.getItem(SECTION_STORAGE_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_SECTIONS;
    return parsed
      .filter(
        (section): section is WorkSection =>
          section &&
          typeof section.id === "string" &&
          typeof section.label === "string" &&
          typeof section.kind === "string",
      )
      .map((section) => ({ ...section }));
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function safeSaveSections(sections: WorkSection[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // Section labels are optional UI preferences; a storage error must not
    // interrupt the work-order screen.
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function photoSource(photo: PhotoLike) {
  return String(photo.dataUrl || photo.url || "");
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type AtlasWorkOrdersProps = {
  ListDrawerLayout: any;
  Field: any;
  SelectField?: any;
  isMobile: boolean;
  addWorkOrder: () => void;
  goldButtonStyle: React.CSSProperties;
  stackStyle: React.CSSProperties;
  eyebrowStyle: React.CSSProperties;
  serviceRecords: any[];
  colors: any;
  filteredServices: any[];
  listStyle: React.CSSProperties;
  setSelectedServiceId: (id: string) => void;
  rowButtonStyle: React.CSSProperties;
  selectedService: any;
  mutedSmallStyle: React.CSSProperties;
  formatDate: (date: string) => string;
  assetName: (id: string) => string;
  vendorName: (id: string) => string;
  recurrenceLabel: (record: any) => string;
  workOrderListBadgesStyle: React.CSSProperties;
  recurringBadgeStyle: React.CSSProperties;
  badgeStyle: (value: string) => React.CSSProperties;
  noticeStyle: React.CSSProperties;
  editorHeaderStyle: React.CSSProperties;
  detailSectionStyle: React.CSSProperties;
  formGridStyle: React.CSSProperties;
  updateWorkOrder: (patch: Record<string, unknown>) => void;
  fieldLabelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  byName: (records: any[]) => any[];
  assetRecords: any[];
  vendorRecords: any[];
  locationRecords?: any[];
  contactRecords?: any[];
  detailSectionHeaderStyle: React.CSSProperties;
  recurrenceToggleStyle: React.CSSProperties;
  recurrenceGridStyle: React.CSSProperties;
  recurrenceHistoryStyle: React.CSSProperties;
  buttonRowStyle: React.CSSProperties;
  isRecordDirty: (type: string, id: string) => boolean;
  saveWorkOrderRecord: () => Promise<void> | void;
  completeWorkOrder: (record: any) => Promise<void> | void;
  secondaryButtonStyle: React.CSSProperties;
  deleteWorkOrderRecord: (record: any) => Promise<void> | void;
  dangerButtonStyle: React.CSSProperties;
  renderLinkedDocuments: (type: string, id: string) => React.ReactNode;
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
    locationRecords = [],
    contactRecords = [],
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

  const [sections, setSections] = useState<WorkSection[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState("my-work");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [manageSectionsOpen, setManageSectionsOpen] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loaded = safeReadSections();
    setSections(loaded);
    if (!loaded.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(loaded[0]?.id || "my-work");
    }
  }, []);

  const activeSection =
    sections.find((section) => section.id === activeSectionId) || sections[0];

  const categories = useMemo(() => {
    const values = new Set(DEFAULT_CATEGORIES);
    serviceRecords.forEach((record: any) => {
      const category = categoryLabel(record).trim();
      if (category) values.add(category);
    });
    return ["All", ...Array.from(values)];
  }, [serviceRecords]);

  const matchesCommonFilters = (record: any) => {
    const search = localSearch.trim().toLowerCase();
    const category = categoryLabel(record);
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
        itemType(record),
        category,
        record.emoji,
        record.effort,
        record.responsibilityArea,
        record.assignedTo,
        assetName(record.assetId),
        vendorName(record.vendorId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    return matchesCategory && matchesSearch;
  };

  const visibleRecords = useMemo(() => {
    if (!activeSection) return [];
    return filteredServices.filter((record: any) => {
      const type = itemType(record);
      const matchesSection =
        activeSection.kind === "my-work"
          ? record.status !== "Completed"
          : activeSection.kind === "completed"
            ? record.status === "Completed"
            : record.status !== "Completed" && type === activeSection.kind;
      return matchesSection && matchesCommonFilters(record);
    });
  }, [
    activeSection,
    categoryFilter,
    filteredServices,
    localSearch,
    assetName,
    vendorName,
  ]);

  const myWorkGroups = useMemo(() => {
    const groups = {
      today: [] as any[],
      week: [] as any[],
      upcoming: [] as any[],
      maintenance: [] as any[],
      projects: [] as any[],
    };
    visibleRecords.forEach((record: any) => {
      const group = myWorkGroup(record);
      if (group && group in groups) groups[group as keyof typeof groups].push(record);
    });
    return groups;
  }, [visibleRecords]);

  const tabCounts = useMemo(() => {
    const result: Record<string, number> = {};
    sections.forEach((section) => {
      result[section.id] = filteredServices.filter((record: any) => {
        if (section.kind === "my-work") return record.status !== "Completed";
        if (section.kind === "completed") return record.status === "Completed";
        return record.status !== "Completed" && itemType(record) === section.kind;
      }).length;
    });
    return result;
  }, [filteredServices, sections]);

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

  const miniButtonStyle: React.CSSProperties = {
    ...secondaryButtonStyle,
    padding: "7px 10px",
    minHeight: 36,
  };

  const photoGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(3, minmax(0, 1fr))",
    gap: 10,
  };

  function saveSections(next: WorkSection[]) {
    setSections(next);
    safeSaveSections(next);
    if (!next.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(next[0]?.id || "my-work");
    }
  }

  function renameSection(section: WorkSection) {
    const nextName = window.prompt("Rename this section", section.label);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;
    saveSections(
      sections.map((item) =>
        item.id === section.id ? { ...item, label: trimmed } : item,
      ),
    );
  }

  function deleteSection(section: WorkSection) {
    if (sections.length <= 1) return;
    if (
      !window.confirm(
        `Remove the section “${section.label}” from this screen? Work records will not be deleted.`,
      )
    ) {
      return;
    }
    saveSections(sections.filter((item) => item.id !== section.id));
  }

  function resetSections() {
    saveSections(DEFAULT_SECTIONS.map((section) => ({ ...section })));
    setActiveSectionId("my-work");
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length || !selectedService?.id) return;
    setPhotoMessage("Adding photos...");
    try {
      const incoming: PhotoLike[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await fileToDataUrl(file);
        incoming.push({
          id: uid("work-photo"),
          name: file.name || "Work photo",
          type: file.type,
          dataUrl,
          createdAt: new Date().toISOString(),
        });
      }
      updateWorkOrder({
        photos: [...(selectedService.photos || []), ...incoming],
      });
      setPhotoMessage(
        incoming.length
          ? `Added ${incoming.length} photo${incoming.length === 1 ? "" : "s"}. Save the work item to keep them.`
          : "No image files were selected.",
      );
    } catch (error) {
      setPhotoMessage(
        error instanceof Error ? error.message : "Photos could not be added.",
      );
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function removePhoto(photoId: string) {
    updateWorkOrder({
      photos: (selectedService.photos || []).filter(
        (photo: PhotoLike) => photo.id !== photoId,
      ),
    });
  }

  function renderWorkRow(record: any) {
    const type = itemType(record);
    const category = categoryLabel(record);
    const emoji = String(record.emoji || "").trim();
    return (
      <button
        key={record.id}
        type="button"
        onClick={() => setSelectedServiceId(record.id)}
        style={{
          ...rowButtonStyle,
          borderColor:
            record.id === selectedService.id ? colors.gold : colors.line,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <strong>
            {emoji ? `${emoji} ` : ""}
            {record.title || "Untitled Work"}
          </strong>
          <p style={mutedSmallStyle}>
            {category} · {type}
          </p>
          <p style={mutedSmallStyle}>
            {record.recurring ? "Next due" : "Due"} {formatDate(record.date)} ·{" "}
            {assetName(record.assetId)} · {vendorName(record.vendorId)}
          </p>
        </div>
        <div style={workOrderListBadgesStyle}>
          {record.effort ? (
            <span style={recurringBadgeStyle}>{record.effort}</span>
          ) : null}
          {record.assignedTo ? (
            <span style={recurringBadgeStyle}>{record.assignedTo}</span>
          ) : null}
          {record.recurring ? (
            <span style={recurringBadgeStyle}>Recurring</span>
          ) : null}
          <span style={badgeStyle(record.status)}>{record.status}</span>
        </div>
      </button>
    );
  }

  function renderMyWorkList() {
    const groupDefinitions = [
      { id: "today", label: "🔴 Today", records: myWorkGroups.today },
      { id: "week", label: "🟡 This Week", records: myWorkGroups.week },
      { id: "upcoming", label: "🟢 Upcoming", records: myWorkGroups.upcoming },
      {
        id: "maintenance",
        label: "🔁 Recurring Maintenance",
        records: myWorkGroups.maintenance,
      },
      { id: "projects", label: "📋 Projects", records: myWorkGroups.projects },
    ];
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {groupDefinitions.map((group) => (
          <section
            key={group.id}
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 14,
              overflow: "hidden",
              background: "#FFFFFF",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "11px 13px",
                borderBottom: `1px solid ${colors.line}`,
                background: "#F8FAFC",
              }}
            >
              <strong>{group.label}</strong>
              <span style={recurringBadgeStyle}>{group.records.length}</span>
            </div>
            <div style={listStyle}>
              {group.records.map(renderWorkRow)}
              {!group.records.length ? (
                <div style={{ ...noticeStyle, margin: 10 }}>
                  Nothing in this section.
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ListDrawerLayout
      eyebrow="Organize / Complete"
      title={activeSection?.label || "My Work"}
      detail="Daily tasks, tracked work orders, recurring maintenance, projects, and completed history in one searchable system."
      isMobile={isMobile}
      right={
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => setManageSectionsOpen((current) => !current)}
            style={secondaryButtonStyle}
          >
            Edit Sections
          </button>
          <button type="button" onClick={addWorkOrder} style={goldButtonStyle}>
            Add Work
          </button>
        </div>
      }
      list={
        <div style={stackStyle}>
          <section style={filterPanelStyle}>
            <div style={tabRowStyle}>
              {sections.map((section) => {
                const selected = activeSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    style={tabButtonStyle(selected)}
                  >
                    {section.label} ({tabCounts[section.id] || 0})
                  </button>
                );
              })}
            </div>

            {manageSectionsOpen ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 10,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 12,
                  background: "#FFFFFF",
                }}
              >
                {sections.map((section) => (
                  <div
                    key={section.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <strong>{section.label}</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => renameSection(section)}
                        style={miniButtonStyle}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(section)}
                        style={{ ...dangerButtonStyle, padding: "7px 10px" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={resetSections}
                  style={secondaryButtonStyle}
                >
                  Restore Default Sections
                </button>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "minmax(0, 1fr) 220px",
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

          {activeSection?.kind === "my-work" ? (
            renderMyWorkList()
          ) : (
            <div style={listStyle}>
              {visibleRecords.map(renderWorkRow)}
              {!visibleRecords.length ? (
                <div style={noticeStyle}>
                  No work matches this section, category, or search.
                </div>
              ) : null}
            </div>
          )}
        </div>
      }
      drawer={
        selectedService.id ? (
          <div style={stackStyle}>
            <div>
              <h3 style={editorHeaderStyle}>
                {selectedService.emoji ? `${selectedService.emoji} ` : ""}
                {selectedService.title.trim() || "New Work"}
              </h3>
              <p style={mutedSmallStyle}>
                {categoryLabel(selectedService)} · {itemType(selectedService)}
              </p>
            </div>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Work Classification</div>
              <div style={formGridStyle}>
                <Field
                  label="Emoji"
                  value={selectedService.emoji || ""}
                  onChange={(value: string) => updateWorkOrder({ emoji: value })}
                  placeholder="🔧"
                />

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
                    <option value="Quick Task">📌 Task</option>
                    <option value="Work Order">🛠️ Work Order</option>
                    <option value="Preventive Maintenance">
                      🔁 Preventive Maintenance
                    </option>
                    <option value="Project">🏗️ Project</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Category</span>
                  <input
                    list="atlas-work-categories"
                    value={categoryLabel(selectedService)}
                    onChange={(event) =>
                      updateWorkOrder({ workCategory: event.currentTarget.value })
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
                  <span style={fieldLabelStyle}>Estimated Time</span>
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
                  placeholder="Estate, Grounds, Waterfront..."
                />

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Assigned To</span>
                  <input
                    list="atlas-work-assignees"
                    value={selectedService.assignedTo || ""}
                    onChange={(event) =>
                      updateWorkOrder({ assignedTo: event.currentTarget.value })
                    }
                    placeholder="Nick, Patrick, vendor..."
                    style={inputStyle}
                  />
                  <datalist id="atlas-work-assignees">
                    {contactRecords.map((contact: any) => (
                      <option key={contact.id} value={contact.name} />
                    ))}
                  </datalist>
                </label>
              </div>
            </section>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Work Information</div>
              <div style={formGridStyle}>
                <Field
                  label="Title / Rename"
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
                  <span style={fieldLabelStyle}>Location</span>
                  <select
                    value={selectedService.locationId || ""}
                    onChange={(event) =>
                      updateWorkOrder({ locationId: event.currentTarget.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">No linked location</option>
                    {byName(locationRecords).map((location: any) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
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
                  <div style={eyebrowStyle}>Repeat Schedule</div>
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
                            event.currentTarget.value as WorkOrderRecurrenceUnit,
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
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Photos</div>
                  <strong>{(selectedService.photos || []).length} attached</strong>
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={secondaryButtonStyle}
                >
                  Add Photos
                </button>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => void addPhotos(event.currentTarget.files)}
                style={{ display: "none" }}
              />
              {photoMessage ? <p style={mutedSmallStyle}>{photoMessage}</p> : null}
              {(selectedService.photos || []).length ? (
                <div style={photoGridStyle}>
                  {(selectedService.photos || []).map((photo: PhotoLike) => {
                    const source = photoSource(photo);
                    return (
                      <div
                        key={photo.id}
                        style={{
                          display: "grid",
                          gap: 7,
                          padding: 8,
                          border: `1px solid ${colors.line}`,
                          borderRadius: 12,
                          background: "#FFFFFF",
                        }}
                      >
                        {source ? (
                          <a href={source} target="_blank" rel="noreferrer">
                            <img
                              src={source}
                              alt={photo.name || "Work photo"}
                              style={{
                                display: "block",
                                width: "100%",
                                aspectRatio: "4 / 3",
                                objectFit: "cover",
                                borderRadius: 8,
                              }}
                            />
                          </a>
                        ) : (
                          <div style={noticeStyle}>Photo unavailable</div>
                        )}
                        <small style={mutedSmallStyle}>{photo.name}</small>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          style={{ ...dangerButtonStyle, padding: "7px 9px" }}
                        >
                          Remove Photo
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={mutedSmallStyle}>
                  Add photos of the issue, repair, completed work, equipment, or
                  surrounding area.
                </p>
              )}
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
                Delete Work Item
              </button>
            </div>

            {renderLinkedDocuments("Work Order", selectedService.id)}
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select work or add a new item.</strong>
            <p style={mutedSmallStyle}>
              Use Tasks for small work, Preventive Maintenance for recurring
              service, and Projects for larger multi-step work.
            </p>
          </div>
        )
      }
    />
  );
}
