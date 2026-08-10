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
        completionId: entry.id,
        date: entry.completedAt.slice(0, 10),
        completedAt: entry.completedAt,
        title: record.title,
        status: "Completed" as ServiceStatus,
        vendorId: entry.vendorId || record.vendorId || "",
        procedureId: entry.procedureId || record.procedureId || "",
        locationId: entry.locationId || record.locationId || "",
        notes: String(entry.notes || record.notes || ""),
        notesHistory: Array.isArray(entry.notesHistory) ? entry.notesHistory : [],
        checklist: Array.isArray(entry.checklist) ? entry.checklist : [],
        photos: Array.isArray(entry.photos) ? entry.photos : [],
        documents: Array.isArray(entry.documents) ? entry.documents : [],
      }));

      const current = {
        id: record.id,
        workOrderId: record.id,
        completionId: "",
        date: record.lastCompletedDate || record.date,
        completedAt: record.lastCompletedDate || record.date,
        title: record.title,
        status: record.status,
        vendorId: record.vendorId || "",
        procedureId: record.procedureId || "",
        locationId: record.locationId || "",
        notes: String(record.notes || ""),
        notesHistory: Array.isArray(record.notesHistory) ? record.notesHistory : [],
        checklist: Array.isArray(record.checklist) ? record.checklist : [],
        photos: Array.isArray(record.photos) ? record.photos : [],
        documents: Array.isArray(record.documents) ? record.documents : [],
      };

      return completions.length ? completions : [current];
    })
    .sort((a, b) =>
      String(b.completedAt || b.date).localeCompare(String(a.completedAt || a.date)),
    );
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
    !attachedManuals.length && selectedAsset.manualRequirement !== "Not Required" ? "Attach a manual" : "",
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
      detail="Search, review, and maintain equipment records for the selected property."
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
          : { gridTemplateColumns: "minmax(340px, 40%) minmax(0, 60%)", gap: 14 }
      }
      listPanelStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden", padding: 0 }
          : {
              position: "sticky",
              top: 8,
              height: "calc(100vh - 24px)",
              maxHeight: "calc(100vh - 24px)",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              scrollbarGutter: "stable",
              alignSelf: "start",
            }
      }
      drawerStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              position: "sticky",
              top: 8,
              height: "calc(100vh - 24px)",
              maxHeight: "calc(100vh - 24px)",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              scrollbarGutter: "stable",
              alignSelf: "start",
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
        <div style={{ display: "grid", gap: 10 }}>
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

          <section
            aria-label="Asset activity snapshot"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
              gap: 8,
            }}
          >
            {[
              {
                label: "Tracked Assets",
                value: assetSourceRecords.length,
                note: `${displayedAssets.length} currently visible`,
              },
              {
                label: "Open Work",
                value: openAssetWorkOrderCount,
                note: "Linked work orders",
              },
              {
                label: "Needs Information",
                value: incompleteAssetRecordCount,
                note: "Missing 3 or more details",
              },
              {
                label: "Favorites",
                value: favoriteAssets.length,
                note: "Pinned for quick access",
              },
              {
                label: "Recently Viewed",
                value: recentAssets.length,
                note: "Recent non-favorites",
              },
            ].map((item) => (
              <div
                key={((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 13,
                  background: "#FFFFFF",
                  padding: "10px 11px",
                  minWidth: 0,
                  boxShadow: "0 3px 10px rgba(21, 47, 79, 0.04)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: colors.muted,
                    fontSize: 9,
                    fontWeight: 850,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: 3,
                    color: colors.navy,
                    fontSize: 21,
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: colors.muted,
                    fontSize: 9,
                    lineHeight: 1.25,
                  }}
                >
                  {item.note}
                </span>
              </div>
            ))}
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
            <div style={assetPanelTitleRowStyle}>
              <div>
                <h3 style={assetPanelTitleStyle}>
                  {selectedAsset.name.trim() || "Asset"}
                </h3>
                <span style={badgeStyle(assetConditionBadge)}>
                  {assetConditionLabel}
                </span>
              </div>
              <div style={assetActionRowStyle}>
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
              </div>
            </div>

            <div
              style={{
                marginBottom: isMobile ? 10 : 12,
                position: isMobile ? "sticky" : "static",
                top: isMobile ? 0 : undefined,
                zIndex: isMobile ? 12 : undefined,
                background: "#FFFFFF",
                paddingTop: isMobile ? 4 : 0,
                paddingBottom: isMobile ? 6 : 0,
              }}
            >
              {isMobile ? (
                <select
                  value={assetPanelSection}
                  onChange={(event) =>
                    setAssetPanelSection(event.target.value as typeof assetPanelSection)
                  }
                  style={{
                    ...assetSortSelectStyle,
                    width: "100%",
                    minHeight: 42,
                    fontSize: 13,
                  }}
                  aria-label="Asset information section"
                >
                  <option value="overview">Overview</option>
                  <option value="work">Work Orders ({openAssetWorkOrders.length})</option>
                  <option value="history">Service History ({assetHistory.length})</option>
                  <option value="photos">Photos ({selectedAssetPhotos.length})</option>
                  <option value="documents">Documents ({linkedAssetDocuments.length})</option>
                  <option value="procedures">Procedures ({linkedAssetProcedures.length})</option>
                  <option value="notes">Notes</option>
                </select>
              ) : (
                <div
                  role="tablist"
                  aria-label="Asset information sections"
                  style={{
                    display: "flex",
                    gap: 4,
                    overflowX: "auto",
                    borderBottom: `1px solid ${colors.line}`,
                  }}
                >
                  {[
                    ["overview", "Overview", null],
                    ["work", "Work Orders", openAssetWorkOrders.length],
                    ["history", "Service History", assetHistory.length],
                    ["photos", "Photos", selectedAssetPhotos.length],
                    ["documents", "Documents", linkedAssetDocuments.length],
                    ["procedures", "Procedures", linkedAssetProcedures.length],
                    ["notes", "Notes", null],
                  ].map(([key, label, count]) => {
                    const active = assetPanelSection === key;
                    return (
                      <button
                        key={String(key)}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setAssetPanelSection(key as typeof assetPanelSection)}
                        style={{
                          border: 0,
                          borderBottom: `3px solid ${active ? colors.gold : "transparent"}`,
                          borderRadius: "8px 8px 0 0",
                          background: active ? "#FFF9E8" : "transparent",
                          color: active ? colors.navy : colors.muted,
                          padding: "8px 10px",
                          fontSize: 11,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                      >
                        {String(label)}
                        {typeof count === "number" ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {assetPanelCustomizeOpen && assetPanelSection === "overview" ? (
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
                </div>
                <div style={{ ...assetCardHintStyle, marginTop: 8 }}>
                  Service Costs are hidden by default because expenses are managed separately.
                </div>
              </section>
            ) : null}

            <section
              style={{
                display:
                  assetPanelSection === "overview" &&
                  assetVisibleSections.overview !== false
                    ? "grid"
                    : "none",
                border: `1px solid ${colors.line}`,
                borderRadius: 14,
                background: "linear-gradient(135deg, #FFFFFF 0%, #F6F9FD 100%)",
                padding: isMobile ? 12 : 14,
                marginBottom: 12,
                gridTemplateColumns: isMobile
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 8,
                boxShadow: "0 8px 22px rgba(24, 43, 77, 0.06)",
              }}
              aria-label="Asset overview"
            >
              {[
                {
                  label: "Make / Model",
                  value:
                    [selectedAsset.make, selectedAsset.model]
                      .filter(Boolean)
                      .join(" ") || "Not recorded",
                },
                {
                  label: "Primary Location",
                  value:
                    selectedAsset.locationId &&
                    selectedAsset.locationId !== "general"
                      ? locationName(selectedAsset.locationId)
                      : "Not assigned",
                },
                {
                  label: "Serial / ID",
                  value: selectedAsset.serial || (selectedAsset.serialRequirement === "Not Required" ? "Not required" : "Not recorded"),
                },
                {
                  label: "Preferred Vendors",
                  value: `${selectedVendors.length} linked`,
                },
              ].map((item) => (
                <div
                  key={((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}
                  style={{
                    border: `1px solid ${colors.line}`,
                    borderRadius: 10,
                    background: "#FFFFFF",
                    padding: "9px 10px",
                    minWidth: 0,
                  }}
                >
                  <span style={assetInfoLabelStyle}>{((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}</span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: colors.navy,
                      fontSize: 13,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.value}
                  >
                    {item.value}
                  </strong>
                </div>
              ))}
            </section>

            <section
              style={{
                ...assetCardStyle,
                display: assetPanelSection === "overview" ? "block" : "none",
                marginBottom: 12,
                background: "#FFFFFF",
                borderLeft: `4px solid ${assetAttentionItems.length ? "#D92D20" : colors.gold}`,
              }}
              aria-label="Asset intelligence"
            >
              <div style={assetCardHeaderStyle}>
                <div>
                  <strong>Asset Intelligence</strong>
                  <div style={assetCardHintStyle}>Current context, attention items, and the most useful next action</div>
                </div>
                <span style={badgeStyle(assetAttentionItems.length ? "High" : "Online")}>
                  {assetAttentionItems.length ? `${assetAttentionItems.length} attention` : "On track"}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {[
                  ["Open Tasks", String(openAssetTasks.length)],
                  ["Open Work Orders", String(openAssetWorkOrders.length)],
                  ["Active Projects", String(activeAssetProjects.length)],
                  ["Last Activity", assetLastActivityDate ? formatDate(assetLastActivityDate) : "None"],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: "8px 9px", minWidth: 0 }}>
                    <span style={assetInfoLabelStyle}>{label}</span>
                    <strong style={{ display: "block", marginTop: 3, color: colors.navy, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</strong>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, borderTop: `1px solid ${colors.line}`, paddingTop: 9 }}>
                <span style={assetInfoLabelStyle}>Recommended next action</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
                  <strong style={{ color: colors.navy, fontSize: 13, lineHeight: 1.35 }}>{assetRecommendedAction}</strong>
                  {openAssetTasks[0] ? (
                    <button type="button" style={assetTinyButtonStyle} onClick={() => { setSelectedTaskId(openAssetTasks[0].id); setTasksView("tasks"); setScreen("planner"); }}>Open Task</button>
                  ) : openAssetWorkOrders[0] ? (
                    <button type="button" style={assetTinyButtonStyle} onClick={() => { setSelectedServiceId(openAssetWorkOrders[0].id); setScreen("history"); }}>Open Work</button>
                  ) : activeAssetProjects[0] ? (
                    <button type="button" style={assetTinyButtonStyle} onClick={() => { setSelectedPhotoProjectId(activeAssetProjects[0].id); setPhotoTimelineView("projects"); setScreen("timeline"); }}>Open Project</button>
                  ) : null}
                </div>
              </div>
              {assetAttentionItems.length ? (
                <div style={{ marginTop: 9, display: "grid", gap: 5 }}>
                  {assetAttentionItems.slice(0, 4).map((item) => (
                    <div key={item} style={{ fontSize: 11, color: "#B42318", fontWeight: 800 }}>• {item}</div>
                  ))}
                </div>
              ) : null}
            </section>

            <section
              style={{
                ...assetCardStyle,
                display:
                  assetPanelSection === "overview" &&
                  assetVisibleSections.status !== false
                    ? "block"
                    : "none",
                marginBottom: 12,
                background: "#F8FAFD",
              }}
            >
              <div style={assetCardHeaderStyle}>
                <div>
                  <strong>Asset Status</strong>
                  <div style={assetCardHintStyle}>
                    Condition, active work, maintenance schedule, and record completeness
                  </div>
                </div>
                <span style={badgeStyle(assetConditionBadge)}>
                  {assetConditionLabel}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {[
                  {
                    label: "Condition",
                    value: assetConditionLabel,
                    detail:
                      assetServiceIssues.length > 0
                        ? `${assetServiceIssues.length} service issue${assetServiceIssues.length === 1 ? "" : "s"}`
                        : selectedAsset.status === "Monitor"
                          ? "Condition has not been assessed"
                          : "No active condition warning",
                    hoverTitle: "Asset condition",
                    hoverLines: assetServiceIssues.length
                      ? assetServiceIssues
                      : [
                          `Status: ${assetConditionLabel}`,
                          selectedAsset.status === "Monitor"
                            ? "Missing records do not mean the asset is not working"
                            : "No overdue or high-priority service issue detected",
                        ],
                    action: () => undefined,
                  },
                  {
                    label: "Open Work",
                    value: String(openAssetWorkOrders.length),
                    detail: openAssetWorkOrders[0]?.title || "No open work orders",
                    hoverTitle: "Open-work summary",
                    hoverLines: openAssetWorkOrders.length
                      ? [
                          `Next: ${openAssetWorkOrders[0]?.title || "Untitled work order"}`,
                          openAssetWorkOrders[0]?.date
                            ? `Due ${formatDate(openAssetWorkOrders[0].date)}`
                            : "No due date recorded",
                          `${assetEstimatedCost.toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })} estimated open-work cost`,
                        ]
                      : ["No active work orders", "Create a work order to begin tracking service"],
                    action: () => {
                      if (openAssetWorkOrders[0]) {
                        setSelectedServiceId(openAssetWorkOrders[0].id);
                        setScreen("history");
                      }
                    },
                  },
                  {
                    label: "Next Maintenance",
                    value: nextAssetMaintenance?.date
                      ? formatDate(nextAssetMaintenance.date)
                      : "None scheduled",
                    detail: nextAssetMaintenance?.title || "Add preventive maintenance",
                    hoverTitle: "Maintenance details",
                    hoverLines: nextAssetMaintenance
                      ? [
                          nextAssetMaintenance.title || "Preventive maintenance",
                          nextAssetMaintenance.date
                            ? `Scheduled ${formatDate(nextAssetMaintenance.date)}`
                            : "No scheduled date",
                          `Priority: ${nextAssetMaintenance.priority || "Not recorded"}`,
                        ]
                      : [
                          "No preventive maintenance is scheduled",
                          "Click to create a recurring maintenance work order",
                        ],
                    action: () => {
                      if (nextAssetMaintenance) {
                        setSelectedServiceId(nextAssetMaintenance.id);
                        setScreen("history");
                      } else {
                        addWorkOrder({
                          assetId: selectedAsset.id,
                          locationId: selectedAsset.locationId || "",
                          workType: "Preventive Maintenance",
                          recurring: true,
                        });
                      }
                    },
                  },
                  {
                    label: "Last Service",
                    value: lastCompletedAssetWork?.date
                      ? formatDate(lastCompletedAssetWork.date)
                      : "No history",
                    detail: lastCompletedAssetWork?.title || "Completed work will appear here",
                    hoverTitle: "Most recent completed service",
                    hoverLines: lastCompletedAssetWork
                      ? [
                          lastCompletedAssetWork.title || "Completed service",
                          lastCompletedAssetWork.date
                            ? `Completed ${formatDate(lastCompletedAssetWork.date)}`
                            : "Completion date not recorded",
                          "Click to open the full service record",
                        ]
                      : ["No completed service has been recorded for this asset"],
                    action: () => {
                      if (lastCompletedAssetWork) {
                        setSelectedServiceId(lastCompletedAssetWork.workOrderId);
                        setScreen("history");
                      }
                    },
                  },
                  {
                    label: "Location",
                    value: selectedAsset.locationId
                      ? locationName(selectedAsset.locationId)
                      : "Not assigned",
                    detail: `${assetLocationIds(selectedAsset).length} linked location${assetLocationIds(selectedAsset).length === 1 ? "" : "s"}`,
                    hoverTitle: "Location assignment",
                    hoverLines: selectedAsset.locationId
                      ? [
                          locationName(selectedAsset.locationId),
                          `${assetLocationIds(selectedAsset).length} linked location${assetLocationIds(selectedAsset).length === 1 ? "" : "s"}`,
                          "Click to open the location record",
                        ]
                      : ["This asset is not assigned to a primary location"],
                    action: () => {
                      if (selectedAsset.locationId) {
                        setSelectedLocationId(selectedAsset.locationId);
                        setScreen("locations");
                      }
                    },
                  },
                  {
                    label: "Service Cost",
                    value: assetActualCost
                      ? assetActualCost.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })
                      : "$0",
                    detail: assetEstimatedCost
                      ? `${assetEstimatedCost.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })} estimated open work`
                      : "No estimated open-work cost",
                    hoverTitle: "Cost breakdown",
                    hoverLines: [
                      `${assetActualCost.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })} completed-service cost`,
                      `${assetEstimatedCost.toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })} estimated open-work cost`,
                      "Click to review service history",
                    ],
                    action: () => setScreen("history"),
                  },
                ]
                  .filter(
                    (item) =>
                      item.label !== "Service Cost" ||
                      assetVisibleSections.costs !== false,
                  )
                  .map((item) => (
                  <button
                    key={((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}
                    type="button"
                    className="atlas-gold-hover-card"
                    onClick={item.action}
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 10,
                      background: "#FFFFFF",
                      padding: 10,
                      minWidth: 0,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span className="atlas-gold-hover-card-accent" aria-hidden="true" />
                    <span style={assetInfoLabelStyle}>{((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}</span>
                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: colors.navy,
                        fontSize: 14,
                        lineHeight: 1.25,
                      }}
                    >
                      {item.value}
                    </strong>
                    <span
                      style={{
                        ...assetCardHintStyle,
                        display: "block",
                        marginTop: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.detail}
                    </span>
                    <span className="atlas-gold-hover-popover" aria-hidden="true">
                      <strong>{item.hoverTitle}</strong>
                      {item.hoverLines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: assetPanelSection === "overview" ? "grid" : "none",
                  paddingBottom: isMobile ? 8 : 0,
                  gridTemplateColumns: isMobile
                    ? "minmax(0, 1fr)"
                    : "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: isMobile ? 8 : 10,
                  width: "100%",
                  minWidth: 0,
                  marginTop: 10,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    display: assetVisibleSections.linkedRecords === false ? "none" : "block",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 12,
                    background: "#FFFFFF",
                    padding: isMobile ? 9 : 10,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={assetInfoLabelStyle}>Asset Relationships</span>
                      <div style={assetCardHintStyle}>
                        Open every record connected to this asset.
                      </div>
                    </div>
                    <span
                      style={{
                        border: `1px solid ${colors.line}`,
                        borderRadius: 999,
                        background: colors.panel,
                        color: colors.navy,
                        padding: "4px 8px",
                        fontSize: 9,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedVendors.length +
                        linkedAssetProcedures.length +
                        attachedManuals.length +
                        linkedAssetDocuments.length +
                        selectedAssetPhotos.length +
                        linkedAssetParts.length +
                        openAssetWorkOrders.length} linked
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(auto-fit, minmax(118px, 1fr))",
                      gap: 7,
                      marginTop: 10,
                    }}
                  >
                    {[
                      {
                        label: "Work Orders",
                        count: openAssetWorkOrders.length,
                        action: () => setAssetPanelSection("work"),
                      },
                      {
                        label: "Vendors",
                        count: selectedVendors.length,
                        action: () => setScreen("vendors"),
                      },
                      {
                        label: "Procedures",
                        count: linkedAssetProcedures.length,
                        action: () => setAssetPanelSection("procedures"),
                      },
                      {
                        label: "Manuals",
                        count: attachedManuals.length,
                        action: () => {
                          if (attachedManuals[0]) {
                            setSelectedManualId(attachedManuals[0].id);
                          }
                          setScreen("manuals");
                        },
                      },
                      {
                        label: "Documents",
                        count: linkedAssetDocuments.length,
                        action: () => setAssetPanelSection("documents"),
                      },
                      {
                        label: "Photos",
                        count: selectedAssetPhotos.length,
                        action: () => setAssetPanelSection("photos"),
                      },
                      {
                        label: "Parts",
                        count: linkedAssetParts.length,
                        action: () => setScreen("parts"),
                      },
                      {
                        label: "Location",
                        count:
                          selectedAsset.locationId &&
                          selectedAsset.locationId !== "general"
                            ? 1
                            : 0,
                        action: () => setScreen("locations"),
                      },
                    ].map((relationship) => (
                      <button
                        key={relationship.label}
                        type="button"
                        onClick={relationship.action}
                        style={{
                          border: `1px solid ${colors.line}`,
                          borderRadius: 10,
                          background:
                            relationship.count > 0 ? "#F8FAFD" : "#FFFFFF",
                          padding: isMobile ? "9px 8px" : "8px 9px",
                          minHeight: isMobile ? 54 : 50,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 7,
                          textAlign: "left",
                          cursor: "pointer",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: colors.navy,
                            fontSize: 10,
                            fontWeight: 850,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {relationship.label}
                        </span>
                        <strong
                          style={{
                            color:
                              relationship.count > 0 ? colors.navy : colors.muted,
                            fontSize: 15,
                            lineHeight: 1,
                            flex: "0 0 auto",
                          }}
                        >
                          {relationship.count}
                        </strong>
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 9,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentSearch(selectedAsset.name);
                        setScreen("documents");
                      }}
                      style={{
                        ...assetTinyButtonStyle,
                        flex: isMobile ? "1 1 140px" : undefined,
                        minHeight: isMobile ? 36 : undefined,
                      }}
                    >
                      Search All Documents
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetEditorOpen(true)}
                      style={{
                        ...assetTinyButtonStyle,
                        flex: isMobile ? "1 1 140px" : undefined,
                        minHeight: isMobile ? 36 : undefined,
                      }}
                    >
                      Manage Relationships
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: assetVisibleSections.recordSetup === false ? "none" : "block",
                    border: `1px solid ${assetSetupItems.length ? "#D8B45C" : colors.line}`,
                    borderRadius: 10,
                    background: assetSetupItems.length ? "#FFF9E8" : "#FFFFFF",
                    padding: 10,
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        ...assetInfoLabelStyle,
                        whiteSpace: "nowrap",
                        wordBreak: "normal",
                        overflowWrap: "normal",
                        flex: "1 1 130px",
                      }}
                    >
                      Record Setup
                    </span>
                    <span
                      style={{
                        ...badgeStyle(assetSetupItems.length ? "Monitor" : "Online"),
                        whiteSpace: "nowrap",
                        wordBreak: "normal",
                        overflowWrap: "normal",
                        flex: "0 0 auto",
                      }}
                    >
                      {assetSetupItems.length
                        ? `${assetSetupCompleted} / 5 complete`
                        : "Complete"}
                    </span>
                  </div>
                  {assetSetupItems.length ? (
                    <div style={{ display: "grid", gap: 5, marginTop: 7 }}>
                      {assetSetupItems.map((item) => (
                        <div
                          key={item}
                          style={{
                            color: colors.navy,
                            fontSize: 11,
                            lineHeight: 1.4,
                            fontWeight: 800,
                            whiteSpace: "normal",
                            wordBreak: "normal",
                            overflowWrap: "break-word",
                            minWidth: 0,
                          }}
                        >
                          ○ {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ ...assetCardHintStyle, marginTop: 7 }}>
                      Core asset records are complete.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div
              style={{
                ...assetTopGridStyle,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "minmax(190px, 30%) minmax(0, 1fr)",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  selectedAssetCoverPhoto &&
                  openPhotoPreview(selectedAssetCoverPhoto)
                }
                style={assetHeroPhotoStyle}
                disabled={!selectedAssetCoverSource}
              >
                {selectedAssetCoverSource ? (
                  <img
                    src={selectedAssetCoverSource}
                    alt={selectedAssetCoverPhoto?.name || selectedAsset.name}
                    style={assetHeroPhotoImageStyle}
                  />
                ) : (
                  <span>{selectedAsset.name.slice(0, 1).toUpperCase()}</span>
                )}
              </button>

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
                    "Name",
                    selectedAsset.name,
                    <input
                      value={selectedAsset.name}
                      onChange={(event) =>
                        updateAsset({ name: event.currentTarget.value })
                      }
                      style={assetCompactInputStyle}
                    />,
                  )}
                  {infoValue(
                    "Make",
                    selectedAsset.make || "",
                    <input
                      value={selectedAsset.make || ""}
                      onChange={(event) =>
                        updateAsset({ make: event.currentTarget.value })
                      }
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ make: "" }),
                  )}
                  {infoValue(
                    "Category",
                    selectedAsset.category,
                    <>
                      <input
                        list={`asset-categories-${selectedAsset.id}`}
                        value={selectedAsset.category}
                        onChange={(event) =>
                          updateAsset({ category: event.currentTarget.value })
                        }
                        style={assetCompactInputStyle}
                      />
                      <datalist id={`asset-categories-${selectedAsset.id}`}>
                        {assetCategories.map((category) => (
                          <option key={category} value={category} />
                        ))}
                      </datalist>
                    </>,
                  )}
                  {infoValue(
                    "Model",
                    selectedAsset.model || "",
                    <input
                      value={selectedAsset.model || ""}
                      onChange={(event) =>
                        updateAsset({ model: event.currentTarget.value })
                      }
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ model: "" }),
                  )}
                  {infoValue(
                    "Locations",
                    assetLocationIds(selectedAsset)
                      .map((id) => locationName(id))
                      .filter(Boolean)
                      .join(", ") || "No location",
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={{ display: "grid", gap: 5 }}>
                        <small style={mutedSmallStyle}>Primary location</small>
                        <select
                          value={selectedAsset.locationId || ""}
                          onChange={(event) => {
                            const locationId = event.currentTarget.value;
                            updateAsset({
                              locationId,
                              locationIds: Array.from(new Set([locationId, ...assetLocationIds(selectedAsset)].filter(Boolean))),
                            } as Partial<AtlasAssetRecord>);
                          }}
                          style={assetCompactInputStyle}
                        >
                          <option value="">No primary location</option>
                          {alphabeticalLocations.map((location) => (
                            <option key={location.id} value={location.id}>{location.name}</option>
                          ))}
                        </select>
                      </label>
                      <div style={{ maxHeight: 190, overflowY: "auto", border: `1px solid ${colors.line}`, borderRadius: 9, padding: 8, display: "grid", gap: 6 }}>
                        {alphabeticalLocations.map((location) => {
                          const checked = assetHasLocation(selectedAsset, location.id);
                          return (
                            <label key={location.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const currentIds = assetLocationIds(selectedAsset);
                                  const locationIds = event.currentTarget.checked
                                    ? Array.from(new Set([...currentIds, location.id]))
                                    : currentIds.filter((id) => id !== location.id);
                                  const locationId = locationIds.includes(selectedAsset.locationId)
                                    ? selectedAsset.locationId
                                    : locationIds[0] || "general";
                                  updateAsset({ locationId, locationIds } as Partial<AtlasAssetRecord>);
                                }}
                              />
                              <span>{location.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>,
                  )}
                  {infoValue(
                    "Year",
                    selectedAsset.year || "",
                    <input
                      value={selectedAsset.year || ""}
                      inputMode="numeric"
                      onChange={(event) =>
                        updateAsset({ year: event.currentTarget.value })
                      }
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ year: "" }),
                  )}
                  {infoValue(
                    "Status",
                    selectedAsset.status,
                    <select
                      value={selectedAsset.status}
                      onChange={(event) =>
                        updateAsset({
                          status: event.currentTarget.value as Status,
                        })
                      }
                      style={assetCompactInputStyle}
                    >
                      {["Monitor", "Offline", "Online", "Seasonal"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ),
                      )}
                    </select>,
                  )}
                  {infoValue(
                    "Manufacturer",
                    selectedAsset.manufacturer || "",
                    <input
                      value={selectedAsset.manufacturer || ""}
                      onChange={(event) =>
                        updateAsset({
                          manufacturer: event.currentTarget.value,
                        })
                      }
                      style={assetCompactInputStyle}
                    />,
                    () => updateAsset({ manufacturer: "" }),
                  )}
                  {infoValue(
                    "Serial / VIN / HIN",
                    selectedAsset.serial || (selectedAsset.serialRequirement === "Not Required" ? "Not required" : ""),
                    <div style={{ display: "grid", gap: 6 }}>
                      <select
                        value={selectedAsset.serialRequirement || "Required"}
                        onChange={(event) => updateAsset({ serialRequirement: event.currentTarget.value as "Required" | "Not Required" })}
                        style={assetCompactInputStyle}
                      >
                        <option value="Required">Required</option>
                        <option value="Not Required">Not required</option>
                      </select>
                      {selectedAsset.serialRequirement !== "Not Required" ? <input
                        value={selectedAsset.serial || ""}
                        onChange={(event) => updateAsset({ serial: event.currentTarget.value })}
                        placeholder="Serial / VIN / HIN"
                        style={assetCompactInputStyle}
                      /> : null}
                    </div>,
                    () => updateAsset({ serial: "" }),
                  )}
                  {infoValue(
                    "Manual",
                    selectedAsset.manualRequirement === "Not Required" ? "Not required" : attachedManuals.length ? `${attachedManuals.length} attached` : "Required",
                    <select
                      value={selectedAsset.manualRequirement || "Required"}
                      onChange={(event) => updateAsset({ manualRequirement: event.currentTarget.value as "Required" | "Not Required" })}
                      style={assetCompactInputStyle}
                    >
                      <option value="Required">Required</option>
                      <option value="Not Required">Not required</option>
                    </select>,
                  )}
                  {infoValue(
                    "Procedure",
                    selectedAsset.procedureRequirement === "Not Required" ? "Not required" : linkedAssetProcedures.length ? `${linkedAssetProcedures.length} linked` : "Required",
                    <select
                      value={selectedAsset.procedureRequirement || "Required"}
                      onChange={(event) => updateAsset({ procedureRequirement: event.currentTarget.value as "Required" | "Not Required" })}
                      style={assetCompactInputStyle}
                    >
                      <option value="Required">Required</option>
                      <option value="Not Required">Not required</option>
                    </select>,
                  )}
                </div>

                <div style={assetVendorBlockStyle}>
                  <span style={assetInfoLabelStyle}>Vendors</span>
                  <div style={assetVendorRowStyle}>
                    {selectedVendors.map((vendor) => (
                      <span key={vendor.id} style={assetVendorChipStyle}>
                        {vendor.name}
                        {assetEditorOpen ? (
                          <button
                            type="button"
                            onClick={() => removeVendor(vendor.id)}
                            style={assetVendorRemoveStyle}
                            aria-label={`Remove ${vendor.name}`}
                          >
                            {closeSymbol}
                          </button>
                        ) : null}
                      </span>
                    ))}
                    {!selectedVendors.length ? (
                      <span style={assetCardHintStyle}>No vendors added</span>
                    ) : null}
                    {assetEditorOpen ? (
                      <select
                        value=""
                        onChange={(event) =>
                          addSelectedVendor(event.currentTarget.value)
                        }
                        style={assetAddVendorSelectStyle}
                      >
                        <option value="">+ Add Vendor</option>
                        {alphabeticalVendors
                          .filter(
                            (vendor) =>
                              !selectedAsset.vendorIds.includes(vendor.id),
                          )
                          .map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                      </select>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

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

            {assetPanelSection === "procedures" ? (
              <section style={{ ...assetCardStyle, marginBottom: 12 }}>
                <div style={{ ...assetCardHeaderStyle, marginBottom: 8 }}>
                  <strong>Procedures</strong>
                </div>
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
                  }}>
                  {linkedAssetProcedures.length
                    ? `${linkedAssetProcedures.length} linked procedure${linkedAssetProcedures.length === 1 ? "" : "s"}.`
                    : "No procedures linked."}
                </div>
                <button
                  type="button"
                  onClick={() => setScreen("procedures")}
                  style={{ ...assetActionButtonStyle, marginTop: 8 }}
                >
                  Open Procedures
                </button>
              </section>
            ) : null}

            <section
              className="atlas-asset-timeline-card"
              style={{ ...assetCardStyle, display: assetPanelSection === "history" ? "block" : "none" }}
            >
              <div style={assetCardHeaderStyle}>
                <div>
                  <strong>Service History</strong>
                  <div style={assetCardHintStyle}>
                    Completed work, procedure results, photos, documents, vendor, and service notes
                  </div>
                </div>
                <div style={assetHistoryHeaderActionsStyle}>
                  <span style={assetHistoryOrderStyle}>
                    {assetHistory.length} event{assetHistory.length === 1 ? "" : "s"} · Newest first
                  </span>
                  <button type="button" onClick={() => setScreen("history")} style={assetTinyButtonStyle}>
                    View All History
                  </button>
                </div>
              </div>

              {assetHistory.length ? (
                <div className="atlas-asset-timeline">
                  {assetHistory.slice(0, isMobile ? 6 : 5).map((entry, index) => {
                    const workOrder = relatedWorkOrders.find(
                      (record) => record.id === entry.workOrderId,
                    );
                    const vendorId = entry.vendorId || workOrder?.vendorId || "";
                    const vendor = vendorId
                      ? vendorRecords.find((record) => record.id === vendorId)
                      : undefined;
                    const procedureId = entry.procedureId || workOrder?.procedureId || "";
                    const procedure = procedureId
                      ? procedureRecords.find((record) => record.id === procedureId)
                      : undefined;
                    const cost =
                      Number(workOrder?.actualCost || 0) ||
                      Number(workOrder?.estimatedCost || 0);
                    const notes = String(entry.notes || workOrder?.notes || "").trim();
                    const checklist = Array.isArray(entry.checklist) ? entry.checklist : [];
                    const passedSteps = checklist.filter((item: any) =>
                      item.completed === true || /^\[PASS\]/i.test(String(item.text || "")),
                    ).length;
                    const flaggedSteps = checklist.filter((item: any) =>
                      /^\[FLAG\]/i.test(String(item.text || "")),
                    ).length;
                    const failedSteps = checklist.filter((item: any) =>
                      /^\[FAIL\]/i.test(String(item.text || "")),
                    ).length;
                    const procedureSummary = checklist.length
                      ? `${passedSteps}/${checklist.length} passed${flaggedSteps ? ` · ${flaggedSteps} flagged` : ""}${failedSteps ? ` · ${failedSteps} failed` : ""}`
                      : "";
                    const photoCount = Array.isArray(entry.photos) ? entry.photos.length : 0;
                    const documentCount = Array.isArray(entry.documents) ? entry.documents.length : 0;
                    const signoff = (entry.notesHistory || []).find((item: any) =>
                      /^Procedure sign-off/i.test(String(item.text || "")),
                    );

                    return (
                      <div
                        key={entry.id}
                        className="atlas-asset-timeline-item"
                        style={{ animationDelay: `${index * 55}ms` }}
                      >
                        <div className="atlas-asset-timeline-rail" aria-hidden="true">
                          <span className="atlas-asset-timeline-dot" />
                          {index < Math.min(assetHistory.length, isMobile ? 6 : 5) - 1 ? (
                            <span className="atlas-asset-timeline-line" />
                          ) : null}
                        </div>

                        <button
                          type="button"
                          className="atlas-asset-timeline-row"
                          onClick={() => {
                            setSelectedServiceId(entry.workOrderId);
                            setScreen("history");
                          }}
                          aria-label={`Open ${entry.title} from ${formatDate(entry.date)}`}
                        >
                          <span className="atlas-asset-timeline-date">
                            {formatDate(entry.date)}
                          </span>

                          <span className="atlas-asset-timeline-main">
                            <strong className="atlas-asset-timeline-title">
                              {entry.title || "Asset service event"}
                            </strong>
                            <span className="atlas-asset-timeline-summary">
                              {workOrder?.workType || "Service"}
                              {vendor?.name ? ` · ${vendor.name}` : ""}
                              {procedure?.title ? ` · ${procedure.title}` : ""}
                              {cost > 0 ? ` · $${cost.toLocaleString()}` : ""}
                            </span>
                            {procedureSummary || photoCount || documentCount ? (
                              <span className="atlas-asset-timeline-summary">
                                {procedureSummary || "No procedure checklist"}
                                {photoCount ? ` · ${photoCount} photo${photoCount === 1 ? "" : "s"}` : ""}
                                {documentCount ? ` · ${documentCount} document${documentCount === 1 ? "" : "s"}` : ""}
                              </span>
                            ) : null}
                          </span>

                          <span className="atlas-asset-timeline-status">
                            <span style={badgeStyle(entry.status)}>{entry.status}</span>
                            <span className="atlas-asset-timeline-arrow" aria-hidden="true">→</span>
                          </span>

                          <span className="atlas-asset-timeline-hover-panel" aria-hidden="true">
                            <span className="atlas-asset-timeline-hover-grid">
                              <span>
                                <small>Work type</small>
                                <strong>{workOrder?.workType || "Service"}</strong>
                              </span>
                              <span>
                                <small>Vendor</small>
                                <strong>{vendor?.name || "Not assigned"}</strong>
                              </span>
                              <span>
                                <small>Cost</small>
                                <strong>{cost > 0 ? `$${cost.toLocaleString()}` : "Not recorded"}</strong>
                              </span>
                              <span>
                                <small>Procedure</small>
                                <strong>{procedure?.title || "Not linked"}</strong>
                              </span>
                              <span>
                                <small>Checklist</small>
                                <strong>{procedureSummary || "Not recorded"}</strong>
                              </span>
                              <span>
                                <small>Evidence</small>
                                <strong>
                                  {photoCount || documentCount
                                    ? `${photoCount} photo${photoCount === 1 ? "" : "s"} · ${documentCount} document${documentCount === 1 ? "" : "s"}`
                                    : "None recorded"}
                                </strong>
                              </span>
                              <span>
                                <small>Sign-off</small>
                                <strong>{signoff?.text || "Not recorded"}</strong>
                              </span>
                            </span>
                            <span className="atlas-asset-timeline-hover-notes">
                              {notes || "No notes were recorded for this event."}
                            </span>
                            <span className="atlas-asset-timeline-hover-action">
                              Open original work order →
                            </span>
                          </span>
                        </button>
                      </div>
                    );
                  })}

                  {assetHistory.length > (isMobile ? 6 : 5) ? (
                    <button
                      type="button"
                      className="atlas-asset-timeline-more"
                      onClick={() => setScreen("history")}
                    >
                      View {assetHistory.length - (isMobile ? 6 : 5)} more event
                      {assetHistory.length - (isMobile ? 6 : 5) === 1 ? "" : "s"} →
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="atlas-asset-timeline-empty">
                  <span className="atlas-asset-timeline-empty-icon">↻</span>
                  <strong>No service history yet</strong>
                  <span>Completed work orders for this asset will build its service record automatically.</span>
                </div>
              )}
            </section>

            <div
              style={{
                ...assetPanelFooterStyle,
                display: assetPanelSection === "documents" ? "flex" : "none",
                marginTop: 14,
                position: "relative",
                zIndex: 1,
                clear: "both",
              }}
            >
              <div style={assetFileSummaryStyle}>
                <strong>Manuals &amp; Files</strong>
                <span style={assetCardHintStyle}>
                  {attachedManuals.length} manual{attachedManuals.length === 1 ? "" : "s"}
                </span>
                {attachedManuals.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManualId(attachedManuals[0].id);
                      setScreen("manuals");
                    }}
                    style={assetTinyButtonStyle}
                  >
                    View Manuals
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => startManualForAsset(selectedAsset)}
                  style={assetTinyButtonStyle}
                >
                  Add Manual
                </button>
                <button
                  type="button"
                  onClick={() => findManualForAsset(selectedAsset)}
                  style={assetTinyButtonStyle}
                >
                  Find Online
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentSearch(selectedAsset.name);
                    setScreen("documents");
                  }}
                  style={assetTinyButtonStyle}
                >
                  Documents
                </button>
              </div>
              <button
                type="button"
                onClick={() => void deleteAssetRecord(selectedAsset)}
                style={assetDeleteBottomButtonStyle}
              >
                Delete Asset
              </button>
            </div>
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select an asset.</strong>
            <p style={mutedSmallStyle}>
              Open an asset to see its information, manuals, photos, work
              orders, and documents.
            </p>
          </div>
        )
      }
    />
  );
}
