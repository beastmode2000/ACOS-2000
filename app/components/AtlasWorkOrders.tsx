"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { WorkOrderRecurrenceUnit } from "../lib/atlas-types";

type WorkItemType =
  "Quick Task" | "Work Order" | "Preventive Maintenance" | "Project";

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

type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
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
  { id: "my-work", label: "My Work", kind: "my-work" },
  { id: "tasks", label: "Tasks", kind: "Quick Task" },
  { id: "work-orders", label: "Work Orders", kind: "Work Order" },
  {
    id: "maintenance",
    label: "Preventive Maintenance",
    kind: "Preventive Maintenance",
  },
  { id: "projects", label: "Projects", kind: "Project" },
  { id: "completed", label: "Completed", kind: "completed" },
];

const SECTION_STORAGE_KEY = "atlas-work-section-settings-v1";
const CATEGORY_STORAGE_KEY = "atlas-work-category-settings-v1";

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

function categoryEmoji(category: string) {
  const match = String(category || "")
    .trim()
    .match(
      /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u,
    );
  return match?.[1] || "🔧";
}

function categoryDisplayLabel(category: string) {
  return (
    String(category || "Maintenance")
      .replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u, "")
      .trim() || "Maintenance"
  );
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

function workSortValue(record: any) {
  const priorityRank =
    record.priority === "High" ? 0 : record.priority === "Medium" ? 1 : 2;
  const due = parseDate(String(record.date || ""));
  const dueTime = due ? due.getTime() : Number.MAX_SAFE_INTEGER;
  return { priorityRank, dueTime, title: String(record.title || "") };
}

function sortWorkRecords(records: any[]) {
  return [...records].sort((a, b) => {
    const left = workSortValue(a);
    const right = workSortValue(b);
    if (left.priorityRank !== right.priorityRank)
      return left.priorityRank - right.priorityRank;
    if (left.dueTime !== right.dueTime) return left.dueTime - right.dueTime;
    return left.title.localeCompare(right.title);
  });
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

function safeReadCategories() {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CATEGORIES;
    const cleaned = parsed
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...cleaned]));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function safeSaveCategories(categories: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CATEGORY_STORAGE_KEY,
      JSON.stringify(categories),
    );
  } catch {
    // Category settings are optional UI preferences.
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
  addWorkOrder: (initial?: Record<string, unknown>) => void;
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
  procedureRecords?: any[];
  documentRecords?: any[];
  calendarItems?: any[];
  weatherDays?: any[];
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

function AtlasWorkOrders(props: AtlasWorkOrdersProps) {
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
    procedureRecords = [],
    documentRecords = [],
    calendarItems = [],
    weatherDays = [],
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
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [manageSectionsOpen, setManageSectionsOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [categoryChoices, setCategoryChoices] =
    useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [pendingPatch, setPendingPatch] = useState<{
    recordId: string;
    patch: Record<string, unknown>;
  } | null>(null);
  const [pendingPhotoRecordId, setPendingPhotoRecordId] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newHistoryNote, setNewHistoryNote] = useState("");

  useEffect(() => {
    const loaded = safeReadSections();
    setSections(loaded);
    setCategoryChoices(safeReadCategories());
    if (!loaded.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(loaded[0]?.id || "my-work");
    }
  }, []);

  useEffect(() => {
    if (!pendingPatch || selectedService.id !== pendingPatch.recordId) return;
    updateWorkOrder(pendingPatch.patch);
    setPendingPatch(null);
  }, [pendingPatch, selectedService.id]);

  useEffect(() => {
    if (!pendingPhotoRecordId || selectedService.id !== pendingPhotoRecordId)
      return;
    quickPhotoInputRef.current?.click();
    setPendingPhotoRecordId("");
  }, [pendingPhotoRecordId, selectedService.id]);

  const activeSection =
    sections.find((section) => section.id === activeSectionId) || sections[0];

  const categories = useMemo(() => {
    const values = new Set(categoryChoices);
    serviceRecords.forEach((record: any) => {
      const category = categoryLabel(record).trim();
      if (category) values.add(category);
    });
    return ["All", ...Array.from(values)];
  }, [categoryChoices, serviceRecords]);

  function addCategory() {
    const value = newCategory.trim();
    if (!value) return;
    const next = Array.from(new Set([...categoryChoices, value]));
    setCategoryChoices(next);
    safeSaveCategories(next);
    setNewCategory("");
  }

  function renameCategory(category: string) {
    const nextName = window.prompt("Rename category", category)?.trim();
    if (!nextName || nextName === category) return;
    const next = Array.from(
      new Set(
        categoryChoices.map((item) => (item === category ? nextName : item)),
      ),
    );
    setCategoryChoices(next);
    safeSaveCategories(next);
    if (categoryFilter === category) setCategoryFilter(nextName);
    serviceRecords
      .filter((record: any) => categoryLabel(record) === category)
      .forEach((record: any) => {
        if (record.id === selectedService.id) {
          updateWorkOrder({
            workCategory: nextName,
            emoji: categoryEmoji(nextName),
          });
        }
      });
  }

  function removeCategory(category: string) {
    if (
      !window.confirm(
        `Remove ${category} from the category menu? Existing records keep their current category.`,
      )
    ) {
      return;
    }
    const next = categoryChoices.filter((item) => item !== category);
    setCategoryChoices(next);
    safeSaveCategories(next);
    if (categoryFilter === category) setCategoryFilter("All");
  }

  function restoreDefaultCategories() {
    setCategoryChoices(DEFAULT_CATEGORIES);
    safeSaveCategories(DEFAULT_CATEGORIES);
    setCategoryFilter("All");
  }

  const matchesCommonFilters = (record: any) => {
    const search = localSearch.trim().toLowerCase();
    const category = categoryLabel(record);
    const matchesCategory =
      categoryFilter === "All" || category === categoryFilter;
    const matchesType = typeFilter === "All" || itemType(record) === typeFilter;
    const matchesStatus =
      statusFilter === "All" ||
      String(record.status || "Open") === statusFilter;
    const matchesLocation =
      locationFilter === "All" ||
      String(record.locationId || "") === locationFilter;
    const matchesAsset =
      assetFilter === "All" || String(record.assetId || "") === assetFilter;
    const matchesAssigned =
      assignedFilter === "All" ||
      String(record.assignedTo || "") === assignedFilter;
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
    return (
      matchesCategory &&
      matchesType &&
      matchesStatus &&
      matchesLocation &&
      matchesAsset &&
      matchesAssigned &&
      matchesSearch
    );
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
    typeFilter,
    statusFilter,
    locationFilter,
    assetFilter,
    assignedFilter,
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
      if (group && group in groups)
        groups[group as keyof typeof groups].push(record);
    });
    return {
      today: sortWorkRecords(groups.today),
      week: sortWorkRecords(groups.week),
      upcoming: sortWorkRecords(groups.upcoming),
      maintenance: sortWorkRecords(groups.maintenance),
      projects: sortWorkRecords(groups.projects),
    };
  }, [visibleRecords]);

  const tabCounts = useMemo(() => {
    const result: Record<string, number> = {};
    sections.forEach((section) => {
      result[section.id] = filteredServices.filter((record: any) => {
        if (section.kind === "my-work") return record.status !== "Completed";
        if (section.kind === "completed") return record.status === "Completed";
        return (
          record.status !== "Completed" && itemType(record) === section.kind
        );
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
    whiteSpace: "nowrap",
    flex: "0 0 auto",
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

  function selectAndPatch(record: any, patch: Record<string, unknown>) {
    setSelectedServiceId(record.id);
    setPendingPatch({ recordId: record.id, patch });
  }

  function quickReschedule(record: any) {
    const value = window.prompt(
      "New due date (YYYY-MM-DD)",
      String(record.date || ""),
    );
    if (value === null) return;
    const nextDate = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      window.alert("Enter the date as YYYY-MM-DD.");
      return;
    }
    selectAndPatch(record, { date: nextDate, status: "Scheduled" });
  }

  function quickConvert(record: any) {
    const value = window.prompt(
      "Convert to: Task, Work Order, Maintenance, or Project",
      itemType(record) === "Quick Task" ? "Task" : itemType(record),
    );
    if (value === null) return;
    const normalized = value.trim().toLowerCase();
    const workType: WorkItemType | "" =
      normalized === "task" || normalized === "quick task"
        ? "Quick Task"
        : normalized === "work order" || normalized === "workorder"
          ? "Work Order"
          : normalized === "maintenance" ||
              normalized === "preventive maintenance"
            ? "Preventive Maintenance"
            : normalized === "project"
              ? "Project"
              : "";
    if (!workType) {
      window.alert("Use Task, Work Order, Maintenance, or Project.");
      return;
    }
    selectAndPatch(record, {
      workType,
      recurring:
        workType === "Preventive Maintenance"
          ? true
          : Boolean(record.recurring),
    });
  }

  function quickAddPhoto(record: any) {
    setSelectedServiceId(record.id);
    setPendingPhotoRecordId(record.id);
  }

  function quickTask() {
    addWorkOrder({
      workType: "Quick Task",
      workCategory: "🧹 Cleaning",
      effort: "15 minutes",
      date: new Date().toISOString().slice(0, 10),
      status: "Open",
      recurring: false,
    } as any);
  }

  function tomorrowDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  function nextWeekDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  }

  function duplicateWork(record: any) {
    addWorkOrder({
      ...record,
      id: undefined,
      title: `${record.title || "Work"} Copy`,
      status: "Open",
      lastCompletedDate: "",
      completionHistory: [],
      serviceHistory: [],
      photos: [],
      documents: [],
      checklist: (record.checklist || []).map((item: ChecklistItem) => ({
        ...item,
        id: uid("check"),
        completed: false,
      })),
    });
  }

  function effortMinutes(value: string) {
    if (value === "5 minutes") return 5;
    if (value === "15 minutes") return 15;
    if (value === "30 minutes") return 30;
    if (value === "1 hour") return 60;
    if (value === "Half Day") return 240;
    if (value === "Full Day") return 480;
    if (value === "Multi-Day") return 960;
    return 30;
  }

  const planContext = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCalendar = calendarItems.filter(
      (item: any) => item.date === today,
    );
    const todayWeather = weatherDays.find((day: any) => day.date === today);
    const rainRisk = Number(todayWeather?.precipChance || 0) >= 50;
    return { todayCalendar, todayWeather, rainRisk };
  }, [calendarItems, weatherDays]);

  const dayPlan = useMemo(() => {
    const outdoorCategory = (record: any) => {
      const value = categoryLabel(record).toLowerCase();
      return [
        "landscap",
        "irrigation",
        "dock",
        "marine",
        "exterior",
        "vehicle",
      ].some((term) => value.includes(term));
    };
    const candidates = serviceRecords
      .filter((record: any) => record.status !== "Completed")
      .map((record: any) => ({
        ...record,
        minutes: effortMinutes(String(record.effort || "30 minutes")),
        distance: record.date ? dayDistance(String(record.date)) : 999,
        weatherPenalty: planContext.rainRisk && outdoorCategory(record) ? 3 : 0,
        inProgressRank: record.status === "In Progress" ? -2 : 0,
      }))
      .sort((a: any, b: any) => {
        const priority = (value: string) =>
          value === "High" ? 0 : value === "Medium" ? 1 : 2;
        return (
          a.inProgressRank - b.inProgressRank ||
          a.weatherPenalty - b.weatherPenalty ||
          priority(a.priority) - priority(b.priority) ||
          a.distance - b.distance ||
          String(a.locationId || "").localeCompare(String(b.locationId || ""))
        );
      });
    let used = 0;
    return candidates.filter((record: any) => {
      if (used >= 480) return false;
      used += Math.min(record.minutes, 480);
      return true;
    });
  }, [serviceRecords, planContext]);

  function addChecklistItem() {
    const text = newChecklistText.trim();
    if (!text) return;
    const checklist = [
      ...(selectedService.checklist || []),
      { id: uid("check"), text, completed: false },
    ];
    updateWorkOrder({ checklist });
    setNewChecklistText("");
  }

  function toggleChecklistItem(id: string) {
    updateWorkOrder({
      checklist: (selectedService.checklist || []).map((item: ChecklistItem) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    });
  }

  function deleteChecklistItem(id: string) {
    updateWorkOrder({
      checklist: (selectedService.checklist || []).filter(
        (item: ChecklistItem) => item.id !== id,
      ),
    });
  }

  function addHistoryNote() {
    const text = newHistoryNote.trim();
    if (!text) return;
    updateWorkOrder({
      notesHistory: [
        { id: uid("note"), text, createdAt: new Date().toISOString() },
        ...(selectedService.notesHistory || []),
      ],
    });
    setNewHistoryNote("");
  }

  function renderWorkRow(record: any) {
    const type = itemType(record);
    const category = categoryLabel(record);
    const overdue =
      record.status !== "Completed" &&
      Boolean(record.date) &&
      dayDistance(String(record.date)) < 0;

    return (
      <div
        key={record.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedServiceId(record.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedServiceId(record.id);
          }
        }}
        style={{
          ...rowButtonStyle,
          display: "grid",
          gap: 10,
          cursor: "pointer",
          borderColor:
            record.id === selectedService.id ? colors.gold : colors.line,
          borderLeft: overdue
            ? `5px solid ${colors.red}`
            : rowButtonStyle.borderLeft,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", lineHeight: 1.35 }}>
              {record.title || "Untitled Work"}
            </strong>
            <p style={{ ...mutedSmallStyle, marginTop: 4 }}>
              {categoryDisplayLabel(category)} · {type}
            </p>
            <p style={{ ...mutedSmallStyle, marginTop: 2 }}>
              {record.date
                ? `${record.recurring ? "Next due" : "Due"} ${formatDate(record.date)}`
                : "No due date"}
              {record.priority ? ` · ${record.priority} priority` : ""}
            </p>
            {record.assetId || record.vendorId ? (
              <p style={{ ...mutedSmallStyle, marginTop: 2 }}>
                {record.assetId ? assetName(record.assetId) : ""}
                {record.assetId && record.vendorId ? " · " : ""}
                {record.vendorId ? vendorName(record.vendorId) : ""}
              </p>
            ) : null}
          </div>
          <div style={workOrderListBadgesStyle}>
            {overdue ? <span style={badgeStyle("High")}>Overdue</span> : null}
            {record.effort ? (
              <span style={recurringBadgeStyle}>{record.effort}</span>
            ) : null}
            {record.assignedTo ? (
              <span style={recurringBadgeStyle}>{record.assignedTo}</span>
            ) : null}
            {record.recurring ? (
              <span style={recurringBadgeStyle}>Recurring</span>
            ) : null}
            {record.priority ? (
              <span style={badgeStyle(record.priority)}>{record.priority}</span>
            ) : null}
            <span style={badgeStyle(record.status || "Open")}>
              {record.status || "Open"}
            </span>
          </div>
        </div>

      </div>
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
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))
              }
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "11px 13px",
                border: 0,
                borderBottom: collapsedGroups[group.id]
                  ? 0
                  : `1px solid ${colors.line}`,
                background: "#F8FAFC",
                color: colors.text,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <strong>{group.label}</strong>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={recurringBadgeStyle}>{group.records.length}</span>
                <span aria-hidden="true">
                  {collapsedGroups[group.id] ? "▸" : "▾"}
                </span>
              </span>
            </button>
            {!collapsedGroups[group.id] ? (
              <div style={listStyle}>
                {group.records.map(renderWorkRow)}
                {!group.records.length ? (
                  <div style={{ ...noticeStyle, margin: 10 }}>
                    Nothing in this section.
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      <input
        ref={quickPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => void addPhotos(event.currentTarget.files)}
        style={{ display: "none" }}
      />
      <ListDrawerLayout
        eyebrow="Organize / Complete"
        title={activeSection?.label || "My Work"}
        detail="Track active work, recurring maintenance, projects, and completed history."
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
            <button
              type="button"
              onClick={() => setManageCategoriesOpen((current) => !current)}
              style={secondaryButtonStyle}
            >
              Edit Categories
            </button>
            <button
              type="button"
              onClick={() => setPlanOpen((current) => !current)}
              style={secondaryButtonStyle}
            >
              Plan My Day
            </button>
            <button
              type="button"
              onClick={quickTask}
              style={secondaryButtonStyle}
            >
              + Quick Task
            </button>
            <button
              type="button"
              onClick={() => addWorkOrder()}
              style={goldButtonStyle}
            >
              Add Work
            </button>
          </div>
        }
        list={
          <div style={stackStyle}>
            {planOpen ? (
              <section style={{ ...filterPanelStyle, background: "#FFFFFF" }}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Smart Daily Plan</div>
                    <strong>Prioritized for roughly 8 hours</strong>
                    <div style={mutedSmallStyle}>
                      {planContext.todayCalendar.length} calendar item
                      {planContext.todayCalendar.length === 1 ? "" : "s"}
                      {planContext.todayWeather
                        ? ` · ${Math.round(Number(planContext.todayWeather.high || 0))}° high · ${Math.round(Number(planContext.todayWeather.precipChance || 0))}% rain`
                        : ""}
                    </div>
                  </div>
                  <span style={recurringBadgeStyle}>
                    {dayPlan.length} items
                  </span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {dayPlan.map((record: any, index: number) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedServiceId(record.id)}
                      style={{
                        ...rowButtonStyle,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>
                        <strong>
                          {index + 1}. {record.title || "Untitled Work"}
                        </strong>
                        <br />
                        <small style={mutedSmallStyle}>
                          {record.effort || "30 minutes"} ·{" "}
                          {record.locationId || assetName(record.assetId)} ·{" "}
                          {formatDate(record.date)}
                        </small>
                      </span>
                      <span style={badgeStyle(record.priority)}>
                        {record.priority}
                      </span>
                    </button>
                  ))}
                  {!dayPlan.length ? (
                    <div style={noticeStyle}>No open work to plan.</div>
                  ) : null}
                </div>
              </section>
            ) : null}
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
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                      >
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
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <input
                  value={localSearch}
                  onChange={(event) =>
                    setLocalSearch(event.currentTarget.value)
                  }
                  placeholder="Search work, asset, vendor, category..."
                  style={controlStyle}
                />
                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.currentTarget.value)
                  }
                  style={controlStyle}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "All"
                        ? "All Categories"
                        : categoryDisplayLabel(category)}
                    </option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.currentTarget.value)}
                  style={controlStyle}
                >
                  <option value="All">All Types</option>
                  <option value="Quick Task">Tasks</option>
                  <option value="Work Order">Work Orders</option>
                  <option value="Preventive Maintenance">
                    Preventive Maintenance
                  </option>
                  <option value="Project">Projects</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.currentTarget.value)
                  }
                  style={controlStyle}
                >
                  <option value="All">All Statuses</option>
                  {[
                    "Open",
                    "Scheduled",
                    "In Progress",
                    "Waiting",
                    "Monitor",
                    "Completed",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={locationFilter}
                  onChange={(event) =>
                    setLocationFilter(event.currentTarget.value)
                  }
                  style={controlStyle}
                >
                  <option value="All">All Locations</option>
                  {byName(locationRecords).map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <select
                  value={assetFilter}
                  onChange={(event) =>
                    setAssetFilter(event.currentTarget.value)
                  }
                  style={controlStyle}
                >
                  <option value="All">All Assets</option>
                  {byName(assetRecords).map((asset: any) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
                <select
                  value={assignedFilter}
                  onChange={(event) =>
                    setAssignedFilter(event.currentTarget.value)
                  }
                  style={controlStyle}
                >
                  <option value="All">Anyone Assigned</option>
                  {byName(contactRecords).map((contact: any) => (
                    <option
                      key={contact.id || contact.name}
                      value={contact.name}
                    >
                      {contact.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setCategoryFilter("All");
                    setTypeFilter("All");
                    setStatusFilter("All");
                    setLocationFilter("All");
                    setAssetFilter("All");
                    setAssignedFilter("All");
                  }}
                  style={secondaryButtonStyle}
                >
                  Clear Filters
                </button>
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
                  {selectedService.title.trim() || "New Work"}
                </h3>
                <p style={mutedSmallStyle}>
                  {categoryDisplayLabel(categoryLabel(selectedService))} ·{" "}
                  {itemType(selectedService)}
                </p>
              </div>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Work Information</div>
                <div style={formGridStyle}>
                  <Field
                    label="Title / Rename"
                    value={selectedService.title}
                    onChange={(value: string) =>
                      updateWorkOrder({ title: value })
                    }
                  />

                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>
                      {selectedService.recurring ? "Next Due" : "Due Date"}
                    </span>
                    <input
                      type="date"
                      value={String(selectedService.date || "")}
                      onChange={(event) =>
                        updateWorkOrder({
                          date: event.currentTarget.value || "",
                        })
                      }
                      style={inputStyle}
                    />
                  </label>

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
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
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
                        updateWorkOrder({
                          locationId: event.currentTarget.value,
                        })
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
                    <div style={eyebrowStyle}>Photos</div>
                    <strong>
                      {(selectedService.photos || []).length} attached
                    </strong>
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
                  onChange={(event) =>
                    void addPhotos(event.currentTarget.files)
                  }
                  style={{ display: "none" }}
                />
                {photoMessage ? (
                  <p style={mutedSmallStyle}>{photoMessage}</p>
                ) : null}
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
                    Add photos of the issue, repair, completed work, equipment,
                    or surrounding area.
                  </p>
                )}
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Service History</div>
                    <strong>
                      {(selectedService.serviceHistory || []).length} saved
                      completion snapshot
                      {(selectedService.serviceHistory || []).length === 1
                        ? ""
                        : "s"}
                    </strong>
                  </div>
                </div>
                {(selectedService.serviceHistory || []).length ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {(selectedService.serviceHistory || []).map(
                      (entry: any) => (
                        <div
                          key={entry.id}
                          style={{
                            border: `1px solid ${colors.line}`,
                            borderRadius: 10,
                            padding: 10,
                            background: "#F8FAFC",
                          }}
                        >
                          <strong>
                            {new Date(entry.completedAt).toLocaleString()}
                          </strong>
                          <div style={mutedSmallStyle}>
                            Due {formatDate(entry.dueDate)} ·{" "}
                            {entry.statusBefore}
                          </div>
                          <div style={mutedSmallStyle}>
                            {
                              (entry.checklist || []).filter(
                                (item: any) => item.completed,
                              ).length
                            }
                            /{(entry.checklist || []).length} checklist items
                            complete · {(entry.photos || []).length} photo(s)
                          </div>
                          {entry.notes ? (
                            <p style={{ marginBottom: 0 }}>{entry.notes}</p>
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    Completed work will be saved here with its notes, checklist,
                    photos, and links.
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

              <details style={detailSectionStyle}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 800,
                    listStyle: "none",
                  }}
                >
                  Category & Type
                </summary>

                <div style={{ ...formGridStyle, marginTop: 12 }}>
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Work Type</span>
                    <select
                      value={itemType(selectedService)}
                      onChange={(event) => {
                        const workType = event.currentTarget
                          .value as WorkItemType;
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
                      <option value="Quick Task">Task</option>
                      <option value="Work Order">Work Order</option>
                      <option value="Preventive Maintenance">
                        Preventive Maintenance
                      </option>
                      <option value="Project">Project</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Category</span>
                    <select
                      value={categoryLabel(selectedService)}
                      onChange={(event) => {
                        const workCategory = event.currentTarget.value;
                        updateWorkOrder({
                          workCategory,
                          emoji: categoryEmoji(workCategory),
                        });
                      }}
                      style={inputStyle}
                    >
                      {!categories.includes(categoryLabel(selectedService)) ? (
                        <option value={categoryLabel(selectedService)}>
                          {categoryDisplayLabel(categoryLabel(selectedService))}
                        </option>
                      ) : null}
                      {categories
                        .filter((category) => category !== "All")
                        .map((category) => (
                          <option key={category} value={category}>
                            {categoryDisplayLabel(category)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setManageCategoriesOpen((open) => !open)}
                  style={{ ...miniButtonStyle, marginTop: 10 }}
                >
                  {manageCategoriesOpen ? "Close Category Manager" : "Manage Categories"}
                </button>

                {manageCategoriesOpen ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: `1px solid ${colors.line}`,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "minmax(0, 1fr) auto",
                        gap: 8,
                      }}
                    >
                      <input
                        value={newCategory}
                        onChange={(event) =>
                          setNewCategory(event.currentTarget.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCategory();
                          }
                        }}
                        placeholder="New category name"
                        style={controlStyle}
                      />
                      <button
                        type="button"
                        onClick={addCategory}
                        style={goldButtonStyle}
                      >
                        Add Category
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 7 }}>
                      {categoryChoices.map((category) => (
                        <div
                          key={category}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "8px 0",
                            borderBottom: `1px solid ${colors.line}`,
                          }}
                        >
                          <strong>{categoryDisplayLabel(category)}</strong>
                          <div
                            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                          >
                            <button
                              type="button"
                              onClick={() => renameCategory(category)}
                              style={miniButtonStyle}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCategory(category)}
                              style={{
                                ...dangerButtonStyle,
                                padding: "7px 10px",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={restoreDefaultCategories}
                      style={secondaryButtonStyle}
                    >
                      Restore Default Categories
                    </button>
                  </div>
                ) : null}
              </details>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Work Order Actions</div>
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

                  {selectedService.status === "Completed" ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateWorkOrder({ status: "Open", completedAt: "" })
                      }
                      style={secondaryButtonStyle}
                    >
                      Reopen
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => updateWorkOrder({ status: "In Progress" })}
                        style={secondaryButtonStyle}
                      >
                        Start
                      </button>
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
                          : "Done"}
                      </button>
                      <button
                        type="button"
                        onClick={() => quickReschedule(selectedService)}
                        style={secondaryButtonStyle}
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => quickConvert(selectedService)}
                        style={secondaryButtonStyle}
                      >
                        Convert
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkOrder({
                            date: tomorrowDate(),
                            status: "Scheduled",
                          })
                        }
                        style={secondaryButtonStyle}
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkOrder({
                            date: nextWeekDate(),
                            status: "Scheduled",
                          })
                        }
                        style={secondaryButtonStyle}
                      >
                        Next Week
                      </button>
                    </>
                  )}

                  <label
                    style={{
                      ...recurrenceToggleStyle,
                      minHeight: 42,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedService.recurring)}
                      onChange={(event) =>
                        updateWorkOrder({
                          recurring: event.currentTarget.checked,
                        })
                      }
                    />
                    Recurring
                  </label>

                  <button
                    type="button"
                    onClick={() => quickAddPhoto(selectedService)}
                    style={secondaryButtonStyle}
                  >
                    Add Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateWork(selectedService)}
                    style={secondaryButtonStyle}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteWorkOrderRecord(selectedService)}
                    style={dangerButtonStyle}
                  >
                    Delete
                  </button>
                </div>

                {selectedService.recurring ? (
                  <div
                    style={{
                      ...recurrenceGridStyle,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${colors.line}`,
                    }}
                  >
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Repeat Every</span>
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
                            recurrenceUnit: event.currentTarget
                              .value as WorkOrderRecurrenceUnit,
                          })
                        }
                        style={inputStyle}
                      >
                        {(
                          [
                            "Days",
                            "Weeks",
                            "Months",
                            "Years",
                          ] as WorkOrderRecurrenceUnit[]
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
                    />
                  </div>
                ) : null}
              </section>

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
    </>
  );
}

export { AtlasWorkOrders };
export default AtlasWorkOrders;
