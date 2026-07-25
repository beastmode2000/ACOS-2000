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
  onToggleCompleted?: (event: any) => boolean | Promise<boolean>;
  onConvertToWorkOrder?: (event: any) => boolean | Promise<boolean>;
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

function eventType(event: any): {
  icon: string;
  label: string;
} {
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

function sortAgenda(events: any[]): any[] {
  return [...events].sort((a, b) => {
    if (Boolean(a.allDay) !== Boolean(b.allDay)) {
      return a.allDay ? -1 : 1;
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
    onToggleCompleted,
    onConvertToWorkOrder,
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

  async function toggleCompleted(event: any) {
    if (!onToggleCompleted) return;
    await onToggleCompleted(event);
  }

  async function convertToWorkOrder(event: any) {
    if (!onConvertToWorkOrder) return;
    await onConvertToWorkOrder(event);
  }

  function canCompleteEvent(event: any) {
    return (
      event.source === "manual" ||
      event.source === "work-order" ||
      event.linkedType === "Work Order"
    );
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
          expandedCalendarItems.filter(
            (event: any) =>
              calendarDateKey(event.date) === dateKey,
          ),
        )
      : [];

    const selected =
      dateKey === calendarDateKey(selectedCalendarDate);
    const today = dateKey === todayKey;
    const weather = dateKey
      ? weatherByDate.get(dateKey)
      : undefined;

    const visibleLimit = isMobile ? 2 : 4;

    return (
      <button
        key={cell.key || dateKey}
        type="button"
        disabled={!dateKey}
        onClick={() => {
          if (dateKey) showDay(dateKey);
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
          padding: isMobile ? "4px 3px" : "8px",
          boxSizing: "border-box",
          borderRadius: isMobile ? 8 : 12,
          borderWidth: selected ? 2 : 1,
          borderStyle: "solid",
          borderColor: selected
            ? colors.gold
            : today
              ? colors.gold2
              : colors.line,
          background: selected
            ? "#FFF8E5"
            : today
              ? "#FFFDF3"
              : "#FFFFFF",
          opacity: cell.outside ? 0.45 : 1,
          boxShadow: selected
            ? "inset 0 0 0 1px rgba(201,154,61,0.18)"
            : "none",
          cursor: dateKey ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 3,
            minWidth: 0,
          }}
        >
          <strong
            style={{
              color: cell.outside
                ? colors.muted
                : colors.navy,
              fontSize: isMobile ? 10 : 14,
              lineHeight: 1,
            }}
          >
            {cell.day ?? ""}
          </strong>

          {weather ? (
            <span
              title={weatherText(weather.code)}
              style={{
                ...calendarWeatherIconStyle,
                fontSize: isMobile ? 8 : 13,
                lineHeight: 1,
              }}
            >
              {weatherIcon(weather.code)}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            alignContent: "start",
            gap: isMobile ? 1 : 3,
            marginTop: isMobile ? 3 : 7,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {events
            .slice(0, visibleLimit)
            .map((event: any) => {
              const eventColor = colorForEvent(event);
              const type = eventType(event);

              return (
                <span
                  key={event.instanceId || event.id}
                  title={hoverText(event)}
                  onClick={(mouseEvent) => {
                    mouseEvent.stopPropagation();
                    openEvent(event);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? 2 : 5,
                    minWidth: 0,
                    overflow: "hidden",
                    borderRadius: isMobile ? 4 : 6,
                    padding: isMobile
                      ? "1px 2px"
                      : "3px 5px",
                    color: eventColor.hex,
                    background: `${eventColor.hex}0F`,
                    fontSize: isMobile ? 7 : 11,
                    fontWeight: 800,
                    lineHeight: isMobile ? 1.05 : 1.2,
                    cursor: "pointer",
                  }}
                >
                  <span aria-hidden="true">
                    {type.icon}
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {event.title}
                  </span>
                </span>
              );
            })}

          {events.length > visibleLimit ? (
            <span
              style={{
                color: colors.muted,
                fontSize: isMobile ? 7 : 10,
                fontWeight: 900,
                lineHeight: 1,
                paddingLeft: 2,
              }}
            >
              +{events.length - visibleLimit} more
            </span>
          ) : null}
        </div>
      </button>
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
                                  {event.allDay
                                    ? "All day"
                                    : event.time || "No time"}{" "}
                                  · {type.label}
                                </span>

                                {event.repeat && event.repeat !== "None" ? (
                                  <span style={{ display: "block", marginTop: 3 }}>
                                    Repeats {event.repeat}
                                  </span>
                                ) : null}

                                {event.linkedType &&
                                event.linkedType !== "None" &&
                                event.linkedName ? (
                                  <span style={{ display: "block", marginTop: 3 }}>
                                    {event.linkedType}: {event.linkedName}
                                  </span>
                                ) : null}

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

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => editEvent(event)}
                            style={secondaryButtonStyle}
                          >
                            Quick Edit
                          </button>

                          {event.linkedId &&
                          event.linkedType &&
                          event.linkedType !== "None" ? (
                            <button
                              type="button"
                              onClick={() => openEvent(event)}
                              style={secondaryButtonStyle}
                            >
                              Open {event.linkedType}
                            </button>
                          ) : null}

                          {canCompleteEvent(event) ? (
                            <button
                              type="button"
                              onClick={() => {
                                void toggleCompleted(event);
                              }}
                              style={completed ? secondaryButtonStyle : goldButtonStyle}
                            >
                              {completed ? "Reopen" : "Complete"}
                            </button>
                          ) : null}

                          {canConvertEvent(event) ? (
                            <button
                              type="button"
                              onClick={() => {
                                void convertToWorkOrder(event);
                              }}
                              style={secondaryButtonStyle}
                            >
                              Convert to Work Order
                            </button>
                          ) : null}
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
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
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

              <div style={formGridStyle}>
                <Field
                  label="Title"
                  value={selectedCalendar.title || ""}
                  onChange={(value: string) =>
                    updateCalendarItem({
                      title: value,
                    })
                  }
                />

                <Field
                  label="Date"
                  value={
                    selectedCalendar.date ||
                    selectedCalendarDate
                  }
                  onChange={(value: string) => {
                    updateCalendarItem({
                      date: value,
                    });

                    setSelectedCalendarDate(value);
                  }}
                />

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={fieldLabelStyle}>
                    Time
                  </span>

                  <input
                    type="time"
                    value={selectedCalendar.time || ""}
                    disabled={
                      Boolean(selectedCalendar.allDay)
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        time: event.currentTarget.value,
                      })
                    }
                    style={{
                      ...inputStyle,
                      background:
                        selectedCalendar.allDay
                          ? "#EEF2F6"
                          : "#FFFFFF",
                    }}
                  />
                </label>

                <label style={checkboxLineStyle}>
                  <input
                    type="checkbox"
                    checked={
                      Boolean(selectedCalendar.allDay)
                    }
                    onChange={(event) =>
                      updateCalendarItem({
                        allDay:
                          event.currentTarget.checked,
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
                    Category
                  </span>

                  <select
                    value={
                      selectedCalendar.categoryLabel ||
                      selectedCalendar.area ||
                      ""
                    }
                    onChange={(event) => {
                      const label =
                        event.currentTarget.value;

                      const matchingColor =
                        calendarColors.find(
                          (color: any) =>
                            color.label === label,
                        );

                      updateCalendarItem({
                        categoryLabel: label,
                        area: label,
                        colorId:
                          matchingColor?.id ||
                          categoryToColorId(label),
                        colorName:
                          matchingColor?.colorName,
                      });
                    }}
                    style={inputStyle}
                  >
                    <option value=""></option>

                    {Array.from(
                      new Set<string>([
                        ...standardCalendarCategoryLabels,
                        ...calendarColors.map(
                          (color: any) =>
                            color.label,
                        ),
                      ]),
                    )
                      .filter(Boolean)
                      .sort((a, b) =>
                        a.localeCompare(b),
                      )
                      .map((label) => (
                        <option
                          key={label}
                          value={label}
                        >
                          {label}
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
                  marginTop: 12,
                }}
              >
                {showCalendarSave ? (
                  <button
                    type="button"
                    onClick={saveCalendarItem}
                    style={goldButtonStyle}
                  >
                    Save
                  </button>
                ) : null}

                {hasSelectedEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      void deleteSelectedEvent();
                    }}
                    style={dangerButtonStyle}
                  >
                    Delete
                  </button>
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
    ? "calc(100dvh - 76px)"
    : "calc(100dvh - 104px)";

  const normalControlStyle: React.CSSProperties = {
    ...secondaryButtonStyle,
    padding: isMobile ? "5px 7px" : "9px 13px",
    fontSize: isMobile ? 10 : 13,
    whiteSpace: "nowrap",
  };

  const activeControlStyle: React.CSSProperties = {
    ...goldButtonStyle,
    padding: isMobile ? "5px 7px" : "9px 13px",
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
          padding: isMobile ? 4 : 14,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: 0,
            padding: isMobile ? 4 : 14,
            boxSizing: "border-box",
            overflow: "hidden",
            display: "grid",
            gridTemplateRows:
              "auto auto minmax(0, 1fr)",
            gap: isMobile ? 2 : 8,
            background: "#FFFFFF",
            border: `1px solid ${colors.line}`,
            borderRadius: isMobile ? 10 : 18,
          }}
        >
          <header
            style={{
              display: "grid",
              gap: isMobile ? 3 : 8,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: isMobile ? 3 : 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  ...calendarHeaderStyle,
                  fontSize: isMobile ? 15 : 25,
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
                  gap: isMobile ? 2 : 7,
                  flexWrap: "nowrap",
                }}
              >
                {!isMobile ? (
                  <button
                    type="button"
                    onClick={() =>
                      moveCalendarYear(-1)
                    }
                    style={normalControlStyle}
                  >
                    Previous Year
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    moveCalendarPeriod(-1)
                  }
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
                  onClick={() =>
                    moveCalendarPeriod(1)
                  }
                  style={normalControlStyle}
                >
                  Next
                </button>

                {!isMobile ? (
                  <button
                    type="button"
                    onClick={() =>
                      moveCalendarYear(1)
                    }
                    style={normalControlStyle}
                  >
                    Next Year
                  </button>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 3 : 8,
                minWidth: 0,
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

              {!isMobile ? (
                <select
                  value={calendarCursor.getFullYear()}
                  onChange={(event) =>
                    setCalendarCursor(
                      (current: Date) =>
                        new Date(
                          Number(
                            event.currentTarget.value,
                          ),
                          current.getMonth(),
                          1,
                        ),
                    )
                  }
                  style={{
                    ...inputStyle,
                    width: 112,
                    padding: "8px 10px",
                  }}
                  aria-label="Calendar year"
                >
                  {Array.from(
                    { length: 31 },
                    (_, index) =>
                      new Date().getFullYear() -
                      15 +
                      index,
                  ).map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  const today = todayISO();
                  setSelectedCalendarDate(today);
                  addCalendarItem(today);
                  setEditorOpen(true);
                  setDetailOpen(true);
                }}
                style={activeControlStyle}
              >
                + Add Event
              </button>

              <details
                style={{
                  ...calendarFilterDropdownStyle,
                  marginLeft: "auto",
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
                        {label}
                      </label>
                    ),
                  )}
                </div>
              </details>
            </div>
          </header>

          <div
            style={{
              ...calendarWeekStyle,
              display: "grid",
              gridTemplateColumns:
                "repeat(7, minmax(0, 1fr))",
              gap: isMobile ? 2 : 5,
            }}
          >
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
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
                gap: isMobile ? 2 : 5,
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
                      gap: isMobile ? 2 : 5,
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
                gridTemplateColumns:
                  "repeat(7, minmax(0, 1fr))",
                gap: 5,
                width: "100%",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {weekCells.map((cell: any) =>
                renderCalendarCell(cell),
              )}
            </div>
          )}
        </div>
      </section>

      {detailOpen ? renderDetailPanel() : null}
    </>
  );
}
