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
    label: "Recurring",
    kind: "Preventive Maintenance",
  },
  { id: "projects", label: "Projects", kind: "Project" },
];

const SECTION_STORAGE_KEY = "atlas-work-section-settings-v1";
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

const WORK_TEMPLATES: WorkTemplate[] = [
  { id: "dog-daily", label: "Dog Area Cleanup", title: "Clean Dog Area", workType: "Preventive Maintenance", workCategory: "🧹 Cleaning", priority: "High", effort: "15 minutes", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Days", preferredDay: "Any", completionWindowDays: 0, flexibility: "Fixed", defaultAssignee: "Addison", checklist: ["Remove waste and debris", "Rinse or treat problem spots", "Check turf condition", "Restock cleanup supplies"] },
  { id: "goose-daily", label: "Goose Cleanup", title: "Goose Cleanup and Property Check", workType: "Preventive Maintenance", workCategory: "🧹 Cleaning", priority: "High", effort: "15 minutes", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Days", preferredDay: "Any", completionWindowDays: 0, flexibility: "Fixed", defaultAssignee: "Addison", checklist: ["Check dock and shoreline", "Remove droppings", "Rinse affected surfaces", "Note heavy activity areas"] },
  { id: "pots-seasonal", label: "Water and Check Pots", title: "Water and Check Pots", workType: "Preventive Maintenance", workCategory: "🌳 Landscaping", priority: "High", effort: "30 minutes", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Days", preferredDay: "Any", completionWindowDays: 0, flexibility: "Fixed", defaultAssignee: "Addison", seasonalMonths: [4,5,6,7,8,9,10], checklist: ["Check soil moisture", "Water dry pots", "Deadhead and clean debris", "Report stressed plants"] },
  { id: "mow-weekly", label: "Mow Lawns", title: "Mow Lawns", workType: "Preventive Maintenance", workCategory: "🌳 Landscaping", priority: "High", effort: "Half Day", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Tuesday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Pat's Crew", checklist: ["Mow all scheduled lawn areas", "Vary mowing direction", "Check for irrigation damage", "Remove visible clippings"] },
  { id: "edge-blow", label: "Edge and Blow", title: "Edge and Blow Grounds", workType: "Preventive Maintenance", workCategory: "🌳 Landscaping", priority: "Medium", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Tuesday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Pat's Crew", checklist: ["Edge lawn borders", "Blow walks and patios", "Clear driveway and courtyard", "Clean around dock approach"] },
  { id: "weekly-pool", label: "Pool and Spa Weekly Service", title: "Pool and Spa Weekly Service", workType: "Preventive Maintenance", workCategory: "🚿 Pool & Spa", priority: "High", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Wednesday", completionWindowDays: 1, flexibility: "Flexible", defaultAssignee: "Nick", checklist: ["Test and balance pool water", "Check spa water and temperature", "Inspect pump, filter, and baskets", "Clean waterline and surrounding area", "Record readings and observations"] },
  { id: "fountain-clean", label: "Fountain Cleaning", title: "Clean Fountain", workType: "Preventive Maintenance", workCategory: "🔧 Maintenance", priority: "Medium", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Wednesday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Addison", checklist: ["Remove debris", "Clean basin and surfaces", "Inspect pump and flow", "Treat water if needed"] },
  { id: "dock-clean", label: "Clean Dock", title: "Clean Dock", workType: "Preventive Maintenance", workCategory: "🚤 Dock & Marine", priority: "Medium", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Thursday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Addison", checklist: ["Remove debris and goose waste", "Rinse decking", "Clean seating and accessories", "Inspect bumpers, cleats, and lines"] },
  { id: "boat-clean", label: "Clean Cobalt Boat", title: "Clean Cobalt Boat", workType: "Preventive Maintenance", workCategory: "🚤 Dock & Marine", priority: "Medium", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Thursday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Addison", seasonalMonths: [4,5,6,7,8,9,10], checklist: ["Rinse exterior", "Clean upholstery and flooring", "Wipe dash and glass", "Empty trash and organize storage", "Check for damage or low supplies"] },
  { id: "seadoo-clean", label: "Clean Sea-Doo", title: "Clean Sea-Doo", workType: "Preventive Maintenance", workCategory: "🚤 Dock & Marine", priority: "Medium", effort: "30 minutes", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Thursday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Addison", seasonalMonths: [4,5,6,7,8,9,10], checklist: ["Rinse hull and deck", "Clean seat and storage", "Check fuel and visible damage", "Inspect lift position and cover"] },
  { id: "cars-clean", label: "Clean Cars", title: "Clean Estate Vehicles", workType: "Preventive Maintenance", workCategory: "🚗 Vehicles", priority: "Medium", effort: "Half Day", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Thursday", completionWindowDays: 2, flexibility: "Anytime This Week", defaultAssignee: "Addison", checklist: ["Wash exteriors", "Vacuum interiors", "Clean glass", "Remove trash", "Check fuel, tires, and warning lights"] },
  { id: "windows-rotation", label: "Window Cleaning Rotation", title: "Clean Scheduled Window Section", workType: "Preventive Maintenance", workCategory: "🏠 House", priority: "Low", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Friday", completionWindowDays: 4, flexibility: "Anytime This Week", defaultAssignee: "Addison", checklist: ["Confirm this week's window section", "Clean interior glass", "Clean accessible exterior glass", "Wipe frames and sills", "Record completed area"] },
  { id: "irrigation-weekly", label: "Irrigation Walkthrough", title: "Weekly Irrigation Walkthrough", workType: "Preventive Maintenance", workCategory: "💧 Irrigation", priority: "High", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Tuesday", completionWindowDays: 3, flexibility: "Anytime This Week", defaultAssignee: "Nick", checklist: ["Run or observe priority zones", "Check dry spots and puddling", "Inspect damaged or blocked heads", "Review Hydrawise alerts", "Create repair work orders as needed"] },
  { id: "final-walkthrough", label: "Friday Final Walkthrough", title: "Friday Property Walkthrough and Weekly Closeout", workType: "Preventive Maintenance", workCategory: "✅ Inspection", priority: "High", effort: "1 hour", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Weeks", preferredDay: "Friday", completionWindowDays: 0, flexibility: "Fixed", defaultAssignee: "Nick", checklist: ["Walk house exterior and grounds", "Check pool, spa, fountain, dock, and vehicles", "Confirm assigned work was completed", "Capture follow-up items", "Prepare next-week priorities"] },
  { id: "boiler-inspection", label: "Monthly Boiler Inspection", title: "Monthly Boiler Inspection", workType: "Preventive Maintenance", workCategory: "❄️ HVAC", priority: "High", effort: "30 minutes", recurring: true, recurrenceInterval: 1, recurrenceUnit: "Months", preferredDay: "Wednesday", completionWindowDays: 7, flexibility: "Flexible", defaultAssignee: "Nick", checklist: ["Check operating status", "Inspect pressure and temperature", "Check for leaks or faults", "Record readings"] },
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
  const start = parseDate(String(record.date || ""));
  if (!start || !record.recurring) return [];

  const interval = Math.max(
    1,
    Math.floor(Number(record.recurrenceInterval || 1)),
  );
  const unit = String(record.recurrenceUnit || "Weeks");
  const endKey = dateKey(String(record.recurrenceEndDate || ""));
  const dates: string[] = [];
  let cursor = new Date(start);

  for (let index = 0; index < count; index += 1) {
    if (unit === "Days") cursor.setDate(cursor.getDate() + interval);
    else if (unit === "Months")
      cursor.setMonth(cursor.getMonth() + interval);
    else if (unit === "Years")
      cursor.setFullYear(cursor.getFullYear() + interval);
    else cursor.setDate(cursor.getDate() + interval * 7);

    const nextKey = [
      cursor.getFullYear(),
      String(cursor.getMonth() + 1).padStart(2, "0"),
      String(cursor.getDate()).padStart(2, "0"),
    ].join("-");

    if (endKey && nextKey > endKey) break;
    dates.push(nextKey);
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
  const [subLocationFilter, setSubLocationFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    setStatusFilter("All");
    setDueDateFilter("All");
    setLocationFilter("All");
    setSubLocationFilter("All");
    setAssetFilter("All");
    setAssignedFilter("All");
  }

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
    const matchesAssigned =
      assignedFilter === "All" ||
      (assignedFilter === "None" && !String(record.assignedTo || "")) ||
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
      matchesSubLocation &&
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
    subLocationFilter,
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

  const activeFilterCount = [
    categoryFilter,
    typeFilter,
    statusFilter,
    dueDateFilter,
    locationFilter,
    subLocationFilter,
    assetFilter,
    assignedFilter,
  ].filter((value) => value !== "All").length + (localSearch.trim() ? 1 : 0);


  const recordQuality = useMemo(() => {
    const open = filteredServices.filter((record: any) => String(record.status || "") !== "Completed");
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
  }, [filteredServices]);

  const favoriteRecords = useMemo(() => favoriteIds.map((id) => filteredServices.find((record: any) => record.id === id)).filter(Boolean), [favoriteIds, filteredServices]);
  const recentRecords = useMemo(() => recentIds.map((id) => filteredServices.find((record: any) => record.id === id)).filter(Boolean), [recentIds, filteredServices]);

  const workSummary = useMemo(() => {
    const openRecords = filteredServices.filter(
      (record: any) => String(record.status || "") !== "Completed",
    );

    return {
      open: openRecords.length,
      dueToday: openRecords.filter(
        (record: any) => dayDistance(String(record.date || "")) === 0,
      ).length,
      overdue: openRecords.filter(
        (record: any) =>
          Boolean(record.date) && dayDistance(String(record.date)) < 0,
      ).length,
      completedToday: filteredServices.filter(wasCompletedToday).length,
    };
  }, [filteredServices]);

  function setQuickDateFilter(value: string) {
    setDueDateFilter((current) => (current === value ? "All" : value));
  }

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
      recurrenceInterval: pendingTemplate?.recurrenceInterval || 1,
      recurrenceUnit: pendingTemplate?.recurrenceUnit || "Weeks",
      preferredDay: pendingTemplate?.preferredDay || "Any",
      completionWindowDays: pendingTemplate?.completionWindowDays ?? 2,
      routineFlexibility: pendingTemplate?.flexibility || "Flexible",
      assignedTo: pendingTemplate?.defaultAssignee || "",
      backupAssignee: pendingTemplate?.backupAssignee || "",
      seasonalMonths: pendingTemplate?.seasonalMonths || [],
      canReassign: true,
      checklist: (pendingTemplate?.checklist || []).map((text) => ({ id: uid("check"), text, completed: false })),
    } as any);
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
    if (value === "skip-occurrence") {
      const next = recurrencePreviewDates(selectedService, 1)[0];
      if (next) updateWorkOrder({ date: next, status: "Scheduled", lastSkippedAt: new Date().toISOString() });
    }
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
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); toggleFavorite(String(record.id)); }}
              aria-label={favoriteIds.includes(String(record.id)) ? "Unpin work order" : "Pin work order"}
              title={favoriteIds.includes(String(record.id)) ? "Unpin" : "Pin"}
              style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 2 }}
            >
              {favoriteIds.includes(String(record.id)) ? "★" : "☆"}
            </button>
            {recordQuality.duplicateIds.has(String(record.id)) ? <span style={badgeStyle("High")}>Possible Duplicate</span> : null}
            {recordQuality.incomplete.some((item: any) => item.id === record.id) ? <span style={recurringBadgeStyle}>Needs Info</span> : null}
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
      <input
        ref={quickPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => void addPhotos(event.currentTarget.files)}
        style={{ display: "none" }}
      />
      <ListDrawerLayout
        eyebrow="Work"
        title="Work Orders"
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
              <option value="quick-task">New Task</option>
              <option value="plan">Plan My Day</option>
              <option value="sections">Manage Sections</option>
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
                    <option value="Preventive Maintenance">Recurring</option>
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

            {(favoriteRecords.length || recentRecords.length) ? (
              <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {[
                  { label: "Pinned", records: favoriteRecords.slice(0, 4) },
                  { label: "Recently Viewed", records: recentRecords.slice(0, 4) },
                ].filter((group) => group.records.length).map((group) => (
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

            <section
              aria-label="Work order quality"
              style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}
            >
              <button type="button" onClick={() => { setStatusFilter("All"); setDueDateFilter("All"); }} style={{ ...rowButtonStyle, textAlign: "left", display: "grid", gap: 3 }}>
                <strong>{recordQuality.incomplete.length} records need information</strong>
                <span style={mutedSmallStyle}>Missing assignment, due date, asset, or location.</span>
              </button>
              <div style={{ ...rowButtonStyle, display: "grid", gap: 3 }}>
                <strong>{recordQuality.duplicateIds.size} possible duplicates</strong>
                <span style={mutedSmallStyle}>Matching title, asset, and due date.</span>
              </div>
            </section>

            <section
              aria-label="Work order summary"
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: isMobile ? 7 : 8,
              }}
            >
              {[
                { label: "Open", value: workSummary.open },
                { label: "Due Today", value: workSummary.dueToday },
                { label: "Overdue", value: workSummary.overdue },
                {
                  label: "Completed Today",
                  value: workSummary.completedToday,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    minWidth: 0,
                    padding: isMobile ? "9px 10px" : "10px 12px",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 12,
                    background: "#FFFFFF",
                  }}
                >
                  <div
                    style={{
                      color: colors.muted,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      color: colors.text,
                      fontSize: isMobile ? 21 : 24,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </section>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexWrap: "wrap",
                padding: 0,
              }}
            >
              <input
                type="search"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.currentTarget.value)}
                aria-label="Search work orders"
                placeholder="Search work orders..."
                style={{
                  ...controlStyle,
                  flex: "1 1 240px",
                  minWidth: isMobile ? "100%" : 220,
                  minHeight: 38,
                  padding: "7px 10px",
                  border: "1px solid #0B2A44",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "inset 0 0 0 1px rgba(11, 42, 68, 0.08)",
                }}
              />
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                style={{
                  ...secondaryButtonStyle,
                  width: "auto",
                  minHeight: 38,
                  padding: "7px 12px",
                  fontWeight: 500,
                }}
                aria-expanded={filtersOpen}
              >
                Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
              <select
                value={activeSectionId}
                onChange={(event) => setActiveSectionId(event.currentTarget.value)}
                style={{
                  ...controlStyle,
                  width: "auto",
                  minWidth: 126,
                  minHeight: 38,
                  padding: "7px 30px 7px 10px",
                }}
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

            {filtersOpen ? (
              <section
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 10,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 12,
                  background: "#FFFFFF",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <select
                    value={assignedFilter}
                    onChange={(event) => setAssignedFilter(event.currentTarget.value)}
                    style={controlStyle}
                    aria-label="Assigned to"
                  >
                    <option value="All">Assigned To</option>
                    <option value="None">Unassigned</option>
                    {byName(contactRecords).map((contact: any) => (
                      <option key={contact.id || contact.name} value={contact.name}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.currentTarget.value)}
                    style={controlStyle}
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
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.currentTarget.value)}
                    style={controlStyle}
                    aria-label="Status"
                  >
                    <option value="All">Status</option>
                    {["Open", "Scheduled", "In Progress", "Waiting", "Monitor", "Completed"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <select
                    value={dueDateFilter}
                    onChange={(event) => setDueDateFilter(event.currentTarget.value)}
                    style={controlStyle}
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
                    style={controlStyle}
                    aria-label="Location"
                  >
                    <option value="All">Location</option>
                    <option value="None">No Location</option>
                    {topLevelLocations.map((location: any) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                  <select
                    value={subLocationFilter}
                    onChange={(event) => setSubLocationFilter(event.currentTarget.value)}
                    style={controlStyle}
                    aria-label="Sub-location"
                    disabled={!subLocations.length}
                  >
                    <option value="All">Sub-Location</option>
                    {subLocations.map((location: any) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                  <select
                    value={assetFilter}
                    onChange={(event) => setAssetFilter(event.currentTarget.value)}
                    style={controlStyle}
                    aria-label="Asset"
                  >
                    <option value="All">Asset</option>
                    {byName(assetRecords).map((asset: any) => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.currentTarget.value)}
                    style={controlStyle}
                    aria-label="Work type"
                  >
                    <option value="All">Type</option>
                    <option value="Quick Task">Task</option>
                    <option value="Work Order">Work Order</option>
                    <option value="Preventive Maintenance">Recurring</option>
                    <option value="Project">Project</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={mutedSmallStyle}>
                    {visibleRecords.length} result{visibleRecords.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{ ...secondaryButtonStyle, width: "auto", minHeight: 34, padding: "6px 10px", fontWeight: 500 }}
                  >
                    Clear
                  </button>
                </div>
              </section>
            ) : null}

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
                  {SYMBOL.back} Work Orders
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
                    aria-label="Close work order details"
                    title="Close"
                  >
                    {SYMBOL.close}
                  </button>
                ) : null}
                </span>
              </div>
              <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 15 }}>
                {!workEditorOpen ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={eyebrowStyle}>Work Order</div>
                        <h2 style={{ margin: "4px 0 7px", color: colors.text, fontSize: isMobile ? 22 : 27, lineHeight: 1.18 }}>
                          {selectedService.title || "Untitled Work Order"}
                        </h2>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                        {selectedService.status !== "Completed" ? (
                          <button type="button" onClick={() => handleDetailAction("complete")} style={{ ...goldButtonStyle, width: "auto", minHeight: 34, padding: "7px 11px" }}>
                            Done
                          </button>
                        ) : null}
                        <button type="button" onClick={() => setWorkEditorOpen(true)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 34, padding: "7px 10px" }}>
                          Edit
                        </button>
                      </div>
                    </div>

                    {selectedService.notes ? (
                      <p style={{ margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.5 }}>{selectedService.notes}</p>
                    ) : null}

                    {selectedService.date || selectedService.locationId ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 28, paddingTop: 2 }}>
                        {selectedService.date ? <div><span style={fieldLabelStyle}>{selectedService.recurring ? "Next Due" : "Due"}</span><div style={{ marginTop: 3, fontWeight: 800 }}>{formatDate(selectedService.date)}</div></div> : null}
                        {selectedService.locationId ? <div><span style={fieldLabelStyle}>Location</span><div style={{ marginTop: 3, fontWeight: 800 }}>{locationRecords.find((location: any) => location.id === selectedService.locationId)?.name || selectedService.locationId}</div></div> : null}
                      </div>
                    ) : null}

                    <details style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 9 }}>
                      <summary style={{ cursor: "pointer", color: colors.muted, fontSize: 12, fontWeight: 800 }}>More details</summary>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
                        <div><span style={fieldLabelStyle}>Status</span><div style={{ marginTop: 3, fontWeight: 700 }}>{selectedService.status || "Open"}</div></div>
                        <div><span style={fieldLabelStyle}>Priority</span><div style={{ marginTop: 3, fontWeight: 700 }}>{selectedService.priority === "Medium" ? "Normal" : selectedService.priority || "Normal"}</div></div>
                        <div><span style={fieldLabelStyle}>Type</span><div style={{ marginTop: 3, fontWeight: 700 }}>{itemType(selectedService) === "Preventive Maintenance" ? "Recurring" : itemType(selectedService)}</div></div>
                        {selectedService.assetId ? <div><span style={fieldLabelStyle}>Asset</span><div style={{ marginTop: 3, fontWeight: 700 }}>{assetRecords.find((asset: any) => asset.id === selectedService.assetId)?.name || selectedService.assetId}</div></div> : null}
                        {selectedService.subLocation ? <div><span style={fieldLabelStyle}>Sub-Location</span><div style={{ marginTop: 3, fontWeight: 700 }}>{selectedService.subLocation}</div></div> : null}
                        {selectedService.assignedTo ? <div><span style={fieldLabelStyle}>Assigned</span><div style={{ marginTop: 3, fontWeight: 700 }}>{selectedService.assignedTo}</div></div> : null}
                        {selectedService.vendorId ? <div><span style={fieldLabelStyle}>Vendor</span><div style={{ marginTop: 3, fontWeight: 700 }}>{vendorRecords.find((vendor: any) => vendor.id === selectedService.vendorId)?.name || selectedService.vendorId}</div></div> : null}
                        {categoryLabel(selectedService) ? <div><span style={fieldLabelStyle}>Category</span><div style={{ marginTop: 3, fontWeight: 700 }}>{categoryDisplayLabel(categoryLabel(selectedService))}</div></div> : null}
                        {selectedService.recurring ? <div><span style={fieldLabelStyle}>Repeats</span><div style={{ marginTop: 3, fontWeight: 700 }}>{`Every ${selectedService.recurrenceInterval || 1} ${selectedService.recurrenceUnit || "Weeks"}`}</div></div> : null}
                      </div>
                    </details>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={eyebrowStyle}>Edit Work Order</div>
                      <button type="button" onClick={() => setWorkEditorOpen(false)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 32, padding: "6px 9px" }}>Cancel</button>
                    </div>
                    <input value={selectedService.title || ""} onChange={(event) => updateWorkOrder({ title: event.currentTarget.value })} style={{ ...inputStyle, fontSize: 20, fontWeight: 800 }} />
                    <textarea value={selectedService.notes || ""} onChange={(event) => updateWorkOrder({ notes: event.currentTarget.value })} rows={3} placeholder="Description" style={{ ...inputStyle, minHeight: 78, resize: "vertical" }} />
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 9 }}>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>{selectedService.recurring ? "Next Due" : "Due Date"}</span><input type="date" value={String(selectedService.date || "")} onChange={(event) => updateWorkOrder({ date: event.currentTarget.value })} style={inputStyle} /></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Status</span><select value={selectedService.status || "Open"} onChange={(event) => safeSelectChange(event, { status: event.currentTarget.value })} style={inputStyle}><option value="Open">Open</option><option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option><option value="Waiting">Waiting</option><option value="Monitor">Monitor</option><option value="Completed">Completed</option></select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Priority</span><select value={selectedService.priority || "Medium"} onChange={(event) => safeSelectChange(event, { priority: event.currentTarget.value })} style={inputStyle}><option value="High">High</option><option value="Medium">Normal</option><option value="Low">Low</option></select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Type</span><select value={itemType(selectedService)} onChange={(event) => { const workType = event.currentTarget.value as WorkItemType; safeSelectChange(event, { workType, recurring: workType === "Preventive Maintenance" ? true : selectedService.recurring }); }} style={inputStyle}><option value="Quick Task">Task</option><option value="Work Order">Work Order</option><option value="Preventive Maintenance">Recurring</option><option value="Project">Project</option></select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Asset</span><select value={selectedService.assetId || ""} onChange={(event) => updateWorkOrder(assetPhotoPatch(event.currentTarget.value))} style={inputStyle}><option value="">No asset</option>{byName(assetRecords).map((asset: any) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Location</span><select value={selectedService.locationId || ""} onChange={(event) => safeSelectChange(event, { locationId: event.currentTarget.value })} style={inputStyle}><option value="">No location</option>{byName(locationRecords).map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Sub-Location</span><input value={selectedService.subLocation || ""} onChange={(event) => updateWorkOrder({ subLocation: event.currentTarget.value })} style={inputStyle} /></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Category</span><select value={categoryLabel(selectedService)} onChange={(event) => { const value = event.currentTarget.value; safeSelectChange(event, { workCategory: value, category: value, emoji: categoryEmoji(value) }); }} style={inputStyle}>{categories.filter((category) => category !== "All").map((category) => <option key={category} value={category}>{categoryDisplayLabel(category)}</option>)}</select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Assigned To</span><select value={selectedService.assignedTo || ""} onChange={(event) => safeSelectChange(event, { assignedTo: event.currentTarget.value })} style={inputStyle}><option value="">Unassigned</option>{byName(contactRecords).map((contact: any) => <option key={contact.id || contact.name} value={contact.name}>{contact.name}</option>)}</select></label>
                      <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Vendor</span><select value={selectedService.vendorId || ""} onChange={(event) => safeSelectChange(event, { vendorId: event.currentTarget.value })} style={inputStyle}><option value="">No vendor</option>{byName(vendorRecords).map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={async () => { await saveWorkOrderRecord(); setWorkEditorOpen(false); }} style={{ ...goldButtonStyle, width: "auto" }}>Save</button>
                    </div>
                  </div>
                )}
              </section>

              {workEditorOpen || (selectedService.checklist || []).length ? <section style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
                  <div>
                    <div style={eyebrowStyle}>Procedure</div>
                    <strong>{(selectedService.checklist || []).length ? `${(selectedService.checklist || []).filter((item: ChecklistItem) => item.completed).length} of ${(selectedService.checklist || []).length} complete` : "Add procedure steps"}</strong>
                  </div>
                </div>
                {(selectedService.checklist || []).length ? (
                  <div style={{ display: "grid", gap: 5 }}>
                    {(selectedService.checklist || []).map((item: ChecklistItem, index: number) => (
                      <div key={item.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: 9, padding: "8px 9px", borderBottom: `1px solid ${colors.line}` }}>
                        <input type="checkbox" checked={Boolean(item.completed)} onChange={() => toggleChecklistItem(item.id)} aria-label={`Complete step ${index + 1}`} />
                        <span style={{ color: item.completed ? colors.muted : colors.text, textDecoration: item.completed ? "line-through" : "none", fontSize: 13 }}>{item.text}</span>
                        {workEditorOpen ? <button type="button" onClick={() => deleteChecklistItem(item.id)} style={{ border: 0, background: "transparent", color: colors.muted, cursor: "pointer", padding: 4 }} aria-label={`Remove step ${index + 1}`}>{SYMBOL.close}</button> : <span />}
                      </div>
                    ))}
                  </div>
                ) : null}
                {workEditorOpen ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, marginTop: 9 }}>
                  <input value={newChecklistText} onChange={(event) => setNewChecklistText(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(); } }} placeholder="Add step" style={inputStyle} />
                  <button type="button" onClick={addChecklistItem} style={{ ...secondaryButtonStyle, width: "auto", padding: "7px 10px" }}>Add</button>
                </div> : null}
              </section> : null}

              {workEditorOpen || (selectedService.photos || []).length ? <details style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}>Photos ({(selectedService.photos || []).length})</summary>
                <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={(event) => void addPhotos(event.currentTarget.files)} style={{ display: "none" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button type="button" onClick={() => photoInputRef.current?.click()} style={{ ...secondaryButtonStyle, width: "auto" }}>Add Photos</button></div>
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

              {(selectedService.serviceHistory || []).length ? <details style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}>History ({(selectedService.serviceHistory || []).length})</summary>
                {(selectedService.serviceHistory || []).length ? (
                  <div style={{ display: "grid", gap: 0, marginTop: 8 }}>
                    {(selectedService.serviceHistory || []).map((entry: any) => (
                      <div key={entry.id} style={{ padding: "9px 0", borderBottom: `1px solid ${colors.line}` }}>
                        <strong style={{ display: "block", fontSize: 13 }}>Completed {new Date(entry.completedAt).toLocaleDateString()}</strong>
                        <span style={mutedSmallStyle}>{(entry.checklist || []).filter((item: any) => item.completed).length}/{(entry.checklist || []).length} steps · {(entry.photos || []).length} photos</span>
                        {entry.notes ? <p style={{ margin: "5px 0 0", fontSize: 12 }}>{entry.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </details> : null}

              {workEditorOpen || selectedService.estimatedCost || selectedService.actualCost || selectedService.invoiceNumber || selectedService.internalNotes ? <details style={{ ...detailSectionStyle, padding: isMobile ? 12 : 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}>Cost, Invoice & Notes</summary>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 9, marginTop: 9 }}>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Estimated Cost</span><input type="number" min="0" step="0.01" value={selectedService.estimatedCost || ""} onChange={(event) => updateWorkOrder({ estimatedCost: Number(event.currentTarget.value || 0) })} style={inputStyle} /></label>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Actual Cost</span><input type="number" min="0" step="0.01" value={selectedService.actualCost || ""} onChange={(event) => updateWorkOrder({ actualCost: Number(event.currentTarget.value || 0) })} style={inputStyle} /></label>
                  <label style={{ display: "grid", gap: 5 }}><span style={fieldLabelStyle}>Invoice</span><input value={selectedService.invoiceNumber || ""} onChange={(event) => updateWorkOrder({ invoiceNumber: event.currentTarget.value })} style={inputStyle} /></label>
                </div>
                <textarea value={selectedService.internalNotes || ""} onChange={(event) => updateWorkOrder({ internalNotes: event.currentTarget.value })} rows={3} placeholder="Internal notes" style={{ ...inputStyle, minHeight: 78, resize: "vertical", marginTop: 9 }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button type="button" onClick={() => void saveWorkOrderRecord()} style={{ ...goldButtonStyle, width: "auto" }}>Save</button></div>
              </details> : null}

              <section style={{ ...detailSectionStyle, padding: 10, background: "#F8FAFC" }}>
                <select value="" onChange={(event) => { handleDetailAction(event.currentTarget.value); event.currentTarget.value = ""; }} style={{ ...controlStyle, minHeight: 38, color: colors.muted, fontSize: 13, fontWeight: 500, background: "#FFFFFF" }} aria-label="Work order actions">
                  <option value="">Actions...</option>
                  {selectedService.status === "Completed" ? <option value="reopen">Reopen</option> : <><option value="start">Start</option><option value="complete">{selectedService.recurring ? "Complete & Advance" : "Mark Done"}</option><option value="reschedule">Reschedule</option><option value="tomorrow">Tomorrow</option><option value="next-week">Next Week</option>{selectedService.recurring ? <option value="skip-occurrence">Skip This Occurrence</option> : null}<option value="convert">Convert Type</option></>}
                  <option value="photo">Add Photo</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="delete">Delete</option>
                </select>

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

                    <Field
                      label="Stop Repeating After"
                      value={selectedService.recurrenceEndDate || ""}
                      onChange={(value: string) =>
                        updateWorkOrder({ recurrenceEndDate: value })
                      }
                    />
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Preferred Day</span>
                      <select value={selectedService.preferredDay || "Any"} onChange={(event) => updateWorkOrder({ preferredDay: event.currentTarget.value })} style={inputStyle}>
                        {["Any", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Completion Window</span>
                      <select value={String(selectedService.completionWindowDays ?? 2)} onChange={(event) => updateWorkOrder({ completionWindowDays: Number(event.currentTarget.value) })} style={inputStyle}>
                        <option value="0">Same day</option><option value="1">Within 1 day</option><option value="2">Within 2 days</option><option value="3">Within 3 days</option><option value="7">Anytime this week</option><option value="14">Within 2 weeks</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Scheduling Rule</span>
                      <select value={selectedService.routineFlexibility || "Flexible"} onChange={(event) => updateWorkOrder({ routineFlexibility: event.currentTarget.value })} style={inputStyle}>
                        <option value="Fixed">Fixed date</option><option value="Flexible">Flexible around preferred day</option><option value="Anytime This Week">Anytime this week</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Backup Assignee</span>
                      <select value={selectedService.backupAssignee || ""} onChange={(event) => updateWorkOrder({ backupAssignee: event.currentTarget.value })} style={inputStyle}><option value="">None</option>{byName(contactRecords).map((contact: any) => <option key={contact.id || contact.name} value={contact.name}>{contact.name}</option>)}</select>
                    </label>
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
              </section>

              {isRecordDirty("work_orders", selectedService.id) ? (
                <div style={{ position: "sticky", bottom: 0, zIndex: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${colors.gold}`, borderRadius: 12, background: "rgba(255,255,255,.97)", boxShadow: "0 -6px 20px rgba(15,42,67,.12)" }}>
                  <span style={{ ...mutedSmallStyle, fontWeight: 800 }}>Unsaved changes</span>
                  <button type="button" onClick={() => void saveWorkOrderRecord()} style={{ ...goldButtonStyle, width: "auto", minHeight: 38 }}>Save Work Order</button>
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
