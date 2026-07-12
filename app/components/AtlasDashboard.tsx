"use client";

import React from "react";
import type { ServiceRecord } from "../lib/atlas-types";

type AtlasDashboardProps = {
  [key: string]: any;
};

export default function AtlasDashboard(props: AtlasDashboardProps) {
  const {
    SectionHeader,
    StatCard,
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
    listStyle,
    logoCandidates,
    logoIndex,
    mutedSmallStyle,
    noticeStyle,
    openCalendarItem,
    quickLinkCardStyle,
    quickLinksGridStyle,
    renderCalendarIntakeCard,
    secondaryButtonStyle,
    sectionStyle,
    sectionTitleStyle,
    serviceRecords,
    setLogoIndex,
    setScreen,
    setSelectedServiceId,
    statGridStyle,
    todayEventStyle,
    todayEvents,
    todayISO,
    upcomingDayLabel,
    upcomingDayPillStyle,
    upcomingEvents,
    upcomingInfoStyle,
    upcomingItemStyle,
    upcomingListStyle,
    upcomingTodayPillStyle,
    upcomingDotStyle,
    weatherDays,
    weatherIcon,
    weatherStatus,
    workLinkLogoFallbackStyle,
    workLinkLogoImageStyle,
    workLinkLogoStyle,
    workLinkOpenStyle,
    workLinkTextStyle,
    workLinks,
    workOrderCardStyle,
    workOrderStripStyle,
    workPlanTargetHours,
    workPlanTasks,
    eyebrowStyle,
  } = props;

  function renderDashboardWorkLinks() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Quick Access"
          title="Work Links"
          detail="Regular work portals with clean logo badges, including Landscape Help admin and the crew link."
          right={
            <button
              type="button"
              onClick={() => setScreen("links")}
              style={secondaryButtonStyle}
            >
              Open All Links
            </button>
          }
        />

        <div style={quickLinksGridStyle}>
          {workLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              style={quickLinkCardStyle}
            >
              <span
                style={{
                  ...workLinkLogoStyle,
                  background: link.logoBg,
                  color: link.logoColor || colors.navy,
                }}
              >
                <span style={workLinkLogoFallbackStyle}>{link.logoText}</span>
                {link.logoUrl ? (
                  <img
                    src={link.logoUrl}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    style={workLinkLogoImageStyle}
                  />
                ) : null}
              </span>
              <span style={workLinkTextStyle}>
                <strong>{link.name}</strong>
                <span>
                  {link.category}
                  {link.vendor ? ` · ${link.vendor}` : ""}
                </span>
              </span>
              <span style={workLinkOpenStyle}>Open</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  function renderDashboardWeather() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          brand
          eyebrow="Weather / Irrigation"
          title="7-Day Planning Window"
          detail="Placed between Today and Work Orders for irrigation and yard-work planning."
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
            weatherDays.map((day) => (
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
    );
  }

  function renderDashboard() {
    const openWorkOrders = serviceRecords
      .filter((record) => record.status !== "Completed")
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    const routineTasks = openWorkOrders.filter((record) => record.recurring);
    const projectWorkOrders = openWorkOrders.filter((record) => !record.recurring);
    const highPriority = openWorkOrders.filter(
      (record) => record.priority === "High",
    );

    const renderDashboardWorkCards = (
      records: ServiceRecord[],
      emptyMessage: string,
    ) =>
      records.length ? (
        <div style={workOrderStripStyle}>
          {records.slice(0, 6).map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => {
                setSelectedServiceId(record.id);
                setScreen("history");
              }}
              style={workOrderCardStyle}
            >
              <strong>{record.title}</strong>
              <p style={mutedSmallStyle}>
                {formatDate(record.date)} · {assetName(record.assetId)}
              </p>
              <div style={buttonRowStyle}>
                <span style={badgeStyle(record.status)}>{record.status}</span>
                <span style={badgeStyle(record.priority ?? "Medium")}>
                  {record.priority ?? "Medium"}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={noticeStyle}>{emptyMessage}</div>
      );

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                minWidth: 0,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: isMobile ? 46 : 54,
                  height: isMobile ? 46 : 54,
                  flex: "0 0 auto",
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(229,192,107,0.52)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
                }}
              >
                {logoIndex < logoCandidates.length ? (
                  <img
                    src={logoCandidates[logoIndex]}
                    alt=""
                    onError={() => setLogoIndex((index) => index + 1)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: 5,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: colors.gold2,
                      fontSize: 24,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    A
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...eyebrowStyle, color: colors.gold2 }}>
                  Daily Operations
                </div>
                <h2 style={{ ...sectionTitleStyle, color: "#FFFFFF", marginBottom: 4 }}>
                  Today at 2000
                </h2>
                <p style={{ ...mutedSmallStyle, color: "rgba(255,255,255,0.78)" }}>
                  {todayEvents.length} scheduled · {routineTasks.length} routine · {projectWorkOrders.length} work orders · {highPriority.length} high priority
                </p>
              </div>
            </div>
            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => setScreen("inbox")}
                style={goldButtonStyle}
              >
                + Add Anything
              </button>
            </div>
          </div>
        </section>

        {/* Main home dashboard: weather first, then Today / Upcoming. */}
        {renderDashboardWeather()}

        <section style={sectionStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                minWidth: 0,
                paddingRight: isMobile ? 0 : 18,
                paddingBottom: isMobile ? 18 : 0,
              }}
            >
              <SectionHeader
                brand
                eyebrow="Today"
                title="Today's Schedule"
                right={
                  <button
                    type="button"
                    onClick={() => addCalendarItem(todayISO())}
                    style={goldButtonStyle}
                  >
                    + Event
                  </button>
                }
              />
              <div style={listStyle}>
                {todayEvents.length ? (
                  todayEvents.map((event) => {
                    const eventColor = colorForEvent(event);
                    return (
                      <button
                        key={event.instanceId || event.id}
                        type="button"
                        onClick={() => {
                          openCalendarItem(event);
                          if (event.source !== "work-order") setScreen("calendar");
                        }}
                        style={{ ...todayEventStyle, borderLeftColor: eventColor.hex }}
                      >
                        <div>
                          <strong>{event.title}</strong>
                          <p style={mutedSmallStyle}>
                            {event.allDay ? "All day" : event.time || "No time"} · {categoryForEvent(event)}
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

            <div
              style={{
                minWidth: 0,
                borderLeft: isMobile ? "none" : `1px solid ${colors.line}`,
                borderTop: isMobile ? `1px solid ${colors.line}` : "none",
                paddingLeft: isMobile ? 0 : 18,
                paddingTop: isMobile ? 18 : 0,
              }}
            >
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
                {upcomingEvents.slice(0, 7).map((event) => {
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
                      <span style={{ ...upcomingDotStyle, background: eventColor.hex }} />
                      <div style={upcomingInfoStyle}>
                        <strong>{event.title}</strong>
                        <p style={mutedSmallStyle}>
                          {formatDate(event.date)} · {event.allDay ? "All day" : event.time || "No time"}
                        </p>
                      </div>
                      {dayLabel ? (
                        <span
                          style={{
                            ...upcomingDayPillStyle,
                            ...(dayLabel === "Today" ? upcomingTodayPillStyle : {}),
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.35fr) minmax(300px, 0.65fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <section style={sectionStyle}>
            <SectionHeader
              brand
              eyebrow="Calendar"
              title="Plan the Week"
              detail="Open the full calendar for month, week, holidays, weather, and event editing."
              right={
                <button
                  type="button"
                  onClick={() => setScreen("calendar")}
                  style={goldButtonStyle}
                >
                  Open Calendar
                </button>
              }
            />
            <div style={statGridStyle}>
              <StatCard label="Today" value={todayEvents.length} onClick={() => setScreen("calendar")} />
              <StatCard label="Upcoming" value={upcomingEvents.length} onClick={() => setScreen("calendar")} />
              <StatCard label="Routine" value={routineTasks.length} onClick={() => setScreen("history")} />
              <StatCard label="Work Orders" value={projectWorkOrders.length} onClick={() => setScreen("history")} />
            </div>
          </section>

          {renderCalendarIntakeCard()}
        </div>

        <section style={sectionStyle}>
          <SectionHeader
            eyebrow="Weekly Operations"
            title="Operations Planner"
            detail="Build the week around locked recurring commitments, priorities, locations, and daily buffer."
            right={
              <button type="button" onClick={() => setScreen("planner")} style={goldButtonStyle}>
                Open Planner
              </button>
            }
          />
          <div style={statGridStyle}>
            <StatCard label="Tasks" value={workPlanTasks.length} onClick={() => setScreen("planner")} />
            <StatCard label="Locked" value={workPlanTasks.filter((task) => task.locked).length} onClick={() => setScreen("planner")} />
            <StatCard label="Weekly" value={workPlanTasks.filter((task) => task.recurring).length} onClick={() => setScreen("planner")} />
            <StatCard label="Target" value={`${workPlanTargetHours}h/day`} onClick={() => setScreen("planner")} />
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionHeader
            brand
            eyebrow="Routine"
            title="Daily & Recurring Tasks"
            detail="Regular property work stays separate from new repairs and one-time work orders."
            right={
              <button type="button" onClick={() => setScreen("history")} style={secondaryButtonStyle}>
                Open Tasks
              </button>
            }
          />
          {renderDashboardWorkCards(routineTasks, "No recurring tasks are currently open.")}
        </section>

        <section style={sectionStyle}>
          <SectionHeader
            brand
            eyebrow="Open / Scheduled"
            title="Work Orders"
            detail="Repairs, projects, vendor work, and other non-routine items."
            right={
              <button type="button" onClick={() => setScreen("history")} style={secondaryButtonStyle}>
                Open Work Orders
              </button>
            }
          />
          {renderDashboardWorkCards(projectWorkOrders, "No open work orders are currently listed.")}
        </section>

        {renderDashboardWorkLinks()}
      </div>
    );
  }


  return renderDashboard();
}

