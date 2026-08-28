"use client";

import React from "react";
import type {
  CalendarColorName,
  CalendarLinkType,
  CalendarReminder,
  CalendarRepeat,
} from "../lib/atlas-types";

type AtlasCalendarProps = {
  Field: any;
  ListDrawerLayout: any;
  addCalendarItem: any;
  applyCalendarIntake?: any;
  assetRecords: any[];
  blankCalendarItem: any;
  buttonRowStyle: React.CSSProperties;
  byName: any;
  byTitle: any;
  calendarCategoryFilters: Record<string, boolean>;
  calendarCellStyle: React.CSSProperties;
  calendarColorDotStyle: React.CSSProperties;
  calendarColors: any[];
  calendarColorsBoxStyle?: React.CSSProperties;
  calendarCompactCellStyle: React.CSSProperties;
  calendarCompactControlPanelStyle: React.CSSProperties;
  calendarCompactMoreStyle: React.CSSProperties;
  calendarCompactPillStyle: React.CSSProperties;
  calendarControlPanelStyle: React.CSSProperties;
  calendarCursor: Date;
  calendarDayNameStyle: React.CSSProperties;
  calendarDoneBadgeStyle: React.CSSProperties;
  calendarDoneMiniStyle: React.CSSProperties;
  calendarFilterDropdownStyle: React.CSSProperties;
  calendarFilterLabels: string[];
  calendarFilterListItemStyle: React.CSSProperties;
  calendarFilterListStyle: React.CSSProperties;
  calendarFilterSummaryStyle: React.CSSProperties;
  calendarGridStyle: React.CSSProperties;
  calendarHeaderStyle: React.CSSProperties;
  calendarIntakeMessage?: any;
  calendarIntakeText?: any;
  calendarMonthWhitePanelStyle: React.CSSProperties;
  calendarMoreStyle: React.CSSProperties;
  calendarNavyShellStyle: React.CSSProperties;
  calendarPillContentStyle: React.CSSProperties;
  calendarPillStyle: React.CSSProperties;
  calendarPlainColors: any[];
  calendarSelectedEventRowStyle: React.CSSProperties;
  calendarTodayBoxStyle: React.CSSProperties;
  calendarTodayItemStyle: React.CSSProperties;
  calendarView: "month" | "week";
  calendarWeatherIconStyle: React.CSSProperties;
  calendarWeekStyle: React.CSSProperties;
  calendarWhiteDrawerStyle: React.CSSProperties;
  calendarWhitePanelStyle: React.CSSProperties;
  categoryToColorId: any;
  checkboxLineStyle: React.CSSProperties;
  colorForEvent: any;
  colors: any;
  compactAddBoxStyle: React.CSSProperties;
  dangerButtonStyle: React.CSSProperties;
  deleteCalendarItem: any;
  editorHeaderStyle: React.CSSProperties;
  expandedCalendarItems: any[];
  eyebrowStyle: React.CSSProperties;
  fieldLabelStyle: React.CSSProperties;
  formGridStyle: React.CSSProperties;
  formatDate: any;
  goldButtonStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  isMobile: boolean;
  linkTypeOptions: string[];
  locations: any[];
  monthCells: any[];
  monthName: any;
  moveCalendarPeriod: any;
  moveCalendarYear: any;
  mutedSmallStyle: React.CSSProperties;
  openCalendarItem: any;
  onOpenLinkedRecord?: (event: any) => boolean | void;
  onConvertToWorkOrder?: (event: any) => boolean | Promise<boolean>;
  onCreateWorkOrder?: (date: string) => unknown | Promise<unknown>;
  selectedCalendarOccurrenceDate?: string;
  onSaveOccurrence?: () => void | Promise<void>;
  onDeleteOccurrence?: () => void | Promise<void>;
  reminderOptions: string[];
  repeatOptions: string[];
  saveCalendarItem: any;
  secondaryButtonStyle: React.CSSProperties;
  selectedCalendar: any;
  selectedCalendarDate: string;
  selectedCalendarId: string;
  selectedDayEvents: any[];
  serviceRecords: any[];
  setCalendarCategoryFilters: any;
  setCalendarCursor: any;
  setCalendarDraft: any;
  setCalendarIntakeMessage?: any;
  setCalendarIntakeText?: any;
  setCalendarView: any;
  setSelectedCalendarDate: any;
  setSelectedCalendarId: any;
  setShowJewishHolidays: any;
  setShowUsHolidays: any;
  showCalendarSave: boolean;
  showJewishHolidays: boolean;
  showUsHolidays: boolean;
  stackStyle: React.CSSProperties;
  standardCalendarCategoryLabels: string[];
  todayISO: any;
  updateCalendarItem: any;
  vendorRecords: any[];
  weatherByDate: Map<string, any>;
  weatherIcon: any;
  weatherText: any;
  weekCells: any[];
};

function calendarDateKey(value: unknown): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const direct = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function displayCalendarTitle(event: any): string {
  const title = String(event?.title || "Untitled event").trim();
  return title
    .replace(/^work\s*order\s*:\s*/i, "")
    .replace(/^wo\s*:\s*/i, "")
    .trim() || title;
}

function eventType(event: any): {
  icon: string;
  label: string;
} {
  const explicitType = String(event.eventType || "").trim();
  const explicit = new Map<string, { icon: string; label: string }>([
    ["Calendar Event", { icon: "📅", label: "Calendar Event" }],
    ["Work Order", { icon: "🔧", label: "Work Order" }],
    ["Reminder", { icon: "⏰", label: "Reminder" }],
    ["Vendor Visit", { icon: "🚚", label: "Vendor Visit" }],
    ["Personal", { icon: "👤", label: "Personal" }],
    ["Property Milestone", { icon: "📌", label: "Property Milestone" }],
  ]);

  if (explicit.has(explicitType)) {
    return explicit.get(explicitType)!;
  }

  const category = String(
    event.categoryLabel || event.area || "",
  ).toLowerCase();
  const linkedType = String(event.linkedType || "").toLowerCase();
  const source = String(event.source || "").toLowerCase();
  const title = String(event.title || "").toLowerCase();

  if (
    linkedType === "work order" ||
    source.includes("work") ||
    category.includes("work order")
  ) {
    return { icon: "🔧", label: "Work Order" };
  }

  if (
    category.includes("vendor") ||
    linkedType === "vendor" ||
    title.includes("vendor")
  ) {
    return { icon: "🚚", label: "Vendor Visit" };
  }

  if (
    category.includes("birthday") ||
    title.includes("birthday")
  ) {
    return { icon: "🎂", label: "Birthday" };
  }

  if (
    source.includes("holiday") ||
    category.includes("holiday")
  ) {
    return { icon: "🎉", label: "Holiday" };
  }

  if (
    event.repeat &&
    event.repeat !== "None"
  ) {
    return { icon: "🔁", label: "Recurring Event" };
  }

  if (
    linkedType === "asset" ||
    category.includes("maintenance")
  ) {
    return { icon: "🛠️", label: "Asset Maintenance" };
  }

  return { icon: "📅", label: "Calendar Event" };
}

function hoverText(event: any): string {
  const type = eventType(event);
  const parts = [
    `${type.icon} ${event.title || "Untitled event"}`,
    event.allDay ? "All day" : event.time || "No time",
    type.label,
  ];

  if (event.linkedName) {
    parts.push(`${event.linkedType || "Linked"}: ${event.linkedName}`);
  }

  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }

  if (event.notes) {
    parts.push(String(event.notes).slice(0, 180));
  }

  return parts.join("\n");
}


function eventTypeDefaults(value: string) {
  const base: Record<string, any> = {
    source: "manual",
    eventType: value,
    categoryLabel: value,
    area: value,
  };

  if (value === "Vendor Visit") return { ...base, linkedType: "Vendor" };
  if (value === "Deadline / Reminder") return { ...base, reminder: "1 day before" };
  if (value === "PTO / Off") return { ...base, allDay: true, time: "" };
  return base;
}

function calendarTimeParts(value: unknown) {
  const text = String(value || "").trim();
  const match24 = text.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hour24 = Math.min(23, Math.max(0, Number(match24[1])));
    const minute = String(Math.min(59, Math.max(0, Number(match24[2])))).padStart(2, "0");
    return {
      hour: String(hour24 % 12 || 12),
      minute,
      period: hour24 >= 12 ? "PM" : "AM",
    };
  }

  const match12 = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    return {
      hour: String(Math.min(12, Math.max(1, Number(match12[1])))),
      minute: String(Math.min(59, Math.max(0, Number(match12[2] || 0)))).padStart(2, "0"),
      period: String(match12[3]).toUpperCase(),
    };
  }

  return { hour: "9", minute: "00", period: "AM" };
}

function calendarTimeValue(hour: string, minute: string, period: string) {
  const hour12 = Math.min(12, Math.max(1, Number(hour) || 9));
  const minuteValue = String(Math.min(59, Math.max(0, Number(minute) || 0))).padStart(2, "0");
  const hour24 = period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hour24).padStart(2, "0")}:${minuteValue}`;
}

function calendarMinutes(value: unknown) {
  const parts = calendarTimeParts(value);
  const hour12 = Math.max(1, Math.min(12, Number(parts.hour) || 12));
  const hour24 = parts.period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return hour24 * 60 + (Number(parts.minute) || 0);
}

function calendarTimeRangeLabel(event: any) {
  if (event?.allDay) return "All day";
  const start = calendarTimeLabel(event?.time || "");
  const end = calendarTimeLabel(event?.endTime || "");
  return end && event?.endTime ? `${start}–${end}` : start;
}


function calendarTimeLabel(value: unknown) {
  const parts = calendarTimeParts(value);
  return `${parts.hour}:${parts.minute} ${parts.period}`;
}

function sortAgenda(events: any[]): any[] {
  return [...events].sort((a, b) => {
    if (Boolean(a.allDay) !== Boolean(b.allDay)) {
      return a.allDay ? 1 : -1;
    }

    const timeCompare = String(a.time || "").localeCompare(
      String(b.time || ""),
    );

    if (timeCompare !== 0) return timeCompare;

    return String(a.title || "").localeCompare(
      String(b.title || ""),
    );
  });
}

const CALENDAR_PIN_STORAGE_KEY = "atlas-calendar-pins-v1";
const CALENDAR_VIEW_STATE_KEY = "atlas-calendar-view-state-v1";
const CALENDAR_RECENT_STORAGE_KEY = "atlas-calendar-recent-v1";

function safeReadStringList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function safeWriteStringList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Calendar personalization must never interrupt scheduling.
  }
}

function eventSearchText(event: any): string {
  return [
    event.title,
    event.notes,
    event.location,
    event.categoryLabel,
    event.area,
    event.eventType,
    event.linkedType,
    event.linkedName,
    event.time,
  ]
    .join(" ")
    .toLowerCase();
}

export default function AtlasCalendar(
  props: AtlasCalendarProps,
) {
  const {
    Field,
    addCalendarItem,
    assetRecords,
    blankCalendarItem,
    buttonRowStyle,
    byName,
    byTitle,
    calendarCategoryFilters,
    calendarCellStyle,
    calendarColorDotStyle,
    calendarColors,
    calendarCursor,
    calendarDayNameStyle,
    calendarFilterDropdownStyle,
    calendarFilterLabels,
    calendarFilterListItemStyle,
    calendarFilterListStyle,
    calendarFilterSummaryStyle,
    calendarHeaderStyle,
    calendarNavyShellStyle,
    calendarPlainColors,
    calendarSelectedEventRowStyle,
    calendarTodayBoxStyle,
    calendarTodayItemStyle,
    calendarView,
    calendarWeatherIconStyle,
    calendarWeekStyle,
    categoryToColorId,
    checkboxLineStyle,
    colorForEvent,
    colors,
    compactAddBoxStyle,
    dangerButtonStyle,
    deleteCalendarItem,
    editorHeaderStyle,
    expandedCalendarItems,
    eyebrowStyle,
    fieldLabelStyle,
    formGridStyle,
    formatDate,
    goldButtonStyle,
    inputStyle,
    isMobile,
    linkTypeOptions,
    locations,
    monthCells,
    monthName,
    moveCalendarPeriod,
    moveCalendarYear,
    mutedSmallStyle,
    openCalendarItem,
    onOpenLinkedRecord,
    onConvertToWorkOrder,
    onCreateWorkOrder,
    selectedCalendarOccurrenceDate = "",
    onSaveOccurrence,
    onDeleteOccurrence,
    reminderOptions,
    repeatOptions,
    saveCalendarItem,
    secondaryButtonStyle,
    selectedCalendar,
    selectedCalendarDate,
    selectedCalendarId,
    selectedDayEvents,
    serviceRecords,
    setCalendarCategoryFilters,
    setCalendarCursor,
    setCalendarDraft,
    setCalendarView,
    setSelectedCalendarDate,
    setSelectedCalendarId,
    setShowJewishHolidays,
    setShowUsHolidays,
    showCalendarSave,
    showJewishHolidays,
    showUsHolidays,
    stackStyle,
    standardCalendarCategoryLabels,
    todayISO,
    updateCalendarItem,
    vendorRecords,
    weatherByDate,
    weatherIcon,
    weatherText,
    weekCells,
  } = props;

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(
    Boolean(selectedCalendarId),
  );
  const [calendarSearch, setCalendarSearch] = React.useState("");
  const [pinnedEventIds, setPinnedEventIds] = React.useState<string[]>([]);
  const [recentEventIds, setRecentEventIds] = React.useState<string[]>([]);
  const [showUpcoming, setShowUpcoming] = React.useState(false);
  const [quickScope, setQuickScope] = React.useState<"All" | "Events" | "Work" | "Meetings" | "Vendors" | "Landscaping" | "PTO">("All");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CALENDAR_VIEW_STATE_KEY);
      if (!raw) {
        if (isMobile) setCalendarView("week");
        return;
      }
      const state = JSON.parse(raw) as { date?: string; cursor?: string; view?: "month" | "week"; scope?: typeof quickScope };
      if (state.date) setSelectedCalendarDate(state.date);
      if (state.cursor) {
        const parsed = new Date(`${state.cursor}T12:00:00`);
        if (!Number.isNaN(parsed.getTime())) setCalendarCursor(parsed);
      }
      if (state.view === "month" || state.view === "week") setCalendarView(state.view);
      if (state.scope) setQuickScope(state.scope);
    } catch {}
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CALENDAR_VIEW_STATE_KEY, JSON.stringify({
        date: selectedCalendarDate,
        cursor: calendarDateKey(calendarCursor),
        view: calendarView,
        scope: quickScope,
      }));
    } catch {}
  }, [selectedCalendarDate, calendarCursor, calendarView, quickScope]);


  React.useEffect(() => {
    setPinnedEventIds(safeReadStringList(CALENDAR_PIN_STORAGE_KEY));
    setRecentEventIds(safeReadStringList(CALENDAR_RECENT_STORAGE_KEY));
  }, []);

  React.useEffect(() => {
    if (!selectedCalendarId) return;
    setEditorOpen(true);
    setDetailOpen(true);
  }, [selectedCalendarId]);

  React.useEffect(() => {
    if (!detailOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeDetail();
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [detailOpen, selectedCalendarDate]);

  React.useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        const date = selectedCalendarDate || calendarDateKey(todayISO());
        setSelectedCalendarDate(date);
        addCalendarItem(date);
        setEditorOpen(true);
        setDetailOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [selectedCalendarDate, addCalendarItem, todayISO]);

  const todayKey = calendarDateKey(todayISO());
  const hasSelectedEvent = Boolean(selectedCalendarId);

  const activeCategoryFilterCount =
    calendarFilterLabels.filter(
      (label: string) =>
        calendarCategoryFilters[label] === false,
    ).length;

  const hasActiveFilters =
    !showUsHolidays ||
    !showJewishHolidays ||
    activeCategoryFilterCount > 0;

  const calendarTitle =
    calendarView === "week"
      ? `Week of ${formatDate(
          weekCells[0]?.date || selectedCalendarDate,
        )}`
      : monthName(calendarCursor);

  const monthWeeks = React.useMemo(() => {
    const weeks: any[][] = [];

    for (
      let index = 0;
      index < monthCells.length;
      index += 7
    ) {
      weeks.push(monthCells.slice(index, index + 7));
    }

    return weeks;
  }, [monthCells]);

  const agendaEvents = React.useMemo(
    () => sortAgenda(selectedDayEvents),
    [selectedDayEvents],
  );

  const normalizedSearch = calendarSearch.trim().toLowerCase();

  const visibleExpandedCalendarItems = React.useMemo(() => {
    const matchesQuickScope = (event: any) => {
      if (quickScope === "All") return true;
      const type = eventType(event).label;
      const text = `${event.categoryLabel || ""} ${event.area || ""} ${event.title || ""}`.toLowerCase();
      if (quickScope === "Events") return type !== "Work Order";
      if (quickScope === "Work") return type === "Work Order";
      if (quickScope === "Meetings") return text.includes("meeting");
      if (quickScope === "Vendors") return type === "Vendor Visit" || text.includes("vendor") || text.includes("service visit");
      if (quickScope === "Landscaping") return text.includes("landscap") || text.includes("garden") || text.includes("lawn") || text.includes("irrigation");
      if (quickScope === "PTO") return text.includes("pto") || text.includes("off");
      return true;
    };

    return expandedCalendarItems.filter((event: any) =>
      matchesQuickScope(event) &&
      (!normalizedSearch || eventSearchText(event).includes(normalizedSearch)),
    );
  }, [expandedCalendarItems, normalizedSearch, quickScope]);

  const upcomingEvents = React.useMemo(() => {
    const start = calendarDateKey(todayISO());
    const endDate = new Date(`${start}T12:00:00`);
    endDate.setDate(endDate.getDate() + 7);
    const end = calendarDateKey(endDate);
    return sortAgenda(
      visibleExpandedCalendarItems.filter((event: any) => {
        const key = calendarDateKey(event.date);
        return key >= start && key <= end;
      }),
    ).slice(0, 12);
  }, [visibleExpandedCalendarItems, todayISO]);

  const selectedConflicts = React.useMemo(() => {
    if (!selectedCalendar?.date || selectedCalendar?.allDay || !selectedCalendar?.time) return [];
    const selectedDateKey = calendarDateKey(selectedCalendar.date);
    const selectedStart = calendarMinutes(selectedCalendar.time);
    const selectedEnd = selectedCalendar.endTime ? calendarMinutes(selectedCalendar.endTime) : selectedStart + 1;
    return expandedCalendarItems.filter((event: any) => {
      if (event.id === selectedCalendar.id || calendarDateKey(event.date) !== selectedDateKey || event.allDay || !event.time) return false;
      const eventStart = calendarMinutes(event.time);
      const eventEnd = event.endTime ? calendarMinutes(event.endTime) : eventStart + 1;
      return selectedStart < eventEnd && eventStart < selectedEnd;
    });
  }, [expandedCalendarItems, selectedCalendar]);

  const selectedWarnings = React.useMemo(() => {
    const warnings: string[] = [];
    if (!String(selectedCalendar?.title || "").trim()) warnings.push("Add a title.");
    if (!calendarDateKey(selectedCalendar?.date || selectedCalendarDate)) warnings.push("Add a valid date.");
    if (!selectedCalendar?.allDay && !String(selectedCalendar?.time || "").trim()) warnings.push("Add a time or mark it all day.");
    if (selectedCalendar?.linkedType && selectedCalendar.linkedType !== "None" && !selectedCalendar?.linkedId) warnings.push(`Choose the linked ${selectedCalendar.linkedType.toLowerCase()} record.`);
    if (selectedConflicts.length) warnings.push(`${selectedConflicts.length} event${selectedConflicts.length === 1 ? "" : "s"} already use this time.`);
    return warnings;
  }, [selectedCalendar, selectedCalendarDate, selectedConflicts]);

  const calendarSummary = React.useMemo(() => {
    const monthPrefix = `${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth() + 1).padStart(2, "0")}`;
    const monthEvents = visibleExpandedCalendarItems.filter((event: any) => calendarDateKey(event.date).startsWith(monthPrefix));
    return {
      month: monthEvents.length,
      recurring: monthEvents.filter((event: any) => event.repeat && event.repeat !== "None").length,
      work: monthEvents.filter((event: any) => eventType(event).label === "Work Order").length,
      pinned: pinnedEventIds.length,
    };
  }, [visibleExpandedCalendarItems, calendarCursor, pinnedEventIds]);

  const linkedOptions = React.useMemo(() => {
    if (selectedCalendar.linkedType === "Asset") {
      return byName(assetRecords).map((record: any) => ({
        id: record.id,
        name: record.name,
      }));
    }

    if (selectedCalendar.linkedType === "Location") {
      return [...locations]
        .sort((a: any, b: any) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
          ),
        )
        .map((record: any) => ({
          id: record.id,
          name: record.name,
        }));
    }

    if (selectedCalendar.linkedType === "Vendor") {
      return byName(vendorRecords).map((record: any) => ({
        id: record.id,
        name: record.name,
      }));
    }

    if (selectedCalendar.linkedType === "Work Order") {
      return byTitle(serviceRecords).map((record: any) => ({
        id: record.id,
        name: record.title,
      }));
    }

    return [];
  }, [
    selectedCalendar.linkedType,
    assetRecords,
    locations,
    vendorRecords,
    serviceRecords,
    byName,
    byTitle,
  ]);

  const operationsWeekCells = React.useMemo(() => {
    const cursor = new Date(calendarCursor);
    cursor.setHours(12, 0, 0, 0);
    const day = cursor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(cursor);
    monday.setDate(cursor.getDate() + mondayOffset);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        key: `operations-week-${iso}`,
        date: iso,
        day: date.getDate(),
        dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()],
      };
    });
  }, [calendarCursor]);

  function workRecordForEvent(event: any) {
    if (eventType(event).label !== "Work Order") return null;
    const linkedId = String(event.linkedId || "");
    if (!linkedId) return null;
    return serviceRecords.find((record: any) => String(record.id || "") === linkedId) || null;
  }

  function eventPeopleLabel(event: any) {
    const workRecord = workRecordForEvent(event);
    if (workRecord) {
      const assigned = String(workRecord.assignedTo || "").trim();
      if (assigned) return assigned;
      const people = Array.isArray(workRecord.assignedPersonIds)
        ? workRecord.assignedPersonIds.map(String).filter(Boolean)
        : [];
      if (people.length) return people.join(", ");
      return "Unassigned";
    }

    if (String(event.linkedType || "") === "Vendor" && event.linkedName) {
      return String(event.linkedName);
    }

    const category = eventType(event).label;
    return category && category !== "Event" ? category : "Event";
  }

  function renderOperationsWeekDay(cell: any) {
    const dateKey = calendarDateKey(cell.date);
    const events = sortAgenda(
      visibleExpandedCalendarItems.filter(
        (event: any) => calendarDateKey(event.date) === dateKey,
      ),
    );
    const today = dateKey === todayKey;
    const selected = dateKey === calendarDateKey(selectedCalendarDate);
    const visibleLimit = isMobile ? 6 : 8;
    const people = Array.from(
      new Set(
        events
          .map((event: any) => eventPeopleLabel(event))
          .filter((label: string) => label && label !== "Event"),
      ),
    );

    return (
      <section
        key={cell.key}
        onClick={() => showDay(dateKey)}
        style={{
          minWidth: 0,
          minHeight: isMobile ? 150 : 0,
          height: isMobile ? "auto" : "100%",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto auto minmax(0, 1fr)",
          gap: 7,
          padding: "10px 9px",
          boxSizing: "border-box",
          borderRadius: 12,
          border: `1px solid ${selected ? "#B7CAD9" : today ? "#C6D7E3" : "#E6EDF2"}`,
          background: today ? "#F6FAFD" : "#FFFFFF",
          boxShadow: selected ? "inset 0 0 0 1px rgba(36,73,103,0.06)" : "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: colors.muted }}>
              {cell.dayName}
            </div>
            <div style={{ marginTop: 2, fontSize: 18, lineHeight: 1, fontWeight: 900, color: colors.navy }}>
              {cell.day}
            </div>
          </div>
          <button
            type="button"
            aria-label={`Add item on ${formatDate(dateKey)}`}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedCalendarDate(dateKey);
              addCalendarItem(dateKey);
              setEditorOpen(true);
              setDetailOpen(true);
            }}
            style={{ width: 25, height: 25, borderRadius: 8, border: `1px solid ${colors.line}`, background: "#FFFFFF", color: colors.muted, cursor: "pointer", padding: 0, fontSize: 15, lineHeight: 1 }}
          >
            +
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, minHeight: 18, alignContent: "start" }}>
          {people.slice(0, 3).map((person) => (
            <span key={person} style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "2px 5px", borderRadius: 999, background: "#F0F4F7", color: "#506779", fontSize: 8.5, fontWeight: 800 }}>
              {person}
            </span>
          ))}
          {people.length > 3 ? <span style={{ padding: "2px 4px", color: colors.muted, fontSize: 8.5, fontWeight: 800 }}>+{people.length - 3}</span> : null}
        </div>

        <div style={{ display: "grid", alignContent: "start", gap: 5, minHeight: 0, overflow: "hidden" }}>
          {events.slice(0, visibleLimit).map((event: any) => {
            const type = eventType(event);
            const isWork = type.label === "Work Order";
            const eventColor = colorForEvent(event);
            const peopleLabel = eventPeopleLabel(event);
            return (
              <button
                key={event.instanceId || event.id}
                type="button"
                onClick={(mouseEvent) => { mouseEvent.stopPropagation(); openEvent(event); }}
                title={hoverText(event)}
                style={{
                  width: "100%",
                  minWidth: 0,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: 2,
                  padding: "6px 7px",
                  borderRadius: 8,
                  border: 0,
                  borderLeft: `3px solid ${eventColor.hex}`,
                  background: "#F9FBFC",
                  color: colors.text,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, fontWeight: 850, lineHeight: 1.15 }}>
                  {!event.allDay && event.time ? <strong style={{ color: "#526B7F", marginRight: 4 }}>{calendarTimeLabel(event.time)}</strong> : null}
                  {displayCalendarTitle(event)}
                </span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8.5, fontWeight: 750, color: isWork ? "#557086" : eventColor.hex }}>
                  {isWork ? `${peopleLabel} · Work` : peopleLabel}
                </span>
              </button>
            );
          })}

          {events.length > visibleLimit ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); showDay(dateKey); }}
              style={{ justifySelf: "start", border: 0, background: "transparent", padding: "1px 3px", color: colors.muted, fontSize: 9, fontWeight: 850, cursor: "pointer" }}
            >
              +{events.length - visibleLimit} more
            </button>
          ) : null}

          {!events.length ? (
            <span style={{ padding: "7px 3px", color: "#9AA8B3", fontSize: 9.5, fontWeight: 700 }}>No scheduled work or events</span>
          ) : null}
        </div>
      </section>
    );
  }

  function togglePinnedEvent(event: any) {
    const eventId = String(event?.id || "");
    if (!eventId) return;
    const next = pinnedEventIds.includes(eventId)
      ? pinnedEventIds.filter((id) => id !== eventId)
      : [eventId, ...pinnedEventIds];
    setPinnedEventIds(next);
    safeWriteStringList(CALENDAR_PIN_STORAGE_KEY, next);
  }

  function showDay(date: string) {
    setSelectedCalendarDate(date);
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(date));
    setEditorOpen(false);
    setDetailOpen(true);
  }

  function editEvent(event: any) {
    openCalendarItem(event);
    setEditorOpen(true);
    setDetailOpen(true);
  }

  function openEvent(event: any) {
    const eventId = String(event?.id || "");
    if (eventId) {
      const nextRecent = [eventId, ...recentEventIds.filter((id) => id !== eventId)].slice(0, 8);
      setRecentEventIds(nextRecent);
      safeWriteStringList(CALENDAR_RECENT_STORAGE_KEY, nextRecent);
    }
    const linkedType = String(event?.linkedType || "");
    const linkedId = String(event?.linkedId || "");

    if (
      linkedId &&
      linkedType &&
      linkedType !== "None" &&
      onOpenLinkedRecord
    ) {
      const handled = onOpenLinkedRecord(event);

      if (handled !== false) {
        setDetailOpen(false);
        setEditorOpen(false);
        setSelectedCalendarId("");
        setCalendarDraft(
          blankCalendarItem(selectedCalendarDate),
        );
        return;
      }
    }

    editEvent(event);
  }

  function startNewEvent() {
    addCalendarItem(selectedCalendarDate);
    setEditorOpen(true);
    setDetailOpen(true);
  }

  function startNewWork() {
    if (!onCreateWorkOrder) return;
    const date = selectedCalendarDate || todayKey;
    void onCreateWorkOrder(date);
    setDetailOpen(false);
    setEditorOpen(false);
  }

  function closeEditor() {
    setSelectedCalendarId("");
    setCalendarDraft(
      blankCalendarItem(selectedCalendarDate),
    );
    setEditorOpen(false);
  }

  function closeDetail() {
    setDetailOpen(false);
    setEditorOpen(false);
    setSelectedCalendarId("");
    setCalendarDraft(
      blankCalendarItem(selectedCalendarDate),
    );
  }

  async function deleteSelectedEvent() {
    if (!selectedCalendarId) return;

    await deleteCalendarItem(selectedCalendarId);
    closeDetail();
  }

  async function convertToWorkOrder(event: any) {
    if (!onConvertToWorkOrder) return;
    await onConvertToWorkOrder(event);
  }

  function canConvertEvent(event: any) {
    return (
      event.source === "manual" &&
      event.linkedType !== "Work Order" &&
      Boolean(event.id)
    );
  }

  function renderCalendarCell(cell: any) {
    const dateKey = calendarDateKey(cell.date);
    const events = dateKey
      ? sortAgenda(
          visibleExpandedCalendarItems.filter(
            (event: any) => calendarDateKey(event.date) === dateKey,
          ),
        )
      : [];

    const selected = dateKey === calendarDateKey(selectedCalendarDate);
    const today = dateKey === todayKey;
    const weather = dateKey ? weatherByDate.get(dateKey) : undefined;
    const visibleLimit = 3;

    return (
      <div
        key={cell.key || dateKey}
        role={dateKey ? "button" : undefined}
        tabIndex={dateKey ? 0 : -1}
        onClick={() => { if (dateKey) showDay(dateKey); }}
        onKeyDown={(event) => {
          if (!dateKey || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          showDay(dateKey);
        }}
        style={{
          ...calendarCellStyle,
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          alignContent: "start",
          padding: isMobile ? "3px" : "4px 7px 4px",
          boxSizing: "border-box",
          borderRadius: isMobile ? 6 : 8,
          border: `1px solid ${selected ? "#C4D3DF" : today ? "#D3E0EA" : "#EDF1F4"}`,
          background: selected ? "#F6F9FC" : today ? "#F8FBFD" : "#FFFFFF",
          opacity: cell.outside ? 0.38 : 1,
          boxShadow: selected ? "inset 0 0 0 1px rgba(36,73,103,0.05)" : "none",
          cursor: dateKey ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, minWidth: 0 }}>
          <strong
            style={{
              display: "grid",
              placeItems: "center",
              width: isMobile ? 18 : 22,
              height: isMobile ? 18 : 22,
              borderRadius: "50%",
              background: today ? colors.navy : "transparent",
              color: today ? "#FFFFFF" : cell.outside ? colors.muted : colors.navy,
              fontSize: isMobile ? 9 : 12,
              lineHeight: 1,
              flex: "0 0 auto",
            }}
          >
            {cell.day ?? ""}
          </strong>

          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {weather ? (
              <span title={weatherText(weather.code)} style={{ ...calendarWeatherIconStyle, fontSize: isMobile ? 8 : 12, lineHeight: 1 }}>
                {weatherIcon(weather.code)}
              </span>
            ) : null}
            {dateKey ? (
              <button
                type="button"
                aria-label={`Add item on ${formatDate(dateKey)}`}
                title="Add"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedCalendarDate(dateKey);
                  addCalendarItem(dateKey);
                  setEditorOpen(true);
                  setDetailOpen(true);
                }}
                style={{
                  width: isMobile ? 17 : 22,
                  height: isMobile ? 17 : 22,
                  borderRadius: 7,
                  border: 0,
                  background: "transparent",
                  color: "#A2AFBA",
                  fontSize: isMobile ? 11 : 14,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                +
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", alignContent: "start", gridAutoRows: isMobile ? 14 : 15, gap: isMobile ? 1 : 2, marginTop: isMobile ? 2 : 3, minHeight: 0, overflow: "hidden" }}>
          {events.slice(0, visibleLimit).map((event: any) => {
            const eventColor = colorForEvent(event);
            const type = eventType(event);
            const isWork = type.label === "Work Order";
            return (
              <span
                key={event.instanceId || event.id}
                title={hoverText(event)}
                onClick={(mouseEvent) => { mouseEvent.stopPropagation(); openEvent(event); }}
                style={{
                  display: "grid",
                  gridTemplateColumns: isWork && !isMobile ? "auto minmax(0,1fr)" : "minmax(0,1fr)",
                  alignItems: "center",
                  gap: 4,
                  minWidth: 0,
                  overflow: "hidden",
                  borderRadius: 4,
                  borderLeft: `2px solid ${eventColor.hex}`,
                  padding: isMobile ? "1px 3px" : "1px 5px",
                  minHeight: isMobile ? 14 : 15,
                  height: isMobile ? 14 : 15,
                  boxSizing: "border-box",
                  color: "#2A3D4C",
                  background: "#FAFBFC",
                  fontSize: isMobile ? 7 : 9.75,
                  fontWeight: 650,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                {isWork && !isMobile ? (
                  <span style={{ fontSize: 7, letterSpacing: ".06em", fontWeight: 900, color: eventColor.hex }}>WORK</span>
                ) : null}
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {!event.allDay && event.time ? <strong style={{ color: "#5D7284", marginRight: 4 }}>{calendarTimeLabel(event.time)}</strong> : null}
                  {displayCalendarTitle(event)}
                  {event.repeat && event.repeat !== "None" ? "  ↻" : ""}
                </span>
              </span>
            );
          })}

          {events.length > visibleLimit ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (dateKey) showDay(dateKey);
              }}
              style={{
                justifySelf: "start",
                border: 0,
                padding: "0 4px",
                background: "transparent",
                color: colors.muted,
                minHeight: isMobile ? 12 : 13,
                height: isMobile ? 12 : 13,
                display: "inline-flex",
                alignItems: "center",
                fontSize: isMobile ? 7 : 9.25,
                fontWeight: 800,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              +{events.length - visibleLimit} more
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function renderDetailPanel() {
    return (
      <>
        <button
          type="button"
          aria-label="Close calendar details"
          onClick={closeDetail}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9997,
            border: 0,
            background: "rgba(7,27,47,0.36)",
          }}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`Calendar details for ${formatDate(
            selectedCalendarDate,
          )}`}
          style={{
            position: "fixed",
            zIndex: 9998,
            top: isMobile ? 0 : 72,
            right: isMobile ? 0 : 22,
            bottom: isMobile ? 0 : 22,
            width: isMobile
              ? "100%"
              : "min(720px, calc(100vw - 80px))",
            maxWidth: "100%",
            padding: isMobile ? 16 : 22,
            boxSizing: "border-box",
            overflowY: "auto",
            overscrollBehavior: "contain",
            background: "#FFFFFF",
            border: `1px solid ${colors.line}`,
            borderRadius: isMobile ? 0 : 20,
            boxShadow:
              "0 30px 80px rgba(7,27,47,0.34)",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: isMobile ? -16 : -22,
              zIndex: 5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "4px 0 14px",
              background: "#FFFFFF",
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            <div>
              <div style={eyebrowStyle}>Day Agenda</div>

              <h2
                style={{
                  margin: "4px 0 0",
                  color: colors.navy,
                }}
              >
                {formatDate(selectedCalendarDate)}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeDetail}
              style={secondaryButtonStyle}
            >
              X Close
            </button>
          </div>

          {!editorOpen ? (
            <div
              style={{
                ...stackStyle,
                marginTop: 16,
              }}
            >
              <section style={calendarTodayBoxStyle}>
                <div style={eyebrowStyle}>
                  {agendaEvents.length
                    ? `${agendaEvents.length} Scheduled`
                    : "Scheduled"}
                </div>

                {agendaEvents.length ? (
                  agendaEvents.map((event: any) => {
                    const eventColor = colorForEvent(event);
                    const type = eventType(event);
                    const completed = Boolean(event.completed);

                    return (
                      <div
                        key={event.instanceId || event.id}
                        title={hoverText(event)}
                        style={{
                          ...calendarTodayItemStyle,
                          borderColor: eventColor.hex,
                          borderLeft: `6px solid ${eventColor.hex}`,
                          background: completed
                            ? "#F2F4F7"
                            : `${eventColor.hex}0F`,
                          opacity: completed ? 0.72 : 1,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openEvent(event)}
                          style={{
                            border: 0,
                            padding: 0,
                            background: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          <div style={calendarSelectedEventRowStyle}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                minWidth: 0,
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{ fontSize: 18, lineHeight: 1.2 }}
                              >
                                {completed ? "✅" : type.icon}
                              </span>

                              <div style={{ minWidth: 0 }}>
                                <strong
                                  style={{
                                    display: "block",
                                    color: completed
                                      ? colors.muted
                                      : eventColor.hex,
                                    fontSize: 15,
                                    textDecoration: completed
                                      ? "line-through"
                                      : "none",
                                  }}
                                >
                                  {event.title}
                                </strong>

                                <span style={{ display: "block", marginTop: 3 }}>
                                  {calendarTimeRangeLabel(event) || "No time"}{" "}
                                  · {type.label}
                                </span>

                                {event.notes ? (
                                  <span
                                    style={{
                                      display: "block",
                                      marginTop: 6,
                                      color: colors.muted,
                                    }}
                                  >
                                    {String(event.notes).slice(0, 140)}
                                    {String(event.notes).length > 140 ? "…" : ""}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <span
                              style={{
                                ...calendarColorDotStyle,
                                background: eventColor.hex,
                              }}
                            />
                          </div>
                        </button>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => editEvent(event)}
                            style={secondaryButtonStyle}
                          >
                            Edit
                          </button>
                          <details style={{ minWidth: 120 }}>
                            <summary style={{ cursor: "pointer", color: colors.muted, fontSize: 12, fontWeight: 800 }}>More details</summary>
                            <div style={{ display: "grid", gap: 7, marginTop: 8, padding: 9, border: `1px solid ${colors.line}`, borderRadius: 10, background: "#FFFFFF" }}>
                              {event.repeat && event.repeat !== "None" ? <span style={mutedSmallStyle}>Repeats {event.repeat}</span> : null}
                              {event.linkedType && event.linkedType !== "None" && event.linkedName ? <span style={mutedSmallStyle}>{event.linkedType}: {event.linkedName}</span> : null}
                              <button type="button" onClick={() => togglePinnedEvent(event)} style={secondaryButtonStyle}>{pinnedEventIds.includes(String(event.id || "")) ? "Unpin" : "Pin"}</button>
                              {event.linkedId && event.linkedType && event.linkedType !== "None" ? <button type="button" onClick={() => openEvent(event)} style={secondaryButtonStyle}>Open {event.linkedType}</button> : null}
                              {canConvertEvent(event) ? <button type="button" onClick={() => { void convertToWorkOrder(event); }} style={secondaryButtonStyle}>Convert to Work Order</button> : null}
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={mutedSmallStyle}>
                    Nothing scheduled for this day.
                  </p>
                )}
              </section>

              <div style={compactAddBoxStyle}>
                <button
                  type="button"
                  onClick={startNewEvent}
                  style={{
                    ...goldButtonStyle,
                    width: "100%",
                  }}
                >
                  Add Event
                </button>
                {!isMobile ? (
                  <div style={{ ...mutedSmallStyle, marginTop: 8, textAlign: "center" }}>
                    Tip: double-click an empty day to add an event immediately.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                position: "relative",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <h3
                  style={{
                    ...editorHeaderStyle,
                    margin: 0,
                  }}
                >
                  {hasSelectedEvent
                    ? "Edit Event"
                    : "Add Event"}
                </h3>

                <button
                  type="button"
                  onClick={closeEditor}
                  style={secondaryButtonStyle}
                >
                  Back to Day
                </button>
              </div>

              {selectedWarnings.length ? (
                <div
                  style={{
                    display: "grid",
                    gap: 5,
                    marginBottom: 12,
                    padding: 11,
                    border: `1px solid ${selectedConflicts.length ? colors.red : colors.gold}`,
                    borderRadius: 12,
                    background: selectedConflicts.length ? "#FFF4F4" : "#FFF9EA",
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {selectedWarnings.map((warning) => (
                    <span key={warning}>• {warning}</span>
                  ))}
                </div>
              ) : null}

              <div style={formGridStyle}>
                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                    gridColumn: "1 / -1",
                  }}
                >
                  <span style={fieldLabelStyle}>Event Type</span>
                  <select
                    value={
                      selectedCalendar.categoryLabel ||
                      selectedCalendar.area ||
                      selectedCalendar.eventType ||
                      "Other"
                    }
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      const matchingColor = calendarColors.find((color: any) => color.label === value);
                      updateCalendarItem({
                        ...eventTypeDefaults(value),
                        colorId: matchingColor?.id || categoryToColorId(value),
                        colorName: matchingColor?.colorName,
                        linkedId: value === "Vendor Visit" ? selectedCalendar.linkedId || "" : "",
                        linkedName: value === "Vendor Visit" ? selectedCalendar.linkedName || "" : "",
                        linkedType: value === "Vendor Visit" ? "Vendor" : "None",
                      });
                    }}
                    style={{ ...inputStyle, fontWeight: 800 }}
                  >
                    {Array.from(
                      new Set<string>([
                        ...standardCalendarCategoryLabels,
                        ...calendarColors.map((color: any) => color.label),
                      ]),
                    )
                      .filter(Boolean)
                      .filter((label) => !["Work Order", "Vendor", "Personal / Owner", "Reminder"].includes(label))
                      .sort((a, b) => a.localeCompare(b))
                      .map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                  </select>
                </label>

                <Field
                  label="Title"
                  value={selectedCalendar.title || ""}
                  onChange={(value: string) =>
                    updateCalendarItem({
                      title: value,
                    })
                  }
                />

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Date</span>
                  <input
                    type="date"
                    value={selectedCalendar.date || selectedCalendarDate}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                    onFocus={(event) => event.currentTarget.showPicker?.()}
                    onKeyDown={(event) => event.preventDefault()}
                    onPaste={(event) => event.preventDefault()}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      updateCalendarItem({ date: value });
                      setSelectedCalendarDate(value);
                    }}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Time</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <select
                      value={calendarTimeParts(selectedCalendar.time).hour}
                      disabled={Boolean(selectedCalendar.allDay)}
                      onChange={(event) => {
                        const parts = calendarTimeParts(selectedCalendar.time);
                        updateCalendarItem({ time: calendarTimeValue(event.currentTarget.value, parts.minute, parts.period) });
                      }}
                      style={{ ...inputStyle, background: selectedCalendar.allDay ? "#EEF2F6" : "#FFFFFF" }}
                      aria-label="Hour"
                    >
                      {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                    </select>
                    <select
                      value={calendarTimeParts(selectedCalendar.time).minute}
                      disabled={Boolean(selectedCalendar.allDay)}
                      onChange={(event) => {
                        const parts = calendarTimeParts(selectedCalendar.time);
                        updateCalendarItem({ time: calendarTimeValue(parts.hour, event.currentTarget.value, parts.period) });
                      }}
                      style={{ ...inputStyle, background: selectedCalendar.allDay ? "#EEF2F6" : "#FFFFFF" }}
                      aria-label="Minute"
                    >
                      {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                    </select>
                    <select
                      value={calendarTimeParts(selectedCalendar.time).period}
                      disabled={Boolean(selectedCalendar.allDay)}
                      onChange={(event) => {
                        const parts = calendarTimeParts(selectedCalendar.time);
                        updateCalendarItem({ time: calendarTimeValue(parts.hour, parts.minute, event.currentTarget.value) });
                      }}
                      style={{ ...inputStyle, background: selectedCalendar.allDay ? "#EEF2F6" : "#FFFFFF" }}
                      aria-label="AM or PM"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </label>

                {!selectedCalendar.allDay ? (
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>End Time <span style={{ fontWeight: 500, color: colors.muted }}>(optional)</span></span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <select value={calendarTimeParts(selectedCalendar.endTime || selectedCalendar.time).hour} onChange={(event) => { const parts = calendarTimeParts(selectedCalendar.endTime || selectedCalendar.time); updateCalendarItem({ endTime: calendarTimeValue(event.currentTarget.value, parts.minute, parts.period) }); }} style={inputStyle} aria-label="End hour">
                        {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                      </select>
                      <select value={calendarTimeParts(selectedCalendar.endTime || selectedCalendar.time).minute} onChange={(event) => { const parts = calendarTimeParts(selectedCalendar.endTime || selectedCalendar.time); updateCalendarItem({ endTime: calendarTimeValue(parts.hour, event.currentTarget.value, parts.period) }); }} style={inputStyle} aria-label="End minute">
                        {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                      </select>
                      <select value={calendarTimeParts(selectedCalendar.endTime || selectedCalendar.time).period} onChange={(event) => { const parts = calendarTimeParts(selectedCalendar.endTime || selectedCalendar.time); updateCalendarItem({ endTime: calendarTimeValue(parts.hour, parts.minute, event.currentTarget.value) }); }} style={inputStyle} aria-label="End AM or PM">
                        <option value="AM">AM</option><option value="PM">PM</option>
                      </select>
                    </div>
                    {selectedCalendar.endTime ? <button type="button" onClick={() => updateCalendarItem({ endTime: "" })} style={{ ...secondaryButtonStyle, justifySelf: "start", padding: "5px 8px", fontSize: 11 }}>Remove end time</button> : null}
                  </label>
                ) : null}

                <label style={checkboxLineStyle}>
                  <input
                    type="checkbox"
                    checked={
                      Boolean(selectedCalendar.allDay)
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        allDay: event.currentTarget.checked,
                        ...(event.currentTarget.checked ? { time: "", endTime: "" } : {}),
                      })
                    }
                  />
                  All-day event
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={fieldLabelStyle}>
                    Color
                  </span>

                  <select
                    value={
                      selectedCalendar.colorName || ""
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        colorName:
                          event.currentTarget
                            .value as CalendarColorName,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>

                    {calendarPlainColors.map(
                      (color: any) => (
                        <option
                          key={color.id}
                          value={color.id}
                        >
                          {color.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={fieldLabelStyle}>
                    Repeat
                  </span>

                  <select
                    value={
                      selectedCalendar.repeat || ""
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        repeat:
                          event.currentTarget
                            .value as CalendarRepeat,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>

                    {repeatOptions
                      .filter(
                        (option: string) =>
                          option !== "None",
                      )
                      .map((option: string) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option === "Weekdays"
                            ? "Weekdays (Mon-Fri)"
                            : option}
                        </option>
                      ))}
                  </select>
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={fieldLabelStyle}>
                    Reminder
                  </span>

                  <select
                    value={
                      selectedCalendar.reminder || ""
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        reminder:
                          event.currentTarget
                            .value as CalendarReminder,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>

                    {reminderOptions
                      .filter(
                        (option: string) =>
                          option !== "None",
                      )
                      .map((option: string) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                  </select>
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={fieldLabelStyle}>
                    Attach To
                  </span>

                  <select
                    value={
                      selectedCalendar.linkedType || ""
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        linkedType:
                          event.currentTarget
                            .value as CalendarLinkType,
                        linkedId: "",
                        linkedName: "",
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>

                    {linkTypeOptions
                      .filter(
                        (option: string) =>
                          option !== "None",
                      )
                      .map((option: string) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                  </select>
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={fieldLabelStyle}>
                    Linked Record
                  </span>

                  <select
                    value={
                      selectedCalendar.linkedId || ""
                    }
                    disabled={
                      !selectedCalendar.linkedType ||
                      selectedCalendar.linkedType ===
                        "None"
                    }
                    onChange={(event) => {
                      const option =
                        linkedOptions.find(
                          (item: any) =>
                            item.id ===
                            event.currentTarget.value,
                        );

                      updateCalendarItem({
                        linkedId:
                          event.currentTarget.value,
                        linkedName:
                          option?.name || "",
                      });
                    }}
                    style={{
                      ...inputStyle,
                      background:
                        !selectedCalendar.linkedType ||
                        selectedCalendar.linkedType ===
                          "None"
                          ? "#EEF2F6"
                          : "#FFFFFF",
                    }}
                  >
                    <option value=""></option>

                    {linkedOptions.map(
                      (option: any) => (
                        <option
                          key={option.id}
                          value={option.id}
                        >
                          {option.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <Field
                  label="Notes / Details"
                  value={selectedCalendar.notes || ""}
                  onChange={(value: string) =>
                    updateCalendarItem({
                      notes: value,
                    })
                  }
                  multiline
                />
              </div>

              <div
                style={{
                  ...buttonRowStyle,
                  position: "sticky",
                  bottom: isMobile ? -16 : -22,
                  zIndex: 6,
                  marginTop: 12,
                  padding: "12px 0 4px",
                  background: "#FFFFFF",
                  borderTop: `1px solid ${colors.line}`,
                }}
              >
                {showCalendarSave ? (
                  selectedCalendarOccurrenceDate && selectedCalendar.repeat && selectedCalendar.repeat !== "None" && onSaveOccurrence ? (
                    <>
                      <button type="button" onClick={() => void onSaveOccurrence()} style={goldButtonStyle}>Save This Event</button>
                      <button type="button" onClick={saveCalendarItem} style={secondaryButtonStyle}>Save Series</button>
                    </>
                  ) : (
                    <button type="button" onClick={saveCalendarItem} style={goldButtonStyle}>Save</button>
                  )
                ) : null}

                {hasSelectedEvent ? (
                  selectedCalendarOccurrenceDate && selectedCalendar.repeat && selectedCalendar.repeat !== "None" && onDeleteOccurrence ? (
                    <>
                      <button type="button" onClick={() => void onDeleteOccurrence()} style={dangerButtonStyle}>Delete This Event</button>
                      <button type="button" onClick={() => void deleteSelectedEvent()} style={{ ...dangerButtonStyle, background: "#FFFFFF", color: colors.red }}>Delete Series</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => void deleteSelectedEvent()} style={dangerButtonStyle}>Delete</button>
                  )
                ) : null}

                <button
                  type="button"
                  onClick={closeEditor}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </aside>
      </>
    );
  }

  const calendarHeight = isMobile
    ? "calc(100dvh - 62px)"
    : "calc(100dvh - 96px)";

  const normalControlStyle: React.CSSProperties = {
    ...secondaryButtonStyle,
    padding: isMobile ? "5px 7px" : "7px 11px",
    fontSize: isMobile ? 10 : 13,
    whiteSpace: "nowrap",
  };

  const activeControlStyle: React.CSSProperties = {
    ...goldButtonStyle,
    padding: isMobile ? "5px 7px" : "7px 11px",
    fontSize: isMobile ? 10 : 13,
    whiteSpace: "nowrap",
  };

  return (
    <>
      <section
        style={{
          ...calendarNavyShellStyle,
          width: "100%",
          height: calendarHeight,
          minHeight: 0,
          padding: isMobile ? 1 : 3,
          overflow: "hidden",
          boxSizing: "border-box",
          background: "transparent",
          border: 0,
          boxShadow: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: 0,
            padding: isMobile ? 4 : 6,
            boxSizing: "border-box",
            overflow: "hidden",
            display: "grid",
            gridTemplateRows: "auto auto minmax(0, 1fr)",
            gap: isMobile ? 2 : 3,
            background: "#FFFFFF",
            border: "1px solid #E5EBF0",
            borderRadius: isMobile ? 10 : 12,
            position: "relative",
          }}
        >
          <header
            style={{
              display: "grid",
              gap: isMobile ? 3 : 3,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: isMobile ? 3 : 8,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  ...calendarHeaderStyle,
                  fontSize: isMobile ? 15 : 23,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {calendarTitle}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 1 : 4,
                  flexWrap: "nowrap",
                  marginLeft: "auto",
                }}
              >
                <button
                  type="button"
                  onClick={() => moveCalendarPeriod(-1)}
                  style={normalControlStyle}
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const today = todayISO();
                    setCalendarCursor(new Date());
                    showDay(today);
                  }}
                  style={activeControlStyle}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => moveCalendarPeriod(1)}
                  style={normalControlStyle}
                >
                  Next
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 3 : 4,
                minWidth: 0,
                flexWrap: "nowrap",
                overflow: "visible",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCalendarView("month")
                }
                style={
                  calendarView === "month"
                    ? activeControlStyle
                    : normalControlStyle
                }
              >
                Month
              </button>

              {!isMobile ? (
                <button
                  type="button"
                  onClick={() =>
                    setCalendarView("week")
                  }
                  style={
                    calendarView === "week"
                      ? activeControlStyle
                      : normalControlStyle
                  }
                >
                  Week
                </button>
              ) : null}

              <details style={{ position: "relative", zIndex: 70 }}>
                <summary style={{ ...activeControlStyle, listStyle: "none", cursor: "pointer", userSelect: "none" }}>+ Add</summary>
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 150, padding: 6, display: "grid", gap: 5, background: "#FFFFFF", border: `1px solid ${colors.line}`, borderRadius: 10, boxShadow: "0 14px 34px rgba(7,27,47,0.16)" }}>
                  <button type="button" onClick={() => { const date = selectedCalendarDate || todayISO(); setSelectedCalendarDate(date); addCalendarItem(date); setEditorOpen(true); setDetailOpen(true); }} style={{ ...secondaryButtonStyle, width: "100%", textAlign: "left" }}>Event</button>
                  {onCreateWorkOrder ? <button type="button" onClick={startNewWork} style={{ ...secondaryButtonStyle, width: "100%", textAlign: "left" }}>Work</button> : null}
                </div>
              </details>

              <input
                type="search"
                value={calendarSearch}
                onChange={(event) => setCalendarSearch(event.currentTarget.value)}
                placeholder="Search calendar"
                aria-label="Search calendar"
                style={{
                  ...inputStyle,
                  width: isMobile ? 108 : 170,
                  minWidth: 0,
                  padding: isMobile ? "5px 7px" : "6px 9px",
                  fontSize: isMobile ? 10 : 12,
                }}
              />

              <button
                type="button"
                onClick={() => setShowUpcoming((current) => !current)}
                style={showUpcoming ? activeControlStyle : normalControlStyle}
              >
                Upcoming
              </button>

              {!isMobile ? (
                <div style={{ display: "flex", gap: 3, alignItems: "center", minWidth: 0 }}>
                  {(["All","Events","Work"] as const).map((scope) => (
                    <button key={scope} type="button" onClick={() => setQuickScope(scope)} style={{ ...normalControlStyle, padding: "6px 8px", fontSize: 11, background: quickScope === scope ? "#EDF3F8" : "#FFFFFF", borderColor: quickScope === scope ? "#AFC3D4" : colors.line, color: quickScope === scope ? colors.navy : colors.muted }}>
                      {scope}
                    </button>
                  ))}
                </div>
              ) : (
                <select value={quickScope} onChange={(event) => setQuickScope(event.currentTarget.value as any)} style={{ ...inputStyle, width: 92, padding: "5px 6px", fontSize: 10 }} aria-label="Calendar quick filter">
                  {["All","Events","Work"].map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                </select>
              )}

              <details
                style={{
                  ...calendarFilterDropdownStyle,
                  position: "relative",
                  overflow: "visible",
                  zIndex: 60,
                }}
              >
                <summary
                  style={{
                    ...calendarFilterSummaryStyle,
                    padding: isMobile
                      ? "5px 7px"
                      : "8px 11px",
                    fontSize: isMobile ? 10 : 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  Filters
                  {hasActiveFilters
                    ? ` (${activeCategoryFilterCount +
                        (!showUsHolidays ? 1 : 0) +
                        (!showJewishHolidays
                          ? 1
                          : 0)} hidden)`
                    : ""}
                </summary>

                <div
                  style={{
                    ...calendarFilterListStyle,
                    position: "absolute",
                    zIndex: 50,
                    top: "calc(100% + 6px)",
                    right: 0,
                    width: isMobile
                      ? "min(280px, calc(100vw - 24px))"
                      : 280,
                    maxHeight: "60vh",
                    overflowY: "auto",
                    padding: 10,
                    background: "#FFFFFF",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 12,
                    boxShadow:
                      "0 16px 40px rgba(7,27,47,0.20)",
                  }}
                >
                  <label
                    style={calendarFilterListItemStyle}
                  >
                    <input
                      type="checkbox"
                      checked={showUsHolidays}
                      onChange={() =>
                        setShowUsHolidays(
                          (current: boolean) =>
                            !current,
                        )
                      }
                    />
                    US Holidays
                  </label>

                  <label
                    style={calendarFilterListItemStyle}
                  >
                    <input
                      type="checkbox"
                      checked={showJewishHolidays}
                      onChange={() =>
                        setShowJewishHolidays(
                          (current: boolean) =>
                            !current,
                        )
                      }
                    />
                    Jewish Holidays
                  </label>

                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUsHolidays(true);
                        setShowJewishHolidays(true);
                        setCalendarCategoryFilters({});
                      }}
                      style={{
                        ...secondaryButtonStyle,
                        width: "100%",
                        marginBottom: 8,
                      }}
                    >
                      Show All Calendar Items
                    </button>
                  ) : null}

                  {calendarFilterLabels.map(
                    (label: string) => (
                      <label
                        key={label}
                        style={
                          calendarFilterListItemStyle
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            calendarCategoryFilters[
                              label
                            ] !== false
                          }
                          onChange={() =>
                            setCalendarCategoryFilters(
                              (current: any) => ({
                                ...current,
                                [label]:
                                  current[label] ===
                                  false,
                              }),
                            )
                          }
                        />
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: calendarColors.find((color: any) => color.label === label)?.hex || "#A8B4BE",
                            flex: "0 0 auto",
                          }}
                        />
                        {label}
                      </label>
                    ),
                  )}
                </div>
              </details>
            </div>
          </header>

          {showUpcoming ? (
            <section
              style={{
                position: "absolute",
                zIndex: 80,
                top: isMobile ? 78 : 94,
                right: isMobile ? 8 : 14,
                width: isMobile ? "min(330px, calc(100% - 16px))" : 420,
                display: "grid",
                gap: 8,
                maxHeight: "min(360px, 55vh)",
                overflowY: "auto",
                padding: 12,
                border: `1px solid ${colors.line}`,
                borderRadius: 14,
                background: "#FFFFFF",
                boxShadow: "0 18px 48px rgba(7,27,47,0.18)",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  ["This Month", calendarSummary.month],
                  ["Recurring", calendarSummary.recurring],
                  ["Work Orders", calendarSummary.work],
                  ["Pinned", calendarSummary.pinned],
                ].map(([label, value]) => (
                  <span key={String(label)} style={{ ...mutedSmallStyle, fontWeight: 800 }}>
                    {label}: {value}
                  </span>
                ))}
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                {upcomingEvents.map((event: any) => (
                  <button
                    key={event.instanceId || event.id}
                    type="button"
                    onClick={() => openEvent(event)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      color: colors.text,
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pinnedEventIds.includes(String(event.id || "")) ? "📌 " : ""}{event.title || "Untitled event"}
                    </strong>
                    <span style={{ ...mutedSmallStyle, whiteSpace: "nowrap" }}>
                      {formatDate(event.date)}{event.allDay ? "" : event.time ? ` · ${calendarTimeRangeLabel(event)}` : ""}
                    </span>
                  </button>
                ))}
                {!upcomingEvents.length ? <span style={mutedSmallStyle}>No matching events in the next seven days.</span> : null}
              </div>
            </section>
          ) : null}

          <div
            style={{
              ...calendarWeekStyle,
              display: "grid",
              gridTemplateColumns:
                "repeat(7, minmax(0, 1fr))",
              gap: isMobile ? 1 : 2,
            }}
          >
            {(calendarView === "week"
              ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            ).map((day) => (
              <div
                key={day}
                style={{
                  ...calendarDayNameStyle,
                  padding: isMobile
                    ? "1px 0"
                    : "4px 0",
                  fontSize: isMobile ? 8 : 12,
                  lineHeight: 1,
                }}
              >
                {isMobile
                  ? day.slice(0, 1)
                  : day}
              </div>
            ))}
          </div>

          {calendarView === "month" ? (
            <div
              style={{
                display: "grid",
                gridTemplateRows: `repeat(${monthWeeks.length}, minmax(0, 1fr))`,
                gap: isMobile ? 1 : 2,
                width: "100%",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {monthWeeks.map(
                (week, weekIndex) => (
                  <div
                    key={`month-week-${weekIndex}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(7, minmax(0, 1fr))",
                      gap: isMobile ? 1 : 2,
                      width: "100%",
                      height: "100%",
                      minHeight: 0,
                    }}
                  >
                    {week.map((cell: any) =>
                      renderCalendarCell(cell),
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(7, minmax(0, 1fr))",
                gap: isMobile ? 8 : 6,
                width: "100%",
                height: isMobile ? "auto" : "100%",
                minHeight: 0,
                overflowY: isMobile ? "visible" : "hidden",
                overflowX: "hidden",
              }}
            >
              {operationsWeekCells.map((cell: any) =>
                renderOperationsWeekDay(cell),
              )}
            </div>
          )}
        </div>
      </section>

      {detailOpen ? renderDetailPanel() : null}
    </>
  );
}
