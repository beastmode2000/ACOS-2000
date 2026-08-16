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

  const assetPanelTab =
    assetPanelSection === "overview" ? "overview" : "work";

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
            <div style={assetPanelTitleRowStyle}>
              <div>
                <h3 style={assetPanelTitleStyle}>
                  {selectedAsset.name.trim() || "Asset"}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 4,
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
                  value={assetPanelTab}
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
                  <option value="overview">Asset Information</option>
                  <option value="work">
                    Work / History ({openAssetWorkOrders.length + assetHistory.length})
                  </option>
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
                    ["overview", "Asset Information"],
                    ["work", "Work / History"],
                  ].map(([key, label]) => {
                    const active = assetPanelTab === key;
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!assetEditorOpen && assetPanelCustomizeOpen && assetPanelTab === "overview" ? (
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

            <section
              style={{
                display: "none",
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

            <div
              style={{
                ...assetTopGridStyle,
                display: assetPanelTab === "overview" ? "grid" : "none",
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
                          const currentIds = assetLocationIds(selectedAsset);
                          const locationIds = locationId === "general"
                            ? ["general"]
                            : locationId
                              ? Array.from(
                                  new Set([locationId, ...currentIds.filter((id) => id !== "general")]),
                                )
                              : currentIds.filter((id) => id !== "general");
                          updateAsset({
                            locationId: locationId || locationIds[0] || "",
                            locationIds,
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
                                    ? location.id === "general"
                                      ? ["general"]
                                      : Array.from(
                                          new Set([
                                            ...currentIds.filter((id) => id !== "general"),
                                            location.id,
                                          ]),
                                        )
                                    : currentIds.filter((id) => id !== location.id);
                                  const locationId = locationIds.includes(selectedAsset.locationId)
                                    ? selectedAsset.locationId
                                    : locationIds[0] || "";
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
                    /hot water storage|vitocell/i.test(selectedAsset.name || "")
                      ? "Serial Number 1"
                      : "Serial / VIN / HIN",
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
                        placeholder={/hot water storage|vitocell/i.test(selectedAsset.name || "") ? "Serial Number 1" : "Serial / VIN / HIN"}
                        style={assetCompactInputStyle}
                      /> : null}
                    </div>,
                    () => updateAsset({ serial: "" }),
                  )}
                  {/hot water storage|vitocell/i.test(selectedAsset.name || "")
                    ? infoValue(
                        "Serial Number 2",
                        (selectedAsset as AtlasAssetRecord).serial2 || "",
                        <input
                          value={(selectedAsset as AtlasAssetRecord).serial2 || ""}
                          onChange={(event) =>
                            updateAsset({ serial2: event.currentTarget.value })
                          }
                          placeholder="Serial Number 2"
                          style={assetCompactInputStyle}
                        />,
                        () => updateAsset({ serial2: "" }),
                      )
                    : null}
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
                display: assetPanelTab === "overview" ? "grid" : "none",
                gridTemplateColumns: "minmax(0, 1fr)",
                alignItems: "start",
              }}
            >
              <section style={{ ...assetCardStyle, display: assetPanelTab === "overview" ? "block" : "none" }}>
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

            {assetPanelTab === "overview" ? (
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
              <section style={{ ...assetCardStyle, display: assetPanelTab === "overview" ? "block" : "none" }}>
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

            {assetPanelTab === "work" ? (
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

            {assetPanelTab === "work" ? (
              <section style={{ ...assetCardStyle, marginBottom: 12 }}>
                <div style={{ ...assetCardHeaderStyle, marginBottom: 8 }}>
                  <strong>History</strong>
                  <button
                    type="button"
                    onClick={() => setScreen("history")}
                    style={assetTinyButtonStyle}
                  >
                    View All
                  </button>
                </div>
                {assetHistory.length ? (
                  <div style={{ display: "grid", gap: 7 }}>
                    {assetHistory.slice(0, 8).map((entry) => (
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
                          padding: "8px 9px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", color: colors.navy, fontSize: 12 }}>
                          {entry.title || "Service event"}
                        </strong>
                        <span style={mutedSmallStyle}>
                          {formatDate(entry.date)} · {entry.status}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={assetEmptyStateStyle}>No service history.</div>
                )}
              </section>
            ) : null}

            {assetPanelTab === "work" ? (
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
              style={{ ...assetCardStyle, display: assetPanelTab === "overview" ? "block" : "none", marginBottom: 12 }}
            >
              <div style={assetCardHeaderStyle}>
                <div>
                  <strong>Asset Timeline</strong>
                  <div style={assetCardHintStyle}>
                    Hover an event for service details, cost, vendor, and notes
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
                    const vendor = workOrder?.vendorId
                      ? vendorRecords.find((record) => record.id === workOrder.vendorId)
                      : undefined;
                    const cost =
                      Number(workOrder?.actualCost || 0) ||
                      Number(workOrder?.estimatedCost || 0);
                    const notes = String(workOrder?.notes || "").trim();

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
                              {cost > 0 ? ` · $${cost.toLocaleString()}` : ""}
                            </span>
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
                                <small>Priority</small>
                                <strong>{workOrder?.priority || "Not recorded"}</strong>
                              </span>
                            </span>
                            <span className="atlas-asset-timeline-hover-notes">
                              {notes || "No notes were recorded for this event."}
                            </span>
                            <span className="atlas-asset-timeline-hover-action">
                              Open full work-order history →
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
                  <strong>No timeline events yet</strong>
                  <span>Completed service and work orders will appear here.</span>
                </div>
              )}
            </section>

            <section
              style={{
                ...assetCardStyle,
                display: assetPanelTab === "overview" ? "block" : "none",
                marginBottom: 12,
                background: "#FFFFFF",
                borderLeft: `4px solid ${assetAttentionItems.length ? "#D92D20" : colors.gold}`,
              }}
              aria-label="Asset intelligence"
            >
              <div style={assetCardHeaderStyle}>
                <div>
                  <strong>Operations Snapshot</strong>
                  <div style={assetCardHintStyle}>Current work, activity, and the next action that matters</div>
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
                  assetPanelTab === "overview" &&
                  assetVisibleSections.status !== false
                    ? "block"
                    : "none",
                marginBottom: 12,
                background: "#F8FAFD",
              }}
            >
              <div style={assetCardHeaderStyle}>
                <div>
                  <strong>Maintenance Status</strong>
                  <div style={assetCardHintStyle}>
                    Condition, open work, upcoming maintenance, and record readiness
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
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: assetPanelTab === "overview" ? "grid" : "none",
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
                      <span style={assetInfoLabelStyle}>Connected Records</span>
                      <div style={assetCardHintStyle}>
                        Jump to the records connected to this equipment.
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
                        label: "Documents",
                        count: linkedAssetDocuments.length + attachedManuals.length,
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
