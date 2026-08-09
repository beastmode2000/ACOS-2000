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
import AtlasLocationsWorkspace from "./AtlasLocationsWorkspace";
import AtlasAssetsWorkspace from "./AtlasAssetsWorkspace";
import AtlasVendorsWorkspace from "./AtlasVendorsWorkspace";
import AtlasDocumentsWorkspace from "./AtlasDocumentsWorkspace";
import AtlasProceduresWorkspace from "./AtlasProceduresWorkspace";
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



export default function AtlasTimelineWorkspace(props: any) {
  const {
    activePropertyId,
    addWorkOrder,
    allDocuments,
    assetName,
    assetRecords,
    calendarItems,
    contactRecords,
    deleteAtlasRecord,
    deleteDocumentFromAtlasVault,
    emptyStateStyle,
    estateTimelineRange,
    estateTimelineTypeFilter,
    eyebrowStyle,
    goldButtonStyle,
    intakeDocs,
    isMobile,
    locationName,
    locations,
    mode,
    mutedSmallStyle,
    noticeStyle,
    openCalendarItem,
    photoCompareAfterId,
    photoCompareBeforeId,
    photoCompareOpen,
    photoComparePosition,
    photoLightboxDragOrigin,
    photoLightboxDragging,
    photoLightboxIds,
    photoLightboxIndex,
    photoLightboxPan,
    photoLightboxTouchStartX,
    photoLightboxZoom,
    photoTimelineAssetId,
    photoTimelineHideLogos,
    photoTimelineMeta,
    photoTimelineMonthFilter,
    photoTimelineOrganizationFilter,
    photoTimelinePaintingOnly,
    photoTimelineProjectCategory,
    photoTimelineProjects,
    photoTimelineScrubber,
    photoTimelineSearch,
    photoTimelineTagFilter,
    photoTimelineVendorFilter,
    photoTimelineView,
    photoTimelineYear,
    photos,
    postAtlasRecord,
    postDocumentToAtlasVault,
    procedureRecords,
    projectDetailTab,
    projectPhotoCaption,
    projectPhotoDate,
    projectPhotoTag,
    projectQuickNoteDate,
    projectQuickNoteText,
    projectQuickNoteTitle,
    projectQuickNoteType,
    projectTimelineEntries,
    replaceDocumentInVault,
    requestRecords,
    rowButtonStyle,
    secondaryButtonStyle,
    sectionStyle,
    selectedPhotoProjectId,
    selectedPhotoTimelineId,
    serviceRecords,
    setEstateTimelineRange,
    setEstateTimelineTypeFilter,
    setIntakeDocs,
    setPhotoCompareAfterId,
    setPhotoCompareBeforeId,
    setPhotoCompareOpen,
    setPhotoComparePosition,
    setPhotoLightboxDragOrigin,
    setPhotoLightboxDragging,
    setPhotoLightboxIds,
    setPhotoLightboxIndex,
    setPhotoLightboxPan,
    setPhotoLightboxTouchStartX,
    setPhotoLightboxZoom,
    setPhotoTimelineAssetId,
    setPhotoTimelineMeta,
    setPhotoTimelineMonthFilter,
    setPhotoTimelineOrganizationFilter,
    setPhotoTimelineProjects,
    setPhotoTimelineScrubber,
    setPhotoTimelineSearch,
    setPhotoTimelineTagFilter,
    setPhotoTimelineVendorFilter,
    setPhotoTimelineView,
    setPhotoTimelineYear,
    setPhotos,
    setProjectDetailTab,
    setProjectPhotoCaption,
    setProjectPhotoDate,
    setProjectPhotoTag,
    setProjectQuickNoteDate,
    setProjectQuickNoteText,
    setProjectQuickNoteTitle,
    setProjectQuickNoteType,
    setProjectTimelineEntries,
    setScreen,
    setSelectedCalendarId,
    setSelectedDocumentId,
    setSelectedPhotoProjectId,
    setSelectedPhotoTimelineId,
    setSelectedRequestId,
    setSelectedServiceId,
    setSelectedTaskId,
    setSelectedVendorId,
    setServiceRecords,
    setTasksView,
    showSaveToast,
    taskDetails,
    todayEvents,
    todayLogEntries,
    upcomingEvents,
    vendorName,
    vendorRecords,
    weatherDays,
    workPlanTasks
  } = props;
  const allPhotoTimelineItems = [
    ...photos.map((photo) => ({
      id: `asset-photo-${photo.id}`,
      name: photo.name || "Asset photo",
      source: photoSource(photo),
      createdAt: photo.createdAt || "",
      assetId: photo.assetId || "",
      assetName: assetName(photo.assetId || "") || "General property",
      area: assetName(photo.assetId || "") || "General property",
      origin: "Asset photo",
      sourceKind: "asset" as const,
      sourceId: photo.id,
      fileId: "",
      documentId: "",
      sourceNotes: "",
    })),
    ...allDocuments.flatMap((document) =>
      (document.files || [])
        .filter((file) =>
          String(file.type || "").startsWith("image/") ||
          String(file.dataUrl || "").startsWith("data:image/") ||
          /\.(png|jpe?g|webp|gif|avif)$/i.test(String(file.name || "")),
        )
        .map((file) => ({
          id: `document-photo-${document.id}-${file.id}`,
          name: document.title || file.name || "Document photo",
          source: file.url || file.dataUrl || "",
          createdAt: file.createdAt || document.createdAt || "",
          assetId: document.linkedAssetId || "",
          assetName: document.linkedAssetId
            ? assetName(document.linkedAssetId) || document.targetName || "Linked asset"
            : document.targetName || document.area || "General property",
          area: document.area || document.targetName || "General property",
          origin: "Document image",
          sourceKind: "document" as const,
          sourceId: document.id,
          fileId: file.id,
          documentId: document.id,
          sourceNotes: document.notes || document.pastedText || "",
        })),
    ),
  ].filter((item) => Boolean(item.source)).map((item) => {
    const meta = photoTimelineMeta[item.id];
    const overriddenAssetId = meta?.assetIdOverride;
    const overriddenAsset = overriddenAssetId ? assetRecords.find((asset) => asset.id === overriddenAssetId) : undefined;
    return {
      ...item,
      name: meta?.displayName?.trim() || item.name,
      assetId: overriddenAssetId !== undefined ? overriddenAssetId : item.assetId,
      assetName: overriddenAssetId !== undefined ? (overriddenAsset ? overriddenAsset.name : "General property") : item.assetName,
      area: overriddenAssetId !== undefined ? (overriddenAsset ? overriddenAsset.name : "General property") : item.area,
    };
  });

  const dateValues = allPhotoTimelineItems
    .map((item) => (item.createdAt ? new Date(item.createdAt).getTime() : Number.NaN))
    .filter(Number.isFinite);
  const earliestPhotoTime = dateValues.length ? Math.min(...dateValues) : 0;
  const latestPhotoTime = dateValues.length ? Math.max(...dateValues) : 0;
  const scrubberCutoff = earliestPhotoTime && latestPhotoTime
    ? earliestPhotoTime + ((latestPhotoTime - earliestPhotoTime) * photoTimelineScrubber) / 100
    : Number.POSITIVE_INFINITY;

  const photoTimelineItems = allPhotoTimelineItems
    .filter((item) => {
      const meta = photoTimelineMeta[item.id];
      const project = photoTimelineProjects.find((record) => record.id === meta?.projectId);
      const vendor = vendorRecords.find((record) => record.id === (meta?.vendorId || project?.vendorId))?.name || "";
      const haystack = `${item.name} ${item.assetName} ${item.area} ${item.origin} ${meta?.tag || ""} ${meta?.notes || ""} ${vendor} ${project?.title || ""}`.toLowerCase();
      const itemDate = item.createdAt ? new Date(item.createdAt) : null;
      const itemTime = itemDate && !Number.isNaN(itemDate.getTime()) ? itemDate.getTime() : 0;
      const itemMonth = itemDate && !Number.isNaN(itemDate.getTime()) ? String(itemDate.getMonth() + 1).padStart(2, "0") : "Unknown";
      const itemYear = itemDate && !Number.isNaN(itemDate.getTime()) ? String(itemDate.getFullYear()) : "Unknown";
      return (
        (!photoTimelineSearch.trim() || haystack.includes(photoTimelineSearch.trim().toLowerCase())) &&
        (photoTimelineAssetId === "all" || item.assetId === photoTimelineAssetId) &&
        (photoTimelineYear === "all" || itemYear === photoTimelineYear) &&
        (photoTimelineMonthFilter === "all" || itemMonth === photoTimelineMonthFilter) &&
        (photoTimelineOrganizationFilter === "all" ||
          (photoTimelineOrganizationFilter === "unassigned" && !meta?.projectId) ||
          (photoTimelineOrganizationFilter === "missing-tag" && (!meta?.tag || meta.tag === "Unlabeled")) ||
          (photoTimelineOrganizationFilter === "missing-date" && !item.createdAt && !meta?.dateTaken) ||
          (photoTimelineOrganizationFilter === "before" && meta?.tag === "Before") ||
          (photoTimelineOrganizationFilter === "during" && meta?.tag === "During") ||
          (photoTimelineOrganizationFilter === "after" && meta?.tag === "After")) &&
        (photoTimelineTagFilter === "All" || (meta?.tag || "Unlabeled") === photoTimelineTagFilter) &&
        (photoTimelineVendorFilter === "all" || (meta?.vendorId || project?.vendorId || "") === photoTimelineVendorFilter) &&
        (!photoTimelinePaintingOnly || /(paint|painting|stain|elliott|exterior|siding|trim|eave|coat)/i.test(haystack)) &&
        (!photoTimelineHideLogos || !/(logo|brand mark|wordmark)/i.test(haystack)) &&
        (!itemTime || itemTime <= scrubberCutoff)
      );
    })
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const photoTimelineYears = Array.from(new Set(allPhotoTimelineItems
    .map((item) => item.createdAt ? String(new Date(item.createdAt).getFullYear()) : "")
    .filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const selectedPhotoTimelineItem = allPhotoTimelineItems.find((item) => item.id === selectedPhotoTimelineId);
  const selectedPhotoMeta = selectedPhotoTimelineItem
    ? photoTimelineMeta[selectedPhotoTimelineItem.id] || { tag: "Unlabeled" as PhotoTimelineTag, notes: "" }
    : null;
  const selectedPhotoAsset = selectedPhotoTimelineItem?.assetId
    ? assetRecords.find((asset) => asset.id === selectedPhotoTimelineItem.assetId)
    : undefined;
  const selectedPhotoLocation = selectedPhotoAsset
    ? locationName(selectedPhotoAsset.locationId || selectedPhotoAsset.locationIds?.[0] || "")
    : selectedPhotoTimelineItem?.area || "General property";
  const selectedPhotoProject = photoTimelineProjects.find((project) => project.id === selectedPhotoProjectId);
  const selectedPhotoProjectItems = selectedPhotoProject
    ? allPhotoTimelineItems
        .filter((item) => photoTimelineMeta[item.id]?.projectId === selectedPhotoProject.id)
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    : [];
  const selectedProjectTimelineEntries = selectedPhotoProject
    ? projectTimelineEntries
        .filter((entry) => entry.projectId === selectedPhotoProject.id)
        .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`))
    : [];
  const selectedProjectWorkOrders = selectedPhotoProject
    ? serviceRecords.filter((record) =>
        record.projectId === selectedPhotoProject.id ||
        selectedPhotoProject.workOrderId === record.id ||
        (selectedPhotoProject.workOrderIds || []).includes(record.id)
      )
    : [];
  const selectedProjectTasks = selectedPhotoProject
    ? workPlanTasks
        .filter((task) => taskDetails(task.id).projectId === selectedPhotoProject.id)
        .sort((a, b) => String(taskDetails(a.id).dueDate || "9999-12-31").localeCompare(String(taskDetails(b.id).dueDate || "9999-12-31")))
    : [];
  const selectedProjectDocuments = selectedPhotoProject
    ? intakeDocs.filter((record) =>
        (selectedPhotoProject.documentIds || []).includes(record.id) ||
        record.targetId === selectedPhotoProject.id ||
        selectedProjectWorkOrders.some((workOrder) => record.targetId === workOrder.id)
      )
    : [];
  const selectedProjectVendors = selectedPhotoProject
    ? vendorRecords.filter((vendor) =>
        vendor.id === selectedPhotoProject.vendorId ||
        (selectedPhotoProject.vendorIds || []).includes(vendor.id) ||
        selectedProjectWorkOrders.some((workOrder) =>
          workOrder.vendorId === vendor.id || (workOrder.assignedVendorIds || []).includes(vendor.id)
        )
      )
    : [];
  const selectedProjectPeople = selectedPhotoProject
    ? contactRecords.filter((contact) =>
        (selectedPhotoProject.assigneeIds || []).includes(contact.id) ||
        selectedProjectWorkOrders.some((workOrder) => (workOrder.assignedPersonIds || []).includes(contact.id))
      )
    : [];

  const selectedProjectOpenWorkOrders = selectedProjectWorkOrders.filter(
    (record) => !["Completed", "Closed", "Cancelled"].includes(String(record.status)),
  );
  const selectedProjectWaitingWorkOrders = selectedProjectOpenWorkOrders.filter(
    (record) => record.status === "Waiting" || record.status === "Monitor",
  );
  const selectedProjectOverdueWorkOrders = selectedProjectOpenWorkOrders.filter(
    (record) => Boolean(record.date) && record.date < todayISO(),
  );
  const selectedProjectLastActivity = selectedPhotoProject
    ? [
        selectedPhotoProject.createdAt,
        selectedPhotoProject.completedAt,
        ...selectedProjectTimelineEntries.map((entry) => entry.date || entry.createdAt),
        ...selectedPhotoProjectItems.map((item) => item.createdAt || ""),
        ...selectedProjectDocuments.map((document) => document.createdAt || ""),
        ...selectedProjectWorkOrders.flatMap((record) => [record.lastCompletedDate || "", record.date || ""]),
      ]
        .filter(Boolean)
        .sort((a, b) => String(b).localeCompare(String(a)))[0] || ""
    : "";
  const selectedProjectAttentionCount =
    selectedProjectOverdueWorkOrders.length + selectedProjectWaitingWorkOrders.length;
  const selectedProjectNextAction = selectedPhotoProject
    ? selectedPhotoProject.status === "Completed"
      ? "Project is complete. Confirm final photos and documents are attached."
      : selectedPhotoProject.phase?.trim()
        ? selectedPhotoProject.phase.trim()
        : selectedProjectOverdueWorkOrders.length
          ? `Review ${selectedProjectOverdueWorkOrders.length} overdue work order${selectedProjectOverdueWorkOrders.length === 1 ? "" : "s"}.`
          : selectedProjectWaitingWorkOrders.length
            ? `Resolve ${selectedProjectWaitingWorkOrders.length} waiting item${selectedProjectWaitingWorkOrders.length === 1 ? "" : "s"}.`
            : selectedProjectOpenWorkOrders.length
              ? `Continue ${selectedProjectOpenWorkOrders.length} open work order${selectedProjectOpenWorkOrders.length === 1 ? "" : "s"}.`
              : "Set the next action or add the first linked work order."
    : "";

  const updateSelectedPhotoMeta = (patch: Partial<PhotoTimelineMeta>) => {
    if (!selectedPhotoTimelineItem) return;
    setPhotoTimelineMeta((current) => ({
      ...current,
      [selectedPhotoTimelineItem.id]: {
        tag: current[selectedPhotoTimelineItem.id]?.tag || "Unlabeled",
        notes: current[selectedPhotoTimelineItem.id]?.notes || "",
        ...current[selectedPhotoTimelineItem.id],
        ...patch,
      },
    }));
  };

  const saveProjectToSharedAtlas = async (project: PhotoTimelineProject) => {
    const projectPhotoMeta = Object.fromEntries(
      Object.entries(photoTimelineMeta as Record<string, PhotoTimelineMeta>).filter(([, meta]) => meta.projectId === project.id),
    );
    const saved = await postAtlasRecord("projects", {
      ...project,
      propertyId: activePropertyId,
      timelineEntries: projectTimelineEntries.filter((entry) => entry.projectId === project.id),
      photoMeta: projectPhotoMeta,
    });
    if (saved) {
      showSaveToast("Project saved to shared Atlas.");
    }
    return saved;
  };

  const updateSelectedPhotoProject = (patch: Partial<PhotoTimelineProject>) => {
    if (!selectedPhotoProject) return;
    const nextProject = { ...selectedPhotoProject, ...patch };
    setPhotoTimelineProjects((current) => current.map((project) =>
      project.id === selectedPhotoProject.id ? nextProject : project,
    ));
    void saveProjectToSharedAtlas(nextProject);
  };

  const deleteSelectedPhotoProject = async () => {
    if (!selectedPhotoProject) return;
    const projectId = selectedPhotoProject.id;
    if (!window.confirm(`Delete project “${selectedPhotoProject.title}”? Photos and documents will remain in Atlas, but they will no longer be linked to this project.`)) return;
    const deleted = await deleteAtlasRecord("projects", projectId);
    if (!deleted) return;
    setPhotoTimelineProjects((current) => current.filter((project) => project.id !== projectId));
    setProjectTimelineEntries((current) => current.filter((entry) => entry.projectId !== projectId));
    setPhotoTimelineMeta((current) => Object.fromEntries(Object.entries(current as Record<string, PhotoTimelineMeta>).map(([id, meta]) => [id, meta.projectId === projectId ? { ...meta, projectId: undefined, primaryContext: meta.primaryContext === "project" ? "standalone" : meta.primaryContext } : meta])));
    setServiceRecords((current) => current.map((record) => record.projectId === projectId ? { ...record, projectId: "" } : record));
    setSelectedPhotoProjectId("");
    setProjectDetailTab("overview");
    showSaveToast("Project deleted.");
  };

  const removeTimelinePhotoReferences = (timelineId: string) => {
    setPhotoTimelineMeta((current) => {
      const next = { ...current };
      delete next[timelineId];
      return next;
    });
    setPhotoTimelineProjects((current) => current.map((project) =>
      project.coverPhotoId === timelineId ? { ...project, coverPhotoId: "" } : project,
    ));
    setPhotoLightboxIds((current) => current.filter((id) => id !== timelineId));
    if (photoCompareBeforeId === timelineId) setPhotoCompareBeforeId("");
    if (photoCompareAfterId === timelineId) setPhotoCompareAfterId("");
    setSelectedPhotoTimelineId("");
  };

  const replaceSelectedTimelinePhoto = async (file: File) => {
    if (!selectedPhotoTimelineItem || !file.type.startsWith("image/")) return;
    const uploaded = await fileToUploadedRecord(file);
    if (!uploaded.dataUrl && !uploaded.url) return;

    if (selectedPhotoTimelineItem.sourceKind === "asset") {
      const existing = photos.find((photo) => photo.id === selectedPhotoTimelineItem.sourceId);
      if (!existing) return;
      const updated: PhotoRecord = {
        ...existing,
        name: file.name || existing.name,
        dataUrl: uploaded.dataUrl,
        url: uploaded.url,
      };
      await cachePhotoRecords([updated]);
      setPhotos((current) => {
        const next = current.map((photo) => photo.id === updated.id ? updated : photo);
        persistPhotoRecords(next);
        return next;
      });
      const synced = await postAtlasRecord("asset_photos", updated);
      updateSelectedPhotoMeta({ displayName: file.name || selectedPhotoMeta?.displayName });
      showSaveToast(synced ? "Timeline photo replaced and synced." : "Timeline photo replaced on this device; sync did not finish.", synced ? "success" : "warning");
      return;
    }

    const documentRecord = intakeDocs.find((record) => record.id === selectedPhotoTimelineItem.documentId);
    const existingFile = documentRecord?.files?.find((item) => item.id === selectedPhotoTimelineItem.fileId);
    if (!documentRecord || !existingFile) {
      showSaveToast("This document image is not stored in the editable Atlas vault.", "warning");
      return;
    }
    const replacement: UploadedFileRecord = { ...uploaded, id: existingFile.id, createdAt: existingFile.createdAt || uploaded.createdAt };
    const updatedDocument = normalizeDocument({
      ...documentRecord,
      files: (documentRecord.files || []).map((item) => item.id === existingFile.id ? replacement : item),
    });
    replaceDocumentInVault(updatedDocument);
    try {
      await postDocumentToAtlasVault(updatedDocument);
      updateSelectedPhotoMeta({ displayName: file.name || selectedPhotoMeta?.displayName });
      showSaveToast("Timeline document image replaced and synced.");
    } catch {
      showSaveToast("Image replaced on this device; Atlas sync did not finish.", "warning");
    }
  };

  const deleteSelectedTimelinePhoto = async () => {
    if (!selectedPhotoTimelineItem) return;
    const linkedProject = photoTimelineProjects.find((project) => project.id === selectedPhotoMeta?.projectId);
    const warning = linkedProject ? ` It is linked to the project “${linkedProject.title}”.` : "";
    if (!window.confirm(`Delete ${selectedPhotoTimelineItem.name} from Atlas?${warning} This cannot be undone.`)) return;

    if (selectedPhotoTimelineItem.sourceKind === "asset") {
      const photo = photos.find((record) => record.id === selectedPhotoTimelineItem.sourceId);
      if (!photo) return;
      const deleted = await deleteAtlasRecord("asset_photos", photo.id);
      if (!deleted) { showSaveToast("Atlas could not delete that photo.", "warning"); return; }
      await deleteCachedPhoto(photo.id);
      setPhotos((current) => {
        const next = current.filter((record) => record.id !== photo.id);
        persistPhotoRecords(next);
        return next;
      });
      removeTimelinePhotoReferences(selectedPhotoTimelineItem.id);
      showSaveToast("Timeline photo deleted.");
      return;
    }

    const documentRecord = intakeDocs.find((record) => record.id === selectedPhotoTimelineItem.documentId);
    const file = documentRecord?.files?.find((item) => item.id === selectedPhotoTimelineItem.fileId);
    if (!documentRecord || !file) {
      showSaveToast("This document image is not stored in the editable Atlas vault.", "warning");
      return;
    }
    const remainingFiles = (documentRecord.files || []).filter((item) => item.id !== file.id);
    try {
      if (remainingFiles.length) {
        const updated = normalizeDocument({ ...documentRecord, files: remainingFiles });
        replaceDocumentInVault(updated);
        await postDocumentToAtlasVault(updated);
      } else {
        setIntakeDocs((current) => {
          const next = current.filter((record) => record.id !== documentRecord.id);
          saveStoredArray(storageKeys.intakeDocs[0], next);
          return next;
        });
        await deleteDocumentFromAtlasVault(documentRecord.id);
      }
      removeTimelinePhotoReferences(selectedPhotoTimelineItem.id);
      showSaveToast("Timeline image deleted.");
    } catch {
      showSaveToast("The image could not be fully deleted from Atlas.", "warning");
    }
  };

  const createWorkOrderFromPhoto = () => {
    if (!selectedPhotoTimelineItem) return;
    const project = photoTimelineProjects.find((record) => record.id === selectedPhotoMeta?.projectId);
    const id = uid("work-order");
    const record = normalizeService({
      id,
      title: project?.title ? `${project.title} - Photo Follow-Up` : `${selectedPhotoTimelineItem.assetName} - Photo Follow-Up`,
      assetId: selectedPhotoTimelineItem.assetId || project?.assetId || "",
      locationId: selectedPhotoMeta?.locationId || project?.locationId || selectedPhotoAsset?.locationId || "",
      vendorId: selectedPhotoMeta?.vendorId || project?.vendorId || "",
      date: todayISO(),
      status: "Open",
      priority: "Medium",
      workType: "Work Order",
      notes: `Created from Photo Timeline 4.2: ${selectedPhotoTimelineItem.name}${selectedPhotoMeta?.notes ? `\n\nPhoto note: ${selectedPhotoMeta.notes}` : ""}`,
    });
    setServiceRecords((current) => byTitle([record, ...current]));
    updateSelectedPhotoMeta({ workOrderId: id });
    setSelectedPhotoTimelineId("");
    setSelectedServiceId(id);
    setScreen("history");
  };

  const addTimelineMilestone = () => {
    if (!selectedPhotoTimelineItem) return;
    updateSelectedPhotoMeta({
      timelineNote: true,
      milestoneTitle: selectedPhotoMeta?.milestoneTitle || selectedPhotoMeta?.notes || "Project milestone",
      milestoneDate: selectedPhotoMeta?.milestoneDate || selectedPhotoMeta?.dateTaken || String(selectedPhotoTimelineItem.createdAt || todayISO()).slice(0, 10),
      milestoneType: selectedPhotoMeta?.milestoneType || "Progress",
    });
  };

  const addProjectQuickTimelineNote = () => {
    if (!selectedPhotoProject) return;
    const title = projectQuickNoteTitle.trim() || projectQuickNoteType;
    const notes = projectQuickNoteText.trim();
    if (!title && !notes) {
      showSaveToast("Add a title or note first.", "warning");
      return;
    }
    const entry: ProjectTimelineEntry = {
      id: uid("project-note"),
      projectId: selectedPhotoProject.id,
      title,
      notes,
      date: projectQuickNoteDate || todayISO(),
      type: projectQuickNoteType,
      createdAt: new Date().toISOString(),
    };
    setProjectTimelineEntries((current) => [entry, ...current]);
    setProjectQuickNoteTitle("");
    setProjectQuickNoteText("");
    setProjectQuickNoteDate(todayISO());
    setProjectQuickNoteType("Note");
    showSaveToast("Timeline note added.");
  };

  const addDatedProjectPhotos = async (files: FileList | null) => {
    if (!selectedPhotoProject || !files?.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      showSaveToast("Choose one or more image files.", "warning");
      return;
    }
    try {
      const uploadedFiles = await Promise.all(imageFiles.map(fileToUploadedRecord));
      const date = projectPhotoDate || todayISO();
      const createdAt = `${date}T12:00:00`;
      const documentId = uid("project-photo-doc");
      const document = normalizeDocument({
        id: documentId,
        propertyId: activePropertyId,
        title: projectPhotoCaption.trim() || `${selectedPhotoProject.title} photos - ${formatDate(date)}`,
        area: selectedPhotoProject.title,
        type: "Project Photos",
        targetType: "General",
        targetId: selectedPhotoProject.id,
        targetName: selectedPhotoProject.title,
        notes: projectPhotoCaption.trim(),
        files: uploadedFiles.map((file: UploadedFileRecord) => ({ ...file, createdAt })),
        createdAt,
      });
      setIntakeDocs((current) => {
        const next = mergeDocuments([document], current);
        saveStoredArray(storageKeys.intakeDocs[0], next);
        return next;
      });
      setPhotoTimelineProjects((current) => current.map((project) =>
        project.id === selectedPhotoProject.id
          ? { ...project, documentIds: Array.from(new Set([...(project.documentIds || []), documentId])) }
          : project,
      ));
      const metaUpdates: Record<string, PhotoTimelineMeta> = {};
      uploadedFiles.forEach((file: UploadedFileRecord) => {
        const timelineId = `document-photo-${documentId}-${file.id}`;
        metaUpdates[timelineId] = {
          tag: projectPhotoTag,
          notes: projectPhotoCaption.trim(),
          projectId: selectedPhotoProject.id,
          dateTaken: date,
          milestoneDate: date,
          milestoneTitle: projectPhotoCaption.trim() || file.name,
          milestoneType: "Progress",
          timelineNote: true,
          locationId: selectedPhotoProject.locationId || undefined,
          vendorId: selectedPhotoProject.vendorId || undefined,
          primaryContext: "project",
        };
      });
      setPhotoTimelineMeta((current) => ({ ...current, ...metaUpdates }));
      try {
        await postDocumentToAtlasVault(document);
        showSaveToast(`${uploadedFiles.length} dated photo${uploadedFiles.length === 1 ? "" : "s"} added to the project timeline.`);
      } catch {
        showSaveToast("Photos were added on this device; Atlas sync did not finish.", "warning");
      }
      setProjectPhotoCaption("");
    } catch {
      showSaveToast("Atlas could not add those project photos.", "warning");
    }
  };

  const addProjectDocuments = async (files: FileList | null) => {
    if (!selectedPhotoProject || !files?.length) return;
    try {
      const uploadedFiles = await Promise.all(Array.from(files).map(fileToUploadedRecord));
      const documentId = uid("project-document");
      const document = normalizeDocument({
        id: documentId,
        propertyId: activePropertyId,
        title: uploadedFiles.length === 1 ? (uploadedFiles[0] as UploadedFileRecord).name : `${selectedPhotoProject.title} documents`,
        area: selectedPhotoProject.title,
        type: "Project Document",
        targetType: "General",
        targetId: selectedPhotoProject.id,
        targetName: selectedPhotoProject.title,
        notes: "",
        files: uploadedFiles,
        createdAt: new Date().toISOString(),
      });
      setIntakeDocs((current) => {
        const next = mergeDocuments([document], current);
        saveStoredArray(storageKeys.intakeDocs[0], next);
        return next;
      });
      setPhotoTimelineProjects((current) => current.map((project) =>
        project.id === selectedPhotoProject.id
          ? { ...project, documentIds: Array.from(new Set([...(project.documentIds || []), documentId])) }
          : project,
      ));
      await postDocumentToAtlasVault(document);
      showSaveToast(`${uploadedFiles.length} document${uploadedFiles.length === 1 ? "" : "s"} added.`);
    } catch {
      showSaveToast("Atlas could not add those documents.", "warning");
    }
  };

  const createPhotoProject = async () => {
    const suggestedTitle = selectedPhotoTimelineItem?.assetName
      ? `${selectedPhotoTimelineItem.assetName} Project`
      : "";
    const enteredTitle = window.prompt("Project name", suggestedTitle);
    if (enteredTitle === null) return;
    const title = enteredTitle.trim();
    if (!title) {
      showSaveToast("Enter a project name first.", "warning");
      return;
    }
    const id = uid("photo-project");
    const project: PhotoTimelineProject = {
      id,
      title,
      category: /(paint|stain|elliott|coat|trim|siding)/i.test(selectedPhotoTimelineItem?.name || "") ? "Painting" : "General",
      scale: "Standard",
      status: "Planning",
      assetId: selectedPhotoTimelineItem?.assetId || "",
      locationId: selectedPhotoAsset?.locationId || selectedPhotoAsset?.locationIds?.[0] || "",
      vendorId: "",
      workOrderId: "",
      workOrderIds: [],
      vendorIds: [],
      documentIds: [],
      assigneeIds: [],
      notes: "",
      coverPhotoId: selectedPhotoTimelineItem?.id || "",
      createdAt: new Date().toISOString(),
      progress: 0,
      phase: "Started",
      startDate: todayISO(),
      archived: false,
    };
    setPhotoTimelineProjects((current) => [project, ...current]);
    if (selectedPhotoTimelineItem) updateSelectedPhotoMeta({ projectId: id });
    setSelectedPhotoProjectId(id);
    setProjectDetailTab("overview");
    setPhotoTimelineView("projects");

    const saved = await saveProjectToSharedAtlas(project);
    if (!saved) {
      showSaveToast("Project is still on this device, but it did not save to shared Atlas.", "warning");
    }
  };

  const openLightbox = (id: string, ids = photoTimelineItems.map((item) => item.id)) => {
    const index = Math.max(0, ids.indexOf(id));
    setPhotoLightboxIds(ids);
    setPhotoLightboxIndex(index);
    setPhotoLightboxZoom(1);
    setPhotoLightboxPan({ x: 0, y: 0 });
  };

  const lightboxItem = photoLightboxIndex >= 0
    ? allPhotoTimelineItems.find((item) => item.id === photoLightboxIds[photoLightboxIndex])
    : undefined;

  const openComparison = (projectId?: string) => {
    const pool = projectId
      ? allPhotoTimelineItems.filter((item) => photoTimelineMeta[item.id]?.projectId === projectId)
      : allPhotoTimelineItems.filter((item) => !selectedPhotoTimelineItem?.assetId || item.assetId === selectedPhotoTimelineItem.assetId);
    const before = pool.find((item) => photoTimelineMeta[item.id]?.tag === "Before") || pool[0];
    const after = [...pool].reverse().find((item) => photoTimelineMeta[item.id]?.tag === "After") || pool[pool.length - 1];
    if (!before || !after) return;
    setPhotoCompareBeforeId(before.id);
    setPhotoCompareAfterId(after.id);
    setPhotoComparePosition(50);
    setPhotoCompareOpen(true);
  };

  const compareBefore = allPhotoTimelineItems.find((item) => item.id === photoCompareBeforeId);
  const compareAfter = allPhotoTimelineItems.find((item) => item.id === photoCompareAfterId);
  const projectCategories: PhotoTimelineProjectCategory[] = ["Painting", "Landscaping", "Dock", "Pool", "Mechanical", "General"];

  const visiblePhotoProjects = photoTimelineProjects
    .map((project) => {
      const items = allPhotoTimelineItems.filter((item) => photoTimelineMeta[item.id]?.projectId === project.id)
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
      const notesCount = items.filter((item) => Boolean(photoTimelineMeta[item.id]?.notes?.trim() || photoTimelineMeta[item.id]?.timelineNote)).length;
      const workOrderIds = new Set(items.map((item) => photoTimelineMeta[item.id]?.workOrderId).filter(Boolean));
      if (project.workOrderId) workOrderIds.add(project.workOrderId);
      const vendorIds = new Set(items.map((item) => photoTimelineMeta[item.id]?.vendorId).filter(Boolean));
      if (project.vendorId) vendorIds.add(project.vendorId);
      return { ...project, items, notesCount, workOrderCount: workOrderIds.size, vendorCount: vendorIds.size };
    })
    .filter((project) => !project.archived)
    .filter((project) => photoTimelineProjectCategory === "All" || project.category === photoTimelineProjectCategory)
    .filter((project) => !photoTimelineSearch.trim() || `${project.title} ${project.category} ${project.notes}`.toLowerCase().includes(photoTimelineSearch.trim().toLowerCase()));

  const timelineGroups = photoTimelineItems.reduce<Record<string, typeof photoTimelineItems>>((groups, item) => {
    const year = item.createdAt ? String(new Date(item.createdAt).getFullYear()) : "Date not recorded";
    (groups[year] ||= []).push(item);
    return groups;
  }, {});

  const projectLastUpdated = (items: typeof allPhotoTimelineItems, fallback: string) => {
    const latest = [...items].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0]?.createdAt || fallback;
    return latest ? formatDate(String(latest).slice(0, 10)) : "No date";
  };

  const unassignedPhotoCount = allPhotoTimelineItems.filter((item) => !photoTimelineMeta[item.id]?.projectId).length;
  const missingTagPhotoCount = allPhotoTimelineItems.filter((item) => !photoTimelineMeta[item.id]?.tag || photoTimelineMeta[item.id]?.tag === "Unlabeled").length;
  const missingDatePhotoCount = allPhotoTimelineItems.filter((item) => !item.createdAt && !photoTimelineMeta[item.id]?.dateTaken).length;
  const localOnlyPhotoCount = allPhotoTimelineItems.filter((item) => String(item.source || "").startsWith("data:image/")).length;
  const syncedPhotoCount = Math.max(0, allPhotoTimelineItems.length - localOnlyPhotoCount);
  const recentPhotoItems = [...allPhotoTimelineItems]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, isMobile ? 5 : 8);
  const photosNeedingAttention = new Set(
    allPhotoTimelineItems
      .filter((item) => {
        const meta = photoTimelineMeta[item.id];
        return !meta?.projectId || !meta?.tag || meta.tag === "Unlabeled" || (!item.createdAt && !meta?.dateTaken);
      })
      .map((item) => item.id),
  ).size;

  const applyPhotoOrganizationFilter = (
    filter: "all" | "unassigned" | "missing-tag" | "missing-date" | "before" | "during" | "after",
  ) => {
    setPhotoTimelineOrganizationFilter(filter);
    setPhotoTimelineView("timeline");
    window.requestAnimationFrame(() => {
      document.getElementById("atlas-photo-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  type UniversalActivityItem = {
    id: string;
    type: "Project" | "Work Order" | "Photo" | "Document" | "Calendar" | "Task" | "Note";
    title: string;
    detail: string;
    date: string;
    icon: string;
    action?: () => void;
  };

  const universalActivityItems: UniversalActivityItem[] = [
    ...projectTimelineEntries.map((entry) => {
      const project = photoTimelineProjects.find((item) => item.id === entry.projectId);
      return {
        id: `activity-project-${entry.id}`,
        type: "Project" as const,
        title: entry.title || entry.type,
        detail: `${project?.title || "Project"}${entry.notes ? ` · ${entry.notes}` : ""}`,
        date: entry.date || entry.createdAt || "",
        icon: entry.type === "Completed" ? "✓" : entry.type === "Vendor Visit" ? "👷" : "◆",
        action: () => { setSelectedPhotoProjectId(entry.projectId); setProjectDetailTab("timeline"); setPhotoTimelineView("projects"); },
      };
    }),
    ...serviceRecords.flatMap((record) => {
      const history = Array.isArray((record as AtlasServiceRecord).serviceHistory) ? (record as AtlasServiceRecord).serviceHistory! : [];
      if (history.length) {
        return history.map((entry) => ({
          id: `activity-work-${record.id}-${entry.id}`,
          type: "Work Order" as const,
          title: record.title,
          detail: `Completed${record.assetId ? ` · ${assetName(record.assetId) || "Asset"}` : ""}`,
          date: entry.completedAt || record.lastCompletedDate || record.date || "",
          icon: "✓",
          action: () => { setSelectedServiceId(record.id); setScreen("history"); },
        }));
      }
      return [{
        id: `activity-work-${record.id}`,
        type: "Work Order" as const,
        title: record.title,
        detail: `${record.status || "Open"}${record.assetId ? ` · ${assetName(record.assetId) || "Asset"}` : ""}`,
        date: record.date || "",
        icon: "🔧",
        action: () => { setSelectedServiceId(record.id); setScreen("history"); },
      }];
    }),
    ...allPhotoTimelineItems.map((item) => {
      const meta = photoTimelineMeta[item.id] || { tag: "Unlabeled" as PhotoTimelineTag, notes: "" };
      return {
        id: `activity-photo-${item.id}`,
        type: "Photo" as const,
        title: meta.milestoneTitle?.trim() || meta.notes?.trim() || item.name || "Photo added",
        detail: `${meta.tag || "Photo"} · ${item.assetName || item.area || "General property"}`,
        date: meta.milestoneDate || meta.dateTaken || item.createdAt || "",
        icon: "📷",
        action: () => setSelectedPhotoTimelineId(item.id),
      };
    }),
    ...allDocuments.map((document) => ({
      id: `activity-document-${document.id}`,
      type: "Document" as const,
      title: document.title || "Document added",
      detail: `${document.type || "Document"} · ${document.area || document.targetName || "General"}`,
      date: document.createdAt || "",
      icon: "📄",
      action: () => { setSelectedDocumentId(document.id); setScreen("documents"); },
    })),
    ...calendarItems.map((item) => ({
      id: `activity-calendar-${item.id}`,
      type: "Calendar" as const,
      title: item.title || "Calendar item",
      detail: `${item.completed ? "Completed" : item.categoryLabel || item.area || "Scheduled"}${item.time ? ` · ${item.time}` : ""}`,
      date: item.date || "",
      icon: item.completed ? "✓" : "📅",
      action: () => { setSelectedCalendarId(item.id); setScreen("calendar"); },
    })),
    ...workPlanTasks.filter((task) => taskDetails(task.id).status === "Completed").map((task) => ({
      id: `activity-task-${task.id}`,
      type: "Task" as const,
      title: task.title,
      detail: `${task.category || "Task"}${taskDetails(task.id).assignee ? ` · ${taskDetails(task.id).assignee}` : ""}`,
      date: taskDetails(task.id).completedAt || task.scheduledDate || "",
      icon: "✓",
      action: () => { setSelectedTaskId(task.id); setTasksView("tasks"); setScreen("planner"); },
    })),
    ...todayLogEntries.map((entry) => ({
      id: `activity-note-${entry.id}`,
      type: "Note" as const,
      title: entry.text,
      detail: entry.category,
      date: entry.createdAt || entry.date || "",
      icon: "📝",
    })),
  ];

  const activitySearch = photoTimelineSearch.trim().toLowerCase();
  const estateTimelineToday = calendarDateValue(todayISO());
  estateTimelineToday.setHours(0, 0, 0, 0);
  const estateTimelineRangeStart = (() => {
    const start = new Date(estateTimelineToday);
    if (estateTimelineRange === "today") return start;
    if (estateTimelineRange === "week") { start.setDate(start.getDate() - 6); return start; }
    if (estateTimelineRange === "month") { start.setDate(1); return start; }
    if (estateTimelineRange === "year") { start.setMonth(0, 1); return start; }
    return null;
  })();
  const visibleActivityItems = universalActivityItems
    .filter((item) => {
      const dateKey = String(item.date || "").slice(0, 10);
      if (estateTimelineTypeFilter !== "All" && item.type !== estateTimelineTypeFilter) return false;
      if (estateTimelineRangeStart) {
        const itemDate = dateKey ? calendarDateValue(dateKey) : null;
        if (!itemDate || Number.isNaN(itemDate.getTime()) || itemDate < estateTimelineRangeStart || itemDate > estateTimelineToday) return false;
      }
      if (photoTimelineYear !== "all" && dateKey.slice(0, 4) !== photoTimelineYear) return false;
      if (photoTimelineMonthFilter !== "all" && dateKey.slice(5, 7) !== photoTimelineMonthFilter) return false;
      if (activitySearch && !`${item.title} ${item.detail} ${item.type}`.toLowerCase().includes(activitySearch)) return false;
      return true;
    })
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const todayMonthDay = todayISO().slice(5, 10);
  const onThisDayItems = universalActivityItems
    .filter((item) => {
      const dateKey = String(item.date || "").slice(0, 10);
      return Boolean(dateKey) && dateKey.slice(5, 10) === todayMonthDay && dateKey !== todayISO();
    })
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 6);

  const activityGroups = visibleActivityItems.reduce<Record<string, UniversalActivityItem[]>>((groups, item) => {
    const dateKey = String(item.date || "").slice(0, 10) || "No date";
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
    return groups;
  }, {});

  const estateHistoryItems = visibleActivityItems.filter((item) => {
    const text = `${item.title} ${item.detail}`.toLowerCase();
    if (item.type === "Project") return true;
    if (item.type === "Work Order") return text.includes("completed") || text.includes("replacement") || text.includes("repair") || text.includes("installation");
    if (item.type === "Photo") return ["after", "final", "problem", "repair", "inspection", "before"].some((term) => text.includes(term));
    if (item.type === "Document") return ["invoice", "permit", "warranty", "inspection", "contract", "estimate"].some((term) => text.includes(term));
    if (item.type === "Calendar") return text.includes("completed") || text.includes("inspection") || text.includes("service");
    return false;
  });

  const estateHistoryByYear = estateHistoryItems.reduce<Record<string, UniversalActivityItem[]>>((groups, item) => {
    const year = String(item.date || "").slice(0, 4) || "No date";
    if (!groups[year]) groups[year] = [];
    groups[year].push(item);
    return groups;
  }, {});

  const estateHistoryYears = Object.keys(estateHistoryByYear).filter((year) => year !== "No date").sort((a, b) => b.localeCompare(a));
  const estateHistoryProjectCount = estateHistoryItems.filter((item) => item.type === "Project").length;
  const estateHistoryPhotoCount = estateHistoryItems.filter((item) => item.type === "Photo").length;
  const estateHistoryWorkCount = estateHistoryItems.filter((item) => item.type === "Work Order").length;

  return (
    <>
      {mode === "timeline" ? (
        <section style={{ ...sectionStyle, marginBottom: 18 }}>
          <SectionHeader
            eyebrow="Project Operations"
            title="Projects"
            detail="Track active property projects, progress, linked work, records, vendors, and visual history."
          />

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <div style={{ display: "inline-flex", border: "1px solid #D7E0EA", borderRadius: 10, padding: 2, background: "#FFFFFF", flexWrap: "wrap" }}>
              {([[
                "projects", "Projects",
              ], ["activity", "Estate Timeline"], ["history", "Milestones"], ["timeline", "Photo Timeline"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setPhotoTimelineView(value)} style={{ border: 0, borderRadius: 8, padding: "7px 11px", background: photoTimelineView === value ? "#FFF3CF" : "transparent", color: colors.navy3, fontWeight: 900, cursor: "pointer" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {!isMobile ? <button type="button" onClick={() => openComparison(selectedPhotoProjectId || undefined)} style={{ ...secondaryButtonStyle, width: "auto" }}>Before / After</button> : null}
              <button type="button" onClick={createPhotoProject} style={{ ...goldButtonStyle, width: "auto", padding: "8px 11px" }}>+ New Project</button>
            </div>
          </div>

          {photoTimelineView === "projects" ? <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
            {[
              ["Active", photoTimelineProjects.filter((project) => !project.archived && project.status !== "Completed" && !project.completedAt).length],
              ["Completed", photoTimelineProjects.filter((project) => project.status === "Completed" || Boolean(project.completedAt)).length],
              ["Archived", photoTimelineProjects.filter((project) => Boolean(project.archived)).length],
              ["All projects", photoTimelineProjects.length],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ border: "1px solid #D7E0EA", borderRadius: 12, padding: "9px 11px", background: "#FFFFFF" }}>
                <div style={{ fontSize: 10, color: colors.muted, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                <div style={{ fontSize: 20, color: colors.navy3, fontWeight: 950, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div> : null}

          {photoTimelineView === "timeline" ? <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
            {[
              ["Visible photos", photoTimelineItems.length],
              ["Visible projects", visiblePhotoProjects.length],
              ["Timeline notes", Object.values(photoTimelineMeta as Record<string, PhotoTimelineMeta>).filter((meta) => Boolean(meta.notes?.trim() || meta.timelineNote)).length],
              ["Before / After", allPhotoTimelineItems.filter((item) => ["Before", "After"].includes(photoTimelineMeta[item.id]?.tag || "")).length],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ border: "1px solid #D7E0EA", borderRadius: 12, padding: "10px 12px", background: "#FFFFFF" }}>
                <div style={{ fontSize: 10, color: colors.muted, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                <div style={{ fontSize: 21, color: colors.navy3, fontWeight: 950, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div> : null}

          {photoTimelineView === "timeline" ? <div style={{ border: "1px solid #D7E0EA", borderRadius: 12, padding: 11, background: "#F8FAFC", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <strong style={{ color: colors.navy3 }}>Timeline scrubber</strong>
              <span style={{ color: colors.muted, fontWeight: 800 }}>{photoTimelineScrubber >= 100 ? "All dates" : `${photoTimelineScrubber}% of history`}</span>
            </div>
            <input type="range" min="0" max="100" value={photoTimelineScrubber} onChange={(event) => setPhotoTimelineScrubber(Number(event.target.value))} style={{ width: "100%", accentColor: "#175CD3" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: colors.muted, marginTop: 4 }}>
              <span>{earliestPhotoTime ? new Date(earliestPhotoTime).getFullYear() : "Start"}</span>
              <span>{latestPhotoTime ? new Date(latestPhotoTime).getFullYear() : "Current"}</span>
            </div>
          </div> : null}

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1.5fr) repeat(5, minmax(120px, .7fr))", gap: 8, marginBottom: 12 }}>
            <input value={photoTimelineSearch} onChange={(event) => setPhotoTimelineSearch(event.target.value)} placeholder={photoTimelineView === "projects" ? "Search projects..." : "Search estate history, work, photos, documents..."} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10, padding: "9px 11px", fontWeight: 700 }} />
            {(photoTimelineView === "activity" || photoTimelineView === "history") ? <select value={estateTimelineTypeFilter} onChange={(event) => setEstateTimelineTypeFilter(event.target.value as typeof estateTimelineTypeFilter)} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="All">All record types</option>{(["Project", "Work Order", "Photo", "Document", "Calendar", "Task", "Note"] as const).map((type) => <option key={type} value={type}>{type}</option>)}</select> : null}
            {(photoTimelineView === "activity" || photoTimelineView === "history") ? <select value={estateTimelineRange} onChange={(event) => { setEstateTimelineRange(event.target.value as typeof estateTimelineRange); if (event.target.value !== "all") { setPhotoTimelineYear("all"); setPhotoTimelineMonthFilter("all"); } }} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="all">All dates</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="year">This year</option></select> : null}
            {photoTimelineView === "timeline" ? <select value={photoTimelineTagFilter} onChange={(event) => setPhotoTimelineTagFilter(event.target.value as PhotoTimelineTag | "All")} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="All">All phases</option>{([...PHOTO_TIMELINE_TAGS.filter((tag) => tag !== "Unlabeled"), "Unlabeled"] as PhotoTimelineTag[]).map((tag) => <option key={tag}>{tag}</option>)}</select> : null}
            {photoTimelineView === "timeline" ? <select value={photoTimelineAssetId} onChange={(event) => setPhotoTimelineAssetId(event.target.value)} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="all">All assets</option>{assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select> : null}
            {photoTimelineView === "timeline" ? <select value={photoTimelineVendorFilter} onChange={(event) => setPhotoTimelineVendorFilter(event.target.value)} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="all">All vendors</option>{vendorRecords.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select> : null}
            {photoTimelineView !== "projects" ? <select value={photoTimelineYear} onChange={(event) => setPhotoTimelineYear(event.target.value)} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="all">All years</option>{photoTimelineYears.map((year) => <option key={year}>{year}</option>)}</select> : null}
            {photoTimelineView !== "projects" ? <select value={photoTimelineMonthFilter} onChange={(event) => { setPhotoTimelineMonthFilter(event.target.value); if (event.target.value !== "all") setEstateTimelineRange("all"); }} style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, background: "white", fontWeight: 700 }}><option value="all">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={String(index + 1).padStart(2, "0")}>{new Date(2026, index, 1).toLocaleDateString(undefined, { month: "long" })}</option>)}</select> : null}
            {(photoTimelineView === "activity" || photoTimelineView === "history") && (photoTimelineSearch || estateTimelineTypeFilter !== "All" || estateTimelineRange !== "all" || photoTimelineYear !== "all" || photoTimelineMonthFilter !== "all") ? <button type="button" onClick={() => { setPhotoTimelineSearch(""); setEstateTimelineTypeFilter("All"); setEstateTimelineRange("all"); setPhotoTimelineYear("all"); setPhotoTimelineMonthFilter("all"); }} style={secondaryButtonStyle}>Clear</button> : null}
          </div>

          {photoTimelineView === "projects" ? (
            <div id="atlas-photo-results" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(280px, 340px) minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
              <aside style={{ border: "1px solid #D7E0EA", borderRadius: 14, background: "white", overflow: "hidden", minHeight: isMobile ? 0 : 620 }}>
                <div style={{ padding: 10, borderBottom: "1px solid #E4EAF0", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div><strong style={{ color: colors.navy3 }}>Projects</strong><small style={{ ...mutedSmallStyle, display: "block" }}>{visiblePhotoProjects.length} visible</small></div>
                  <button type="button" onClick={createPhotoProject} style={{ ...goldButtonStyle, width: "auto", padding: "8px 10px" }}>+ Add</button>
                </div>
                <div style={{ maxHeight: isMobile ? 430 : "calc(100vh - 310px)", overflowY: "auto", padding: 8, display: "grid", gap: 7 }}>
                  {visiblePhotoProjects.length ? visiblePhotoProjects.map((project) => {
                    const progress = Math.max(0, Math.min(100, Number(project.progress || 0)));
                    const selected = selectedPhotoProjectId === project.id;
                    return (
                      <button key={project.id} type="button" className="atlas-gold-hover-card" onClick={() => { setSelectedPhotoProjectId(project.id); setProjectDetailTab("overview"); }} style={{ width: "100%", border: `1px solid ${selected ? "#D9B65C" : "#D7E0EA"}`, borderRadius: 11, padding: 10, background: selected ? "#FFF9E8" : "white", textAlign: "left", cursor: "pointer", boxShadow: selected ? "0 0 0 1px rgba(217,182,92,.25)" : "none", position: "relative", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}><strong style={{ display: "block", color: colors.navy3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{project.title}</strong><small style={{ display: "block", marginTop: 2, color: colors.muted, fontWeight: 800, fontSize: 10 }}>{project.category} · {project.phase || "No current phase"}</small></div>
                          <span style={{ flex: "0 0 auto", border: `1px solid ${project.archived ? "#CBD5E1" : (project.status === "Completed" || project.completedAt) ? "#B7DFC8" : "#E8D18E"}`, borderRadius: 999, padding: "3px 6px", background: project.archived ? "#F8FAFC" : (project.status === "Completed" || project.completedAt) ? "#F0FBF4" : "#FFF9E8", color: colors.navy3, fontSize: 9, fontWeight: 950 }}>{project.archived ? "Archived" : (project.status === "Completed" || project.completedAt) ? "Completed" : "Active"}</span>
                        </div>
                        <div style={{ marginTop: 7, display: "flex", justifyContent: "space-between", gap: 8, color: colors.muted, fontSize: 10, fontWeight: 800 }}><span>{project.status || "Planning"}</span><span>{progress}%</span></div>
                        <div style={{ marginTop: 3, height: 2, background: "#E6EBF0", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: selected ? "#D9B65C" : "#175CD3", borderRadius: 999 }} /></div>
                        <small style={{ display: "block", marginTop: 6, color: colors.muted, fontSize: 10 }}>Updated {projectLastUpdated(project.items, project.createdAt)}</small>
                      </button>
                    );
                  }) : <div style={emptyStateStyle}>No projects match the current filters.</div>}
                </div>
              </aside>

              <section style={{ border: "1px solid #D7E0EA", borderRadius: 14, background: "white", minWidth: 0, overflow: "hidden", position: isMobile ? "static" : "sticky", top: 14 }}>
                {selectedPhotoProject ? (
                  <>
                    <div style={{ padding: isMobile ? 14 : 18, borderBottom: "1px solid #DDE5ED", background: "linear-gradient(135deg,#0B2940,#123E5A)", color: "white" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ minWidth: 0 }}><small style={{ fontWeight: 950, letterSpacing: ".08em", color: "#D9B65C" }}>PROJECT RECORD</small><h2 style={{ margin: "4px 0 6px", fontSize: isMobile ? 22 : 28 }}>{selectedPhotoProject.title}</h2><div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, fontWeight: 850, opacity: .9 }}><span>{selectedPhotoProject.category}</span><span>·</span><span>{selectedPhotoProject.status || "Planning"}</span><span>·</span><span>{selectedPhotoProject.phase || "No current phase"}</span></div></div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><button type="button" onClick={deleteSelectedPhotoProject} style={{ ...secondaryButtonStyle, width: "auto", padding: "7px 10px", color: "#B42318", borderColor: "#FACACA" }}>Delete</button>{isMobile ? <button type="button" onClick={() => setSelectedPhotoProjectId("")} style={{ ...secondaryButtonStyle, width: 40, padding: 8 }}>{closeSymbol}</button> : null}</div>
                      </div>
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 110, height: 3, background: "rgba(255,255,255,.25)", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${Math.max(0, Math.min(100, Number(selectedPhotoProject.progress || 0)))}%`, height: "100%", background: "#D9B65C" }} /></div><small style={{ fontWeight: 900 }}>{Math.max(0, Math.min(100, Number(selectedPhotoProject.progress || 0)))}% complete</small></div>
                    </div>

                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "12px 14px", borderBottom: "1px solid #E4EAF0", background: "#F8FAFC" }}>{([['overview','Overview'],['timeline','Timeline'],['photos','Photos'],['documents','Documents'],['work','Work Orders'],['people','People']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setProjectDetailTab(value)} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 34, padding: "6px 10px", background: projectDetailTab === value ? colors.navy : "white", color: projectDetailTab === value ? "white" : colors.navy }}>{label}</button>)}</div>

                    <div style={{ padding: isMobile ? 14 : 18, maxHeight: isMobile ? "none" : "calc(100vh - 350px)", overflowY: "auto" }}>
                      {projectDetailTab === "overview" ? (
                        <div style={{ display: "grid", gap: 14 }}>
                          <section style={{ border: `1px solid ${selectedProjectAttentionCount ? "#F4C7A1" : colors.line}`, borderRadius: 12, padding: 11, background: selectedProjectAttentionCount ? "#FFF9F2" : "#F8FAFC" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <div><div style={eyebrowStyle}>Record intelligence</div><strong style={{ color: colors.navy3 }}>{selectedProjectNextAction}</strong></div>
                              <span style={badgeStyle(selectedProjectAttentionCount ? "Open" : selectedPhotoProject.status === "Completed" ? "Completed" : "Monitor")}>{selectedProjectAttentionCount ? `${selectedProjectAttentionCount} need attention` : "On track"}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9, fontSize: 12 }}>
                              <span><strong>{selectedProjectOpenWorkOrders.length}</strong> open work</span>
                              <span>·</span>
                              <span><strong>{selectedProjectTimelineEntries.length}</strong> timeline entries</span>
                              <span>·</span>
                              <span><strong>{selectedPhotoProjectItems.length}</strong> photos</span>
                              <span>·</span>
                              <span>Last activity <strong>{selectedProjectLastActivity ? formatDate(String(selectedProjectLastActivity).slice(0, 10)) : "Not recorded"}</strong></span>
                            </div>
                          </section>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.3fr) minmax(260px,.7fr)", gap: 14 }}>
                            <div style={{ display: "grid", gap: 12 }}>
                              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 13, padding: 14 }}><div style={eyebrowStyle}>Current project</div><textarea value={selectedPhotoProject.notes} onChange={(event) => updateSelectedPhotoProject({ notes: event.target.value })} placeholder="Project scope, current condition, key decisions, blockers, and next action..." style={{ width: "100%", minHeight: 125, border: 0, resize: "vertical", padding: 0, marginTop: 8, font: "inherit", color: colors.text, outline: "none" }} /></div>
                              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 13, padding: 14, background: "#F8FAFC" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ color: colors.navy3 }}>Quick note</strong><span style={badgeStyle("Monitor")}>Adds to timeline</span></div><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 150px", gap: 8, marginTop: 10 }}><input value={projectQuickNoteTitle} onChange={(event) => setProjectQuickNoteTitle(event.target.value)} placeholder="Note title" style={{ border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, fontWeight: 750 }} /><select value={projectQuickNoteType} onChange={(event) => setProjectQuickNoteType(event.target.value as ProjectTimelineEntry["type"])} style={{ border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white" }}>{(["Note","Milestone","Vendor Visit","Delivery","Inspection","Decision","Completed"] as ProjectTimelineEntry["type"][]).map((type) => <option key={type}>{type}</option>)}</select></div><textarea value={projectQuickNoteText} onChange={(event) => setProjectQuickNoteText(event.target.value)} placeholder="What happened, what changed, or what needs to happen next?" style={{ width: "100%", minHeight: 80, border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, marginTop: 8, font: "inherit" }} /><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}><input type="date" value={projectQuickNoteDate} onChange={(event) => setProjectQuickNoteDate(event.target.value)} style={{ border: "1px solid #CBD5E1", borderRadius: 9, padding: 9 }} /><button type="button" onClick={addProjectQuickTimelineNote} style={{ ...goldButtonStyle, width: "auto" }}>Add Note</button></div></div>
                            </div>
                            <aside style={{ display: "grid", gap: 10, alignContent: "start" }}>
                              <Field label="Project title" value={selectedPhotoProject.title} onChange={(value) => updateSelectedPhotoProject({ title: value })} />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Asset<select value={selectedPhotoProject.assetId || ""} onChange={(event) => updateSelectedPhotoProject({ assetId: event.target.value })} style={{ border: "1px solid #CBD5E1", borderRadius: 9, padding: 9, background: "white", minWidth: 0 }}><option value="">None</option>{assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Location<select value={selectedPhotoProject.locationId || ""} onChange={(event) => updateSelectedPhotoProject({ locationId: event.target.value })} style={{ border: "1px solid #CBD5E1", borderRadius: 9, padding: 9, background: "white", minWidth: 0 }}><option value="">None</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><SelectField label="Status" value={selectedPhotoProject.status || "Planning"} options={["Planning", "Active", "Waiting", "Completed"]} onChange={(value) => updateSelectedPhotoProject({ status: value as PhotoTimelineProject["status"] })} /><SelectField label="Size" value={selectedPhotoProject.scale || "Standard"} options={["Quick", "Standard", "Major"]} onChange={(value) => updateSelectedPhotoProject({ scale: value as PhotoTimelineProject["scale"] })} /></div>
                              <Field label="Current phase / next action" value={selectedPhotoProject.phase || ""} onChange={(value) => updateSelectedPhotoProject({ phase: value })} />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Field label="Start date" type="date" value={selectedPhotoProject.startDate || ""} onChange={(value) => updateSelectedPhotoProject({ startDate: value })} /><Field label="Completed" type="date" value={selectedPhotoProject.completedAt || ""} onChange={(value) => updateSelectedPhotoProject({ completedAt: value })} /></div>
                              <label style={{ fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Progress <span style={{ color: colors.muted }}>({Math.max(0, Math.min(100, Number(selectedPhotoProject.progress || 0)))}%)</span><input type="range" min="0" max="100" value={Math.max(0, Math.min(100, Number(selectedPhotoProject.progress || 0)))} onChange={(event) => updateSelectedPhotoProject({ progress: Number(event.target.value) })} style={{ width: "100%", accentColor: "#175CD3", marginTop: 5 }} /></label>
                              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                {!isMobile ? <button type="button" onClick={() => openComparison(selectedPhotoProject.id)} style={{ ...secondaryButtonStyle, width: "auto" }}>Compare</button> : null}
                                <label style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: 0, width: "auto" }}>Add Photos<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(event) => { void addDatedProjectPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                                <label style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: 0, width: "auto" }}>Add Docs<input type="file" multiple style={{ display: "none" }} onChange={(event) => { void addProjectDocuments(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                              </div>
                            </aside>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))", gap: 9 }}>{[["Photos",selectedPhotoProjectItems.length],["Documents",selectedProjectDocuments.length],["Tasks",selectedProjectTasks.length],["Work orders",selectedProjectWorkOrders.length],["People / vendors",selectedProjectPeople.length + selectedProjectVendors.length]].map(([label,value]) => <div key={String(label)} style={{ border: `1px solid ${colors.line}`, borderRadius: 11, padding: 11, background: "#F8FAFC" }}><small style={mutedSmallStyle}>{label}</small><strong style={{ display: "block", fontSize: 20, color: colors.navy3 }}>{value}</strong></div>)}</div>
                        </div>
                      ) : null}

                      {projectDetailTab === "timeline" ? <div style={{ display: "grid", gap: 10 }}>{selectedProjectTimelineEntries.length ? selectedProjectTimelineEntries.map((entry) => <div key={entry.id} style={{ borderLeft: "3px solid #175CD3", padding: "4px 0 4px 12px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong style={{ color: colors.navy3 }}>{entry.title}</strong><small style={{ color: colors.muted }}>{formatDate(entry.date)}</small></div><small style={{ color: "#175CD3", fontWeight: 900 }}>{entry.type}</small>{entry.notes ? <p style={{ margin: "5px 0 0", whiteSpace: "pre-wrap", color: colors.text }}>{entry.notes}</p> : null}</div>) : <div style={emptyStateStyle}>No project timeline entries yet. Add a quick note from Overview.</div>}</div> : null}
                      {projectDetailTab === "photos" ? <><div style={{ display: "grid", gap: 9, marginBottom: 12, border: `1px solid ${colors.line}`, borderRadius: 11, padding: 10, background: "#F8FAFC" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><strong style={{ color: colors.navy3 }}>Project photos</strong><small style={{ ...mutedSmallStyle, display: "block", marginTop: 2 }}>Choose multiple photos, then use one compact label, date, and note for the batch.</small></div><label style={{ ...goldButtonStyle, display: "inline-flex", width: "auto", cursor: "pointer", margin: 0 }}>+ Add Photos<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(event) => { void addDatedProjectPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} /></label></div><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "150px 160px minmax(220px,1fr)", gap: 8 }}><label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 900, color: colors.navy3 }}>Label<select value={projectPhotoTag} onChange={(event) => setProjectPhotoTag(event.target.value as PhotoTimelineTag)} style={{ minWidth: 0, border: "1px solid #CBD5E1", borderRadius: 8, padding: 8, background: "white", fontSize: 12 }}>{PHOTO_TIMELINE_TAGS.map((tag) => <option key={tag}>{tag}</option>)}</select></label><label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 900, color: colors.navy3 }}>Date<input type="date" value={projectPhotoDate} onChange={(event) => setProjectPhotoDate(event.target.value)} style={{ minWidth: 0, border: "1px solid #CBD5E1", borderRadius: 8, padding: 8, fontSize: 12 }} /></label><label style={{ display: "grid", gap: 4, fontSize: 11, fontWeight: 900, color: colors.navy3, gridColumn: isMobile ? "1 / -1" : "auto" }}>Note<input value={projectPhotoCaption} onChange={(event) => setProjectPhotoCaption(event.target.value)} placeholder="Optional note for this batch" style={{ minWidth: 0, border: "1px solid #CBD5E1", borderRadius: 8, padding: 8, fontSize: 12 }} /></label></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>{selectedPhotoProjectItems.map((item) => {
                        const meta = photoTimelineMeta[item.id] || { tag: "Unlabeled" as PhotoTimelineTag, notes: "" };
                        return <div key={item.id} style={{ border: `2px solid ${selectedPhotoProject.coverPhotoId === item.id ? "#C99A3D" : "#D7E0EA"}`, borderRadius: 12, overflow: "hidden", background: "white" }}>
                          <button type="button" onClick={() => isMobile ? setSelectedPhotoTimelineId(item.id) : openLightbox(item.id, selectedPhotoProjectItems.map((record) => record.id))} style={{ border: 0, padding: 0, width: "100%", background: "white", cursor: "pointer" }}><img src={item.source} alt={item.name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} /></button>
                          {isMobile ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 7 }}>
                            <select value={meta.tag || "Unlabeled"} onChange={(event) => setPhotoTimelineMeta((current) => ({ ...current, [item.id]: { ...(current[item.id] || { tag: "Unlabeled", notes: "" }), tag: event.target.value as PhotoTimelineTag } }))} style={{ minWidth: 0, border: "1px solid #CBD5E1", borderRadius: 8, padding: 7, background: "white", fontSize: 12, fontWeight: 800 }}>{PHOTO_TIMELINE_TAGS.map((tag) => <option key={tag}>{tag}</option>)}</select>
                            <input type="date" value={meta.dateTaken || String(item.createdAt || "").slice(0,10)} onChange={(event) => setPhotoTimelineMeta((current) => ({ ...current, [item.id]: { tag: "Unlabeled", notes: "", ...current[item.id], dateTaken: event.target.value, milestoneDate: event.target.value } }))} style={{ minWidth: 0, border: "1px solid #CBD5E1", borderRadius: 8, padding: 7, fontSize: 12 }} />
                          </div> : <span style={{ display: "block", padding: 8, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>{meta.tag || "Unlabeled"}</span>}
                        </div>;
                      })}</div>{!selectedPhotoProjectItems.length ? <div style={emptyStateStyle}>No photos are attached to this project.</div> : null}</> : null}
                      {projectDetailTab === "documents" ? <div style={{ display: "grid", gap: 9 }}>{selectedProjectDocuments.map((document) => <button key={document.id} type="button" onClick={() => { setSelectedDocumentId(document.id); setScreen("documents"); }} style={{ ...rowButtonStyle, textAlign: "left" }}><strong>{document.title}</strong><small style={mutedSmallStyle}>{document.type || "Document"} · {document.files?.length || 0} file(s)</small></button>)}{!selectedProjectDocuments.length ? <div style={emptyStateStyle}>No documents are linked to this project yet.</div> : null}</div> : null}
                      {projectDetailTab === "work" ? <div style={{ display: "grid", gap: 14 }}><section><div style={eyebrowStyle}>Tasks · {selectedProjectTasks.length}</div><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{selectedProjectTasks.map((task) => <button key={task.id} type="button" onClick={() => { setSelectedTaskId(task.id); setTasksView("tasks"); setScreen("planner"); }} style={{ ...rowButtonStyle, textAlign: "left" }}><strong>{task.title}</strong><small style={mutedSmallStyle}>{taskDetails(task.id).status} · {taskDetails(task.id).dueDate ? formatDate(taskDetails(task.id).dueDate) : "No due date"}</small></button>)}{!selectedProjectTasks.length ? <div style={emptyStateStyle}>No Tasks are linked to this project yet.</div> : null}</div></section><section><div style={eyebrowStyle}>Work Orders · {selectedProjectWorkOrders.length}</div><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{selectedProjectWorkOrders.map((record) => <button key={record.id} type="button" onClick={() => { setSelectedServiceId(record.id); setScreen("history"); }} style={{ ...rowButtonStyle, textAlign: "left" }}><strong>{record.title}</strong><small style={mutedSmallStyle}>{record.status} · {record.date ? formatDate(record.date) : "No due date"}</small></button>)}{!selectedProjectWorkOrders.length ? <div style={emptyStateStyle}>No Work Orders are linked to this project yet.</div> : null}</div></section><button type="button" onClick={() => addWorkOrder({ projectId: selectedPhotoProject.id, vendorId: selectedPhotoProject.vendorId || "", assignedVendorIds: selectedPhotoProject.vendorIds || [], assetId: selectedPhotoProject.assetId || "", locationId: selectedPhotoProject.locationId || "", responsibilityArea: `Project · ${selectedPhotoProject.title}` })} style={goldButtonStyle}>+ Add Project Work Order</button></div> : null}
                      {projectDetailTab === "people" ? <div style={{ display: "grid", gap: 14 }}><section><strong style={{ color: colors.navy3 }}>Vendors</strong><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{selectedProjectVendors.map((vendor) => <button key={vendor.id} type="button" onClick={() => { setSelectedVendorId(vendor.id); setScreen("vendors"); }} style={{ ...rowButtonStyle, textAlign: "left" }}><strong>{vendor.name}</strong><small style={mutedSmallStyle}>{vendor.category || "Vendor"}</small></button>)}{!selectedProjectVendors.length ? <div style={emptyStateStyle}>No vendors assigned.</div> : null}</div></section><section><strong style={{ color: colors.navy3 }}>People</strong><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{selectedProjectPeople.map((contact) => <div key={contact.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10 }}><strong>{contact.name}</strong><small style={{ ...mutedSmallStyle, display: "block" }}>{contact.role || contact.organization || "Contact"}</small></div>)}{!selectedProjectPeople.length ? <div style={emptyStateStyle}>No people assigned.</div> : null}</div></section></div> : null}
                    </div>
                  </>
                ) : <div style={{ minHeight: 540, display: "grid", placeItems: "center", padding: 30, textAlign: "center" }}><div><div style={{ fontSize: 38 }}>📋</div><h3 style={{ color: colors.navy3, marginBottom: 6 }}>Select a project</h3><p style={{ color: colors.muted, margin: 0 }}>Choose a project from the list to view its timeline, notes, photos, documents, work orders, people, and current status.</p></div></div>}
              </section>
            </div>
          ) : photoTimelineView === "history" ? (
            <div id="atlas-estate-history" style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>
                {[
                  ["Years recorded", estateHistoryYears.length],
                  ["Project milestones", estateHistoryProjectCount],
                  ["Major work", estateHistoryWorkCount],
                  ["Historical photos", estateHistoryPhotoCount],
                ].map(([label, value]) => <div key={String(label)} style={{ border: `1px solid ${colors.line}`, borderRadius: 11, padding: 10, background: "white" }}><small style={mutedSmallStyle}>{label}</small><strong style={{ display: "block", color: colors.navy3, fontSize: 20, marginTop: 2 }}>{value}</strong></div>)}
              </div>

              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: isMobile ? 12 : 16, background: "white" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <div><strong style={{ color: colors.navy3, fontSize: 18 }}>Estate History</strong><small style={{ ...mutedSmallStyle, display: "block", marginTop: 3 }}>Major projects, repairs, inspections, documents, and before/after records organized by year.</small></div>
                  <span style={badgeStyle("Monitor")}>{estateHistoryItems.length} milestones</span>
                </div>

                {estateHistoryYears.length ? <div style={{ display: "grid", gap: 20 }}>
                  {estateHistoryYears.map((year) => {
                    const items = [...estateHistoryByYear[year]].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
                    return <section key={year} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "92px minmax(0,1fr)", gap: isMobile ? 8 : 18 }}>
                      <div style={{ position: isMobile ? "static" : "sticky", top: 48, alignSelf: "start" }}><strong style={{ color: colors.navy3, fontSize: isMobile ? 22 : 26 }}>{year}</strong><small style={{ ...mutedSmallStyle, display: "block" }}>{items.length} milestone{items.length === 1 ? "" : "s"}</small></div>
                      <div style={{ borderLeft: `2px solid ${colors.line}`, marginLeft: isMobile ? 8 : 0, paddingLeft: 16, display: "grid", gap: 8 }}>
                        {items.map((item) => <button key={item.id} type="button" onClick={item.action} disabled={!item.action} style={{ position: "relative", width: "100%", display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 9, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 11, padding: "9px 10px", background: "white", textAlign: "left", cursor: item.action ? "pointer" : "default" }}>
                          <span aria-hidden="true" style={{ position: "absolute", left: -22, width: 10, height: 10, borderRadius: 999, background: item.type === "Project" ? colors.gold : item.type === "Photo" ? "#175CD3" : item.type === "Work Order" ? "#087443" : "#7C3AED", border: "2px solid white" }} />
                          <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "#F2F6FA", fontSize: 16 }}>{item.icon}</span>
                          <span style={{ minWidth: 0 }}><strong style={{ display: "block", color: colors.navy3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong><small style={{ ...mutedSmallStyle, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail}</small></span>
                          <span style={{ textAlign: "right" }}><small style={{ ...mutedSmallStyle, display: "block" }}>{item.date ? formatDate(String(item.date).slice(0,10)) : "No date"}</small><span style={{ ...badgeStyle("Monitor"), fontSize: 10, padding: "3px 7px", marginTop: 3 }}>{item.type}</span></span>
                        </button>)}
                      </div>
                    </section>;
                  })}
                </div> : <div style={emptyStateStyle}>No major milestones match the current search and date filters.</div>}
              </div>
            </div>
          ) : photoTimelineView === "activity" ? (
            <div id="atlas-activity-results" style={{ display: "grid", gap: 16 }}>
              {onThisDayItems.length ? <section style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 12, background: "linear-gradient(135deg,#FFF9E8,#FFFFFF)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}><div><strong style={{ color: colors.navy3 }}>On This Day</strong><small style={{ ...mutedSmallStyle, display: "block" }}>Earlier estate activity from this calendar date.</small></div><span style={badgeStyle("Seasonal")}>{onThisDayItems.length}</span></div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 7 }}>{onThisDayItems.map((item) => <button key={`on-this-day-${item.id}`} type="button" onClick={item.action} disabled={!item.action} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: "9px 10px", background: "white", textAlign: "left", cursor: item.action ? "pointer" : "default", display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}><span style={{ fontSize: 17 }}>{item.icon}</span><span style={{ minWidth: 0 }}><strong style={{ display: "block", color: colors.navy3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong><small style={{ ...mutedSmallStyle, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail}</small></span><small style={mutedSmallStyle}>{String(item.date).slice(0,4)}</small></button>)}</div>
              </section> : null}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>
                {[
                  ["All activity", visibleActivityItems.length],
                  ["Work completed", visibleActivityItems.filter((item) => item.type === "Work Order" || item.type === "Task").length],
                  ["Photos", visibleActivityItems.filter((item) => item.type === "Photo").length],
                  ["Project updates", visibleActivityItems.filter((item) => item.type === "Project").length],
                ].map(([label, value]) => <div key={String(label)} style={{ border: `1px solid ${colors.line}`, borderRadius: 11, padding: 10, background: "white" }}><small style={mutedSmallStyle}>{label}</small><strong style={{ display: "block", color: colors.navy3, fontSize: 20, marginTop: 2 }}>{value}</strong></div>)}
              </div>
              {Object.keys(activityGroups).length ? Object.entries(activityGroups).sort(([a], [b]) => b.localeCompare(a)).map(([dateKey, items]) => (
                <section key={dateKey}>
                  <div style={{ position: "sticky", top: 0, zIndex: 2, padding: "7px 0", background: "rgba(247,250,252,.96)", backdropFilter: "blur(8px)", color: colors.navy3, fontWeight: 950 }}>{dateKey === "No date" ? "No date" : new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</div>
                  <div style={{ display: "grid", gap: 7, borderLeft: `2px solid ${colors.line}`, marginLeft: 10, paddingLeft: 14 }}>
                    {items.map((item) => <button key={item.id} type="button" onClick={item.action} disabled={!item.action} style={{ position: "relative", width: "100%", display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 9, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 11, padding: "9px 10px", background: "white", textAlign: "left", cursor: item.action ? "pointer" : "default" }}>
                      <span aria-hidden="true" style={{ position: "absolute", left: -21, width: 10, height: 10, borderRadius: 999, background: item.type === "Project" ? colors.gold : item.type === "Photo" ? "#175CD3" : item.type === "Work Order" ? "#087443" : "#7C3AED", border: "2px solid white" }} />
                      <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "#F2F6FA", fontSize: 16 }}>{item.icon}</span>
                      <span style={{ minWidth: 0 }}><strong style={{ display: "block", color: colors.navy3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong><small style={{ ...mutedSmallStyle, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail}</small></span>
                      <span style={{ ...badgeStyle("Monitor"), fontSize: 10, padding: "3px 7px" }}>{item.type}</span>
                    </button>)}
                  </div>
                </section>
              )) : <div style={emptyStateStyle}>No activity matches the current search and date filters.</div>}
            </div>
          ) : (
            photoTimelineItems.length ? (
              <div style={{ display: "grid", gap: 24 }}>
                {Object.entries(timelineGroups).sort(([a], [b]) => b.localeCompare(a)).map(([year, items]) => (
                  <div key={year}>
                    <h3 style={{ margin: "0 0 12px", color: colors.navy3, fontSize: 24 }}>{year}</h3>
                    <div style={{ borderLeft: "3px solid #D7E0EA", marginLeft: 12, paddingLeft: 22, display: "grid", gap: 14 }}>
                      {items.map((item) => { const meta = photoTimelineMeta[item.id] || { tag: "Unlabeled" as PhotoTimelineTag, notes: "" }; return (
                        <button key={item.id} type="button" onClick={() => setSelectedPhotoTimelineId(item.id)} style={{ position: "relative", display: "grid", gridTemplateColumns: isMobile ? "96px minmax(0,1fr)" : "140px minmax(0,1fr) auto", gap: 14, alignItems: "center", border: "1px solid #D7E0EA", borderRadius: 14, padding: 10, background: "white", textAlign: "left", cursor: "pointer" }}>
                          <span style={{ position: "absolute", left: -31, width: 15, height: 15, borderRadius: 999, background: meta.tag === "After" || meta.tag === "Final" ? "#087443" : meta.tag === "Before" || meta.tag === "Problem" ? "#B54708" : meta.tag === "Repair" || meta.tag === "Inspection" ? "#7C3AED" : "#175CD3", border: "3px solid white", boxShadow: "0 0 0 1px #CBD5E1" }} />
                          <img src={item.source} alt={item.name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} />
                          <span><strong style={{ display: "block", color: colors.navy3 }}>{meta.milestoneTitle?.trim() || meta.notes?.trim() || item.name}</strong><small style={{ display: "block", color: colors.muted, marginTop: 4 }}>{meta.milestoneDate || meta.dateTaken ? formatDate(String(meta.milestoneDate || meta.dateTaken)) : item.createdAt ? formatDate(String(item.createdAt).slice(0, 10)) : "No date"} · {meta.milestoneType || item.assetName}</small></span>
                          <span style={badgeStyle(meta.tag)}>{meta.tag}</span>
                        </button>
                      ); })}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={emptyStateStyle}>No photos match the current timeline filters.</div>
          )}


          {selectedPhotoTimelineItem && selectedPhotoMeta ? (
            <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,.58)", display: "grid", placeItems: isMobile ? "end stretch" : "center", padding: isMobile ? 0 : 24 }} onClick={() => setSelectedPhotoTimelineId("")}>
              <div onClick={(event) => event.stopPropagation()} style={{ width: isMobile ? "100%" : "min(1180px,95vw)", maxHeight: isMobile ? "94vh" : "92vh", overflow: "auto", background: "white", borderRadius: isMobile ? "18px 18px 0 0" : 20, boxShadow: "0 24px 70px rgba(15,23,42,.32)" }}>
                <div style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "white", borderBottom: "1px solid #DDE5ED" }}><div><small style={{ color: "#175CD3", fontWeight: 950 }}>PHOTO RECORD</small><strong style={{ display: "block", color: colors.navy3 }}>{selectedPhotoTimelineItem.name}</strong></div><button type="button" onClick={() => setSelectedPhotoTimelineId("")} style={{ ...secondaryButtonStyle, width: 40, padding: 8, fontSize: 20 }}>{closeSymbol}</button></div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.45fr) 380px" }}>
                  <div style={{ background: "#101828", minHeight: isMobile ? 300 : 620, display: "grid", placeItems: "center", padding: 16, cursor: "zoom-in" }} onClick={() => openLightbox(selectedPhotoTimelineItem.id)}><img src={selectedPhotoTimelineItem.source} alt={selectedPhotoTimelineItem.name} style={{ maxWidth: "100%", maxHeight: isMobile ? "56vh" : 640, objectFit: "contain" }} /></div>
                  <aside style={{ padding: 18, display: "grid", gap: 14, alignContent: "start" }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 7 }}>{PHOTO_TIMELINE_TAGS.map((tag) => <button key={tag} type="button" onClick={() => updateSelectedPhotoMeta({ tag })} style={{ border: `1px solid ${selectedPhotoMeta.tag === tag ? "#175CD3" : "#CBD5E1"}`, borderRadius: 9, background: selectedPhotoMeta.tag === tag ? "#EDF3FF" : "white", color: selectedPhotoMeta.tag === tag ? "#175CD3" : colors.text, minHeight: 36, fontWeight: 900, cursor: "pointer", fontSize: 12 }}>{tag}</button>)}</div>
                    <div style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 12, background: colors.panel, display: "grid", gap: 9 }}>
                      <strong style={{ color: colors.navy3 }}>Photo details</strong>
                      <Field label="Photo title" value={selectedPhotoMeta.displayName || selectedPhotoTimelineItem.name} onChange={(value) => updateSelectedPhotoMeta({ displayName: value })} />
                      <Field label="Tags" value={selectedPhotoMeta.tags || ""} onChange={(value) => updateSelectedPhotoMeta({ tags: value })} />
                      <div style={{ display: "grid", gap: 7 }}><span style={{ fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Photo belongs primarily to</span><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>{([['standalone','Standalone'],['asset','Asset'],['project','Project']] as const).map(([value,label]) => { const currentContext = selectedPhotoMeta.primaryContext || (selectedPhotoMeta.projectId ? "project" : (selectedPhotoMeta.assetIdOverride || selectedPhotoTimelineItem.assetId) ? "asset" : "standalone"); return <button key={value} type="button" onClick={() => updateSelectedPhotoMeta({ primaryContext: value })} style={{ border: `1px solid ${currentContext === value ? "#175CD3" : "#CBD5E1"}`, borderRadius: 9, background: currentContext === value ? "#EDF3FF" : "white", color: currentContext === value ? "#175CD3" : colors.text, minHeight: 36, fontWeight: 900, cursor: "pointer", fontSize: 12 }}>{label}</button>; })}</div></div>
                      <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Linked asset <span style={{ color: colors.muted, fontWeight: 700 }}>(optional even for project photos)</span><select value={selectedPhotoMeta.assetIdOverride !== undefined ? selectedPhotoMeta.assetIdOverride : selectedPhotoTimelineItem.assetId} onChange={(event) => updateSelectedPhotoMeta({ assetIdOverride: event.target.value })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white" }}><option value="">No linked asset</option>{assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                      <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Linked project <span style={{ color: colors.muted, fontWeight: 700 }}>(optional even for asset photos)</span><select value={selectedPhotoMeta.projectId || ""} onChange={(event) => updateSelectedPhotoMeta({ projectId: event.target.value || undefined })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white", fontWeight: 700 }}><option value="">No linked project</option>{photoTimelineProjects.filter((project) => !project.archived || project.id === selectedPhotoMeta.projectId).map((project) => <option key={project.id} value={project.id}>{project.title}{project.archived ? " (Archived)" : ""}</option>)}</select></label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}><Field label="Photographer" value={selectedPhotoMeta.photographer || ""} onChange={(value) => updateSelectedPhotoMeta({ photographer: value })} /><Field label="Weather" value={selectedPhotoMeta.weather || ""} onChange={(value) => updateSelectedPhotoMeta({ weather: value })} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}><Field label="Date taken" type="date" value={selectedPhotoMeta.dateTaken || String(selectedPhotoTimelineItem.createdAt || "").slice(0, 10)} onChange={(value) => updateSelectedPhotoMeta({ dateTaken: value })} /><label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Location<select value={selectedPhotoMeta.locationId || selectedPhotoAsset?.locationId || ""} onChange={(event) => updateSelectedPhotoMeta({ locationId: event.target.value || undefined })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white" }}><option value="">General property</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></div>
                    <div style={{ border: "1px solid #DDE5ED", borderRadius: 12, padding: 12, background: "#F8FAFC", display: "grid", gap: 9 }}><strong style={{ color: colors.navy3 }}>Timeline milestone</strong><Field label="Milestone title" value={selectedPhotoMeta.milestoneTitle || ""} onChange={(value) => updateSelectedPhotoMeta({ milestoneTitle: value, timelineNote: Boolean(value.trim()) })} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}><label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Type<select value={selectedPhotoMeta.milestoneType || "Progress"} onChange={(event) => updateSelectedPhotoMeta({ milestoneType: event.target.value as PhotoTimelineMeta["milestoneType"] })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white" }}>{["Started","Inspection","Vendor Visit","Delivery","Progress","Completed","Custom"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><Field label="Milestone date" type="date" value={selectedPhotoMeta.milestoneDate || selectedPhotoMeta.dateTaken || String(selectedPhotoTimelineItem.createdAt || "").slice(0, 10)} onChange={(value) => updateSelectedPhotoMeta({ milestoneDate: value })} /></div></div>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Linked vendor<select value={selectedPhotoMeta.vendorId || ""} onChange={(event) => updateSelectedPhotoMeta({ vendorId: event.target.value || undefined })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white", fontWeight: 700 }}><option value="">None</option>{vendorRecords.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Related work order<select value={selectedPhotoMeta.workOrderId || ""} onChange={(event) => updateSelectedPhotoMeta({ workOrderId: event.target.value || undefined })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white", fontWeight: 700 }}><option value="">None</option>{serviceRecords.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Related document<select value={selectedPhotoMeta.documentId || selectedPhotoTimelineItem.documentId || ""} onChange={(event) => updateSelectedPhotoMeta({ documentId: event.target.value || undefined })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white", fontWeight: 700 }}><option value="">None</option>{allDocuments.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 900, color: colors.navy3 }}>Linked procedure<select value={selectedPhotoMeta.procedureId || ""} onChange={(event) => updateSelectedPhotoMeta({ procedureId: event.target.value || undefined })} style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 9, padding: 10, background: "white", fontWeight: 700 }}><option value="">None</option>{procedureRecords.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
                    <div style={{ border: "1px solid #DDE5ED", borderRadius: 12, padding: 12, background: "#F8FAFC", display: "grid", gap: 8 }}>{[["Date taken", selectedPhotoTimelineItem.createdAt ? formatDate(String(selectedPhotoTimelineItem.createdAt).slice(0, 10)) : "No date recorded"], ["Asset", selectedPhotoTimelineItem.assetName], ["Location", selectedPhotoLocation || selectedPhotoTimelineItem.area], ["Source", selectedPhotoTimelineItem.origin]].map(([label, value]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 8, fontSize: 13 }}><span style={{ color: colors.muted, fontWeight: 800 }}>{label}</span><strong style={{ color: colors.navy3 }}>{value}</strong></div>)}</div>
                    <textarea value={selectedPhotoMeta.notes} onChange={(event) => updateSelectedPhotoMeta({ notes: event.target.value, timelineNote: Boolean(event.target.value.trim()) })} placeholder="Add a timeline note, milestone, materials, repair details, or what changed..." style={{ width: "100%", minHeight: 105, border: "1px solid #CBD5E1", borderRadius: 10, padding: 10, font: "inherit" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                      <button type="button" onClick={createWorkOrderFromPhoto} style={secondaryButtonStyle}>Add Work Order</button>
                      <button type="button" onClick={addTimelineMilestone} style={secondaryButtonStyle}>Add Timeline Note</button>
                      <button type="button" onClick={() => { const projectId = selectedPhotoMeta.projectId; if (projectId) setPhotoTimelineProjects((current) => current.map((project) => project.id === projectId ? { ...project, coverPhotoId: selectedPhotoTimelineItem.id } : project)); }} style={secondaryButtonStyle}>Make Cover Photo</button>
                      <button type="button" onClick={() => openComparison(selectedPhotoMeta.projectId)} style={secondaryButtonStyle}>Compare</button>
                      <button type="button" onClick={() => { const link = document.createElement("a"); link.href = selectedPhotoTimelineItem.source; link.download = selectedPhotoTimelineItem.name || "atlas-photo"; link.click(); }} style={secondaryButtonStyle}>Download</button>
                      <button type="button" onClick={() => { if (navigator.share) void navigator.share({ title: selectedPhotoTimelineItem.name, url: selectedPhotoTimelineItem.source }); else void navigator.clipboard?.writeText(selectedPhotoTimelineItem.source); }} style={secondaryButtonStyle}>Share</button>
                      <label style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: 0 }}>Replace Photo<input type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void replaceSelectedTimelinePhoto(file); event.currentTarget.value = ""; }} /></label>
                      <button type="button" onClick={() => void deleteSelectedTimelinePhoto()} style={{ ...secondaryButtonStyle, color: colors.red, borderColor: "#FDA29B" }}>Delete Photo</button>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          ) : null}

          {photoCompareOpen && compareBefore && compareAfter ? (
            <div style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(3,7,18,.94)", display: "grid", placeItems: "center", padding: isMobile ? 0 : 24 }} onClick={() => setPhotoCompareOpen(false)}>
              <div onClick={(event) => event.stopPropagation()} style={{ width: "min(1280px,100vw)", height: isMobile ? "100vh" : "min(860px,94vh)", background: "#101828", borderRadius: isMobile ? 0 : 18, overflow: "hidden", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, color: "white" }}><strong>Before / After Comparison</strong><button type="button" onClick={() => setPhotoCompareOpen(false)} style={{ ...secondaryButtonStyle, width: 40, padding: 8 }}>{closeSymbol}</button></div>
                <div style={{ position: "relative", overflow: "hidden", background: "#000" }}>
                  <img src={compareBefore.source} alt="Before" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - photoComparePosition}% 0 0)` }}><img src={compareAfter.source} alt="After" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></div>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${photoComparePosition}%`, width: 3, background: "white", boxShadow: "0 0 0 1px rgba(0,0,0,.3)" }}><span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 42, height: 42, borderRadius: 999, background: "white", display: "grid", placeItems: "center", color: colors.navy3, fontWeight: 950 }}>↔</span></div>
                  <span style={{ position: "absolute", top: 14, left: 14, ...badgeStyle("Open") }}>BEFORE</span><span style={{ position: "absolute", top: 14, right: 14, ...badgeStyle("Completed") }}>AFTER</span>
                  <input aria-label="Before and after comparison slider" type="range" min="0" max="100" value={photoComparePosition} onChange={(event) => setPhotoComparePosition(Number(event.target.value))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12, color: "white", fontSize: 13 }}><span>{compareBefore.name}</span><span style={{ textAlign: "right" }}>{compareAfter.name}</span></div>
              </div>
            </div>
          ) : null}

          {lightboxItem ? (
            <div style={{ position: "fixed", inset: 0, zIndex: 1450, background: "rgba(3,7,18,.97)", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto" }} onClick={() => setPhotoLightboxIndex(-1)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, color: "white" }} onClick={(event) => event.stopPropagation()}><div><strong>{lightboxItem.name}</strong><small style={{ display: "block", opacity: .72 }}>{photoLightboxIndex + 1} of {photoLightboxIds.length} · Scroll to zoom · Drag to pan</small></div><button type="button" onClick={() => setPhotoLightboxIndex(-1)} style={{ ...secondaryButtonStyle, width: 40, padding: 8 }}>{closeSymbol}</button></div>
              <div onClick={(event) => event.stopPropagation()} onTouchStart={(event) => setPhotoLightboxTouchStartX(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => { const endX = event.changedTouches[0]?.clientX; if (photoLightboxTouchStartX == null || endX == null) return; const delta = endX - photoLightboxTouchStartX; if (Math.abs(delta) > 55) { setPhotoLightboxIndex((current) => delta < 0 ? Math.min(photoLightboxIds.length - 1, current + 1) : Math.max(0, current - 1)); setPhotoLightboxZoom(1); setPhotoLightboxPan({ x: 0, y: 0 }); } setPhotoLightboxTouchStartX(null); }} onWheel={(event) => { event.preventDefault(); setPhotoLightboxZoom((current) => Math.max(1, Math.min(5, Number((current + (event.deltaY < 0 ? .2 : -.2)).toFixed(2))))); }} onMouseDown={(event) => { setPhotoLightboxDragging(true); setPhotoLightboxDragOrigin({ x: event.clientX - photoLightboxPan.x, y: event.clientY - photoLightboxPan.y }); }} onMouseMove={(event) => { if (photoLightboxDragging) setPhotoLightboxPan({ x: event.clientX - photoLightboxDragOrigin.x, y: event.clientY - photoLightboxDragOrigin.y }); }} onMouseUp={() => setPhotoLightboxDragging(false)} onMouseLeave={() => setPhotoLightboxDragging(false)} style={{ position: "relative", overflow: "hidden", display: "grid", placeItems: "center", cursor: photoLightboxZoom > 1 ? (photoLightboxDragging ? "grabbing" : "grab") : "default" }}>
                <img src={lightboxItem.source} alt={lightboxItem.name} draggable={false} style={{ maxWidth: "94%", maxHeight: "100%", objectFit: "contain", transform: `translate(${photoLightboxPan.x}px, ${photoLightboxPan.y}px) scale(${photoLightboxZoom})`, transformOrigin: "center", transition: photoLightboxDragging ? "none" : "transform .12s ease", userSelect: "none" }} />
                <button type="button" disabled={photoLightboxIndex <= 0} onClick={() => { setPhotoLightboxIndex((current) => Math.max(0, current - 1)); setPhotoLightboxZoom(1); setPhotoLightboxPan({ x: 0, y: 0 }); }} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", ...secondaryButtonStyle, width: 44, height: 44, fontSize: 24, opacity: photoLightboxIndex <= 0 ? .35 : 1 }}>‹</button>
                <button type="button" disabled={photoLightboxIndex >= photoLightboxIds.length - 1} onClick={() => { setPhotoLightboxIndex((current) => Math.min(photoLightboxIds.length - 1, current + 1)); setPhotoLightboxZoom(1); setPhotoLightboxPan({ x: 0, y: 0 }); }} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", ...secondaryButtonStyle, width: 44, height: 44, fontSize: 24, opacity: photoLightboxIndex >= photoLightboxIds.length - 1 ? .35 : 1 }}>›</button>
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: 10, background: "#0B1220", scrollBehavior: "smooth" }} onClick={(event) => event.stopPropagation()}>{photoLightboxIds.map((id, index) => { const item = allPhotoTimelineItems.find((record) => record.id === id); return item ? <button key={id} type="button" onClick={() => { setPhotoLightboxIndex(index); setPhotoLightboxZoom(1); setPhotoLightboxPan({ x: 0, y: 0 }); }} style={{ flex: "0 0 88px", border: `3px solid ${index === photoLightboxIndex ? "#C99A3D" : "transparent"}`, borderRadius: 10, padding: 0, overflow: "hidden", background: "transparent", cursor: "pointer" }}><img src={item.source} alt={item.name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} /></button> : null; })}</div>
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "insights" ? <AtlasInsightsTimeline
      mode={mode}
      serviceRecords={serviceRecords}
      requestRecords={requestRecords}
      todayEvents={todayEvents}
      upcomingEvents={upcomingEvents}
      weatherDays={weatherDays}
      colors={colors}
      sectionStyle={sectionStyle}
      noticeStyle={noticeStyle}
      mutedSmallStyle={mutedSmallStyle}
      secondaryButtonStyle={secondaryButtonStyle}
      goldButtonStyle={goldButtonStyle}
      badgeStyle={badgeStyle}
      formatDate={formatDate}
      assetName={assetName}
      vendorName={vendorName}
      locationName={locationName}
      setScreen={setScreen}
      setSelectedServiceId={setSelectedServiceId}
      setSelectedRequestId={setSelectedRequestId}
      openCalendarItem={openCalendarItem}
    /> : null}
    </>
  );
}
