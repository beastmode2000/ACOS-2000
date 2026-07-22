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

const SYMBOL = {
  back: "\u2190",
  close: "\u00D7",
  edit: "\u270F",
  up: "\u2191",
  down: "\u2193",
  collapsed: "\u25B8",
  expanded: "\u25BE",
};

const DEFAULT_CATEGORIES = [
  "\u{1F527} Maintenance",
  "\u{1F9F9} Cleaning",
  "\u{1F33F} Landscaping",
  "\u{1F6BF} Pool & Spa",
  "\u{1F4A7} Irrigation",
  "\u26A1 Electrical",
  "\u{1F6B0} Plumbing",
  "\u2744\uFE0F HVAC",
  "\u{1F6A4} Dock & Marine",
  "\u{1F697} Vehicles",
  "\u{1F3E0} House",
  "\u{1F4E6} Inventory",
  "\u{1F4CB} Project",
  "\u2705 Inspection",
  "\u{1F6A8} Safety",
  "\u{1F4C4} Admin",
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
  const distance = dayDistance(String(record.date || ""));
  if (distance <= 0) return "today";
  const type = itemType(record);
  if (type === "Project") return "projects";
  if (type === "Preventive Maintenance" || record.recurring) {
    return "maintenance";
  }
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

function completedTime(record: any) {
  const candidates = [
    record.completedAt,
    record.lastCompletedDate,
    ...(Array.isArray(record.completionHistory)
      ? record.completionHistory
      : []),
    ...(Array.isArray(record.serviceHistory)
      ? record.serviceHistory.map((entry: any) => entry?.completedAt)
      : []),
  ];

  return candidates.reduce((latest: number, value: unknown) => {
    if (!value) return latest;
    const parsed = new Date(String(value)).getTime();
    return Number.isNaN(parsed) ? latest : Math.max(latest, parsed);
  }, 0);
}

function sortCompletedRecords(records: any[]) {
  return [...records].sort((a, b) => {
    const timeDifference = completedTime(b) - completedTime(a);
    if (timeDifference !== 0) return timeDifference;
    return String(a.title || "").localeCompare(String(b.title || ""));
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
          typeof section.kind === "string" && section.kind !== "completed",
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

function photoSource(photo?: PhotoLike | null) {
  return String(photo?.dataUrl || photo?.url || "");
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
  assetPhotoRecords?: any[];
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
  openResetKey?: number;
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
    assetPhotoRecords = [],
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
    openResetKey = 0,
  } = props;

  const [sections, setSections] = useState<WorkSection[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState("my-work");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dueDateFilter, setDueDateFilter] = useState("All");
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
  const newWorkTitleRef = useRef<HTMLInputElement | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [workEditorOpen, setWorkEditorOpen] = useState(false);
  const [newWorkDraft, setNewWorkDraft] = useState<{
    title: string;
    workType: WorkItemType;
    workCategory: string;
    priority: "Low" | "Medium" | "High";
    date: string;
  }>({
    title: "",
    workType: "Work Order",
    workCategory: "🔧 Maintenance",
    priority: "Medium",
    date: "",
  });
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newHistoryNote, setNewHistoryNote] = useState("");
  const [recurrenceIntervalDraft, setRecurrenceIntervalDraft] = useState("1");
  const [completedHistoryOpen, setCompletedHistoryOpen] = useState(true);
  const [completedHistoryLimit, setCompletedHistoryLimit] = useState(5);

  useEffect(() => {
    setRecurrenceIntervalDraft(
      String(Math.max(1, Number(selectedService?.recurrenceInterval || 1))),
    );
  }, [selectedService?.id, selectedService?.recurrenceInterval]);

  useEffect(() => {
    setNewWorkOpen(false);
    setDetailOpen(false);
    setPlanOpen(false);
    setManageSectionsOpen(false);
    setManageCategoriesOpen(false);
  }, [openResetKey]);

  useEffect(() => {
    if (!selectedService?.id) setDetailOpen(false);
    setWorkEditorOpen(false);
  }, [selectedService?.id]);

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
    const dueDistance = dayDistance(String(record.date || ""));
    const matchesDueDate =
      dueDateFilter === "All" ||
      (dueDateFilter === "Overdue" && dueDistance < 0) ||
      (dueDateFilter === "Today" && dueDistance === 0) ||
      (dueDateFilter === "Next 7 Days" &&
        dueDistance >= 0 &&
        dueDistance <= 7) ||
      (dueDateFilter === "Next Month" &&
        dueDistance >= 0 &&
        dueDistance <= 30) ||
      (dueDateFilter === "No Due Date" && !String(record.date || "").trim());
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
        locationRecords.find(
          (location: any) => location.id === record.locationId,
        )?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    return (
      matchesCategory &&
      matchesType &&
      matchesStatus &&
      matchesDueDate &&
      matchesLocation &&
      matchesAsset &&
      matchesAssigned &&
      matchesSearch
    );
  };

  function assetPhotoPatch(assetId: string) {
    if (!assetId || (selectedService.photos || []).length) {
      return { assetId };
    }
    const photo = [...assetPhotoRecords]
      .filter((item: any) => item.assetId === assetId && photoSource(item))
      .sort((a: any, b: any) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
      )[0];
    return photo
      ? {
          assetId,
          photos: [
            {
              id: photo.id,
              name: photo.name || "Asset photo",
              dataUrl: photo.dataUrl,
              url: photo.url,
              createdAt: photo.createdAt,
            },
          ],
        }
      : { assetId };
  }

  const visibleRecords = useMemo(() => {
    if (!activeSection) return [];
    const matchingRecords = filteredServices.filter((record: any) => {
      const type = itemType(record);
      const matchesSection =
        activeSection.kind === "my-work"
          ? record.status !== "Completed"
          : activeSection.kind === "completed"
            ? record.status === "Completed"
            : record.status !== "Completed" && type === activeSection.kind;
      return matchesSection && matchesCommonFilters(record);
    });
    return activeSection.kind === "completed"
      ? sortCompletedRecords(matchingRecords)
      : matchingRecords;
  }, [
    activeSection,
    categoryFilter,
    typeFilter,
    statusFilter,
    dueDateFilter,
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

  const completedHistoryRecords = useMemo(
    () =>
      sortCompletedRecords(
        filteredServices.filter(
          (record: any) => String(record.status || "") === "Completed",
        ),
      ),
    [filteredServices],
  );

  const visibleCompletedHistory = completedHistoryRecords.slice(
    0,
    completedHistoryLimit,
  );

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
    setDetailOpen(true);
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
    setDetailOpen(true);
    setSelectedServiceId(record.id);
    setPendingPhotoRecordId(record.id);
  }

  function quickTask() {
    openNewWork("Quick Task");
  }

  function openNewWork(workType: WorkItemType = "Work Order") {
    setDetailOpen(false);
    setSelectedServiceId("");
    setNewWorkDraft({
      title: "",
      workType,
      workCategory:
        workType === "Quick Task"
          ? "🧹 Cleaning"
          : workType === "Project"
            ? "📋 Project"
            : "🔧 Maintenance",
      priority: "Medium",
      date:
        workType === "Quick Task"
          ? new Date().toISOString().slice(0, 10)
          : "",
    });
    setNewWorkOpen(true);
  }

  function createNewWork() {
    const title = newWorkTitleRef.current?.value.trim() || "";
    if (!title) {
      window.alert("Add a title before creating this work item.");
      return;
    }

    setDetailOpen(true);
    addWorkOrder({
      title,
      workType: newWorkDraft.workType,
      workCategory: newWorkDraft.workCategory,
      priority: newWorkDraft.priority,
      date: newWorkDraft.date,
      effort: newWorkDraft.workType === "Quick Task" ? "15 minutes" : "30 minutes",
      status: "Open",
      recurring: newWorkDraft.workType === "Preventive Maintenance",
    } as any);
    setNewWorkOpen(false);
  }

  function handleWorkOption(value: string) {
    if (value === "add-work") openNewWork("Work Order");
    if (value === "quick-task") quickTask();
    if (value === "plan") setPlanOpen((current) => !current);
    if (value === "sections")
      setManageSectionsOpen((current) => !current);
    if (value === "categories")
      setManageCategoriesOpen((current) => !current);
  }

  function handleDetailAction(value: string) {
    if (!value) return;
    if (value === "reopen")
      updateWorkOrder({ status: "Open", completedAt: "" });
    if (value === "start") updateWorkOrder({ status: "In Progress" });
    if (value === "complete") void completeWorkOrder(selectedService);
    if (value === "reschedule") quickReschedule(selectedService);
    if (value === "convert") quickConvert(selectedService);
    if (value === "tomorrow")
      updateWorkOrder({ date: tomorrowDate(), status: "Scheduled" });
    if (value === "next-week")
      updateWorkOrder({ date: nextWeekDate(), status: "Scheduled" });
    if (value === "photo") quickAddPhoto(selectedService);
    if (value === "duplicate") duplicateWork(selectedService);
    if (value === "delete") void deleteWorkOrderRecord(selectedService);
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
        onClick={() => {
          setNewWorkOpen(false);
          setDetailOpen(true);
          setSelectedServiceId(record.id);
        }}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("input, textarea, select, button, a")
          ) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setNewWorkOpen(false);
            setDetailOpen(true);
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
      { id: "today", label: "Today", records: myWorkGroups.today },
      { id: "week", label: "This Week", records: myWorkGroups.week },
      { id: "upcoming", label: "Upcoming", records: myWorkGroups.upcoming },
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
                  {collapsedGroups[group.id] ? SYMBOL.collapsed : SYMBOL.expanded}
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
        outerStyle={
          isMobile
            ? undefined
            : {
                height: "calc(100vh - 132px)",
                minHeight: 620,
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "auto minmax(0, 1fr)",
              }
        }
        gridStyleOverride={
          detailOpen && selectedService.id
            ? isMobile
              ? undefined
              : {
                  gridTemplateColumns: "minmax(340px, 38%) minmax(0, 62%)",
                  height: "100%",
                  minHeight: 0,
                  overflow: "hidden",
                  alignItems: "start",
                }
            : {
                gridTemplateColumns: "1fr",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }
        }
        listPanelStyleOverride={
          isMobile
            ? undefined
            : {
                height: "100%",
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                paddingRight: 8,
              }
        }
        drawerStyleOverride={
          detailOpen && selectedService.id
            ? isMobile
              ? {
                  position: "fixed",
                  inset: 0,
                  zIndex: 1000,
                  width: "100%",
                  height: "100dvh",
                  maxHeight: "100dvh",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  background: "#FFFFFF",
                  padding: 16,
                }
              : {
                  position: "relative",
                  top: 0,
                  height: "100%",
                  maxHeight: "100%",
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                  alignSelf: "start",
                }
            : { display: "none" }
        }
        right={
          <>
            <select
              value=""
              onChange={(event) => {
                handleWorkOption(event.currentTarget.value);
                event.currentTarget.value = "";
              }}
              style={{
                ...controlStyle,
                width: "auto",
                minWidth: 144,
                minHeight: 38,
                padding: "7px 32px 7px 11px",
                background: "#F8FAFC",
                color: colors.muted,
                fontSize: 13,
                fontWeight: 500,
              }}
              aria-label="Work order options"
            >
              <option value="">Work Options</option>
              <option value="quick-task">Add Quick Task</option>
              <option value="plan">Plan My Day</option>
              <option value="sections">Edit Sections</option>
              <option value="categories">Edit Categories</option>
            </select>
            <button
              type="button"
              onClick={() => openNewWork("Work Order")}
              style={{ ...goldButtonStyle, minHeight: 38 }}
            >
              Add Work Order
            </button>
          </>
        }
        list={
          <div style={stackStyle}>
            {newWorkOpen ? (
              <section style={{ ...filterPanelStyle, background: "#FFFFFF" }}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={{ ...eyebrowStyle, opacity: 0.75 }}>
                      New Work
                    </div>
                    <span style={{ color: colors.muted, fontSize: 13 }}>
                      Nothing is added until you press Create.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewWorkOpen(false)}
                    style={{ ...secondaryButtonStyle, fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    ref={newWorkTitleRef}
                    defaultValue=""
                    placeholder="Work title"
                    autoFocus
                    style={controlStyle}
                  />
                  <select
                    value={newWorkDraft.workType}
                    onChange={(event) =>
                      setNewWorkDraft((current) => ({
                        ...current,
                        workType: event.currentTarget.value as WorkItemType,
                      }))
                    }
                    style={controlStyle}
                  >
                    <option value="Quick Task">Task</option>
                    <option value="Work Order">Work Order</option>
                    <option value="Preventive Maintenance">
                      Preventive Maintenance
                    </option>
                    <option value="Project">Project</option>
                  </select>
                  <select
                    value={newWorkDraft.workCategory}
                    onChange={(event) =>
                      setNewWorkDraft((current) => ({
                        ...current,
                        workCategory: event.currentTarget.value,
                      }))
                    }
                    style={controlStyle}
                  >
                    {categories
                      .filter((category) => category !== "All")
                      .map((category) => (
                        <option key={category} value={category}>
                          {categoryDisplayLabel(category)}
                        </option>
                      ))}
                  </select>
                  <select
                    value={newWorkDraft.priority}
                    onChange={(event) =>
                      setNewWorkDraft((current) => ({
                        ...current,
                        priority: event.currentTarget.value as
                          | "Low"
                          | "Medium"
                          | "High",
                      }))
                    }
                    style={controlStyle}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                  <input
                    type="date"
                    value={newWorkDraft.date}
                    onChange={(event) =>
                      setNewWorkDraft((current) => ({
                        ...current,
                        date: event.currentTarget.value,
                      }))
                    }
                    style={controlStyle}
                  />
                  <button
                    type="button"
                    onClick={createNewWork}
                    style={goldButtonStyle}
                  >
                    Create Work
                  </button>
                </div>
              </section>
            ) : null}

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
                      onClick={() => {
                        setNewWorkOpen(false);
                        setDetailOpen(true);
                        setSelectedServiceId(record.id);
                      }}
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
              <div style={{ display: "grid", gap: 6 }}>
                <span
                  style={{
                    color: colors.muted,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Work Sections
                </span>
                <select
                  value={activeSectionId}
                  onChange={(event) =>
                    setActiveSectionId(event.currentTarget.value)
                  }
                  style={{
                    ...controlStyle,
                    minHeight: 42,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                  aria-label="Choose work section"
                >
                  {sections.map((section) => (
                    <option
                      key={section.id}
                      value={section.id}
                    >
                      {section.label} ({tabCounts[section.id] || 0})
                    </option>
                  ))}
                </select>
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

              {manageCategoriesOpen ? (
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                    padding: 10,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 12,
                    background: "#FFFFFF",
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
                    style={{ ...secondaryButtonStyle, fontWeight: 500 }}
                  >
                    Add Category
                  </button>
                  {categoryChoices.map((category) => (
                    <details
                      key={category}
                      style={{
                        border: `1px solid ${colors.line}`,
                        borderRadius: 9,
                        background: "#F8FAFC",
                      }}
                    >
                      <summary
                        style={{
                          padding: "9px 10px",
                          color: colors.muted,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {categoryDisplayLabel(category)}
                      </summary>
                      <div
                        style={{
                          display: "grid",
                          gap: 6,
                          padding: "0 8px 8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => renameCategory(category)}
                          style={{ ...secondaryButtonStyle, fontWeight: 500 }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          style={{ ...dangerButtonStyle, fontWeight: 500 }}
                        >
                          Remove
                        </button>
                      </div>
                    </details>
                  ))}
                  <button
                    type="button"
                    onClick={restoreDefaultCategories}
                    style={{ ...secondaryButtonStyle, fontWeight: 500 }}
                  >
                    Restore Default Categories
                  </button>
                </div>
              ) : null}

              <details
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 11,
                  background: "#FFFFFF",
                }}
              >
                <summary
                  style={{
                    padding: "11px 12px",
                    color: colors.muted,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Search &amp; Filters
                </summary>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 9,
                    padding: "0 10px 10px",
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
                  value={dueDateFilter}
                  onChange={(event) =>
                    setDueDateFilter(event.currentTarget.value)
                  }
                  style={controlStyle}
                >
                  <option value="All">All Due Dates</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Today">Due Today</option>
                  <option value="Next 7 Days">Next 7 Days</option>
                  <option value="Next Month">Next Month</option>
                  <option value="No Due Date">No Due Date</option>
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
                    setDueDateFilter("All");
                    setLocationFilter("All");
                    setAssetFilter("All");
                    setAssignedFilter("All");
                  }}
                  style={secondaryButtonStyle}
                >
                  Clear Filters
                </button>
                </div>
              </details>
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
          detailOpen && selectedService.id ? (
            <div style={{ ...stackStyle, gap: 7 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  position: isMobile ? "sticky" : "relative",
                  top: 0,
                  zIndex: 5,
                  padding: isMobile ? "4px 0 12px" : "0 0 8px",
                  background: "#FFFFFF",
                  borderBottom: `1px solid ${colors.line}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void deleteWorkOrderRecord(selectedService)}
                    style={{
                      ...dangerButtonStyle,
                      width: "auto",
                      padding: "7px 10px",
                      border: 0,
                      background: "transparent",
                    }}
                  >
                    Delete Work Order
                  </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    setSelectedServiceId("");
                  }}
                  style={{
                    ...secondaryButtonStyle,
                    minHeight: 38,
                    padding: "7px 11px",
                    fontWeight: 500,
                  }}
                  aria-label="Back to work orders"
                >
                  {SYMBOL.back} Back to Work Orders
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    setSelectedServiceId("");
                  }}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: colors.text,
                    fontSize: 26,
                    lineHeight: 1,
                    padding: 6,
                    cursor: "pointer",
                  }}
                  aria-label="Close work order details"
                  title="Close"
                >
                  {SYMBOL.close}
                </button>
                </span>
              </div>
              <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(250px, 40%) minmax(0, 60%)", gap: 18 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    {photoSource((selectedService.photos || [])[0]) ? (
                      <img src={photoSource(selectedService.photos[0])} alt={selectedService.title || "Work order"} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} />
                    ) : (
                      <button type="button" onClick={() => photoInputRef.current?.click()} style={{ width: "100%", aspectRatio: "4 / 3", border: `1px dashed ${colors.line}`, borderRadius: 10, background: "#F8FAFC", color: colors.muted, cursor: "pointer" }}>Add Work Order Photo</button>
                    )}
                    <button type="button" onClick={() => photoInputRef.current?.click()} style={{ ...secondaryButtonStyle, fontWeight: 500 }}>Add / Change Photo</button>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={eyebrowStyle}>Work Order Details</div>
                        {workEditorOpen ? (
                          <input value={selectedService.title || ""} onChange={(event) => updateWorkOrder({ title: event.currentTarget.value })} style={{ ...inputStyle, marginTop: 5, fontSize: isMobile ? 20 : 24, fontWeight: 800 }} />
                        ) : (
                          <h2 style={{ margin: "5px 0 0", color: colors.text, fontSize: isMobile ? 22 : 27, lineHeight: 1.2 }}>{selectedService.title || "Untitled Work Order"}</h2>
                        )}
                      </div>
                      {!workEditorOpen ? (
                        <button type="button" onClick={() => setWorkEditorOpen(true)} style={{ ...secondaryButtonStyle, width: 34, minWidth: 34, height: 34, minHeight: 34, padding: 0, borderRadius: 8 }} aria-label="Edit work order details" title="Edit work order details">{SYMBOL.edit}</button>
                      ) : null}
                    </div>

                    {workEditorOpen ? (
                      <textarea value={selectedService.notes || ""} onChange={(event) => updateWorkOrder({ notes: event.currentTarget.value })} rows={3} placeholder="Describe the work that is needed" style={{ ...inputStyle, minHeight: 82, resize: "vertical" }} />
                    ) : (
                      <p style={{ margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.5 }}>{selectedService.notes || "No description added."}</p>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                      {workEditorOpen ? (
                        <>
                          <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>{selectedService.recurring ? "Next Due" : "Due Date"}</span><input type="date" value={String(selectedService.date || "")} onChange={(event) => updateWorkOrder({ date: event.currentTarget.value })} style={inputStyle} /></label>
                          <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Status</span><select value={selectedService.status || "Open"} onChange={(event) => updateWorkOrder({ status: event.currentTarget.value })} style={inputStyle}><option value="Open">Open</option><option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option><option value="Waiting">Waiting</option><option value="Monitor">Monitor</option><option value="Completed">Completed</option></select></label>
                          <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Priority</span><select value={selectedService.priority || "Medium"} onChange={(event) => updateWorkOrder({ priority: event.currentTarget.value })} style={inputStyle}><option value="High">High</option><option value="Medium">Normal</option><option value="Low">Low</option></select></label>
                          <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Work Type</span><select value={itemType(selectedService)} onChange={(event) => { const workType = event.currentTarget.value as WorkItemType; updateWorkOrder({ workType, recurring: workType === "Preventive Maintenance" ? true : selectedService.recurring }); }} style={inputStyle}><option value="Quick Task">Task</option><option value="Work Order">Work Order</option><option value="Preventive Maintenance">Preventive Maintenance</option><option value="Project">Project</option></select></label>
                        </>
                      ) : (
                        <>
                          <div><span style={fieldLabelStyle}>{selectedService.recurring ? "Next Due" : "Due Date"}</span><div style={{ marginTop: 4 }}>{selectedService.date ? formatDate(selectedService.date) : "No due date"}</div></div>
                          <div><span style={fieldLabelStyle}>Status</span><div style={{ marginTop: 4 }}><span style={badgeStyle(selectedService.status || "Open")}>{selectedService.status || "Open"}</span></div></div>
                          <div><span style={fieldLabelStyle}>Priority</span><div style={{ marginTop: 4 }}><span style={badgeStyle(selectedService.priority || "Medium")}>{selectedService.priority || "Normal"}</span></div></div>
                          <div><span style={fieldLabelStyle}>Work Type</span><div style={{ marginTop: 4 }}>{itemType(selectedService)}</div></div>
                        </>
                      )}
                    </div>

                    {workEditorOpen ? (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button type="button" onClick={() => setWorkEditorOpen(false)} style={secondaryButtonStyle}>Cancel</button>
                        <button type="button" onClick={() => { void saveWorkOrderRecord(); setWorkEditorOpen(false); }} style={{ ...goldButtonStyle, width: "auto" }}>Save Details</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 16 }}>
                <div style={{ ...eyebrowStyle, marginBottom: 12 }}>Atlas Assignment</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Asset</span><select value={selectedService.assetId || ""} onChange={(event) => updateWorkOrder(assetPhotoPatch(event.currentTarget.value))} style={inputStyle}><option value="">No linked asset</option>{byName(assetRecords).map((asset: any) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Location</span><select value={selectedService.locationId || ""} onChange={(event) => updateWorkOrder({ locationId: event.currentTarget.value })} style={inputStyle}><option value="">No linked location</option>{byName(locationRecords).map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Category</span><select value={categoryLabel(selectedService)} onChange={(event) => updateWorkOrder({ workCategory: event.currentTarget.value, emoji: categoryEmoji(event.currentTarget.value) })} style={inputStyle}>{categories.filter((category) => category !== "All").map((category) => <option key={category} value={category}>{categoryDisplayLabel(category)}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Assigned To</span><select value={selectedService.assignedTo || ""} onChange={(event) => updateWorkOrder({ assignedTo: event.currentTarget.value })} style={inputStyle}><option value="">Unassigned</option>{byName(contactRecords).map((contact: any) => <option key={contact.id || contact.name} value={contact.name}>{contact.name}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Vendor</span><select value={selectedService.vendorId || ""} onChange={(event) => updateWorkOrder({ vendorId: event.currentTarget.value })} style={inputStyle}><option value="">No vendor</option>{byName(vendorRecords).map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                </div>
              </section>

              <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 16 }}>
                <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Internal Notes</div>
                <textarea value={selectedService.internalNotes || ""} onChange={(event) => updateWorkOrder({ internalNotes: event.currentTarget.value })} rows={4} placeholder="Add internal notes here..." style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
                <p style={{ ...mutedSmallStyle, marginBottom: 0 }}>These notes stay inside Atlas.</p>
              </section>

              <div style={{ ...buttonRowStyle, justifyContent: "flex-start", padding: "2px 0 8px" }}>
                <button type="button" onClick={() => void saveWorkOrderRecord()} style={{ ...goldButtonStyle, width: "auto" }}>Save Changes</button>
              </div>

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
                  <details style={{ border: `1px solid ${colors.line}`, borderRadius: 9, background: "#FFFFFF" }}>
                    <summary style={{ padding: "8px 10px", cursor: "pointer", color: colors.text, fontSize: 12, fontWeight: 700 }}>
                      Photos ({(selectedService.photos || []).length})
                    </summary>
                    <div style={{ display: "grid", gap: 5, maxHeight: 180, overflowY: "auto", padding: "0 8px 8px" }}>
                      {(selectedService.photos || []).map((photo: PhotoLike) => {
                        const source = photoSource(photo);
                        return (
                          <div key={photo.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 8, padding: "6px 8px", border: `1px solid ${colors.line}`, borderRadius: 8 }}>
                            {source ? (
                              <a href={source} target="_blank" rel="noreferrer" style={{ color: colors.text, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                                {photo.name || "Work photo"}
                              </a>
                            ) : (
                              <span style={mutedSmallStyle}>{photo.name || "Photo unavailable"}</span>
                            )}
                            <button type="button" onClick={() => removePhoto(photo.id)} style={{ ...dangerButtonStyle, padding: "6px 8px" }}>Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ) : null}
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
                      maxHeight: 150,
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
                ) : null}
              </section>

              <section style={{ ...detailSectionStyle, display: "none" }}>
                <div style={eyebrowStyle}>Notes</div>
                <textarea
                  value={selectedService.notes || ""}
                  onChange={(event) =>
                    updateWorkOrder({ notes: event.currentTarget.value })
                  }
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 58 }}
                />
              </section>

              <details style={{ ...detailSectionStyle, display: "none" }}>
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

              <section
                style={{
                  ...detailSectionStyle,
                  padding: 10,
                  gap: 7,
                  background: "#F8FAFC",
                }}
              >
                <div
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: 0.2,
                  }}
                >
                  Work Order Actions
                </div>
                <select
                  value=""
                  onChange={(event) => {
                    handleDetailAction(event.currentTarget.value);
                    event.currentTarget.value = "";
                  }}
                  style={{
                    ...controlStyle,
                    minHeight: 40,
                    color: colors.muted,
                    fontSize: 13,
                    fontWeight: 400,
                    background: "#FFFFFF",
                  }}
                  aria-label="Work order actions"
                >
                  <option value="">Choose an action...</option>
                  {selectedService.status === "Completed" ? (
                    <option value="reopen">Reopen Work Order</option>
                  ) : (
                    <>
                      <option value="start">Start Work</option>
                      <option value="complete">
                        {selectedService.recurring
                          ? "Complete & Move to Next Due"
                          : "Mark Done"}
                      </option>
                      <option value="reschedule">Reschedule</option>
                      <option value="tomorrow">Move to Tomorrow</option>
                      <option value="next-week">Move to Next Week</option>
                      <option value="convert">Convert Work Type</option>
                    </>
                  )}
                  <option value="photo">Add Photo</option>
                  <option value="duplicate">Duplicate Work Order</option>
                  <option value="delete">Delete Work Order</option>
                </select>

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
                        inputMode="numeric"
                        value={recurrenceIntervalDraft}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          if (nextValue === "" || /^\d+$/.test(nextValue)) {
                            setRecurrenceIntervalDraft(nextValue);
                          }
                        }}
                        onBlur={() => {
                          const nextValue = Math.max(
                            1,
                            Number(recurrenceIntervalDraft) || 1,
                          );
                          setRecurrenceIntervalDraft(String(nextValue));
                          updateWorkOrder({ recurrenceInterval: nextValue });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
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

      {false ? (
      <section
        style={{
          marginTop: 18,
          padding: isMobile ? 12 : 18,
          border: `1px solid ${colors.line}`,
          borderRadius: 16,
          background: colors.card || "#FFFFFF",
          color: colors.text,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: completedHistoryOpen ? 14 : 0,
          }}
        >
          <div>
            <div style={eyebrowStyle}>Completed History</div>
            <h3 style={{ ...editorHeaderStyle, margin: "4px 0" }}>
              Completed Work Orders
            </h3>
            <p style={{ ...mutedSmallStyle, margin: 0 }}>
              Completed work orders, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCompletedHistoryOpen((open) => !open)}
            style={{ ...secondaryButtonStyle, fontWeight: 500 }}
          >
            {completedHistoryOpen ? `Hide History ${SYMBOL.up}` : `Show History ${SYMBOL.down}`}
          </button>
        </div>

        {completedHistoryOpen ? (
          completedHistoryRecords.length ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <div
                  style={{
                    minWidth: isMobile ? 760 : 980,
                    display: "grid",
                    gap: 0,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(270px, 2fr) 145px 150px 150px 150px 190px",
                      gap: 12,
                      padding: "0 10px 9px",
                      color: colors.muted,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>Title</span>
                    <span>Completed</span>
                    <span>Asset</span>
                    <span>Location</span>
                    <span>Category</span>
                    <span>Actions</span>
                  </div>

                  {visibleCompletedHistory.map((record: any) => {
                    const photo = (record.photos || [])[0] as
                      | PhotoLike
                      | undefined;
                    const source = photo ? photoSource(photo) : "";
                    const location = locationRecords.find(
                      (item: any) => item.id === record.locationId,
                    );
                    return (
                      <div
                        key={record.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(270px, 2fr) 145px 150px 150px 150px 190px",
                          gap: 12,
                          alignItems: "center",
                          padding: 10,
                          borderTop: `1px solid ${colors.line}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setNewWorkOpen(false);
                            setDetailOpen(true);
                            setSelectedServiceId(record.id);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 0,
                            padding: 0,
                            border: 0,
                            background: "transparent",
                            color: colors.text,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          {source ? (
                            <img
                              src={source}
                              alt=""
                              style={{
                                width: 64,
                                height: 46,
                                flex: "0 0 auto",
                                objectFit: "cover",
                                borderRadius: 8,
                              }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              style={{
                                width: 64,
                                height: 46,
                                display: "grid",
                                placeItems: "center",
                                flex: "0 0 auto",
                                borderRadius: 8,
                                background: "#F1F5F9",
                                fontSize: 22,
                              }}
                            >
                              {categoryEmoji(categoryLabel(record))}
                            </span>
                          )}
                          <span style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {record.title || "Untitled Work"}
                            </strong>
                            <small style={mutedSmallStyle}>
                              {record.assignedTo
                                ? `Completed by ${record.assignedTo}`
                                : "Completed"}
                            </small>
                          </span>
                        </button>
                        <span style={{ fontSize: 13 }}>
                          {completedTime(record)
                            ? new Date(completedTime(record)).toLocaleString()
                            : "—"}
                        </span>
                        <span style={{ fontSize: 13 }}>
                          {record.assetId ? assetName(record.assetId) : "—"}
                        </span>
                        <span style={{ fontSize: 13 }}>
                          {location?.name || "—"}
                        </span>
                        <span style={{ fontSize: 13 }}>
                          {categoryDisplayLabel(categoryLabel(record))}
                        </span>
                        <span style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setNewWorkOpen(false);
                              setDetailOpen(true);
                              setSelectedServiceId(record.id);
                            }}
                            style={{ ...secondaryButtonStyle, padding: "7px 11px" }}
                          >
                            View / Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteWorkOrderRecord(record)}
                            style={{ ...dangerButtonStyle, padding: "7px 10px" }}
                            aria-label={`Delete ${record.title || "work order"}`}
                            title="Delete work order"
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 12,
                  color: colors.muted,
                  fontSize: 13,
                }}
              >
                <span>
                  Showing 1 to {visibleCompletedHistory.length} of{" "}
                  {completedHistoryRecords.length} completed items
                </span>
                {completedHistoryLimit < completedHistoryRecords.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCompletedHistoryLimit((limit) => limit + 5)
                    }
                    style={{ ...secondaryButtonStyle, fontWeight: 500 }}
                  >
                    Load More {SYMBOL.down}
                  </button>
                ) : completedHistoryRecords.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setCompletedHistoryLimit(5)}
                    style={{ ...secondaryButtonStyle, fontWeight: 500 }}
                  >
                    Show Less {SYMBOL.up}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div style={noticeStyle}>No completed work orders yet.</div>
          )
        ) : null}
      </section>
      ) : null}
    </>
  );
}

export { AtlasWorkOrders };
export default AtlasWorkOrders;
