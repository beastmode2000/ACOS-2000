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



export default function AtlasDocumentsWorkspace(props: any) {
  const {
    activePropertyId,
    allDocuments,
    assetRecords,
    blueprintPage,
    buttonRowStyle,
    cardStyle,
    deleteSelectedDocument,
    documentCategoryFilter,
    documentLinkFilter,
    documentListScrollYRef,
    documentOverlayScrollRef,
    documentQualityOpen,
    documentQuickAccessOpen,
    documentSearch,
    documentSort,
    documentTargetOptionsFor,
    editorHeaderStyle,
    eyebrowStyle,
    favoriteDocumentIds,
    fieldLabelStyle,
    fileTileStyle,
    formGridStyle,
    goldButtonStyle,
    hideDocumentLogos,
    inputStyle,
    isMobile,
    locations,
    mutedSmallStyle,
    noticeStyle,
    openBlueprintSection,
    openDocumentTarget,
    openFileInBrowser,
    openUploadedFile,
    recentDocumentIds,
    recordInfoItemStyle,
    refreshDocumentVault,
    replaceSelectedDocumentFile,
    saveSelectedDocument,
    secondaryButtonStyle,
    selectedDocumentFileIndex,
    selectedDocumentId,
    serviceRecords,
    setBlueprintPage,
    setDocumentCategoryFilter,
    setDocumentLinkFilter,
    setDocumentQualityOpen,
    setDocumentQuickAccessOpen,
    setDocumentSearch,
    setDocumentSort,
    setFavoriteDocumentIds,
    setHideDocumentLogos,
    setIntakeNotes,
    setIntakeTargetKind,
    setIntakeTitle,
    setIntakeType,
    setOpenBlueprintSection,
    setRecentDocumentIds,
    setScreen,
    setSelectedDocumentFileIndex,
    setSelectedDocumentId,
    smallSubtleButtonStyle,
    targetNameFor,
    tinyDangerButtonStyle,
    updateSelectedDocument,
    vendorRecords
  } = props;
  const normalizedDocumentSearch = documentSearch.trim().toLowerCase();
  const documentCategories = Array.from(
    new Set<string>(
      allDocuments.map((doc: any) => String(doc.type?.trim() || "Uncategorized")),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const documentLinkTypes = Array.from(
    new Set<string>(
      allDocuments.map((doc: any) => String(doc.targetType?.trim() || "General")),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const searchableDocuments = allDocuments
    .filter((doc) => {
      const category = doc.type?.trim() || "Uncategorized";
      const linkType = doc.targetType?.trim() || "General";

      if (
        documentCategoryFilter !== "All" &&
        category !== documentCategoryFilter
      ) {
        return false;
      }
      if (documentLinkFilter !== "All" && linkType !== documentLinkFilter) {
        return false;
      }

      const fileNames = (doc.files || []).map((file) => file.name).join(" ");
      const logoHaystack = [
        doc.title,
        doc.type,
        doc.area,
        doc.targetName,
        doc.notes,
        fileNames,
      ]
        .join(" ")
        .toLowerCase();
      const isLogoDocument = /(^|\s|[-_/])logos?(\s|$|[-_/])/i.test(logoHaystack);
      if (hideDocumentLogos && isLogoDocument) return false;

      if (!normalizedDocumentSearch) return true;

      return [
        doc.title,
        doc.type,
        doc.area,
        doc.targetType,
        doc.targetName,
        doc.notes,
        doc.pastedText,
        fileNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedDocumentSearch);
    })
    .sort((a, b) => {
      if (documentSort === "title") {
        return a.title.localeCompare(b.title);
      }
      if (documentSort === "category") {
        return (
          (a.type?.trim() || "Uncategorized").localeCompare(
            b.type?.trim() || "Uncategorized",
          ) || a.title.localeCompare(b.title)
        );
      }
      return (
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")) ||
        a.title.localeCompare(b.title)
      );
    });

  const activeDocumentFilterCount =
    Number(documentCategoryFilter !== "All") +
    Number(documentLinkFilter !== "All") +
    Number(hideDocumentLogos) +
    Number(Boolean(normalizedDocumentSearch));

  const favoriteDocuments = favoriteDocumentIds
    .map((id) => allDocuments.find((document) => document.id === id))
    .filter((document): document is DocumentRecord => Boolean(document));
  const recentDocuments = recentDocumentIds
    .filter((id) => !favoriteDocumentIds.includes(id))
    .map((id) => allDocuments.find((document) => document.id === id))
    .filter((document): document is DocumentRecord => Boolean(document));

  const incompleteDocuments = allDocuments.filter((document) => {
    const hasContent = Boolean(
      document.href ||
        document.pastedText?.trim() ||
        (document.files || []).length,
    );
    const hasRelationship = Boolean(
      document.targetId ||
        document.targetName?.trim() ||
        document.area?.trim(),
    );
    return !document.title?.trim() || !hasContent || !hasRelationship;
  });

  const duplicateDocumentGroups = Array.from(
    allDocuments.reduce((groups, document) => {
      const key = document.title.trim().toLowerCase();
      if (!key) return groups;
      const current = groups.get(key) || [];
      current.push(document);
      groups.set(key, current);
      return groups;
    }, new Map<string, DocumentRecord[]>()),
  ).filter(([, documents]) => documents.length > 1);

  const documentFileCount = allDocuments.reduce(
    (total, document) => total + (document.files?.length || 0),
    0,
  );
  const linkedDocumentCount = allDocuments.filter(
    (document) =>
      Boolean(document.targetId) ||
      Boolean(document.targetName) ||
      (document.targetType && document.targetType !== "General"),
  ).length;
  const pdfDocumentCount = allDocuments.filter((document) =>
    (document.files || []).some((file) => {
      const type = String(file.type || "").toLowerCase();
      const name = String(file.name || "").toLowerCase();
      const source = String(file.url || file.dataUrl || "").toLowerCase();
      return type.includes("pdf") || name.endsWith(".pdf") || source.includes("application/pdf");
    }) || String(document.href || "").toLowerCase().includes(".pdf"),
  ).length;
  const documentCategoryCount = documentCategories.length;

  const selectedDocument =
    allDocuments.find((doc) => doc.id === selectedDocumentId) || null;
  const selectedTargetKind = (selectedDocument?.targetType ||
    "General") as IntakeTargetKind;
  const selectedTargetOptions = documentTargetOptionsFor(selectedTargetKind);
  const selectedDocumentFiles = selectedDocument?.files || [];
  const safeSelectedDocumentFileIndex = Math.min(
    Math.max(0, selectedDocumentFileIndex),
    Math.max(0, selectedDocumentFiles.length - 1),
  );
  const primaryFile =
    selectedDocumentFiles[safeSelectedDocumentFileIndex] || null;
  const primarySource = primaryFile?.dataUrl || primaryFile?.url || "";
  const primaryType = String(primaryFile?.type || "").toLowerCase();
  const primaryName = String(primaryFile?.name || "").toLowerCase();
  const primaryIsImage =
    primaryType.startsWith("image/") ||
    primarySource.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)$/.test(primaryName);
  const primaryIsPdf =
    primaryType.includes("pdf") ||
    primarySource.startsWith("data:application/pdf") ||
    primaryName.endsWith(".pdf") ||
    (!primaryFile &&
      selectedDocument?.href?.toLowerCase().includes(".pdf"));
  const rawDocumentHref = primarySource || selectedDocument?.href || "";
  const documentHref =
    rawDocumentHref && primaryIsPdf
      ? `${rawDocumentHref.split("#")[0]}#page=${Math.max(1, blueprintPage)}`
      : rawDocumentHref;
  const hasMultipleDocumentFiles = selectedDocumentFiles.length > 1;

  function openDocumentFileByOffset(offset: number) {
    if (!hasMultipleDocumentFiles) return;
    setSelectedDocumentFileIndex((current) => {
      return (
        (current + offset + selectedDocumentFiles.length) %
        selectedDocumentFiles.length
      );
    });
    setBlueprintPage(1);
  }

  const blueprintCandidate = allDocuments.find((document) => {
    const haystack = [
      document.title,
      document.type,
      document.area,
      document.notes,
      ...(document.files || []).map((file) => file.name),
    ]
      .join(" ")
      .toLowerCase();

    return (
      haystack.includes("as-built") ||
      haystack.includes("as built") ||
      haystack.includes("as-build") ||
      haystack.includes("as build") ||
      haystack.includes("as-builts") ||
      haystack.includes("as builts") ||
      haystack.includes("asbuild") ||
      haystack.includes("asbuilds") ||
      haystack.includes("2000 as buids") ||
      haystack.includes("2000 record set") ||
      (haystack.includes("2000") && haystack.includes("construction set")) ||
      (haystack.includes("2000 faben") && haystack.includes("construction"))
    );
  });

  // A matching title alone is not enough. The Blueprint Center is connected
  // only when the saved Documents record contains an actual file or URL.
  const blueprintDocument = blueprintCandidate && (
    Boolean(blueprintCandidate.href) ||
    (blueprintCandidate.files || []).some((file) =>
      Boolean(file.dataUrl || file.url),
    )
  )
    ? blueprintCandidate
    : null;

  const blueprintRecordNeedsFile = Boolean(blueprintCandidate && !blueprintDocument);

  function showBlueprintInDocuments() {
    if (!blueprintCandidate) return;
    setDocumentSearch("");
    setDocumentCategoryFilter("All");
    setDocumentLinkFilter("All");
    setSelectedDocumentId(blueprintCandidate.id);
    window.requestAnimationFrame(() => {
      documentOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  const blueprintSections = [
    {
      id: "project",
      label: "Project Information",
      icon: "▦",
      detail: "Cover sheet, project data, code information and drawing index.",
      sheets: [
        { label: "Title Sheet / Drawing Index", sheet: "T1.0", page: 1 },
        { label: "Project Information", sheet: "T1.1", page: 2 },
      ],
    },
    {
      id: "survey",
      label: "Survey",
      icon: "⌖",
      detail: "Topographic, boundary and legal site-reference drawings.",
      sheets: [
        { label: "Topographic & Boundary Survey", sheet: "Survey", page: 3 },
      ],
    },
    {
      id: "civil",
      label: "Civil & Site Utilities",
      icon: "≈",
      detail: "Site planning, grading, drainage, utilities and civil details.",
      sheets: [
        { label: "Civil / Site Plan", sheet: "C1", page: 4 },
        { label: "Grading & Drainage", sheet: "C2", page: 5 },
        { label: "Utility & Civil Details", sheet: "C3", page: 6 },
      ],
    },
    {
      id: "landscape",
      label: "Landscape",
      icon: "⌁",
      detail: "Landscape plans, planting schedules, lighting and site details.",
      sheets: [
        { label: "Landscape Site Plan", sheet: "L1", page: 12 },
        { label: "Grading / Layout", sheet: "L2", page: 13 },
        { label: "Planting Plan & Schedule", sheet: "L3", page: 14 },
        { label: "Landscape Lighting", sheet: "L4", page: 15 },
      ],
    },
    {
      id: "irrigation",
      label: "Irrigation",
      icon: "◉",
      detail: "Irrigation zones, system layout and related landscape utilities.",
      sheets: [
        { label: "Irrigation Zone Plan", sheet: "I1", page: 16 },
        { label: "Irrigation Details", sheet: "I2", page: 17 },
      ],
    },
    {
      id: "architecture",
      label: "Architecture",
      icon: "⌂",
      detail: "Floor plans, roof plans, elevations, sections and architectural details.",
      sheets: [
        { label: "Basement Floor Plan", sheet: "A1.0", page: 18 },
        { label: "Main Floor Plan", sheet: "A1.1", page: 19 },
        { label: "Upper Floor Plan", sheet: "A1.2", page: 20 },
        { label: "Garage Plans", sheet: "A1.3", page: 21 },
        { label: "Garage Roof Plan", sheet: "A1.3b", page: 25 },
        { label: "Roof Plan", sheet: "A1.4", page: 25 },
        { label: "Lighting / Reflected Ceiling", sheet: "A2 / E", page: 27 },
        { label: "Exterior Elevations", sheet: "A3", page: 33 },
        { label: "Building Sections", sheet: "A4", page: 36 },
        { label: "Architectural Details", sheet: "A5", page: 43 },
        { label: "Interior Elevations", sheet: "A6", page: 52 },
      ],
    },
    {
      id: "structural",
      label: "Structural",
      icon: "▤",
      detail: "Structural notes, foundation, framing, shear-wall and connection details.",
      sheets: [
        { label: "General Structural Notes", sheet: "S1.0", page: 61 },
        { label: "Structural Notes / Schedules", sheet: "S1.1", page: 62 },
        { label: "Foundation Plan", sheet: "S2.0", page: 64 },
        { label: "Floor Framing Plans", sheet: "S2", page: 65 },
        { label: "Roof Framing Plans", sheet: "S3", page: 67 },
        { label: "Shear-Wall Plans", sheet: "S4", page: 68 },
        { label: "Structural Details", sheet: "S5", page: 78 },
      ],
    },
    {
      id: "mechanical",
      label: "Mechanical / HVAC",
      icon: "◌",
      detail: "Mechanical systems, HVAC layouts and equipment coordination drawings.",
      sheets: [
        { label: "Mechanical Plans", sheet: "M", page: 69 },
        { label: "Mechanical Details", sheet: "M Details", page: 78 },
      ],
    },
    {
      id: "electrical",
      label: "Electrical & Lighting",
      icon: "ϟ",
      detail: "Power, lighting, controls and electrical coordination drawings.",
      sheets: [
        { label: "Lighting Plan", sheet: "E / Lighting", page: 27 },
        { label: "Electrical Plans", sheet: "E", page: 28 },
        { label: "Electrical Details", sheet: "E Details", page: 30 },
      ],
    },
    {
      id: "plumbing",
      label: "Plumbing",
      icon: "◒",
      detail: "Plumbing layouts, fixture coordination and related utility information.",
      sheets: [
        { label: "Plumbing Coordination", sheet: "P", page: 23 },
        { label: "Plumbing / Utility Details", sheet: "P Details", page: 79 },
      ],
    },
  ];

  function openBlueprintPage(page: number) {
    const safePage = Math.max(1, Math.floor(Number(page) || 1));

    if (!blueprintDocument) {
      if (blueprintCandidate) {
        showBlueprintInDocuments();
        return;
      }
      setIntakeTitle("2000 As-Built Plans");
      setIntakeType("Property Plans");
      setIntakeTargetKind("General");
      setIntakeNotes(
        "Master 90-page construction record set for property 2000. Category: Property Records / As-Built Drawings.",
      );
      setScreen("intake");
      return;
    }

    const blueprintFile = (blueprintDocument.files || []).find((file) =>
      Boolean(file.url || file.dataUrl),
    );
    const blueprintSource =
      blueprintFile?.url || blueprintFile?.dataUrl || blueprintDocument.href || "";

    documentListScrollYRef.current = window.scrollY;
    setBlueprintPage(safePage);
    setSelectedDocumentId(blueprintDocument.id);

    if (blueprintSource) {
      const pageUrl = `${blueprintSource.split("#")[0]}#page=${safePage}`;
      const openedWindow = window.open(pageUrl, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        window.location.assign(pageUrl);
      }
      return;
    }

    window.requestAnimationFrame(() => {
      documentOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function retargetSelectedDocument(kind: IntakeTargetKind) {
    if (!selectedDocument) return;
    const options = documentTargetOptionsFor(kind);
    const nextId = kind === "General" ? "" : options[0]?.id || "";
    const nextName = targetNameFor(kind, nextId);
    updateSelectedDocument(selectedDocument.id, {
      targetType: kind,
      targetId: nextId,
      targetName: nextName,
      area: nextName,
      linkedAssetId: kind === "Asset" ? nextId : undefined,
      linkedVendorId: kind === "Vendor" ? nextId : undefined,
    });
  }

  function retargetSelectedRecord(id: string) {
    if (!selectedDocument) return;
    const nextName = targetNameFor(selectedTargetKind, id);
    updateSelectedDocument(selectedDocument.id, {
      targetId: id,
      targetName: nextName,
      area: nextName,
      linkedAssetId: selectedTargetKind === "Asset" ? id : undefined,
      linkedVendorId: selectedTargetKind === "Vendor" ? id : undefined,
    });
  }

  const selectedDocumentIndex = selectedDocument
    ? searchableDocuments.findIndex(
        (document) => document.id === selectedDocument.id,
      )
    : -1;

  function closeDocumentViewer() {
    setSelectedDocumentId("");
    if (isMobile) {
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: documentListScrollYRef.current,
          left: 0,
          behavior: "auto",
        });
      });
    }
  }

  function openDocumentByOffset(offset: number) {
    if (!searchableDocuments.length || selectedDocumentIndex < 0) return;
    const nextIndex = selectedDocumentIndex + offset;
    if (nextIndex < 0 || nextIndex >= searchableDocuments.length) return;
    setSelectedDocumentId(searchableDocuments[nextIndex].id);
    window.requestAnimationFrame(() => {
      documentOverlayScrollRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    });
  }

  const documentViewer = selectedDocument ? (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: 18,
          overflow: "hidden",
          background: "#F8FAFC",
          minHeight: isMobile ? 300 : 470,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {documentHref && primaryIsImage ? (
          <img
            src={documentHref}
            alt={selectedDocument.title}
            style={{
              width: "100%",
              height: isMobile ? "auto" : 520,
              maxHeight: isMobile ? "70vh" : 520,
              objectFit: "contain",
              display: "block",
              background: "#FFFFFF",
            }}
          />
        ) : documentHref && primaryIsPdf ? (
          <div
            style={{
              width: "100%",
              minHeight: isMobile ? 300 : 470,
              padding: 28,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              background: "#FFFFFF",
            }}
          >
            <div style={{ maxWidth: 560 }}>
              <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>
                PDF
              </div>
              <strong style={{ fontSize: 18 }}>
                Open this PDF in a separate browser tab.
              </strong>
              <p style={{ ...mutedSmallStyle, margin: "10px 0 18px" }}>
                Atlas avoids loading large plan sets inside the Documents page so the page stays responsive.
              </p>
              <button
                type="button"
                onClick={() => openFileInBrowser(primaryFile, rawDocumentHref)}
                style={{ ...goldButtonStyle, display: "inline-flex" }}
              >
                Open PDF
              </button>
            </div>
          </div>
        ) : documentHref ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ ...fileTileStyle, margin: "0 auto 12px" }}>
              FILE
            </div>
            <button
              type="button"
              onClick={() =>
                primaryFile
                  ? openUploadedFile(primaryFile)
                  : openFileInBrowser(null, rawDocumentHref)
              }
              style={goldButtonStyle}
            >
              Open File
            </button>
          </div>
        ) : selectedDocument.pastedText ? (
          <div
            style={{
              width: "100%",
              alignSelf: "stretch",
              padding: 22,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              overflow: "auto",
              background: "#FFFFFF",
            }}
          >
            {selectedDocument.pastedText}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: "center" }}>
            <strong>No preview available.</strong>
            <p style={mutedSmallStyle}>
              This record currently contains details only.
            </p>
          </div>
        )}

        {hasMultipleDocumentFiles ? (
          <>
            <button
              type="button"
              aria-label="Previous attached file"
              onClick={() => openDocumentFileByOffset(-1)}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 42,
                height: 42,
                borderRadius: 999,
                border: `1px solid ${colors.line}`,
                background: "rgba(255,255,255,0.94)",
                color: colors.navy,
                fontSize: 24,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 5px 18px rgba(15,42,67,0.18)",
                zIndex: 3,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next attached file"
              onClick={() => openDocumentFileByOffset(1)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 42,
                height: 42,
                borderRadius: 999,
                border: `1px solid ${colors.line}`,
                background: "rgba(255,255,255,0.94)",
                color: colors.navy,
                fontSize: 24,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 5px 18px rgba(15,42,67,0.18)",
                zIndex: 3,
              }}
            >
              ›
            </button>
            <span
              style={{
                position: "absolute",
                left: "50%",
                bottom: 10,
                transform: "translateX(-50%)",
                borderRadius: 999,
                background: "rgba(7,23,47,0.78)",
                color: "#FFFFFF",
                padding: "5px 9px",
                fontSize: 10,
                fontWeight: 850,
                zIndex: 3,
              }}
            >
              {safeSelectedDocumentFileIndex + 1} /{" "}
              {selectedDocumentFiles.length}
            </span>
          </>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ ...editorHeaderStyle, marginBottom: 4 }}>
            {selectedDocument.title.trim() || "Document"}
          </h3>
          <p style={mutedSmallStyle}>
            {selectedDocument.createdAt
              ? `Saved ${new Date(selectedDocument.createdAt).toLocaleString()}`
              : "Saved document"}
          </p>
          {hasMultipleDocumentFiles && primaryFile ? (
            <p style={{ ...mutedSmallStyle, marginTop: 4 }}>
              File {safeSelectedDocumentFileIndex + 1} of{" "}
              {selectedDocumentFiles.length}: {primaryFile.name || "Attachment"}
            </p>
          ) : null}
        </div>
        <div style={buttonRowStyle}>
          {primaryFile ? (
            <button
              type="button"
              onClick={() => openUploadedFile(primaryFile)}
              style={secondaryButtonStyle}
            >
              Full Screen
            </button>
          ) : null}
          <label style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            Replace File
            <input type="file" style={{ display: "none" }} onChange={(event) => { void replaceSelectedDocumentFile(selectedDocument, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <button
            type="button"
            onClick={() => void deleteSelectedDocument(selectedDocument)}
            style={tinyDangerButtonStyle}
            title="Delete document"
          >
            Delete
          </button>
        </div>
      </div>

      {selectedDocument.files && selectedDocument.files.length > 1 ? (
        <div>
          <div style={eyebrowStyle}>Attached Files</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            {selectedDocument.files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => openUploadedFile(file)}
                style={{
                  ...secondaryButtonStyle,
                  minHeight: 44,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={cardStyle}>
        <div style={eyebrowStyle}>Document Information</div>
        <DocumentIntelligencePanel
          document={selectedDocument}
          assets={assetRecords}
          vendors={vendorRecords}
          locations={locations}
          workOrders={serviceRecords}
          colors={colors}
          onApply={async (patch) => {
            const updated = normalizeDocument({ ...selectedDocument, ...patch });
            await saveSelectedDocument(updated);
          }}
        />
        <div style={formGridStyle}>
          <Field
            label="Title"
            value={selectedDocument.title}
            onChange={(value) =>
              updateSelectedDocument(selectedDocument.id, {
                title: value,
              })
            }
          />
          <Field
            label="Category"
            value={selectedDocument.type}
            onChange={(value) =>
              updateSelectedDocument(selectedDocument.id, {
                type: value,
              })
            }
          />
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={fieldLabelStyle}>Linked section</span>
            <select
              value={selectedTargetKind}
              onChange={(event) =>
                retargetSelectedDocument(
                  event.currentTarget.value as IntakeTargetKind,
                )
              }
              style={inputStyle}
            >
              {(
                [
                  "Asset",
                  "Location",
                  "Vendor",
                  "Work Order",
                  "Map Label",
                  "General",
                ] as IntakeTargetKind[]
              ).map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          {selectedTargetKind !== "General" ? (
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={fieldLabelStyle}>Linked record</span>
              <select
                value={selectedDocument.targetId || ""}
                onChange={(event) =>
                  retargetSelectedRecord(event.currentTarget.value)
                }
                style={inputStyle}
              >
                {selectedTargetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field
            label="Notes"
            value={selectedDocument.notes || ""}
            onChange={(value) =>
              updateSelectedDocument(selectedDocument.id, {
                notes: value,
              })
            }
            multiline
          />
          <Field
            label="Pasted text"
            value={selectedDocument.pastedText || ""}
            onChange={(value) =>
              updateSelectedDocument(selectedDocument.id, {
                pastedText: value,
              })
            }
            multiline
          />
        </div>

        <div style={{ ...buttonRowStyle, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => void saveSelectedDocument(selectedDocument)}
            style={goldButtonStyle}
          >
            Save Changes
          </button>
          {selectedDocument.targetType &&
          selectedDocument.targetType !== "General" ? (
            <button
              type="button"
              onClick={() => openDocumentTarget(selectedDocument)}
              style={secondaryButtonStyle}
            >
              Open Linked Record
            </button>
          ) : null}
          <button
            type="button"
            onClick={closeDocumentViewer}
            style={secondaryButtonStyle}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div style={noticeStyle}>
      <strong>Select a document or photo.</strong>
      <p style={mutedSmallStyle}>
        The full preview and all information will appear here.
      </p>
    </div>
  );

  return (
    <>
      <ListDrawerLayout
        eyebrow="Document Vault"
        title="Documents"
        detail="Find documents by title, category, or linked property record. Select a preview card to view and edit it."
        isMobile={isMobile}
        drawerResetKey={selectedDocumentId || "document-new"}
        gridStyleOverride={
          !isMobile
            ? selectedDocument
              ? {
                  gridTemplateColumns: "minmax(340px, 40%) minmax(0, 60%)",
                  alignItems: "start",
                  gap: 14,
                }
              : { gridTemplateColumns: "minmax(0, 1fr)" }
            : undefined
        }
        listPanelStyleOverride={
          !isMobile
            ? selectedDocument
              ? {
                  width: "100%",
                  maxWidth: "none",
                  minWidth: 0,
                  overflowX: "hidden",
                }
              : { width: "100%", maxWidth: "none" }
            : undefined
        }
        drawerStyleOverride={
          !isMobile
            ? selectedDocument
              ? {
                  position: "sticky",
                  top: 10,
                  alignSelf: "start",
                  width: "100%",
                  minWidth: 0,
                  maxHeight: "calc(100vh - 24px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  overscrollBehavior: "contain",
                  zIndex: 3,
                }
              : { display: "none" }
            : undefined
        }
        right={
          <>
            <button
              type="button"
              onClick={() => setScreen("manuals")}
              style={secondaryButtonStyle}
            >
              Browse Manuals
            </button>
            <button
              type="button"
              onClick={() => setScreen("intake")}
              style={goldButtonStyle}
            >
              Add Document
            </button>
          </>
        }
        list={
          <div style={{ display: "grid", gap: 12 }}>
            {(favoriteDocuments.length > 0 || recentDocuments.length > 0) ? (
              <section
                style={{
                  ...cardStyle,
                  display: "grid",
                  gap: 9,
                  padding: 11,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDocumentQuickAccessOpen((current) => !current)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    color: colors.navy,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>
                    <strong style={{ display: "block" }}>Quick Access</strong>
                    <span style={mutedSmallStyle}>
                      Favorite and recently viewed documents
                    </span>
                  </span>
                  <span aria-hidden="true">
                    {documentQuickAccessOpen ? "−" : "+"}
                  </span>
                </button>

                {documentQuickAccessOpen ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {favoriteDocuments.length ? (
                      <div>
                        <span style={fieldLabelStyle}>Favorites</span>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          {favoriteDocuments.slice(0, 6).map((document) => (
                            <button
                              key={document.id}
                              type="button"
                              onClick={() => {
                                setBlueprintPage(1);
                                setSelectedDocumentFileIndex(0);
                                setSelectedDocumentId(document.id);
                                setRecentDocumentIds((current) =>
                                  [
                                    document.id,
                                    ...current.filter(
                                      (id) => id !== document.id,
                                    ),
                                  ].slice(0, 8),
                                );
                              }}
                              style={smallSubtleButtonStyle}
                            >
                              {document.title || "Untitled document"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {recentDocuments.length ? (
                      <div>
                        <span style={fieldLabelStyle}>Recently Viewed</span>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          {recentDocuments.slice(0, 6).map((document) => (
                            <button
                              key={document.id}
                              type="button"
                              onClick={() => {
                                setBlueprintPage(1);
                                setSelectedDocumentFileIndex(0);
                                setSelectedDocumentId(document.id);
                                setRecentDocumentIds((current) =>
                                  [
                                    document.id,
                                    ...current.filter(
                                      (id) => id !== document.id,
                                    ),
                                  ].slice(0, 8),
                                );
                              }}
                              style={smallSubtleButtonStyle}
                            >
                              {document.title || "Untitled document"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {(incompleteDocuments.length > 0 ||
              duplicateDocumentGroups.length > 0) ? (
              <section
                style={{
                  ...cardStyle,
                  display: "grid",
                  gap: 9,
                  padding: 11,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDocumentQualityOpen((current) => !current)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    color: colors.navy,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>
                    <strong style={{ display: "block" }}>
                      Document Record Quality
                    </strong>
                    <span style={mutedSmallStyle}>
                      {incompleteDocuments.length} incomplete ·{" "}
                      {duplicateDocumentGroups.length} possible duplicate
                      {duplicateDocumentGroups.length === 1 ? "" : " groups"}
                    </span>
                  </span>
                  <span aria-hidden="true">
                    {documentQualityOpen ? "−" : "+"}
                  </span>
                </button>

                {documentQualityOpen ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Incomplete Records</span>
                      <strong>{incompleteDocuments.length}</strong>
                      <span style={mutedSmallStyle}>
                        Missing a title, file/content, or linked location
                      </span>
                    </div>
                    <div style={recordInfoItemStyle}>
                      <span style={fieldLabelStyle}>Possible Duplicates</span>
                      <strong>{duplicateDocumentGroups.length}</strong>
                      <span style={mutedSmallStyle}>
                        Matching document titles that should be reviewed
                      </span>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {[
                {
                  label: "Documents",
                  value: allDocuments.length,
                  detail: `${searchableDocuments.length} currently visible`,
                  icon: "▤",
                },
                {
                  label: "Saved files",
                  value: documentFileCount,
                  detail: `${pdfDocumentCount} PDF ${pdfDocumentCount === 1 ? "record" : "records"}`,
                  icon: "□",
                },
                {
                  label: "Linked records",
                  value: linkedDocumentCount,
                  detail: "Connected to Atlas records",
                  icon: "↗",
                },
                {
                  label: "Categories",
                  value: documentCategoryCount,
                  detail: "Organized document groups",
                  icon: "⌗",
                },
              ].map((item) => (
                <div
                  key={((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}
                  style={{
                    minWidth: 0,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 16,
                    padding: isMobile ? 11 : 13,
                    background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFC 100%)",
                    boxShadow: "0 8px 20px rgba(11, 41, 64, 0.06)",
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
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        background: "#EDF3FF",
                        color: "#175CD3",
                        fontSize: 14,
                        fontWeight: 950,
                      }}
                    >
                      {item.icon}
                    </span>
                    <strong
                      style={{
                        color: colors.navy,
                        fontSize: isMobile ? 20 : 24,
                        lineHeight: 1,
                      }}
                    >
                      {item.value}
                    </strong>
                  </div>
                  <div
                    style={{
                      marginTop: 9,
                      color: colors.navy,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {((item as { id?: string }).id === "planner" ? "Tasks" : (item as { id?: string }).id === "timeline" ? "Projects" : item.label)}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      color: colors.muted,
                      fontSize: 9,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              ))}
            </section>

            {activePropertyId === "2000" ? (
              <section
                style={{
                  position: "relative",
                  overflow: "hidden",
                  border: `1px solid ${blueprintDocument ? colors.gold : colors.line}`,
                  borderRadius: 18,
                  padding: isMobile ? 12 : 14,
                  background:
                    "linear-gradient(135deg, #0B2940 0%, #123E5D 60%, #185173 100%)",
                  color: "#FFFFFF",
                  boxShadow: "0 14px 28px rgba(7, 36, 58, 0.16)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 180,
                    height: 180,
                    right: -70,
                    top: -95,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow:
                      "0 0 0 28px rgba(255,255,255,0.022), 0 0 0 58px rgba(255,255,255,0.014)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        marginBottom: 4,
                        color: "#E4BE67",
                        fontSize: 9,
                        fontWeight: 950,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      Property Blueprint Center
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 20, lineHeight: 1.1 }}>
                        2000 Estate Record Set
                      </h3>
                      <span style={{ color: "rgba(255,255,255,0.64)", fontSize: 10, fontWeight: 800 }}>
                        {blueprintSections.reduce((total, section) => total + section.sheets.length, 0)} indexed sheets
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "rgba(255,255,255,0.72)",
                        fontSize: 11,
                        lineHeight: 1.35,
                      }}
                    >
                      Open the master construction set or expand one discipline below.
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: 999,
                        padding: "5px 9px",
                        background: blueprintDocument
                          ? "rgba(8,116,67,0.28)"
                          : "rgba(181,71,8,0.24)",
                        color: "#FFFFFF",
                        fontSize: 9,
                        fontWeight: 900,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: blueprintDocument ? "#57D39B" : "#F5B56A",
                        }}
                      />
                      {blueprintDocument
                        ? "Master set connected"
                        : blueprintRecordNeedsFile
                          ? "Record found — PDF missing"
                          : "Master set needs upload"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openBlueprintPage(1)}
                      style={{ ...goldButtonStyle, minHeight: 34, padding: "7px 11px" }}
                    >
                      {blueprintDocument
                        ? "Open Master Set"
                        : blueprintRecordNeedsFile
                          ? "Finish Upload"
                          : "Add Master Set"}
                    </button>
                    {blueprintCandidate ? (
                      <button
                        type="button"
                        onClick={showBlueprintInDocuments}
                        style={{
                          minHeight: 34,
                          padding: "7px 10px",
                          border: "1px solid rgba(255,255,255,0.20)",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.08)",
                          color: "#FFFFFF",
                          fontSize: 9,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Show Record
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 7,
                    marginTop: 11,
                  }}
                >
                  {blueprintSections.map((section) => {
                    const isOpen = openBlueprintSection === section.id;
                    return (
                      <div
                        key={section.id}
                        style={{
                          minWidth: 0,
                          border: "1px solid rgba(255,255,255,0.13)",
                          borderRadius: 11,
                          background: isOpen
                            ? "rgba(255,255,255,0.11)"
                            : "rgba(255,255,255,0.065)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenBlueprintSection((current) =>
                              current === section.id ? null : section.id,
                            )
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns: "26px minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            minHeight: 42,
                            padding: "7px 9px",
                            border: 0,
                            background: "transparent",
                            color: "#FFFFFF",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              display: "grid",
                              placeItems: "center",
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              background: "rgba(228,190,103,0.16)",
                              color: "#F0CD7E",
                              fontSize: 13,
                              fontWeight: 900,
                            }}
                          >
                            {section.icon}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <strong style={{ display: "block", fontSize: 11, lineHeight: 1.2 }}>
                              {section.label}
                            </strong>
                            <small style={{ display: "block", marginTop: 2, opacity: 0.66, fontSize: 9 }}>
                              {section.sheets.length} {section.sheets.length === 1 ? "sheet" : "sheets"}
                            </small>
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              color: "#F0CD7E",
                              fontSize: 14,
                              fontWeight: 900,
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 160ms ease",
                            }}
                          >
                            ▾
                          </span>
                        </button>

                        {isOpen ? (
                          <div
                            style={{
                              display: "grid",
                              gap: 5,
                              padding: "0 8px 8px",
                              borderTop: "1px solid rgba(255,255,255,0.09)",
                            }}
                          >
                            {section.sheets.map((sheet) => (
                              <button
                                key={`${section.id}-${sheet.sheet}-${sheet.page}`}
                                type="button"
                                onClick={() => openBlueprintPage(sheet.page)}
                                title={`${sheet.label} · PDF page ${sheet.page}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "minmax(0, 1fr) auto",
                                  gap: 8,
                                  alignItems: "center",
                                  width: "100%",
                                  minWidth: 0,
                                  marginTop: 5,
                                  padding: "6px 7px",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: 8,
                                  background: "rgba(255,255,255,0.055)",
                                  color: "#FFFFFF",
                                  textAlign: "left",
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ minWidth: 0 }}>
                                  <strong
                                    style={{
                                      display: "block",
                                      overflow: "hidden",
                                      fontSize: 10,
                                      lineHeight: 1.2,
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {sheet.label}
                                  </strong>
                                  <small style={{ display: "block", marginTop: 2, opacity: 0.6, fontSize: 8 }}>
                                    {sheet.sheet}
                                  </small>
                                </span>
                                <span
                                  style={{
                                    borderRadius: 999,
                                    background: "rgba(228,190,103,0.16)",
                                    color: "#F0CD7E",
                                    padding: "3px 6px",
                                    fontSize: 8,
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  p. {sheet.page}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <div
              style={{
                ...cardStyle,
                padding: 14,
                display: "grid",
                gap: 12,
                background:
                  "linear-gradient(180deg, #FFFFFF 0%, #F7FAFC 100%)",
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={fieldLabelStyle}>Find a document</span>
                <div style={{ position: "relative" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 13,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: colors.muted,
                      fontSize: 16,
                      pointerEvents: "none",
                    }}
                  >
                    ⌕
                  </span>
                  <input
                    value={documentSearch}
                    onChange={(event) =>
                      setDocumentSearch(event.currentTarget.value)
                    }
                    placeholder="Search title, category, property area, vendor, or file name"
                    style={{
                      ...inputStyle,
                      paddingLeft: 38,
                      minHeight: 44,
                    }}
                    aria-label="Search documents and photos"
                  />
                </div>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={fieldLabelStyle}>Category</span>
                  <select
                    value={documentCategoryFilter}
                    onChange={(event) =>
                      setDocumentCategoryFilter(event.currentTarget.value)
                    }
                    style={inputStyle}
                    aria-label="Filter documents by category"
                  >
                    <option value="All">All categories</option>
                    {documentCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={fieldLabelStyle}>Linked to</span>
                  <select
                    value={documentLinkFilter}
                    onChange={(event) =>
                      setDocumentLinkFilter(event.currentTarget.value)
                    }
                    style={inputStyle}
                    aria-label="Filter documents by linked section"
                  >
                    <option value="All">Everything</option>
                    {documentLinkTypes.map((linkType) => (
                      <option key={linkType} value={linkType}>
                        {linkType}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "fit-content",
                  minHeight: 38,
                  padding: "8px 11px",
                  border: `1px solid ${hideDocumentLogos ? colors.gold : colors.line}`,
                  borderRadius: 10,
                  background: hideDocumentLogos ? "#FFF8E8" : "#FFFFFF",
                  color: colors.text,
                  fontSize: 12,
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={hideDocumentLogos}
                  onChange={(event) =>
                    setHideDocumentLogos(event.currentTarget.checked)
                  }
                  style={{ width: 16, height: 16, accentColor: colors.gold }}
                />
                Hide all logos
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: colors.muted,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Sort
                  <select
                    value={documentSort}
                    onChange={(event) =>
                      setDocumentSort(
                        event.currentTarget.value as
                          | "newest"
                          | "title"
                          | "category",
                      )
                    }
                    style={{
                      ...inputStyle,
                      width: "auto",
                      minWidth: 132,
                      minHeight: 36,
                      padding: "7px 30px 7px 10px",
                    }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="title">A–Z</option>
                    <option value="category">By category</option>
                  </select>
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={mutedSmallStyle}>
                    {searchableDocuments.length} of {allDocuments.length}
                  </span>
                  {activeDocumentFilterCount ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentSearch("");
                        setDocumentCategoryFilter("All");
                        setDocumentLinkFilter("All");
                        setHideDocumentLogos(false);
                      }}
                      style={smallSubtleButtonStyle}
                    >
                      Clear filters
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void refreshDocumentVault()}
                    style={smallSubtleButtonStyle}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {!searchableDocuments.length ? (
              <div
                style={{
                  ...noticeStyle,
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <strong>No documents match these filters.</strong>
                <p style={{ ...mutedSmallStyle, marginTop: 6 }}>
                  Clear the filters or use a broader search.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentSearch("");
                    setDocumentCategoryFilter("All");
                    setDocumentLinkFilter("All");
                    setHideDocumentLogos(false);
                  }}
                  style={{ ...secondaryButtonStyle, marginTop: 10 }}
                >
                  Show all documents
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  alignContent: "start",
                }}
              >
                {searchableDocuments.map((document) => {
                  const previewFile = document.files?.[0] || null;
                  const previewType = String(previewFile?.type || "").toLowerCase();
                  const previewName = String(previewFile?.name || "").toLowerCase();
                  const category = document.type?.trim() || "Uncategorized";
                  const linkedLabel =
                    document.targetName?.trim() ||
                    document.area?.trim() ||
                    document.targetType?.trim() ||
                    "General";
                  const isSelected = selectedDocument?.id === document.id;
                  const fileKind =
                    previewType.includes("pdf") || previewName.endsWith(".pdf")
                      ? "PDF"
                      : previewType.startsWith("image/") ||
                          /\.(png|jpe?g|gif|webp|avif|svg)$/.test(previewName)
                        ? "Image"
                        : previewFile
                          ? "File"
                          : "Text";

                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => {
                        documentListScrollYRef.current = window.scrollY;
                        setBlueprintPage(1);
                        setSelectedDocumentFileIndex(0);
                        setSelectedDocumentId(document.id);
                        setRecentDocumentIds((current) => [
                          document.id,
                          ...current.filter((id) => id !== document.id),
                        ].slice(0, 8));
                      }}
                      aria-pressed={isSelected}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "40px minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        minWidth: 0,
                        padding: "10px 11px",
                        border: `1px solid ${isSelected ? colors.gold : colors.line}`,
                        borderRadius: 11,
                        background: isSelected ? "#FFF9EA" : "#FFFFFF",
                        color: colors.text,
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: isSelected
                          ? "0 7px 18px rgba(201,154,61,0.14)"
                          : "0 2px 8px rgba(15,45,68,0.04)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 40,
                          height: 40,
                          borderRadius: 9,
                          background: isSelected ? colors.gold : "#EDF4F8",
                          color: isSelected ? colors.navy3 : "#175CD3",
                          fontSize: fileKind === "Image" ? 17 : 9,
                          fontWeight: 950,
                          letterSpacing: fileKind === "Image" ? 0 : "0.05em",
                        }}
                      >
                        {fileKind === "Image" ? "▧" : fileKind.toUpperCase()}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            overflow: "hidden",
                            color: colors.text,
                            fontSize: 12,
                            lineHeight: 1.3,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {document.title || "Untitled document"}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            marginTop: 3,
                            overflow: "hidden",
                            color: colors.muted,
                            fontSize: 9,
                            fontWeight: 750,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {category} · {linkedLabel}
                        </span>
                      </span>

                      <span
                        style={{
                          display: "grid",
                          justifyItems: "end",
                          gap: 3,
                          color: colors.muted,
                          fontSize: 8,
                          fontWeight: 750,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={
                            favoriteDocumentIds.includes(document.id)
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          aria-pressed={favoriteDocumentIds.includes(
                            document.id,
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            setFavoriteDocumentIds((current) =>
                              current.includes(document.id)
                                ? current.filter((id) => id !== document.id)
                                : [document.id, ...current],
                            );
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") {
                              return;
                            }
                            event.preventDefault();
                            event.stopPropagation();
                            setFavoriteDocumentIds((current) =>
                              current.includes(document.id)
                                ? current.filter((id) => id !== document.id)
                                : [document.id, ...current],
                            );
                          }}
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: 24,
                            height: 24,
                            borderRadius: 8,
                            border: `1px solid ${
                              favoriteDocumentIds.includes(document.id)
                                ? colors.gold
                                : colors.line
                            }`,
                            background: favoriteDocumentIds.includes(
                              document.id,
                            )
                              ? "#FFF3CF"
                              : "#FFFFFF",
                            color: favoriteDocumentIds.includes(document.id)
                              ? "#9A6A00"
                              : colors.muted,
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                        >
                          {favoriteDocumentIds.includes(document.id)
                            ? "★"
                            : "☆"}
                        </span>
                        <span>
                          {document.files?.length || 0} file
                          {(document.files?.length || 0) === 1 ? "" : "s"}
                        </span>
                        <span>
                          {document.createdAt
                            ? new Date(document.createdAt).toLocaleDateString()
                            : "Saved"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        }
        drawer={isMobile || !selectedDocument ? undefined : documentViewer}
      />

      {isMobile && selectedDocument ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Document viewer: ${selectedDocument.title}`}
          onClick={closeDocumentViewer}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1600,
            background: "rgba(7, 23, 47, 0.76)",
            padding:
              "max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 760,
              height:
                "calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
              minHeight: 0,
              borderRadius: 20,
              overflow: "hidden",
              background: "#FFFFFF",
              boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "10px 10px 10px 14px",
                borderBottom: `1px solid ${colors.line}`,
                background: "#FFFFFF",
              }}
            >
              <strong
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedDocument.title}
              </strong>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => openDocumentByOffset(-1)}
                  disabled={selectedDocumentIndex <= 0}
                  style={{
                    ...smallSubtleButtonStyle,
                    opacity: selectedDocumentIndex <= 0 ? 0.45 : 1,
                  }}
                  aria-label="Previous document"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => openDocumentByOffset(1)}
                  disabled={
                    selectedDocumentIndex < 0 ||
                    selectedDocumentIndex >= searchableDocuments.length - 1
                  }
                  style={{
                    ...smallSubtleButtonStyle,
                    opacity:
                      selectedDocumentIndex < 0 ||
                      selectedDocumentIndex >= searchableDocuments.length - 1
                        ? 0.45
                        : 1,
                  }}
                  aria-label="Next document"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={closeDocumentViewer}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    border: `1px solid ${colors.line}`,
                    background: colors.navy3,
                    color: "#FFFFFF",
                    fontSize: 22,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                  aria-label="Close document viewer"
                  title="Close"
                >
                  {closeSymbol}
                </button>
              </div>
            </div>

            <div
              ref={documentOverlayScrollRef}
              style={{
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                padding: 12,
              }}
            >
              {documentViewer}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
