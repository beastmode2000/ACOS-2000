"use client";

import React from "react";
import type { CalendarColorName, CalendarLinkType, CalendarReminder, CalendarRepeat } from "../lib/atlas-types";

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
    applyCalendarIntake,
    assetRecords,
    blankCalendarItem,
    buttonRowStyle,
    byName,
    byTitle,
    calendarCategoryFilters,
    calendarCellStyle,
    calendarColorDotStyle,
    calendarColors,
    calendarColorsBoxStyle,
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
    calendarIntakeMessage,
    calendarIntakeText,
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
    setCalendarIntakeMessage,
    setCalendarIntakeText,
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

    const hasSelectedEvent = Boolean(selectedCalendarId);
    const cells = calendarView === "week" ? weekCells : monthCells;
    const calendarTitle =
      calendarView === "week"
        ? `Week of ${formatDate(weekCells[0]?.date || selectedCalendarDate)}`
        : monthName(calendarCursor);
    const calendarRowCount = Math.max(1, Math.ceil(cells.length / 7));
    const compactMonthView = calendarView === "month" && !isMobile;
    const visibleEventLimit = compactMonthView ? 2 : 3;

    const linkedOptions = (() => {
      if (selectedCalendar.linkedType === "Asset")
        return byName(assetRecords).map((item) => ({
          id: item.id,
          name: item.name,
        }));
      if (selectedCalendar.linkedType === "Location")
        return [...locations]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => ({ id: item.id, name: item.name }));
      if (selectedCalendar.linkedType === "Vendor")
        return byName(vendorRecords).map((item) => ({
          id: item.id,
          name: item.name,
        }));
      if (selectedCalendar.linkedType === "Work Order")
        return byTitle(serviceRecords).map((item) => ({
          id: item.id,
          name: item.title,
        }));
      return [];
    })();

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
                setCalendarCursor(new Date());
                setSelectedCalendarDate(todayISO());
                setSelectedCalendarId("");
                setCalendarDraft(blankCalendarItem(todayISO()));
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
                        (current) =>
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
                      onChange={() => setShowUsHolidays((current) => !current)}
                    />
                    US Holidays
                  </label>
                  <label style={calendarFilterListItemStyle}>
                    <input
                      type="checkbox"
                      checked={showJewishHolidays}
                      onChange={() =>
                        setShowJewishHolidays((current) => !current)
                      }
                    />
                    Jewish Holidays
                  </label>
                  {calendarFilterLabels.map((label) => (
                    <label key={label} style={calendarFilterListItemStyle}>
                      <input
                        type="checkbox"
                        checked={calendarCategoryFilters[label] !== false}
                        onChange={() => {
                          setCalendarCategoryFilters((current) => ({
                            ...current,
                            [label]: current[label] === false,
                          }));
                        }}
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
                      height: "100%",
                      minHeight: 0,
                      gridTemplateRows: `repeat(${calendarRowCount}, minmax(0, 1fr))`,
                    }
                  : {}),
              }}
            >
              {cells.map((cell) => {
                const events = cell.date
                  ? expandedCalendarItems.filter(
                      (item) => item.date === cell.date,
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
                      if (!cell.date) return;
                      setSelectedCalendarDate(cell.date);
                      setSelectedCalendarId("");
                      setCalendarDraft(blankCalendarItem(cell.date));
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
                        gap: compactMonthView ? 2 : 4,
                        marginTop: compactMonthView ? 4 : 8,
                        minHeight: 0,
                      }}
                    >
                      {events.slice(0, visibleEventLimit).map((event) => {
                        const eventColor = colorForEvent(event);
                        return (
                          <span
                            key={event.instanceId || event.id}
                            onClick={(mouseEvent) => {
                              mouseEvent.stopPropagation();
                              openCalendarItem(event);
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

            <div style={calendarTodayBoxStyle}>
              <div style={eyebrowStyle}>Scheduled</div>

              {selectedDayEvents.length ? (
                selectedDayEvents.map((event) => {
                  const eventColor = colorForEvent(event);
                  return (
                    <button
                      key={event.instanceId || event.id}
                      type="button"
                      onClick={() => openCalendarItem(event)}
                      style={{
                        ...calendarTodayItemStyle,
                        borderColor:
                          (event.originalId || event.id) === selectedCalendarId
                            ? eventColor.hex
                            : colors.line,
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
                <p style={mutedSmallStyle}>Nothing scheduled for this day.</p>
              )}
            </div>

            <div style={compactAddBoxStyle}>
              <button
                type="button"
                onClick={() => addCalendarItem(selectedCalendarDate)}
                style={{ ...goldButtonStyle, width: "100%" }}
              >
                Add Event
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 style={editorHeaderStyle}>
                {selectedCalendar.title.trim() || "New Event"}
              </h3>

              <div style={formGridStyle}>
                <Field
                  label="Title"
                  value={selectedCalendar.title}
                  onChange={(value) => updateCalendarItem({ title: value })}
                  placeholder="Type event title..."
                />
                <Field
                  label="Date"
                  value={selectedCalendar.date}
                  onChange={(value) => {
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
                    placeholder="Optional"
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
                        (color) => color.label === nextLabel,
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
                    <option value="">Select category</option>
                    {Array.from(
                      new Set([
                        ...standardCalendarCategoryLabels,
                        ...calendarColors.map((color) => color.label),
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
                    <option value="">Select color</option>
                    {calendarPlainColors.map((color) => (
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
                    <option value="">No repeat</option>
                    {repeatOptions
                      .filter((option) => option !== "None")
                      .map((option) => (
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
                    <option value="">No reminder</option>
                    {reminderOptions
                      .filter((option) => option !== "None")
                      .map((option) => (
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
                    <option value="">No attachment</option>
                    {linkTypeOptions
                      .filter((option) => option !== "None")
                      .map((option) => (
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
                        (item) => item.id === event.currentTarget.value,
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
                    <option value="">No linked record</option>
                    {linkedOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label="Notes / Details"
                  value={selectedCalendar.notes || ""}
                  onChange={(value) => updateCalendarItem({ notes: value })}
                  multiline
                  placeholder="Optional notes"
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

              <div style={buttonRowStyle}>
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
                    onClick={() => void deleteCalendarItem(selectedCalendarId)}
                    style={dangerButtonStyle}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <div
                style={{
                  ...calendarColorsBoxStyle,
                  marginTop: 14,
                  padding: 14,
                }}
              >
                <div style={eyebrowStyle}>Text to Calendar</div>
                <textarea
                  value={calendarIntakeText}
                  onChange={(event) =>
                    setCalendarIntakeText(event.currentTarget.value)
                  }
                  placeholder="Paste scheduling text here"
                  style={{
                    ...inputStyle,
                    minHeight: 58,
                    resize: "vertical",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                />
                <div style={{ ...buttonRowStyle, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={applyCalendarIntake}
                    style={goldButtonStyle}
                  >
                    Make Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarIntakeText("");
                      setCalendarIntakeMessage("");
                    }}
                    style={secondaryButtonStyle}
                  >
                    Clear
                  </button>
                </div>
                {calendarIntakeMessage ? (
                  <p style={mutedSmallStyle}>{calendarIntakeMessage}</p>
                ) : null}
              </div>
            </div>

            <div style={calendarColorsBoxStyle}>
              <div style={eyebrowStyle}>Categories</div>
              <p style={mutedSmallStyle}>
                Use the Category dropdown above. Add more categories later only
                if needed.
              </p>
            </div>
          </>
        }
      />
    );
  
}
