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
import AtlasParts from "./AtlasParts";
import AtlasAddisonWork from "./AtlasAddisonWork";
import AtlasTasks from "./AtlasTasks";
import AtlasDashboardWorkspace from "./AtlasDashboardWorkspace";
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
import {
  closeSymbol, PHOTO_TIMELINE_TAGS, atlasOperationsTemplates, atlasProperties, dashboardWidgetDefinitions, dashboardDefaultGrid, legacySizeColumns, makeDailyForemanWidgets,
  normalizeDashboardWidgets, builtInDashboardLayouts, loadDashboardRoutineItems, todayLogStorageKeys, dashboardRoutineStorageKeys, atlasMoreToolsScreens, atlasPrimaryNavigationSections, localISODate,
  todayISO, addDays, uid, normalizeMapDetailBoxes, slugify, blankCalendarItem, clampPercent, formatDate,
  monthName, isServiceStatus, isPriority, isWorkOrderRecurrenceUnit, seasonForDate, recurrenceLabel, nextRecurrenceDate, readStoredArray,
  readAllStoredArrays, saveStoredArray, normalizePhotoRecord, photoSource, mergePhotoRecords, cachePhotoRecords, readCachedPhoto, deleteCachedPhoto,
  persistPhotoRecords, readFileDataUrl, fileToUploadedRecord, imageUrlsFromClipboardText, importImageUrlAsFile, normalizeImageFile, mergeUploadedFiles, normalizeAsset,
  assetLocationIds, assetHasLocation, normalizeLocationName, normalizeVendor, normalizeContact, blankContact, normalizeService, normalizeProcedure,
  normalizeCalendar, mergeCalendarItemRecords, normalizePart, normalizeDocument, mergeDocuments, byName, mergeLocationRecords, byTitle,
  badgeStyle, weatherText, weatherIcon, weatherGlyph, irrigationAdvice, weatherDayPlanning, categoryToColorId, calendarPlainColors,
  repeatOptions, reminderOptions, linkTypeOptions, standardCalendarCategoryLabels, plainColor, colorNameFromLegacyColorId, defaultCalendarColors, mergeCalendarColors,
  getUsHolidays, getJewishHolidays, calendarDateValue, isRecurringInstanceOnDate, getWeekCells, fallbackLocations, defaultMapLabels, fallbackVendors,
  confirmedAssetCatalog, fallbackAssets, fallbackWorkOrders, fallbackProcedures, fallbackCalendar, fallbackParts, defaultWorkLinks, documents,
  manualCategories, seaDooManualUrl, cleanManualOpenUrl, defaultManuals, inferManualCategory, blankManual, normalizeManualRecord, ListDrawerLayout,
  CreatableRelationshipField,
} from "./AtlasAppFoundation";
import AtlasContacts from "./AtlasContacts";
import AtlasWeather from "./AtlasWeather";
import type {
  AtlasCurrentUser, AtlasCalendarItem, AssistantTurn, PhotoTimelineTag, PhotoTimelineProjectCategory, PhotoTimelineMeta, ProjectTimelineEntry, PhotoTimelineProject,
  WorkEffort, AtlasTaskMeta, TaskListFilter, AtlasBacklogItem, AtlasVehicleCare, AtlasSeasonalItem, AtlasDaySession, AtlasOperationsTemplate,
  AtlasAssetRecord, LocationCustomDetail, AtlasLocationRecord, WorkChecklistItem, TodayLogEntry, DashboardRoutineItem, DashboardWidgetId, DashboardWidgetSetting,
  DashboardSavedLayout, DashboardWidgetDropTarget, WorkCompletionEntry, AtlasServiceRecord,
} from "./AtlasAppFoundation";



export default function AtlasAssetsWorkspace(props: any) {
  const {
    addAsset,
    addAssetPhotoFiles,
    addWorkOrder,
    assetActionButtonStyle,
    assetActionRowStyle,
    assetAddVendorSelectStyle,
    assetAlphabeticalListStyle,
    assetBulkMode,
    assetCardHeaderStyle,
    assetCardHintStyle,
    assetCardStyle,
    assetClearFieldButtonStyle,
    assetCompactInputStyle,
    assetDeleteBottomButtonStyle,
    assetEditButtonStyle,
    assetEditorOpen,
    assetEmptyStateStyle,
    assetFileSummaryStyle,
    assetFiltersOpen,
    assetFixedPanelStyle,
    assetHeroPhotoImageStyle,
    assetHeroPhotoStyle,
    assetHistoryHeaderActionsStyle,
    assetHistoryOrderStyle,
    assetIconButtonStyle,
    assetInfoItemStyle,
    assetInfoLabelStyle,
    assetInfoValueStyle,
    assetInformationGridStyle,
    assetInlineEditorStyle,
    assetListControlsStyle,
    assetListDensity,
    assetListNameStyle,
    assetListRowStyle,
    assetListSearch,
    assetListThumbStyle,
    assetMiddleGridStyle,
    assetNotesEditorStyle,
    assetNotesTextStyle,
    assetPanelCustomizeOpen,
    assetPanelFooterStyle,
    assetPanelScrolling,
    assetPanelSection,
    assetPanelTitleRowStyle,
    assetPanelTitleStyle,
    assetPhotoDeleteIconStyle,
    assetPhotoHeaderActionsStyle,
    assetPhotoLabelButtonStyle,
    assetPrimaryActionButtonStyle,
    assetQuickAccessOpen,
    assetRecordQualityOpen,
    assetRecords,
    assetSortOrder,
    assetSortSelectStyle,
    assetTinyButtonStyle,
    assetTinyUploadStyle,
    assetTopGridStyle,
    assetVendorBlockStyle,
    assetVendorChipStyle,
    assetVendorRemoveStyle,
    assetVendorRowStyle,
    assetVisibleSections,
    clearRecordDirty,
    dangerButtonStyle,
    deleteAssetPhoto,
    deleteAssetRecord,
    excludedAssetCategories,
    excludedAssetStatuses,
    favoriteAssetIds,
    filesFromClipboardPayload,
    filteredAssets,
    findManualForAsset,
    goldButtonStyle,
    imagePayloadFromPasteEvent,
    inputStyle,
    intakeDocs,
    isMobile,
    isRecordDirty,
    isSeanMarineUser,
    locationName,
    locations,
    manualsForAsset,
    mutedSmallStyle,
    noticeStyle,
    openPhotoPreview,
    partRecords,
    pasteAssetPhoto,
    photoTimelineProjects,
    photos,
    postAtlasRecord,
    procedureRecords,
    recentAssetIds,
    recordListIdentityStyle,
    recordListThumbImageStyle,
    renameAssetPhoto,
    saveDirtyRecord,
    seanVisibleAssetRecords,
    selectedAsset,
    selectedAssetId,
    selectedAssetIds,
    selectedAssetPhotos,
    serviceRecords,
    setAssetBulkMode,
    setAssetEditorOpen,
    setAssetFiltersOpen,
    setAssetListDensity,
    setAssetListSearch,
    setAssetPanelCustomizeOpen,
    setAssetPanelSection,
    setAssetQuickAccessOpen,
    setAssetRecordQualityOpen,
    setAssetRecords,
    setAssetSortOrder,
    setAssetVisibleSections,
    setDatabaseStatus,
    setLocations,
    setDocumentSearch,
    setExcludedAssetCategories,
    setExcludedAssetStatuses,
    setFavoriteAssetIds,
    setPhotoTimelineView,
    setRecentAssetIds,
    setScreen,
    setSelectedAssetId,
    setSelectedAssetIds,
    setSelectedLocationId,
    setSelectedManualId,
    setSelectedPhotoProjectId,
    setSelectedServiceId,
    setSelectedTaskId,
    setTasksView,
    showSaveToast,
    staffVisibleServiceRecords,
    startManualForAsset,
    taskDetails,
    updateAsset,
    vendorName,
    vendorRecords,
    workPlanTasks
  } = props;
  const [assetVisibleSectionsExpanded, setAssetVisibleSectionsExpanded] = useState(false);
  const assetSourceRecords = isSeanMarineUser ? seanVisibleAssetRecords : assetRecords;
  const assetWorkSourceRecords = isSeanMarineUser ? staffVisibleServiceRecords : serviceRecords;
  const attachedManuals = manualsForAsset(selectedAsset);
  const relatedWorkOrders = selectedAsset.id
    ? [...assetWorkSourceRecords]
        .filter((record) => record.assetId === selectedAsset.id)
        .sort((a, b) =>
          String(
            b.serviceHistory?.[0]?.completedAt ||
              b.lastCompletedDate ||
              b.date,
          ).localeCompare(
            String(
              a.serviceHistory?.[0]?.completedAt ||
                a.lastCompletedDate ||
                a.date,
            ),
          ),
        )
    : [];
  const assetHistory = relatedWorkOrders
    .flatMap((record) => {
      const completions = (record.serviceHistory || []).map((entry) => ({
        id: `${record.id}-${entry.id}`,
        workOrderId: record.id,
        date: entry.completedAt.slice(0, 10),
        title: record.title,
        status: "Completed" as ServiceStatus,
      }));

      const current = {
        id: record.id,
        workOrderId: record.id,
        date: record.lastCompletedDate || record.date,
        title: record.title,
        status: record.status,
      };

      return completions.length ? completions : [current];
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const selectedAssetCoverPhoto =
    selectedAssetPhotos.find(
      (photo) =>
        photoSource(photo) &&
        /(^|\s)(cover|main|primary|hero)(\s|$)/i.test(photo.name || ""),
    ) ||
    [...selectedAssetPhotos]
      .filter((photo) => photoSource(photo))
      .sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime() || 0;
        const right = new Date(b.createdAt || 0).getTime() || 0;
        return left - right;
      })[0] ||
    selectedAssetPhotos[0];
  const selectedAssetCoverSource = photoSource(selectedAssetCoverPhoto);
  const normalizedAssetSearch = assetListSearch.trim().toLowerCase();
  const favoriteAssets = favoriteAssetIds
    .map((id) => assetSourceRecords.find((asset) => asset.id === id))
    .filter((asset): asset is AssetRecord => Boolean(asset));
  const recentAssets = recentAssetIds
    .filter((id) => !favoriteAssetIds.includes(id))
    .map((id) => assetSourceRecords.find((asset) => asset.id === id))
    .filter((asset): asset is AssetRecord => Boolean(asset))
    .slice(0, 6);
  const normalizeAssetMatchValue = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const assetRecordQualityRows = assetSourceRecords.map((asset) => {
    const linkedManualCount = intakeDocs.filter(
      (document) =>
        document.linkedAssetId === asset.id ||
        (document.targetType === "Asset" && document.targetId === asset.id),
    ).length;
    const linkedProcedureCount = procedureRecords.filter((procedure) =>
      (procedure.linkedAssetIds || []).includes(asset.id),
    ).length;
    const missing: string[] = [];

    if (!asset.locationId || asset.locationId === "general") {
      missing.push("location");
    }
    if (!asset.serial?.trim()) missing.push("serial");
    if (!asset.make?.trim() && !asset.model?.trim()) {
      missing.push("make or model");
    }
    if (!(asset.vendorIds || []).length) missing.push("vendor");
    if (!linkedManualCount) missing.push("manual");
    if (!linkedProcedureCount) missing.push("procedure");

    return {
      asset,
      missing,
      completeness: Math.max(0, 6 - missing.length),
    };
  });

  const incompleteAssetRecordCount = assetRecordQualityRows.filter(
    (row) => row.missing.length >= 3,
  ).length;
  const incompleteAssetRows = assetRecordQualityRows
    .filter((row) => row.missing.length >= 3)
    .sort((a, b) => {
      const missingDifference = b.missing.length - a.missing.length;
      return missingDifference || a.asset.name.localeCompare(b.asset.name);
    })
    .slice(0, 8);

  const duplicateAssetGroups = (() => {
    const groups = new Map<string, AssetRecord[]>();

    assetSourceRecords.forEach((asset) => {
      const serial = normalizeAssetMatchValue(asset.serial);
      const name = normalizeAssetMatchValue(asset.name);
      const model = normalizeAssetMatchValue(asset.model);
      const make = normalizeAssetMatchValue(asset.make);

      const key = serial
        ? `serial:${serial}`
        : name && model
          ? `name-model:${name}|${model}`
          : name && make
            ? `name-make:${name}|${make}`
            : "";

      if (!key) return;
      groups.set(key, [...(groups.get(key) || []), asset]);
    });

    return [...groups.values()]
      .filter((group) => group.length > 1)
      .sort((a, b) => b.length - a.length)
      .slice(0, 6);
  })();

  const openAssetWorkOrderCount = assetWorkSourceRecords.filter(
    (record) =>
      Boolean(record.assetId) &&
      assetSourceRecords.some((asset) => asset.id === record.assetId) &&
      record.status !== "Completed",
  ).length;
  const displayedAssets = [...filteredAssets]
    .filter((asset) => !excludedAssetStatuses.includes(asset.status))
    .filter((asset) => !excludedAssetCategories.includes(asset.category))
    .filter((asset) => {
      if (!normalizedAssetSearch) return true;
      return [
        asset.name,
        asset.category,
        asset.status,
        asset.make,
        asset.model,
        asset.serial,
        asset.notes,
        locationName(asset.locationId),
        asset.vendorIds.map(vendorName).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedAssetSearch);
    })
    .sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return assetSortOrder === "az" ? comparison : -comparison;
    });
  const alphabeticalLocations = [...locations].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const alphabeticalVendors = [...vendorRecords].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const selectedVendors = selectedAsset.vendorIds
    .map((id) => vendorRecords.find((vendor) => vendor.id === id))
    .filter((vendor): vendor is VendorRecord => Boolean(vendor))
    .sort((a, b) => a.name.localeCompare(b.name));
  const assetCategories = [...new Set<string>(assetSourceRecords.map((asset: any) => String(asset.category || "")))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const linkedAssetDocuments = selectedAsset.id
    ? intakeDocs
        .filter(
          (document) =>
            document.linkedAssetId === selectedAsset.id ||
            (document.targetType === "Asset" &&
              document.targetId === selectedAsset.id),
        )
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        )
    : [];
  const linkedAssetProcedures = selectedAsset.id
    ? procedureRecords
        .filter((procedure) =>
          (procedure.linkedAssetIds || []).includes(selectedAsset.id),
        )
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];
  const linkedAssetParts = selectedAsset.id
    ? partRecords
        .filter((part) => part.assetId === selectedAsset.id)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const linkedAssetTasks = selectedAsset.id
    ? workPlanTasks
        .filter((task) => taskDetails(task.id).assetId === selectedAsset.id)
        .sort((a, b) => {
          const left = taskDetails(a.id);
          const right = taskDetails(b.id);
          const leftDone = left.status === "Completed" ? 1 : 0;
          const rightDone = right.status === "Completed" ? 1 : 0;
          return leftDone - rightDone || String(left.dueDate || "9999-12-31").localeCompare(String(right.dueDate || "9999-12-31"));
        })
    : [];
  const openAssetTasks = linkedAssetTasks.filter(
    (task) => taskDetails(task.id).status !== "Completed",
  );
  const linkedAssetProjects = selectedAsset.id
    ? photoTimelineProjects
        .filter((project) => project.assetId === selectedAsset.id)
        .sort((a, b) => String(b.startDate || b.createdAt || "").localeCompare(String(a.startDate || a.createdAt || "")))
    : [];
  const activeAssetProjects = linkedAssetProjects.filter(
    (project) => project.status !== "Completed" && !project.archived,
  );
  const linkedAssetVendors = selectedAsset.vendorIds
    .map((id) => vendorRecords.find((vendor) => vendor.id === id))
    .filter((vendor): vendor is VendorRecord => Boolean(vendor));
  const assetLastActivityDate = [
    ...assetHistory.map((entry) => entry.date),
    ...linkedAssetTasks.map((task) => taskDetails(task.id).completedAt?.slice(0, 10) || taskDetails(task.id).dueDate || ""),
    ...linkedAssetProjects.map((project) => project.completedAt || project.startDate || project.createdAt?.slice(0, 10) || ""),
    ...selectedAssetPhotos.map((photo) => photo.createdAt?.slice(0, 10) || ""),
    ...linkedAssetDocuments.map((document) => document.createdAt?.slice(0, 10) || ""),
  ].filter(Boolean).sort().reverse()[0] || "";
  const openAssetWorkOrders = relatedWorkOrders
    .filter((record) => record.status !== "Completed")
    .sort((a, b) =>
      String(a.date || "9999-12-31").localeCompare(
        String(b.date || "9999-12-31"),
      ),
    );
  const nextAssetMaintenance = openAssetWorkOrders
    .filter((record) => record.recurring || record.workType === "Preventive Maintenance")
    .find((record) => Boolean(record.date));
  const lastCompletedAssetWork = assetHistory.find(
    (entry) => entry.status === "Completed" && Boolean(entry.date),
  );
  const overdueAssetWorkOrders = openAssetWorkOrders.filter(
    (record) => Boolean(record.date) && record.date < todayISO(),
  );
  const highPriorityAssetWorkOrders = openAssetWorkOrders.filter(
    (record) => record.priority === "High",
  );
  const assetAttentionItems = [
    ...overdueAssetWorkOrders.map((record) => `Overdue work order: ${record.title}`),
    ...highPriorityAssetWorkOrders.map((record) => `High priority: ${record.title}`),
    ...openAssetTasks
      .filter((task) => Boolean(taskDetails(task.id).dueDate) && taskDetails(task.id).dueDate < todayISO())
      .map((task) => `Overdue task: ${task.title}`),
    ...(selectedAsset.status === "Offline" ? ["Asset is marked out of service"] : []),
  ];
  const assetRecommendedAction = assetAttentionItems[0]
    || openAssetTasks[0]?.title
    || openAssetWorkOrders[0]?.title
    || activeAssetProjects[0]?.title
    || (!linkedAssetProcedures.length && selectedAsset.procedureRequirement !== "Not Required" ? "Link a maintenance procedure" : "No immediate action required");
  const assetActualCost = relatedWorkOrders.reduce(
    (total, record) => total + Math.max(0, Number(record.actualCost || 0)),
    0,
  );
  const assetEstimatedCost = openAssetWorkOrders.reduce(
    (total, record) => total + Math.max(0, Number(record.estimatedCost || 0)),
    0,
  );
  const assetConditionLabel =
    selectedAsset.status === "Online"
      ? "Operational"
      : selectedAsset.status === "Offline"
        ? "Out of Service"
        : selectedAsset.status === "Seasonal"
          ? "Seasonal"
          : "Not Assessed";

  const assetConditionBadge =
    selectedAsset.status === "Online"
      ? "Online"
      : selectedAsset.status === "Offline"
        ? "Offline"
        : selectedAsset.status === "Seasonal"
          ? "Seasonal"
          : "Monitor";

  const assetSetupItems = [
    !selectedAsset.locationId || selectedAsset.locationId === "general"
      ? "Assign a primary location"
      : "",
    !selectedAsset.serial && selectedAsset.serialRequirement !== "Not Required" ? "Add serial / VIN / HIN" : "",
    !selectedAsset.vendorIds.length ? "Select a preferred vendor" : "",
    !attachedManuals.length && selectedAsset.manualRequirement !== "Not Required" ? "Add a manual or supporting document" : "",
    !linkedAssetProcedures.length && selectedAsset.procedureRequirement !== "Not Required" ? "Link a procedure" : "",
  ].filter(Boolean);

  const assetSetupCompleted = 5 - assetSetupItems.length;

  const assetServiceIssues = [
    selectedAsset.status === "Offline" ? "Asset is marked out of service" : "",
    overdueAssetWorkOrders.length
      ? `${overdueAssetWorkOrders.length} overdue work order${overdueAssetWorkOrders.length === 1 ? "" : "s"}`
      : "",
    highPriorityAssetWorkOrders.length
      ? `${highPriorityAssetWorkOrders.length} high-priority open item${highPriorityAssetWorkOrders.length === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);

  const removeVendor = (vendorId: string) =>
    updateAsset({
      vendorIds: selectedAsset.vendorIds.filter((id) => id !== vendorId),
    });

  const addSelectedVendor = (vendorId: string) => {
    if (!vendorId || selectedAsset.vendorIds.includes(vendorId)) return;
    updateAsset({ vendorIds: [...selectedAsset.vendorIds, vendorId] });
  };

  const createLocationFromAsset = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return "";
    const existing = locations.find(
      (location: AtlasLocationRecord) =>
        location.name.trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (existing) return existing.id;
    const record: AtlasLocationRecord = {
      id: uid("location"),
      name: cleanName,
      type: "Room / Area",
      zone: "",
      notes: "",
      customDetails: [],
      vendorIds: [],
    };
    setLocations((current: AtlasLocationRecord[]) => byName([record, ...current]));
    void postAtlasRecord("locations", record);
    showSaveToast(`${cleanName} added to Locations.`);
    return record.id;
  };

  const assetIdentifierLabel = (() => {
    const descriptor = [
      selectedAsset.category,
      selectedAsset.name,
      selectedAsset.make,
      selectedAsset.model,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/(boat|watercraft|sea[- ]?doo|jet ski|jetski|pwc|cobalt)/.test(descriptor)) {
      return "HIN";
    }
    if (/(vehicle|car|truck|suv|van|ford|mercedes|porsche|rivian|raptor)/.test(descriptor)) {
      return "VIN";
    }
    return "Serial Number";
  })();

  const infoValue = (
    label: string,
    value: string,
    editor: React.ReactNode,
    clear?: () => void,
  ) => (
    <div style={assetInfoItemStyle}>
      <span style={assetInfoLabelStyle}>{label}</span>
      {assetEditorOpen ? (
        <div style={assetInlineEditorStyle}>
          {editor}
          {clear && value ? (
            <button
              type="button"
              onClick={clear}
              style={assetClearFieldButtonStyle}
              aria-label={`Clear ${label}`}
              title={`Clear ${label}`}
            >
              {closeSymbol}
            </button>
          ) : null}
        </div>
      ) : (
        <strong style={assetInfoValueStyle}>{value || "—"}</strong>
      )}
    </div>
  );

  return (
    <ListDrawerLayout
      eyebrow="Property Equipment"
      title="Assets"
      detail="Equipment, service history, documents, procedures, vendors, and maintenance in one place."
      isMobile={isMobile}
      drawerResetKey={selectedAssetId || "asset-empty"}
      mobileDrawerOpen={isMobile && Boolean(selectedAssetId)}
      onMobileDrawerClose={() => {
        setSelectedAssetId("");
        setAssetEditorOpen(false);
      }}
      mobileDrawerTitle={selectedAsset.name || "Asset Record"}
      gridStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              gridTemplateColumns: "minmax(300px, 340px) minmax(520px, 1fr)",
              gap: 12,
              alignItems: "stretch",
              height: "calc(100vh - 176px)",
              minHeight: 0,
              overflow: "hidden",
            }
      }
      listPanelStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden", padding: 0 }
          : {
              minWidth: 0,
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              scrollbarGutter: "stable",
              paddingRight: 6,
              alignSelf: "stretch",
            }
      }
      drawerStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              position: "relative",
              top: "auto",
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              scrollbarGutter: "stable",
              alignSelf: "stretch",
              zIndex: 2,
            }
      }
      right={
        <div style={{ ...assetListControlsStyle, flexWrap: "wrap" }}>
          <div
            role="group"
            aria-label="Asset list spacing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: `1px solid ${colors.line}`,
              borderRadius: 10,
              padding: 2,
              background: "#FFFFFF",
            }}
          >
            {(["comfortable", "compact"] as const).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => setAssetListDensity(density)}
                aria-pressed={assetListDensity === density}
                style={{
                  border: 0,
                  borderRadius: 8,
                  background:
                    assetListDensity === density ? "#FFF3CF" : "transparent",
                  color:
                    assetListDensity === density ? colors.navy : colors.muted,
                  padding: "7px 9px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {density === "comfortable" ? "Comfortable" : "Compact"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAssetBulkMode((current) => !current)}
            aria-pressed={assetBulkMode}
            style={{
              ...assetEditButtonStyle,
              background: assetBulkMode ? "#FFF3CF" : "#FFFFFF",
              color: colors.navy,
              borderColor: assetBulkMode ? colors.gold : colors.line,
            }}
          >
            {assetBulkMode ? "Done Selecting" : "Select"}
          </button>
          <select
            value={assetSortOrder}
            onChange={(event) =>
              setAssetSortOrder(event.currentTarget.value as "az" | "za")
            }
            style={assetSortSelectStyle}
            aria-label="Sort assets alphabetically"
          >
            <option value="az">Name: A–Z</option>
            <option value="za">Name: Z–A</option>
          </select>
          <button type="button" onClick={() => addAsset()} style={goldButtonStyle}>
            Add Asset
          </button>
        </div>
      }
      list={
        <div style={{ display: "grid", gap: 7 }}>
          <section
            style={{
              position: isMobile ? "relative" : "sticky",
              top: isMobile ? "auto" : 8,
              zIndex: 8,
              border: `1px solid ${colors.line}`,
              borderRadius: 12,
              background: "#FFFFFF",
              padding: 8,
              boxShadow: isMobile ? "none" : "0 5px 16px rgba(24, 43, 77, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                minWidth: 0,
                flexWrap: isMobile ? "wrap" : "nowrap",
              }}
            >
              <input
                value={assetListSearch}
                onChange={(event) => setAssetListSearch(event.currentTarget.value)}
                placeholder="Search assets..."
                style={{
                  ...inputStyle,
                  flex: "1 1 220px",
                  minWidth: 0,
                  height: 36,
                  padding: "7px 10px",
                }}
                aria-label="Search assets"
              />

              <div style={{ position: "relative", flex: "0 0 auto" }}>
                <button
                  type="button"
                  onClick={() => setAssetFiltersOpen((current) => !current)}
                  aria-expanded={assetFiltersOpen}
                  aria-haspopup="menu"
                  style={{
                    ...assetEditButtonStyle,
                    height: 36,
                    padding: "7px 10px",
                    background:
                      excludedAssetStatuses.length || excludedAssetCategories.length
                        ? "#FFF3CF"
                        : "#FFFFFF",
                    borderColor:
                      excludedAssetStatuses.length || excludedAssetCategories.length
                        ? colors.gold
                        : colors.line,
                    whiteSpace: "nowrap",
                  }}
                >
                  Filters
                  {excludedAssetStatuses.length + excludedAssetCategories.length
                    ? ` (${excludedAssetStatuses.length + excludedAssetCategories.length})`
                    : ""}
                  {assetFiltersOpen ? " ▲" : " ▼"}
                </button>

                {assetFiltersOpen ? (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      width: isMobile ? "min(320px, calc(100vw - 34px))" : 310,
                      maxHeight: "min(420px, 70vh)",
                      overflowY: "auto",
                      border: `1px solid ${colors.line}`,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      padding: 10,
                      boxShadow: "0 16px 38px rgba(24, 43, 77, 0.18)",
                      display: "grid",
                      gap: 10,
                      zIndex: 30,
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={assetInfoLabelStyle}>Status</span>
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          const status = event.currentTarget.value as Status;
                          if (!status) return;
                          setExcludedAssetStatuses((current) =>
                            current.includes(status)
                              ? current.filter((item) => item !== status)
                              : [...current, status],
                          );
                          event.currentTarget.value = "";
                          setAssetFiltersOpen(false);
                        }}
                        style={{ ...assetSortSelectStyle, width: "100%", height: 36 }}
                        aria-label="Filter assets by status"
                      >
                        <option value="">Choose status...</option>
                        {(["Online", "Monitor", "Offline", "Seasonal"] as Status[]).map(
                          (status) => (
                            <option key={status} value={status}>
                              {excludedAssetStatuses.includes(status) ? "Show" : "Hide"}{" "}
                              {status === "Online"
                                ? "Operational"
                                : status === "Offline"
                                  ? "Out of Service"
                                  : status === "Monitor"
                                    ? "Not Assessed"
                                    : status}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {assetCategories.length ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={assetInfoLabelStyle}>Category</span>
                        <select
                          defaultValue=""
                          onChange={(event) => {
                            const category = event.currentTarget.value;
                            if (!category) return;
                            setExcludedAssetCategories((current) =>
                              current.includes(category)
                                ? current.filter((item) => item !== category)
                                : [...current, category],
                            );
                            event.currentTarget.value = "";
                            setAssetFiltersOpen(false);
                          }}
                          style={{ ...assetSortSelectStyle, width: "100%", height: 36 }}
                          aria-label="Filter assets by category"
                        >
                          <option value="">Choose category...</option>
                          {assetCategories.map((category) => (
                            <option key={category} value={category}>
                              {excludedAssetCategories.includes(category) ? "Show" : "Hide"}{" "}
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        paddingTop: 4,
                        borderTop: `1px solid ${colors.line}`,
                      }}
                    >
                      <span style={mutedSmallStyle}>
                        {displayedAssets.length} of {assetSourceRecords.length} assets
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setExcludedAssetStatuses([]);
                          setExcludedAssetCategories([]);
                          setAssetFiltersOpen(false);
                        }}
                        style={assetTinyButtonStyle}
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <span
                style={{
                  ...mutedSmallStyle,
                  flex: "0 0 auto",
                  whiteSpace: "nowrap",
                }}
              >
                {displayedAssets.length} results
              </span>

              {(assetListSearch || excludedAssetStatuses.length || excludedAssetCategories.length) ? (
                <button
                  type="button"
                  onClick={() => {
                    setAssetListSearch("");
                    setExcludedAssetStatuses([]);
                    setExcludedAssetCategories([]);
                    setAssetFiltersOpen(false);
                  }}
                  style={{ ...assetTinyButtonStyle, height: 34 }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {excludedAssetStatuses.length || excludedAssetCategories.length ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 5,
                  marginTop: 7,
                }}
              >
                {excludedAssetStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setExcludedAssetStatuses((current) =>
                        current.filter((item) => item !== status),
                      )
                    }
                    style={{
                      ...assetTinyButtonStyle,
                      padding: "4px 7px",
                      borderRadius: 999,
                      background: "#FFF8E5",
                      borderColor: colors.gold,
                    }}
                  >
                    Hidden: {status} {closeSymbol}
                  </button>
                ))}
                {excludedAssetCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setExcludedAssetCategories((current) =>
                        current.filter((item) => item !== category),
                      )
                    }
                    style={{
                      ...assetTinyButtonStyle,
                      padding: "4px 7px",
                      borderRadius: 999,
                      background: "#FFF8E5",
                      borderColor: colors.gold,
                    }}
                  >
                    Hidden: {category} {closeSymbol}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {assetBulkMode ? (
            <section
              style={{
                border: `1px solid ${colors.gold}`,
                borderRadius: 14,
                background: "#FFF9E8",
                padding: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
              aria-label="Selected asset actions"
            >
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: "block",
                    color: colors.navy,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedAssetIds.length} asset
                  {selectedAssetIds.length === 1 ? "" : "s"} selected
                </strong>
                <span style={mutedSmallStyle}>
                  Safe actions only. Nothing will be deleted or archived.
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAssetIds(
                      selectedAssetIds.length === displayedAssets.length
                        ? []
                        : displayedAssets.map((asset) => asset.id),
                    )
                  }
                  style={assetTinyButtonStyle}
                >
                  {selectedAssetIds.length === displayedAssets.length &&
                  displayedAssets.length
                    ? "Clear Visible"
                    : "Select All Visible"}
                </button>

                <button
                  type="button"
                  disabled={!selectedAssetIds.length}
                  onClick={() =>
                    setFavoriteAssetIds((current) => [
                      ...selectedAssetIds,
                      ...current.filter((id) => !selectedAssetIds.includes(id)),
                    ])
                  }
                  style={{
                    ...assetTinyButtonStyle,
                    opacity: selectedAssetIds.length ? 1 : 0.5,
                    cursor: selectedAssetIds.length ? "pointer" : "not-allowed",
                  }}
                >
                  Add to Favorites
                </button>

                <button
                  type="button"
                  disabled={!selectedAssetIds.length}
                  onClick={() =>
                    setFavoriteAssetIds((current) =>
                      current.filter((id) => !selectedAssetIds.includes(id)),
                    )
                  }
                  style={{
                    ...assetTinyButtonStyle,
                    opacity: selectedAssetIds.length ? 1 : 0.5,
                    cursor: selectedAssetIds.length ? "pointer" : "not-allowed",
                  }}
                >
                  Remove Favorites
                </button>

                <button
                  type="button"
                  disabled={!selectedAssetIds.length}
                  onClick={() => setSelectedAssetIds([])}
                  style={{
                    ...assetTinyButtonStyle,
                    opacity: selectedAssetIds.length ? 1 : 0.5,
                    cursor: selectedAssetIds.length ? "pointer" : "not-allowed",
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </section>
          ) : null}

          {(duplicateAssetGroups.length || incompleteAssetRows.length) ? (
            <section
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 14,
                background: "#FFFFFF",
                padding: 10,
                display: "grid",
                gap: 9,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      color: colors.navy,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Record Quality
                  </strong>
                  <span style={mutedSmallStyle}>
                    {duplicateAssetGroups.length} possible duplicate group
                    {duplicateAssetGroups.length === 1 ? "" : "s"} ·{" "}
                    {incompleteAssetRows.length} incomplete record
                    {incompleteAssetRows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAssetRecordQualityOpen((current) => !current)}
                  style={assetTinyButtonStyle}
                  aria-expanded={assetRecordQualityOpen}
                >
                  {assetRecordQualityOpen ? "Collapse" : "Review"}
                </button>
              </div>

              {assetRecordQualityOpen ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {duplicateAssetGroups.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={assetInfoLabelStyle}>Possible Duplicates</span>
                      <div style={{ display: "grid", gap: 6 }}>
                        {duplicateAssetGroups.map((group, index) => (
                          <div
                            key={`${group[0]?.id || "duplicate"}-${index}`}
                            style={{
                              border: `1px solid ${colors.line}`,
                              borderRadius: 10,
                              background: "#FFF9E8",
                              padding: 8,
                              display: "grid",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                color: colors.navy,
                                fontSize: 11,
                                fontWeight: 850,
                              }}
                            >
                              {group.length} records may describe the same asset
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {group.map((asset) => (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAssetId(asset.id);
                                    setAssetEditorOpen(false);
                                    setRecentAssetIds((current) => [
                                      asset.id,
                                      ...current.filter((id) => id !== asset.id),
                                    ].slice(0, 8));
                                  }}
                                  style={{
                                    ...assetTinyButtonStyle,
                                    maxWidth: "100%",
                                    background:
                                      selectedAssetId === asset.id
                                        ? "#FFF3CF"
                                        : "#FFFFFF",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "block",
                                      maxWidth: 190,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {asset.name}
                                    {asset.serial ? ` · ${asset.serial}` : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <span style={mutedSmallStyle}>
                        Atlas only flags possible matches. Nothing is merged automatically.
                      </span>
                    </div>
                  ) : null}

                  {incompleteAssetRows.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={assetInfoLabelStyle}>Needs More Information</span>
                      <div style={{ display: "grid", gap: 6 }}>
                        {incompleteAssetRows.map(({ asset, missing }) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(asset.id);
                              setAssetPanelSection("overview");
                              setAssetEditorOpen(false);
                              setRecentAssetIds((current) => [
                                asset.id,
                                ...current.filter((id) => id !== asset.id),
                              ].slice(0, 8));
                            }}
                            style={{
                              border: `1px solid ${colors.line}`,
                              borderRadius: 10,
                              background:
                                selectedAssetId === asset.id ? "#F4F8FD" : "#FFFFFF",
                              padding: 9,
                              textAlign: "left",
                              cursor: "pointer",
                              minWidth: 0,
                            }}
                          >
                            <strong
                              style={{
                                display: "block",
                                color: colors.navy,
                                fontSize: 11,
                                wordBreak: "normal",
                                overflowWrap: "break-word",
                              }}
                            >
                              {asset.name}
                            </strong>
                            <span style={mutedSmallStyle}>
                              Missing: {missing.join(", ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {(favoriteAssets.length || recentAssets.length) ? (
            <section
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 14,
                background: "#FFFFFF",
                padding: 10,
                display: "grid",
                gap: 9,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: colors.navy,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Quick Access
                  </strong>
                  <span style={mutedSmallStyle}>
                    Favorite and recently viewed assets
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAssetQuickAccessOpen((current) => !current)}
                  style={assetTinyButtonStyle}
                  aria-expanded={assetQuickAccessOpen}
                >
                  {assetQuickAccessOpen ? "Collapse" : "Open"}
                </button>
              </div>

              {assetQuickAccessOpen ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {favoriteAssets.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={assetInfoLabelStyle}>Favorites</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {favoriteAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(asset.id);
                              setAssetEditorOpen(false);
                              setRecentAssetIds((current) => [
                                asset.id,
                                ...current.filter((id) => id !== asset.id),
                              ].slice(0, 8));
                            }}
                            style={{
                              ...assetTinyButtonStyle,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              maxWidth: "100%",
                              background:
                                selectedAssetId === asset.id ? "#FFF3CF" : "#FFFFFF",
                            }}
                          >
                            <span aria-hidden="true">★</span>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 180,
                              }}
                            >
                              {asset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {recentAssets.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={assetInfoLabelStyle}>Recently Viewed</span>
                        <button
                          type="button"
                          onClick={() => setRecentAssetIds([])}
                          style={assetTinyButtonStyle}
                        >
                          Clear
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {recentAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(asset.id);
                              setAssetEditorOpen(false);
                              setRecentAssetIds((current) => [
                                asset.id,
                                ...current.filter((id) => id !== asset.id),
                              ].slice(0, 8));
                            }}
                            style={{
                              ...assetTinyButtonStyle,
                              maxWidth: "100%",
                              background:
                                selectedAssetId === asset.id ? "#F4F8FD" : "#FFFFFF",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 180,
                              }}
                            >
                              {asset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <div
            style={{
              ...assetAlphabeticalListStyle,
              gap: assetListDensity === "compact" ? 6 : 10,
            }}
          >
          {displayedAssets.map((asset) => {
            const assetPhotos = photos.filter(
              (photo) => photo.assetId === asset.id,
            );
            const coverPhoto =
              assetPhotos.find(
                (photo) =>
                  photoSource(photo) &&
                  /(^|\s)(cover|main|primary|hero)(\s|$)/i.test(
                    photo.name || "",
                  ),
              ) ||
              [...assetPhotos]
                .filter((photo) => photoSource(photo))
                .sort((a, b) => {
                  const left = new Date(a.createdAt || 0).getTime() || 0;
                  const right = new Date(b.createdAt || 0).getTime() || 0;
                  return left - right;
                })[0] ||
              assetPhotos[0];
            const coverPhotoSource = photoSource(coverPhoto);
            const assetOpenWork = assetWorkSourceRecords.filter(
              (record) => record.assetId === asset.id && record.status !== "Completed",
            );
            const assetDocumentCount = intakeDocs.filter(
              (document) =>
                document.linkedAssetId === asset.id ||
                (document.targetType === "Asset" && document.targetId === asset.id),
            ).length;
            const assetConditionLabel =
              asset.status === "Online"
                ? "Operational"
                : asset.status === "Offline"
                  ? "Out of Service"
                  : asset.status === "Seasonal"
                    ? "Seasonal"
                    : "Not Assessed";
            const assetConditionTone =
              asset.status === "Online"
                ? "Online"
                : asset.status === "Offline"
                  ? "Offline"
                  : asset.status === "Seasonal"
                    ? "Seasonal"
                    : "Monitor";
            const assetCompletedWork = assetWorkSourceRecords
              .filter(
                (record) =>
                  record.assetId === asset.id &&
                  record.status === "Completed" &&
                  Boolean(record.date),
              )
              .sort((a, b) =>
                String(b.date || "").localeCompare(String(a.date || "")),
              );
            const assetNextMaintenance = assetOpenWork
              .filter(
                (record) =>
                  Boolean(record.date) &&
                  (record.recurring ||
                    record.workType === "Preventive Maintenance"),
              )
              .sort((a, b) =>
                String(a.date || "9999-12-31").localeCompare(
                  String(b.date || "9999-12-31"),
                ),
              )[0];
            const assetNeedsService =
              asset.status === "Offline" ||
              assetOpenWork.some(
                (record) =>
                  record.priority === "High" ||
                  (Boolean(record.date) && record.date < todayISO()),
              );
            const assetSetupIncomplete =
              !asset.locationId ||
              asset.locationId === "general" ||
              !asset.serial ||
              !asset.vendorIds.length ||
              manualsForAsset(asset).length === 0 ||
              !procedureRecords.some((procedure) =>
                (procedure.linkedAssetIds || []).includes(asset.id),
              );

            return (
              <div
                key={asset.id}
                className="atlas-gold-hover-card"
                style={{
                  position: "relative",
                  border: `1px solid ${
                    selectedAssetIds.includes(asset.id) || asset.id === selectedAsset.id
                      ? colors.gold
                      : colors.line
                  }`,
                  borderRadius: 12,
                  background:
                    selectedAssetIds.includes(asset.id) || asset.id === selectedAsset.id
                      ? "#F4F8FD"
                      : "#FFFFFF",
                  overflow: "visible",
                }}
              >
                <span className="atlas-gold-hover-card-accent" aria-hidden="true" />
                {assetBulkMode ? (
                  <label
                    style={{
                      position: "absolute",
                      left: 9,
                      top: 9,
                      zIndex: 5,
                      width: 26,
                      height: 26,
                      display: "grid",
                      placeItems: "center",
                      border: `1px solid ${
                        selectedAssetIds.includes(asset.id)
                          ? colors.gold
                          : colors.line
                      }`,
                      borderRadius: 8,
                      background: "#FFFFFF",
                      cursor: "pointer",
                    }}
                    aria-label={`Select ${asset.name}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(asset.id)}
                      onChange={(event) =>
                        setSelectedAssetIds((current) =>
                          event.target.checked
                            ? [...current, asset.id]
                            : current.filter((id) => id !== asset.id),
                        )
                      }
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (assetBulkMode) {
                      setSelectedAssetIds((current) =>
                        current.includes(asset.id)
                          ? current.filter((id) => id !== asset.id)
                          : [...current, asset.id],
                      );
                      return;
                    }
                    setSelectedAssetId(asset.id);
                    setAssetEditorOpen(false);
                    setRecentAssetIds((current) => [
                      asset.id,
                      ...current.filter((id) => id !== asset.id),
                    ].slice(0, 8));
                  }}
                  style={{
                    ...assetListRowStyle,
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    borderRadius: 12,
                    padding:
                      assetListDensity === "compact"
                        ? `9px ${assetBulkMode ? 10 : 118}px 9px ${
                            assetBulkMode ? 44 : 10
                          }px`
                        : undefined,
                    paddingLeft: assetBulkMode ? 44 : undefined,
                    paddingRight:
                      assetBulkMode ? 10 : assetListDensity === "compact" ? 118 : 120,
                    textAlign: "left",
                  }}
                >
                  <div style={{ ...recordListIdentityStyle, alignItems: "flex-start" }}>
                    <div
                      style={{
                        ...assetListThumbStyle,
                        width: assetListDensity === "compact" ? 38 : undefined,
                        height: assetListDensity === "compact" ? 38 : undefined,
                        minWidth: assetListDensity === "compact" ? 38 : undefined,
                      }}
                    >
                      {coverPhotoSource ? (
                        <img
                          src={coverPhotoSource}
                          alt=""
                          style={recordListThumbImageStyle}
                        />
                      ) : (
                        <span>{asset.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                      <strong style={assetListNameStyle}>{asset.name}</strong>
                      <span style={{ ...mutedSmallStyle, display: "block" }}>
                        {[asset.category, locationName(asset.locationId)].filter(Boolean).join(" · ") || "Unassigned asset"}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
                        <span style={badgeStyle(assetConditionTone)}>
                          {assetConditionLabel}
                        </span>
                        {assetNeedsService ? (
                          <span style={badgeStyle("Offline")}>Needs Service</span>
                        ) : null}
                        {assetSetupIncomplete ? (
                          <span style={badgeStyle("Monitor")}>Needs Details</span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          display: assetListDensity === "compact" ? "none" : "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 5,
                          marginTop: 1,
                        }}
                      >
                        <span
                          style={{
                            ...mutedSmallStyle,
                            border: `1px solid ${colors.line}`,
                            borderRadius: 8,
                            padding: "5px 7px",
                            background: colors.panel,
                            minWidth: 0,
                          }}
                        >
                          <strong style={{ color: colors.navy }}>Last service:</strong>{" "}
                          {assetCompletedWork[0]?.date
                            ? formatDate(assetCompletedWork[0].date)
                            : "No service recorded"}
                        </span>
                        <span
                          style={{
                            ...mutedSmallStyle,
                            border: `1px solid ${colors.line}`,
                            borderRadius: 8,
                            padding: "5px 7px",
                            background: colors.panel,
                            minWidth: 0,
                          }}
                        >
                          <strong style={{ color: colors.navy }}>Next maintenance:</strong>{" "}
                          {assetNextMaintenance?.date
                            ? formatDate(assetNextMaintenance.date)
                            : "Not scheduled"}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        <span style={{ ...mutedSmallStyle, border: `1px solid ${colors.line}`, borderRadius: 999, padding: "3px 6px", background: colors.panel }}>
                          {assetOpenWork.length} open work order{assetOpenWork.length === 1 ? "" : "s"}
                        </span>
                        <span style={{ ...mutedSmallStyle, border: `1px solid ${colors.line}`, borderRadius: 999, padding: "3px 6px", background: colors.panel }}>
                          {assetDocumentCount} document{assetDocumentCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                <div
                  style={{
                    position: "absolute",
                    right: 8,
                    top: assetListDensity === "compact" ? 7 : 8,
                    display: assetBulkMode ? "none" : "grid",
                    gap: assetListDensity === "compact" ? 4 : 5,
                    zIndex: 3,
                  }}
                >
                  <button
                    type="button"
                    title={
                      favoriteAssetIds.includes(asset.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    aria-label={
                      favoriteAssetIds.includes(asset.id)
                        ? `Remove ${asset.name} from favorites`
                        : `Add ${asset.name} to favorites`
                    }
                    aria-pressed={favoriteAssetIds.includes(asset.id)}
                    onClick={() =>
                      setFavoriteAssetIds((current) =>
                        current.includes(asset.id)
                          ? current.filter((id) => id !== asset.id)
                          : [asset.id, ...current],
                      )
                    }
                    style={{
                      ...assetTinyButtonStyle,
                      minWidth: 34,
                      color: favoriteAssetIds.includes(asset.id)
                        ? "#9A6500"
                        : colors.muted,
                      background: favoriteAssetIds.includes(asset.id)
                        ? "#FFF3CF"
                        : "#FFFFFF",
                    }}
                  >
                    {favoriteAssetIds.includes(asset.id) ? "★" : "☆"}
                  </button>
                  <button
                    type="button"
                    title="Edit asset"
                    aria-label={`Edit ${asset.name}`}
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      setAssetEditorOpen(true);
                    }}
                    style={assetTinyButtonStyle}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    title="Create a work order"
                    aria-label={`Create work order for ${asset.name}`}
                    onClick={() =>
                      addWorkOrder({ assetId: asset.id, locationId: asset.locationId || "" })
                    }
                    style={assetTinyButtonStyle}
                  >
                    Work Order
                  </button>
                </div>

                <span className="atlas-gold-hover-popover" aria-hidden="true">
                  <strong>{asset.name}</strong>
                  <span>{asset.make || "Make not recorded"} {asset.model || ""}</span>
                  <span>Condition: {assetConditionLabel}</span>
                  <span>
                    Last service:{" "}
                    {assetCompletedWork[0]?.date
                      ? formatDate(assetCompletedWork[0].date)
                      : "Not recorded"}
                  </span>
                  <span>
                    Next service:{" "}
                    {assetNextMaintenance?.date
                      ? formatDate(assetNextMaintenance.date)
                      : "Not scheduled"}
                  </span>
                  <span>{assetOpenWork.length} open work order{assetOpenWork.length === 1 ? "" : "s"}</span>
                  <span>{assetDocumentCount} linked document{assetDocumentCount === 1 ? "" : "s"}</span>
                </span>
              </div>
            );
          })}
          {displayedAssets.length === 0 ? (
            <div style={noticeStyle}>
              <strong>No matching assets found.</strong>
              <p style={mutedSmallStyle}>Adjust the search or select Clear Filters to show all assets.</p>
            </div>
          ) : null}
          </div>
        </div>
      }
      drawer={
        selectedAsset.id ? (
          <div
            className={`atlas-asset-drawer${assetPanelScrolling ? " atlas-asset-drawer-scrolling" : ""}`}
            style={{
              ...assetFixedPanelStyle,
              maxHeight: "none",
              minHeight: 0,
              overflow: "visible",
            }}
            tabIndex={0}
            onPaste={(event) => {
              const payload = imagePayloadFromPasteEvent(event);
              if (!payload.files.length && !payload.urls.length) return;
              event.preventDefault();

              void (async () => {
                try {
                  setDatabaseStatus("Reading pasted image...");
                  const files = await filesFromClipboardPayload(
                    payload.files,
                    payload.urls,
                  );
                  if (!files.length) {
                    throw new Error(
                      "No usable image was found. Use Copy image instead of Copy link.",
                    );
                  }
                  await addAssetPhotoFiles(files);
                } catch (error) {
                  setDatabaseStatus(
                    error instanceof Error
                      ? error.message
                      : "Could not paste that image.",
                  );
                }
              })();
            }}
          >
            <div
              style={{
                ...assetPanelTitleRowStyle,
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                paddingBottom: 8,
                minHeight: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    ...assetPanelTitleStyle,
                    margin: 0,
                    fontSize: 18,
                    lineHeight: 1.15,
                  }}
                >
                  {selectedAsset.name.trim() || "Asset"}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 5,
                    marginTop: 3,
                    lineHeight: 1.15,
                  }}
                >
                  <span style={badgeStyle(assetConditionBadge)}>
                    {assetConditionLabel}
                  </span>
                  {selectedAsset.category ? (
                    <span style={mutedSmallStyle}>{selectedAsset.category}</span>
                  ) : null}
                  {selectedAsset.locationId && selectedAsset.locationId !== "general" ? (
                    <span style={mutedSmallStyle}>· {locationName(selectedAsset.locationId)}</span>
                  ) : null}
                  {[selectedAsset.make, selectedAsset.model].filter(Boolean).length ? (
                    <span style={mutedSmallStyle}>
                      · {[selectedAsset.make, selectedAsset.model].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                style={{
                  ...assetActionRowStyle,
                  gap: 5,
                  alignItems: "center",
                  margin: 0,
                }}
              >
                {assetEditorOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAssetEditorOpen(false)}
                      style={assetActionButtonStyle}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void (async () => {
                          await saveDirtyRecord(
                            "assets",
                            selectedAsset,
                            "asset",
                            selectedAsset.id,
                          );
                          setAssetEditorOpen(false);
                          showSaveToast("Asset saved.");
                        })()
                      }
                      style={assetPrimaryActionButtonStyle}
                    >
                      Save Changes
                    </button>
                  </>
                ) : null}
                {!assetEditorOpen && isRecordDirty("asset", selectedAsset.id) ? (
                  <button
                    type="button"
                    onClick={() =>
                      void (async () => {
                        await saveDirtyRecord(
                          "assets",
                          selectedAsset,
                          "asset",
                          selectedAsset.id,
                        );
                        setAssetEditorOpen(false);
                        showSaveToast("Asset saved.");
                      })()
                    }
                    style={assetPrimaryActionButtonStyle}
                  >
                    Save Changes
                  </button>
                ) : null}
                {!assetEditorOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAssetPanelCustomizeOpen(false);
                      setAssetVisibleSectionsExpanded(false);
                      setAssetPanelSection("overview");
                      setAssetEditorOpen(true);
                    }}
                    style={assetPrimaryActionButtonStyle}
                    aria-label="Edit asset"
                  >
                    Edit Asset
                  </button>
                ) : null}
                {!assetEditorOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        addWorkOrder({
                          assetId: selectedAsset.id,
                          locationId: selectedAsset.locationId || "",
                        })
                      }
                      style={assetActionButtonStyle}
                    >
                      Create Work Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetPanelCustomizeOpen((current) => !current)}
                      style={{
                        ...assetActionButtonStyle,
                        borderColor: assetPanelCustomizeOpen ? colors.gold : colors.line,
                        background: assetPanelCustomizeOpen ? "#FFF8E6" : "#FFFFFF",
                      }}
                      aria-expanded={assetPanelCustomizeOpen}
                    >
                      Customize
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteAssetRecord(selectedAsset)}
                      style={{ ...dangerButtonStyle, width: "auto" }}
                    >
                      Delete Asset
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {!assetEditorOpen && assetPanelCustomizeOpen && assetPanelSection === "overview" ? (
              <section
                style={{
                  border: `1px solid ${colors.gold}`,
                  borderRadius: 12,
                  background: "#FFF9E8",
                  padding: 11,
                  marginBottom: 12,
                }}
                aria-label="Visible asset information sections"
              >
                <div style={{ ...assetCardHeaderStyle, marginBottom: 8 }}>
                  <div>
                    <strong style={{ whiteSpace: "nowrap" }}>Visible Sections</strong>
                    <div style={assetCardHintStyle}>
                      Choose what appears in the asset information panel.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setAssetVisibleSections({
                          overview: true,
                          status: true,
                          linkedRecords: true,
                          recordSetup: true,
                          costs: false,
                        })
                      }
                      style={assetTinyButtonStyle}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetVisibleSectionsExpanded((current) => !current)}
                      style={assetTinyButtonStyle}
                      aria-expanded={assetVisibleSectionsExpanded}
                      aria-label={assetVisibleSectionsExpanded ? "Collapse Visible Sections" : "Expand Visible Sections"}
                    >
                      {assetVisibleSectionsExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>
                {assetVisibleSectionsExpanded ? <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 7,
                  }}
                >
                  {[
                    ["overview", "Asset Overview"],
                    ["status", "Asset Status"],
                    ["linkedRecords", "Linked Records"],
                    ["recordSetup", "Record Setup"],
                    ["costs", "Service Costs"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                        border: `1px solid ${colors.line}`,
                        borderRadius: 9,
                        background: "#FFFFFF",
                        padding: "8px 9px",
                        color: colors.navy,
                        fontSize: 11,
                        fontWeight: 850,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assetVisibleSections[key] !== false}
                        onChange={(event) =>
                          setAssetVisibleSections((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          wordBreak: "normal",
                          overflowWrap: "normal",
                        }}
                      >
                        {label}
                      </span>
                    </label>
                  ))}
                </div> : null}
                <div style={{ ...assetCardHintStyle, marginTop: 8 }}>
                  Service Costs are hidden by default because expenses are managed separately.
                </div>
              </section>
            ) : null}

            <div
              style={{
                ...assetTopGridStyle,
                gridTemplateColumns: "minmax(0, 1fr)",
              }}
            >
              <section style={assetCardStyle}>
                <div style={assetCardHeaderStyle}>
                  <strong>Asset Information</strong>
                  {!assetEditorOpen ? (
                    <button
                      type="button"
                      onClick={() => setAssetEditorOpen(true)}
                      style={assetIconButtonStyle}
                      aria-label="Edit all asset information"
                      title="Edit asset information"
                    >
                      ✏
                    </button>
                  ) : (
                    <span style={assetCardHintStyle}>Editing all information</span>
                  )}
                </div>
                <div
                  style={{
                    ...assetInformationGridStyle,
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {infoValue(
                    "Asset Name",
                    selectedAsset.name,
                    <input
                      value={selectedAsset.name}
                      onChange={(event) => updateAsset({ name: event.currentTarget.value })}
                      style={assetCompactInputStyle}
                    />,
                  )}
                  {infoValue(
                    "Year",
                    selectedAsset.year || "",
                    <input
                      value={selectedAsset.year || ""}
                      inputMode="numeric"
                      onChange={(event) => updateAsset({ year: event.currentTarget.value })}
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ year: "" }),
                  )}
                  {infoValue(
                    "Make",
                    selectedAsset.make || "",
                    <input
                      value={selectedAsset.make || ""}
                      onChange={(event) => updateAsset({ make: event.currentTarget.value })}
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ make: "" }),
                  )}
                  {infoValue(
                    "Model",
                    selectedAsset.model || "",
                    <input
                      value={selectedAsset.model || ""}
                      onChange={(event) => updateAsset({ model: event.currentTarget.value })}
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ model: "" }),
                  )}
                  {infoValue(
                    assetIdentifierLabel,
                    selectedAsset.serial || "",
                    <input
                      value={selectedAsset.serial || ""}
                      onChange={(event) => updateAsset({ serial: event.currentTarget.value })}
                      placeholder={assetIdentifierLabel}
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ serial: "" }),
                  )}
                  {infoValue(
                    "Location",
                    selectedAsset.locationId && selectedAsset.locationId !== "general"
                      ? locationName(selectedAsset.locationId)
                      : "",
                    <CreatableRelationshipField
                      label="Location"
                      value={selectedAsset.locationId || ""}
                      options={alphabeticalLocations.map((location) => ({ id: location.id, label: location.name }))}
                      emptyLabel="Select or add location"
                      compact
                      onCreate={createLocationFromAsset}
                      onChange={(locationId) => {
                        updateAsset({
                          locationId: locationId || "general",
                          locationIds: locationId ? [locationId] : [],
                        } as Partial<AtlasAssetRecord>);
                      }}
                    />,
                  )}
                  {infoValue(
                    "Status",
                    selectedAsset.status,
                    <select
                      value={selectedAsset.status}
                      onChange={(event) => updateAsset({ status: event.currentTarget.value as Status })}
                      style={assetCompactInputStyle}
                    >
                      {["Monitor", "Offline", "Online", "Seasonal"].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>,
                  )}
                  <div style={assetInfoItemStyle}>
                    <span style={assetInfoLabelStyle}>Work Orders</span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <strong style={assetInfoValueStyle}>
                        {openAssetWorkOrders.length} open · {relatedWorkOrders.length} total
                      </strong>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setAssetPanelSection("work")}
                          style={assetTinyButtonStyle}
                        >
                          View Work Orders
                        </button>
                        <button
                          type="button"
                          onClick={() => addWorkOrder({ assetId: selectedAsset.id, locationId: selectedAsset.locationId || "" })}
                          style={assetTinyButtonStyle}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <details
              style={{
                ...assetCardStyle,
                marginBottom: 12,
                padding: 0,
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  padding: "10px 12px",
                  color: colors.navy,
                  fontSize: 12,
                  fontWeight: 900,
                  listStylePosition: "inside",
                }}
              >
                More Details
              </summary>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 7,
                  padding: "0 12px 12px",
                }}
              >
                {[
                  ["photos", `Photos (${selectedAssetPhotos.length})`],
                  ["documents", `Documents (${linkedAssetDocuments.length + attachedManuals.length})`],
                  ["history", `Service History (${assetHistory.length})`],
                  ["notes", "Notes"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAssetPanelSection(key as typeof assetPanelSection)}
                    style={{
                      ...assetActionButtonStyle,
                      minHeight: 38,
                      background: assetPanelSection === key ? "#FFF9E8" : "#FFFFFF",
                      borderColor: assetPanelSection === key ? colors.gold : colors.line,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>

            <div
              style={{
                ...assetMiddleGridStyle,
                display:
                  assetPanelSection === "notes" || assetPanelSection === "photos"
                    ? "grid"
                    : "none",
                gridTemplateColumns: "minmax(0, 1fr)",
                alignItems: "start",
              }}
            >
              <section style={{ ...assetCardStyle, display: assetPanelSection === "notes" ? "block" : "none" }}>
                <div style={assetCardHeaderStyle}>
                  <strong>Notes</strong>
                  {!assetEditorOpen ? (
                    <button
                      type="button"
                      onClick={() => setAssetEditorOpen(true)}
                      style={assetIconButtonStyle}
                      aria-label="Edit notes"
                    >
                      ✏
                    </button>
                  ) : null}
                </div>
                {assetEditorOpen ? (
                  <textarea
                    value={selectedAsset.notes}
                    onChange={(event) =>
                      updateAsset({ notes: event.currentTarget.value })
                    }
                    style={assetNotesEditorStyle}
                  />
                ) : (
                  <p style={assetNotesTextStyle}>
                    {selectedAsset.notes || "No notes yet."}
                  </p>
                )}
              </section>

              <section style={{ ...assetCardStyle, display: assetPanelSection === "photos" ? "block" : "none" }}>
                <div
                  style={{
                    ...assetCardHeaderStyle,
                    flexWrap: "wrap",
                    alignItems: "center",
                    rowGap: 6,
                  }}
                >
                  <strong
                    style={{
                      whiteSpace: "nowrap",
                      wordBreak: "keep-all",
                      overflowWrap: "normal",
                      flex: "0 0 auto",
                      minWidth: "max-content",
                    }}
                  >
                    Photos
                  </strong>
                  <div
                    style={{
                      ...assetPhotoHeaderActionsStyle,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                      minWidth: 0,
                      flex: "1 1 220px",
                      width: "100%",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => void pasteAssetPhoto()}
                      style={assetTinyButtonStyle}
                    >
                      Paste
                    </button>
                    <label style={assetTinyUploadStyle}>
                      + Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={(event) => {
                          void addAssetPhotoFiles(event.currentTarget.files);
                          event.currentTarget.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>
                {selectedAssetPhotos.length ? (
                  <details style={{ border: `1px solid ${colors.line}`, borderRadius: 8, background: "#FFFFFF" }}>
                    <summary style={{ padding: "7px 9px", cursor: "pointer", color: colors.navy, fontSize: 11, fontWeight: 900 }}>
                      Photos ({selectedAssetPhotos.length})
                    </summary>
                    <div style={{ display: "grid", gap: 4, maxHeight: 180, overflowY: "auto", padding: "0 7px 7px" }}>
                      {selectedAssetPhotos.map((photo) => (
                        <div key={photo.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", alignItems: "center", gap: 5, padding: "5px 6px", border: `1px solid ${colors.line}`, borderRadius: 7 }}>
                          <button type="button" onClick={() => openPhotoPreview(photo)} style={{ border: 0, padding: 0, background: "transparent", color: colors.navy, textAlign: "left", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                            {photo.name || "Asset photo"}
                          </button>
                          <button type="button" onClick={() => void renameAssetPhoto(photo)} style={assetPhotoLabelButtonStyle} aria-label={`Edit ${photo.name || "photo"} label`}>✏</button>
                          {assetEditorOpen ? <button type="button" onClick={() => void deleteAssetPhoto(photo)} style={assetPhotoDeleteIconStyle} aria-label={`Delete ${photo.name || "photo"}`}>{closeSymbol}</button> : null}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <div style={assetEmptyStateStyle}>No photos attached.</div>
                )}
                <div
                  className="atlas-photo-intelligence-shell"
                  style={{
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                    position: "relative",
                    isolation: "isolate",
                    display: "block",
                    overflow: "hidden",
                    marginTop: 2,
                  }}
                >
                  <PhotoIntelligencePanel
                    asset={selectedAsset}
                    photos={selectedAssetPhotos}
                    photoSource={photoSource}
                    colors={colors}
                    onSaveAsset={async (patch, summary) => {
                      const updated = normalizeAsset({
                        ...selectedAsset,
                        ...patch,
                        notes: [selectedAsset.notes, `Photo Intelligence: ${summary}`]
                          .filter(Boolean)
                          .join("\n"),
                      });
                      const saved = await postAtlasRecord("assets", updated);
                      if (!saved) throw new Error("Atlas could not save the asset details.");
                      setAssetRecords((current) =>
                        byName(current.map((item) => item.id === updated.id ? updated : item)),
                      );
                      clearRecordDirty("asset", updated.id);
                      showSaveToast("Asset details approved and saved.");
                    }}
                    onDraftWorkOrder={(draft) =>
                      addWorkOrder({
                        assetId: selectedAsset.id,
                        locationId: selectedAsset.locationId || "",
                        title: draft.title,
                        notes: draft.notes,
                        priority: draft.priority,
                      })
                    }
                  />
                </div>
              </section>
            </div>

            {assetPanelSection === "work" ? (
              <section style={{ ...assetCardStyle, marginBottom: 12 }}>
                <div style={{ ...assetCardHeaderStyle, marginBottom: 8 }}>
                  <strong>Open Work Orders</strong>
                  <button
                    type="button"
                    onClick={() =>
                      addWorkOrder({
                        assetId: selectedAsset.id,
                        locationId: selectedAsset.locationId || "",
                      })
                    }
                    style={assetTinyButtonStyle}
                  >
                    Create Work Order
                  </button>
                </div>
                {openAssetWorkOrders.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {openAssetWorkOrders.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(item.id);
                          setScreen("history");
                        }}
                        style={{
                          border: `1px solid ${colors.line}`,
                          borderRadius: 10,
                          background: "#FFFFFF",
                          padding: 10,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", color: colors.navy }}>
                          {item.title}
                        </strong>
                        <span style={mutedSmallStyle}>{item.status || "Open"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    border: `1px dashed ${colors.line}`,
                    borderRadius: 10,
                    background: "#F8FAFD",
                    padding: 12,
                    color: colors.muted,
                    fontSize: 11,
                    lineHeight: 1.45,
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                  }}>No open work orders.</div>
                )}
              </section>
            ) : null}

            {assetPanelSection === "history" ? (
              <section style={{ ...assetCardStyle, marginBottom: 12 }}>
                <div style={{ ...assetCardHeaderStyle, marginBottom: 8 }}>
                  <div>
                    <strong>Service History</strong>
                    <div style={assetCardHintStyle}>Completed and previous work linked to this asset.</div>
                  </div>
                  <button type="button" onClick={() => setScreen("history")} style={assetTinyButtonStyle}>
                    View All
                  </button>
                </div>
                {assetHistory.length ? (
                  <div style={{ display: "grid", gap: 7 }}>
                    {assetHistory.slice(0, isMobile ? 6 : 8).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(entry.workOrderId);
                          setScreen("history");
                        }}
                        style={{
                          border: `1px solid ${colors.line}`,
                          borderRadius: 9,
                          background: "#FFFFFF",
                          padding: "8px 10px",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "110px minmax(0, 1fr) auto",
                          gap: 8,
                          alignItems: "center",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <span style={mutedSmallStyle}>{formatDate(entry.date)}</span>
                        <strong style={{ color: colors.navy, minWidth: 0 }}>{entry.title || "Service"}</strong>
                        <span style={badgeStyle(entry.status)}>{entry.status}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={assetEmptyStateStyle}>No service history recorded yet.</div>
                )}
              </section>
            ) : null}

            {assetPanelSection === "documents" ? (
              <section
                style={{
                  ...assetCardStyle,
                  marginBottom: 12,
                  background: "#FFFFFF",
                }}
                aria-label="Asset documents"
              >
                <div style={{ ...assetCardHeaderStyle, marginBottom: 10 }}>
                  <div>
                    <strong>Documents</strong>
                    <div style={assetCardHintStyle}>
                      Manuals, warranties, invoices, startup sheets, and other files linked to this asset.
                    </div>
                  </div>
                  <span
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 999,
                      background: colors.panel,
                      color: colors.navy,
                      padding: "5px 9px",
                      fontSize: 10,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {linkedAssetDocuments.length + attachedManuals.length} linked
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 10,
                      background: "#F8FAFD",
                      padding: 10,
                    }}
                  >
                    <span style={assetInfoLabelStyle}>Document Library</span>
                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: colors.navy,
                        fontSize: 15,
                      }}
                    >
                      {linkedAssetDocuments.length}
                    </strong>
                    <span style={{ ...assetCardHintStyle, display: "block", marginTop: 3 }}>
                      Files linked through Atlas Documents
                    </span>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 10,
                      background: "#F8FAFD",
                      padding: 10,
                    }}
                  >
                    <span style={assetInfoLabelStyle}>Manual Attachments</span>
                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: colors.navy,
                        fontSize: 15,
                      }}
                    >
                      {attachedManuals.length}
                    </strong>
                    <span style={{ ...assetCardHintStyle, display: "block", marginTop: 3 }}>
                      Existing manuals already associated with this asset
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 7,
                    marginTop: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentSearch(selectedAsset.name);
                      setScreen("documents");
                    }}
                    style={assetPrimaryActionButtonStyle}
                  >
                    Open Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentSearch(selectedAsset.name);
                      setScreen("documents");
                    }}
                    style={assetTinyButtonStyle}
                  >
                    Add / Link File
                  </button>
                </div>

                {!linkedAssetDocuments.length && !attachedManuals.length ? (
                  <div
                    style={{
                      border: `1px dashed ${colors.line}`,
                      borderRadius: 10,
                      background: "#F8FAFD",
                      padding: 12,
                      marginTop: 10,
                      color: colors.muted,
                      fontSize: 11,
                      lineHeight: 1.45,
                    }}
                  >
                    No documents are linked yet. Add manuals and supporting records through Documents and link them to this asset.
                  </div>
                ) : null}

                <div
                  style={{
                    ...assetPanelFooterStyle,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: `1px solid ${colors.line}`,
                  }}
                >
                  <span style={assetCardHintStyle}>
                    Files stay searchable in Documents while remaining connected to this asset.
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteAssetRecord(selectedAsset)}
                    style={assetDeleteBottomButtonStyle}
                  >
                    Delete Asset
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select an asset.</strong>
            <p style={mutedSmallStyle}>
              Open an asset to see its information, photos, work orders, documents, procedures, and service history.
            </p>
          </div>
        )
      }
    />
  );
}
