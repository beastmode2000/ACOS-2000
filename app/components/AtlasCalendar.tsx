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
  assetRecords: any;
  blankCalendarItem: any;
  buttonRowStyle: any;
  byName: any;
  byTitle: any;
  calendarCategoryFilters: any;
  calendarCellStyle: any;
  calendarColorDotStyle: any;
  calendarColors: any;
  calendarColorsBoxStyle?: any;
  calendarCompactCellStyle: any;
  calendarCompactControlPanelStyle: any;
  calendarCompactMoreStyle: any;
  calendarCompactPillStyle: any;
  calendarControlPanelStyle: any;
  calendarCursor: any;
  calendarDayNameStyle: any;
  calendarDoneBadgeStyle: any;
  calendarDoneMiniStyle: any;
  calendarFilterDropdownStyle: any;
  calendarFilterLabels: any;
  calendarFilterListItemStyle: any;
  calendarFilterListStyle: any;
  calendarFilterSummaryStyle: any;
  calendarGridStyle: any;
  calendarHeaderStyle: any;
  calendarIntakeMessage?: any;
  calendarIntakeText?: any;
  calendarMonthWhitePanelStyle: any;
  calendarMoreStyle: any;
  calendarNavyShellStyle: any;
  calendarPillContentStyle: any;
  calendarPillStyle: any;
  calendarPlainColors: any;
  calendarSelectedEventRowStyle: any;
  calendarTodayBoxStyle: any;
  calendarTodayItemStyle: any;
  calendarView: any;
  calendarWeatherIconStyle: any;
  calendarWeekStyle: any;
  calendarWhiteDrawerStyle: any;
  calendarWhitePanelStyle: any;
  categoryToColorId: any;
  checkboxLineStyle: any;
  colorForEvent: any;
  colors: any;
  compactAddBoxStyle: any;
  dangerButtonStyle: any;
  deleteCalendarItem: any;
  editorHeaderStyle: any;
  expandedCalendarItems: any;
  eyebrowStyle: any;
  fieldLabelStyle: any;
  formGridStyle: any;
  formatDate: any;
  goldButtonStyle: any;
  inputStyle: any;
  isMobile: any;
  linkTypeOptions: any;
  locations: any;
  monthCells: any;
  monthName: any;
  moveCalendarPeriod: any;
  moveCalendarYear: any;
  mutedSmallStyle: any;
  openCalendarItem: any;
  reminderOptions: any;
  repeatOptions: any;
  saveCalendarItem: any;
  secondaryButtonStyle: any;
  selectedCalendar: any;
  selectedCalendarDate: any;
  selectedCalendarId: any;
  selectedDayEvents: any;
  serviceRecords: any;
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
  showCalendarSave: any;
  showJewishHolidays: any;
  showUsHolidays: any;
  stackStyle: any;
  standardCalendarCategoryLabels: any;
  todayISO: any;
  updateCalendarItem: any;
  vendorRecords: any;
  weatherByDate: any;
  weatherIcon: any;
  weatherText: any;
  weekCells: any;
};

function calendarDateKey(value: unknown): string {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoMatch) return isoMatch[1];

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

export default function AtlasCalendar(props: AtlasCalendarProps) {
  const {
    Field,
    ListDrawerLayout,
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
    calendarCompactControlPanelStyle,
    calendarControlPanelStyle,
    calendarCursor,
    calendarDayNameStyle,
    calendarDoneBadgeStyle,
    calendarFilterDropdownStyle,
    calendarFilterLabels,
    calendarFilterListItemStyle,
    calendarFilterListStyle,
    calendarFilterSummaryStyle,
    calendarHeaderStyle,
    calendarMonthWhitePanelStyle,
    calendarNavyShellStyle,
    calendarPlainColors,
    calendarSelectedEventRowStyle,
    calendarTodayBoxStyle,
    calendarTodayItemStyle,
    calendarView,
    calendarWeatherIconStyle,
    calendarWeekStyle,
    calendarWhitePanelStyle,
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

  const [detailExpanded, setDetailExpanded] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(
    Boolean(selectedCalendarId),
  );

  React.useEffect(() => {
    if (!selectedCalendarId) return;

    setEditorOpen(true);
    setDetailExpanded(true);
  }, [selectedCalendarId]);

  React.useEffect(() => {
    if (!selectedCalendarId) setEditorOpen(false);
  }, [selectedCalendarDate, selectedCalendarId]);

  React.useEffect(() => {
    if (!detailExpanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") collapseDetail();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailExpanded]);

  const hasSelectedEvent = Boolean(selectedCalendarId);
  const cells = calendarView === "week" ? weekCells : monthCells;

  const calendarTitle =
    calendarView === "week"
      ? `Week of ${formatDate(
          weekCells[0]?.date || selectedCalendarDate,
        )}`
      : monthName(calendarCursor);

  const visibleEventLimit = isMobile ? 2 : 3;
  const todayKey = todayISO();

  const monthWeeks = React.useMemo(() => {
    const weeks: any[][] = [];

    for (let index = 0; index < monthCells.length; index += 7) {
      weeks.push(monthCells.slice(index, index + 7));
    }

    return weeks;
  }, [monthCells]);

  const linkedOptions = React.useMemo(() => {
    if (selectedCalendar.linkedType === "Asset") {
      return byName(assetRecords).map((item: any) => ({
        id: item.id,
        name: item.name,
      }));
    }

    if (selectedCalendar.linkedType === "Location") {
      return [...locations]
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((item: any) => ({
          id: item.id,
          name: item.name,
        }));
    }

    if (selectedCalendar.linkedType === "Vendor") {
      return byName(vendorRecords).map((item: any) => ({
        id: item.id,
        name: item.name,
      }));
    }

    if (selectedCalendar.linkedType === "Work Order") {
      return byTitle(serviceRecords).map((item: any) => ({
        id: item.id,
        name: item.title,
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
    setEditorOpen(false);
    setDetailExpanded(true);
  }

  function editEvent(event: any) {
    openCalendarItem(event);
    setEditorOpen(true);
    setDetailExpanded(true);
  }

  function startNewEvent() {
    addCalendarItem(selectedCalendarDate);
    setEditorOpen(true);
    setDetailExpanded(true);
  }

  function closeEditor() {
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(selectedCalendarDate));
    setEditorOpen(false);
  }

  function collapseDetail() {
    setDetailExpanded(false);
    setEditorOpen(false);
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(selectedCalendarDate));
  }

  async function deleteSelectedEvent() {
    if (!selectedCalendarId) return;

    await deleteCalendarItem(selectedCalendarId);

    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(selectedCalendarDate));
    setEditorOpen(false);
    setDetailExpanded(false);
  }

  function renderCalendarCell(cell: any) {
    const cellDateKey = calendarDateKey(cell.date);

    const events = cellDateKey
      ? expandedCalendarItems.filter(
          (item: any) =>
            calendarDateKey(item.date) === cellDateKey,
        )
      : [];

    const isToday =
      cellDateKey === calendarDateKey(todayKey);

    const isSelected =
      cellDateKey === calendarDateKey(selectedCalendarDate);

    const dayWeather = cellDateKey
      ? weatherByDate.get(cellDateKey)
      : undefined;

    return (
      <button
        key={cell.key}
        type="button"
        disabled={!cellDateKey}
        onClick={() => cellDateKey && showDay(cellDateKey)}
        style={{
          ...calendarCellStyle,
          minHeight: 0,
          height: "100%",
          padding: isMobile ? "5px 4px" : "8px",
          overflow: "hidden",
          opacity: cell.outside ? 0.45 : 1,
          borderColor: isSelected
            ? colors.gold
            : isToday
              ? colors.gold2
              : colors.line,
          background: isSelected
            ? "#FFFAEB"
            : isToday
              ? "#FFFDF3"
              : "#FFFFFF",
          boxShadow: isSelected
            ? "inset 0 0 0 2px rgba(201,154,61,0.22)"
            : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 4,
            alignItems: "center",
          }}
        >
          <strong
            style={{
              fontSize: isMobile ? 11 : 13,
              color: cell.outside ? colors.muted : colors.navy,
            }}
          >
            {cell.day ?? ""}
          </strong>

          {dayWeather && !isMobile ? (
            <span
              title={weatherText(dayWeather.code)}
              style={{
                ...calendarWeatherIconStyle,
                fontSize: 12,
              }}
            >
              {weatherIcon(dayWeather.code)}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gap: isMobile ? 2 : 3,
            marginTop: isMobile ? 3 : 5,
            minHeight: 0,
          }}
        >
          {events
            .slice(0, visibleEventLimit)
            .map((event: any) => {
              const eventColor = colorForEvent(event);

              return (
                <span
                  key={event.instanceId || event.id}
                  onClick={(mouseEvent) => {
                    mouseEvent.stopPropagation();
                    editEvent(event);
                  }}
                  style={{
                    display: "block",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    borderRadius: 5,
                    padding: isMobile ? "2px 3px" : "3px 5px",
                    borderLeft: `3px solid ${eventColor.hex}`,
                    color: eventColor.hex,
                    background: event.completed
                      ? `${eventColor.hex}22`
                      : `${eventColor.hex}0D`,
                    fontSize: isMobile ? 8 : 11,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    textAlign: "left",
                    textDecoration: event.completed
                      ? "line-through"
                      : "none",
                  }}
                >
                  {event.completed ? "✓ " : ""}
                  {event.title}
                </span>
              );
            })}

          {events.length > visibleEventLimit ? (
            <span
              style={{
                color: colors.muted,
                fontSize: isMobile ? 8 : 10,
                fontWeight: 900,
                paddingLeft: 3,
                textAlign: "left",
              }}
            >
              +{events.length - visibleEventLimit} more
            </span>
          ) : null}
        </div>
      </button>
    );
  }

  function renderExpandedPanel() {
    return (
      <>
        <button
          type="button"
          aria-label="Close calendar details"
          onClick={collapseDetail}
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
          onClick={(event) => event.stopPropagation()}
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
            background: "#FFFFFF",
            border: `1px solid ${colors.line}`,
            borderRadius: isMobile ? 0 : 20,
            boxShadow: "0 30px 80px rgba(7,27,47,0.34)",
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: isMobile ? 16 : 22,
          }}
        >
          <div
            style={{
              position: "sticky",
              top: isMobile ? -16 : -22,
              zIndex: 5,
              background: "#FFFFFF",
              padding: "4px 0 14px",
              borderBottom: `1px solid ${colors.line}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={eyebrowStyle}>Calendar Details</div>

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
              onClick={collapseDetail}
              style={secondaryButtonStyle}
            >
              ✕ Close
            </button>
          </div>

          {!editorOpen ? (
            <div style={{ ...stackStyle, marginTop: 16 }}>
              <section style={calendarTodayBoxStyle}>
                <div style={eyebrowStyle}>Scheduled</div>

                {selectedDayEvents.length ? (
                  selectedDayEvents.map((event: any) => {
                    const eventColor = colorForEvent(event);

                    return (
                      <button
                        key={event.instanceId || event.id}
                        type="button"
                        onClick={() => editEvent(event)}
                        style={{
                          ...calendarTodayItemStyle,
                          borderColor: eventColor.hex,
                          borderLeft: `6px solid ${eventColor.hex}`,
                          background: event.completed
                            ? `${eventColor.hex}22`
                            : `${eventColor.hex}0D`,
                          color: eventColor.hex,
                        }}
                      >
                        <div style={calendarSelectedEventRowStyle}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                ...calendarColorDotStyle,
                                background: eventColor.hex,
                              }}
                            />

                            <div style={{ minWidth: 0 }}>
                              <strong
                                style={{
                                  display: "block",
                                  color: eventColor.hex,
                                  textDecoration: event.completed
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {event.completed ? "✓ " : ""}
                                {event.title}
                              </strong>

                              <span>
                                {event.allDay
                                  ? "All day"
                                  : event.time || "No time"}{" "}
                                · {eventColor.label}
                              </span>

                              {event.repeat &&
                              event.repeat !== "None" &&
                              event.source === "manual" ? (
                                <span>Repeats {event.repeat}</span>
                              ) : null}

                              {event.linkedType &&
                              event.linkedType !== "None" &&
                              event.linkedName ? (
                                <span>
                                  Linked: {event.linkedName}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {event.completed ? (
                            <span
                              style={{
                                ...calendarDoneBadgeStyle,
                                color: eventColor.hex,
                                borderColor: eventColor.hex,
                                background: `${eventColor.hex}18`,
                              }}
                            >
                              ✓ Done
                            </span>
                          ) : null}
                        </div>
                      </button>
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
                  {hasSelectedEvent ? "Edit Event" : "Add Event"}
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
                    updateCalendarItem({ title: value })
                  }
                />

                <Field
                  label="Date"
                  value={
                    selectedCalendar.date || selectedCalendarDate
                  }
                  onChange={(value: string) => {
                    updateCalendarItem({ date: value });
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
                  <span style={fieldLabelStyle}>Time</span>

                  <input
                    value={selectedCalendar.time || ""}
                    disabled={!!selectedCalendar.allDay}
                    onChange={(event) =>
                      updateCalendarItem({
                        time: event.currentTarget.value,
                      })
                    }
                    style={{
                      ...inputStyle,
                      background: selectedCalendar.allDay
                        ? "#EEF2F6"
                        : "#FFFFFF",
                    }}
                  />
                </label>

                <label style={checkboxLineStyle}>
                  <input
                    type="checkbox"
                    checked={!!selectedCalendar.allDay}
                    onChange={(event) =>
                      updateCalendarItem({
                        allDay: event.currentTarget.checked,
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
                  <span style={fieldLabelStyle}>Category</span>

                  <select
                    value={
                      selectedCalendar.categoryLabel ||
                      selectedCalendar.area ||
                      ""
                    }
                    onChange={(event) => {
                      const nextLabel = event.currentTarget.value;

                      const matchingColor = calendarColors.find(
                        (color: any) =>
                          color.label === nextLabel,
                      );

                      updateCalendarItem({
                        categoryLabel: nextLabel,
                        area: nextLabel,
                        colorId:
                          matchingColor?.id ||
                          categoryToColorId(nextLabel),
                        colorName: matchingColor?.colorName,
                      });
                    }}
                    style={inputStyle}
                  >
                    <option value=""></option>

                    {Array.from(
                      new Set<string>([
                        ...standardCalendarCategoryLabels,
                        ...calendarColors.map(
                          (color: any) => color.label,
                        ),
                      ]),
                    )
                      .filter(Boolean)
                      .sort((a, b) => a.localeCompare(b))
                      .map((label) => (
                        <option key={label} value={label}>
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
                  <span style={fieldLabelStyle}>Color</span>

                  <select
                    value={selectedCalendar.colorName || ""}
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

                    {calendarPlainColors.map((color: any) => (
                      <option key={color.id} value={color.id}>
                        {color.label}
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
                  <span style={fieldLabelStyle}>Repeat</span>

                  <select
                    value={selectedCalendar.repeat || ""}
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
                        (option: string) => option !== "None",
                      )
                      .map((option: string) => (
                        <option key={option} value={option}>
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
                  <span style={fieldLabelStyle}>Reminder</span>

                  <select
                    value={selectedCalendar.reminder || ""}
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
                        (option: string) => option !== "None",
                      )
                      .map((option: string) => (
                        <option key={option} value={option}>
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
                  <span style={fieldLabelStyle}>Attach To</span>

                  <select
                    value={selectedCalendar.linkedType || ""}
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
                        (option: string) => option !== "None",
                      )
                      .map((option: string) => (
                        <option key={option} value={option}>
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
                    value={selectedCalendar.linkedId || ""}
                    disabled={
                      !selectedCalendar.linkedType ||
                      selectedCalendar.linkedType === "None"
                    }
                    onChange={(event) => {
                      const option = linkedOptions.find(
                        (item: any) =>
                          item.id === event.currentTarget.value,
                      );

                      updateCalendarItem({
                        linkedId: event.currentTarget.value,
                        linkedName: option?.name || "",
                      });
                    }}
                    style={{
                      ...inputStyle,
                      background:
                        !selectedCalendar.linkedType ||
                        selectedCalendar.linkedType === "None"
                          ? "#EEF2F6"
                          : "#FFFFFF",
                    }}
                  >
                    <option value=""></option>

                    {linkedOptions.map((option: any) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label="Notes / Details"
                  value={selectedCalendar.notes || ""}
                  onChange={(value: string) =>
                    updateCalendarItem({ notes: value })
                  }
                  multiline
                />

                <label style={checkboxLineStyle}>
                  <input
                    type="checkbox"
                    checked={!!selectedCalendar.completed}
                    onChange={(event) =>
                      updateCalendarItem({
                        completed: event.currentTarget.checked,
                      })
                    }
                  />
                  Completed
                </label>
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
                    onClick={() => void deleteSelectedEvent()}
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

  const calendarViewportHeight = isMobile
    ? "calc(100dvh - 174px)"
    : "calc(100dvh - 118px)";

  return (
    <>
      <ListDrawerLayout
        eyebrow=""
        title=""
        detail={undefined}
        isMobile={isMobile}
        outerStyle={{
          ...calendarNavyShellStyle,
          height: calendarViewportHeight,
          minHeight: 0,
          overflow: "hidden",
        }}
        listPanelStyleOverride={{
          ...(calendarView === "month"
            ? calendarMonthWhitePanelStyle
            : calendarWhitePanelStyle),
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
        drawerStyleOverride={{
          display: "none",
        }}
        right={
          <>
            <button
              type="button"
              onClick={() => moveCalendarYear(-1)}
              style={secondaryButtonStyle}
            >
              Previous Year
            </button>

            <button
              type="button"
              onClick={() => moveCalendarPeriod(-1)}
              style={secondaryButtonStyle}
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
              style={secondaryButtonStyle}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => moveCalendarPeriod(1)}
              style={secondaryButtonStyle}
            >
              Next
            </button>

            <button
              type="button"
              onClick={() => moveCalendarYear(1)}
              style={secondaryButtonStyle}
            >
              Next Year
            </button>
          </>
        }
        list={
          <div
            style={{
              ...stackStyle,
              display: "grid",
              gridTemplateRows:
                "auto auto minmax(0, 1fr)",
              height: "100%",
              minHeight: 0,
              gap: isMobile ? 6 : 8,
              overflow: "hidden",
            }}
          >
            <div
              style={
                isMobile
                  ? calendarCompactControlPanelStyle
                  : calendarControlPanelStyle
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: isMobile ? "nowrap" : "wrap",
                }}
              >
                <div
                  style={{
                    ...calendarHeaderStyle,
                    fontSize: isMobile ? 17 : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  {calendarTitle}
                </div>

                <div
                  style={{
                    ...buttonRowStyle,
                    flexWrap: "nowrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCalendarView("month")}
                    style={
                      calendarView === "month"
                        ? goldButtonStyle
                        : secondaryButtonStyle
                    }
                  >
                    Month
                  </button>

                  {!isMobile ? (
                    <button
                      type="button"
                      onClick={() => setCalendarView("week")}
                      style={
                        calendarView === "week"
                          ? goldButtonStyle
                          : secondaryButtonStyle
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
                              Number(event.currentTarget.value),
                              current.getMonth(),
                              1,
                            ),
                        )
                      }
                      style={{
                        ...inputStyle,
                        width: 120,
                        padding: "10px 12px",
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
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>

              <details style={calendarFilterDropdownStyle}>
                <summary style={calendarFilterSummaryStyle}>
                  Filters
                </summary>

                <div style={calendarFilterListStyle}>
                  <label style={calendarFilterListItemStyle}>
                    <input
                      type="checkbox"
                      checked={showUsHolidays}
                      onChange={() =>
                        setShowUsHolidays(
                          (current: boolean) => !current,
                        )
                      }
                    />
                    US Holidays
                  </label>

                  <label style={calendarFilterListItemStyle}>
                    <input
                      type="checkbox"
                      checked={showJewishHolidays}
                      onChange={() =>
                        setShowJewishHolidays(
                          (current: boolean) => !current,
                        )
                      }
                    />
                    Jewish Holidays
                  </label>

                  {calendarFilterLabels.map((label: string) => (
                    <label
                      key={label}
                      style={calendarFilterListItemStyle}
                    >
                      <input
                        type="checkbox"
                        checked={
                          calendarCategoryFilters[label] !== false
                        }
                        onChange={() =>
                          setCalendarCategoryFilters(
                            (current: any) => ({
                              ...current,
                              [label]:
                                current[label] === false,
                            }),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </details>
            </div>

            <div style={calendarWeekStyle}>
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
                    fontSize: isMobile ? 9 : undefined,
                    padding: isMobile ? "2px 0" : undefined,
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {calendarView === "month" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: `repeat(${monthWeeks.length}, minmax(0, 1fr))`,
                  gap: isMobile ? 2 : 5,
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {monthWeeks.map((week, weekIndex) => (
                  <div
                    key={`month-week-${weekIndex}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(7, minmax(0, 1fr))",
                      gap: isMobile ? 2 : 5,
                      minHeight: 0,
                    }}
                  >
                    {week.map((cell: any) =>
                      renderCalendarCell(cell),
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(7, minmax(0, 1fr))",
                  minHeight: 0,
                  overflow: "hidden",
                  gap: 5,
                }}
              >
                {cells.map((cell: any) =>
                  renderCalendarCell(cell),
                )}
              </div>
            )}
          </div>
        }
        drawer={null}
      />

      {detailExpanded ? renderExpandedPanel() : null}
    </>
  );
}
