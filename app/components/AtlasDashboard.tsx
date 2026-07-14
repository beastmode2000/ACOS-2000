"use client";

import React, { useMemo } from "react";

type AtlasDashboardProps = {
  [key: string]: any;
};

function dateTime(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? Number.POSITIVE_INFINITY
    : parsed.getTime();
}

function daysFromToday(today: string, value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const start = new Date(`${today}T12:00:00`).getTime();
  const end = new Date(`${value}T12:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function workType(record: any) {
  if (record.workType) return String(record.workType);
  return record.recurring ? "Preventive Maintenance" : "Work Order";
}

function categoryLabel(record: any) {
  return String(record.workCategory || record.category || "🔧 Maintenance");
}

export default function AtlasDashboard(props: AtlasDashboardProps) {
  const {
    SectionHeader,
    addCalendarItem,
    assetName,
    badgeStyle,
    buttonRowStyle,
    calendarWeatherIconStyle,
    categoryForEvent,
    colorForEvent,
    colors,
    dashboardAdviceStyle,
    dashboardStackStyle,
    dashboardWeatherDayStyle,
    dashboardWeatherMiniStyle,
    dashboardWeatherStripStyle,
    dashboardWeatherTempStyle,
    dashboardWeatherTopStyle,
    eventColorPillStyle,
    formatDate,
    goldButtonStyle,
    irrigationAdvice,
    isMobile,
    logoCandidates,
    logoIndex,
    mutedSmallStyle,
    noticeStyle,
    openCalendarItem,
    secondaryButtonStyle,
    sectionStyle,
    sectionTitleStyle,
    serviceRecords = [],
    setLogoIndex,
    setScreen,
    setSelectedServiceId,
    todayEventStyle,
    todayEvents = [],
    todayISO,
    upcomingDayLabel,
    upcomingDayPillStyle,
    upcomingEvents = [],
    upcomingInfoStyle,
    upcomingItemStyle,
    upcomingListStyle,
    upcomingTodayPillStyle,
    upcomingDotStyle,
    weatherDays = [],
    weatherIcon,
    weatherStatus,
    eyebrowStyle,
  } = props;

  const today = todayISO();

  const daily = useMemo(() => {
    const open = serviceRecords
      .filter((record: any) => record.status !== "Completed")
      .sort((a: any, b: any) => dateTime(a.date) - dateTime(b.date));

    const overdue = open.filter(
      (record: any) => record.date && daysFromToday(today, record.date) < 0,
    );
    const dueToday = open.filter(
      (record: any) => record.date && daysFromToday(today, record.date) === 0,
    );
    const inProgress = open.filter(
      (record: any) => record.status === "In Progress",
    );
    const maintenance = open.filter(
      (record: any) =>
        record.recurring || workType(record) === "Preventive Maintenance",
    );

    return { open, overdue, dueToday, inProgress, maintenance };
  }, [serviceRecords, today]);

  const cardGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    gap: 10,
  };

  const statCard: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 13,
    background: "#FFFFFF",
    padding: 13,
    display: "grid",
    gap: 5,
    textAlign: "left",
    color: colors.text,
    cursor: "pointer",
  };

  const workButton: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    background: "#FFFFFF",
    padding: "10px 11px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 9,
    color: colors.text,
    textAlign: "left",
    cursor: "pointer",
  };

  return (
    <div style={dashboardStackStyle}>
      <section
        style={{
          ...sectionStyle,
          background:
            "linear-gradient(135deg, rgba(7,27,47,1) 0%, rgba(18,61,99,1) 100%)",
          color: "#FFFFFF",
          border: "1px solid rgba(201,154,61,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(229,192,107,0.52)",
              }}
            >
              {logoIndex < logoCandidates.length ? (
                <img
                  src={logoCandidates[logoIndex]}
                  alt=""
                  onError={() => setLogoIndex((index: number) => index + 1)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: 5,
                  }}
                />
              ) : (
                <span style={{ color: colors.gold2, fontWeight: 900 }}>A</span>
              )}
            </div>

            <div>
              <div style={{ ...eyebrowStyle, color: colors.gold2 }}>
                Estate Command Center
              </div>
              <h2
                style={{
                  ...sectionTitleStyle,
                  color: "#FFFFFF",
                  marginBottom: 4,
                }}
              >
                Today at 2000
              </h2>
              <p
                style={{
                  ...mutedSmallStyle,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                Daily schedule, upcoming commitments, and weather.
              </p>
            </div>
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={() => setScreen("history")}
              style={goldButtonStyle}
            >
              Plan My Day
            </button>
            <button
              type="button"
              onClick={() => setScreen("inbox")}
              style={secondaryButtonStyle}
            >
              + Add Anything
            </button>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
            gap: 18,
          }}
        >
          <div>
            <SectionHeader
              brand
              eyebrow="Today"
              title="Today's Schedule"
              right={
                <button
                  type="button"
                  onClick={() => addCalendarItem(today)}
                  style={goldButtonStyle}
                >
                  + Event
                </button>
              }
            />

            <div style={{ display: "grid", gap: 8 }}>
              {todayEvents.length ? (
                todayEvents.map((event: any) => {
                  const eventColor = colorForEvent(event);
                  return (
                    <button
                      key={event.instanceId || event.id}
                      type="button"
                      onClick={() => {
                        openCalendarItem(event);
                        if (event.source !== "work-order") setScreen("calendar");
                      }}
                      style={{
                        ...todayEventStyle,
                        borderLeftColor: eventColor.hex,
                      }}
                    >
                      <div>
                        <strong>{event.title}</strong>
                        <p style={mutedSmallStyle}>
                          {event.allDay ? "All day" : event.time || "No time"} ·{" "}
                          {categoryForEvent(event)}
                        </p>
                      </div>
                      <span
                        style={{
                          ...eventColorPillStyle,
                          borderColor: eventColor.hex,
                          color: eventColor.hex,
                        }}
                      >
                        {eventColor.label}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div style={noticeStyle}>Nothing is scheduled for today.</div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader
              brand
              eyebrow="Next"
              title="Upcoming"
              right={
                <button
                  type="button"
                  onClick={() => setScreen("calendar")}
                  style={secondaryButtonStyle}
                >
                  Full Calendar
                </button>
              }
            />

            <div style={upcomingListStyle}>
              {upcomingEvents.slice(0, 7).map((event: any) => {
                const eventColor = colorForEvent(event);
                const dayLabel = upcomingDayLabel(event.date);

                return (
                  <button
                    key={event.instanceId || event.id}
                    type="button"
                    onClick={() => {
                      openCalendarItem(event);
                      if (event.source !== "work-order") setScreen("calendar");
                    }}
                    style={upcomingItemStyle}
                  >
                    <span
                      style={{
                        ...upcomingDotStyle,
                        background: eventColor.hex,
                      }}
                    />
                    <div style={upcomingInfoStyle}>
                      <strong>{event.title}</strong>
                      <p style={mutedSmallStyle}>
                        {formatDate(event.date)} ·{" "}
                        {event.allDay ? "All day" : event.time || "No time"}
                      </p>
                    </div>
                    {dayLabel ? (
                      <span
                        style={{
                          ...upcomingDayPillStyle,
                          ...(dayLabel === "Today"
                            ? upcomingTodayPillStyle
                            : {}),
                        }}
                      >
                        {dayLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionHeader
          brand
          eyebrow="Weather / Irrigation"
          title="7-Day Planning Window"
          detail="Weather conditions for outdoor work."
          right={
            <button
              type="button"
              onClick={() => setScreen("weather")}
              style={secondaryButtonStyle}
            >
              Open Weather
            </button>
          }
        />

        <div style={dashboardWeatherStripStyle}>
          {weatherDays.length ? (
            weatherDays.map((day: any) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setScreen("weather")}
                style={dashboardWeatherDayStyle}
              >
                <div style={dashboardWeatherTopStyle}>
                  <strong>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short" },
                    )}
                  </strong>
                  <span style={calendarWeatherIconStyle}>
                    {weatherIcon(day.code)}
                  </span>
                </div>
                <div style={dashboardWeatherTempStyle}>
                  {day.high}° / {day.low}°
                </div>
                <div style={dashboardWeatherMiniStyle}>
                  Rain {day.precipChance}% · ET0 {day.et0}"
                </div>
                <p style={dashboardAdviceStyle}>{irrigationAdvice(day)}</p>
              </button>
            ))
          ) : (
            <div style={noticeStyle}>{weatherStatus}</div>
          )}
        </div>
      </section>
    </div>
  );
}
