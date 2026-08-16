"use client";

import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { upload } from "@vercel/blob/client";
import AtlasCalendar from "./AtlasCalendar";
import AtlasRoutines from "./AtlasRoutines";
import AtlasTeamWork from "./AtlasTeamWork";
import { AtlasWorkOrders } from "./AtlasWorkOrders";
import AtlasInsightsTimeline from "./AtlasInsightsTimeline";
import ReportsAccessCenter from "./ReportsAccessCenter";
import {
  Field,
  SelectField,
  StatCard,
  AtlasMiniMark,
  SectionHeader,
} from "./AtlasUiPrimitives";

import {
  WORKLINK_LOGOS,
  colors,
  screens,
  logoCandidates,
  storageKeys,
} from "../lib/atlas-page-config";
import type { AtlasScreen } from "../lib/atlas-page-config";
import { searchAtlas } from "../lib/atlas-search";
import AskAtlasWorkspace from "./ai/AskAtlasWorkspace";
import RelationshipPanel from "./ai/RelationshipPanel";
import ActionApprovalCard from "./ai/ActionApprovalCard";
import AskAtlasWeeklyMaintenancePlanner, {
  type WeeklyMaintenancePlanItem,
} from "./ai/AskAtlasWeeklyMaintenancePlanner";
import AtlasIntelligenceRecommendations from "./ai/AtlasIntelligenceRecommendations";
import DocumentIntelligencePanel from "./ai/DocumentIntelligencePanel";
import PhotoIntelligencePanel from "./ai/PhotoIntelligencePanel";
import AtlasGroupedSearchResults from "./ai/AtlasGroupedSearchResults";
import AtlasNotifications from "./AtlasNotifications";
import AtlasPortfolioCenter from "./AtlasPortfolioCenter";
import { findRelatedRecords } from "../lib/ai/relationship-engine";
import {
  planAssistantAction,
  type PendingAssistantAction,
} from "../lib/ai/action-planner";

import type {
  Screen,
  Status,
  ServiceStatus,
  WorkOrderPriority,
  WorkOrderRecurrenceUnit,
  WorkSeason,
  Priority,
  PartStatus,
  UploadedFileRecord,
  LocationRecord,
  MapDetailBox,
  MapLabelRecord,
  VendorRecord,
  ContactRecord,
  AssetRecord,
  ServiceRecord,
  ProcedureRecord,
  RequestStatus,
  OwnerRequestRecord,
  IntakeTargetKind,
  FastIntakeKind,
  FastIntakeSaveMode,
  InboxStatus,
  InboxReviewDraft,
  InboxItemRecord,
  DocumentRecord,
  ManualCategory,
  ManualRecord,
  PartRecord,
  WorkLinkRecord,
  QrKind,
  QrRecord,
  CalendarColorName,
  CalendarRepeat,
  CalendarReminder,
  CalendarLinkType,
  CalendarSource,
  CalendarColor,
  CalendarItem,
  WorkPlanDay,
  WorkPlanTask,
  PhotoRecord,
  WeatherDay,
  AtlasApiPayload,
  AtlasTable,
  SearchResult,
  ManualCandidate,
} from "../lib/atlas-types";

export const closeSymbol = "\u00D7";
export const backArrow = "\u2190";

export type AtlasCurrentUser = {
  id?: string;
  name: string;
  email: string;
  role: "master" | "administrator" | "manager" | "employee" | "vendor" | "viewer";
  propertyIds: string[];
  permissions: Record<string, boolean>;
  accessProfiles: string[];
};

export type AtlasCalendarItem = CalendarItem & {
  propertyId?: string;
  calendarOwner?: string;
  ownerUserId?: string;
};

export type AssistantTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type PhotoTimelineTag = "Unlabeled" | "Before" | "During" | "After" | "Final" | "Problem" | "Repair" | "Inspection";

export const PHOTO_TIMELINE_TAGS: PhotoTimelineTag[] = [
  "Unlabeled",
  "Before",
  "During",
  "After",
  "Final",
  "Problem",
  "Repair",
  "Inspection",
];

export type PhotoTimelineProjectCategory =
  | "Painting"
  | "Landscaping"
  | "Dock"
  | "Pool"
  | "Mechanical"
  | "General";

export type PhotoTimelineMeta = {
  tag: PhotoTimelineTag;
  notes: string;
  projectId?: string;
  photographer?: string;
  vendorId?: string;
  workOrderId?: string;
  documentId?: string;
  procedureId?: string;
  weather?: string;
  timelineNote?: boolean;
  dateTaken?: string;
  locationId?: string;
  milestoneTitle?: string;
  milestoneDate?: string;
  milestoneType?: "Started" | "Inspection" | "Vendor Visit" | "Delivery" | "Progress" | "Completed" | "Custom";
  displayName?: string;
  tags?: string;
  assetIdOverride?: string;
  primaryContext?: "standalone" | "asset" | "project";
};

export type ProjectTimelineEntry = {
  propertyId?: string;
  id: string;
  projectId: string;
  title: string;
  notes: string;
  date: string;
  type: "Note" | "Milestone" | "Vendor Visit" | "Delivery" | "Inspection" | "Decision" | "Completed";
  createdAt: string;
};

export type PhotoTimelineProject = {
  propertyId?: string;
  id: string;
  title: string;
  category: PhotoTimelineProjectCategory;
  scale?: "Quick" | "Standard" | "Major";
  status?: "Planning" | "Active" | "Waiting" | "Completed";
  assetId: string;
  locationId: string;
  vendorId: string;
  workOrderId: string;
  workOrderIds?: string[];
  vendorIds?: string[];
  documentIds?: string[];
  assigneeIds?: string[];
  notes: string;
  coverPhotoId: string;
  createdAt: string;
  progress?: number;
  phase?: string;
  completedAt?: string;
  startDate?: string;
  archived?: boolean;
};

export type WorkItemType =
  "Quick Task" | "Work Order" | "Preventive Maintenance" | "Project";

export type WorkEffort =
  | "5 minutes"
  | "15 minutes"
  | "30 minutes"
  | "1 hour"
  | "Half Day"
  | "Full Day"
  | "Multi-Day";


export type AtlasTaskMeta = {
  status: "Open" | "In Progress" | "Completed" | "Waiting" | "Blocked";
  dueDate: string;
  assignee: "Nick" | "Addison" | "Pat" | "Other" | "Unassigned";
  completedAt?: string;
  createdAt: string;
  projectId?: string;
  projectIds?: string[];
  workOrderId?: string;
  workOrderIds?: string[];
  assetId?: string;
  assetIds?: string[];
  vehicleId?: string;
  vehicleIds?: string[];
  routineTaskId?: string;
  routineDate?: string;
  vendorId?: string;
  vendorIds?: string[];
  procedureId?: string;
  procedureIds?: string[];
  contactId?: string;
  contactIds?: string[];
  locationIds?: string[];
  notes?: string;
  instructions?: string;
  addisonNote?: string;
  problemFlag?: string;
  listId?: string;
  listName?: string;
  listNotes?: string;
  dashboardListPinned?: boolean;
  photos?: UploadedFileRecord[];
  recurrenceInterval?: number;
  recurrenceUnit?: WorkOrderRecurrenceUnit;
  recurrenceEndDate?: string;
  lastCompletedDate?: string;
  completionHistory?: string[];
  season?: WorkSeason;
  weatherDependency?: "None" | "Dry" | "No rain" | "Warm" | "Cool" | "Low wind";
  flexibleTime?: boolean;
  skippable?: boolean;
  updatedAt?: string;
  assignmentScope?: "This occurrence" | "All future occurrences";
  needsReview?: boolean;
};

export type TaskListFilter = "today" | "overdue" | "week" | "recurring" | "completed";

export type AtlasBacklogItem = {
  id: string;
  title: string;
  category: string;
  notes: string;
  createdAt: string;
};

export type AtlasVehicleCare = {
  id: string;
  name: string;
  onsite: boolean;
  lastCleaned: string;
  priority: "Normal" | "High" | "Skip";
  notes: string;
  kind?: "Vehicle" | "Boat" | "Watercraft" | "Equipment";
  locationId?: string;
  assetId?: string;
  assignedTo?: "Nick" | "Addison" | "Other" | "Unassigned";
  cleaningIntervalDays?: number;
  lastServiced?: string;
  nextServiceDate?: string;
  serviceIntervalDays?: number;
  history?: Array<{
    id: string;
    type: "Cleaned" | "Serviced" | "Issue" | "Note";
    date: string;
    notes?: string;
  }>;
  updatedAt?: string;
};

export type AtlasSeasonalItem = {
  id: string;
  title: string;
  season: WorkSeason;
  windowStart: string;
  targetDate: string;
  deadline: string;
  frequency: "Yearly" | "Seasonal" | "One-time";
  assignedTo: "Nick" | "Addison" | "Vendor" | "Unassigned";
  status: "Planned" | "Needs scheduling" | "Scheduled" | "Completed";
  notes: string;
  lastCompletedAt?: string;
  category?: "Vehicles" | "Appliances" | "Irrigation" | "Marine" | "Grounds" | "Arrivals" | "Events" | "Inspections";
  leadDays?: number;
  completionHistory?: string[];
};

export type AtlasDaySession = {
  date: string;
  propertyId: string;
  startedAt?: string;
  endedAt?: string;
  targetHours: number;
  notes: string;
};

export type AtlasOperationsTemplateItem = {
  title: string;
  daysBefore: number;
  minutes: number;
  priority: "Low" | "Medium" | "High";
  category: string;
  addisonReady?: boolean;
  assignedTo?: "Nick" | "Addison" | "Pat" | "Other" | "Unassigned";
};

export type AtlasOperationsTemplate = {
  id: string;
  title: string;
  detail: string;
  category: PhotoTimelineProjectCategory;
  createsProject: boolean;
  items: AtlasOperationsTemplateItem[];
};

export const atlasOperationsTemplates: AtlasOperationsTemplate[] = [
  {
    id: "graduation-party",
    title: "Graduation Party Preparation",
    detail: "Build a focused appearance, readiness, and final-walkthrough plan around the event date.",
    category: "General",
    createsProject: true,
    items: [
      { title: "Confirm party timing, guest areas, and owner priorities", daysBefore: 7, minutes: 30, priority: "High", category: "Planning" },
      { title: "Landscape appearance walkthrough and punch list", daysBefore: 7, minutes: 45, priority: "High", category: "Landscaping", assignedTo: "Pat" },
      { title: "Weed and remove dead leaves from patio and guest-area beds", daysBefore: 5, minutes: 120, priority: "High", category: "Landscaping", assignedTo: "Pat" },
      { title: "Refresh mulch in visible beds and party areas", daysBefore: 4, minutes: 120, priority: "Medium", category: "Landscaping", assignedTo: "Pat" },
      { title: "Mow, edge, and blow lawns and hardscape", daysBefore: 2, minutes: 180, priority: "High", category: "Landscaping", assignedTo: "Pat" },
      { title: "Clean exterior windows in party and guest areas", daysBefore: 3, minutes: 180, priority: "High", category: "Cleanup / Prep", assignedTo: "Nick" },
      { title: "Clean skylights and remove visible debris", daysBefore: 2, minutes: 90, priority: "Medium", category: "Cleanup / Prep", assignedTo: "Nick" },
      { title: "Remove exterior webs around entrances, patios, and gathering areas", daysBefore: 2, minutes: 60, priority: "Medium", category: "Cleanup / Prep", addisonReady: true, assignedTo: "Addison" },
      { title: "Clean outdoor heaters and confirm operation", daysBefore: 2, minutes: 60, priority: "High", category: "Cleanup / Prep", assignedTo: "Nick" },
      { title: "Clean outdoor furniture, cushions, and furniture covers", daysBefore: 2, minutes: 120, priority: "High", category: "Cleanup / Prep", addisonReady: true, assignedTo: "Addison" },
      { title: "Clean sliding-door tracks and verify smooth operation", daysBefore: 1, minutes: 60, priority: "High", category: "Cleanup / Prep", assignedTo: "Nick" },
      { title: "Deep-clean BBQ inside and outside and confirm fuel", daysBefore: 1, minutes: 90, priority: "High", category: "Cleanup / Prep", assignedTo: "Nick" },
      { title: "Clean walkways, staircases, patios, and obvious exterior messes", daysBefore: 1, minutes: 120, priority: "High", category: "Cleanup / Prep", addisonReady: true, assignedTo: "Addison" },
      { title: "Pool, spa, dock, lighting, and restroom readiness check", daysBefore: 1, minutes: 90, priority: "High", category: "Inspection", assignedTo: "Nick" },
      { title: "Help vendors unload and set up party equipment", daysBefore: 0, minutes: 120, priority: "High", category: "Vendor / Event", addisonReady: true, assignedTo: "Addison" },
      { title: "Remove any obvious mess before guests arrive", daysBefore: 0, minutes: 45, priority: "High", category: "Cleanup / Prep", addisonReady: true, assignedTo: "Addison" },
      { title: "Final party walkthrough", daysBefore: 0, minutes: 45, priority: "High", category: "Inspection" },
      { title: "Post-party cleanup, furniture-cover reset, and vendor pickup check", daysBefore: -1, minutes: 180, priority: "Medium", category: "Cleanup / Prep", addisonReady: true, assignedTo: "Addison" },
    ],
  },
  {
    id: "owner-arrival",
    title: "Owner Arrival Readiness",
    detail: "Prepare the property without flooding the dashboard with permanent recurring records.",
    category: "General",
    createsProject: false,
    items: [
      { title: "Owner arrival priorities and schedule review", daysBefore: 3, minutes: 30, priority: "High", category: "Planning" },
      { title: "Grounds, driveway, courtyard, and entrance appearance", daysBefore: 2, minutes: 120, priority: "High", category: "Cleanup / Prep", addisonReady: true },
      { title: "Pool, spa, dock, boats, and recreation readiness", daysBefore: 1, minutes: 90, priority: "High", category: "Inspection" },
      { title: "Vehicles onsite and presentation check", daysBefore: 1, minutes: 60, priority: "Medium", category: "Vehicle Care" },
      { title: "Final property walkthrough before arrival", daysBefore: 0, minutes: 45, priority: "High", category: "Inspection" },
    ],
  },
  {
    id: "winter-prep",
    title: "Winter Preparation",
    detail: "Create a seasonal checklist for vehicles, water systems, waterfront equipment, leaves, and freeze protection.",
    category: "Mechanical",
    createsProject: true,
    items: [
      { title: "Confirm winter tire needs for onsite vehicles", daysBefore: 21, minutes: 30, priority: "Medium", category: "Vehicle Care" },
      { title: "Schedule irrigation and backflow winterization", daysBefore: 21, minutes: 30, priority: "High", category: "Irrigation" },
      { title: "Winterize boat, Sea-Doo, and waterfront equipment", daysBefore: 14, minutes: 180, priority: "High", category: "Boat / Dock" },
      { title: "Gutter, leaf, drain, and walkway cleanup", daysBefore: 7, minutes: 180, priority: "Medium", category: "Cleanup / Prep", addisonReady: true },
      { title: "Freeze-protection and exterior plumbing walkthrough", daysBefore: 3, minutes: 90, priority: "High", category: "Inspection" },
    ],
  },
  {
    id: "spring-opening",
    title: "Spring Opening",
    detail: "Restart irrigation, waterfront equipment, furniture, grounds, and outdoor systems in a controlled sequence.",
    category: "Landscaping",
    createsProject: true,
    items: [
      { title: "Spring grounds and irrigation inspection", daysBefore: 14, minutes: 120, priority: "High", category: "Landscaping" },
      { title: "Schedule irrigation startup and backflow testing", daysBefore: 12, minutes: 30, priority: "High", category: "Irrigation" },
      { title: "Set out and clean outdoor furniture", daysBefore: 7, minutes: 120, priority: "Medium", category: "Cleanup / Prep", addisonReady: true },
      { title: "Open and inspect boat, Sea-Doo, dock, and water equipment", daysBefore: 5, minutes: 180, priority: "High", category: "Boat / Dock" },
      { title: "Final spring readiness walkthrough", daysBefore: 0, minutes: 60, priority: "Medium", category: "Inspection" },
    ],
  },
];

export type PropertyProfile = {
  id: string;
  name: string;
  detail: string;
};

export type AtlasAssetRecord = AssetRecord & {
  locationIds?: string[];
  serial2?: string;
  serialRequirement?: "Required" | "Not Required";
  manualRequirement?: "Required" | "Not Required";
  procedureRequirement?: "Required" | "Not Required";
};

export type LocationCustomDetail = {
  id: string;
  label: string;
  value: string;
};

export type AtlasLocationRecord = LocationRecord & {
  parentId?: string;
  customDetails?: LocationCustomDetail[];
  vendorIds?: string[];
};

export const atlasProperties: PropertyProfile[] = [
  { id: "2000", name: "2000", detail: "Primary estate" },
  { id: "6855", name: "6855", detail: "Sharon & Marty" },
  { id: "3661", name: "3661", detail: "Jordan & Andrea" },
  { id: "hangar", name: "Hangar", detail: "Owner-linked property" },
];

export type WorkChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type WorkNoteEntry = {
  id: string;
  text: string;
  createdAt: string;
};

export type TodayLogEntry = {
  id: string;
  propertyId: string;
  date: string;
  category: "Task" | "Repair" | "Inspection" | "Vendor" | "Delivery" | "Note";
  text: string;
  createdAt: string;
};

export type DashboardRoutineItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
};

export type DashboardWidgetId =
  | "hero"
  | "estate-health"
  | "today-upcoming"
  | "property-status"
  | "routine"
  | "atlas-brief"
  | "recent-activity"
  | "weather";

export type DashboardWidgetSize = "small" | "medium" | "large" | "full";

export type DashboardWidgetSetting = {
  id: DashboardWidgetId;
  visible: boolean;
  collapsed: boolean;
  size: DashboardWidgetSize;
  colSpan?: number;
  rowSpan?: number;
  locked?: boolean;
};

export type DashboardSavedLayout = {
  id: string;
  name: string;
  widgets: DashboardWidgetSetting[];
};

export type DashboardWidgetDropTarget = {
  id: DashboardWidgetId;
  position: "before" | "after";
};

export const dashboardWidgetDefinitions: Record<DashboardWidgetId, { title: string; defaultSize: DashboardWidgetSize }> = {
  hero: { title: "Command Center", defaultSize: "full" },
  "estate-health": { title: "Estate Health", defaultSize: "large" },
  "today-upcoming": { title: "Mission Control", defaultSize: "large" },
  "property-status": { title: "Property Status", defaultSize: "large" },
  routine: { title: "Routine", defaultSize: "medium" },
  "atlas-brief": { title: "Atlas Brief", defaultSize: "medium" },
  "recent-activity": { title: "Recent Activity", defaultSize: "large" },
  weather: { title: "Weather", defaultSize: "full" },
};

export const defaultDashboardWidgetOrder: DashboardWidgetId[] = [
  "hero",
  "atlas-brief",
  "today-upcoming",
  "property-status",
  "recent-activity",
  "weather",
];

export const dashboardDefaultGrid: Record<DashboardWidgetId, { colSpan: number; rowSpan: number }> = {
  hero: { colSpan: 12, rowSpan: 2 },
  "estate-health": { colSpan: 7, rowSpan: 5 },
  "today-upcoming": { colSpan: 7, rowSpan: 6 },
  "property-status": { colSpan: 5, rowSpan: 7 },
  routine: { colSpan: 5, rowSpan: 5 },
  "atlas-brief": { colSpan: 12, rowSpan: 2 },
  "recent-activity": { colSpan: 7, rowSpan: 6 },
  weather: { colSpan: 12, rowSpan: 4 },
};

export function legacySizeColumns(size: DashboardWidgetSize) {
  return size === "small" ? 4 : size === "medium" ? 5 : size === "large" ? 7 : 12;
}

export function makeDashboardWidgets(overrides: Partial<Record<DashboardWidgetId, Partial<DashboardWidgetSetting>>> = {}): DashboardWidgetSetting[] {
  return defaultDashboardWidgetOrder.map((id) => ({
    id,
    visible: true,
    collapsed: false,
    size: dashboardWidgetDefinitions[id].defaultSize,
    colSpan: dashboardDefaultGrid[id].colSpan,
    rowSpan: dashboardDefaultGrid[id].rowSpan,
    locked: false,
    ...overrides[id],
  }));
}

export function makeDailyForemanWidgets(): DashboardWidgetSetting[] {
  const order: DashboardWidgetId[] = ["property-status", "recent-activity", "weather", "hero", "today-upcoming", "atlas-brief"];
  const settings = makeDashboardWidgets({
    hero: { visible: false },
    "today-upcoming": { visible: false },
    "atlas-brief": { visible: false },
    "property-status": { visible: true, size: "full", colSpan: 12 },
    "recent-activity": { visible: true, size: "full", colSpan: 12 },
    weather: { visible: true, size: "full", colSpan: 12 },
  });
  return order.map((id) => settings.find((widget) => widget.id === id)).filter((widget): widget is DashboardWidgetSetting => Boolean(widget));
}

export function normalizeDashboardWidgets(widgets: DashboardWidgetSetting[]): DashboardWidgetSetting[] {
  const withoutStandaloneHealth = widgets.filter((widget) => widget.id !== "estate-health" && widget.id !== "routine");
  const seen = new Set<DashboardWidgetId>();
  const normalized = withoutStandaloneHealth.filter((widget) => {
    if (seen.has(widget.id)) return false;
    seen.add(widget.id);
    return true;
  });
  if (!seen.has("property-status")) {
    normalized.splice(Math.min(2, normalized.length), 0, {
      id: "property-status",
      visible: true,
      collapsed: false,
      size: dashboardWidgetDefinitions["property-status"].defaultSize,
      colSpan: dashboardDefaultGrid["property-status"].colSpan,
      rowSpan: dashboardDefaultGrid["property-status"].rowSpan,
      locked: false,
    });
  }
  return normalized.map((widget) => ({
    ...widget,
    colSpan: Math.max(3, Math.min(12, Number(widget.colSpan || legacySizeColumns(widget.size)))),
    rowSpan: dashboardDefaultGrid[widget.id].rowSpan,
    locked: Boolean(widget.locked),
  }));
}

export const builtInDashboardLayouts: DashboardSavedLayout[] = [
  { id: "daily-foreman", name: "Daily Foreman", widgets: makeDailyForemanWidgets() },
  { id: "operations", name: "Operations", widgets: makeDashboardWidgets() },
  { id: "management", name: "Management", widgets: makeDashboardWidgets({ routine: { visible: false }, weather: { size: "large" }, "property-status": { size: "full" } }) },
  { id: "dock", name: "Dock", widgets: makeDashboardWidgets({ routine: { visible: false }, "atlas-brief": { size: "large" }, "property-status": { size: "full" } }) },
  { id: "landscaping", name: "Landscaping", widgets: makeDashboardWidgets({ "recent-activity": { size: "large" }, weather: { size: "full" }, routine: { size: "large" } }) },
  { id: "winter", name: "Winter", widgets: makeDashboardWidgets({ weather: { size: "large" }, routine: { size: "large" } }) },
  { id: "mobile", name: "Mobile", widgets: makeDashboardWidgets({ hero: { size: "full" }, "today-upcoming": { size: "full" }, "property-status": { size: "full" }, routine: { size: "full" }, "atlas-brief": { size: "full" }, "recent-activity": { size: "full" }, weather: { size: "full" } }) },
];

export function loadDashboardRoutineItems(): DashboardRoutineItem[] {
  if (typeof window === "undefined") return [];

  const results: DashboardRoutineItem[] = [];
  const seen = new Set<string>();
  const textKeys = ["text", "title", "name", "label", "task", "description"];
  const childKeys = ["items", "tasks", "checklist", "steps", "entries", "routineItems"];

  const addItem = (value: Record<string, unknown>, path: string, storageKey: string) => {
    const title = textKeys
      .map((key) => value[key])
      .find((candidate) => typeof candidate === "string" && candidate.trim()) as string | undefined;
    if (!title) return;

    const normalized = title.trim();
    const signature = normalized.toLowerCase();
    if (seen.has(signature)) return;
    seen.add(signature);

    results.push({
      id: String(value.id || value.taskId || value.itemId || `${storageKey}-${path}-${signature}`),
      title: normalized,
      detail: String(value.category || value.area || value.group || value.section || value.frequency || "Routine checklist"),
      time: String(value.time || value.dueTime || ""),
    });
  };

  const walk = (value: unknown, path: string, storageKey: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}-${index}`, storageKey));
      return;
    }
    if (!value || typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    const children = childKeys.flatMap((key) => Array.isArray(record[key]) ? [record[key] as unknown[]] : []);
    if (children.length) {
      children.forEach((child, index) => walk(child, `${path}-children-${index}`, storageKey));
    } else {
      addItem(record, path, storageKey);
    }
  };

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.toLowerCase().includes("routine") || key === dashboardRoutineStorageKeys[0]) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      walk(JSON.parse(raw), "root", key);
    } catch {
      // Ignore unrelated or malformed browser storage entries.
    }
  }

  return results.slice(0, 40);
}

export const todayLogStorageKeys = ["atlas-today-log-v1"];
export const dashboardRoutineStorageKeys = ["atlas-dashboard-routine-completed-v1"];


export const atlasNavigationSections: {
  label: string;
  items: AtlasScreen[];
}[] = [
  { label: "Overview", items: ["dashboard", "portfolio"] },
  {
    label: "Work",
    items: ["history", "calendar", "planner", "routines", "team"],
  },
  { label: "Intake", items: ["inbox", "requests", "qr"] },
  { label: "Reports", items: ["reports"] },
  { label: "Property", items: ["assets", "locations", "timeline", "map"] },
  { label: "People", items: ["vendors", "contacts"] },
  {
    label: "Knowledge",
    items: ["documents", "manuals", "procedures"],
  },
  { label: "Tools", items: ["parts", "links", "assistant"] },
];

export const atlasMoreToolsScreens: AtlasScreen[] = [
  "insights",
  "manuals",
  "procedures",
  "parts",
];

export const atlasPrimaryNavigationSections = atlasNavigationSections
  .map((section) => ({
    ...section,
    items: section.items.filter(
      (screenId) => !atlasMoreToolsScreens.includes(screenId),
    ),
  }))
  .filter((section) => section.items.length > 0);

export type WorkCompletionEntry = {
  id: string;
  completedAt: string;
  statusBefore: string;
  dueDate: string;
  notes: string;
  notesHistory: WorkNoteEntry[];
  checklist: WorkChecklistItem[];
  photos: UploadedFileRecord[];
  documents: UploadedFileRecord[];
  assetId: string;
  vendorId: string;
  procedureId: string;
  locationId: string;
};

export type AtlasServiceRecord = ServiceRecord & {
  workType?: WorkItemType;
  workCategory?: string;
  effort?: WorkEffort;
  responsibilityArea?: string;
  emoji?: string;
  assignedTo?: string;
  assignedPersonIds?: string[];
  assignedVendorIds?: string[];
  projectId?: string;
  locationId?: string;
  checklist?: WorkChecklistItem[];
  notesHistory?: WorkNoteEntry[];
  serviceHistory?: WorkCompletionEntry[];
};

export function localISODate(date = new Date()) {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 10);
}

export function todayISO() {
  return localISODate();
}

export function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeMapDetailBoxes(
  label: Partial<MapLabelRecord>,
): MapDetailBox[] {
  const existing = Array.isArray(label.detailBoxes)
    ? label.detailBoxes
        .map((box) => ({
          id: box.id || uid("mapbox"),
          title: String(box.title || "Tab").trim() || "Tab",
          body: String(box.body || ""),
        }))
        .filter((box) => box.title.trim() || box.body.trim())
    : [];

  if (existing.length) return existing;

  const legacyBoxes = [
    { title: "Notes", body: label.notes || "" },
    { title: "Installer / Vendor", body: label.installer || "" },
    { title: "Paint / Color / Finish", body: label.paintColor || "" },
    { title: "Specs / Materials", body: label.specs || "" },
    { title: "Docs / Links", body: label.documentNotes || "" },
    { title: "Photo Notes", body: label.photoNotes || "" },
    { title: "Maintenance", body: label.maintenanceNotes || "" },
  ].filter((box) => String(box.body || "").trim());

  if (legacyBoxes.length) {
    return legacyBoxes.map((box) => ({
      id: uid("mapbox"),
      title: box.title,
      body: String(box.body || ""),
    }));
  }

  return [{ id: uid("mapbox"), title: "General Notes", body: "" }];
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "record"
  );
}

export function blankCalendarItem(
  date = todayISO(),
  _defaultColorId = "maintenance",
): AtlasCalendarItem {
  return {
    id: "",
    date,
    time: "",
    title: "",
    area: "",
    categoryLabel: "",
    colorId: "",
    colorName: undefined,
    allDay: false,
    repeat: undefined,
    reminder: undefined,
    notes: "",
    linkedType: undefined,
    linkedId: "",
    linkedName: "",
    completed: false,
    source: "manual",
  };
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(99, Math.round(value * 10) / 10));
}

export function formatDate(date: string) {
  if (!date) return "No date";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function monthName(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function shortDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function isStatus(value: unknown): value is Status {
  return (
    value === "Online" ||
    value === "Offline" ||
    value === "Seasonal" ||
    value === "Monitor"
  );
}

export function isServiceStatus(value: unknown): value is ServiceStatus {
  return (
    value === "Open" ||
    value === "Scheduled" ||
    value === "Completed" ||
    value === "Monitor" ||
    value === "In Progress" ||
    value === "Waiting"
  );
}

export function isPriority(value: unknown): value is WorkOrderPriority {
  return value === "Low" || value === "Medium" || value === "High";
}

export function isWorkOrderRecurrenceUnit(
  value: unknown,
): value is WorkOrderRecurrenceUnit {
  return (
    value === "Days" ||
    value === "Weeks" ||
    value === "Months" ||
    value === "Years"
  );
}

export function isWorkSeason(value: unknown): value is WorkSeason {
  return (
    value === "Year-Round" ||
    value === "Spring" ||
    value === "Summer" ||
    value === "Fall" ||
    value === "Winter"
  );
}

export function seasonForDate(dateValue = todayISO()): WorkSeason {
  const date = calendarDateValue(dateValue);
  const month = date.getMonth();

  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

export function workSeasonDescription(season: WorkSeason) {
  if (season === "Spring") {
    return "Landscaping, cleanup, irrigation, reopening and de-winterizing watercraft and outdoor systems.";
  }
  if (season === "Summer") {
    return "Water and family fun, outdoor safety, lawn and irrigation, and high-use property operations.";
  }
  if (season === "Fall") {
    return "Leaves, landscape cleanup, gutters, winterizing watercraft, and preparing outdoor systems.";
  }
  if (season === "Winter") {
    return "Slower season for organizing, inventory, indoor preventive maintenance, and planning.";
  }
  return "Core safety, inspections, cleaning, and routine operations that continue all year.";
}

export function recurrenceLabel(record: ServiceRecord) {
  if (!record.recurring) return "One-time";

  const interval = Math.max(1, Number(record.recurrenceInterval || 1));
  const unit = isWorkOrderRecurrenceUnit(record.recurrenceUnit)
    ? record.recurrenceUnit
    : "Weeks";
  const singular = unit.slice(0, -1).toLowerCase();

  return interval === 1
    ? `Every ${singular}`
    : `Every ${interval} ${unit.toLowerCase()}`;
}

export function nextRecurrenceDate(
  startDate: string,
  intervalValue: number,
  unitValue: WorkOrderRecurrenceUnit,
) {
  const date = calendarDateValue(startDate || todayISO());
  const interval = Math.max(1, Math.floor(Number(intervalValue) || 1));

  if (unitValue === "Days") date.setDate(date.getDate() + interval);
  if (unitValue === "Weeks") date.setDate(date.getDate() + interval * 7);
  if (unitValue === "Months") date.setMonth(date.getMonth() + interval);
  if (unitValue === "Years") date.setFullYear(date.getFullYear() + interval);

  return localISODate(date);
}

export function isProcedurePriority(value: unknown): value is Priority {
  return value === "High" || value === "Normal" || value === "Seasonal";
}

export function isPartStatus(value: unknown): value is PartStatus {
  return (
    value === "In Stock" ||
    value === "Low" ||
    value === "Out" ||
    value === "Order"
  );
}

export function readStoredArray<T>(keys: string[], fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      continue;
    }
  }

  return fallback;
}

export function readFirstNonEmptyStoredArray<T>(
  keys: string[],
  fallback: T[],
): T[] {
  if (typeof window === "undefined") return fallback;

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as T[];
      }
    } catch {
      continue;
    }
  }

  return fallback;
}

export function readAllStoredArrays<T>(keys: string[]): T[] {
  if (typeof window === "undefined") return [];

  const combined: T[] = [];

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) combined.push(...(parsed as T[]));
    } catch {
      continue;
    }
  }

  const unique = new Map<string, T>();
  combined.forEach((item, index) => {
    const record = item as Record<string, unknown> | null;
    const id = record && typeof record === "object" ? String(record.id || "").trim() : "";
    const key = id ? `id:${id}` : `value:${JSON.stringify(item)}:${index}`;
    if (!unique.has(key)) unique.set(key, item);
  });

  return Array.from(unique.values());
}

export function saveStoredArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return window.localStorage.getItem(key) !== null;
  } catch (error) {
    // Atlas may already be near the browser storage limit because photos and
    // documents are preserved locally. A storage-quota error must never crash
    // the page when a user edits a field or changes a dropdown.
    console.warn(`Atlas could not save local data for ${key}.`, error);
    return false;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function normalizePhotoRecord(value: unknown): PhotoRecord {
  const outer = asRecord(value);
  const nested = asRecord(
    outer.record ?? outer.photo ?? outer.data ?? outer.payload,
  );
  const combined = { ...outer, ...nested };
  const files = Array.isArray(combined.files) ? combined.files : [];
  const firstFile = asRecord(
    combined.file ??
      files.find((item) => {
        const file = asRecord(item);
        const type = firstText(file.type, file.mimeType, file.mime_type);
        const data = firstText(file.dataUrl, file.data_url, file.url, file.src);
        return type.startsWith("image/") || data.startsWith("data:image/");
      }) ??
      files[0],
  );

  const rawUrl = firstText(
    combined.url,
    combined.imageUrl,
    combined.image_url,
    combined.src,
    firstFile.url,
    firstFile.imageUrl,
    firstFile.image_url,
    firstFile.src,
  );
  const explicitDataUrl = firstText(
    combined.dataUrl,
    combined.data_url,
    combined.imageData,
    combined.image_data,
    firstFile.dataUrl,
    firstFile.data_url,
    firstFile.imageData,
    firstFile.image_data,
  );
  const dataUrl =
    explicitDataUrl || (rawUrl.startsWith("data:image/") ? rawUrl : "");
  const url = rawUrl.startsWith("data:image/") ? "" : rawUrl;

  return {
    id: firstText(
      nested.id,
      nested.photoId,
      nested.photo_id,
      outer.id,
      outer.photoId,
      outer.photo_id,
    ),
    assetId: firstText(
      nested.assetId,
      nested.asset_id,
      outer.assetId,
      outer.asset_id,
    ),
    name:
      firstText(
        nested.name,
        nested.filename,
        nested.fileName,
        nested.file_name,
        outer.name,
        outer.filename,
        outer.fileName,
        outer.file_name,
        firstFile.name,
        firstFile.filename,
      ) || "Asset photo",
    dataUrl: dataUrl || undefined,
    url: url || undefined,
    createdAt:
      firstText(
        nested.createdAt,
        nested.created_at,
        outer.createdAt,
        outer.created_at,
        firstFile.createdAt,
        firstFile.created_at,
      ) || undefined,
  };
}

export function photoSource(photo?: PhotoRecord) {
  return firstText(photo?.dataUrl, photo?.url);
}

export function mergePhotoRecords(...groups: PhotoRecord[][]) {
  const merged = new Map<string, PhotoRecord>();

  groups
    .flat()
    .map(normalizePhotoRecord)
    .forEach((photo) => {
      if (!photo.id || !photo.assetId) return;
      const existing = merged.get(photo.id);
      merged.set(photo.id, {
        ...existing,
        ...photo,
        dataUrl: photo.dataUrl || existing?.dataUrl,
        url: photo.url || existing?.url,
        name: photo.name || existing?.name || "Asset photo",
        createdAt: photo.createdAt || existing?.createdAt,
      });
    });

  return [...merged.values()].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
}

export const PHOTO_CACHE_DB = "atlas-photo-cache-v1";
export const PHOTO_CACHE_STORE = "asset-photos";

export function openPhotoCache(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(PHOTO_CACHE_DB, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_CACHE_STORE)) {
        database.createObjectStore(PHOTO_CACHE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function cachePhotoRecord(photo: PhotoRecord) {
  const source = photoSource(photo);
  if (!photo.id || !source) return;

  const database = await openPhotoCache();
  if (!database) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(PHOTO_CACHE_STORE, "readwrite");
      transaction.objectStore(PHOTO_CACHE_STORE).put({
        id: photo.id,
        dataUrl: photo.dataUrl || "",
        url: photo.url || "",
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });

  database.close();
}

export async function cachePhotoRecords(photos: PhotoRecord[]) {
  await Promise.all(photos.map((photo) => cachePhotoRecord(photo)));
}

export async function readCachedPhoto(
  id: string,
): Promise<Pick<PhotoRecord, "dataUrl" | "url"> | null> {
  if (!id) return null;

  const database = await openPhotoCache();
  if (!database) return null;

  const result = await new Promise<Record<string, unknown> | null>(
    (resolve) => {
      try {
        const transaction = database.transaction(PHOTO_CACHE_STORE, "readonly");
        const request = transaction.objectStore(PHOTO_CACHE_STORE).get(id);
        request.onsuccess = () =>
          resolve(request.result ? asRecord(request.result) : null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    },
  );

  database.close();
  if (!result) return null;

  const dataUrl = firstText(result.dataUrl, result.data_url);
  const url = firstText(result.url);
  if (!dataUrl && !url) return null;

  return {
    dataUrl: dataUrl || undefined,
    url: url || undefined,
  };
}

export async function deleteCachedPhoto(id: string) {
  if (!id) return;
  const database = await openPhotoCache();
  if (!database) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(PHOTO_CACHE_STORE, "readwrite");
      transaction.objectStore(PHOTO_CACHE_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });

  database.close();
}

export function persistPhotoRecords(photos: PhotoRecord[]) {
  const metadata = mergePhotoRecords(photos).map((photo) => ({
    ...photo,
    dataUrl: undefined,
    url:
      photo.url && !photo.url.startsWith("data:image/") ? photo.url : undefined,
  }));

  try {
    saveStoredArray(storageKeys.photos[0], metadata);
  } catch {
    // IndexedDB remains the image source if localStorage is unavailable.
  }
}

export function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const maxSide = 1200;
        const scale = Math.min(
          1,
          maxSide / Math.max(image.width, image.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");

        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const qualities = [0.8, 0.7, 0.6, 0.5];
        let result = canvas.toDataURL("image/jpeg", qualities[0]);

        for (const quality of qualities.slice(1)) {
          if (result.length <= 700_000) break;
          result = canvas.toDataURL("image/jpeg", quality);
        }

        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image compression failed"));
    };

    image.src = objectUrl;
  });
}

export async function fileToUploadedRecord(file: File): Promise<UploadedFileRecord> {
  let dataUrl = "";

  if (
    file.type.startsWith("image/") &&
    !file.type.includes("svg") &&
    !file.type.includes("gif")
  ) {
    try {
      dataUrl = await compressImageFile(file);
    } catch {
      dataUrl = await readFileDataUrl(file);
    }
  } else {
    dataUrl = await readFileDataUrl(file);
  }

  return {
    id: uid("upload"),
    name: file.name || "Uploaded file",
    type: file.type || "file",
    dataUrl,
    createdAt: new Date().toISOString(),
  };
}

export function dataUrlToFile(dataUrl: string, fileName = "pasted-image.png") {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("That copied image data is not valid.");

  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
}

export function imageUrlsFromClipboardText(value: string) {
  const source = String(value || "").trim();
  if (!source) return [];

  const urls = new Set<string>();

  if (source.startsWith("data:image/")) {
    urls.add(source);
  }

  try {
    const parsed = new DOMParser().parseFromString(source, "text/html");
    parsed.querySelectorAll("img").forEach((image) => {
      const src = image.getAttribute("src")?.trim() || "";
      if (src) urls.add(src);
    });
  } catch {
    // Plain text is handled below.
  }

  source
    .split(/\s+/)
    .map((item) => item.replace(/^['"<(]+|[>'"),]+$/g, ""))
    .filter(
      (item) =>
        item.startsWith("https://") ||
        item.startsWith("data:image/") ||
        item.startsWith("blob:"),
    )
    .forEach((item) => urls.add(item));

  return [...urls];
}

export async function importImageUrlAsFile(url: string) {
  if (url.startsWith("data:image/")) {
    return dataUrlToFile(url, `pasted-ai-image-${Date.now()}.png`);
  }

  if (url.startsWith("blob:")) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Blob image could not be read.");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("The copied item was not an image.");
      }
      const extension =
        blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      return new File([blob], `pasted-ai-image-${Date.now()}.${extension}`, {
        type: blob.type,
      });
    } catch {
      throw new Error(
        "That copied AI image only included a temporary link. Use Copy image, then click Paste Image again.",
      );
    }
  }

  const response = await fetch(
    `/api/image-import?url=${encodeURIComponent(url)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Atlas could not import that copied image.");
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("The copied link did not return an image.");
  }

  const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";

  return new File([blob], `pasted-ai-image-${Date.now()}.${extension}`, {
    type: blob.type,
  });
}

export function normalizeImageFile(file: File) {
  if (file.type.startsWith("image/")) return file;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const inferredType =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : extension === "avif"
              ? "image/avif"
              : "";

  if (!inferredType) return file;
  return new File([file], file.name, { type: inferredType });
}

export function mergeUploadedFiles(
  incoming: UploadedFileRecord[],
  existing: UploadedFileRecord[],
) {
  const map = new Map<string, UploadedFileRecord>();
  [...existing, ...incoming].forEach((file) => {
    const key = file.id || `${file.name}-${file.createdAt || ""}`;
    map.set(key, file);
  });
  return Array.from(map.values());
}

export function normalizeAsset(record: Partial<AtlasAssetRecord>): AtlasAssetRecord {
  const name = String(record.name ?? "Unnamed Asset");
  const rawPrimaryLocationId = String(record.locationId ?? "").trim();
  const rawLocationIds = Array.from(
    new Set(
      [
        rawPrimaryLocationId,
        ...(Array.isArray(record.locationIds) ? record.locationIds.map(String) : []),
      ].filter(Boolean),
    ),
  );
  const specificLocationIds = rawLocationIds.filter((id) => id !== "general");
  const normalizedLocationIds = specificLocationIds.length
    ? specificLocationIds
    : rawLocationIds;
  const normalizedPrimaryLocationId = specificLocationIds.length
    ? specificLocationIds.includes(rawPrimaryLocationId)
      ? rawPrimaryLocationId
      : specificLocationIds[0]
    : rawPrimaryLocationId || normalizedLocationIds[0] || "";

  return {
    id: String(record.id || slugify(name)),
    name,
    locationId: normalizedPrimaryLocationId,
    locationIds: normalizedLocationIds,
    category: String(record.category ?? "General"),
    status: isStatus(record.status) ? record.status : "Monitor",
    make: record.make || "",
    model: record.model || "",
    year: record.year || "",
    manufacturer: record.manufacturer || "",
    serial: record.serial || "",
    serial2: record.serial2 || "",
    serialRequirement: record.serialRequirement === "Not Required" ? "Not Required" : "Required",
    manualRequirement: record.manualRequirement === "Not Required" ? "Not Required" : "Required",
    procedureRequirement: record.procedureRequirement === "Not Required" ? "Not Required" : "Required",
    notes: String(record.notes || ""),
    vendorIds: Array.isArray(record.vendorIds)
      ? record.vendorIds.map(String)
      : [],
  };
}

export function assetLocationIds(asset: Partial<AtlasAssetRecord>) {
  const ids = Array.isArray(asset.locationIds)
    ? asset.locationIds.map(String).filter(Boolean)
    : [];
  const primary = String(asset.locationId || "").trim();
  const combined = Array.from(new Set([primary, ...ids].filter(Boolean)));
  const specific = combined.filter((id) => id !== "general");
  return specific.length ? specific : combined;
}

export function assetHasLocation(asset: Partial<AtlasAssetRecord>, locationId: string) {
  return assetLocationIds(asset).includes(locationId);
}

export function normalizeLocationName(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeVendor(record: Partial<VendorRecord>): VendorRecord {
  const name = String(record.name ?? "Unnamed Vendor");
  return {
    id: String(record.id || slugify(name)),
    name,
    category: String(record.category ?? "General"),
    phone: record.phone || "",
    email: record.email || "",
    website: record.website || "",
    notes: String(record.notes || ""),
  };
}

export function normalizeContact(record: Partial<ContactRecord>): ContactRecord {
  return {
    id: String(record.id || ""),
    name: String(record.name ?? ""),
    organization: String(record.organization ?? ""),
    role: String(record.role ?? ""),
    category: String(record.category ?? ""),
    phone: String(record.phone ?? ""),
    email: String(record.email ?? ""),
    address: String(record.address ?? ""),
    website: String(record.website ?? ""),
    birthday: String(record.birthday ?? ""),
    notes: String(record.notes ?? ""),
  };
}

export function blankContact(): ContactRecord {
  return normalizeContact({
    id: "",
    name: "",
    organization: "",
    role: "",
    category: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    birthday: "",
    notes: "",
  });
}

export function normalizeService(
  record: Partial<AtlasServiceRecord>,
): AtlasServiceRecord {
  const title = String(record.title ?? "Untitled Work Order");
  return {
    id: String(record.id || slugify(title)),
    assetId: String(record.assetId ?? ""),
    vendorId: record.vendorId || "",
    procedureId: record.procedureId || "",
    date: typeof record.date === "string" ? record.date.trim() : "",
    title,
    status: isServiceStatus(record.status) ? record.status : "Open",
    priority: isPriority(record.priority) ? record.priority : "Medium",
    notes: String(record.notes || ""),
    followUpDate: record.followUpDate || "",
    recurring: Boolean(record.recurring),
    recurrenceInterval: Math.max(
      1,
      Math.floor(Number(record.recurrenceInterval || 1)),
    ),
    recurrenceUnit: isWorkOrderRecurrenceUnit(record.recurrenceUnit)
      ? record.recurrenceUnit
      : "Weeks",
    recurrenceEndDate: String(record.recurrenceEndDate || ""),
    season: isWorkSeason(record.season)
      ? record.season
      : seasonForDate(String(record.date || todayISO())),
    lastCompletedDate: String(record.lastCompletedDate || ""),
    completionHistory: Array.isArray(record.completionHistory)
      ? record.completionHistory.map(String).filter(Boolean)
      : [],
    estimatedCost: Math.max(0, Number(record.estimatedCost || 0)),
    actualCost: Math.max(0, Number(record.actualCost || 0)),
    invoiceNumber: String(record.invoiceNumber || ""),
    workType:
      record.workType === "Quick Task" ||
      record.workType === "Work Order" ||
      record.workType === "Preventive Maintenance" ||
      record.workType === "Project"
        ? record.workType
        : record.recurring
          ? "Preventive Maintenance"
          : "Work Order",
    workCategory: String(
      record.workCategory ||
        (record as AtlasServiceRecord & { category?: string }).category ||
        "🔧 Maintenance",
    ),
    effort: record.effort || undefined,
    responsibilityArea: String(record.responsibilityArea || ""),
    emoji: String(record.emoji || ""),
    assignedTo: String(record.assignedTo || ""),
    assignedPersonIds: Array.isArray(record.assignedPersonIds)
      ? Array.from(new Set(record.assignedPersonIds.map(String).filter(Boolean)))
      : record.assignedTo
        ? [String(record.assignedTo)]
        : [],
    assignedVendorIds: Array.isArray(record.assignedVendorIds)
      ? Array.from(new Set(record.assignedVendorIds.map(String).filter(Boolean)))
      : record.vendorId
        ? [String(record.vendorId)]
        : [],
    projectId: String(record.projectId || ""),
    locationId: String(record.locationId || ""),
    checklist: Array.isArray(record.checklist)
      ? record.checklist.map((item) => ({
          id: String(item.id || uid("check")),
          text: String(item.text || ""),
          completed: Boolean(item.completed),
        }))
      : [],
    notesHistory: Array.isArray(record.notesHistory)
      ? record.notesHistory.map((entry) => ({
          id: String(entry.id || uid("note")),
          text: String(entry.text || ""),
          createdAt: String(entry.createdAt || new Date().toISOString()),
        }))
      : [],
    serviceHistory: Array.isArray(record.serviceHistory)
      ? record.serviceHistory.map((entry) => ({
          id: String(entry.id || uid("completion")),
          completedAt: String(entry.completedAt || new Date().toISOString()),
          statusBefore: String(entry.statusBefore || "Open"),
          dueDate: String(entry.dueDate || ""),
          notes: String(entry.notes || ""),
          notesHistory: Array.isArray(entry.notesHistory)
            ? entry.notesHistory
            : [],
          checklist: Array.isArray(entry.checklist) ? entry.checklist : [],
          photos: Array.isArray(entry.photos) ? entry.photos : [],
          documents: Array.isArray(entry.documents) ? entry.documents : [],
          assetId: String(entry.assetId || ""),
          vendorId: String(entry.vendorId || ""),
          procedureId: String(entry.procedureId || ""),
          locationId: String(entry.locationId || ""),
        }))
      : [],
    photos: Array.isArray(record.photos) ? record.photos : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
  };
}

export function normalizeProcedure(record: Partial<ProcedureRecord>): ProcedureRecord {
  const title = String(record.title ?? "Untitled Procedure");
  const steps = Array.isArray(record.steps) ? record.steps.map(String) : [];
  const checklist = Array.isArray(record.checklist)
    ? record.checklist.map((item, index) => ({
        id: String(item.id || uid("procedure-step")),
        text: String(item.text || steps[index] || ""),
        completed: Boolean(item.completed),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      }))
    : steps.map((text, index) => ({
        id: uid("procedure-step"),
        text,
        completed: false,
        order: index,
      }));

  return {
    id: String(record.id || slugify(title)),
    title,
    area: String(record.area ?? "2000"),
    category: String(record.category || "Maintenance"),
    priority: isProcedurePriority(record.priority) ? record.priority : "Normal",
    status:
      record.status === "Draft" ||
      record.status === "SOP" ||
      record.status === "Preventive Maintenance" ||
      record.status === "Landscaping"
        ? record.status
        : "Draft",
    purpose: String(record.purpose || ""),
    safetyNotes: String(record.safetyNotes || ""),
    toolsParts: String(record.toolsParts || ""),
    requiredTools: Array.isArray(record.requiredTools)
      ? record.requiredTools.map(String).filter(Boolean)
      : [],
    requiredParts: Array.isArray(record.requiredParts)
      ? record.requiredParts.map(String).filter(Boolean)
      : [],
    estimatedTime: String(record.estimatedTime || ""),
    steps: checklist.map((item) => item.text).filter(Boolean),
    checklist,
    linkedAssetIds: Array.isArray(record.linkedAssetIds)
      ? record.linkedAssetIds.map(String)
      : [],
    linkedLocationIds: Array.isArray(record.linkedLocationIds)
      ? record.linkedLocationIds.map(String)
      : [],
    linkedVendorIds: Array.isArray(record.linkedVendorIds)
      ? record.linkedVendorIds.map(String)
      : [],
    photos: Array.isArray(record.photos) ? record.photos : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
    createdAt: String(record.createdAt || new Date().toISOString()),
    updatedAt: String(record.updatedAt || new Date().toISOString()),
  };
}

export function normalizeCalendar(record: Partial<AtlasCalendarItem>): AtlasCalendarItem {
  const title = String(record.title ?? "Untitled Calendar Item");
  const rawColorId =
    String(record.colorId ?? "") ||
    categoryToColorId(String(record.area ?? record.categoryLabel ?? ""));
  const categoryLabel = String(
    record.categoryLabel ??
      record.area ??
      colorLabelFromColorId(rawColorId) ??
      "Maintenance",
  );
  const colorName = (record.colorName ||
    colorNameFromLegacyColorId(rawColorId)) as CalendarColorName;

  return {
    id: String(record.id || slugify(title)),
    date: String(record.date ?? todayISO()),
    time: String(record.time || ""),
    title,
    area: categoryLabel,
    categoryLabel,
    colorId: rawColorId || "maintenance",
    colorName,
    allDay: Boolean(record.allDay),
    repeat: record.repeat || "None",
    reminder: record.reminder || "None",
    notes: String(record.notes || ""),
    linkedType: record.linkedType || "None",
    linkedId: String(record.linkedId || ""),
    linkedName: String(record.linkedName || ""),
    completed: Boolean(record.completed || record.status === "Completed"),
    source: record.source || "manual",
    originalId: String(record.originalId || ""),
    instanceId: String(record.instanceId || ""),
    propertyId: String(record.propertyId || ""),
    calendarOwner: String(record.calendarOwner || ""),
    ownerUserId: String(record.ownerUserId || ""),
  };
}

export function mergeCalendarItemRecords(
  browserItems: CalendarItem[],
  sharedItems: CalendarItem[],
): CalendarItem[] {
  const merged = new Map<string, CalendarItem>();

  const mergeSameId = (
    browserRecord: CalendarItem,
    sharedRecord: CalendarItem,
  ): CalendarItem => {
    const browser = normalizeCalendar(browserRecord);
    const shared = normalizeCalendar(sharedRecord);

    const browserHasRepeat =
      Boolean(browser.repeat) && browser.repeat !== "None";
    const sharedHasRepeat =
      Boolean(shared.repeat) && shared.repeat !== "None";

    const repeat =
      sharedHasRepeat || !browserHasRepeat ? shared.repeat : browser.repeat;
    const reminder =
      shared.reminder && shared.reminder !== "None"
        ? shared.reminder
        : browser.reminder;
    const notes = shared.notes.trim() ? shared.notes : browser.notes;
    const linkedType =
      shared.linkedType && shared.linkedType !== "None"
        ? shared.linkedType
        : browser.linkedType;
    const linkedId = shared.linkedId.trim()
      ? shared.linkedId
      : browser.linkedId;
    const linkedName = shared.linkedName.trim()
      ? shared.linkedName
      : browser.linkedName;
    const categoryLabel =
      shared.categoryLabel.trim() &&
      shared.categoryLabel !== "Maintenance"
        ? shared.categoryLabel
        : browser.categoryLabel || shared.categoryLabel;
    const area =
      shared.area.trim() && shared.area !== "Maintenance"
        ? shared.area
        : browser.area || shared.area;
    const colorId =
      shared.colorId && shared.colorId !== "maintenance"
        ? shared.colorId
        : browser.colorId || shared.colorId;
    const colorName =
      shared.colorId && shared.colorId !== "maintenance"
        ? shared.colorName
        : browser.colorName || shared.colorName;
    const time = shared.time.trim() ? shared.time : browser.time;

    return normalizeCalendar({
      ...browser,
      ...shared,
      time,
      area,
      categoryLabel,
      colorId,
      colorName,
      allDay: shared.allDay || (!shared.time && browser.allDay),
      repeat,
      reminder,
      notes,
      linkedType,
      linkedId,
      linkedName,
    });
  };

  const addRecord = (record: CalendarItem, source: "browser" | "shared") => {
    const normalized = normalizeCalendar(record);
    if (!normalized.id || !normalized.date || !normalized.title) return;

    const existing = merged.get(normalized.id);
    if (!existing) {
      merged.set(normalized.id, normalized);
      return;
    }

    merged.set(
      normalized.id,
      source === "shared"
        ? mergeSameId(existing, normalized)
        : mergeSameId(normalized, existing),
    );
  };

  browserItems.forEach((item) => addRecord(item, "browser"));
  sharedItems.forEach((item) => addRecord(item, "shared"));

  return byTitle(Array.from(merged.values()));
}

export function normalizePart(record: Partial<PartRecord>): PartRecord {
  const name = String(record.name ?? "Unnamed Part");
  return {
    id: String(record.id || slugify(name)),
    name,
    category: String(record.category ?? "General"),
    locationId: String(record.locationId ?? "general"),
    assetId: record.assetId || "",
    vendorId: record.vendorId || "",
    quantity: Number(record.quantity ?? 0),
    minQuantity: Number(record.minQuantity ?? 1),
    status: isPartStatus(record.status) ? record.status : "In Stock",
    notes: String(record.notes || ""),
  };
}

export function normalizeDocument(record: Partial<DocumentRecord>): DocumentRecord {
  const title = String(
    record.title || record.files?.[0]?.name || "Untitled Document",
  );
  const targetType = (record.targetType || "General") as IntakeTargetKind;

  return {
    propertyId: String(record.propertyId || "2000"),
    id: String(record.id || uid("doc")),
    title,
    area: String(record.area || record.targetName || "General"),
    type: String(record.type || "Paperwork / Scan"),
    linkedAssetId:
      record.linkedAssetId ||
      (targetType === "Asset" ? record.targetId : undefined),
    linkedVendorId:
      record.linkedVendorId ||
      (targetType === "Vendor" ? record.targetId : undefined),
    targetType,
    targetId: String(record.targetId || ""),
    targetName: String(record.targetName || record.area || "General"),
    notes: String(record.notes || ""),
    pastedText: String(record.pastedText || ""),
    files: Array.isArray(record.files)
      ? record.files.map((file) => ({
          id: String(file.id || uid("file")),
          name: String(file.name || "File"),
          type: file.type || "",
          dataUrl: file.dataUrl || "",
          url: file.url || "",
          createdAt:
            file.createdAt || record.createdAt || new Date().toISOString(),
        }))
      : [],
    href: record.href || "",
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

export function mergeDocuments(
  primary: DocumentRecord[],
  secondary: DocumentRecord[],
) {
  const merged = new Map<string, DocumentRecord>();

  [...primary, ...secondary].forEach((doc) => {
    const normalized = normalizeDocument(doc);
    if (!merged.has(normalized.id)) merged.set(normalized.id, normalized);
  });

  return Array.from(merged.values()).sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
}

export function byName<T extends { name: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeLocationRecords(
  primary: AtlasLocationRecord[],
  required: AtlasLocationRecord[],
): AtlasLocationRecord[] {
  const merged = new Map<string, AtlasLocationRecord>();
  const seenNames = new Set<string>();

  // Database locations are authoritative. Seed/fallback locations are added only
  // when no database location with the same normalized name already exists.
  [...primary, ...required].forEach((location, index) => {
    const id = String(location.id || "").trim();
    const name = String(location.name || "").trim();
    if (!id || !name) return;

    const normalizedName = normalizeLocationName(name);
    if (!normalizedName) return;

    if (index >= primary.length && seenNames.has(normalizedName)) return;

    const key = id.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, {
        id,
        name,
        type: String(location.type || ""),
        zone: String(location.zone || ""),
        notes: String(location.notes || ""),
        parentId: String(location.parentId || ""),
        customDetails: Array.isArray(location.customDetails)
          ? location.customDetails
              .map((detail) => ({
                id: String(detail?.id || uid("detail")),
                label: String(detail?.label || ""),
                value: String(detail?.value || ""),
              }))
              .filter((detail) => detail.label || detail.value)
          : [],
        vendorIds: Array.isArray(location.vendorIds) ? location.vendorIds.map(String) : [],
      });
      seenNames.add(normalizedName);
    }
  });

  return byName(Array.from(merged.values()));
}

function normalizedWorkOrderFingerprint(record: Record<string, unknown>) {
  const looksLikeWorkOrder =
    "workType" in record ||
    "recurring" in record ||
    ("status" in record && "priority" in record && "date" in record);
  if (!looksLikeWorkOrder) return "";

  const normalize = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  return [
    normalize(record.propertyId),
    normalize(record.title),
    normalize(record.assetId),
    normalize(record.locationId),
    normalize(record.subLocationId || record.subLocation),
    normalize(record.date),
    normalize(record.workType),
    record.recurring ? "recurring" : "one-time",
    normalize(record.recurrenceInterval),
    normalize(record.recurrenceUnit),
  ].join("|");
}

function recordCompletenessScore(record: Record<string, unknown>) {
  const scalarFields = [
    "notes",
    "assignedTo",
    "vendorId",
    "assetId",
    "locationId",
    "procedureId",
    "workCategory",
    "completedAt",
    "lastCompletedDate",
    "updatedAt",
  ];
  const arrayFields = [
    "checklist",
    "photos",
    "documents",
    "serviceHistory",
    "completionHistory",
    "assignedPersonIds",
    "assignedVendorIds",
  ];
  return (
    scalarFields.reduce(
      (score, field) => score + (String(record[field] || "").trim() ? 2 : 0),
      0,
    ) +
    arrayFields.reduce(
      (score, field) =>
        score + (Array.isArray(record[field]) ? (record[field] as unknown[]).length : 0),
      0,
    )
  );
}

export function byTitle<T extends { title: string }>(records: T[]): T[] {
  const unique = new Map<string, T>();

  records.forEach((item, index) => {
    const record = item as T & Record<string, unknown>;
    const fingerprint = normalizedWorkOrderFingerprint(record);
    const id = String(record.id || "").trim();
    const key = fingerprint || (id ? `id:${id}` : `row:${index}`);
    const current = unique.get(key);

    if (
      !current ||
      recordCompletenessScore(record) >
        recordCompletenessScore(current as T & Record<string, unknown>)
    ) {
      unique.set(key, item);
    }
  });

  return Array.from(unique.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

export function badgeStyle(value: string): React.CSSProperties {
  const palette: Record<string, { bg: string; color: string; border: string }> =
    {
      Online: { bg: "#EAF7F1", color: colors.green, border: "#BDE7D2" },
      Completed: { bg: "#EAF7F1", color: colors.green, border: "#BDE7D2" },
      "In Stock": { bg: "#EAF7F1", color: colors.green, border: "#BDE7D2" },
      Offline: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
      Out: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
      High: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
      Seasonal: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
      Open: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
      Order: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
      Low: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
      Monitor: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
      Scheduled: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
      Medium: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
      Normal: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    };

  const item = palette[value] ?? palette.Monitor;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    border: `1px solid ${item.border}`,
    background: item.bg,
    color: item.color,
    padding: "4px 9px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

export function weatherText(code: number) {
  if ([0].includes(code)) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunder";
  return "Weather";
}

export function weatherIcon(code: number) {
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

export function weatherGlyph(code: number) {
  const common = {
    width: 48,
    height: 48,
    viewBox: "0 0 64 64",
    role: "img" as const,
    "aria-label": weatherText(code),
  };

  const sun = (
    <>
      <g stroke="#F2B84B" strokeWidth="3.2" strokeLinecap="round">
        <path d="M22 6v6M22 32v6M6 22h6M32 22h6M10.7 10.7l4.2 4.2M29.1 29.1l4.2 4.2M10.7 33.3l4.2-4.2M29.1 14.9l4.2-4.2" />
      </g>
      <circle cx="22" cy="22" r="8.5" fill="#FFD76A" stroke="#E6A83E" strokeWidth="2" />
    </>
  );

  const cloud = (
    <path
      d="M20 46h27.5c6.9 0 12.5-5.1 12.5-11.4 0-5.9-4.9-10.8-11.2-11.4C46.4 16.6 40.2 12 33 12c-9.1 0-16.6 7.2-17.2 16.2C9.2 29 4 34 4 40.1 4 43.4 10.9 46 20 46Z"
      fill="#EEF4F8"
      stroke="#8EA8BA"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  );

  if ([0].includes(code)) {
    return <svg {...common} viewBox="0 0 44 44">{sun}</svg>;
  }

  if ([1, 2].includes(code)) {
    return (
      <svg {...common}>
        <g transform="translate(2 1)">{sun}</g>
        <g transform="translate(0 4)">{cloud}</g>
      </svg>
    );
  }

  if ([3].includes(code)) {
    return <svg {...common}>{cloud}</svg>;
  }

  if ([45, 48].includes(code)) {
    return (
      <svg {...common}>
        <g transform="translate(0 -5)">{cloud}</g>
        <g stroke="#9CB3C2" strokeWidth="3" strokeLinecap="round">
          <path d="M9 48h34M18 55h37M6 61h31" />
        </g>
      </svg>
    );
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return (
      <svg {...common}>
        <g transform="translate(0 -5)">{cloud}</g>
        <g stroke="#4AA3DF" strokeWidth="3.2" strokeLinecap="round">
          <path d="m17 49-3 6M31 49l-3 6M45 49l-3 6" />
        </g>
      </svg>
    );
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg {...common}>
        <g transform="translate(0 -6)">{cloud}</g>
        <g fill="#8CC8E8" stroke="#5EA8D0" strokeWidth="1.4" strokeLinecap="round">
          <path d="M18 49v10M13.7 51.5l8.6 5M22.3 51.5l-8.6 5" />
          <path d="M34 49v10M29.7 51.5l8.6 5M38.3 51.5l-8.6 5" />
          <path d="M50 49v10M45.7 51.5l8.6 5M54.3 51.5l-8.6 5" />
        </g>
      </svg>
    );
  }

  if ([95, 96, 99].includes(code)) {
    return (
      <svg {...common}>
        <g transform="translate(0 -7)">{cloud}</g>
        <path d="M33 43h10l-7 9h6L29 64l4-10h-6Z" fill="#F2B84B" stroke="#C88920" strokeWidth="1.5" strokeLinejoin="round" />
        <g stroke="#4AA3DF" strokeWidth="3" strokeLinecap="round"><path d="m16 48-3 6M52 48l-3 6" /></g>
      </svg>
    );
  }

  return <svg {...common}>{cloud}</svg>;
}

export function irrigationAdvice(day: WeatherDay) {
  if (day.precipAmount >= 0.25 || day.precipChance >= 75)
    return "Rain likely — skip irrigation unless pots are dry.";
  if (day.precipAmount >= 0.1 || day.precipChance >= 45)
    return "Possible rain — check beds before watering.";
  if (day.high >= 82 || day.et0 >= 0.18)
    return "Hot/dry day — prioritize pots, new plantings, and exposed beds.";
  if (day.windMax >= 18)
    return "Windy — avoid spray irrigation during peak wind.";
  return "Good yard-work window — normal irrigation check.";
}

export function weatherDayPlanning(day: WeatherDay) {
  if (day.precipChance >= 75 || day.precipAmount >= 0.25) {
    return "Plan indoor or covered work. Rain is likely enough to affect outdoor maintenance.";
  }
  if (day.windMax >= 20) {
    return "Expect a windy workday. Avoid spraying, loose covers, and wind-sensitive outdoor work.";
  }
  if (day.high >= 85) {
    return "Schedule strenuous outdoor work earlier in the day and check pots and new plantings.";
  }
  if (day.low <= 40) {
    return "Cool start expected. Delay temperature-sensitive watering or outdoor work until later.";
  }
  return "Conditions look workable for normal outdoor maintenance and property checks.";
}

export function categoryToColorId(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("landscape") || lower.includes("grounds"))
    return "landscaping";
  if (lower.includes("irrigation") || lower.includes("hydrawise"))
    return "irrigation";
  if (
    lower.includes("hvac") ||
    lower.includes("thermostat") ||
    lower.includes("carrier") ||
    lower.includes("honeywell")
  )
    return "hvac";
  if (
    lower.includes("paint") ||
    lower.includes("stain") ||
    lower.includes("elliott")
  )
    return "paint-stain";
  if (lower.includes("clean")) return "cleaning";
  if (
    lower.includes("camera") ||
    lower.includes("security") ||
    lower.includes("unifi") ||
    lower.includes("ubiquiti")
  )
    return "security-cameras";
  if (lower.includes("control4") || lower.includes("smart home"))
    return "smart-home-controls";
  if (
    lower.includes("boat") ||
    lower.includes("dock") ||
    lower.includes("marine") ||
    lower.includes("seadoo")
  )
    return "boat-dock";
  if (lower.includes("waterfront") || lower.includes("waterside"))
    return "waterfront";
  if (lower.includes("vehicle") || lower.includes("car")) return "vehicles";
  if (lower.includes("interior") || lower.includes("house"))
    return "house-interior";
  if (lower.includes("exterior")) return "exterior";
  if (
    lower.includes("supply") ||
    lower.includes("amazon") ||
    lower.includes("order")
  )
    return "supplies-orders";
  if (
    lower.includes("invoice") ||
    lower.includes("accounting") ||
    lower.includes("metaviewer")
  )
    return "accounting-invoices";
  if (lower.includes("meeting")) return "meeting";
  if (lower.includes("reminder")) return "reminder";
  if (lower.includes("vendor")) return "vendor";
  if (lower.includes("family")) return "family";
  if (lower.includes("owner") || lower.includes("personal"))
    return "personal-owner";
  if (lower.includes("work order")) return "work-order";
  if (lower.includes("maintenance") || lower.includes("work"))
    return "maintenance";
  return "other";
}

export const calendarPlainColors: {
  id: CalendarColorName;
  label: string;
  hex: string;
}[] = [
  { id: "red", label: "Red", hex: "#B42318" },
  { id: "orange", label: "Orange", hex: "#B54708" },
  { id: "yellow", label: "Yellow", hex: "#C99A3D" },
  { id: "green", label: "Green", hex: "#087443" },
  { id: "blue", label: "Blue", hex: "#175CD3" },
  { id: "purple", label: "Purple", hex: "#7C3AED" },
  { id: "gray", label: "Gray", hex: "#475467" },
];

export const repeatOptions: CalendarRepeat[] = [
  "None",
  "Daily",
  "Weekdays",
  "Weekly",
  "Monthly",
  "Yearly",
  "Custom",
];
export const reminderOptions: CalendarReminder[] = [
  "None",
  "Morning of",
  "Day before",
  "Week before",
];
export const linkTypeOptions: CalendarLinkType[] = [
  "None",
  "Asset",
  "Location",
  "Vendor",
  "Work Order",
];

export const standardCalendarCategoryLabels = [
  "Maintenance",
  "Vendor",
  "Family",
  "Personal / Owner",
  "Work Order",
  "Holiday",
  "Landscaping",
  "Irrigation",
  "HVAC",
  "Paint / Stain",
  "Cleaning",
  "Security / Cameras",
  "Smart Home / Controls",
  "Boat / Dock",
  "Waterfront",
  "Vehicles",
  "House / Interior",
  "Exterior",
  "Supplies / Orders",
  "Accounting / Invoices",
  "Meeting",
  "Reminder",
  "Other",
];

export function plainColor(value?: string) {
  return (
    calendarPlainColors.find((color) => color.id === value) ??
    calendarPlainColors.find((color) => color.id === "blue") ??
    calendarPlainColors[0]
  );
}

export function colorNameFromLegacyColorId(colorId?: string): CalendarColorName {
  if (colorId === "personal-owner") return "yellow";
  if (colorId === "landscaping") return "green";
  if (colorId === "boat-dock") return "blue";
  if (colorId === "vendor") return "purple";
  if (colorId === "maintenance") return "gray";
  return "gray";
}

export function colorLabelFromColorId(colorId?: string) {
  return (
    defaultCalendarColors.find((color) => color.id === colorId)?.label ||
    "Other"
  );
}

export const defaultCalendarColors: CalendarColor[] = [
  {
    id: "maintenance",
    label: "Maintenance",
    hex: "#475467",
    colorName: "gray",
  },
  { id: "vendor", label: "Vendor", hex: "#7C3AED", colorName: "purple" },
  { id: "family", label: "Family", hex: "#175CD3", colorName: "blue" },
  {
    id: "personal-owner",
    label: "Personal / Owner",
    hex: "#C99A3D",
    colorName: "yellow",
  },
  { id: "work-order", label: "Work Order", hex: "#175CD3", colorName: "blue" },
  { id: "holiday", label: "Holiday", hex: "#7C3AED", colorName: "purple" },
  {
    id: "landscaping",
    label: "Landscaping",
    hex: "#087443",
    colorName: "green",
  },
  { id: "irrigation", label: "Irrigation", hex: "#087443", colorName: "green" },
  { id: "hvac", label: "HVAC", hex: "#175CD3", colorName: "blue" },
  {
    id: "paint-stain",
    label: "Paint / Stain",
    hex: "#B54708",
    colorName: "orange",
  },
  { id: "cleaning", label: "Cleaning", hex: "#087443", colorName: "green" },
  {
    id: "security-cameras",
    label: "Security / Cameras",
    hex: "#B42318",
    colorName: "red",
  },
  {
    id: "smart-home-controls",
    label: "Smart Home / Controls",
    hex: "#7C3AED",
    colorName: "purple",
  },
  { id: "boat-dock", label: "Boat / Dock", hex: "#175CD3", colorName: "blue" },
  { id: "waterfront", label: "Waterfront", hex: "#175CD3", colorName: "blue" },
  { id: "vehicles", label: "Vehicles", hex: "#475467", colorName: "gray" },
  {
    id: "house-interior",
    label: "House / Interior",
    hex: "#C99A3D",
    colorName: "yellow",
  },
  { id: "exterior", label: "Exterior", hex: "#087443", colorName: "green" },
  {
    id: "supplies-orders",
    label: "Supplies / Orders",
    hex: "#B54708",
    colorName: "orange",
  },
  {
    id: "accounting-invoices",
    label: "Accounting / Invoices",
    hex: "#7C3AED",
    colorName: "purple",
  },
  { id: "meeting", label: "Meeting", hex: "#175CD3", colorName: "blue" },
  { id: "reminder", label: "Reminder", hex: "#C99A3D", colorName: "yellow" },
  { id: "other", label: "Other", hex: "#94A3B8", colorName: "gray" },
];

export function normalizeCalendarColor(record: Partial<CalendarColor>): CalendarColor {
  const id = String(record.id || uid("color"));
  const colorName = record.colorName || colorNameFromLegacyColorId(id);
  const plain = plainColor(colorName);

  return {
    id,
    label: String(record.label || colorLabelFromColorId(id) || plain.label),
    colorName,
    hex: record.hex || plain.hex,
  };
}

export function mergeCalendarColors(storedColors: CalendarColor[]) {
  const merged = new Map<string, CalendarColor>();

  defaultCalendarColors.forEach((color) =>
    merged.set(color.id, normalizeCalendarColor(color)),
  );

  storedColors.forEach((color) => {
    const normalized = normalizeCalendarColor(color);
    merged.set(normalized.id, normalized);
  });

  standardCalendarCategoryLabels.forEach((label) => {
    const exists = Array.from(merged.values()).some(
      (color) => color.label === label,
    );
    if (!exists) {
      const id = slugify(label);
      merged.set(
        id,
        normalizeCalendarColor({
          id,
          label,
          colorName: colorNameFromLegacyColorId(id),
        }),
      );
    }
  });

  return Array.from(merged.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

export function getNthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
) {
  const date = new Date(year, monthIndex, 1);
  let count = 0;

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === weekday) {
      count += 1;
      if (count === nth) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }

  return new Date(year, monthIndex, 1);
}

export function getLastWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
) {
  const date = new Date(year, monthIndex + 1, 0);

  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

export function getObservedFixedHoliday(
  year: number,
  monthIndex: number,
  day: number,
) {
  const actual = new Date(year, monthIndex, day);
  const observed = new Date(actual);

  if (actual.getDay() === 6) observed.setDate(actual.getDate() - 1);
  if (actual.getDay() === 0) observed.setDate(actual.getDate() + 1);

  return observed;
}

export function makeHolidayEvent(
  id: string,
  title: string,
  date: Date | string,
  source: CalendarSource,
  colorName: CalendarColorName,
): CalendarItem {
  const dateKey = typeof date === "string" ? date : localISODate(date);

  return {
    id,
    date: dateKey,
    time: "",
    title,
    area: "Holiday",
    categoryLabel: "Holiday",
    colorId: "holiday",
    colorName,
    allDay: true,
    repeat: "Yearly",
    reminder: "None",
    notes:
      source === "jewish-holiday"
        ? "Jewish holiday shown as an all-day calendar layer."
        : "US holiday shown as an all-day calendar layer.",
    linkedType: "None",
    completed: false,
    source,
  };
}

export function getUsHolidays(year: number): CalendarItem[] {
  const holidays = [
    { title: "New Year’s Day", date: getObservedFixedHoliday(year, 0, 1) },
    {
      title: "Martin Luther King Jr. Day",
      date: getNthWeekdayOfMonth(year, 0, 1, 3),
    },
    {
      title: "Washington’s Birthday",
      date: getNthWeekdayOfMonth(year, 1, 1, 3),
    },
    { title: "Memorial Day", date: getLastWeekdayOfMonth(year, 4, 1) },
    { title: "Juneteenth", date: getObservedFixedHoliday(year, 5, 19) },
    { title: "Independence Day", date: getObservedFixedHoliday(year, 6, 4) },
    { title: "Labor Day", date: getNthWeekdayOfMonth(year, 8, 1, 1) },
    { title: "Columbus Day", date: getNthWeekdayOfMonth(year, 9, 1, 2) },
    { title: "Veterans Day", date: getObservedFixedHoliday(year, 10, 11) },
    { title: "Thanksgiving Day", date: getNthWeekdayOfMonth(year, 10, 4, 4) },
    { title: "Christmas Day", date: getObservedFixedHoliday(year, 11, 25) },
  ];

  return holidays.map((holiday) =>
    makeHolidayEvent(
      `us-holiday-${year}-${slugify(holiday.title)}`,
      holiday.title,
      holiday.date,
      "us-holiday",
      "red",
    ),
  );
}

export function getHebrewMonthName(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
      day: "numeric",
      month: "long",
    }).formatToParts(date);
    return String(
      parts.find((part) => part.type === "month")?.value || "",
    ).toLowerCase();
  } catch {
    return "";
  }
}

export function getHebrewDay(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
      day: "numeric",
      month: "long",
    }).formatToParts(date);
    return Number(parts.find((part) => part.type === "day")?.value || 0);
  } catch {
    return 0;
  }
}

export function jewishHolidayTitleForDate(date: Date) {
  const month = getHebrewMonthName(date);
  const day = getHebrewDay(date);

  if (!month || !day) return "";
  if (month.includes("tish") && day === 1) return "Rosh Hashanah I";
  if (month.includes("tish") && day === 2) return "Rosh Hashanah II";
  if (month.includes("tish") && day === 10) return "Yom Kippur";
  if (month.includes("tish") && day >= 15 && day <= 21)
    return day === 15 ? "Sukkot I" : "Sukkot";
  if (month.includes("tish") && day === 22) return "Shemini Atzeret";
  if (month.includes("tish") && day === 23) return "Simchat Torah";
  if (month.includes("kislev") && day >= 25) return "Chanukah";
  if (month.includes("tevet") && day <= 3) return "Chanukah";
  if ((month.includes("shevat") || month.includes("shvat")) && day === 15)
    return "Tu BiShvat";
  if (month.includes("adar ii") && day === 14) return "Purim";
  if (month === "adar" && day === 14) return "Purim";
  if (month.includes("nisan") && day >= 15 && day <= 22)
    return day === 15 ? "Pesach I" : "Pesach";
  if (month.includes("sivan") && (day === 6 || day === 7))
    return day === 6 ? "Shavuot I" : "Shavuot II";
  if (month.includes("av") && day === 9) return "Tisha B’Av";

  return "";
}

export function getJewishHolidays(year: number): CalendarItem[] {
  const holidays: CalendarItem[] = [];
  const date = new Date(year, 0, 1, 12);

  while (date.getFullYear() === year) {
    const title = jewishHolidayTitleForDate(date);
    if (title) {
      const dateKey = localISODate(date);
      holidays.push(
        makeHolidayEvent(
          `jewish-holiday-${dateKey}-${slugify(title)}`,
          title,
          dateKey,
          "jewish-holiday",
          "purple",
        ),
      );
    }
    date.setDate(date.getDate() + 1);
  }

  return holidays;
}

export function calendarDateValue(date: string) {
  return new Date(`${date}T12:00:00`);
}

export function daysBetween(start: string, end: string) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (calendarDateValue(end).getTime() - calendarDateValue(start).getTime()) /
      oneDay,
  );
}

export function upcomingDayLabel(date: string) {
  const distance = daysBetween(todayISO(), date);
  if (distance === 0) return "Today";
  if (distance === 1) return "Tomorrow";
  if (distance >= 2 && distance <= 5) return `In ${distance} days`;
  return "";
}

export function isRecurringInstanceOnDate(event: CalendarItem, date: string) {
  if (!event.repeat || event.repeat === "None") return event.date === date;
  if (event.date > date) return false;

  const distance = daysBetween(event.date, date);
  if (distance < 0) return false;
  if (event.repeat === "Daily") return true;
  if (event.repeat === "Weekdays") {
    const day = calendarDateValue(date).getDay();
    return day >= 1 && day <= 5;
  }
  if (event.repeat === "Weekly" || event.repeat === "Custom")
    return distance % 7 === 0;

  const original = calendarDateValue(event.date);
  const current = calendarDateValue(date);
  if (event.repeat === "Monthly")
    return current.getDate() === original.getDate();
  if (event.repeat === "Yearly")
    return (
      current.getMonth() === original.getMonth() &&
      current.getDate() === original.getDate()
    );

  return event.date === date;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function getWeekCells(cursor: Date) {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const iso = localISODate(date);
    return {
      key: iso,
      date: iso,
      day: date.getDate(),
      outside: date.getMonth() !== cursor.getMonth(),
    };
  });
}

export const fallbackLocations: AtlasLocationRecord[] = [
  {
    id: "general",
    name: "General",
    type: "Property",
    zone: "2000",
    notes: "Whole-property fallback location.",
  },
  {
    id: "addition",
    name: "Addition",
    type: "Building",
    zone: "Main House",
    notes: "Addition wing including indoor pool area.",
  },
  {
    id: "adu",
    name: "ADU",
    type: "Building",
    zone: "Left of Old Garage",
    notes: "ADU is a location, not an asset.",
  },
  {
    id: "cobalt-lift",
    name: "Cobalt Lift",
    type: "Dock Lift",
    zone: "Dock",
    notes: "Cobalt boat lift and newer Sunstream lift box.",
  },
  {
    id: "courtyard",
    name: "Courtyard",
    type: "Outdoor Living",
    zone: "Main House",
    notes:
      "Patio with chairs/fire pit between main house, addition, old garage, and covered hallway.",
  },
  {
    id: "dock",
    name: "Dock",
    type: "Waterfront",
    zone: "Lake",
    notes:
      "Main dock, boat lift areas, dock power, Sea-Doo area, Cobalt, and lift control boxes.",
  },
  {
    id: "dock-lift",
    name: "Dock Lift Box",
    type: "Lift Controls",
    zone: "Dock",
    notes: "Additional dock lift box.",
  },
  {
    id: "east-lawn",
    name: "East Lawn",
    type: "Grounds",
    zone: "East",
    notes: "Large lawn east/south of the sport court.",
  },
  {
    id: "exterior",
    name: "Exterior",
    type: "Envelope",
    zone: "2000",
    notes:
      "Exterior paint/stain, siding, eaves, deck edges, windows, and envelope checks.",
  },
  {
    id: "house-managers-office",
    name: "House Managers Office",
    type: "Interior",
    zone: "Original House",
    notes: "Office appliance records and house manager operating area.",
  },
  {
    id: "irrigation",
    name: "Irrigation",
    type: "Landscape Systems",
    zone: "Grounds",
    notes:
      "Hunter Hydrawise / Advanced Irrigation records, zones, flow/rain/soil sensors.",
  },
  {
    id: "mechanical-room",
    name: "Mechanical Room",
    type: "Systems",
    zone: "Main House",
    notes:
      "Boilers, DHW tanks, hydronic controls, pumps, pool heat, and HVAC equipment.",
  },
  {
    id: "new-garage",
    name: "New Garage",
    type: "Building",
    zone: "Exterior",
    notes: "New garage / auto court garage area.",
  },
  {
    id: "old-garage",
    name: "Old Garage",
    type: "Building",
    zone: "Exterior",
    notes: "Old garage near ADU and covered connection areas.",
  },
  {
    id: "original-house",
    name: "Original House",
    type: "Building",
    zone: "Main House",
    notes: "Original/main house structure.",
  },
  {
    id: "pantry",
    name: "Pantry",
    type: "Interior",
    zone: "Original House",
    notes: "Pantry freezer, storage, and supplies.",
  },
  {
    id: "pool-changing-room",
    name: "Pool Changing Room",
    type: "Pool",
    zone: "Addition",
    notes: "Pool changing room and ClearRay UV-C ballast area.",
  },
  {
    id: "pool-equipment",
    name: "Pool Equipment Room",
    type: "Pool Systems",
    zone: "Addition",
    notes:
      "Pool filtration, pumps, sand filter, UV/ozone, Desert Aire, and hydronic pool heat equipment.",
  },
  {
    id: "seadoo-lift",
    name: "SeaDoo Lift",
    type: "PWC Lift",
    zone: "Dock",
    notes: "Sea-Doo lift and older/smaller Sunstream box.",
  },
  {
    id: "sport-court",
    name: "Sport Court",
    type: "Recreation",
    zone: "East",
    notes: "Outdoor sport court.",
  },
  {
    id: "standalone-spa",
    name: "Hot Tub / Sundance",
    type: "Spa",
    zone: "Outdoor",
    notes: "Standalone Sundance 880 Optima spa.",
  },
  {
    id: "trampoline-dog",
    name: "Trampoline / Dog",
    type: "Grounds",
    zone: "Exterior",
    notes: "Turf/trampoline/dog cleanup area east of covered hallway.",
  },
  {
    id: "upstairs-laundry",
    name: "Upstairs Laundry",
    type: "Interior",
    zone: "Original House",
    notes: "Upstairs laundry washer/dryer and related assets.",
  },
  {
    id: "veggie-boxes",
    name: "Veggie Boxes",
    type: "Grounds",
    zone: "East",
    notes: "Three vegetable boxes at south end of East Lawn near New Garage.",
  },
  {
    id: "water-trampoline",
    name: "Water Trampoline",
    type: "Waterfront",
    zone: "Lake",
    notes: "Seasonal floating water trampoline location.",
  },
  {
    id: "waterside-lawn-north",
    name: "Waterside Lawn (North)",
    type: "Grounds",
    zone: "Lake",
    notes: "North / lake-facing lawn and beds.",
  },
  {
    id: "wine-room",
    name: "Wine Room",
    type: "Interior",
    zone: "Original House",
    notes: "Wine room equipment and freezer record.",
  },
];

export const defaultMapLabels: MapLabelRecord[] = [
  {
    id: "map-addition",
    label: "Addition",
    category: "Building",
    x: 61,
    y: 36,
    notes: "Addition wing including indoor pool area.",
    photos: [],
  },
  {
    id: "map-adu",
    label: "ADU",
    category: "Location",
    x: 27,
    y: 42,
    notes: "Small square left of Old Garage. ADU is a location, not an asset.",
    photos: [],
  },
  {
    id: "map-cobalt",
    label: "Cobalt",
    category: "Watercraft",
    x: 63,
    y: 72,
    notes: "Cobalt R7 area near the dock.",
    photos: [],
  },
  {
    id: "map-courtyard",
    label: "Courtyard",
    category: "Outdoor Living",
    x: 47,
    y: 44,
    notes:
      "Courtyard patio with chairs/fire pit. West of the gray covered hallway.",
    photos: [],
  },
  {
    id: "map-dock",
    label: "Dock",
    category: "Waterfront",
    x: 58,
    y: 78,
    notes:
      "Main dock location with boat lifts, dock power, and waterfront service records.",
    photos: [],
  },
  {
    id: "map-east-lawn",
    label: "East Lawn",
    category: "Grounds",
    x: 74,
    y: 47,
    notes: "East lawn area and grounds records.",
    photos: [],
  },
  {
    id: "map-hot-tub",
    label: "Hot Tub (Sundance)",
    category: "Spa",
    x: 61,
    y: 51,
    notes:
      "Standalone Sundance 880 spa on patio east of furniture/stairs to lawn.",
    photos: [],
  },
  {
    id: "map-new-garage",
    label: "New Garage",
    category: "Building",
    x: 40,
    y: 31,
    notes: "New garage location.",
    photos: [],
  },
  {
    id: "map-old-garage",
    label: "Old Garage",
    category: "Building",
    x: 33,
    y: 35,
    notes: "Old garage location.",
    photos: [],
  },
  {
    id: "map-original-house",
    label: "Original House",
    category: "Building",
    x: 49,
    y: 38,
    notes: "Original/main house structure.",
    photos: [],
  },
  {
    id: "map-seadoo",
    label: "SeaDoo",
    category: "Watercraft",
    x: 64,
    y: 82,
    notes: "Sea-Doo / PWC area south of the small dock slip.",
    photos: [],
  },
  {
    id: "map-sport-court",
    label: "Sport Court",
    category: "Recreation",
    x: 83,
    y: 26,
    notes: "Sport court north of East Lawn.",
    photos: [],
  },
  {
    id: "map-trampoline-dog",
    label: "Trampoline / Dog",
    category: "Grounds",
    x: 42,
    y: 56,
    notes: "Green turf/trampoline/dog area east of covered hallway.",
    photos: [],
  },
  {
    id: "map-veggie-boxes",
    label: "Veggie Boxes",
    category: "Grounds",
    x: 77,
    y: 62,
    notes:
      "Three veggie boxes at the south end of East Lawn next to New Garage.",
    photos: [],
  },
  {
    id: "map-water-trampoline",
    label: "Water Trampoline",
    category: "Waterfront",
    x: 47,
    y: 86,
    notes: "Seasonal water trampoline location west of the dock.",
    photos: [],
  },
  {
    id: "map-waterside-lawn-north",
    label: "Waterside Lawn (North)",
    category: "Grounds",
    x: 50,
    y: 68,
    notes: "North waterside lawn and lake-facing beds.",
    photos: [],
  },
];

export const fallbackVendors: VendorRecord[] = [
  {
    id: "advancedirrigation",
    name: "Advanced Irrigation",
    category: "Irrigation",
    notes:
      "Hydrawise / Hunter HCC 24-zone irrigation controller, sensors, service, and current-year backflow testing.",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "Parts / Supplies",
    notes: "HVAC filters and general property supplies.",
  },
  {
    id: "elliottpaint",
    name: "Elliott Paint Company",
    category: "Paint / Stain",
    phone: "206-510-0688",
    email: "brandon@elliottpaintco.com",
    notes:
      "Exterior paint/stain vendor. Brandon Ness contact. Kurt Anderson involved in samples/scope walkthroughs.",
  },
  {
    id: "peterclark",
    name: "Peter Clark Designs",
    category: "Landscaping",
    notes:
      "Weekly landscaping/weeding crew approved by Steve and managed by Pat.",
  },
  {
    id: "psf",
    name: "PSF Mechanical",
    category: "HVAC / Boiler / Pool Mechanical",
    notes:
      "Boilers, hydronic heating, HVAC, Desert Aire, pool mechanical, and related systems.",
  },
  {
    id: "seattleboat",
    name: "Seattle Boat",
    category: "Boat Service",
    notes: "Cobalt R7 service and seasonal watercraft support.",
  },
];

export const confirmedAssetCatalog = [
  {
    "sourceId": "4955454",
    "propertyId": "2000",
    "name": "Pool Dehumidifier",
    "status": "Online",
    "location": "Mechanical Room",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Desert Aire",
    "model": "LC05R2WBDTDLAED",
    "serial": "4217D25175",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Important"
  },
  {
    "sourceId": "4955473",
    "propertyId": "2000",
    "name": "HVAC AH-4 (Indoor)",
    "status": "Online",
    "location": "Mechanical Room 2",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "4TXCB036BC3HCBA",
    "serial": "15301R2L5G",
    "description": "West Bedroom (Elyse) Lower floor",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "4955484",
    "propertyId": "2000",
    "name": "HVAC AH-3 (Indoor)",
    "status": "Online",
    "location": "Mechanical Room 2",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "York/Trane",
    "model": "4PXCDU48BS3HAAA",
    "serial": "162944H5CG",
    "description": "Twinned with AH-2 Great Room",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "4955500",
    "propertyId": "2000",
    "name": "Hot Water Storage Tank WHT-2",
    "status": "Online",
    "location": "Mechanical Room",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Viessman",
    "model": "Vitocell 300",
    "serial": "763704480045219",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5003953",
    "propertyId": "2000",
    "name": "HVAC AH-1 (Indoor)",
    "status": "Online",
    "location": "Mechanical Room 2",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "4TXCC049BC3HCBA",
    "serial": "153332BABG",
    "description": "Outside Theater Room Hallway Theatre Room Also goes to Micah's room but is blocked because he is on him own mini split",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5003986",
    "propertyId": "2000",
    "name": "HVAC AH-2 (Indoor)",
    "status": "Online",
    "location": "Mechanical Room 2",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "GAM5B036M31SBA",
    "serial": "16035SHYAV",
    "description": "Twinned with AH-3 Great room",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004012",
    "propertyId": "2000",
    "name": "HVAC AH-5 (Indoor)",
    "status": "Online",
    "location": "Mechanical Room",
    "category": "HVAC / Mechanical",
    "year": "2018",
    "manufacturer": "Carrier",
    "model": "CNPVP3617ALAAAAA",
    "serial": "3118X76316",
    "description": "Zone 1- Nanny (New Gym) Zone 2-Bonus Zone 3-Kitchen Zone 4-Exercise",
    "vendors": "Amazon,P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004033",
    "propertyId": "2000",
    "name": "Hot Water Storage Tank WHT-1",
    "status": "Online",
    "location": "Mechanical Room",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Viessman",
    "model": "Vitocell 300",
    "serial": "767044800454103",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004054",
    "propertyId": "2000",
    "name": "Boiler B-2",
    "status": "Online",
    "location": "Mechanical Room",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Viessman",
    "model": "Vitodens 200",
    "serial": "",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004074",
    "propertyId": "2000",
    "name": "Boiler B-1",
    "status": "Online",
    "location": "General",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Viessman",
    "model": "Vitodens 200",
    "serial": "",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004097",
    "propertyId": "2000",
    "name": "HVAC HP-123 (Outdoor)",
    "status": "Online",
    "location": "Outdoor Generator Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Mitsubishi",
    "model": "MXZ-8C48NA",
    "serial": "7YU02384A",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004102",
    "propertyId": "2000",
    "name": "HVAC CU-1 (Outdoor)",
    "status": "Online",
    "location": "Outdoor Condenser Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "4TTX6048H1000AA",
    "serial": "15284N3E2F",
    "description": "Outdoor Unit controls AH-1 Theater Hallway Micah's (blocked because he is on his own mini split)",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004108",
    "propertyId": "2000",
    "name": "HVAC CU-3 (Outdoor)",
    "status": "Online",
    "location": "Outdoor Condenser Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "4TTX6048H1000AA",
    "serial": "16112MRE2F",
    "description": "Outdoor unit controls AH-3 Twinned with AH-2 and CU-2 Great Room",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004114",
    "propertyId": "2000",
    "name": "HVAC CU-2 (Outdoor)",
    "status": "Online",
    "location": "Outdoor Condenser Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "4TTX6048H1000AA",
    "serial": "16112MR52F",
    "description": "Outdoor unit controls AH-2 Twinned with AH-3 and CU-3 Great Room",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004115",
    "propertyId": "2000",
    "name": "HVAC CU-4 (Outdoor)",
    "status": "Online",
    "location": "Outdoor Condenser Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Trane",
    "model": "4TTX6036H1000AA",
    "serial": "15255T5Y2F",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004121",
    "propertyId": "2000",
    "name": "HVAC CU-5 (Outdoor)",
    "status": "Online",
    "location": "Outdoor Condenser Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Carrier",
    "model": "24VNA936A300",
    "serial": "3417E25728",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004125",
    "propertyId": "2000",
    "name": "Outdoor Dehumidifier",
    "status": "Online",
    "location": "Outdoor Condenser Area",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Luvata",
    "model": "LCS5411-024-3C",
    "serial": "J1740000021",
    "description": "",
    "vendors": "P.S.F",
    "criticality": "Important"
  },
  {
    "sourceId": "5004129",
    "propertyId": "2000",
    "name": "Steam Generator Attic",
    "status": "Online",
    "location": "General",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Amerec",
    "model": "AK11",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": "Important"
  },
  {
    "sourceId": "5004131",
    "propertyId": "2000",
    "name": "HVAC HP-2 (Indoor)",
    "status": "Online",
    "location": "Attic 2",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Mitsubishi",
    "model": "MVZ-A18AA7",
    "serial": "78G00811",
    "description": "Master Bedroom Controlled by Mitsubishi mini split on roof (2024)",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004132",
    "propertyId": "2000",
    "name": "HVAC HP-1 (Indoor)",
    "status": "Online",
    "location": "Attic",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Mitsubishi",
    "model": "MVZ-A12AA7",
    "serial": "77G00385",
    "description": "Elliot Room Elans Room Boys Bathroom",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004135",
    "propertyId": "2000",
    "name": "HVAC HP-3 (Indoor)",
    "status": "Online",
    "location": "Upstairs Laundry Closet",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Mitsubishi",
    "model": "MVZ-A18AA7",
    "serial": "78G00803",
    "description": "Evi's Room Upstairs Play Hallway",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "5004136",
    "propertyId": "2000",
    "name": "Wine Room Cooler 1",
    "status": "Online",
    "location": "Wine Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Euro Cave",
    "model": "V-PURE-L",
    "serial": "1290880",
    "description": "",
    "vendors": "Electromatic Refrigeration",
    "criticality": ""
  },
  {
    "sourceId": "5004137",
    "propertyId": "2000",
    "name": "Wine Room Cooler 2",
    "status": "Online",
    "location": "Wine Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Euro Cave",
    "model": "V-PURE-L",
    "serial": "1288614",
    "description": "",
    "vendors": "Electromatic Refrigeration",
    "criticality": ""
  },
  {
    "sourceId": "5004141",
    "propertyId": "2000",
    "name": "Wine Room Cooler 3",
    "status": "Online",
    "location": "Wine Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Euro Cave",
    "model": "V-PURE-L",
    "serial": "1290879",
    "description": "",
    "vendors": "Electromatic Refrigeration",
    "criticality": ""
  },
  {
    "sourceId": "5004142",
    "propertyId": "2000",
    "name": "Wine Room Cooler 4",
    "status": "Online",
    "location": "Wine Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Euro Cave",
    "model": "V-PURE-L",
    "serial": "1288605",
    "description": "",
    "vendors": "Electromatic Refrigeration",
    "criticality": ""
  },
  {
    "sourceId": "5004153",
    "propertyId": "2000",
    "name": "Wine Chiller",
    "status": "Online",
    "location": "Formal Dining Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "zyphyr",
    "model": "uwn24c02bg",
    "serial": "1163025JUU",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004159",
    "propertyId": "2000",
    "name": "Freezer FR-4",
    "status": "Online",
    "location": "Kitchen",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Sub Zero",
    "model": "ID-30FI",
    "serial": "G5701862",
    "description": "",
    "vendors": "Appliance Service Station",
    "criticality": ""
  },
  {
    "sourceId": "5004333",
    "propertyId": "2000",
    "name": "Freezer FR-3",
    "status": "Online",
    "location": "Pool",
    "category": "Appliance",
    "year": "",
    "manufacturer": "FISHER & PAYKEL",
    "model": "RB36S",
    "serial": "AAG868334",
    "description": "",
    "vendors": "Appliance Service Station",
    "criticality": ""
  },
  {
    "sourceId": "5004336",
    "propertyId": "2000",
    "name": "Freezer FR-2",
    "status": "Online",
    "location": "Pool",
    "category": "Appliance",
    "year": "",
    "manufacturer": "FISHER & PAYKEL",
    "model": "RB36S",
    "serial": "AAG871957",
    "description": "",
    "vendors": "Appliance Service Station",
    "criticality": ""
  },
  {
    "sourceId": "5004338",
    "propertyId": "2000",
    "name": "Freezer FR-1",
    "status": "Online",
    "location": "Pantry",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Frigidaire",
    "model": "FPFU19F8RFE",
    "serial": "WB84468136",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004342",
    "propertyId": "2000",
    "name": "Refrigerator (Left)",
    "status": "Online",
    "location": "Kitchen",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Sub Zero",
    "model": "IC-36R",
    "serial": "G5726874",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004349",
    "propertyId": "2000",
    "name": "Refrigerator",
    "status": "Online",
    "location": "Fitness Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Marvel",
    "model": "ML24RAS1RS",
    "serial": "20180417053H",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004353",
    "propertyId": "2000",
    "name": "Generator (Upper)",
    "status": "Online",
    "location": "Outdoor Generator Area",
    "category": "Generator",
    "year": "",
    "manufacturer": "Kohler",
    "model": "20RESC",
    "serial": "339TGVFN0070",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004355",
    "propertyId": "2000",
    "name": "Generator (Lower)",
    "status": "Online",
    "location": "Outdoor Generator Area",
    "category": "Generator",
    "year": "",
    "manufacturer": "Kohler",
    "model": "20RESA",
    "serial": "SGM3263PC",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004356",
    "propertyId": "2000",
    "name": "Dryer DR-3",
    "status": "Online",
    "location": "House Managers Office",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Electolux",
    "model": "",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004360",
    "propertyId": "2000",
    "name": "Dryer DR-2",
    "status": "Online",
    "location": "Pool Changing Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Electolux",
    "model": "Efme617stto",
    "serial": "4D81008923",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004365",
    "propertyId": "2000",
    "name": "Dryer DR-1",
    "status": "Online",
    "location": "Upstairs Laundry Closet",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Electolux",
    "model": "Efme617stto",
    "serial": "4d80932379",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004377",
    "propertyId": "2000",
    "name": "Washer WM-3",
    "status": "Online",
    "location": "House Managers Office",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Electolux",
    "model": "",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004382",
    "propertyId": "2000",
    "name": "Washer WM-2",
    "status": "Online",
    "location": "Pool Changing Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Electolux",
    "model": "",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004389",
    "propertyId": "2000",
    "name": "Washer WM-1",
    "status": "Online",
    "location": "Upstairs Laundry Closet",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Electolux",
    "model": "",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004397",
    "propertyId": "2000",
    "name": "Dishwasher DW-4 (Left)",
    "status": "Online",
    "location": "Kitchen",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Bosch",
    "model": "SHV88PW53N/10",
    "serial": "FD980500530",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004399",
    "propertyId": "2000",
    "name": "Dishwasher DW-3 (Right)",
    "status": "Online",
    "location": "Kitchen",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Bosch",
    "model": "SHV88PW53N/11",
    "serial": "FD981100351",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004400",
    "propertyId": "2000",
    "name": "Dishwasher DW-2",
    "status": "Online",
    "location": "House Managers Office",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Bosch",
    "model": "SHE55M15UC/64",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5004402",
    "propertyId": "2000",
    "name": "Dishwasher DW-1",
    "status": "Online",
    "location": "Fitness Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Bosch",
    "model": "SPV68U53UC/42",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "5088482",
    "propertyId": "2000",
    "name": "Hottub",
    "status": "Online",
    "location": "Back Patio (water side)",
    "category": "Pool & Spa",
    "year": "2014",
    "manufacturer": "Sundance",
    "model": "880",
    "serial": "",
    "description": "Sundance spa 880 series",
    "vendors": "Aqua Quip",
    "criticality": ""
  },
  {
    "sourceId": "5226122",
    "propertyId": "2000",
    "name": "Craft-Cobalt R-7",
    "status": "Online",
    "location": "Dock",
    "category": "Marine / Watercraft",
    "year": "2020",
    "manufacturer": "Cobalt",
    "model": "R-7",
    "serial": "FGE7S0561920",
    "description": "d394265",
    "vendors": "O'Ryan Marine,Seattle Boat",
    "criticality": ""
  },
  {
    "sourceId": "5247036",
    "propertyId": "2000",
    "name": "West Steam Generator",
    "status": "Online",
    "location": "West side of House",
    "category": "HVAC / Mechanical",
    "year": "8-28-2014",
    "manufacturer": "Amerec",
    "model": "AK-14",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": "Important"
  },
  {
    "sourceId": "5249519",
    "propertyId": "2000",
    "name": "Irrigation Lake Water Meter",
    "status": "Online",
    "location": "2000",
    "category": "Irrigation",
    "year": "2019",
    "manufacturer": "SENSUS",
    "model": "SR-11",
    "serial": "69154206",
    "description": "We need to write down on the Maintenance Log the Meter reading for each Friday regardless if it has changed or not",
    "vendors": "",
    "criticality": "Critical"
  },
  {
    "sourceId": "5287144",
    "propertyId": "2000",
    "name": "Invisible Fence",
    "status": "Online",
    "location": "Vegetable Garden",
    "category": "Grounds Equipment",
    "year": "2024",
    "manufacturer": "Invisible Fence",
    "model": "",
    "serial": "",
    "description": "Change batteries for fake rock in veggie garden and nw lawn",
    "vendors": "Invisible Fence",
    "criticality": ""
  },
  {
    "sourceId": "5508668",
    "propertyId": "2000",
    "name": "Vehicle Ford 1-50",
    "status": "Online",
    "location": "Garage (new)",
    "category": "Vehicle",
    "year": "2023",
    "manufacturer": "Ford",
    "model": "F-150",
    "serial": "1FTFW1RG0PFA87887",
    "description": "Jeremies Raptor",
    "vendors": "AutoNation Ford Bellevue",
    "criticality": "Normal"
  },
  {
    "sourceId": "5508670",
    "propertyId": "2000",
    "name": "Vehicle Mercedes GL",
    "status": "Online",
    "location": "General",
    "category": "Vehicle",
    "year": "2015",
    "manufacturer": "Mercedes Benz",
    "model": "GL",
    "serial": "4JGDF7DE8FA469902",
    "description": "Family SUV",
    "vendors": "",
    "criticality": "Normal"
  },
  {
    "sourceId": "5508672",
    "propertyId": "2000",
    "name": "Vehicle Audi E-Tron GT",
    "status": "Online",
    "location": "Garage (old)",
    "category": "Vehicle",
    "year": "",
    "manufacturer": "Audi",
    "model": "E-Tron GT",
    "serial": "",
    "description": "Jeremies Car",
    "vendors": "",
    "criticality": "Normal"
  },
  {
    "sourceId": "5508693",
    "propertyId": "2000",
    "name": "HVAC HP-4 (outdoor) MR",
    "status": "Online",
    "location": "Roof",
    "category": "HVAC / Mechanical",
    "year": "",
    "manufacturer": "Mitsubishi",
    "model": "MUZ-FS12NA",
    "serial": "33c30899",
    "description": "Micah's Room installed 24",
    "vendors": "P.S.F,Supply House",
    "criticality": "Normal"
  },
  {
    "sourceId": "5508694",
    "propertyId": "2000",
    "name": "HVAC HP-5 (outdoor)",
    "status": "Online",
    "location": "Roof",
    "category": "HVAC / Mechanical",
    "year": "06/23",
    "manufacturer": "Mitsubishi",
    "model": "MUZ-FS18NA",
    "serial": "3010164 T",
    "description": "Master bedroom",
    "vendors": "P.S.F,Supply House",
    "criticality": "Normal"
  },
  {
    "sourceId": "6042825",
    "propertyId": "2000",
    "name": "Craft-SeaDoo 2024",
    "status": "Online",
    "location": "Dock",
    "category": "Marine / Watercraft",
    "year": "2024",
    "manufacturer": "SeeDoo",
    "model": "GTI SE 170",
    "serial": "YDV81960E424",
    "description": "2024 SeaDoo GTI 170 IBR",
    "vendors": "I90 Motorsports,O'Ryan Marine",
    "criticality": "Important"
  },
  {
    "sourceId": "7609221",
    "propertyId": "2000",
    "name": "Pool",
    "status": "Offline",
    "location": "Pool",
    "category": "Pool & Spa",
    "year": "2018",
    "manufacturer": "Krisco",
    "model": "",
    "serial": "",
    "description": "Indoor Swimming Pool Krisco Pools",
    "vendors": "Amazon,Aqua Quip,Krisco Pool and Spas",
    "criticality": "Important"
  },
  {
    "sourceId": "8002871",
    "propertyId": "2000",
    "name": "Marantec WKE",
    "status": "Online",
    "location": "2000",
    "category": "Garage Systems",
    "year": "",
    "manufacturer": "Marantec",
    "model": "M13-631",
    "serial": "",
    "description": "Wireless keypad Entry for both garages.",
    "vendors": "",
    "criticality": "Normal"
  },
  {
    "sourceId": "8388626",
    "propertyId": "2000",
    "name": "Vehicle Rivian",
    "status": "Online",
    "location": "2000",
    "category": "Vehicle",
    "year": "2025",
    "manufacturer": "Rivian",
    "model": "R1S",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": "Normal"
  },
  {
    "sourceId": "9572201",
    "propertyId": "2000",
    "name": "Freezer FR-5",
    "status": "Online",
    "location": "Wine Room",
    "category": "Appliance",
    "year": "",
    "manufacturer": "FISHER & PAYKEL",
    "model": "RB36S",
    "serial": "AAG871948",
    "description": "Inspect the gaskets. Check the freezer temperature. Clean the condenser coil",
    "vendors": "Appliance Service Station",
    "criticality": "Important"
  },
  {
    "sourceId": "10121102",
    "propertyId": "2000",
    "name": "Lynx Grill",
    "status": "Online",
    "location": "Back Patio (water side)",
    "category": "Outdoor Kitchen",
    "year": "",
    "manufacturer": "Lynx",
    "model": "L36PSFR-2-NG",
    "serial": "L36PSFR-2-NG",
    "description": "BBQ",
    "vendors": "LUWA",
    "criticality": ""
  },
  {
    "sourceId": "14981184",
    "propertyId": "2000",
    "name": "Wine Frige",
    "status": "Online",
    "location": "Mechanical Room 2",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Lanbo",
    "model": "LW",
    "serial": "",
    "description": "wine overflow fridge",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "14982391",
    "propertyId": "2000",
    "name": "FloLogic",
    "status": "Online",
    "location": "General",
    "category": "Plumbing / Water",
    "year": "2020",
    "manufacturer": "FloLogic",
    "model": "ACT3003",
    "serial": "SP 7424F",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "14983783",
    "propertyId": "2000",
    "name": "Home Water Filter",
    "status": "Online",
    "location": "General",
    "category": "Plumbing / Water",
    "year": "",
    "manufacturer": "Environmental Water Systmes",
    "model": "CWL-1354-7000",
    "serial": "22764",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15019911",
    "propertyId": "hangar",
    "name": "Plane Pilatus PC12 N126AI",
    "status": "Online",
    "location": "Hangar",
    "category": "Aircraft",
    "year": "",
    "manufacturer": "Pilatus",
    "model": "PC12",
    "serial": "N126AI",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15020020",
    "propertyId": "hangar",
    "name": "Plane Gulfstream G280 N28CC",
    "status": "Online",
    "location": "Hangar",
    "category": "Aircraft",
    "year": "2012",
    "manufacturer": "Gulfstream",
    "model": "G280",
    "serial": "N28CC",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15020252",
    "propertyId": "hangar",
    "name": "Plane Gulfstream G280 N755PA",
    "status": "Online",
    "location": "Hangar",
    "category": "Aircraft",
    "year": "2012",
    "manufacturer": "Gulfstream",
    "model": "G280",
    "serial": "N755PA",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15020267",
    "propertyId": "hangar",
    "name": "Plane Gulfstream G600 N23PA",
    "status": "Online",
    "location": "Hangar",
    "category": "Aircraft",
    "year": "",
    "manufacturer": "Gulfstream",
    "model": "G600",
    "serial": "N23PA",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15021066",
    "propertyId": "2000",
    "name": "Blinds Lutron",
    "status": "Online",
    "location": "General",
    "category": "Window Treatments",
    "year": "",
    "manufacturer": "Lutron",
    "model": "Sivoia QS",
    "serial": "",
    "description": "video to fix high and low limit- https://youtu.be/j_eVnCgQ0Ug",
    "vendors": "Andersen Installation inc.",
    "criticality": ""
  },
  {
    "sourceId": "15097000",
    "propertyId": "2000",
    "name": "Garage Door Openers",
    "status": "Online",
    "location": "General",
    "category": "Garage Systems",
    "year": "",
    "manufacturer": "Marantec",
    "model": "Synergy 370",
    "serial": "",
    "description": "Synergy 370",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15131638",
    "propertyId": "2000",
    "name": "Blinds Hunter Douglas",
    "status": "Online",
    "location": "Elyse's Room",
    "category": "Window Treatments",
    "year": "",
    "manufacturer": "hunter douglas",
    "model": "Deuett",
    "serial": "",
    "description": "Video to fix blinds: https://youtu.be/zQTkBF4hmCw",
    "vendors": "A All Pro Blinds,Andersen Installation inc.",
    "criticality": ""
  },
  {
    "sourceId": "15314047",
    "propertyId": "2000",
    "name": "wolfe range",
    "status": "Online",
    "location": "Kitchen",
    "category": "Appliance",
    "year": "",
    "manufacturer": "",
    "model": "",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  },
  {
    "sourceId": "15349974",
    "propertyId": "2000",
    "name": "Range-Wolf",
    "status": "Online",
    "location": "Kitchen",
    "category": "Appliance",
    "year": "",
    "manufacturer": "Wolf",
    "model": "SRT-486G",
    "serial": "18370250",
    "description": "Wolf Stove Top",
    "vendors": "LUWA",
    "criticality": "Normal"
  },
  {
    "sourceId": "15910478",
    "propertyId": "2000",
    "name": "Boiler B-2 New",
    "status": "Online",
    "location": "Mechanical Room",
    "category": "HVAC / Mechanical",
    "year": "2025",
    "manufacturer": "Viessman",
    "model": "Vitodens 200",
    "serial": "758960507593",
    "description": "",
    "vendors": "P.S.F,Supply House",
    "criticality": "Critical"
  },
  {
    "sourceId": "15912110",
    "propertyId": "2000",
    "name": "Golf Simulator",
    "status": "Online",
    "location": "Garage (new)",
    "category": "Recreation",
    "year": "",
    "manufacturer": "Skytrak",
    "model": "ST-Max",
    "serial": "",
    "description": "Golf Simulator",
    "vendors": "",
    "criticality": "Critical"
  },
  {
    "sourceId": "16616596",
    "propertyId": "2000",
    "name": "Hunter Irrigation Controller",
    "status": "Online",
    "location": "2000",
    "category": "Irrigation",
    "year": "",
    "manufacturer": "Hunter",
    "model": "HCC 24 Zones",
    "serial": "06d050377d",
    "description": "New Irrigation Controller",
    "vendors": "Advanced Irrigation",
    "criticality": ""
  },
  {
    "sourceId": "16616782",
    "propertyId": "2000",
    "name": "Hunter Irrigation Controller",
    "status": "Online",
    "location": "General",
    "category": "Irrigation",
    "year": "",
    "manufacturer": "Hunter",
    "model": "HCC 24one",
    "serial": "06d050377d",
    "description": "",
    "vendors": "Advanced Irrigation",
    "criticality": ""
  },
  {
    "sourceId": "18482385",
    "propertyId": "2000",
    "name": "Landscaping",
    "status": "Online",
    "location": "2000",
    "category": "General",
    "year": "",
    "manufacturer": "",
    "model": "",
    "serial": "",
    "description": "",
    "vendors": "",
    "criticality": ""
  }
] as const;

export const fallbackAssets: AssetRecord[] = [
  {
    id: "boiler-1",
    name: "Boiler B-1",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Online",
    make: "Viessmann",
    model: "Vitodens 200 / 200-W",
    serial: "758960502925",
    notes: "Wall-mounted Viessmann Vitodens 200.",
    vendorIds: ["psf"],
  },
  {
    id: "boiler-2",
    name: "Boiler B-2",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Monitor",
    make: "Viessmann",
    model: "Vitodens 200 / 200-W",
    serial: "758960507593",
    notes: "Monitor after recall / heat exchanger / igniter issue.",
    vendorIds: ["psf"],
  },
  {
    id: "craft-cobalt",
    name: "Craft — Cobalt R7",
    locationId: "dock",
    category: "Watercraft",
    status: "Seasonal",
    make: "Cobalt",
    model: "R7",
    serial: "HIN FGE7S0561920",
    notes: "2020 Cobalt R7. WA WN4528SW.",
    vendorIds: ["seattleboat"],
  },
  {
    id: "irrigation-controller",
    name: "Hunter HCC 24-Zone Irrigation Controller",
    locationId: "irrigation",
    category: "Irrigation",
    status: "Online",
    make: "Hunter",
    model: "HCC 24 Zones",
    serial: "06d050377d",
    notes: "Hydrawise controller name Faben2000.",
    vendorIds: ["advancedirrigation"],
  },
];

export const fallbackWorkOrders: AtlasServiceRecord[] = [
  {
    id: "wo-pool-weekly",
    assetId: "boiler-2",
    vendorId: "psf",
    date: todayISO(),
    title: "Boiler 2 recalled heat exchanger / igniter issue",
    status: "Monitor",
    priority: "Medium",
    notes: "Track Boiler B-2 issue.",
    recurring: false,
    recurrenceInterval: 1,
    recurrenceUnit: "Years",
    season: "Year-Round",
    completionHistory: [],
  },
  {
    id: "wo-landscape-weeding",
    assetId: "irrigation-controller",
    vendorId: "peterclark",
    date: todayISO(),
    title: "Weekly landscaping crew — waterside beds first",
    status: "Scheduled",
    priority: "Medium",
    notes: "Pat manages crew. Priority: waterside beds first.",
    recurring: true,
    recurrenceInterval: 1,
    recurrenceUnit: "Weeks",
    season: "Summer",
    completionHistory: [],
  },
];

export const fallbackProcedures: ProcedureRecord[] = [
  {
    id: "weekly-routine",
    title: "Weekly 5-Day Routine",
    area: "2000",
    priority: "High",
    steps: [
      "Monday: trash/recycle/yard waste and clean cans.",
      "Tuesday: grounds/lawn/irrigation and 10 AM meeting.",
      "Wednesday: pool/spa/fountain/courtyard.",
      "Thursday: vehicles/dock/boat/Sea-Doo/recreation.",
      "Friday: final walkthrough/testing/updates and 9 AM meeting.",
    ],
  },
  {
    id: "boat-dock-party",
    title: "Boat/Dock Party",
    area: "Boat / Dock",
    priority: "High",
    steps: [
      "SECTION: Sign Preparation",
      "Prepare and place required signs.",
      "SECTION: Parking Area Preparation",
      "Prepare and inspect the parking area.",
      "SECTION: Tree and Pathway Maintenance",
      "Inspect and clean trees, paths, and approaches.",
      "SECTION: Lawn Maintenance",
      "Mow, edge, blow, and present lawns for guests.",
      "SECTION: Lighting Check",
      "Test outdoor, pathway, dock, and event lighting.",
      "SECTION: Dock and Sport Court Preparation",
      "Clean and prepare the dock and sport court.",
      "SECTION: Final Preparations",
      "Complete a final walkthrough and correct remaining issues.",
    ],
  },
  {
    id: "out-of-town-to-do-list",
    title: "Out of Town To Do List",
    area: "2000",
    priority: "High",
    steps: [
      "SECTION: Inside Tasks",
      "Complete the interior checks shown in the MaintainX checklist.",
      "SECTION: Outside Tasks",
      "Complete the exterior, grounds, dock, and equipment checks shown in the MaintainX checklist.",
      "Review the original screenshots before activating this procedure because some item wording was not fully visible.",
    ],
  },
  {
    id: "city-water-irrigation",
    title: "City Water Irrigation",
    area: "Irrigation",
    priority: "High",
    steps: [
      "Steps to change irrigation from lake water to city water.",
      "Shut off lake water pump.",
      "Shut off green valve to the right.",
      "Remove P/MV wire from controller.",
      "Turn on city water valve at the street.",
      "Test with remote controller.",
    ],
  },
  {
    id: "spring-dock-preparation",
    title: "Spring Dock Preparation",
    area: "Boat / Dock",
    priority: "Seasonal",
    steps: [
      "Prepare the dock and associated equipment for seasonal use.",
      "SECTION: Boat Preparation",
      "Clean the interior of the boat.",
      "Clean the exterior of the boat.",
      "Install carpet on the boat.",
      "SECTION: Lift and Storage Box Maintenance",
      "Clean the Cobalt lift box.",
      "Clean the Sea-Doo lift box.",
      "Clean the dock lift box.",
      "Clean and organize the storage box.",
      "SECTION: De-winterization",
      "De-winterize the Sea-Doo.",
      "De-winterize the Cobalt.",
      "SECTION: Dock Maintenance",
      "Install solar bug zapper.",
      "Clean the dock and dock extension.",
      "Check dock lights.",
    ],
  },
  {
    id: "power-outage",
    title: "Power Outage (Draft)",
    area: "Mechanical Room",
    priority: "High",
    steps: [
      "DRAFT — review technical instructions before use.",
      "Check both boilers for faults; follow the on-screen correction steps if a fault is shown.",
      "Check the make-up water container; it should contain 6 gallons. Fill from the hose bib above if needed.",
      "Check recirculation-pump PSI. If under 20, fill the boilers using the hose bib above the make-up water container.",
      "Check pool temperature on the Desert Aire screen.",
      "Recheck PSI every 30 minutes and add water if below 20.",
      "After pressures balance, noises should stop and equipment should return to normal operation.",
    ],
  },
  {
    id: "fertilize-lawn",
    title: "Fertilize Lawn",
    area: "Landscaping",
    priority: "Seasonal",
    steps: [
      "Every 6–8 weeks according to the soil sample.",
      "Mow lawn.",
      "Fill spreader with fertilizer.",
      "Spread evenly across lawn.",
      "Blow fertilizer off pavers, sport court, and driveway.",
      "Water all lawns.",
    ],
  },
  {
    id: "cushion-storage-winter",
    title: "Cushion Storage for Winter",
    area: "Exterior",
    priority: "Seasonal",
    steps: [
      "Bring exterior cushions to the basement to dry.",
      "After dry, vacuum all cushions.",
      "Spray stains with fabric cleaner and scrub.",
      "Steam-clean stained areas and remove all suds.",
      "Lay cushions out to dry.",
      "Bag each sitting area together.",
      "Store in crawlspace until spring.",
      "Obtain completion sign-off.",
    ],
  },
  {
    id: "yearly-service-wine-cooler",
    title: "Yearly Service of Wine Cooler",
    area: "Wine Cooling",
    priority: "Seasonal",
    steps: [
      "Unplug and unload the appliance.",
      "Vacuum the condenser on the back of the appliance.",
      "Clean the inside compartment with water and a gentle cleaning product.",
      "Rinse thoroughly.",
      "Dry with a soft rag.",
      "Replace the charcoal filter in the breather hole at the top of the cabinet.",
      "One lower source item was obscured and must be reviewed before adding.",
    ],
  },
  {
    id: "winterizing-cobalt",
    title: "Winterizing Cobalt",
    area: "Boat / Dock",
    priority: "Seasonal",
    steps: [
      "Schedule Seattle Boat.",
      "Remove and store carpets.",
      "Install snap covers for winter.",
      "Plug in dehumidifier.",
      "Vacuum and sweep the boat.",
      "Install automatic cover.",
      "Check weekly.",
      "Obtain completion sign-off.",
    ],
  },
  {
    id: "generator-maintenance",
    title: "Generator Maintenance",
    area: "Generators",
    priority: "High",
    steps: [
      "Check generator belt for wear.",
      "Change air filters.",
      "Remove and inspect spark plugs; replace after 1,000 hours.",
      "Check oil level in sight glass; if oil is visible, do not add oil.",
      "Inspect V-belt tension and wear; replace if cracked.",
    ],
  },
  {
    id: "pool-heater-burner-inspection",
    title: "Pool Heater / Burner System Inspection (Draft)",
    area: "Pool Equipment",
    priority: "High",
    steps: [
      "DRAFT — confirm exact title and linked asset before use.",
      "Replace sand in filter every 5 years.",
      "Visually inspect and clean wiring and burner system; contact vendor if damage is found.",
      "Inspect burner chamber for scaling inside tubes / heat exchanger.",
      "Check for leaks near the pressure-relief valve.",
      "Inspect seals and fittings.",
    ],
  },
  {
    id: "inverter-maintenance",
    title: "Inverter Maintenance (Draft)",
    area: "Electrical",
    priority: "Normal",
    steps: [
      "DRAFT — confirm exact inverter asset and location before use.",
      "Verify switches are set to Auto or On.",
      "Check wiring and electrical connections.",
      "Clean inverter of dust and debris.",
      "Inspect inverter display for error messages.",
      "Confirm inverter is operating as expected.",
      "Verify correct AC and DC voltage.",
    ],
  },
  {
    id: "low-voltage-controls-inspection",
    title: "Low-Voltage Panels / Controls Inspection",
    area: "Low Voltage / Controls",
    priority: "Normal",
    steps: [
      "Test all exterior lighting and replace failed bulbs.",
      "Check each panel for damage and corrosion.",
      "Clean panels of dust and debris.",
      "Inspect wiring and burned equipment.",
      "Power down and clean panel interiors with compressed air.",
      "Tighten loose screws.",
      "Test operating voltage and lighting battery backup.",
      "Check all cameras and schedules.",
      "Test network connections.",
      "Test fuses and breakers, including phone and lighting panels.",
    ],
  },
  {
    id: "boat-cleaning",
    title: "Boat Cleaning",
    area: "Cobalt R7",
    priority: "Normal",
    steps: [
      "Clean the outside of the boat; use saltwater wash if very dirty, otherwise regular boat wash. Wash top to bottom with a wash brush and towel dry.",
      "Clean seats throughout the boat with multipurpose boat cleaner.",
      "Clean windshield inside and out with streak-free cleaner.",
      "Wipe stainless steel.",
      "Clean interior bathroom.",
      "Make sure the automatic cover is on when finished.",
    ],
  },
  {
    id: "pool-daily-treatment-cleaning",
    title: "Pool Daily Treatment / Pool Cleaning (Draft)",
    area: "Indoor Pool",
    priority: "High",
    steps: [
      "DRAFT — chemical wording must be confirmed before activation.",
      "Keep 10 tabs in the reservoir.",
      "Clean both skimmer baskets.",
      "Empty the in-floor vacuum basket.",
      "Check and empty the pool filter basket.",
      "Clean the vacuum screen.",
      "Vacuum the pool floor.",
      "Brush the pool.",
      "Fill the pool with well water as needed.",
      "Leave the on/off switch on.",
      "Setting was 50% as of 1/25/2026.",
      "Inspect daily.",
      "Chlorine and bromine source instructions were obscured; do not guess or activate them.",
    ],
  },
];

export const fallbackCalendar: CalendarItem[] = [
  {
    id: "cal-friday-meeting",
    date: todayISO(),
    time: "9:00 AM",
    title: "Friday 9 AM Steve meeting",
    area: "Personal / Owner",
    categoryLabel: "Personal / Owner",
    colorId: "personal-owner",
    colorName: "yellow",
    reminder: "Morning of",
    repeat: "Weekly",
    source: "manual",
  },
  {
    id: "cal-tuesday-meeting",
    date: todayISO(),
    time: "10:00 AM",
    title: "Tuesday 10 AM Steve / Patrick meeting",
    area: "Landscaping",
    categoryLabel: "Landscaping",
    colorId: "landscaping",
    colorName: "green",
    reminder: "Morning of",
    repeat: "Weekly",
    source: "manual",
  },
  {
    id: "cal-sunstream",
    date: "2026-07-10",
    time: "",
    title: "Sunstream Boat Cover",
    area: "Boat / Dock",
    categoryLabel: "Boat / Dock",
    colorId: "boat-dock",
    colorName: "blue",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
  {
    id: "cal-seaborne",
    date: "2026-07-13",
    time: "",
    title: "SeaBorne Dock Work",
    area: "Boat / Dock",
    categoryLabel: "Boat / Dock",
    colorId: "boat-dock",
    colorName: "blue",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
  {
    id: "cal-carpet-prep",
    date: "2026-07-21",
    time: "",
    title: "Prep Evis Room for Carpet",
    area: "Other",
    categoryLabel: "Other",
    colorId: "other",
    colorName: "gray",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
  {
    id: "cal-flooring",
    date: "2026-07-22",
    time: "",
    title: "5 Star Flooring / Eric — Evi's room",
    area: "Vendor",
    categoryLabel: "Vendor",
    colorId: "vendor",
    colorName: "purple",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
];

export const fallbackParts: PartRecord[] = [
  {
    id: "filters-aprilaire-210",
    name: "Aprilaire #210 4x20x25 Filter",
    category: "HVAC Filters",
    locationId: "mechanical-room",
    vendorId: "amazon",
    quantity: 1,
    minQuantity: 1,
    status: "Low",
    notes: "Amazon filter record.",
  },
];

export const defaultWorkLinks: WorkLinkRecord[] = [
  {
    id: "flologic",
    name: "FloLogic",
    category: "Water / Leak Protection",
    vendor: "FloLogic",
    url: "https://myflologic.com/",
    logoText: "FL",
    logoBg: "#EAF7F1",
    logoUrl: "https://myflologic.com/favicon.ico",
    logoColor: colors.green,
    notes: "FloLogic property water monitoring and automatic shutoff portal.",
  },
  {
    id: "hubspace",
    name: "Hubspace",
    category: "Smart Home / Controls",
    vendor: "The Home Depot",
    url: "https://hubspaceconnect.com/",
    logoText: "HS",
    logoBg: "#FFF4E5",
    logoUrl: "https://hubspaceconnect.com/favicon.ico",
    logoColor: "#F96302",
    notes: "Hubspace smart-device access and support.",
  },
  {
    id: "landscape-help-admin",
    name: "Daily Crew Work — Admin",
    category: "Atlas / Admin Checklist",
    vendor: "Peter Clark Designs / Landscaping Help",
    url: "/landscape-help",
    logoText: "LH",
    logoBg: "#EAF7F1",
    logoUrl: WORKLINK_LOGOS.landscapeHelpAdmin,
    logoColor: colors.green,
    notes:
      "Your private Landscape Help admin page. Use this to review the weekly checklist and copy the current crew link.",
  },
  {
    id: "landscape-help-crew",
    name: "Daily Crew Work — Crew Link",
    category: "Send to Crew / Public Checklist",
    vendor: "Peter Clark Designs / Landscaping Help",
    url: "https://www.atlas2000.com/landscape-help?token=878c3fa681301e6bd6c8deeb6d3818eb9bb33e5125e02048",
    logoText: "LH",
    logoBg: "#EAF7F1",
    logoUrl: WORKLINK_LOGOS.landscapeHelp,
    logoColor: colors.green,
    notes:
      "Send this exact link to the landscaping crew so they can check off tasks and add notes without full Atlas access.",
  },
  {
    id: "unifi-protect",
    name: "UniFi Protect / Ubiquiti Cameras",
    category: "Security / Cameras",
    vendor: "High Tech Living",
    url: "https://unifi.ui.com/consoles/E438839B47DC00000000075DB1CB0000000007B7A01B00000000640C2817:1458354667/protect/dashboard/all",
    logoText: "UI",
    logoBg: "#EEF6FF",
    logoUrl: "https://unifi.ui.com/favicon.ico",
    logoColor: "#006FFF",
    notes: "Main camera system portal for 2000.",
  },
  {
    id: "hydrawise",
    name: "Hydrawise / Irrigation",
    category: "Irrigation / Grounds",
    vendor: "Advanced Irrigation Inc.",
    url: "https://app.hydrawise.com/config/dashboard",
    logoText: "HW",
    logoBg: "#EAF7F1",
    logoUrl: "https://app.hydrawise.com/favicon.ico",
    logoColor: colors.green,
    notes: "Faben2000 Hunter HCC 24 Zones controller. Serial 06d050377d.",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "Parts / Supplies",
    vendor: "Amazon",
    url: "https://www.amazon.com/",
    logoText: "A",
    logoBg: "#FFF4E5",
    logoUrl: "https://www.amazon.com/favicon.ico",
    logoColor: "#B54708",
    notes:
      "Property supplies, HVAC filters, parts, tools, and recurring orders.",
  },
  {
    id: "control4",
    name: "Control4 Customer Portal",
    category: "Smart Home / Controls",
    vendor: "High Tech Living",
    url: "https://customer.control4.com/",
    logoText: "C4",
    logoBg: "#C91E35",
    logoUrl: WORKLINK_LOGOS.control4,
    logoColor: "#FFFFFF",
    notes:
      "Control4 customer portal. Learn more later before relying on it for daily operations.",
  },
  {
    id: "total-connect-comfort",
    name: "Total Connect Comfort / HVAC Zones",
    category: "HVAC / Thermostats / Zones",
    vendor: "Honeywell / Carrier",
    url: "https://mytotalconnectcomfort.com/portal/7560987/Zones",
    logoText: "TCC",
    logoBg: "#FEECEC",
    logoUrl: WORKLINK_LOGOS.tccHoneywell,
    logoColor: colors.red,
    notes:
      "Main zone control page for the Carrier / Honeywell HVAC zoning system.",
  },

  {
    id: "maintainx-work-order",
    name: "MaintainX Work Order",
    category: "Work Orders / Maintenance",
    vendor: "MaintainX",
    url: "https://app.getmaintainx.com/workorders/108180701",
    logoText: "MX",
    logoBg: "#EEF6FF",
    logoUrl: "https://app.getmaintainx.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Direct MaintainX work order link.",
  },

  {
    id: "paylocity",
    name: "Paylocity",
    category: "Payroll / HR",
    vendor: "Paylocity",
    url: "https://access.paylocity.com/",
    logoText: "PL",
    logoBg: "#EEF2FF",
    logoUrl: "https://access.paylocity.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Payroll, HR, and timekeeping portal.",
  },
  {
    id: "ramp",
    name: "Ramp",
    category: "Company Cards / Expenses",
    vendor: "Ramp",
    url: "https://app.ramp.com/sign-in",
    logoText: "R",
    logoBg: "#E8FF00",
    logoUrl: WORKLINK_LOGOS.ramp,
    logoColor: "#101010",
    notes: "Company cards, receipts, and expense management.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "AI / Assistant",
    vendor: "OpenAI",
    url: "https://chatgpt.com/",
    logoText: "AI",
    logoBg: "#F8FAFC",
    logoUrl: "https://chatgpt.com/favicon.ico",
    logoColor: colors.navy3,
    notes:
      "Assistant workspace for Atlas notes, planning, email review, and intake.",
  },

  {
    id: "outlook-email",
    name: "Outlook Email",
    category: "Email / Communication",
    vendor: "Microsoft Outlook",
    url: "https://outlook.office.com/mail/",
    logoText: "OL",
    logoBg: "#EFF6FF",
    logoUrl: "https://outlook.office.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Outlook email inbox for viewing mail.",
  },
  {
    id: "babbel",
    name: "Babbel",
    category: "Learning / Training",
    vendor: "Babbel",
    url: "https://my.babbel.com/dashboard",
    logoText: "BB",
    logoBg: "#FFF7ED",
    logoUrl: "https://my.babbel.com/favicon.ico",
    logoColor: "#C2410C",
    notes: "Learning dashboard.",
  },
  {
    id: "microsoft-to-do",
    name: "Microsoft To Do",
    category: "Tasks / Planning",
    vendor: "Microsoft",
    url: "https://to-do.office.com/tasks/",
    logoText: "TD",
    logoBg: "#EEF6FF",
    logoUrl: "https://to-do.office.com/favicon.ico",
    logoColor: "#2563EB",
    notes: "Microsoft To Do task lists and personal planning.",
  },
  {
    id: "metaviewer",
    name: "MetaViewer Invoice Search / Approvals",
    category: "Invoices / Approvals / Accounting",
    vendor: "MetaFile Solutions",
    url: "https://arc.metafilesolutions.com/Metaviewer/Account/LogOn?ReturnUrl=%2fMetaViewer%2fIp%3fname%3dMyApprovals&name=MyApprovals",
    logoText: "MV",
    logoBg: "#F1F5F9",
    logoUrl: WORKLINK_LOGOS.metaViewer,
    logoColor: colors.navy3,
    notes: "Invoice search and My Approvals portal.",
  },
];

export const documents: DocumentRecord[] = [];

export const manualCategories: ManualCategory[] = [
  "Operator / Owner Manuals",
  "Installation Manuals",
  "Service / Repair Manuals",
  "Maintenance Guides",
  "Parts Catalogs",
  "Wiring Diagrams",
  "Technical Specifications",
  "Quick Start Guides",
  "Warranty Documents",
  "Safety / Compliance Documents",
];

export const seaDooManualUrl = "https://www.operatorsguides.brp.com/readguide/12118";

export function cleanManualOpenUrl(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/&amp;/gi, "&")
    .replace(/%2520/gi, "%20")
    .replace(/\s/g, "%20");
}

export const defaultManuals: ManualRecord[] = [
  {
    id: "manual-seadoo-219002349",
    title: "2024 Sea-Doo GTI, GTR and Wake 170 Series Operator’s Guide",
    category: "Operator / Owner Manuals",
    manufacturer: "BRP / Sea-Doo",
    model: "GTI SE 170",
    documentNumber: "219002349",
    linkedAssetId: "",
    linkedAssetName: "2024 Sea-Doo GTI SE 170",
    sourceLabel: "Official BRP Operator Guides",
    href: seaDooManualUrl,
    notes:
      "Official operator’s guide covering operation, safety, maintenance, troubleshooting, and specifications for the Sea-Doo GTI, GTR, and Wake 170 series.",
    files: [],
    createdAt: new Date().toISOString(),
  },
];

export function inferManualCategory(value: string): ManualCategory {
  const text = String(value || "").toLowerCase();
  if (/install/.test(text)) return "Installation Manuals";
  if (/service|repair|shop/.test(text)) return "Service / Repair Manuals";
  if (/maintenan/.test(text)) return "Maintenance Guides";
  if (/parts|catalog/.test(text)) return "Parts Catalogs";
  if (/wiring|electrical|diagram/.test(text)) return "Wiring Diagrams";
  if (/spec|data ?sheet|technical/.test(text))
    return "Technical Specifications";
  if (/quick|start/.test(text)) return "Quick Start Guides";
  if (/warrant/.test(text)) return "Warranty Documents";
  if (/safety|compliance/.test(text)) return "Safety / Compliance Documents";
  return "Operator / Owner Manuals";
}

export function blankManual(): ManualRecord {
  return {
    id: "",
    title: "",
    category: "Operator / Owner Manuals",
    manufacturer: "",
    model: "",
    documentNumber: "",
    linkedAssetId: "",
    linkedAssetName: "",
    sourceLabel: "",
    href: "",
    notes: "",
    files: [],
    createdAt: new Date().toISOString(),
  };
}

export function normalizeManualRecord(record: Partial<ManualRecord>): ManualRecord {
  const category = manualCategories.includes(record.category as ManualCategory)
    ? (record.category as ManualCategory)
    : "Operator / Owner Manuals";
  return {
    ...blankManual(),
    ...record,
    id: String(
      record.id ||
        `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ),
    title: String(record.title || ""),
    category,
    manufacturer: String(record.manufacturer || ""),
    model: String(record.model || ""),
    documentNumber: String(record.documentNumber || ""),
    linkedAssetId: String(record.linkedAssetId || ""),
    linkedAssetName: String(record.linkedAssetName || ""),
    sourceLabel: String(record.sourceLabel || ""),
    href: String(record.href || ""),
    notes: String(record.notes || ""),
    files: Array.isArray(record.files) ? record.files : [],
    createdAt: String(record.createdAt || new Date().toISOString()),
  };
}

const fieldLabelStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 14,
  color: colors.text,
  background: "#FFFFFF",
  outline: "none",
  fontFamily: "inherit",
  minWidth: 0,
  fontWeight: 750,
};

const goldButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
  color: colors.navy,
  borderRadius: 13,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  borderRadius: 13,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const sectionStyle: React.CSSProperties = {
  background: colors.card,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowWrap: "break-word",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 5px 18px rgba(15, 35, 55, 0.05)",
};

const drawerGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  alignItems: "start",
  overflow: "visible",
};

const listPanelStyle: React.CSSProperties = {
  minWidth: 0,
};

const drawerStyle: React.CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 24,
  padding: 18,
  position: "sticky",
  top: 16,
  alignSelf: "start",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
  boxShadow: "0 16px 35px rgba(15,23,42,0.06)",
  minWidth: 0,
  wordBreak: "break-word",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.8,
  textTransform: "uppercase",
};

const mutedSmallStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  margin: "4px 0 0",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

export function ListDrawerLayout(props: {
  eyebrow?: string;
  title?: string;
  detail?: string;
  right?: React.ReactNode;
  toolbar?: React.ReactNode;
  list: React.ReactNode;
  drawer: React.ReactNode;
  isMobile: boolean;
  outerStyle?: React.CSSProperties;
  listPanelStyleOverride?: React.CSSProperties;
  drawerStyleOverride?: React.CSSProperties;
  gridStyleOverride?: React.CSSProperties;
  drawerResetKey?: string | number;
  mobileDrawerOpen?: boolean;
  onMobileDrawerClose?: () => void;
  mobileDrawerTitle?: string;
}) {
  const drawerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.isMobile || !props.mobileDrawerOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onMobileDrawerClose?.();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [props.isMobile, props.mobileDrawerOpen, props.onMobileDrawerClose]);

  useLayoutEffect(() => {
    const resetDrawerScroll = () => {
      const drawer = drawerScrollRef.current;
      if (!drawer) return;
      drawer.scrollTop = 0;
      drawer.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    resetDrawerScroll();
    const frame = window.requestAnimationFrame(resetDrawerScroll);
    const timeout = window.setTimeout(resetDrawerScroll, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [props.drawerResetKey]);

  // Calendar-specific shell styling is owned by the calendar workspace, not this shared drawer layout.
  const isCalendarLayout = false;

  const desktopOuterStyle: React.CSSProperties = props.isMobile
    ? sectionStyle
    : isCalendarLayout
      ? {
          ...sectionStyle,
          height: "auto",
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "auto auto",
          overflow: "visible",
        }
      : {
          ...sectionStyle,
          height: "auto",
          minHeight: 560,
          display: "grid",
          gridTemplateRows: "auto auto",
          overflow: "visible",
        };

  const outerStyle = props.outerStyle
    ? { ...desktopOuterStyle, ...props.outerStyle }
    : desktopOuterStyle;

  const desktopGridStyle: React.CSSProperties = props.isMobile
    ? {
        ...drawerGridStyle,
        gridTemplateColumns: "1fr",
      }
    : isCalendarLayout
      ? {
          ...drawerGridStyle,
          gridTemplateColumns: "minmax(0, 86%) minmax(210px, 14%)",
          gap: 12,
          height: "auto",
          minHeight: 0,
          overflow: "visible",
          alignItems: "start",
        }
      : {
          ...drawerGridStyle,
          gridTemplateColumns: "minmax(280px, 34%) minmax(0, 66%)",
          height: "auto",
          minHeight: 0,
          overflow: "visible",
          alignItems: "start",
        };

  const desktopListStyle: React.CSSProperties = props.isMobile
    ? listPanelStyle
    : isCalendarLayout
      ? {
          ...listPanelStyle,
          height: "auto",
          minHeight: 0,
          overflowY: "visible",
          overflowX: "hidden",
          paddingRight: 0,
        }
      : {
          ...listPanelStyle,
          height: "auto",
          minHeight: 0,
          overflowY: "visible",
          overflowX: "hidden",
          paddingRight: 0,
        };

  const desktopDrawerStyle: React.CSSProperties = props.isMobile
    ? drawerStyle
    : isCalendarLayout
      ? {
          ...drawerStyle,
          position: "sticky",
          top: 12,
          height: "auto",
          maxHeight: "calc(100vh - 32px)",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }
      : {
          ...drawerStyle,
          position: "sticky",
          top: 8,
          height: "auto",
          maxHeight: "calc(100vh - 16px)",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          alignSelf: "start",
          zIndex: 2,
          overscrollBehavior: "contain",
        };

  return (
    <section
      style={{
        ...outerStyle,
        minWidth: 0,
        overflowX: props.isMobile ? "hidden" : "clip",
      }}
    >
      {props.eyebrow || props.detail || props.right || props.toolbar ? (
        <div
          style={{
            display: "grid",
            gap: props.toolbar ? 8 : 0,
            paddingBottom: 9,
            marginBottom: 9,
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              {props.eyebrow ? (
                <div
                  style={{ ...eyebrowStyle, marginBottom: props.detail ? 4 : 0 }}
                >
                  {props.eyebrow}
                </div>
              ) : null}
              {props.detail ? (
                <p style={{ ...mutedSmallStyle, margin: 0 }}>{props.detail}</p>
              ) : null}
            </div>
            {props.right ? <div style={buttonRowStyle}>{props.right}</div> : null}
          </div>
          {props.toolbar ? <div style={{ minWidth: 0, width: "100%" }}>{props.toolbar}</div> : null}
        </div>
      ) : null}
      <div
        style={
          props.gridStyleOverride
            ? { ...desktopGridStyle, ...props.gridStyleOverride }
            : desktopGridStyle
        }
      >
        <div
          className="atlas-record-list-panel"
          data-atlas-record-list
          style={
            props.listPanelStyleOverride
              ? { ...desktopListStyle, ...props.listPanelStyleOverride }
              : desktopListStyle
          }
        >
          {props.list}
        </div>
        {!props.isMobile || props.mobileDrawerOpen === undefined ? (
          <div
            ref={drawerScrollRef}
            className="atlas-record-detail"
            data-atlas-detail-panel
            style={
              props.drawerStyleOverride
                ? { ...desktopDrawerStyle, ...props.drawerStyleOverride }
                : desktopDrawerStyle
            }
          >
            <div className="atlas-record-detail-content">{props.drawer}</div>
          </div>
        ) : null}
      </div>

      {props.isMobile && props.mobileDrawerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={props.mobileDrawerTitle || props.title || "Details"}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 240,
            background: "rgba(7,27,47,0.68)",
            display: "grid",
            alignItems: "stretch",
            justifyItems: "stretch",
            padding: "max(8px, env(safe-area-inset-top)) 8px 0",
          }}
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              props.onMobileDrawerClose?.();
            }
          }}
        >
          <div
            ref={drawerScrollRef}
            style={{
              width: "100%",
              height: "calc(100dvh - max(8px, env(safe-area-inset-top)))",
              minWidth: 0,
              overflowY: "auto",
              overflowX: "hidden",
              background: colors.card,
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              borderRadius: "18px 18px 0 0",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                minHeight: 58,
                padding: "10px 14px",
                borderBottom: `1px solid ${colors.line}`,
                background: colors.card,
              }}
            >
              <strong style={{ color: colors.navy, minWidth: 0 }}>
                {props.mobileDrawerTitle || props.title || "Details"}
              </strong>
              <button
                type="button"
                onClick={props.onMobileDrawerClose}
                style={{
                  ...secondaryButtonStyle,
                  width: 42,
                  minWidth: 42,
                  height: 42,
                  padding: 0,
                  borderRadius: 999,
                  fontSize: 24,
                  lineHeight: 1,
                }}
                aria-label="Close details"
              >
                {closeSymbol}
              </button>
            </div>
            <div
              className="atlas-record-detail-content atlas-record-detail-content--mobile"
              style={{ minWidth: 0, padding: 12, overflowX: "hidden" }}
            >
              {props.drawer}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export type CreatableRelationshipOption = { id: string; label: string };

export function CreatableRelationshipField({ label, value, options, emptyLabel, onChange, onCreate, compact = false }: { label: string; value: string; options: CreatableRelationshipOption[]; emptyLabel: string; onChange: (id: string) => void; onCreate: (name: string) => string; compact?: boolean }) {
  const selectedLabel = options.find((option) => option.id === value)?.label || "";
  const [text, setText] = useState(selectedLabel);
  useEffect(() => setText(selectedLabel), [selectedLabel]);
  const clean = text.trim();
  const exact = options.find((option) => option.label.trim().toLowerCase() === clean.toLowerCase());
  const listId = `atlas-rel-${useId().replace(/:/g, "")}`;
  const create = () => {
    if (!clean || exact) return;
    const id = onCreate(clean);
    if (id) onChange(id);
  };
  return <label style={{ ...fieldLabelStyle, display: "grid", gap: 5 }}><span>{label}</span><div style={{ display: "grid", gridTemplateColumns: clean && !exact ? "minmax(0,1fr) auto" : "1fr", gap: 6 }}><input list={listId} value={text} placeholder={emptyLabel} onChange={(event) => { const next = event.currentTarget.value; setText(next); const match = options.find((option) => option.label.trim().toLowerCase() === next.trim().toLowerCase()); onChange(match?.id || ""); }} onBlur={() => { if (exact) { setText(exact.label); onChange(exact.id); } }} onKeyDown={(event) => { if (event.key === "Enter" && clean && !exact) { event.preventDefault(); create(); } }} style={{ ...inputStyle, minHeight: compact ? 34 : undefined, padding: compact ? "5px 8px" : undefined, fontSize: compact ? 11 : undefined }}/><datalist id={listId}>{options.map((option) => <option key={option.id} value={option.label}/>)}</datalist>{clean && !exact ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={create} style={{ ...goldButtonStyle, width: "auto", minHeight: compact ? 34 : undefined, padding: compact ? "5px 9px" : undefined, fontSize: compact ? 11 : undefined, whiteSpace: "nowrap" }}>+ Add</button> : null}</div></label>;
}
