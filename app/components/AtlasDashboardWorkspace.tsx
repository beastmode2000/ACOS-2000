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



export default function AtlasDashboardWorkspace(props: any) {
  const {
    activePropertyId,
    addAtlasTask,
    createAddisonDashboardTask,
    addDashboardWorkOrder,
    addRoutineNote,
    addRoutinePhoto,
    openDashboardDepartment,
    assetName,
    assetRecords,
    atlasAuditLog,
    buildWorkPlan,
    buttonRowStyle,
    canUseAdminTools,
    checklistDefinitions,
    compactUtilityButtonStyle,
    completeAtlasTask,
    completeWorkOrder,
    completedDashboardRoutineIds,
    currentAtlasUser,
    customDashboardLayouts,
    dashboardAddisonQuickAddRef,
    dashboardCenterView,
    dashboardEditMode,
    dashboardFeedFilter,
    dashboardLayoutId,
    dashboardNickQuickAddRef,
    dashboardPersonFocus,
    dashboardReminderDate,
    dashboardReminderDraft,
    dashboardReminders,
    dashboardRoutineItems,
    dashboardTaskEditorId,
    dashboardVendorVisitId,
    dashboardVendorVisitNote,
    dashboardWeatherDetailDate,
    dashboardWidgetDropTarget,
    dashboardWidgets,
    databaseStatus,
    daySessions,
    daysSince,
    deleteAtlasTask,
    dismissedDashboardFeedIds,
    draggedDashboardWidgetId,
    eyebrowStyle,
    fieldLabelStyle,
    flagRoutineProblem,
    goldButtonStyle,
    inputStyle,
    isAddisonUser,
    isMobile,
    isPatCrewUser,
    isTeamScopedUser,
    landscapeSearch,
    landscapeSeverityFilter,
    landscapeStatusFilter,
    locationName,
    locations,
    mapIconButtonStyle,
    minutesLabel,
    morningBriefOpen,
    mutedSmallStyle,
    noticeStyle,
    openWorkOrderById,
    openTaskById,
    openWorkOrderFilter,
    openDashboardCalendarItem,
    operationsSyncState,
    photos,
    postAtlasRecord,
    prepareWeeklyOwnerUpdate,
    quickCaptureNote,
    quickCreateVendor,
    recordAtlasAudit,
    requestRecords,
    requestTeamAssignmentHelp,
    seasonalItems,
    secondaryButtonStyle,
    sectionStyle,
    selectStyle,
    serviceRecords,
    setCompletedDashboardRoutineIds,
    setCustomDashboardLayouts,
    setDashboardCenterView,
    setDashboardEditMode,
    setDashboardFeedFilter,
    setDashboardLayoutId,
    setDashboardPersonFocus,
    setDashboardReminderDate,
    setDashboardReminderDraft,
    setDashboardReminders,
    setDashboardTaskEditorId,
    setDashboardVendorVisitId,
    setDashboardVendorVisitNote,
    setDashboardWeatherDetailDate,
    setDashboardWidgetDropTarget,
    setDashboardWidgets,
    setDashboardWorkFilter,
    setDaySessions,
    setDismissedDashboardFeedIds,
    setDraggedDashboardWidgetId,
    setLandscapeSearch,
    setLandscapeSeverityFilter,
    setLandscapeStatusFilter,
    setMorningBriefOpen,
    setQuickCaptureMode,
    setQuickCaptureNote,
    setQuickCaptureOpen,
    setQuickCreateKind,
    setQuickCreateName,
    setScreen,
    setSelectedAssetId,
    setSelectedListId,
    setSelectedLocationId,
    setSelectedServiceId,
    setSelectedTaskId,
    setSelectedVehicleId,
    setServiceRecords,
    setShowLandscapeFilters,
    setTaskMeta,
    setTasksView,
    setTodayLogCategory,
    setTodayLogEntries,
    setTodayLogText,
    setWorkOrdersOpenKey,
    showLandscapeFilters,
    showSaveToast,
    staffVisibleServiceRecords,
    syncRoutineAssignment,
    taskDetails,
    teamWorkspace,
    teamDirectory,
    todayEvents,
    todayLogCategory,
    todayLogEntries,
    todayLogText,
    upcomingEvents,
    updateLandscapeAssignment,
    updateAddisonDashboardTask,
    updateTaskDetails,
    updateTeamAssignment,
    updateWorkPlanTask,
    vehicleCare,
    vehicleDueScore,
    vendorRecords,
    weatherDays,
    workPlanDays,
    workPlanTargetHours,
    workPlanTasks
  } = props;
  const [dashboardRoutinePerson, setDashboardRoutinePerson] = useState<"Nick" | "Addison">("Nick");
  const dashboardNotesOpenStorageKey = `atlas-dashboard-notes-open-${activePropertyId}`;
  const [dashboardNotesOpen, setDashboardNotesOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem(`atlas-dashboard-notes-open-${activePropertyId}`);
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(dashboardNotesOpenStorageKey);
      setDashboardNotesOpen(saved === null ? true : saved === "true");
    } catch {
      setDashboardNotesOpen(true);
    }
  }, [dashboardNotesOpenStorageKey]);

  const toggleDashboardNotes = () => {
    setDashboardNotesOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(dashboardNotesOpenStorageKey, String(next));
      } catch {
        // Collapse still works when local storage is unavailable.
      }
      return next;
    });
  };

  const teamSectionStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 18,
    padding: isMobile ? 14 : 18,
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
  };
  const teamCardStyle: React.CSSProperties = {
    minWidth: 0,
    background: "#FFFFFF",
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    padding: isMobile ? 12 : 14,
  };
  const teamEyebrowStyle: React.CSSProperties = {
    color: colors.gold,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: ".09em",
    textTransform: "uppercase",
    marginBottom: 4,
  };
  const teamMutedSmallStyle: React.CSSProperties = {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 1.45,
  };
  const teamGoldButtonStyle: React.CSSProperties = {
    border: `1px solid ${colors.gold}`,
    background: colors.gold,
    color: colors.navy,
    borderRadius: 10,
    padding: "9px 12px",
    fontWeight: 900,
    cursor: "pointer",
  };
  const teamNoticeStyle: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    background: "#FFFFFF",
    borderRadius: 12,
    padding: 13,
    color: colors.muted,
    fontSize: 13,
  };
  if (isTeamScopedUser) {
    const teamOpen = staffVisibleServiceRecords.filter((record) => record.status !== "Completed");
    const teamCompleted = staffVisibleServiceRecords.filter((record) => record.status === "Completed");
    const teamToday = teamOpen.filter((record) => record.date === todayISO());
    const teamOverdue = teamOpen.filter(
      (record) => Boolean(record.date) && String(record.date) < todayISO(),
    );
    const teamUpcoming = teamOpen
      .filter((record) => !record.date || String(record.date) >= todayISO())
      .sort((a, b) =>
        String(a.date || "9999-12-31").localeCompare(
          String(b.date || "9999-12-31"),
        ),
      );
    const teamHighPriority = teamOpen.filter((record) => record.priority === "High");
    const teamWaiting = teamOpen.filter((record) =>
      /waiting|parts|owner|vendor|weather/i.test(String(record.status || "")),
    );

    const assignedChecklistItems = teamOpen.flatMap((record) =>
      Array.isArray((record as AtlasServiceRecord).checklist)
        ? (record as AtlasServiceRecord).checklist!.map((item) => ({
            ...item,
            workOrderId: record.id,
            workOrderTitle: record.title,
          }))
        : [],
    );
    const currentMemberKeys = new Set(
      [
        String(currentAtlasUser?.id || "").trim(),
        String(currentAtlasUser?.email || "").trim().toLowerCase(),
        String(currentAtlasUser?.name || "").trim().toLowerCase(),
        String(currentAtlasUser?.name || "").trim().toLowerCase().split(/\s+/)[0] || "",
      ].filter(Boolean),
    );
    const currentMemberDirectoryEntry = Array.isArray(teamDirectory)
      ? teamDirectory.find((member: any) => {
          const candidates = [
            String(member?.id || "").trim(),
            String(member?.email || "").trim().toLowerCase(),
            String(member?.name || "").trim().toLowerCase(),
            String(member?.name || "").trim().toLowerCase().split(/\s+/)[0] || "",
          ].filter(Boolean);
          return candidates.some((candidate) => currentMemberKeys.has(candidate));
        })
      : null;
    if (currentMemberDirectoryEntry?.id) {
      currentMemberKeys.add(String(currentMemberDirectoryEntry.id));
    }

    const sharedListTasks = workPlanTasks.filter((task) => {
      const meta = taskDetails(task.id) as any;
      if (!meta.listId || task.category === "Atlas List Definition") return false;
      const assigneeIds = Array.isArray(meta.assigneeIds)
        ? meta.assigneeIds.map((value: unknown) => String(value).trim())
        : [];
      const listMemberIds = Array.isArray(meta.listMemberIds)
        ? meta.listMemberIds.map((value: unknown) => String(value).trim())
        : [];
      return [...assigneeIds, ...listMemberIds].some((value) =>
        currentMemberKeys.has(value) ||
        currentMemberKeys.has(value.toLowerCase()),
      );
    });

    const sharedListChecklistItems = sharedListTasks.map((task) => {
      const meta = taskDetails(task.id) as any;
      return {
        id: task.id,
        text: task.title,
        completed: meta.status === "Completed",
        workOrderId: `list-${meta.listId}`,
        workOrderTitle: meta.listName || "Shared List",
        sharedListTaskId: task.id,
      };
    });
    const addisonRoutineFallback = [
      { id: "addison-dog-turf", text: "Clean and inspect the dog turf area", completed: false, workOrderId: "routine", workOrderTitle: "Daily Property Routine" },
      { id: "addison-packages", text: "Check and deliver packages", completed: false, workOrderId: "routine", workOrderTitle: "Daily Property Routine" },
      { id: "addison-garage-garbage", text: "Check garage garbage and disposal areas", completed: false, workOrderId: "routine", workOrderTitle: "Daily Property Routine" },
      { id: "addison-sweep", text: "Sweep primary walkways, patios, and courtyard", completed: false, workOrderId: "routine", workOrderTitle: "Daily Grounds Routine" },
      { id: "addison-pots", text: "Check pots and dry areas for watering needs", completed: false, workOrderId: "routine", workOrderTitle: "Daily Grounds Routine" },
      { id: "addison-fountain", text: "Inspect fountain condition and water level", completed: false, workOrderId: "routine", workOrderTitle: "Daily Grounds Routine" },
      { id: "addison-weeding", text: "Complete assigned weeding and grounds work", completed: false, workOrderId: "routine", workOrderTitle: "Assigned Grounds Work" },
      { id: "addison-final-walk", text: "Complete final property walkthrough and report issues", completed: false, workOrderId: "routine", workOrderTitle: "End-of-Day Check" },
    ];
    const storedRoutineChecklistItems = dashboardRoutineItems.map((item) => ({
      id: item.id,
      text: item.title,
      completed: completedDashboardRoutineIds.includes(item.id),
      workOrderId: "routine",
      workOrderTitle: item.detail || "Daily Routine",
    }));
    const teamChecklistItems = isAddisonUser
      ? [...storedRoutineChecklistItems, ...assignedChecklistItems, ...sharedListChecklistItems].length
        ? [...storedRoutineChecklistItems, ...assignedChecklistItems, ...sharedListChecklistItems]
        : addisonRoutineFallback
      : [...assignedChecklistItems, ...sharedListChecklistItems];
    const completedChecklistCount = teamChecklistItems.filter(
      (item) => item.completed,
    ).length;
    const checklistProgress = teamChecklistItems.length
      ? Math.round(
          (completedChecklistCount / teamChecklistItems.length) * 100,
        )
      : teamCompleted.length + teamOpen.length > 0
        ? Math.round(
            (teamCompleted.length /
              Math.max(1, teamCompleted.length + teamOpen.length)) *
              100,
          )
        : 0;
    const completedToday = teamCompleted.filter(
      (record) => record.lastCompletedDate === todayISO(),
    );
    const dayTotal = teamToday.length + completedToday.length;
    const dayProgress = dayTotal
      ? Math.round((completedToday.length / dayTotal) * 100)
      : 0;

    const landscapeCompletedThisVisit = teamCompleted.filter((record) =>
      String(record.notes || "").includes("LANDSCAPE VISIT: Area completed."),
    );
    const landscapeFollowUp = staffVisibleServiceRecords.filter((record) =>
      String(record.notes || "").includes("LANDSCAPE FOLLOW-UP:"),
    );
    const landscapeSkipped = staffVisibleServiceRecords.filter((record) =>
      String(record.notes || "").includes("LANDSCAPE SKIPPED:"),
    );
    const landscapeWorksheetRecords = [...teamOpen, ...landscapeCompletedThisVisit]
      .filter((record, index, records) =>
        records.findIndex((candidate) => candidate.id === record.id) === index,
      )
      .sort((a, b) => {
        const areaA = String(
          (a as AtlasServiceRecord).responsibilityArea ||
            (a as AtlasServiceRecord).locationId ||
            a.title ||
            "",
        );
        const areaB = String(
          (b as AtlasServiceRecord).responsibilityArea ||
            (b as AtlasServiceRecord).locationId ||
            b.title ||
            "",
        );
        return areaA.localeCompare(areaB);
      });
    const landscapeVisitTotal = landscapeWorksheetRecords.length;
    const landscapeVisitCompleted = landscapeWorksheetRecords.filter(
      (record) => record.status === "Completed",
    ).length;
    const landscapeVisitProgress = landscapeVisitTotal
      ? Math.round((landscapeVisitCompleted / landscapeVisitTotal) * 100)
      : 0;

    const filteredLandscapeWorksheetRecords =
      landscapeWorksheetRecords.filter((record) => {
        const atlasRecord = record as AtlasServiceRecord;
        const areaName = String(
          atlasRecord.responsibilityArea ||
            locationName(atlasRecord.locationId || "") ||
            record.title ||
            "",
        );
        const notes = String(record.notes || "");
        const needsFollowUp = notes.includes("LANDSCAPE FOLLOW-UP:");
        const skipped = notes.includes("LANDSCAPE SKIPPED:");
        const completed = record.status === "Completed";
        const severityMatch = notes.match(
          /WEED SEVERITY:\s*(Low|Medium|High)/i,
        );
        const severity = severityMatch?.[1] || "Not Recorded";
        const searchValue = landscapeSearch.trim().toLowerCase();

        const matchesSearch =
          !searchValue ||
          [
            areaName,
            record.title,
            record.notes,
            record.priority,
            record.status,
            severity,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchValue);

        const matchesStatus =
          landscapeStatusFilter === "All" ||
          (landscapeStatusFilter === "Completed" && completed) ||
          (landscapeStatusFilter === "Needs Follow-up" && needsFollowUp) ||
          (landscapeStatusFilter === "Skipped" && skipped) ||
          (landscapeStatusFilter === "Not Finished" &&
            !completed &&
            !needsFollowUp &&
            !skipped);

        const matchesSeverity =
          landscapeSeverityFilter === "All" ||
          landscapeSeverityFilter === severity;

        return matchesSearch && matchesStatus && matchesSeverity;
      });


    if (isAddisonUser) {
      const todayKey = todayISO();
      const addisonOpenTasks = workPlanTasks
        .filter((task) => {
          const meta = taskDetails(task.id);
          const due = String(meta.dueDate || todayKey);
          return (
            meta.assignee === "Addison" &&
            meta.status !== "Completed" &&
            due <= todayKey &&
            task.category !== "Atlas List Definition"
          );
        })
        .sort((a, b) => {
          const aDate = taskDetails(a.id).dueDate || todayKey;
          const bDate = taskDetails(b.id).dueDate || todayKey;
          return aDate.localeCompare(bDate) || a.title.localeCompare(b.title);
        });

      const addisonCompletedTodayTasks = workPlanTasks.filter((task) => {
        const meta = taskDetails(task.id);
        return (
          meta.assignee === "Addison" &&
          meta.status === "Completed" &&
          (String(meta.completedAt || "").slice(0, 10) === todayKey ||
            Boolean(meta.completionHistory?.includes(todayKey)))
        );
      });

      const addMyTask = () => {
        const title = String(dashboardAddisonQuickAddRef.current?.value || "").trim();
        if (!title) return;
        const taskId = addAtlasTask(title);
        if (!taskId) return;
        updateTaskDetails(taskId, {
          assignee: "Addison",
          dueDate: todayKey,
          status: "Open",
          assignmentScope: "This occurrence",
          completedAt: undefined,
          needsReview: false,
        });
        if (dashboardAddisonQuickAddRef.current) {
          dashboardAddisonQuickAddRef.current.value = "";
          dashboardAddisonQuickAddRef.current.focus();
        }
        showSaveToast("Task added.");
      };

      return (
        <div style={{ display: "grid", gap: 14 }}>
          <section
            style={{
              ...teamSectionStyle,
              background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`,
              color: "#FFFFFF",
            }}
          >
            <SectionHeader
              eyebrow="My Day"
              title="Addison"
              detail="Daily Routine and Daily Tasks"
            />
          </section>

          <section style={teamSectionStyle}>
            <SectionHeader
              eyebrow="My Tasks"
              title="Daily Tasks"
              detail="Today’s changing work."
            />

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, marginBottom: 10 }}>
              <input
                ref={dashboardAddisonQuickAddRef}
                defaultValue=""
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMyTask();
                  }
                }}
                placeholder="Add a task for today…"
                style={inputStyle}
              />
              <button type="button" onClick={addMyTask} style={teamGoldButtonStyle}>
                Add
              </button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {addisonOpenTasks.map((task) => {
                const meta = taskDetails(task.id);
                return (
                  <div key={task.id} style={{ ...teamCardStyle, display: "grid", gap: 7 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={false}
                        aria-label={`Complete ${task.title}`}
                        onChange={() =>
                          updateTaskDetails(task.id, {
                            status: "Completed",
                            completedAt: new Date().toISOString(),
                            completionHistory: Array.from(
                              new Set([...(meta.completionHistory || []), todayKey]),
                            ),
                          })
                        }
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", color: colors.navy }}>{task.title}</strong>
                        <small style={{ color: "#000000", fontWeight: 400, fontSize: 11 }}>
                          {meta.dueDate ? formatDate(meta.dueDate) : "Today"}
                          {task.minutes ? ` · ${minutesLabel(task.minutes)}` : ""}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const title = window.prompt("Edit task", task.title)?.trim();
                          if (!title || title === task.title) return;
                          updateWorkPlanTask(task.id, { title });
                        }}
                        style={compactUtilityButtonStyle}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}

              {!addisonOpenTasks.length ? (
                <div style={teamNoticeStyle}>No tasks are due today.</div>
              ) : null}

              {addisonCompletedTodayTasks.length ? (
                <details>
                  <summary style={{ cursor: "pointer", color: colors.muted, fontWeight: 900 }}>
                    Completed Today · {addisonCompletedTodayTasks.length}
                  </summary>
                  <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
                    {addisonCompletedTodayTasks.map((task) => (
                      <div key={task.id} style={{ ...teamCardStyle, opacity: 0.58 }}>
                        <span style={{ textDecoration: "line-through", color: colors.navy }}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </section>

          <AtlasRoutines
            mode="dashboard"
            isMobile={isMobile}
            activePropertyId={activePropertyId}
            assigneeFilter="Addison"
            defaultTodayAssignee="Addison"
            allowTodayEditing
            employeeView
            teamDirectory={teamDirectory}
            onAddNote={addRoutineNote}
            onFlagProblem={flagRoutineProblem}
          />
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 14 }}>
        <section
          style={{
            ...teamSectionStyle,
            background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`,
            color: "#FFFFFF",
          }}
        >
          <SectionHeader
            eyebrow="Atlas Team Center"
            title={teamWorkspace.title}
            detail={`Welcome ${currentAtlasUser?.name || "Team Member"}. ${teamWorkspace.detail}`}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2,minmax(0,1fr))"
                : "repeat(4,minmax(0,1fr))",
              gap: 8,
            }}
          >
            {[
              ["Assigned", teamOpen.length],
              ["Due Today", teamToday.length],
              ["Overdue", teamOverdue.length],
              ["Completed", teamCompleted.length],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  border: "1px solid rgba(255,255,255,.22)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <span style={{ display: "block", fontSize: 11, opacity: 0.78 }}>
                  {label}
                </span>
                <strong style={{ display: "block", marginTop: 4, fontSize: 25 }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section style={teamSectionStyle}>
          <SectionHeader
            eyebrow="Today"
            title="Daily Progress"
            detail="A quick view of today's completed work and checklist progress."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(2,minmax(0,1fr))",
              gap: 12,
            }}
          >
            <div style={teamCardStyle}>
              <div style={teamEyebrowStyle}>Today's Work</div>
              <strong style={{ color: colors.navy, fontSize: 24 }}>
                {dayProgress}%
              </strong>
              <div
                style={{
                  height: 9,
                  background: colors.panel,
                  borderRadius: 999,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: `${dayProgress}%`,
                    height: "100%",
                    background: colors.gold,
                  }}
                />
              </div>
              <div style={{ ...teamMutedSmallStyle, marginTop: 7 }}>
                {completedToday.length} completed · {teamToday.length} remaining today
              </div>
            </div>
            <div style={teamCardStyle}>
              <div style={teamEyebrowStyle}>Checklist Progress</div>
              <strong style={{ color: colors.navy, fontSize: 24 }}>
                {checklistProgress}%
              </strong>
              <div
                style={{
                  height: 9,
                  background: colors.panel,
                  borderRadius: 999,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: `${checklistProgress}%`,
                    height: "100%",
                    background: colors.gold,
                  }}
                />
              </div>
              <div style={{ ...teamMutedSmallStyle, marginTop: 7 }}>
                {completedChecklistCount} of {teamChecklistItems.length} checklist items complete
              </div>
            </div>
          </div>
        </section>

        {(teamHighPriority.length > 0 || teamWaiting.length > 0) ? (
          <section
            style={{
              ...teamSectionStyle,
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(2,minmax(0,1fr))",
              gap: 10,
            }}
          >
            <div style={{ ...teamCardStyle, padding: 13 }}>
              <div style={teamEyebrowStyle}>Needs Attention</div>
              <strong style={{ color: colors.navy }}>
                {teamHighPriority.length} high-priority assignment
                {teamHighPriority.length === 1 ? "" : "s"}
              </strong>
            </div>
            <div style={{ ...teamCardStyle, padding: 13 }}>
              <div style={teamEyebrowStyle}>Waiting</div>
              <strong style={{ color: colors.navy }}>
                {teamWaiting.length} assignment{teamWaiting.length === 1 ? "" : "s"} waiting
              </strong>
            </div>
          </section>
        ) : null}

        <section style={teamSectionStyle}>
          <SectionHeader
            eyebrow="My Assignments"
            title={teamWorkspace.centerTitle}
            detail="Open an assignment to review details, add notes or photos, update status, and record completion."
          />
          <div style={{ display: "grid", gap: 9 }}>
            {teamUpcoming.length ? (
              teamUpcoming.map((record) => (
                <div
                  key={record.id}
                  style={{ ...teamCardStyle, padding: 13, display: "grid", gap: 9 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={teamEyebrowStyle}>
                        {record.priority} priority · {record.status}
                      </div>
                      <strong
                        style={{
                          display: "block",
                          color: colors.navy,
                          fontSize: 16,
                        }}
                      >
                        {record.title}
                      </strong>
                      <span style={teamMutedSmallStyle}>
                        {record.date ? formatDate(record.date) : "No due date"}
                        {record.assetId ? ` · ${assetName(record.assetId)}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{ ...teamGoldButtonStyle, width: "auto" }}
                      onClick={() => {
                        setSelectedServiceId(record.id);
                        setWorkOrdersOpenKey((current) => current + 1);
                        setScreen("history");
                      }}
                    >
                      Open Assignment
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    {record.status !== "In Progress" ? (
                      <button
                        type="button"
                        style={{ ...teamGoldButtonStyle, width: "auto" }}
                        onClick={() =>
                          void updateTeamAssignment(record, "In Progress")
                        }
                      >
                        Start
                      </button>
                    ) : null}
                    <button
                      type="button"
                      style={{
                        ...teamGoldButtonStyle,
                        width: "auto",
                        background: "#FFFFFF",
                      }}
                      onClick={() =>
                        void updateTeamAssignment(record, "Waiting")
                      }
                    >
                      Waiting
                    </button>
                    <button
                      type="button"
                      style={{
                        ...teamGoldButtonStyle,
                        width: "auto",
                        background: "#FFFFFF",
                      }}
                      onClick={() => void requestTeamAssignmentHelp(record)}
                    >
                      Need Help
                    </button>
                    <button
                      type="button"
                      style={{ ...teamGoldButtonStyle, width: "auto" }}
                      onClick={() =>
                        void updateTeamAssignment(record, "Completed")
                      }
                    >
                      Complete
                    </button>
                  </div>
                  {record.notes ? (
                    <div style={{ ...teamMutedSmallStyle, lineHeight: 1.5 }}>
                      {record.notes}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div style={teamNoticeStyle}>{teamWorkspace.emptyMessage}</div>
            )}
          </div>
        </section>

        {sharedListTasks.length ? (
          <section style={teamSectionStyle}>
            <SectionHeader
              eyebrow="Shared Lists"
              title="Collaborative Checklists"
              detail="Everyone assigned to a shared list sees the same completion state."
            />
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from(
                new Set<string>(
                  sharedListTasks.map((task) => {
                    const meta = taskDetails(task.id) as any;
                    return String(meta.listId || "");
                  }).filter(Boolean),
                ),
              ).map((listId: string) => {
                const listTasks = sharedListTasks.filter((task) => {
                  const meta = taskDetails(task.id) as any;
                  return String(meta.listId || "") === listId;
                });
                const listName =
                  String((taskDetails(listTasks[0]?.id || "") as any).listName || "Shared List");
                const completed = listTasks.filter(
                  (task) => (taskDetails(task.id) as any).status === "Completed",
                ).length;

                return (
                  <div key={listId} style={{ ...teamCardStyle, padding: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ color: colors.navy }}>{listName}</strong>
                        <div style={teamMutedSmallStyle}>
                          {completed} of {listTasks.length} complete
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
                      {listTasks.map((task) => {
                        const meta = taskDetails(task.id) as any;
                        const completedTask = meta.status === "Completed";
                        return (
                          <label
                            key={task.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto minmax(0,1fr)",
                              gap: 9,
                              alignItems: "center",
                              padding: "8px 9px",
                              border: `1px solid ${colors.line}`,
                              borderRadius: 9,
                              background: completedTask ? "#F0FAF5" : "#FFFFFF",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={completedTask}
                              onChange={(event) =>
                                event.currentTarget.checked
                                  ? completeAtlasTask(task)
                                  : updateTaskDetails(task.id, {
                                      status: "Open",
                                      completedAt: undefined,
                                    })
                              }
                            />
                            <span style={{ color: colors.navy, textDecoration: completedTask ? "line-through" : "none" }}>
                              {task.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {isPatCrewUser ? (
          <section style={teamSectionStyle}>
            <SectionHeader
              eyebrow="Pat's Crew"
              title="Weekly Landscaping Worksheet"
              detail="Work through each assigned area, record severity and notes, flag follow-up, and mark the area complete."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2,minmax(0,1fr))"
                  : "repeat(4,minmax(0,1fr))",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {[
                ["Visit Progress", `${landscapeVisitProgress}%`],
                ["Areas Complete", landscapeVisitCompleted],
                ["Needs Follow-up", landscapeFollowUp.length],
                ["Skipped", landscapeSkipped.length],
              ].map(([label, value]) => (
                <div key={String(label)} style={teamCardStyle}>
                  <div style={teamEyebrowStyle}>{label}</div>
                  <strong style={{ color: colors.navy, fontSize: 22 }}>
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                height: 10,
                background: colors.panel,
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: `${landscapeVisitProgress}%`,
                  height: "100%",
                  background: colors.gold,
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <button
                type="button"
                style={{
                  ...teamGoldButtonStyle,
                  width: "auto",
                  background: "#FFFFFF",
                }}
                onClick={() => setShowLandscapeFilters((current) => !current)}
              >
                {showLandscapeFilters ? "Hide Filters" : "Show Filters"}
              </button>
              <div style={teamMutedSmallStyle}>
                Showing {filteredLandscapeWorksheetRecords.length} of{" "}
                {landscapeWorksheetRecords.length} areas
              </div>
            </div>

            {showLandscapeFilters ? (
              <div
                style={{
                  ...teamCardStyle,
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "minmax(180px,1.4fr) minmax(150px,1fr) minmax(150px,1fr) auto",
                  gap: 8,
                  marginBottom: 12,
                  alignItems: "end",
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Search Areas
                  </span>
                  <input
                    value={landscapeSearch}
                    onChange={(event) => setLandscapeSearch(event.target.value)}
                    placeholder="Area, work, note, priority..."
                    style={{
                      width: "100%",
                      minHeight: 42,
                      borderRadius: 10,
                      border: `1px solid ${colors.line}`,
                      padding: "9px 11px",
                      background: "#FFFFFF",
                      color: colors.text,
                    }}
                  />
                </label>

                <SelectField
                  label="Status Filter"
                  value={landscapeStatusFilter}
                  onChange={(value) =>
                    setLandscapeStatusFilter(
                      value as
                        | "All"
                        | "Not Finished"
                        | "Completed"
                        | "Needs Follow-up"
                        | "Skipped",
                    )
                  }
                  options={[
                    "All",
                    "Not Finished",
                    "Completed",
                    "Needs Follow-up",
                    "Skipped",
                  ]}
                />

                <SelectField
                  label="Severity Filter"
                  value={landscapeSeverityFilter}
                  onChange={(value) =>
                    setLandscapeSeverityFilter(
                      value as
                        | "All"
                        | "Low"
                        | "Medium"
                        | "High"
                        | "Not Recorded",
                    )
                  }
                  options={[
                    "All",
                    "Low",
                    "Medium",
                    "High",
                    "Not Recorded",
                  ]}
                />

                <button
                  type="button"
                  style={{ ...teamGoldButtonStyle, width: "auto" }}
                  onClick={() => {
                    setLandscapeSearch("");
                    setLandscapeStatusFilter("All");
                    setLandscapeSeverityFilter("All");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              {filteredLandscapeWorksheetRecords.length ? (
                filteredLandscapeWorksheetRecords.map((record) => {
                  const atlasRecord = record as AtlasServiceRecord;
                  const areaName =
                    atlasRecord.responsibilityArea ||
                    locationName(atlasRecord.locationId || "") ||
                    record.title;
                  const completed = record.status === "Completed";
                  const needsFollowUp = String(record.notes || "").includes(
                    "LANDSCAPE FOLLOW-UP:",
                  );
                  const skipped = String(record.notes || "").includes(
                    "LANDSCAPE SKIPPED:",
                  );
                  const severityMatch = String(record.notes || "").match(
                    /WEED SEVERITY:\s*(Low|Medium|High)/i,
                  );
                  const severity = severityMatch?.[1] || "Not recorded";

                  return (
                    <div
                      key={`landscape-${record.id}`}
                      style={{
                        ...teamCardStyle,
                        display: "grid",
                        gap: 10,
                        borderColor: completed
                          ? "#BDE7D2"
                          : needsFollowUp
                            ? "#FFD8A8"
                            : colors.line,
                        background: completed
                          ? "#F4FBF7"
                          : needsFollowUp
                            ? "#FFF9F0"
                            : "#FFFFFF",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={teamEyebrowStyle}>
                            {completed
                              ? "Completed"
                              : needsFollowUp
                                ? "Needs Follow-up"
                                : skipped
                                  ? "Skipped"
                                  : "Not Finished"}
                          </div>
                          <strong
                            style={{
                              color: colors.navy,
                              fontSize: 17,
                              display: "block",
                            }}
                          >
                            {areaName}
                          </strong>
                          {areaName !== record.title ? (
                            <div style={teamMutedSmallStyle}>{record.title}</div>
                          ) : null}
                        </div>
                        <span style={badgeStyle(completed ? "Completed" : record.status)}>
                          {completed ? "Finished" : record.status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(3,minmax(0,1fr))",
                          gap: 7,
                        }}
                      >
                        <div style={teamNoticeStyle}>
                          <div style={teamEyebrowStyle}>Weed Severity</div>
                          <strong style={{ color: colors.navy }}>{severity}</strong>
                        </div>
                        <div style={teamNoticeStyle}>
                          <div style={teamEyebrowStyle}>Due</div>
                          <strong style={{ color: colors.navy }}>
                            {record.date ? formatDate(record.date) : "This visit"}
                          </strong>
                        </div>
                        <div style={teamNoticeStyle}>
                          <div style={teamEyebrowStyle}>Priority</div>
                          <strong style={{ color: colors.navy }}>
                            {record.priority}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          style={{ ...teamGoldButtonStyle, width: "auto" }}
                          onClick={() =>
                            void updateLandscapeAssignment(record, "Complete")
                          }
                        >
                          Complete Area
                        </button>
                        <button
                          type="button"
                          style={{
                            ...teamGoldButtonStyle,
                            width: "auto",
                            background: "#FFFFFF",
                          }}
                          onClick={() =>
                            void updateLandscapeAssignment(record, "Severity")
                          }
                        >
                          Weed Severity
                        </button>
                        <button
                          type="button"
                          style={{
                            ...teamGoldButtonStyle,
                            width: "auto",
                            background: "#FFFFFF",
                          }}
                          onClick={() =>
                            void updateLandscapeAssignment(record, "Crew Note")
                          }
                        >
                          Crew Note
                        </button>
                        <button
                          type="button"
                          style={{
                            ...teamGoldButtonStyle,
                            width: "auto",
                            background: "#FFFFFF",
                          }}
                          onClick={() =>
                            void updateLandscapeAssignment(record, "Follow Up")
                          }
                        >
                          Needs Follow-up
                        </button>
                        <button
                          type="button"
                          style={{
                            ...teamGoldButtonStyle,
                            width: "auto",
                            background: "#FFFFFF",
                          }}
                          onClick={() =>
                            void updateLandscapeAssignment(record, "Skip")
                          }
                        >
                          Skip This Visit
                        </button>
                        <button
                          type="button"
                          style={{
                            ...teamGoldButtonStyle,
                            width: "auto",
                            background: "#FFFFFF",
                          }}
                          onClick={() => {
                            setSelectedServiceId(record.id);
                            setScreen("history");
                          }}
                        >
                          Photos & Details
                        </button>
                        <button
                          type="button"
                          style={{
                            ...teamGoldButtonStyle,
                            width: "auto",
                            background: "#FFFFFF",
                          }}
                          onClick={() => {
                            setSelectedServiceId(record.id);
                            setScreen("history");
                          }}
                        >
                          Edit Assignment
                        </button>
                      </div>

                      {record.notes ? (
                        <div
                          style={{
                            ...teamMutedSmallStyle,
                            whiteSpace: "pre-wrap",
                            borderTop: `1px solid ${colors.line}`,
                            paddingTop: 9,
                          }}
                        >
                          {record.notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div style={teamNoticeStyle}>
                  {landscapeWorksheetRecords.length
                    ? "No landscaping areas match the current filters."
                    : "Assigned landscaping areas will appear here as soon as work orders are assigned to Pat's Crew."}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {isAddisonUser ? (
          <section style={teamSectionStyle}>
            <SectionHeader
              eyebrow="Addison Routine"
              title="Daily Checklist"
              detail="Checklist items attached to Addison's assigned work orders."
            />
            <div style={{ display: "grid", gap: 8 }}>
              {teamChecklistItems.length ? (
                teamChecklistItems.map((item) => (
                  <div
                    key={`${item.workOrderId}-${item.id}`}
                    style={{
                      ...teamCardStyle,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                        border: `1px solid ${item.completed ? colors.gold : colors.line}`,
                        background: item.completed ? colors.gold : "#FFFFFF",
                        color: colors.navy,
                        fontWeight: 900,
                      }}
                    >
                      {item.completed ? "✓" : ""}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: colors.navy }}>
                        {item.text}
                      </strong>
                      <div style={teamMutedSmallStyle}>
                        {item.workOrderTitle}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={teamNoticeStyle}>
                  Addison's checklist will appear when checklist items are added
                  to his assigned work orders.
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section style={teamSectionStyle}>
          <SectionHeader
            eyebrow="End of Day"
            title="Today's Summary"
            detail="A live summary of completed, remaining, overdue, and waiting assignments."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2,minmax(0,1fr))"
                : "repeat(4,minmax(0,1fr))",
              gap: 8,
            }}
          >
            {[
              ["Completed Today", completedToday.length],
              ["Still Due Today", teamToday.length],
              ["Overdue", teamOverdue.length],
              ["Waiting", teamWaiting.length],
            ].map(([label, value]) => (
              <div key={String(label)} style={teamCardStyle}>
                <div style={teamEyebrowStyle}>{label}</div>
                <strong style={{ color: colors.navy, fontSize: 22 }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section style={teamSectionStyle}>
          <SectionHeader
            eyebrow="Recent Activity"
            title="Completed Work"
            detail="Your most recently completed Atlas assignments."
          />
          <div style={{ display: "grid", gap: 8 }}>
            {teamCompleted.slice(0, 8).map((record) => (
              <div key={record.id} style={{ ...teamCardStyle, padding: 11 }}>
                <strong style={{ color: colors.navy }}>{record.title}</strong>
                <div style={teamMutedSmallStyle}>
                  {record.lastCompletedDate
                    ? formatDate(record.lastCompletedDate)
                    : "Completed"}
                </div>
              </div>
            ))}
            {!teamCompleted.length ? (
              <div style={teamNoticeStyle}>
                Completed assignments will appear here.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }
  const today = todayISO();
  const activeProperty = atlasProperties.find((property) => property.id === activePropertyId) || atlasProperties[0];
  const openWork = serviceRecords.filter((record) => String(record.status || "Open") !== "Completed");
  const completedWork = serviceRecords.filter((record) => String(record.status || "") === "Completed");
  const dueToday = openWork.filter((record) => record.date === today);
  const overdueWork = openWork.filter((record) => Boolean(record.date) && String(record.date) < today);
  const highPriority = openWork.filter((record) => String(record.priority || "") === "High");
  const activeRequests = requestRecords.filter((request) => !["Converted to Work Order", "Closed", "Declined"].includes(String(request.status || "")));
  const todaysWeather = weatherDays.find((day) => day.date === today) || weatherDays[0];
  const vendorEvents = [...todayEvents, ...upcomingEvents].filter((item) => {
    const text = `${item.linkedType || ""} ${item.categoryLabel || ""} ${item.area || ""} ${item.title || ""}`.toLowerCase();
    return text.includes("vendor") || item.linkedType === "Vendor";
  }).slice(0, 6);
  const priorityRank = (record: ServiceRecord) => record.priority === "High" ? 0 : record.priority === "Medium" ? 1 : 2;
  const todaysWork = [...dueToday].sort((a, b) => priorityRank(a) - priorityRank(b) || String(a.title || "").localeCompare(String(b.title || ""))).slice(0, 6);
  const completedTodayOccurrences = serviceRecords.flatMap((record) =>
    (record.serviceHistory || [])
      .filter((entry) => String(entry.completedAt || "").slice(0, 10) === today)
      .map((entry) => ({ record, entry })),
  ).slice(0, 6);
  const nextSevenDaysEnd = new Date(`${today}T12:00:00`);
  nextSevenDaysEnd.setDate(nextSevenDaysEnd.getDate() + 7);
  const nextSevenDaysISO = nextSevenDaysEnd.toISOString().slice(0, 10);
  const upcomingWork = openWork
    .filter((record) => Boolean(record.date) && String(record.date) > today && String(record.date) <= nextSevenDaysISO)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || priorityRank(a) - priorityRank(b))
    .slice(0, 6);
  const todaysRequests = activeRequests.filter((request) => String(request.submittedAt || "").slice(0, 10) === today || String(request.preferredTiming || "").toLowerCase().includes("today")).slice(0, 4);
  const todaysLogEntries = todayLogEntries.filter((entry) => entry.date === today && entry.propertyId === activePropertyId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const scheduledRoutineEvents = todayEvents.filter((item) => Boolean((item as CalendarItem & { recurring?: boolean }).recurring));
  const nonRoutineTodayEvents = todayEvents.filter((item) => !Boolean((item as CalendarItem & { recurring?: boolean }).recurring));
  const visibleRoutineItems: DashboardRoutineItem[] = dashboardRoutineItems.length ? dashboardRoutineItems : scheduledRoutineEvents.map((item) => ({ id: String(item.instanceId || item.id), title: item.title, detail: item.categoryLabel || item.area || "Recurring routine", time: item.time || "" }));

  const addTodayLogEntry = () => {
    const text = todayLogText.trim();
    if (!text) return;
    setTodayLogEntries((current) => [{ id: uid("today-log"), propertyId: activePropertyId, date: today, category: todayLogCategory, text, createdAt: new Date().toISOString() }, ...current]);
    setTodayLogText("");
    showSaveToast("Added to today’s log.");
  };

  const logDashboardVendorVisit = () => {
    const vendor = vendorRecords.find((item) => item.id === dashboardVendorVisitId);
    const note = dashboardVendorVisitNote.trim();
    if (!vendor && !note) return;
    const text = vendor ? `${vendor.name}${note ? ` — ${note}` : " visited onsite"}` : note;
    setTodayLogEntries((current) => [{ id: uid("vendor-visit"), propertyId: activePropertyId, date: today, category: "Vendor", text, createdAt: new Date().toISOString() }, ...current]);
    setDashboardVendorVisitId("");
    setDashboardVendorVisitNote("");
    showSaveToast("Vendor visit logged.");
  };

  const completionTime = (record: AtlasServiceRecord) => {
    const values = [record.lastCompletedDate, ...(record.completionHistory || []), ...(record.serviceHistory || []).map((entry) => entry.completedAt)]
      .map((value) => new Date(String(value || "")).getTime()).filter(Number.isFinite);
    return values.length ? Math.max(...values) : 0;
  };
  const recentActivity = [...completedWork].map((record) => record as AtlasServiceRecord).sort((a, b) => completionTime(b) - completionTime(a)).slice(0, 6);
  const recentHistoryCutoff = new Date(`${today}T00:00:00`);
  recentHistoryCutoff.setDate(recentHistoryCutoff.getDate() - 14);
  const recentCompletedHistory = serviceRecords
    .flatMap((record) => (record.serviceHistory || []).map((entry) => ({ record, entry, completedAt: String(entry.completedAt || "") })))
    .filter((item) => {
      const completedAt = new Date(item.completedAt).getTime();
      return Number.isFinite(completedAt) && completedAt >= recentHistoryCutoff.getTime();
    })
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 20);
  type DashboardFeedItem = { id: string; type: "Work" | "Requests" | "Vendors" | "Photos" | "Alerts"; title: string; detail: string; at: string; icon: string; tone: "green" | "gold" | "red" | "blue"; action: () => void; actionLabel: string };
  const recentFeedCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentFeedFutureLimit = Date.now() + 24 * 60 * 60 * 1000;
  const dashboardFeedItems: DashboardFeedItem[] = [
    ...completedWork.filter((record) => completionTime(record as AtlasServiceRecord) > 0).map((record) => ({ id: `feed-complete-${record.id}`, type: "Work" as const, title: record.title || "Work completed", detail: `${(record as AtlasServiceRecord).workCategory || "Work order"} completed`, at: new Date(completionTime(record as AtlasServiceRecord)).toISOString(), icon: "✓", tone: "green" as const, action: () => openWorkOrderById(record.id), actionLabel: "Open" })),
    ...workPlanTasks.filter((task) => { const meta = taskDetails(task.id); return meta.completedAt?.slice(0,10) === today || meta.completionHistory?.includes(today); }).map((task) => { const meta = taskDetails(task.id); return ({ id: `feed-task-complete-${task.id}-${today}`, type: "Work" as const, title: task.title || "Task completed", detail: `Checklist completed${meta.assignee && meta.assignee !== "Unassigned" ? ` · ${meta.assignee}` : ""}`, at: meta.completedAt?.slice(0,10) === today ? meta.completedAt : `${today}T12:00:00`, icon: "✓", tone: "green" as const, action: () => { openTaskById(task.id); }, actionLabel: "Open" }); }),
    ...visibleRoutineItems.filter((item) => completedDashboardRoutineIds.includes(item.id)).map((item, index) => ({ id: `feed-routine-complete-${item.id}-${today}`, type: "Work" as const, title: item.title || "Routine item completed", detail: "Routine checklist completed", at: `${today}T12:${String(index).padStart(2,"0")}:00`, icon: "✓", tone: "green" as const, action: () => setScreen("routines"), actionLabel: "Routine" })),
    ...openWork.filter((record) => Boolean(record.date) && String(record.date) < today).map((record) => ({ id: `feed-overdue-${record.id}`, type: "Alerts" as const, title: record.title || "Overdue work", detail: `Overdue since ${new Date(`${record.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}`, at: `${record.date || today}T12:00:00`, icon: "!", tone: "red" as const, action: () => openWorkOrderById(record.id), actionLabel: "Review" })),
    ...activeRequests.filter((request) => Boolean(request.submittedAt)).map((request) => ({ id: `feed-request-${request.id}`, type: "Requests" as const, title: request.title || "New request", detail: `${request.requesterName || "Property request"} · ${request.status || "Open"}`, at: String(request.submittedAt), icon: "↗", tone: "gold" as const, action: () => setScreen("requests"), actionLabel: "Open" })),
    ...vendorEvents.filter((item) => Boolean(item.date) && String(item.date) <= today).map((item) => ({ id: `feed-vendor-${item.instanceId || item.id}`, type: "Vendors" as const, title: item.title || "Vendor activity", detail: `${item.date === today ? "Today" : new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}${item.time ? ` · ${item.time}` : ""}`, at: `${item.date}T${item.time || "12:00"}:00`, icon: "V", tone: "blue" as const, action: () => openDashboardCalendarItem(item), actionLabel: "Open" })),
    ...todaysLogEntries.map((entry) => ({ id: `feed-log-${entry.id}`, type: entry.category === "Vendor" ? "Vendors" as const : "Work" as const, title: entry.text, detail: `Today’s log · ${entry.category}`, at: entry.createdAt, icon: entry.category === "Vendor" ? "V" : "•", tone: "blue" as const, action: () => setScreen("dashboard"), actionLabel: "View" })),
    ...photos.filter((photo) => Boolean(photo.createdAt)).slice().sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,12).map((photo) => ({ id: `feed-photo-${photo.id}`, type: "Photos" as const, title: photo.name || "Photo added", detail: `${assetName(photo.assetId || "") || "General property"} · Photo added`, at: String(photo.createdAt), icon: "▧", tone: "blue" as const, action: () => setScreen("timeline"), actionLabel: "Timeline" })),
  ].filter((item) => {
    if (dismissedDashboardFeedIds.includes(item.id)) return false;
    const timestamp = new Date(item.at).getTime();
    if (!Number.isFinite(timestamp)) return false;
    return item.type === "Alerts" || (timestamp >= recentFeedCutoff && timestamp <= recentFeedFutureLimit);
  }).sort((a,b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const filteredDashboardFeed = dashboardFeedItems.filter((item) => dashboardFeedFilter === "All" || item.type === dashboardFeedFilter).slice(0, 10);
  const dashboardFeedCounts = (["All","Work","Requests","Vendors","Photos","Alerts"] as const).reduce((counts,key) => ({ ...counts, [key]: key === "All" ? dashboardFeedItems.length : dashboardFeedItems.filter((item) => item.type === key).length }), {} as Record<"All" | "Work" | "Requests" | "Vendors" | "Photos" | "Alerts", number>);
  const statusDefinitions = [
    { label: "Maintenance", query: "maintenance", terms: ["maintenance", "electrical", "plumbing", "hvac", "repair"], icon: "🔧" },
    { label: "Landscaping", query: "landscaping", terms: ["landscap", "grounds", "weeding", "lawn", "garden"], icon: "🌿" },
    { label: "Irrigation", query: "irrigation", terms: ["irrigation", "hydrawise", "sprinkler", "watering"], icon: "🚿" },
    { label: "Pool & Spa", query: "pool", terms: ["pool", "spa", "hot tub", "fountain"], icon: "💧" },
    { label: "Dock & Marine", query: "dock", terms: ["dock", "marine", "boat", "seadoo", "sea-doo", "cobalt", "lift"], icon: "🚤" },
    { label: "Vehicles", query: "vehicles", terms: ["vehicle", "garage", "car", "truck"], icon: "🚗" },
    { label: "House", query: "house", terms: ["house", "room", "interior", "exterior", "appliance"], icon: "🏠" },
    { label: "Safety", query: "safety", terms: ["safety", "alarm", "generator", "emergency", "inspection"], icon: "⚠" },
  ];
  const healthCategories = statusDefinitions.map((definition) => {
    const matches = (record: ServiceRecord) => definition.terms.some((term) => `${(record as AtlasServiceRecord).workCategory || ""} ${(record as AtlasServiceRecord).responsibilityArea || ""} ${record.title || ""} ${record.notes || ""}`.toLowerCase().includes(term));
    const matchingOpen = openWork.filter(matches);
    const matchingCompleted = completedWork.filter(matches);
    const overdue = matchingOpen.filter((record) => Boolean(record.date) && String(record.date) < today);
    const due = matchingOpen.filter((record) => record.date === today);
    const urgent = matchingOpen.filter((record) => record.priority === "High");
    const recentCompleted = matchingCompleted.filter((record) => {
      const completedAt = completionTime(record as AtlasServiceRecord);
      return completedAt > 0 && Date.now() - completedAt <= 30 * 24 * 60 * 60 * 1000;
    });
    const score = Math.max(35, Math.min(100, 100 - overdue.length * 12 - urgent.length * 7 - due.length * 3 - Math.max(0, matchingOpen.length - 4) * 2));
    const status = score >= 88 ? "Healthy" : score >= 70 ? "Attention" : "Critical";
    const trend = recentCompleted.length > overdue.length ? "Improving" : overdue.length > recentCompleted.length ? "Declining" : "Steady";
    const reason = overdue.length
      ? `${overdue.length} overdue item${overdue.length === 1 ? "" : "s"}${urgent.length ? ` · ${urgent.length} high priority` : ""}`
      : urgent.length
        ? `${urgent.length} high-priority item${urgent.length === 1 ? "" : "s"} open`
        : matchingOpen.length
          ? `${matchingOpen.length} open item${matchingOpen.length === 1 ? "" : "s"} · no overdue work`
          : "No open issues detected";
    return { ...definition, score, status, trend, reason, count: matchingOpen.length, overdue: overdue.length, urgent: urgent.length, matchingOpen };
  });
  const estateHealth = Math.round(healthCategories.reduce((sum, category) => sum + category.score, 0) / Math.max(1, healthCategories.length));
  const liveStatuses = healthCategories.map((category) => ({ ...category, status: category.status }));
  const estateNeedsAttention = healthCategories
    .flatMap((category) => category.matchingOpen.map((record) => ({ category, record })))
    .sort((a, b) => {
      const aOverdue = Boolean(a.record.date) && String(a.record.date) < today ? 0 : 1;
      const bOverdue = Boolean(b.record.date) && String(b.record.date) < today ? 0 : 1;
      return aOverdue - bOverdue || priorityRank(a.record) - priorityRank(b.record) || String(a.record.date || "9999-12-31").localeCompare(String(b.record.date || "9999-12-31"));
    })
    .slice(0, 4);
  const completedRoutineCount = visibleRoutineItems.filter((item) => completedDashboardRoutineIds.includes(item.id)).length;
  const routineProgress = visibleRoutineItems.length ? Math.round((completedRoutineCount / visibleRoutineItems.length) * 100) : 0;
  const scheduledCount = dueToday.length + nonRoutineTodayEvents.length + todaysRequests.length;
  const briefLines = [
    visibleRoutineItems.length ? `${visibleRoutineItems.length} routine item${visibleRoutineItems.length === 1 ? "" : "s"}` : "",
    scheduledCount ? `${scheduledCount} scheduled today` : "",
    overdueWork.length ? `${overdueWork.length} overdue` : "",
    vendorEvents.length ? `${vendorEvents.length} vendor visit${vendorEvents.length === 1 ? "" : "s"}` : "",
    todaysWeather ? weatherText(Number(todaysWeather.code || 0)) : "",
  ].filter(Boolean);

  type DailyFocusPlan = {
    title: string;
    detail: string;
    keywords: string[];
    suggested: string[];
  };

  const dayName = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" });
  const weeklyFocus: Record<string, DailyFocusPlan> = {
    Monday: {
      title: "Reset, planning, and first mowing window",
      detail: "Reset the property after the weekend, review new work, clean support spaces, and use the first suitable mowing and edging window.",
      keywords: ["reset", "plan", "mow", "edge", "basement", "bathroom", "tool", "supply", "inventory", "package", "garbage"],
      suggested: ["Daily opening property check", "Packages, garage garbage, and dog turf", "First mow and edge when conditions allow", "Basement bathroom and indoor tool-area reset"],
    },
    Tuesday: {
      title: "Grounds, lawn, and irrigation",
      detail: "Prioritize irrigation, lawns, dry spots, beds, vendor coordination, and one flexible vehicle-care slot.",
      keywords: ["irrigation", "hydrawise", "lawn", "grounds", "water", "dry spot", "bed", "landscape", "vehicle", "wash"],
      suggested: ["Irrigation and dry-spot inspection", "Grounds and lawn walkthrough", "Courtyard and walkway cleanup", "Vehicle-care rotation if time allows"],
    },
    Wednesday: {
      title: "Landscape day",
      detail: "Use the main work block for landscape appearance, beds, pruning, weeds, fountain, courtyard, and pool or spa checks. Mowing remains on its own twice-weekly rhythm.",
      keywords: ["landscape", "weed", "prune", "bed", "fountain", "courtyard", "pool", "spa", "plant", "pot", "water"],
      suggested: ["Detailed landscape walkthrough", "Beds, weeds, pruning, pots, and dry spots", "Pool, spa, fountain, and courtyard checks", "Landscape follow-ups and photo notes"],
    },
    Thursday: {
      title: "Vehicles, dock, and recreation",
      detail: "Focus on the waterfront, boat, Sea-Doo, lifts, vehicle-care rotation, and the second mowing and edging window when needed.",
      keywords: ["dock", "boat", "seadoo", "sea-doo", "lift", "waterfront", "vehicle", "mercedes", "rivian", "porsche", "lucid", "ford", "kia", "honda", "subaru", "mow", "edge"],
      suggested: ["Boat and Sea-Doo cleaning", "Dock, lift, and waterfront inspection", "Clean the highest-priority vehicles currently onsite", "Second mow and edge when conditions allow"],
    },
    Friday: {
      title: "Readiness, closeout, and final walkthrough",
      detail: "Finish open small work, prepare the estate for the weekend, reset work areas, and document anything that carries into next week.",
      keywords: ["walkthrough", "pool", "spa", "walkway", "stair", "reset", "tool", "clean", "ready", "close", "photo", "note"],
      suggested: ["Final property walkthrough", "Pool and spa readiness check", "Walkways, staircases, and work-area reset", "Update notes, photos, and next week’s priorities"],
    },
    Saturday: { title: "Essential checks only", detail: "Keep the plan light and surface only urgent, owner-requested, or safety-related work.", keywords: ["urgent", "safety", "owner", "pool", "spa"], suggested: ["Essential property check", "Urgent or owner-requested items only"] },
    Sunday: { title: "Essential checks only", detail: "Keep the plan light and surface only urgent, owner-requested, or safety-related work.", keywords: ["urgent", "safety", "owner", "pool", "spa"], suggested: ["Essential property check", "Urgent or owner-requested items only"] },
  };
  const todayFocus = weeklyFocus[dayName] || weeklyFocus.Monday;
  const dailyBaseline = ["Opening property check", "Dog turf, packages, and garage garbage"];
  const workSearchText = (record: AtlasServiceRecord) => `${record.title || ""} ${record.workCategory || ""} ${record.responsibilityArea || ""} ${record.notes || ""}`.toLowerCase();
  const themeMatchScore = (record: AtlasServiceRecord) => todayFocus.keywords.reduce((score, keyword) => score + (workSearchText(record).includes(keyword) ? 1 : 0), 0);
  const guidedTodaysWork = [...todaysWork].sort((a, b) => themeMatchScore(b as AtlasServiceRecord) - themeMatchScore(a as AtlasServiceRecord) || priorityRank(a) - priorityRank(b) || String(a.title || "").localeCompare(String(b.title || "")));
  const dashboardOpenTasks = workPlanTasks.filter((task) => task.category !== "Atlas List Definition" && !taskDetails(task.id).listId && taskDetails(task.id).status !== "Completed");
  const dashboardTodayTasks = dashboardOpenTasks.filter((task) => {
    const meta = taskDetails(task.id);
    return !meta.dueDate || meta.dueDate <= today;
  }).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]));
  const dashboardUpcomingTasks = dashboardOpenTasks.filter((task) => {
    const date = taskDetails(task.id).dueDate;
    return date > today && date <= addDays(today, 7);
  }).sort((a, b) => taskDetails(a.id).dueDate.localeCompare(taskDetails(b.id).dueDate));
  const mustDoTasks = dashboardTodayTasks.filter((task) => task.priority === "High" || taskDetails(task.id).dueDate < today || taskDetails(task.id).status === "Blocked");
  const shouldDoTasks = dashboardTodayTasks.filter((task) => !mustDoTasks.some((item) => item.id === task.id) && task.priority === "Medium");
  const ifTimeTasks = dashboardTodayTasks.filter((task) => !mustDoTasks.some((item) => item.id === task.id) && !shouldDoTasks.some((item) => item.id === task.id));
  const delegatedTodayTasks = dashboardTodayTasks.filter((task) => taskDetails(task.id).assignee === "Addison");
  const waitingTodayTasks = dashboardTodayTasks.filter((task) => ["Waiting", "Blocked"].includes(taskDetails(task.id).status));
  const addisonKeywords = ["weed", "dog turf", "fountain", "sweep", "pot", "dry spot", "water plants", "walkway", "stair", "clean", "wash", "tool area", "courtyard", "landscape cleanup"];
  const addisonBlockedKeywords = ["electrical", "boiler", "hvac", "repair", "diagnose", "roof", "lift service", "chemical", "plumbing", "inspection", "high priority"];
  const isAddisonReady = (title: string, detail = "") => {
    const text = `${title} ${detail}`.toLowerCase();
    return addisonKeywords.some((keyword) => text.includes(keyword)) && !addisonBlockedKeywords.some((keyword) => text.includes(keyword));
  };
  const addisonReadyWork = guidedTodaysWork.filter((record) => isAddisonReady(record.title, `${record.workCategory || ""} ${record.notes || ""}`)).slice(0, 4);
  const addisonReadyRoutineItems = visibleRoutineItems.filter((item) => isAddisonReady(item.title, item.detail)).slice(0, 4);
  const suggestedTodayItems = [...dailyBaseline, ...todayFocus.suggested].filter((item, index, all) => all.indexOf(item) === index);
  const addSuggestedTodayItem = (text: string) => {
    setTodayLogEntries((current) => [{ id: uid("today-log"), propertyId: activePropertyId, date: today, category: "Task", text, createdAt: new Date().toISOString() }, ...current]);
    showSaveToast("Added to today’s plan.");
  };

  const currentDaySession = daySessions.find((session) => session.date === today && session.propertyId === activePropertyId);
  const taskWorkMinutes = dashboardTodayTasks.reduce((sum, task) => sum + Math.max(5, Number(task.minutes || 0)), 0);
  const workOrderMinutes = guidedTodaysWork.reduce((sum, record) => {
    const effort = String((record as AtlasServiceRecord).effort || "");
    const minutes = effort === "5 minutes" ? 5 : effort === "15 minutes" ? 15 : effort === "30 minutes" ? 30 : effort === "1 hour" ? 60 : effort === "Half Day" ? 240 : effort === "Full Day" ? 480 : effort === "Multi-Day" ? 480 : 45;
    return sum + minutes;
  }, 0);
  const routineMinutesEstimate = visibleRoutineItems.filter((item) => !completedDashboardRoutineIds.includes(item.id)).length * 12;
  const plannedMinutes = taskWorkMinutes + workOrderMinutes + routineMinutesEstimate;
  const targetDayMinutes = Math.max(60, Math.round((currentDaySession?.targetHours || workPlanTargetHours || 7) * 60));
  const remainingCapacityMinutes = targetDayMinutes - plannedMinutes;
  const formatWorkload = (minutes: number) => {
    const absolute = Math.abs(Math.round(minutes));
    const hours = Math.floor(absolute / 60);
    const remainder = absolute % 60;
    return `${hours ? `${hours} hr ` : ""}${remainder ? `${remainder} min` : hours ? "" : "0 min"}`.trim();
  };
  const startMyDay = () => {
    const now = new Date().toISOString();
    setDaySessions((current) => {
      const exists = current.some((session) => session.date === today && session.propertyId === activePropertyId);
      return exists
        ? current.map((session) => session.date === today && session.propertyId === activePropertyId ? { ...session, startedAt: session.startedAt || now, endedAt: undefined } : session)
        : [{ date: today, propertyId: activePropertyId, startedAt: now, targetHours: workPlanTargetHours || 7, notes: "" }, ...current];
    });
    showSaveToast("Your guided workday is active.");
  };
  const endMyDay = () => {
    const unfinishedFlexibleTasks = dashboardTodayTasks.filter((task) => task.priority !== "High" && taskDetails(task.id).status !== "Completed");
    const delegatable = unfinishedFlexibleTasks.filter((task) => taskDetails(task.id).assignee !== "Addison" && isAddisonReady(task.title, `${task.category} ${task.notes || ""}`));
    const moveTomorrow = unfinishedFlexibleTasks.length ? window.confirm(`Move ${unfinishedFlexibleTasks.length} unfinished non-high-priority task${unfinishedFlexibleTasks.length === 1 ? "" : "s"} to tomorrow?`) : false;
    const giveToAddison = delegatable.length ? window.confirm(`Assign ${delegatable.length} suitable unfinished task${delegatable.length === 1 ? "" : "s"} to Addison?`) : false;
    if (moveTomorrow || giveToAddison) setTaskMeta((current) => { const next = { ...current }; unfinishedFlexibleTasks.forEach((task) => { const meta = next[task.id] || taskDetails(task.id); next[task.id] = { ...meta, dueDate: moveTomorrow ? addDays(today, 1) : meta.dueDate, assignee: giveToAddison && delegatable.some((item) => item.id === task.id) ? "Addison" : meta.assignee }; }); return next; });
    const now = new Date().toISOString();
    setDaySessions((current) => { const exists = current.some((session) => session.date === today && session.propertyId === activePropertyId); return exists ? current.map((session) => session.date === today && session.propertyId === activePropertyId ? { ...session, endedAt: now } : session) : [{ date: today, propertyId: activePropertyId, startedAt: now, endedAt: now, targetHours: workPlanTargetHours || 7, notes: "" }, ...current]; });
    showSaveToast("Day closed. Unfinished work was reviewed and history was preserved.");
  };
  const smartDaySuggestions = [
    remainingCapacityMinutes < -60 ? { title: "Workload is over capacity", detail: `${formatWorkload(-remainingCapacityMinutes)} should move, delegate, or wait.`, action: () => setScreen("planner"), label: "Review tasks" } : null,
    remainingCapacityMinutes > 90 ? { title: "You have useful open capacity", detail: `${formatWorkload(remainingCapacityMinutes)} remains for backlog, vehicle care, or project follow-up.`, action: () => { setTasksView("backlog"); setScreen("planner"); }, label: "Open Backlog" } : null,
    addisonReadyWork.length + addisonReadyRoutineItems.length > 0 ? { title: "Addison can absorb part of today", detail: `${addisonReadyWork.length + addisonReadyRoutineItems.length} low-risk item${addisonReadyWork.length + addisonReadyRoutineItems.length === 1 ? " is" : "s are"} suitable to review for delegation.`, action: () => setScreen("team"), label: "Review help" } : null,
    todaysWeather && Number(todaysWeather.precipChance || 0) >= 55 ? { title: "Weather may change the order", detail: "Handle exposed outdoor work during the driest window and keep indoor work as backup.", action: () => setScreen("calendar"), label: "Check schedule" } : null,
    dashboardOpenTasks.some((task) => taskDetails(task.id).status === "Blocked") ? { title: "A task is blocked", detail: "Atlas found work that cannot move forward without a decision or dependency.", action: () => { setTasksView("intelligence"); setScreen("planner"); }, label: "Review blockers" } : null,
    seasonalItems.some((item) => item.status !== "Completed" && item.windowStart <= addDays(today, 30) && item.deadline >= today) ? { title: "Seasonal work is entering its window", detail: "Review annual and seasonal work before it becomes urgent.", action: () => { setTasksView("seasonal"); setScreen("planner"); }, label: "Review seasonal" } : null,
    vehicleCare.some((vehicle) => vehicleDueScore(vehicle) >= 14) ? { title: "A vehicle is due for attention", detail: "The vehicle rotation has at least one onsite vehicle that is becoming due.", action: () => { setTasksView("vehicles"); setScreen("planner"); }, label: "Vehicle rotation" } : null,
  ].filter(Boolean) as Array<{ title: string; detail: string; action: () => void; label: string }>;

  const allLayouts = [...builtInDashboardLayouts, ...customDashboardLayouts];
  const applyLayout = (layoutId: string) => {
    const layout = allLayouts.find((item) => item.id === layoutId);
    if (!layout) return;
    setDashboardLayoutId(layout.id);
    setDashboardWidgets(normalizeDashboardWidgets(layout.widgets.map((item) => ({ ...item }))));
    showSaveToast(`${layout.name} layout loaded.`);
  };
  const updateWidget = (id: DashboardWidgetId, changes: Partial<DashboardWidgetSetting>) => setDashboardWidgets((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const moveWidget = (targetId: DashboardWidgetId, position: "before" | "after") => {
    if (!draggedDashboardWidgetId || draggedDashboardWidgetId === targetId) {
      setDraggedDashboardWidgetId(null);
      setDashboardWidgetDropTarget(null);
      return;
    }
    setDashboardWidgets((current) => {
      const next = [...current];
      const from = next.findIndex((item) => item.id === draggedDashboardWidgetId);
      if (from < 0) return current;
      const [moved] = next.splice(from, 1);
      const targetIndex = next.findIndex((item) => item.id === targetId);
      if (targetIndex < 0) return current;
      const insertionIndex = position === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertionIndex, 0, moved);
      return next;
    });
    setDraggedDashboardWidgetId(null);
    setDashboardWidgetDropTarget(null);
  };
  const saveLayoutAs = () => {
    const name = window.prompt("Name this dashboard layout:", "My Layout")?.trim();
    if (!name) return;
    const id = `custom-${slugify(name)}-${Date.now()}`;
    const layout = { id, name, widgets: dashboardWidgets.map((item) => ({ ...item })) };
    setCustomDashboardLayouts((current) => [...current, layout]);
    setDashboardLayoutId(id);
    showSaveToast(`${name} layout saved.`);
  };
  const beginWidgetResize = (event: React.PointerEvent, widget: DashboardWidgetSetting, direction: "x" | "y" | "xy") => {
    if (isMobile || !dashboardEditMode || widget.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startCols = widget.colSpan || legacySizeColumns(widget.size);
    const startRows = widget.rowSpan || dashboardDefaultGrid[widget.id].rowSpan;
    const onMove = (moveEvent: PointerEvent) => {
      const colDelta = Math.round((moveEvent.clientX - startX) / 92);
      const rowDelta = Math.round((moveEvent.clientY - startY) / 72);
      updateWidget(widget.id, {
        colSpan: Math.max(3, Math.min(12, startCols + colDelta)),
        rowSpan: dashboardDefaultGrid[widget.id].rowSpan,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const resetWidgetGrid = (id: DashboardWidgetId) => updateWidget(id, { ...dashboardDefaultGrid[id], locked: false });
  const cardStyle: React.CSSProperties = { border: `1px solid ${colors.line}`, borderRadius: 14, background: "#FFFFFF", padding: isMobile ? 13 : 15, boxShadow: "0 5px 18px rgba(15, 35, 55, 0.05)", minWidth: 0 };

  const foremanSchedule = nonRoutineTodayEvents.slice().sort((a, b) => String(a.time || "99:99").localeCompare(String(b.time || "99:99")));
  const addisonFlaggedTasks = workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    if (task.category === "Atlas List Definition" || meta.listId || meta.assignee !== "Addison" || meta.status === "Completed") return false;
    return Boolean((meta as any).needsNick) || Boolean((meta as any).problemFound);
  });
  const foremanProblems = [
    ...addisonFlaggedTasks.map((task) => {
      const meta = taskDetails(task.id);
      const needsNick = Boolean((meta as any).needsNick);
      const problemFound = Boolean((meta as any).problemFound);
      const flagLabel = needsNick && problemFound ? "Needs Nick · Problem Found" : needsNick ? "Needs Nick" : "Problem Found";
      const note = String(meta.notes || task.notes || "").trim();
      return {
        id: `addison-flag-${task.id}`,
        title: `Addison · ${task.title}`,
        detail: note ? `${flagLabel} · ${note}` : flagLabel,
        action: () => { openTaskById(task.id); },
      };
    }),
    ...dashboardOpenTasks.filter((task) => taskDetails(task.id).status === "Blocked").map((task) => ({ id: `task-${task.id}`, title: task.title, detail: "Blocked task", action: () => { openTaskById(task.id); } })),
    ...overdueWork.map((record) => ({ id: `work-${record.id}`, title: record.title, detail: record.date ? `Overdue since ${formatDate(record.date)}` : "Overdue work", action: () => openWorkOrderById(record.id) })),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 8);
  const foremanAssignments = (["Nick", "Addison", "Pat", "Sean"] as const).map((person) => {
    const tasks = dashboardTodayTasks.filter((task) => String(taskDetails(task.id).assignee || "Nick") === person);
    const work = dueToday.filter((record) => String((record as AtlasServiceRecord & { assignedTo?: string }).assignedTo || "").toLowerCase() === person.toLowerCase());
    return { person, tasks, work, count: tasks.length + work.length };
  });
  const addisonDashboardTasks = workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    if (task.category === "Atlas List Definition") return false;
    if (meta.assignee !== "Addison") return false;
    const completedToday = meta.completionHistory?.includes(today) || meta.completedAt?.slice(0, 10) === today;
    const paused = Boolean((meta as any).paused);
    const dueNow = meta.status !== "Completed" && !paused && (!meta.dueDate || meta.dueDate <= today);
    return Boolean(completedToday || dueNow);
  }).sort((a, b) => {
    const aDone = taskDetails(a.id).completionHistory?.includes(today) || taskDetails(a.id).completedAt?.slice(0, 10) === today;
    const bDone = taskDetails(b.id).completionHistory?.includes(today) || taskDetails(b.id).completedAt?.slice(0, 10) === today;
    return Number(aDone) - Number(bDone) || ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]);
  });
  const addisonDashboardCompleted = addisonDashboardTasks.filter((task) => {
    const meta = taskDetails(task.id);
    return meta.completionHistory?.includes(today) || meta.completedAt?.slice(0, 10) === today;
  });
  const dashboardTasksForPerson = (person: "Nick" | "Addison") => workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    if (task.category === "Atlas List Definition") return false;
    const assignee = meta.assignee === "Addison" ? "Addison" : "Nick";
    if (assignee !== person) return false;
    const completedToday = meta.completionHistory?.includes(today) || meta.completedAt?.slice(0, 10) === today;
    if (person === "Addison") {
      const paused = Boolean((meta as any).paused);
      const dueNow = meta.status !== "Completed" && !paused && (!meta.dueDate || meta.dueDate <= today);
      return Boolean(completedToday || dueNow);
    }
    if (meta.listId) return false;
    const dueNow = meta.status !== "Completed" && (!meta.dueDate || meta.dueDate <= today);
    return Boolean(completedToday || dueNow);
  }).sort((a, b) => {
    const aMeta = taskDetails(a.id);
    const bMeta = taskDetails(b.id);
    const aDone = aMeta.completionHistory?.includes(today) || aMeta.completedAt?.slice(0, 10) === today;
    const bDone = bMeta.completionHistory?.includes(today) || bMeta.completedAt?.slice(0, 10) === today;
    return Number(aDone) - Number(bDone) || ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]);
  });
  const nickDashboardTasks = dashboardTasksForPerson("Nick");
  const dashboardTaskHistoryFor = (person: "Nick" | "Addison") => workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    const assignee = meta.assignee === "Addison" ? "Addison" : "Nick";
    if (task.category === "Atlas List Definition" || meta.listId || assignee !== person || meta.status !== "Completed") return false;
    return meta.completedAt?.slice(0, 10) !== today && !meta.completionHistory?.includes(today);
  }).sort((a, b) => String(taskDetails(b.id).completedAt || "").localeCompare(String(taskDetails(a.id).completedAt || ""))).slice(0, 20);
  const dashboardTomorrow = addDays(today, 1);
  const dashboardTomorrowTasks = workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    return task.category !== "Atlas List Definition" && !meta.listId && meta.status !== "Completed" && meta.dueDate === dashboardTomorrow;
  }).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]));
  const dashboardAttentionTasks = workPlanTasks.filter((task) => {
    const meta = taskDetails(task.id);
    if (task.category === "Atlas List Definition" || meta.listId || meta.status === "Completed") return false;
    return Boolean((meta as any).needsNick) || Boolean((meta as any).problemFound) || meta.status === "Blocked" || meta.status === "Waiting" || (Boolean(meta.dueDate) && meta.dueDate < today) || (task.priority === "High" && (!meta.dueDate || meta.dueDate <= today));
  }).slice(0, 8);
  const dashboardAttentionNotes = dashboardReminders.filter((note) => !note.done && Boolean(note.dueDate) && String(note.dueDate) <= today);
  const dashboardHasSaveFailure = /failed|error|offline/i.test(databaseStatus) || operationsSyncState === "failed";
  const dashboardAttentionCount = dashboardAttentionTasks.length + dashboardAttentionNotes.length + (dashboardHasSaveFailure ? 1 : 0);

  const activeDashboardLists = checklistDefinitions().map((definition) => {
    const records = workPlanTasks.filter((task) => taskDetails(task.id).listId === definition.id || (definition.id === "graduation-party" && task.category === "Graduation Party Checklist"));
    const items = records.filter((task) => task.category !== "Atlas List Definition");
    return { ...definition, records, items, completed: items.filter((task) => taskDetails(task.id).status === "Completed").length, pinned: records.some((task) => taskDetails(task.id).dashboardListPinned) };
  }).filter((list) => list.pinned);
  const removeListFromDashboard = (listId: string) => {
    const list = activeDashboardLists.find((item) => item.id === listId);
    const itemIds = new Set<string>((list?.records || []).map((task: any) => String(task.id)));
    setTaskMeta((current) => {
      const next = { ...current };
      itemIds.forEach((id) => { next[id] = { ...taskDetails(id), dashboardListPinned: false, updatedAt: new Date().toISOString() }; });
      return next;
    });
    showSaveToast(`${list?.name || "List"} removed from Dashboard.`);
  };
  const assignAddisonFromDashboard = async () => {
    const title = window.prompt("What should Addison handle today?")?.trim();
    if (!title) return;
    if (typeof createAddisonDashboardTask === "function") {
      await createAddisonDashboardTask(title);
      return;
    }
    const taskId = addAtlasTask(title);
    if (!taskId) return;
    updateTaskDetails(taskId, { assignee: "Addison", dueDate: today, status: "Open", assignmentScope: "This occurrence" });
    showSaveToast("Added to Addison’s checklist.");
  };
  const openDashboardTaskEditor = (task: WorkPlanTask) => {
    setDashboardTaskEditorId((current) => current === task.id ? "" : task.id);
  };
  const addDashboardTaskFor = async (person: "Nick" | "Addison") => {
    const input =
      person === "Nick"
        ? dashboardNickQuickAddRef.current
        : dashboardAddisonQuickAddRef.current;
    const title = String(input?.value || "").trim();
    if (!title) return;

    if (person === "Addison" && typeof createAddisonDashboardTask === "function") {
      const taskId = await createAddisonDashboardTask(title);
      if (!taskId) return;
      if (input) {
        input.value = "";
        input.focus();
      }
      return;
    }

    const taskId = addAtlasTask(title);
    if (!taskId) return;
    const submittedDate = localISODate(new Date());
    // Today's List quick-add is the same Atlas Task record used by the
    // sidebar Tasks section. Explicitly keep it out of list-only storage.
    updateTaskDetails(taskId, {
      assignee: person,
      dueDate: submittedDate,
      status: "Open",
      assignmentScope: "This occurrence",
      completedAt: undefined,
      lastCompletedDate: "",
      completionHistory: [],
      needsReview: false,
      listId: undefined,
      dashboardListPinned: false,
    });
    if (input) {
      input.value = "";
      input.focus();
    }
    showSaveToast(`Added to ${person}’s list.`);
  };
  const saveDashboardNote = (text: string, dueDate?: string, existingId?: string) => {
    const clean = text.trim();
    if (!clean) return "";
    const id = existingId || uid("dashboard-note");
    const existingReminder = dashboardReminders.find((item) => item.id === id);
    const createdAt = existingReminder?.createdAt || new Date().toISOString();
    const record = {
      id,
      propertyId: activePropertyId,
      date: today,
      category: "Note",
      text: clean,
      createdAt,
      updatedAt: new Date().toISOString(),
      section: "General",
      pinned: false,
      followUpDate: "",
      attachments: [],
      dashboard: true,
      dueDate: dueDate || existingReminder?.dueDate || "",
      done: Boolean(existingReminder?.done),
    };

    setDashboardReminders((current) => {
      const existing = current.find((item) => item.id === id);
      const reminder = {
        id,
        text: clean,
        done: existing?.done || false,
        createdAt,
        dueDate: dueDate || existing?.dueDate || undefined,
      };
      return existing
        ? current.map((item) => (item.id === id ? reminder : item))
        : [reminder, ...current];
    });
    setTodayLogEntries((current) => [
      record,
      ...current.filter((entry: any) => entry.id !== id),
    ]);

    // Dashboard notes must hit shared Atlas immediately. Do not wait for the
    // background local-state sync; that delay is what allowed desktop and
    // phone to diverge.
    void postAtlasRecord("notes", record);
    return id;
  };
  const deleteDashboardNote = (noteId: string) => {
    setDashboardReminders((current) => current.filter((item) => item.id !== noteId));
    setTodayLogEntries((current) => current.filter((entry: any) => entry.id !== noteId));
  };
  const addDashboardReminder = () => {
    const text = dashboardReminderDraft.trim();
    if (!text) return;
    saveDashboardNote(text, dashboardReminderDate || undefined);
    setDashboardReminderDraft("");
    setDashboardReminderDate("");
    showSaveToast("Saved to Quick Notes and Notes.");
  };
  const convertDashboardReminderToTask = (noteId: string, person: "Nick" | "Addison") => {
    const note = dashboardReminders.find((item) => item.id === noteId);
    if (!note?.text.trim()) return;
    const taskId = addAtlasTask(note.text.trim());
    if (!taskId) return;
    updateTaskDetails(taskId, {
      assignee: person,
      dueDate: note.dueDate || today,
      status: "Open",
      assignmentScope: "This occurrence",
    });
    deleteDashboardNote(noteId);
    showSaveToast(`Moved note to ${person}’s list.`);
  };
  const dashboardQuickCapture = (kind: "note" | "task" | "addison" | "work-order") => {
    const text = quickCaptureNote.trim();
    if (!text) return;
    if (kind === "note") {
      saveDashboardNote(text);
      setQuickCaptureNote("");
      showSaveToast("Saved to Quick Notes and Notes.");
      return;
    }
    if (kind === "task" || kind === "addison") {
      const taskId = addAtlasTask(text);
      if (!taskId) return;
      const submittedDate = localISODate(new Date());
      updateTaskDetails(taskId, { assignee: kind === "addison" ? "Addison" : "Nick", dueDate: submittedDate, status: "Open", assignmentScope: "This occurrence", completedAt: undefined, lastCompletedDate: "", completionHistory: [], needsReview: false });
      setQuickCaptureNote("");
      showSaveToast(kind === "addison" ? "Added to Addison’s list." : "Added to Nick’s list.");
      return;
    }
    setQuickCreateKind("work-order");
    setQuickCreateName(text);
    setQuickCaptureMode("create");
    setQuickCaptureOpen(true);
    setQuickCaptureNote("");
  };
  const morningBriefText = [
    `Good morning. Your ${dayName} routine checklist is ready.`,
    foremanSchedule.length ? `${foremanSchedule.length} scheduled item${foremanSchedule.length === 1 ? " is" : "s are"} on today’s calendar: ${foremanSchedule.slice(0, 4).map((event) => `${event.time || "all day"}, ${event.title}`).join("; ")}.` : "There are no meetings, vendors, crew visits, or deliveries scheduled today.",
    todaysWeather ? `Weather: ${weatherText(Number(todaysWeather.code || 0))}, high ${Math.round(Number(todaysWeather.high || 0))} degrees, with ${Number(todaysWeather.precipChance || 0)} percent precipitation.` : "Weather is still loading.",
    foremanAssignments.some((lane) => lane.count) ? `Assigned work: ${foremanAssignments.filter((lane) => lane.count).map((lane) => `${lane.person}, ${lane.count}`).join("; ")}.` : "No separate team assignments are due today.",
    foremanProblems.length ? `${foremanProblems.length} item${foremanProblems.length === 1 ? " needs" : "s need"} attention.` : "Nothing is blocked or overdue.",
    ifTimeTasks.length ? `${ifTimeTasks.length} optional item${ifTimeTasks.length === 1 ? " is" : "s are"} available if time allows.` : "No optional work is currently suggested.",
  ].join(" ");
  const readMorningBrief = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showSaveToast("Read aloud is not supported by this browser.", "warning");
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(morningBriefText));
  };
  const dailyForemanPanel = (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ ...cardStyle, padding: isMobile ? 12 : 16, background: `linear-gradient(135deg, ${colors.navy}, #173E68)`, color: "#FFFFFF", border: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ ...eyebrowStyle, color: colors.gold2 }}>Mission Control</div><h1 style={{ margin: "3px 0", fontSize: isMobile ? 24 : 29 }}>Today</h1><small style={{ opacity: .82 }}>{new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</small></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" onClick={() => setMorningBriefOpen(true)} style={teamGoldButtonStyle}>Morning Brief</button><button type="button" onClick={() => setScreen("calendar")} style={{ ...secondaryButtonStyle, background: "rgba(255,255,255,.1)", color: "#FFFFFF", borderColor: "rgba(255,255,255,.3)" }}>Calendar</button><button type="button" onClick={() => setScreen("routines")} style={{ ...secondaryButtonStyle, background: "rgba(255,255,255,.1)", color: "#FFFFFF", borderColor: "rgba(255,255,255,.3)" }}>Edit Routine</button></div></div>
      </section>
      <section style={{ ...cardStyle, padding: isMobile ? 10 : 12, borderColor: "#D7C07A", background: "linear-gradient(135deg,#FFFDF6,#FFFFFF)" }}>
        <button type="button" onClick={toggleDashboardNotes} aria-expanded={dashboardNotesOpen} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8, alignItems: "center", border: 0, background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <h2 style={{ margin: 0, color: colors.navy, fontSize: 18 }}>Remember It</h2>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={badgeStyle("Monitor")}>{dashboardReminders.filter((note) => !note.done).length} open</span><span aria-hidden="true" style={{ color: colors.navy, fontWeight: 900 }}>{dashboardNotesOpen ? "−" : "+"}</span></span>
        </button>
        {dashboardNotesOpen ? <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 150px auto", gap: 7, marginTop: 8 }}>
            <input value={dashboardReminderDraft} onChange={(event) => setDashboardReminderDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") addDashboardReminder(); }} placeholder="Add a note, reminder, or follow-up…" style={inputStyle}/>
            <input type="date" value={dashboardReminderDate} onChange={(event) => setDashboardReminderDate(event.currentTarget.value)} aria-label="Reminder date" style={inputStyle}/>
            <button type="button" onClick={addDashboardReminder} style={goldButtonStyle}>Add</button>
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 9, maxHeight: 320, overflowY: "auto" }}>
            {dashboardReminders.map((note) => <div key={note.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: 8, background: note.done ? "#F5F7F9" : "#FFFFFF" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 7, alignItems: "start" }}>
                <input type="checkbox" checked={note.done} onChange={() => setDashboardReminders((current) => current.map((item) => item.id === note.id ? { ...item, done: !item.done } : item))}/>
                <button type="button" onClick={() => { const text = window.prompt("Edit quick note", note.text)?.trim(); if (text) saveDashboardNote(text, note.dueDate, note.id); }} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, color: colors.navy, fontWeight: 800, textDecoration: note.done ? "line-through" : "none", opacity: note.done ? .6 : 1 }}><span style={{ display: "block" }}>{note.text}</span>{note.dueDate ? <small style={{ ...mutedSmallStyle, display: "block", marginTop: 2 }}>Remind {formatDate(note.dueDate)}</small> : null}</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7, paddingLeft: 24 }}>
                {!note.done ? <><button type="button" onClick={() => convertDashboardReminderToTask(note.id, "Nick")} style={compactUtilityButtonStyle}>→ Nick</button><button type="button" onClick={() => convertDashboardReminderToTask(note.id, "Addison")} style={compactUtilityButtonStyle}>→ Addison</button></> : null}
                <button type="button" onClick={() => deleteDashboardNote(note.id)} style={{ ...compactUtilityButtonStyle, color: colors.red }}>Delete</button>
              </div>
            </div>)}
          </div>
        </> : null}
      </section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.35fr) minmax(300px,.65fr)", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              padding: "0 2px",
            }}
          >
            <div>
              <div style={eyebrowStyle}>Routine View</div>
              <strong style={{ color: colors.navy }}>
                {dashboardRoutinePerson === "Nick" ? "My Routine" : "Addison’s Routine"}
              </strong>
            </div>
            <div
              role="group"
              aria-label="Routine person"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 4,
                padding: 4,
                border: `1px solid ${colors.line}`,
                borderRadius: 11,
                background: "#F8FAFC",
              }}
            >
              {(["Nick", "Addison"] as const).map((person) => (
                <button
                  key={person}
                  type="button"
                  onClick={() => setDashboardRoutinePerson(person)}
                  style={{
                    ...(dashboardRoutinePerson === person
                      ? goldButtonStyle
                      : secondaryButtonStyle),
                    minHeight: 32,
                    padding: "5px 10px",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {person === "Nick" ? "My Routine" : "Addison"}
                </button>
              ))}
            </div>
          </div>

          <AtlasRoutines
            mode="dashboard"
            isMobile={isMobile}
            activePropertyId={activePropertyId}
            assigneeFilter={dashboardRoutinePerson}
            defaultTodayAssignee={dashboardRoutinePerson}
            onOpenManager={() => setScreen("routines")}
            onAddPhoto={addRoutinePhoto}
            onAddNote={addRoutineNote}
            onFlagProblem={flagRoutineProblem}
            onAssignmentChange={syncRoutineAssignment}
          />
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={eyebrowStyle}>Today’s Schedule</div><h2 style={{ margin: "2px 0", color: colors.navy }}>On site and meetings</h2></div><span style={badgeStyle("Scheduled")}>{foremanSchedule.length}</span></div><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{foremanSchedule.slice(0, 8).map((event) => <button key={event.instanceId || event.id} type="button" onClick={() => openDashboardCalendarItem(event)} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, background: "#FFFFFF", padding: 9, textAlign: "left", cursor: "pointer" }}><strong style={{ display: "block", color: colors.navy }}>{event.title}</strong><small style={mutedSmallStyle}>{event.time || "All day"}{event.area ? ` · ${event.area}` : ""}</small></button>)}{!foremanSchedule.length ? <div style={noticeStyle}>No meetings, vendors, crew visits, or deliveries are scheduled today.</div> : null}</div></section>
          <section style={{ ...cardStyle, padding: 11 }}>
            <div><div style={eyebrowStyle}>Quick Log</div><h3 style={{ margin: "2px 0", color: colors.navy }}>Vendor Visit</h3></div>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <CreatableRelationshipField label="Vendor" value={dashboardVendorVisitId} emptyLabel="Choose or type vendor" options={vendorRecords.slice().sort((a,b) => a.name.localeCompare(b.name)).map((vendor) => ({ id: vendor.id, label: vendor.name }))} onChange={setDashboardVendorVisitId} onCreate={quickCreateVendor} compact/>
              <input value={dashboardVendorVisitNote} onChange={(event) => setDashboardVendorVisitNote(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") logDashboardVendorVisit(); }} placeholder="Work completed or visit note" style={{ ...inputStyle, minHeight: 34, padding: "5px 8px", fontSize: 11 }}/>
              <button type="button" onClick={logDashboardVendorVisit} disabled={!dashboardVendorVisitId && !dashboardVendorVisitNote.trim()} style={{ ...goldButtonStyle, minHeight: 32, padding: "5px 9px", fontSize: 11, opacity: !dashboardVendorVisitId && !dashboardVendorVisitNote.trim() ? .55 : 1 }}>Log Visit</button>
            </div>
          </section>
        </div>
      </div>
      <section style={{ ...cardStyle, padding: isMobile ? 11 : 14 }}>
        <div><div style={eyebrowStyle}>Daily Work Lists</div><h2 style={{ margin: "2px 0", color: colors.navy }}>Today’s Lists</h2><small style={mutedSmallStyle}>Add, edit, complete, and move today’s work here.</small></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 11, marginTop: 10 }}>
          {(["Nick", "Addison"] as const).map((person) => {
              const tasks = person === "Nick" ? nickDashboardTasks : addisonDashboardTasks;
              const activeTasks = tasks.filter((task) => {
                const meta = taskDetails(task.id);
                return !Boolean(meta.completionHistory?.includes(today) || meta.completedAt?.slice(0, 10) === today);
              });
              const addisonTodayTasks = person === "Addison" ? activeTasks.filter((task) => taskDetails(task.id).dueDate === today) : activeTasks;
              const addisonNotCompletedTasks = person === "Addison" ? activeTasks.filter((task) => {
                const dueDate = String(taskDetails(task.id).dueDate || "").slice(0, 10);
                return Boolean(dueDate && dueDate < today);
              }) : [];
              const addisonAsNeededTasks = person === "Addison" ? activeTasks.filter((task) => !String(taskDetails(task.id).dueDate || "").slice(0, 10)) : [];
              const completedTodayTasks = tasks.filter((task) => {
                const meta = taskDetails(task.id);
                return Boolean(meta.completionHistory?.includes(today) || meta.completedAt?.slice(0, 10) === today);
              });
              const history = dashboardTaskHistoryFor(person);

              const renderDashboardTaskRow = (task: WorkPlanTask, done: boolean) => {
                const meta = taskDetails(task.id);
                const editing = dashboardTaskEditorId === task.id;
                return (
                  <div key={`dashboard-person-task-${task.id}`} style={{ border: `1px solid ${done ? "#D6E3DC" : colors.line}`, borderRadius: 10, background: done ? "#F5F8F6" : "#FFFFFF", padding: 8, opacity: done ? 0.76 : 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
                      <input type="checkbox" checked={done} onChange={() => person === "Addison" ? void updateAddisonDashboardTask(task.id, { status: done ? "Open" : "Completed" }) : done ? updateTaskDetails(task.id, { status: "Open", completedAt: undefined, completionHistory: (meta.completionHistory || []).filter((date: string) => date !== today), needsReview: false, dueDate: today }) : completeAtlasTask(task)} />
                      <button type="button" onClick={() => openDashboardTaskEditor(task)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", minWidth: 0, cursor: "pointer" }}>
                        <strong style={{ display: "block", color: colors.navy, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1, overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</strong>
                        <small style={{ color: "#000000", fontSize: 11, fontWeight: 400, lineHeight: 1.35, display: "block" }}>{meta.dueDate ? formatDate(meta.dueDate) : person === "Addison" ? "As Needed" : "Today"} · {minutesLabel(task.minutes)}</small>
                      </button>
                      <button type="button" onClick={() => openDashboardTaskEditor(task)} style={{ ...compactUtilityButtonStyle }}>{editing ? "Close" : "Edit"}</button>
                    </div>
                    {editing ? (
                      <div style={{ display: "grid", gap: 7, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${colors.line}` }}>
                        <input key={`dashboard-task-title-${task.id}-${dashboardTaskEditorId}`} defaultValue={task.title} onBlur={(event) => { const nextTitle = event.currentTarget.value.trim(); if (nextTitle && nextTitle !== task.title) updateWorkPlanTask(task.id, { title: nextTitle }); else if (!nextTitle) event.currentTarget.value = task.title; }} style={inputStyle}/>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 7 }}>
                          <input type="date" defaultValue={meta.dueDate || today} onBlur={(event) => { const nextDate = event.currentTarget.value; if (nextDate !== (meta.dueDate || today)) { if (person === "Addison") void updateAddisonDashboardTask(task.id, { dueDate: nextDate }); else updateTaskDetails(task.id, { dueDate: nextDate }); } }} style={inputStyle}/>
                          <select defaultValue={meta.assignee === "Addison" ? "Addison" : "Nick"} onChange={(event) => updateTaskDetails(task.id, { assignee: event.currentTarget.value as "Nick" | "Addison" })} style={inputStyle}><option value="Nick">Nick</option><option value="Addison">Addison</option></select>
                          <input type="number" min={5} step={5} defaultValue={task.minutes} onBlur={(event) => { const nextMinutes = Math.max(5, Number(event.currentTarget.value) || 5); if (nextMinutes !== task.minutes) updateWorkPlanTask(task.id, { minutes: nextMinutes }); }} style={inputStyle}/>
                        </div>
                        <textarea key={`dashboard-task-note-${task.id}-${dashboardTaskEditorId}`} defaultValue={meta.notes || task.notes || ""} onBlur={(event) => { const nextNote = event.currentTarget.value; if (nextNote !== (meta.notes || task.notes || "")) { if (person === "Addison") void updateAddisonDashboardTask(task.id, { notes: nextNote }); else updateTaskDetails(task.id, { notes: nextNote }); } }} placeholder="Notes or instructions" rows={2} style={{ ...inputStyle, resize: "vertical" }}/>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => person === "Addison" ? void updateAddisonDashboardTask(task.id, { dueDate: addDays(today, 1) }) : updateTaskDetails(task.id, { dueDate: addDays(today, 1), status: "Open", completedAt: undefined })} style={secondaryButtonStyle}>Move Tomorrow</button>
                          <button type="button" onClick={() => updateTaskDetails(task.id, { assignee: person === "Nick" ? "Addison" : "Nick", status: "Open" })} style={secondaryButtonStyle}>Move to {person === "Nick" ? "Addison" : "Nick"}</button>
                          <button type="button" onClick={() => { if (window.confirm(`Delete ${task.title}?`)) { deleteAtlasTask(task.id); setDashboardTaskEditorId(""); } }} style={{ ...secondaryButtonStyle, color: colors.red }}>Delete</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              };

              return (
                <section key={`dashboard-person-${person}`} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 10, background: "#FAFCFE", minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div><strong style={{ display: "block", color: colors.navy, fontSize: 18 }}>{person}</strong><small style={mutedSmallStyle}>{activeTasks.length} active · {completedTodayTasks.length} done today</small></div>
                    <span style={badgeStyle(activeTasks.length ? "Scheduled" : completedTodayTasks.length ? "Completed" : "Monitor")}>{activeTasks.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 6, marginTop: 9 }}>
                    <input ref={person === "Nick" ? dashboardNickQuickAddRef : dashboardAddisonQuickAddRef} defaultValue="" autoComplete="off" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDashboardTaskFor(person); } }} placeholder="Add task…" style={{ ...inputStyle, minHeight: 34 }}/>
                    <button type="button" onClick={() => addDashboardTaskFor(person)} style={{ ...goldButtonStyle, minHeight: 34, padding: "6px 10px" }}>Add</button>
                  </div>
                  {person === "Addison" ? (
                    <>
                      <div style={{ display: "grid", gap: 6, marginTop: 9 }}>{addisonTodayTasks.map((task) => renderDashboardTaskRow(task, false))}{!addisonTodayTasks.length ? <div style={noticeStyle}>No work due today.</div> : null}</div>
                      {addisonNotCompletedTasks.length ? <details open style={{ marginTop: 9 }}><summary style={{ cursor: "pointer", fontWeight: 900, color: colors.red }}>Not Completed · {addisonNotCompletedTasks.length}</summary><div style={{ display: "grid", gap: 5, marginTop: 7 }}>{addisonNotCompletedTasks.map((task) => renderDashboardTaskRow(task, false))}</div></details> : null}
                      {addisonAsNeededTasks.length ? <details style={{ marginTop: 9 }}><summary style={{ cursor: "pointer", fontWeight: 900, color: colors.navy }}>As Needed · {addisonAsNeededTasks.length}</summary><div style={{ display: "grid", gap: 5, marginTop: 7 }}>{addisonAsNeededTasks.map((task) => renderDashboardTaskRow(task, false))}</div></details> : null}
                    </>
                  ) : (
                    <div style={{ display: "grid", gap: 6, marginTop: 9 }}>{activeTasks.map((task) => renderDashboardTaskRow(task, false))}{!activeTasks.length ? <div style={noticeStyle}>No active work today.</div> : null}</div>
                  )}
                  {completedTodayTasks.length ? <details style={{ marginTop: 9 }}><summary style={{ cursor: "pointer", fontWeight: 900, color: colors.navy }}>Completed today · {completedTodayTasks.length}</summary><div style={{ display: "grid", gap: 5, marginTop: 7 }}>{completedTodayTasks.map((task) => renderDashboardTaskRow(task, true))}</div></details> : null}
                  {history.length ? <details style={{ marginTop: 8 }}><summary style={{ cursor: "pointer", fontWeight: 850, color: colors.muted }}>Earlier completed · {history.length}</summary><div style={{ display: "grid", gap: 5, marginTop: 7 }}>{history.map((task) => <div key={`history-${person}-${task.id}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, padding: 7, borderRadius: 8, background: "#F3F5F7" }}><span style={{ color: colors.navy, fontWeight: 800, textDecoration: "line-through", opacity: 0.5 }}>{task.title}</span><button type="button" onClick={() => person === "Addison" ? void updateAddisonDashboardTask(task.id, { status: "Open" }) : updateTaskDetails(task.id, { status: "Open", completedAt: undefined, dueDate: today })} style={compactUtilityButtonStyle}>Reopen</button></div>)}</div></details> : null}
                </section>
              );
            })}
        </div>
      </section>
      <section style={{ ...cardStyle, padding: isMobile ? 11 : 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><div><div style={eyebrowStyle}>Coming Up</div><h2 style={{ margin: "2px 0", color: colors.navy }}>Upcoming</h2><small style={mutedSmallStyle}>A compact preview so you can move work without opening the planner.</small></div><span style={badgeStyle("Scheduled")}>{dashboardTomorrowTasks.length}</span></div>
        <div style={{ display: "grid", gap: 6, marginTop: 9 }}>{dashboardTomorrowTasks.slice(0, 8).map((task) => { const meta = taskDetails(task.id); return <div key={`tomorrow-${task.id}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 9, padding: 8, background: "#FFFFFF" }}><button type="button" onClick={() => openDashboardTaskEditor(task)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", color: colors.navy, cursor: "pointer" }}><strong style={{ display: "block" }}>{task.title}</strong><small style={{ color: "#000000", fontSize: 11, fontWeight: 400, lineHeight: 1.35 }}>{meta.assignee || "Nick"} · {minutesLabel(task.minutes)}</small></button><button type="button" onClick={() => updateTaskDetails(task.id, { dueDate: today, status: "Open", completedAt: undefined })} style={compactUtilityButtonStyle}>Move to Today</button></div>; })}{!dashboardTomorrowTasks.length ? <div style={noticeStyle}>Nothing is scheduled for tomorrow yet.</div> : null}</div>
      </section>
      {activeDashboardLists.map((list) => <section key={`dashboard-list-${list.id}`} style={{ ...cardStyle, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 9, alignItems: "center", flexWrap: "wrap" }}><div><div style={eyebrowStyle}>Active List</div><h2 style={{ margin: "2px 0", color: colors.navy }}>{list.name}</h2><small style={mutedSmallStyle}>{list.completed} of {list.items.length} complete</small></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button type="button" onClick={() => { setSelectedListId(list.id); setTasksView("lists"); setScreen("planner"); }} style={secondaryButtonStyle}>Open List</button><button type="button" onClick={() => removeListFromDashboard(list.id)} style={compactUtilityButtonStyle}>Remove</button></div></div>
        <div style={{ display: "grid", gap: 5, maxHeight: 330, overflowY: "auto", marginTop: 9, paddingRight: 3 }}>{list.items.map((task) => { const meta = taskDetails(task.id); const done = meta.status === "Completed"; return <label key={`dashboard-list-item-${task.id}`} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: "7px 8px", border: `1px solid ${done ? "#B8E0CD" : colors.line}`, borderRadius: 9, background: done ? "#EFFAF4" : "#FFFFFF", cursor: "pointer" }}><input type="checkbox" checked={done} onChange={(event) => event.currentTarget.checked ? completeAtlasTask(task) : updateTaskDetails(task.id, { status: "Open", completedAt: undefined })}/><span style={{ color: colors.navy, fontSize: 12, fontWeight: 800, textDecoration: done ? "line-through" : "none", opacity: done ? .68 : 1 }}>{task.title}</span><small style={{ ...mutedSmallStyle, whiteSpace: "nowrap" }}>{meta.assignee}</small></label>; })}{!list.items.length ? <div style={noticeStyle}>No checklist items yet. Open the list to add the first item.</div> : null}</div>
      </section>)}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
        <section style={cardStyle}><div style={eyebrowStyle}>Needs Attention</div><div style={{ display: "grid", gap: 7, marginTop: 8 }}>{foremanProblems.map((item) => <button key={item.id} type="button" onClick={item.action} style={{ border: `1px solid #F4C7C7`, borderRadius: 10, background: "#FFF8F8", padding: 9, textAlign: "left", cursor: "pointer" }}><strong style={{ display: "block" }}>{item.title}</strong><small style={mutedSmallStyle}>{item.detail}</small></button>)}{!foremanProblems.length ? <div style={noticeStyle}>Nothing is blocked or overdue.</div> : null}</div></section>
        <section style={cardStyle}><div style={eyebrowStyle}>If Time Allows</div><div style={{ display: "grid", gap: 7, marginTop: 8 }}>{ifTimeTasks.slice(0, 5).map((task) => <button key={task.id} type="button" onClick={() => { openTaskById(task.id); }} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, background: "#F8FAFC", padding: 9, textAlign: "left", cursor: "pointer" }}><strong style={{ display: "block" }}>{task.title}</strong><small style={mutedSmallStyle}>{minutesLabel(task.minutes)} · {taskDetails(task.id).assignee}</small></button>)}{!ifTimeTasks.length ? <div style={noticeStyle}>No optional work is suggested right now.</div> : null}</div></section>
      </div>
      <details style={{ ...cardStyle, padding: 0, overflow: "hidden" }}><summary style={{ cursor: "pointer", padding: 12, fontWeight: 950, color: colors.navy }}>Planning Tools · suggestions and essential checks</summary><div style={{ borderTop: `1px solid ${colors.line}`, padding: 12, display: "grid", gap: 8 }}>{smartDaySuggestions.slice(0, 5).map((suggestion) => <div key={suggestion.title} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}><span><strong style={{ display: "block" }}>{suggestion.title}</strong><small style={mutedSmallStyle}>{suggestion.detail}</small></span><button type="button" onClick={suggestion.action} style={secondaryButtonStyle}>{suggestion.label}</button></div>)}<button type="button" onClick={() => { setTasksView("build"); setScreen("planner"); }} style={secondaryButtonStyle}>Open Build My Day</button>{canUseAdminTools ? <details style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 8 }}><summary style={{ cursor: "pointer", fontWeight: 900, color: colors.navy }}>Recent Change History · {atlasAuditLog.length}</summary><div style={{ display: "grid", gap: 6, marginTop: 8, maxHeight: 240, overflowY: "auto" }}>{atlasAuditLog.slice(0, 30).map((entry) => <div key={entry.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: 8, background: "#FFFFFF" }}><strong style={{ display: "block", color: colors.navy, fontSize: 12 }}>{entry.action}</strong><small style={mutedSmallStyle}>{entry.detail} · {entry.user} · {new Date(entry.at).toLocaleString()}</small></div>)}{!atlasAuditLog.length ? <div style={noticeStyle}>No tracked changes yet.</div> : null}</div></details> : null}</div></details>
      {morningBriefOpen ? <div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setMorningBriefOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(4,18,31,.68)", display: "grid", placeItems: "center", padding: 16 }}><section role="dialog" aria-modal="true" aria-label="Morning Brief" style={{ ...cardStyle, width: "min(620px,100%)", maxHeight: "86vh", overflowY: "auto", padding: isMobile ? 16 : 20 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><div style={eyebrowStyle}>Atlas Morning Brief</div><h2 style={{ margin: "3px 0", color: colors.navy }}>{dayName} at {activeProperty.name}</h2></div><button type="button" onClick={() => setMorningBriefOpen(false)} style={mapIconButtonStyle}>×</button></div><p style={{ lineHeight: 1.65, color: colors.text }}>{morningBriefText}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={readMorningBrief} style={goldButtonStyle}>Read Aloud</button><button type="button" onClick={() => setMorningBriefOpen(false)} style={secondaryButtonStyle}>Start Checklist</button></div></section></div> : null}
    </div>
  );

  const renderWidgetContent = (id: DashboardWidgetId) => {
    if (id === "hero") return null;
    if (id === "estate-health") return null;
    if (id === "today-upcoming") return null;
    // Live Operating Areas intentionally uses plain cards only: no health score, percentage, progress bar, or status meter.
    if (id === "property-status") return (
      <section style={{ ...cardStyle, padding: isMobile ? 10 : "10px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={eyebrowStyle}>Departments</div><h2 style={{ margin: "2px 0", color: colors.navy, fontSize: isMobile ? 18 : 20 }}>Live Operating Areas</h2></div>
          <small style={{ ...mutedSmallStyle, whiteSpace: "nowrap" }}>{openWork.length} open work order{openWork.length === 1 ? "" : "s"}</small>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : `repeat(${Math.min(5, Math.max(1, liveStatuses.length))},minmax(0,1fr))`, gap: 7, marginTop: 8 }}>
          {liveStatuses.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                const normalized = item.label.toLowerCase();
                if (normalized.includes("house")) openDashboardDepartment?.("house");
                else if (normalized.includes("garage")) openDashboardDepartment?.("garage");
                else if (normalized.includes("pool") || normalized.includes("spa")) openDashboardDepartment?.("pool");
                else if (normalized.includes("landscap") || normalized.includes("irrig")) openDashboardDepartment?.("landscaping");
                else if (normalized.includes("dock") || normalized.includes("waterfront") || normalized.includes("marine")) openDashboardDepartment?.("marine");
                else {
                  setDashboardWorkFilter(item.query);
                  setSelectedServiceId("");
                  setWorkOrdersOpenKey((current) => current + 1);
                  setScreen("history");
                }
              }}
              style={{ border: `1px solid ${colors.line}`, borderRadius: 10, background: "#FFFFFF", padding: "8px 9px", textAlign: "left", cursor: "pointer", minHeight: 58 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <strong style={{ color: colors.navy, fontSize: 12.5, lineHeight: 1.2 }}>{item.label}</strong>
              </div>
              <small style={{ ...mutedSmallStyle, display: "block", marginTop: 5 }}>{item.count} open</small>
            </button>
          ))}
        </div>
      </section>
    );
    if (id === "routine") return null;
    if (id === "atlas-brief") return <section className="atlas-brief-strip" style={{ ...cardStyle, padding: isMobile ? "10px 12px" : "10px 16px", background: "#F8FAFC" }}><div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 4 : 12, minWidth: 0 }}><strong style={{ color: colors.navy, whiteSpace: "nowrap" }}>Atlas Brief</strong><div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "3px 12px" : "3px 18px", minWidth: 0, fontSize: 13, lineHeight: 1.35, color: colors.text }}>{(briefLines.length ? briefLines : ["All clear"]).slice(0, isMobile ? 3 : 5).map((line, index) => <span key={index} style={{ whiteSpace: "normal" }}><span style={{ color: String(line).includes("overdue") ? colors.red : colors.gold, fontWeight: 950 }}>•</span> {line}</span>)}</div></div></section>;
    if (id === "recent-activity") return <details style={{ ...cardStyle, overflow: "hidden" }}>
      <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div><div style={eyebrowStyle}>Recent Activity</div><h3 style={{ margin: 0, color: colors.navy }}>Updates from the last 7 days</h3></div>
        <span style={{ ...badgeStyle("Monitor"), flex: "0 0 auto" }}>{dashboardFeedCounts.All}</span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, flexWrap: "wrap", marginBottom: 8 }}><button type="button" onClick={prepareWeeklyOwnerUpdate} style={secondaryButtonStyle}>Weekly Update</button>{!isMobile ? <button type="button" onClick={() => setScreen("history")} style={secondaryButtonStyle}>View history</button> : null}</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 0 8px", scrollbarWidth: "none" }}>{(["All","Work","Requests","Vendors","Photos","Alerts"] as const).map((filter) => <button key={filter} type="button" onClick={() => setDashboardFeedFilter(filter)} style={{ ...(dashboardFeedFilter === filter ? goldButtonStyle : secondaryButtonStyle), flex: "0 0 auto", minWidth: "max-content", minHeight: 32, padding: "5px 10px", whiteSpace: "nowrap", wordBreak: "normal", overflowWrap: "normal", fontSize: 12 }}>{filter} <span style={{ opacity: .75 }}>({dashboardFeedCounts[filter]})</span></button>)}</div>
        <div style={{ display: "grid", gap: 7 }}>{filteredDashboardFeed.map((item) => {
          const tone = item.tone === "red" ? { bg: "#FEF2F2", fg: "#B42318" } : item.tone === "gold" ? { bg: "#FFF7E5", fg: "#8A5A00" } : item.tone === "green" ? { bg: "#EAF7F1", fg: colors.green } : { bg: "#EEF4FF", fg: colors.navy2 };
          const time = new Date(item.at); const timeLabel = Number.isNaN(time.getTime()) ? "Recently" : time.toDateString() === new Date().toDateString() ? time.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}) : time.toLocaleDateString(undefined,{month:"short",day:"numeric"});
          return <div key={item.id} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", alignItems: "center", gap: isMobile ? 7 : 9, border: `1px solid ${colors.line}`, borderRadius: 11, background: "#FFFFFF", padding: isMobile ? "8px" : "9px 10px" }}><span style={{ width: 30, height: 30, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", background: tone.bg, color: tone.fg, fontWeight: 950 }}>{item.icon}</span><button type="button" onClick={item.action} style={{ minWidth: 0, border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}><strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: colors.navy }}>{item.title}</strong><small style={{ ...mutedSmallStyle, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail} · {timeLabel}</small></button><div style={{ display: "flex", gap: 5, alignItems: "center" }}><button type="button" aria-label={item.actionLabel} onClick={item.action} style={{ ...secondaryButtonStyle, minWidth: isMobile ? 30 : undefined, minHeight: 30, padding: isMobile ? "3px 7px" : "4px 8px", fontSize: isMobile ? 18 : 11 }}>{isMobile ? "›" : item.actionLabel}</button><button type="button" title="Dismiss from feed" onClick={() => setDismissedDashboardFeedIds((current) => [...current, item.id])} style={{ width: 28, minHeight: 28, borderRadius: 8, border: `1px solid ${colors.line}`, background: "#FFFFFF", color: colors.muted, cursor: "pointer" }}>×</button></div></div>;
        })}{!filteredDashboardFeed.length ? <div style={noticeStyle}>No {dashboardFeedFilter === "All" ? "recent" : dashboardFeedFilter.toLowerCase()} activity is available for this property.</div> : null}</div>
      </div>
    </details>;
    const dashboardWeatherDetail = weatherDays.find((day) => day.date === dashboardWeatherDetailDate);
    const dashboardWeatherEvents = dashboardWeatherDetail
      ? [...todayEvents, ...upcomingEvents].filter((item) => item.date === dashboardWeatherDetail.date)
      : [];
    const weatherScheduleRecommendation = (day: WeatherDay, events: typeof dashboardWeatherEvents) => {
      const conditions = weatherText(Number(day.code || 0)).toLowerCase();
      const rainRisk = Number(day.precipChance || 0);
      const eventText = events.map((item) => `${item.title || ""} ${item.area || ""} ${item.categoryLabel || ""}`).join(" ").toLowerCase();
      const recommendations: string[] = [];
      if (rainRisk >= 55 || conditions.includes("rain") || conditions.includes("storm")) recommendations.push("Move exterior work, painting, detailing, and open-dock tasks to the driest part of the day or reschedule them.");
      else recommendations.push("Weather is generally suitable for scheduled exterior work.");
      if (eventText.includes("landscap") || eventText.includes("lawn") || eventText.includes("weed")) recommendations.push(rainRisk >= 45 ? "Prioritize hand work and protected beds; avoid mowing wet turf." : "Good window for landscaping, mowing, and bed work.");
      if (eventText.includes("dock") || eventText.includes("boat") || eventText.includes("marine")) recommendations.push(rainRisk >= 45 ? "Confirm dock and boat work before vendors arrive and secure exposed equipment." : "Dock and marine work can proceed; verify wind and lake conditions that morning.");
      if (eventText.includes("paint") || eventText.includes("stain")) recommendations.push(rainRisk >= 30 ? "Painting or staining may need a dry-weather backup date." : "Conditions appear favorable for painting or staining.");
      if (!events.length) recommendations.push("No Atlas calendar items are currently scheduled for this day.");
      return recommendations;
    };
    return <section id="atlas-dashboard-weather" className="atlas-weather-experience" aria-label="Property weather forecast">
      <div className="atlas-weather-ambient" aria-hidden="true" />
      <div className="atlas-weather-main-row">
        <div className="atlas-weather-current">
          <div className="atlas-weather-kicker">Property weather · 7-day outlook</div>
          <div className="atlas-weather-current-row"><span className="atlas-weather-current-glyph">{todaysWeather ? weatherGlyph(Number(todaysWeather.code || 0)) : null}</span><div><div className="atlas-weather-current-temp">{todaysWeather ? Math.round(Number(todaysWeather.high || 0)) : "—"}°</div><div className="atlas-weather-current-label">{todaysWeather ? weatherText(Number(todaysWeather.code || 0)) : "Loading forecast"}</div><div className="atlas-weather-current-detail">{todaysWeather ? `Low ${Math.round(Number(todaysWeather.low || 0))}°` : "Weather intelligence is loading."}</div></div></div>
        </div>
        <div className="atlas-weather-days">{weatherDays.slice(0,7).map((day,index) => <button key={String(day.date || index)} type="button" className="atlas-weather-day" onClick={() => setDashboardWeatherDetailDate(day.date)} aria-label={`Open ${index === 0 ? "today" : new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined,{weekday:"long"})} weather details`}><span className="atlas-weather-day-heading"><strong>{index === 0 ? "Today" : new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined,{weekday:"short"})}</strong><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</small></span><span className="atlas-weather-day-glyph">{weatherGlyph(Number(day.code || 0))}</span><span className="atlas-weather-day-temperature"><strong>{Math.round(Number(day.high || 0))}°</strong><small>{Math.round(Number(day.low || 0))}°</small></span><span className="atlas-weather-day-condition">{weatherText(Number(day.code || 0))}</span></button>)}</div>
      </div>
      <div className="atlas-weather-recommendations"><div className="atlas-weather-operation-card"><span className="atlas-weather-operation-icon">💧</span><div><strong>Irrigation</strong><span>{todaysWeather ? irrigationAdvice(todaysWeather) : "Guidance loading."}</span></div></div><div className="atlas-weather-operation-card"><span className="atlas-weather-operation-icon">⌂</span><div><strong>Today’s property plan</strong><span>{todaysWeather ? weatherDayPlanning(todaysWeather) : "Recommendations loading."}</span></div></div></div>
      {dashboardWeatherDetail ? <div className="atlas-weather-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDashboardWeatherDetailDate(""); }}><section className="atlas-weather-detail-card" role="dialog" aria-modal="true" aria-label={`${dashboardWeatherDetail.date} weather and schedule recommendations`}><button type="button" className="atlas-weather-detail-close" onClick={() => setDashboardWeatherDetailDate("")} aria-label="Close weather details">×</button><div className="atlas-weather-detail-heading"><span>{weatherGlyph(Number(dashboardWeatherDetail.code || 0))}</span><div><div className="atlas-weather-kicker">Weather + Atlas schedule</div><h3>{new Date(`${dashboardWeatherDetail.date}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</h3><p>{weatherText(Number(dashboardWeatherDetail.code || 0))} · High {Math.round(Number(dashboardWeatherDetail.high || 0))}° · Low {Math.round(Number(dashboardWeatherDetail.low || 0))}° · {Number(dashboardWeatherDetail.precipChance || 0)}% precipitation</p></div></div><div className="atlas-weather-detail-grid"><div><strong>Scheduled in Atlas</strong>{dashboardWeatherEvents.length ? <div className="atlas-weather-schedule-list">{dashboardWeatherEvents.slice(0,6).map((item) => <button type="button" key={item.instanceId || item.id} onClick={() => { setDashboardWeatherDetailDate(""); openDashboardCalendarItem(item); }}><span>{item.time || "All day"}</span><b>{item.title || "Calendar item"}</b></button>)}</div> : <p className="atlas-weather-empty">Nothing is currently scheduled.</p>}</div><div><strong>Recommendations</strong><ul>{weatherScheduleRecommendation(dashboardWeatherDetail,dashboardWeatherEvents).map((recommendation,index) => <li key={`${dashboardWeatherDetail.date}-${index}`}>{recommendation}</li>)}</ul><div className="atlas-weather-detail-irrigation"><b>Irrigation:</b> {irrigationAdvice(dashboardWeatherDetail)}</div></div></div><div className="atlas-weather-detail-actions"><button type="button" onClick={() => { setDashboardWeatherDetailDate(""); setScreen("calendar"); }} style={secondaryButtonStyle}>Open Calendar</button></div></section></div> : null}
    </section>;
  };


  type DashboardCenterView = "command" | "operations" | "intelligence";
  const dashboardCenterTabs: { id: DashboardCenterView; label: string }[] = [
    { id: "command", label: "Command Center" },
    { id: "operations", label: "Operations 3.0" },
    { id: "intelligence", label: "Intelligence 4.0" },
  ];
  const dashboardCenterSelector = (
    <section style={{ ...cardStyle, padding: 8, display: "flex", gap: 6, overflowX: "auto", alignItems: "center" }}>
      {dashboardCenterTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setDashboardCenterView(tab.id)}
          style={{
            ...(dashboardCenterView === tab.id ? goldButtonStyle : secondaryButtonStyle),
            minHeight: 34,
            padding: "6px 11px",
            whiteSpace: "nowrap",
            fontSize: 12,
          }}
        >
          {tab.label}
        </button>
      ))}
    </section>
  );

  const workText = (record: ServiceRecord) =>
    `${record.title || ""} ${record.notes || ""} ${(record as AtlasServiceRecord).workCategory || ""}`.toLowerCase();
  const waitingVendor = openWork.filter((record) => record.status === "Waiting" && /(vendor|contractor|service|quote|estimate|schedule)/i.test(workText(record)));
  const waitingOwner = openWork.filter((record) => record.status === "Waiting" && /(owner|jeremy|jessica|steve|approval|decision)/i.test(workText(record)));
  const waitingParts = openWork.filter((record) => record.status === "Waiting" && /(part|parts|material|order|delivery|backorder)/i.test(workText(record)));
  const dueThisWeek = openWork.filter((record) => Boolean(record.date) && String(record.date) >= today && String(record.date) <= nextSevenDaysISO);
  const flexibleRecurring = openWork.filter((record) => Boolean(record.recurring) && !record.date);
  const fixedAppointments = [...todayEvents, ...upcomingEvents].filter((item) => Boolean(item.time)).slice(0, 12);
  const staffNames = ["Nick", "Addison", "Pat's Crew", "Sean", "Vendors"] as const;
  const effortHours = (record: AtlasServiceRecord) => {
    const effort = String(record.effort || "");
    if (effort === "5 minutes") return 0.1;
    if (effort === "15 minutes") return 0.25;
    if (effort === "30 minutes") return 0.5;
    if (effort === "1 hour") return 1;
    if (effort === "Half Day") return 4;
    if (effort === "Full Day") return 8;
    if (effort === "Multi-Day") return 16;
    return 1;
  };
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);
  const serviceCost = (record: ServiceRecord) => Number(record.actualCost || record.estimatedCost || 0);
  const monthlySpend = serviceRecords.filter((record) => String(record.date || record.lastCompletedDate || "").startsWith(currentMonth)).reduce((sum, record) => sum + serviceCost(record), 0);
  const yearlySpend = serviceRecords.filter((record) => String(record.date || record.lastCompletedDate || "").startsWith(currentYear)).reduce((sum, record) => sum + serviceCost(record), 0);
  const annualBudget = Math.max(yearlySpend, serviceRecords.reduce((sum, record) => sum + Number(record.estimatedCost || 0), 0));
  const remainingBudget = Math.max(0, annualBudget - yearlySpend);
  const documentationCoverage = assetRecords.length
    ? Math.round((assetRecords.filter((asset) => Boolean(asset.notes || asset.make || asset.model || asset.serial)).length / assetRecords.length) * 100)
    : 100;
  const recurringMissed = openWork.filter((record) => Boolean(record.recurring) && Boolean(record.date) && String(record.date) < today);
  const duplicateGroups = (Object.values(openWork.reduce((groups, record) => {
    const key = String(record.title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
    if (key) (groups[key] ||= []).push(record);
    return groups;
  }, {} as Record<string, ServiceRecord[]>)) as ServiceRecord[][]).filter((group) => group.length > 1);
  const safetyOpen = openWork.filter((record) => /(safety|alarm|generator|emergency|inspection|fire|leak)/i.test(workText(record)));
  const vendorIssues = waitingVendor.length + openWork.filter((record) => Boolean(record.vendorId) && String(record.date || "") < today).length;
  const estateHealthScore = Math.max(0, Math.min(100, Math.round(
    100
    - overdueWork.length * 5
    - highPriority.length * 3
    - recurringMissed.length * 4
    - safetyOpen.length * 4
    - vendorIssues * 2
    - Math.max(0, 85 - documentationCoverage) * 0.25
  )));
  const healthTone = estateHealthScore >= 85 ? colors.green : estateHealthScore >= 70 ? "#B54708" : colors.red;
  const assetRisks = assetRecords.map((asset) => {
    const related = serviceRecords.filter((record) => record.assetId === asset.id);
    const relatedOpen = related.filter((record) => record.status !== "Completed");
    const relatedOverdue = relatedOpen.filter((record) => Boolean(record.date) && String(record.date) < today);
    const relatedHigh = relatedOpen.filter((record) => record.priority === "High");
    const completedDates = related.flatMap((record) => [
      record.lastCompletedDate,
      ...(record.completionHistory || []),
    ]).filter(Boolean).sort();
    const lastService = completedDates[completedDates.length - 1] || "";
    const daysSince = lastService ? Math.max(0, Math.floor((Date.now() - new Date(`${lastService}T12:00:00`).getTime()) / 86400000)) : 365;
    const risk = Math.max(1, Math.min(100, Math.round(
      18 + relatedOverdue.length * 18 + relatedHigh.length * 12 + relatedOpen.length * 4 + Math.min(24, daysSince / 30 * 2)
    )));
    const nextRecurring = relatedOpen.filter((record) => record.recurring && record.date).map((record) => String(record.date)).sort()[0] || "";
    const daysUntil = nextRecurring ? Math.ceil((new Date(`${nextRecurring}T12:00:00`).getTime() - Date.now()) / 86400000) : Math.max(0, 180 - daysSince);
    return {
      asset,
      risk,
      daysUntil,
      lastService,
      cost: related.reduce((sum, record) => sum + serviceCost(record), 0),
      open: relatedOpen.length,
    };
  }).sort((a, b) => b.risk - a.risk);
  const vendorAnalytics = vendorRecords.map((vendor) => {
    const records = serviceRecords.filter((record) => record.vendorId === vendor.id);
    const completed = records.filter((record) => record.status === "Completed");
    const overdue = records.filter((record) => record.status !== "Completed" && Boolean(record.date) && String(record.date) < today);
    const totalCost = records.reduce((sum, record) => sum + serviceCost(record), 0);
    const reliability = records.length ? Math.max(0, Math.round(100 - overdue.length / records.length * 100)) : 100;
    const rating = Math.max(1, Math.min(5, Math.round((reliability / 20) * 10) / 10));
    const lastService = completed.map((record) => String(record.lastCompletedDate || record.date || "")).filter(Boolean).sort().pop() || "";
    return { vendor, records: records.length, completed: completed.length, overdue: overdue.length, totalCost, averageCost: records.length ? totalCost / records.length : 0, reliability, rating, lastService };
  }).filter((item) => item.records > 0).sort((a, b) => b.reliability - a.reliability || b.completed - a.completed);
  const locationRisk = locations.map((location) => {
    const records = openWork.filter((record) => (record as AtlasServiceRecord).locationId === location.id || assetRecords.some((asset) => asset.id === record.assetId && assetHasLocation(asset, location.id)));
    const overdue = records.filter((record) => Boolean(record.date) && String(record.date) < today);
    const risk = Math.min(100, records.length * 8 + overdue.length * 18 + records.filter((record) => record.priority === "High").length * 14);
    return { location, records, overdue, risk };
  }).filter((item) => item.records.length).sort((a, b) => b.risk - a.risk);
  const categoryCosts = serviceRecords.reduce((map, record) => {
    const category = String((record as AtlasServiceRecord).workCategory || "General").replace(/^[^\w]+/, "").trim() || "General";
    map[category] = (map[category] || 0) + serviceCost(record);
    return map;
  }, {} as Record<string, number>);
  const topCategoryCosts = Object.entries(categoryCosts as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const staffAnalytics = staffNames.map((name) => {
    const assigned = openWork.filter((record) => {
      const assignedTo = String((record as AtlasServiceRecord).assignedTo || "").toLowerCase();
      if (name === "Vendors") return Boolean(record.vendorId) || assignedTo.includes("vendor");
      return assignedTo === name.toLowerCase();
    });
    const completedToday = completedTodayOccurrences.filter(({ record }) => {
      const assignedTo = String((record as AtlasServiceRecord).assignedTo || "").toLowerCase();
      if (name === "Vendors") return Boolean(record.vendorId) || assignedTo.includes("vendor");
      return assignedTo === name.toLowerCase();
    }).length;
    const hours = assigned.reduce((sum, record) => sum + effortHours(record as AtlasServiceRecord), 0);
    const dueSoon = assigned.filter((record) => Boolean(record.date) && String(record.date) <= nextSevenDaysISO).length;
    return { name, assigned, completedToday, hours, dueSoon };
  });
  const recommendations = [
    overdueWork.length ? { priority: "Critical", title: `Recover ${overdueWork.length} overdue item${overdueWork.length === 1 ? "" : "s"}`, detail: "Move the highest-risk overdue work into the next available staff or vendor slot.", action: () => openWorkOrderFilter("overdue") } : null,
    safetyOpen.length ? { priority: "Critical", title: `Review ${safetyOpen.length} safety-related item${safetyOpen.length === 1 ? "" : "s"}`, detail: "Safety and inspection work should remain ahead of cosmetic or discretionary work.", action: () => setScreen("history") } : null,
    recurringMissed.length ? { priority: "High", title: "Missed recurring maintenance detected", detail: `${recurringMissed.length} recurring occurrence${recurringMissed.length === 1 ? " is" : "s are"} past due.`, action: () => setScreen("planner") } : null,
    duplicateGroups.length ? { priority: "Medium", title: "Possible duplicate work detected", detail: `${duplicateGroups.length} duplicate title group${duplicateGroups.length === 1 ? "" : "s"} should be consolidated before scheduling.`, action: () => setScreen("history") } : null,
    waitingParts.length ? { priority: "Medium", title: "Bundle parts-dependent work", detail: `${waitingParts.length} item${waitingParts.length === 1 ? "" : "s"} can be grouped into the next purchasing cycle.`, action: () => setScreen("parts") } : null,
    todaysWeather && Number(todaysWeather.precipChance || 0) >= 60 ? { priority: "Medium", title: "Shift weather-sensitive work", detail: "Move exposed landscaping, painting, and dock work to the next workable weather window.", action: () => setScreen("planner") } : null,
    assetRisks[0] ? { priority: assetRisks[0].risk >= 70 ? "High" : "Medium", title: `${assetRisks[0].asset.name} has the highest asset risk`, detail: `Risk ${assetRisks[0].risk}/100 with ${assetRisks[0].open} open item${assetRisks[0].open === 1 ? "" : "s"}.`, action: () => { setSelectedAssetId(assetRisks[0].asset.id); setScreen("assets"); } } : null,
  ].filter(Boolean) as { priority: string; title: string; detail: string; action: () => void }[];

  const syncWorkOrderPatch = async (record: ServiceRecord, patch: Partial<AtlasServiceRecord>) => {
    const updated = normalizeService({ ...(record as AtlasServiceRecord), ...patch });
    setServiceRecords((current) => byTitle(current.map((item) => item.id === updated.id ? updated : item)));
    const saved = await postAtlasRecord("work_orders", updated);
    showSaveToast(saved ? `Saved ${updated.title}.` : `${updated.title} changed locally, but shared sync did not finish.`, saved ? "success" : "warning");
  };
  const skipWorkOccurrence = async (record: ServiceRecord) => {
    if (!record.recurring) return;
    const unit = isWorkOrderRecurrenceUnit(record.recurrenceUnit) ? record.recurrenceUnit : "Weeks";
    const nextDate = nextRecurrenceDate(record.date || today, record.recurrenceInterval || 1, unit);
    await syncWorkOrderPatch(record, { date: nextDate, status: "Scheduled" });
  };
  const moveWorkOccurrence = async (record: ServiceRecord, days: number) => {
    await syncWorkOrderPatch(record, { date: addDays(record.date || today, days), status: "Scheduled" });
  };

  const compactWorkList = (title: string, records: ServiceRecord[], emptyText: string) => (
    <section style={{ ...cardStyle, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 9 }}>
        <strong style={{ color: colors.navy }}>{title}</strong>
        <span style={badgeStyle(records.length ? "Monitor" : "Completed")}>{records.length}</span>
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {records.slice(0, 7).map((record) => (
          <div key={record.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 9, display: "grid", gap: 7 }}>
            <button type="button" onClick={() => openWorkOrderById(record.id)} style={{ border: 0, padding: 0, background: "transparent", textAlign: "left", cursor: "pointer", color: colors.text }}>
              <strong style={{ display: "block", fontSize: 13 }}>{record.title}</strong>
              <span style={mutedSmallStyle}>{record.date ? formatDate(record.date) : "Flexible"} · {record.priority || "Medium"} · {String((record as AtlasServiceRecord).assignedTo || "Unassigned")}</span>
            </button>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <select value={String((record as AtlasServiceRecord).assignedTo || "")} onChange={(event) => void syncWorkOrderPatch(record, { assignedTo: event.target.value })} style={{ ...selectStyle, minHeight: 30, padding: "4px 7px", fontSize: 11 }}>
                <option value="">Assign</option>
                {staffNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <button type="button" onClick={() => void completeWorkOrder(record as AtlasServiceRecord)} style={{ ...goldButtonStyle, minHeight: 30, padding: "4px 8px", fontSize: 11 }}>Complete</button>
              {record.recurring ? <button type="button" onClick={() => void skipWorkOccurrence(record)} style={{ ...secondaryButtonStyle, minHeight: 30, padding: "4px 8px", fontSize: 11 }}>Skip</button> : null}
              <button type="button" onClick={() => void moveWorkOccurrence(record, 1)} style={{ ...secondaryButtonStyle, minHeight: 30, padding: "4px 8px", fontSize: 11 }}>Move +1d</button>
            </div>
          </div>
        ))}
        {!records.length ? <span style={mutedSmallStyle}>{emptyText}</span> : null}
      </div>
    </section>
  );

  const metricBar = (label: string, value: number, max: number, suffix = "") => (
    <div key={label} style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}><span>{label}</span><strong>{value.toLocaleString()}{suffix}</strong></div>
      <div style={{ height: 8, borderRadius: 999, background: colors.line, overflow: "hidden" }}><div style={{ width: `${max ? Math.max(2, Math.min(100, value / max * 100)) : 0}%`, height: "100%", background: colors.navy3 }} /></div>
    </div>
  );

  const operationsCenter = (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ ...sectionStyle, background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`, color: "#FFFFFF" }}>
        <SectionHeader eyebrow="Atlas Operations Center 3.0" title={`${activeProperty.name} Daily Operations`} detail="Live priorities, assignments, schedule pressure, and completion flow from the existing Atlas work-order system." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))", gap: 8 }}>
          {[["Due Today", dueToday.length], ["This Week", dueThisWeek.length], ["Overdue", overdueWork.length], ["High Priority", highPriority.length], ["Completed Today", completedTodayOccurrences.length]].map(([label, value]) => {
            const action = label === "Due Today" ? () => openWorkOrderFilter("today") : label === "Overdue" ? () => openWorkOrderFilter("overdue") : label === "High Priority" ? () => openWorkOrderFilter("high") : label === "Completed Today" ? () => openWorkOrderFilter("completed-today") : undefined;
            return <button key={String(label)} type="button" onClick={action} disabled={!action} style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: 10, background: "rgba(255,255,255,.08)", color: "#FFFFFF", textAlign: "left", cursor: action ? "pointer" : "default" }}><span style={{ fontSize: 11, opacity: .8 }}>{label}</span><strong style={{ display: "block", fontSize: 25 }}>{value}</strong></button>;
          })}
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 12 }}>
        {compactWorkList("Today's Priorities", [...dueToday, ...highPriority.filter((record) => !dueToday.some((item) => item.id === record.id))].slice(0, 8), "No priorities are due today.")}
        {compactWorkList("Waiting", [...waitingVendor, ...waitingOwner, ...waitingParts].filter((record, index, all) => all.findIndex((item) => item.id === record.id) === index), "Nothing is currently waiting.")}
        {compactWorkList("Recently Completed", recentActivity, "No recently completed work.")}
      </div>
      <section style={sectionStyle}>
        <SectionHeader eyebrow="Staff Assignment Center" title="Workload and Progress" detail="Assignments use the existing work-order assignedTo field and save through the shared Atlas database." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,minmax(0,1fr))", gap: 9 }}>
          {staffAnalytics.map((staff) => <div key={staff.name} style={{ ...cardStyle, padding: 11 }}><strong style={{ color: colors.navy }}>{staff.name}</strong><div style={{ display: "grid", gap: 5, marginTop: 9, fontSize: 12 }}><span>Assigned <b>{staff.assigned.length}</b></span><span>Estimated <b>{staff.hours.toFixed(1)}h</b></span><span>Completed today <b>{staff.completedToday}</b></span><span>Upcoming <b>{staff.dueSoon}</b></span></div><div style={{ height: 7, borderRadius: 999, background: colors.line, overflow: "hidden", marginTop: 9 }}><div style={{ height: "100%", width: `${Math.min(100, staff.hours / 40 * 100)}%`, background: colors.gold }} /></div></div>)}
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr .8fr", gap: 12 }}>
        <section style={sectionStyle}>
          <SectionHeader eyebrow="Weekly Planner" title="AI-Assisted Work Week" detail="The existing Atlas planner builds around recurring work, priority, workload, fixed commitments, and available weather." />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,minmax(0,1fr))", gap: 8 }}>
            {workPlanDays.map((day) => {
              const tasks = workPlanTasks.filter((task) => task.scheduledDay === day);
              return <div key={day} style={{ ...cardStyle, padding: 10, minHeight: 130 }}><strong>{day}</strong><span style={{ ...mutedSmallStyle, display: "block", marginBottom: 7 }}>{tasks.reduce((sum, task) => sum + task.minutes, 0) / 60}h planned</span>{tasks.slice(0,4).map((task) => <div key={task.id} style={{ borderTop: `1px solid ${colors.line}`, padding: "5px 0", fontSize: 11 }}>{task.title}</div>)}</div>;
            })}
          </div>
          <div style={{ ...buttonRowStyle, marginTop: 10 }}><button type="button" onClick={() => setScreen("planner")} style={goldButtonStyle}>Open Weekly Planner</button><button type="button" onClick={buildWorkPlan} style={secondaryButtonStyle}>Rebuild Week</button></div>
        </section>
        <section style={sectionStyle}>
          <SectionHeader eyebrow="Morning Brief" title="What Needs Attention" detail={todaysWeather ? `${weatherText(Number(todaysWeather.code || 0))}, ${Math.round(Number(todaysWeather.high || 0))}° high · ${Number(todaysWeather.precipChance || 0)}% precipitation` : "Weather is loading."} />
          <div style={{ display: "grid", gap: 7 }}>
            {recommendations.slice(0, 5).map((item) => <button key={item.title} type="button" onClick={item.action} style={{ ...cardStyle, padding: 9, textAlign: "left", cursor: "pointer" }}><strong style={{ display: "block" }}>{item.title}</strong><span style={mutedSmallStyle}>{item.detail}</span></button>)}
            {vendorEvents.slice(0, 3).map((item) => <button key={item.instanceId || item.id} type="button" onClick={() => openDashboardCalendarItem(item)} style={{ ...cardStyle, padding: 9, textAlign: "left", cursor: "pointer" }}><strong>{item.title}</strong><span style={{ ...mutedSmallStyle, display: "block" }}>{item.date === today ? "Today" : formatDate(item.date)} {item.time || ""}</span></button>)}
          </div>
        </section>
      </div>
      <section style={sectionStyle}>
        <SectionHeader eyebrow="End of Day" title="Daily Closeout" detail="Completion and movement are derived from today’s work history and operations log." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(6,minmax(0,1fr))", gap: 8 }}>
          {[["Completed", completedTodayOccurrences.length], ["Moved", todaysLogEntries.filter((entry) => /moved|rescheduled/i.test(entry.text)).length], ["Skipped", todaysLogEntries.filter((entry) => /skip/i.test(entry.text)).length], ["Outstanding", dueToday.length], ["Hours", staffAnalytics.reduce((sum, staff) => sum + staff.hours, 0).toFixed(1)], ["Log Entries", todaysLogEntries.length]].map(([label, value]) => <div key={String(label)} style={{ ...cardStyle, padding: 10 }}><span style={mutedSmallStyle}>{label}</span><strong style={{ display: "block", fontSize: 22, color: colors.navy }}>{value}</strong></div>)}
        </div>
      </section>
    </div>
  );

  const intelligenceCenter = (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ ...sectionStyle, background: `linear-gradient(135deg, ${colors.navy}, #173E68)`, color: "#FFFFFF" }}>
        <SectionHeader eyebrow="Atlas Intelligence Center 4.0" title="Estate Intelligence" detail="Risk, maintenance, labor, vendor, and documentation signals calculated from the current Atlas records." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: 14, alignItems: "center" }}>
          <div style={{ display: "grid", placeItems: "center" }}><div style={{ width: 174, height: 174, borderRadius: "50%", display: "grid", placeItems: "center", background: `conic-gradient(${healthTone} ${estateHealthScore * 3.6}deg, rgba(255,255,255,.16) 0)`, padding: 12 }}><div style={{ width: "100%", height: "100%", borderRadius: "50%", background: colors.navy, display: "grid", placeItems: "center", textAlign: "center" }}><div><strong style={{ fontSize: 48 }}>{estateHealthScore}</strong><span style={{ display: "block", fontSize: 12, opacity: .78 }}>Estate Health</span></div></div></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{[["Open Work", openWork.length], ["Overdue", overdueWork.length], ["Recurring Missed", recurringMissed.length], ["Asset Risks 70+", assetRisks.filter((item) => item.risk >= 70).length], ["Vendor Issues", vendorIssues], ["Documentation", `${documentationCoverage}%`]].map(([label,value]) => <div key={String(label)} style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: 10, padding: 9, background: "rgba(255,255,255,.07)" }}><span style={{ fontSize: 11, opacity: .78 }}>{label}</span><strong style={{ display: "block", fontSize: 21 }}>{value}</strong></div>)}</div>
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.15fr .85fr", gap: 12 }}>
        <section style={sectionStyle}><SectionHeader eyebrow="AI Operations Director" title="Recommended Next Actions" detail="Recommendations are recalculated from current work, asset, vendor, weather, and documentation signals." /><div style={{ display: "grid", gap: 8 }}>{recommendations.map((item,index) => <button key={item.title} type="button" onClick={item.action} style={{ ...cardStyle, padding: 11, textAlign: "left", cursor: "pointer", borderLeft: `4px solid ${index < 2 ? colors.red : colors.gold}` }}><span style={{ ...mutedSmallStyle, fontWeight: 900 }}>{item.priority}</span><strong style={{ display: "block", margin: "2px 0" }}>{item.title}</strong><span style={mutedSmallStyle}>{item.detail}</span></button>)}</div></section>
        <section style={sectionStyle}><SectionHeader eyebrow="Detection" title="Maintenance Intelligence" detail="Automatic checks for missed, duplicate, waiting, and high-risk work." /><div style={{ display: "grid", gap: 8 }}>{[["Missed Maintenance", recurringMissed.length],["Duplicate Work Groups",duplicateGroups.length],["Waiting on Vendor",waitingVendor.length],["Waiting on Owner",waitingOwner.length],["Waiting on Parts",waitingParts.length],["Safety Items",safetyOpen.length]].map(([label,value]) => <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: 9, borderBottom: `1px solid ${colors.line}` }}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
      </div>
      <section style={sectionStyle}><SectionHeader eyebrow="Predictive Maintenance" title="Asset Risk Scores" detail="Risk combines overdue work, priority, open workload, and time since recorded service." /><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}><thead><tr>{["Asset","Risk","Likely Maintenance","Last Service","Open","Action"].map((label) => <th key={label} style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${colors.line}`, fontSize: 11, color: colors.muted }}>{label}</th>)}</tr></thead><tbody>{assetRisks.slice(0,12).map((item) => <tr key={item.asset.id}><td style={{ padding: 8, borderBottom: `1px solid ${colors.line}` }}><strong>{item.asset.name}</strong></td><td style={{ padding: 8, borderBottom: `1px solid ${colors.line}` }}><span style={badgeStyle(item.risk >= 70 ? "High" : item.risk >= 40 ? "Medium" : "Online")}>{item.risk}</span></td><td style={{ padding: 8, borderBottom: `1px solid ${colors.line}` }}>{item.daysUntil <= 0 ? "Due now" : `${item.daysUntil} days`}</td><td style={{ padding: 8, borderBottom: `1px solid ${colors.line}` }}>{item.lastService ? formatDate(item.lastService) : "No recorded service"}</td><td style={{ padding: 8, borderBottom: `1px solid ${colors.line}` }}>{item.open}</td><td style={{ padding: 8, borderBottom: `1px solid ${colors.line}` }}><button type="button" onClick={() => { setSelectedAssetId(item.asset.id); setScreen("assets"); }} style={{ ...secondaryButtonStyle, minHeight: 30, padding: "4px 8px", fontSize: 11 }}>Open</button></td></tr>)}</tbody></table></div></section>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
        <section style={sectionStyle}><SectionHeader eyebrow="Vendor Intelligence" title="Performance Dashboard" detail="Reliability is based on completed and overdue assigned work." /><div style={{ display: "grid", gap: 8 }}>{vendorAnalytics.slice(0,8).map((item) => <div key={item.vendor.id} style={{ ...cardStyle, padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{item.vendor.name}</strong><span>{item.rating.toFixed(1)}/5</span></div><span style={mutedSmallStyle}>{item.reliability}% reliability · {item.records} jobs · ${item.averageCost.toLocaleString(undefined,{maximumFractionDigits:0})} avg · Last {item.lastService ? formatDate(item.lastService) : "not recorded"}</span></div>)}</div></section>
      </div>
      <section style={sectionStyle}><SectionHeader eyebrow="Interactive Estate Heat Map" title="Maintenance Concentration and Risk" detail="Select a location to open its Atlas record. Intensity is calculated from open, overdue, and high-priority work." /><div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>{locationRisk.slice(0,16).map((item) => <button key={item.location.id} type="button" onClick={() => { setSelectedLocationId(item.location.id); setScreen("locations"); }} style={{ border: `1px solid ${item.risk >= 65 ? "#F5A6A6" : item.risk >= 35 ? "#F2D18A" : colors.line}`, borderRadius: 12, padding: 11, textAlign: "left", cursor: "pointer", background: item.risk >= 65 ? "#FFF0F0" : item.risk >= 35 ? "#FFF8E8" : "#F2F8F5" }}><strong style={{ display: "block" }}>{item.location.name}</strong><span style={mutedSmallStyle}>Risk {item.risk} · {item.records.length} open · {item.overdue.length} overdue</span></button>)}</div></section>
    </div>
  );

  return <div className="atlas-command-dashboard" style={{ display: "grid", gap: 12 }}>
    {dailyForemanPanel}
    <div className="atlas-dashboard-layout-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gridAutoRows: "max-content", gridAutoFlow: "row", gap: 14, alignItems: "start" }}>
      {dashboardWidgets.filter((widget) => widget.visible).map((widget) => {
      const activeDropTarget = dashboardWidgetDropTarget?.id === widget.id ? dashboardWidgetDropTarget : null;
      return <div
        key={widget.id}
        className="atlas-dashboard-widget-frame"
        onDragOver={(event) => {
          if (!dashboardEditMode || !draggedDashboardWidgetId || draggedDashboardWidgetId === widget.id) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const verticalPosition = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
          setDashboardWidgetDropTarget((current) =>
            current?.id === widget.id && current.position === verticalPosition
              ? current
              : { id: widget.id, position: verticalPosition },
          );
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDashboardWidgetDropTarget((current) => current?.id === widget.id ? null : current);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const position = dashboardWidgetDropTarget?.id === widget.id
            ? dashboardWidgetDropTarget.position
            : "before";
          moveWidget(widget.id, position);
        }}
        style={{ position: "relative", gridColumn: isMobile || widget.id === "property-status" ? "1 / -1" : `span ${widget.colSpan || legacySizeColumns(widget.size)}`, gridRow: "auto", minWidth: 0, height: "max-content", alignSelf: "start", opacity: draggedDashboardWidgetId === widget.id ? .55 : 1, transition: "opacity .18s ease, transform .18s ease", overflow: "visible" }}
      >
        {activeDropTarget ? <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, height: 5, borderRadius: 999, background: colors.gold, boxShadow: "0 0 0 3px rgba(230,169,43,.18)", top: activeDropTarget.position === "before" ? -9 : "auto", bottom: activeDropTarget.position === "after" ? -9 : "auto", zIndex: 20, pointerEvents: "none" }} /> : null}
        {dashboardEditMode || widget.collapsed ? <div draggable={dashboardEditMode && !widget.locked} onDragStart={(event) => { if (!widget.locked) { event.dataTransfer.effectAllowed = "move"; setDraggedDashboardWidgetId(widget.id); setDashboardWidgetDropTarget(null); } }} onDragEnd={() => { setDraggedDashboardWidgetId(null); setDashboardWidgetDropTarget(null); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: `1px solid ${colors.line}`, borderBottom: widget.collapsed ? `1px solid ${colors.line}` : 0, borderRadius: widget.collapsed ? 14 : "14px 14px 0 0", background: colors.navy, color: "#FFFFFF", padding: "8px 10px", cursor: dashboardEditMode && !widget.locked ? "grab" : "default", userSelect: "none" }}><strong>{dashboardWidgetDefinitions[widget.id].title}</strong><div style={{ display: "flex", gap: 5, alignItems: "center" }}>{dashboardEditMode ? <><span style={{ fontSize: 11, opacity: .75 }}>{widget.colSpan || legacySizeColumns(widget.size)}/12 wide</span><button type="button" title={widget.locked ? "Unlock widget" : "Lock widget"} onClick={(event) => { event.stopPropagation(); updateWidget(widget.id, { locked: !widget.locked }); }} style={{ width: 30, minHeight: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: widget.locked ? "rgba(230,169,43,.28)" : "rgba(255,255,255,.12)", color: "#FFFFFF", cursor: "pointer" }}>{widget.locked ? "🔒" : "🔓"}</button><button type="button" title="Reset widget size" onClick={(event) => { event.stopPropagation(); resetWidgetGrid(widget.id); }} style={{ width: 30, minHeight: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.12)", color: "#FFFFFF", cursor: "pointer" }}>↺</button></> : null}<button type="button" onClick={() => updateWidget(widget.id, { collapsed: !widget.collapsed })} style={{ width: 30, minHeight: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.12)", color: "#FFFFFF", cursor: "pointer" }}>{widget.collapsed ? "+" : "−"}</button>{dashboardEditMode ? <button type="button" onClick={() => updateWidget(widget.id, { visible: false })} style={{ width: 30, minHeight: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.12)", color: "#FFFFFF", cursor: "pointer" }}>×</button> : null}</div></div> : null}
        {!widget.collapsed ? <div className="atlas-dashboard-widget-content" style={{ height: "auto", minHeight: 0, overflow: "visible", ...(dashboardEditMode ? { border: `1px dashed ${colors.gold}`, borderTop: 0, borderRadius: "0 0 14px 14px" } : {}) }}>{renderWidgetContent(widget.id)}</div> : null}
        {dashboardEditMode && !widget.collapsed && !widget.locked && !isMobile ? <div onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginWidgetResize(event, widget, "x"); }} title="Resize widget width" style={{ position: "absolute", top: 42, right: -4, bottom: 4, width: 10, cursor: "ew-resize", zIndex: 5, touchAction: "none" }} /> : null}
      </div>;})}
    </div>
  </div>;
}
