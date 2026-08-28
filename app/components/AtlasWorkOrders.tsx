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
  "Meeting",
  "PTO / Off",
  "Vendor Visit",
];

const DEFAULT_SECTIONS: WorkSection[] = [
  { id: "my-work", label: "All Work", kind: "my-work" },
];

const SECTION_STORAGE_KEY = "atlas-unified-work-section-settings-v2";
const CATEGORY_STORAGE_KEY = "atlas-work-category-settings-v1";
const FAVORITE_STORAGE_KEY = "atlas-work-favorites-v1";
const RECENT_STORAGE_KEY = "atlas-work-recent-v1";

type WorkTemplate = {
  id: string;
  label: string;
  title: string;
  workType: WorkItemType;
  workCategory: string;
  priority: "Low" | "Medium" | "High";
  effort: WorkEffort;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: WorkOrderRecurrenceUnit;
  checklist: string[];
  preferredDay?: string;
  completionWindowDays?: number;
  flexibility?: "Fixed" | "Flexible" | "Anytime This Week";
  defaultAssignee?: string;
  backupAssignee?: string;
  seasonalMonths?: number[];
};

const WORK_TEMPLATES: WorkTemplate[] = [];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;
const DEFAULT_WORK_WEEK = [1, 2, 3, 4, 5];

function normalizedRecurrenceDays(value: unknown) {
  if (!Array.isArray(value)) return [] as number[];
  return Array.from(
    new Set(
      value
        .map((day) => Math.floor(Number(day)))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  );
}

function nextSelectedRecurrenceDate(record: any, startDate: string) {
  const start = parseDate(startDate);
  if (!start) return "";
  const selectedDays = normalizedRecurrenceDays(record?.recurrenceDays);
  if (selectedDays.length) {
    for (let offset = 1; offset <= 14; offset += 1) {
      const candidate = new Date(start);
      candidate.setDate(candidate.getDate() + offset);
      if (selectedDays.includes(candidate.getDay())) {
        return [
          candidate.getFullYear(),
          String(candidate.getMonth() + 1).padStart(2, "0"),
          String(candidate.getDate()).padStart(2, "0"),
        ].join("-");
      }
    }
  }
  const interval = Math.max(1, Math.floor(Number(record?.recurrenceInterval || 1)));
  const unit = String(record?.recurrenceUnit || "Weeks");
  const candidate = new Date(start);
  if (unit === "Days") candidate.setDate(candidate.getDate() + interval);
  else if (unit === "Months") candidate.setMonth(candidate.getMonth() + interval);
  else if (unit === "Years") candidate.setFullYear(candidate.getFullYear() + interval);
  else candidate.setDate(candidate.getDate() + interval * 7);
  return [
    candidate.getFullYear(),
    String(candidate.getMonth() + 1).padStart(2, "0"),
    String(candidate.getDate()).padStart(2, "0"),
  ].join("-");
}


function alignDateToSelectedDay(dateValue: string, recurrenceDays: number[]) {
  const key = dateKey(dateValue);
  if (!key) return dateValue;
  const selectedDays = normalizedRecurrenceDays(recurrenceDays);
  if (!selectedDays.length) return key;
  const date = parseDate(key);
  if (!date || selectedDays.includes(date.getDay())) return key;
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(candidate.getDate() + offset);
    if (selectedDays.includes(candidate.getDay())) {
      return [
        candidate.getFullYear(),
        String(candidate.getMonth() + 1).padStart(2, "0"),
        String(candidate.getDate()).padStart(2, "0"),
      ].join("-");
    }
  }
  return key;
}

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

function isClosedWorkStatus(value: unknown) {
  return value === "Completed" || value === "Cancelled";
}

function isActiveWorkRecord(record: any) {
  return !isClosedWorkStatus(record?.status);
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

function normalizedWorkListText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bseadoo\b/g, "sea doo")
    .replace(/\bf150\b/g, "f 150")
    .replace(/\s+/g, " ")
    .trim();
}

function workListDuplicateKey(record: any) {
  const title = normalizedWorkListText(record?.title);
  if (!title) return `id:${String(record?.id || "")}`;

  const recurringLike =
    Boolean(record?.recurring) ||
    itemType(record) === "Preventive Maintenance" ||
    /^(clean|wash|inspect|service) (cobalt|sea doo|boat|dock|lift box|dock box|sunstream|mercedes|rivian|porsche|lucid|ford|f 150|raptor|kia|honda|subaru)\b/.test(title);

  if (recurringLike) {
    const equipmentOrPlace =
      normalizedWorkListText(record?.assetId) ||
      normalizedWorkListText(record?.subLocationId || record?.subLocation) ||
      normalizedWorkListText(record?.locationId) ||
      "unlinked";
    return `recurring|${title}|${equipmentOrPlace}`;
  }

  return [
    "one-time",
    title,
    normalizedWorkListText(record?.assetId),
    normalizedWorkListText(record?.locationId),
    normalizedWorkListText(record?.subLocationId || record?.subLocation),
    normalizedWorkListText(categoryLabel(record)),
    normalizedWorkListText(record?.assignedTo),
    String(record?.date || ""),
  ].join("|");
}

function workListRecordScore(record: any) {
  return (
    [
      record?.notes,
      record?.assignedTo,
      record?.vendorId,
      record?.assetId,
      record?.locationId,
      record?.procedureId,
    ].filter((value) => String(value || "").trim()).length * 3 +
    (Array.isArray(record?.checklist) ? record.checklist.length : 0) +
    (Array.isArray(record?.photos) ? record.photos.length : 0) +
    (Array.isArray(record?.documents) ? record.documents.length : 0) +
    (Array.isArray(record?.serviceHistory) ? record.serviceHistory.length : 0) +
    (Array.isArray(record?.completionHistory) ? record.completionHistory.length : 0)
  );
}

function dedupeWorkListRecords(records: any[]) {
  const keepers = new Map<string, any>();
  records.forEach((record) => {
    const key = workListDuplicateKey(record);
    const current = keepers.get(key);
    if (!current) {
      keepers.set(key, record);
      return;
    }
    const currentScore = workListRecordScore(current);
    const nextScore = workListRecordScore(record);
    if (
      nextScore > currentScore ||
      (nextScore === currentScore &&
        String(record?.updatedAt || record?.createdAt || "") >
          String(current?.updatedAt || current?.createdAt || ""))
    ) {
      keepers.set(key, record);
    }
  });
  return Array.from(keepers.values());
}

function dateKey(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const key = dateKey(value);
  if (!key) return null;
  const parsed = new Date(`${key}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function recurrencePreviewDates(record: any, count = 3) {
  const startKey = dateKey(String(record.date || ""));
  if (!startKey || !record.recurring) return [];

  const endKey = dateKey(String(record.recurrenceEndDate || ""));
  const dates: string[] = [];
  let cursor = startKey;

  for (let index = 0; index < count; index += 1) {
    const nextKey = nextSelectedRecurrenceDate(record, cursor);
    if (!nextKey || (endKey && nextKey > endKey)) break;
    dates.push(nextKey);
    cursor = nextKey;
  }

  return dates;
}

function dayDistance(dateValue: string) {
  const dueKey = dateKey(dateValue);
  if (!dueKey) return Number.POSITIVE_INFINITY;
  const [dueYear, dueMonth, dueDay] = dueKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayKey().split("-").map(Number);
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (Date.UTC(dueYear, dueMonth - 1, dueDay) -
      Date.UTC(todayYear, todayMonth - 1, todayDay)) /
      oneDay,
  );
}

function isInCalendarMonth(dateValue: string, monthOffset: number) {
  const key = dateKey(dateValue);
  if (!key) return false;
  const [year, month] = key.split("-").map(Number);
  const target = new Date();
  target.setDate(1);
  target.setMonth(target.getMonth() + monthOffset);
  return year === target.getFullYear() && month === target.getMonth() + 1;
}

function myWorkGroup(record: any) {
  if (isClosedWorkStatus(record.status)) return "";
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

function wasCompletedToday(record: any) {
  if (String(record.status || "") !== "Completed") return false;

  const today = todayKey();
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

  return candidates.some((value) => dateKey(value) === today);
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
  addWorkOrder: (initial?: Record<string, unknown>) => Promise<any> | any;
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
  updateWorkOrderRecord: (record: any, patch: Record<string, unknown>) => Promise<boolean> | boolean | void;
  fieldLabelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  byName: (records: any[]) => any[];
  assetRecords: any[];
  assetPhotoRecords?: any[];
  vendorRecords: any[];
  locationRecords?: any[];
  contactRecords?: any[];
  projectRecords?: any[];
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
  completeWorkOrder: (
    record: any,
    options?: { completedDate?: string; completionNote?: string; allowEarly?: boolean },
  ) => Promise<void> | void;
  reopenWorkOrder: (record: any) => Promise<void> | void;
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
    updateWorkOrderRecord,
    fieldLabelStyle,
    inputStyle,
    byName,
    assetRecords,
    assetPhotoRecords = [],
    vendorRecords,
    locationRecords = [],
    contactRecords = [],
    projectRecords = [],
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
    reopenWorkOrder,
    secondaryButtonStyle,
    deleteWorkOrderRecord,
    dangerButtonStyle,
    renderLinkedDocuments,
    openResetKey = 0,
  } = props;

  const [sections, setSections] = useState<WorkSection[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState("my-work");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [dueDateFilter, setDueDateFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [subLocationFilter, setSubLocationFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assignedFilters, setAssignedFilters] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState("All");
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
  const [photoChooserOpen, setPhotoChooserOpen] = useState(false);
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
    recurrenceDays: number[];
  }>({
    title: "",
    workType: "Work Order",
    workCategory: "🔧 Maintenance",
    priority: "Medium",
    date: "",
    recurrenceDays: [],
  });
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newHistoryNote, setNewHistoryNote] = useState("");
  const [completionNoteDraft, setCompletionNoteDraft] = useState("");
  const [recurrenceIntervalDraft, setRecurrenceIntervalDraft] = useState("1");
  const [completedHistoryOpen, setCompletedHistoryOpen] = useState(true);
  const [completedHistoryLimit, setCompletedHistoryLimit] = useState(5);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [pendingTemplate, setPendingTemplate] = useState<WorkTemplate | null>(null);
  const [routinePlannerOpen, setRoutinePlannerOpen] = useState(false);

  useEffect(() => {
    try {
      const favorites = JSON.parse(window.localStorage.getItem(FAVORITE_STORAGE_KEY) || "[]");
      const recent = JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY) || "[]");
      setFavoriteIds(Array.isArray(favorites) ? favorites.map(String) : []);
      setRecentIds(Array.isArray(recent) ? recent.map(String) : []);
    } catch {
      setFavoriteIds([]);
      setRecentIds([]);
    }
  }, []);

  useEffect(() => {
    setSelectedPhotoIndex(0);
    if (!selectedService?.id) return;
    setRecentIds((current) => {
      const next = [selectedService.id, ...current.filter((id) => id !== selectedService.id)].slice(0, 8);
      try { window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [selectedService?.id]);

  useEffect(() => {
    setRecurrenceIntervalDraft(
      String(Math.max(1, Number(selectedService?.recurrenceInterval || 1))),
    );
  }, [selectedService?.id, selectedService?.recurrenceInterval]);

  useEffect(() => {
    setCompletionNoteDraft("");
  }, [selectedService?.id]);

  useEffect(() => {
    setNewWorkOpen(false);
    setDetailOpen(false);
    setPlanOpen(false);
    setRoutinePlannerOpen(false);
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
    setPhotoChooserOpen(true);
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

  const canonicalAssigneeName = (value: unknown) => {
    const name = String(value || "").trim();
    const normalized = name.toLowerCase();
    if (/^pat(?:rick)?(?:[^a-z]|$)/.test(normalized)) return "Patrick Tanner";
    if (/^sean(?:[^a-z]|$)/.test(normalized)) return "Sean Powell";
    return name;
  };

  const assignmentChoices = useMemo(
    () =>
      Array.from(
        new Set([
          "Nick",
          "Addison",
          "Patrick Tanner",
          "Sean Powell",
          ...contactRecords.map((contact: any) => canonicalAssigneeName(contact.name)),
        ].filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [contactRecords],
  );

  const parentLocationId = (location: any) =>
    String(
      location?.parentId ||
        location?.parentLocationId ||
        location?.parentLocation ||
        location?.locationId ||
        "",
    );

  const topLevelLocations = useMemo(
    () => byName(locationRecords.filter((location: any) => !parentLocationId(location))),
    [locationRecords],
  );

  const subLocations = useMemo(
    () =>
      byName(
        locationRecords.filter((location: any) => {
          const parentId = parentLocationId(location);
          return (
            Boolean(parentId) &&
            (locationFilter === "All" || parentId === locationFilter)
          );
        }),
      ),
    [locationRecords, locationFilter],
  );

  function toggleFavorite(recordId: string) {
    setFavoriteIds((current) => {
      const next = current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [recordId, ...current];
      try { window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function openTemplate(templateId: string) {
    const template = WORK_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setDetailOpen(false);
    setSelectedServiceId("");
    setPendingTemplate(template);
    setNewWorkDraft({
      title: template.title,
      workType: template.workType,
      workCategory: template.workCategory,
      priority: template.priority,
      date: template.workType === "Quick Task" ? todayKey() : "",
      recurrenceDays:
        template.workType === "Preventive Maintenance"
          ? [...DEFAULT_WORK_WEEK]
          : [],
    });
    setNewWorkOpen(true);
    window.setTimeout(() => {
      if (newWorkTitleRef.current) newWorkTitleRef.current.value = template.title;
    }, 0);
  }

  function clearFilters() {
    setLocalSearch("");
    setCategoryFilter("All");
    setTypeFilter("All");
    setStatusFilter("Active");
    setDueDateFilter("All");
    setLocationFilter("All");
    setSubLocationFilter("All");
    setAssetFilter("All");
    setAssignedFilters([]);
    setPriorityFilter("All");
  }

  function addCategory() {
    const value = newCategory.trim();
    if (!value) return;
    const next = Array.from(new Set([...categoryChoices, value]));
    setCategoryChoices(next);
    safeSaveCategories(next as string[]);
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
    safeSaveCategories(next as string[]);
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
      (statusFilter === "Active" && isActiveWorkRecord(record)) ||
      String(record.status || "Open") === statusFilter;
    const dueDistance = dayDistance(String(record.date || ""));
    const matchesDueDate =
      dueDateFilter === "All" ||
      (dueDateFilter === "Overdue" && dueDistance < 0) ||
      (dueDateFilter === "Today" && dueDistance === 0) ||
      (dueDateFilter === "Next 7 Days" &&
        dueDistance >= 0 &&
        dueDistance <= 7) ||
      (dueDateFilter === "This Month" &&
        isInCalendarMonth(String(record.date || ""), 0)) ||
      (dueDateFilter === "Next Month" &&
        isInCalendarMonth(String(record.date || ""), 1)) ||
      (dueDateFilter === "No Due Date" && !String(record.date || "").trim());
    const recordLocationId = String(record.locationId || "");
    const recordSubLocationId = String(record.subLocationId || "");
    const linkedLocation = locationRecords.find(
      (location: any) => location.id === recordLocationId,
    );
    const linkedParentId = parentLocationId(linkedLocation);
    const matchesLocation =
      locationFilter === "All" ||
      (locationFilter === "None" && !recordLocationId && !recordSubLocationId) ||
      recordLocationId === locationFilter ||
      linkedParentId === locationFilter;
    const matchesSubLocation =
      subLocationFilter === "All" ||
      recordSubLocationId === subLocationFilter ||
      recordLocationId === subLocationFilter;
    const matchesAsset =
      assetFilter === "All" || String(record.assetId || "") === assetFilter;
    const assignedName = canonicalAssigneeName(record.assignedTo);
    const matchesAssigned =
      !assignedFilters.length ||
      (assignedFilters.includes("__none__") && !assignedName) ||
      assignedFilters.includes(assignedName);
    const matchesPriority =
      priorityFilter === "All" ||
      String(record.priority || "Medium") === priorityFilter;
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
      matchesSubLocation &&
      matchesAsset &&
      matchesAssigned &&
      matchesPriority &&
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

  const displayServices = useMemo(
    () => dedupeWorkListRecords(filteredServices),
    [filteredServices],
  );

  const visibleRecords = useMemo(() => {
    if (!activeSection) return [];
    const matchingRecords = displayServices.filter((record: any) => {
      const type = itemType(record);
      const matchesSection =
        activeSection.kind === "my-work"
          ? true
          : activeSection.kind === "completed"
            ? isClosedWorkStatus(record.status)
            : isActiveWorkRecord(record) && type === activeSection.kind;
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
    subLocationFilter,
    assetFilter,
    assignedFilters,
    displayServices,
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
        displayServices.filter((record: any) => isClosedWorkStatus(record.status)),
      ),
    [displayServices],
  );

  const visibleCompletedHistory = completedHistoryRecords.slice(
    0,
    completedHistoryLimit,
  );

  const activeFilterCount = [
    categoryFilter,
    typeFilter,
    statusFilter === "Active" ? "All" : statusFilter,
    dueDateFilter,
    locationFilter,
    subLocationFilter,
    assetFilter,
    assignedFilters.length ? "Filtered" : "All",
    priorityFilter,
  ].filter((value) => value !== "All").length + (localSearch.trim() ? 1 : 0);


  const recordQuality = useMemo(() => {
    const open = displayServices.filter(isActiveWorkRecord);
    const incomplete = open.filter((record: any) =>
      !String(record.title || "").trim() ||
      (!String(record.date || "").trim() && itemType(record) !== "Project") ||
      (!String(record.assetId || "").trim() && !String(record.locationId || "").trim()) ||
      !String(record.assignedTo || "").trim()
    );
    const duplicateIds = new Set<string>();
    const groups = new Map<string, any[]>();
    open.forEach((record: any) => {
      const key = `${String(record.title || "").trim().toLowerCase()}|${String(record.assetId || "")}|${dateKey(record.date)}`;
      if (!String(record.title || "").trim()) return;
      groups.set(key, [...(groups.get(key) || []), record]);
    });
    groups.forEach((records) => { if (records.length > 1) records.forEach((record) => duplicateIds.add(String(record.id))); });
    return { incomplete, duplicateIds };
  }, [displayServices]);

  const favoriteRecords = useMemo(() => favoriteIds.map((id) => displayServices.find((record: any) => record.id === id)).filter(Boolean), [favoriteIds, displayServices]);
  const recentRecords = useMemo(() => recentIds.map((id) => displayServices.find((record: any) => record.id === id)).filter(Boolean), [recentIds, displayServices]);

  const workSummary = useMemo(() => {
    const openRecords = displayServices.filter(isActiveWorkRecord);

    return {
      open: openRecords.length,
      dueToday: openRecords.filter(
        (record: any) => dayDistance(String(record.date || "")) === 0,
      ).length,
      overdue: openRecords.filter(
        (record: any) =>
          Boolean(record.date) && dayDistance(String(record.date)) < 0,
      ).length,
      completedToday: displayServices.filter(wasCompletedToday).length,
    };
  }, [displayServices]);

  function setQuickDateFilter(value: string) {
    setDueDateFilter((current) => (current === value ? "All" : value));
  }

  const tabCounts = useMemo(() => {
    const result: Record<string, number> = {};
    sections.forEach((section) => {
      result[section.id] = displayServices.filter((record: any) => {
        if (section.kind === "my-work") return isActiveWorkRecord(record);
        if (section.kind === "completed") return isClosedWorkStatus(record.status);
        return (
          isActiveWorkRecord(record) && itemType(record) === section.kind
        );
      }).length;
    });
    return result;
  }, [filteredServices, sections]);

  const controlStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 42,
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    background: "#FFFFFF",
    padding: "9px 12px",
    font: "inherit",
    fontSize: 14,
    color: colors.text,
    outline: "none",
  };

  const filterPanelStyle: React.CSSProperties = {
    display: "grid",
    gap: 12,
    padding: 14,
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    background: "#F8FAFC",
    boxShadow: "0 8px 24px rgba(15,42,67,.05)",
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

  async function quickReschedule(record: any) {
    const value = window.prompt(
      "New due date (YYYY-MM-DD)",
      String(record.date || ""),
    );
    if (value === null) return false;
    const nextDate = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      window.alert("Enter the date as YYYY-MM-DD.");
      return false;
    }
    return Boolean(await updateWorkOrderRecord(record, { date: nextDate, status: "Scheduled" }));
  }

  async function quickConvert(record: any) {
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
    await updateWorkOrderRecord(record, {
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
    setPendingTemplate(null);
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
      recurrenceDays:
        workType === "Preventive Maintenance" ? [...DEFAULT_WORK_WEEK] : [],
    });
    setNewWorkOpen(true);
  }

  async function createNewWork() {
    const title = newWorkTitleRef.current?.value.trim() || "";
    if (!title) {
      window.alert("Add a title before creating this work item.");
      return;
    }

    const created = await addWorkOrder({
      title,
      workType: newWorkDraft.workType,
      workCategory: newWorkDraft.workCategory,
      priority: newWorkDraft.priority,
      date:
        newWorkDraft.workType === "Preventive Maintenance"
          ? alignDateToSelectedDay(newWorkDraft.date, newWorkDraft.recurrenceDays)
          : newWorkDraft.date,
      effort: newWorkDraft.workType === "Quick Task" ? "15 minutes" : "30 minutes",
      status: "Open",
      recurring: newWorkDraft.workType === "Preventive Maintenance",
      recurrenceInterval: pendingTemplate?.recurrenceInterval || 1,
      recurrenceUnit: pendingTemplate?.recurrenceUnit || "Weeks",
      recurrenceDays:
        newWorkDraft.workType === "Preventive Maintenance"
          ? newWorkDraft.recurrenceDays
          : [],
      preferredDay: pendingTemplate?.preferredDay || "Any",
      completionWindowDays: pendingTemplate?.completionWindowDays ?? 2,
      routineFlexibility: pendingTemplate?.flexibility || "Flexible",
      assignedTo: pendingTemplate?.defaultAssignee || "",
      backupAssignee: pendingTemplate?.backupAssignee || "",
      seasonalMonths: pendingTemplate?.seasonalMonths || [],
      canReassign: true,
      checklist: (pendingTemplate?.checklist || []).map((text) => ({ id: uid("check"), text, completed: false })),
    } as any);
    if (!created) return;
    setDetailOpen(true);
    setNewWorkOpen(false);
    setPendingTemplate(null);
  }

  function safeSelectChange(
    event: React.ChangeEvent<HTMLSelectElement>,
    patch: Record<string, unknown>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    updateWorkOrder(patch);
  }

  function handleWorkOption(value: string) {
    if (value === "add-work") openNewWork("Work Order");
    if (value === "quick-task") quickTask();
    if (value === "plan") setPlanOpen((current) => !current);
    if (value === "routine-planner") setRoutinePlannerOpen((current) => !current);
    if (value === "sections")
      setManageSectionsOpen((current) => !current);
    if (value === "categories")
      setManageCategoriesOpen((current) => !current);
    if (value.startsWith("template:")) openTemplate(value.replace("template:", ""));
  }

  async function completeSelectedWork() {
    if (!selectedService) return;
    await completeWorkOrder(selectedService, {
      completionNote: completionNoteDraft.trim(),
    });
    setCompletionNoteDraft("");
  }

  async function handleDetailAction(value: string) {
    if (!value || !selectedService) return;
    if (value === "reopen") {
      await reopenWorkOrder(selectedService);
      return;
    }
    if (value === "start") {
      await updateWorkOrderRecord(selectedService, { status: "In Progress" });
      return;
    }
    if (value === "complete") {
      await completeSelectedWork();
      return;
    }
    if (value === "reschedule") {
      await quickReschedule(selectedService);
      return;
    }
    if (value === "convert") {
      await quickConvert(selectedService);
      return;
    }
    if (value === "tomorrow") {
      await updateWorkOrderRecord(selectedService, { date: tomorrowDate(), status: "Scheduled" });
      return;
    }
    if (value === "next-week") {
      await updateWorkOrderRecord(selectedService, { date: nextWeekDate(), status: "Scheduled" });
      return;
    }
    if (value === "edit-series") {
      setWorkEditorOpen(true);
      return;
    }
    if (value === "stop-series") {
      const stopDate = String(selectedService.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      if (window.confirm(`Stop future occurrences of “${selectedService.title || "this work"}” after ${formatDate(stopDate)}?`)) {
        await updateWorkOrderRecord(selectedService, { recurrenceEndDate: stopDate });
      }
      return;
    }
    if (value === "not-needed") {
      const occurrenceDate = selectedService.date || "";
      const next = recurrencePreviewDates(selectedService, 1)[0];
      if (next) {
        await updateWorkOrderRecord(selectedService, {
          date: next,
          status: "Scheduled",
          lastSkippedAt: new Date().toISOString(),
          notesHistory: [
            {
              id: uid("note"),
              text: `Not needed${occurrenceDate ? ` for ${formatDate(occurrenceDate)}` : ""}.`,
              createdAt: new Date().toISOString(),
            },
            ...(selectedService.notesHistory || []),
          ],
        });
      }
      return;
    }
    if (value === "didnt-get-to") {
      const occurrenceDate = String(selectedService.date || "");
      const next = selectedService.recurring
        ? recurrencePreviewDates(selectedService, 1)[0]
        : nextWeekDate();
      const noteText = `Didn't get to this week${occurrenceDate ? ` — was due ${formatDate(occurrenceDate)}` : ""}.`;
      await updateWorkOrderRecord(selectedService, {
        ...(next ? { date: next } : {}),
        status: "Scheduled",
        lastSkippedAt: new Date().toISOString(),
        notesHistory: [
          { id: uid("note"), text: noteText, createdAt: new Date().toISOString() },
          ...(selectedService.notesHistory || []),
        ],
      });
      return;
    }
    if (value === "photo") {
      quickAddPhoto(selectedService);
      return;
    }
    if (value === "duplicate") {
      duplicateWork(selectedService);
      return;
    }
    if (value === "delete") {
      await deleteWorkOrderRecord(selectedService);
    }
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
    void addWorkOrder({
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
      .filter(isActiveWorkRecord)
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

  async function addHistoryNote() {
    const text = newHistoryNote.trim();
    if (!text || !selectedService) return;
    const notesHistory = [
      { id: uid("note"), text, createdAt: new Date().toISOString() },
      ...(selectedService.notesHistory || []),
    ];
    await updateWorkOrderRecord(selectedService, { notesHistory });
    setNewHistoryNote("");
  }

  async function reopenCompletionSnapshot(entry: any) {
    if (!selectedService) return;
    const completionDate = String(entry?.completedAt || "").slice(0, 10);
    const remainingHistory = (selectedService.serviceHistory || []).filter((item: any) => item.id !== entry.id);
    const remainingCompletionHistory = (selectedService.completionHistory || []).filter((date: string) => String(date).slice(0, 10) !== completionDate);
    const previousCompletionDates = remainingHistory
      .map((item: any) => String(item?.completedAt || "").slice(0, 10))
      .filter(Boolean)
      .sort();
    const previousCompletedDate = previousCompletionDates.length
      ? previousCompletionDates[previousCompletionDates.length - 1]
      : "";
    await updateWorkOrderRecord(selectedService, {
      status: entry?.statusBefore && entry.statusBefore !== "Completed" ? entry.statusBefore : "Open",
      date: String(entry?.dueDate || selectedService.date || ""),
      completedAt: "",
      lastCompletedDate: previousCompletedDate,
      completionHistory: remainingCompletionHistory,
      serviceHistory: remainingHistory,
      checklist: Array.isArray(entry?.checklist) ? entry.checklist : selectedService.checklist || [],
      notes: typeof entry?.notes === "string" ? entry.notes : selectedService.notes || "",
      notesHistory: Array.isArray(entry?.notesHistory) ? entry.notesHistory : selectedService.notesHistory || [],
      photos: Array.isArray(entry?.photos) ? entry.photos : selectedService.photos || [],
      documents: Array.isArray(entry?.documents) ? entry.documents : selectedService.documents || [],
    });
  }

  function workStatusColor(status: string) {
    if (status === "Completed") return colors.green;
    if (status === "Cancelled") return colors.red;
    if (status === "In Progress") return "#175CD3";
    if (status === "Waiting" || status === "Monitor") return "#B54708";
    if (status === "Scheduled") return "#6941C6";
    return colors.text;
  }

  function linkedLocationName(record: any) {
    const id = String(record.locationId || record.subLocationId || "");
    return locationRecords.find((location: any) => location.id === id)?.name || "";
  }

  function renderWorkRow(record: any) {
    const category = categoryLabel(record);
    const location = linkedLocationName(record);
    const asset = record.assetId ? assetName(record.assetId) : "";
    const overdue =
      isActiveWorkRecord(record) &&
      Boolean(record.date) &&
      dayDistance(String(record.date)) < 0;
    const selected = record.id === selectedService.id;
    const status = String(record.status || "Open");
    const place = location || asset;

    const openRecord = () => {
      setNewWorkOpen(false);
      setDetailOpen(true);
      setSelectedServiceId(record.id);
    };
    const assignee = canonicalAssigneeName(record.assignedTo);
    const noteCount = String(record.notes || "").trim() ? 1 : 0;
    const photoCount = Array.isArray(record.photos) ? record.photos.length : 0;

    return (
      <div key={record.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "auto minmax(0,1fr)" : "auto minmax(220px,1fr) minmax(150px,.48fr) 142px auto", gap: 8, alignItems: "center", padding: isMobile ? "10px 9px" : "8px 10px", border: `1px solid ${selected ? colors.gold : colors.line}`, borderLeft: overdue ? `3px solid ${colors.red}` : selected ? `3px solid ${colors.gold}` : `3px solid transparent`, borderRadius: 10, background: selected ? "#FFF9EB" : "#FFFFFF" }}>
        <input type="checkbox" checked={status === "Completed"} disabled={isClosedWorkStatus(status)} aria-label={`Complete ${record.title || "work"}`} onChange={() => void completeWorkOrder(record)} />
        <button type="button" onClick={openRecord} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", minWidth: 0, cursor: "pointer" }}>
          <strong style={{ display: "block", minWidth: 0, color: colors.text, fontSize: 13.5, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis" }}>{record.title || "Untitled Work"}</strong>
          <span style={{ display: "block", marginTop: 2, color: colors.muted, fontSize: 10.5, lineHeight: 1.3 }}>{[isMobile && assignee ? assignee : "", isMobile && record.date ? formatDate(String(record.date)) : "", category ? categoryDisplayLabel(category) : "", place, record.priority === "High" ? "High priority" : "", noteCount ? "Notes" : "", photoCount ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}</span>
        </button>
        {!isMobile ? <><select value={assignee} onChange={(event) => void updateWorkOrderRecord(record, { assignedTo: event.currentTarget.value })} aria-label={`Assign ${record.title || "work"}`} style={{ ...controlStyle, minHeight: 34, padding: "5px 7px", fontSize: 11 }}>
          <option value="">Unassigned</option>
          {assignmentChoices.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <input type="date" onClick={(event) => event.currentTarget.showPicker?.()} onFocus={(event) => event.currentTarget.showPicker?.()} onKeyDown={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} value={String(record.date || "").slice(0, 10)} onChange={(event) => void updateWorkOrderRecord(record, { date: event.currentTarget.value })} aria-label={`Due date for ${record.title || "work"}`} style={{ ...controlStyle, minHeight: 34, padding: "5px 7px", fontSize: 11, color: overdue ? colors.red : colors.text }} />
        <button type="button" onClick={openRecord} style={{ ...miniButtonStyle, minHeight: 34, padding: "5px 8px", fontSize: 11 }}>Details</button></> : null}
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
        label: "Recurring",
        records: myWorkGroups.maintenance,
      },
      { id: "projects", label: "📋 Projects", records: myWorkGroups.projects },
    ];
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {groupDefinitions
          .filter((group) => group.records.length > 0)
          .map((group) => (
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
              </div>
            ) : null}
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      {photoChooserOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add work order photos"
          onClick={(event) => {
            if (event.currentTarget === event.target) setPhotoChooserOpen(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 280, display: "grid", placeItems: "center", padding: 18, background: "rgba(7,27,47,.68)" }}
        >
          <div style={{ width: "min(100%,420px)", borderRadius: 16, background: "#FFFFFF", padding: 16, boxShadow: "0 24px 70px rgba(0,0,0,.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <strong style={{ color: colors.navy, fontSize: 18 }}>Add Photos</strong>
              <button type="button" onClick={() => setPhotoChooserOpen(false)} aria-label="Close photo choices" style={{ ...secondaryButtonStyle, width: 40, minWidth: 40, height: 40, padding: 0, borderRadius: 999, fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
              <label style={{ ...goldButtonStyle, display: "inline-flex", justifyContent: "center", alignItems: "center", cursor: "pointer", minHeight: 46 }}>
                Take Photo
                <input type="file" accept="image/*" capture="environment" onChange={async (event) => { await addPhotos(event.currentTarget.files); event.currentTarget.value = ""; setPhotoChooserOpen(false); }} style={{ display: "none" }} />
              </label>
              <label style={{ ...secondaryButtonStyle, display: "inline-flex", justifyContent: "center", alignItems: "center", cursor: "pointer", minHeight: 46 }}>
                Choose from Library
                <input type="file" accept="image/*" multiple onChange={async (event) => { await addPhotos(event.currentTarget.files); event.currentTarget.value = ""; setPhotoChooserOpen(false); }} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        </div>
      ) : null}
      <ListDrawerLayout
        eyebrow="Work"
        title="Work"
        detail=""
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
                  gridTemplateColumns: "minmax(330px, 36%) minmax(0, 64%)",
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
                  padding: "max(12px, env(safe-area-inset-top)) 12px max(18px, env(safe-area-inset-bottom))",
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
              aria-label="Work options"
            >
              <option value="">More</option>
              <option value="plan">Plan My Day</option>
              <option value="categories">Manage Categories</option>
              <optgroup label="New from Template">
                {WORK_TEMPLATES.map((template) => (
                  <option key={template.id} value={`template:${template.id}`}>{template.label}</option>
                ))}
              </optgroup>
            </select>
            <button
              type="button"
              onClick={() => openNewWork("Work Order")}
              style={{ ...goldButtonStyle, minHeight: 38 }}
            >
              + Add Work
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
                    autoFocus
                    style={controlStyle}
                  />
                  <select
                    value={newWorkDraft.workType}
                    onChange={(event) =>
                      setNewWorkDraft((current) => ({
                        ...current,
                        workType: event.currentTarget.value as WorkItemType,
                        recurrenceDays:
                          event.currentTarget.value === "Preventive Maintenance"
                            ? current.recurrenceDays.length
                              ? current.recurrenceDays
                              : [...DEFAULT_WORK_WEEK]
                            : current.recurrenceDays,
                      }))
                    }
                    style={controlStyle}
                  >
                    <option value="Quick Task">Task</option>
                    <option value="Work Order">Work Order</option>
                    <option value="Preventive Maintenance">Recurring</option>
                    <option value="Project">Project</option>
                  </select>
                  {newWorkDraft.workType === "Preventive Maintenance" ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={fieldLabelStyle}>Run on</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5 }}>
                        {WEEKDAY_OPTIONS.map((day) => {
                          const checked = newWorkDraft.recurrenceDays.includes(day.value);
                          return (
                            <label key={day.value} style={{ display: "grid", justifyItems: "center", gap: 3, padding: "6px 2px", border: `1px solid ${checked ? colors.gold : colors.line}`, borderRadius: 8, background: checked ? "#FFF8E6" : "#FFFFFF", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>
                              <input type="checkbox" checked={checked} onChange={(event) => setNewWorkDraft((current) => { const nextDays = event.currentTarget.checked ? Array.from(new Set([...current.recurrenceDays, day.value])) : current.recurrenceDays.filter((value) => value !== day.value); return { ...current, recurrenceDays: nextDays.length ? nextDays : current.recurrenceDays }; })} />
                              {day.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
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
                    type="date" onClick={(event) => event.currentTarget.showPicker?.()} onFocus={(event) => event.currentTarget.showPicker?.()} onKeyDown={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()}
                    value={newWorkDraft.date}
                    onChange={(event) =>
                      setNewWorkDraft((current) => ({
                        ...current,
                        date:
                          current.workType === "Preventive Maintenance"
                            ? alignDateToSelectedDay(
                                event.currentTarget.value,
                                current.recurrenceDays,
                              )
                            : event.currentTarget.value,
                      }))
                    }
                    style={controlStyle}
                  />
                  <button
                    type="button"
                    onClick={() => void createNewWork()}
                    style={goldButtonStyle}
                  >
                    Create Work
                  </button>
                </div>
              </section>
            ) : null}

            {routinePlannerOpen ? (
              <section style={{ ...filterPanelStyle, background: "#FFFFFF" }}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Recurring Work Planner 2.0</div>
                    <strong>Build the estate maintenance rhythm</strong>
                    <div style={mutedSmallStyle}>Create flexible weekly, monthly, daily, and seasonal routines. Assign each routine now and adjust it later.</div>
                  </div>
                  <button type="button" onClick={() => setRoutinePlannerOpen(false)} style={secondaryButtonStyle}>Close</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
                  {WORK_TEMPLATES.map((template) => (
                    <button key={template.id} type="button" onClick={() => openTemplate(template.id)} style={{ ...rowButtonStyle, textAlign: "left", display: "grid", gap: 5, alignContent: "start" }}>
                      <strong>{template.label}</strong>
                      <span style={mutedSmallStyle}>{template.recurring ? `Every ${template.recurrenceInterval || 1} ${template.recurrenceUnit || "Weeks"}` : "One-time"} · {template.effort}</span>
                      <span style={mutedSmallStyle}>{template.preferredDay || "Any day"} · {template.flexibility || "Flexible"}{template.defaultAssignee ? ` · ${template.defaultAssignee}` : ""}</span>
                    </button>
                  ))}
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

            {favoriteRecords.length ? (
              <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {[{ label: "Pinned", records: favoriteRecords.slice(0, 4) }].map((group) => (
                  <div key={group.label} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 10, background: "#FFFFFF" }}>
                    <div style={{ ...eyebrowStyle, opacity: 0.8 }}>{group.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                      {group.records.map((record: any) => (
                        <button key={record.id} type="button" onClick={() => { setNewWorkOpen(false); setDetailOpen(true); setSelectedServiceId(record.id); }} style={{ ...miniButtonStyle, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{record.title || "Untitled Work"}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            

            <div style={{ display: "grid", gap: 7 }}>
              <input
                type="search"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.currentTarget.value)}
                aria-label="Search work"
                placeholder="Search work..."
                style={{
                  ...controlStyle,
                  width: "100%",
                  minHeight: 38,
                  padding: "7px 10px",
                  border: "1px solid #0B2A44",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "inset 0 0 0 1px rgba(11, 42, 68, 0.08)",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <button type="button" onClick={() => setShowFilters((current) => !current)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 34, padding: "6px 10px" }}>
                  {showFilters ? "Hide Filters" : activeFilterCount ? `Filters · ${activeFilterCount}` : "Filters"}
                </button>
                {activeFilterCount ? <button type="button" onClick={clearFilters} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 34, padding: "6px 9px", fontWeight: 500 }}>Clear</button> : null}
              </div>

              {(showFilters || activeFilterCount > 0) ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <details style={{ position: "relative" }}>
                  <summary style={{ ...controlStyle, width: "auto", minWidth: 145, minHeight: 34, padding: "6px 10px", cursor: "pointer", listStyle: "none", fontSize: 12, fontWeight: 800 }}>
                    {assignedFilters.length ? `Assigned · ${assignedFilters.length}` : "Everyone"}
                  </summary>
                  <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 5px)", left: 0, width: 220, maxHeight: 300, overflowY: "auto", display: "grid", gap: 6, padding: 10, border: `1px solid ${colors.line}`, borderRadius: 11, background: "#FFFFFF", boxShadow: "0 14px 34px rgba(15,42,67,.18)" }}>
                    <button type="button" onClick={() => setAssignedFilters([])} style={{ ...miniButtonStyle, width: "100%" }}>Everyone</button>
                    {[{ value: "__none__", label: "Unassigned" }, ...assignmentChoices.map((name) => ({ value: name, label: name }))].map((option) => <label key={option.value} style={{ display: "flex", alignItems: "center", gap: 8, color: colors.text, fontSize: 12, fontWeight: 750 }}><input type="checkbox" checked={assignedFilters.includes(option.value)} onChange={(event) => setAssignedFilters((current) => event.currentTarget.checked ? [...current, option.value] : current.filter((value) => value !== option.value))}/>{option.label}</label>)}
                  </div>
                </details>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.currentTarget.value)}
                  style={{ ...controlStyle, width: "auto", minWidth: 105, minHeight: 34 }}
                  aria-label="Work status"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="All">All Statuses</option>
                </select>

                <select
                  value={dueDateFilter}
                  onChange={(event) => setDueDateFilter(event.currentTarget.value)}
                  style={{ ...controlStyle, width: "auto", minWidth: 110, minHeight: 34 }}
                  aria-label="Due date"
                >
                  <option value="All">Due Date</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Today">Today</option>
                  <option value="Next 7 Days">Next 7 Days</option>
                  <option value="This Month">This Month</option>
                  <option value="Next Month">Next Month</option>
                  <option value="No Due Date">No Due Date</option>
                </select>

                <select
                  value={locationFilter}
                  onChange={(event) => {
                    setLocationFilter(event.currentTarget.value);
                    setSubLocationFilter("All");
                  }}
                  style={{ ...controlStyle, width: "auto", minWidth: 115, minHeight: 34 }}
                  aria-label="Location"
                >
                  <option value="All">Location</option>
                  <option value="None">No Location</option>
                  {topLevelLocations.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.currentTarget.value)}
                  style={{ ...controlStyle, width: "auto", minWidth: 105, minHeight: 34 }}
                  aria-label="Priority"
                >
                  <option value="All">Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.currentTarget.value)}
                  style={{ ...controlStyle, width: "auto", minWidth: 115, minHeight: 34 }}
                  aria-label="Category"
                >
                  <option value="All">Category</option>
                  {categories
                    .filter((category) => category !== "All")
                    .map((category) => (
                      <option key={category} value={category}>
                        {categoryDisplayLabel(category)}
                      </option>
                    ))}
                </select>

                <select
                  value={activeSectionId}
                  onChange={(event) => setActiveSectionId(event.currentTarget.value)}
                  style={{ ...controlStyle, width: "auto", minWidth: 115, minHeight: 34 }}
                  aria-label="Work view"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label === "Preventive Maintenance"
                        ? "Recurring"
                        : section.label}
                    </option>
                  ))}
                </select>

              </div>
              ) : null}
            </div>

            {manageSectionsOpen ? (
              <section style={{ ...filterPanelStyle, background: "#FFFFFF" }}>
                {sections.map((section) => (
                  <div key={section.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span>{section.label === "Preventive Maintenance" ? "Recurring" : section.label}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => renameSection(section)} style={miniButtonStyle}>Rename</button>
                      <button type="button" onClick={() => deleteSection(section)} style={{ ...dangerButtonStyle, padding: "7px 10px" }}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={resetSections} style={secondaryButtonStyle}>Restore</button>
              </section>
            ) : null}

            {manageCategoriesOpen ? (
              <section style={{ ...filterPanelStyle, background: "#FFFFFF" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newCategory} onChange={(event) => setNewCategory(event.currentTarget.value)} style={controlStyle} />
                  <button type="button" onClick={addCategory} style={{ ...secondaryButtonStyle, width: "auto" }}>Add</button>
                </div>
                {categoryChoices.map((category) => (
                  <div key={category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span>{categoryDisplayLabel(category)}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => renameCategory(category)} style={miniButtonStyle}>Rename</button>
                      <button type="button" onClick={() => removeCategory(category)} style={{ ...dangerButtonStyle, padding: "7px 10px" }}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={restoreDefaultCategories} style={secondaryButtonStyle}>Restore</button>
              </section>
            ) : null}

            <div style={{ ...listStyle, display: "grid", gap: 6 }}>
              {sortWorkRecords(visibleRecords).map(renderWorkRow)}
              {!visibleRecords.length ? (
                <div style={noticeStyle}>No work matches these filters.</div>
              ) : null}
            </div>
            {recentRecords.length ? <details style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 8 }}>
              <summary style={{ cursor: "pointer", color: colors.muted, fontSize: 11, fontWeight: 800 }}>Recently Viewed · {recentRecords.length}</summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>{recentRecords.slice(0, 6).map((record: any) => <button key={`recent-bottom-${record.id}`} type="button" onClick={() => { setNewWorkOpen(false); setDetailOpen(true); setSelectedServiceId(record.id); }} style={{ ...miniButtonStyle, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{record.title || "Untitled Work"}</button>)}</div>
            </details> : null}
          </div>
        }
        drawer={
          detailOpen && selectedService.id ? (
            <div style={{ ...stackStyle, gap: 12 }}>
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
                  aria-label="Back to work"
                >
                  {SYMBOL.back} Work
                </button>
                {isMobile ? (
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
                    aria-label="Close work details"
                    title="Close"
                  >
                    {SYMBOL.close}
                  </button>
                ) : null}
                </span>
              </div>
              <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 16, borderRadius: 16 }}>
                {!workEditorOpen ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        padding: isMobile ? 14 : 18,
                        borderRadius: 16,
                        border: `1px solid ${colors.line}`,
                        background: "linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)",
                        boxShadow: "0 12px 30px rgba(15,42,67,.07)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                            <span style={{ ...badgeStyle(selectedService.status || "Open"), fontWeight: 800 }}>
                              {selectedService.status || "Open"}
                            </span>
                            {selectedService.priority && selectedService.priority !== "Medium" ? (
                              <span style={badgeStyle(selectedService.priority)}>{selectedService.priority}</span>
                            ) : null}
                            {selectedService.recurring ? <span style={recurringBadgeStyle}>Recurring</span> : null}
                          </div>
                          <h2 style={{ margin: "10px 0 0", color: colors.text, fontSize: isMobile ? 23 : 29, lineHeight: 1.14, letterSpacing: "-.02em" }}>
                            {selectedService.title || "Untitled Work"}
                          </h2>
                          {selectedService.notes ? (
                            <p style={{ margin: "9px 0 0", color: colors.muted, fontSize: 14, lineHeight: 1.55, maxWidth: 760 }}>{selectedService.notes}</p>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {!isClosedWorkStatus(selectedService.status) ? (
                            <button type="button" onClick={() => handleDetailAction("complete")} style={{ ...goldButtonStyle, width: "auto", minHeight: 36, padding: "8px 13px" }}>
                              Complete
                            </button>
                          ) : null}
                          <select value="" onChange={(event) => { void handleDetailAction(event.currentTarget.value); event.currentTarget.value = ""; }} style={{ ...controlStyle, width: "auto", minWidth: 128, minHeight: 36, color: colors.text, fontSize: 12, fontWeight: 700, background: "#FFFFFF" }} aria-label="Work order actions">
                            <option value="">Actions</option>
                            {isClosedWorkStatus(selectedService.status) ? <option value="reopen">Reopen</option> : <><option value="reschedule">{selectedService.recurring ? "Reschedule This Time" : "Reschedule"}</option><option value="didnt-get-to">Didn't Get To This Week</option>{selectedService.recurring ? <><option value="not-needed">Not Needed This Time</option><option value="edit-series">Edit Series</option><option value="stop-series">Stop Series</option></> : null}<option value="complete">{selectedService.recurring ? "Complete & Advance" : "Complete"}</option></>}
                            <option value="delete">Delete</option>
                          </select>
                          <button type="button" onClick={() => setWorkEditorOpen(true)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 36, padding: "8px 12px" }}>
                            Edit
                          </button>
                        </div>
                      </div>

                      {(selectedService.date || selectedService.locationId || selectedService.assetId || selectedService.assignedTo) ? (
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                          {selectedService.date ? (
                            <div style={{ padding: 11, borderRadius: 12, background: "#FFFFFF", border: `1px solid ${colors.line}` }}>
                              <span style={fieldLabelStyle}>{selectedService.recurring ? "Next due" : "Due"}</span>
                              <div style={{ marginTop: 4, fontWeight: 800, color: dayDistance(String(selectedService.date)) < 0 ? colors.red : colors.text }}>{formatDate(selectedService.date)}</div>
                            </div>
                          ) : null}
                          {selectedService.locationId ? (
                            <div style={{ padding: 11, borderRadius: 12, background: "#FFFFFF", border: `1px solid ${colors.line}` }}>
                              <span style={fieldLabelStyle}>Location</span>
                              <div style={{ marginTop: 4, fontWeight: 800 }}>{locationRecords.find((location: any) => location.id === selectedService.locationId)?.name || selectedService.locationId}</div>
                            </div>
                          ) : null}
                          {selectedService.assetId ? (
                            <div style={{ padding: 11, borderRadius: 12, background: "#FFFFFF", border: `1px solid ${colors.line}` }}>
                              <span style={fieldLabelStyle}>Asset</span>
                              <div style={{ marginTop: 4, fontWeight: 800 }}>{assetRecords.find((asset: any) => asset.id === selectedService.assetId)?.name || selectedService.assetId}</div>
                            </div>
                          ) : null}
                          {selectedService.assignedTo ? (
                            <div style={{ padding: 11, borderRadius: 12, background: "#FFFFFF", border: `1px solid ${colors.line}` }}>
                              <span style={fieldLabelStyle}>Assigned</span>
                              <div style={{ marginTop: 4, fontWeight: 800 }}>{canonicalAssigneeName(selectedService.assignedTo)}</div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <details style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: "11px 13px", background: "#FFFFFF" }}>
                      <summary style={{ cursor: "pointer", color: colors.text, fontSize: 13, fontWeight: 800 }}>Additional details</summary>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
                        <div><span style={fieldLabelStyle}>Type</span><div style={{ marginTop: 4, fontWeight: 700 }}>{itemType(selectedService) === "Preventive Maintenance" ? "Recurring" : itemType(selectedService)}</div></div>
                        {selectedService.vendorId ? <div><span style={fieldLabelStyle}>Vendor</span><div style={{ marginTop: 4, fontWeight: 700 }}>{vendorRecords.find((vendor: any) => vendor.id === selectedService.vendorId)?.name || selectedService.vendorId}</div></div> : null}
                        {categoryLabel(selectedService) ? <div><span style={fieldLabelStyle}>Category</span><div style={{ marginTop: 4, fontWeight: 700 }}>{categoryDisplayLabel(categoryLabel(selectedService))}</div></div> : null}
                        {selectedService.effort ? <div><span style={fieldLabelStyle}>Estimated time</span><div style={{ marginTop: 4, fontWeight: 700 }}>{selectedService.effort}</div></div> : null}
                        {selectedService.subLocation ? <div><span style={fieldLabelStyle}>Sub-location</span><div style={{ marginTop: 4, fontWeight: 700 }}>{selectedService.subLocation}</div></div> : null}
                        {selectedService.recurring ? <div><span style={fieldLabelStyle}>Schedule</span><div style={{ marginTop: 4, fontWeight: 700 }}>{recurrenceLabel(selectedService)}</div></div> : null}
                      </div>
                    </details>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={eyebrowStyle}>Edit Work</div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" onClick={async () => { await saveWorkOrderRecord(); setWorkEditorOpen(false); }} style={{ ...goldButtonStyle, width: "auto", minHeight: 32, padding: "6px 9px" }}>Save</button><button type="button" onClick={() => void deleteWorkOrderRecord(selectedService)} style={{ ...dangerButtonStyle, width: "auto", minHeight: 32, padding: "6px 9px" }}>Delete</button><select value="" onChange={(event) => { void handleDetailAction(event.currentTarget.value); event.currentTarget.value = ""; }} style={{ ...controlStyle, width: "auto", minWidth: 120, minHeight: 32, color: colors.text, fontSize: 12, fontWeight: 700, background: "#FFFFFF" }} aria-label="Work order actions"><option value="">Actions</option>{isClosedWorkStatus(selectedService.status) ? <option value="reopen">Reopen</option> : <><option value="reschedule">{selectedService.recurring ? "Reschedule This Time" : "Reschedule"}</option><option value="didnt-get-to">Didn't Get To This Week</option>{selectedService.recurring ? <><option value="not-needed">Not Needed This Time</option><option value="edit-series">Edit Series</option><option value="stop-series">Stop Series</option></> : null}<option value="complete">{selectedService.recurring ? "Complete & Advance" : "Complete"}</option></>}<option value="delete">Delete</option></select><button type="button" onClick={() => setWorkEditorOpen(false)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 32, padding: "6px 9px" }}>Cancel</button></div>
                    </div>
                    <input value={selectedService.title || ""} onChange={(event) => updateWorkOrder({ title: event.currentTarget.value })} style={{ ...inputStyle, fontSize: 20, fontWeight: 800 }} />
                    <label style={{ display: "grid", gap: 5 }}>
                      <span style={fieldLabelStyle}>What to do</span>
                      <textarea value={selectedService.notes || ""} onChange={(event) => updateWorkOrder({ notes: event.currentTarget.value })} rows={3} style={{ ...inputStyle, minHeight: 78, resize: "vertical" }} />
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 9 }}>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>{selectedService.recurring ? "Next Due" : "Due Date"}</span><input type="date" onClick={(event) => event.currentTarget.showPicker?.()} onFocus={(event) => event.currentTarget.showPicker?.()} onKeyDown={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} value={String(selectedService.date || "")} onChange={(event) => { const selectedDays = normalizedRecurrenceDays((selectedService as any).recurrenceDays); updateWorkOrder({ date: selectedService.recurring && selectedDays.length ? alignDateToSelectedDay(event.currentTarget.value, selectedDays) : event.currentTarget.value }); }} style={inputStyle} /></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Assigned To</span><select value={canonicalAssigneeName(selectedService.assignedTo)} onChange={(event) => safeSelectChange(event, { assignedTo: event.currentTarget.value })} style={inputStyle}><option value="">Unassigned</option>{assignmentChoices.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Status</span><select value={selectedService.status || "Open"} onChange={(event) => safeSelectChange(event, { status: event.currentTarget.value })} style={inputStyle}><option value="Open">Open</option><option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option><option value="Waiting">Waiting</option><option value="Monitor">Monitor</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Priority</span><select value={selectedService.priority || "Medium"} onChange={(event) => safeSelectChange(event, { priority: event.currentTarget.value })} style={inputStyle}><option value="High">High</option><option value="Medium">Normal</option><option value="Low">Low</option></select></label>
                    </div>
                    <details style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: "10px 12px", background: "#FFFFFF" }}>
                      <summary style={{ cursor: "pointer", color: colors.text, fontSize: 13, fontWeight: 800 }}>More details</summary>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 9, marginTop: 10 }}>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Estimated Time</span><select value={selectedService.effort || ""} onChange={(event) => updateWorkOrder({ effort: event.currentTarget.value || undefined })} style={inputStyle}><option value="">No estimate</option>{["5 minutes","15 minutes","30 minutes","1 hour","Half Day","Full Day","Multi-Day"].map((effort) => <option key={effort} value={effort}>{effort}</option>)}</select></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Type</span><select value={itemType(selectedService)} onChange={(event) => { const workType = event.currentTarget.value as WorkItemType; const recurrenceDays = normalizedRecurrenceDays((selectedService as any).recurrenceDays); safeSelectChange(event, { workType, recurring: workType === "Preventive Maintenance" ? true : selectedService.recurring, ...(workType === "Preventive Maintenance" && !recurrenceDays.length ? { recurrenceDays: [...DEFAULT_WORK_WEEK], recurrenceInterval: 1, recurrenceUnit: "Weeks" } : {}) }); }} style={inputStyle}><option value="Quick Task">Task</option><option value="Work Order">Work Order</option><option value="Preventive Maintenance">Recurring</option><option value="Project">Project</option></select></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Asset</span><select value={selectedService.assetId || ""} onChange={(event) => updateWorkOrder(assetPhotoPatch(event.currentTarget.value))} style={inputStyle}><option value="">No asset</option>{byName(assetRecords).map((asset: any) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Location</span><select value={selectedService.locationId || ""} onChange={(event) => safeSelectChange(event, { locationId: event.currentTarget.value })} style={inputStyle}><option value="">No location</option>{byName(locationRecords).map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Sub-Location</span><input value={selectedService.subLocation || ""} onChange={(event) => updateWorkOrder({ subLocation: event.currentTarget.value })} style={inputStyle} /></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Category</span><select value={categoryLabel(selectedService)} onChange={(event) => { const value = event.currentTarget.value; safeSelectChange(event, { workCategory: value, category: value, emoji: categoryEmoji(value) }); }} style={inputStyle}>{categories.filter((category) => category !== "All").map((category) => <option key={category} value={category}>{categoryDisplayLabel(category)}</option>)}</select></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Vendor</span><select value={selectedService.vendorId || ""} onChange={(event) => safeSelectChange(event, { vendorId: event.currentTarget.value })} style={inputStyle}><option value="">No vendor</option>{byName(vendorRecords).map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                        <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Linked Project</span><select value={selectedService.projectId || ""} onChange={(event) => safeSelectChange(event, { projectId: event.currentTarget.value })} style={inputStyle}><option value="">No project</option>{projectRecords.filter((project: any) => !project.archived || project.id === selectedService.projectId).map((project: any) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
                      </div>
                    </details>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 9 }}>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Assigned People</span><select value="" onChange={(event) => { const id = event.currentTarget.value; if (!id) return; updateWorkOrder({ assignedPersonIds: Array.from(new Set([...(selectedService.assignedPersonIds || []), id])) }); event.currentTarget.value = ""; }} style={inputStyle}><option value="">Add a person…</option>{byName(contactRecords).filter((contact: any) => !(selectedService.assignedPersonIds || []).includes(contact.id)).map((contact: any) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select>{(selectedService.assignedPersonIds || []).length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{(selectedService.assignedPersonIds || []).map((id: string) => <button key={id} type="button" onClick={() => updateWorkOrder({ assignedPersonIds: (selectedService.assignedPersonIds || []).filter((value: string) => value !== id) })} style={{ ...miniButtonStyle, width: "auto" }}>{contactRecords.find((contact: any) => contact.id === id)?.name || "Unknown"} ×</button>)}</div> : null}</label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Assigned Vendors</span><select value="" onChange={(event) => { const id = event.currentTarget.value; if (!id) return; const ids = Array.from(new Set([...(selectedService.assignedVendorIds || []), id])); updateWorkOrder({ assignedVendorIds: ids, vendorId: ids[0] || "" }); event.currentTarget.value = ""; }} style={inputStyle}><option value="">Add a vendor…</option>{byName(vendorRecords).filter((vendor: any) => !(selectedService.assignedVendorIds || []).includes(vendor.id)).map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>{(selectedService.assignedVendorIds || []).length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{(selectedService.assignedVendorIds || []).map((id: string) => <button key={id} type="button" onClick={() => { const ids = (selectedService.assignedVendorIds || []).filter((value: string) => value !== id); updateWorkOrder({ assignedVendorIds: ids, vendorId: ids[0] || "" }); }} style={{ ...miniButtonStyle, width: "auto" }}>{vendorRecords.find((vendor: any) => vendor.id === id)?.name || "Unknown"} ×</button>)}</div> : null}</label>
                    </div>
                  </div>
                )}
              </section>

              {workEditorOpen || (selectedService.photos || []).length ? <details style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}>Photos ({(selectedService.photos || []).length})</summary>
                <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={(event) => void addPhotos(event.currentTarget.files)} style={{ display: "none" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                  <label style={{ ...secondaryButtonStyle, width: "auto", cursor: "pointer" }}>Take Photo<input type="file" accept="image/*" capture="environment" onChange={async (event) => { await addPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
                  <button type="button" onClick={() => photoInputRef.current?.click()} style={{ ...secondaryButtonStyle, width: "auto" }}>Choose from Library</button>
                </div>
                {photoMessage ? <p style={mutedSmallStyle}>{photoMessage}</p> : null}
                {(selectedService.photos || []).length ? (() => {
                  const photos = selectedService.photos || [];
                  const safeIndex = Math.min(selectedPhotoIndex, Math.max(0, photos.length - 1));
                  const photo = photos[safeIndex] as PhotoLike;
                  const source = photoSource(photo);
                  return (
                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      <div style={{ position: "relative", minHeight: isMobile ? 220 : 320, border: `1px solid ${colors.line}`, borderRadius: 12, overflow: "hidden", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {source ? <img src={source} alt={photo.name || "Work photo"} style={{ width: "100%", height: "100%", maxHeight: 460, objectFit: "contain" }} /> : <span style={mutedSmallStyle}>Photo unavailable</span>}
                        {photos.length > 1 ? <>
                          <button type="button" onClick={() => setSelectedPhotoIndex((safeIndex - 1 + photos.length) % photos.length)} aria-label="Previous photo" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 999, border: `1px solid ${colors.line}`, background: "rgba(255,255,255,.94)", fontSize: 24, cursor: "pointer" }}>‹</button>
                          <button type="button" onClick={() => setSelectedPhotoIndex((safeIndex + 1) % photos.length)} aria-label="Next photo" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 999, border: `1px solid ${colors.line}`, background: "rgba(255,255,255,.94)", fontSize: 24, cursor: "pointer" }}>›</button>
                          <span style={{ position: "absolute", left: "50%", bottom: 9, transform: "translateX(-50%)", background: "rgba(7,23,47,.78)", color: "white", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 800 }}>{safeIndex + 1} / {photos.length}</span>
                        </> : null}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <a href={source || undefined} target="_blank" rel="noreferrer" style={{ color: colors.text, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{photo.name || "Work photo"}</a>
                        <button type="button" onClick={() => { removePhoto(photo.id); setSelectedPhotoIndex(0); }} style={{ border: 0, background: "transparent", color: colors.muted, cursor: "pointer", fontSize: 12 }}>Remove</button>
                      </div>
                    </div>
                  );
                })() : null}
              </details> : null}

              <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>Work notes</strong>
                  <span style={mutedSmallStyle}>{(selectedService.notesHistory || []).length} saved</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto", gap: 7, marginTop: 8 }}>
                  <input
                    value={newHistoryNote}
                    onChange={(event) => setNewHistoryNote(event.currentTarget.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void addHistoryNote(); }}
                    placeholder="Add a note — e.g. Didn't get to this week"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => void addHistoryNote()} style={{ ...secondaryButtonStyle, width: "auto" }}>Add Note</button>
                </div>
                {(selectedService.notesHistory || []).length ? (
                  <div style={{ display: "grid", gap: 6, marginTop: 9 }}>
                    {(selectedService.notesHistory || []).slice(0, 8).map((note: any) => (
                      <div key={note.id} style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 7 }}>
                        <div style={{ fontSize: 12.5, color: colors.text }}>{note.text}</div>
                        <div style={{ ...mutedSmallStyle, marginTop: 2 }}>{note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              {(selectedService.serviceHistory || []).length ? <details style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}>History ({(selectedService.serviceHistory || []).length})</summary>
                {(selectedService.serviceHistory || []).length ? (
                  <div style={{ display: "grid", gap: 0, marginTop: 8 }}>
                    {(selectedService.serviceHistory || []).map((entry: any) => (
                      <div key={entry.id} style={{ padding: "9px 0", borderBottom: `1px solid ${colors.line}`, display: "grid", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setWorkEditorOpen(true)}
                          style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", color: colors.text }}
                        >
                          <strong style={{ display: "block", fontSize: 13 }}>Completed {new Date(entry.completedAt).toLocaleDateString()}</strong>
                          <span style={mutedSmallStyle}>{(entry.checklist || []).filter((item: any) => item.completed).length}/{(entry.checklist || []).length} steps · {(entry.photos || []).length} photos · Click to review/edit</span>
                          {entry.notes ? <p style={{ margin: "5px 0 0", fontSize: 12 }}>{entry.notes}</p> : null}
                        </button>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => void reopenCompletionSnapshot(entry)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "5px 8px", fontSize: 11.5 }}>Reopen This Completion</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </details> : null}

              {!isClosedWorkStatus(selectedService.status) ? (
                <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14, background: "#FFFDF7", borderColor: "#E7D39E" }}>
                  <div style={{ display: "grid", gap: 7 }}>
                    <div>
                      <div style={eyebrowStyle}>What was done</div>
                    </div>
                    <textarea
                      value={completionNoteDraft}
                      onChange={(event) => setCompletionNoteDraft(event.currentTarget.value)}
                      placeholder="What was done?"
                      rows={2}
                      style={{ ...inputStyle, minHeight: 62, resize: "vertical" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => void completeSelectedWork()} style={{ ...goldButtonStyle, width: "auto" }}>
                        {selectedService.recurring ? "Complete & Advance" : "Complete"}
                      </button>
                    </div>
                    
                  </div>
                </section>
              ) : null}

              {selectedService.procedureId ? (
                <details style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}>
                    Procedure{(selectedService.checklist || []).length ? ` · ${(selectedService.checklist || []).filter((item: ChecklistItem) => item.completed).length}/${(selectedService.checklist || []).length}` : ""}
                  </summary>
                  {(selectedService.checklist || []).length ? (
                    <div style={{ display: "grid", gap: 5, marginTop: 9 }}>
                      {(selectedService.checklist || []).map((item: ChecklistItem, index: number) => (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "center", gap: 9, padding: "8px 9px", borderBottom: `1px solid ${colors.line}` }}>
                          <input type="checkbox" checked={Boolean(item.completed)} onChange={() => toggleChecklistItem(item.id)} aria-label={`Complete step ${index + 1}`} />
                          <span style={{ color: item.completed ? colors.muted : colors.text, textDecoration: item.completed ? "line-through" : "none", fontSize: 13 }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ ...mutedSmallStyle, marginTop: 9 }}>Attached procedure has no checklist steps.</div>
                  )}
                </details>
              ) : null}

              {workEditorOpen && selectedService.recurring ? <section style={{ ...detailSectionStyle, padding: 10, background: "#F8FAFC" }}>
                {workEditorOpen && selectedService.recurring ? (
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

                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Stop Repeating After</span>
                      <input
                        type="date" onClick={(event) => event.currentTarget.showPicker?.()} onFocus={(event) => event.currentTarget.showPicker?.()} onKeyDown={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()}
                        value={selectedService.recurrenceEndDate || ""}
                        onChange={(event) => updateWorkOrder({ recurrenceEndDate: event.currentTarget.value })}
                        style={inputStyle}
                      />
                    </label>
                    <div style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                      <span style={fieldLabelStyle}>Run on</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5 }}>
                        {WEEKDAY_OPTIONS.map((day) => {
                          const selectedDays = normalizedRecurrenceDays((selectedService as any).recurrenceDays);
                          const checked = selectedDays.includes(day.value);
                          return (
                            <label key={day.value} style={{ display: "grid", justifyItems: "center", gap: 3, padding: "6px 2px", border: `1px solid ${checked ? colors.gold : colors.line}`, borderRadius: 8, background: checked ? "#FFF8E6" : "#FFFFFF", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const nextDays = event.currentTarget.checked
                                    ? Array.from(new Set([...selectedDays, day.value]))
                                    : selectedDays.filter((value) => value !== day.value);
                                  if (!nextDays.length) return;
                                  updateWorkOrder({
                                    recurrenceDays: nextDays,
                                    recurrenceInterval: 1,
                                    recurrenceUnit: "Weeks",
                                    date: alignDateToSelectedDay(String(selectedService.date || ""), nextDays),
                                  });
                                }}
                              />
                              {day.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    
                    
                    
                    <label style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1", fontWeight: 700 }}>
                      <input type="checkbox" checked={selectedService.canReassign !== false} onChange={(event) => updateWorkOrder({ canReassign: event.currentTarget.checked })} /> Allow this occurrence to be reassigned
                    </label>
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        border: `1px solid ${colors.line}`,
                        borderRadius: 10,
                        background: "#F8FAFC",
                        padding: 10,
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 5 }}>
                        Upcoming schedule
                      </strong>
                      <div style={mutedSmallStyle}>
                        {selectedService.date
                          ? `Current due date: ${formatDate(selectedService.date)}`
                          : "Add a next-due date to start this schedule."}
                      </div>
                      {recurrencePreviewDates(selectedService).length ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {recurrencePreviewDates(selectedService).map(
                            (date) => (
                              <span key={date} style={recurringBadgeStyle}>
                                {formatDate(date)}
                              </span>
                            ),
                          )}
                        </div>
                      ) : selectedService.date ? (
                        <div style={{ ...mutedSmallStyle, marginTop: 6 }}>
                          No later occurrence falls before the stop date.
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveWorkOrderRecord()}
                      style={{
                        ...goldButtonStyle,
                        gridColumn: "1 / -1",
                        width: "100%",
                      }}
                    >
                      Save Recurring Schedule
                    </button>
                  </div>
                ) : null}
              </section> : null}

              {isRecordDirty("work_orders", selectedService.id) ? (
                <div style={{ position: "sticky", bottom: 0, zIndex: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${colors.gold}`, borderRadius: 12, background: "rgba(255,255,255,.97)", boxShadow: "0 -6px 20px rgba(15,42,67,.12)" }}>
                  <span style={{ ...mutedSmallStyle, fontWeight: 800 }}>Unsaved changes</span>
                  <button type="button" onClick={() => void saveWorkOrderRecord()} style={{ ...goldButtonStyle, width: "auto", minHeight: 38 }}>Save Work</button>
                </div>
              ) : null}

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
