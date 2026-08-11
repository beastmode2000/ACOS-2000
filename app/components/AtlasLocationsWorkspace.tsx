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



export default function AtlasLocationsWorkspace(props: any) {
  const [mobileFieldDetailsOpen, setMobileFieldDetailsOpen] = useState(false);
  const {
    addAsset,
    addLinkedPhotoFiles,
    addLocation,
    addLocationCustomDetail,
    addSubLocation,
    assetCardHintStyle,
    assetFileDeleteButtonStyle,
    assetFileListRowStyle,
    assetPanelScrollTimerRef,
    assetRecords,
    assignAssetToLocation,
    buttonRowStyle,
    collapsedLocationIds,
    compactLinkedListStyle,
    compactLinkedRowStyle,
    compactUploadButtonStyle,
    dangerButtonStyle,
    deleteLinkedImage,
    deleteSelectedLocation,
    detailSectionHeaderStyle,
    detailSectionStyle,
    editorHeaderStyle,
    eyebrowStyle,
    fieldLabelStyle,
    formGridStyle,
    goldButtonStyle,
    imageFilesFromPasteEvent,
    inputStyle,
    intakeDocs,
    isMobile,
    isRecordDirty,
    isSeanMarineUser,
    linkedImageFilesFor,
    listStyle,
    locationEditorOpen,
    locationFiltersOpen,
    locationHoveredId,
    locationMobileDrawerOpen,
    locationSearch,
    locationVisibilityFilters,
    locations,
    mutedSmallStyle,
    noticeStyle,
    openUploadedFile,
    pasteLinkedPhoto,
    recordInfoGridStyle,
    recordInfoItemStyle,
    recordNotesStyle,
    removeAssetFromLocation,
    removeLocationCustomDetail,
    renderLinkedDocuments,
    saveDirtyRecord,
    seanVisibleAssetRecords,
    seanVisibleLocationRecords,
    secondaryButtonStyle,
    selectedLocation,
    selectedLocationId,
    serviceRecords,
    setAssetPanelScrolling,
    setCollapsedLocationIds,
    setLocationEditorOpen,
    setLocationFiltersOpen,
    setLocationHoveredId,
    setLocationMobileDrawerOpen,
    setLocationSearch,
    setLocationVisibilityFilters,
    setScreen,
    setSelectedAssetId,
    setSelectedLocationId,
    setSelectedServiceId,
    setSelectedTaskId,
    setTaskListFilter,
    setTasksView,
    showSaveToast,
    stackStyle,
    staffVisibleServiceRecords,
    taskDetails,
    updateLocation,
    updateLocationCustomDetail,
    workPlanTasks
  } = props;
  const locationSourceRecords: AtlasLocationRecord[] = (
    isSeanMarineUser ? seanVisibleLocationRecords : locations
  ) as AtlasLocationRecord[];
  const locationAssetSourceRecords: AtlasAssetRecord[] = (
    isSeanMarineUser ? seanVisibleAssetRecords : assetRecords
  ) as AtlasAssetRecord[];
  const locationWorkSourceRecords: AtlasServiceRecord[] = (
    isSeanMarineUser ? staffVisibleServiceRecords : serviceRecords
  ) as AtlasServiceRecord[];
  const locationAssetCount = (locationId: string) =>
    locationAssetSourceRecords.filter((asset) => assetHasLocation(asset, locationId)).length;
  const locationWorkCount = (locationId: string) => {
    const assetIds = new Set(
      locationAssetSourceRecords
        .filter((asset) => assetHasLocation(asset, locationId))
        .map((asset) => asset.id),
    );
    return locationWorkSourceRecords.filter(
      (record) =>
        record.status !== "Completed" &&
        (record.locationId === locationId || assetIds.has(record.assetId)),
    ).length;
  };
  const locationPhotoCount = (locationId: string) =>
    linkedImageFilesFor("Location", locationId).length;
  const locationDocumentCount = (locationId: string) =>
    intakeDocs.filter(
      (document) =>
        document.targetType === "Location" &&
        document.targetId === locationId,
    ).length;
  const locationIcon = (location: AtlasLocationRecord) => {
    const value = `${location.type} ${location.name}`.toLowerCase();
    if (value.includes("pool") || value.includes("hot tub")) return "🏊";
    if (value.includes("dock") || value.includes("water") || value.includes("boat")) return "⚓";
    if (value.includes("garage") || value.includes("vehicle")) return "🚗";
    if (value.includes("garden") || value.includes("lawn") || value.includes("courtyard") || value.includes("landscape")) return "🌿";
    if (value.includes("kitchen") || value.includes("pantry")) return "🍽️";
    if (value.includes("mechanical") || value.includes("utility") || value.includes("pump")) return "⚙️";
    if (value.includes("room") || value.includes("house") || value.includes("bedroom")) return "🏠";
    return "📍";
  };
  const assetLikeLocationTerms = [
    "lift",
    "boat",
    "cobalt",
    "sea doo",
    "seadoo",
    "jet ski",
    "vehicle",
    "generator",
    "pump",
    "boiler",
    "freezer",
    "refrigerator",
    "mower",
    "tractor",
    "trailer",
    "golf cart",
    "hvac",
    "dehumidifier",
  ];
  const locationLooksLikeAsset = (location: AtlasLocationRecord) => {
    const value = `${location.name} ${location.type}`.toLowerCase();
    return assetLikeLocationTerms.some((term) => value.includes(term));
  };
  const matchingAssetForLocation = (location: AtlasLocationRecord) => {
    const normalizedName = normalizeLocationName(location.name);
    return locationAssetSourceRecords.find(
      (asset) => normalizeLocationName(asset.name) === normalizedName,
    );
  };
  const vagueLocationNames = new Set([
    "general",
    "other",
    "unknown",
    "unassigned",
    "misc",
    "miscellaneous",
  ]);
  const isVagueLocation = (location?: AtlasLocationRecord) =>
    Boolean(
      location &&
        vagueLocationNames.has(normalizeLocationName(location.name)),
    );
  const locationDepth = (location: AtlasLocationRecord) => {
    let depth = 0;
    let current = location;
    const visited = new Set<string>();
    while (current.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId);
      const parent = locationSourceRecords.find((item) => item.id === current.parentId);
      if (!parent) break;
      depth += 1;
      current = parent;
    }
    return depth;
  };
  const locationPath = (location: AtlasLocationRecord) => {
    const parts = [location.name];
    let current = location;
    const visited = new Set<string>();
    while (current.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId);
      const parent = locationSourceRecords.find((item) => item.id === current.parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }
    return parts.join(" / ");
  };
  const possibleAssetLocations = locationSourceRecords.filter(locationLooksLikeAsset);
  const childLocationsFor = (parentId: string) =>
    [...locationSourceRecords]
      .filter((location) => location.parentId === parentId)
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          sensitivity: "base",
        }),
      );
  const normalizedLocationSearch = locationSearch.trim().toLowerCase();
  const locationMatchesSearch = (location: AtlasLocationRecord) =>
    !normalizedLocationSearch ||
    [location.name, location.type, location.zone, location.notes]
      .join(" " )
      .toLowerCase()
      .includes(normalizedLocationSearch);
  const locationMatchesFilters = (location: AtlasLocationRecord) => {
    const assets = locationAssetCount(location.id);
    const work = locationWorkCount(location.id);
    const photos = locationPhotoCount(location.id);
    const empty = assets === 0 && work === 0 && photos === 0;
    return (
      (assets > 0 && locationVisibilityFilters.has("assets")) ||
      (work > 0 && locationVisibilityFilters.has("work")) ||
      (photos > 0 && locationVisibilityFilters.has("photos")) ||
      (empty && locationVisibilityFilters.has("empty"))
    );
  };
  const matchingLocationIds = new Set(
    locations
      .filter(
        (location) =>
          locationMatchesSearch(location) && locationMatchesFilters(location),
      )
      .map((location) => location.id),
  );
  locations.forEach((location) => {
    if (!matchingLocationIds.has(location.id)) return;
    let parentId = location.parentId || "";
    while (parentId) {
      matchingLocationIds.add(parentId);
      parentId = locationSourceRecords.find((item) => item.id === parentId)?.parentId || "";
    }
  });
  const flattenLocationTree = (parentId = "", depth = 0): {
    location: AtlasLocationRecord;
    depth: number;
    hasChildren: boolean;
  }[] =>
    [...locationSourceRecords]
      .filter((location) =>
        parentId
          ? location.parentId === parentId
          : !location.parentId,
      )
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          sensitivity: "base",
        }),
      )
      .flatMap((location) => {
      const children = childLocationsFor(location.id);
      const row = {
        location,
        depth,
        hasChildren: children.length > 0,
      };
      if (!matchingLocationIds.has(location.id)) return [];
      if (collapsedLocationIds.has(location.id) && !normalizedLocationSearch) {
        return [row];
      }
      return [row, ...flattenLocationTree(location.id, depth + 1)];
    });
  const locationRows = flattenLocationTree();
  const toggleLocationFilter = (
    filter: "assets" | "work" | "photos" | "empty",
  ) =>
    setLocationVisibilityFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  const locationPhotos = selectedLocation.id
    ? linkedImageFilesFor("Location", selectedLocation.id)
    : [];
  const locationAssets: AtlasAssetRecord[] = selectedLocation.id
    ? [...locationAssetSourceRecords]
        .filter((asset) => assetHasLocation(asset, selectedLocation.id))
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
          }),
        )
    : [];
  const locationAssetIds = new Set(locationAssets.map((asset) => asset.id));
  const locationWorkOrders = selectedLocation.id
    ? locationWorkSourceRecords.filter((record) =>
        selectedLocation.id === "general"
          ? true
          : record.locationId === selectedLocation.id ||
            locationAssetIds.has(record.assetId),
      )
    : [];
  const locationTasks = selectedLocation.id
    ? workPlanTasks
        .filter((task) => selectedLocation.id === "general" ? true : task.locationId === selectedLocation.id || locationAssetIds.has(taskDetails(task.id).assetId || ""))
        .sort((a, b) => String(taskDetails(a.id).dueDate || "9999-12-31").localeCompare(String(taskDetails(b.id).dueDate || "9999-12-31")))
    : [];
  const locationHistory = locationWorkOrders
    .flatMap((record) => {
      const savedCompletions = (record.serviceHistory || []).map((entry) => ({
        id: `${record.id}-${entry.id}`,
        workOrderId: record.id,
        date: entry.completedAt || record.lastCompletedDate || record.date,
        title: record.title,
        status: "Completed" as ServiceStatus,
      }));
      if (savedCompletions.length) return savedCompletions;
      return [
        {
          id: record.id,
          workOrderId: record.id,
          date: record.lastCompletedDate || record.date,
          title: record.title,
          status: record.status,
        },
      ];
    })
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const locationDocuments = selectedLocation.id
    ? intakeDocs
        .filter(
          (document) =>
            document.targetType === "Location" &&
            document.targetId === selectedLocation.id,
        )
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        )
    : [];
  const openLocationWork = locationWorkOrders.filter(
    (record) => record.status !== "Completed",
  );
  const overdueLocationWork = openLocationWork.filter(
    (record) => Boolean(record.date) && record.date < todayISO(),
  );
  const latestLocationActivity = [
    ...locationHistory.map((entry) => String(entry.date || "")),
    ...locationDocuments.map((document) => String(document.createdAt || "").slice(0, 10)),
    ...locationPhotos.map((photo) => String(photo.createdAt || "").slice(0, 10)),
  ]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0];
  const locationCondition = overdueLocationWork.length
    ? "Attention"
    : openLocationWork.length > 2
      ? "Monitor"
      : "Good";
  const locationInsight = overdueLocationWork.length
    ? `${overdueLocationWork.length} overdue work item${overdueLocationWork.length === 1 ? " needs" : "s need"} attention.`
    : openLocationWork.length
      ? `${openLocationWork.length} open work item${openLocationWork.length === 1 ? " is" : "s are"} linked to this location.`
      : locationAssets.length && !locationDocuments.length
        ? "Assets are assigned here, but no location documents are linked yet."
        : "No immediate location issues are recorded.";
  const topLevelLocationCount = locationSourceRecords.filter(
    (location) => !location.parentId,
  ).length;
  const linkedLocationCount = locationSourceRecords.filter(
    (location) =>
      locationAssetCount(location.id) > 0 ||
      locationWorkCount(location.id) > 0 ||
      locationPhotoCount(location.id) > 0 ||
      locationDocumentCount(location.id) > 0,
  ).length;
  const locationsWithOpenWork = locationSourceRecords.filter(
    (location) => locationWorkCount(location.id) > 0,
  ).length;
  const selectedLocationMatchingAsset = selectedLocation.id
    ? matchingAssetForLocation(selectedLocation)
    : undefined;
  const vagueLocationAssetCount = locationAssetSourceRecords.filter((asset) => {
    const location = locationSourceRecords.find((item) => item.id === asset.locationId);
    return !asset.locationId || isVagueLocation(location);
  }).length;
  const orphanLocationCount = locationSourceRecords.filter(
    (location) =>
      Boolean(location.parentId) &&
      !locations.some((item) => item.id === location.parentId),
  ).length;
  useEffect(() => {
    setMobileFieldDetailsOpen(false);
  }, [selectedLocationId]);

  const selectedLocationPath = (() => {
    if (!selectedLocation.id) return [] as AtlasLocationRecord[];
    const path: AtlasLocationRecord[] = [];
    const visited = new Set<string>();
    let current: AtlasLocationRecord | undefined = selectedLocation;

    while (current?.id && !visited.has(current.id)) {
      path.unshift(current);
      visited.add(current.id);
      current = current.parentId
        ? locationSourceRecords.find((location) => location.id === current?.parentId)
        : undefined;
    }

    return path;
  })();

  return (
    <ListDrawerLayout
      eyebrow="Property Areas"
      title="Locations"
      isMobile={isMobile}
      drawerResetKey={selectedLocationId || "location-empty"}
      mobileDrawerOpen={locationMobileDrawerOpen}
      onMobileDrawerClose={() => {
        setLocationMobileDrawerOpen(false);
        setLocationEditorOpen(false);
      }}
      mobileDrawerTitle={selectedLocation.name || "Location Details"}
      gridStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              gridTemplateColumns: "minmax(340px, 40%) minmax(0, 60%)",
              gap: 14,
              alignItems: "start",
            }
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
        <>
          <button
            type="button"
            onClick={() => {
              addLocation();
              if (isMobile) setLocationMobileDrawerOpen(true);
            }}
            style={goldButtonStyle}
          >
            Add Location
          </button>
        </>
      }
      list={
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
              gap: 7,
            }}
          >
            {[
              ["🏠", "Top level", topLevelLocationCount, "Main property areas"],
              ["🔗", "Connected", linkedLocationCount, "With linked records"],
              ["🔧", "Active work", locationsWithOpenWork, "Locations with work"],
              [
                "↔",
                "Review",
                possibleAssetLocations.length,
                "May belong in Assets",
              ],
              [
                "📦",
                "Unassigned Assets",
                vagueLocationAssetCount,
                "Need a real location",
              ],
              [
                "⚠",
                "Hierarchy Issues",
                orphanLocationCount,
                "Missing parent records",
              ],
            ].map(([icon, label, value, note]) => (
              <div
                key={String(label)}
                style={{
                  minWidth: 0,
                  padding: isMobile ? "10px 9px" : "11px 10px",
                  borderRadius: 14,
                  border: `1px solid ${colors.line}`,
                  background: colors.card,
                  boxShadow: "0 5px 16px rgba(15, 42, 67, 0.06)",
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
                  <span style={{ ...fieldLabelStyle, display: "block" }}>
                    {label}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      display: "grid",
                      placeItems: "center",
                      background: colors.panel,
                      border: `1px solid ${colors.line}`,
                      fontSize: 14,
                      flex: "0 0 auto",
                    }}
                  >
                    {icon}
                  </span>
                </div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 22,
                    lineHeight: 1,
                    marginTop: 5,
                    color: colors.navy,
                  }}
                >
                  {value}
                </strong>
                <small
                  style={{
                    ...mutedSmallStyle,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 5,
                  }}
                >
                  {note}
                </small>
              </div>
            ))}
          </div>
          {(vagueLocationAssetCount || orphanLocationCount) ? (
            <section
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 12,
                background: "#FFFFFF",
                padding: 10,
                display: "grid",
                gap: 9,
              }}
            >
              <div>
                <strong style={{ display: "block", color: colors.navy, fontSize: 12 }}>
                  Hierarchy and Assignment Review
                </strong>
                <span style={mutedSmallStyle}>
                  Assign assets to the most specific physical location and repair missing parent relationships.
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                }}
              >
                <div style={recordInfoItemStyle}>
                  <span style={fieldLabelStyle}>Assets needing location</span>
                  <strong>{vagueLocationAssetCount}</strong>
                  <small style={mutedSmallStyle}>General, unknown, or unassigned</small>
                </div>
                <div style={recordInfoItemStyle}>
                  <span style={fieldLabelStyle}>Broken parent links</span>
                  <strong>{orphanLocationCount}</strong>
                  <small style={mutedSmallStyle}>Parent location no longer exists</small>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {locationAssetSourceRecords
                  .filter((asset) => {
                    const location = locationSourceRecords.find((item) => item.id === asset.locationId);
                    return !asset.locationId || isVagueLocation(location);
                  })
                  .slice(0, 8)
                  .map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssetId(asset.id);
                        setScreen("assets");
                      }}
                      style={secondaryButtonStyle}
                    >
                      Reassign {asset.name}
                    </button>
                  ))}
              </div>
            </section>
          ) : null}

          {possibleAssetLocations.length ? (
            <section
              style={{
                border: `1px solid ${colors.gold}`,
                borderRadius: 12,
                background: "#FFF9E8",
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    color: colors.navy,
                    fontSize: 12,
                  }}
                >
                  Location Classification Review
                </strong>
                <span style={mutedSmallStyle}>
                  These records look more like equipment or vehicles than
                  physical property areas.
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {possibleAssetLocations.slice(0, 8).map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(location.id);
                      setLocationEditorOpen(false);
                      if (isMobile) setLocationMobileDrawerOpen(true);
                    }}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: 30,
                      padding: "5px 8px",
                      background: "#FFFFFF",
                    }}
                  >
                    {location.name}
                  </button>
                ))}
                {possibleAssetLocations.length > 8 ? (
                  <span style={mutedSmallStyle}>
                    +{possibleAssetLocations.length - 8} more
                  </span>
                ) : null}
              </div>
              <span style={mutedSmallStyle}>
                Atlas will not move or delete these records automatically.
              </span>
            </section>
          ) : null}

          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 8,
              display: "grid",
              gap: 6,
              padding: "4px 2px 8px",
              background: colors.panel,
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
                type="search"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.currentTarget.value)}
                placeholder="Search locations..."
                aria-label="Search locations"
                style={{
                  ...inputStyle,
                  flex: "1 1 220px",
                  minWidth: 0,
                  height: 36,
                  padding: "7px 10px",
                }}
              />
              <div style={{ position: "relative", flex: "0 0 auto" }}>
                <button
                  type="button"
                  onClick={() => setLocationFiltersOpen((current) => !current)}
                  aria-expanded={locationFiltersOpen}
                  aria-haspopup="menu"
                  style={{
                    ...secondaryButtonStyle,
                    minHeight: 36,
                    padding: "7px 10px",
                    background:
                      locationVisibilityFilters.size < 4 ? "#FFF3CF" : "#FFFFFF",
                    borderColor:
                      locationVisibilityFilters.size < 4 ? colors.gold : colors.line,
                    whiteSpace: "nowrap",
                  }}
                >
                  Filters{locationVisibilityFilters.size < 4 ? ` (${4 - locationVisibilityFilters.size})` : ""}
                  {locationFiltersOpen ? " ▲" : " ▼"}
                </button>
                {locationFiltersOpen ? (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      width: isMobile ? "min(280px, calc(100vw - 34px))" : 260,
                      border: `1px solid ${colors.line}`,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      padding: 9,
                      boxShadow: "0 16px 38px rgba(24, 43, 77, 0.18)",
                      display: "grid",
                      gap: 6,
                      zIndex: 30,
                    }}
                  >
                    {([
                      ["assets", "Has assets"],
                      ["work", "Has open work"],
                      ["photos", "Has photos"],
                      ["empty", "Empty locations"],
                    ] as const).map(([filter, label]) => {
                      const active = locationVisibilityFilters.has(filter);
                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => {
                            toggleLocationFilter(filter);
                            setLocationFiltersOpen(false);
                          }}
                          style={{
                            ...secondaryButtonStyle,
                            minHeight: 32,
                            padding: "6px 8px",
                            justifyContent: "flex-start",
                            borderColor: active ? colors.gold : colors.line,
                            background: active ? "#FFF8E8" : "#FFFFFF",
                          }}
                        >
                          {active ? "✓ " : ""}{label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setLocationVisibilityFilters(
                          new Set(["assets", "work", "photos", "empty"]),
                        );
                        setLocationFiltersOpen(false);
                      }}
                      style={{ ...secondaryButtonStyle, minHeight: 32, padding: "6px 8px" }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : null}
              </div>
              <span style={{ ...mutedSmallStyle, whiteSpace: "nowrap" }}>
                {locationRows.length} results
              </span>
              {locationSearch || locationVisibilityFilters.size < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocationSearch("");
                    setLocationVisibilityFilters(
                      new Set(["assets", "work", "photos", "empty"]),
                    );
                    setCollapsedLocationIds(new Set());
                    setLocationFiltersOpen(false);
                  }}
                  style={{ ...secondaryButtonStyle, minHeight: 34, padding: "6px 8px" }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            {locationVisibilityFilters.size < 4 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {([
                  ["assets", "Assets"],
                  ["work", "Open work"],
                  ["photos", "Photos"],
                  ["empty", "Empty"],
                ] as const)
                  .filter(([filter]) => !locationVisibilityFilters.has(filter))
                  .map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => toggleLocationFilter(filter)}
                      style={{
                        ...secondaryButtonStyle,
                        minHeight: 26,
                        padding: "3px 7px",
                        borderRadius: 999,
                        background: "#FFF8E5",
                        borderColor: colors.gold,
                        fontSize: 11,
                      }}
                    >
                      Hidden: {label} {closeSymbol}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>

          <div style={{ ...listStyle, gap: 7 }}>
            {locationRows.map(({ location, depth, hasChildren }) => {
              const selected = location.id === selectedLocation.id;
              const hovered = locationHoveredId === location.id;
              const assetCount = locationAssetCount(location.id);
              const workCount = locationWorkCount(location.id);
              const photoCount = locationPhotoCount(location.id);
              const documentCount = locationDocumentCount(location.id);
              const collapsed = collapsedLocationIds.has(location.id);

              return (
                <div
                  key={location.id}
                  onMouseEnter={() => setLocationHoveredId(location.id)}
                  onMouseLeave={() => setLocationHoveredId("")}
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "stretch",
                    border: `1px solid ${
                      selected || hovered ? colors.gold : colors.line
                    }`,
                    borderRadius: 14,
                    background: selected ? "#FFF9EC" : colors.card,
                    boxShadow: hovered
                      ? "0 12px 28px rgba(15, 42, 67, 0.13), 0 0 0 1px rgba(201, 154, 61, 0.12)"
                      : selected
                        ? "0 8px 20px rgba(15, 42, 67, 0.10)"
                        : "0 3px 10px rgba(15, 42, 67, 0.04)",
                    transform: hovered ? "translateY(-2px)" : "translateY(0)",
                    transition:
                      "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(location.id);
                      setLocationEditorOpen(false);
                      if (isMobile) setLocationMobileDrawerOpen(true);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: colors.navy,
                      display: "grid",
                      gridTemplateColumns: "auto auto minmax(0, 1fr)",
                      gap: 8,
                      alignItems: "center",
                      minWidth: 0,
                      padding: isMobile ? "10px 9px" : "11px 10px",
                      paddingLeft:
                        (isMobile ? 9 : 10) +
                        Math.min(depth, 5) * (isMobile ? 12 : 16),
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      onClick={(event) => {
                        if (!hasChildren) return;
                        event.stopPropagation();
                        setCollapsedLocationIds((current) => {
                          const next = new Set(current);
                          if (next.has(location.id)) next.delete(location.id);
                          else next.add(location.id);
                          return next;
                        });
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        border: `1px solid ${colors.line}`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: colors.panel,
                        fontSize: 12,
                        flex: "0 0 auto",
                        visibility: hasChildren ? "visible" : "hidden",
                      }}
                      aria-label={collapsed ? "Expand location" : "Collapse location"}
                    >
                      {collapsed ? "+" : "−"}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: selected || hovered ? "#FFF1C7" : colors.panel,
                        border: `1px solid ${selected || hovered ? colors.gold : colors.line}`,
                        fontSize: 18,
                      }}
                    >
                      {locationIcon(location)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {location.name || "New Location"}
                      </strong>
                      <span
                        style={{
                          display: "inline-flex",
                          marginTop: 4,
                          border: `1px solid ${colors.line}`,
                          borderRadius: 999,
                          background: colors.panel,
                          color: colors.navy,
                          padding: "3px 6px",
                          fontSize: 8,
                          fontWeight: 850,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {location.type || "Location"}
                      </span>
                      <small
                        style={{
                          ...mutedSmallStyle,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {locationPath(location)}
                      </small>
                      <small
                        style={{
                          ...mutedSmallStyle,
                          display: "block",
                          marginTop: 2,
                        }}
                      >
                        {[location.type || "General", `Level ${locationDepth(location) + 1}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      <span
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 5,
                          marginTop: 5,
                        }}
                      >
                        <small style={badgeStyle("Monitor")}>{assetCount} assets</small>
                        {workCount ? (
                          <small style={badgeStyle("Open")}>{workCount} work</small>
                        ) : null}
                        {photoCount ? (
                          <small style={badgeStyle("Completed")}>{photoCount} photos</small>
                        ) : null}
                        {documentCount ? (
                          <small style={badgeStyle("Scheduled")}>{documentCount} docs</small>
                        ) : null}
                      </span>
                    </span>
                  </button>

                  <div
                    style={{
                      display: hovered || selected ? "grid" : "none",
                      alignContent: "center",
                      gap: 4,
                      padding: "6px 7px 6px 0",
                    }}
                  >
                    <button
                      type="button"
                      title="Add sub-location"
                      onClick={() => {
                        setSelectedLocationId(location.id);
                        addSubLocation(location.id);
                        if (isMobile) setLocationMobileDrawerOpen(true);
                      }}
                      style={{
                        ...secondaryButtonStyle,
                        minWidth: 32,
                        minHeight: 28,
                        padding: "3px 7px",
                      }}
                    >
                      + Sub
                    </button>
                    <button
                      type="button"
                      title="Edit location"
                      onClick={() => {
                        setSelectedLocationId(location.id);
                        setLocationEditorOpen(true);
                        if (isMobile) setLocationMobileDrawerOpen(true);
                      }}
                      style={{
                        ...secondaryButtonStyle,
                        minWidth: 32,
                        minHeight: 28,
                        padding: "3px 7px",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}

            {!locationRows.length ? (
              <div style={noticeStyle}>
                <strong>No locations match these filters.</strong>
                <p style={mutedSmallStyle}>
                  Turn a filter back on or clear the search field.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      }
      drawer={
        selectedLocation.id ? (
          <div
            style={{ ...stackStyle, minWidth: 0, overflowX: "hidden" }}
            tabIndex={0}
            onScroll={() => {
              setAssetPanelScrolling(true);
              if (assetPanelScrollTimerRef.current) {
                clearTimeout(assetPanelScrollTimerRef.current);
              }
              assetPanelScrollTimerRef.current = setTimeout(() => {
                setAssetPanelScrolling(false);
              }, 240);
            }}
            onPaste={(event) => {
              const files = imageFilesFromPasteEvent(event);
              if (!files.length) return;
              event.preventDefault();
              void addLinkedPhotoFiles(
                "Location",
                selectedLocation.id,
                selectedLocation.name,
                files,
              );
            }}
          >
            <div>
              <div
                style={{
                  ...detailSectionHeaderStyle,
                  alignItems: isMobile ? "stretch" : "center",
                  flexDirection: isMobile ? "column" : "row",
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        background: "#FFF3CF",
                        border: `1px solid ${colors.gold}`,
                        fontSize: 20,
                        flex: "0 0 auto",
                      }}
                    >
                      {locationIcon(selectedLocation)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          ...editorHeaderStyle,
                          marginBottom: 0,
                          minWidth: 0,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {selectedLocation.name || "New Location"}
                      </h3>
                      <span
                        style={{
                          display: "inline-flex",
                          marginTop: 4,
                          border: `1px solid ${colors.line}`,
                          borderRadius: 999,
                          background: colors.panel,
                          padding: "3px 7px",
                          fontSize: 9,
                          fontWeight: 850,
                          color: colors.navy,
                        }}
                      >
                        {selectedLocation.type || "Location"} · Level{" "}
                        {locationDepth(selectedLocation) + 1}
                      </span>
                    </div>
                  </div>
                  {selectedLocationPath.length > 1 ? (
                    <div
                      style={{
                        ...mutedSmallStyle,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 5,
                      }}
                    >
                      {selectedLocationPath.map((location, index) => (
                        <React.Fragment key={location.id}>
                          {index > 0 ? <span aria-hidden="true">›</span> : null}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLocationId(location.id);
                              setLocationEditorOpen(false);
                            }}
                            style={{
                              border: 0,
                              padding: 0,
                              background: "transparent",
                              color:
                                location.id === selectedLocation.id
                                  ? colors.navy
                                  : "#175CD3",
                              font: "inherit",
                              fontWeight:
                                location.id === selectedLocation.id ? 800 : 700,
                              cursor:
                                location.id === selectedLocation.id
                                  ? "default"
                                  : "pointer",
                            }}
                          >
                            {location.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    ...buttonRowStyle,
                    width: isMobile ? "100%" : undefined,
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2, minmax(0, 1fr))"
                      : undefined,
                    gap: 7,
                  }}
                >
                  {(!isMobile || mobileFieldDetailsOpen) ? (
                    <button
                      type="button"
                      onClick={() => addSubLocation(selectedLocation.id)}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : undefined }}
                    >
                      + Sub-location
                    </button>
                  ) : null}
                  {locationEditorOpen ? (
                    <button
                      type="button"
                      onClick={() => setLocationEditorOpen(false)}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : undefined }}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLocationEditorOpen(true)}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : undefined }}
                    >
                      Edit
                    </button>
                  )}
                  {locationEditorOpen && (!isMobile || mobileFieldDetailsOpen) ? (
                    <button
                      type="button"
                      onClick={() => void deleteSelectedLocation()}
                      style={{ ...dangerButtonStyle, width: isMobile ? "100%" : undefined }}
                    >
                      Delete Location
                    </button>
                  ) : null}
                  {locationEditorOpen ||
                  isRecordDirty("location", selectedLocation.id) ? (
                    <button
                      type="button"
                      onClick={() =>
                        void (async () => {
                          const saved = await saveDirtyRecord(
                            "locations",
                            selectedLocation.name.trim() === "2000"
                              ? { ...selectedLocation, parentId: "" }
                              : selectedLocation,
                            "location",
                            selectedLocation.id,
                          );
                          if (!saved) {
                            window.alert(
                              "This location did not save. The editor has been left open so your changes are not lost.",
                            );
                            return;
                          }
                          setLocationEditorOpen(false);
                          showSaveToast("Location saved to Atlas.");
                        })()
                      }
                      style={{ ...goldButtonStyle, width: isMobile ? "100%" : undefined, whiteSpace: "nowrap" }}
                    >
                      Save Location
                    </button>
                  ) : null}
                </div>
              </div>

              {isMobile ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 6,
                    marginTop: 10,
                    marginBottom: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const firstOpen = locationWorkOrders.find(
                        (record) => record.status !== "Completed",
                      );
                      if (firstOpen) setSelectedServiceId(firstOpen.id);
                      setScreen("history");
                    }}
                    style={{ ...secondaryButtonStyle, minHeight: 42, padding: "7px 4px" }}
                  >
                    Work
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`location-photos-${selectedLocation.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    style={{ ...secondaryButtonStyle, minHeight: 42, padding: "7px 4px" }}
                  >
                    Photos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`location-assets-${selectedLocation.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    style={{ ...secondaryButtonStyle, minHeight: 42, padding: "7px 4px" }}
                  >
                    Assets
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFieldDetailsOpen((current) => !current)}
                    aria-expanded={mobileFieldDetailsOpen}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: 42,
                      padding: "7px 4px",
                      borderColor: mobileFieldDetailsOpen ? colors.gold : colors.line,
                      background: mobileFieldDetailsOpen ? "#FFF8E6" : "#FFFFFF",
                    }}
                  >
                    {mobileFieldDetailsOpen ? "Less" : "More"}
                  </button>
                </div>
              ) : null}

              {locationLooksLikeAsset(selectedLocation) && (!isMobile || mobileFieldDetailsOpen) ? (
                <section
                  style={{
                    marginTop: 12,
                    padding: 11,
                    borderRadius: 12,
                    border: `1px solid ${colors.gold}`,
                    background: "#FFF9E8",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display: "block",
                        color: colors.navy,
                        fontSize: 12,
                      }}
                    >
                      This record may be an asset
                    </strong>
                    <span style={mutedSmallStyle}>
                      Locations should describe physical areas. Equipment,
                      watercraft, vehicles, and lifts should normally be stored
                      in Assets and assigned to a real location.
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {selectedLocationMatchingAsset ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(selectedLocationMatchingAsset.id);
                          setScreen("assets");
                        }}
                        style={secondaryButtonStyle}
                      >
                        Open Matching Asset
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          addAsset();
                          setScreen("assets");
                        }}
                        style={secondaryButtonStyle}
                      >
                        Create Asset Record
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLocationEditorOpen(true)}
                      style={secondaryButtonStyle}
                    >
                      Review Location
                    </button>
                  </div>
                </section>
              ) : null}

              {!locationEditorOpen ? (
                <section
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 14,
                    border: `1px solid ${colors.gold}`,
                    background: "linear-gradient(135deg, #FFF9EC 0%, #FFFFFF 72%)",
                    boxShadow: "0 8px 24px rgba(15, 42, 67, 0.08)",
                  }}
                >
                  <div style={{ ...detailSectionHeaderStyle, alignItems: "flex-start" }}>
                    <div>
                      <div style={eyebrowStyle}>Property Intelligence</div>
                      <strong style={{ fontSize: 16 }}>Location at a glance</strong>
                    </div>
                    <span style={badgeStyle(locationCondition === "Good" ? "Completed" : locationCondition === "Monitor" ? "Monitor" : "High")}>
                      {locationCondition}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(6, minmax(0, 1fr))",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {[
                      ["Assets", locationAssets.length],
                      ["Documents", locationDocuments.length],
                      ["Tasks", locationTasks.length],
                      ["Open Work", openLocationWork.length],
                      ["Photos", locationPhotos.length],
                      ["Last Activity", latestLocationActivity ? formatDate(latestLocationActivity) : "None"],
                    ].map(([label, value]) => (
                      <div key={String(label)} style={{ ...recordInfoItemStyle, minWidth: 0 }}>
                        <span style={fieldLabelStyle}>{label}</span>
                        <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <p style={{ ...recordNotesStyle, margin: "12px 0 0" }}>
                    <strong>Atlas note:</strong> {locationInsight}
                  </p>
                </section>
              ) : null}

              {locationEditorOpen ? (
                <div style={{ ...formGridStyle, marginTop: 12 }}>
                  <Field
                    label="Name"
                    value={selectedLocation.name}
                    onChange={(value) => updateLocation({ name: value })}
                  />
                  {locations.some((location) => location.id !== selectedLocation.id && normalizeLocationName(location.name) === normalizeLocationName(selectedLocation.name)) ? (
                    <div style={{ ...noticeStyle, borderColor: "#F3C98B", background: "#FFF8E8", color: "#7A4B00" }}>
                      A location with this name already exists. Keep the correct record and delete the empty duplicate.
                    </div>
                  ) : null}
                  <Field
                    label="Type"
                    value={selectedLocation.type}
                    onChange={(value) => updateLocation({ type: value })}
                  />
                  <label style={{ display: "grid", gap: 7 }}>
                    <span style={fieldLabelStyle}>Parent Location</span>
                    <small style={mutedSmallStyle}>
                      Choose the immediate physical area above this location.
                    </small>
                    <select
                      value={selectedLocation.name.trim() === "2000" ? "" : selectedLocation.parentId || ""}
                      disabled={selectedLocation.name.trim() === "2000"}
                      onChange={(event) => updateLocation({ parentId: event.currentTarget.value })}
                      style={{ ...inputStyle, opacity: selectedLocation.name.trim() === "2000" ? 0.65 : 1 }}
                    >
                      <option value="">Top-level location</option>
                      {locations
                        .filter((location) => location.id !== selectedLocation.id && location.parentId !== selectedLocation.id)
                        .map((location) => (
                          <option key={location.id} value={location.id}>{location.name}</option>
                        ))}
                    </select>
                  </label>
                  <Field
                    label="Description"
                    value={selectedLocation.zone}
                    onChange={(value) => updateLocation({ zone: value })}
                    multiline
                  />
                  <Field
                    label="Notes"
                    value={selectedLocation.notes}
                    onChange={(value) => updateLocation({ notes: value })}
                    multiline
                  />
                  <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10 }}>
                    <div style={{ ...detailSectionHeaderStyle, alignItems: "center" }}>
                      <div>
                        <div style={eyebrowStyle}>Custom Details</div>
                        <strong>Add only the information this location needs</strong>
                      </div>
                      <button type="button" onClick={addLocationCustomDetail} style={secondaryButtonStyle}>
                        + Add Detail
                      </button>
                    </div>
                    {(selectedLocation.customDetails || []).length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {(selectedLocation.customDetails || []).map((detail) => (
                          <div
                            key={detail.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? "1fr" : "minmax(160px, .65fr) minmax(240px, 1.35fr) auto",
                              gap: 8,
                              alignItems: "start",
                            }}
                          >
                            <input
                              value={detail.label}
                              onChange={(event) => updateLocationCustomDetail(detail.id, { label: event.currentTarget.value })}
                              placeholder="Label, such as Paint or Flooring"
                              style={inputStyle}
                            />
                            <textarea
                              value={detail.value}
                              onChange={(event) => updateLocationCustomDetail(detail.id, { value: event.currentTarget.value })}
                              placeholder="Value or notes"
                              style={{ ...inputStyle, minHeight: 44, resize: "vertical" }}
                            />
                            <button
                              type="button"
                              onClick={() => removeLocationCustomDetail(detail.id)}
                              style={{ ...dangerButtonStyle, width: isMobile ? "100%" : undefined }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={noticeStyle}>No custom details. Add one only when this location needs it.</div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={recordInfoGridStyle}>
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Type</span>
                      <strong>{selectedLocation.type || "—"}</strong>
                    </div>
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Parent</span>
                      <strong>{locationSourceRecords.find((location) => location.id === selectedLocation.parentId)?.name || "Top level"}</strong>
                    </div>
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Hierarchy Path</span>
                      <strong style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                        {locationPath(selectedLocation)}
                      </strong>
                    </div>
                  </div>
                  {selectedLocation.zone ? <p style={recordNotesStyle}>{selectedLocation.zone}</p> : null}
                  {(selectedLocation.customDetails || []).length ? (
                    <div style={{ ...recordInfoGridStyle, marginTop: 10 }}>
                      {(selectedLocation.customDetails || []).map((detail) => (
                        <div key={detail.id} style={recordInfoItemStyle}>
                          <span style={fieldLabelStyle}>{detail.label || "Detail"}</span>
                          <strong style={{ whiteSpace: "pre-wrap" }}>{detail.value || "—"}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {selectedLocation.notes ? <p style={recordNotesStyle}>{selectedLocation.notes}</p> : null}
                </>
              )}
            </div>

            <section
              id={`location-photos-${selectedLocation.id}`}
              style={{ ...detailSectionStyle, scrollMarginTop: 72 }}
            >
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Photos</div>
                  <strong>{locationPhotos.length} attached</strong>
                </div>
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      void pasteLinkedPhoto(
                        "Location",
                        selectedLocation.id,
                        selectedLocation.name,
                      )
                    }
                    style={secondaryButtonStyle}
                  >
                    Paste Image
                  </button>
                  <label style={compactUploadButtonStyle}>
                    Add Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(event) => {
                        void addLinkedPhotoFiles(
                          "Location",
                          selectedLocation.id,
                          selectedLocation.name,
                          event.currentTarget.files,
                        );
                        event.currentTarget.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {locationPhotos.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {locationPhotos.slice(0, 8).map((file) => (
                    <div
                      key={file.id}
                      style={{
                        position: "relative",
                        aspectRatio: "4 / 3",
                        borderRadius: 10,
                        overflow: "hidden",
                        border: `1px solid ${colors.line}`,
                        background: colors.panel,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openUploadedFile(file)}
                        title={file.name}
                        style={{ border: 0, padding: 0, width: "100%", height: "100%", background: "transparent", cursor: "pointer" }}
                      >
                        <img
                          src={file.dataUrl || file.url}
                          alt={file.name || "Location photo"}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteLinkedImage(file)}
                        aria-label={`Delete ${file.name}`}
                        title="Delete photo"
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,.8)",
                          background: "rgba(15,42,67,.82)",
                          color: "white",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        {closeSymbol}
                      </button>
                    </div>
                  ))}
                  {locationPhotos.length > 8 ? (
                    <button
                      type="button"
                      onClick={() => openUploadedFile(locationPhotos[8])}
                      style={{ ...secondaryButtonStyle, minHeight: 72 }}
                    >
                      +{locationPhotos.length - 8} more
                    </button>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minHeight: 112,
                    padding: 18,
                    border: `1px dashed ${colors.gold}`,
                    borderRadius: 12,
                    background: "#FFFDF7",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <strong>Add the first location photo</strong>
                    <p style={{ ...mutedSmallStyle, marginBottom: 0 }}>Paste an image, use Add Photo, or drop an image into this panel.</p>
                  </div>
                </div>
              )}
            </section>

            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}><div><div style={eyebrowStyle}>Tasks At This Location</div><strong>{locationTasks.length} related</strong></div><button type="button" onClick={() => { setTaskListFilter("today"); setTasksView("tasks"); setScreen("planner"); }} style={secondaryButtonStyle}>Open Tasks</button></div>
              {locationTasks.length ? <div style={compactLinkedListStyle}>{locationTasks.slice(0, 12).map((task) => <button key={`location-task-${task.id}`} type="button" onClick={() => { setSelectedTaskId(task.id); setTasksView("tasks"); setScreen("planner"); }} style={{ ...compactLinkedRowStyle, width: "100%" }}><span><strong>{task.title}</strong><small style={mutedSmallStyle}>{taskDetails(task.id).dueDate ? formatDate(taskDetails(task.id).dueDate) : "No due date"}</small></span><span style={badgeStyle(taskDetails(task.id).status)}>{taskDetails(task.id).status}</span></button>)}</div> : <p style={mutedSmallStyle}>No Tasks are linked to this location.</p>}
            </section>

            <section
              id={`location-assets-${selectedLocation.id}`}
              style={{ ...detailSectionStyle, scrollMarginTop: 72 }}
            >
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Assets Assigned Here</div>
                  <strong>{locationAssets.length} attached</strong>
                  <div style={assetCardHintStyle}>
                    Assets remain separate records; this only assigns their
                    physical location.
                  </div>
                </div>
                <select
                  value=""
                  onChange={(event) => {
                    const assetId = event.currentTarget.value;
                    if (assetId) void assignAssetToLocation(assetId);
                  }}
                  style={{
                    ...inputStyle,
                    width: isMobile ? "100%" : "auto",
                    minWidth: 0,
                    maxWidth: "100%",
                    minHeight: isMobile ? 42 : undefined,
                  }}
                  aria-label="Add an asset to this location"
                >
                  <option value="">+ Add Asset</option>
                  {[...locationAssetSourceRecords]
                    .filter(
                      (asset) => !assetHasLocation(asset, selectedLocation.id),
                    )
                    .sort((a, b) =>
                      String(a.name || "").localeCompare(
                        String(b.name || ""),
                        undefined,
                        { sensitivity: "base" },
                      ),
                    )
                    .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
              {locationAssets.length ? (
                <div style={compactLinkedListStyle}>
                  {locationAssets.map((asset) => (
                    <div key={asset.id} style={assetFileListRowStyle}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setScreen("assets");
                        }}
                        style={compactLinkedRowStyle}
                      >
                        <span>
                          <strong>{asset.name}</strong>
                          <small style={mutedSmallStyle}>
                            {asset.category}
                          </small>
                        </span>
                        <span style={badgeStyle(asset.status)}>
                          {asset.status}
                        </span>
                      </button>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssetId(asset.id);
                            setScreen("assets");
                          }}
                          style={secondaryButtonStyle}
                        >
                          Reassign
                        </button>
                        {locationEditorOpen ? (
                          <button
                            type="button"
                            onClick={() =>
                              void removeAssetFromLocation(asset.id)
                            }
                            style={assetFileDeleteButtonStyle}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={mutedSmallStyle}>
                  No assets are assigned to this location.
                </p>
              )}
            </section>

            {(!isMobile || mobileFieldDetailsOpen) ? (
            <>
            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>
                    {selectedLocation.id === "general"
                      ? "Property History"
                      : "Location History"}
                  </div>
                  <strong>{locationHistory.length} work records</strong>
                </div>
                <span style={mutedSmallStyle}>Newest first</span>
              </div>
              {locationHistory.length ? (
                <div style={{ display: "grid", gap: 7 }}>
                  {locationHistory.slice(0, 12).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(entry.workOrderId);
                        setScreen("history");
                      }}
                      style={{
                        ...compactLinkedRowStyle,
                        width: "100%",
                        border: `1px solid ${colors.line}`,
                        borderRadius: 10,
                        padding: "9px 10px",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong>{entry.title}</strong>
                        <small style={mutedSmallStyle}>
                          {entry.date ? formatDate(String(entry.date).slice(0, 10)) : "No date"}
                        </small>
                      </span>
                      <span style={badgeStyle(entry.status)}>{entry.status}</span>
                    </button>
                  ))}
                  {locationHistory.length > 12 ? (
                    <button
                      type="button"
                      onClick={() => setScreen("history")}
                      style={secondaryButtonStyle}
                    >
                      View All Property Work
                    </button>
                  ) : null}
                </div>
              ) : (
                <p style={mutedSmallStyle}>No work history is linked yet.</p>
              )}
            </section>

            {renderLinkedDocuments("Location", selectedLocation.id)}
            </>
            ) : null}
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select a location.</strong>
            <p style={mutedSmallStyle}>
              Open a location to see its information, photos, and assets.
            </p>
          </div>
        )
      }
    />
  );
}
