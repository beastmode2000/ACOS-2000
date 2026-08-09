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



export default function AtlasProceduresWorkspace(props: any) {
  const [procedureSearch, setProcedureSearch] = React.useState("");
  const {
    assetRecords,
    colors,
    buttonRowStyle,
    cardStyle,
    closeProcedureViewer,
    createProcedureRecord,
    deleteProcedureRecord,
    duplicateProcedureRecord,
    editorHeaderStyle,
    eyebrowStyle,
    filteredProcedures,
    formGridStyle,
    generateProcedureDraft,
    goldButtonStyle,
    inputStyle,
    isMobile,
    isRecordDirty,
    listStyle,
    locations,
    moveProcedureStep,
    mutedSmallStyle,
    noticeStyle,
    openUploadedFile,
    procedureDraftNotes,
    procedureListScrollYRef,
    procedureMessage,
    procedureOverlayScrollRef,
    rowButtonStyle,
    saveDirtyRecord,
    secondaryButtonStyle,
    selectedProcedure,
    selectedProcedureId,
    setPreviewFile,
    setProcedureDraftNotes,
    setProcedureMessage,
    setSelectedProcedureId,
    smallSubtleButtonStyle,
    tinyDangerButtonStyle,
    toggleProcedureLink,
    updateProcedure,
    updateProcedureSteps,
    uploadProcedureFiles,
    vendorRecords
  } = props;
  const procedureEditor = selectedProcedureId ? (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          order: -3,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>Procedure Builder</div>
          <h3 style={{ ...editorHeaderStyle, marginBottom: 4 }}>
            {selectedProcedure.title.trim() || "New Procedure"}
          </h3>
          <p style={mutedSmallStyle}>
            {selectedProcedure.status || "Draft"} ·{" "}
            {selectedProcedure.steps.length} steps
          </p>
        </div>
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={() => {
              document.body.classList.add("atlas-print-procedure");
              try {
                window.print();
              } finally {
                document.body.classList.remove("atlas-print-procedure");
              }
            }}
            style={secondaryButtonStyle}
            className="atlas-no-print"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => duplicateProcedureRecord(selectedProcedure)}
            style={secondaryButtonStyle}
          >
            Duplicate
          </button>
          {selectedProcedure.id ? (
            <button
              type="button"
              onClick={() => void deleteProcedureRecord(selectedProcedure)}
              style={tinyDangerButtonStyle}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ ...cardStyle, background: "#F8FAFC" }}>
        <div style={eyebrowStyle}>Build Draft from Notes</div>
        <Field
          label="Paste notes, a manual excerpt, work-order details, or a photo description"
          value={procedureDraftNotes}
          onChange={setProcedureDraftNotes}
          multiline
        />
        <div style={{ ...buttonRowStyle, marginTop: 10 }}>
          <button
            type="button"
            onClick={generateProcedureDraft}
            style={goldButtonStyle}
          >
            Generate Procedure Draft
          </button>
        </div>
        {procedureMessage ? (
          <p style={{ ...mutedSmallStyle, marginTop: 8 }}>
            {procedureMessage}
          </p>
        ) : null}
      </div>

      <div style={{ ...formGridStyle, order: -1 }}>
        <Field
          label="Title"
          value={selectedProcedure.title}
          onChange={(value) =>
            updateProcedure({
              title: value,
              updatedAt: new Date().toISOString(),
            })
          }
        />
        <Field
          label="Area"
          value={selectedProcedure.area}
          onChange={(value) =>
            updateProcedure({
              area: value,
              updatedAt: new Date().toISOString(),
            })
          }
        />
        <Field
          label="Category"
          value={selectedProcedure.category || ""}
          onChange={(value) =>
            updateProcedure({
              category: value,
              updatedAt: new Date().toISOString(),
            })
          }
        />
        <SelectField
          label="Status"
          value={selectedProcedure.status || "Draft"}
          onChange={(value) =>
            updateProcedure({
              status: value as ProcedureRecord["status"],
              updatedAt: new Date().toISOString(),
            })
          }
          options={
            ["Draft", "SOP", "Preventive Maintenance", "Landscaping"] as const
          }
        />
        <SelectField
          label="Priority"
          value={selectedProcedure.priority}
          onChange={(value) =>
            updateProcedure({
              priority: value,
              updatedAt: new Date().toISOString(),
            })
          }
          options={["High", "Normal", "Seasonal"] as const}
        />
        <Field
          label="Estimated Time"
          value={selectedProcedure.estimatedTime || ""}
          onChange={(value) =>
            updateProcedure({
              estimatedTime: value,
              updatedAt: new Date().toISOString(),
            })
          }
        />
        <Field
          label="Purpose / Notes"
          value={selectedProcedure.purpose || ""}
          onChange={(value) =>
            updateProcedure({
              purpose: value,
              updatedAt: new Date().toISOString(),
            })
          }
          multiline
        />
        <Field
          label="Safety Notes"
          value={selectedProcedure.safetyNotes || ""}
          onChange={(value) =>
            updateProcedure({
              safetyNotes: value,
              updatedAt: new Date().toISOString(),
            })
          }
          multiline
        />
        <Field
          label="Tools / Parts Overview"
          value={selectedProcedure.toolsParts || ""}
          onChange={(value) =>
            updateProcedure({
              toolsParts: value,
              updatedAt: new Date().toISOString(),
            })
          }
          multiline
        />
        <Field
          label="Required Tools, one per line"
          value={(selectedProcedure.requiredTools || []).join("\n")}
          onChange={(value) =>
            updateProcedure({
              requiredTools: value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
              updatedAt: new Date().toISOString(),
            })
          }
          multiline
        />
        <Field
          label="Required Parts, one per line"
          value={(selectedProcedure.requiredParts || []).join("\n")}
          onChange={(value) =>
            updateProcedure({
              requiredParts: value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
              updatedAt: new Date().toISOString(),
            })
          }
          multiline
        />
      </div>

      <div style={{ ...cardStyle, order: -2 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={eyebrowStyle}>Procedure</div>
            <strong>{selectedProcedure.steps.length} steps</strong>
          </div>
          <button
            type="button"
            onClick={() =>
              updateProcedureSteps([...selectedProcedure.steps, "New step"])
            }
            style={smallSubtleButtonStyle}
          >
            Add Step
          </button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {selectedProcedure.steps.map((step, index) => (
            <div
              key={`${selectedProcedure.id}-step-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "32px minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <strong style={{ textAlign: "center" }}>{index + 1}</strong>
              <input
                value={step}
                onChange={(event) => {
                  const next = [...selectedProcedure.steps];
                  next[index] = event.currentTarget.value;
                  updateProcedureSteps(next);
                }}
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => moveProcedureStep(index, -1)}
                  disabled={index === 0}
                  style={smallSubtleButtonStyle}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveProcedureStep(index, 1)}
                  disabled={index === selectedProcedure.steps.length - 1}
                  style={smallSubtleButtonStyle}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateProcedureSteps(
                      selectedProcedure.steps.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  style={tinyDangerButtonStyle}
                >
                  {closeSymbol}
                </button>
              </div>
            </div>
          ))}
          {!selectedProcedure.steps.length ? (
            <div style={noticeStyle}>No procedure created yet. Add the first step.</div>
          ) : null}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={eyebrowStyle}>Linked Records</div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <strong>Assets</strong>
            <div style={{ ...buttonRowStyle, marginTop: 6 }}>
              {assetRecords.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() =>
                    toggleProcedureLink("linkedAssetIds", asset.id)
                  }
                  style={
                    (selectedProcedure.linkedAssetIds || []).includes(
                      asset.id,
                    )
                      ? goldButtonStyle
                      : smallSubtleButtonStyle
                  }
                >
                  {asset.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <strong>Locations</strong>
            <div style={{ ...buttonRowStyle, marginTop: 6 }}>
              {locations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() =>
                    toggleProcedureLink("linkedLocationIds", location.id)
                  }
                  style={
                    (selectedProcedure.linkedLocationIds || []).includes(
                      location.id,
                    )
                      ? goldButtonStyle
                      : smallSubtleButtonStyle
                  }
                >
                  {location.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <strong>Vendors</strong>
            <div style={{ ...buttonRowStyle, marginTop: 6 }}>
              {vendorRecords.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() =>
                    toggleProcedureLink("linkedVendorIds", vendor.id)
                  }
                  style={
                    (selectedProcedure.linkedVendorIds || []).includes(
                      vendor.id,
                    )
                      ? goldButtonStyle
                      : smallSubtleButtonStyle
                  }
                >
                  {vendor.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={eyebrowStyle}>Photos and Documents</div>
        <div style={buttonRowStyle}>
          <label style={{ ...secondaryButtonStyle, cursor: "pointer" }}>
            Add Photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                void uploadProcedureFiles("photos", event.currentTarget.files)
              }
              style={{ display: "none" }}
            />
          </label>
          <label style={{ ...secondaryButtonStyle, cursor: "pointer" }}>
            Add Documents
            <input
              type="file"
              multiple
              onChange={(event) =>
                void uploadProcedureFiles(
                  "documents",
                  event.currentTarget.files,
                )
              }
              style={{ display: "none" }}
            />
          </label>
        </div>
        {(selectedProcedure.photos || []).length ? (
          <details style={{ marginTop: 12, border: `1px solid ${colors.line}`, borderRadius: 9, background: "#FFFFFF" }}>
            <summary style={{ padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>Photos ({(selectedProcedure.photos || []).length})</summary>
            <div style={{ display: "grid", gap: 5, maxHeight: 180, overflowY: "auto", padding: "0 8px 8px" }}>
            {(selectedProcedure.photos || []).map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPreviewFile(photo)}
                style={{ border: `1px solid ${colors.line}`, borderRadius: 8, padding: "7px 8px", background: "#FFFFFF", color: colors.navy, textAlign: "left", fontWeight: 800, cursor: "pointer" }}
              >
                {photo.name || "Procedure photo"}
              </button>
            ))}
            </div>
          </details>
        ) : null}
        {(selectedProcedure.documents || []).length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {(selectedProcedure.documents || []).map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => openUploadedFile(document)}
                style={secondaryButtonStyle}
              >
                {document.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={buttonRowStyle}>
        {isRecordDirty("procedure", selectedProcedure.id) ? (
          <button
            type="button"
            onClick={() =>
              void saveDirtyRecord(
                "procedures",
                selectedProcedure,
                "procedure",
                selectedProcedure.id,
              )
            }
            style={goldButtonStyle}
          >
            Save Procedure
          </button>
        ) : (
          <span style={badgeStyle("Completed")}>Saved</span>
        )}
        {isMobile ? (
          <button
            type="button"
            onClick={closeProcedureViewer}
            style={secondaryButtonStyle}
          >
            Close
          </button>
        ) : null}
      </div>

      <section
        className="atlas-procedure-print"
        aria-label={`Printable procedure: ${selectedProcedure.title || "New Procedure"}`}
      >
        <header className="atlas-procedure-print__header">
          <div>
            <div className="atlas-procedure-print__eyebrow">
              ATLAS PROCEDURE
            </div>
            <h1>{selectedProcedure.title.trim() || "New Procedure"}</h1>
          </div>
          <div className="atlas-procedure-print__meta-grid">
            <div>
              <strong>Status</strong>
              <span>{selectedProcedure.status || "Draft"}</span>
            </div>
            <div>
              <strong>Priority</strong>
              <span>{selectedProcedure.priority || "Normal"}</span>
            </div>
            <div>
              <strong>Area</strong>
              <span>{selectedProcedure.area || "—"}</span>
            </div>
            <div>
              <strong>Category</strong>
              <span>{selectedProcedure.category || "General"}</span>
            </div>
            <div>
              <strong>Estimated Time</strong>
              <span>{selectedProcedure.estimatedTime || "—"}</span>
            </div>
            <div>
              <strong>Updated</strong>
              <span>
                {selectedProcedure.updatedAt
                  ? formatDate(selectedProcedure.updatedAt)
                  : "—"}
              </span>
            </div>
          </div>
        </header>

        {selectedProcedure.purpose ? (
          <section className="atlas-procedure-print__section">
            <h2>Purpose</h2>
            <p>{selectedProcedure.purpose}</p>
          </section>
        ) : null}
        {selectedProcedure.safetyNotes ? (
          <section className="atlas-procedure-print__section atlas-procedure-print__safety">
            <h2>Safety Notes</h2>
            <p>{selectedProcedure.safetyNotes}</p>
          </section>
        ) : null}
        {selectedProcedure.toolsParts ? (
          <section className="atlas-procedure-print__section">
            <h2>Tools / Parts Overview</h2>
            <p>{selectedProcedure.toolsParts}</p>
          </section>
        ) : null}

        {(selectedProcedure.requiredTools || []).length ||
        (selectedProcedure.requiredParts || []).length ? (
          <section className="atlas-procedure-print__two-column">
            {(selectedProcedure.requiredTools || []).length ? (
              <div>
                <h2>Required Tools</h2>
                <ul>
                  {(selectedProcedure.requiredTools || []).map(
                    (item, index) => (
                      <li key={`print-tool-${index}`}>{item}</li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
            {(selectedProcedure.requiredParts || []).length ? (
              <div>
                <h2>Required Parts</h2>
                <ul>
                  {(selectedProcedure.requiredParts || []).map(
                    (item, index) => (
                      <li key={`print-part-${index}`}>{item}</li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="atlas-procedure-print__section">
          <h2>Checklist</h2>
          {(selectedProcedure.steps || []).length ? (
            <ol className="atlas-procedure-print__steps">
              {(selectedProcedure.steps || []).map((step, index) => (
                <li key={`print-step-${index}`}>
                  <span
                    className="atlas-procedure-print__checkbox"
                    aria-hidden="true"
                  />{" "}
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No checklist steps.</p>
          )}
        </section>

        <section className="atlas-procedure-print__linked-grid">
          <div>
            <h2>Linked Assets</h2>
            <p>
              {assetRecords
                .filter((asset) =>
                  (selectedProcedure.linkedAssetIds || []).includes(asset.id),
                )
                .map((asset) => asset.name)
                .join(", ") || "None"}
            </p>
          </div>
          <div>
            <h2>Linked Locations</h2>
            <p>
              {locations
                .filter((location) =>
                  (selectedProcedure.linkedLocationIds || []).includes(
                    location.id,
                  ),
                )
                .map((location) => location.name)
                .join(", ") || "None"}
            </p>
          </div>
          <div>
            <h2>Linked Vendors</h2>
            <p>
              {vendorRecords
                .filter((vendor) =>
                  (selectedProcedure.linkedVendorIds || []).includes(
                    vendor.id,
                  ),
                )
                .map((vendor) => vendor.name)
                .join(", ") || "None"}
            </p>
          </div>
        </section>

        {(selectedProcedure.photos || []).length ? (
          <section className="atlas-procedure-print__section">
            <h2>Photos</h2>
            <div className="atlas-procedure-print__photos">
              {(selectedProcedure.photos || []).map((photo) => (
                <figure key={`print-photo-${photo.id}`}>
                  <img src={photo.dataUrl || photo.url} alt={photo.name} />
                  <figcaption>{photo.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}
        {(selectedProcedure.documents || []).length ? (
          <section className="atlas-procedure-print__section">
            <h2>Documents</h2>
            <ul>
              {(selectedProcedure.documents || []).map((document) => (
                <li key={`print-document-${document.id}`}>{document.name}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </div>
  ) : (
    <div style={noticeStyle}>
      <strong>Select a procedure.</strong>
      <p style={mutedSmallStyle}>
        Choose one from the list or add a new procedure.
      </p>
    </div>
  );

  const visibleProcedures = (filteredProcedures || []).filter((item: any) => {
    const query = procedureSearch.trim().toLowerCase();
    if (!query) return true;
    return [item.title, item.area, item.category, item.status]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <>
      {!isMobile ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={eyebrowStyle}>Procedures</div>
              <h2 style={{ margin: "2px 0", color: colors.navy }}>Procedures</h2>
              <p style={{ ...mutedSmallStyle, margin: 0 }}>
                Select a procedure on the left. Edit its checklist and supporting information on the right.
              </p>
            </div>
            <button
              type="button"
              onClick={() => createProcedureRecord()}
              style={goldButtonStyle}
            >
              Add Procedure
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 320px) minmax(0, 1fr)",
              gap: 12,
              alignItems: "start",
            }}
          >
            <aside
              style={{
                ...cardStyle,
                padding: 9,
                position: "sticky",
                top: 10,
                maxHeight: "calc(100vh - 120px)",
                overflowY: "auto",
              }}
            >
              <div style={{ ...eyebrowStyle, margin: "3px 4px 7px" }}>
                Procedure List
              </div>
              <input
                type="search"
                value={procedureSearch}
                onChange={(event) => setProcedureSearch(event.currentTarget.value)}
                placeholder="Search procedures..."
                aria-label="Search procedures"
                style={{ ...inputStyle, width: "100%", height: 34, marginBottom: 7 }}
              />
              <div style={{ display: "grid", gap: 6 }}>
                {visibleProcedures.map((procedure) => {
                  const active = procedure.id === selectedProcedure.id;
                  return (
                    <button
                      key={procedure.id}
                      type="button"
                      onClick={() => {
                        setSelectedProcedureId(procedure.id);
                        setProcedureDraftNotes("");
                        setProcedureMessage("");
                      }}
                      style={{
                        ...rowButtonStyle,
                        width: "100%",
                        textAlign: "left",
                        borderColor: active ? colors.gold : colors.line,
                        background: active ? "#FFF9E8" : "#FFFFFF",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", color: colors.navy }}>
                          {procedure.title}
                        </strong>
                        <p style={{ ...mutedSmallStyle, margin: "3px 0 0" }}>
                          {procedure.area || "General"} · {procedure.steps.length} steps
                        </p>
                      </div>
                    </button>
                  );
                })}
                {!visibleProcedures.length ? (
                  <div style={noticeStyle}>No procedures yet.</div>
                ) : null}
              </div>
            </aside>

            <main
              style={{
                ...cardStyle,
                minWidth: 0,
                padding: 14,
              }}
            >
              {procedureEditor}
            </main>
          </div>
        </div>
      ) : (
        <ListDrawerLayout
          eyebrow="Procedures"
          title="Procedures"
          detail="Create reusable SOPs, preventive-maintenance instructions, and landscaping procedures."
          isMobile={isMobile}
          drawerResetKey={selectedProcedure.id || "procedure-new"}
          drawer={undefined}
          right={
            <button
              type="button"
              onClick={() => createProcedureRecord()}
              style={goldButtonStyle}
            >
              Add Procedure
            </button>
          }
          list={
            <div style={listStyle}>
              {visibleProcedures.map((procedure) => (
                <button
                  key={procedure.id}
                  type="button"
                  onClick={() => {
                    procedureListScrollYRef.current = window.scrollY;
                    setSelectedProcedureId(procedure.id);
                    setProcedureDraftNotes("");
                    setProcedureMessage("");
                  }}
                  style={{
                    ...rowButtonStyle,
                    borderColor:
                      procedure.id === selectedProcedure.id
                        ? colors.gold
                        : colors.line,
                  }}
                >
                  <div>
                    <strong>{procedure.title}</strong>
                    <p style={mutedSmallStyle}>
                      {procedure.area} · {procedure.category || "General"} ·{" "}
                      {procedure.steps.length} steps
                    </p>
                  </div>
                </button>
              ))}
            </div>
          }
        />
      )}

      {isMobile && selectedProcedureId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Procedure editor: ${selectedProcedure.title || "New Procedure"}`}
          onClick={closeProcedureViewer}
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
                {selectedProcedure.title || "New Procedure"}
              </strong>
              <button
                type="button"
                onClick={closeProcedureViewer}
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
                aria-label="Close procedure editor"
              >
                {closeSymbol}
              </button>
            </div>
            <div
              ref={procedureOverlayScrollRef}
              style={{
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                padding: 12,
              }}
            >
              {procedureEditor}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
