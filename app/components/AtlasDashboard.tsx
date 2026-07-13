"use client";

import React, { useMemo } from "react";

type AtlasDashboardProps = {
  [key: string]: any;
};

function dateValue(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function dayDistance(from: string, to?: string) {
  if (!to) return Number.POSITIVE_INFINITY;
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function workType(record: any) {
  if (record.workType) return String(record.workType);
  return record.recurring ? "Preventive Maintenance" : "Work Order";
}

function categoryLabel(record: any) {
  return String(record.workCategory || record.category || "🔧 Maintenance");
}

function timelineDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    serviceRecords = [],
    setLogoIndex,
    setScreen,
    setSelectedServiceId,
    statGridStyle,
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
    workLinkLogoFallbackStyle,
    workLinkLogoImageStyle,
    workLinkLogoStyle,
    workLinkOpenStyle,
    workLinkTextStyle,
    workLinks = [],
    workOrderCardStyle,
    workOrderStripStyle,
    workPlanTargetHours,
    workPlanTasks = [],
    eyebrowStyle,
  } = props;

  const today = todayISO();

  const dashboardData = useMemo(() => {
    const open = serviceRecords
      .filter((record: any) => record.status !== "Completed")
      .sort((a: any, b: any) => dateValue(a.date) - dateValue(b.date));

    const overdue = open.filter(
      (record: any) => record.date && dayDistance(today, record.date) < 0,
    );
    const dueToday = open.filter(
      (record: any) => record.date && dayDistance(today, record.date) === 0,
    );
    const dueThisWeek = open.filter((record: any) => {
      const distance = dayDistance(today, record.date);
      return distance >= 1 && distance <= 7;
    });
    const inProgress = open.filter(
      (record: any) => record.status === "In Progress",
    );
    const recurring = open.filter(
      (record: any) =>
        record.recurring || workType(record) === "Preventive Maintenance",
    );
    const projects = open.filter(
      (record: any) => workType(record) === "Project",
    );
    const highPriority = open.filter(
      (record: any) => record.priority === "High",
    );

    return {
      open,
      overdue,
      dueToday,
      dueThisWeek,
      inProgress,
      recurring,
      projects,
      highPriority,
    };
  }, [serviceRecords, today]);

  const timelineEntries = useMemo(() => {
    const entries: any[] = [];

    serviceRecords.forEach((record: any) => {
      const snapshots = Array.isArray(record.completionSnapshots)
        ? record.completionSnapshots
        : [];

      snapshots.forEach((snapshot: any, index: number) => {
        entries.push({
          id: `${record.id}-snapshot-${snapshot.id || index}`,
          date:
            snapshot.completedAt ||
            snapshot.completedDate ||
            snapshot.date ||
            record.lastCompletedDate,
          title: snapshot.title || record.title,
          description:
            snapshot.notes ||
            `${categoryLabel(record)} · ${assetName(record.assetId)}`,
          kind: "Completed Work",
          icon: "✅",
          recordId: record.id,
        });
      });

      const history = Array.isArray(record.completionHistory)
        ? record.completionHistory
        : [];

      history.forEach((date: string, index: number) => {
        const alreadyIncluded = snapshots.some((snapshot: any) =>
          String(
            snapshot.completedAt ||
              snapshot.completedDate ||
              snapshot.date ||
              "",
          ).startsWith(String(date)),
        );

        if (!alreadyIncluded) {
          entries.push({
            id: `${record.id}-history-${index}`,
            date,
            title: record.title,
            description: `${categoryLabel(record)} · ${assetName(record.assetId)}`,
            kind: "Completed Work",
            icon: "✅",
            recordId: record.id,
          });
        }
      });

      const notes = Array.isArray(record.workNotes) ? record.workNotes : [];
      notes.forEach((note: any, index: number) => {
        entries.push({
          id: `${record.id}-note-${note.id || index}`,
          date: note.createdAt || note.date,
          title: record.title,
          description: note.text || note.note || note.body || "Work note added",
          kind: "Work Note",
          icon: "📝",
          recordId: record.id,
        });
      });
    });

    [...todayEvents, ...upcomingEvents].forEach((event: any) => {
      entries.push({
        id: `event-${event.instanceId || event.id}`,
        date: event.date,
        title: event.title,
        description: `${event.time || (event.allDay ? "All day" : "No time")} · ${categoryForEvent(event)}`,
        kind: "Calendar",
        icon: "📅",
        event,
      });
    });

    return entries
      .filter((entry) => entry.date)
      .sort((a, b) => dateValue(String(b.date).slice(0, 10)) - dateValue(String(a.date).slice(0, 10)))
      .slice(0, 30);
  }, [
    assetName,
    categoryForEvent,
    serviceRecords,
    todayEvents,
    upcomingEvents,
  ]);

  const workloadMinutes = useMemo(() => {
    const effortMinutes: Record<string, number> = {
      "5 minutes": 5,
      "15 minutes": 15,
      "30 minutes": 30,
      "1 hour": 60,
      "Half Day": 240,
      "Full Day": 480,
      "Multi-Day": 960,
    };

    return [...dashboardData.overdue, ...dashboardData.dueToday].reduce(
      (total: number, record: any) =>
        total + (effortMinutes[String(record.effort || "")] || 30),
      0,
    );
  }, [dashboardData.dueToday, dashboardData.overdue]);

  const workloadLabel =
    workloadMinutes >= 480
      ? `${Math.round(workloadMinutes / 60)}h+`
      : `${Math.floor(workloadMinutes / 60)}h ${workloadMinutes % 60}m`;

  const commandGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(4, minmax(0, 1fr))",
    gap: 12,
  };

  const commandCardStyle: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    background: "#FFFFFF",
    padding: 14,
    display: "grid",
    gap: 8,
    textAlign: "left",
    color: colors.text,
  };

  const commandNumberStyle: React.CSSProperties = {
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 900,
  };

  const compactWorkListStyle: React.CSSProperties = {
    display: "grid",
    gap: 8,
  };

  const compactWorkButtonStyle: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    background: "#FFFFFF",
    padding: "11px 12px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 10,
    textAlign: "left",
    color: colors.text,
    cursor: "pointer",
  };

  const timelineStyle: React.CSSProperties = {
    display: "grid",
    gap: 0,
    maxHeight: 560,
    overflowY: "auto",
    paddingRight: 4,
  };

  const timelineRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr)",
    gap: 10,
    borderBottom: `1px solid ${colors.line}`,
    padding: "12px 2px",
  };

  function openWork(record: any) {
    setSelectedServiceId(record.id);
    setScreen("history");
  }

  function renderCompactWork(records: any[], empty: string) {
    if (!records.length) return <div style={noticeStyle}>{empty}</div>;

    return (
      <div style={compactWorkListStyle}>
        {records.slice(0, 6).map((record: any) => (
          <button
            key={record.id}
            type="button"
            onClick={() => openWork(record)}
            style={compactWorkButtonStyle}
          >
            <span style={{ minWidth: 0 }}>
              <strong>{record.title}</strong>
              <span style={{ ...mutedSmallStyle, display: "block" }}>
                {categoryLabel(record)} · {formatDate(record.date)}
              </span>
            </span>
            <span style={badgeStyle(record.status)}>{record.status}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderDashboardWeather() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          brand
          eyebrow="Weather / Irrigation"
          title="7-Day Planning Window"
          detail="Use weather and irrigation conditions to prioritize outdoor work."
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
    );
  }

  function renderWorkLinks() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Quick Access"
          title="Work Links"
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
          {workLinks.map((link: any) => (
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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: isMobile ? 46 : 56,
                height: isMobile ? 46 : 56,
                borderRadius: 14,
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
                <span style={{ color: colors.gold2, fontSize: 24, fontWeight: 900 }}>
                  A
                </span>
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
                {dashboardData.overdue.length} overdue ·{" "}
                {dashboardData.dueToday.length} due today ·{" "}
                {dashboardData.inProgress.length} in progress · workload{" "}
                {workloadLabel}
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
        <SectionHeader
          brand
          eyebrow="Daily Command"
          title="What Needs Attention"
          detail="The most important workload signals in one place."
        />

        <div style={commandGridStyle}>
          <button
            type="button"
            onClick={() => setScreen("history")}
            style={commandCardStyle}
          >
            <span style={{ fontSize: 20 }}>🔴</span>
            <span style={commandNumberStyle}>
              {dashboardData.overdue.length}
            </span>
            <strong>Overdue</strong>
            <span style={mutedSmallStyle}>Needs attention first</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen("history")}
            style={commandCardStyle}
          >
            <span style={{ fontSize: 20 }}>🟡</span>
            <span style={commandNumberStyle}>
              {dashboardData.dueToday.length}
            </span>
            <strong>Due Today</strong>
            <span style={mutedSmallStyle}>Scheduled daily work</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen("history")}
            style={commandCardStyle}
          >
            <span style={{ fontSize: 20 }}>🔵</span>
            <span style={commandNumberStyle}>
              {dashboardData.inProgress.length}
            </span>
            <strong>In Progress</strong>
            <span style={mutedSmallStyle}>Work already started</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen("history")}
            style={commandCardStyle}
          >
            <span style={{ fontSize: 20 }}>🔁</span>
            <span style={commandNumberStyle}>
              {dashboardData.recurring.length}
            </span>
            <strong>Maintenance</strong>
            <span style={mutedSmallStyle}>Open recurring service</span>
          </button>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(2, minmax(0, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={sectionStyle}>
          <SectionHeader
            eyebrow="Priority"
            title="Overdue & Today"
            right={
              <button
                type="button"
                onClick={() => setScreen("history")}
                style={secondaryButtonStyle}
              >
                Open My Work
              </button>
            }
          />
          {renderCompactWork(
            [...dashboardData.overdue, ...dashboardData.dueToday],
            "No overdue or due-today work.",
          )}
        </section>

        <section style={sectionStyle}>
          <SectionHeader
            eyebrow="Moving"
            title="In Progress"
            right={
              <button
                type="button"
                onClick={() => setScreen("history")}
                style={secondaryButtonStyle}
              >
                View All
              </button>
            }
          />
          {renderCompactWork(
            dashboardData.inProgress,
            "No work is currently marked In Progress.",
          )}
        </section>
      </div>

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
                  onClick={() => addCalendarItem(today)}
                  style={goldButtonStyle}
                >
                  + Event
                </button>
              }
            />

            <div style={listStyle}>
              {todayEvents.length ? (
                todayEvents.map((event: any) => {
                  const eventColor = colorForEvent(event);
                  return (
                    <button
                      key={event.instanceId || event.id}
                      type="button"
                      onClick={() => {
                        openCalendarItem(event);
                        if (event.source !== "work-order") {
                          setScreen("calendar");
                        }
                      }}
                      style={{
                        ...todayEventStyle,
                        borderLeftColor: eventColor.hex,
                      }}
                    >
                      <div>
                        <strong>{event.title}</strong>
                        <p style={mutedSmallStyle}>
                          {event.allDay
                            ? "All day"
                            : event.time || "No time"}{" "}
                          · {categoryForEvent(event)}
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
              borderLeft: isMobile
                ? "none"
                : `1px solid ${colors.line}`,
              borderTop: isMobile
                ? `1px solid ${colors.line}`
                : "none",
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
              {upcomingEvents.slice(0, 7).map((event: any) => {
                const eventColor = colorForEvent(event);
                const dayLabel = upcomingDayLabel(event.date);

                return (
                  <button
                    key={event.instanceId || event.id}
                    type="button"
                    onClick={() => {
                      openCalendarItem(event);
                      if (event.source !== "work-order") {
                        setScreen("calendar");
                      }
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
                        {event.allDay
                          ? "All day"
                          : event.time || "No time"}
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
          eyebrow="Permanent Operations History"
          title="Estate Timeline"
          detail="Completed work, service history, dated notes, and calendar activity in one chronological feed."
          right={
            <button
              type="button"
              onClick={() => setScreen("history")}
              style={secondaryButtonStyle}
            >
              Open Work History
            </button>
          }
        />

        {timelineEntries.length ? (
          <div style={timelineStyle}>
            {timelineEntries.map((entry: any) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (entry.recordId) {
                    setSelectedServiceId(entry.recordId);
                    setScreen("history");
                    return;
                  }

                  if (entry.event) {
                    openCalendarItem(entry.event);
                    setScreen("calendar");
                  }
                }}
                style={{
                  ...timelineRowStyle,
                  width: "100%",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "transparent",
                  color: colors.text,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: colors.panel,
                    border: `1px solid ${colors.line}`,
                  }}
                >
                  {entry.icon}
                </span>

                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <strong>{entry.title}</strong>
                    <small style={mutedSmallStyle}>
                      {timelineDate(entry.date)}
                    </small>
                  </span>
                  <span style={{ ...mutedSmallStyle, display: "block" }}>
                    {entry.kind} · {entry.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div style={noticeStyle}>
            Complete work, add dated notes, or schedule events to build the Estate Timeline.
          </div>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(0, 1.35fr) minmax(300px, 0.65fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={sectionStyle}>
          <SectionHeader
            brand
            eyebrow="Calendar"
            title="Plan the Week"
            detail="Month, week, holidays, weather, and event editing."
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
            <StatCard
              label="Today"
              value={todayEvents.length}
              onClick={() => setScreen("calendar")}
            />
            <StatCard
              label="This Week"
              value={dashboardData.dueThisWeek.length}
              onClick={() => setScreen("history")}
            />
            <StatCard
              label="High Priority"
              value={dashboardData.highPriority.length}
              onClick={() => setScreen("history")}
            />
            <StatCard
              label="Projects"
              value={dashboardData.projects.length}
              onClick={() => setScreen("history")}
            />
          </div>
        </section>

        {renderCalendarIntakeCard()}
      </div>

      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Weekly Operations"
          title="Operations Planner"
          detail="Build the week around commitments, priorities, locations, and daily buffer."
          right={
            <button
              type="button"
              onClick={() => setScreen("planner")}
              style={goldButtonStyle}
            >
              Open Planner
            </button>
          }
        />

        <div style={statGridStyle}>
          <StatCard
            label="Tasks"
            value={workPlanTasks.length}
            onClick={() => setScreen("planner")}
          />
          <StatCard
            label="Locked"
            value={workPlanTasks.filter((task: any) => task.locked).length}
            onClick={() => setScreen("planner")}
          />
          <StatCard
            label="Weekly"
            value={workPlanTasks.filter((task: any) => task.recurring).length}
            onClick={() => setScreen("planner")}
          />
          <StatCard
            label="Target"
            value={`${workPlanTargetHours}h/day`}
            onClick={() => setScreen("planner")}
          />
        </div>
      </section>

      {renderWorkLinks()}
    </div>
  );
}
