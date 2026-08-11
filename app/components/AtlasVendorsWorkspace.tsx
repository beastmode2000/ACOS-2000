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



export default function AtlasVendorsWorkspace(props: any) {
  const [mobileFieldDetailsOpen, setMobileFieldDetailsOpen] = React.useState(false);
  const [vendorSearch, setVendorSearch] = React.useState("");
  const {
    addLinkedPhotoFiles,
    addVendor,
    assetName,
    assetRecords,
    buttonRowStyle,
    compactLinkedListStyle,
    compactLinkedRowStyle,
    compactUploadButtonStyle,
    dangerButtonStyle,
    deleteLinkedImage,
    deleteVendorRecord,
    detailSectionHeaderStyle,
    detailSectionStyle,
    editorHeaderStyle,
    eyebrowStyle,
    filteredVendors,
    formGridStyle,
    goldButtonStyle,
    imageFilesFromPasteEvent,
    isMobile,
    isRecordDirty,
    linkedImageFilesFor,
    listStyle,
    mutedSmallStyle,
    noticeStyle,
    openUploadedFile,
    pasteLinkedPhoto,
    photoDeleteButtonStyle,
    recordListIdentityStyle,
    renderLinkedDocuments,
    rowButtonStyle,
    saveDirtyRecord,
    secondaryButtonStyle,
    selectedVendor,
    selectedVendorId,
    serviceRecords,
    setScreen,
    setSelectedAssetId,
    setSelectedServiceId,
    setSelectedTaskId,
    setSelectedVendorId,
    setTasksView,
    setVendorRecords,
    stackStyle,
    taskDetails,
    updateVendor,
    vendorDetailHeaderStyle,
    vendorLogoFor,
    vendorLogoImageStyle,
    vendorLogoLargeStyle,
    vendorLogoThumbStyle,
    workPlanTasks
  } = props;
  const selectedVendorLogo = selectedVendor.id
    ? vendorLogoFor(selectedVendor.id)
    : undefined;
  React.useEffect(() => {
    setMobileFieldDetailsOpen(false);
  }, [selectedVendorId]);

  const selectedVendorPhotos = selectedVendor.id
    ? linkedImageFilesFor("Vendor", selectedVendor.id)
    : [];
  const relatedVendorAssets: AssetRecord[] = selectedVendor.id
    ? [...(assetRecords as AssetRecord[])]
        .filter((asset) => asset.vendorIds.includes(selectedVendor.id))
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        )
    : [];
  const relatedVendorWorkOrders = selectedVendor.id
    ? [...serviceRecords]
        .filter((record) => record.vendorId === selectedVendor.id)
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
  const relatedVendorTasks = selectedVendor.id
    ? workPlanTasks
        .filter((task) => taskDetails(task.id).vendorId === selectedVendor.id)
        .sort((a, b) => String(taskDetails(a.id).dueDate || "9999-12-31").localeCompare(String(taskDetails(b.id).dueDate || "9999-12-31")))
    : [];
  const lastVendorVisit =
    relatedVendorWorkOrders.find((record) => record.status === "Completed") ||
    relatedVendorWorkOrders[0];

  const vendorCompletedVisitCount = relatedVendorWorkOrders.reduce(
    (count, record) =>
      count +
      (Array.isArray(record.serviceHistory) && record.serviceHistory.length
        ? record.serviceHistory.length
        : record.status === "Completed"
          ? 1
          : 0),
    0,
  );
  const vendorOpenWorkCount = relatedVendorWorkOrders.filter(
    (record) => record.status !== "Completed",
  ).length;
  const vendorOpenTaskCount = relatedVendorTasks.filter(
    (task) => taskDetails(task.id).status !== "Completed",
  ).length;
  const vendorLastVisitDate = lastVendorVisit
    ? String(
        lastVendorVisit.serviceHistory?.[0]?.completedAt ||
          lastVendorVisit.lastCompletedDate ||
          lastVendorVisit.date ||
          "",
      ).slice(0, 10)
    : "";

  const visibleVendors = filteredVendors.filter((vendor: VendorRecord) => {
    const query = vendorSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      vendor.name,
      vendor.category,
      vendor.phone,
      vendor.email,
      vendor.website,
      vendor.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <ListDrawerLayout
      eyebrow="Property Records"
      title="Vendors"
      isMobile={isMobile}
      drawerResetKey={selectedVendorId || "vendor-new"}
      gridStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : {
              gridTemplateColumns: "minmax(300px, 340px) minmax(0, 1fr)",
              gap: 12,
              alignItems: "start",
            }
      }
      listPanelStyleOverride={
        isMobile
          ? { minWidth: 0, overflowX: "hidden" }
          : { minWidth: 0, padding: 10 }
      }
      drawerStyleOverride={
        isMobile ? { minWidth: 0, overflowX: "hidden" } : { minWidth: 0 }
      }
      right={
        <button type="button" onClick={() => addVendor()} style={goldButtonStyle}>
          Add Vendor
        </button>
      }
      list={
        <div style={{ ...listStyle, gap: 6 }}>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              display: "grid",
              gap: 6,
              paddingBottom: 6,
              background: colors.panel,
            }}
          >
            <input
              type="search"
              value={vendorSearch}
              onChange={(event) => setVendorSearch(event.currentTarget.value)}
              placeholder="Search vendors..."
              aria-label="Search vendors"
              style={{
                width: "100%",
                minWidth: 0,
                height: 36,
                boxSizing: "border-box",
                border: `1px solid ${colors.line}`,
                borderRadius: 10,
                padding: "7px 10px",
                background: "#FFFFFF",
                color: colors.text,
                font: "inherit",
                outline: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={mutedSmallStyle}>
                {visibleVendors.length} vendor{visibleVendors.length === 1 ? "" : "s"}
              </span>
              {vendorSearch ? (
                <button
                  type="button"
                  onClick={() => setVendorSearch("")}
                  style={{
                    ...secondaryButtonStyle,
                    minHeight: 28,
                    padding: "4px 7px",
                    fontSize: 11,
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          {visibleVendors.map((vendor) => {
            const logo = vendorLogoFor(vendor.id);
            const logoSrc = logo?.dataUrl || logo?.url || "";
            return (
              <button
                key={vendor.id}
                type="button"
                onClick={() => setSelectedVendorId(vendor.id)}
                style={{
                  ...rowButtonStyle,
                  padding: "8px 9px",
                  minHeight: 0,
                  borderRadius: 10,
                  borderColor:
                    vendor.id === selectedVendor.id
                      ? colors.gold
                      : colors.line,
                  background:
                    vendor.id === selectedVendor.id ? "#FFF9EC" : "#FFFFFF",
                  boxShadow: "none",
                }}
              >
                <div style={recordListIdentityStyle}>
                  <div style={vendorLogoThumbStyle}>
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={`${vendor.name} logo`}
                        style={vendorLogoImageStyle}
                      />
                    ) : (
                      <span>{vendor.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{vendor.name}</strong>
                    <p style={mutedSmallStyle}>{vendor.category}</p>
                    <p style={mutedSmallStyle}>
                      {[vendor.phone, vendor.email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {!visibleVendors.length ? (
            <div style={noticeStyle}>No vendors match this search.</div>
          ) : null}
        </div>
      }
      drawer={
        selectedVendor.id ? (
          <div
            style={stackStyle}
            tabIndex={0}
            onPaste={(event) => {
              const files = imageFilesFromPasteEvent(event);
              if (!files.length) return;
              event.preventDefault();
              void addLinkedPhotoFiles(
                "Vendor",
                selectedVendor.id,
                selectedVendor.name,
                files,
                selectedVendorLogo ? "Photo" : "Vendor Logo",
              );
            }}
          >
            <div style={vendorDetailHeaderStyle}>
              <div style={vendorLogoLargeStyle}>
                {selectedVendorLogo?.dataUrl || selectedVendorLogo?.url ? (
                  <img
                    src={selectedVendorLogo.dataUrl || selectedVendorLogo.url}
                    alt={`${selectedVendor.name} logo`}
                    style={vendorLogoImageStyle}
                  />
                ) : (
                  <span>{selectedVendor.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={editorHeaderStyle}>
                  {selectedVendor.name.trim() || "Vendor"}
                </h3>
                <p style={mutedSmallStyle}>
                  {selectedVendor.category || "Uncategorized"}
                </p>
                <p style={mutedSmallStyle}>
                  Last recorded visit:{" "}
                  {lastVendorVisit
                    ? formatDate(
                        String(
                          lastVendorVisit.serviceHistory?.[0]?.completedAt ||
                            lastVendorVisit.lastCompletedDate ||
                            lastVendorVisit.date,
                        ).slice(0, 10),
                      )
                    : "No visit recorded"}
                </p>
              </div>
              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={() =>
                    void pasteLinkedPhoto(
                      "Vendor",
                      selectedVendor.id,
                      selectedVendor.name,
                      "Vendor Logo",
                    )
                  }
                  style={secondaryButtonStyle}
                >
                  Paste Logo
                </button>
                <label style={compactUploadButtonStyle}>
                  {selectedVendorLogo ? "Change Logo" : "Add Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void addLinkedPhotoFiles(
                        "Vendor",
                        selectedVendor.id,
                        selectedVendor.name,
                        event.currentTarget.files,
                        "Vendor Logo",
                      );
                      event.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                {selectedVendorLogo ? (
                  <button
                    type="button"
                    onClick={() => void deleteLinkedImage(selectedVendorLogo)}
                    style={dangerButtonStyle}
                  >
                    Delete Logo
                  </button>
                ) : null}
              </div>
            </div>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Vendor Information</div>
              <div style={formGridStyle}>
                <Field
                  label="Name"
                  value={selectedVendor.name}
                  onChange={(value) =>
                    setVendorRecords((current) =>
                      byName(
                        current.map((item) =>
                          item.id === selectedVendor.id
                            ? normalizeVendor({
                                ...item,
                                name: value,
                              })
                            : item,
                        ),
                      ),
                    )
                  }
                />
                <Field
                  label="Category"
                  value={selectedVendor.category}
                  onChange={(value) =>
                    setVendorRecords((current) =>
                      byName(
                        current.map((item) =>
                          item.id === selectedVendor.id
                            ? normalizeVendor({
                                ...item,
                                category: value,
                              })
                            : item,
                        ),
                      ),
                    )
                  }
                />
                <Field
                  label="Phone"
                  value={selectedVendor.phone ?? ""}
                  onChange={(value) => updateVendor({ phone: value })}
                />
                <Field
                  label="Email"
                  value={selectedVendor.email ?? ""}
                  onChange={(value) => updateVendor({ email: value })}
                />
                <Field
                  label="Website"
                  value={selectedVendor.website ?? ""}
                  onChange={(value) => updateVendor({ website: value })}
                />
                <Field
                  label="Notes"
                  value={selectedVendor.notes}
                  onChange={(value) => updateVendor({ notes: value })}
                  multiline
                />
              </div>

              <div style={buttonRowStyle}>
                {isRecordDirty("vendor", selectedVendor.id) ? (
                  <button
                    type="button"
                    onClick={() =>
                      void saveDirtyRecord(
                        "vendors",
                        selectedVendor,
                        "vendor",
                        selectedVendor.id,
                      )
                    }
                    style={goldButtonStyle}
                  >
                    Save Vendor
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void deleteVendorRecord(selectedVendor)}
                  style={dangerButtonStyle}
                >
                  Delete Vendor
                </button>
              </div>
            </section>

            {isMobile ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 6,
                }}
              >
                {selectedVendor.phone ? (
                  <a
                    href={`tel:${selectedVendor.phone}`}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: 42,
                      padding: "7px 4px",
                      textDecoration: "none",
                      justifyContent: "center",
                    }}
                  >
                    Call
                  </a>
                ) : (
                  <button type="button" disabled style={{ ...secondaryButtonStyle, minHeight: 42, padding: "7px 4px", opacity: .45 }}>
                    Call
                  </button>
                )}
                {selectedVendor.email ? (
                  <a
                    href={`mailto:${selectedVendor.email}`}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: 42,
                      padding: "7px 4px",
                      textDecoration: "none",
                      justifyContent: "center",
                    }}
                  >
                    Email
                  </a>
                ) : (
                  <button type="button" disabled style={{ ...secondaryButtonStyle, minHeight: 42, padding: "7px 4px", opacity: .45 }}>
                    Email
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const open = relatedVendorWorkOrders.find((record) => record.status !== "Completed");
                    if (open) setSelectedServiceId(open.id);
                    setScreen("history");
                  }}
                  style={{ ...secondaryButtonStyle, minHeight: 42, padding: "7px 4px" }}
                >
                  Work
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

            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Vendor Snapshot</div>
                  <strong>Service relationship</strong>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(5, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  ["Last visit", vendorLastVisitDate ? formatDate(vendorLastVisitDate) : "None"],
                  ["Completed visits", vendorCompletedVisitCount],
                  ["Open work", vendorOpenWorkCount],
                  ["Linked assets", relatedVendorAssets.length],
                  ["Open tasks", vendorOpenTaskCount],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 9,
                      padding: "8px 9px",
                      background: "#FFFFFF",
                      minWidth: 0,
                    }}
                  >
                    <small style={mutedSmallStyle}>{label}</small>
                    <strong
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: colors.navy,
                        fontSize: 15,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            {(!isMobile || mobileFieldDetailsOpen) ? (
            <>
            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Photos</div>
                  <strong>{selectedVendorPhotos.length} attached</strong>
                </div>
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      void pasteLinkedPhoto(
                        "Vendor",
                        selectedVendor.id,
                        selectedVendor.name,
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
                          "Vendor",
                          selectedVendor.id,
                          selectedVendor.name,
                          event.currentTarget.files,
                        );
                        event.currentTarget.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {selectedVendorPhotos.length ? (
                <details style={{ border: `1px solid ${colors.line}`, borderRadius: 9, background: colors.card }}>
                  <summary style={{ padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>Photos ({selectedVendorPhotos.length})</summary>
                  <div style={{ display: "grid", gap: 5, maxHeight: 180, overflowY: "auto", padding: "0 8px 8px" }}>
                  {selectedVendorPhotos.map((file) => (
                    <div key={file.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 8, padding: "6px 8px", border: `1px solid ${colors.line}`, borderRadius: 8 }}>
                      <button
                        type="button"
                        onClick={() => openUploadedFile(file)}
                        style={{ border: 0, padding: 0, background: "transparent", color: colors.navy, textAlign: "left", fontWeight: 800, cursor: "pointer" }}
                      >
                        {file.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteLinkedImage(file)}
                        style={photoDeleteButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  </div>
                </details>
              ) : null}
            </section>

            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Service & Visit History</div>
                  <strong>{vendorCompletedVisitCount} completed visit{vendorCompletedVisitCount === 1 ? "" : "s"}</strong>
                </div>
              </div>
              {relatedVendorWorkOrders.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {relatedVendorWorkOrders.map((record) => {
                    const completedEntries = Array.isArray(record.serviceHistory)
                      ? record.serviceHistory
                      : [];
                    const latestCompletion = completedEntries[0];
                    const checklist = Array.isArray(latestCompletion?.checklist)
                      ? latestCompletion.checklist
                      : Array.isArray(record.checklist)
                        ? record.checklist
                        : [];
                    const passCount = checklist.filter(
                      (item: any) =>
                        item.completed === true ||
                        /^\[PASS\]/i.test(String(item.text || "")),
                    ).length;
                    const flagCount = checklist.filter((item: any) =>
                      /^\[FLAG\]/i.test(String(item.text || "")),
                    ).length;
                    const failCount = checklist.filter((item: any) =>
                      /^\[FAIL\]/i.test(String(item.text || "")),
                    ).length;
                    const photos = Array.isArray(latestCompletion?.photos)
                      ? latestCompletion.photos
                      : Array.isArray(record.photos)
                        ? record.photos
                        : [];
                    const documents = Array.isArray(latestCompletion?.documents)
                      ? latestCompletion.documents
                      : Array.isArray(record.documents)
                        ? record.documents
                        : [];
                    const serviceDate = String(
                      latestCompletion?.completedAt ||
                        record.lastCompletedDate ||
                        record.date ||
                        "",
                    ).slice(0, 10);
                    const serviceNotes = String(
                      latestCompletion?.notes || record.notes || "",
                    ).trim();

                    return (
                      <div
                        key={record.id}
                        style={{
                          border: `1px solid ${colors.line}`,
                          borderRadius: 10,
                          padding: 9,
                          background: "#FFFFFF",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServiceId(record.id);
                            setScreen("history");
                          }}
                          style={{
                            ...compactLinkedRowStyle,
                            width: "100%",
                            border: 0,
                            padding: 0,
                            background: "transparent",
                          }}
                        >
                          <span>
                            <strong>{record.title}</strong>
                            <small style={mutedSmallStyle}>
                              {serviceDate ? formatDate(serviceDate) : "No service date"}
                              {record.assetId
                                ? ` · ${assetName(record.assetId)}`
                                : ""}
                            </small>
                          </span>
                          <span style={badgeStyle(record.status)}>
                            {record.status}
                          </span>
                        </button>

                        {checklist.length || photos.length || documents.length || serviceNotes ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginTop: 7,
                            }}
                          >
                            {checklist.length ? (
                              <span style={mutedSmallStyle}>
                                {passCount}/{checklist.length} passed
                                {flagCount ? ` · ${flagCount} flagged` : ""}
                                {failCount ? ` · ${failCount} failed` : ""}
                              </span>
                            ) : null}
                            {photos.length ? (
                              <span style={mutedSmallStyle}>
                                {photos.length} photo{photos.length === 1 ? "" : "s"}
                              </span>
                            ) : null}
                            {documents.length ? (
                              <span style={mutedSmallStyle}>
                                {documents.length} document{documents.length === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {serviceNotes ? (
                          <p
                            style={{
                              ...mutedSmallStyle,
                              marginTop: 6,
                              marginBottom: 0,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {serviceNotes}
                          </p>
                        ) : null}

                        {completedEntries.length > 1 ? (
                          <details style={{ marginTop: 7 }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                color: colors.navy,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Previous visits ({completedEntries.length - 1})
                            </summary>
                            <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
                              {completedEntries.slice(1).map((entry: any) => (
                                <div
                                  key={entry.id}
                                  style={{
                                    ...mutedSmallStyle,
                                    padding: "5px 7px",
                                    borderRadius: 7,
                                    background: "#F8FAFC",
                                  }}
                                >
                                  {formatDate(String(entry.completedAt || "").slice(0, 10))}
                                  {entry.notes ? ` · ${String(entry.notes)}` : ""}
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={mutedSmallStyle}>
                  No visits or work orders are linked to this vendor.
                </p>
              )}
            </section>

            <section style={detailSectionStyle}>
              <div style={eyebrowStyle}>Related Assets</div>
              {relatedVendorAssets.length ? (
                <div style={compactLinkedListStyle}>
                  {relatedVendorAssets.map((asset) => (
                    <button
                      key={asset.id}
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
                  ))}
                </div>
              ) : (
                <p style={mutedSmallStyle}>
                  No assets currently list this vendor.
                </p>
              )}
            </section>

            <section style={detailSectionStyle}><div style={detailSectionHeaderStyle}><div><div style={eyebrowStyle}>Related Tasks</div><strong>{relatedVendorTasks.length} linked</strong></div></div>{relatedVendorTasks.length ? <div style={compactLinkedListStyle}>{relatedVendorTasks.map((task) => <button key={`vendor-task-${task.id}`} type="button" onClick={() => { setSelectedTaskId(task.id); setTasksView("tasks"); setScreen("planner"); }} style={{ ...compactLinkedRowStyle, width: "100%" }}><span><strong>{task.title}</strong><small style={mutedSmallStyle}>{taskDetails(task.id).dueDate ? formatDate(taskDetails(task.id).dueDate) : "No due date"}</small></span><span style={badgeStyle(taskDetails(task.id).status)}>{taskDetails(task.id).status}</span></button>)}</div> : <p style={mutedSmallStyle}>No Tasks are linked to this vendor.</p>}</section>
            {renderLinkedDocuments("Vendor", selectedVendor.id)}
            </>
            ) : null}
          </div>
        ) : (
          <div style={noticeStyle}>
            <strong>Select a vendor.</strong>
            <p style={mutedSmallStyle}>
              Open a vendor to see contact information, logo, photos, related
              assets, and documents.
            </p>
          </div>
        )
      }
    />
  );
}
