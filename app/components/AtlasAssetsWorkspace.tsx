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

  const isDocumentLinkedToAsset = (document: DocumentRecord, asset: AssetRecord) => {
    if (!asset.id) return false;
    if (document.linkedAssetId === asset.id) return true;
    if (document.targetType === "Asset" && document.targetId === asset.id) return true;

    // Older document links can retain an obsolete asset ID after duplicate cleanup
    // or asset replacement. When Atlas still records the target as an Asset,
    // preserve the visible relationship by matching the saved target name.
    return (
      document.targetType === "Asset" &&
      normalizeAssetMatchValue(document.targetName) ===
        normalizeAssetMatchValue(asset.name)
    );
  };

  const openAssetDocumentImmediately = (document: DocumentRecord) => {
    const primaryFile = (document.files || []).find(
      (file) => file.url || file.dataUrl,
    );
    const source =
      primaryFile?.url ||
      primaryFile?.dataUrl ||
      document.href ||
      "";

    if (source && typeof window !== "undefined") {
      window.open(source, "_blank", "noopener,noreferrer");
      return;
    }

    // Only fall back to Documents when the record has no directly openable file.
    setDocumentSearch(document.title || selectedAsset.name);
    setScreen("documents");
  };

  const assetRecordQualityRows = assetSourceRecords.map((asset) => {
    const linkedManualCount = intakeDocs.filter((document) =>
      isDocumentLinkedToAsset(document, asset),
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
        .filter((document) => isDocumentLinkedToAsset(document, selectedAsset))
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
      detail=""
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
          : { gridTemplateColumns: "minmax(300px, 340px) minmax(520px, 1fr)", gap: 12, alignItems: "start" }
      }
      listPanelStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden", padding: 0 }
          : {
              minWidth: 0,
              maxHeight: "calc(100vh - 190px)",
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 6,
              alignSelf: "start",
            }
      }
      drawerStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              position: "sticky",
              top: 8,
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              height: "calc(100dvh - 190px)",
              maxHeight: "calc(100dvh - 190px)",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              scrollbarGutter: "stable",
              scrollPaddingTop: 8,
              scrollPaddingBottom: 28,
              paddingBottom: 20,
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
        <div style={{ display: "grid", gap: 7 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              padding: "2px 0 4px",
            }}
          >
            <input
              value={assetListSearch}
              onChange={(event) => setAssetListSearch(event.currentTarget.value)}
              placeholder="Search assets..."
              style={{
                ...inputStyle,
                flex: "1 1 auto",
                minWidth: 0,
                height: 32,
                padding: "5px 9px",
                fontSize: 12,
              }}
              aria-label="Search assets"
            />
            <span
              style={{
                ...mutedSmallStyle,
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                fontSize: 10,
              }}
            >
              {displayedAssets.length}
            </span>
            {assetListSearch ? (
              <button
                type="button"
                onClick={() => setAssetListSearch("")}
                style={{ ...assetTinyButtonStyle, height: 30, padding: "4px 7px" }}
              >
                Clear
              </button>
            ) : null}
          </div>

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
            const assetNeedsService =
              asset.status === "Offline" ||
              assetOpenWork.some(
                (record) =>
                  record.priority === "High" ||
                  (Boolean(record.date) && record.date < todayISO()),
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
            <div
              style={{
                ...assetPanelTitleRowStyle,
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  minWidth: 0,
                  flex: "1 1 420px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    selectedAssetCoverPhoto
                      ? openPhotoPreview(selectedAssetCoverPhoto)
                      : undefined
                  }
                  style={{
                    width: isMobile ? 82 : 96,
                    height: isMobile ? 82 : 96,
                    flex: "0 0 auto",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    padding: 0,
                    background: colors.panel,
                    cursor: selectedAssetCoverPhoto ? "pointer" : "default",
                  }}
                >
                  {selectedAssetCoverSource ? (
                    <img
                      src={selectedAssetCoverSource}
                      alt={selectedAssetCoverPhoto?.name || selectedAsset.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: "100%",
                        height: "100%",
                        color: colors.muted,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      No photo
                    </span>
                  )}
                </button>

                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                  <h3 style={{ ...assetPanelTitleStyle, marginBottom: 7 }}>
                    {selectedAsset.name.trim() || "Asset"}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: "5px 12px",
                    }}
                  >
                    <span style={mutedSmallStyle}>
                      <strong style={{ color: colors.navy }}>Make / Model:</strong>{" "}
                      {[selectedAsset.make, selectedAsset.model].filter(Boolean).join(" ") || "Not recorded"}
                    </span>
                    <span style={mutedSmallStyle}>
                      <strong style={{ color: colors.navy }}>Serial / VIN / HIN:</strong>{" "}
                      {selectedAsset.serial || "Not recorded"}
                    </span>
                    <span style={mutedSmallStyle}>
                      <strong style={{ color: colors.navy }}>Location:</strong>{" "}
                      {selectedAsset.locationId && selectedAsset.locationId !== "general"
                        ? locationName(selectedAsset.locationId)
                        : "Not assigned"}
                    </span>
                    <span style={mutedSmallStyle}>
                      <strong style={{ color: colors.navy }}>Category:</strong>{" "}
                      {selectedAsset.category || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={assetActionRowStyle}>
                {assetEditorOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void deleteAssetRecord(selectedAsset)}
                      style={{ ...dangerButtonStyle, width: "auto" }}
                    >
                      Delete Asset
                    </button>
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
                      onClick={() => void deleteAssetRecord(selectedAsset)}
                      style={{ ...dangerButtonStyle, width: "auto" }}
                    >
                      Delete Asset
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div
              style={{
                marginBottom: 12,
                borderBottom: `1px solid ${colors.line}`,
                display: "flex",
                gap: 6,
              }}
              role="tablist"
              aria-label="Asset information tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={assetPanelSection === "overview"}
                onClick={() => setAssetPanelSection("overview")}
                style={{
                  border: 0,
                  borderBottom: `3px solid ${assetPanelSection === "overview" ? colors.gold : "transparent"}`,
                  background: assetPanelSection === "overview" ? "#FFF9E8" : "transparent",
                  color: assetPanelSection === "overview" ? colors.navy : colors.muted,
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Asset Info
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={assetPanelSection !== "overview"}
                onClick={() => setAssetPanelSection("work")}
                style={{
                  border: 0,
                  borderBottom: `3px solid ${assetPanelSection !== "overview" ? colors.gold : "transparent"}`,
                  background: assetPanelSection !== "overview" ? "#FFF9E8" : "transparent",
                  color: assetPanelSection !== "overview" ? colors.navy : colors.muted,
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Work & Service
              </button>
            </div>



            

            

            <div
              style={{
                ...assetTopGridStyle,
                gridTemplateColumns: "1fr",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  selectedAssetCoverPhoto &&
                  openPhotoPreview(selectedAssetCoverPhoto)
                }
                style={{ ...assetHeroPhotoStyle, display: "none" }}
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

              <section style={{ ...assetCardStyle, display: assetPanelSection === "overview" ? "block" : "none" }}>
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
                    gridTemplateColumns: "1fr",
                    gap: 8,
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
                      <CreatableRelationshipField
                        label="Primary location"
                        value={selectedAsset.locationId || ""}
                        options={alphabeticalLocations.map((location) => ({ id: location.id, label: location.name }))}
                        emptyLabel="Select or add location"
                        compact
                        onCreate={createLocationFromAsset}
                        onChange={(locationId) => {
                          updateAsset({
                            locationId: locationId || "general",
                            locationIds: Array.from(
                              new Set([locationId, ...assetLocationIds(selectedAsset)].filter(Boolean)),
                            ),
                          } as Partial<AtlasAssetRecord>);
                        }}
                      />
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
                display: assetPanelSection === "overview" ? "grid" : "none",
                gridTemplateColumns: "minmax(0, 1fr)",
                alignItems: "start",
              }}
            >
              <section style={{ ...assetCardStyle, display: assetPanelSection === "overview" ? "block" : "none" }}>
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

              <section style={{ ...assetCardStyle, display: assetPanelSection === "overview" ? "block" : "none" }}>
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
                  <div style={{ display: "grid", gap: 5 }}>
                    {selectedAssetPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto auto",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 8px",
                          border: `1px solid ${colors.line}`,
                          borderRadius: 8,
                          background: "#FFFFFF",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openPhotoPreview(photo)}
                          style={{
                            border: 0,
                            padding: 0,
                            background: "transparent",
                            color: colors.navy,
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {photo.name || "Asset photo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void renameAssetPhoto(photo)}
                          style={assetTinyButtonStyle}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAssetPhoto(photo)}
                          style={{ ...dangerButtonStyle, width: "auto", padding: "5px 8px" }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
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

            {assetPanelSection !== "overview" ? (
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

            {assetPanelSection !== "overview" ? (
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

            

            {assetPanelSection === "overview" ? (
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 9,
                  }}
                >
                  <strong style={{ color: colors.navy, fontSize: 12 }}>
                    Manuals
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentSearch(selectedAsset.name);
                      setScreen("documents");
                    }}
                    style={assetTinyButtonStyle}
                  >
                    Add / Link Manual PDF
                  </button>
                </div>

                {attachedManuals.length ? (
                  <div style={{ display: "grid", gap: 7 }}>
                    {attachedManuals.map((manual) => {
                      const href = String(manual.href || "").trim();
                      return (
                        <div
                          key={manual.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            border: `1px solid ${colors.line}`,
                            borderRadius: 10,
                            background: "#F8FAFD",
                            padding: "9px 10px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                color: colors.navy,
                                fontSize: 12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {manual.title || "Manual PDF"}
                            </strong>
                            <span style={{ ...assetCardHintStyle, display: "block", marginTop: 2 }}>
                              PDF manual
                              {manual.documentNumber ? ` · ${manual.documentNumber}` : ""}
                            </span>
                          </div>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                ...assetPrimaryActionButtonStyle,
                                width: "auto",
                                minHeight: 32,
                                padding: "6px 10px",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Open PDF
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentSearch(selectedAsset.name);
                                setScreen("documents");
                              }}
                              style={assetTinyButtonStyle}
                            >
                              Open
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      border: `1px dashed ${colors.line}`,
                      borderRadius: 10,
                      background: "#F8FAFD",
                      padding: 10,
                      color: colors.muted,
                      fontSize: 11,
                    }}
                  >
                    No manual PDF attached.
                  </div>
                )}

                {linkedAssetDocuments.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 7,
                      }}
                    >
                      <strong style={{ color: colors.navy, fontSize: 12 }}>
                        Other Documents
                      </strong>
                      <span style={assetCardHintStyle}>
                        {linkedAssetDocuments.length}
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {linkedAssetDocuments.slice(0, 6).map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() => openAssetDocumentImmediately(document)}
                          style={{
                            border: `1px solid ${colors.line}`,
                            borderRadius: 9,
                            background: "#FFFFFF",
                            padding: "8px 9px",
                            textAlign: "left",
                            color: colors.navy,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {document.title || "Document"}
                        </button>
                      ))}
                    </div>
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
