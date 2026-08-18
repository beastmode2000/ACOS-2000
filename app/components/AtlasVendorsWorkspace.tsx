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

type LinkedVendorAsset = {
  id: string;
  name: string;
  category: string;
  status: string;
  vendorIds: string[];
};



export default function AtlasVendorsWorkspace(props: any) {
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
    createVendorWorkOrder,
    vendorDepartmentNames,
    vendorDepartmentsFor,
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
  const selectedVendorDepartments = selectedVendor.id
    ? vendorDepartmentsFor(selectedVendor)
    : [];
  const selectedVendorStatus = selectedVendor.vendorStatus || "Preferred";
  const selectedVendorContacts = Array.isArray(selectedVendor.contacts)
    ? selectedVendor.contacts
    : [];
  const primaryVendorContact = selectedVendorContacts.find((contact) => contact.primary) || selectedVendorContacts[0];
  const selectedVendorPhotos = selectedVendor.id
    ? linkedImageFilesFor("Vendor", selectedVendor.id)
    : [];
  const relatedVendorAssets: LinkedVendorAsset[] = selectedVendor.id
    ? [...(assetRecords as LinkedVendorAsset[])]
        .filter((asset) => asset.vendorIds.includes(selectedVendor.id))
        .sort((a, b) => a.name.localeCompare(b.name))
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

  return (
    <ListDrawerLayout
      eyebrow="Property Records"
      title="Vendors"
      isMobile={isMobile}
      drawerResetKey={selectedVendorId || "vendor-new"}
      right={
        <button type="button" onClick={() => addVendor()} style={goldButtonStyle}>
          Add Vendor
        </button>
      }
      list={
        <div style={listStyle}>
          {filteredVendors.map((vendor) => {
            const logo = vendorLogoFor(vendor.id);
            const logoSrc = logo?.dataUrl || logo?.url || "";
            const vendorContacts = Array.isArray(vendor.contacts) ? vendor.contacts : [];
            const primaryContact = vendorContacts.find((contact) => contact.primary) || vendorContacts[0];
            return (
              <button
                key={vendor.id}
                type="button"
                onClick={() => setSelectedVendorId(vendor.id)}
                style={{
                  ...rowButtonStyle,
                  borderColor:
                    vendor.id === selectedVendor.id
                      ? colors.gold
                      : colors.line,
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
                      {vendorDepartmentsFor(vendor)
                        .map((department) => vendorDepartmentNames[department])
                        .join(" · ") || "No department"}
                    </p>
                    <p style={mutedSmallStyle}>
                      {[vendor.phone, vendor.email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {primaryContact ? <p style={mutedSmallStyle}>{primaryContact.name || primaryContact.contactType || "Primary contact"}{primaryContact.cellPhone ? ` · ${primaryContact.cellPhone}` : primaryContact.officePhone ? ` · ${primaryContact.officePhone}` : ""}</p> : null}
                  </div>
                </div>
              </button>
            );
          })}
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
                  {selectedVendorDepartments
                    .map((department) => vendorDepartmentNames[department])
                    .join(" · ") || "No department assigned"}
                  {` · ${selectedVendorStatus}`}
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
                {primaryVendorContact ? <p style={mutedSmallStyle}>Primary: {primaryVendorContact.name || primaryVendorContact.contactType || "Contact"}{primaryVendorContact.cellPhone ? ` · Cell ${primaryVendorContact.cellPhone}` : primaryVendorContact.officePhone ? ` · Office ${primaryVendorContact.officePhone}` : ""}</p> : null}
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
                  Take Logo Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      void addLinkedPhotoFiles("Vendor", selectedVendor.id, selectedVendor.name, event.currentTarget.files, "Vendor Logo");
                      event.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                <label style={compactUploadButtonStyle}>
                  {selectedVendorLogo ? "Change Logo from Library" : "Upload Logo from Library"}
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
                  onChange={(value) => updateVendor({ name: value })}
                />
                <Field
                  label="Category"
                  value={selectedVendor.category}
                  onChange={(value) => updateVendor({ category: value })}
                />
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: colors.navy }}>Status</span>
                  <select value={selectedVendorStatus} onChange={(event) => updateVendor({ vendorStatus: event.currentTarget.value } as any)} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: "10px 11px", background: "#FFFFFF", color: colors.navy }}>
                    <option>Preferred</option>
                    <option>Backup</option>
                    <option>Inactive</option>
                  </select>
                </label>
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

              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                <div style={eyebrowStyle}>Departments</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 7 }}>
                  {Object.entries(vendorDepartmentNames as Record<string, string>).map(([department, label]) => {
                    const checked = selectedVendorDepartments.includes(department);
                    return <label key={department} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${checked ? colors.gold : colors.line}`, borderRadius: 9, padding: "9px 10px", background: checked ? "#FFF8E7" : "#FFFFFF", cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={(event) => { const next = event.currentTarget.checked ? Array.from(new Set([...selectedVendorDepartments, department])) : selectedVendorDepartments.filter((item) => item !== department); updateVendor({ departments: next } as any); }} /><strong style={{ color: colors.navy, fontSize: 13 }}>{String(label)}</strong></label>;
                  })}
                </div>
                <small style={mutedSmallStyle}>A vendor can appear in more than one department. Sunstream is kept in Dock & Waterfront only.</small>
              </div>

              <div style={buttonRowStyle}>
                <button type="button" onClick={() => createVendorWorkOrder(selectedVendor)} style={secondaryButtonStyle}>Create Work Order</button>
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

            <section style={detailSectionStyle}>
              <div style={detailSectionHeaderStyle}>
                <div><div style={eyebrowStyle}>Contacts</div><strong>{selectedVendorContacts.length} saved</strong></div>
                <button type="button" onClick={() => updateVendor({ contacts: [...selectedVendorContacts, { id: `vendor-contact-${Date.now()}`, name: "", role: "", phone: "", officePhone: "", cellPhone: "", email: "", contactType: "Technician", primary: selectedVendorContacts.length === 0, preferredMethod: "Cell", notes: "" }] } as any)} style={secondaryButtonStyle}>Add Contact</button>
              </div>
              {selectedVendorContacts.length ? <div style={{ display: "grid", gap: 9 }}>{selectedVendorContacts.map((contact, index) => <div key={contact.id || index} style={{ border: `1px solid ${contact.primary ? colors.gold : colors.line}`, borderRadius: 10, padding: 10, display: "grid", gap: 9, background: contact.primary ? "#FFFDF6" : "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: colors.navy }}>{contact.name || contact.contactType || `Contact ${index + 1}`}</strong>{contact.primary ? <span style={badgeStyle("Preferred")}>Primary</span> : null}</div>
                <div style={formGridStyle}>
                  <Field label="Name" value={contact.name || ""} onChange={(value) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, name: value } : item) } as any)} />
                  <Field label="Role / Title" value={contact.role || ""} onChange={(value) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, role: value } : item) } as any)} />
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 800, color: colors.navy }}>Contact Type</span><select value={contact.contactType || "Technician"} onChange={(event) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, contactType: event.currentTarget.value } : item) } as any)} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: "10px 11px", background: "#FFFFFF", color: colors.navy }}>{["Office", "Owner", "Manager", "Sales", "Service", "Installation", "Technician", "Billing", "Emergency"].map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 800, color: colors.navy }}>Preferred Contact</span><select value={contact.preferredMethod || "Cell"} onChange={(event) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, preferredMethod: event.currentTarget.value } : item) } as any)} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: "10px 11px", background: "#FFFFFF", color: colors.navy }}><option>Office</option><option>Cell</option><option>Email</option></select></label>
                  <Field label="Office Phone" value={contact.officePhone || ""} onChange={(value) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, officePhone: value } : item) } as any)} />
                  <Field label="Cell Phone" value={contact.cellPhone || contact.phone || ""} onChange={(value) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, cellPhone: value, phone: value } : item) } as any)} />
                  <Field label="Email" value={contact.email || ""} onChange={(value) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, email: value } : item) } as any)} />
                  <Field label="Notes" value={contact.notes || ""} onChange={(value) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => itemIndex === index ? { ...item, notes: value } : item) } as any)} multiline />
                </div>
                <div style={buttonRowStyle}><label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 800, color: colors.navy }}><input type="checkbox" checked={Boolean(contact.primary)} onChange={(event) => updateVendor({ contacts: selectedVendorContacts.map((item, itemIndex) => ({ ...item, primary: event.currentTarget.checked ? itemIndex === index : itemIndex === index ? false : item.primary })) } as any)} />Primary Contact</label><button type="button" onClick={() => updateVendor({ contacts: selectedVendorContacts.filter((_, itemIndex) => itemIndex !== index) } as any)} style={dangerButtonStyle}>Delete Contact</button></div>
              </div>)}</div> : <p style={mutedSmallStyle}>No individual contacts saved.</p>}
            </section>

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
                    Take Photo
                    <input
                      type="file"
                      accept="image/*"
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
                  <label style={compactUploadButtonStyle}>
                    Upload from Library
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        void addLinkedPhotoFiles("Vendor", selectedVendor.id, selectedVendor.name, event.currentTarget.files);
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
              <div style={eyebrowStyle}>Service & Visit History</div>
              {relatedVendorWorkOrders.length ? (
                <div style={compactLinkedListStyle}>
                  {relatedVendorWorkOrders.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(record.id);
                        setScreen("history");
                      }}
                      style={compactLinkedRowStyle}
                    >
                      <span>
                        <strong>{record.title}</strong>
                        <small style={mutedSmallStyle}>
                          {formatDate(record.date)}
                          {record.assetId
                            ? ` · ${assetName(record.assetId)}`
                            : ""}
                        </small>
                        {(record.serviceHistory || []).map((entry) => (
                          <small key={entry.id} style={mutedSmallStyle}>
                            Visit {formatDate(entry.completedAt.slice(0, 10))}
                          </small>
                        ))}
                      </span>
                      <span style={badgeStyle(record.status)}>
                        {record.status}
                      </span>
                    </button>
                  ))}
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
