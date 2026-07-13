"use client";

// UI-only calendar component.
// IMPORTANT: all events, including Operations Planner records, come from
// expandedCalendarItems / selectedDayEvents supplied by app/page.tsx.
// This component never owns, replaces, filters, or persists calendar data.

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
  applyCalendarIntake: any;
  assetRecords: any;
  blankCalendarItem: any;
  buttonRowStyle: any;
  byName: any;
  byTitle: any;
  calendarCategoryFilters: any;
  calendarCellStyle: any;
  calendarColorDotStyle: any;
  calendarColors: any;
  calendarColorsBoxStyle: any;
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
  calendarIntakeMessage: any;
  calendarIntakeText: any;
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
  setCalendarIntakeMessage: any;
  setCalendarIntakeText: any;
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
    calendarCompactCellStyle,
    calendarCompactControlPanelStyle,
    calendarCompactMoreStyle,
    calendarCompactPillStyle,
    calendarControlPanelStyle,
    calendarCursor,
    calendarDayNameStyle,
    calendarDoneBadgeStyle,
    calendarDoneMiniStyle,
    calendarFilterDropdownStyle,
    calendarFilterLabels,
    calendarFilterListItemStyle,
    calendarFilterListStyle,
    calendarFilterSummaryStyle,
    calendarGridStyle,
    calendarHeaderStyle,
    calendarMonthWhitePanelStyle,
    calendarMoreStyle,
    calendarNavyShellStyle,
    calendarPillContentStyle,
    calendarPillStyle,
    calendarPlainColors,
    calendarSelectedEventRowStyle,
    calendarTodayBoxStyle,
    calendarTodayItemStyle,
    calendarView,
    calendarWeatherIconStyle,
    calendarWeekStyle,
    calendarWhiteDrawerStyle,
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

  const [editorOpen, setEditorOpen] = React.useState(
    Boolean(selectedCalendarId),
  );

  React.useEffect(() => {
    if (selectedCalendarId) {
      setEditorOpen(true);
    }
  }, [selectedCalendarId]);

  React.useEffect(() => {
    if (!selectedCalendarId) {
      setEditorOpen(false);
    }
  }, [selectedCalendarDate, selectedCalendarId]);

  const hasSelectedEvent = Boolean(selectedCalendarId);
  const cells = calendarView === "week" ? weekCells : monthCells;
  const calendarTitle =
    calendarView === "week"
      ? `Week of ${formatDate(weekCells[0]?.date || selectedCalendarDate)}`
      : monthName(calendarCursor);
  const calendarRowCount = Math.max(1, Math.ceil(cells.length / 7));
  const compactMonthView = calendarView === "month" && !isMobile;
  const visibleEventLimit = compactMonthView ? 3 : 4;

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
        .map((item: any) => ({ id: item.id, name: item.name }));
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
  }

  function editEvent(event: any) {
    openCalendarItem(event);
    setEditorOpen(true);
  }

  function startNewEvent() {
    addCalendarItem(selectedCalendarDate);
    setEditorOpen(true);
  }

  function closeEditor() {
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(selectedCalendarDate));
    setEditorOpen(false);
  }

  return (
    <ListDrawerLayout
      eyebrow=""
      title=""
      detail={undefined}
      isMobile={isMobile}
      outerStyle={calendarNavyShellStyle}
      listPanelStyleOverride={
        compactMonthView
          ? calendarMonthWhitePanelStyle
          : calendarWhitePanelStyle
      }
      drawerStyleOverride={calendarWhiteDrawerStyle}
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
        <div style={stackStyle}>
          <div
            style={
              compactMonthView
                ? calendarCompactControlPanelStyle
                : calendarControlPanelStyle
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={calendarHeaderStyle}>{calendarTitle}</div>
              <div style={buttonRowStyle}>
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
                  style={{ ...inputStyle, width: 120, padding: "10px 12px" }}
                  aria-label="Calendar year"
                >
                  {Array.from(
                    { length: 31 },
                    (_, index) => new Date().getFullYear() - 15 + index,
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <details style={calendarFilterDropdownStyle}>
              <summary style={calendarFilterSummaryStyle}>Filters</summary>
              <div style={calendarFilterListStyle}>
                <label style={calendarFilterListItemStyle}>
                  <input
                    type="checkbox"
                    checked={showUsHolidays}
                    onChange={() =>
                      setShowUsHolidays((current: boolean) => !current)
                    }
                  />
                  US Holidays
                </label>
                <label style={calendarFilterListItemStyle}>
                  <input
                    type="checkbox"
                    checked={showJewishHolidays}
                    onChange={() =>
                      setShowJewishHolidays((current: boolean) => !current)
                    }
                  />
                  Jewish Holidays
                </label>
                {calendarFilterLabels.map((label: string) => (
                  <label key={label} style={calendarFilterListItemStyle}>
                    <input
                      type="checkbox"
                      checked={calendarCategoryFilters[label] !== false}
                      onChange={() =>
                        setCalendarCategoryFilters((current: any) => ({
                          ...current,
                          [label]: current[label] === false,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </details>
          </div>

          <div style={calendarWeekStyle}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} style={calendarDayNameStyle}>
                {day}
              </div>
            ))}
          </div>

          <div
            style={{
              ...calendarGridStyle,
              ...(compactMonthView
                ? {
                    height: "auto",
                    minHeight: 0,
                    gridTemplateRows: `repeat(${calendarRowCount}, minmax(142px, auto))`,
                  }
                : {}),
            }}
          >
            {cells.map((cell: any) => {
              const events = cell.date
                ? expandedCalendarItems.filter(
                    (item: any) => item.date === cell.date,
                  )
                : [];
              const isToday = cell.date === todayISO();
              const isSelected = cell.date === selectedCalendarDate;
              const dayWeather = cell.date
                ? weatherByDate.get(cell.date)
                : undefined;

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!cell.date}
                  onClick={() => {
                    if (cell.date) showDay(cell.date);
                  }}
                  style={{
                    ...calendarCellStyle,
                    ...(compactMonthView ? calendarCompactCellStyle : {}),
                    opacity: cell.outside ? 0.55 : 1,
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
                      ? "0 12px 28px rgba(201,154,61,0.18)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <strong>{cell.day ?? ""}</strong>
                    {dayWeather ? (
                      <span
                        title={weatherText(dayWeather.code)}
                        style={calendarWeatherIconStyle}
                      >
                        {weatherIcon(dayWeather.code)}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: compactMonthView ? 3 : 4,
                      marginTop: compactMonthView ? 6 : 8,
                      minHeight: 0,
                    }}
                  >
                    {events.slice(0, visibleEventLimit).map((event: any) => {
                      const eventColor = colorForEvent(event);
                      return (
                        <span
                          key={event.instanceId || event.id}
                          onClick={(mouseEvent) => {
                            mouseEvent.stopPropagation();
                            editEvent(event);
                          }}
                          style={{
                            ...calendarPillStyle,
                            ...(compactMonthView
                              ? calendarCompactPillStyle
                              : {}),
                            borderLeft: `${
                              compactMonthView ? 3 : 5
                            }px solid ${eventColor.hex}`,
                            color: event.completed
                              ? colors.muted
                              : eventColor.hex,
                            background: event.completed
                              ? "#EEF2F6"
                              : "#F8FAFC",
                            opacity: event.completed ? 0.58 : 1,
                          }}
                        >
                          <span style={calendarPillContentStyle}>
                            <span
                              style={{
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textDecoration: event.completed
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {event.completed ? "✓ " : ""}
                              {event.title}
                            </span>
                            {event.completed ? (
                              <span style={calendarDoneMiniStyle}>Done</span>
                            ) : null}
                          </span>
                        </span>
                      );
                    })}

                    {events.length > visibleEventLimit ? (
                      <span
                        style={{
                          ...calendarMoreStyle,
                          ...(compactMonthView
                            ? calendarCompactMoreStyle
                            : {}),
                        }}
                      >
                        +{events.length - visibleEventLimit} more
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      }
      drawer={
        <>
          <h3 style={editorHeaderStyle}>
            {formatDate(selectedCalendarDate)}
          </h3>

          {!editorOpen ? (
            <>
              <div style={calendarTodayBoxStyle}>
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
                          borderColor: colors.line,
                          background: event.completed
                            ? "#EEF2F6"
                            : "#F8FAFC",
                          opacity: event.completed ? 0.62 : 1,
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
                                <span>Linked: {event.linkedName}</span>
                              ) : null}
                            </div>
                          </div>
                          {event.completed ? (
                            <span style={calendarDoneBadgeStyle}>✓ Done</span>
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
              </div>

              <div style={{ ...compactAddBoxStyle, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={startNewEvent}
                  style={{ ...goldButtonStyle, width: "100%" }}
                >
                  Add Event
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <h3 style={{ ...editorHeaderStyle, margin: 0 }}>
                  {hasSelectedEvent ? "Edit Event" : "Add Event"}
                </h3>
                <button
                  type="button"
                  onClick={closeEditor}
                  style={secondaryButtonStyle}
                >
                  Back
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
                  value={selectedCalendar.date || selectedCalendarDate}
                  onChange={(value: string) => {
                    updateCalendarItem({ date: value });
                    setSelectedCalendarDate(value);
                  }}
                />

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Time</span>
                  <input
                    value={selectedCalendar.time || ""}
                    disabled={!!selectedCalendar.allDay}
                    onChange={(event) =>
                      updateCalendarItem({ time: event.currentTarget.value })
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

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
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
                        (color: any) => color.label === nextLabel,
                      );
                      updateCalendarItem({
                        categoryLabel: nextLabel,
                        area: nextLabel,
                        colorId:
                          matchingColor?.id || categoryToColorId(nextLabel),
                        colorName: matchingColor?.colorName,
                      });
                    }}
                    style={inputStyle}
                  >
                    <option value=""></option>
                    {Array.from(
                      new Set<string>([
                        ...standardCalendarCategoryLabels,
                        ...calendarColors.map((color: any) => color.label),
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

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Color</span>
                  <select
                    value={selectedCalendar.colorName || ""}
                    onChange={(event) =>
                      updateCalendarItem({
                        colorName: event.currentTarget
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

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Repeat</span>
                  <select
                    value={selectedCalendar.repeat || ""}
                    onChange={(event) =>
                      updateCalendarItem({
                        repeat: event.currentTarget.value as CalendarRepeat,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>
                    {repeatOptions
                      .filter((option: string) => option !== "None")
                      .map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Reminder</span>
                  <select
                    value={selectedCalendar.reminder || ""}
                    onChange={(event) =>
                      updateCalendarItem({
                        reminder: event.currentTarget.value as CalendarReminder,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>
                    {reminderOptions
                      .filter((option: string) => option !== "None")
                      .map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Attach To</span>
                  <select
                    value={selectedCalendar.linkedType || ""}
                    onChange={(event) =>
                      updateCalendarItem({
                        linkedType: event.currentTarget
                          .value as CalendarLinkType,
                        linkedId: "",
                        linkedName: "",
                      })
                    }
                    style={inputStyle}
                  >
                    <option value=""></option>
                    {linkTypeOptions
                      .filter((option: string) => option !== "None")
                      .map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Linked Record</span>
                  <select
                    value={selectedCalendar.linkedId || ""}
                    disabled={
                      !selectedCalendar.linkedType ||
                      selectedCalendar.linkedType === "None"
                    }
                    onChange={(event) => {
                      const option = linkedOptions.find(
                        (item: any) => item.id === event.currentTarget.value,
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

              <div style={{ ...buttonRowStyle, marginTop: 12 }}>
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
                    onClick={() =>
                      void deleteCalendarItem(selectedCalendarId)
                    }
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
        </>
      }
    />
  );
}
