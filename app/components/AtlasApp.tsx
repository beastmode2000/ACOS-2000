Warning: truncated output (original token count: 353797)
... 366609 bytes omitted ...

"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { upload } from "@vercel/blob/client";
import AtlasCalendar from "./AtlasCalendar";
import AtlasRoutines from "./AtlasRoutines";
import AtlasTeamWork from "./AtlasTeamWork";
import AtlasWorkOrders from "./AtlasWorkOrders";
import ReportsAccessCenter from "./ReportsAccessCenter";
import AtlasOwnerReport from "./AtlasOwnerReport";
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
import AtlasGroupedSearchResults from "./ai/AtlasGroupedSearchResults";
import AtlasNotifications from "./AtlasNotifications";
import AtlasPortfolioCenter from "./AtlasPortfolioCenter";
import AtlasParts from "./AtlasParts";
import AtlasAddisonWork from "./AtlasAddisonWork";
import AtlasTasks from "./AtlasTasks";
import AtlasDashboardWorkspace from "./AtlasDashboardWorkspace";
import AtlasLocationsWorkspace from "./AtlasLocationsWorkspace";
import AtlasAssetsWorkspace from "./AtlasAssetsWorkspace";
import AtlasVendorsWorkspace from "./AtlasVendorsWorkspace";
import AtlasDocumentsWorkspace from "./AtlasDocumentsWorkspace";
import AtlasProceduresWorkspace from "./AtlasProceduresWorkspace";
import AtlasTimelineWorkspace from "./AtlasTimelineWorkspace";
import AtlasHomeWorkspace from "./AtlasHomeWorkspace";
import { findRelatedRecords } from "../lib/ai/relationship-engine";
import {
  planAssistantAction,
  type PendingAssistantAction,
} from "../lib/ai/action-planner";

import type {
  Screen,
  ServiceStatus,
  WorkOrderPriority,
  WorkOrderRecurrenceUnit,
  WorkSeason,
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
  OwnerRequestRecord as BaseOwnerRequestRecord,
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

type OwnerRequestRecord = BaseOwnerRequestRecord & {
  assignedTo?: string;
};

type AskAtlasSource = {
  title: string;
  url: string;
  page?: number;
  sheetTitle?: string;
  kind?: string;
};
import {
  closeSymbol, atlasProperties as baseAtlasProperties, makeDailyForemanWidgets,
  normalizeDashboardWidgets, loadDashboardRoutineItems, todayLogStorageKeys, dashboardRoutineStorageKeys, atlasMoreToolsScreens, atlasPrimaryNavigationSections, localISODate,
  todayISO, addDays, uid, normalizeMapDetailBoxes, slugify, blankCalendarItem, clampPercent, formatDate,
  monthName, isServiceStatus, isPriority, isWorkOrderRecurrenceUnit, seasonForDate, recurrenceLabel, nextRecurrenceDate, readStoredArray,
  readAllStoredArrays, saveStoredArray, normalizePhotoRecord, photoSource, mergePhotoRecords, cachePhotoRecords, readCachedPhoto, deleteCachedPhoto,
  persistPhotoRecords, readFileDataUrl, fileToUploadedRecord, imageUrlsFromClipboardText, importImageUrlAsFile, normalizeImageFile, mergeUploadedFiles, normalizeAsset,
  assetLocationIds, assetHasLocation, normalizeLocationName, normalizeVendor, normalizeContact, blankContact, normalizeService, normalizeProcedure,
  normalizeCalendar, mergeCalendarItemRecords, normalizePart, normalizeDocument, mergeDocuments, byName, mergeLocationRecords, byTitle,
  badgeStyle, weatherText, weatherIcon, irrigationAdvice, weatherDayPlanning, categoryToColorId, calendarPlainColors,
  repeatOptions, reminderOptions, linkTypeOptions, standardCalendarCategoryLabels, plainColor, colorNameFromLegacyColorId, defaultCalendarColors, mergeCalendarColors,
  getUsHolidays, getJewishHolidays, calendarDateValue, isRecurringInstanceOnDate, getWeekCells, fallbackLocations, defaultMapLabels, fallbackVendors,
  confirmedAssetCatalog, fallbackAssets, fallbackParts, defaultWorkLinks, documents,
  manualCategories, seaDooManualUrl, cleanManualOpenUrl, defaultManuals, inferManualCategory, blankManual, normalizeManualRecord, ListDrawerLayout,
  CreatableRelationshipField,
} from "./AtlasAppFoundation";

const atlasProperties = [
  ...baseAtlasProperties,
  { id: "4725", name: "4725", detail: "Private home" },
];

type VendorDepartmentKey = "house" | "garage" | "pool" | "landscaping" | "marine";
type VendorContactEntry = {
  id: string;
  name: string;
  role: string;
  phone: string;
  officePhone: string;
  cellPhone: string;
  email: string;
  contactType: "Office" | "Owner" | "Manager" | "Sales" | "Service" | "Installation" | "Technician" | "Billing" | "Emergency";
  primary: boolean;
  preferredMethod: "Office" | "Cell" | "Email";
  notes: string;
};
type AtlasDepartmentVendor = VendorRecord & {
  departments?: VendorDepartmentKey[];
  vendorStatus?: "Preferred" | "Backup" | "Inactive";
  contacts?: VendorContactEntry[];
};

const atlas2000WeeklySeedTitles = new Set([
  "Monday — Property Reset & Garage",
  "Tuesday — Dock, Waterfront & Recreation",
  "Wednesday — Landscaping & Irrigation",
  "Thursday — Pool, Spa & Outdoor Cleaning",
  "Friday — Maintenance & Weekend Readiness",
  "Friday — Seasonal Spider Control",
  "Monday — Computer Work & Admin",
  "Tuesday — Computer Work & Admin",
  "Wednesday — Computer Work & Admin",
  "Thursday — Computer Work & Admin",
  "Friday — Computer Work & Weekly Closeout",
  "Clean windows — Waterside & Great Room",
  "Clean windows — East Side & Bedrooms",
  "Clean windows — Courtyard & Main Entry",
  "Clean windows — Garages, ADU & Remaining Areas",
].map((title) => normalizeLocationName(title)));

const atlas2000WeeklySeedCalendarIds = new Set([
  "routine-monday-reset",
  "routine-tuesday-dock",
  "routine-wednesday-landscape",
  "routine-thursday-outdoor",
  "routine-friday-ready",
  "routine-friday-spiders",
  "routine-monday-admin",
  "routine-tuesday-admin",
  "routine-wednesday-admin",
  "routine-thursday-admin",
  "routine-friday-admin",
  "routine-windows-waterside",
  "routine-windows-east",
  "routine-windows-courtyard",
  "routine-windows-garage",
  "weekly-property-meeting",
  "lanken-tuesday-crew",
  "nick-steve-friday-meeting",
  "weekly-owner-update",
]);

const atlas2000WeeklySeedCalendarTitles = new Set([
  ...atlas2000WeeklySeedTitles,
  "Weekly Property Meeting",
  "Lanken Landscaping Crew",
  "Nick and Steve Meeting",
  "Review Weekly Owner Update",
].map((title) => normalizeLocationName(title)));

function isAtlas2000WeeklySeedTask(task: Pick<WorkPlanTask, "title">) {
  return atlas2000WeeklySeedTitles.has(normalizeLocationName(task.title));
}

function isAtlas2000WeeklySeedCalendarItem(item: Pick<CalendarItem, "id" | "title">) {
  return atlas2000WeeklySeedCalendarIds.has(item.id) ||
    atlas2000WeeklySeedCalendarTitles.has(normalizeLocationName(item.title));
}

function normalizeDepartmentVendor(value: Partial<AtlasDepartmentVendor>): AtlasDepartmentVendor {
  const normalized = normalizeVendor(value as VendorRecord);
  const departments = Array.from(
    new Set(
      (Array.isArray(value.departments) ? value.departments : []).filter((department): department is VendorDepartmentKey =>
        ["house", "garage", "pool", "landscaping", "marine"].includes(String(department)),
      ),
    ),
  );
  const contacts = (Array.isArray(value.contacts) ? value.contacts : []).map((contact) => ({
    id: String(contact?.id || uid("vendor-contact")),
    name: String(contact?.name || ""),
    role: String(contact?.role || ""),
    phone: String(contact?.phone || ""),
    officePhone: String(contact?.officePhone || ""),
    cellPhone: String(contact?.cellPhone || contact?.phone || ""),
    email: String(contact?.email || ""),
    contactType: ["Office", "Owner", "Manager", "Sales", "Service", "Installation", "Technician", "Billing", "Emergency"].includes(String(contact?.contactType))
      ? contact.contactType
      : "Technician",
    primary: Boolean(contact?.primary),
    preferredMethod: ["Office", "Cell", "Email"].includes(String(contact?.preferredMethod))
      ? contact.preferredMethod
      : "Cell",
    notes: String(contact?.notes || ""),
  }));
  const vendorStatus = ["Preferred", "Backup", "Inactive"].includes(String(value.vendorStatus))
    ? value.vendorStatus
    : "Preferred";
  return { ...normalized, departments, vendorStatus, contacts } as AtlasDepartmentVendor;
}
import AtlasContacts from "./AtlasContacts";
import AtlasWeather from "./AtlasWeather";
import type {
  AtlasCurrentUser, AtlasCalendarItem, AssistantTurn, PhotoTimelineTag, PhotoTimelineProjectCategory, PhotoTimelineMeta, ProjectTimelineEntry, PhotoTimelineProject,
  WorkEffort, AtlasTaskMeta, TaskListFilter, AtlasBacklogItem, AtlasVehicleCare, AtlasSeasonalItem, AtlasDaySession,
  AtlasAssetRecord, LocationCustomDetail, AtlasLocationRecord, WorkChecklistItem, TodayLogEntry, DashboardRoutineItem, DashboardWidgetId, DashboardWidgetSetting,
  DashboardSavedLayout, DashboardWidgetDropTarget, WorkCompletionEntry, AtlasServiceRecord,
} from "./AtlasAppFoundation";



type AtlasNavigationState = {
  screen?: string;
  selectedAssetId?: string;
  selectedLocationId?: string;
  selectedVendorId?: string;
  selectedServiceId?: string;
  scrollY?: number;
  updatedAt?: string;
};

function atlasNavigationStorageKey(propertyId: string) {
  return `atlas-navigation-state-v1-${propertyId || "2000"}`;
}

function readAtlasNavigationState(propertyId: string): AtlasNavigationState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(atlasNavigationStorageKey(propertyId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAtlasNavigationState(
  propertyId: string,
  patch: Partial<AtlasNavigationState>,
) {
  if (typeof window === "undefined") return;
  try {
    const key = atlasNavigationStorageKey(propertyId);
    const current = readAtlasNavigationState(propertyId);
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {}
}

function normalizedWorkOrderText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalWorkOrderDuplicateTitle(value: unknown) {
  return normalizedWorkOrderText(value)
    .replace(/\bseadoo\b/g, "sea doo")
    .replace(/\bf150\b/g, "f 150")
    .replace(/\s+/g, " ")
    .trim();
}

function isGeneratedSeaDooRecurringService(record: AtlasServiceRecord) {
  return canonicalWorkOrderDuplicateTitle(record.title) === "sea doo recurring service";
}

function recurringWorkOrderSchedule(record: AtlasServiceRecord) {
  if (record.recurring) {
    return {
      interval: Math.max(1, Number(record.recurrenceInterval || 1)),
      unit: isWorkOrderRecurrenceUnit(record.recurrenceUnit)
        ? record.recurrenceUnit
        : ("Weeks" as WorkOrderRecurrenceUnit),
    };
  }

  const text = normalizedWorkOrderText(
    `${record.title} ${record.workCategory} ${record.notes}`,
  );
  if (/fertiliz|generator|boiler|hvac|irrigation|vehicle|boat|lift/.test(text)) {
    return { interval: 1, unit: "Months" as WorkOrderRecurrenceUnit };
  }
  if (/roof|gutter|winter|spring|seasonal|dock inspection/.test(text)) {
    return { interval: 3, unit: "Months" as WorkOrderRecurrenceUnit };
  }
  return { interval: 1, unit: "Weeks" as WorkOrderRecurrenceUnit };
}

function workOrderDateKey(value: unknown) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function completionTimestampForDate(date: string) {
  return `${date}T12:00:00.000Z`;
}

function recurringWorkOrderPersistenceValue(record: AtlasServiceRecord) {
  return JSON.stringify({
    ...record,
    completionHistory: record.completionHistory || [],
    serviceHistory: record.serviceHistory || [],
  });
}

function repairRecurringWorkOrderRecord(
  record: AtlasServiceRecord,
  repairKnownFertilizeCompletion = false,
) {
  const preventiveMaintenance =
    record.workType === "Preventive Maintenance" || Boolean(record.recurring);
  if (!preventiveMaintenance) return record;

  const schedule = recurringWorkOrderSchedule(record);
  let completionHistory = Array.from(
    new Set((record.completionHistory || []).map(workOrderDateKey).filter(Boolean)),
  ).sort();
  let serviceHistory = Array.isArray(record.serviceHistory)
    ? [...record.serviceHistory]
    : [];
  let lastCompletedDate = workOrderDateKey(record.lastCompletedDate);

  serviceHistory.forEach((entry) => {
    const date = workOrderDateKey(entry?.completedAt);
    if (date) completionHistory.push(date);
  });
  completionHistory = Array.from(new Set(completionHistory)).sort();
  if (!lastCompletedDate) lastCompletedDate = completionHistory.at(-1) || "";

  // One-time correction for the completion Patrick recorded for Fertilize Lawn
  // on Friday, August 21. The old completion path stamped the next sync date
  // instead of the actual work date and never advanced the monthly schedule.
  const fertilizeLawnRepair =
    repairKnownFertilizeCompletion &&
    normalizedWorkOrderText(record.title) === "fertilize lawn" &&
    !completionHistory.some((date) => date > "2026-08-24") &&
    (lastCompletedDate === "2026-08-24" ||
      serviceHistory.some(
        (entry) => workOrderDateKey(entry?.completedAt) === "2026-08-24",
      ));

  if (fertilizeLawnRepair) {
    completionHistory = Array.from(
      new Set(
        completionHistory.map((date) =>
          date === "2026-08-24" ? "2026-08-21" : date,
        ),
      ),
    ).sort();
    serviceHistory = serviceHistory.map((entry) =>
      workOrderDateKey(entry?.completedAt) === "2026-08-24"
        ? {
            ...entry,
            completedAt: completionTimestampForDate("2026-08-21"),
          }
        : entry,
    );
    lastCompletedDate = "2026-08-21";
  }

  if (
    lastCompletedDate &&
    !serviceHistory.some(
      (entry) => workOrderDateKey(entry?.completedAt) === lastCompletedDate,
    )
  ) {
    serviceHistory = [
      {
        id: `completion-${record.id}-${lastCompletedDate}`,
        completedAt: completionTimestampForDate(lastCompletedDate),
        statusBefore: "Open",
        dueDate: String(record.date || ""),
        notes: String(record.notes || ""),
        notesHistory: Array.isArray(record.notesHistory)
          ? record.notesHistory
          : [],
        checklist: Array.isArray(record.checklist) ? record.checklist : [],
        photos: Array.isArray(record.photos) ? record.photos : [],
        documents: Array.isArray(record.documents) ? record.documents : [],
        assetId: String(record.assetId || ""),
        vendorId: String(record.vendorId || ""),
        procedureId: String(record.procedureId || ""),
        locationId: String(record.locationId || ""),
      },
      ...serviceHistory,
    ];
  }

  serviceHistory.sort((left, right) =>
    String(right?.completedAt || "").localeCompare(
      String(left?.completedAt || ""),
    ),
  );

  let date = workOrderDateKey(record.date);
  let status = record.status;
  if (
    lastCompletedDate &&
    (fertilizeLawnRepair || status === "Completed" || !date || date <= lastCompletedDate)
  ) {
    const nextDate = nextRecurrenceDate(
      lastCompletedDate,
      schedule.interval,
      schedule.unit,
      record.recurrenceDays,
    );
    const scheduleEnded = Boolean(
      record.recurrenceEndDate && nextDate > record.recurrenceEndDate,
    );
    date = scheduleEnded ? date || lastCompletedDate : nextDate;
    status = scheduleEnded ? "Completed" : "Scheduled";
  }

  return normalizeService({
    ...record,
    recurring: true,
    recurrenceInterval: schedule.interval,
    recurrenceUnit: schedule.unit,
    date,
    status,
    lastCompletedDate,
    completionHistory,
    serviceHistory,
    workType: "Preventive Maintenance",
  });
}

function workOrderDatabaseDuplicateKey(record: AtlasServiceRecord) {
  const title = canonicalWorkOrderDuplicateTitle(record.title);
  if (!title || title === "untitled work" || title === "untitled work order") {
    return `id:${record.id}`;
  }

  const generatedVehicleMaintenance =
    /^(clean|wash) (mercedes|rivian|porsche|lucid|ford|f 150|raptor|kia|honda|subaru)\b/.test(
      title,
    ) ||
    /^(mercedes|rivian|porsche|lucid|ford|f 150|raptor|kia|honda|subaru) .*\b(recurring service|maintenance|cleaning)\b/.test(
      title,
    );
  const generatedMarineMaintenance =
    /^(clean|wash|inspect|service) (cobalt|sea doo|boat|dock|lift box|dock box|sunstream)\b/.test(
      title,
    ) ||
    /^(cobalt|sea doo|boat|dock|lift box|dock box|sunstream) .*\b(recurring service|maintenance|cleaning|inspection)\b/.test(
      title,
    );

  const recurringLike =
    Boolean(record.recurring) ||
    record.workType === "Preventive Maintenance" ||
    generatedVehicleMaintenance ||
    generatedMarineMaintenance;

  if (recurringLike) {
    const equipmentOrPlace =
      normalizedWorkOrderText(record.assetId) ||
      normalizedWorkOrderText(
        (record as AtlasServiceRecord & { subLocationId?: string; subLocation?: string })
          .subLocationId ||
          (record as AtlasServiceRecord & { subLocationId?: string; subLocation?: string })
            .subLocation,
      ) ||
      normalizedWorkOrderText(record.locationId) ||
      "unlinked";

    // A recurring series is one logical work item. Metadata such as assignee,
    // category, due date, or a legacy recurrence flag can drift between older
    // copies; those differences must not create a second recurring record.
    return `recurring|${title}|${equipmentOrPlace}`;
  }

  return [
    "one-time",
    title,
    normalizedWorkOrderText(record.assetId),
    normalizedWorkOrderText(record.locationId),
    normalizedWorkOrderText(
      (record as AtlasServiceRecord & { subLocationId?: string; subLocation?: string })
        .subLocationId ||
        (record as AtlasServiceRecord & { subLocationId?: string; subLocation?: string })
          .subLocation,
    ),
    normalizedWorkOrderText(record.workCategory),
    normalizedWorkOrderText(record.assignedTo),
    String(record.date || ""),
  ].join("|");
}

function workOrderDatabaseCompleteness(record: AtlasServiceRecord) {
  return (
    [
      record.notes,
      record.assignedTo,
      record.vendorId,
      record.assetId,
      record.locationId,
      record.procedureId,
      record.workCategory,
      record.lastCompletedDate,
    ].filter((value) => String(value || "").trim()).length * 3 +
    (record.checklist || []).length +
    (record.photos || []).length +
    (record.documents || []).length +
    (record.serviceHistory || []).length +
    (record.completionHistory || []).length
  );
}

function mergeWorkOrderArrayValues(values: unknown[][]) {
  const merged = new Map<string, unknown>();
  values.flat().forEach((item) => {
    const record = item as Record<string, unknown> | null;
    const id = record && typeof record === "object" ? String(record.id || "") : "";
    const key = id ? `id:${id}` : `value:${JSON.stringify(item)}`;
    if (!merged.has(key)) merged.set(key, item);
  });
  return Array.from(merged.values());
}

function mergeDuplicateWorkOrderGroup(records: AtlasServiceRecord[]) {
  const ranked = [...records].sort((left, right) => {
    const scoreDifference =
      workOrderDatabaseCompleteness(right) -
      workOrderDatabaseCompleteness(left);
    if (scoreDifference) return scoreDifference;
    return String(
      (right as AtlasServiceRecord & { updatedAt?: string; createdAt?: string })
        .updatedAt ||
        (right as AtlasServiceRecord & { updatedAt?: string; createdAt?: string })
          .createdAt ||
        "",
    ).localeCompare(
      String(
        (left as AtlasServiceRecord & { updatedAt?: string; createdAt?: string })
          .updatedAt ||
          (left as AtlasServiceRecord & { updatedAt?: string; createdAt?: string })
            .createdAt ||
          "",
      ),
    );
  });
  const keeper = ranked[0];
  const longestNotes = ranked
    .map((record) => String(record.notes || ""))
    .sort((left, right) => right.length - left.length)[0] || "";
  const activeRecord = ranked.find((record) => record.status !== "Completed");
  const latestRecurringDate = ranked
    .map((record) => String(record.date || ""))
    .filter(Boolean)
    .sort()
    .pop() || String(keeper.date || "");

  return normalizeService({
    ...keeper,
    propertyId: keeper.propertyId,
    status: activeRecord?.status || keeper.status,
    date: keeper.recurring ? latestRecurringDate : keeper.date,
    notes: longestNotes,
    assignedTo:
      keeper.assignedTo || ranked.find((record) => record.assignedTo)?.assignedTo || "",
    vendorId:
      keeper.vendorId || ranked.find((record) => record.vendorId)?.vendorId || "",
    assetId:
      keeper.assetId || ranked.find((record) => record.assetId)?.assetId || "",
    locationId:
      keeper.locationId || ranked.find((record) => record.locationId)?.locationId || "",
    checklist: mergeWorkOrderArrayValues(
      ranked.map((record) => record.checklist || []),
    ) as AtlasServiceRecord["checklist"],
    photos: mergeWorkOrderArrayValues(
      ranked.map((record) => record.photos || []),
    ) as AtlasServiceRecord["photos"],
    documents: mergeWorkOrderArrayValues(
      ranked.map((record) => record.documents || []),
    ) as AtlasServiceRecord["documents"],
    serviceHistory: mergeWorkOrderArrayValues(
      ranked.map((record) => record.serviceHistory || []),
    ) as AtlasServiceRecord["serviceHistory"],
    completionHistory: Array.from(
      new Set(ranked.flatMap((record) => record.completionHistory || []).map(String)),
    ),
  });
}

function planWorkOrderDatabaseCleanup(
  records: AtlasServiceRecord[],
  propertyId = "",
) {
  const groups = new Map<string, AtlasServiceRecord[]>();
  const originalsById = new Map(records.map((record) => [record.id, record]));
  records
    .map((record) =>
      repairRecurringWorkOrderRecord(record, propertyId === "2000"),
    )
    .forEach((record) => {
      const key = workOrderDatabaseDuplicateKey(record);
      groups.set(key, [...(groups.get(key) || []), record]);
    });

  const keepers: AtlasServiceRecord[] = [];
  const changedKeepers: AtlasServiceRecord[] = [];
  const duplicateIds: string[] = [];
  groups.forEach((group, key) => {
    const baseMerged = mergeDuplicateWorkOrderGroup(group);
    const merged =
      key.startsWith("generated-vehicle-maintenance|") ||
      key.startsWith("generated-marine-maintenance|")
      ? normalizeService({
          ...baseMerged,
          recurring: true,
          recurrenceInterval: Math.max(
            1,
            Number(baseMerged.recurrenceInterval || 7),
          ),
          recurrenceUnit: baseMerged.recurrenceUnit || "Days",
        })
      : baseMerged;
    const repairedMerged = repairRecurringWorkOrderRecord(
      merged,
      propertyId === "2000",
    );
    keepers.push(repairedMerged);
    const original = originalsById.get(repairedMerged.id);
    if (
      group.length > 1 ||
      !original ||
      recurringWorkOrderPersistenceValue(original) !==
        recurringWorkOrderPersistenceValue(repairedMerged)
    ) {
      changedKeepers.push(repairedMerged);
    }
    group.forEach((record) => {
      if (record.id !== repairedMerged.id) duplicateIds.push(record.id);
    });
  });

  return { keepers: byTitle(keepers), changedKeepers, duplicateIds };
}

const exactDuplicateIgnoredKeys = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "lastUpdatedAt",
  "savedAt",
]);

function stableExactDuplicateValue(value: unknown, key = ""): string {
  if (exactDuplicateIgnoredKeys.has(key)) return "";
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableExactDuplicateValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((entryKey) => !exactDuplicateIgnoredKeys.has(entryKey))
      .sort()
      .map((entryKey) => `${JSON.stringify(entryKey)}:${stableExactDuplicateValue(record[entryKey], entryKey)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function exactDuplicateRecordIds(records: Array<Record<string, unknown>>) {
  const groups = new Map<string, Array<Record<string, unknown>>>();
  records.forEach((record) => {
    const signature = stableExactDuplicateValue(record);
    groups.set(signature, [...(groups.get(signature) || []), record]);
  });
  const duplicateIds: string[] = [];
  groups.forEach((group) => {
    if (group.length < 2) return;
    const ranked = [...group].sort((left, right) =>
      String(right.updatedAt || right.createdAt || "").localeCompare(
        String(left.updatedAt || left.createdAt || ""),
      ),
    );
    ranked.slice(1).forEach((record) => {
      const id = String(record.id || "");
      if (id) duplicateIds.push(id);
    });
  });
  return duplicateIds;
}

export default function AtlasApp() {
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<
    "loading" | "synced" | "offline"
  >("loading");
  const [sharedRefreshNonce, setSharedRefreshNonce] = useState(0);
  const [mobileSyncRefreshing, setMobileSyncRefreshing] = useState(false);
  const [operationsSyncState, setOperationsSyncState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [operationsSyncMessage, setOperationsSyncMessage] = useState("No pending changes");
  const [operationsHydrated, setOperationsHydrated] = useState(false);
  const [showPropertyLoading, setShowPropertyLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [screen, setScreenState] = useState<AtlasScreen>("dashboard");
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureNote, setQuickCaptureNote] = useState("");
  type NoteSection =
    | "General"
    | "Property"
    | "Maintenance"
    | "Cleaning"
    | "Admin"
    | "Projects"
    | "Vendors"
    | "Landscaping"
    | "Pool & Spa"
    | "Garage / Vehicles"
    | "Dock / Boats"
    | "House"
    | "Private";
  const noteSections: NoteSection[] = [
    "General",
    "Property",
    "Maintenance",
    "Cleaning",
    "Admin",
    "Projects",
    "Vendors",
    "Landscaping",
    "Pool & Spa",
    "Garage / Vehicles",
    "Dock / Boats",
    "House",
    "Private",
  ];
  const [notesDraft, setNotesDraft] = useState("");
  const [notesTitleDraft, setNotesTitleDraft] = useState("");
  const [notesComposerOpen, setNotesComposerOpen] = useState(false);
  const [notesSearch, setNotesSearch] = useState("");
  const [notesListening, setNotesListening] = useState(false);
  const [mobileNotesMoreOpen, setMobileNotesMoreOpen] = useState(false);
  const [notesSection, setNotesSection] = useState<NoteSection>("General");
  const [notesSectionFilter, setNotesSectionFilter] = useState<NoteSection | "All">("All");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  type RestrictedNoteAttachment = {
    id: string;
    noteId: string;
    label: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  };
  type RestrictedNote = {
    id: string;
    propertyId: string;
    text: string;
    createdAt: string;
    updatedAt: string;
    attachments?: RestrictedNoteAttachment[];
  };
  const [restrictedNotesUnlocked, setRestrictedNotesUnlocked] = useState(false);
  const [restrictedNotesPin, setRestrictedNotesPin] = useState("");
  const [restrictedNotesSessionPin, setRestrictedNotesSessionPin] = useState("");
  const [restrictedPinInputKey, setRestrictedPinInputKey] = useState(0);
  const [restrictedNotes, setRestrictedNotes] = useState<RestrictedNote[]>([]);
  const [restrictedNotesDraft, setRestrictedNotesDraft] = useState("");
  const [restrictedNotesBusy, setRestrictedNotesBusy] = useState(false);
  const [restrictedNotesError, setRestrictedNotesError] = useState("");
  const [restrictedPinConfigured, setRestrictedPinConfigured] = useState<boolean | null>(null);
  const [restrictedPinConfirm, setRestrictedPinConfirm] = useState("");
  const [restrictedNoteEditId, setRestrictedNoteEditId] = useState("");
  const [restrictedNoteEditText, setRestrictedNoteEditText] = useState("");
  const [restrictedAttachmentLabelByNote, setRestrictedAttachmentLabelByNote] = useState<Record<string, string>>({});
  const [restrictedAttachmentEditId, setRestrictedAttachmentEditId] = useState("");
  const [restrictedAttachmentEditLabel, setRestrictedAttachmentEditLabel] = useState("");
  const [restrictedAttachmentBusyNoteId, setRestrictedAttachmentBusyNoteId] = useState("");
  const [selectedRestrictedNoteId, setSelectedRestrictedNoteId] = useState("");
  const [restrictedPdfPreviewUrl, setRestrictedPdfPreviewUrl] = useState("");
  const [restrictedPdfPreviewAttachmentId, setRestrictedPdfPreviewAttachmentId] = useState("");
  const [restrictedPdfPreviewName, setRestrictedPdfPreviewName] = useState("");
  const [restrictedPdfZoom, setRestrictedPdfZoom] = useState(100);
  const [notesSectionById, setNotesSectionById] = useState<Record<string, NoteSection>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("atlas-note-sections-v1");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [noteTitlesById, setNoteTitlesById] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem("atlas-note-titles-v1") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  type NoteAttachmentKind = "Asset" | "Location" | "Vendor" | "Project" | "Work Order" | "Task" | "Contact" | "Procedure";
  type NoteAttachment = { kind: NoteAttachmentKind; id: string };
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem("atlas-note-pins-v1") || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });
  const [noteFollowUpDates, setNoteFollowUpDates] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem("atlas-note-followups-v1") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [noteAttachments, setNoteAttachments] = useState<Record<string, NoteAttachment[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem("atlas-note-attachments-v1") || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      return Object.fromEntries(
        Object.entries(parsed as Record<string, NoteAttachment | NoteAttachment[]>).map(([noteId, value]) => [
          noteId,
          Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [],
        ]),
      );
    } catch {
      return {};
    }
  });
  const [noteAttachKind, setNoteAttachKind] = useState<NoteAttachmentKind>("Asset");
  const [noteAttachId, setNoteAttachId] = useState("");
  const notesRecognitionRef = useRef<{ stop: () => void } | null>(null);
  const [quickCaptureMode, setQuickCaptureMode] = useState<"create" | "existing">("create");
  type QuickCreateKind = "photo" | "document" | "task" | "work-order" | "project" | "asset" | "vendor" | "procedure";
  const [quickCreateKind, setQuickCreateKind] = useState<QuickCreateKind | "">("");
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateAssignee, setQuickCreateAssignee] = useState<"Nick" | "Addison" | "Pat" | "Unassigned">("Nick");
  const [ownerUpdateOpen, setOwnerUpdateOpen] = useState(false);
  const [ownerUpdateDraft, setOwnerUpdateDraft] = useState("");
  const [morningBriefOpen, setMorningBriefOpen] = useState(false);
  type DepartmentKind = "house" | "garage" | "pool" | "landscaping" | "marine";
  const [departmentCenter, setDepartmentCenter] = useState<DepartmentKind | "">("");
  const [departmentDrilldown, setDepartmentDrilldown] = useState<
    "open" | "completed" | "assets" | "requests" | "vendors" | "documents" | "procedures" | ""
  >("");
  const [departmentWorkspaceCategory, setDepartmentWorkspaceCategory] = useState("All");
  const [departmentWorkspaceSelectedKind, setDepartmentWorkspaceSelectedKind] = useState<"asset" | "work" | "task" | "vendor" | "">("");
  const [departmentWorkspaceSelectedId, setDepartmentWorkspaceSelectedId] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileFieldMoreOpen, setMobileFieldMoreOpen] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [planningToolsOpen, setPlanningToolsOpen] = useState(false);

  useEffect(() => {
    const closeOpenDropdowns = (event: PointerEvent) => {
      const target = event.target as Node | null;
      document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((details) => {
        if (!target || !details.contains(target)) details.open = false;
      });
    };
    const closeDropdownsOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((details) => {
        details.open = false;
      });
    };

    document.addEventListener("pointerdown", closeOpenDropdowns);
    window.addEventListener("keydown", closeDropdownsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOpenDropdowns);
      window.removeEventListener("keydown", closeDropdownsOnEscape);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sectionNames = new Set([
      "overview",
      "notes",
      "photos",
      "documents",
      "timeline",
      "related",
      "related records",
    ]);

    const decorateRecordPanels = () => {
      document
        .querySelectorAll<HTMLElement>(".atlas-record-detail-content")
        .forEach((panel, panelIndex) => {
          const headings = Array.from(
            panel.querySelectorAll<HTMLElement>("h2, h3, details > summary"),
          ).filter((heading) =>
            sectionNames.has(String(heading.textContent || "").trim().toLowerCase()),
          );

          headings.forEach((heading, index) => {
            const label = String(heading.textContent || "").trim();
            const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const section = heading.closest<HTMLElement>("section, details") || heading.parentElement;
            if (!section) return;
            section.dataset.atlasRecordSection = slug;
            section.id = `atlas-record-${panelIndex}-${slug}-${index}`;
          });

          const sections = Array.from(
            panel.querySelectorAll<HTMLElement>("[data-atlas-record-section]"),
          );
          const existingNav = panel.querySelector<HTMLElement>(":scope > .atlas-record-section-nav");

          if (sections.length < 2) {
            existingNav?.remove();
            return;
          }

          const signature = sections
            .map((section) => section.dataset.atlasRecordSection || "")
            .join("|");
          if (existingNav?.dataset.signature === signature) return;
          existingNav?.remove();

          const nav = document.createElement("nav");
          nav.className = "atlas-record-section-nav";
          nav.dataset.signature = signature;
          nav.setAttribute("aria-label", "Record sections");

          sections.forEach((section) => {
            const button = document.createElement("button");
            button.type = "button";
            const raw = section.dataset.atlasRecordSection || "section";
            button.textContent = raw
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            button.addEventListener("click", () => {
              section.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            nav.appendChild(button);
          });

          panel.prepend(nav);
        });
    };

    decorateRecordPanels();
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(decorateRecordPanels);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [screen]);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem("atlas-sidebar-collapsed") === "true");
      setMoreToolsOpen(window.localStorage.getItem("atlas-more-tools-open") === "true");
    } catch {
      // Keep the sidebar open when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("atlas-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      // The UI still works when browser storage is unavailable.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem("atlas-more-tools-open", String(moreToolsOpen));
    } catch {
      // The navigation still works when browser storage is unavailable.
    }
  }, [moreToolsOpen]);
  const [activePropertyId, setActivePropertyId] = useState("2000");

  function calendarItemsByIdentity<T extends CalendarItem>(items: T[]): T[] {
    if (activePropertyId !== "4725") return byTitle(items);
    const seen = new Set<string>();
    return items.filter((item) => {
      const id = String(item.id || "");
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function workOrdersByIdentity<T extends { id?: string; title: string }>(items: T[]): T[] {
    if (activePropertyId !== "4725") return byTitle(items);
    const seen = new Set<string>();
    return items.filter((item) => {
      const id = String(item.id || "");
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  const [allowedPropertyIds, setAllowedPropertyIds] = useState<string[]>([
    "2000",
    "6855",
    "3661",
    "hangar",
  ]);
  const [currentAtlasUser, setCurrentAtlasUser] = useState<AtlasCurrentUser | null>(null);
  const [teamDirectory, setTeamDirectory] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    propertyIds: string[];
    accessProfiles: string[];
  }>>([]);
  const [teamAccessResolved, setTeamAccessResolved] = useState(false);
  const [teamAccessError, setTeamAccessError] = useState("");
  const [showLandscapeFilters, setShowLandscapeFilters] = useState(false);
  const [landscapeSearch, setLandscapeSearch] = useState("");
  const [landscapeStatusFilter, setLandscapeStatusFilter] = useState<
    "All" | "Not Finished" | "Completed" | "Needs Follow-up" | "Skipped"
  >("All");
  const [landscapeSeverityFilter, setLandscapeSeverityFilter] = useState<
    "All" | "Low" | "Medium" | "High" | "Not Recorded"
  >("All");
  const [query, setQuery] = useState("");
  const [dashboardWorkFilter, setDashboardWorkFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [voiceAssistantListening, setVoiceAssistantListening] = useState(false);
  const [voiceAssistantTranscript, setVoiceAssistantTranscript] = useState("");
  const [voiceAssistantReviewReady, setVoiceAssistantReviewReady] = useState(false);
  const [voiceAssistantDraft, setVoiceAssistantDraft] = useState<{
    kind: "task" | "work order" | "project";
    title: string;
    dueDate: string;
    assignee: "Nick" | "Addison";
    minutes: number;
  } | null>(null);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedCommands, setSavedCommands] = useState<string[]>([]);
  const [commandPinnedIds, setCommandPinnedIds] = useState<string[]>([]);
  const [commandOpenCounts, setCommandOpenCounts] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(false);

  const [dashboardEditMode, setDashboardEditMode] = useState(false);
  const [dashboardCenterView, setDashboardCenterView] = useState<
    "command" | "operations" | "intelligence"
  >("command");
  const [dashboardLayoutId, setDashboardLayoutId] = useState("daily-foreman");
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetSetting[]>(
    () => makeDailyForemanWidgets(),
  );
  const [customDashboardLayouts, setCustomDashboardLayouts] = useState<DashboardSavedLayout[]>([]);
  const [draggedDashboardWidgetId, setDraggedDashboardWidgetId] = useState<DashboardWidgetId | null>(null);
  const [dashboardWidgetDropTarget, setDashboardWidgetDropTarget] = useState<DashboardWidgetDropTarget | null>(null);
  const [dashboardFeedFilter, setDashboardFeedFilter] = useState<"All" | "Work" | "Requests" | "Vendors" | "Photos" | "Alerts">("All");
  const [dismissedDashboardFeedIds, setDismissedDashboardFeedIds] = useState<string[]>([]);
  const [dashboardTaskEditorId, setDashboardTaskEditorId] = useState("");
  const dashboardNickQuickAddRef = useRef<HTMLInputElement | null>(null);
  const dashboardAddisonQuickAddRef = useRef<HTMLInputElement | null>(null);
  const [dashboardPersonFocus, setDashboardPersonFocus] = useState<"Both" | "Nick" | "Addison">("Both");
  const [dashboardReminderDraft, setDashboardReminderDraft] = useState("");
  const [dashboardReminderDate, setDashboardReminderDate] = useState("");
  const [dashboardReminders, setDashboardReminders] = useState<Array<{ id: string; text: string; done: boolean; createdAt: string; dueDate?: string }>>([]);
  const dashboardPersonFocusSkipSaveRef = useRef(false);
  const dashboardLayoutSkipSaveRef = useRef(false);
  const dashboardRoutineSkipSaveRef = useRef(false);

  useEffect(() => {
    // Shared Neon Notes are the only source for dashboard reminders. Clear the
    // legacy per-browser reminder cache so old phone/desktop notes cannot reappear.
    setDashboardReminders([]);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(`atlas-dashboard-reminders-v1:${activePropertyId}`);
    } catch {
      // Shared reminders continue to work when local storage is unavailable.
    }
  }, [activePropertyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    dashboardPersonFocusSkipSaveRef.current = true;
    const stored = window.localStorage.getItem(`atlas-dashboard-person-focus-v1:${activePropertyId}`);
    setDashboardPersonFocus(stored === "Nick" || stored === "Addison" || stored === "Both" ? stored : "Both");
  }, [activePropertyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dashboardPersonFocusSkipSaveRef.current) {
      dashboardPersonFocusSkipSaveRef.current = false;
      return;
    }
    window.localStorage.setItem(`atlas-dashboard-person-focus-v1:${activePropertyId}`, dashboardPersonFocus);
  }, [activePropertyId, dashboardPersonFocus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    dashboardLayoutSkipSaveRef.current = true;
    try {
      const raw = window.localStorage.getItem(`atlas-command-center-layouts-v2:${activePropertyId}`);
      if (!raw) {
        setDashboardLayoutId("daily-foreman");
        setDashboardWidgets(makeDailyForemanWidgets());
        setCustomDashboardLayouts([]);
        window.localStorage.setItem(`atlas-daily-foreman-default-v1:${activePropertyId}`, "ready");
        return;
      }
      const parsed = JSON.parse(raw) as {
        activeLayoutId?: string;
        widgets?: DashboardWidgetSetting[];
        customLayouts?: DashboardSavedLayout[];
      };
      setCustomDashboardLayouts(Array.isArray(parsed.customLayouts) ? parsed.customLayouts.map((layout) => ({ ...layout, widgets: normalizeDashboardWidgets(layout.widgets || []) })) : []);
      if (window.localStorage.getItem(`atlas-daily-foreman-default-v1:${activePropertyId}`) !== "ready") {
        setDashboardLayoutId("daily-foreman");
        setDashboardWidgets(makeDailyForemanWidgets());
        window.localStorage.setItem(`atlas-daily-foreman-default-v1:${activePropertyId}`, "ready");
      } else {
        if (Array.isArray(parsed.widgets) && parsed.widgets.length) setDashboardWidgets(normalizeDashboardWidgets(parsed.widgets));
        setDashboardLayoutId(String(parsed.activeLayoutId || "daily-foreman"));
      }
    } catch {
      setDashboardWidgets(makeDailyForemanWidgets());
      setCustomDashboardLayouts([]);
    }
  }, [activePropertyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dashboardLayoutSkipSaveRef.current) {
      dashboardLayoutSkipSaveRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        `atlas-command-center-layouts-v2:${activePropertyId}`,
        JSON.stringify({
          activeLayoutId: dashboardLayoutId,
          widgets: dashboardWidgets,
          customLayouts: customDashboardLayouts,
        }),
      );
    } catch {
      // Dashboard customization still works for this session if storage is unavailable.
    }
  }, [activePropertyId, dashboardLayoutId, dashboardWidgets, customDashboardLayouts]);

  useEffect(() => {
    if (screen !== "history" && dashboardWorkFilter) {
      setDashboardWorkFilter("");
    }
  }, [screen, dashboardWorkFilter]);

  useEffect(() => {
    const stored = readStoredArray<TodayLogEntry>(todayLogStorageKeys, [])
      .filter((entry) => Boolean(entry?.id && entry?.text && entry?.date))
      .map((entry) => ({
        ...entry,
        propertyId: entry.propertyId || "2000",
        category: entry.category || "Task",
        createdAt: entry.createdAt || new Date().toISOString(),
      }));
    setTodayLogEntries(stored);
    dashboardRoutineSkipSaveRef.current = true;
    const propertyRoutineCompletionKey = `${dashboardRoutineStorageKeys[0]}:${activePropertyId}`;
    setCompletedDashboardRoutineIds(
      readStoredArray<string>(
        [propertyRoutineCompletionKey],
        activePropertyId === "2000"
          ? readStoredArray<string>(dashboardRoutineStorageKeys, [])
          : [],
      ).filter(Boolean),
    );
    setDashboardRoutineItems(loadDashboardRoutineItems(activePropertyId));

    const refreshRoutineItems = () => setDashboardRoutineItems(loadDashboardRoutineItems(activePropertyId));
    window.addEventListener("focus", refreshRoutineItems);
    window.addEventListener("storage", refreshRoutineItems);
    return () => {
      window.removeEventListener("focus", refreshRoutineItems);
      window.removeEventListener("storage", refreshRoutineItems);
    };
  }, [activePropertyId]);
  const atlasSaveQueueRef = useRef<Map<string, Promise<boolean>>>(new Map());
  const atlasLastSaveRef = useRef<Map<string, string>>(new Map());
  const atlasSaveAttemptRef = useRef(0);
  const atlasActionLocksRef = useRef<Set<string>>(new Set());
  const operationsSyncTimerRef = useRef<number | null>(null);
  const operationsSyncRunningRef = useRef(false);
  const sharedRefreshLastRequestedRef = useRef(0);
  const operationsRemoteRefreshRef = useRef(false);
  const operationsRemoteRefreshTimerRef = useRef<number | null>(null);
  const calendarSourceSyncRunningRef = useRef(false);
  const winterTruckBallastTimerRef = useRef<number | null>(null);
  const workOrderDateReconciliationTimerRef = useRef<number | null>(null);
  const voiceRecognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const voiceAssistantCancelledRef = useRef(false);

  const [databaseStatus, setDatabaseStatus] = useState(
    "Loading Atlas records...",
  );
  const [saveToast, setSaveToast] = useState<{
    message: string;
    tone: "success" | "warning";
  } | null>(null);
  const saveToastTimerRef = useRef<number | null>(null);
  const [adminPreviewMode, setAdminPreviewMode] = useState<"none" | "addison">("none");
  const [taskUndo, setTaskUndo] = useState<{ task: WorkPlanTask; meta: AtlasTaskMeta } | null>(null);
  const taskUndoTimerRef = useRef<number | null>(null);
  const [atlasAuditLog, setAtlasAuditLog] = useState<Array<{ id: string; at: string; user: string; action: string; detail: string; propertyId: string }>>(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem("atlas-audit-log-v1") || "[]");
      return Array.isArray(parsed)
        ? parsed.map((entry) => ({ ...entry, propertyId: entry?.propertyId || "2000" }))
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("atlas-audit-log-v1", JSON.stringify(atlasAuditLog.slice(0, 250)));
    } catch {
      // Audit history remains available for the current session if storage is unavailable.
    }
  }, [atlasAuditLog]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("atlas-note-sections-v1", JSON.stringify(notesSectionById));
      window.localStorage.setItem("atlas-note-titles-v1", JSON.stringify(noteTitlesById));
    } catch {
      // Notes still work for the current session if browser storage is unavailable.
    }
  }, [notesSectionById, noteTitlesById]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("atlas-note-pins-v1", JSON.stringify(pinnedNoteIds));
      window.localStorage.setItem("atlas-note-followups-v1", JSON.stringify(noteFollowUpDates));
      window.localStorage.setItem("atlas-note-attachments-v1", JSON.stringify(noteAttachments));
    } catch {
      // Note metadata still works for the current session if storage is unavailable.
    }
  }, [pinnedNoteIds, noteFollowUpDates, noteAttachments]);

  const [logoIndex, setLogoIndex] = useState(0);
  const [mapImageOk, setMapImageOk] = useState(true);

  const [mapLabels, setMapLabels] =
    useState<MapLabelRecord[]>(defaultMapLabels);
  const [selectedMapLabelId, setSelectedMapLabelId] = useState("");
  const [mapMobileDrawerOpen, setMapMobileDrawerOpen] = useState(false);
  const [activeMapPanelTab, setActiveMapPanelTab] = useState<
    "operations" | "info" | "vendors" | "photos" | "tabs"
  >("operations");
  const [mapAreaSearch, setMapAreaSearch] = useState("");
  const [mapStatusFilter, setMapStatusFilter] = useState<
    "All" | "Critical" | "Active" | "Attention" | "Healthy"
  >("All");
  const [mapAreaNavigatorOpen, setMapAreaNavigatorOpen] = useState(true);

  const [locations, setLocations] =
    useState<AtlasLocationRecord[]>(fallbackLocations);
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [locationMobileDrawerOpen, setLocationMobileDrawerOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationHoveredId, setLocationHoveredId] = useState("");
  const [collapsedLocationIds, setCollapsedLocationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [locationVisibilityFilters, setLocationVisibilityFilters] = useState<
    Set<"assets" | "work" | "photos" | "empty">
  >(() => new Set(["assets", "work", "photos", "empty"]));
  const [locationFiltersOpen, setLocationFiltersOpen] = useState(false);

  const [assetRecords, setAssetRecords] =
    useState<AtlasAssetRecord[]>(fallbackAssets.map(normalizeAsset));
  const [vendorRecords, setVendorRecords] =
    useState<VendorRecord[]>(fallbackVendors);
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactDraft, setContactDraft] = useState<ContactRecord>(() =>
    blankContact(),
  );
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [serviceRecords, setServiceRecords] =
    useState<AtlasServiceRecord[]>([]);
  const addisonLegacyMigrationRef = useRef<Set<string>>(new Set());

  // Addison's field page still exposes a small number of older task records
  // alongside unified work orders. Promote only ACTIVE legacy Addison tasks
  // into atlas_work_orders so his phone and the manager dashboard read the
  // same authoritative work list. The original task is not deleted here;
  // /api/landscape-help automatically suppresses it once the matching
  // "Legacy task <id>" work order exists, preventing duplicate display.
  useEffect(() => {
    if (
      !ready ||
      !operationsHydrated ||
      activePropertyId !== "2000" ||
      typeof window === "undefined"
    ) {
      return;
    }

    let cancelled = false;
    let running = false;

    const syncAddisonLegacyWork = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;

      try {
        const response = await fetch(
          "/api/landscape-help?token=addison-2000-7f94f468dca84de3a7b8c2d942ca3819",
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const payload = await response.json().catch(() => ({}));
        if (
          cancelled ||
          !payload?.ok ||
          payload?.mode !== "addison" ||
          !Array.isArray(payload?.addison?.tasks)
        ) {
          return;
        }

        const today = todayISO();
        const activeLegacyTasks = payload.addison.tasks.filter(
          (task: Record<string, any>) => {
            const id = String(task?.id || "").trim();
            if (!id || id.startsWith("work-order:") || task?.source === "unified-work") {
              return false;
            }

            const meta =
              task?.taskMeta && typeof task.taskMeta === "object"
                ? task.taskMeta
                : task;
            const assignee = String(
              meta?.assignee ||
                meta?.assignedTo ||
                task?.assignee ||
                task?.assignedTo ||
                "",
            )
              .trim()
              .toLowerCase();
            if (!(assignee === "addison" || assignee.startsWith("addison "))) {
              return false;
            }
            if (String(meta?.status || task?.status || "Open") === "Completed") {
              return false;
            }
            if (Boolean(meta?.paused)) return false;

            const dueDate = String(meta?.dueDate || task?.dueDate || "").slice(0, 10);
            return !dueDate || dueDate <= today;
          },
        );

        for (const task of activeLegacyTasks) {
          if (cancelled) return;

          const legacyTaskId = String(task.id || "").trim();
          if (
            !legacyTaskId ||
            addisonLegacyMigrationRef.current.has(legacyTaskId)
          ) {
            continue;
          }

          const meta =
            task?.taskMeta && typeof task.taskMeta === "object"
              ? task.taskMeta
              : task;
          const existing = serviceRecords.some(
            (record) =>
              String((record as AtlasServiceRecord).responsibilityArea || "") ===
              `Legacy task ${legacyTaskId}`,
          );
          if (existing) {
            addisonLegacyMigrationRef.current.add(legacyTaskId);
            continue;
          }

          addisonLegacyMigrationRef.current.add(legacyTaskId);

          const safeId = legacyTaskId
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 100);
          const dueDate =
            String(meta?.dueDate || task?.dueDate || "").slice(0, 10) || today;
          const recurring = Boolean(task?.recurring || meta?.recurring);
          const record = normalizeService({
            id: `addison-legacy-${safeId || legacyTaskId}`,
            propertyId: "2000",
            title: String(task?.title || "Addison work").trim() || "Addison work",
            date: dueDate,
            status: "Open",
            priority: ["High", "Medium", "Low"].includes(String(task?.priority))
              ? task.priority
              : "Medium",
            notes: String(
              meta?.instructions || meta?.notes || task?.notes || "",
            ),
            recurring,
            recurrenceInterval: Math.max(
              1,
              Number(meta?.recurrenceInterval || 1),
            ),
            recurrenceUnit:
              meta?.recurrenceUnit === "Days" ||
              meta?.recurrenceUnit === "Months" ||
              meta?.recurrenceUnit === "Years"
                ? meta.recurrenceUnit
                : "Weeks",
            season: "Year-Round",
            completionHistory: Array.isArray(meta?.completionHistory)
              ? meta.completionHistory
              : [],
            workType: "Work Order",
            workCategory: String(task?.category || "Maintenance"),
            responsibilityArea: `Legacy task ${legacyTaskId}`,
            assignedTo: "Addison",
            photos: Array.isArray(meta?.photos) ? meta.photos : [],
            documents: [],
            checklist: Array.isArray(meta?.checklist) ? meta.checklist : [],
            notesHistory: [],
            serviceHistory: Array.isArray(meta?.serviceHistory)
              ? meta.serviceHistory
              : [],
          });

          const saved = await postAtlasRecord("work_orders", record);
          if (!saved) {
            addisonLegacyMigrationRef.current.delete(legacyTaskId);
            continue;
          }

          setServiceRecords((current) =>
            workOrdersByIdentity([record, ...current]),
          );
        }
      } catch {
        // Keep the existing Atlas state intact if Addison's field endpoint is
        // temporarily unavailable. The next poll/focus retries safely.
      } finally {
        running = false;
      }
    };

    void syncAddisonLegacyWork();
    const timer = window.setInterval(syncAddisonLegacyWork, 5000);
    const onFocus = () => void syncAddisonLegacyWork();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, operationsHydrated, activePropertyId, serviceRecords]);

  // Addison's dedicated phone page can create work while the main Atlas app is
  // already open on another device. Pull only those externally-created work
  // orders into the live client state so they appear without a manual reload.
  // Existing/local work is never removed or overwritten by this refresh.
  useEffect(() => {
    if (
      !ready ||
      !operationsHydrated ||
      activePropertyId !== "2000" ||
      typeof window === "undefined"
    ) {
      return;
    }

    let cancelled = false;
    let refreshing = false;

    const refreshAddisonSelfAddedWork = async () => {
      if (refreshing || document.visibilityState === "hidden") return;
      refreshing = true;

      try {
        const response = await fetch(
          `/api/atlas?propertyId=${encodeURIComponent(activePropertyId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const payload = (await response.json()) as AtlasApiPayload;
        if (cancelled) return;

        const apiServices = Array.isArray(payload.serviceRecords)
          ? payload.serviceRecords
          : Array.isArray(payload.workOrders)
            ? payload.workOrders
            : [];

        const addisonCreatedWork = apiServices
          .map(normalizeService)
          .filter((record) =>
            String(record.id || "").startsWith("addison-self-") ||
            String((record as AtlasServiceRecord).responsibilityArea || "") ===
              "Addison self-added",
          );

        if (!addisonCreatedWork.length) return;

        setServiceRecords((current) => {
          const existingIds = new Set(current.map((record) => String(record.id)));
          const missing = addisonCreatedWork.filter(
            (record) => !existingIds.has(String(record.id)),
          );
          return missing.length ? [...missing, ...current] : current;
        });
      } catch {
        // The normal Atlas hydration remains authoritative if this lightweight
        // cross-device refresh is temporarily unavailable.
      } finally {
        refreshing = false;
      }
    };

    void refreshAddisonSelfAddedWork();
    const timer = window.setInterval(refreshAddisonSelfAddedWork, 5000);
    const onFocus = () => void refreshAddisonSelfAddedWork();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, operationsHydrated, activePropertyId]);
  const aiGeneratedPurgeRunningRef = useRef(false);
  const applianceAnnualServiceSetupRunningRef = useRef(false);
  const [workOrderSeasonFilter, setWorkOrderSeasonFilter] = useState<
    WorkSeason | "All"
  >("All");
  const [procedureRecords, setProcedureRecords] =
    useState<ProcedureRecord[]>([]);
  const [requestRecords, setRequestRecords] = useState<OwnerRequestRecord[]>(
    [],
  );
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestPortalToken, setRequestPortalToken] = useState("");
  const [marineRequestPortalToken, setMarineRequestPortalToken] = useState("");
  const [requestMessage, setRequestMessage] = useState("Loading requests...");
  const [calendarItems, setCalendarItems] = useState<AtlasCalendarItem[]>([]);
  const [seanCalendarPropertyFilter, setSeanCalendarPropertyFilter] = useState("all");
  const [todayLogEntries, setTodayLogEntries] = useState<TodayLogEntry[]>([]);
  const [todayLogText, setTodayLogText] = useState("");
  const [todayLogCategory, setTodayLogCategory] = useState<TodayLogEntry["category"]>("Task");
  const [dashboardVendorVisitId, setDashboardVendorVisitId] = useState("");
  const [dashboardVendorVisitNote, setDashboardVendorVisitNote] = useState("");
  const [completedDashboardRoutineIds, setCompletedDashboardRoutineIds] = useState<string[]>([]);
  const [dashboardRoutineItems, setDashboardRoutineItems] = useState<DashboardRoutineItem[]>([]);
  const [calendarColors, setCalendarColors] = useState<CalendarColor[]>(
    defaultCalendarColors,
  );
  const [partRecords, setPartRecords] = useState<PartRecord[]>(fallbackParts);
  const [workLinks, setWorkLinks] =
    useState<WorkLinkRecord[]>(defaultWorkLinks);
  const [workLinkEditorOpen, setWorkLinkEditorOpen] = useState(false);
  const [workLinkChooserOpen, setWorkLinkChooserOpen] = useState(false);
  const [workLinkDraft, setWorkLinkDraft] = useState<WorkLinkRecord>(() => ({
    id: "",
    name: "",
    category: "",
    vendor: "",
    url: "",
    logoText: "",
    logoBg: "#EEF6FF",
    logoUrl: "",
    logoColor: colors.navy3,
    notes: "",
  }));
  const [workLinkMessage, setWorkLinkMessage] = useState("");
  const [activeAppLink, setActiveAppLink] = useState<WorkLinkRecord | null>(null);
  const [appQrLink, setAppQrLink] = useState<WorkLinkRecord | null>(null);
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("0");
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [photoTimelineSearch, setPhotoTimelineSearch] = useState("");
  const [photoTimelineAssetId, setPhotoTimelineAssetId] = useState("all");
  const [photoTimelineYear, setPhotoTimelineYear] = useState("all");
  const [photoTimelinePaintingOnly, setPhotoTimelinePaintingOnly] = useState(false);
  const [photoTimelineHideLogos, setPhotoTimelineHideLogos] = useState(true);
  const [selectedPhotoTimelineId, setSelectedPhotoTimelineId] = useState("");
  const [photoTimelineView, setPhotoTimelineView] = useState<"timeline" | "projects" | "activity" | "history">("projects");
  const [estateTimelineTypeFilter, setEstateTimelineTypeFilter] = useState<"All" | "Project" | "Work Order" | "Photo" | "Document" | "Calendar" | "Task" | "Note">("All");
  const [estateTimelineRange, setEstateTimelineRange] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [photoTimelineProjectCategory, setPhotoTimelineProjectCategory] = useState<PhotoTimelineProjectCategory | "All">("All");
  const [photoTimelineTagFilter, setPhotoTimelineTagFilter] = useState<PhotoTimelineTag | "All">("All");
  const [photoTimelineVendorFilter, setPhotoTimelineVendorFilter] = useState("all");
  const [photoTimelineMonthFilter, setPhotoTimelineMonthFilter] = useState("all");
  const [photoTimelineOrganizationFilter, setPhotoTimelineOrganizationFilter] = useState<"all" | "unassigned" | "missing-tag" | "missing-date" | "before" | "during" | "after">("all");
  const [photoTimelineScrubber, setPhotoTimelineScrubber] = useState(100);
  const [selectedPhotoProjectId, setSelectedPhotoProjectId] = useState("");
  const [projectDetailTab, setProjectDetailTab] = useState<"overview" | "photos" | "documents" | "work" | "people" | "timeline">("overview");
  const [projectTimelineEntries, setProjectTimelineEntries] = useState<ProjectTimelineEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("atlas-project-timeline-entries-v1");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [projectsApiHydrated, setProjectsApiHydrated] = useState(false);
  const [projectQuickNoteTitle, setProjectQuickNoteTitle] = useState("");
  const [projectQuickNoteText, setProjectQuickNoteText] = useState("");
  const [projectQuickNoteDate, setProjectQuickNoteDate] = useState(todayISO());
  const [projectQuickNoteType, setProjectQuickNoteType] = useState<ProjectTimelineEntry["type"]>("Note");
  const [projectPhotoDate, setProjectPhotoDate] = useState(todayISO());
  const [projectPhotoCaption, setProjectPhotoCaption] = useState("");
  const [projectPhotoTag, setProjectPhotoTag] = useState<PhotoTimelineTag>("During");
  const [photoLightboxIds, setPhotoLightboxIds] = useState<string[]>([]);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState(-1);
  const [photoLightboxZoom, setPhotoLightboxZoom] = useState(1);
  const [photoLightboxPan, setPhotoLightboxPan] = useState({ x: 0, y: 0 });
  const [photoLightboxDragging, setPhotoLightboxDragging] = useState(false);
  const [photoLightboxDragOrigin, setPhotoLightboxDragOrigin] = useState({ x: 0, y: 0 });
  const [photoLightboxTouchStartX, setPhotoLightboxTouchStartX] = useState<number | null>(null);
  const [photoCompareOpen, setPhotoCompareOpen] = useState(false);
  const [photoCompareBeforeId, setPhotoCompareBeforeId] = useState("");
  const [photoCompareAfterId, setPhotoCompareAfterId] = useState("");
  const [photoComparePosition, setPhotoComparePosition] = useState(50);
  const [photoTimelineProjects, setPhotoTimelineProjects] = useState<PhotoTimelineProject[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("atlas-photo-timeline-projects-v1");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.map((project) => ({
            ...project,
            workOrderIds: Array.isArray(project.workOrderIds) ? project.workOrderIds.map(String) : project.workOrderId ? [String(project.workOrderId)] : [],
            vendorIds: Array.isArray(project.vendorIds) ? project.vendorIds.map(String) : project.vendorId ? [String(project.vendorId)] : [],
            documentIds: Array.isArray(project.documentIds) ? project.documentIds.map(String) : [],
            assigneeIds: Array.isArray(project.assigneeIds) ? project.assigneeIds.map(String) : [],
          }))
        : [];
    } catch {
      return [];
    }
  });
  const [photoTimelineMeta, setPhotoTimelineMeta] = useState<Record<string, PhotoTimelineMeta>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = window.localStorage.getItem("atlas-photo-timeline-meta-v1");
      const parsed = stored ? JSON.parse(stored) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [intakeDocs, setIntakeDocs] = useState<DocumentRecord[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItemRecord[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState("");
  const convertingFieldReportsRef = useRef(new Set<string>());
  const [inboxMessage, setInboxMessage] = useState("Loading Atlas Inbox...");
  const [analyzingInboxId, setAnalyzingInboxId] = useState("");
  const [savingInboxApprovalId, setSavingInboxApprovalId] = useState("");
  const [inboxReviewOpen, setInboxReviewOpen] = useState(false);
  const [inboxReviewDraft, setInboxReviewDraft] = useState<InboxReviewDraft>({
    documentType: "",
    summary: "",
    manufacturer: "",
    model: "",
    serial: "",
    invoiceNumber: "",
    amount: "",
    date: "",
    psi: "",
    temperature: "",
    ph: "",
    hours: "",
    assetId: "",
    locationId: "",
    vendorId: "",
    workOrderId: "",
    notes: "",
  });
  const [inboxSearch, setInboxSearch] = useState("");

  const [manualRecords, setManualRecords] =
    useState<ManualRecord[]>(defaultManuals);
  const [selectedManualId, setSelectedManualId] = useState("");
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [manualEditingId, setManualEditingId] = useState("");
  const [manualDraft, setManualDraft] = useState<ManualRecord>(() =>
    blankManual(),
  );
  const [manualSearch, setManualSearch] = useState("");
  const [manualCategoryFilter, setManualCategoryFilter] = useState<
    ManualCategory | "All"
  >("All");
  const [manualLinkedFilter, setManualLinkedFilter] = useState<
    "All" | "Linked" | "Unlinked"
  >("All");
  const [manualSortOrder, setManualSortOrder] = useState<
    "Alphabetical" | "Newest" | "Category"
  >("Alphabetical");
  const [manualMessage, setManualMessage] = useState(
    "Paste a manual PDF link, upload a file, or select an existing manual.",
  );

  const [intakeTitle, setIntakeTitle] = useState("");
  const [intakeType, setIntakeType] = useState("Paperwork / Scan");
  const [fastIntakeKind, setFastIntakeKind] =
    useState<FastIntakeKind>("Document");
  const [fastIntakeSaveMode, setFastIntakeSaveMode] =
    useState<FastIntakeSaveMode>("Attach to Existing");
  const [fastIntakeRecordName, setFastIntakeRecordName] = useState("");
  const [fastIntakeCategory, setFastIntakeCategory] = useState("General");
  const [fastIntakeManufacturer, setFastIntakeManufacturer] = useState("");
  const [fastIntakeModel, setFastIntakeModel] = useState("");
  const [fastIntakeSerial, setFastIntakeSerial] = useState("");
  const [fastIntakePriority, setFastIntakePriority] =
    useState<WorkOrderPriority>("Medium");
  const [fastIntakeRecurring, setFastIntakeRecurring] = useState(false);
  const [fastIntakeRecurrenceInterval, setFastIntakeRecurrenceInterval] = useState(1);
  const [fastIntakeRecurrenceUnit, setFastIntakeRecurrenceUnit] = useState<WorkOrderRecurrenceUnit>("Weeks");
  const [fastIntakeRecurrenceEndDate, setFastIntakeRecurrenceEndDate] = useState("");
  const [fastIntakeLocationId, setFastIntakeLocationId] = useState("general");
  const [fastIntakeAppendNotes, setFastIntakeAppendNotes] = useState(false);
  const [intakeTargetKind, setIntakeTargetKind] =
    useState<IntakeTargetKind>("Asset");
  const [intakeTargetId, setIntakeTargetId] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [intakePastedText, setIntakePastedText] = useState("");
  const [intakeFiles, setIntakeFiles] = useState<UploadedFileRecord[]>([]);
  const [intakeMessage, setIntakeMessage] = useState(
    "Ready to add paperwork, scans, screenshots, receipts, or pasted notes into Atlas.",
  );
  const [documentSyncStatus, setDocumentSyncStatus] = useState(
    "Document vault is loading from this browser. Atlas sync starts when /api/atlas-documents is installed.",
  );
  const [previewFile, setPreviewFile] = useState<UploadedFileRecord | null>(
    null,
  );
  const [previewZoom, setPreviewZoom] = useState(100);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState("All");
  const [documentLinkFilter, setDocumentLinkFilter] = useState("All");
  const [hideDocumentLogos, setHideDocumentLogos] = useState(true);
  const [documentSort, setDocumentSort] = useState<"newest" | "title" | "category">("newest");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentFileIndex, setSelectedDocumentFileIndex] = useState(0);
  const [favoriteDocumentIds, setFavoriteDocumentIds] = useState<string[]>([]);
  const [recentDocumentIds, setRecentDocumentIds] = useState<string[]>([]);
  const [documentQuickAccessOpen, setDocumentQuickAccessOpen] = useState(true);
  const [documentQualityOpen, setDocumentQualityOpen] = useState(true);
  const [blueprintPage, setBlueprintPage] = useState(1);
  const [openBlueprintSection, setOpenBlueprintSection] = useState<string | null>(null);
  const documentListScrollYRef = useRef(0);
  const documentOverlayScrollRef = useRef<HTMLDivElement>(null);
  const intakePhotoNameRef = useRef<HTMLInputElement>(null);
  const intakeHasPhoto = intakeFiles.some((file) =>
    (file.type || "").startsWith("image/"),
  );
  const normalizedIntakePhotoName = intakeTitle
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, "");
  const intakePhotoNeedsName =
    intakeHasPhoto &&
    (!normalizedIntakePhotoName ||
      /^(?:img|image|photo|picture|camera|dsc|pxl|screenshot|pasted[-_ ]?image)[-_ ]?\d*$/i.test(
        normalizedIntakePhotoName,
      ) ||
      /^\d{8,}$/.test(normalizedIntakePhotoName.replace(/[-_ ]/g, "")));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "atlas-photo-timeline-meta-v1",
        JSON.stringify(photoTimelineMeta),
      );
    } catch (error) {
      console.warn("Atlas could not save photo timeline labels.", error);
    }
  }, [photoTimelineMeta]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "atlas-photo-timeline-projects-v1",
        JSON.stringify(photoTimelineProjects),
      );
    } catch (error) {
      console.warn("Atlas could not save photo timeline projects.", error);
    }
  }, [photoTimelineProjects]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "atlas-project-timeline-entries-v1",
        JSON.stringify(projectTimelineEntries),
      );
    } catch (error) {
      console.warn("Atlas could not save project timeline entries.", error);
    }
  }, [projectTimelineEntries]);


  useEffect(() => {
    if (!projectsApiHydrated) return;
    const timer = window.setTimeout(() => {
      for (const project of photoTimelineProjects) {
        const projectPhotoMeta = Object.fromEntries(
          Object.entries(photoTimelineMeta).filter(([, meta]) => meta.projectId === project.id),
        );
        void postAtlasRecord("projects", {
          ...project,
          propertyId: activePropertyId,
          timelineEntries: projectTimelineEntries.filter((entry) => entry.projectId === project.id),
          photoMeta: projectPhotoMeta,
        });
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [projectsApiHydrated, photoTimelineProjects, projectTimelineEntries, photoTimelineMeta, activePropertyId]);

  useEffect(() => {
    if (photoLightboxIndex < 0 && !photoCompareOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPhotoLightboxIndex(-1);
        setPhotoCompareOpen(false);
        setPhotoLightboxZoom(1);
        setPhotoLightboxPan({ x: 0, y: 0 });
        return;
      }

      if (photoLightboxIndex < 0) return;
      if (event.key === "ArrowRight") {
        setPhotoLightboxIndex((current) => Math.min(photoLightboxIds.length - 1, current + 1));
      }
      if (event.key === "ArrowLeft") {
        setPhotoLightboxIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === "+" || event.key === "=") {
        setPhotoLightboxZoom((current) => Math.min(5, Number((current + 0.25).toFixed(2))));
      }
      if (event.key === "-") {
        setPhotoLightboxZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoCompareOpen, photoLightboxIds.length, photoLightboxIndex]);

  useEffect(() => {
    const allPropertyIds = ["2000", "6855", "3661", "hangar"];

    setAllowedPropertyIds(allPropertyIds);

    void fetch("/api/atlas-team", {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Atlas team request failed: ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => {
        const normalizeEmail = (value: unknown) =>
          String(value || "").trim().toLowerCase();
        const members = Array.isArray(payload?.members) ? payload.members : [];
        const canonicalCoworkerName = (value: unknown) => {
          const name = String(value || "").trim();
          const normalized = name.toLowerCase().replace(/[^a-z]+/g, " ").trim();
          if (/^(pat|patrick)( tanner)?$/.test(normalized)) return "Patrick Tanner";
          if (/^sean( powell)?$/.test(normalized)) return "Sean Powell";
          if (/^addison(?: .*)?$/.test(normalized)) return "Addison";
          if (/^nick(?: thornton)?$/.test(normalized)) return "Nick";
          return name;
        };
        const normalizedTeamMembers = members
          .filter((member: any) => member && member.active !== false)
          .map((member: any) => ({
            id: String(member.id || member.email || member.name || "").trim(),
            name: canonicalCoworkerName(member.name || member.email || "Atlas User"),
            email: normalizeEmail(member.email),
            role: String(member.role || "employee").trim().toLowerCase(),
            active: member.active !== false,
            propertyIds: Array.isArray(member.propertyIds) ? member.propertyIds.map(String) : [],
            accessProfiles: Array.isArray(member.accessProfiles) ? member.accessProfiles.map(String) : [],
          }))
          .filter((member: any) => Boolean(member.id));
        const uniqueTeamMembers = Array.from(
          normalizedTeamMembers.reduce((map: Map<string, any>, member: any) => {
            const key = String(member.name || member.email || member.id).trim().toLowerCase();
            const existing = map.get(key);
            if (!existing) {
              map.set(key, member);
              return map;
            }
            const preferIncoming = /^field-/.test(String(existing.email || "")) && !/^field-/.test(String(member.email || ""));
            const preferred = preferIncoming ? member : existing;
            map.set(key, {
              ...preferred,
              propertyIds: Array.from(new Set([...(existing.propertyIds || []), ...(member.propertyIds || [])])),
              accessProfiles: Array.from(new Set([...(existing.accessProfiles || []), ...(member.accessProfiles || [])])),
            });
            return map;
          }, new Map<string, any>()).values(),
        ) as Array<{
          id: string;
          name: string;
          email: string;
          role: string;
          active: boolean;
          propertyIds: string[];
          accessProfiles: string[];
        }>;
        setTeamDirectory(uniqueTeamMembers);

        // FIELD DEVICE BINDING
        // Atlas still uses the existing shared manager login. To keep a staff phone
        // out of the manager dashboard without changing middleware/auth again, a phone
        // can be permanently bound to one Team Center member. Open Atlas once with
        // ?field=<member id/name> (for example ?field=addison). The binding is saved
        // only on that device. ?field=clear removes it on that device.
        let deviceFieldIdentity = "";
        try {
          const params = new URLSearchParams(window.location.search);
          const requestedField = String(params.get("field") || "").trim().toLowerCase();
          if (requestedField === "clear") {
            window.localStorage.removeItem("atlas-field-device-v1");
          } else if (requestedField) {
            window.localStorage.setItem("atlas-field-device-v1", requestedField);
          }
          deviceFieldIdentity = String(
            requestedField && requestedField !== "clear"
              ? requestedField
              : window.localStorage.getItem("atlas-field-device-v1") || "",
          ).trim().toLowerCase();

          if (params.has("field")) {
            params.delete("field");
            const nextQuery = params.toString();
            window.history.replaceState(
              {},
              "",
              `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`,
            );
          }
        } catch {
          deviceFieldIdentity = "";
        }

        const deviceMember = deviceFieldIdentity
          ? members.find((member: { id?: unknown; name?: unknown; email?: unknown }) => {
              const id = String(member?.id || "").trim().toLowerCase();
              const name = String(member?.name || "").trim().toLowerCase();
              const firstName = name.split(/\s+/)[0] || "";
              const email = normalizeEmail(member?.email);
              const emailName = email.split("@")[0] || "";
              return [id, name, firstName, email, emailName].includes(deviceFieldIdentity);
            }) || null
          : null;

        const currentEmail = deviceMember
          ? normalizeEmail(deviceMember?.email)
          : normalizeEmail(payload?.currentUser?.email);
        const matchedMember = deviceMember || members.find(
          (member: { email?: unknown }) =>
            Boolean(currentEmail) && normalizeEmail(member?.email) === currentEmail,
        ) || null;

        // The Team Center member record is authoritative for role and profile.
        // The authentication session only proves who signed in; it must not
        // accidentally give an invited employee the normal manager dashboard.
        const rawRole = String(
          deviceMember
            ? matchedMember?.role || "employee"
            : matchedMember?.role || payload?.currentUser?.role || "viewer",
        ).trim().toLowerCase();
        const validRoles: AtlasCurrentUser["role"][] = [
          "master",
          "administrator",
          "manager",
          "employee",
          "vendor",
          "viewer",
        ];
        let role: AtlasCurrentUser["role"] = validRoles.includes(
          rawRole as AtlasCurrentUser["role"],
        )
          ? (rawRole as AtlasCurrentUser["role"])
          : "viewer";

        // HARD FIELD ISOLATION: once this device is bound with ?field=addison,
        // never allow the shared/master login to resolve back to Nick's UI.
        const isAddisonFieldDevice = deviceFieldIdentity === "addison";
        if (isAddisonFieldDevice) role = "employee";

        const memberPropertyIds = Array.isArray(matchedMember?.propertyIds)
          ? matchedMember.propertyIds.map((propertyId: unknown) => String(propertyId))
          : [];
        const sessionPropertyIds = Array.isArray(payload?.currentUser?.propertyIds)
          ? payload.currentUser.propertyIds.map((propertyId: unknown) => String(propertyId))
          : [];
        const returnedPropertyIds: string[] = memberPropertyIds.length
          ? memberPropertyIds
          : sessionPropertyIds;
        const isFullAccess = role === "master" || role === "administrator";
        const hasExplicitHomeAccess =
          currentEmail === "nthornton87@yahoo.com" || returnedPropertyIds.includes("4725");
        const allowed: string[] = isFullAccess
          ? [...allPropertyIds]
          : returnedPropertyIds.length > 0
            ? [...new Set<string>(returnedPropertyIds)]
            : ["2000"];
        if (hasExplicitHomeAccess && !allowed.includes("4725")) allowed.push("4725");

        const memberPermissions =
          matchedMember?.permissions && typeof matchedMember.permissions === "object"
            ? matchedMember.permissions
            : null;
        const sessionPermissions =
          !deviceMember && payload?.currentUser?.permissions && typeof payload.currentUser.permissions === "object"
            ? payload.currentUser.permissions
            : {};
        const memberAccessProfiles = Array.isArray(matchedMember?.accessProfiles)
          ? matchedMember.accessProfiles.map(String)
          : [];
        const sessionAccessProfiles = Array.isArray(payload?.currentUser?.accessProfiles)
          ? payload.currentUser.accessProfiles.map(String)
          : [];

        setCurrentAtlasUser({
          id: String(matchedMember?.id || payload?.currentUser?.id || ""),
          name: isAddisonFieldDevice
            ? "Addison"
            : String(
                matchedMember?.name ||
                  payload?.currentUser?.name ||
                  currentEmail ||
                  "Atlas User",
              ),
          email: currentEmail,
          role,
          propertyIds: isAddisonFieldDevice ? ["2000"] : allowed,
          permissions: isAddisonFieldDevice ? {} : (memberPermissions || sessionPermissions),
          accessProfiles: isAddisonFieldDevice
            ? ["addison", "daily-routines"]
            : memberAccessProfiles.length
              ? memberAccessProfiles
              : sessionAccessProfiles,
        });
        setAllowedPropertyIds(isAddisonFieldDevice ? ["2000"] : allowed);

        const isRestrictedRole = ["employee", "vendor", "viewer"].includes(role);
        if (isRestrictedRole) {
          setDepartmentCenter("");
          setScreenState("dashboard");
        }

        if (!allowed.includes(activePropertyId)) {
          selectProperty(allowed[0] || "2000");
        }

        setTeamAccessError("");
        setTeamAccessResolved(true);
      })
      .catch((error) => {
        console.warn("Atlas team access could not load.", error);

        // Fail closed. Never expose manager/admin UI when Atlas cannot verify
        // the signed-in user. A refresh retries the Team Center request.
        setCurrentAtlasUser(null);
        setAllowedPropertyIds(["2000"]);
        setDepartmentCenter("");
        setScreenState("dashboard");
        setTeamAccessError("Atlas could not verify this account. Refresh to try again.");
        setTeamAccessResolved(true);
      });
  }, []);

  useEffect(() => {
    if (!intakePhotoNeedsName) return;
    window.setTimeout(() => {
      intakePhotoNameRef.current?.focus();
      intakePhotoNameRef.current?.select();
    }, 50);
  }, [intakeFiles.length, intakePhotoNeedsName]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("atlas_recent_searches_v1");
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setRecentSearches(
          parsed
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 6),
        );
      }
      const pinned = JSON.parse(window.localStorage.getItem("atlas_command_pins_v1") || "[]");
      const counts = JSON.parse(window.localStorage.getItem("atlas_command_open_counts_v1") || "{}");
      const commands = JSON.parse(window.localStorage.getItem("atlas_saved_commands_v1") || "[]");
      setCommandPinnedIds(Array.isArray(pinned) ? pinned.map(String).slice(0, 20) : []);
      setCommandOpenCounts(counts && typeof counts === "object" && !Array.isArray(counts) ? counts : {});
      setSavedCommands(Array.isArray(commands) ? commands.map(String).filter(Boolean).slice(0, 12) : []);
    } catch {
      setRecentSearches([]);
      setCommandPinnedIds([]);
      setCommandOpenCounts({});
      setSavedCommands([]);
    }
  }, []);

  useEffect(() => {
    setSelectedDocumentFileIndex(0);
  }, [selectedDocumentId]);

  useEffect(() => {
    try {
      const favorites = window.localStorage.getItem(
        "atlas_favorite_documents_v1",
      );
      const parsedFavorites = favorites ? JSON.parse(favorites) : [];
      if (Array.isArray(parsedFavorites)) {
        setFavoriteDocumentIds(parsedFavorites.map(String).filter(Boolean));
      }

      const recent = window.localStorage.getItem("atlas_recent_documents_v1");
      const parsedRecent = recent ? JSON.parse(recent) : [];
      if (Array.isArray(parsedRecent)) {
        setRecentDocumentIds(
          parsedRecent.map(String).filter(Boolean).slice(0, 8),
        );
      }

      if (
        window.localStorage.getItem("atlas_document_quick_access_open_v1") ===
        "false"
      ) {
        setDocumentQuickAccessOpen(false);
      }
      if (
        window.localStorage.getItem("atlas_document_quality_open_v1") ===
        "false"
      ) {
        setDocumentQualityOpen(false);
      }
    } catch {
      // Keep clean defaults if saved document shortcuts cannot be read.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_favorite_documents_v1",
        JSON.stringify(favoriteDocumentIds),
      );
    } catch {}
  }, [favoriteDocumentIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_recent_documents_v1",
        JSON.stringify(recentDocumentIds.slice(0, 8)),
      );
    } catch {}
  }, [recentDocumentIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_document_quick_access_open_v1",
        String(documentQuickAccessOpen),
      );
    } catch {}
  }, [documentQuickAccessOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_document_quality_open_v1",
        String(documentQualityOpen),
      );
    } catch {}
  }, [documentQualityOpen]);

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [mapMoveLabelId, setMapMoveLabelId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetEditorOpen, setAssetEditorOpen] = useState(false);
  const [assetSortOrder, setAssetSortOrder] = useState<"az" | "za">("az");
  const [assetListDensity, setAssetListDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [assetListSearch, setAssetListSearch] = useState("");
  const [assetFiltersOpen, setAssetFiltersOpen] = useState(false);
  const [assetBulkMode, setAssetBulkMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [favoriteAssetIds, setFavoriteAssetIds] = useState<string[]>([]);
  const [recentAssetIds, setRecentAssetIds] = useState<string[]>([]);
  const [assetQuickAccessOpen, setAssetQuickAccessOpen] = useState(true);
  const [assetRecordQualityOpen, setAssetRecordQualityOpen] = useState(true);
  const [assetPanelCustomizeOpen, setAssetPanelCustomizeOpen] = useState(false);
  const [assetPanelSection, setAssetPanelSection] = useState<
    "overview" | "work" | "history" | "photos" | "documents" | "procedures" | "notes"
  >("overview");
  const [assetPanelScrolling, setAssetPanelScrolling] = useState(false);
  const assetPanelScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assetVisibleSections, setAssetVisibleSections] = useState<Record<string, boolean>>({
    overview: true,
    status: true,
    linkedRecords: true,
    recordSetup: true,
    costs: false,
  });
  const [excludedAssetStatuses, setExcludedAssetStatuses] = useState<string[]>([]);
  const [excludedAssetCategories, setExcludedAssetCategories] = useState<string[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const navigationRestoreRef = useRef(false);
  const navigationScrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    navigationRestoreRef.current = false;
    const saved = readAtlasNavigationState(activePropertyId);

    if (activePropertyId === "4725") {
      setScreenState("dashboard");
      setSelectedAssetId("");
      setSelectedLocationId("");
      setSelectedVendorId("");
      setSelectedServiceId("");
    } else {
      if (saved.screen) setScreen(saved.screen as any);
      if (saved.selectedAssetId) setSelectedAssetId(saved.selectedAssetId);
      if (saved.selectedLocationId) setSelectedLocationId(saved.selectedLocationId);
      if (saved.selectedVendorId) setSelectedVendorId(saved.selectedVendorId);
      if (saved.selectedServiceId) setSelectedServiceId(saved.selectedServiceId);
    }

    const restoreY = activePropertyId === "4725"
      ? 0
      : Math.max(0, Number(saved.scrollY) || 0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: restoreY, behavior: "auto" });
        navigationRestoreRef.current = true;
      });
    });
  }, [activePropertyId]);

  useEffect(() => {
    if (!navigationRestoreRef.current) return;
    writeAtlasNavigationState(activePropertyId, {
      screen: String(screen || ""),
      selectedAssetId: selectedAssetId || "",
      selectedLocationId: selectedLocationId || "",
      selectedVendorId: selectedVendorId || "",
      selectedServiceId: selectedServiceId || "",
    });
  }, [
    activePropertyId,
    screen,
    selectedAssetId,
    selectedLocationId,
    selectedVendorId,
    selectedServiceId,
  ]);

  useEffect(() => {
    function rememberScroll() {
      if (!navigationRestoreRef.current) return;
      if (navigationScrollTimerRef.current) {
        window.clearTimeout(navigationScrollTimerRef.current);
      }
      navigationScrollTimerRef.current = window.setTimeout(() => {
        writeAtlasNavigationState(activePropertyId, {
          screen: String(screen || ""),
          scrollY: window.scrollY,
        });
      }, 120);
    }

    function rememberBeforeLeave() {
      writeAtlasNavigationState(activePropertyId, {
        screen: String(screen || ""),
        selectedAssetId: selectedAssetId || "",
        selectedLocationId: selectedLocationId || "",
        selectedVendorId: selectedVendorId || "",
        selectedServiceId: selectedServiceId || "",
        scrollY: window.scrollY,
      });
    }

    window.addEventListener("scroll", rememberScroll, { passive: true });
    window.addEventListener("pagehide", rememberBeforeLeave);

    return () => {
      window.removeEventListener("scroll", rememberScroll);
      window.removeEventListener("pagehide", rememberBeforeLeave);
      if (navigationScrollTimerRef.current) {
        window.clearTimeout(navigationScrollTimerRef.current);
      }
      rememberBeforeLeave();
    };
  }, [
    activePropertyId,
    screen,
    selectedAssetId,
    selectedLocationId,
    selectedVendorId,
    selectedServiceId,
  ]);

  const [workOrdersOpenKey, setWorkOrdersOpenKey] = useState(0);
  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [procedureDraftNotes, setProcedureDraftNotes] = useState("");
  const [procedureMessage, setProcedureMessage] = useState("");
  const procedureListScrollYRef = useRef(0);
  const procedureOverlayScrollRef = useRef<HTMLDivElement>(null);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [dirtyRecords, setDirtyRecords] = useState<Record<string, boolean>>({});
  const [qrKind, setQrKind] = useState<QrKind>("asset");
  const [qrSearch, setQrSearch] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState(
    "Scanner is off. Start the camera, then point it at an Atlas QR label.",
  );
  const [scannerManualValue, setScannerManualValue] = useState("");
  const [lastScannedQr, setLastScannedQr] = useState("");

  useEffect(() => {
    if (!assetBulkMode && selectedAssetIds.length) {
      setSelectedAssetIds([]);
    }
  }, [assetBulkMode, selectedAssetIds.length]);

  useEffect(() => {
    try {
      const storedFavorites = window.localStorage.getItem("atlas_favorite_assets_v1");
      const parsedFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
      if (Array.isArray(parsedFavorites)) {
        setFavoriteAssetIds(parsedFavorites.map(String).filter(Boolean));
      }

      const storedRecent = window.localStorage.getItem("atlas_recent_assets_v1");
      const parsedRecent = storedRecent ? JSON.parse(storedRecent) : [];
      if (Array.isArray(parsedRecent)) {
        setRecentAssetIds(parsedRecent.map(String).filter(Boolean).slice(0, 8));
      }

      const storedOpen = window.localStorage.getItem("atlas_asset_quick_access_open_v1");
      if (storedOpen === "false") setAssetQuickAccessOpen(false);

      const storedQualityOpen = window.localStorage.getItem(
        "atlas_asset_record_quality_open_v1",
      );
      if (storedQualityOpen === "false") setAssetRecordQualityOpen(false);
    } catch {
      // Keep clean defaults when saved asset shortcuts cannot be read.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_favorite_assets_v1",
        JSON.stringify(favoriteAssetIds),
      );
    } catch {}
  }, [favoriteAssetIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_recent_assets_v1",
        JSON.stringify(recentAssetIds.slice(0, 8)),
      );
    } catch {}
  }, [recentAssetIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_asset_quick_access_open_v1",
        String(assetQuickAccessOpen),
      );
    } catch {}
  }, [assetQuickAccessOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_asset_record_quality_open_v1",
        String(assetRecordQualityOpen),
      );
    } catch {}
  }, [assetRecordQualityOpen]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("atlas_asset_panel_section_v1");
      if (["overview","work","history","photos","documents","procedures","notes"].includes(saved || "")) {
        setAssetPanelSection(saved as typeof assetPanelSection);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("atlas_asset_panel_section_v1", assetPanelSection);
    } catch {}
  }, [assetPanelSection]);

  useEffect(() => {
    try {
      const storedDensity = window.localStorage.getItem("atlas_asset_list_density_v1");
      if (storedDensity === "compact" || storedDensity === "comfortable") {
        setAssetListDensity(storedDensity);
      }
    } catch {
      // Keep the comfortable default when the preference cannot be read.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("atlas_asset_list_density_v1", assetListDensity);
    } catch {
      // List density is optional and should never interrupt Atlas.
    }
  }, [assetListDensity]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("atlas_asset_visible_sections_v1");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        setAssetVisibleSections((current) => ({ ...current, ...parsed }));
      }
    } catch {
      // Keep safe defaults when saved display preferences cannot be read.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "atlas_asset_visible_sections_v1",
        JSON.stringify(assetVisibleSections),
      );
    } catch {
      // Display preferences are optional and should never interrupt Atlas.
    }
  }, [assetVisibleSections]);

  useEffect(() => {
    return () => {
      if (assetPanelScrollTimerRef.current) {
        clearTimeout(assetPanelScrollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mobileDetailOpen =
      isMobile &&
      ((screen === "documents" && Boolean(selectedDocumentId)) ||
        (screen === "procedures" && Boolean(selectedProcedureId)) ||
        (screen === "locations" && locationMobileDrawerOpen) ||
        (screen === "map" && mapMobileDrawerOpen));

    if (!mobileDetailOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [
    isMobile,
    screen,
    selectedDocumentId,
    selectedProcedureId,
    locationMobileDrawerOpen,
    mapMobileDrawerOpen,
  ]);

  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [selectedCalendarOccurrenceDate, setSelectedCalendarOccurrenceDate] = useState("");
  const [calendarDraft, setCalendarDraft] = useState<AtlasCalendarItem>(() =>
    blankCalendarItem(todayISO()),
  );
  const [calendarDirty, setCalendarDirty] = useState(false);
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [home4725CalendarMode, setHome4725CalendarMode] = useState<"family" | "chores">("family");
  const [home4725PersonFilter, setHome4725PersonFilter] = useState("All");
  const [home4725ChoreMovePrompt, setHome4725ChoreMovePrompt] = useState<{
    title: string;
    fromDate: string;
    toDate: string;
    resolve: (scope: "one" | "all" | null) => void;
  } | null>(null);
  const [showUsHolidays, setShowUsHolidays] = useState(true);
  const [showJewishHolidays, setShowJewishHolidays] = useState(true);
  const [calendarCategoryFilters, setCalendarCategoryFilters] = useState<
    Record<string, boolean>
  >({});
  const [calendarIntakeText, setCalendarIntakeText] = useState("");
  const [calendarIntakeMessage, setCalendarIntakeMessage] = useState("");

  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState("");
  const [dashboardWeatherDetailDate, setDashboardWeatherDetailDate] = useState("");
  const [weatherStatus, setWeatherStatus] = useState(
    "Loading 7-day irrigation weather...",
  );
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(
    "Ask Atlas about assets, locations, vendors, contacts, work orders, calendar items, procedures, documents, parts, or map records.",
  );
  const [manualCandidates, setManualCandidates] = useState<ManualCandidate[]>(
    [],
  );
  const [manualSavingUrl, setManualSavingUrl] = useState("");
  const [manualSaveMessage, setManualSaveMessage] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantTurns, setAssistantTurns] = useState<AssistantTurn[]>([]);
  const [assistantRecordResults, setAssistantRecordResults] = useState<
    SearchResult[]
  >([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState("");
  const [pendingAssistantAction, setPendingAssistantAction] =
    useState<PendingAssistantAction | null>(null);
  const [assistantActionSaving, setAssistantActionSaving] = useState(false);
  const [dashboardAssistantOpen, setDashboardAssistantOpen] = useState(false);
  const askAtlasAbortRef = useRef<AbortController | null>(null);
  const askAtlasIndexRequestedRef = useRef<Set<string>>(new Set());
  const [assistantSources, setAssistantSources] = useState<AskAtlasSource[]>([]);
  const [workPlanInput, setWorkPlanInput] = useState("");

  useEffect(() => {
    const focusedDocuments = intakeDocs.filter((document) => {
      const text = [
        document.title,
        document.type,
        document.area,
        document.notes,
        ...(document.files || []).map((file) => file.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const hasPdf = (document.files || []).some((file) => {
        const name = String(file.name || "").toLowerCase();
        const type = String(file.type || "").toLowerCase();
        const url = String(file.url || "").toLowerCase();
        return type.includes("pdf") || name.endsWith(".pdf") || url.includes(".pdf");
      });
      return (
        hasPdf &&
        /as[- ]?built|as\s+buids?|blueprint|drawing|schematic/.test(text) &&
        /mechanical|hvac|radiant|hydronic|boiler|pump/.test(text)
      );
    });

    focusedDocuments.slice(0, 3).forEach((document) => {
      const key = `${activePropertyId}:${document.id}`;
      if (askAtlasIndexRequestedRef.current.has(key)) return;
      askAtlasIndexRequestedRef.current.add(key);
      void fetch("/api/atlas-document-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activePropertyId,
          document: {
            id: document.id,
            propertyId: activePropertyId,
            title: document.title,
            type: document.type,
            area: document.area,
            notes: document.notes,
            pastedText: document.pastedText,
            href: document.href,
            files: (document.files || []).map((file) => ({
              name: file.name,
              type: file.type,
              url: file.url,
            })),
          },
        }),
      }).catch(() => {
        askAtlasIndexRequestedRef.current.delete(key);
      });
    });
  }, [activePropertyId, intakeDocs]);

  const [workPlanTasks, setWorkPlanTasks] = useState<WorkPlanTask[]>(() =>
    readStoredArray<WorkPlanTask>(["atlas-tasks-v1"], []),
  );
  const [taskMeta, setTaskMeta] = useState<Record<string, AtlasTaskMeta>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem("atlas-task-meta-v1") || "{}");
    } catch {
      return {};
    }
  });
  const [tasksView, setTasksView] = useState<"tasks" | "walk" | "build" | "route" | "addison" | "analytics" | "backlog" | "vehicles" | "seasonal" | "templates" | "lists" | "intelligence" | "planner">("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const rapidTaskInputRef = useRef<HTMLInputElement | null>(null);
  const [newPartyChecklistItem, setNewPartyChecklistItem] = useState("");
  const [selectedListId, setSelectedListId] = useState("graduation-party");
  const [taskListFilter, setTaskListFilter] = useState<TaskListFilter>("today");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFocusMode, setTaskFocusMode] = useState(false);
  const [walkVoiceListening, setWalkVoiceListening] = useState(false);
  const [backlogItems, setBacklogItems] = useState<AtlasBacklogItem[]>(() => readStoredArray<AtlasBacklogItem>(["atlas-backlog-v1"], []));
  const [newBacklogTitle, setNewBacklogTitle] = useState("");
  const [vehicleCare, setVehicleCare] = useState<AtlasVehicleCare[]>(() =>
    readStoredArray<AtlasVehicleCare>(["atlas-vehicle-care-v1"], []),
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [garageVehicleTab, setGarageVehicleTab] = useState<"Overview" | "Maintenance" | "Cleaning" | "Documents" | "Photos">("Overview");
  const [garageVehicleEditing, setGarageVehicleEditing] = useState(false);
  const [garageHiddenVehicleIds, setGarageHiddenVehicleIds] = useState<string[]>(() =>
    readStoredArray<string>(["atlas-garage-hidden-vehicles-v1"], []),
  );
  const [newVehicleName, setNewVehicleName] = useState("");
  const [seasonalItems, setSeasonalItems] = useState<AtlasSeasonalItem[]>(() =>
    readStoredArray<AtlasSeasonalItem>(["atlas-seasonal-work-v1"], []).filter(
      (item) => !["annual-appliance-service", "winter-tires"].includes(String(item.id || "")),
    ),
  );
  const [daySessions, setDaySessions] = useState<AtlasDaySession[]>(() => readStoredArray<AtlasDaySession>(["atlas-day-sessions-v1"], []));
  const [workPlanTargetHours, setWorkPlanTargetHours] = useState(7);
  const [workPlanSaving, setWorkPlanSaving] = useState(false);
  const [workPlanMessage, setWorkPlanMessage] = useState(
    "Paste one task per line, then build a balanced weekly plan.",
  );

  useEffect(() => {
    saveStoredArray(`atlas-tasks-v1-${activePropertyId}`, workPlanTasks);
    if (activePropertyId === "2000") saveStoredArray("atlas-tasks-v1", workPlanTasks);
  }, [activePropertyId, workPlanTasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`atlas-task-meta-v1-${activePropertyId}`, JSON.stringify(taskMeta));
      if (activePropertyId === "2000") window.localStorage.setItem("atlas-task-meta-v1", JSON.stringify(taskMeta));
    } catch (error) {
      console.warn("Atlas could not save task details.", error);
    }
  }, [activePropertyId, taskMeta]);


  useEffect(() => {
    if (
      !ready ||
      !operationsHydrated ||
      syncState !== "synced" ||
      activePropertyId !== "2000" ||
      typeof window === "undefined" ||
      applianceAnnualServiceSetupRunningRef.current
    ) return;

    const repairKey = "atlas-annual-appliance-service-repair-v5-2000";
    if (window.localStorage.getItem(repairKey) === "done") return;

    const appliances = byName(
      assetRecords.filter(
        (asset) => String(asset.category || "").trim().toLowerCase() === "appliance",
      ),
    );
    if (!appliances.length) return;

    const locationDate = (asset: AtlasAssetRecord, index: number) => {
      const location = normalizeLocationName(locationName(asset.locationId));
      if (location.includes("wine room")) return "2026-12-01";
      if (location.includes("kitchen")) return "2026-12-03";
      if (location.includes("pool")) return "2026-12-08";
      if (location.includes("upstairs laundry")) return "2026-12-10";
      if (location.includes("house manager")) return "2026-12-15";
      if (location.includes("fitness")) return "2026-12-17";
      if (location.includes("formal dining")) return "2026-12-21";
      if (location.includes("mechanical room")) return "2026-12-22";
      if (location.includes("pantry")) return "2026-12-23";
      const fallbackDates = [
        "2026-12-02", "2026-12-04", "2026-12-07", "2026-12-09",
        "2026-12-11", "2026-12-14", "2026-12-16", "2026-12-18",
        "2026-12-28", "2026-12-29", "2026-12-30",
      ];
      return fallbackDates[index % fallbackDates.length];
    };

    const targetRecords = appliances.map((asset, index) => {
      const stableAssetKey = String(asset.id || asset.name || index)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return normalizeService({
        id: `wo-appliance-annual-service-${stableAssetKey}`,
        propertyId: activePropertyId,
        title: `Annual Service - ${asset.name}`,
        date: locationDate(asset, index),
        status: "Open",
        priority: "Medium",
        notes: "",
        assetId: asset.id,
        locationId: asset.locationId || "",
        vendorId: (asset.vendorIds || [])[0] || "",
        procedureId: "",
        followUpDate: "",
        recurring: true,
        recurrenceInterval: 1,
        recurrenceUnit: "Years",
        recurrenceEndDate: "",
        season: "Winter",
        lastCompletedDate: "",
        completionHistory: [],
        workType: "Preventive Maintenance",
        workCategory: "Annual Service",
        responsibilityArea: "House & Maintenance",
        assignedTo: "Nick",
        photos: [],
        documents: [],
        checklist: [],
        notesHistory: [],
        serviceHistory: [],
      });
    });

    const existingIds = new Set(serviceRecords.map((record) => String(record.id || "")));
    const missingRecords = targetRecords.filter((record) => !existingIds.has(String(record.id)));
    if (!missingRecords.length) {
      window.localStorage.setItem(repairKey, "done");
      return;
    }

    applianceAnnualServiceSetupRunningRef.current = true;
    void (async () => {
      try {
        missingRecords.forEach((record) => clearWorkOrderTombstone(record.id));
        const saveResults = await Promise.all(
          missingRecords.map((record) =>
            postAtlasRecord("work_orders", { ...record, propertyId: activePropertyId }),
          ),
        );
        if (saveResults.some((result) => !result)) return;

        const repairedIds = new Set(missingRecords.map((record) => String(record.id)));
        setServiceRecords((current) =>
          workOrdersByIdentity([
            ...missingRecords,
            ...current.filter((record) => !repairedIds.has(String(record.id || ""))),
          ]),
        );
        window.localStorage.setItem(repairKey, "done");
        showSaveToast(`${missingRecords.length} missing Annual Service work orders restored.`);
      } finally {
        applianceAnnualServiceSetupRunningRef.current = false;
      }
    })();
  }, [
    ready,
    operationsHydrated,
    syncState,
    activePropertyId,
    assetRecords,
    serviceRecords,
  ]);

  useEffect(() => { saveStoredArray("atlas-backlog-v1", backlogItems); }, [backlogItems]);
  useEffect(() => {
    saveStoredArray(`atlas-vehicle-care-v1-${activePropertyId}`, vehicleCare);
    if (activePropertyId === "2000") saveStoredArray("atlas-vehicle-care-v1", vehicleCare);
  }, [activePropertyId, vehicleCare]);
  useEffect(() => {
    saveStoredArray(`atlas-garage-hidden-vehicles-v1-${activePropertyId}`, garageHiddenVehicleIds);
    if (activePropertyId === "2000") saveStoredArray("atlas-garage-hidden-vehicles-v1", garageHiddenVehicleIds);
  }, [activePropertyId, garageHiddenVehicleIds]);
  useEffect(() => {
    if (!ready || !operationsHydrated || syncState !== "synced") return;

    const mirrored = calendarItems.filter((item) => {
      const source = String(item.source || "").toLowerCase();
      const linkedType = String(item.linkedType || "").toLowerCase();
      return (
        source === "task" ||
        source === "work-order" ||
        source === "workorder" ||
        source === "service" ||
        linkedType === "task" ||
        linkedType === "work order"
      );
    });

    if (!mirrored.length) return;

    const mirroredIds = new Set(mirrored.map((item) => item.id));
    setCalendarItems((current) =>
      current.filter((item) => !mirroredIds.has(item.id)),
    );
    mirrored.forEach((item) => {
      void deleteAtlasRecord("calendar", item.id, { suppressFailureToast: true });
    });
  }, [ready, operationsHydrated, syncState, activePropertyId, calendarItems]);

  useEffect(() => {
    if (!ready || !operationsHydrated || syncState !== "synced" || activePropertyId !== "2000" || typeof window === "undefined") return;
    const purgeKey = "atlas-ai-generated-record-purge-v6-2000";
    if (window.localStorage.getItem(purgeKey) === "done" || aiGeneratedPurgeRunningRef.current) return;

    const generatedTaskTitles = new Set([
      "monday property reset garage", "tuesday dock waterfront recreation", "wednesday landscaping irrigation",
      "thursday pool spa outdoor cleaning", "friday maintenance weekend readiness", "friday seasonal spider control",
      "monday computer work admin", "tuesday computer work admin", "wednesday computer work admin",
      "thursday computer work admin", "friday computer work weekly closeout",
      "clean windows waterside great room", "clean windows east side bedrooms",
      "clean windows courtyard main entry", "clean windows garages adu remaining areas",
      "treat pool 2 bags oxysheen 8 oz pool juice", "brush pool", "hand vacuum pool", "suction vacuum pool",
      "robot vacuum pool", "check pool filter pressure backwash if needed", "test and treat spa",
      "irrigation startup and inspection", "irrigation winterization", "boat and sea doo spring opening",
      "boat and sea doo winterizing", "spring property cleanup", "owner arrival readiness",
      "party or event readiness", "annual property inspections"
    ]);
    const generatedWorkOrderIds = (id: string) =>
      id.startsWith("fleet-wo-") || id.startsWith("annual-appliance-") || id.startsWith("wo-approved-appliance-service-") || id === "wo-pool-weekly" || id === "wo-landscape-weeding" || id === "wo-annual-winter-truck-sandbags" ||
      id.startsWith("wo-holiday-tree-") || id === "wo-weekly-courtyard-gutters-flat-roof" ||
      id.startsWith("wo-daily-leaf-season-roof-") || id === "wo-weekly-ipe-deck-skylights" ||
      id === "wo-monthly-addition-exterior-windows" || id === "wo-monthly-original-home-exterior-windows" ||
      id === "seasonal-pressure-wash-spring" || id === "seasonal-pressure-wash-fall" ||
      id === "wo-quarterly-house-hvac-filters" || id === "wo-annual-sundance-880-filters" ||
      id === "wo-monthly-sundance-880-filter-cleaning" || id === "wo-weekly-pool-chlorine-tabs" ||
      id === "wo-monthly-vehicle-tires-fluids" || id === "wo-monthly-aqua-quip-water-test" ||
      id === "wo-monthly-pest-control-service";
    const generatedCalendarId = (id: string) =>
      id === "cal-friday-meeting" || id === "cal-tuesday-meeting" || id === "cal-sunstream" || id === "cal-seaborne" || id === "cal-carpet-prep" || id === "cal-flooring" ||
      id.startsWith("fleet-clean-") || id.startsWith("fleet-service-") || id.startsWith("care-") ||
      id.startsWith("routine-") || id.startsWith("calendar-annual-appliance-") || id.startsWith("calendar-holiday-tree-") ||
      id.startsWith("calendar-weekly-courtyard-gutters-flat-roof") || id.startsWith("calendar-daily-leaf-season-roof-") ||
      id === "calendar-weekly-ipe-deck-skylights" || id === "calendar-monthly-addition-exterior-windows" ||
      id === "calendar-monthly-original-home-exterior-windows" || id.startsWith("calendar-seasonal-pressure-wash-") ||
      id.startsWith("maintenance-") || id === "calendar-annual-winter-truck-sandbags" ||
      id === "weekly-property-meeting" || id === "lanken-tuesday-crew" || id === "nick-steve-friday-meeting" ||
      id === "weekly-owner-update";

    const generatedTasks = workPlanTasks.filter((task) => {
      const id = String(task.id || "");
      // Cleanup now keys only from legacy generator provenance. Do not match by
      // title: a user may intentionally create new recurring work with the same
      // wording as an old generated item.
      return id.startsWith("fleet-task-") || id.startsWith("routine-task-") || id.startsWith("care-task-");
    });
    const generatedTaskIds = new Set(generatedTasks.map((task) => String(task.id)));

    const generatedWorkOrders = serviceRecords.filter((record) => {
      const id = String(record.id || "");
      if (id.startsWith("wo-appliance-annual-service-")) return false;
      const notes = normalizedWorkOrderText(record.notes);
      // Delete only records with legacy generator provenance. The approved
      // 25 appliance annual services are intentionally preserved above.
      return generatedWorkOrderIds(id) ||
        normalizedWorkOrderText(record.title) === "test intake" ||
        notes.startsWith("weekly garage cleaning for ") ||
        notes.startsWith("recurring garage service for ");
    });
    const generatedWorkOrderIdSet = new Set(generatedWorkOrders.map((record) => String(record.id)));

    const legacyGeneratedProcedureIds = new Set([
      "weekly-routine", "boat-dock-party", "out-of-town-to-do-list",
      "city-water-irrigation", "spring-dock-preparation", "power-outage",
      "fertilize-lawn", "cushion-storage-winter", "yearly-service-wine-cooler",
      "winterizing-cobalt", "generator-maintenance", "pool-heater-burner-inspection",
      "inverter-maintenance", "low-voltage-controls-inspection", "boat-cleaning",
      "pool-daily-treatment-cleaning",
    ]);
    const generatedProcedures = (procedureRecords as ProcedureRecord[]).filter((record) =>
      legacyGeneratedProcedureIds.has(String(record.id || "")),
    );
    const generatedProcedureIds = new Set(generatedProcedures.map((record) => String(record.id)));

    const generatedCalendar = calendarItems.filter((item) => {
      const id = String(item.id || "");
      return generatedCalendarId(id) || generatedTaskIds.has(String(item.linkedId || "")) || generatedWorkOrderIdSet.has(String(item.linkedId || ""));
    });

    if (!generatedTasks.length && !generatedWorkOrders.length && !generatedProcedures.length && !generatedCalendar.length) {
      window.localStorage.setItem(purgeKey, "done");
      return;
    }

    aiGeneratedPurgeRunningRef.current = true;
    generatedTasks.forEach((task) => addTaskTombstone(String(task.id)));
    generatedWorkOrders.forEach((record) => addWorkOrderTombstone(String(record.id)));
    generatedCalendar.forEach((record) => rememberCalendarDeletion(record));

    const deleteBatches = async <T,>(items: T[], deleteItem: (item: T) => Promise<boolean>, batchSize = 20) => {
      const results: boolean[] = [];
      for (let index = 0; index < items.length; index += batchSize) {
        const batch = items.slice(index, index + batchSize);
        const batchResults = await Promise.all(batch.map(deleteItem));
        results.push(...batchResults);
        if (index + batchSize < items.length) await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
      return results;
    };

    void (async () => {
      try {
        setDatabaseStatus(`Removing ${generatedTasks.length + generatedWorkOrders.length + generatedProcedures.length + generatedCalendar.length} generated Atlas records...`);
        const taskResults = await deleteBatches(
          generatedTasks,
          (task) => deleteOperationalRecord("tasks" as AtlasTable, String(task.id)),
        );
        const workResults = await deleteBatches(
          generatedWorkOrders,
          (record) => deleteAtlasRecord("work_orders", String(record.id), { suppressFailureToast: true }),
        );
        const procedureResults = await deleteBatches(
          generatedProcedures,
          (record) => deleteAtlasRecord("procedures", String(record.id), { suppressFailureToast: true }),
        );
        const calendarResults = await deleteBatches(
          generatedCalendar,
          (record) => deleteAtlasRecord("calendar", String(record.id), { suppressFailureToast: true }),
        );
        const allResults = [...taskResults, ...workResults, ...procedureResults, ...calendarResults];
        if (!allResults.every(Boolean)) {
          setDatabaseStatus("Generated-record cleanup did not fully finish. Refresh Atlas to retry the remaining database deletes.");
          showSaveToast("Generated-record cleanup did not fully finish. Refresh Atlas to retry.", "warning");
          return;
        }

        if (generatedTasks.length) {
          setWorkPlanTasks((current) => {
            const next = current.filter((task) => !generatedTaskIds.has(String(task.id)));
            saveStoredArray(`atlas-tasks-v1-${activePropertyId}`, next);
            saveStoredArray("atlas-tasks-v1", next);
            return next;
          });
          setTaskMeta((current) => {
            const next = { ...current };
            generatedTaskIds.forEach((id) => delete next[id]);
            try {
              window.localStorage.setItem(`atlas-task-meta-v1-${activePropertyId}`, JSON.stringify(next));
              window.localStorage.setItem("atlas-task-meta-v1", JSON.stringify(next));
            } catch {}
            return next;
          });
        }
        if (generatedWorkOrders.length) {
          setServiceRecords((current) => current.filter((record) => !generatedWorkOrderIdSet.has(String(record.id))));
        }
        if (generatedProcedures.length) {
          setProcedureRecords((current) => current.filter((record) => !generatedProcedureIds.has(String(record.id))));
        }
        if (generatedCalendar.length) {
          const ids = new Set(generatedCalendar.map((record) => String(record.id)));
          setCalendarItems((current) => {
            const next = byTitle(current.filter((record) => !ids.has(String(record.id))));
            saveStoredArray(storageKeys.calendar[0], next);
            return next;
          });
        }

        window.localStorage.setItem(purgeKey, "done");
        setDatabaseStatus("AI-generated Atlas records removed from the database.");
        showSaveToast(`Cleanup complete: ${generatedTasks.length} Tasks, ${generatedWorkOrders.length} Work Orders, ${generatedProcedures.length} Procedures, ${generatedCalendar.length} Calendar items removed.`);
      } finally {
        aiGeneratedPurgeRunningRef.current = false;
      }
    })();
  }, [ready, operationsHydrated, syncState, activePropertyId, workPlanTasks, serviceRecords, procedureRecords, calendarItems]);
  // Historical one-time reset removed: live Calendar/Work data is authoritative and must never
  // be bulk-deleted by a code deployment or first-load cleanup. Future cleanup must target
  // explicit record IDs only.

  useEffect(() => {
    if (!ready || !operationsHydrated || syncState !== "synced" || activePropertyId !== "2000") return;

    const cleanupKey = "atlas-vehicle-asset-authority-v4-2000";
    if (typeof window !== "undefined" && window.localStorage.getItem(cleanupKey) === "done") return;

    const roadBrands = ["mercedes", "rivian", "porsche", "lucid", "ford", "kia", "honda", "subaru", "audi"];
    const cleanVehicleName = (value: unknown) =>
      normalizedWorkOrderText(String(value || "").replace(/^vehicle\s+/i, "").replace(/\s+ev$/i, ""));
    const vehicleBrand = (value: unknown) => {
      const text = cleanVehicleName(value);
      return roadBrands.find((brand) => new RegExp(`\\b${brand}\\b`, "i").test(text)) || "";
    };
    const isRoadVehicleAsset = (asset: AtlasAssetRecord) => {
      const text = normalizedWorkOrderText(`${asset.name || ""} ${asset.category || ""} ${asset.make || ""} ${asset.model || ""}`);
      return /\b(vehicle|car|automobile)\b/.test(text) || roadBrands.some((brand) => new RegExp(`\\b${brand}\\b`, "i").test(text));
    };
    const isGarageGeneratedVehicleAsset = (asset: AtlasAssetRecord) =>
      isRoadVehicleAsset(asset) && /garage asset created from garage care/i.test(String(asset.notes || ""));

    const realVehicleAssets = assetRecords.filter(
      (asset) => isRoadVehicleAsset(asset) && !isGarageGeneratedVehicleAsset(asset),
    );
    const generatedVehicleAssets = assetRecords.filter(isGarageGeneratedVehicleAsset);

    const findRealVehicleAsset = (value: unknown) => {
      const clean = cleanVehicleName(value);
      if (!clean) return undefined;
      const exact = realVehicleAssets.filter((asset) => cleanVehicleName(asset.name) === clean);
      if (exact.length === 1) return exact[0];
      const brand = vehicleBrand(value);
      if (!brand) return undefined;
      const brandMatches = realVehicleAssets.filter((asset) => {
        const identity = normalizedWorkOrderText(`${asset.name || ""} ${asset.make || ""} ${asset.model || ""}`);
        return new RegExp(`\\b${brand}\\b`, "i").test(identity);
      });
      return brandMatches.length === 1 ? brandMatches[0] : undefined;
    };

    const duplicateAssetToKeeper = new Map<string, AtlasAssetRecord>();
    generatedVehicleAssets.forEach((asset) => {
      const keeper = findRealVehicleAsset(asset.name);
      if (keeper && keeper.id !== asset.id) duplicateAssetToKeeper.set(String(asset.id), keeper);
    });

    const vehicleAssetsById = new Map(realVehicleAssets.map((asset) => [String(asset.id), asset]));
    const workOrderUpdates: AtlasServiceRecord[] = [];
    const updatedServiceRecords = serviceRecords.map((record) => {
      const currentAssetId = String(record.assetId || "");
      let targetAsset = duplicateAssetToKeeper.get(currentAssetId) || vehicleAssetsById.get(currentAssetId);

      if (!targetAsset) {
        const text = `${record.title || ""} ${record.responsibilityArea || ""}`;
        const looksVehicleRelated = /\b(clean|wash|vehicle|car|garage|service|repair)\b/i.test(text) && Boolean(vehicleBrand(text));
        if (looksVehicleRelated) targetAsset = findRealVehicleAsset(text);
      }

      if (!targetAsset) return record;

      const displayName = String(targetAsset.name || "").replace(/^Vehicle\s+/i, "").trim() || targetAsset.name;
      let title = String(record.title || "");
      const cleaningAction = title.match(/^\s*(clean|wash)\b/i)?.[1];
      if (cleaningAction && vehicleBrand(title) && vehicleBrand(targetAsset.name) === vehicleBrand(title)) {
        title = `${cleaningAction.toLowerCase() === "wash" ? "Wash" : "Clean"} ${displayName}`;
      }

      const next = normalizeService({
        ...record,
        title,
        assetId: targetAsset.id,
        locationId: record.locationId || targetAsset.locationId || "",
      });
      const changed =
        next.assetId !== record.assetId ||
        next.locationId !== record.locationId ||
        next.title !== record.title;
      if (changed) workOrderUpdates.push(next);
      return changed ? next : record;
    });

    const careGroups = new Map<string, Array<{ vehicle: AtlasVehicleCare; asset: AtlasAssetRecord }>>();
    const unmatchedVehicleCare: AtlasVehicleCare[] = [];
    vehicleCare.forEach((vehicle) => {
      const asset =
        (vehicle.assetId ? duplicateAssetToKeeper.get(String(vehicle.assetId)) || vehicleAssetsById.get(String(vehicle.assetId)) : undefined) ||
        findRealVehicleAsset(vehicle.name);
      if (!asset) {
        unmatchedVehicleCare.push(vehicle);
        return;
      }
      const key = String(asset.id);
      careGroups.set(key, [...(careGroups.get(key) || []), { vehicle, asset }]);
    });

    const vehicleCareUpdates: AtlasVehicleCare[] = [];
    const duplicateVehicleCare: AtlasVehicleCare[] = [];
    const canonicalVehicleCare: AtlasVehicleCare[] = [];
    const mergeHistory = (items: AtlasVehicleCare[]) => {
      const seen = new Set<string>();
      return items
        .flatMap((item) => item.history || [])
        .filter((entry) => {
          const key = `${String(entry.id || "")}|${String(entry.type || "")}|${String(entry.date || "")}|${String(entry.notes || "")}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    };
    const latestDate = (values: Array<string | undefined>) =>
      values.filter((value): value is string => Boolean(String(value || "").trim())).sort().at(-1) || "";

    careGroups.forEach((group) => {
      const sorted = [...group].sort((a, b) => {
        const aLinked = String(a.vehicle.assetId || "") === String(a.asset.id) ? 1 : 0;
        const bLinked = String(b.vehicle.assetId || "") === String(b.asset.id) ? 1 : 0;
        if (aLinked !== bLinked) return bLinked - aLinked;
        return String(b.vehicle.updatedAt || "").localeCompare(String(a.vehicle.updatedAt || ""));
      });
      const keeperEntry = sorted[0];
      if (!keeperEntry) return;
      const all = sorted.map((item) => item.vehicle);
      const keeper = keeperEntry.vehicle;
      const asset = keeperEntry.asset;
      const notes = Array.from(new Set(all.map((item) => String(item.notes || "").trim()).filter(Boolean))).join("\n");
      const canonical: AtlasVehicleCare = {
        ...keeper,
        name: asset.name,
        assetId: asset.id,
        locationId: assetLocationIds(asset)[0] || asset.locationId || keeper.locationId || "",
        onsite: all.some((item) => item.onsite),
        priority: all.some((item) => item.priority === "High") ? "High" : keeper.priority || "Normal",
        assignedTo: keeper.assignedTo || all.find((item) => item.assignedTo)?.assignedTo || "Nick",
        cleaningIntervalDays: keeper.cleaningIntervalDays || all.find((item) => item.cleaningIntervalDays)?.cleaningIntervalDays || 7,
        serviceIntervalDays: keeper.serviceIntervalDays || all.find((item) => item.serviceIntervalDays)?.serviceIntervalDays || 180,
        lastCleaned: latestDate(all.map((item) => item.lastCleaned)),
        lastServiced: latestDate(all.map((item) => item.lastServiced)),
        nextServiceDate: latestDate(all.map((item) => item.nextServiceDate)),
        notes,
        history: mergeHistory(all),
        updatedAt: new Date().toISOString(),
      };
      canonicalVehicleCare.push(canonical);
      sorted.slice(1).forEach((item) => duplicateVehicleCare.push(item.vehicle));
      if (JSON.stringify({ ...canonical, updatedAt: "" }) !== JSON.stringify({ ...keeper, updatedAt: "" })) {
        vehicleCareUpdates.push(canonical);
      }
    });

    // Road-vehicle Garage care may supplement a real Asset, but it may never
    // remain as a second vehicle identity when no real Asset exists. Preserve
    // unmatched non-road records (boats/watercraft), and remove only orphaned
    // road-vehicle care left behind by the legacy Garage system.
    const orphanedRoadVehicleCare = unmatchedVehicleCare.filter((vehicle) => {
      const text = cleanVehicleName(`${vehicle.name || ""} ${vehicle.kind || ""}`);
      return roadBrands.some((brand) => new RegExp(`\\b${brand}\\b`, "i").test(text)) || /\b(vehicle|car|automobile)\b/i.test(text);
    });
    const preservedUnmatchedVehicleCare = unmatchedVehicleCare.filter(
      (vehicle) => !orphanedRoadVehicleCare.some((orphan) => String(orphan.id) === String(vehicle.id)),
    );
    const reconciledVehicleCare = [...canonicalVehicleCare, ...preservedUnmatchedVehicleCare];
    const duplicateAssets = Array.from(duplicateAssetToKeeper.keys())
      .map((id) => generatedVehicleAssets.find((asset) => String(asset.id) === id))
      .filter(Boolean) as AtlasAssetRecord[];

    if (!workOrderUpdates.length && !vehicleCareUpdates.length && !duplicateVehicleCare.length && !orphanedRoadVehicleCare.length && !duplicateAssets.length) {
      if (typeof window !== "undefined") window.localStorage.setItem(cleanupKey, "done");
      return;
    }

    void (async () => {
      const workResults = await Promise.all(
        workOrderUpdates.map((record) =>
          postAtlasRecord("work_orders", { ...record, propertyId: activePropertyId }),
        ),
      );
      if (workResults.some((saved) => !saved)) {
        showSaveToast("Vehicle Asset linking paused because a Work Order did not save.", "warning");
        return;
      }

      const careResults = await Promise.all(
        vehicleCareUpdates.map((vehicle) =>
          postAtlasRecord("vehicle_care" as AtlasTable, { ...vehicle, propertyId: activePropertyId }),
        ),
      );
      if (careResults.some((saved) => !saved)) {
        showSaveToast("Vehicle Asset linking paused because Garage history did not save.", "warning");
        return;
      }

      duplicateAssets.forEach((asset) => {
        rememberDeletedAssetId(String(asset.id), activePropertyId);
        rememberDeletedGeneratedAssetName(String(asset.name || ""), activePropertyId);
      });

      const deleteResults = await Promise.all([
        ...duplicateAssets.map((asset) =>
          deleteAtlasRecord("assets", String(asset.id), { suppressFailureToast: true }),
        ),
        ...[...duplicateVehicleCare, ...orphanedRoadVehicleCare].map((vehicle) =>
          deleteOperationalRecord("vehicle_care" as AtlasTable, String(vehicle.id || "")),
        ),
      ]);

      if (deleteResults.some((deleted) => !deleted)) {
        showSaveToast("Vehicle duplicate cleanup did not fully finish. Refresh Atlas to retry.", "warning");
        return;
      }

      if (workOrderUpdates.length) setServiceRecords(workOrdersByIdentity(updatedServiceRecords));
      if (duplicateAssets.length) {
        const ids = new Set(duplicateAssets.map((asset) => String(asset.id)));
        setAssetRecords((current) => current.filter((asset) => !ids.has(String(asset.id))));
      }
      if (vehicleCareUpdates.length || duplicateVehicleCare.length || orphanedRoadVehicleCare.length) {
        setVehicleCare(reconciledVehicleCare);
      }

      if (typeof window !== "undefined") window.localStorage.setItem(cleanupKey, "done");
      showSaveToast("Vehicle Work is linked to the real Assets and duplicate Garage records were removed.");
    })();
  }, [ready, operationsHydrated, syncState, activePropertyId, serviceRecords, assetRecords, vehicleCare]);

  // Automatic task/work-order/routine/calendar seeding is permanently disabled.
  // Atlas creates operational records only from explicit user actions.
  useEffect(() => { saveStoredArray(`atlas-day-sessions-v1-${activePropertyId}`, daySessions); }, [activePropertyId, daySessions]);

  function updateVehicleCareRecord(
    vehicleId: string,
    patch: Partial<AtlasVehicleCare>,
  ) {
    setVehicleCare((current) => {
      const existing = current.find((item) => item.id === vehicleId);
      const existingAsset = existing?.assetId
        ? assetRecords.find((asset) => asset.id === existing.assetId)
        : undefined;
      const matchingAsset = existingAsset || assetRecords.find(
        (asset) => `asset-${asset.id}` === vehicleId || slugify(`vehicle-${asset.name}`) === vehicleId,
      );
      const matchingTask = workPlanTasks.find(
        (task) =>
          slugify(`vehicle-${String(task.title || "").replace(/^clean\s+/i, "").trim()}`) === vehicleId,
      );
      const inferredName =
        matchingAsset?.name ||
        String(matchingTask?.title || "").replace(/^clean\s+/i, "").trim() ||
        "Vehicle";
      const base: AtlasVehicleCare = existing || {
        id: vehicleId,
        name: inferredName,
        onsite: true,
        lastCleaned: matchingTask ? taskDetails(matchingTask.id).lastCompletedDate || "" : "",
        priority: "Normal",
        notes: "",
        kind: "Vehicle",
        assignedTo: matchingTask?.id && taskDetails(matchingTask.id).assignee === "Addison" ? "Addison" : "Nick",
        cleaningIntervalDays: 7,
        lastServiced: "",
        nextServiceDate: "",
        serviceIntervalDays: 180,
        history: [],
        assetId: matchingAsset?.id || "",
        locationId: matchingAsset?.locationId || matchingTask?.locationId || "",
      };
      const updated = {
        ...base,
        ...patch,
        ...(matchingAsset
          ? {
              name: matchingAsset.name,
              assetId: matchingAsset.id,
              locationId: assetLocationIds(matchingAsset)[0] || matchingAsset.locationId || base.locationId || "",
            }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      const next = existing
        ? current.map((item) => item.id === vehicleId ? updated : item)
        : [updated, ...current];
      // Save the exact edited value immediately. This prevents a first edit
      // made just after opening Atlas from being replaced by delayed startup work.
      saveStoredArray(`atlas-vehicle-care-v1-${activePropertyId}`, next);
      if (activePropertyId === "2000") saveStoredArray("atlas-vehicle-care-v1", next);
      return next;
    });
  }

  const mapRef = useRef<HTMLDivElement | null>(null);
  const draggingLabelRef = useRef<string | null>(null);
  const previewTouchRef = useRef<{ distance: number; zoom: number } | null>(
    null,
  );
  const qrScannerRef = useRef<any>(null);
  const qrScannerElementId = "atlas-qr-reader";
  const atlasScreenHistoryReadyRef = useRef(false);

  function isAtlasScreen(value: string | null): value is AtlasScreen {
    return Boolean(value && screens.some((item) => item.id === value));
  }

  function screenFromUrl(): AtlasScreen | null {
    if (typeof window === "undefined") return null;
    const hash = decodeURIComponent(
      window.location.hash.replace(/^#\/?/, ""),
    ).trim();
    if (isAtlasScreen(hash)) return hash;
    const queryScreen = new URLSearchParams(window.location.search).get(
      "screen",
    );
    if (isAtlasScreen(queryScreen)) return queryScreen;
    return null;
  }

  function urlForScreen(next: AtlasScreen) {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const query = params.toString();
    return `${window.location.pathname}${query ? `?${query}` : ""}#${next}`;
  }

  function setScreen(next: AtlasScreen, options?: { replace?: boolean }) {
    setDepartmentCenter("");
    setScreenState(next);

    if (typeof window === "undefined") return;

    if (next === "planner") {
      const safeUrl = urlForScreen("dashboard");
      window.history.replaceState(
        { atlasScreen: "dashboard", atlasOverlay: "planner" },
        "",
        safeUrl,
      );
      atlasScreenHistoryReadyRef.current = true;
      return;
    }

    const nextUrl = urlForScreen(next);
    const currentHash = decodeURIComponent(
      window.location.hash.replace(/^#\/?/, ""),
    ).trim();
    const state = { atlasScreen: next };

    if (!atlasScreenHistoryReadyRef.current || options?.replace) {
      window.history.replaceState(state, "", nextUrl);
      atlasScreenHistoryReadyRef.current = true;
      return;
    }

    if (currentHash !== next || window.history.state?.atlasScreen !== next) {
      window.history.pushState(state, "", nextUrl);
    }
  }

  function selectProperty(propertyId: string) {
    if (propertyId === activePropertyId) return;

    setShowPropertyLoading(true);
    setOperationsHydrated(false);
    setOperationsSyncState("idle");
    setActivePropertyId(propertyId);
    if (propertyId === "4725") {
      setDepartmentCenter("");
      setScreenState("dashboard");
    }

    const storedScopedTasks = readStoredArray<WorkPlanTask>([`atlas-tasks-v1-${propertyId}`], propertyId === "2000" ? readStoredArray<WorkPlanTask>(["atlas-tasks-v1"], []) : []);
    const scopedTasks = propertyId === "2000"
      ? storedScopedTasks
      : storedScopedTasks.filter((task) => !isAtlas2000WeeklySeedTask(task));
    if (scopedTasks.length !== storedScopedTasks.length) {
      saveStoredArray(`atlas-tasks-v1-${propertyId}`, scopedTasks);
    }
    setWorkPlanTasks(scopedTasks);
    try {
      const scopedMeta = window.localStorage.getItem(`atlas-task-meta-v1-${propertyId}`) || (propertyId === "2000" ? window.localStorage.getItem("atlas-task-meta-v1") : null);
      const parsedMeta = scopedMeta ? JSON.parse(scopedMeta) : {};
      const visibleTaskIds = new Set(scopedTasks.map((task) => task.id));
      const cleanMeta = propertyId === "2000"
        ? parsedMeta
        : Object.fromEntries(Object.entries(parsedMeta).filter(([id]) => visibleTaskIds.has(id)));
      setTaskMeta(cleanMeta);
      if (propertyId !== "2000") {
        window.localStorage.setItem(`atlas-task-meta-v1-${propertyId}`, JSON.stringify(cleanMeta));
      }
    } catch { setTaskMeta({}); }
    setVehicleCare(readStoredArray<AtlasVehicleCare>([`atlas-vehicle-care-v1-${propertyId}`], propertyId === "2000" ? readStoredArray<AtlasVehicleCare>(["atlas-vehicle-care-v1"], []) : []));
    setDaySessions(readStoredArray<AtlasDaySession>([`atlas-day-sessions-v1-${propertyId}`], []));

    setSelectedLocationId("");
    setSelectedAssetId("");
    setSelectedServiceId("");
    setSelectedVendorId("");
    setSelectedContactId("");
    setSelectedProcedureId("");
    setSelectedCalendarId("");
    setSelectedPartId("");
    setSelectedDocumentId("");
    setSelectedRequestId("");

    // A property switch starts a clean dashboard session. Persistent dashboard
    // settings are loaded from that property's own storage keys by the effects above.
    setDashboardEditMode(false);
    setDashboardCenterView("command");
    setDashboardFeedFilter("All");
    setDismissedDashboardFeedIds([]);
    setDashboardTaskEditorId("");
    setDashboardVendorVisitId("");
    setDashboardVendorVisitNote("");
    setDashboardReminderDraft("");
    setDashboardReminderDate("");
    setDashboardWorkFilter("");
    setCompletedDashboardRoutineIds([]);
    setDashboardRoutineItems([]);

    setLocations([]);
    setAssetRecords([]);
    setVendorRecords([]);
    setContactRecords([]);
    setServiceRecords([]);
    setProcedureRecords([]);
    setCalendarItems([]);
    setPartRecords([]);
    setPhotos([]);
    setIntakeDocs([]);
    setRequestRecords([]);

    setCalendarDraft(blankCalendarItem(todayISO()));
    setSyncState("loading");
  }

  function openSavedAsset(
    assetId: string,
    options: { edit?: boolean; focusName?: string } = {},
  ) {
    if (!assetId) return;
    setInboxReviewOpen(false);
    setScreen("assets", { replace: true });
    setSelectedAssetId(assetId);
    setAssetPanelSection("overview");
    setAssetEditorOpen(Boolean(options.edit));
    if (options.focusName) {
      setAssetListSearch(options.focusName);
      setExcludedAssetStatuses([]);
      setExcludedAssetCategories([]);
      setAssetFiltersOpen(false);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function openCalendarLinkedRecord(event: CalendarItem) {
    const linkedType = String(event.linkedType || "");
    const linkedId = String(event.linkedId || "");

    if (!linkedId || !linkedType || linkedType === "None") {
      return false;
    }

    if (linkedType === "Task") {
      setSelectedTaskId(linkedId);
      setTasksView("tasks");
      setScreen("planner");
      window.requestAnimationFrame(() => {
        setSelectedTaskId(linkedId);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
      return true;
    }

    if (linkedType === "Asset") {
      setScreen("assets");
      setSelectedAssetId(linkedId);
      setAssetEditorOpen(false);

      window.requestAnimationFrame(() => {
        setSelectedAssetId(linkedId);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });

      return true;
    }

    if (linkedType === "Location") {
      setScreen("locations");
      setSelectedLocationId(linkedId);
      setLocationEditorOpen(false);
      setLocationMobileDrawerOpen(isMobile);

      window.requestAnimationFrame(() => {
        setSelectedLocationId(linkedId);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });

      return true;
    }

    if (linkedType === "Vendor") {
      setScreen("vendors");
      setSelectedVendorId(linkedId);

      window.requestAnimationFrame(() => {
        setSelectedVendorId(linkedId);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });

      return true;
    }

    if (linkedType === "Work Order") {
      setScreen("history");
      setSelectedServiceId(linkedId);
      setWorkOrdersOpenKey((current) => current + 1);

      window.requestAnimationFrame(() => {
        setSelectedServiceId(linkedId);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });

      return true;
    }

    return false;
  }

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current !== null) {
        window.clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initialScreen = screenFromUrl() || "dashboard";
    setScreenState(initialScreen);
    window.history.replaceState(
      { atlasScreen: initialScreen },
      "",
      urlForScreen(initialScreen),
    );
    atlasScreenHistoryReadyRef.current = true;

    const onPopState = () => {
      setScreenState(screenFromUrl() || "dashboard");
      setQuery("");
      setSearchOpen(false);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setIsMobile(window.innerWidth < 820);
    const onResize = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);

    const storedMapLabels = readStoredArray<MapLabelRecord>(
      storageKeys.mapLabels,
      defaultMapLabels,
    ).map((label) => {
      const defaultLabel = defaultMapLabels.find(
        (item) => item.id === label.id,
      );
      const rawLabel = String(
        label.label ||
          (label as unknown as { name?: string }).name ||
          (label as unknown as { title?: string }).title ||
          "",
      ).trim();
      const displayLabel =
        !rawLabel || rawLabel.toLowerCase() === "map label"
          ? defaultLabel?.label || "New Label"
          : rawLabel;

      return {
        id: label.id || uid("map"),
        label: displayLabel,
        category: label.category || defaultLabel?.category || "Location",
        x: clampPercent(
          Number.isFinite(Number(label.x))
            ? Number(label.x)
            : Number(defaultLabel?.x),
        ),
        y: clampPercent(
          Number.isFinite(Number(label.y))
            ? Number(label.y)
            : Number(defaultLabel?.y),
        ),
        notes: label.notes || defaultLabel?.notes || "",
        photos: Array.isArray(label.photos) ? label.photos : [],
        vendorIds: Array.isArray(label.vendorIds)
          ? label.vendorIds.map(String)
          : [],
        detailBoxes: normalizeMapDetailBoxes(label),
        installer: label.installer || "",
        paintColor: label.paintColor || "",
        specs: label.specs || "",
        documentNotes: label.documentNotes || "",
        photoNotes: label.photoNotes || "",
        maintenanceNotes: label.maintenanceNotes || "",
      };
    });

    const storedAssets = readStoredArray<AssetRecord>(
      storageKeys.assets,
      fallbackAssets,
    ).map(normalizeAsset);
    const storedVendors = readStoredArray<VendorRecord>(
      storageKeys.vendors,
      fallbackVendors,
    ).map((vendor) => normalizeDepartmentVendor(vendor as AtlasDepartmentVendor));
    const storedContacts = readStoredArray<ContactRecord>(
      storageKeys.contacts,
      [],
    ).map(normalizeContact);
    const storedServices = readStoredArray<ServiceRecord>(
      storageKeys.workOrders,
      [],
    ).map(normalizeService);
    const storedProcedures = readStoredArray<ProcedureRecord>(
      storageKeys.procedures,
      [],
    ).map(normalizeProcedure);
    const allStoredCalendarItems = readAllStoredArrays<CalendarItem>(
      storageKeys.calendar,
    );
    const storedCalendar = allStoredCalendarItems.length
      ? mergeCalendarItemRecords(allStoredCalendarItems, [])
      : [];
    const storedCalendarColors = readStoredArray<CalendarColor>(
      storageKeys.calendarColors,
      defaultCalendarColors,
    );
    const storedParts = readStoredArray<PartRecord>(
      storageKeys.parts,
      fallbackParts,
    ).map(normalizePart);
    const storedPhotos = readStoredArray<PhotoRecord>(
      storageKeys.photos,
      [],
    ).map(normalizePhotoRecord);
    const storedIntakeDocs = readStoredArray<DocumentRecord>(
      storageKeys.intakeDocs,
      [],
    );
    const storedManuals = readStoredArray<ManualRecord>(
      storageKeys.manuals,
      defaultManuals,
    ).map(normalizeManualRecord);
    const storedWorkLinks = readStoredArray<WorkLinkRecord>(
      storageKeys.workLinks,
      defaultWorkLinks,
    );

    setMapLabels(
      byLabel(storedMapLabels.length ? storedMapLabels : defaultMapLabels),
    );
    setSelectedMapLabelId((storedMapLabels[0] ?? defaultMapLabels[0]).id);
    setAssetRecords(
      storedAssets.length ? byName(storedAssets) : fallbackAssets,
    );
    setVendorRecords(
      storedVendors.length ? byName(storedVendors) : fallbackVendors,
    );
    setContactRecords(byName(storedContacts));
    setServiceRecords(
      storedServices.length ? byTitle(storedServices) : [],
    );
    setProcedureRecords(byTitle(storedProcedures));
    // Calendar records come from shared Atlas. Browser storage is only a cache
    // and must never resurrect records that were deleted from the database.
    setCalendarItems([]);
    setCalendarColors(mergeCalendarColors(storedCalendarColors));
    setPartRecords(storedParts.length ? byName(storedParts) : fallbackParts);
    const mergedWorkLinks = [...storedWorkLinks];
    const existingWorkLinkIds = new Set(
      mergedWorkLinks.map((link) => link.id.trim().toLowerCase()),
    );
    const existingWorkLinkNames = new Set(
      mergedWorkLinks.map((link) => link.name.trim().toLowerCase()),
    );

    for (const defaultLink of defaultWorkLinks) {
      const defaultId = defaultLink.id.trim().toLowerCase();
      const defaultName = defaultLink.name.trim().toLowerCase();

      if (
        !existingWorkLinkIds.has(defaultId) &&
        !existingWorkLinkNames.has(defaultName)
      ) {
        mergedWorkLinks.push(defaultLink);
        existingWorkLinkIds.add(defaultId);
        existingWorkLinkNames.add(defaultName);
      }
    }

    setWorkLinks(
      mergedWorkLinks.length
        ? mergedWorkLinks.sort((a, b) => a.name.localeCompare(b.name))
        : defaultWorkLinks,
    );
    setPhotos(storedPhotos);
    void cachePhotoRecords(storedPhotos).then(() => {
      persistPhotoRecords(storedPhotos);
    });
    setIntakeDocs(storedIntakeDocs.map(normalizeDocument));
    const repairedStoredManuals = storedManuals.map((item) =>
      item.id === "manual-seadoo-219002349"
        ? normalizeManualRecord({
            ...item,
            title: defaultManuals[0].title,
            category: defaultManuals[0].category,
            manufacturer: defaultManuals[0].manufacturer,
            model: defaultManuals[0].model,
            documentNumber: defaultManuals[0].documentNumber,
            linkedAssetName:
              item.linkedAssetName || defaultManuals[0].linkedAssetName,
            sourceLabel: defaultManuals[0].sourceLabel,
            href: seaDooManualUrl,
          })
        : item,
    );

    const manualsWithSeed = repairedStoredManuals.some(
      (item) => item.id === "manual-seadoo-219002349",
    )
      ? repairedStoredManuals
      : [defaultManuals[0], ...repairedStoredManuals];

    setManualRecords(manualsWithSeed);
    saveStoredArray(storageKeys.manuals[0], manualsWithSeed);
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(todayISO()));
    setReady(true);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAtlasApi() {
      let sharedAtlasLoaded = false;
      try {
        setSyncState("loading");

        // One-time emergency repair: records accidentally written to the empty
        // 6855 calendar are moved back to 2000 before 6855 is loaded. The API
        // records completion in Neon, so this cannot run twice.
        if (activePropertyId === "6855") {
          const repairResponse = await fetch("/api/atlas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ action: "repair6855Calendar" }),
          });

          const repairPayload = await repairResponse.json().catch(() => ({}));
          if (!repairResponse.ok || repairPayload?.ok !== true) {
            throw new Error(
              repairPayload?.error ||
                `Calendar repair returned ${repairResponse.status}`,
            );
          }
        }

        const response = await fetch(
          `/api/atlas?propertyId=${encodeURIComponent(activePropertyId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const payload = (await response.json()) as AtlasApiPayload & { propertyId?: string };
        if (cancelled) return;

        const responsePropertyId = String(payload.propertyId || activePropertyId);
        if (responsePropertyId !== activePropertyId) {
          throw new Error(
            `Atlas property response mismatch: requested ${activePropertyId}, received ${responsePropertyId}`,
          );
        }
        sharedAtlasLoaded = true;

        const apiLocations = Array.isArray(payload.locations)
          ? payload.locations
          : [];
        const apiAssets = Array.isArray(payload.assetRecords)
          ? payload.assetRecords
          : Array.isArray(payload.assets)
            ? payload.assets
            : [];
        const apiVendors = Array.isArray(payload.vendorRecords)
          ? payload.vendorRecords
          : Array.isArray(payload.vendors)
            ? payload.vendors
            : [];
        const apiContacts = Array.isArray(payload.contactRecords)
          ? payload.contactRecords
          : Array.isArray(payload.contacts)
            ? payload.contacts
            : [];
        const apiServices = Array.isArray(payload.serviceRecords)
          ? payload.serviceRecords
          : Array.isArray(payload.workOrders)
            ? payload.workOrders
            : [];
        const apiProcedures = Array.isArray(payload.procedureRecords)
          ? payload.procedureRecords
          : Array.isArray(payload.procedures)
            ? payload.procedures
            : [];
        const apiCalendar = Array.isArray(payload.calendarItems)
          ? payload.calendarItems
          : Array.isArray(payload.calendar)
            ? payload.calendar
            : [];
        const apiParts = Array.isArray(payload.partRecords)
          ? payload.partRecords
          : Array.isArray(payload.parts)
            ? payload.parts
            : [];
        const apiProjects = Array.isArray(payload.projectRecords)
          ? payload.projectRecords
          : Array.isArray(payload.projects)
            ? payload.projects
            : [];
        const operationsPayload = payload as AtlasApiPayload & {
          tasks?: Array<WorkPlanTask & AtlasTaskMeta & { taskMeta?: AtlasTaskMeta }>;
          taskRecords?: Array<WorkPlanTask & AtlasTaskMeta & { taskMeta?: AtlasTaskMeta }>;
          vehicleCare?: AtlasVehicleCare[];
          vehicleCareRecords?: AtlasVehicleCare[];
          daySessions?: AtlasDaySession[];
          notes?: Array<TodayLogEntry & {
            title?: string;
            section?: NoteSection;
            pinned?: boolean;
            followUpDate?: string;
            attachments?: NoteAttachment[];
            dashboard?: boolean;
            dueDate?: string;
            done?: boolean;
          }>;
        };
        const pendingTaskDeleteIds = new Set(
          readStoredArray<{ table: string; id: string }>(
            [`atlas-operations-deletes-v1-${activePropertyId}`],
            [],
          )
            .filter((item) => item.table === "tasks")
            .map((item) => String(item.id)),
        );
        const rawApiTasks = Array.isArray(operationsPayload.taskRecords)
          ? operationsPayload.taskRecords
          : Array.isArray(operationsPayload.tasks)
            ? operationsPayload.tasks
            : [];
        const taskTombstones = readTaskTombstones(activePropertyId);
        const apiTasks = rawApiTasks.filter(
          (record) =>
            !pendingTaskDeleteIds.has(String(record.id)) &&
            !taskTombstones.has(String(record.id)) &&
            (activePropertyId === "2000" || !isAtlas2000WeeklySeedTask(record)),
        );
        const vehicleCarePayloadPresent =
          Array.isArray(operationsPayload.vehicleCareRecords) || Array.isArray(operationsPayload.vehicleCare);
        const apiVehicles = Array.isArray(operationsPayload.vehicleCareRecords) ? operationsPayload.vehicleCareRecords : Array.isArray(operationsPayload.vehicleCare) ? operationsPayload.vehicleCare : [];
        const apiDaySessions = Array.isArray(operationsPayload.daySessions) ? operationsPayload.daySessions : [];
        const notesPayloadPresent = Array.isArray(operationsPayload.notes);
        const apiNotes = notesPayloadPresent
          ? operationsPayload.notes!.filter((note) => Boolean(note?.id && note?.text && note?.date))
          : [];
        const dashboardApiNotes = apiNotes as Array<(typeof apiNotes)[number] & {
          dashboard?: boolean;
          dueDate?: string;
          done?: boolean;
        }>;
        const apiPhotos = (
          Array.isArray(payload.photos)
            ? payload.photos
            : Array.isArray(payload.assetPhotos)
              ? payload.assetPhotos
              : []
        )
          .map(normalizePhotoRecord)
          .filter((photo) => photo.id && photo.assetId);

        // The database is authoritative once it contains location records.
        // Do not merge fallback locations into every reload because deleted or
        // renamed seed records would otherwise reappear.
        const nextLocations = apiLocations.length
          ? mergeLocationRecords(apiLocations, [])
          : activePropertyId === "2000"
            ? mergeLocationRecords(fallbackLocations, [])
            : [];
        const assetDeleteTombstones =
          readAssetDeleteTombstones(activePropertyId);
        const assetDeleteNameTombstones =
          readAssetDeleteNameTombstones(activePropertyId);
        const nextAssets = byName(
          apiAssets
            .map(normalizeAsset)
            .filter(
              (asset) =>
                !assetDeleteTombstones.has(String(asset.id)) &&
                !assetDeleteNameTombstones.has(
                  normalizeLocationName(asset.name),
                ),
            ),
        );
        const nextVendors = byName(apiVendors.map((vendor) => normalizeDepartmentVendor(vendor as AtlasDepartmentVendor)));
        const nextContacts = byName(apiContacts.map(normalizeContact));
        const normalizedApiServices = apiServices.map(normalizeService);
        const workOrderTombstones = readWorkOrderTombstones(activePropertyId);
        const tombstonedApiServices = normalizedApiServices.filter((record) =>
          workOrderTombstones.has(String(record.id)),
        );
        const visibleApiServices = normalizedApiServices.filter(
          (record) => !workOrderTombstones.has(String(record.id)),
        );
        // Shared Work Order records are authoritative. Do not silently merge,
        // rewrite, or delete user work during hydration.
        const nextServices = workOrdersByIdentity(visibleApiServices);

        tombstonedApiServices.forEach((record) => {
          void deleteAtlasRecord("work_orders", record.id, {
            suppressFailureToast: true,
          });
        });

        const normalizedApiProcedures = apiProcedures.map(normalizeProcedure);
        const nextProcedures = byTitle(normalizedApiProcedures);

        const nextParts = byName(apiParts.map(normalizePart));

        setLocations(nextLocations);
        setAssetRecords(nextAssets);
        setVendorRecords(nextVendors);
        setContactRecords(nextContacts);
        setServiceRecords(nextServices);
        setProcedureRecords(nextProcedures);
        setPartRecords(nextParts);
        if (apiTasks.length || pendingTaskDeleteIds.size) {
          setWorkPlanTasks((localTasks) => {
            const visibleLocalTasks = localTasks.filter(
              (task) => !pendingTaskDeleteIds.has(task.id),
            );
            const remoteIds = new Set(apiTasks.map((record) => record.id));
            const mergedRemote = apiTasks.map((record) => {
              const source = record;
              return { id: source.id, title: source.title, minutes: source.minutes, priority: source.priority, category: source.category, locationId: source.locationId, preferredDay: source.preferredDay, locked: source.locked, recurring: source.recurring, fixedTime: source.fixedTime, notes: source.notes } as WorkPlanTask;
            });
            const combined = [
              ...mergedRemote,
              ...visibleLocalTasks.filter((task) => !remoteIds.has(task.id)),
            ];
            return dedupeTaskState(combined, taskMeta).tasks;
          });
          setTaskMeta((localMeta) => {
            const visibleLocalMeta = Object.fromEntries(
              Object.entries(localMeta).filter(
                ([id]) => !pendingTaskDeleteIds.has(id),
              ),
            ) as Record<string, AtlasTaskMeta>;
            const mergedMeta = {
              ...visibleLocalMeta,
              ...Object.fromEntries(apiTasks.map((record) => {
                const id = String(record.id || "");
                const nestedMeta = (
                  record.taskMeta && typeof record.taskMeta === "object"
                    ? record.taskMeta
                    : {}
                ) as Partial<AtlasTaskMeta>;
                const baseMeta: AtlasTaskMeta = visibleLocalMeta[id] || {
                  status: "Open",
                  dueDate: "",
                  assignee: "Unassigned",
                  createdAt: new Date().toISOString(),
                  recurrenceInterval: 1,
                  recurrenceUnit: "Weeks",
                  recurrenceEndDate: "",
                  completionHistory: [],
                  season: "Year-Round",
                  weatherDependency: "None",
                  flexibleTime: true,
                  skippable: true,
                };
                const remoteMeta: AtlasTaskMeta = {
                  ...baseMeta,
                  ...nestedMeta,
                  assignee:
                    nestedMeta.assignee ||
                    record.assignee ||
                    baseMeta.assignee,
                  dueDate:
                    nestedMeta.dueDate ||
                    record.dueDate ||
                    baseMeta.dueDate,
                  status:
                    nestedMeta.status ||
                    record.status ||
                    baseMeta.status,
                  createdAt:
                    nestedMeta.createdAt ||
                    baseMeta.createdAt,
                };
                return [id, remoteMeta];
              })),
            };

            const tombstones = readTaskTombstones(activePropertyId);
            tombstones.forEach((id) => delete mergedMeta[id]);
            return mergedMeta;
          });
        }
        if (vehicleCarePayloadPresent) {
          const dedupedVehicles = new Map<string, AtlasVehicleCare>();
          apiVehicles.forEach((vehicle) => {
            const key = String(vehicle.assetId || "").trim()
              ? `asset:${String(vehicle.assetId)}`
              : `name:${normalizeLocationName(vehicle.name || vehicle.id)}`;
            const existing = dedupedVehicles.get(key);
            if (!existing) {
              dedupedVehicles.set(key, vehicle);
              return;
            }
            const existingLinked = Boolean(String(existing.assetId || "").trim());
            const candidateLinked = Boolean(String(vehicle.assetId || "").trim());
            if (candidateLinked && !existingLinked) {
              dedupedVehicles.set(key, vehicle);
              return;
            }
            if (candidateLinked === existingLinked && String(vehicle.updatedAt || "") > String(existing.updatedAt || "")) {
              dedupedVehicles.set(key, vehicle);
            }
          });
          setVehicleCare(Array.from(dedupedVehicles.values()));
        }
        if (apiDaySessions.length) setDaySessions(apiDaySessions);

        if (notesPayloadPresent) {
          if (apiNotes.length) {
            const remoteIds = new Set(apiNotes.map((note) => String(note.id)));
            setTodayLogEntries((current) => [
              ...current.filter((entry) => !(entry.propertyId === activePropertyId && entry.category === "Note")),
              ...apiNotes.map((note) => ({
                id: String(note.id), propertyId: String(note.propertyId || activePropertyId), date: String(note.date),
                category: "Note" as const, text: String(note.text),
                createdAt: String(note.createdAt || new Date().toISOString()),
                updatedAt: note.updatedAt ? String(note.updatedAt) : undefined,
              })),
            ]);
            setNoteTitlesById((current) => ({ ...current, ...Object.fromEntries(apiNotes.map((note) => [String(note.id), String(note.title || "")])) }));
            setNotesSectionById((current) => ({ ...current, ...Object.fromEntries(apiNotes.map((note) => [String(note.id), (note.section || "General") as NoteSection])) }));
            setPinnedNoteIds((current) => Array.from(new Set([...current.filter((id) => !remoteIds.has(id)), ...apiNotes.filter((note) => note.pinned).map((note) => String(note.id))])));
            setNoteFollowUpDates((current) => ({ ...current, ...Object.fromEntries(apiNotes.filter((note) => note.followUpDate).map((note) => [String(note.id), String(note.followUpDate)])) }));
            setNoteAttachments((current) => ({
              ...current,
              ...Object.fromEntries(
                apiNotes.map((note) => [
                  String(note.id),
                  (Array.isArray(note.attachments) ? note.attachments : [])
                    .map((attachment) => ({
                      kind: String(attachment?.kind || "") as NoteAttachmentKind,
                      id: String(attachment?.id || ""),
                    }))
                    .filter(
                      (attachment): attachment is NoteAttachment =>
                        Boolean(attachment.id) &&
                        ([
                          "Asset",
                          "Location",
                          "Vendor",
                          "Project",
                          "Work Order",
                          "Task",
                          "Contact",
                          "Procedure",
                        ] as NoteAttachmentKind[]).includes(attachment.kind),
                    ),
                ]),
              ),
            }));
            setDashboardReminders(
              dashboardApiNotes
                .filter((note) => Boolean(note.dashboard))
                .map((note) => ({
                  id: String(note.id),
                  text: String(note.text),
                  done: Boolean(note.done),
                  createdAt: String(note.createdAt || new Date().toISOString()),
                  dueDate: note.dueDate ? String(note.dueDate) : undefined,
                }))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            );
          } else {
            // Shared Notes are authoritative on every device. An empty shared Notes payload
            // must clear local Notes and dashboard reminders instead of reviving browser cache.
            setTodayLogEntries((current) => current.filter((entry) => !(entry.propertyId === activePropertyId && entry.category === "Note")));
            setDashboardReminders([]);
          }
        }
        setOperationsHydrated(true);

        setSelectedLocationId((current) =>
          nextLocations.some((item) => item.id === current) ? current : "",
        );
        setSelectedAssetId((current) =>
          nextAssets.some((item) => item.id === current) ? current : "",
        );
        setSelectedVendorId((current) =>
          nextVendors.some((item) => item.id === current) ? current : "",
        );
        setSelectedContactId((current) =>
          nextContacts.some((item) => item.id === current) ? current : "",
        );
        setSelectedServiceId((current) =>
          nextServices.some((item) => item.id === current) ? current : "",
        );
        setSelectedProcedureId((current) =>
          nextProcedures.some((item) => item.id === current) ? current : "",
        );
        setSelectedPartId((current) =>
          nextParts.some((item) => item.id === current) ? current : "",
        );

        if (activePropertyId === "2000") {
          saveStoredArray(storageKeys.contacts[0], nextContacts);
        }

        // Shared Atlas is authoritative for persisted Calendar events.
        // Task/Work Order dates are rendered from their source records instead
        // of storing duplicate Calendar rows.
        const normalizedCalendarRecords = apiCalendar.map(normalizeCalendar);
        const legacySourceMirrors = normalizedCalendarRecords.filter((item) => {
          const source = String(item.source || "").toLowerCase();
          const linkedType = String(item.linkedType || "").toLowerCase();
          const is4725HomeChoreOccurrence =
            activePropertyId === "4725" &&
            (source === "home-chore-extra" || source === "home-chore");
          if (is4725HomeChoreOccurrence) return false;
          return (
            source === "task" ||
            source === "work-order" ||
            source === "workorder" ||
            source === "service" ||
            linkedType === "task" ||
            linkedType === "work order"
          );
        });
        legacySourceMirrors.forEach((item) => {
          void deleteAtlasRecord("calendar", item.id, {
            suppressFailureToast: true,
          });
        });

        const sharedItems = calendarItemsByIdentity(
          normalizedCalendarRecords
            .filter((item) => {
              if (!item.id || !item.date || !item.title) return false;
              const source = String(item.source || "").toLowerCase();
              const linkedType = String(item.linkedType || "").toLowerCase();
              const is4725HomeChoreOccurrence =
                activePropertyId === "4725" &&
                (source === "home-chore-extra" || source === "home-chore");
              if (is4725HomeChoreOccurrence) return true;
              return (
                source !== "task" &&
                source !== "work-order" &&
                source !== "workorder" &&
                source !== "service" &&
                linkedType !== "task" &&
                linkedType !== "work order"
              );
            }),
        );

        if (activePropertyId === "2000") {
          saveStoredArray(storageKeys.calendar[0], sharedItems);
        }
        setCalendarItems(sharedItems);
        setSelectedCalendarId((current) =>
          sharedItems.some((item) => item.id === current) ? current : "",
        );

        await cachePhotoRecords(apiPhotos);
        setPhotos(apiPhotos);
        persistPhotoRecords(apiPhotos);

        const normalizeProject = (value: unknown): PhotoTimelineProject & { timelineEntries?: ProjectTimelineEntry[]; photoMeta?: Record<string, PhotoTimelineMeta> } => {
          const project = value && typeof value === "object" ? value as Record<string, unknown> : {};
          return {
            ...(project as unknown as PhotoTimelineProject),
            propertyId: String(project.propertyId || activePropertyId),
            id: String(project.id || ""),
            title: String(project.title || "New Project"),
            category: (project.category || "General") as PhotoTimelineProjectCategory,
            assetId: String(project.assetId || ""),
            locationId: String(project.locationId || ""),
            vendorId: String(project.vendorId || ""),
            workOrderId: String(project.workOrderId || ""),
            workOrderIds: Array.isArray(project.workOrderIds) ? project.workOrderIds.map(String) : project.workOrderId ? [String(project.workOrderId)] : [],
            vendorIds: Array.isArray(project.vendorIds) ? project.vendorIds.map(String) : project.vendorId ? [String(project.vendorId)] : [],
            documentIds: Array.isArray(project.documentIds) ? project.documentIds.map(String) : [],
            assigneeIds: Array.isArray(project.assigneeIds) ? project.assigneeIds.map(String) : [],
            notes: String(project.notes || ""),
            coverPhotoId: String(project.coverPhotoId || ""),
            createdAt: String(project.createdAt || new Date().toISOString()),
            timelineEntries: Array.isArray(project.timelineEntries) ? project.timelineEntries as ProjectTimelineEntry[] : [],
            photoMeta: project.photoMeta && typeof project.photoMeta === "object" ? project.photoMeta as Record<string, PhotoTimelineMeta> : {},
          };
        };

        let sharedProjects = apiProjects.map(normalizeProject).filter((project) => project.id);
        if (typeof window !== "undefined") {
          const localProjects = readStoredArray<PhotoTimelineProject>(["atlas-photo-timeline-projects-v1"], [])
            .filter((project) => activePropertyId === "2000" || project.propertyId === activePropertyId);
          const localEntries = readStoredArray<ProjectTimelineEntry>(["atlas-project-timeline-entries-v1"], []);
          const localMeta = (() => {
            try {
              const raw = window.localStorage.getItem("atlas-photo-timeline-meta-v1");
              const parsed = raw ? JSON.parse(raw) : {};
              return parsed && typeof parsed === "object" ? parsed as Record<string, PhotoTimelineMeta> : {};
            } catch { return {} as Record<string, PhotoTimelineMeta>; }
          })();

          const sharedIds = new Set(sharedProjects.map((project) => project.id));
          const sharedTitles = new Set(sharedProjects.map((project) => project.title.trim().toLowerCase()));
          const missingLocalProjects = localProjects.filter((project) =>
            project.id &&
            !sharedIds.has(project.id) &&
            !sharedTitles.has(String(project.title || "").trim().toLowerCase()),
          );

          if (missingLocalProjects.length) {
            const uploaded: typeof sharedProjects = [];
            for (const project of missingLocalProjects) {
              const record = {
                ...project,
                propertyId: activePropertyId,
                timelineEntries: localEntries.filter((entry) => entry.projectId === project.id),
                photoMeta: Object.fromEntries(Object.entries(localMeta).filter(([, meta]) => meta.projectId === project.id)),
              };
              if (await postAtlasRecord("projects", record)) uploaded.push(normalizeProject(record));
            }
            sharedProjects = [...sharedProjects, ...uploaded];
            if (uploaded.length) {
              window.localStorage.setItem(`atlas-project-migration-v2-${activePropertyId}`, "done");
              setDatabaseStatus(`${uploaded.length} local project${uploaded.length === 1 ? "" : "s"} moved into shared Atlas.`);
            }
          }
        }

        setPhotoTimelineProjects(sharedProjects.map(({ timelineEntries, photoMeta, ...project }) => project));
        setProjectTimelineEntries(sharedProjects.flatMap((project) => project.timelineEntries || []));
        setPhotoTimelineMeta((current) => ({ ...current, ...Object.assign({}, ...sharedProjects.map((project) => project.photoMeta || {})) }));
        setSelectedPhotoProjectId((current) => sharedProjects.some((project) => project.id === current) ? current : "");
        setProjectsApiHydrated(true);

        setDatabaseStatus(
          `Atlas loaded: ${nextAssets.length} assets, ${nextVendors.length} vendors, ${nextServices.length} work orders.`,
        );
        setSyncState("synced");
        setMobileSyncRefreshing(false);
        setShowPropertyLoading(false);
        setLastSyncedAt(
          new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date()),
        );
      } catch (error) {
        if (!cancelled) {
          setOperationsHydrated(true);
          setMobileSyncRefreshing(false);
          setShowPropertyLoading(false);

          if (sharedAtlasLoaded) {
            // The main shared-Atlas request succeeded. A later, optional hydration
            // step must not falsely mark the whole app or operational sync offline.
            setSyncState("synced");
            setOperationsSyncMessage("Shared Atlas connected");
            setLastSyncedAt(
              new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date()),
            );
            console.error("Atlas secondary hydration failed", error);
          } else {
            // Only a failure of the actual shared-Atlas load should put Atlas
            // into offline mode. Operational saving will retry independently.
            setSyncState("offline");
            setOperationsSyncMessage("Shared Atlas is temporarily unavailable.");
            setDatabaseStatus(
              "Using saved browser records / fallback records. /api/atlas did not load.",
            );
            console.error("Atlas shared-data load failed", error);
          }
        }
      }
    }

    void loadAtlasApi();

    return () => {
      cancelled = true;
    };
  }, [activePropertyId, sharedRefreshNonce]);

  function requestSharedAtlasRefresh() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    if (Object.keys(dirtyRecords).length > 0) {
      setOperationsSyncMessage("Refresh paused while an unsaved edit is open.");
      return;
    }
    const now = Date.now();
    if (now - sharedRefreshLastRequestedRef.current < 1200) return;
    sharedRefreshLastRequestedRef.current = now;
    setMobileSyncRefreshing(true);
    setSharedRefreshNonce((current) => current + 1);
  }

  useEffect(() => {
    if (!ready || typeof window === "undefined" || typeof document === "undefined") return;

    let cancelled = false;
    let running = false;

    const refreshSharedNotes = async () => {
      if (running || cancelled || !navigator.onLine || document.visibilityState !== "visible") return;
      running = true;
      try {
        const response = await fetch(
          `/api/atlas?notesSync=${Date.now()}&propertyId=${encodeURIComponent(activePropertyId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const payload = await response.json().catch(() => ({}));
        if (cancelled || payload?.ok === false) return;

        const operationsPayload =
          payload?.operations && typeof payload.operations === "object"
            ? payload.operations
            : payload;
        if (!Array.isArray(operationsPayload?.notes)) return;

        const sharedNotes = operationsPayload.notes.filter(
          (note: any) => Boolean(note?.id && note?.text && note?.date),
        );
        const sharedIds = new Set(sharedNotes.map((note: any) => String(note.id)));

        setTodayLogEntries((current) => [
          ...current.filter(
            (entry) =>
              !(
                entry.propertyId === activePropertyId &&
                entry.category === "Note"
              ),
          ),
          ...sharedNotes.map((note: any) => ({
            id: String(note.id),
            propertyId: String(note.propertyId || activePropertyId),
            date: String(note.date),
            category: "Note" as const,
            text: String(note.text),
            createdAt: String(note.createdAt || new Date().toISOString()),
            updatedAt: note.updatedAt ? String(note.updatedAt) : undefined,
          })),
        ]);

        setNoteTitlesById((current) => {
          const next = { ...current };
          sharedNotes.forEach((note: any) => {
            next[String(note.id)] = String(note.title || "");
          });
          return next;
        });
        setNotesSectionById((current) => {
          const next = { ...current };
          sharedNotes.forEach((note: any) => {
            next[String(note.id)] = (note.section || "General") as NoteSection;
          });
          return next;
        });
        setPinnedNoteIds((current) => [
          ...current.filter((id) => !sharedIds.has(id)),
          ...sharedNotes.filter((note: any) => Boolean(note.pinned)).map((note: any) => String(note.id)),
        ]);
        setNoteFollowUpDates((current) => {
          const next = { ...current };
          sharedNotes.forEach((note: any) => {
            const id = String(note.id);
            if (note.followUpDate) next[id] = String(note.followUpDate);
            else delete next[id];
          });
          return next;
        });
        setNoteAttachments((current) => {
          const next = { ...current };
          sharedNotes.forEach((note: any) => {
            next[String(note.id)] = (Array.isArray(note.attachments) ? note.attachments : [])
              .map((attachment: any) => ({
                kind: String(attachment?.kind || "") as NoteAttachmentKind,
                id: String(attachment?.id || ""),
              }))
              .filter(
                (attachment: NoteAttachment) =>
                  Boolean(attachment.id) &&
                  ([
                    "Asset",
                    "Location",
                    "Vendor",
                    "Project",
                    "Work Order",
                    "Task",
                    "Contact",
                    "Procedure",
                  ] as NoteAttachmentKind[]).includes(attachment.kind),
              );
          });
          return next;
        });
        setDashboardReminders(
          sharedNotes
            .filter((note: any) => Boolean(note.dashboard))
            .map((note: any) => ({
              id: String(note.id),
              text: String(note.text),
              done: Boolean(note.done),
              createdAt: String(note.createdAt || new Date().toISOString()),
              dueDate: note.dueDate ? String(note.dueDate) : undefined,
            }))
            .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)),
        );
      } catch {
        // Keep the current Notes visible if the dedicated Notes refresh fails.
      } finally {
        running = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshSharedNotes();
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    // Opening Notes or Dashboard should always show the latest shared Notes immediately.
    if (screen === "notes" || screen === "dashboard") void refreshSharedNotes();

    const interval =
      screen === "notes" || screen === "dashboard"
        ? window.setInterval(() => void refreshSharedNotes(), 5000)
        : null;

    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [ready, activePropertyId, screen]);

  useEffect(() => {
    if (!ready || activePropertyId !== "4725" || typeof window === "undefined") return;
    const refreshHomeChores = () => {
      setSharedRefreshNonce((current) => current + 1);
    };
    window.addEventListener("atlas:home-chore-changed", refreshHomeChores);
    return () => window.removeEventListener("atlas:home-chore-changed", refreshHomeChores);
  }, [ready, activePropertyId]);

  useEffect(() => {
    if (!ready || typeof window === "undefined" || typeof document === "undefined") return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        requestSharedAtlasRefresh();
      }
    };
    const refreshWhenOnline = () => requestSharedAtlasRefresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        requestSharedAtlasRefresh();
      }
    }, 45000);

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenOnline);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenOnline);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [ready, activePropertyId, dirtyRecords]);

  useEffect(() => {
    if (!ready || screen !== "history") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    requestSharedAtlasRefresh();
  }, [ready, screen, activePropertyId]);

  useEffect(() => {
    if (!ready || screen !== "calendar") return;

    let cancelled = false;
    let running = false;

    async function refreshSharedCalendar() {
      if (running || cancelled) return;
      running = true;

      try {
        const response = await fetch(`/api/atlas?calendarSync=${Date.now()}&propertyId=${encodeURIComponent(activePropertyId)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const payload = (await response.json()) as AtlasApiPayload & { propertyId?: string };
        if (cancelled || payload?.ok === false) return;

        const responsePropertyId = String(payload.propertyId || activePropertyId);
        if (responsePropertyId !== activePropertyId) return;

        const sharedCalendar = (
          Array.isArray(payload.calendarItems)
            ? payload.calendarItems
            : Array.isArray(payload.calendar)
              ? payload.calendar
              : []
        )
          .map(normalizeCalendar)
          .filter((item) => {
            if (!item.id || !item.date || !item.title) return false;
            const source = String(item.source || "").toLowerCase();
            const linkedType = String(item.linkedType || "").toLowerCase();
            const is4725HomeChoreOccurrence =
              activePropertyId === "4725" &&
              (source === "home-chore-extra" || source === "home-chore");
            if (is4725HomeChoreOccurrence) return true;
            return (
              source !== "task" &&
              source !== "work-order" &&
              source !== "workorder" &&
              source !== "service" &&
              linkedType !== "task" &&
              linkedType !== "work order"
            );
          });

        const next = calendarItemsByIdentity(sharedCalendar);

        setCalendarItems((current) => {
          const signature = (items: CalendarItem[]) =>
            items
              .map(
                (item) =>
                  `${item.id}|${item.date}|${item.time || ""}|${item.title}|${
                    item.repeat || "None"
                  }|${item.reminder || "None"}|${item.categoryLabel || item.area || ""}|${
                    item.notes || ""
                  }|${item.linkedType || "None"}|${item.linkedId || ""}|${
                    item.completed ? "1" : "0"
                  }`,
              )
              .join("\n");

          if (signature(current) === signature(next)) return current;
          return next;
        });

        if (activePropertyId === "2000") {
          saveStoredArray(storageKeys.calendar[0], next);
        }
        setSyncState("synced");
        setShowPropertyLoading(false);
        setLastSyncedAt(
          new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date()),
        );
      } catch {
        // Keep the current calendar visible if its refresh fails. A calendar-only
        // refresh failure must not mark all of Atlas offline when Tasks and other
        // shared records are still syncing successfully.
        if (!cancelled) {
          setShowPropertyLoading(false);
        }
      } finally {
        running = false;
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSharedCalendar();
      }
    };

    const onFocus = () => void refreshSharedCalendar();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void refreshSharedCalendar();

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, screen, activePropertyId]);

  useEffect(() => {
    if (!ready || !photos.length) return;

    const missing = photos.filter((photo) => !photoSource(photo));
    if (!missing.length) return;

    let cancelled = false;

    void Promise.all(
      missing.map(async (photo) => ({
        id: photo.id,
        cached: await readCachedPhoto(photo.id),
      })),
    ).then((results) => {
      if (cancelled) return;

      const cachedById = new Map(
        results
          .filter((result) => result.cached)
          .map((result) => [result.id, result.cached!]),
      );

      if (!cachedById.size) return;

      setPhotos((current) =>
        current.map((photo) => {
          const cached = cachedById.get(photo.id);
          return cached
            ? {
                ...photo,
                dataUrl: cached.dataUrl || photo.dataUrl,
                url: cached.url || photo.url,
              }
            : photo;
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [ready, photos]);

  useEffect(() => {
    void loadWeather();
  }, []);

  useEffect(() => {
    void refreshDocumentVault();
  }, [activePropertyId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const rawQr = params.get("qr");
    if (!rawQr) return;

    openQrTarget(rawQr, { replaceUrl: true, source: "link" });
  }, []);

  useEffect(() => {
    if (screen !== "scan") void stopQrScanner(false);
  }, [screen]);

  useEffect(() => {
    return () => {
      void stopQrScanner(false);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.mapLabels[0], mapLabels);
  }, [ready, mapLabels]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch(
          `/api/atlas-requests?propertyId=${encodeURIComponent(activePropertyId)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || "Requests could not be loaded.");
        }
        if (cancelled) return;
        const rawRequests = Array.isArray(payload.requests)
          ? payload.requests
          : [];
        const next = rawRequests.filter((item: OwnerRequestRecord & { propertyId?: string }) => {
          const requestPropertyId = String(item.propertyId || "");
          if (activePropertyId === "2000") {
            return !requestPropertyId || requestPropertyId === "2000";
          }
          return requestPropertyId === activePropertyId;
        });
        setRequestRecords(next);
        setRequestPortalToken(String(payload.portalToken || ""));
        setMarineRequestPortalToken(
          String(
            payload.marinePortalToken ||
              (payload.portalToken ? `marine-${payload.portalToken}` : ""),
          ),
        );
        setSelectedRequestId((current) =>
          next.some((item: OwnerRequestRecord) => item.id === current)
            ? current
            : next[0]?.id || "",
        );
        setRequestMessage(
          next.length
            ? `${next.length} owner request${next.length === 1 ? "" : "s"} loaded.`
            : "No owner requests yet.",
        );
      } catch (error) {
        if (!cancelled) {
          setRequestMessage(
            error instanceof Error
              ? error.message
              : "Requests could not be loaded.",
          );
        }
      }
    }

    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, [ready, activePropertyId]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function loadInbox() {
      try {
        const response = await fetch("/api/atlas-inbox", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || "Atlas Inbox could not be loaded.");
        }
        if (cancelled) return;
        const next = Array.isArray(payload.items) ? payload.items : [];
        setInboxItems(next);
        setSelectedInboxId((current) =>
          next.some((item: InboxItemRecord) => item.id === current)
            ? current
            : next[0]?.id || "",
        );
        setInboxMessage(
          next.length
            ? `${next.length} Inbox item${next.length === 1 ? "" : "s"} loaded.`
            : "Atlas Inbox is empty.",
        );
      } catch (error) {
        if (!cancelled) {
          setInboxMessage(
            error instanceof Error
              ? error.message
              : "Atlas Inbox could not be loaded.",
          );
        }
      }
    }

    void loadInbox();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const tombstones = readAssetDeleteTombstones(activePropertyId);
    const generatedNameTombstones =
      readAssetDeleteNameTombstones(activePropertyId);
    const visibleAssets =
      tombstones.size || generatedNameTombstones.size
        ? assetRecords.filter(
            (asset) =>
              !tombstones.has(String(asset.id)) &&
              !generatedNameTombstones.has(
                normalizeLocationName(asset.name),
              ),
          )
        : assetRecords;

    if (visibleAssets.length !== assetRecords.length) {
      setAssetRecords(visibleAssets);
      saveStoredArray(storageKeys.assets[0], visibleAssets);
      return;
    }

    saveStoredArray(storageKeys.assets[0], assetRecords);
  }, [ready, assetRecords, activePropertyId]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.vendors[0], vendorRecords);
  }, [ready, vendorRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.contacts[0], contactRecords);
  }, [ready, contactRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.workOrders[0], serviceRecords);
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.procedures[0], procedureRecords);
  }, [ready, procedureRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.calendar[0], calendarItems);
  }, [ready, calendarItems]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(todayLogStorageKeys[0], todayLogEntries);
  }, [ready, todayLogEntries]);

  useEffect(() => {
    if (!ready) return;
    if (dashboardRoutineSkipSaveRef.current) {
      dashboardRoutineSkipSaveRef.current = false;
      return;
    }
    saveStoredArray(`${dashboardRoutineStorageKeys[0]}:${activePropertyId}`, completedDashboardRoutineIds);
  }, [ready, activePropertyId, completedDashboardRoutineIds]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.calendarColors[0], calendarColors);
  }, [ready, calendarColors]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.parts[0], partRecords);
  }, [ready, partRecords]);

  useEffect(() => {
    if (!ready) return;

    const builtInLogoValues = new Set<string>(
      Object.values(WORKLINK_LOGOS)
        .map((value) => String(value))
        .filter((value) => value.length > 0),
    );
    const compactWorkLinks = workLinks.map((link) => ({
      ...link,
      // Built-in logos already ship with Atlas. Do not duplicate hundreds of
      // kilobytes of base64 data in localStorage, which can block Calendar saves.
      logoUrl:
        link.logoUrl && builtInLogoValues.has(link.logoUrl)
          ? undefined
          : link.logoUrl,
    }));

    const saved = saveStoredArray(storageKeys.workLinks[0], compactWorkLinks);
    if (!saved) {
      setWorkLinkMessage(
        "Apps could not be saved in this browser. Try a smaller custom logo image.",
      );
    }
  }, [ready, workLinks]);

  function byLabel(records: MapLabelRecord[]) {
    return [...records].sort((a, b) => a.label.localeCompare(b.label));
  }

  function locationName(id?: string) {
    return locations.find((location) => location.id === id)?.name ?? "General";
  }

  function vendorName(id?: string) {
    return (
      vendorRecords.find((vendor) => vendor.id === id)?.name ?? "No vendor"
    );
  }

  function assetName(id?: string) {
    return assetRecords.find((asset) => asset.id === id)?.name ?? "No asset";
  }

  function atlasBaseUrl() {
    if (typeof window !== "undefined" && window.location.origin)
      return window.location.origin;
    return "https://www.atlas2000.com";
  }

  function recordQrUrl(kind: QrKind, id: string) {
    return `${atlasBaseUrl()}/?qr=${kind}:${encodeURIComponent(id)}`;
  }

  function qrImageUrl(value: string, size = 230) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(value)}`;
  }

  async function copyOwnerRequestQrImage(portalLink: string) {
    if (!portalLink) return;

    const imageUrl = qrImageUrl(portalLink, 700);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.write &&
        typeof ClipboardItem !== "undefined"
      ) {
        const response = await fetch(imageUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("QR image download failed.");

        const sourceBlob = await response.blob();
        const pngBlob =
          sourceBlob.type === "image/png"
            ? sourceBlob
            : new Blob([await sourceBlob.arrayBuffer()], {
                type: "image/png",
              });

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
        setRequestMessage("Owner request QR image copied.");
        return;
      }

      throw new Error("Image clipboard is unavailable.");
    } catch {
      try {
        await navigator.clipboard.writeText(portalLink);
        setRequestMessage(
          "This browser could not copy the QR picture, so the owner request link was copied instead.",
        );
      } catch {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
        setRequestMessage(
          "The QR image opened in a new tab. Save or share it from there.",
        );
      }
    }
  }

  function parseQrTarget(value: string): { kind: QrKind; id: string } | null {
    let raw = String(value || "").trim();
    if (!raw) return null;

    try {
      const parsedUrl = new URL(raw, atlasBaseUrl());
      raw = parsedUrl.searchParams.get("qr") || raw;
    } catch {
      const match = raw.match(/[?&]qr=([^&#]+)/);
      if (match?.[1]) raw = decodeURIComponent(match[1]);
    }

    const [rawKind, ...idParts] = raw.split(":");
    const kind = rawKind as QrKind;
    const id = decodeURIComponent(idParts.join(":")).trim();

    if (!id || !["asset", "location", "vendor", "map"].includes(kind))
      return null;
    return { kind, id };
  }

  function openQrTarget(
    value: string,
    options?: { replaceUrl?: boolean; source?: "scanner" | "manual" | "link" },
  ) {
    const scannedValue = String(value || "").trim();

    if (scannedValue && typeof window !== "undefined") {
      try {
        const scannedUrl = new URL(scannedValue, window.location.origin);
        const isSafeAtlasUrl =
          scannedUrl.protocol === "https:" &&
          scannedUrl.origin === window.location.origin;

        if (isSafeAtlasUrl && !scannedUrl.searchParams.get("qr")) {
          setLastScannedQr(scannedValue);
          setScannerStatus("QR code recognized. Opening link...");

          if (options?.source === "scanner") {
            void stopQrScanner(false).finally(() => {
              window.location.assign(scannedUrl.toString());
            });
          } else {
            window.location.assign(scannedUrl.toString());
          }

          return true;
        }
      } catch {
        // Continue to Atlas record parsing below.
      }
    }

    const parsed = parseQrTarget(scannedValue);

    if (!parsed) {
      setScannerStatus(
        "That QR code was read, but it is not a supported Atlas record or secure Atlas link.",
      );
      return false;
    }

    const { kind, id } = parsed;
    setLastScannedQr(String(value || ""));
    setScannerManualValue("");
    setQuery("");

    if (kind === "asset") {
      setSelectedAssetId(id);
      setScreen("assets");
    }

    if (kind === "vendor") {
      setSelectedVendorId(id);
      setScreen("vendors");
    }

    if (kind === "location") {
      const location = locations.find((item) => item.id === id);
      setQuery(location?.name || "");
      setScreen("locations");
    }

    if (kind === "map") {
      setSelectedMapLabelId(id);
      setScreen("map");
    }

    setScannerStatus(`Opened Atlas ${kind}: ${id}`);

    if (options?.source === "scanner") void stopQrScanner(false);

    if (options?.replaceUrl && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("qr");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    return true;
  }

  function loadQrScannerScript() {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Scanner only runs in the browser."));
        return;
      }

      if ((window as any).Html5Qrcode) {
        resolve();
        return;
      }

      const existing = document.getElementById(
        "atlas-html5-qrcode-script",
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("QR scanner script failed to load.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "atlas-html5-qrcode-script";
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("QR scanner script failed to load."));
      document.body.appendChild(script);
    });
  }

  async function startQrScanner() {
    if (typeof window === "undefined") return;

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setScannerStatus(
        "Camera scanning requires HTTPS. Open Atlas from https://www.atlas2000.com and try again.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerStatus(
        "This browser does not allow camera scanning here. Use the phone Camera app to scan the QR label; it will still open Atlas correctly.",
      );
      return;
    }

    setScannerStatus("Starting camera scanner...");

    try {
      await loadQrScannerScript();
      await stopQrScanner(false);

      const Html5Qrcode = (window as any).Html5Qrcode;
      if (!Html5Qrcode) throw new Error("QR scanner library did not load.");

      const scanner = new Html5Qrcode(qrScannerElementId, false);
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: isMobile
            ? { width: 230, height: 230 }
            : { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          openQrTarget(decodedText, { source: "scanner" });
        },
        () => undefined,
      );

      setScannerActive(true);
      setScannerStatus("Camera is active. Point it at an Atlas QR label.");
    } catch {
      setScannerActive(false);
      qrScannerRef.current = null;
      setScannerStatus(
        "Could not start the camera scanner. Allow camera permission, reload Atlas, or use the phone Camera app to scan the QR label.",
      );
    }
  }

  async function stopQrScanner(updateStatus = true) {
    const scanner = qrScannerRef.current;
    if (!scanner) {
      setScannerActive(false);
      if (updateStatus) setScannerStatus("Scanner is off.");
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped.
    }

    try {
      await scanner.clear();
    } catch {
      // Clear is best-effort only.
    }

    qrScannerRef.current = null;
    setScannerActive(false);
    if (updateStatus) setScannerStatus("Scanner is off.");
  }

  function colorForEvent(event: CalendarItem) {
    if (activePropertyId === "4725") {
      const linkedChore = serviceRecords.find(
        (record) =>
          String(record.id || "") === String(event.linkedId || "") &&
          String(record.responsibilityArea || "") === "Family",
      );
      const isFamilyChore =
        String(event.categoryLabel || "") === "Chore" ||
        String(event.colorId || "").startsWith("home-chore") ||
        String(event.source || "").startsWith("home-chore") ||
        Boolean(linkedChore);

      if (isFamilyChore) {
        const assignedPerson = String(
          linkedChore?.assignedTo || event.area || "Family",
        ).trim();
        const familyColor =
          ({
            Nick: { id: "green", hex: "#12B76A" },
            Chelsea: { id: "orange", hex: "#F79009" },
            Cooper: { id: "blue", hex: "#2E90FA" },
            Leni: { id: "pink", hex: "#EE46BC" },
            Family: { id: "gray", hex: "#667085" },
          } as Record<string, { id: string; hex: string }>)[assignedPerson] ||
          { id: "gray", hex: "#667085" };

        return {
          id: familyColor.id,
          label: "Chore",
          hex: familyColor.hex,
          colorName: familyColor.id as CalendarColorName,
        };
      }
    }

    const labelRecord = calendarColors.find(
      (color) => color.id === event.colorId,
    );
    const colorName =
      event.colorName ||
      labelRecord?.colorName ||
      colorNameFromLegacyColorId(event.colorId);
    const plain = plainColor(colorName);

    return {
      id: colorName,
      label:
        event.categoryLabel || event.area || labelRecord?.label || plain.label,
      hex: plain.hex,
      colorName,
    };
  }

  function selectedColor() {
    const plain = plainColor(
      calendarDraft.colorName ||
        colorNameFromLegacyColorId(calendarDraft.colorId),
    );
    return {
      id: plain.id,
      label: plain.label,
      hex: plain.hex,
      colorName: plain.id,
    };
  }

  function categoryForEvent(event: CalendarItem) {
    return (
      event.categoryLabel || event.area || colorForEvent(event).label || "Other"
    );
  }

  function isCategoryVisible(category: string) {
    return calendarCategoryFilters[category] !== false;
  }

  const selectedMapLabel = mapLabels.find(
    (label) => label.id === selectedMapLabelId,
  ) ?? {
    id: "",
    label: "",
    category: "",
    x: 50,
    y: 50,
    notes: "",
    photos: [],
    coverPhotoId: "",
    vendorIds: [],
    detailBoxes: [],
    installer: "",
    paintColor: "",
    specs: "",
    documentNotes: "",
    photoNotes: "",
    maintenanceNotes: "",
  };
  const selectedLocation = locations.find(
    (location) => location.id === selectedLocationId,
  ) ?? {
    id: "",
    name: "",
    type: "",
    zone: "",
    notes: "",
  };
  const selectedAsset =
    assetRecords.find((asset) => asset.id === selectedAssetId) ??
    normalizeAsset({
      id: "",
      name: "",
      locationId: "",
      category: "",
      status: "Monitor",
      make: "",
      model: "",
      year: "",
      manufacturer: "",
      serial: "",
      notes: "",
      vendorIds: [],
    });
  const selectedVendor =
    vendorRecords.find((vendor) => vendor.id === selectedVendorId) ??
    normalizeDepartmentVendor({
      id: "",
      name: "",
      category: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
    });
  const normalizedAccessProfiles = (currentAtlasUser?.accessProfiles || []).map((profile) =>
    String(profile || "").trim().toLowerCase(),
  );
  const canUseAdminTools = Boolean(
    currentAtlasUser && ["master", "admin"].includes(currentAtlasUser.role),
  );
  const isRestrictedStaffUser = Boolean(
    currentAtlasUser &&
      ["employee", "vendor", "viewer"].includes(currentAtlasUser.role),
  );
  const normalizedCurrentUserName = String(currentAtlasUser?.name || "").trim().toLowerCase();
  const currentStaffFirstName = normalizedCurrentUserName.split(/\s+/)[0] || "";

  const hasTeamProfile = (...profiles: string[]) =>
    normalizedAccessProfiles.some((profile) => profiles.includes(profile));

  const isSeanMarineUser = Boolean(
    currentAtlasUser &&
      (hasTeamProfile("sean", "marine", "marine-operations", "sean-marine") ||
        /^sean(?:\s|$)/i.test(currentAtlasUser.name)),
  );
  const isRequestCoordinatorUser = Boolean(
    currentAtlasUser &&
      (hasTeamProfile("request-coordinator", "requests", "request-management") ||
        /^delaney(?:\s|$)/i.test(currentAtlasUser.name)),
  );
  const isAddisonUser = Boolean(
    adminPreviewMode === "addison" ||
      (currentAtlasUser &&
        (hasTeamProfile("addison", "grounds", "grounds-operations", "daily-routines") ||
          /^addison(?:\s|$)/i.test(currentAtlasUser.name))),
  );
  // Addison is always a field-only user, even if his Team Center role was accidentally
  // configured with broader permissions. This prevents his phone from ever inheriting Nick/admin UI.
  const isTeamScopedUser = isRestrictedStaffUser || isAddisonUser;
  const isPatCrewUser = Boolean(
    currentAtlasUser &&
      (hasTeamProfile("pat", "pat-crew", "landscaping", "landscape-crew", "grounds-crew") ||
        /^(pat|patrick)(?:\s|$)/i.test(currentAtlasUser.name) ||
        normalizedCurrentUserName.includes("crew")),
  );
  const isVendorPortalUser = Boolean(
    currentAtlasUser &&
      (currentAtlasUser.role === "vendor" ||
        hasTeamProfile("vendor", "vendor-portal", "service-provider")),
  );

  const teamWorkspace = isRequestCoordinatorUser
    ? {
        title: `${currentAtlasUser?.name || "Request Coordinator"} Request Coordination`,
        centerTitle: "Request Coordination",
        detail: "Review incoming requests, connect locations and assets, and route work to the correct person.",
        emptyMessage: "No open request-related work is currently assigned.",
        assignmentAliases: [currentStaffFirstName, normalizedCurrentUserName].filter(Boolean),
      }
    : isSeanMarineUser
      ? {
        title: "Sean Marine Operations",
        centerTitle: "Marine Work Center",
        detail: "Boat, dock, lift, and marine-service work assigned to you.",
        emptyMessage: "No open marine work is currently assigned to Sean.",
        assignmentAliases: ["sean"],
      }
    : isAddisonUser
      ? {
          title: "Addison Grounds & Daily Operations",
          centerTitle: "Daily Work Center",
          detail: "Daily routines, grounds work, property care, and assigned maintenance.",
          emptyMessage: "No open work is currently assigned to Addison.",
          assignmentAliases: ["addison"],
        }
      : isPatCrewUser
        ? {
            title: "Pat's Crew Landscaping",
            centerTitle: "Assigned Landscaping Work",
            detail: "Weekly landscaping worksheet, assigned beds, visit progress, notes, severity, photos, and follow-up work.",
            emptyMessage: "No open landscaping work is currently assigned to Pat's Crew.",
            assignmentAliases: ["pat", "pat's crew", "pats crew", "landscape crew", "landscaping crew"],
          }
        : isVendorPortalUser
          ? {
              title: `${currentAtlasUser?.name || "Vendor"} Service Portal`,
              centerTitle: "Assigned Service Work",
              detail: "Service requests and work orders assigned specifically to your company.",
              emptyMessage: "No open service work is currently assigned to this vendor.",
              assignmentAliases: [currentStaffFirstName, normalizedCurrentUserName].filter(Boolean),
            }
          : {
              title: `${currentAtlasUser?.name || "Team Member"} Work Center`,
              centerTitle: "My Work Center",
              detail: "Work orders and routines assigned specifically to you.",
              emptyMessage: "No open work is currently assigned to you.",
              assignmentAliases: [currentStaffFirstName, normalizedCurrentUserName].filter(Boolean),
            };

  const marineDepartmentPattern = /marine|dock|craft|boat|cobalt|sea[\s-]?doo|jet[\s-]?ski|pwc|lift|lift\s*box|liftbox|dock\s*box|sunstream|124[\s-]*(?:inch|in|\")?\s*roller|water trampoline|sean/i;
  const recordSearchText = (...values: unknown[]) =>
    values.map((value) => {
      if (typeof value === "string" || typeof value === "number") return String(value);
      try { return JSON.stringify(value || ""); } catch { return ""; }
    }).join(" ").toLowerCase();

  const isMarineLocationRecord = (location?: LocationRecord | null) =>
    Boolean(location && marineDepartmentPattern.test(recordSearchText(location)));

  const marineLocationIds = new Set(
    locations.filter((location) => isMarineLocationRecord(location)).map((location) => location.id),
  );

  const isMarineAssetRecord = (asset?: AssetRecord | null) => {
    if (!asset) return false;
    const linkedLocationIds = [asset.locationId, ...((asset as AtlasAssetRecord).locationIds || [])].filter(Boolean);
    return marineDepartmentPattern.test(recordSearchText(asset)) ||
      linkedLocationIds.some((locationId) => marineLocationIds.has(String(locationId)));
  };

  const marineAssetIds = new Set(
    assetRecords.filter((asset) => isMarineAssetRecord(asset)).map((asset) => asset.id),
  );
  const marineAssetNames = assetRecords
    .filter((asset) => marineAssetIds.has(asset.id))
    .map((asset) => normalizeLocationName(asset.name))
    .filter((name) => name.length >= 3);

  assetRecords.forEach((asset) => {
    if (!marineAssetIds.has(asset.id)) return;
    [asset.locationId, ...((asset as AtlasAssetRecord).locationIds || [])]
      .filter(Boolean)
      .forEach((locationId) => marineLocationIds.add(String(locationId)));
  });

  const isMarineServiceRecord = (record: ServiceRecord) => {
    const atlasRecord = record as AtlasServiceRecord;
    const linkedAssetIds = [
      String(record.assetId || ""),
      ...(((atlasRecord as AtlasServiceRecord & { assetIds?: string[] }).assetIds || []).map(String)),
      ...(((atlasRecord as AtlasServiceRecord & { linkedAssetIds?: string[] }).linkedAssetIds || []).map(String)),
    ].filter(Boolean);
    const serviceText = recordSearchText(
      atlasRecord.workCategory,
      atlasRecord.responsibilityArea,
      atlasRecord.assignedTo,
      record.title,
      record.notes,
    );
    const normalizedServiceText = normalizeLocationName(serviceText);
    return linkedAssetIds.some((assetId) => marineAssetIds.has(assetId)) ||
      marineLocationIds.has(String(atlasRecord.locationId || "")) ||
      marineAssetNames.some((assetName) => normalizedServiceText.includes(assetName)) ||
      marineDepartmentPattern.test(serviceText);
  };

  const isMarineDocumentRecord = (document: DocumentRecord) => {
    const linkedAssetId = String(document.linkedAssetId || (document.targetType === "Asset" ? document.targetId : "") || "");
    const linkedLocationId = String(document.targetType === "Location" ? document.targetId : "");
    return marineAssetIds.has(linkedAssetId) ||
      marineLocationIds.has(linkedLocationId) ||
      marineDepartmentPattern.test(recordSearchText(
        document.title,
        document.type,
        document.area,
        document.targetType,
        document.targetName,
        document.notes,
        document.pastedText,
        (document.files || []).map((file) => file.name),
      ));
  };

  const seanVisibleAssetRecords = isSeanMarineUser
    ? assetRecords.filter((asset) => marineAssetIds.has(asset.id))
    : assetRecords;
  const seanVisibleLocationRecords = isSeanMarineUser
    ? locations.filter((location) => marineLocationIds.has(location.id))
    : locations;
  const seanVisiblePhotoRecords = isSeanMarineUser
    ? photos.filter((photo) => marineAssetIds.has(String(photo.assetId || "")))
    : photos;

  const staffVisibleServiceRecords = isTeamScopedUser
    ? serviceRecords.filter((record) => {
        if (isRequestCoordinatorUser) return true;
        if (isSeanMarineUser) return isMarineServiceRecord(record);
        const assigned = String((record as AtlasServiceRecord).assignedTo || "").trim().toLowerCase();
        if (!assigned) return false;
        const aliases = new Set([
          currentStaffFirstName,
          normalizedCurrentUserName,
          ...teamWorkspace.assignmentAliases,
        ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean));
        return [...aliases].some((alias) => assigned === alias || assigned.includes(alias) || alias.includes(assigned));
      })
    : serviceRecords;

  useEffect(() => {
    if (!isSeanMarineUser) return;
    if (selectedAssetId && !marineAssetIds.has(selectedAssetId)) setSelectedAssetId("");
    if (selectedLocationId && !marineLocationIds.has(selectedLocationId)) setSelectedLocationId("");
    if (selectedDocumentId) {
      const selected = mergeDocuments(documents, intakeDocs).find((document) => document.id === selectedDocumentId);
      if (selected && !isMarineDocumentRecord(selected)) setSelectedDocumentId("");
    }
  }, [isSeanMarineUser, selectedAssetId, selectedLocationId, selectedDocumentId, assetRecords, locations, documents, intakeDocs]);

  const restrictedTeamScreenIds = new Set<AtlasScreen>(
    isAddisonUser
      ? ["history"]
      : isRequestCoordinatorUser
        ? ["dashboard", "requests", "locations", "assets", "history"]
        : isSeanMarineUser
          ? ["dashboard", "history", "calendar", "requests", "assets", "documents", "procedures"]
          : ["dashboard", "history", "calendar", "assets", "documents", "procedures"],
  );
  const home4725Screens = new Set<AtlasScreen>([
    "dashboard",
    "calendar",
    "history",
    "assets",
    "locations",
    "notes",
    "assistant",
  ]);
  const visibleAtlasScreens = activePropertyId === "4725"
    ? screens.filter((item) => home4725Screens.has(item.id))
    : isTeamScopedUser
      ? screens.filter((item) => restrictedTeamScreenIds.has(item.id))
      : screens;
  const visiblePrimaryNavigationSections = activePropertyId === "4725"
    ? [
        { label: "Home", items: ["dashboard", "calendar", "history"] as AtlasScreen[] },
        { label: "Property", items: ["assets", "locations", "notes"] as AtlasScreen[] },
        { label: "Help", items: ["assistant"] as AtlasScreen[] },
      ]
    : isTeamScopedUser
      ? [
          {
            label: isAddisonUser
              ? "My Day"
              : isRequestCoordinatorUser
                ? "Request Coordination"
                : isSeanMarineUser
                  ? "Marine Operations"
                  : "My Atlas",
            items: isAddisonUser
              ? (["history"] as AtlasScreen[])
              : isRequestCoordinatorUser
                ? (["dashboard", "requests", "locations", "assets", "history"] as AtlasScreen[])
                : isSeanMarineUser
                  ? (["dashboard", "history", "calendar", "requests", "assets", "documents", "procedures"] as AtlasScreen[])
                  : (["dashboard", "history", "calendar", "assets", "documents", "procedures"] as AtlasScreen[]),
          },
        ]
      : (() => {
          return [
            { label: "Overview", items: ["dashboard", "notes"] as AtlasScreen[] },
            { label: "Work", items: ["history", "ownerReport", "reports"] as AtlasScreen[] },
            { label: "Property", items: ["assets", "locations", "calendar"] as AtlasScreen[] },
            { label: "People", items: ["contacts", "vendors", "team"] as AtlasScreen[] },
            { label: "Intake", items: ["intake"] as AtlasScreen[] },
            { label: "Knowledge", items: ["manuals"] as AtlasScreen[] },
          ];
        })();

  const visibleMoreToolsScreens = activePropertyId === "4725"
    ? ([] as AtlasScreen[])
    : isTeamScopedUser
      ? ([] as AtlasScreen[])
      : (() => {
          const primaryIds = new Set<AtlasScreen>([
            "dashboard", "notes", "history", "assets",
            "locations", "calendar", "contacts", "vendors", "team", "intake", "ownerReport", "reports",
          ]);
          const remaining = screens
            .map((item) => item.id)
            .filter((screenId) => !primaryIds.has(screenId) && screenId !== "insights");
          return remaining.filter(
            (screenId) => screenId !== "manuals" && screenId !== "planner" && screenId !== "routines",
          ) as AtlasScreen[];
        })();

  useEffect(() => {
    if (activePropertyId === "4725" && !home4725Screens.has(screen)) {
      setScreen("dashboard");
      return;
    }
    if (isAddisonUser) {
      if (tasksView !== "tasks") setTasksView("tasks");
      if (!restrictedTeamScreenIds.has(screen)) setScreen("history");
      return;
    }
    if (isTeamScopedUser && !restrictedTeamScreenIds.has(screen)) {
      setScreen("dashboard");
    }
  }, [activePropertyId, isAddisonUser, isTeamScopedUser, screen, tasksView]);

  const selectedService =
    serviceRecords.find((service) => service.id === selectedServiceId) ??
    normalizeService({
      id: "",
      assetId: "",
      vendorId: "",
      procedureId: "",
      date: "",
      title: "",
      status: "Open",
      priority: "Medium",
      notes: "",
      followUpDate: "",
      recurring: false,
      recurrenceInterval: 1,
      recurrenceUnit: "Weeks",
      recurrenceEndDate: "",
      season: seasonForDate(),
      lastCompletedDate: "",
      completionHistory: [],
      workType: "Work Order",
      workCategory: "🔧 Maintenance",
      effort: "30 minutes",
      responsibilityArea: "",
      emoji: "🔧",
      assignedTo: "",
      locationId: "",
      checklist: [],
      notesHistory: [],
      photos: [],
      documents: [],
    });
  const selectedProcedure =
    procedureRecords.find(
      (procedure) => procedure.id === selectedProcedureId,
    ) ??
    normalizeProcedure({
      id: "",
      title: "",
      area: "",
      category: "Maintenance",
      priority: "Normal",
      status: "Draft",
      purpose: "",
      safetyNotes: "",
      toolsParts: "",
      requiredTools: [],
      requiredParts: [],
      estimatedTime: "",
      steps: [],
      checklist: [],
      linkedAssetIds: [],
      linkedLocationIds: [],
      linkedVendorIds: [],
      photos: [],
      documents: [],
    });
  const selectedRequest =
    requestRecords.find((request) => request.id === selectedRequestId) ??
    requestRecords[0] ??
    null;
  const selectedPart =
    partRecords.find((part) => part.id === selectedPartId) ??
    normalizePart({
      id: "",
      name: "",
      category: "",
      locationId: "",
      assetId: "",
      vendorId: "",
      quantity: 0,
      minQuantity: 0,
      status: "In Stock",
      notes: "",
    });
  const selectedAssetPhotos = selectedAssetId
    ? (isSeanMarineUser ? seanVisiblePhotoRecords : photos)
        .filter((photo) => photo.assetId === selectedAssetId)
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
          }),
        )
    : [];
  const selectedWeather =
    weatherDays.find((day) => day.date === selectedWeatherDate) ??
    weatherDays[0];
  const selectedCalendar = calendarDraft;

  function dirtyKey(recordType: string, id?: string) {
    return `${recordType}:${id || ""}`;
  }

  function markRecordDirty(recordType: string, id?: string) {
    if (!id) return;
    const key = dirtyKey(recordType, id);
    setDirtyRecords((current) =>
      current[key] ? current : { ...current, [key]: true },
    );
  }

  function clearRecordDirty(recordType: string, id?: string) {
    if (!id) return;
    const key = dirtyKey(recordType, id);
    setDirtyRecords((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function isRecordDirty(recordType: string, id?: string) {
    return !!id && !!dirtyRecords[dirtyKey(recordType, id)];
  }

  async function saveDirtyRecord(
    table: AtlasTable,
    record: unknown,
    recordType: string,
    id?: string,
  ) {
    const saved = await postAtlasRecord(table, record);
    if (!saved) return false;

    clearRecordDirty(recordType, id);

    if (recordType === "vendor") setSelectedVendorId("");
    if (recordType === "work_order") setSelectedServiceId("");
    if (recordType === "procedure") setSelectedProcedureId("");
    if (recordType === "part") setSelectedPartId("");
    return true;
  }

  const showCalendarSave = calendarDirty;

  const holidayYears = useMemo(() => {
    const year = calendarCursor.getFullYear();
    return [year - 1, year, year + 1];
  }, [calendarCursor]);

  const usHolidayItems = useMemo(
    () => (showUsHolidays ? holidayYears.flatMap(getUsHolidays) : []),
    [showUsHolidays, holidayYears],
  );
  const jewishHolidayItems = useMemo(
    () => (showJewishHolidays ? holidayYears.flatMap(getJewishHolidays) : []),
    [showJewishHolidays, holidayYears],
  );

  const workOrderCalendarItems = useMemo(() => {
    const records = isSeanMarineUser ? staffVisibleServiceRecords : serviceRecords;
    const horizon = addDays(todayISO(), 366);

    return records
      .filter((record) => record.date)
      .flatMap((record) => {
        const hasCanonical4725ChoreCalendar =
          activePropertyId === "4725" &&
          calendarItems.some(
            (item) =>
              String(item.source || "").toLowerCase() === "home-chore" &&
              String(item.linkedId || "") === String(record.id || ""),
          );
        if (
          activePropertyId === "4725" &&
          String(record.responsibilityArea || "").trim().toLowerCase() === "family" &&
          hasCanonical4725ChoreCalendar
        ) {
          return [];
        }
        const baseDate = workOrderDateKey(record.date);
        if (!baseDate) return [];

        const occurrenceDates = [baseDate];
        if (record.recurring) {
          const schedule = recurringWorkOrderSchedule(record);
          let nextDate = baseDate;
          let occurrenceCount = 0;
          const maxOccurrences = activePropertyId === "4725" ? 400 : 60;

          while (occurrenceCount < maxOccurrences) {
            nextDate = nextRecurrenceDate(
              nextDate,
              schedule.interval,
              schedule.unit,
              record.recurrenceDays,
            );
            if (!nextDate || nextDate > horizon) break;
            if (record.recurrenceEndDate && nextDate > record.recurrenceEndDate) break;
            occurrenceDates.push(nextDate);
            occurrenceCount += 1;
          }
        }

        const homeChoreColor =
          activePropertyId === "4725"
            ? ({
                Nick: "green",
                Chelsea: "orange",
                Cooper: "blue",
                Leni: "pink",
                Family: "gray",
              } as Record<string, string>)[String(record.assignedTo || "Family")] || "gray"
            : "blue";

        return occurrenceDates.map((date, index) =>
          normalizeCalendar({
            id: index === 0
              ? `work-order-${record.id}`
              : `work-order-${record.id}-occurrence-${date}`,
            date,
            time: "",
            title: activePropertyId === "4725"
              ? `${String(record.emoji || record.workCategory || "").match(/^\S+/)?.[0] || "⭐"} ${record.title}`
              : `WO: ${record.title}`,
            area: activePropertyId === "4725"
              ? String(record.assignedTo || "Family")
              : "Work Order",
            categoryLabel: activePropertyId === "4725" ? "Chore" : "Work Order",
            colorId: activePropertyId === "4725" ? "home-chore" : "work-order",
            colorName: homeChoreColor as any,
            allDay: true,
            repeat: "None",
            reminder: "None",
            notes: [
              activePropertyId === "4725" && record.assignedTo ? `Assigned to: ${record.assignedTo}` : "",
              record.notes,
              record.season ? `Season: ${record.season}` : "",
              record.recurring ? `Repeats ${recurrenceLabel(record)}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            linkedType: "Work Order",
            linkedId: record.id,
            linkedName: record.title,
            completed: index === 0 && record.status === "Completed",
            source: "work-order",
          }),
        );
      });
  }, [serviceRecords, staffVisibleServiceRecords, isSeanMarineUser, activePropertyId, calendarItems]);

  const contactBirthdayItems = useMemo<CalendarItem[]>(() => {
    const year = calendarCursor.getFullYear();
    return contactRecords
      .filter((contact) => /^\d{4}-\d{2}-\d{2}$/.test(String(contact.birthday || "")))
      .map((contact) =>
        normalizeCalendar({
          id: `birthday-${contact.id}-${year}`,
          date: `${year}-${String(contact.birthday).slice(5)}`,
          title: `${contact.name} Birthday`,
          area: "Contacts",
          categoryLabel: "Birthday",
          colorName: "yellow",
          allDay: true,
          repeat: "Yearly",
          reminder: "Day before",
          notes: contact.organization
            ? `Contact: ${contact.organization}`
            : "Contact birthday",
          linkedType: "None",
          completed: false,
          source: "manual",
        }),
      );
  }, [contactRecords, calendarCursor]);

  const baseCalendarItems = useMemo(() => {
    const personalItems = calendarItems.filter((item) => {
      const source = String(item.source || "").toLowerCase();
      const linkedType = String(item.linkedType || "").toLowerCase();
      const is4725HomeChoreOccurrence =
        activePropertyId === "4725" &&
        (source === "home-chore-extra" || source === "home-chore");
      if (
        !is4725HomeChoreOccurrence &&
        (
          source === "task" ||
          source === "work-order" ||
          source === "workorder" ||
          source === "service" ||
          linkedType === "task" ||
          linkedType === "work order"
        )
      ) return false;
      const owner = String(item.calendarOwner || "").toLowerCase();
      if (isSeanMarineUser) return owner === "sean";
      return owner !== "sean";
    });

    return [
      ...personalItems,
      ...workOrderCalendarItems,
      ...usHolidayItems,
      ...(activePropertyId === "4725" ? [] : jewishHolidayItems),
    ];
  }, [
    calendarItems,
    workOrderCalendarItems,
    isSeanMarineUser,
    usHolidayItems,
    jewishHolidayItems,
    activePropertyId,
  ]);

  const visibleCalendarItems = useMemo(
    () =>
      baseCalendarItems.filter((item) =>
        isCategoryVisible(categoryForEvent(item)),
      ),
    [baseCalendarItems, calendarCategoryFilters, calendarColors],
  );

  const expandedCalendarItems = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const start = localISODate(new Date(year, month - 1, 1));
    const end = localISODate(new Date(year, month + 2, 0));
    const expanded = new Map<string, CalendarItem>();

    const occurrenceOverrides = new Map<string, CalendarItem>();
    visibleCalendarItems.forEach((item) => {
      const originalId = String(item.originalId || "");
      const instanceId = String(item.instanceId || "");
      if (originalId && instanceId) {
        occurrenceOverrides.set(instanceId, item);
      }
    });

    visibleCalendarItems.forEach((item) => {
      const originalId = String(item.originalId || "");
      const instanceId = String(item.instanceId || "");

      if (originalId && instanceId) {
        expanded.set(instanceId, item);
        return;
      }

      if (!item.repeat || item.repeat === "None") {
        expanded.set(String(item.instanceId || item.id), item);
        return;
      }

      const date = calendarDateValue(start);
      const finalDate = calendarDateValue(end);
      while (date <= finalDate) {
        const dateKey = localISODate(date);
        if (isRecurringInstanceOnDate(item, dateKey)) {
          const generatedInstanceId = `${item.id}-${dateKey}`;
          const savedOccurrence = occurrenceOverrides.get(generatedInstanceId);
          if (savedOccurrence?.status === "Cancelled") {
            date.setDate(date.getDate() + 1);
            continue;
          }

          expanded.set(
            generatedInstanceId,
            savedOccurrence || {
              ...item,
              date: dateKey,
              originalId: item.id,
              instanceId: generatedInstanceId,
            },
          );
        }
        date.setDate(date.getDate() + 1);
      }
    });

    return Array.from(expanded.values());
  }, [visibleCalendarItems, calendarCursor]);

  const seanVisibleCalendarItems = useMemo(() => {
    if (!isSeanMarineUser || seanCalendarPropertyFilter === "all") {
      return expande…142152 tokens truncated…hicle.lastCleaned
                      ? "No history"
                      : nextCleaning < todayISO()
                        ? "Overdue"
                        : nextCleaning === todayISO()
                          ? "Due today"
                          : "On schedule";
                    const cleaningHistory = (vehicle.history || [])
                      .filter((entry) => entry.type === "Cleaned")
                      .sort((a, b) =>
                        String(b.date || "").localeCompare(
                          String(a.date || ""),
                        ),
                      );
                    return (
                      <div
                        key={vehicle.id}
                        style={{
                          border: `1px solid ${colors.line}`,
                          borderRadius: 12,
                          background: "#FFFFFF",
                          padding: 10,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <strong style={{ color: colors.navy }}>
                            {vehicle.name}
                          </strong>
                          <span style={badgeStyle(cleaningStatus)}>
                            {cleaningStatus}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(2, minmax(0, 1fr))",
                            gap: 7,
                          }}
                        >
                          <div style={recordInfoItemStyle}>
                            <span style={fieldLabelStyle}>Last cleaned</span>
                            <strong>
                              {vehicle.lastCleaned
                                ? formatDate(vehicle.lastCleaned)
                                : "Not recorded"}
                            </strong>
                          </div>
                          <div style={recordInfoItemStyle}>
                            <span style={fieldLabelStyle}>Next cleaning</span>
                            <strong>{nextCleaning ? formatDate(nextCleaning) : "Not scheduled"}</strong>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {cleaningHistory.length ? (
                            <details>
                              <summary
                                style={{
                                  color: colors.navy,
                                  fontSize: 11,
                                  fontWeight: 850,
                                  cursor: "pointer",
                                }}
                              >
                                Cleaning history ({cleaningHistory.length})
                              </summary>
                              <div
                                style={{
                                  display: "grid",
                                  gap: 3,
                                  marginTop: 6,
                                }}
                              >
                                {cleaningHistory.slice(0, 8).map((entry) => (
                                  <span key={entry.id} style={mutedSmallStyle}>
                                    {formatDate(String(entry.date || "").slice(0, 10))}
                                  </span>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <span style={mutedSmallStyle}>No cleaning history</span>
                          )}
                          <button
                            type="button"
                            onClick={() => markVehicleCleaned(vehicle)}
                            style={smallSubtleButtonStyle}
                          >
                            Mark Cleaned
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={centerCardStyle}>
                <strong style={{ color: colors.navy, fontSize: 16 }}>
                  Car Work Orders
                </strong>
                <div style={{ display: "grid", gap: 8 }}>
                  {sortedCarWork.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setDepartmentCenter("");
                        openWorkOrderById(record.id);
                      }}
                      style={{
                        ...compactLinkedRowStyle,
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      <span>
                        <strong>{record.title || "Untitled work order"}</strong>
                        <small style={mutedSmallStyle}>
                          {record.date ? formatDate(record.date) : "No due date"}
                        </small>
                      </span>
                      <span style={badgeStyle(record.status || "Open")}>
                        {record.status || "Open"}
                      </span>
                    </button>
                  ))}
                  {!sortedCarWork.length ? (
                    <div style={noticeStyle}>No car work orders.</div>
                  ) : null}
                </div>
              </div>


            </div>
          </div>
        </section>
      );
    }

    if (isMarine) {
      const sortedMarineAssets = [...departmentAssets].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const sortedMarineWork = [...departmentWork].sort((a, b) =>
        String(a.date || "9999-12-31").localeCompare(
          String(b.date || "9999-12-31"),
        ),
      );
      const sortedMarineTasks: WorkPlanTask[] = [];

      return (
        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => addDashboardWorkOrder("Dock & Waterfront")}
              style={goldButtonStyle}
            >
              New Marine Work Order
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(270px, 32%) minmax(0, 68%)",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={centerCardStyle}>
              <strong style={{ color: colors.navy, fontSize: 16 }}>
                Dock & Marine Assets
              </strong>
              <div style={{ display: "grid", gap: 8 }}>
                {sortedMarineAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => openAssetById(asset.id)}
                    style={{
                      ...compactLinkedRowStyle,
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <strong>{asset.name}</strong>
                      <small style={mutedSmallStyle}>
                        {asset.category || "Marine asset"}
                      </small>
                    </span>
                    <span style={badgeStyle(asset.status || "Active")}>
                      {asset.status || "Active"}
                    </span>
                  </button>
                ))}
                {!sortedMarineAssets.length ? (
                  <div style={noticeStyle}>No Dock or Marine assets.</div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={centerCardStyle}>
                <strong style={{ color: colors.navy, fontSize: 16 }}>
                  Dock & Marine Work Orders
                </strong>
                <div style={{ display: "grid", gap: 8 }}>
                  {sortedMarineWork.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setDepartmentCenter("");
                        openWorkOrderById(record.id);
                      }}
                      style={{
                        ...compactLinkedRowStyle,
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      <span>
                        <strong>{record.title || "Untitled work order"}</strong>
                        <small style={mutedSmallStyle}>
                          {record.date ? formatDate(record.date) : "No due date"}
                        </small>
                      </span>
                      <span style={badgeStyle(record.status || "Open")}>
                        {record.status || "Open"}
                      </span>
                    </button>
                  ))}
                  {!sortedMarineWork.length ? (
                    <div style={noticeStyle}>No Dock or Marine work orders.</div>
                  ) : null}
                </div>
              </div>

              <div style={centerCardStyle}>
                <strong style={{ color: colors.navy, fontSize: 16 }}>
                  Dock & Marine Vendors
                </strong>
                <div style={{ display: "grid", gap: 8 }}>
                  {departmentVendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => {
                        setSelectedVendorId(vendor.id);
                        openCenter("vendors");
                      }}
                      style={{
                        ...compactLinkedRowStyle,
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      <span>
                        <strong>{vendor.name || "Unnamed vendor"}</strong>
                        <small style={mutedSmallStyle}>
                          {vendor.category || "Dock & Marine"}
                          {vendor.phone ? ` · ${vendor.phone}` : ""}
                        </small>
                      </span>
                      <span style={badgeStyle("Vendor")}>Open</span>
                    </button>
                  ))}
                  {!departmentVendors.length ? (
                    <div style={noticeStyle}>No Dock or Marine vendors.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section style={{ display: "grid", gap: 18 }}>
        <div style={{ ...centerCardStyle, background: "linear-gradient(135deg, #0A2D52 0%, #123F70 100%)", color: "#FFFFFF", borderColor: "rgba(255,255,255,.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#E8C86A" }}>{icon} Department Center</div>
              <h2 style={{ margin: "6px 0 8px", fontSize: isMobile ? 27 : 34 }}>{title}</h2>
              <p style={{ margin: 0, maxWidth: 760, color: "rgba(255,255,255,.78)", lineHeight: 1.55 }}>
                {config.detail}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => { setQuickCaptureMode("create"); setQuickCaptureOpen(true); }} style={{ ...goldButtonStyle, color: colors.navy }}>+ Add</button><button type="button" onClick={() => addDashboardWorkOrder(config.title)} style={{ ...secondaryButtonStyle, background: "rgba(255,255,255,.1)", color: "#FFFFFF", borderColor: "rgba(255,255,255,.35)" }}>New Work Order</button></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))", gap: 12 }}>
          {([
            { label: "Open Work", value: openWork.length, target: "open" },
            { label: "Completed", value: completedWork.length, target: "completed" },
            { label: "Assets / Areas", value: departmentAssets.length + departmentLocations.length, target: "assets" },
            { label: "Requests", value: departmentRequests.length, target: "requests" },
            { label: "Vendors", value: departmentVendors.length, target: "vendors" },
          ] satisfies Array<{
            label: string;
            value: number;
            target: "open" | "completed" | "assets" | "requests" | "vendors" | "documents" | "procedures";
          }>).map(({ label, value, target }) => (
            <button key={label} type="button" onClick={() => openDepartmentDrilldown(target)} style={{ ...metricStyle, textAlign: "left", cursor: "pointer" }}>
              <span style={{ color: colors.muted, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
              <strong style={{ color: colors.navy, fontSize: 30 }}>{value}</strong>
            </button>
          ))}
        </div>

        {departmentDrilldown ? (
          <div id="atlas-department-record-list" style={{ ...centerCardStyle, scrollMarginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <SectionHeader eyebrow={`${icon} Department records`} title={drilldownTitle} detail="These are the exact records included in the number you selected." />
              <button type="button" onClick={() => setDepartmentDrilldown("")} style={secondaryButtonStyle}>Close List</button>
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {departmentDrilldown === "open" ? openWork.map((record) => (
                <button key={record.id} type="button" onClick={() => { setDepartmentCenter(""); setDepartmentDrilldown(""); openWorkOrderById(record.id); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                  <span><strong>{record.title || "Untitled work order"}</strong><small style={mutedSmallStyle}>{record.assignedTo || "Unassigned"} · {record.date ? formatDate(record.date) : "No due date"}</small></span>
                  <span style={badgeStyle(record.status || "Open")}>{record.status || "Open"}</span>
                </button>
              )) : null}
              {departmentDrilldown === "completed" ? completedWork.map((record) => (
                <button key={record.id} type="button" onClick={() => { setDepartmentCenter(""); setDepartmentDrilldown(""); openWorkOrderById(record.id); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                  <span><strong>{record.title || "Untitled work order"}</strong><small style={mutedSmallStyle}>{record.lastCompletedDate ? formatDate(record.lastCompletedDate) : record.date ? formatDate(record.date) : "Completed"}</small></span>
                  <span style={badgeStyle("Completed")}>Completed</span>
                </button>
              )) : null}
              {departmentDrilldown === "assets" ? (
                <>
                  {departmentAssets.map((asset) => (
                    <button key={`asset-${asset.id}`} type="button" onClick={() => openAssetById(asset.id)} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                      <span><strong>{asset.name || "Unnamed asset"}</strong><small style={mutedSmallStyle}>{asset.category || "Marine asset"}</small></span>
                      <span style={badgeStyle(asset.status || "Active")}>{asset.status || "Active"}</span>
                    </button>
                  ))}
                  {departmentLocations.map((location) => (
                    <button key={`location-${location.id}`} type="button" onClick={() => { setSelectedLocationId(location.id); openCenter("locations"); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                      <span><strong>{location.name || "Unnamed location"}</strong><small style={mutedSmallStyle}>{location.type || "Location"}</small></span>
                      <span style={badgeStyle("Location")}>Location</span>
                    </button>
                  ))}
                </>
              ) : null}
              {departmentDrilldown === "requests" ? departmentRequests.map((request) => (
                <button key={request.id} type="button" onClick={() => { setSelectedRequestId(request.id); openCenter("requests"); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                  <span><strong>{request.title || "Untitled request"}</strong><small style={mutedSmallStyle}>{request.requesterName || "Request"}</small></span>
                  <span style={badgeStyle(request.status || "New")}>{request.status || "New"}</span>
                </button>
              )) : null}
              {departmentDrilldown === "vendors" ? departmentVendors.map((vendor) => (
                <button key={vendor.id} type="button" onClick={() => { setSelectedVendorId(vendor.id); openCenter("vendors"); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                  <span><strong>{vendor.name || "Unnamed vendor"}</strong><small style={mutedSmallStyle}>{vendor.category || "Department vendor"}</small></span>
                  <span style={badgeStyle("Vendor")}>Vendor</span>
                </button>
              )) : null}
              {departmentDrilldown === "documents" ? departmentDocuments.map((document) => (
                <button key={document.id} type="button" onClick={() => { setSelectedDocumentId(document.id); openCenter("documents"); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                  <span><strong>{document.title || "Untitled document"}</strong><small style={mutedSmallStyle}>{document.type || document.targetType || "Document / photo"}</small></span>
                  <span style={badgeStyle("Document")}>Open</span>
                </button>
              )) : null}
              {departmentDrilldown === "procedures" ? departmentProcedures.map((procedure) => (
                <button key={procedure.id} type="button" onClick={() => { setSelectedProcedureId(procedure.id); openCenter("procedures"); }} style={{ ...compactLinkedRowStyle, width: "100%", cursor: "pointer" }}>
                  <span><strong>{procedure.title || "Untitled procedure"}</strong><small style={mutedSmallStyle}>{procedure.category || procedure.area || "Procedure"}</small></span>
                  <span style={badgeStyle(procedure.status || "Procedure")}>{procedure.status || "Procedure"}</span>
                </button>
              )) : null}
              {((departmentDrilldown === "open" && !openWork.length) ||
                (departmentDrilldown === "completed" && !completedWork.length) ||
                (departmentDrilldown === "assets" && !(departmentAssets.length + departmentLocations.length)) ||
                (departmentDrilldown === "requests" && !departmentRequests.length) ||
                (departmentDrilldown === "vendors" && !departmentVendors.length) ||
                (departmentDrilldown === "documents" && !departmentDocuments.length) ||
                (departmentDrilldown === "procedures" && !departmentProcedures.length)) ? (
                <div style={noticeStyle}>No matching department records are currently saved.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.35fr .65fr", gap: 16, alignItems: "start" }}>
          <div style={centerCardStyle}>
            <SectionHeader eyebrow="Current operations" title={`${config.short} Work`} detail={`${openWork.length} open item${openWork.length === 1 ? "" : "s"}.`} />
            <div style={{ display: "grid", gap: 10 }}>
              {openWork.slice(0, 8).map((item) => (
                <button key={item.id} type="button" onClick={() => { setDepartmentCenter(""); setDepartmentDrilldown(""); openWorkOrderById(item.id); }} style={{ width: "100%", border: `1px solid ${colors.line}`, borderRadius: 12, background: "#FFFFFF", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", cursor: "pointer" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: colors.navy }}>{item.title || "Untitled work order"}</strong>
                    <span style={{ color: colors.muted, fontSize: 12 }}>{item.assignedTo || "Unassigned"} · {item.date ? formatDate(item.date) : "No due date"}</span>
                  </div>
                  <span style={{ whiteSpace: "nowrap", borderRadius: 999, padding: "5px 9px", background: colors.panel, color: colors.navy, fontSize: 11, fontWeight: 900 }}>{item.status || "Open"}</span>
                </button>
              ))}
              {!openWork.length ? <div style={noticeStyle}>No open {config.short.toLowerCase()} work.</div> : null}
            </div>
            <button type="button" onClick={() => openDepartmentDrilldown("open")} style={secondaryButtonStyle}>Open All Work Orders</button>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={centerCardStyle}>
              <SectionHeader eyebrow="People" title="Assigned Work" detail="Open Team for assignments and progress." />
              {assignedNames.map((name) => <div key={name} style={{ padding: 12, borderRadius: 12, background: colors.panel, fontWeight: 900, color: colors.navy }}>{name}</div>)}
              <button type="button" onClick={() => openCenter("team")} style={secondaryButtonStyle}>Open Team Center</button>
            </div>
            <div style={centerCardStyle}>
              <SectionHeader eyebrow="Knowledge" title="Department Records" detail="Existing Atlas records, filtered into this department view." />
              <div style={{ display: "grid", gap: 8 }}>
                <button type="button" onClick={() => openDepartmentDrilldown("documents")} style={secondaryButtonStyle}>Documents ({departmentDocuments.length})</button>
                <button type="button" onClick={() => openDepartmentDrilldown("procedures")} style={secondaryButtonStyle}>Procedures ({departmentProcedures.length})</button>
                <button type="button" onClick={() => openDepartmentDrilldown("vendors")} style={secondaryButtonStyle}>Vendors ({departmentVendors.length})</button>
                <button type="button" onClick={() => openCenter("map")} style={secondaryButtonStyle}>Open Property Map</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {[
            { title: "Areas & Assets", count: departmentAssets.length + departmentLocations.length, target: "assets" as const, detail: `Linked ${config.short.toLowerCase()} assets and locations.` },
            { title: "Requests & Follow-up", count: departmentRequests.length, target: "requests" as const, detail: "Submitted requests and department follow-up work." },
            { title: "History & Records", count: completedWork.length, target: "completed" as const, detail: "Completed work and service history already stored in Atlas." },
          ].map((card) => (
            <button key={card.title} type="button" onClick={() => openDepartmentDrilldown(card.target)} style={{ ...centerCardStyle, textAlign: "left", cursor: "pointer" }}>
              <span style={{ fontSize: 28 }}>{card.count}</span>
              <strong style={{ color: colors.navy, fontSize: 18 }}>{card.title}</strong>
              <span style={{ color: colors.muted, lineHeight: 1.45 }}>{card.detail}</span>
            </button>
          ))}
        </div>
        {isLandscape ? <section style={centerCardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}><div><div style={eyebrowStyle}>Tuesday Crew Visit</div><h3 style={{ margin: "4px 0", color: colors.navy }}>Lanken Landscaping · Half Day</h3><small style={mutedSmallStyle}>Coordinated by Pat · one recurring visit with related jobs kept underneath it</small></div><span style={badgeStyle("Scheduled")}>Weekly</span></div><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}><div style={recordInfoItemStyle}><small style={fieldLabelStyle}>CURRENT AREA</small><strong>Waterside bed</strong></div><div style={recordInfoItemStyle}><small style={fieldLabelStyle}>PROGRESS</small><strong>Grass removed · cleaned</strong></div><div style={recordInfoItemStyle}><small style={fieldLabelStyle}>NOW</small><strong>Mulching</strong></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => openCenter("calendar")} style={secondaryButtonStyle}>Open Crew Visit</button><button type="button" onClick={() => addDashboardWorkOrder("Landscaping & Irrigation")} style={goldButtonStyle}>Create Follow-up</button><button type="button" onClick={() => { resetIntakeDraft(); applyFastIntakeKind("General Photo"); setScreen("intake"); }} style={secondaryButtonStyle}>Add Before / After Photos</button></div></section> : null}
      </section>
    );
  }

  function renderScreen() {
    let content: React.ReactNode;

    if (isAddisonUser) {
      content = renderAddisonToday();
    } else if (activePropertyId === "4725" && screen === "dashboard") {
      content = (
        <AtlasHomeWorkspace
          isMobile={isMobile}
          colors={colors}
          choreRecords={serviceRecords}
          onCreateChore={addWorkOrder}
          onOpenChore={(id) => {
            setSelectedServiceId(id);
            setWorkOrdersOpenKey((current) => current + 1);
            setScreen("history");
          }}
          onCompleteChore={completeWorkOrder}
        />
      );
    } else if (departmentCenter) content = renderDepartmentCenter(departmentCenter);
    else if (screen === "dashboard") content = renderDashboard();
    else if (screen === "portfolio") content = renderPortfolio();
    else if (screen === "timeline")
      content = renderTimelineOrInsights("timeline");
    else if (screen === "insights")
      content = renderTimelineOrInsights("insights");
    else if (screen === "planner") content = renderWorkPlanner();
    else if (screen === "notes") content = renderNotes();
    else if (screen === "map") content = renderMap();
    else if (screen === "locations") content = renderLocations();
    else if (screen === "assets") content = renderAssets();
    else if (screen === "history") content = renderWorkOrders();
    else if (screen === "requests") content = renderRequests();
    else if (screen === "vendors") content = renderVendors();
    else if (screen === "contacts") content = renderContacts();
    else if (screen === "calendar") content = renderCalendar();
    else if (screen === "weather") content = renderWeather();
    else if (screen === "documents") content = renderDocuments();
    else if (screen === "manuals") content = renderManuals();
    else if (screen === "intake") content = renderIntake();
    else if (screen === "inbox") content = renderInbox();
    else if (screen === "procedures") content = renderProcedures();
    else if (screen === "routines") content = renderRoutines();
    else if (screen === "team") content = renderTeamWork();
    else if (screen === "parts") content = renderParts();
    else if (screen === "links") content = renderWorkLinks();
    else if (screen === "qr") content = renderQRCodes();
    else if (screen === "scan") content = renderQRScanner();
    else if (screen === "ownerReport") content = renderOwnerReport();
    else if (screen === "reports") content = renderReportsAccess();
    else content = renderAssistant();

    // Calendar already has its own navy shell. Every other section uses the
    // shared navy Atlas backdrop, including Weather and Map.
    if (screen === "calendar") {
      return content;
    }

    return (
      <div style={sectionNavyBackdropStyle}>
        {content}
      </div>
    );
  }

  if (!teamAccessResolved) {
    return (
      <main className="atlas-app-shell" style={isMobile ? appStyle : desktopAppStyle}>
        <section style={{ maxWidth: 560, margin: "12vh auto", padding: 22, border: `1px solid ${colors.line}`, borderRadius: 18, background: "#FFFFFF" }}>
          <div style={eyebrowStyle}>Atlas</div>
          <h2 style={{ margin: "5px 0", color: colors.navy }}>Loading your work view…</h2>
          <p style={{ margin: 0, color: colors.muted }}>Checking account access before showing property information.</p>
        </section>
      </main>
    );
  }

  if (teamAccessError) {
    return (
      <main className="atlas-app-shell" style={isMobile ? appStyle : desktopAppStyle}>
        <section style={{ maxWidth: 560, margin: "12vh auto", padding: 22, border: `1px solid ${colors.line}`, borderRadius: 18, background: "#FFFFFF" }}>
          <div style={eyebrowStyle}>Access Check</div>
          <h2 style={{ margin: "5px 0", color: colors.navy }}>Could not verify this account</h2>
          <p style={{ color: colors.muted }}>{teamAccessError}</p>
          <button type="button" onClick={() => window.location.reload()} style={goldButtonStyle}>Refresh</button>
        </section>
      </main>
    );
  }

  return (
    <main className="atlas-app-shell" style={isMobile ? appStyle : desktopAppStyle}>
      {taskUndo ? <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 12050, display: "flex", gap: 8, alignItems: "center", background: colors.navy, color: "#FFFFFF", borderRadius: 11, padding: "8px 10px", boxShadow: "0 8px 24px rgba(15,23,42,.18)" }}><span style={{ fontSize: 12, fontWeight: 800 }}>Deleted {taskUndo.task.title}</span><button type="button" onClick={restoreDeletedTask} style={{ ...compactUtilityButtonStyle, background: "#FFFFFF" }}>Undo</button></div> : null}
      <button
        type="button"
        aria-label="Quick capture"
        title="Quick Capture"
        onClick={() => { setQuickCreateKind(""); setQuickCreateName(""); setQuickCreateAssignee("Nick"); setQuickCaptureOpen(true); }}
        className="atlas-quick-capture-button"
      >
        +
      </button>
      {quickCaptureOpen ? (
        <div className="atlas-quick-capture-backdrop" onMouseDown={() => { setQuickCaptureOpen(false); setQuickCreateKind(""); setQuickCreateName(""); setQuickCreateAssignee("Nick"); }}>
          <section className="atlas-quick-capture-panel" onMouseDown={(event) => event.stopPropagation()} aria-label="Quick Capture">
            <div className="atlas-quick-capture-header">
              <div>
                <strong>{quickCreateKind ? `New ${quickCreateLabel(quickCreateKind)}` : "Quick Capture"}</strong>
                <small>{quickCreateKind ? "Name it first. The full editor opens after saving." : "Save it now. Organize it where it belongs."}</small>
              </div>
              <button type="button" onClick={() => { setQuickCaptureOpen(false); setQuickCreateKind(""); setQuickCreateName(""); setQuickCreateAssignee("Nick"); }} style={mapIconButtonStyle}>{closeSymbol}</button>
            </div>
            {quickCreateKind ? (
              <form onSubmit={(event) => { event.preventDefault(); saveQuickCreate(); }} style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}><span style={fieldLabelStyle}>NAME</span><input autoFocus value={quickCreateName} onChange={(event) => setQuickCreateName(event.currentTarget.value)} placeholder={`${quickCreateLabel(quickCreateKind)} name`} style={{ ...inputStyle, minHeight: 48, fontSize: 16 }} /></label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => { setQuickCreateKind(""); setQuickCreateName(""); setQuickCreateAssignee("Nick"); }} style={secondaryButtonStyle}>Back</button><button type="submit" disabled={!quickCreateName.trim()} style={goldButtonStyle}>Save & Continue</button></div>
              </form>
            ) : <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: 4, borderRadius: 12, background: "#EEF3F7" }}>
                <button type="button" onClick={() => setQuickCaptureMode("create")} style={{ ...(quickCaptureMode === "create" ? goldButtonStyle : secondaryButtonStyle), minHeight: 38 }}>Create New</button>
                <button type="button" onClick={() => setQuickCaptureMode("existing")} style={{ ...(quickCaptureMode === "existing" ? goldButtonStyle : secondaryButtonStyle), minHeight: 38 }}>Add Existing</button>
              </div>
              <div className="atlas-quick-capture-actions">
                <button type="button" onClick={() => openQuickCapture("photo")}><span>📷</span>{quickCaptureMode === "create" ? "New Photo" : "Existing Photo"}</button>
                <button type="button" onClick={() => openQuickCapture("document")}><span>📄</span>{quickCaptureMode === "create" ? "New Document" : "Existing Document"}</button>
                <button type="button" onClick={() => openQuickCapture("work-order")}><span>🔧</span>{quickCaptureMode === "create" ? "New Work" : "Existing Work"}</button>
                <button type="button" onClick={() => openQuickCapture("project")}><span>▣</span>{quickCaptureMode === "create" ? "New Project" : "Existing Project"}</button>
                <button type="button" onClick={() => openQuickCapture("asset")}><span>◇</span>{quickCaptureMode === "create" ? "New Asset" : "Existing Asset"}</button>
                <button type="button" onClick={() => openQuickCapture("vendor")}><span>V</span>{quickCaptureMode === "create" ? "New Vendor" : "Existing Vendor"}</button>
                <button type="button" onClick={() => openQuickCapture("procedure")}><span>☷</span>{quickCaptureMode === "create" ? "New Procedure" : "Existing Procedure"}</button>
                <button type="button" className="atlas-talk-action" onClick={() => { setQuickCaptureOpen(false); startVoiceAssistant(); }}><span>✦</span>Ask Atlas</button>
              </div>
              <label className="atlas-quick-note-box">
                <span>Quick note</span>
                <textarea value={quickCaptureNote} onChange={(event) => setQuickCaptureNote(event.currentTarget.value)} placeholder="What happened or what should not be forgotten?" />
              </label>
              <button type="button" onClick={saveQuickCaptureNote} disabled={!quickCaptureNote.trim()} style={goldButtonStyle}>Save Note</button>
            </>}
          </section>
        </div>
      ) : null}
      {ownerUpdateOpen ? (
        <div className="atlas-quick-capture-backdrop" onMouseDown={() => setOwnerUpdateOpen(false)}>
          <section className="atlas-quick-capture-panel" style={{ width: "min(760px,100%)", maxHeight: "88vh" }} onMouseDown={(event) => event.stopPropagation()} aria-label="Weekly Owner Update">
            <div className="atlas-quick-capture-header"><div><strong>Weekly Owner Update</strong><small>Generated from this week’s Atlas records. Routine clutter is excluded.</small></div><button type="button" onClick={() => setOwnerUpdateOpen(false)} style={mapIconButtonStyle}>{closeSymbol}</button></div>
            <textarea value={ownerUpdateDraft} onChange={(event) => setOwnerUpdateDraft(event.currentTarget.value)} style={{ ...inputStyle, minHeight: isMobile ? 430 : 520, maxHeight: "65vh", resize: "vertical", whiteSpace: "pre-wrap", lineHeight: 1.5 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => setOwnerUpdateOpen(false)} style={secondaryButtonStyle}>Cancel</button><button type="button" onClick={approveWeeklyOwnerUpdate} style={goldButtonStyle}>Approve & Save</button></div>
          </section>
        </div>
      ) : null}
      {showPropertyLoading && syncState === "loading" ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(8, 29, 55, 0.38)",
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              borderRadius: 20,
              border: `1px solid ${colors.line}`,
              background: "#FFFFFF",
              boxShadow: "0 24px 70px rgba(8, 29, 55, 0.28)",
              padding: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AtlasMiniMark size={38} />
              <div>
                <strong
                  style={{
                    display: "block",
                    color: colors.navy,
                    fontSize: 18,
                    lineHeight: 1.2,
                  }}
                >
                  Loading{" "}
                  {atlasProperties.find(
                    (property) => property.id === activePropertyId,
                  )?.name || activePropertyId}
                </strong>
                <span style={mutedSmallStyle}>
                  Updating this property’s dashboard, assets, calendar, and records.
                </span>
              </div>
            </div>
            <div
              style={{
                height: 6,
                marginTop: 16,
                overflow: "hidden",
                borderRadius: 999,
                background: "#E8EDF4",
              }}
            >
              <div
                style={{
                  width: "62%",
                  height: "100%",
                  borderRadius: 999,
                  background: colors.gold,
                  animation: "atlasPropertyLoading 1.1s ease-in-out infinite alternate",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      <style>{`
        html, body {
          max-width: 100%;
          overflow-x: clip;
        }
        * {
          box-sizing: border-box;
        }
        html {
          scrollbar-color: #9FB0BF #EEF2F5;
          scrollbar-width: thin;
        }
        body {
          background: #EEF2F5;
          color: #17354D;
          font-family: Inter, "Aptos", "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        .atlas-app-shell {
          font-size: 15px;
          line-height: 1.5;
        }
        .atlas-app-shell h1 {
          font-size: clamp(28px, 3vw, 34px) !important;
          line-height: 1.12 !important;
          letter-spacing: -0.035em !important;
          font-weight: 800 !important;
        }
        .atlas-app-shell h2 {
          font-size: clamp(20px, 2vw, 24px);
          line-height: 1.2;
          letter-spacing: -0.02em;
          font-weight: 800;
        }
        .atlas-app-shell h3 {
          font-size: 18px;
          line-height: 1.25;
          font-weight: 750;
        }
        .atlas-app-shell p {
          line-height: 1.55;
        }
        .atlas-app-shell small {
          font-size: 13px;
          line-height: 1.4;
        }
        button, input, select, textarea {
          font: inherit;
        }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 3px solid rgba(201,154,61,0.24) !important;
          outline-offset: 1px;
          border-color: #C99A3D !important;
        }
        .atlas-app-shell {
          background: #EEF2F5 !important;
        }
        .atlas-app-shell main {
          background: transparent;
        }
        .atlas-app-shell section {
          scroll-margin-top: 18px;
        }
        .atlas-page-header {
          border-radius: 0 0 16px 16px;
          box-shadow: 0 10px 26px rgba(7,27,47,0.12);
          overflow: hidden;
        }
        .atlas-page-header button {
          min-height: 40px;
        }
        .atlas-app-shell button {
          -webkit-tap-highlight-color: transparent;
        }
        .atlas-app-shell button:active {
          transform: translateY(1px);
          box-shadow: none !important;
        }
        .atlas-app-shell button:disabled {
          cursor: not-allowed !important;
          opacity: 0.5;
          box-shadow: none !important;
        }
        .atlas-app-shell [style*="border-top: 4px solid #C99A3D"],
        .atlas-app-shell [style*="border-top:4px solid #C99A3D"] {
          border-top-color: transparent !important;
        }
        .atlas-page-header + * {
          margin-top: 10px;
        }
        .atlas-brief-strip {
          border-left: 4px solid #C99A3D !important;
          border-radius: 10px !important;
          box-shadow: none !important;
          background: #FFFFFF !important;
        }
        .atlas-today-primary {
          border-top: 4px solid #173B59 !important;
          box-shadow: 0 10px 30px rgba(15,35,55,0.08) !important;
        }
        .atlas-visual-hero {
          border-radius: 16px !important;
          box-shadow: 0 14px 34px rgba(8,29,48,0.18) !important;
        }
        .atlas-app-shell details {
          box-shadow: none !important;
        }
        .atlas-app-shell summary {
          list-style-position: outside;
        }
        .atlas-app-shell button {
          transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
        }
        .atlas-app-shell button:hover {
          border-color: #9FB0BF !important;
          box-shadow: 0 3px 10px rgba(15,35,55,0.07);
        }
        .atlas-sidebar-nav-button:hover {
          background: rgba(255,255,255,.08) !important;
          border-color: rgba(255,255,255,.14) !important;
          box-shadow: none !important;
        }
        .atlas-app-shell input:hover, .atlas-app-shell select:hover, .atlas-app-shell textarea:hover {
          border-color: #9FB0BF !important;
        }
        .atlas-app-shell ::-webkit-scrollbar {
          width: 9px;
          height: 9px;
        }
        .atlas-app-shell ::-webkit-scrollbar-track {
          background: #EEF2F5;
          border-radius: 999px;
        }
        .atlas-app-shell ::-webkit-scrollbar-thumb {
          background: #A9B7C3;
          border: 2px solid #EEF2F5;
          border-radius: 999px;
        }
        .atlas-app-shell ::-webkit-scrollbar-thumb:hover {
          background: #7F94A4;
        }
        .atlas-app-shell h1,
        .atlas-app-shell h2,
        .atlas-app-shell h3,
        .atlas-app-shell h4,
        .atlas-app-shell strong,
        .atlas-app-shell span,
        .atlas-app-shell p,
        .atlas-app-shell button,
        .atlas-app-shell label {
          word-break: normal !important;
          overflow-wrap: break-word;
          writing-mode: horizontal-tb !important;
        }
        .atlas-app-shell input,
        .atlas-app-shell select {
          min-height: 36px !important;
        }
        .atlas-app-shell textarea {
          min-height: 72px !important;
          max-height: 150px;
        }
        .atlas-app-shell select {
          text-overflow: ellipsis;
        }
        .atlas-app-shell input,
        .atlas-app-shell select,
        .atlas-app-shell textarea {
          font-size: 15px !important;
          line-height: 1.4 !important;
          font-weight: 500 !important;
        }
        .atlas-app-shell button {
          font-size: max(13px, 0.82rem);
          line-height: 1.2;
        }
        .atlas-app-shell label {
          line-height: 1.35;
        }
        @media (max-width: 760px) {
          .atlas-app-shell {
            font-size: 16px;
          }
          .atlas-app-shell small {
            font-size: 13px;
          }
          .atlas-app-shell input,
          .atlas-app-shell select,
          .atlas-app-shell textarea {
            font-size: 16px !important;
          }
          .atlas-page-header {
            border-radius: 0 0 12px 12px;
          }
          .atlas-today-primary {
            border-top-width: 3px !important;
          }
          .atlas-app-shell button {
            min-height: 40px;
            word-break: keep-all !important;
            overflow-wrap: normal !important;
          }
        }
        .atlas-app-shell [data-atlas-record-list] {
          gap: 6px !important;
        }
        .atlas-app-shell [data-atlas-record-list] > * {
          padding-top: 9px !important;
          padding-bottom: 9px !important;
        }
        .atlas-app-shell .atlas-record-detail,
        .atlas-app-shell [data-atlas-detail-panel] {
          position: sticky;
          top: 10px;
          align-self: start;
          max-height: calc(100vh - 22px);
          overflow: auto;
        }
        .atlas-record-list-panel {
          min-width: 0;
        }
        .atlas-record-list-panel > div {
          gap: 6px !important;
        }
        .atlas-record-list-panel button {
          min-height: 0 !important;
        }
        .atlas-record-list-panel button:not([aria-label]) {
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .atlas-record-detail {
          padding: 0 !important;
          border-radius: 14px !important;
          border-color: #CDD7E1 !important;
          background: #FFFFFF !important;
          box-shadow: 0 8px 24px rgba(15,35,55,0.07);
          scrollbar-gutter: stable;
        }
        .atlas-record-detail-content {
          min-width: 0;
          padding: 12px;
        }
        .atlas-record-detail-content > :first-child {
          margin-top: 0 !important;
        }
        .atlas-record-detail-content > section,
        .atlas-record-detail-content > div {
          min-width: 0;
        }
        .atlas-record-detail-content h1,
        .atlas-record-detail-content h2,
        .atlas-record-detail-content h3 {
          margin-top: 0;
          line-height: 1.15 !important;
        }
        .atlas-record-detail-content label {
          gap: 4px !important;
        }
        .atlas-record-detail-content input,
        .atlas-record-detail-content select {
          min-height: 36px !important;
          padding-top: 7px !important;
          padding-bottom: 7px !important;
        }
        .atlas-record-detail-content textarea {
          min-height: 64px !important;
        }
        .atlas-record-detail-content button {
          min-height: 34px;
        }
        .atlas-record-detail-content details > summary {
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .atlas-record-section-nav {
          position: sticky;
          top: -12px;
          z-index: 8;
          display: flex;
          gap: 5px;
          overflow-x: auto;
          margin: -12px -12px 10px;
          padding: 8px 12px;
          border-bottom: 1px solid #D8E0E8;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(8px);
          scrollbar-width: none;
        }
        .atlas-record-section-nav::-webkit-scrollbar {
          display: none;
        }
        .atlas-record-section-nav button {
          flex: 0 0 auto;
          min-height: 30px !important;
          padding: 5px 9px !important;
          border: 1px solid #D4DDE6;
          border-radius: 999px;
          background: #F7F9FB;
          color: #17324D;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .atlas-record-section-nav button:hover {
          border-color: #C99A3D;
          background: #FFF9EB;
        }
        .atlas-record-detail-content [data-atlas-record-section] {
          scroll-margin-top: 56px;
          margin-top: 10px !important;
          padding-top: 10px !important;
          border-top: 1px solid #E1E7ED;
        }
        .atlas-record-detail-content [data-atlas-record-section]:first-of-type {
          margin-top: 0 !important;
        }
        .atlas-record-detail-content [data-atlas-record-section] > h2,
        .atlas-record-detail-content [data-atlas-record-section] > h3 {
          margin-bottom: 8px !important;
          color: #102A43;
          font-size: 14px !important;
          letter-spacing: .01em;
        }
        .atlas-record-detail-content [data-atlas-record-section] details,
        .atlas-record-detail-content [data-atlas-record-section] section {
          margin-bottom: 8px !important;
        }
        @media (max-width: 760px) {
          .atlas-record-detail-content--mobile {
            padding: 10px !important;
          }
          .atlas-record-detail-content button {
            min-height: 38px;
          }
          .atlas-record-list-panel button:not([aria-label]) {
            padding-top: 9px !important;
            padding-bottom: 9px !important;
          }
        }
        .atlas-quick-capture-button {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 9000;
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 1px solid #B88A2E;
          background: #C99A3D;
          color: #07172F;
          font-size: 30px;
          line-height: 1;
          font-weight: 700;
          box-shadow: 0 12px 30px rgba(8,29,55,.24);
          cursor: pointer;
        }
        .atlas-quick-capture-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9500;
          display: grid;
          place-items: end center;
          padding: 18px;
          background: rgba(7,23,47,.44);
          backdrop-filter: blur(3px);
        }
        .atlas-quick-capture-panel {
          width: min(560px, 100%);
          display: grid;
          gap: 12px;
          padding: 16px;
          border: 1px solid #D7DEE5;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 22px 70px rgba(7,23,47,.28);
        }
        .atlas-quick-capture-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .atlas-quick-capture-header strong { display:block; color:#07172F; font-size:18px; }
        .atlas-quick-capture-header small { display:block; margin-top:2px; color:#66788A; }
        .atlas-quick-capture-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 7px;
        }
        .atlas-quick-capture-actions button {
          min-width: 0;
          display: grid;
          place-items: center;
          gap: 4px;
          padding: 9px 5px;
          border: 1px solid #D7DEE5;
          border-radius: 11px;
          background: #F8FAFC;
          color: #17354D;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .atlas-quick-capture-actions button span { font-size: 18px; }
        .atlas-quick-capture-actions .atlas-talk-action {
          border-color: #CDAF54;
          background: linear-gradient(145deg, #0B2947, #123D63);
          color: #FFFFFF;
          box-shadow: 0 7px 18px rgba(7,39,70,.16);
        }
        .atlas-quick-capture-actions .atlas-talk-action span { color: #E8C96A; }
        .atlas-quick-capture-actions button:hover { border-color: #CDAF54; transform: translateY(-1px); }
        .atlas-quick-note-box { display:grid; gap:5px; color:#17354D; font-size:12px; font-weight:800; }
        .atlas-quick-note-box textarea { width:100%; min-height:76px !important; resize:vertical; border:1px solid #D7DEE5; border-radius:11px; padding:10px; }
        @media (max-width: 760px) {
          .atlas-quick-capture-button { right: 14px; bottom: 74px; width: 46px; height: 46px; }
          .atlas-quick-capture-backdrop { padding: 10px; }
          .atlas-quick-capture-actions { grid-template-columns: repeat(3, minmax(0,1fr)); }
          .atlas-quick-capture-panel { border-radius: 16px; }
        }
        .atlas-procedure-print {
          display: none;
        }
        @media print {
          @page {
            size: letter;
            margin: 0.55in 0.65in;
          }
          body {
            background: #ffffff !important;
          }
          body.atlas-print-procedure * {
            visibility: hidden !important;
          }
          body.atlas-print-procedure .atlas-procedure-print,
          body.atlas-print-procedure .atlas-procedure-print * {
            visibility: visible !important;
          }
          body.atlas-print-procedure .atlas-procedure-print {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            color: #111827;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.42;
          }
          .atlas-procedure-print h1 {
            margin: 4px 0 12px;
            color: #07172f;
            font-size: 24pt;
            line-height: 1.1;
          }
          .atlas-procedure-print h2 {
            margin: 0 0 6px;
            color: #07172f;
            font-size: 12pt;
          }
          .atlas-procedure-print p,
          .atlas-procedure-print ul,
          .atlas-procedure-print ol {
            margin: 0;
          }
          .atlas-procedure-print__header {
            display: grid;
            gap: 14px;
            padding-bottom: 14px;
            border-bottom: 2px solid #07172f;
          }
          .atlas-procedure-print__eyebrow {
            font-size: 8pt;
            font-weight: 800;
            letter-spacing: 0.14em;
          }
          .atlas-procedure-print__meta-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px 14px;
          }
          .atlas-procedure-print__meta-grid div {
            display: grid;
            gap: 2px;
          }
          .atlas-procedure-print__meta-grid strong {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .atlas-procedure-print__section,
          .atlas-procedure-print__two-column,
          .atlas-procedure-print__linked-grid {
            margin-top: 16px;
          }
          .atlas-procedure-print__section,
          .atlas-procedure-print__two-column > div,
          .atlas-procedure-print__linked-grid > div,
          .atlas-procedure-print__steps li,
          .atlas-procedure-print__photos figure {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .atlas-procedure-print__safety {
            padding: 10px 12px;
            border: 1.5px solid #8b1e1e;
          }
          .atlas-procedure-print__two-column {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
          }
          .atlas-procedure-print__steps {
            display: grid;
            gap: 8px;
            padding-left: 24px;
          }
          .atlas-procedure-print__steps li {
            padding-left: 4px;
          }
          .atlas-procedure-print__checkbox {
            display: inline-block;
            width: 13px;
            height: 13px;
            margin-right: 8px;
            border: 1.5px solid #111827;
            vertical-align: -2px;
          }
          .atlas-procedure-print__linked-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }
          .atlas-procedure-print__photos {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .atlas-procedure-print__photos figure {
            margin: 0;
          }
          .atlas-procedure-print__photos img {
            display: block;
            width: 100%;
            max-height: 3.2in;
            object-fit: contain;
            border: 1px solid #d1d5db;
          }
          .atlas-procedure-print__photos figcaption {
            margin-top: 4px;
            font-size: 9pt;
          }
          body:not(.atlas-print-procedure) aside,
          body:not(.atlas-print-procedure) header,
          .atlas-no-print {
            display: none !important;
          }
          .atlas-qr-print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        .atlas-command-dashboard {
          perspective: 1200px;
        }
        .atlas-command-dashboard > * {
          animation: atlasDashboardEnter 480ms cubic-bezier(.2,.8,.2,1) both;
        }
        .atlas-command-dashboard > *:nth-child(2) { animation-delay: 55ms; }
        .atlas-command-dashboard > *:nth-child(3) { animation-delay: 105ms; }
        .atlas-command-dashboard > *:nth-child(4) { animation-delay: 150ms; }

        .atlas-command-dashboard section,
        .atlas-command-dashboard button {
          transition:
            transform 180ms cubic-bezier(.2,.8,.2,1),
            border-color 180ms ease,
            box-shadow 180ms ease,
            background-color 180ms ease,
            filter 180ms ease;
        }

        .atlas-command-dashboard section:not(.atlas-dashboard-hero):hover {
          border-color: rgba(201, 154, 61, 0.72) !important;
          box-shadow:
            0 18px 42px rgba(18, 35, 63, 0.13),
            0 0 0 3px rgba(201, 154, 61, 0.08) !important;
          transform: translateY(-3px);
        }

        .atlas-command-dashboard button:hover {
          border-color: rgba(201, 154, 61, 0.78) !important;
          box-shadow:
            0 13px 28px rgba(18, 35, 63, 0.14),
            0 0 0 3px rgba(201, 154, 61, 0.08);
          transform: translateY(-3px) scale(1.008);
          filter: saturate(1.04);
        }

        .atlas-command-dashboard button:active {
          transform: translateY(-1px) scale(0.995);
        }

        :root {
          --atlas-navy: #102F49;
          --atlas-navy-deep: #0A2338;
          --atlas-blue: #1A496C;
          --atlas-gold: #C99A3D;
          --atlas-gold-light: #F2D58A;
          --atlas-paper: #F5F7F9;
          --atlas-line: #D8E0E7;
          --atlas-text: #17354D;
          --atlas-muted: #66788A;
          --atlas-shadow: 0 12px 34px rgba(10, 35, 56, 0.10);
        }

        .atlas-app-shell {
          background: var(--atlas-paper);
        }

        .atlas-page-header {
          position: relative !important;
          top: auto;
          z-index: 12;
          border-bottom: 1px solid rgba(255,255,255,0.12) !important;
          background:
            linear-gradient(135deg, var(--atlas-navy-deep), var(--atlas-blue)) !important;
          color: #FFFFFF !important;
          box-shadow: 0 10px 28px rgba(8, 29, 48, 0.16);
        }
        .atlas-page-header h1,
        .atlas-page-header h2,
        .atlas-page-header strong {
          color: #FFFFFF !important;
        }

        .atlas-logo-clean {
          width: 48px !important;
          height: 48px !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .atlas-logo-clean img {
          width: 46px !important;
          height: 46px !important;
          object-fit: contain;
        }

        .atlas-sidebar-toggle {
          align-self: flex-end;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: auto;
          min-height: 26px;
          margin: 0 5px 6px;
          padding: 3px 7px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: rgba(255,255,255,0.58);
          font: inherit;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease;
        }
        .atlas-sidebar-toggle:hover {
          color: #FFFFFF;
          background: rgba(255,255,255,0.07);
        }
        .atlas-sidebar-is-collapsed .atlas-brand-copy,
        .atlas-sidebar-is-collapsed .atlas-sidebar-nav-header,
        .atlas-sidebar-is-collapsed .atlas-sidebar-nav-label {
          display: none;
        }
        .atlas-sidebar-is-collapsed .atlas-brand-shell {
          justify-content: center;
        }
        .atlas-sidebar-is-collapsed .atlas-sidebar-nav-button {
          min-height: 42px;
          padding-left: 8px !important;
          padding-right: 8px !important;
          text-align: center !important;
        }

        .atlas-command-dashboard {
          width: 100%;
        }

        .atlas-dashboard-weather-panel {
          overflow: hidden;
          border: 1px solid rgba(21, 67, 99, 0.32);
          border-radius: 18px;
          background:
            radial-gradient(circle at 12% -15%, rgba(92, 161, 214, 0.32), transparent 34%),
            linear-gradient(135deg, #123A59 0%, #0E304B 52%, #0A263C 100%);
          color: #FFFFFF;
          box-shadow: 0 18px 42px rgba(8, 32, 51, 0.18);
        }
        .atlas-dashboard-weather-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px 15px;
          border-bottom: 1px solid rgba(255,255,255,0.13);
        }
        .atlas-dashboard-weather-eyebrow {
          color: var(--atlas-gold-light);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .atlas-dashboard-weather-heading h2 {
          margin: 4px 0 0;
          color: #FFFFFF;
          font-size: 22px;
          letter-spacing: -0.02em;
        }
        .atlas-dashboard-weather-summary {
          color: #D9E7F2;
          font-size: 12px;
          font-weight: 800;
        }
        .atlas-dashboard-weather-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          width: 100%;
        }
        .atlas-dashboard-weather-card {
          position: relative;
          display: grid;
          grid-template-rows: auto auto 42px auto auto 1fr auto;
          justify-items: center;
          gap: 5px;
          min-width: 0;
          min-height: 238px;
          padding: 14px 10px 13px;
          border: 0;
          border-right: 1px solid rgba(255,255,255,0.12);
          border-radius: 0;
          background: transparent;
          color: #FFFFFF;
          font: inherit;
          text-align: center;
          cursor: pointer;
          transition: background 160ms ease, box-shadow 160ms ease;
        }
        .atlas-dashboard-weather-card:last-child {
          border-right: 0;
        }
        .atlas-dashboard-weather-card:hover,
        .atlas-dashboard-weather-card:focus-visible {
          z-index: 3;
          background: rgba(255,255,255,0.09);
          box-shadow: inset 0 3px 0 var(--atlas-gold-light);
          outline: none;
        }
        .atlas-dashboard-weather-name {
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .atlas-dashboard-weather-date {
          color: #BFD1DE;
          font-size: 10px;
          font-weight: 700;
        }
        .atlas-dashboard-weather-icon {
          display: grid;
          place-items: center;
          color: var(--atlas-gold-light);
        }
        .atlas-dashboard-weather-icon svg {
          width: 31px;
          height: 31px;
        }
        .atlas-dashboard-weather-temps {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }
        .atlas-dashboard-weather-temps strong {
          color: #FFFFFF;
          font-size: 24px;
          letter-spacing: -0.04em;
        }
        .atlas-dashboard-weather-temps small {
          color: #BFD1DE;
          font-size: 11px;
          font-weight: 800;
        }
        .atlas-dashboard-weather-condition {
          max-width: 100%;
          overflow: hidden;
          color: #EAF2F7;
          font-size: 10px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .atlas-dashboard-weather-recommendation {
          align-self: stretch;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }
        .atlas-dashboard-weather-irrigation {
          align-self: end;
          width: 100%;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.12);
          color: var(--atlas-gold-light);
          font-size: 9px;
          font-weight: 900;
          line-height: 1.3;
        }

        .atlas-dashboard-info-popover {
          left: 50% !important;
          right: auto !important;
          width: min(290px, calc(100vw - 34px));
          top: calc(100% + 10px) !important;
          padding: 14px 15px !important;
          border: 1px solid rgba(242,213,138,0.82) !important;
          background: #0B2A43 !important;
          color: #FFFFFF !important;
          box-shadow: 0 22px 55px rgba(6, 24, 39, 0.34) !important;
          transform: translate(-50%, 5px) scale(0.985) !important;
          text-align: left !important;
        }
        .atlas-dashboard-info-popover strong {
          color: var(--atlas-gold-light) !important;
          font-size: 13px !important;
        }
        .atlas-dashboard-info-popover span {
          color: #EEF4F8 !important;
          font-size: 12px !important;
          line-height: 1.45 !important;
        }
        .atlas-dashboard-kpi:hover .atlas-dashboard-info-popover,
        .atlas-dashboard-kpi:focus-visible .atlas-dashboard-info-popover,
        .atlas-dashboard-status-card:hover .atlas-dashboard-info-popover,
        .atlas-dashboard-status-card:focus-visible .atlas-dashboard-info-popover {
          transform: translate(-50%, 0) scale(1) !important;
        }

        .atlas-command-dashboard section:not(.atlas-dashboard-hero):hover {
          transform: none !important;
        }
        .atlas-command-dashboard button:hover {
          transform: none !important;
        }
        .atlas-dashboard-kpi::after {
          display: none !important;
        }

        /* Cohesive premium treatment for list/detail screens. */
        .atlas-app-shell main section,
        .atlas-app-shell [role="dialog"] {
          border-color: var(--atlas-line);
        }
        .atlas-app-shell input,
        .atlas-app-shell select,
        .atlas-app-shell textarea {
          border-radius: 10px !important;
        }
        .atlas-app-shell button {
          font-weight: 800;
        }

        @media (max-width: 1040px) {
          .atlas-dashboard-weather-grid {
            overflow-x: auto;
            grid-template-columns: repeat(7, minmax(145px, 1fr));
          }
        }
        @media (max-width: 760px) {
          .atlas-dashboard-weather-heading {
            align-items: start;
            flex-direction: column;
          }
          .atlas-dashboard-weather-grid {
            grid-template-columns: repeat(7, 150px);
          }
        }

        .atlas-dashboard-greeting {
          margin-top: 8px;
          color: #F5D98B;
          font-size: clamp(19px, 2vw, 27px);
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .atlas-dashboard-kpi,
        .atlas-dashboard-status-card,
        .atlas-dashboard-weather-day {
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
        }

        .atlas-dashboard-info-popover {
          position: absolute;
          left: 10px;
          right: 10px;
          top: calc(100% + 8px);
          z-index: 80;
          display: grid;
          gap: 5px;
          padding: 11px 12px;
          border: 1px solid rgba(201, 154, 61, 0.66);
          border-radius: 12px;
          background: rgba(15, 35, 55, 0.98);
          color: #FFFFFF;
          box-shadow: 0 18px 40px rgba(15, 35, 55, 0.25);
          opacity: 0;
          pointer-events: none;
          transform: translateY(4px) scale(0.985);
          transform-origin: top center;
          transition: opacity 150ms ease, transform 170ms ease;
        }
        .atlas-dashboard-info-popover strong {
          color: #F5D98B;
          font-size: 12px;
        }
        .atlas-dashboard-info-popover span {
          font-size: 11px;
          line-height: 1.35;
          color: #EDF3F7;
        }
        .atlas-dashboard-kpi:hover .atlas-dashboard-info-popover,
        .atlas-dashboard-kpi:focus-visible .atlas-dashboard-info-popover,
        .atlas-dashboard-status-card:hover .atlas-dashboard-info-popover,
        .atlas-dashboard-status-card:focus-visible .atlas-dashboard-info-popover,
        .atlas-dashboard-weather-day:hover .atlas-dashboard-info-popover,
        .atlas-dashboard-weather-day:focus-visible .atlas-dashboard-info-popover {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        @media (max-width: 760px) {
          .atlas-dashboard-weather-strip {
            grid-template-columns: repeat(7, minmax(0, 1fr));
            margin-left: -11px;
            margin-right: -11px;
            overflow-x: auto;
            border-radius: 0 0 12px 12px;
          }
          .atlas-dashboard-weather-day {
            min-width: 82px;
            min-height: 138px;
            padding-left: 6px;
            padding-right: 6px;
          }
        }
        @media (hover: none), (pointer: coarse) {
          .atlas-dashboard-info-popover {
            display: none;
          }
        }

        .atlas-dashboard-kpi {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .atlas-dashboard-kpi::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          border-radius: 18px 0 0 18px;
          background: linear-gradient(180deg, #F5D98B, #C99A3D);
          opacity: 0;
          transition: opacity 180ms ease;
        }
        .atlas-dashboard-kpi:hover::before,
        .atlas-dashboard-kpi:focus-visible::before {
          opacity: 1;
        }

        .atlas-dashboard-hero {
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 55px rgba(18, 35, 63, 0.22) !important;
        }
        .atlas-dashboard-hero::after {
          content: "";
          position: absolute;
          width: 340px;
          height: 340px;
          right: -130px;
          top: -180px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(245, 217, 139, 0.22),
            rgba(245, 217, 139, 0) 68%
          );
          pointer-events: none;
          animation: atlasDashboardGlow 4.5s ease-in-out infinite;
        }
        .atlas-dashboard-command {
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(8px);
        }
        .atlas-dashboard-command::after {
          content: "→";
          position: absolute;
          right: 16px;
          top: 50%;
          color: #F5D98B;
          font-size: 20px;
          font-weight: 900;
          transform: translateY(-50%);
          transition: transform 180ms ease;
        }
        .atlas-dashboard-command:hover::after {
          transform: translate(4px, -50%);
        }

        @keyframes atlasDashboardEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes atlasDashboardGlow {
          0%, 100% { transform: scale(0.96); opacity: 0.65; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .atlas-command-dashboard > *,
          .atlas-dashboard-hero::after,
          .atlas-command-dashboard section,
          .atlas-command-dashboard button {
            transition: none !important;
          }
        }

        .atlas-gold-hover-card {
          position: relative;
          isolation: isolate;
          overflow: visible;
          box-shadow: 0 1px 2px rgba(18, 35, 63, 0.04);
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .atlas-gold-hover-card:hover,
        .atlas-gold-hover-card:focus-visible {
          z-index: 40;
          border-color: rgba(201, 154, 61, 0.82) !important;
          background: #FFFFFF !important;
          box-shadow: 0 12px 28px rgba(18, 35, 63, 0.14), 0 0 0 3px rgba(201, 154, 61, 0.09);
          outline: none;
        }
        .atlas-gold-hover-card-accent {
          position: absolute;
          top: 8px;
          bottom: 8px;
          left: -1px;
          width: 3px;
          border-radius: 0 999px 999px 0;
          background: #C99A3D;
          opacity: 0;
          transition: opacity 160ms ease;
        }
        .atlas-gold-hover-card:hover .atlas-gold-hover-card-accent,
        .atlas-gold-hover-card:focus-visible .atlas-gold-hover-card-accent {
          opacity: 1;
        }
        .atlas-gold-hover-popover {
          position: absolute;
          left: 8px;
          right: 8px;
          top: calc(100% + 7px);
          z-index: 50;
          display: grid;
          gap: 5px;
          padding: 11px 12px;
          border: 1px solid rgba(201, 154, 61, 0.58);
          border-radius: 10px;
          background: rgba(18, 35, 63, 0.98);
          color: #FFFFFF;
          box-shadow: 0 18px 38px rgba(18, 35, 63, 0.24);
          opacity: 0;
          pointer-events: none;
          transform: scale(0.985);
          transform-origin: top center;
          transition: opacity 140ms ease, transform 160ms ease;
        }
        .atlas-gold-hover-card:hover .atlas-gold-hover-popover {
          opacity: 1;
          transform: scale(1);
          transition-delay: 900ms;
        }
        .atlas-gold-hover-card:focus-visible .atlas-gold-hover-popover {
          opacity: 1;
          transform: scale(1);
          transition-delay: 0ms;
        }
        .atlas-asset-drawer-scrolling .atlas-gold-hover-popover {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .atlas-photo-intelligence-shell,
        .atlas-photo-intelligence-shell > *,
        .atlas-photo-intelligence-shell > * > * {
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .atlas-photo-intelligence-shell > * {
          width: 100% !important;
          position: relative !important;
          inset: auto !important;
          float: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .atlas-photo-intelligence-shell button,
        .atlas-photo-intelligence-shell input,
        .atlas-photo-intelligence-shell select,
        .atlas-photo-intelligence-shell textarea {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .atlas-photo-intelligence-shell p,
        .atlas-photo-intelligence-shell span,
        .atlas-photo-intelligence-shell strong,
        .atlas-photo-intelligence-shell div {
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }

        .atlas-asset-drawer section,
        .atlas-asset-drawer section * {
          box-sizing: border-box;
        }
        .atlas-asset-drawer section {
          min-width: 0;
          max-width: 100%;
        }
        .atlas-asset-drawer button,
        .atlas-asset-drawer input,
        .atlas-asset-drawer select,
        .atlas-asset-drawer textarea {
          max-width: 100%;
        }
        .atlas-gold-hover-popover > strong {
          color: #F5D98B;
          font-size: 10px;
          letter-spacing: 0.02em;
        }
        .atlas-gold-hover-popover > span {
          color: #E8EDF4;
          font-size: 10px;
          line-height: 1.35;
        }
        @media (hover: none), (pointer: coarse) {
          .atlas-gold-hover-popover { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .atlas-gold-hover-card,
          .atlas-gold-hover-card-accent,
          .atlas-gold-hover-popover {
            transition: none;
          }
        }
        @keyframes atlasTimelineEnter {
          from { opacity: 0; transform: translateY(9px) scale(0.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes atlasTimelineDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201, 154, 61, 0.24); }
          50% { box-shadow: 0 0 0 7px rgba(201, 154, 61, 0); }
        }
        .atlas-asset-timeline-card {
          position: relative;
          overflow: visible !important;
        }
        .atlas-asset-timeline {
          display: grid;
          gap: 0;
          margin-top: 10px;
        }
        .atlas-asset-timeline-item {
          display: grid;
          grid-template-columns: 20px minmax(0, 1fr);
          gap: 9px;
          min-width: 0;
          opacity: 0;
          animation: atlasTimelineEnter 360ms cubic-bezier(.2,.8,.2,1) forwards;
        }
        .atlas-asset-timeline-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 69px;
        }
        .atlas-asset-timeline-dot {
          width: 11px;
          height: 11px;
          flex: 0 0 auto;
          margin-top: 15px;
          border: 2px solid #C99A3D;
          border-radius: 999px;
          background: #FFFFFF;
          z-index: 2;
          transition: transform 180ms ease, background 180ms ease;
        }
        .atlas-asset-timeline-line {
          width: 2px;
          flex: 1;
          min-height: 35px;
          background: linear-gradient(#C99A3D 0%, #DCE3EB 42%, #DCE3EB 100%);
        }
        .atlas-asset-timeline-row {
          position: relative;
          display: grid;
          grid-template-columns: 105px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-width: 0;
          margin-bottom: 8px;
          padding: 11px 12px;
          border: 1px solid #DCE3EB;
          border-radius: 11px;
          background: linear-gradient(135deg, #FFFFFF 0%, #FBFCFE 100%);
          color: #12233F;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(18, 35, 63, 0.04);
          transition: transform 180ms cubic-bezier(.2,.8,.2,1), border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        .atlas-asset-timeline-row:hover,
        .atlas-asset-timeline-row:focus-visible {
          z-index: 20;
          border-color: rgba(201, 154, 61, 0.78);
          background: #FFFFFF;
          box-shadow: 0 14px 30px rgba(18, 35, 63, 0.14), 0 0 0 3px rgba(201, 154, 61, 0.10);
          outline: none;
        }
        .atlas-asset-timeline-item:hover .atlas-asset-timeline-dot,
        .atlas-asset-timeline-item:focus-within .atlas-asset-timeline-dot {
          background: #C99A3D;
        }
        .atlas-asset-timeline-date {
          color: #667085;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .atlas-asset-timeline-main {
          display: grid;
          gap: 3px;
          min-width: 0;
        }
        .atlas-asset-timeline-title {
          min-width: 0;
          overflow: hidden;
          color: #12233F;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .atlas-asset-timeline-summary {
          min-width: 0;
          overflow: hidden;
          color: #667085;
          font-size: 10px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .atlas-asset-timeline-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .atlas-asset-timeline-arrow {
          color: #C99A3D;
          font-size: 16px;
          font-weight: 900;
          opacity: 0;
          transform: translateX(-6px);
          transition: opacity 180ms ease, transform 180ms ease;
        }
        .atlas-asset-timeline-row:hover .atlas-asset-timeline-arrow,
        .atlas-asset-timeline-row:focus-visible .atlas-asset-timeline-arrow {
          opacity: 1;
          transform: translateX(0);
        }
        .atlas-asset-timeline-hover-panel {
          position: absolute;
          right: 10px;
          top: calc(100% - 2px);
          z-index: 30;
          display: grid;
          gap: 9px;
          width: min(390px, calc(100vw - 64px));
          padding: 12px;
          border: 1px solid rgba(201, 154, 61, 0.58);
          border-radius: 12px;
          background: rgba(18, 35, 63, 0.97);
          color: #FFFFFF;
          box-shadow: 0 18px 38px rgba(18, 35, 63, 0.25);
          opacity: 0;
          pointer-events: none;
          transform: translateY(-7px) scale(0.985);
          transform-origin: top right;
          transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1);
        }
        .atlas-asset-timeline-row:hover .atlas-asset-timeline-hover-panel,
        .atlas-asset-timeline-row:focus-visible .atlas-asset-timeline-hover-panel {
          opacity: 1;
          transform: translateY(4px) scale(1);
        }
        .atlas-asset-timeline-hover-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .atlas-asset-timeline-hover-grid > span {
          display: grid;
          gap: 2px;
          min-width: 0;
          padding: 7px 8px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
        }
        .atlas-asset-timeline-hover-grid small {
          color: #C7D0DD;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .atlas-asset-timeline-hover-grid strong {
          overflow: hidden;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .atlas-asset-timeline-hover-notes {
          color: #E8EDF4;
          font-size: 10px;
          line-height: 1.45;
        }
        .atlas-asset-timeline-hover-action {
          color: #F5D98B;
          font-size: 10px;
          font-weight: 900;
        }
        .atlas-asset-timeline-more {
          justify-self: start;
          margin: 3px 0 0 29px;
          padding: 7px 10px;
          border: 1px solid #DCE3EB;
          border-radius: 8px;
          background: #FFFFFF;
          color: #12233F;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }
        .atlas-asset-timeline-more:hover,
        .atlas-asset-timeline-more:focus-visible {
          border-color: #C99A3D;
          box-shadow: 0 8px 18px rgba(18, 35, 63, 0.10);
          outline: none;
        }
        .atlas-asset-timeline-empty {
          display: grid;
          justify-items: center;
          gap: 4px;
          margin-top: 10px;
          padding: 22px 14px;
          border: 1px dashed #C9D3DF;
          border-radius: 11px;
          background: linear-gradient(135deg, #FBFCFE, #F5F8FC);
          color: #667085;
          text-align: center;
        }
        .atlas-asset-timeline-empty-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          margin-bottom: 3px;
          border-radius: 999px;
          background: #FFF6D8;
          color: #9A6B00;
          font-size: 20px;
        }
        .atlas-asset-timeline-empty strong {
          color: #12233F;
          font-size: 12px;
        }
        .atlas-asset-timeline-empty span:last-child {
          font-size: 10px;
        }
        @media (hover: none), (pointer: coarse) {
          .atlas-asset-timeline-hover-panel { display: none; }
          .atlas-asset-timeline-row:active { box-shadow: 0 8px 18px rgba(18, 35, 63, 0.12); }
        }
        @media (max-width: 819px) {
          .atlas-asset-timeline-row {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .atlas-asset-timeline-date {
            grid-column: 1 / -1;
          }
          .atlas-asset-timeline-summary {
            white-space: normal;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .atlas-asset-timeline-item {
            opacity: 1;
            animation: none;
          }
          .atlas-asset-timeline-row,
          .atlas-asset-timeline-dot,
          .atlas-asset-timeline-arrow,
          .atlas-asset-timeline-hover-panel,
          .atlas-asset-timeline-more {
            transition: none;
            animation: none;
          }
        }
        @media (min-width: 820px) {
          .atlas-asset-drawer {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-rows: auto auto minmax(0, 1.25fr) minmax(0, 0.85fr);
            gap: 6px !important;
            height: 100%;
            min-height: 0;
            overflow: hidden;
            align-content: stretch;
          }
          .atlas-asset-drawer > div:first-child,
          .atlas-asset-drawer > div:nth-child(2) {
            grid-column: 1 / -1;
          }
          .atlas-asset-drawer > section {
            min-width: 0;
            min-height: 0;
            overflow: hidden;
          }
          .atlas-asset-drawer > section:nth-of-type(1) {
            grid-column: 1 / -1;
          }
          .atlas-asset-drawer > section:nth-of-type(2),
          .atlas-asset-drawer > section:nth-of-type(3),
          .atlas-asset-drawer > section:nth-of-type(4),
          .atlas-asset-drawer > section:nth-of-type(5) {
            display: flex !important;
            flex-direction: column;
          }
          .atlas-asset-drawer > section:nth-of-type(2) > div:last-child,
          .atlas-asset-drawer > section:nth-of-type(3) > div:last-child,
          .atlas-asset-drawer > section:nth-of-type(4) > div:last-child,
          .atlas-asset-drawer > section:nth-of-type(5) > div:last-child {
            min-height: 0;
            overflow-y: auto;
          }
        }
        @media (max-width: 819px) {
          body {
            width: 100%;
            position: relative;
          }
          input, select, textarea, button, a {
            max-width: 100%;
          }
        }

        .atlas-dashboard-layout-grid {
          width: 100%;
          align-items: start;
        }
        .atlas-dashboard-widget-frame {
          width: 100%;
          max-width: 100%;
          height: max-content;
          min-height: 0;
          box-sizing: border-box;
          contain: none;
          isolation: auto;
        }
        .atlas-dashboard-widget-content {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          overflow: visible !important;
        }
        .atlas-dashboard-widget-content > * {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .atlas-dashboard-widget-content img {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          object-fit: contain;
        }
        .atlas-dashboard-widget-content > section,
        .atlas-dashboard-widget-content > div {
          position: relative;
          height: auto;
          min-height: 0;
        }
        @media (max-width: 819px) {
          .atlas-dashboard-layout-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }
          .atlas-dashboard-widget-frame {
            grid-column: 1 / -1 !important;
            min-height: 0 !important;
          }
        }

        .atlas-weather-experience{position:relative;isolation:isolate;width:100%;margin-top:16px;overflow:hidden;border:1px solid rgba(22,67,99,.18);border-radius:24px;background:linear-gradient(150deg,#F9FCFF 0%,#EAF5FC 52%,#FFF8E8 100%);box-shadow:0 18px 48px rgba(10,35,56,.11),inset 0 1px 0 rgba(255,255,255,.92)}
        .atlas-weather-ambient{position:absolute;inset:0;z-index:-1;border-radius:inherit;background:radial-gradient(circle at 8% 2%,rgba(84,169,224,.24),transparent 27%),radial-gradient(circle at 91% 0%,rgba(255,209,96,.25),transparent 23%),linear-gradient(180deg,rgba(255,255,255,.48),transparent 50%);pointer-events:none}
        .atlas-weather-main-row{display:grid;grid-template-columns:minmax(210px,.72fr) minmax(0,2.3fr);gap:14px;align-items:center;padding:16px 16px 10px}
        .atlas-weather-current{min-width:0;padding:4px 8px}.atlas-weather-kicker{color:#6B7E8F;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.atlas-weather-current-row{display:flex;align-items:center;gap:11px;margin-top:8px}.atlas-weather-current-glyph{display:grid;place-items:center;width:58px;height:58px;flex:0 0 58px;border:1px solid rgba(201,154,61,.24);border-radius:17px;background:rgba(255,255,255,.78);color:#D0A348;box-shadow:0 10px 24px rgba(25,73,108,.09)}.atlas-weather-current-glyph svg{width:46px;height:46px}.atlas-weather-current-temp{color:#102F49;font-size:46px;font-weight:650;line-height:.9;letter-spacing:-.07em}.atlas-weather-current-label{margin-top:4px;color:#496579;font-size:13px;font-weight:800}.atlas-weather-current-detail{margin-top:3px;color:#6B7E8F;font-size:10px;font-weight:750}
        .atlas-weather-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;min-width:0}.atlas-weather-day{display:grid;grid-template-rows:auto 34px auto auto;justify-items:center;gap:4px;min-width:0;min-height:124px;padding:9px 5px 8px;border:1px solid rgba(21,67,99,.12);border-radius:14px;background:rgba(255,255,255,.72);color:#17354D;font:inherit;text-align:center;cursor:pointer;box-shadow:0 6px 16px rgba(10,35,56,.05);transition:transform .16s,border-color .16s,box-shadow .16s,background .16s}.atlas-weather-day:hover,.atlas-weather-day:focus-visible{border-color:rgba(201,154,61,.8);background:#fff;box-shadow:0 12px 26px rgba(10,35,56,.12);transform:translateY(-2px);outline:none}.atlas-weather-day-heading{display:grid;gap:1px}.atlas-weather-day-heading strong{font-size:10px}.atlas-weather-day-heading small{color:#81909D;font-size:8px;font-weight:750}.atlas-weather-day-glyph{display:grid;place-items:center;color:#C99A3D}.atlas-weather-day-glyph svg{width:32px;height:32px}.atlas-weather-day-temperature{display:flex;align-items:baseline;gap:3px}.atlas-weather-day-temperature strong{color:#102F49;font-size:18px}.atlas-weather-day-temperature small{color:#8493A0;font-size:9px;font-weight:800}.atlas-weather-day-condition{max-width:100%;overflow:hidden;color:#526B7D;font-size:8px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}
        .atlas-weather-recommendations{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 16px 14px}.atlas-weather-operation-card{display:grid;grid-template-columns:31px minmax(0,1fr);gap:9px;align-items:center;min-width:0;padding:9px 11px;border:1px solid rgba(21,67,99,.11);border-radius:13px;background:rgba(255,255,255,.66)}.atlas-weather-operation-icon{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:linear-gradient(145deg,#123B59,#0B2940);color:#F2D58A;font-size:15px}.atlas-weather-operation-card strong{display:block;color:#17354D;font-size:11px}.atlas-weather-operation-card span:not(.atlas-weather-operation-icon){display:block;margin-top:2px;color:#617587;font-size:9.5px;font-weight:650;line-height:1.35}
        .atlas-weather-detail-backdrop{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:20px;background:rgba(7,24,38,.58);backdrop-filter:blur(5px)}.atlas-weather-detail-card{position:relative;width:min(760px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:24px;border:1px solid rgba(242,213,138,.62);border-radius:22px;background:#fff;color:#17354D;box-shadow:0 28px 80px rgba(6,24,39,.34)}.atlas-weather-detail-close{position:absolute;top:12px;right:12px;display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(21,67,99,.14);border-radius:11px;background:#F6F9FB;color:#17354D;font-size:24px;cursor:pointer}.atlas-weather-detail-heading{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:center;padding-right:40px}.atlas-weather-detail-heading>span{display:grid;place-items:center;width:64px;height:64px;border-radius:18px;background:#EDF6FC;color:#C99A3D}.atlas-weather-detail-heading>span svg{width:50px;height:50px}.atlas-weather-detail-heading h3{margin:4px 0 3px;font-size:21px}.atlas-weather-detail-heading p{margin:0;color:#617587;font-size:12px;font-weight:650}.atlas-weather-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}.atlas-weather-detail-grid>div{padding:15px;border:1px solid rgba(21,67,99,.11);border-radius:15px;background:#F8FBFD}.atlas-weather-detail-grid>div>strong{display:block;margin-bottom:9px;font-size:12px}.atlas-weather-schedule-list{display:grid;gap:7px}.atlas-weather-schedule-list button{display:grid;grid-template-columns:66px minmax(0,1fr);gap:8px;width:100%;padding:8px;border:1px solid rgba(21,67,99,.1);border-radius:10px;background:#fff;color:#17354D;text-align:left;cursor:pointer}.atlas-weather-schedule-list button span{color:#7A8C9A;font-size:10px;font-weight:800}.atlas-weather-schedule-list button b{font-size:11px}.atlas-weather-detail-grid ul{display:grid;gap:8px;margin:0;padding-left:18px;color:#526B7D;font-size:11px;line-height:1.45}.atlas-weather-detail-irrigation{margin-top:12px;padding:10px;border-radius:10px;background:#FFF7E3;color:#72581E;font-size:11px;line-height:1.4}.atlas-weather-empty{margin:0;color:#7A8C9A;font-size:11px}.atlas-weather-detail-actions{display:flex;justify-content:flex-end;margin-top:16px}
        @media(max-width:1120px){.atlas-weather-main-row{grid-template-columns:210px minmax(0,1fr)}.atlas-weather-days{grid-template-columns:repeat(7,minmax(92px,1fr));overflow-x:auto;padding-bottom:4px}}@media(max-width:720px){.atlas-weather-main-row{grid-template-columns:1fr;padding:14px 12px 8px}.atlas-weather-current{padding:0}.atlas-weather-days{grid-template-columns:repeat(7,92px)}.atlas-weather-recommendations{grid-template-columns:1fr;padding:0 12px 12px}.atlas-weather-detail-grid{grid-template-columns:1fr}.atlas-weather-detail-card{padding:20px 15px}.atlas-weather-detail-heading{grid-template-columns:52px minmax(0,1fr)}.atlas-weather-detail-heading>span{width:52px;height:52px}.atlas-weather-detail-heading>span svg{width:41px;height:41px}}
        .atlas-dashboard-info-popover,.atlas-gold-hover-popover{width:min(310px,calc(100vw - 34px))!important;min-width:230px;padding:14px 15px!important;border:1px solid rgba(242,213,138,.82)!important;border-radius:14px!important;background:#0B2A43!important;color:#fff!important;box-shadow:0 24px 58px rgba(6,24,39,.36)!important;text-align:left!important}.atlas-dashboard-info-popover strong,.atlas-gold-hover-popover>strong{color:#F2D58A!important;font-size:13px!important;line-height:1.35!important}.atlas-dashboard-info-popover span,.atlas-gold-hover-popover>span{color:#EEF4F8!important;font-size:12px!important;line-height:1.48!important}.atlas-weather-day .atlas-gold-hover-popover{left:50%!important;right:auto!important;top:calc(100% + 10px)!important;transform:translate(-50%,5px) scale(.985)!important}.atlas-weather-day:hover .atlas-gold-hover-popover,.atlas-weather-day:focus-visible .atlas-gold-hover-popover{opacity:1;transform:translate(-50%,0) scale(1)!important}
        @media(max-width:1120px){.atlas-weather-overview{grid-template-columns:1fr}.atlas-weather-days{grid-template-columns:repeat(7,minmax(145px,1fr));overflow-x:auto;padding-bottom:20px}}@media(max-width:720px){.atlas-weather-overview{padding:20px 16px 16px}.atlas-weather-operations{grid-template-columns:1fr}.atlas-weather-days{grid-template-columns:repeat(7,150px);padding-left:12px;padding-right:12px}}@media(hover:none),(pointer:coarse){.atlas-weather-day .atlas-gold-hover-popover{display:none}}

        /* Mobile layout containment: prevent desktop-sized children from widening the phone page. */
        @media (max-width: 819px) {
          html, body, #__next {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }
          .atlas-app-shell,
          .atlas-mobile-page,
          .atlas-mobile-content,
          .atlas-mobile-content > *,
          .atlas-mobile-content section,
          .atlas-mobile-content article,
          .atlas-mobile-content aside,
          .atlas-mobile-content header,
          .atlas-mobile-content footer,
          .atlas-mobile-content form,
          .atlas-mobile-content div {
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .atlas-mobile-page {
            grid-column: 1 / -1 !important;
            overflow: hidden !important;
          }
          .atlas-mobile-content {
            width: 100% !important;
            overflow-x: hidden !important;
          }
          .atlas-mobile-content > div {
            width: 100% !important;
            padding: 8px !important;
            border-radius: 20px !important;
          }
          .atlas-mobile-content img,
          .atlas-mobile-content video,
          .atlas-mobile-content iframe,
          .atlas-mobile-content canvas,
          .atlas-mobile-content svg {
            max-width: 100% !important;
          }
          .atlas-mobile-content input,
          .atlas-mobile-content select,
          .atlas-mobile-content textarea,
          .atlas-mobile-content button {
            min-width: 0 !important;
            max-width: 100% !important;
          }
          .atlas-mobile-content button,
          .atlas-mobile-content h1,
          .atlas-mobile-content h2,
          .atlas-mobile-content h3,
          .atlas-mobile-content h4,
          .atlas-mobile-content p,
          .atlas-mobile-content strong,
          .atlas-mobile-content span,
          .atlas-mobile-content small,
          .atlas-mobile-content label {
            overflow-wrap: normal;
            word-break: normal;
            hyphens: none;
          }
          .atlas-mobile-content button {
            white-space: normal !important;
          }
          .atlas-command-dashboard {
            width: 100% !important;
            gap: 10px !important;
          }
          .atlas-command-dashboard > section,
          .atlas-command-dashboard > div,
          .atlas-dashboard-hero {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            border-radius: 16px !important;
          }
          .atlas-dashboard-hero {
            padding: 15px !important;
          }
          .atlas-dashboard-hero h1 {
            font-size: clamp(25px, 8vw, 32px) !important;
            overflow-wrap: normal;
          }
          .atlas-dashboard-command {
            width: 100% !important;
            padding: 13px 42px 13px 13px !important;
          }
          .atlas-dashboard-command strong {
            font-size: clamp(18px, 5.6vw, 24px) !important;
            line-height: 1.15 !important;
          }
          .atlas-dashboard-command span {
            font-size: clamp(13px, 4.1vw, 17px) !important;
            line-height: 1.3 !important;
          }
          .atlas-dashboard-kpi,
          .atlas-dashboard-status-card {
            overflow: hidden !important;
          }
          .atlas-weather-experience {
            border-radius: 17px !important;
            overflow: hidden !important;
          }
          .atlas-weather-overview {
            padding: 16px 13px 13px !important;
          }
          .atlas-weather-current-row {
            gap: 11px !important;
          }
          .atlas-weather-current-glyph {
            width: 58px !important;
            height: 58px !important;
            flex: 0 0 58px !important;
          }
          .atlas-weather-current-temp {
            font-size: 48px !important;
          }
          .atlas-weather-days,
          .atlas-dashboard-weather-grid,
          .atlas-dashboard-weather-strip {
            width: 100% !important;
            max-width: 100% !important;
            overscroll-behavior-x: contain;
            -webkit-overflow-scrolling: touch;
          }
          .atlas-mobile-header {
            position: relative !important;
            top: auto !important;
          }
          .atlas-page-header {
            width: 100% !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .atlas-page-header h1 {
            font-size: clamp(20px, 6.4vw, 27px) !important;
            line-height: 1.1 !important;
          }
          .atlas-app-shell button {
            min-height: 40px;
          }
          .atlas-app-shell .atlas-sidebar-nav-button {
            min-height: 36px !important;
          }
        }
        .atlas-app-shell,
        .atlas-app-shell section,
        .atlas-app-shell main,
        .atlas-app-shell nav,
        .atlas-app-shell form {
          min-width: 0;
        }
        .atlas-app-shell button,
        .atlas-app-shell select,
        .atlas-app-shell input,
        .atlas-app-shell textarea {
          box-sizing: border-box;
          max-width: 100%;
        }
        .atlas-app-shell button {
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
        }
        .atlas-record-detail-content,
        .atlas-record-detail-content > * {
          min-width: 0;
          max-width: 100%;
        }
        .atlas-notifications-panel {
          box-sizing: border-box;
          overscroll-behavior: contain;
        }
      `}</style>
      <div
        className={`atlas-app-shell ${sidebarCollapsed ? "atlas-sidebar-is-collapsed" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "minmax(0, 1fr)"
            : `${sidebarCollapsed ? 70 : 238}px minmax(0, 1fr)`,
          transition: "grid-template-columns 240ms cubic-bezier(.2,.8,.2,1)",
          minHeight: "100vh",
          width: "100%",
          maxWidth: isMobile ? "100vw" : "none",
          overflowX: isMobile ? "hidden" : "visible",
          alignItems: "start",
        }}
      >
        <aside
          className={isMobile ? "atlas-mobile-header" : "atlas-desktop-sidebar"}
          style={
            isMobile
              ? mobileHeaderShellStyle
              : {
                  ...sidebarStyle,
                  position: "fixed",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: sidebarCollapsed ? 70 : 238,
                  height: "100vh",
                  transition: "width 240ms cubic-bezier(.2,.8,.2,1)",
                  maxHeight: "100vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  zIndex: 30,
                  boxShadow: "10px 0 35px rgba(7,27,47,0.16)",
                }
          }
        >
          <div className="atlas-brand-shell" style={isMobile ? mobileBrandStyle : brandStyle}>
            <div className="atlas-logo-clean" style={isMobile ? mobileLogoBoxStyle : logoBoxStyle}>
              {logoIndex < logoCandidates.length ? (
                <img
                  src={logoCandidates[logoIndex]}
                  alt="Atlas logo"
                  onError={() => setLogoIndex((index) => index + 1)}
                  style={logoImageStyle}
                />
              ) : (
                <span style={logoFallbackStyle}>A</span>
              )}
            </div>
            <div className="atlas-brand-copy" style={{ minWidth: 0 }}>
              <div style={isMobile ? mobileBrandTitleStyle : brandTitleStyle}>
                ATLAS
              </div>
              <div style={brandSubStyle}>
                {atlasProperties.find((item) => item.id === activePropertyId)?.name} Estate Systems
              </div>
            </div>
          </div>

          {isMobile ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                alignItems: "center",
                width: "100%",
              }}
            >
              <select
                value={activePropertyId}
                onChange={(event) => selectProperty(event.currentTarget.value)}
                aria-label="Active property"
                style={{
                  ...mobileMenuSelectStyle,
                  width: "100%",
                  minWidth: 0,
                  minHeight: 42,
                  gridColumn: "1 / -1",
                }}
              >
                {atlasProperties
                  .filter((property) => allowedPropertyIds.includes(property.id))
                  .map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => setMobileFieldMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={mobileFieldMoreOpen}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  minWidth: 0,
                  minHeight: 42,
                  padding: "7px 8px",
                  borderColor: "rgba(255,255,255,.22)",
                  background: "rgba(255,255,255,.10)",
                  color: "#FFFFFF",
                }}
              >
                Menu
              </button>
              <div style={{ minWidth: 0, width: "100%" }}>
                <AtlasNotifications
                  propertyId={activePropertyId}
                  propertyName={atlasProperties.find((property) => property.id === activePropertyId)?.name || activePropertyId}
                  workOrders={operationsHydrated ? serviceRecords : []}
                  parts={operationsHydrated ? partRecords : []}
                  inboxItems={operationsHydrated ? inboxItems : []}
                  requests={operationsHydrated ? requestRecords : []}
                  colors={colors}
                  isMobile={true}
                  onOpenWork={(id) => { setSelectedServiceId(id); setScreen("history"); }}
                  onOpenInbox={(id) => { setSelectedInboxId(id); setScreen("inbox"); }}
                  onOpenRequest={(id) => { setSelectedRequestId(id); setScreen("requests"); }}
                  onOpenParts={() => setScreen("parts")}
                />
              </div>
              <button
                type="button"
                onClick={() => setDashboardAssistantOpen(true)}
                aria-label="Ask Atlas"
                title="Ask Atlas"
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  minWidth: 0,
                  minHeight: 42,
                  padding: "7px 8px",
                  display: "grid",
                  placeItems: "center",
                  borderColor: "rgba(255,255,255,.22)",
                  background: "rgba(255,255,255,.10)",
                  color: "#FFFFFF",
                }}
              >
                <span>Ask Atlas</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="atlas-sidebar-toggle"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? "Expand Atlas navigation" : "Collapse Atlas navigation"}
                title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              >
                <span aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span>
                {!sidebarCollapsed ? <span>Collapse</span> : null}
              </button>
              <nav style={sidebarNavStyle} aria-label="Atlas sections">
                {visiblePrimaryNavigationSections.map((section) => (
                  <div key={section.label} style={{
                    ...sidebarNavSectionStyle,
                    order: activePropertyId === "4725"
                      ? section.label === "Home" ? 10 : section.label === "Property" ? 20 : section.label === "Help" ? 30 : 90
                      : section.label === "Overview" ? 10 : section.label === "Work" ? 20 : section.label === "Property" ? 30 : section.label === "People" ? 40 : section.label === "Intake" ? 50 : section.label === "Reports & Access" ? 60 : section.label === "Knowledge" ? 80 : 90,
                  }}>
                    <div className="atlas-sidebar-nav-header" style={sidebarNavHeaderStyle}>{section.label}</div>
                    <div style={sidebarNavItemsStyle}>
                      {section.items.map((screenId) => {
                        if (screenId === "planner" || screenId === "routines") return null;
                        const item = screens.find(
                          (candidate) => candidate.id === screenId,
                        );
                        if (!item) return null;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="atlas-sidebar-nav-button"
                            title={sidebarCollapsed ? (item.id === "timeline" ? "Property Timeline" : item.id === "portfolio" ? "Properties" : item.label) : undefined}
                            onClick={() => {
                              if (item.id === "history") {
                                setSelectedServiceId("");
                                setWorkOrdersOpenKey((current) => current + 1);
                              }
                              setScreen(item.id);
                            }}
                            style={{
                              ...navButtonStyle,
                              borderColor:
                                screen === item.id
                                  ? colors.gold
                                  : "transparent",
                              background:
                                screen === item.id
                                  ? colors.gold
                                  : "transparent",
                              color:
                                screen === item.id ? colors.navy : "#FFFFFF",
                            }}
                          >
                            <span className="atlas-sidebar-nav-label">
                              {activePropertyId === "4725" && item.id === "history"
                                ? "Chores"
                                : activePropertyId === "4725" && item.id === "calendar"
                                  ? "Family Calendar"
                                  : isAddisonUser && item.id === "routines"
                                    ? "My Routine"
                                    : item.id === "timeline"
                                      ? "Property Timeline"
                                      : item.id === "portfolio"
                                        ? "Properties"
                                        : item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!isTeamScopedUser && activePropertyId !== "4725" ? (
                  <div style={{ ...sidebarNavSectionStyle, order: 60 }}>
                    <div className="atlas-sidebar-nav-header" style={sidebarNavHeaderStyle}>Departments</div>
                    <div style={sidebarNavItemsStyle}>
                      {([['house','House & Maintenance'],['garage','Garage'],['pool','Pool & Spa'],['landscaping','Landscaping & Irrigation'],['marine','Dock & Waterfront']] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className="atlas-sidebar-nav-button"
                          title={sidebarCollapsed ? label : undefined}
                          onClick={() => setDepartmentCenter(id)}
                          style={{
                            ...navButtonStyle,
                            borderColor: departmentCenter === id ? colors.gold : "transparent",
                            background: departmentCenter === id ? colors.gold : "transparent",
                            color: departmentCenter === id ? colors.navy : "#FFFFFF",
                          }}
                        >
                          <span className="atlas-sidebar-nav-label">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {false && !isTeamScopedUser ? (
                <div style={{ ...sidebarNavSectionStyle, order: 95 }}>
                  <button type="button" className="atlas-sidebar-nav-button" onClick={() => setPlanningToolsOpen((current) => !current)} aria-expanded={planningToolsOpen} title={sidebarCollapsed ? "Planning Tools" : undefined} style={{ ...navButtonStyle, justifyContent: sidebarCollapsed ? "center" : "space-between", borderColor: screen === "planner" && ["walk","build","route","analytics","planner"].includes(tasksView) ? colors.gold : "rgba(255,255,255,0.18)", background: screen === "planner" && ["walk","build","route","analytics","planner"].includes(tasksView) ? colors.gold : "rgba(255,255,255,0.06)", color: screen === "planner" && ["walk","build","route","analytics","planner"].includes(tasksView) ? colors.navy : "#FFFFFF" }}>
                    <span className="atlas-sidebar-nav-label">Planning Tools</span>{!sidebarCollapsed ? <span aria-hidden="true" style={{ fontSize: 12 }}>{planningToolsOpen ? "▴" : "▾"}</span> : null}
                  </button>
                  {planningToolsOpen || (screen === "planner" && ["walk","build","route","analytics","planner"].includes(tasksView)) ? <div style={{ ...sidebarNavItemsStyle, marginTop: 6, paddingLeft: sidebarCollapsed ? 0 : 8 }}>{[
                    { id: "walk", label: "Walk Mode", view: "walk" as const },
                    { id: "build", label: "Build My Day", view: "build" as const },
                    { id: "route", label: "Smart Route", view: "route" as const },
                    { id: "analytics", label: "Operations Analytics", view: "analytics" as const },
                    { id: "week", label: "Plan Week", view: "planner" as const },
                  ].map((entry) => { const active = screen === "planner" && tasksView === entry.view; return <button key={entry.id} type="button" className="atlas-sidebar-nav-button" title={sidebarCollapsed ? entry.label : undefined} onClick={() => { setTasksView(entry.view); setScreen("planner"); }} style={{ ...navButtonStyle, borderColor: active ? colors.gold : "transparent", background: active ? colors.gold : "transparent", color: active ? colors.navy : "#FFFFFF", fontSize: 12 }}><span className="atlas-sidebar-nav-label">{entry.label}</span></button>; })}</div> : null}
                </div>
                ) : null}

                {!isTeamScopedUser ? (
                <div style={{ ...sidebarNavSectionStyle, order: 100 }}>
                  <button
                    type="button"
                    className="atlas-sidebar-nav-button"
                    onClick={() => setMoreToolsOpen((current) => !current)}
                    aria-expanded={moreToolsOpen}
                    title={sidebarCollapsed ? "More Tools" : undefined}
                    style={{
                      ...navButtonStyle,
                      justifyContent: sidebarCollapsed ? "center" : "space-between",
                      borderColor: visibleMoreToolsScreens.includes(screen)
                        ? colors.gold
                        : "rgba(255,255,255,0.18)",
                      background: visibleMoreToolsScreens.includes(screen)
                        ? colors.gold
                        : "rgba(255,255,255,0.06)",
                      color: visibleMoreToolsScreens.includes(screen)
                        ? colors.navy
                        : "#FFFFFF",
                    }}
                  >
                    <span className="atlas-sidebar-nav-label">More Tools</span>
                    {!sidebarCollapsed ? (
                      <span aria-hidden="true" style={{ fontSize: 12 }}>
                        {moreToolsOpen ? "▴" : "▾"}
                      </span>
                    ) : null}
                  </button>

                  {moreToolsOpen || visibleMoreToolsScreens.includes(screen) ? (
                    <div style={{ ...sidebarNavItemsStyle, marginTop: 6, paddingLeft: sidebarCollapsed ? 0 : 8 }}>
                      {visibleMoreToolsScreens.map((screenId) => {
                        const item = screens.find(
                          (candidate) => candidate.id === screenId,
                        );
                        if (!item) return null;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="atlas-sidebar-nav-button"
                            title={sidebarCollapsed ? (item.id === "timeline" ? "Projects" : item.label) : undefined}
                            onClick={() => setScreen(item.id)}
                            style={{
                              ...navButtonStyle,
                              borderColor: screen === item.id ? colors.gold : "transparent",
                              background: screen === item.id ? colors.gold : "transparent",
                              color: screen === item.id ? colors.navy : "#FFFFFF",
                              fontSize: 12,
                            }}
                          >
                            <span className="atlas-sidebar-nav-label">{item.id === "timeline" ? "Projects" : item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                ) : null}
              </nav>
            </>
          )}
        </aside>

        <section
          className={isMobile ? "atlas-mobile-page" : "atlas-desktop-page"}
          style={{
            gridColumn: isMobile ? "1 / 2" : "2 / 3",
            minWidth: 0,
            width: "100%",
            maxWidth: isMobile ? "100vw" : "none",
            overflowX: isMobile ? "hidden" : "visible",
            paddingBottom: isMobile ? 104 : 0,
          }}
        >
          <header className="atlas-page-header" style={isMobile ? mobileTopbarStyle : topbarStyle}>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 10 : 22,
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <div style={{ minWidth: 0, flex: isMobile ? "0 0 auto" : "0 1 410px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  {screen === "dashboard" ? <AtlasMiniMark size={34} /> : null}
                  <h1 style={isMobile ? mobilePageTitleStyle : pageTitleStyle}>
                    {activePropertyId === "4725"
                      ? screen === "dashboard"
                        ? "Atlas / 4725"
                        : screen === "history"
                          ? "Chores"
                          : screen === "calendar"
                            ? "Family Calendar"
                            : screen === "assets"
                              ? "Assets"
                              : screen === "locations"
                                ? "Locations"
                                : screen === "notes"
                                  ? "Notes"
                                  : screen === "manuals"
                                    ? "Manuals"
                                    : screen === "assistant"
                                      ? "Ask Atlas"
                                      : "Atlas / 4725"
                      : departmentCenter
                      ? departmentCenter === "house" ? "House & Maintenance" : departmentCenter === "garage" ? "Garage" : departmentCenter === "pool" ? "Pool & Spa" : departmentCenter === "landscaping" ? "Landscaping & Irrigation" : "Dock & Waterfront"
                      : screen === "dashboard"
                        ? `Atlas / ${atlasProperties.find((item) => item.id === activePropertyId)?.name || "2000"}`
                        : screen === "timeline"
                          ? "Projects"
                          : screen === "planner"
                            ? isAddisonUser
                              ? "My Tasks"
                              : tasksView === "walk" ? "Walk Mode"
                              : tasksView === "build" ? "Build My Day"
                              : tasksView === "route" ? "Smart Route"
                              : tasksView === "addison" ? "Addison Work Manager"
                              : tasksView === "analytics" ? "Operations Analytics"
                              : tasksView === "vehicles" ? "Garage"
                              : tasksView === "seasonal" ? "Seasonal Intelligence"
                              : tasksView === "planner" ? "Plan Week"
                              : "Tasks"
                            : isAddisonUser && screen === "routines"
                              ? "My Routine"
                              : screens.find((item) => item.id === screen)?.label}
                  </h1>
                  {!isMobile ? (
                  <div
                    role="status"
                    aria-live="polite"
                    title={
                      syncState === "synced"
                        ? `Shared Atlas data synced${lastSyncedAt ? ` at ${lastSyncedAt}` : ""}`
                        : syncState === "offline"
                          ? "Atlas is using saved browser records until the connection returns."
                          : "Loading shared Atlas data."
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 26,
                      padding: "4px 9px",
                      borderRadius: 999,
                      border: `1px solid ${
                        syncState === "synced"
                          ? "#9FD6B8"
                          : syncState === "offline"
                            ? "#E7C46A"
                            : colors.line
                      }`,
                      background:
                        syncState === "synced"
                          ? "#F0FBF5"
                          : syncState === "offline"
                            ? "#FFF8E8"
                            : colors.panel,
                      color:
                        syncState === "synced"
                          ? "#176B3A"
                          : syncState === "offline"
                            ? "#8A5A00"
                            : colors.muted,
                      fontSize: 11,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background:
                          syncState === "synced"
                            ? "#2BA568"
                            : syncState === "offline"
                              ? colors.gold
                              : "#8091A3",
                      }}
                    />
                    {syncState === "synced"
                      ? `Synced${lastSyncedAt && !isMobile ? ` ${lastSyncedAt}` : ""}`
                      : syncState === "offline"
                        ? "Saved offline"
                        : "Syncing..."}
                  </div>
                  ) : null}
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => { if (operationsSyncState === "failed") void syncOperationalData(); requestSharedAtlasRefresh(); }}
                      disabled={mobileSyncRefreshing}
                      title="Refresh shared Atlas from the server"
                      style={{
                        minHeight: 28,
                        padding: "4px 9px",
                        borderRadius: 999,
                        border: `1px solid ${colors.line}`,
                        background: "#FFFFFF",
                        color: colors.navy,
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: mobileSyncRefreshing ? "default" : "pointer",
                        opacity: mobileSyncRefreshing ? .65 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mobileSyncRefreshing ? "Refreshing…" : "Refresh"}
                    </button>
                  ) : null}
                  {!isMobile ? (
                  <button type="button" onClick={() => { if (operationsSyncState === "failed") void syncOperationalData(); }} title={operationsSyncMessage} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "4px 9px", borderRadius: 999, border: `1px solid ${operationsSyncState === "failed" ? "#E8A2A2" : operationsSyncState === "saving" ? "#E7C46A" : "#9FD6B8"}`, background: operationsSyncState === "failed" ? "#FFF2F2" : operationsSyncState === "saving" ? "#FFF8E8" : "#F0FBF5", color: operationsSyncState === "failed" ? "#A51E1E" : operationsSyncState === "saving" ? "#8A5A00" : "#176B3A", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap", cursor: operationsSyncState === "failed" ? "pointer" : "default" }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: operationsSyncState === "failed" ? "#D83737" : operationsSyncState === "saving" ? colors.gold : "#2BA568" }} />{operationsSyncState === "saving" ? "Saving" : operationsSyncState === "failed" ? "Failed · Retry" : operationsSyncState === "saved" ? "Saved" : "Ready"}</button>
                  ) : null}
                </div>
                {screen === "dashboard" && !isMobile ? (
                  <p style={headerSubStyle}>{databaseStatus}</p>
                ) : null}
              </div>

              {!isMobile ? (
              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                  flex: "1 1 520px",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "minmax(0, 1fr) auto"
                    : "minmax(200px, 1fr) minmax(190px, .8fr) auto",
                  gap: isMobile ? 8 : 10,
                  alignItems: "stretch",
                }}
              >
                <select
                    value={activePropertyId}
                    onChange={(event) => selectProperty(event.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      minHeight: 40,
                      padding: "7px 11px",
                      fontSize: 13,
                      fontWeight: 900,
                      margin: 0,
                    }}
                    aria-label="Active property"
                  >
                    {atlasProperties.filter((property) => allowedPropertyIds.includes(property.id)).map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} — {property.detail}
                      </option>
                    ))}
                </select>
                <div style={{ minWidth: 0, display: "flex" }}>
                    <AtlasNotifications
                      propertyId={activePropertyId}
                      propertyName={
                        atlasProperties.find(
                          (property) => property.id === activePropertyId,
                        )?.name || activePropertyId
                      }
                      workOrders={serviceRecords}
                      parts={partRecords}
                      inboxItems={inboxItems}
                      requests={requestRecords}
                      colors={colors}
                      isMobile={isMobile}
                      onOpenWork={(id) => {
                        setSelectedServiceId(id);
                        setScreen("history");
                      }}
                      onOpenInbox={(id) => {
                        setSelectedInboxId(id);
                        setScreen("inbox");
                      }}
                      onOpenRequest={(id) => {
                        setSelectedRequestId(id);
                        setScreen("requests");
                      }}
                      onOpenParts={() => setScreen("parts")}
                    />
                  </div>
                <button
                  type="button"
                  onClick={() => setDashboardAssistantOpen(true)}
                  aria-label="Open Ask Atlas"
                  title="Ask Atlas"
                  style={{
                    ...secondaryButtonStyle,
                    width: "auto",
                    minWidth: isMobile ? 44 : 104,
                    minHeight: 40,
                    margin: 0,
                    padding: isMobile ? "7px 10px" : "7px 12px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    whiteSpace: "nowrap",
                    borderColor: "rgba(255,255,255,.24)",
                    background: "rgba(255,255,255,.12)",
                    color: "#FFFFFF",
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>✦</span>
                  {!isMobile ? <span>Ask Atlas</span> : null}
                </button>
              </div>
              ) : null}
            </div>
          </header>

          <div className={isMobile ? "atlas-mobile-content" : "atlas-desktop-content"} style={isMobile ? mobileContentStyle : desktopContentStyle}>
            {renderScreen()}
          </div>
        </section>
      </div>

      {isMobile ? (
        <>
          <nav
            aria-label="Atlas Field Mode"
            style={{
              position: "fixed",
              left: 8,
              right: 8,
              bottom: "max(8px, env(safe-area-inset-bottom))",
              zIndex: 9000,
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 4,
              padding: 6,
              borderRadius: 18,
              border: `1px solid ${colors.line}`,
              background: "rgba(255,255,255,.97)",
              boxShadow: "0 14px 40px rgba(7,27,47,.20)",
              backdropFilter: "blur(14px)",
            }}
          >
            {(activePropertyId === "4725"
              ? [
                  {
                    id: "today",
                    label: "Home",
                    active: screen === "dashboard",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setScreen("dashboard");
                    },
                  },
                  {
                    id: "calendar",
                    label: "Calendar",
                    active: screen === "calendar",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setScreen("calendar");
                    },
                  },
                  {
                    id: "chores",
                    label: "Chores",
                    active: screen === "history",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setSelectedServiceId("");
                      setWorkOrdersOpenKey((current) => current + 1);
                      setScreen("history");
                    },
                  },
                  {
                    id: "assets",
                    label: "Assets",
                    active: screen === "assets",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setScreen("assets");
                    },
                  },
                ]
              : [
                  {
                    id: "today",
                    label: "Today",
                    active: screen === "dashboard",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setScreen("dashboard");
                    },
                  },
                  {
                    id: "work",
                    label: "Work",
                    active: screen === "history",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setSelectedServiceId("");
                      setWorkOrdersOpenKey((current) => current + 1);
                      setScreen("history");
                    },
                  },
                  {
                    id: "assets",
                    label: "Assets",
                    active: screen === "assets",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setScreen("assets");
                    },
                  },
                  {
                    id: "calendar",
                    label: "Calendar",
                    active: screen === "calendar",
                    action: () => {
                      setMobileFieldMoreOpen(false);
                      setScreen("calendar");
                    },
                  },
                ]).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                style={{
                  minWidth: 0,
                  minHeight: 48,
                  padding: "6px 3px",
                  borderRadius: 12,
                  border: item.active ? `1px solid ${colors.gold}` : "1px solid transparent",
                  background: item.active ? "#FFF8E8" : "transparent",
                  color: colors.navy,
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {mobileFieldMoreOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="All Atlas sections"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setMobileFieldMoreOpen(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 12020,
                display: "grid",
                alignItems: "start",
                background: "rgba(7,27,47,.36)",
                padding: "max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom))",
              }}
            >
              <section
                onMouseDown={(event) => event.stopPropagation()}
                style={{
                  width: "100%",
                  maxHeight: "calc(100dvh - max(16px, env(safe-area-inset-top)) - max(8px, env(safe-area-inset-bottom)))",
                  overflowY: "auto",
                  borderRadius: 20,
                  background: "#FFFFFF",
                  border: `1px solid ${colors.line}`,
                  boxShadow: "0 22px 60px rgba(7,27,47,.28)",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <strong style={{ color: colors.navy, fontSize: 19 }}>All Atlas Sections</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileFieldMoreOpen(false)}
                    style={{ ...secondaryButtonStyle, width: "auto", minHeight: 36, padding: "6px 10px" }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>×</span>
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr)",
                    gap: 8,
                  }}
                >
                  {visiblePrimaryNavigationSections.map((section) => (
                    <section key={section.label} style={{ display: "grid", gap: 7 }}>
                      <div style={{ ...eyebrowStyle, marginTop: 4 }}>{section.label}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
                        {section.items.map((screenId) => {
                          const item = screens.find((candidate) => candidate.id === screenId);
                          if (!item) return null;
                          const label = activePropertyId === "4725" && screenId === "history"
                            ? "Chores"
                            : activePropertyId === "4725" && screenId === "calendar"
                              ? "Family Calendar"
                              : screenId === "planner"
                                ? (isAddisonUser ? "My Tasks" : "Tasks")
                                : screenId === "timeline"
                                  ? "Projects"
                                  : item.label;
                          return (
                            <button
                              key={screenId}
                              type="button"
                              onClick={() => {
                                setMobileFieldMoreOpen(false);
                                if (screenId === "planner") setTasksView("tasks");
                                if (screenId === "history") {
                                  setSelectedServiceId("");
                                  setWorkOrdersOpenKey((current) => current + 1);
                                }
                                setScreen(screenId);
                              }}
                              style={{
                                ...secondaryButtonStyle,
                                minHeight: 48,
                                padding: "9px 10px",
                                justifyContent: "flex-start",
                                textAlign: "left",
                                whiteSpace: "normal",
                                wordBreak: "normal",
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  {visibleMoreToolsScreens.length ? (
                    <section style={{ display: "grid", gap: 7 }}>
                      <div style={{ ...eyebrowStyle, marginTop: 4 }}>More Tools</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
                        {visibleMoreToolsScreens.map((screenId) => {
                          const item = screens.find((candidate) => candidate.id === screenId);
                          if (!item) return null;
                          return (
                            <button key={screenId} type="button" onClick={() => { setMobileFieldMoreOpen(false); setScreen(screenId); }} style={{ ...secondaryButtonStyle, minHeight: 48, padding: "9px 10px", justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal", wordBreak: "normal" }}>
                              {screenId === "timeline" ? "Projects" : item.label}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </div>

                {!isTeamScopedUser ? (
                  <>
                    <div style={{ ...eyebrowStyle, marginTop: 14, marginBottom: 7 }}>
                      Property Areas
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      {([
                        ["house", "House & Maintenance"],
                        ["garage", "Garage"],
                        ["pool", "Pool & Spa"],
                        ["landscaping", "Landscaping"],
                        ["marine", "Dock & Waterfront"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setMobileFieldMoreOpen(false);
                            setDepartmentDrilldown("");
                            setDepartmentCenter(id);
                          }}
                          style={{
                            ...secondaryButtonStyle,
                            minHeight: 46,
                            padding: "8px 10px",
                            justifyContent: "flex-start",
                            textAlign: "left",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            </div>
          ) : null}
        </>
      ) : null}

      {true ? (
        <>

          {commandCenterOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Atlas Universal Command Center"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 10050,
                background: "rgba(7,27,47,.58)",
                display: "grid",
                alignItems: isMobile ? "start" : "start",
                justifyItems: "center",
                padding: isMobile ? "max(10px, env(safe-area-inset-top)) 10px" : "11vh 20px 20px",
              }}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeCommandCenter();
              }}
            >
              <section
                style={{
                  width: "min(760px, 100%)",
                  maxHeight: isMobile ? "calc(100dvh - 20px)" : "76vh",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 18,
                  background: "#FFFFFF",
                  border: `1px solid ${colors.line}`,
                  boxShadow: "0 30px 90px rgba(7,27,47,.36)",
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderBottom: `1px solid ${colors.line}` }}>
                  <span aria-hidden="true" style={{ fontSize: 22, color: colors.gold, lineHeight: 1 }}>⌕</span>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => {
                      setQuery(event.currentTarget.value);
                      setSearchActiveIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeCommandCenter();
                        return;
                      }
                      if (event.key === "ArrowDown" && searchResults.length) {
                        event.preventDefault();
                        setSearchActiveIndex((current) => Math.min(current + 1, searchResults.length - 1));
                        return;
                      }
                      if (event.key === "ArrowUp" && searchResults.length) {
                        event.preventDefault();
                        setSearchActiveIndex((current) => Math.max(current - 1, 0));
                        return;
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        const newRecordKind = newRecordCommand();
                        if (newRecordKind) {
                          openNewRecordFromCommand(newRecordKind);
                          return;
                        }
                        if (runNavigationCommand()) return;
                        if (runCommandCreation()) return;
                        if (searchResults[searchActiveIndex]) openSearchResult(searchResults[searchActiveIndex]);
                      }
                    }}
                    placeholder="Search Atlas or type: task Clean dock"
                    aria-label="Find or create anything in Atlas"
                    style={{ border: 0, outline: 0, background: "transparent", flex: 1, minWidth: 0, fontSize: isMobile ? 17 : 19, color: colors.navy, fontWeight: 750 }}
                  />
                  <button type="button" onClick={startVoiceAssistant} title="Speak a request" aria-label="Speak to Atlas" style={{ border: 0, background: voiceAssistantListening ? "#FFF3C4" : "transparent", color: voiceAssistantListening ? colors.navy : colors.muted, width: 36, height: 36, borderRadius: 999, fontSize: 18, cursor: "pointer" }}>{voiceAssistantListening ? "●" : "🎤"}</button>
                  {query.trim() ? <button type="button" onClick={() => toggleSavedCommand()} title={savedCommands.some((item) => item.toLowerCase() === query.trim().toLowerCase()) ? "Remove saved command" : "Save this command"} aria-label="Save command" style={{ border: 0, background: "transparent", color: savedCommands.some((item) => item.toLowerCase() === query.trim().toLowerCase()) ? colors.gold2 : colors.muted, fontSize: 21, cursor: "pointer", padding: 4 }}>★</button> : null}
                  {!isMobile ? <span style={{ ...mutedSmallStyle, border: `1px solid ${colors.line}`, borderRadius: 7, padding: "4px 7px" }}>ESC</span> : null}
                  <button type="button" onClick={closeCommandCenter} aria-label="Close command center" style={{ ...secondaryButtonStyle, width: 38, minWidth: 38, height: 38, padding: 0, borderRadius: 999, fontSize: 20 }}>{closeSymbol}</button>
                </div>

                {voiceAssistantListening || voiceAssistantReviewReady ? (
                  <div style={{ padding: 14, background: voiceAssistantListening ? "#FFF9E8" : "#F2F8F5", borderBottom: `1px solid ${colors.line}`, display: "grid", gap: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: 999, flex: "0 0 auto", background: voiceAssistantListening ? "#D9473F" : "#2E8B68", boxShadow: voiceAssistantListening ? "0 0 0 5px rgba(217,71,63,.14)" : "none" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: "block", color: colors.navy, fontSize: 16 }}>{voiceAssistantListening ? "Atlas is listening" : voiceAssistantDraft ? `Review ${voiceAssistantDraft.kind}` : "Listening stopped"}</strong>
                        <span style={mutedSmallStyle}>{voiceAssistantListening ? "Speak naturally. Atlas will prepare an editable record." : voiceAssistantDraft ? "Check the details, make any changes, then save." : "Atlas did not create anything."}</span>
                      </div>
                      {voiceAssistantListening ? <button type="button" onClick={stopVoiceAssistant} style={{ ...goldButtonStyle, background: "#D9473F", whiteSpace: "nowrap" }}>Stop Listening</button> : null}
                    </div>

                    <div aria-live="polite" style={{ minHeight: voiceAssistantListening ? 46 : 0, padding: voiceAssistantListening ? "11px 12px" : "7px 10px", borderRadius: 10, border: `1px solid ${voiceAssistantListening ? "#E7C86D" : colors.line}`, background: "#FFFFFF", color: voiceAssistantTranscript ? colors.navy : colors.muted, fontSize: voiceAssistantListening ? 15 : 12, fontWeight: voiceAssistantListening ? 750 : 600 }}>
                      {voiceAssistantTranscript || (voiceAssistantListening ? "Waiting for you to speak…" : "Atlas did not hear a request.")}
                    </div>

                    {!voiceAssistantListening && voiceAssistantDraft ? (
                      <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 12, border: `1px solid ${colors.line}`, background: "#FFFFFF" }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0,1fr)", gap: 10 }}>
                          <label style={{ display: "grid", gap: 5 }}><span style={mutedSmallStyle}>Record type</span><select value={voiceAssistantDraft.kind} onChange={(event) => setVoiceAssistantDraft((current) => current ? { ...current, kind: event.currentTarget.value as "task" | "work order" | "project" } : current)} style={inputStyle}><option value="task">Task</option><option value="work order">Work Order</option><option value="project">Project</option></select></label>
                          <label style={{ display: "grid", gap: 5 }}><span style={mutedSmallStyle}>Title</span><input autoFocus value={voiceAssistantDraft.title} onChange={(event) => setVoiceAssistantDraft((current) => current ? { ...current, title: event.currentTarget.value } : current)} style={inputStyle} /></label>
                        </div>
                        {voiceAssistantDraft.kind !== "project" ? (
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
                            <label style={{ display: "grid", gap: 5 }}><span style={mutedSmallStyle}>Date</span><input type="date" value={voiceAssistantDraft.dueDate} onChange={(event) => setVoiceAssistantDraft((current) => current ? { ...current, dueDate: event.currentTarget.value } : current)} style={inputStyle} /></label>
                            <label style={{ display: "grid", gap: 5 }}><span style={mutedSmallStyle}>Assigned to</span><select value={voiceAssistantDraft.assignee} onChange={(event) => setVoiceAssistantDraft((current) => current ? { ...current, assignee: event.currentTarget.value as "Nick" | "Addison" } : current)} style={inputStyle}><option value="Nick">Nick</option><option value="Addison">Addison</option></select></label>
                            {voiceAssistantDraft.kind === "task" ? <label style={{ display: "grid", gap: 5 }}><span style={mutedSmallStyle}>Minutes</span><input type="number" min={5} step={5} value={voiceAssistantDraft.minutes} onChange={(event) => setVoiceAssistantDraft((current) => current ? { ...current, minutes: Math.max(5, Number(event.currentTarget.value) || 5) } : current)} style={inputStyle} /></label> : null}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", paddingTop: 2 }}>
                          <button type="button" onClick={cancelVoiceAssistant} style={secondaryButtonStyle}>Cancel</button>
                          <button type="button" onClick={startVoiceAssistant} style={secondaryButtonStyle}>🎤 Start Over</button>
                          <button type="button" onClick={saveVoiceAssistantDraft} style={goldButtonStyle}>Save {voiceAssistantDraft.kind === "task" ? "Task" : voiceAssistantDraft.kind === "work order" ? "Work Order" : "Project"}</button>
                        </div>
                      </div>
                    ) : !voiceAssistantListening ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" onClick={cancelVoiceAssistant} style={secondaryButtonStyle}>Cancel</button>
                        <button type="button" onClick={startVoiceAssistant} style={secondaryButtonStyle}>🎤 Try Again</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div style={{ overflowY: "auto", overscrollBehavior: "contain", display: voiceAssistantListening || voiceAssistantReviewReady ? "none" : "block" }}>
                  {query.trim() ? (
                    <>
                      {navigationCommand(query) ? <button type="button" onClick={() => runNavigationCommand()} style={{ ...searchResultStyle, padding: "13px 16px", background: "#EEF6FF", borderBottom: `1px solid ${colors.line}` }}><span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><strong>Open {navigationCommand(query)!.label}</strong><span style={searchTypeBadgeStyle}>GO</span></span><span style={mutedSmallStyle}>Context-aware Atlas command</span></button> : null}
                      {newRecordCommand(query) ? (
                        <button type="button" onClick={() => openNewRecordFromCommand(newRecordCommand(query)!)} style={{ ...searchResultStyle, padding: "13px 16px", background: "#FFF9E8", borderBottom: `1px solid ${colors.line}` }}>
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <strong>Open New {newRecordCommand(query) === "task" ? "Task" : newRecordCommand(query) === "work order" ? "Work Order" : "Project"}</strong>
                            <span style={searchTypeBadgeStyle}>NEW</span>
                          </span>
                        </button>
                      ) : null}
                      {commandCreation(query) ? (
                        <button type="button" onClick={() => runCommandCreation()} style={{ ...searchResultStyle, padding: "13px 16px", background: "#FFF9E8", borderBottom: `1px solid ${colors.line}` }}>
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <strong>Create {commandCreation(query)!.kind}: {commandCreation(query)!.title}</strong>
                            <span style={searchTypeBadgeStyle}>CREATE</span>
                          </span>
                          <span style={mutedSmallStyle}>Press Enter to create and open it.</span>
                        </button>
                      ) : null}
                      {searchResults.length ? (
                        <div style={{ display: "grid" }}>
                          {searchResults.slice(0, 14).map((result, index) => {
                            const taskResult = result.id.startsWith("task-");
                            const workResult = result.id.startsWith("wo-");
                            const vendorResult = result.id.startsWith("vendor-");
                            const projectResult = result.id.startsWith("project-");
                            const vehicleResult = result.id.startsWith("vehicle-");
                            const uploadResult = /^(asset|location|vendor|wo|project)-/.test(result.id);
                            return (
                              <div key={result.id} onMouseEnter={() => setSearchActiveIndex(index)} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "8px 10px 8px 14px", borderBottom: `1px solid ${colors.line}`, background: index === searchActiveIndex ? "#F3F7FC" : "#FFFFFF" }}>
                                <button type="button" onClick={() => openSearchResult(result)} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, minWidth: 0, cursor: "pointer" }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{highlightedSearchText(result.title)}</strong><span style={searchTypeBadgeStyle}>{result.type}</span></span>
                                  <span style={{ ...mutedSmallStyle, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>{result.subtitle}</span>
                                </button>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, flexWrap: "wrap" }}>
                                  {taskResult ? <><button type="button" title="Complete" onClick={() => runCommandQuickAction(result, "complete")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Done</button><button type="button" title="Assign to Addison" onClick={() => runCommandQuickAction(result, "addison")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Addison</button></> : null}
                                  {taskResult ? <><button type="button" title="Reschedule" onClick={() => runCommandQuickAction(result, "reschedule")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Date</button><button type="button" title="Create work order" onClick={() => runCommandQuickAction(result, "work-order")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>+ WO</button></> : null}
                                  {workResult ? <button type="button" title="Complete work order" onClick={() => runCommandQuickAction(result, "complete")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Done</button> : null}
                                  {(taskResult || workResult || projectResult) ? <button type="button" title="Add note" onClick={() => runCommandQuickAction(result, "note")} style={{ ...secondaryButtonStyle, width: 32, minWidth: 32, minHeight: 30, padding: 4 }}>＋</button> : null}
                                  {vehicleResult ? <button type="button" title="Mark vehicle cleaned" onClick={() => runCommandQuickAction(result, "complete")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Cleaned</button> : null}
                                  {vendorResult ? <button type="button" title="Contact vendor" onClick={() => runCommandQuickAction(result, "contact")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Contact</button> : null}
                                  {uploadResult ? <button type="button" title="Upload photo or document" onClick={() => runCommandQuickAction(result, "upload")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Upload</button> : null}
                                  {result.relatedIds?.length ? <button type="button" title="Open related record" onClick={() => runCommandQuickAction(result, "related")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 30, padding: "4px 7px", fontSize: 11 }}>Related</button> : null}
                                  <button type="button" title={commandPinnedIds.includes(result.id) ? "Unpin" : "Pin"} aria-label={commandPinnedIds.includes(result.id) ? `Unpin ${result.title}` : `Pin ${result.title}`} onClick={() => toggleCommandPin(result.id)} style={{ border: 0, background: "transparent", color: commandPinnedIds.includes(result.id) ? colors.gold2 : colors.muted, fontSize: 18, cursor: "pointer", padding: 4 }}>★</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : !navigationCommand(query) && !commandCreation(query) && !newRecordCommand(query) ? (
                        <div style={searchEmptyStyle}>No Atlas records match “{query.trim()}”. Try a record name or a creation command.</div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ padding: 14, display: "grid", gap: 14 }}>
                      <div>
                        <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Create anything</div>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
                          {([[
                            "task", "New Task", "task Clean dock",
                          ], [
                            "work order", "New Work Order", "work order Replace pump",
                          ], [
                            "project", "New Project", "project Patio Renovation",
                          ]] as const).map(([kind, label, example]) => (
                            <button key={kind} type="button" onClick={() => openNewRecordFromCommand(kind)} style={{ ...secondaryButtonStyle, minHeight: 66, textAlign: "left", justifyContent: "flex-start" }}>
                              <span><strong style={{ display: "block" }}>{label}</strong><small style={mutedSmallStyle}>{example}</small></span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...eyebrowStyle, marginBottom: 8 }}>Suggested here</div>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 8 }}>{commandContextSuggestions.slice(0, 4).map((suggestion) => <button key={suggestion.query} type="button" onClick={() => setQuery(suggestion.query)} style={{ ...secondaryButtonStyle, minHeight: 58, textAlign: "left", justifyContent: "flex-start" }}><span><strong style={{ display: "block" }}>{suggestion.label}</strong><small style={mutedSmallStyle}>{suggestion.detail}</small></span></button>)}</div>
                      </div>
                      {savedCommands.length ? <div><div style={{ ...eyebrowStyle, marginBottom: 6 }}>Saved Commands</div>{savedCommands.slice(0, 6).map((item) => <div key={`saved-command-${item}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 6, borderBottom: `1px solid ${colors.line}` }}><button type="button" onClick={() => setQuery(item)} style={{ ...searchResultStyle, borderBottom: 0 }}><strong>{item}</strong></button><button type="button" onClick={() => toggleSavedCommand(item)} title="Remove saved command" style={{ border: 0, background: "transparent", color: colors.gold2, fontSize: 18, cursor: "pointer" }}>★</button></div>)}</div> : null}
                      {recentSearches.length ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}><div style={eyebrowStyle}>Recent</div><button type="button" onClick={clearRecentSearches} style={{ border: 0, background: "transparent", color: colors.muted, cursor: "pointer" }}>Clear</button></div>
                          {recentSearches.slice(0, 4).map((item) => <button key={item} type="button" onClick={() => setQuery(item)} style={searchResultStyle}><strong>{item}</strong></button>)}
                        </div>
                      ) : null}
                      {commandPinnedIds.length ? (
                        <div>
                          <div style={{ ...eyebrowStyle, marginBottom: 6 }}>Pinned</div>
                          {buildSearchIndex().filter((item) => commandPinnedIds.includes(item.id)).sort((a, b) => commandPinnedIds.indexOf(a.id) - commandPinnedIds.indexOf(b.id)).slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => openSearchResult(item)} style={searchResultStyle}><span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{item.title}</strong><span style={searchTypeBadgeStyle}>{item.type}</span></span><small style={mutedSmallStyle}>{item.subtitle}</small></button>)}
                        </div>
                      ) : null}
                      <div style={{ ...mutedSmallStyle, padding: "2px 3px 4px" }}>Searches Tasks, Work Orders, Projects, Assets, Locations, Vendors, Contacts, Documents, Manuals, Photos, Timeline, and Calendar.</div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}


          {dashboardAssistantOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Ask Atlas"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 140,
                background: "rgba(7,27,47,0.48)",
                display: "flex",
                alignItems: isMobile ? "stretch" : "flex-end",
                justifyContent: "flex-end",
                padding: isMobile ? 0 : 24,
              }}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target)
                  closeAndResetAskAtlas();
              }}
            >
              <section
                style={{
                  width: isMobile ? "100%" : 430,
                  maxWidth: "100%",
                  height: isMobile ? "100%" : "min(650px, calc(100vh - 48px))",
                  background: colors.card,
                  borderRadius: isMobile ? 0 : 20,
                  border: isMobile ? "none" : `1px solid ${colors.line}`,
                  boxShadow: "0 28px 70px rgba(7,27,47,0.30)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <header
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "16px 18px",
                    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navy3} 100%)`,
                    color: "#FFFFFF",
                    borderBottom: `1px solid ${colors.gold}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <AtlasMiniMark size={38} />
                    <div>
                      <div style={{ ...eyebrowStyle, color: colors.gold2 }}>
                        Atlas
                      </div>
                      <strong style={{ fontSize: 17 }}>
                        Assistant
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeAndResetAskAtlas}
                    style={{
                      ...secondaryButtonStyle,
                      minWidth: 42,
                      minHeight: 42,
                      padding: 8,
                      background: "rgba(255,255,255,0.08)",
                      borderColor: "rgba(255,255,255,0.28)",
                      color: "#FFFFFF",
                    }}
                    aria-label="Close Atlas"
                  >
                    {closeSymbol}
                  </button>
                </header>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 18,
                    display: "grid",
                    alignContent: "start",
                    gap: 10,
                  }}
                >
                  {!assistantTurns.length ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        alignContent: "start",
                      }}
                    >
                      <div style={{ ...eyebrowStyle }}>Ask Atlas</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                          gap: 8,
                        }}
                      >
                        {[
                          {
                            label: "Find Something",
                            detail: "Assets, vendors, work, notes, and records",
                            action: () => setAssistantQuestion("Find "),
                          },
                          {
                            label: "As-Builts & Blueprints",
                            detail: "Ask what the property drawings show",
                            action: () => {
                              const prompt =
                                "Show me the as-builts and blueprints available for this property.";
                              setAssistantQuestion(prompt);
                              void askAtlas(prompt);
                            },
                          },
                          {
                            label: "Manuals",
                            detail: "Ask questions from saved equipment manuals",
                            action: () => {
                              const prompt =
                                "Show me the saved manuals available for this property.";
                              setAssistantQuestion(prompt);
                              void askAtlas(prompt);
                            },
                          },
                          {
                            label: "Mechanical Room",
                            detail: "Assets, drawings, manuals, and history",
                            action: () =>
                              setAssistantQuestion("In the mechanical room, "),
                          },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={item.action}
                            style={{
                              ...secondaryButtonStyle,
                              minHeight: isMobile ? 64 : 68,
                              padding: "9px 10px",
                              textAlign: "left",
                              justifyContent: "flex-start",
                              alignItems: "flex-start",
                              whiteSpace: "normal",
                            }}
                          >
                            <span>
                              <strong
                                style={{
                                  display: "block",
                                  color: colors.navy,
                                  marginBottom: 2,
                                }}
                              >
                                {item.label}
                              </strong>
                              <small
                                style={{
                                  ...mutedSmallStyle,
                                  lineHeight: 1.25,
                                }}
                              >
                                {item.detail}
                              </small>
                            </span>
                          </button>
                        ))}
                      </div>

                      <div
                        style={{
                          ...noticeStyle,
                          padding: "9px 10px",
                          lineHeight: 1.35,
                        }}
                      >
                        Ask naturally — for example, “What is Pump 6 in the mechanical room?”
                      </div>
                    </div>
                  ) : (
                    assistantTurns.slice(-8).map((turn) => (
                      <div
                        key={turn.id}
                        style={{
                          display: "flex",
                          justifyContent:
                            turn.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "88%",
                            padding: "6px 8px",
                            borderRadius:
                              turn.role === "user"
                                ? "14px 14px 4px 14px"
                                : "14px 14px 14px 4px",
                            background:
                              turn.role === "user" ? colors.navy : colors.panel,
                            color:
                              turn.role === "user" ? "#FFFFFF" : colors.navy,
                            border: `1px solid ${turn.role === "user" ? colors.navy : colors.line}`,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.5,
                          }}
                        >
                          {turn.text}
                        </div>
                      </div>
                    ))
                  )}

                  {assistantLoading ? (
                    <div style={{ ...noticeStyle }}>
                      Atlas is searching your property records…
                    </div>
                  ) : null}

                  {assistantRecordResults.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div
                        style={{
                          ...eyebrowStyle,
                          color: colors.muted,
                          marginTop: 2,
                        }}
                      >
                        Possible Matches
                      </div>
                      {assistantRecordResults.slice(0, 4).map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setDashboardAssistantOpen(false);
                            openSearchResult(result);
                          }}
                          style={{
                            ...searchResultStyle,
                            border: `1px solid ${colors.line}`,
                            borderRadius: 10,
                            padding: 10,
                            background: colors.card,
                          }}
                        >
                          <strong>{result.title}</strong>
                          <div style={mutedSmallStyle}>
                            {result.type} · {result.subtitle}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {assistantTurns.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[
                        "Show me the source",
                        "What do the as-builts show?",
                        "Which manual covers this?",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setAssistantQuestion(prompt);
                            void askAtlas(prompt);
                          }}
                          style={{
                            ...secondaryButtonStyle,
                            padding: "5px 7px",
                            fontSize: 12,
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <footer
                  style={{
                    padding: 14,
                    borderTop: `1px solid ${colors.line}`,
                    background: colors.panel,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) auto",
                      gap: 8,
                    }}
                  >
                    <input
                      value={assistantQuestion}
                      onChange={(event) =>
                        setAssistantQuestion(event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !assistantLoading &&
                          assistantQuestion.trim()
                        ) {
                          void askAtlas();
                        }
                      }}
                      placeholder="Ask about your property..."
                      style={{ ...inputStyle, width: "100%", minHeight: 46 }}
                      autoFocus={!isMobile}
                    />
                    <button
                      type="button"
                      disabled={assistantLoading || !assistantQuestion.trim()}
                      onClick={() => void askAtlas()}
                      style={{
                        ...goldButtonStyle,
                        opacity:
                          assistantLoading || !assistantQuestion.trim()
                            ? 0.6
                            : 1,
                      }}
                    >
                      {assistantLoading ? "Working..." : "Ask"}
                    </button>
                  </div>
                </footer>
              </section>
            </div>
          ) : null}
        </>
      ) : null}

      {previewFile ? renderFilePreviewOverlay() : null}

      {quickToolsOpen ? (
        <div style={quickToolsOverlayStyle}>
          <div style={quickToolsPanelStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={eyebrowStyle}>Quick Tools</div>
                <h2 style={{ ...detailTitleStyle, marginBottom: 0 }}>
                  Calculator
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQuickToolsOpen(false)}
                style={secondaryButtonStyle}
              >
                Close
              </button>
            </div>

            <input
              value={calculatorValue}
              onChange={(event) =>
                setCalculatorValue(event.currentTarget.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") calculateExpression();
              }}
              placeholder="Example: 1250 + 375"
              inputMode="decimal"
              style={{ ...inputStyle, fontSize: 22, textAlign: "right" }}
            />
            <div style={calculatorDisplayStyle}>{calculatorResult}</div>
            <div style={calculatorGridStyle}>
              {[
                "C",
                "(",
                ")",
                "⌫",
                "7",
                "8",
                "9",
                "/",
                "4",
                "5",
                "6",
                "*",
                "1",
                "2",
                "3",
                "-",
                "0",
                ".",
                "%",
                "+",
              ].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => calculatorKey(key)}
                  style={calculatorKeyStyle}
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={() => calculatorKey("=")}
                style={{ ...goldButtonStyle, gridColumn: "1 / -1" }}
              >
                =
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveToast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...saveToastStyle,
            bottom: isMobile ? 88 : 24,
            borderColor: saveToast.tone === "success" ? "#9FD6B8" : "#E7C46A",
            background: saveToast.tone === "success" ? "#F0FBF5" : "#FFF8E8",
          }}
        >
          <span style={saveToastCheckStyle}>
            {saveToast.tone === "success" ? "✓" : "!"}
          </span>
          <div style={{ minWidth: 0 }}>
            <strong>
              {saveToast.tone === "success" ? "Saved" : "Saved locally"}
            </strong>
            <p style={saveToastMessageStyle}>{saveToast.message}</p>
          </div>
        </div>
      ) : null}

    </main>
  );
}






const quickToolsOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 280,
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "rgba(7,27,47,0.72)",
};

const quickToolsPanelStyle: React.CSSProperties = {
  width: "min(420px, 100%)",
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 20,
  border: `1px solid ${colors.line}`,
  background: colors.card,
  boxShadow: "0 28px 80px rgba(0,0,0,0.34)",
};

const calculatorDisplayStyle: React.CSSProperties = {
  minHeight: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${colors.line}`,
  background: colors.panel,
  color: colors.navy,
  fontSize: 30,
  fontWeight: 950,
  overflowWrap: "anywhere",
};

const calculatorGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 9,
};

const calculatorKeyStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
};

const saveToastStyle: React.CSSProperties = {
  position: "fixed",
  right: 22,
  zIndex: 260,
  width: "min(360px, calc(100vw - 32px))",
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  border: "1px solid #9FD6B8",
  borderRadius: 14,
  color: colors.navy,
  boxShadow: "0 18px 48px rgba(7,27,47,0.22)",
};

const saveToastCheckStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 950,
};

const saveToastMessageStyle: React.CSSProperties = {
  margin: "3px 0 0",
  color: colors.muted,
  fontSize: 11,
  lineHeight: 1.35,
};

const previewOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(7,27,47,0.72)",
  padding: 18,
  display: "grid",
  placeItems: "center",
};

const previewPanelStyle: React.CSSProperties = {
  width: "min(1040px, 96vw)",
  height: "min(860px, 92vh)",
  background: colors.card,
  borderRadius: 22,
  border: `1px solid ${colors.line}`,
  boxShadow: "0 30px 80px rgba(0,0,0,0.34)",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
};

const previewHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: `1px solid ${colors.line}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const previewBodyStyle: React.CSSProperties = {
  minHeight: 0,
  overflow: "auto",
  background: colors.panel,
  padding: 16,
  display: "block",
  textAlign: "center",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  touchAction: "pan-x pan-y",
};

const previewImageStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  borderRadius: 14,
  background: "#FFFFFF",
};

const previewFrameStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 620,
  border: 0,
  borderRadius: 14,
  background: "#FFFFFF",
};



const mobileHeaderShellStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navy2} 100%)`,
  color: "#FFFFFF",
  padding: "12px 14px",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  zIndex: 40,
  boxShadow: "0 14px 35px rgba(7,27,47,0.20)",
};

const mobileBrandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginBottom: 3,
};

const mobileLogoBoxStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 12,
  background: colors.gold,
  border: `1px solid ${colors.gold}`,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
};

const mobileBrandTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 16,
  letterSpacing: .8,
  lineHeight: 1,
};

const mobileMenuRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
};

const mobileMenuSelectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 15,
  fontWeight: 900,
  outline: "none",
};

const mobileTopbarStyle: React.CSSProperties = {
  background: "transparent",
  padding: "8px 8px 2px",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const mobilePageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const mobileContentStyle: React.CSSProperties = {
  padding: "7px 7px calc(88px + env(safe-area-inset-bottom))",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const mobileBottomNavStyle: React.CSSProperties = {
  position: "fixed",
  left: 6,
  right: 6,
  bottom: "calc(6px + env(safe-area-inset-bottom))",
  maxWidth: "calc(100vw - 16px)",
  boxSizing: "border-box",
  zIndex: 60,
  background: "rgba(255,255,255,0.96)",
  border: `1px solid ${colors.line}`,
  borderRadius: 17,
  boxShadow: "0 14px 34px rgba(15,23,42,0.18)",
  padding: 5,
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 3,
  backdropFilter: "blur(12px)",
};

const mobileBottomButtonStyle: React.CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 12,
  padding: "7px 3px",
  fontSize: 11,
  fontWeight: 950,
  cursor: "pointer",
  minHeight: 40,
};

const appStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  background: colors.bg,
  color: colors.text,
  fontFamily:
    'Inter, "Aptos", "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  fontSize: 15,
  lineHeight: 1.5,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const desktopAppStyle: React.CSSProperties = {
  ...appStyle,
  maxWidth: "none",
  overflowX: "visible",
};

const desktopContentStyle: React.CSSProperties = {
  padding: 18,
  minWidth: 0,
  width: "100%",
  overflow: "visible",
};

const sidebarStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navy2} 100%)`,
  color: "#FFFFFF",
  padding: "7px 8px",
  top: 0,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "hidden",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 5,
};

const logoBoxStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: "#FFFFFF",
  border: "1px solid rgba(255,255,255,.22)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  boxShadow: "0 8px 22px rgba(0,0,0,0.16)",
};

const logoImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: 3,
};

const logoFallbackStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 21,
  color: colors.navy,
};

const brandTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 16,
  letterSpacing: 1.1,
  lineHeight: 1,
};

const brandSubStyle: React.CSSProperties = {
  color: "#D6E2EE",
  fontSize: 10,
  fontWeight: 850,
};

const sidebarNavStyle: React.CSSProperties = {
  display: "grid",
  gap: "clamp(2px, 0.35vh, 4px)",
  minHeight: 0,
};

const sidebarNavSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 1,
};

const sidebarNavHeaderStyle: React.CSSProperties = {
  color: colors.gold2,
  fontSize: "clamp(12px, 1.65vh, 14px)",
  fontWeight: 950,
  letterSpacing: 0.9,
  lineHeight: 1,
  padding: "2px 6px 1px",
  textTransform: "uppercase",
};

const sidebarNavItemsStyle: React.CSSProperties = {
  display: "grid",
  gap: 0,
};

const navButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid transparent",
  borderRadius: 9,
  padding: "6px 9px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "clamp(12px, 1.5vh, 14px)",
  lineHeight: 1.2,
  minHeight: 34,
  display: "flex",
  alignItems: "center",
  transition: "background-color 150ms ease, border-color 150ms ease",
};

const reviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const intakeLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.9fr) minmax(360px, 1.1fr)",
  gap: 16,
  alignItems: "start",
};

const uploadButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: `linear-gradient(135deg, ${colors.gold2}, ${colors.gold})`,
  color: colors.navy,
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 950,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const secondaryUploadButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy3,
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const fileTileStyle: React.CSSProperties = {
  height: 110,
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  background: colors.panel,
  display: "grid",
  placeItems: "center",
  color: colors.navy3,
  fontWeight: 900,
  letterSpacing: 1,
};

const tinyDangerButtonStyle: React.CSSProperties = {
  border: `1px solid #FACACA`,
  background: "#FEECEC",
  color: colors.red,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: colors.card,
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 5px 18px rgba(15, 35, 55, 0.055)",
};

const emptyStateStyle: React.CSSProperties = {
  border: `1px dashed ${colors.line}`,
  background: colors.panel,
  borderRadius: 14,
  padding: 18,
  color: colors.muted,
  fontSize: 14,
  lineHeight: 1.5,
  fontWeight: 700,
  marginTop: 14,
};

const tinyButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy3,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
};

const scannerLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)",
  gap: 16,
  alignItems: "start",
};

const scannerPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const scannerReaderStyle: React.CSSProperties = {
  minHeight: 380,
  width: "100%",
  border: `1px solid ${colors.line}`,
  borderRadius: 24,
  overflow: "hidden",
  background: colors.navy,
  display: "grid",
  placeItems: "center",
};

const scannerSideStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};












const topbarStyle: React.CSSProperties = {
  background: "transparent",
  padding: "26px 24px 6px",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 32,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const headerSubStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 15,
  margin: "5px 0 0",
  lineHeight: 1.4,
};

const stackStyle: React.CSSProperties = { display: "grid", gap: 16 };
const listStyle: React.CSSProperties = { display: "grid", gap: 10 };
const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-start",
};

const calendarNavyShellStyle: React.CSSProperties = {
  background: colors.navy,
  border: `1px solid ${colors.navy3}`,
  borderRadius: 24,
  padding: 12,
  boxShadow: "0 22px 55px rgba(7,27,47,0.22)",
  width: "100%",
  maxWidth: "none",
  height: "auto",
  minHeight: 0,
  overflow: "visible",
};

const sectionNavyBackdropStyle: React.CSSProperties = {
  background: "#F3F6F9",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 14,
  boxShadow: "none",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const calendarWhitePanelStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 22,
  padding: 16,
  boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
};

const calendarMonthWhitePanelStyle: React.CSSProperties = {
  ...calendarWhitePanelStyle,
  padding: 12,
  height: "auto",
  minHeight: 0,
  overflowY: "visible",
  overflowX: "hidden",
  width: "100%",
  maxWidth: "none",
};


const calendarWhiteDrawerStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 10,
  boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
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


const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
  gap: 14,
};








const detailTitleStyle: React.CSSProperties = {
  margin: "4px 0 14px",
  color: colors.navy,
  fontSize: 23,
  fontWeight: 950,
  letterSpacing: "-0.03em",
  wordBreak: "break-word",
};

const editorHeaderStyle: React.CSSProperties = {
  margin: "0 0 10px",
  padding: "0 0 8px",
  borderBottom: `2px solid ${colors.gold}`,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
  lineHeight: 1.15,
  wordBreak: "break-word",
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
  fontSize: 14,
  margin: "4px 0 0",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const fieldLabelStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.01em",
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 15,
  lineHeight: 1.4,
  color: colors.text,
  background: "#FFFFFF",
  outline: "none",
  fontFamily: "inherit",
  minWidth: 0,
  fontWeight: 500,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 11,
  marginBottom: 14,
  minWidth: 0,
};

const rowButtonStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 12,
  padding: "12px 13px",
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  boxShadow: "none",
  overflow: "hidden",
  wordBreak: "break-word",
};


const goldButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
  color: colors.navy,
  borderRadius: 10,
  padding: "10px 15px",
  minHeight: 40,
  fontSize: 13,
  lineHeight: 1.15,
  fontWeight: 900,
  letterSpacing: 0.1,
  cursor: "pointer",
  boxShadow: "0 2px 7px rgba(15,35,55,0.08)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #C8D4DE",
  background: "#FFFFFF",
  color: colors.navy,
  borderRadius: 10,
  padding: "9px 13px",
  minHeight: 38,
  fontSize: 13,
  lineHeight: 1.15,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(15,35,55,0.05)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const compactUtilityButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  width: "auto",
  minWidth: 0,
  minHeight: 26,
  borderRadius: 8,
  padding: "3px 7px",
  fontSize: 10,
  lineHeight: 1,
  fontWeight: 750,
  color: colors.navy3,
  boxShadow: "none",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #FACACA",
  background: "#FEECEC",
  color: colors.red,
  borderRadius: 13,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const noticeStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 14,
  color: colors.text,
  lineHeight: 1.5,
  minWidth: 0,
  wordBreak: "break-word",
};




















const workLinkLogoFallbackStyle: React.CSSProperties = {
  gridArea: "1 / 1",
};




const ownerRequestPortalCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  alignItems: "center",
  padding: 20,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  background: colors.card,
  boxShadow: "0 12px 28px rgba(7, 27, 47, 0.07)",
};

const ownerRequestQrShellStyle: React.CSSProperties = {
  width: 190,
  maxWidth: "100%",
  justifySelf: "center",
  padding: 10,
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
};

const ownerRequestQrImageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  borderRadius: 10,
};

const qrControlPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginBottom: 14,
};

const qrTypeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
  gap: 10,
};

const qrTypeButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: "12px 14px",
  display: "grid",
  gap: 3,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const qrSummaryStyle: React.CSSProperties = {
  ...noticeStyle,
  marginBottom: 14,
};

const qrGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
  gap: 14,
};

const qrCardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "150px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.05)",
};

const qrImageShellStyle: React.CSSProperties = {
  width: 150,
  height: 150,
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const qrImageStyle: React.CSSProperties = {
  width: 136,
  height: 136,
  objectFit: "contain",
};

const qrCardBodyStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 9,
};

const qrCardTitleStyle: React.CSSProperties = {
  margin: "2px 0 0",
  color: colors.navy,
  fontSize: 18,
  fontWeight: 950,
  lineHeight: 1.12,
};

const qrDetailStyle: React.CSSProperties = {
  margin: 0,
  color: colors.text,
  fontSize: 12,
  lineHeight: 1.45,
};

const qrUrlStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
  lineHeight: 1.25,
  wordBreak: "break-all",
};



const workLinkLogoLargeStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
  fontWeight: 950,
  letterSpacing: 0.5,
  overflow: "hidden",
};

const workLinkLogoImageLargeStyle: React.CSSProperties = {
  gridArea: "1 / 1",
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "transparent",
  borderRadius: 16,
};





const mapShellStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  background: "#E6ECF2",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
  touchAction: "none",
};

const mapImageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  userSelect: "none",
  pointerEvents: "none",
};

const mapPinStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  border: "2px solid",
  borderRadius: 999,
  boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
  fontWeight: 950,
  cursor: "grab",
  whiteSpace: "nowrap",
  fontSize: 12,
  padding: "7px 9px",
};







const mapBoxHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center",
};

const mapBoxTitleInputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 10,
  background: "#FFFFFF",
  color: colors.navy,
  padding: "7px 9px",
  fontSize: 12,
  fontWeight: 900,
  outline: "none",
};

const mapBoxTextareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 70,
  resize: "vertical",
  fontSize: 13,
};

const mapBoxRemoveButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  background: "#FFFFFF",
  color: colors.muted,
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 850,
  cursor: "pointer",
};

const smallSubtleButtonStyle: React.CSSProperties = {
  border: "1px solid #C8D4DE",
  borderRadius: 9,
  background: "#FFFFFF",
  color: colors.navy,
  padding: "7px 10px",
  minHeight: 32,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const mapVendorChipListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const mapVendorChipStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  borderRadius: 999,
  background: "#FFFAEB",
  color: colors.navy,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapInfoPanelStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
  overflow: "hidden",
  boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
};

const mapInfoHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: 0,
};

const mapInfoTitleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "14px 16px",
};

const mapInfoTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const mapInfoIconRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const mapIconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: colors.navy,
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const mapHeaderPhotoShellStyle: React.CSSProperties = {
  position: "relative",
  height: 150,
  overflow: "hidden",
  borderTop: `1px solid ${colors.line}`,
  borderBottom: `1px solid ${colors.line}`,
  background: colors.panel,
};

const mapHeaderPhotoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const mapHeaderPhotoChangeStyle: React.CSSProperties = {
  position: "absolute",
  right: 10,
  bottom: 10,
  border: `1px solid rgba(255,255,255,0.75)`,
  borderRadius: 999,
  background: "rgba(2, 28, 53, 0.78)",
  color: "#FFFFFF",
  padding: "6px 9px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const mapHeaderPhotoEmptyStyle: React.CSSProperties = {
  height: 76,
  borderTop: `1px solid ${colors.line}`,
  borderBottom: `1px solid ${colors.line}`,
  background: colors.panel,
  color: colors.muted,
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapPanelTabsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  borderBottom: `1px solid ${colors.line}`,
};

const mapPanelTabStyle: React.CSSProperties = {
  border: "none",
  borderBottom: "2px solid transparent",
  background: "#FFFFFF",
  color: colors.muted,
  padding: "12px 6px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapPanelTabActiveStyle: React.CSSProperties = {
  ...mapPanelTabStyle,
  color: colors.gold,
  borderBottomColor: colors.gold,
};

const mapPanelBodyStyle: React.CSSProperties = {
  padding: 14,
};

const mapPanelFormStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 13,
};

const mapTabListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const mapTabEditorStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 13,
  background: "#FFFFFF",
  padding: 10,
  display: "grid",
  gap: 8,
};

const mapAddTabButtonStyle: React.CSSProperties = {
  border: `1px dashed ${colors.line}`,
  borderRadius: 13,
  background: "#FFFFFF",
  color: colors.navy,
  padding: "11px 12px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};





const mapEmptyNoteStyle: React.CSSProperties = {
  margin: 0,
  color: colors.muted,
  fontSize: 12,
  lineHeight: 1.4,
};

const dangerMiniButtonStyle: React.CSSProperties = {
  border: "1px solid #FACACA",
  borderRadius: 999,
  background: "#FEECEC",
  color: colors.red,
  padding: "6px 9px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const searchDropStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  width: "min(680px, calc(100vw - 24px))",
  minWidth: 320,
  maxWidth: "calc(100vw - 24px)",
  maxHeight: "70vh",
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  boxShadow: "0 20px 45px rgba(11,30,51,0.18)",
  overflowY: "auto",
  overflowX: "hidden",
  zIndex: 50,
};

const searchResultStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  width: "100%",
  padding: 12,
  border: 0,
  borderBottom: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
};

const searchTypeBadgeStyle: React.CSSProperties = {
  borderRadius: 999,
  background: "#EEF4FF",
  color: colors.navy3,
  padding: "3px 8px",
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const searchEmptyStyle: React.CSSProperties = {
  padding: 16,
  color: colors.muted,
  fontSize: 13,
  textAlign: "center",
};


const photoDeleteButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #F1B8B4",
  borderRadius: 9,
  padding: "7px 9px",
  background: "#FFF1F0",
  color: colors.red,
  fontSize: 11,
  fontWeight: 950,
  cursor: "pointer",
};



const manualDeleteButtonStyle: React.CSSProperties = {
  border: "1px solid #F1B8B4",
  borderRadius: 999,
  padding: "7px 9px",
  background: "#FFF1F0",
  color: colors.red,
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
};

const contactListShellStyle: React.CSSProperties = {
  display: "grid",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const contactRowStyle: React.CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  border: "1px solid transparent",
  borderBottom: `1px solid ${colors.line}`,
  borderRadius: 0,
  background: "#FFFFFF",
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const contactAvatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 13,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 950,
  letterSpacing: 0.4,
};

const contactAvatarLargeStyle: React.CSSProperties = {
  width: 70,
  height: 70,
  flex: "0 0 70px",
  display: "grid",
  placeItems: "center",
  borderRadius: 18,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: 950,
  letterSpacing: 0.7,
};

const contactNameStyle: React.CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const contactSecondaryLineStyle: React.CSSProperties = {
  ...mutedSmallStyle,
  margin: "3px 0 0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const contactDetailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};







const workOrderListBadgesStyle: React.CSSProperties = {
  flex: "0 0 auto",
  display: "grid",
  justifyItems: "end",
  gap: 6,
};

const recurringBadgeStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: `1px solid ${colors.gold}`,
  borderRadius: 999,
  background: "#FFF8E8",
  color: colors.navy,
  fontSize: 9,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const recurrenceToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 40,
  padding: "9px 11px",
  border: `1px solid ${colors.line}`,
  borderRadius: 11,
  background: colors.panel,
  color: colors.navy,
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
};

const recurrenceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
};

const recurrenceHistoryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  padding: 11,
  borderRadius: 11,
  background: colors.panel,
};

const detailSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 6,
  border: `1px solid ${colors.line}`,
  borderRadius: 13,
  background: "#FFFFFF",
};

const detailSectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  flexWrap: "wrap",
};

const recordInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 5,
  marginTop: 3,
};

const recordInfoItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  padding: 5,
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: colors.panel,
};

const recordNotesStyle: React.CSSProperties = {
  margin: "6px 0 0",
  padding: 5,
  borderRadius: 9,
  background: colors.panel,
  color: colors.text,
  lineHeight: 1.25,
  whiteSpace: "pre-wrap",
};

const compactUploadButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  minWidth: "max-content",
  minHeight: 30,
  padding: "6px 9px",
  border: `1px solid ${colors.gold}`,
  borderRadius: 11,
  background: colors.gold,
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
  wordBreak: "keep-all",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  cursor: "pointer",
};


const compactLinkedListStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  maxHeight: 120,
  overflowY: "auto",
  paddingRight: 3,
};

const compactLinkedRowStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 8px",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: colors.panel,
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const linkedOpenLabelStyle: React.CSSProperties = {
  flex: "0 0 auto",
  color: colors.navy3,
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const assetFileListRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 5,
};


const assetFileDeleteButtonStyle: React.CSSProperties = {
  border: "1px solid #F1B8B4",
  borderRadius: 9,
  padding: "6px 8px",
  background: "#FFF1F0",
  color: colors.red,
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
};

const assetActionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 5,
  flexWrap: "wrap",
  flexShrink: 0,
  margin: 0,
};

const assetActionButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  borderRadius: 8,
  padding: "5px 8px",
  minHeight: 28,
  fontSize: 11,
  fontWeight: 850,
  lineHeight: 1,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const assetPrimaryActionButtonStyle: React.CSSProperties = {
  ...assetActionButtonStyle,
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
};


const assetListControlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const assetSortSelectStyle: React.CSSProperties = {
  minHeight: 38,
  padding: "8px 34px 8px 12px",
  border: `1px solid ${colors.line}`,
  borderRadius: 10,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const assetAlphabeticalListStyle: React.CSSProperties = {
  display: "grid",
  gap: 0,
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: "#FFFFFF",
};

const assetListRowStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 48,
  display: "flex",
  alignItems: "center",
  padding: "7px 10px",
  border: "none",
  borderBottom: `1px solid ${colors.line}`,
  borderLeft: "3px solid transparent",
  background: "#FFFFFF",
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const assetListThumbStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  flex: "0 0 32px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  borderRadius: 8,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 950,
};

const assetListNameStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 13,
  fontWeight: 850,
};

const assetFixedPanelStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "auto auto auto auto auto",
  gap: 5,
  padding: 0,
  boxSizing: "border-box",
};

const assetPanelTitleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
  padding: "0 1px 4px",
  borderBottom: `1px solid ${colors.line}`,
};

const assetPanelTitleStyle: React.CSSProperties = {
  margin: "0 0 2px",
  color: colors.navy,
  fontSize: 18,
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const assetEditButtonStyle: React.CSSProperties = {
  ...assetActionButtonStyle,
  minHeight: 34,
  padding: "8px 12px",
  borderColor: colors.navy,
  background: colors.navy,
  color: "#FFFFFF",
};

const assetTopGridStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 5,
  alignItems: "stretch",
};

const assetHeroPhotoStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 92,
  maxHeight: 132,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  padding: 0,
  border: `1px solid ${colors.line}`,
  borderRadius: 9,
  background: colors.panel,
  color: colors.navy,
  fontSize: 42,
  fontWeight: 950,
  cursor: "pointer",
};

const assetHeroPhotoImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 92,
  maxHeight: 132,
  display: "block",
  objectFit: "cover",
  background: "#FFFFFF",
};

const assetCardStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  alignContent: "start",
  gap: 8,
  padding: 10,
  border: `1px solid ${colors.line}`,
  borderRadius: 10,
  background: colors.panel,
  overflow: "hidden",
};

const assetCardHeaderStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 5,
  color: colors.navy,
  fontSize: 11,
  wordBreak: "normal",
  overflowWrap: "normal",
};

const assetCardHintStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
  fontWeight: 750,
};

const assetInformationGridStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  columnGap: 10,
  rowGap: 0,
};

const assetInfoItemStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 21,
  display: "grid",
  gridTemplateColumns: "minmax(72px, 40%) minmax(0, 1fr)",
  alignItems: "center",
  gap: 4,
};

const assetInfoLabelStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 9,
  fontWeight: 900,
};

const assetInfoValueStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: colors.text,
  fontSize: 10,
  fontWeight: 750,
};

const assetInlineEditorStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 3,
  alignItems: "center",
};

const assetCompactInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 28,
  boxSizing: "border-box",
  padding: "4px 7px",
  border: `1px solid ${colors.line}`,
  borderRadius: 7,
  background: "#FFFFFF",
  color: colors.text,
  fontSize: 11,
  fontWeight: 750,
};

const assetClearFieldButtonStyle: React.CSSProperties = {
  width: 25,
  height: 25,
  minHeight: 25,
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: "1px solid #F1B8B4",
  borderRadius: 7,
  background: "#FFF7F6",
  color: colors.red,
  fontSize: 15,
  cursor: "pointer",
};

const assetVendorBlockStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr)",
  alignItems: "center",
  gap: 6,
  paddingTop: 4,
  marginTop: 3,
  borderTop: `1px solid ${colors.line}`,
};

const assetVendorRowStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "wrap",
};

const assetVendorChipStyle: React.CSSProperties = {
  maxWidth: "100%",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 7px",
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  background: colors.panel,
  color: colors.navy,
  fontSize: 10,
  fontWeight: 850,
};

const assetVendorRemoveStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  minHeight: 16,
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: 0,
  borderRadius: 999,
  background: "transparent",
  color: colors.red,
  cursor: "pointer",
};

const assetAddVendorSelectStyle: React.CSSProperties = {
  minHeight: 27,
  padding: "4px 22px 4px 7px",
  border: `1px dashed ${colors.navy3}`,
  borderRadius: 8,
  background: "#FFFFFF",
  color: colors.navy3,
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const assetMiddleGridStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  width: "100%",
  display: "grid",
  gap: 10,
};

const assetIconButtonStyle: React.CSSProperties = {
  width: 25,
  height: 25,
  minHeight: 25,
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: 0,
  borderRadius: 7,
  background: "transparent",
  color: colors.navy3,
  cursor: "pointer",
};

const assetNotesEditorStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 50,
  maxHeight: 62,
  resize: "none",
  boxSizing: "border-box",
  padding: 7,
  border: `1px solid ${colors.line}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 11,
  lineHeight: 1.35,
};

const assetNotesTextStyle: React.CSSProperties = {
  margin: 0,
  color: colors.text,
  fontSize: 11,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "normal",
  overflowWrap: "anywhere",
};

const assetPhotoHeaderActionsStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 4,
};

const assetTinyButtonStyle: React.CSSProperties = {
  minHeight: 27,
  padding: "5px 8px",
  border: `1px solid ${colors.line}`,
  borderRadius: 7,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const assetTinyUploadStyle: React.CSSProperties = {
  ...assetTinyButtonStyle,
  display: "inline-flex",
  alignItems: "center",
  borderColor: colors.gold,
  color: colors.navy3,
};






const assetPhotoLabelButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  minHeight: 20,
  display: "grid",
  placeItems: "center",
  padding: 0,
  border: 0,
  background: "transparent",
  color: colors.navy3,
  cursor: "pointer",
};

const assetPhotoDeleteIconStyle: React.CSSProperties = {
  ...assetPhotoLabelButtonStyle,
  color: colors.red,
};

const assetEmptyStateStyle: React.CSSProperties = {
  padding: "6px 8px",
  border: `1px dashed ${colors.line}`,
  borderRadius: 8,
  background: colors.panel,
  color: colors.muted,
  fontSize: 10,
  fontWeight: 750,
};

const assetHistoryHeaderActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const assetHistoryOrderStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: `1px solid ${colors.line}`,
  borderRadius: 7,
  color: colors.muted,
  fontSize: 9,
  fontWeight: 850,
  whiteSpace: "nowrap",
};





const assetPanelFooterStyle: React.CSSProperties = {
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "start",
  gap: 10,
  paddingTop: 8,
  paddingBottom: 4,
  borderTop: `1px solid ${colors.line}`,
};

const assetFileSummaryStyle: React.CSSProperties = {
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  alignContent: "flex-start",
  gap: 7,
  rowGap: 8,
  flexWrap: "wrap",
  position: "relative",
  zIndex: 2,
  color: colors.navy,
  fontSize: 11,
  wordBreak: "normal",
  overflowWrap: "normal",
};

const assetDeleteBottomButtonStyle: React.CSSProperties = {
  minHeight: 34,
  width: "fit-content",
  maxWidth: "100%",
  justifySelf: "end",
  padding: "7px 12px",
  border: "1px solid #E5484D",
  borderRadius: 8,
  background: "#FFFFFF",
  color: colors.red,
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
};












const recordListIdentityStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 11,
};


const recordListThumbImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const vendorLogoThumbStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  flex: "0 0 44px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
};

const vendorLogoLargeStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  flex: "0 0 72px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 18,
  fontWeight: 950,
};

const vendorLogoImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const vendorDetailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};







const manualCompactFileStyle: React.CSSProperties = {
  justifySelf: "end",
  minWidth: 56,
  padding: "7px 10px",
  borderRadius: 999,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 950,
  textAlign: "center",
  textDecoration: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};


const manualInlineFormHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const calendarControlPanelStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
  display: "grid",
  gap: 12,
};

const calendarCompactControlPanelStyle: React.CSSProperties = {
  ...calendarControlPanelStyle,
  padding: 8,
  gap: 7,
  borderRadius: 13,
};



const calendarFilterDropdownStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  borderRadius: 14,
  padding: 0,
  overflow: "hidden",
};

const calendarFilterSummaryStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "11px 13px",
  color: colors.navy,
  fontSize: 13,
  fontWeight: 950,
  listStyle: "none",
};

const calendarFilterListStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  borderTop: `1px solid ${colors.line}`,
  padding: 10,
  maxHeight: 260,
  overflow: "auto",
  background: "#FFFFFF",
};

const calendarFilterListItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: colors.text,
  fontSize: 13,
  fontWeight: 800,
  padding: "6px 4px",
};

const checkboxLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 13,
  padding: "11px 12px",
  color: colors.text,
  fontSize: 13,
  fontWeight: 850,
};

const calendarHeaderStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const calendarWeekStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 8,
};

const calendarDayNameStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  textAlign: "center",
};

const calendarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 8,
};

const calendarCellStyle: React.CSSProperties = {
  minHeight: 150,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
  padding: 9,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  overflow: "hidden",
};

const calendarCompactCellStyle: React.CSSProperties = {
  minHeight: 142,
  height: "auto",
  padding: 10,
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.3,
};

const calendarPillStyle: React.CSSProperties = {
  display: "block",
  background: "#EDF3FF",
  color: "#175CD3",
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 10,
  fontWeight: 850,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const calendarCompactPillStyle: React.CSSProperties = {
  padding: "3px 6px",
  borderRadius: 7,
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 900,
};

const calendarCompactMoreStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 850,
};

const calendarPillContentStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
};

const calendarDoneMiniStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "2px 5px",
  borderRadius: 999,
  background: "#DDE5EC",
  color: colors.muted,
  fontSize: 8,
  fontWeight: 950,
  lineHeight: 1,
  textDecoration: "none",
};

const calendarSelectedEventRowStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const calendarDoneBadgeStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "6px 9px",
  border: "1px solid #BFCBD5",
  borderRadius: 999,
  background: "#FFFFFF",
  color: colors.muted,
  fontSize: 10,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const calendarMoreStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
  fontWeight: 850,
};

const calendarWeatherIconStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "#FFFAEB",
  display: "grid",
  placeItems: "center",
  fontSize: 14,
  flex: "0 0 auto",
};

const calendarTodayBoxStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: 8,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
  marginBottom: 14,
};

const calendarTodayItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  color: colors.text,
  borderRadius: 14,
  padding: 10,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const calendarColorDotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  flex: "0 0 auto",
};

const compactAddBoxStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
};

const calendarColorsBoxStyle: React.CSSProperties = {
  marginTop: 18,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
};




const weatherStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(165px, 1fr))",
  gap: 12,
  overflowX: "auto",
  maxWidth: "100%",
  paddingBottom: 8,
};

const weatherCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 20,
  padding: 15,
  minHeight: 250,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  fontFamily: "inherit",
  display: "grid",
  gap: 10,
  minWidth: 0,
};

const weatherCardTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const weatherIconStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 18,
  background: "#FFFAEB",
  display: "grid",
  placeItems: "center",
  fontSize: 28,
};

const weatherTempStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 38,
  fontWeight: 950,
  lineHeight: 1,
  letterSpacing: "-0.04em",
};

const weatherLowStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: 800,
};

const weatherBarTrackStyle: React.CSSProperties = {
  height: 9,
  borderRadius: 999,
  background: "#EAF0F7",
  overflow: "hidden",
};

const weatherBarFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: colors.gold,
};

const weatherMiniGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 800,
};

const weatherAdviceSmallStyle: React.CSSProperties = {
  color: colors.text,
  fontSize: 12,
  lineHeight: 1.35,
  margin: 0,
  wordBreak: "break-word",
};


const weatherDetailPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  border: `1px solid ${colors.gold}`,
  borderRadius: 20,
  background: "#FFFFFF",
  boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
};

const weatherDetailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const weatherDetailTitleStyle: React.CSSProperties = {
  margin: "4px 0 2px",
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const weatherDetailConditionStyle: React.CSSProperties = {
  margin: 0,
  color: colors.muted,
  fontSize: 14,
  fontWeight: 850,
};

const weatherDetailIconStyle: React.CSSProperties = {
  width: 68,
  height: 68,
  flex: "0 0 68px",
  display: "grid",
  placeItems: "center",
  borderRadius: 20,
  background: "#FFFAEB",
  fontSize: 38,
};

const weatherDetailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
};

const weatherDetailMetricStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: colors.panel,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 850,
};

const weatherDetailNotesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const weatherDetailNoteStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: "#FFFFFF",
  color: colors.navy,
  lineHeight: 1.45,
};


const photoCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  padding: 10,
  background: "#FFFFFF",
};

const photoStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 70,
  objectFit: "cover",
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  marginBottom: 4,
};


      

                     
